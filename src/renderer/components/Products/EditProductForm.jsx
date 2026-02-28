import React, { useState, useEffect } from 'react';
import { getCategories, getProductById, updateProduct } from '../../services/database';
import { FormModal, FormActions, MODAL_CSS } from './ProductForm';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  bg:      '#0E0F11',
  surface: '#161719',
  border:  '#1F2023',
  border2: '#2A2B2F',
  text:    '#F0EDE6',
  muted:   '#5C5C66',
  sub:     '#9998A3',
  accent:  '#F5A623',
  green:   '#34C98B',
  blue:    '#5B8AF5',
  purple:  '#A78BFA',
};

const fieldStyle = {
  width: '100%', padding: '9px 12px',
  borderRadius: 10, border: `1px solid ${T.border2}`,
  background: T.bg, color: T.text,
  fontFamily: 'Syne, sans-serif', fontSize: 13,
  outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
};

function Field({ label, required, children }) {
  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: T.muted, marginBottom: 7,
      }}>
        {label}
        {required && <span style={{ color: T.accent, fontSize: 10 }}>✱</span>}
      </label>
      {children}
    </div>
  );
}

function EditProductForm({ productId, onClose, onSuccess }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [formData, setFormData]     = useState({
    name: '', category_id: '',
    price_pcs: '', price_pack: '', price_kg: '',
    stock: '', min_stock: '', notes: '',
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [cats, product] = await Promise.all([
        getCategories(),
        getProductById(productId),
      ]);
      setCategories(cats);
      if (product) {
        setFormData({
          name:        product.name        || '',
          category_id: product.category_id || '',
          price_pcs:   product.price_pcs   || '',
          price_pack:  product.price_pack  || '',
          price_kg:    product.price_kg    || '',
          stock:       product.stock       || '',
          min_stock:   product.min_stock   || '',
          notes:       product.notes       || '',
        });
      }
      setLoading(false);
    })();
  }, [productId]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await updateProduct(productId, {
      ...formData,
      price_pcs:   formData.price_pcs   ? parseInt(formData.price_pcs)   : 0,
      price_pack:  formData.price_pack  ? parseInt(formData.price_pack)  : 0,
      price_kg:    formData.price_kg    ? parseInt(formData.price_kg)    : 0,
      stock:       formData.stock       ? parseInt(formData.stock)       : 0,
      min_stock:   formData.min_stock   ? parseInt(formData.min_stock)   : 0,
      category_id: parseInt(formData.category_id),
    });
    setSaving(false);
    if (result.success) { onSuccess(); onClose(); }
    else alert('Gagal mengupdate produk: ' + result.error);
  };

  // Loading skeleton inside modal
  if (loading) {
    return (
      <FormModal title="Edit Produk" subtitle="Memuat data…" onClose={onClose}>
        <style>{MODAL_CSS}</style>
        <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[120, 80, 200, 100, 80].map((w, i) => (
            <div key={i} style={{
              height: 38, borderRadius: 10, background: T.border,
              width: `${w}%` === '200%' ? '100%' : w + 'px',
              animation: 'shimmer 1.2s ease infinite',
            }} />
          ))}
          <style>{`@keyframes shimmer { 0%,100%{opacity:0.4}50%{opacity:0.8} }`}</style>
        </div>
      </FormModal>
    );
  }

  return (
    <FormModal title="Edit Produk" subtitle="Ubah data produk" onClose={onClose}>
      <style>{MODAL_CSS}</style>

      {/* Edit badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 100, marginBottom: 18,
        background: T.accent + '10', border: `1px solid ${T.accent}28`,
        fontSize: 11, fontWeight: 700, color: T.accent,
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M8 1.5l1.5 1.5L4 8.5H2.5V7L8 1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
        ID #{productId}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Name */}
          <Field label="Nama Produk" required>
            <input name="name" type="text" value={formData.name} onChange={handleChange}
              required className="form-field" style={fieldStyle} />
          </Field>

          {/* Category */}
          <Field label="Kategori" required>
            <select name="category_id" value={formData.category_id} onChange={handleChange}
              required className="form-field" style={{ ...fieldStyle, cursor: 'pointer' }}>
              <option value="">Pilih Kategori…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          {/* Prices */}
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, marginBottom: 10 }}>
              Harga
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { key: 'price_pcs',  label: 'Pcs',  color: T.blue   },
                { key: 'price_pack', label: 'Pack', color: T.green  },
                { key: 'price_kg',   label: 'Kg',   color: T.purple },
              ].map(({ key, label, color }) => (
                <div key={key}>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase', marginBottom: 6,
                    color,
                  }}>{label}</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 9, color: T.muted, fontFamily: 'JetBrains Mono, monospace', pointerEvents: 'none',
                    }}>Rp</span>
                    <input name={key} type="number" value={formData[key]} onChange={handleChange}
                      placeholder="0" className="form-field"
                      style={{ ...fieldStyle, paddingLeft: 26, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stock */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Stok">
              <input name="stock" type="number" value={formData.stock} onChange={handleChange}
                placeholder="0" className="form-field"
                style={{ ...fieldStyle, fontFamily: 'JetBrains Mono, monospace' }} />
            </Field>
            <Field label="Minimal Stok">
              <input name="min_stock" type="number" value={formData.min_stock} onChange={handleChange}
                placeholder="0" className="form-field"
                style={{ ...fieldStyle, fontFamily: 'JetBrains Mono, monospace' }} />
            </Field>
          </div>

          {/* Notes */}
          <Field label="Keterangan">
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3}
              placeholder="Catatan tambahan…" className="form-field"
              style={{ ...fieldStyle, resize: 'vertical', minHeight: 80 }} />
          </Field>
        </div>

        <FormActions
          onClose={onClose}
          loading={saving}
          submitLabel="Simpan Perubahan"
          loadingLabel="Menyimpan…"
        />
      </form>
    </FormModal>
  );
}

export default EditProductForm;