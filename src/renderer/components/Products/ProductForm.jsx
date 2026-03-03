import React, { useState, useEffect } from 'react';
import { getCategories, addProduct } from '../../services/database';

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

// ─── SHARED FORM STYLES ───────────────────────────────────────────────────────
const fieldStyle = {
  width: '100%', padding: '9px 12px',
  borderRadius: 10, border: `1px solid ${T.border2}`,
  background: T.bg, color: T.text,
  fontFamily: 'Syne, sans-serif', fontSize: 13,
  outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
};

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: T.muted, marginBottom: 7,
      }}>
        {label}
        {required && <span style={{ color: T.accent, fontSize: 10 }}>✱</span>}
        {hint && <span style={{ color: T.muted, fontWeight: 400, letterSpacing: 0, textTransform: 'none', fontSize: 9, marginLeft: 2 }}>({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function ProductForm({ onClose, onSuccess }) {
  const [categories, setCategories]   = useState([]);
  const [loading, setLoading]         = useState(false);
  const [formData, setFormData]       = useState({
    name: '', category_id: '',
    price_pcs: '', price_pack: '', price_dus: '', price_kg: '',
    stock_pcs: '', stock_pack: '', stock_dus: '', stock_kg: '',
    min_stock: '', notes: '',
    pcs_per_pack: '1', pack_per_dus: '1',
  });

  useEffect(() => {
    getCategories().then(data => {
      setCategories(data);
      if (data.length > 0) setFormData(prev => ({ ...prev, category_id: data[0].id }));
    });
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.name) { alert('Nama produk harus diisi'); setLoading(false); return; }
    if (!formData.category_id) { alert('Kategori harus diisi'); setLoading(false); return; }

    // Hitung total stok dalam base unit (pcs)
    const pcsPerPack = parseInt(formData.pcs_per_pack) || 1;
    const packPerDus = parseInt(formData.pack_per_dus) || 1;
    
    const sPcs  = parseInt(formData.stock_pcs)  || 0;
    const sPack = parseInt(formData.stock_pack) || 0;
    const sDus  = parseInt(formData.stock_dus)  || 0;
    const sKg   = parseFloat(formData.stock_kg) || 0;

    const totalBaseStock = sPcs + (sPack * pcsPerPack) + (sDus * packPerDus * pcsPerPack) + sKg;

    const result = await addProduct({
      name: formData.name,
      category_id: parseInt(formData.category_id),
      sell_per_unit: 'all',
      price_pcs:  formData.price_pcs  ? parseInt(formData.price_pcs)  : 0,
      price_pack: formData.price_pack ? parseInt(formData.price_pack) : 0,
      price_dus:  formData.price_dus  ? parseInt(formData.price_dus)  : 0,
      price_kg:   formData.price_kg   ? parseInt(formData.price_kg)   : 0,
      stock:      totalBaseStock,
      min_stock:  formData.min_stock  ? parseInt(formData.min_stock)  : 0,
      pcs_per_pack: pcsPerPack,
      pack_per_dus: packPerDus,
      notes: formData.notes || '',
    });

    setLoading(false);
    if (result.success) { onSuccess(); onClose(); }
    else alert('Gagal menambahkan produk: ' + result.error);
  };

  return <FormModal title="Tambah Produk Baru" onClose={onClose}>
    <style>{MODAL_CSS}</style>
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Name */}
        <Field label="Nama Produk" required>
          <input name="name" type="text" value={formData.name} onChange={handleChange}
            required autoFocus placeholder="Nama produk…"
            className="form-field" style={fieldStyle} />
        </Field>

        {/* Category */}
        <Field label="Kategori" required>
          <select name="category_id" value={formData.category_id} onChange={handleChange}
            required className="form-field" style={{ ...fieldStyle, cursor: 'pointer' }}>
            <option value="">Pilih Kategori…</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>

        {/* Conversion Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: T.border + '50', padding: 12, borderRadius: 12, border: `1px dashed ${T.border2}` }}>
          <Field label="Isi per Pack" hint="Berapa Pcs dalam 1 Pack?">
            <input name="pcs_per_pack" type="number" value={formData.pcs_per_pack} onChange={handleChange}
              placeholder="1" className="form-field" style={fieldStyle} />
          </Field>
          <Field label="Isi per Dus" hint="Berapa Pack dalam 1 Dus?">
            <input name="pack_per_dus" type="number" value={formData.pack_per_dus} onChange={handleChange}
              placeholder="1" className="form-field" style={fieldStyle} />
          </Field>
        </div>

        {/* Price fields */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12 }}>
          <Field label="Harga Pcs">
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: T.muted, fontFamily: 'JetBrains Mono, monospace', pointerEvents: 'none' }}>Rp</span>
              <input name="price_pcs" type="number" value={formData.price_pcs} onChange={handleChange}
                placeholder="0" className="form-field" style={{ ...fieldStyle, paddingLeft: 30, fontFamily: 'JetBrains Mono, monospace' }} />
            </div>
          </Field>
          <Field label="Harga Pack">
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: T.muted, fontFamily: 'JetBrains Mono, monospace', pointerEvents: 'none' }}>Rp</span>
              <input name="price_pack" type="number" value={formData.price_pack} onChange={handleChange}
                placeholder="0" className="form-field" style={{ ...fieldStyle, paddingLeft: 30, fontFamily: 'JetBrains Mono, monospace' }} />
            </div>
          </Field>
          <Field label="Harga Dus">
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: T.muted, fontFamily: 'JetBrains Mono, monospace', pointerEvents: 'none' }}>Rp</span>
              <input name="price_dus" type="number" value={formData.price_dus} onChange={handleChange}
                placeholder="0" className="form-field" style={{ ...fieldStyle, paddingLeft: 30, fontFamily: 'JetBrains Mono, monospace' }} />
            </div>
          </Field>
          <Field label="Harga Kg">
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: T.muted, fontFamily: 'JetBrains Mono, monospace', pointerEvents: 'none' }}>Rp</span>
              <input name="price_kg" type="number" value={formData.price_kg} onChange={handleChange}
                placeholder="0" className="form-field" style={{ ...fieldStyle, paddingLeft: 30, fontFamily: 'JetBrains Mono, monospace' }} />
            </div>
          </Field>
        </div>

        {/* Stock Area */}
        <div style={{ background: T.border + '30', padding: 14, borderRadius: 16, border: `1px solid ${T.border}` }}>
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.sub, marginBottom: 12 }}>Input Stok Awal</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <Field label="Jml Dus">
              <input name="stock_dus" type="number" value={formData.stock_dus} onChange={handleChange} placeholder="0" className="form-field" style={fieldStyle} />
            </Field>
            <Field label="Jml Pack">
              <input name="stock_pack" type="number" value={formData.stock_pack} onChange={handleChange} placeholder="0" className="form-field" style={fieldStyle} />
            </Field>
            <Field label="Jml Pcs">
              <input name="stock_pcs" type="number" value={formData.stock_pcs} onChange={handleChange} placeholder="0" className="form-field" style={fieldStyle} />
            </Field>
            <Field label="Jml Kg (Opsional)">
              <input name="stock_kg" type="number" value={formData.stock_kg} onChange={handleChange} placeholder="0" className="form-field" style={fieldStyle} />
            </Field>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            <Field label="Minimal Stok">
              <input name="min_stock" type="number" value={formData.min_stock} onChange={handleChange}
                placeholder="0" className="form-field"
                style={{ ...fieldStyle, fontFamily: 'JetBrains Mono, monospace' }} />
            </Field>
          </div>

          <div style={{ marginTop: 12, textAlign: 'right', fontSize: 11, fontWeight: 700, color: T.accent }}>
            Total Database: {((parseInt(formData.stock_pcs)||0) + ((parseInt(formData.stock_pack)||0)*(parseInt(formData.pcs_per_pack)||1)) + ((parseInt(formData.stock_dus)||0)*(parseInt(formData.pack_per_dus)||1)*(parseInt(formData.pcs_per_pack)||1)) + (parseFloat(formData.stock_kg)||0))} {formData.stock_kg ? 'Pcs/Kg' : 'Pcs'}
          </div>
        </div>

        {/* Notes */}
        <Field label="Keterangan">
          <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3}
            placeholder="Catatan tambahan…" className="form-field"
            style={{ ...fieldStyle, resize: 'vertical', minHeight: 80 }} />
        </Field>
      </div>

      <FormActions onClose={onClose} loading={loading} submitLabel="Tambah Produk" />
    </form>
  </FormModal>;
}

