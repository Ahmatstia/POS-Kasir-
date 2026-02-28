import React, { useState, useEffect } from "react";
import {
  getProducts,
  getCategories,
  deleteProduct,
} from "../../services/database";
import ProductForm from "./ProductForm";
import EditProductForm from "./EditProductForm";
import ImportExcel from "./ImportExcel";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  bg:      '#0E0F11',
  surface: '#161719',
  card:    '#1A1B1E',
  border:  '#1F2023',
  border2: '#2A2B2F',
  text:    '#F0EDE6',
  muted:   '#5C5C66',
  sub:     '#9998A3',
  accent:  '#F5A623',
  green:   '#34C98B',
  red:     '#E85858',
  blue:    '#5B8AF5',
  purple:  '#A78BFA',
};

const fmt = (n) => n ? `Rp ${Number(n).toLocaleString('id-ID')}` : '—';

// ─── UNIT CONFIG ──────────────────────────────────────────────────────────────
const UNIT_MAP = {
  all:  { label: 'Semua',    color: T.blue   },
  pcs:  { label: 'Per Pcs',  color: T.green  },
  pack: { label: 'Per Pack', color: T.accent },
  kg:   { label: 'Per Kg',   color: T.purple },
};

// ─── SMALL REUSABLES ──────────────────────────────────────────────────────────
function Chip({ children, color }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 100,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
      textTransform: 'uppercase',
      background: color + '14', border: `1px solid ${color}30`, color,
    }}>
      {children}
    </span>
  );
}

function IconBtn({ onClick, disabled, color = T.sub, hoverColor, hoverBg, title, children }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        border: `1px solid ${hov && !disabled ? (hoverColor || color) + '40' : T.border2}`,
        background: hov && !disabled ? (hoverBg || color + '10') : 'transparent',
        color: hov && !disabled ? (hoverColor || color) : disabled ? T.muted : color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s', opacity: disabled ? 0.4 : 1,
        fontFamily: 'Syne, sans-serif',
      }}
    >
      {children}
    </button>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
