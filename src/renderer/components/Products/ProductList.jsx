import React, { useState, useEffect } from "react";
import {
  getProducts,
  getCategories,
  deleteProduct,
} from "../../services/database";
import ProductForm from "./ProductForm";
import EditProductForm from "./EditProductForm";
import ImportExcel from "./ImportExcel";
import { useToast } from "../Toast";

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

const fmt = (n) => n ? `Rp ${Number(n).toLocaleString('id-ID')}` : null;

const UNIT_COLORS = {
  pcs:  T.blue,
  pack: T.green,
  dus:  T.accent,
  kg:   T.purple,
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: color + '14', border: `1px solid ${color}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{value}</p>
      </div>
    </div>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ product, onEdit, onDelete, isDeleting, isConfirmingDelete, onConfirmDelete, onCancelDelete }) {
  const outOfStock = (product.stock || 0) === 0;
  const lowStock   = !outOfStock && (product.stock || 0) <= (product.min_stock || 0);

  const stockColor  = outOfStock ? T.red : lowStock ? T.accent : T.green;
  const stockLabel  = outOfStock ? 'Habis' : lowStock ? 'Menipis' : 'Aman';

  // Collect active price units
  const activePrices = [
    { key: 'pcs',  label: 'Pcs',  price: product.price_pcs,  color: T.blue   },
    { key: 'pack', label: 'Pack', price: product.price_pack, color: T.green  },
    { key: 'dus',  label: 'Dus',  price: product.price_dus,  color: T.accent },
    { key: 'kg',   label: 'Kg',   price: product.price_kg,   color: T.purple },
  ].filter(u => u.price > 0);

  const sellUnit = product.sell_per_unit || 'all';

  return (
    <div style={{
      background: T.card,
      border: `1px solid ${outOfStock ? T.red + '20' : T.border}`,
      borderRadius: 14,
      padding: '16px',
      transition: 'border-color 0.2s, transform 0.15s',
      display: 'flex', flexDirection: 'column', gap: 12,
      opacity: outOfStock ? 0.75 : 1,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = T.border2; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = outOfStock ? T.red + '20' : T.border; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 14, fontWeight: 700, color: T.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            marginBottom: 4,
          }}>
            {product.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {/* Category chip */}
            <span style={{
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              padding: '2px 8px', borderRadius: 100,
              background: (product.category_color || T.blue) + '16',
              border: `1px solid ${(product.category_color || T.blue)}28`,
              color: product.category_color || T.blue,
            }}>
              {product.category_name || '—'}
            </span>
            {/* Sell unit badge */}
            {sellUnit !== 'all' && (
              <span style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                padding: '2px 8px', borderRadius: 100,
                background: T.purple + '12', border: `1px solid ${T.purple}25`, color: T.purple,
              }}>
                {sellUnit}
              </span>
            )}
          </div>
        </div>

        {/* Stock badge */}
        <div style={{
          textAlign: 'right', flexShrink: 0,
          padding: '6px 10px', borderRadius: 10,
          background: stockColor + '10', border: `1px solid ${stockColor}25`,
        }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: stockColor, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1, marginBottom: 2 }}>
            {product.stock ?? 0}
          </p>
          <p style={{ fontSize: 8, fontWeight: 700, color: stockColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {stockLabel}
          </p>
        </div>
      </div>

      {/* Price tags */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {activePrices.length > 0 ? activePrices.map(u => (
          <div key={u.key} style={{
            padding: '4px 10px', borderRadius: 8,
            background: u.color + '0C', border: `1px solid ${u.color}25`,
          }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: u.color, textTransform: 'uppercase', display: 'block', marginBottom: 1 }}>{u.label}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: T.text, fontFamily: 'JetBrains Mono, monospace' }}>{fmt(u.price)}</span>
          </div>
        )) : (
          <span style={{ fontSize: 11, color: T.muted, fontStyle: 'italic' }}>Belum ada harga</span>
        )}
      </div>

      {/* Conversion info */}
      {(product.pcs_per_pack > 1 || product.pack_per_dus > 1) && (
        <div style={{
          padding: '6px 10px', borderRadius: 8,
          background: T.border, fontSize: 10,
          color: T.sub, fontFamily: 'JetBrains Mono, monospace',
          display: 'flex', gap: 12,
        }}>
          {product.pcs_per_pack > 1 && <span>1 Pack = {product.pcs_per_pack} Pcs</span>}
          {product.pack_per_dus  > 1 && <span>1 Dus = {product.pack_per_dus} Pack</span>}
        </div>
      )}

      {/* Min stock info */}
      {(product.min_stock || 0) > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            flex: 1, height: 4, borderRadius: 4,
            background: T.border2, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: stockColor,
              width: `${Math.min(100, ((product.stock || 0) / Math.max(product.min_stock * 2, 1)) * 100)}%`,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <span style={{ fontSize: 9, color: T.muted, fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
            min {product.min_stock}
          </span>
        </div>
      )}

      {/* Actions */}
      {isConfirmingDelete ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 10px', borderRadius: 9,
          background: T.red + '0A', border: `1px solid ${T.red}25`,
        }}>
          <span style={{ fontSize: 11, color: T.red, fontWeight: 600 }}>Hapus produk ini?</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onCancelDelete} style={{ padding: '4px 10px', borderRadius: 7, border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>Batal</button>
            <button onClick={onDelete} disabled={isDeleting} style={{ padding: '4px 10px', borderRadius: 7, border: `1px solid ${T.red}40`, background: T.red + '15', color: T.red, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
              {isDeleting ? '…' : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          <button
            onClick={onEdit}
            style={{
              flex: 1, padding: '7px', borderRadius: 9,
              border: `1px solid ${T.blue}30`, background: T.blue + '0C',
              color: T.blue, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'Syne, sans-serif', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.blue + '18'}
            onMouseLeave={e => e.currentTarget.style.background = T.blue + '0C'}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8 1l3 3-7 7H1V9l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
            Edit
          </button>
          <button
            onClick={onConfirmDelete}
            style={{
              width: 32, height: 32, borderRadius: 9, flexShrink: 0,
              border: `1px solid ${T.border2}`, background: 'transparent',
              color: T.sub, cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.red + '40'; e.currentTarget.style.background = T.red + '10'; e.currentTarget.style.color = T.red; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border2; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.sub; }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 3h8M4.5 3V2a1 1 0 012 0v1M5 5.5v3M7 5.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <rect x="2.5" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
function ProductList() {
  const { showToast } = useToast();
  const [products, setProducts]             = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories]         = useState([]);
  const [loading, setLoading]               = useState(true);
  const [showForm, setShowForm]             = useState(false);
  const [showImport, setShowImport]         = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingId, setDeletingId]         = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [searchTerm, setSearchTerm]         = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus]     = useState('');
  const [viewMode, setViewMode]             = useState('grid'); // 'grid' | 'table'

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    let f = [...products];
    if (searchTerm.trim())
      f = f.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterCategory)
      f = f.filter(p => p.category_id === parseInt(filterCategory));
    if (filterStatus === 'habis')
      f = f.filter(p => (p.stock || 0) === 0);
    else if (filterStatus === 'menipis')
      f = f.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= (p.min_stock || 0));
    else if (filterStatus === 'aman')
      f = f.filter(p => (p.stock || 0) > (p.min_stock || 0));
    setFilteredProducts(f);
  }, [searchTerm, filterCategory, filterStatus, products]);

  const loadData = async () => {
    setLoading(true);
    const [productsData, categoriesData] = await Promise.all([getProducts(), getCategories()]);
    const catMap = Object.fromEntries(categoriesData.map(c => [c.id, c]));
    const merged = productsData.map(p => ({
      ...p,
      category_name:  catMap[p.category_id]?.name  || '—',
      category_color: catMap[p.category_id]?.color || T.blue,
    }));
    setProducts(merged);
    setFilteredProducts(merged);
    setCategories(categoriesData);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    const result = await deleteProduct(id);
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (result.success) {
      showToast('success', 'Produk berhasil dihapus');
      loadData();
    } else {
      showToast('error', 'Gagal menghapus: ' + result.error);
    }
  };

  // Stats
  const total   = products.length;
  const aman    = products.filter(p => (p.stock || 0) > (p.min_stock || 0)).length;
  const menipis = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= (p.min_stock || 0)).length;
  const habis   = products.filter(p => (p.stock || 0) === 0).length;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 280 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: `2px solid ${T.border2}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 11, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Syne, sans-serif' }}>Memuat produk…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

        .filter-input {
          width: 100%; padding: 9px 12px;
          border-radius: 10px; border: 1px solid ${T.border2};
          background: ${T.bg}; color: ${T.text};
          font-family: 'Syne', sans-serif; font-size: 12px;
          outline: none; transition: border-color 0.15s;
        }
        .filter-input:focus { border-color: ${T.accent}60; box-shadow: 0 0 0 2px ${T.accent}10; }

        /* TABLE view */
        .prod-table { width: 100%; border-collapse: collapse; font-family: 'Syne', sans-serif; }
        .prod-table th {
          padding: 10px 14px; font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: ${T.muted};
          border-bottom: 1px solid ${T.border}; text-align: left; white-space: nowrap;
        }
        .prod-table td {
          padding: 12px 14px; font-size: 12px; color: ${T.sub};
          border-bottom: 1px solid ${T.border}; white-space: nowrap;
        }
        .prod-table tbody tr { transition: background 0.12s; }
        .prod-table tbody tr:hover td { background: ${T.border}40; }
        .prod-table tbody tr:last-child td { border-bottom: none; }

        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 4px; }
      `}</style>

      <div style={{ animation: 'fadeUp 0.4s ease both', fontFamily: 'Syne, sans-serif' }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Manajemen</p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: '-0.01em' }}>Daftar Produk</h2>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: T.border, borderRadius: 10, padding: 3, gap: 2 }}>
              {[['grid', (
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <rect x="1" y="1" width="4.5" height="4.5" rx="1" fill="currentColor" opacity="0.8"/>
                  <rect x="7.5" y="1" width="4.5" height="4.5" rx="1" fill="currentColor" opacity="0.5"/>
                  <rect x="1" y="7.5" width="4.5" height="4.5" rx="1" fill="currentColor" opacity="0.5"/>
                  <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" fill="currentColor" opacity="0.8"/>
                </svg>
              )], ['table', (
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M1 3.5h11M1 6.5h11M1 9.5h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              )]].map(([mode, icon]) => (
                <button key={mode} onClick={() => setViewMode(mode)} style={{
                  width: 30, height: 28, borderRadius: 8,
                  border: 'none',
                  background: viewMode === mode ? T.surface : 'transparent',
                  color: viewMode === mode ? T.accent : T.muted,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                  boxShadow: viewMode === mode ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                }}>{icon}</button>
              ))}
            </div>

            <button
              onClick={() => setShowImport(true)}
              style={{ padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', transition: 'all 0.15s', border: `1px solid ${T.purple}35`, background: T.purple + '10', color: T.purple, display: 'flex', alignItems: 'center', gap: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = T.purple + '20'}
              onMouseLeave={e => e.currentTarget.style.background = T.purple + '10'}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4 5h5M4 7h3M4 9h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              Import Excel
            </button>
            <button
              onClick={() => setShowForm(true)}
              style={{ padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', transition: 'all 0.15s', border: `1px solid ${T.green}40`, background: T.green + '14', color: T.green, display: 'flex', alignItems: 'center', gap: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = T.green + '24'}
              onMouseLeave={e => e.currentTarget.style.background = T.green + '14'}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              Tambah Produk
            </button>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
          <StatCard label="Total Produk" value={total} color={T.blue} icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="6" height="6" rx="1.5" stroke={T.blue} strokeWidth="1.5"/><rect x="10" y="2" width="6" height="6" rx="1.5" stroke={T.blue} strokeWidth="1.5"/><rect x="2" y="10" width="6" height="6" rx="1.5" stroke={T.blue} strokeWidth="1.5"/><rect x="10" y="10" width="6" height="6" rx="1.5" stroke={T.blue} strokeWidth="1.5"/></svg>
          }/>
          <StatCard label="Stok Aman" value={aman} color={T.green} icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9l3.5 3.5L14 5" stroke={T.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          }/>
          <StatCard label="Stok Menipis" value={menipis} color={T.accent} icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2L16 14H2L9 2Z" stroke={T.accent} strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 7v3.5M9 12v.5" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round"/></svg>
          }/>
          <StatCard label="Stok Habis" value={habis} color={T.red} icon={
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke={T.red} strokeWidth="1.5"/><path d="M6 9h6" stroke={T.red} strokeWidth="1.8" strokeLinecap="round"/></svg>
          }/>
        </div>

        {/* ── FILTER BAR ── */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 180px auto', gap: 10, alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', opacity: 0.35, pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="5.5" cy="5.5" r="4" stroke={T.sub} strokeWidth="1.4"/>
                <path d="M8.5 8.5L11 11" stroke={T.sub} strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <input
                type="text" value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Cari nama produk…"
                className="filter-input"
                style={{ paddingLeft: 30 }}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 16, lineHeight: 1 }}>×</button>
              )}
            </div>

            {/* Category */}
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="filter-input" style={{ cursor: 'pointer' }}>
              <option value="">Semua Kategori</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {/* Status */}
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="filter-input" style={{ cursor: 'pointer' }}>
              <option value="">Semua Status</option>
              <option value="aman">✅ Stok Aman</option>
              <option value="menipis">⚠️ Stok Menipis</option>
              <option value="habis">❌ Stok Habis</option>
            </select>

            {/* Reset */}
            <button
              onClick={() => { setSearchTerm(''); setFilterCategory(''); setFilterStatus(''); }}
              style={{ padding: '9px 12px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, fontSize: 11, fontWeight: 700, fontFamily: 'Syne, sans-serif', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { e.currentTarget.style.background = T.border; e.currentTarget.style.color = T.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.sub; }}
            >
              Reset
            </button>
          </div>

          {/* Result count */}
          <div style={{ marginTop: 10, fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
            <span style={{ color: T.accent, fontWeight: 700 }}>{filteredProducts.length}</span>
            <span> / {products.length} produk ditampilkan</span>
            {searchTerm && <span style={{ color: T.sub }}> · "{searchTerm}"</span>}
          </div>
        </div>

        {/* ── PRODUCT CONTENT ── */}
        {filteredProducts.length === 0 ? (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto 16px', opacity: 0.25 }}>
              <rect x="6" y="6" width="36" height="36" rx="6" stroke={T.sub} strokeWidth="2"/>
              <path d="M16 24h16M16 32h10M16 16h6" stroke={T.sub} strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p style={{ fontSize: 15, fontWeight: 700, color: T.muted, marginBottom: 8 }}>
              {products.length === 0 ? 'Belum ada produk' : 'Tidak ada produk yang cocok'}
            </p>
            <p style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>
              {products.length === 0 ? 'Mulai dengan menambahkan produk pertama' : 'Coba ubah atau hapus filter'}
            </p>
            {products.length === 0 ? (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setShowImport(true)} style={{ padding: '9px 18px', borderRadius: 10, border: `1px solid ${T.purple}35`, background: T.purple + '10', color: T.purple, fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Import Excel</button>
                <button onClick={() => setShowForm(true)} style={{ padding: '9px 18px', borderRadius: 10, border: `1px solid ${T.green}35`, background: T.green + '10', color: T.green, fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Tambah Manual</button>
              </div>
            ) : (
              <button onClick={() => { setSearchTerm(''); setFilterCategory(''); setFilterStatus(''); }} style={{ padding: '9px 18px', borderRadius: 10, border: `1px solid ${T.blue}35`, background: T.blue + '10', color: T.blue, fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Reset Filter</button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={() => setEditingProduct(product)}
                onDelete={() => handleDelete(product.id)}
                isDeleting={deletingId === product.id}
                isConfirmingDelete={confirmDeleteId === product.id}
                onConfirmDelete={() => setConfirmDeleteId(product.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
              />
            ))}
          </div>
        ) : (
          /* TABLE VIEW */
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="prod-table">
                <thead>
                  <tr>
                    {['Nama Produk', 'Kategori', 'Jual Per', 'Harga Pcs', 'Harga Pack', 'Harga Dus', 'Harga Kg', 'Stok', 'Min', 'Aksi'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => {
                    const outOfStock = (product.stock || 0) === 0;
                    const lowStock   = !outOfStock && (product.stock || 0) <= (product.min_stock || 0);
                    const stockColor = outOfStock ? T.red : lowStock ? T.accent : T.green;
                    return (
                      <tr key={product.id}>
                        <td><span style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>{product.name}</span></td>
                        <td>
                          <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700, background: (product.category_color || T.blue) + '16', border: `1px solid ${(product.category_color || T.blue)}25`, color: product.category_color || T.blue }}>
                            {product.category_name || '—'}
                          </span>
                        </td>
                        <td>
                          <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700, background: T.border2, color: T.sub }}>
                            {product.sell_per_unit || 'all'}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: product.price_pcs ? T.text : T.muted }}>{fmt(product.price_pcs) || '—'}</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: product.price_pack ? T.text : T.muted }}>{fmt(product.price_pack) || '—'}</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: product.price_dus ? T.text : T.muted }}>{fmt(product.price_dus) || '—'}</td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: product.price_kg ? T.text : T.muted }}>{fmt(product.price_kg) || '—'}</td>
                        <td>
                          <span style={{ padding: '2px 9px', borderRadius: 100, fontSize: 11, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', background: stockColor + '14', border: `1px solid ${stockColor}30`, color: stockColor }}>
                            {product.stock ?? 0}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: T.muted }}>{product.min_stock ?? 0}</td>
                        <td>
                          {confirmDeleteId === product.id ? (
                            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                              <span style={{ fontSize: 10, color: T.red, fontWeight: 600 }}>Hapus?</span>
                              <button onClick={() => handleDelete(product.id)} disabled={deletingId === product.id} style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid ${T.red}40`, background: T.red + '15', color: T.red, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>{deletingId === product.id ? '…' : 'Ya'}</button>
                              <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>Batal</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button onClick={() => setEditingProduct(product)} style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${T.blue}30`, background: T.blue + '0C', color: T.blue, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>Edit</button>
                              <button onClick={() => setConfirmDeleteId(product.id)} style={{ padding: '5px 8px', borderRadius: 7, border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 2.5h8M4 2.5V2a1 1 0 012 0v.5M4.5 5v2.5M6.5 5v2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><rect x="2" y="2.5" width="7" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/></svg>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
                <span style={{ color: T.accent, fontWeight: 700 }}>{filteredProducts.length}</span> dari {products.length} produk
              </span>
              <div style={{ display: 'flex', gap: 12 }}>
                {[[T.green, 'Aman'], [T.accent, 'Menipis'], [T.red, 'Habis']].map(([c, l]) => (
                  <span key={l} style={{ fontSize: 10, color: T.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block' }}/>
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && <ProductForm onClose={() => setShowForm(false)} onSuccess={() => { loadData(); setShowForm(false); }} />}
      {showImport && <ImportExcel onClose={() => setShowImport(false)} onSuccess={() => { loadData(); setShowImport(false); }} />}
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