// ─── SHARED MODAL WRAPPER ─────────────────────────────────────────────────────
export function FormModal({ title, subtitle, onClose, children }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Syne, sans-serif',
        animation: 'fadeOverlay 0.2s ease both',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto',
        background: T.surface, border: `1px solid ${T.border2}`,
        borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        animation: 'modalIn 0.25s cubic-bezier(0.16,1,0.3,1) both',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px 16px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: T.surface, zIndex: 10,
        }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, marginBottom: 2 }}>
              {subtitle || 'Formulir'}
            </p>
            <p style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{title}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 9,
              border: `1px solid ${T.border2}`, background: 'transparent',
              color: T.sub, cursor: 'pointer', fontSize: 18, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.border2; e.currentTarget.style.color = T.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.sub; }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 22px 8px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── SHARED ACTION BUTTONS ────────────────────────────────────────────────────
export function FormActions({ onClose, loading, submitLabel = 'Simpan', loadingLabel }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginTop: 24, paddingBottom: 4 }}>
      <button type="button" onClick={onClose} style={{
        padding: '11px', borderRadius: 12,
        border: `1px solid ${T.border2}`, background: 'transparent',
        color: T.sub, fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700,
        cursor: 'pointer', transition: 'all 0.15s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = T.border; e.currentTarget.style.color = T.text; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.sub; }}
      >Batal</button>

      <button type="submit" disabled={loading} style={{
        padding: '11px', borderRadius: 12,
        border: `1px solid ${loading ? T.border2 : T.green + '50'}`,
        background: loading ? T.border : T.green + '18',
        color: loading ? T.muted : T.green,
        fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 800,
        letterSpacing: '0.04em', cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', opacity: loading ? 0.6 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = T.green + '28'; }}
        onMouseLeave={e => { if (!loading) e.currentTarget.style.background = T.green + '18'; }}
      >
        {loading ? (
          <>
            <div style={{
              width: 13, height: 13, border: `2px solid ${T.muted}`,
              borderTopColor: T.green, borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            {loadingLabel || 'Menyimpan…'}
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7.5l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {submitLabel}
          </>
        )}
      </button>
    </div>
  );
}

// ─── SHARED CSS ───────────────────────────────────────────────────────────────
export const MODAL_CSS = `
  @keyframes fadeOverlay { from { opacity:0; } to { opacity:1; } }
  @keyframes modalIn { from { opacity:0; transform: scale(0.96) translateY(10px); } to { opacity:1; transform: scale(1) translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }

  .form-field:focus {
    border-color: ${T.accent}70 !important;
    box-shadow: 0 0 0 2px ${T.accent}12 !important;
  }
  .form-field::placeholder { color: ${T.muted}; }

  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
  input[type=number] { -moz-appearance: textfield; }

  select option { background: ${T.surface}; color: ${T.text}; }
`;

export default ProductForm;