function ProductList() {
  const [products, setProducts]               = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories]           = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [showForm, setShowForm]               = useState(false);
  const [showImport, setShowImport]           = useState(false);
  const [editingProduct, setEditingProduct]   = useState(null);
  const [deletingId, setDeletingId]           = useState(null);
  const [searchTerm, setSearchTerm]           = useState('');
  const [searchCategory, setSearchCategory]   = useState('');

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    let filtered = [...products];
    if (searchTerm.trim())
      filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (searchCategory)
      filtered = filtered.filter(p => p.category_id === parseInt(searchCategory));
    setFilteredProducts(filtered);
  }, [searchTerm, searchCategory, products]);

  const loadData = async () => {
    setLoading(true);
    const [productsData, categoriesData] = await Promise.all([getProducts(), getCategories()]);
    const catMap = Object.fromEntries(categoriesData.map(c => [c.id, c.name]));
    const merged = productsData.map(p => ({ ...p, category_name: catMap[p.category_id] || '—' }));
    setProducts(merged);
    setFilteredProducts(merged);
    setCategories(categoriesData);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus produk ini?')) return;
    setDeletingId(id);
    const result = await deleteProduct(id);
    setDeletingId(null);
    if (result.success) { loadData(); }
    else alert('Gagal menghapus produk');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 280 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 36, height: 36, border: `2px solid ${T.border2}`,
            borderTopColor: T.accent, borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          <p style={{ fontSize: 11, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Syne, sans-serif' }}>
            Memuat produk…
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const activeCategoryName = categories.find(c => c.id === parseInt(searchCategory))?.name;
  const lowStockCount = products.filter(p => (p.stock || 0) <= (p.min_stock || 0)).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px);} to {opacity:1; transform:translateY(0);} }

        .prod-table { width: 100%; border-collapse: collapse; font-family: 'Syne', sans-serif; }
        .prod-table th {
          padding: 10px 14px;
          font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: ${T.muted};
          border-bottom: 1px solid ${T.border};
          text-align: left; white-space: nowrap;
        }
        .prod-table td {
          padding: 12px 14px;
          font-size: 12px; color: ${T.sub};
          border-bottom: 1px solid ${T.border};
          white-space: nowrap;
        }
        .prod-table tbody tr { transition: background 0.12s; }
        .prod-table tbody tr:hover td { background: ${T.border}40; }
        .prod-table tbody tr:last-child td { border-bottom: none; }

        .filter-input {
          width: 100%; padding: 9px 12px;
          border-radius: 10px; border: 1px solid ${T.border2};
          background: ${T.bg}; color: ${T.text};
          font-family: 'Syne', sans-serif; font-size: 12px;
          outline: none; transition: border-color 0.15s;
        }
        .filter-input:focus { border-color: ${T.accent}60; box-shadow: 0 0 0 2px ${T.accent}10; }

        .action-btn {
          padding: 7px 16px; border-radius: 9px; cursor: pointer;
          font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700;
          letter-spacing: 0.05em; transition: all 0.15s;
          display: inline-flex; align-items: center; gap: 7px;
        }

        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 4px; }
      `}</style>

      <div style={{ animation: 'fadeUp 0.4s ease both', fontFamily: 'Syne, sans-serif' }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, marginBottom: 4 }}>
              Manajemen
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: '-0.01em' }}>
              Daftar Produk
            </h2>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Low stock warning badge */}
            {lowStockCount > 0 && (
              <div style={{
                padding: '5px 12px', borderRadius: 100,
                background: T.accent + '12', border: `1px solid ${T.accent}30`,
                fontSize: 11, fontWeight: 700, color: T.accent,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1L11 10H1L6 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                  <path d="M6 5v2.5M6 8.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                {lowStockCount} stok menipis
              </div>
            )}

            <button
              className="action-btn"
              onClick={() => setShowImport(true)}
              style={{ border: `1px solid ${T.purple}35`, background: T.purple + '10', color: T.purple }}
              onMouseEnter={e => e.currentTarget.style.background = T.purple + '20'}
              onMouseLeave={e => e.currentTarget.style.background = T.purple + '10'}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M4 5h6M4 7.5h4M4 10h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Import Excel
            </button>

            <button
              className="action-btn"
              onClick={() => setShowForm(true)}
              style={{ border: `1px solid ${T.green}35`, background: T.green + '10', color: T.green }}
              onMouseEnter={e => e.currentTarget.style.background = T.green + '20'}
              onMouseLeave={e => e.currentTarget.style.background = T.green + '10'}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Tambah Produk
            </button>
          </div>
        </div>

        {/* ── FILTER BAR ── */}
        <div style={{
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 14, padding: '16px 18px', marginBottom: 16,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px auto', gap: 10, alignItems: 'end' }}>
            {/* Search name */}
            <div>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                Cari Produk
              </label>
              <div style={{ position: 'relative' }}>
                <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="5.5" cy="5.5" r="4" stroke={T.sub} strokeWidth="1.4"/>
                  <path d="M8.5 8.5L11 11" stroke={T.sub} strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Ketik nama produk…"
                  className="filter-input"
                  style={{ paddingLeft: 32 }}
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 16, lineHeight: 1,
                  }}>×</button>
                )}
              </div>
            </div>

            {/* Category filter */}
            <div>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 700, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                Kategori
              </label>
              <select
                value={searchCategory}
                onChange={e => setSearchCategory(e.target.value)}
                className="filter-input"
                style={{ cursor: 'pointer' }}
              >
                <option value="">Semua Kategori</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Reset */}
            <button
              onClick={() => { setSearchTerm(''); setSearchCategory(''); }}
              style={{
                padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${T.border2}`, background: 'transparent',
                color: T.sub, fontSize: 11, fontWeight: 700,
                fontFamily: 'Syne, sans-serif', letterSpacing: '0.05em',
                transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = T.border; e.currentTarget.style.color = T.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.sub; }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6a4 4 0 104 -4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M2 3v3h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Reset
            </button>
          </div>

          {/* Result info */}
          <div style={{ marginTop: 10, fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
            <span style={{ color: T.accent, fontWeight: 700 }}>{filteredProducts.length}</span>
            <span> / {products.length} produk</span>
            {searchTerm && <span style={{ color: T.sub }}> · "{searchTerm}"</span>}
            {activeCategoryName && <span style={{ color: T.sub }}> · {activeCategoryName}</span>}
          </div>
        </div>

        {/* ── TABLE / EMPTY STATE ── */}
        {filteredProducts.length === 0 ? (
          <div style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
            padding: '48px 24px', textAlign: 'center',
          }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto 12px', opacity: 0.2 }}>
              <rect x="6" y="6" width="36" height="36" rx="6" stroke={T.sub} strokeWidth="2"/>
              <path d="M16 24h16M16 32h10" stroke={T.sub} strokeWidth="2" strokeLinecap="round"/>
              <path d="M16 16h6" stroke={T.sub} strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p style={{ fontSize: 14, fontWeight: 700, color: T.muted, marginBottom: 8 }}>
              {products.length === 0 ? 'Belum ada produk' : 'Tidak ada produk yang cocok'}
            </p>
            <p style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>
              {products.length === 0 ? 'Tambahkan produk pertama Anda' : 'Coba ubah atau reset filter pencarian'}
            </p>
            {products.length === 0 ? (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="action-btn" onClick={() => setShowImport(true)}
                  style={{ border: `1px solid ${T.purple}35`, background: T.purple + '10', color: T.purple }}
                  onMouseEnter={e => e.currentTarget.style.background = T.purple + '20'}
                  onMouseLeave={e => e.currentTarget.style.background = T.purple + '10'}
                >Import Excel</button>
                <button className="action-btn" onClick={() => setShowForm(true)}
                  style={{ border: `1px solid ${T.green}35`, background: T.green + '10', color: T.green }}
                  onMouseEnter={e => e.currentTarget.style.background = T.green + '20'}
                  onMouseLeave={e => e.currentTarget.style.background = T.green + '10'}
                >Tambah Manual</button>
              </div>
            ) : (
              <button className="action-btn" onClick={() => { setSearchTerm(''); setSearchCategory(''); }}
                style={{ border: `1px solid ${T.blue}35`, background: T.blue + '10', color: T.blue }}
                onMouseEnter={e => e.currentTarget.style.background = T.blue + '20'}
                onMouseLeave={e => e.currentTarget.style.background = T.blue + '10'}
              >Reset Filter</button>
            )}
          </div>
        ) : (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="prod-table">
                <thead>
                  <tr>
                    {['Nama Produk', 'Kategori', 'Satuan', 'Harga Pcs', 'Harga Pack', 'Harga Kg', 'Stok', 'Min Stok', 'Aksi'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => {
                    const outOfStock = (product.stock || 0) === 0;
                    const lowStock   = !outOfStock && (product.stock || 0) <= (product.min_stock || 0);
                    const unit       = UNIT_MAP[product.sell_per_unit] || UNIT_MAP.pcs;

                    return (
                      <tr key={product.id}>
                        {/* Name */}
                        <td>
                          <span style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>{product.name}</span>
                        </td>

                        {/* Category */}
                        <td>
                          <Chip color={T.sub}>{product.category_name}</Chip>
                        </td>

                        {/* Unit */}
                        <td>
                          <Chip color={unit.color}>{unit.label}</Chip>
                        </td>

                        {/* Prices */}
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: product.price_pcs ? T.text : T.muted }}>
                          {fmt(product.price_pcs)}
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: product.price_pack ? T.text : T.muted }}>
                          {fmt(product.price_pack)}
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: product.price_kg ? T.text : T.muted }}>
                          {fmt(product.price_kg)}
                        </td>

                        {/* Stock */}
                        <td>
                          <span style={{
                            padding: '2px 9px', borderRadius: 100,
                            fontSize: 11, fontWeight: 800,
                            fontFamily: 'JetBrains Mono, monospace',
                            background: outOfStock ? T.red + '14' : lowStock ? T.accent + '14' : T.green + '14',
                            border: `1px solid ${outOfStock ? T.red : lowStock ? T.accent : T.green}30`,
                            color: outOfStock ? T.red : lowStock ? T.accent : T.green,
                          }}>
                            {product.stock ?? 0}
                          </span>
                        </td>

                        {/* Min stock */}
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                          {product.min_stock ?? 0}
                        </td>

                        {/* Actions */}
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <IconBtn
                              onClick={() => setEditingProduct(product)}
                              color={T.blue} hoverColor={T.blue} title="Edit produk"
                            >
                              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                                <path d="M9 2l2 2-7 7H2V9l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                              </svg>
                            </IconBtn>
                            <IconBtn
                              onClick={() => handleDelete(product.id)}
                              disabled={deletingId === product.id}
                              color={T.sub} hoverColor={T.red} title="Hapus produk"
                            >
                              {deletingId === product.id ? (
                                <div style={{
                                  width: 10, height: 10, border: `1.5px solid ${T.muted}`,
                                  borderTopColor: T.accent, borderRadius: '50%',
                                  animation: 'spin 0.8s linear infinite',
                                }} />
                              ) : (
                                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                                  <path d="M2 3.5h9M5 3.5V2.5a1 1 0 012 0v1M5.5 6v3M7.5 6v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                                  <rect x="2.5" y="3.5" width="8" height="7.5" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                                </svg>
                              )}
                            </IconBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            <div style={{
              padding: '12px 16px', borderTop: `1px solid ${T.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
                <span style={{ color: T.accent, fontWeight: 700 }}>{filteredProducts.length}</span>
                {' '}dari{' '}
                <span style={{ color: T.text, fontWeight: 700 }}>{products.length}</span>
                {' '}produk ditampilkan
              </span>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontSize: 10, color: T.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, display: 'inline-block' }}/>
                  Stok aman
                </span>
                <span style={{ fontSize: 10, color: T.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, display: 'inline-block' }}/>
                  Menipis
                </span>
                <span style={{ fontSize: 10, color: T.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.red, display: 'inline-block' }}/>
                  Habis
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <ProductForm
          onClose={() => setShowForm(false)}
          onSuccess={() => { loadData(); setShowForm(false); }}
        />
      )}
      {showImport && (
        <ImportExcel
          onClose={() => setShowImport(false)}
          onSuccess={() => { loadData(); setShowImport(false); }}
        />
      )}
      {editingProduct && (
        <EditProductForm
          productId={editingProduct.id}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => { loadData(); setEditingProduct(null); }}
        />
      )}
    </>
  );
}

export default ProductList;