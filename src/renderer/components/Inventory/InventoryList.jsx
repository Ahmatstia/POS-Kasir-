import React, { useState, useEffect } from "react";
import { getInventorySummary, getLowStockProducts, addStock, adjustStock, getProductBatches } from "../../services/inventory";
import { getCategories } from "../../services/database";

const T = {
  bg: '#0E0F11', surface: '#161719', card: '#1A1B1E',
  border: '#1F2023', border2: '#2A2B2F',
  text: '#F0EDE6', muted: '#5C5C66', sub: '#9998A3',
  accent: '#F5A623', green: '#34C98B', red: '#E85858',
  blue: '#5B8AF5', purple: '#A78BFA',
};

const fmt = n => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;

// ─── STOCK IN MODAL ─────────────────────────────────────────────────────────
function StockInModal({ product, onClose, onSuccess }) {
  const [qtyDus, setQtyDus]   = useState(0);
  const [qtyPack, setQtyPack] = useState(0);
  const [qtyPcs, setQtyPcs]   = useState(0);
  const [buyPrice, setBuyPrice] = useState('');
  const [expiry, setExpiry]   = useState('');
  const [batchCode, setBatch] = useState('');
  const [notes, setNotes]     = useState('');
  const [saving, setSaving]   = useState(false);

  const pp = product.pcs_per_pack || 1;
  const pd = product.pack_per_dus || 1;
  const totalPcs = (Number(qtyDus) * pd * pp) + (Number(qtyPack) * pp) + Number(qtyPcs);

  const handleSave = async () => {
    if (totalPcs <= 0) return alert('Jumlah stok harus lebih dari 0');
    setSaving(true);
    const res = await addStock(product.id, { qty_dus: qtyDus, qty_pack: qtyPack, qty_pcs: qtyPcs, purchase_price: Number(buyPrice) || 0, expiry_date: expiry || null, batch_code: batchCode, notes }, product);
    setSaving(false);
    if (res.success) { onSuccess(); onClose(); }
    else alert('Gagal: ' + res.error);
  };

  const fieldStyle = { width: '100%', padding: '9px 12px', borderRadius: 10, border: `1px solid ${T.border2}`, background: T.bg, color: T.text, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none' };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 480, background: T.surface, borderRadius: 20, border: `1px solid ${T.border2}`, overflow: 'hidden', animation: 'modalIn 0.25s cubic-bezier(0.16,1,0.3,1) both', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
        <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.96) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
        
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 2 }}>Stok Masuk</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{product.name}</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Qty input */}
          <div style={{ background: T.accent + '08', border: `1px solid ${T.accent}25`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: T.accent, textTransform: 'uppercase' }}>Jumlah Stok Masuk</p>
              <p style={{ fontSize: 11, fontWeight: 800, color: T.text }}>Total: <span style={{ color: T.green }}>{totalPcs} Pcs</span></p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[['Dus', qtyDus, setQtyDus], ['Pack', qtyPack, setQtyPack], ['Pcs', qtyPcs, setQtyPcs]].map(([label, val, set]) => (
                <div key={label}>
                  <label style={{ fontSize: 8, fontWeight: 700, color: T.muted, display: 'block', marginBottom: 4 }}>{label} <span style={{ color: T.sub }}>{label === 'Dus' ? `(1 Dus = ${pd} Pack)` : label === 'Pack' ? `(1 Pack = ${pp} Pcs)` : ''}</span></label>
                  <input type="number" min="0" value={val} onChange={e => set(e.target.value)} style={fieldStyle} />
                </div>
              ))}
            </div>
          </div>

          {/* Batch info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Harga Beli / Pcs</label>
              <input type="number" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} placeholder="0" style={{ ...fieldStyle, fontFamily: 'JetBrains Mono, monospace' }} />
            </div>
            <div>
              <label style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Kadaluarsa (opsional)</label>
              <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} style={fieldStyle} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Kode Batch (opsional, auto jika kosong)</label>
            <input value={batchCode} onChange={e => setBatch(e.target.value)} placeholder="Misal: BATCH-MAR-001" style={fieldStyle} />
          </div>
          <div>
            <label style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Catatan</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opsional…" style={fieldStyle} />
          </div>

          {/* Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{ padding: '11px', borderRadius: 11, border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Batal</button>
            <button onClick={handleSave} disabled={saving || totalPcs === 0} style={{ padding: '11px', borderRadius: 11, border: `1px solid ${T.green}50`, background: T.green + '18', color: T.green, fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: totalPcs === 0 ? 0.5 : 1 }}>
              {saving ? 'Menyimpan…' : `✓ Tambah ${totalPcs} Pcs`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ADJUST MODAL ────────────────────────────────────────────────────────────
function AdjustModal({ product, onClose, onSuccess }) {
  const [newQty, setNewQty] = useState(product.stock || 0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const diff = Number(newQty) - (product.stock || 0);

  const handleSave = async () => {
    if (!reason.trim()) return alert('Alasan koreksi wajib diisi');
    setSaving(true);
    const res = await adjustStock(product.id, Number(newQty), reason);
    setSaving(false);
    if (res.success) { onSuccess(); onClose(); }
    else alert('Gagal: ' + res.error);
  };

  const fieldStyle = { width: '100%', padding: '9px 12px', borderRadius: 10, border: `1px solid ${T.border2}`, background: T.bg, color: T.text, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, outline: 'none' };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 400, background: T.surface, borderRadius: 20, border: `1px solid ${T.border2}`, overflow: 'hidden', animation: 'modalIn 0.25s cubic-bezier(0.16,1,0.3,1) both', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 2 }}>Koreksi Stok</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{product.name}</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: T.border + '40', borderRadius: 10, padding: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: T.sub }}>Stok saat ini</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: T.text }}>{product.stock || 0} Pcs</span>
          </div>
          <div>
            <label style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Stok Baru (Pcs)</label>
            <input type="number" min="0" value={newQty} onChange={e => setNewQty(e.target.value)} style={fieldStyle} />
            {diff !== 0 && <p style={{ fontSize: 11, marginTop: 6, color: diff > 0 ? T.green : T.red }}>{diff > 0 ? `+${diff}` : diff} Pcs dari sekarang</p>}
          </div>
          <div>
            <label style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Alasan Koreksi *</label>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Misal: Stok opname, barang hilang…" style={{ ...fieldStyle, fontFamily: 'Syne, sans-serif' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '11px', borderRadius: 11, border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Batal</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '11px', borderRadius: 11, border: `1px solid ${T.accent}50`, background: T.accent + '18', color: T.accent, fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
              {saving ? 'Menyimpan…' : '✓ Simpan Koreksi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN INVENTORY LIST ─────────────────────────────────────────────────────
function InventoryList() {
  const [products, setProducts]           = useState([]);
  const [categories, setCategories]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [searchTerm, setSearchTerm]       = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus]   = useState('');
  const [stockInProduct, setStockInProduct] = useState(null);
  const [adjustProduct, setAdjustProduct] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [inv, cats] = await Promise.all([getInventorySummary(), getCategories()]);
    setProducts(inv);
    setCategories(cats);
    setLoading(false);
  };

  const filtered = products.filter(p => {
    const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat    = !filterCategory || p.category_id === parseInt(filterCategory);
    const stockStatus = p.stock <= 0 ? 'habis' : p.stock <= p.min_stock ? 'menipis' : 'aman';
    const matchStatus = !filterStatus || stockStatus === filterStatus;
    return matchSearch && matchCat && matchStatus;
  });

  const summary = {
    aman:    products.filter(p => p.stock > p.min_stock).length,
    menipis: products.filter(p => p.stock > 0 && p.stock <= p.min_stock).length,
    habis:   products.filter(p => p.stock <= 0).length,
  };

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .inv-row:hover td { background: ${T.border}40; }
        input:focus, select:focus { border-color: ${T.accent}70 !important; box-shadow: 0 0 0 2px ${T.accent}12; }
      `}</style>

      <div style={{ animation: 'fadeUp 0.4s ease both', fontFamily: 'Syne, sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Manajemen Stok</p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Inventori</h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {summary.menipis > 0 && <div style={{ padding: '5px 12px', borderRadius: 100, background: T.accent + '12', border: `1px solid ${T.accent}30`, fontSize: 11, fontWeight: 700, color: T.accent }}>{summary.menipis} Menipis</div>}
            {summary.habis > 0   && <div style={{ padding: '5px 12px', borderRadius: 100, background: T.red    + '12', border: `1px solid ${T.red}30`,    fontSize: 11, fontWeight: 700, color: T.red    }}>{summary.habis} Habis</div>}
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Stok Aman',    val: summary.aman,    color: T.green  },
            { label: 'Stok Menipis', val: summary.menipis, color: T.accent },
            { label: 'Stok Habis',   val: summary.habis,   color: T.red    },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.08em' }}>{label}</p>
                <p style={{ fontSize: 24, fontWeight: 800, color, fontFamily: 'JetBrains Mono, monospace' }}>{val}</p>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="7" width="16" height="10" rx="2" stroke={color} strokeWidth="1.5"/><path d="M5 7V5a4 4 0 018 0v2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 14, display: 'grid', gridTemplateColumns: '1fr 180px 180px', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="5.5" cy="5.5" r="4" stroke={T.sub} strokeWidth="1.4"/><path d="M8.5 8.5L11 11" stroke={T.sub} strokeWidth="1.4" strokeLinecap="round"/></svg>
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Cari produk…" style={{ width: '100%', padding: '9px 12px 9px 30px', borderRadius: 9, border: `1px solid ${T.border2}`, background: T.bg, color: T.text, fontFamily: 'Syne, sans-serif', fontSize: 12, outline: 'none' }} />
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '9px 12px', borderRadius: 9, border: `1px solid ${T.border2}`, background: T.bg, color: T.text, fontFamily: 'Syne, sans-serif', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
            <option value="">Semua Kategori</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '9px 12px', borderRadius: 9, border: `1px solid ${T.border2}`, background: T.bg, color: T.text, fontFamily: 'Syne, sans-serif', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
            <option value="">Semua Status</option>
            <option value="aman">✅ Aman</option>
            <option value="menipis">⚠️ Menipis</option>
            <option value="habis">❌ Habis</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ width: 30, height: 30, border: `2px solid ${T.border2}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 12, color: T.muted }}>Memuat inventori…</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Syne, sans-serif' }}>
                <thead>
                  <tr>
                    {['Produk', 'Kategori', 'Stok (Pcs)', 'Konversi', 'Min Stok', 'Status', 'Aksi'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const outOfStock = p.stock <= 0;
                    const lowStock   = !outOfStock && p.stock <= p.min_stock;
                    const statusColor = outOfStock ? T.red : lowStock ? T.accent : T.green;
                    const statusLabel = outOfStock ? 'Habis' : lowStock ? 'Menipis' : 'Aman';
                    return (
                      <tr key={p.id} className="inv-row">
                        <td style={{ padding: '12px 14px', borderBottom: `1px solid ${T.border}` }}>
                          <p style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>{p.name}</p>
                        </td>
                        <td style={{ padding: '12px 14px', borderBottom: `1px solid ${T.border}` }}>
                          <span style={{ padding: '2px 9px', borderRadius: 100, fontSize: 10, fontWeight: 700, background: (p.category_color || T.blue) + '18', color: p.category_color || T.blue, border: `1px solid ${(p.category_color || T.blue)}30` }}>
                            {p.category_name || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', borderBottom: `1px solid ${T.border}` }}>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 800, color: statusColor }}>{p.stock}</span>
                        </td>
                        <td style={{ padding: '12px 14px', borderBottom: `1px solid ${T.border}`, fontSize: 10, color: T.sub, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.8 }}>
                          {p.pcs_per_pack > 1 && <div>1 Pack = {p.pcs_per_pack} Pcs</div>}
                          {p.pack_per_dus  > 1  && <div>1 Dus = {p.pack_per_dus} Pack</div>}
                          {p.pcs_per_pack <= 1 && p.pack_per_dus <= 1 && <span style={{ color: T.muted }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 14px', borderBottom: `1px solid ${T.border}`, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: T.sub }}>
                          {p.min_stock}
                        </td>
                        <td style={{ padding: '12px 14px', borderBottom: `1px solid ${T.border}` }}>
                          <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 10, fontWeight: 700, background: statusColor + '15', color: statusColor, border: `1px solid ${statusColor}30` }}>
                            {statusLabel}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', borderBottom: `1px solid ${T.border}` }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setStockInProduct(p)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: `1px solid ${T.green}35`, background: T.green + '10', color: T.green, cursor: 'pointer', fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap' }}>
                              + Stok Masuk
                            </button>
                            <button onClick={() => setAdjustProduct(p)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: `1px solid ${T.accent}35`, background: T.accent + '10', color: T.accent, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
                              Koreksi
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: T.muted, fontSize: 13 }}>Tidak ada produk yang cocok</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace', display: 'flex', justifyContent: 'space-between' }}>
            <span>Menampilkan <span style={{ color: T.accent, fontWeight: 700 }}>{filtered.length}</span> dari {products.length} produk</span>
            <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {stockInProduct && <StockInModal product={stockInProduct} onClose={() => setStockInProduct(null)} onSuccess={load} />}
      {adjustProduct  && <AdjustModal  product={adjustProduct}  onClose={() => setAdjustProduct(null)}  onSuccess={load} />}
    </>
  );
}

export default InventoryList;
