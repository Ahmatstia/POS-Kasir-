import React, { useState, useEffect } from 'react';
import { getCategories, addProduct } from '../../services/database';

const T = {
  bg: '#0E0F11', surface: '#161719', card: '#1A1B1E',
  border: '#1F2023', border2: '#2A2B2F',
  text: '#F0EDE6', muted: '#5C5C66', sub: '#9998A3',
  accent: '#F5A623', green: '#34C98B', red: '#E85858',
  blue: '#5B8AF5', purple: '#A78BFA',
};

// ─── SHARED EXPORTS (used by EditProductForm) ────────────────────────────────
export const MODAL_CSS = `
  @keyframes modalIn  { from { opacity:0; transform:scale(0.96) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
  @keyframes fadeOverlay { from { opacity:0; } to { opacity:1; } }
  @keyframes shimmer  { 0%,100%{opacity:0.4}50%{opacity:0.8} }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; }
  input[type=number] { -moz-appearance: textfield; }
  .form-field:focus { border-color: ${T.accent}80 !important; box-shadow: 0 0 0 2px ${T.accent}12; }
`;

export function FormModal({ title, subtitle, onClose, children }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Syne, sans-serif', animation: 'fadeOverlay 0.2s ease both',
        padding: '20px',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 560,
        background: T.surface, border: `1px solid ${T.border2}`,
        borderRadius: 20, overflow: 'hidden',
        animation: 'modalIn 0.25s cubic-bezier(0.16,1,0.3,1) both',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '18px 22px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, marginBottom: 2 }}>{subtitle}</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{title}</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>×</button>
        </div>
        <div style={{ padding: '20px 22px 22px', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function FormActions({ onClose, loading, submitLabel = 'Simpan', loadingLabel = 'Menyimpan…' }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
      <button type="button" onClick={onClose} style={{ padding: '11px', borderRadius: 12, border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Batal</button>
      <button type="submit" disabled={loading} style={{ padding: '11px', borderRadius: 12, border: `1px solid ${T.green}50`, background: loading ? T.border : T.green + '18', color: loading ? T.muted : T.green, fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800, cursor: loading ? 'wait' : 'pointer', letterSpacing: '0.04em', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {loading ? loadingLabel : submitLabel}
      </button>
    </div>
  );
}

const fieldStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 10,
  border: `1px solid ${T.border2}`, background: T.bg, color: T.text,
  fontFamily: 'Syne, sans-serif', fontSize: 13, outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, marginBottom: 7 }}>
        {label}
        {required && <span style={{ color: T.accent, fontSize: 10 }}>✱</span>}
        {hint    && <span style={{ color: T.muted, fontWeight: 400, letterSpacing: 0, textTransform: 'none', fontSize: 9, marginLeft: 2 }}>({hint})</span>}
      </label>
      {children}
    </div>
  );
}

// ─── PRODUCT FORM (Add New Product) ─────────────────────────────────────────
function ProductForm({ onClose, onSuccess }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(false);

  const [name, setName]             = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes]           = useState('');
  const [minStock, setMinStock]     = useState(0);
  const [pricePcs, setPricePcs]     = useState(0);
  const [pricePack, setPricePack]   = useState(0);
  const [priceDus, setPriceDus]     = useState(0);
  const [priceKg, setPriceKg]       = useState(0);
  const [pcsPerPack, setPcsPerPack] = useState(1);
  const [packPerDus, setPackPerDus] = useState(1);

  useEffect(() => {
    getCategories().then(data => {
      setCategories(data);
      if (data.length > 0) setCategoryId(data[0].id);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim())   return alert('Nama produk harus diisi');
    if (!categoryId)    return alert('Kategori harus dipilih');

    setLoading(true);
    const result = await addProduct({
      name: name.trim(),
      category_id:  categoryId,
      sell_per_unit: 'all',
      price_pcs:    Number(pricePcs)    || 0,
      price_pack:   Number(pricePack)   || 0,
      price_dus:    Number(priceDus)    || 0,
      price_kg:     Number(priceKg)     || 0,
      pcs_per_pack: Number(pcsPerPack)  || 1,
      pack_per_dus: Number(packPerDus)  || 1,
      min_stock:    Number(minStock)    || 0,
      notes,
    });
    setLoading(false);

    if (result.success) { onSuccess(); onClose(); }
    else alert('Gagal menyimpan produk: ' + result.error);
  };

  return (
    <FormModal title="Tambah Produk" subtitle="Data Produk" onClose={onClose}>
      <style>{MODAL_CSS}</style>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Name + Category */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Nama Produk" required>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="form-field" style={fieldStyle} placeholder="Masako, Royco…" autoFocus />
          </Field>
          <Field label="Kategori" required>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required className="form-field" style={{ ...fieldStyle, cursor: 'pointer' }}>
              <option value="">Pilih Kategori…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>

        {/* Conversion */}
        <div style={{ padding: 14, background: T.border + '40', borderRadius: 12, border: `1px dashed ${T.border2}` }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', marginBottom: 10 }}>Faktor Konversi Satuan</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="1 Pack = berapa Pcs?">
              <input type="number" value={pcsPerPack} onChange={e => setPcsPerPack(e.target.value)} min="1" className="form-field" style={{ ...fieldStyle, fontFamily: 'JetBrains Mono, monospace' }} />
            </Field>
            <Field label="1 Dus = berapa Pack?">
              <input type="number" value={packPerDus} onChange={e => setPackPerDus(e.target.value)} min="1" className="form-field" style={{ ...fieldStyle, fontFamily: 'JetBrains Mono, monospace' }} />
            </Field>
          </div>
          {(Number(pcsPerPack) > 1 || Number(packPerDus) > 1) && (
            <p style={{ fontSize: 10, color: T.sub, marginTop: 8, fontFamily: 'JetBrains Mono, monospace' }}>
              1 Dus = {Number(packPerDus)} Pack = {Number(packPerDus) * Number(pcsPerPack)} Pcs
            </p>
          )}
        </div>

        {/* Prices */}
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', marginBottom: 10 }}>Harga Jual</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: 'Pcs',  val: pricePcs,  set: setPricePcs,  col: T.blue   },
              { label: 'Pack', val: pricePack, set: setPricePack, col: T.green  },
              { label: 'Dus',  val: priceDus,  set: setPriceDus,  col: T.accent },
              { label: 'Kg',   val: priceKg,   set: setPriceKg,   col: T.purple },
            ].map(u => (
              <div key={u.label}>
                <label style={{ fontSize: 9, fontWeight: 700, color: u.col, display: 'block', marginBottom: 5 }}>{u.label}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: T.muted, pointerEvents: 'none', fontFamily: 'JetBrains Mono, monospace' }}>Rp</span>
                  <input type="number" value={u.val} onChange={e => u.set(e.target.value)} placeholder="0" className="form-field" style={{ ...fieldStyle, paddingLeft: 26, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Min stock + notes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
          <Field label="Minimal Stok" hint="untuk alert">
            <input type="number" value={minStock} onChange={e => setMinStock(e.target.value)} min="0" placeholder="0" className="form-field" style={{ ...fieldStyle, fontFamily: 'JetBrains Mono, monospace' }} />
          </Field>
          <Field label="Keterangan">
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opsional…" className="form-field" style={fieldStyle} />
          </Field>
        </div>

        {/* Notice: stok diatur di Inventori */}
        <div style={{ padding: '10px 14px', borderRadius: 10, background: T.blue + '10', border: `1px solid ${T.blue}25`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke={T.blue} strokeWidth="1.4"/><path d="M7 6v4M7 4.5v.5" stroke={T.blue} strokeWidth="1.4" strokeLinecap="round"/></svg>
          <p style={{ fontSize: 11, color: T.blue }}>Stok awal diatur di halaman <strong>Inventori</strong> setelah produk disimpan.</p>
        </div>

        <FormActions onClose={onClose} loading={loading} submitLabel="✓ Simpan Produk" loadingLabel="Menyimpan…" />
      </form>
    </FormModal>
  );
}

export default ProductForm;