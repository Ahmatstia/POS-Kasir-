import React, { useState, useEffect } from 'react';
import { getCategories, getProductById, updateProduct } from '../../services/database';
import { FormModal, FormActions, MODAL_CSS, fieldStyle, Field, SELL_UNIT_OPTIONS } from './ProductForm';
import { useToast } from '../Toast';

const T = {
  bg: '#0E0F11', surface: '#161719', border: '#1F2023', border2: '#2A2B2F',
  text: '#F0EDE6', muted: '#5C5C66', sub: '#9998A3',
  accent: '#F5A623', green: '#34C98B', red: '#E85858',
  blue: '#5B8AF5', purple: '#A78BFA',
};

function EditProductForm({ productId, onClose, onSuccess }) {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [errors, setErrors]         = useState({});

  const [name, setName]               = useState('');
  const [categoryId, setCategoryId]   = useState('');
  const [notes, setNotes]             = useState('');
  const [minStock, setMinStock]       = useState(0);
  const [sellPerUnit, setSellPerUnit] = useState('all');
  const [pricePcs, setPricePcs]       = useState(0);
  const [pricePack, setPricePack]     = useState(0);
  const [priceDus, setPriceDus]       = useState(0);
  const [priceKg, setPriceKg]         = useState(0);
  const [pcsPerPack, setPcsPerPack]   = useState(1);
  const [packPerDus, setPackPerDus]   = useState(1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [cats, product] = await Promise.all([getCategories(), getProductById(productId)]);
      setCategories(cats);
      if (product) {
        setName(product.name || '');
        setCategoryId(product.category_id || '');
        setNotes(product.notes || '');
        setMinStock(product.min_stock || 0);
        setSellPerUnit(product.sell_per_unit || 'all');
        setPricePcs(product.price_pcs   || 0);
        setPricePack(product.price_pack || 0);
        setPriceDus(product.price_dus   || 0);
        setPriceKg(product.price_kg     || 0);
        setPcsPerPack(product.pcs_per_pack || 1);
        setPackPerDus(product.pack_per_dus || 1);
      }
      setLoading(false);
    })();
  }, [productId]);

  const validate = () => {
    const errs = {};
    if (!name.trim())   errs.name = 'Nama produk harus diisi';
    if (!categoryId)    errs.category = 'Kategori harus dipilih';
    const prices = [Number(pricePcs), Number(pricePack), Number(priceDus), Number(priceKg)];
    if (prices.every(p => p <= 0)) errs.price = 'Minimal satu harga jual harus diisi';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    const result = await updateProduct(productId, {
      name: name.trim(),
      category_id:  categoryId,
      sell_per_unit: sellPerUnit,
      price_pcs:    Number(pricePcs)    || 0,
      price_pack:   Number(pricePack)   || 0,
      price_dus:    Number(priceDus)    || 0,
      price_kg:     Number(priceKg)     || 0,
      pcs_per_pack: Number(pcsPerPack)  || 1,
      pack_per_dus: Number(packPerDus)  || 1,
      min_stock:    Number(minStock)    || 0,
      notes,
    });
    setSaving(false);

    if (result.success) {
      showToast('success', `Produk "${name.trim()}" berhasil diperbarui`);
      onSuccess();
      onClose();
    } else {
      showToast('error', 'Gagal mengupdate produk: ' + result.error);
    }
  };

  if (loading) {
    return (
      <FormModal title="Edit Produk" subtitle="Memuat data…" onClose={onClose}>
        <style>{MODAL_CSS}</style>
        <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[240, 200, 240, 200].map((w, i) => (
            <div key={i} style={{ height: 38, borderRadius: 10, background: T.border, width: w, animation: 'shimmer 1.2s ease infinite' }} />
          ))}
        </div>
      </FormModal>
    );
  }

  return (
    <FormModal title="Edit Produk" subtitle="Ubah Data Produk" onClose={onClose}>
      <style>{MODAL_CSS}</style>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Nama Produk" required error={errors.name}>
            <input type="text" value={name} onChange={e => { setName(e.target.value); setErrors(v => ({...v, name: ''})); }}
              required className="form-field" style={{ ...fieldStyle, borderColor: errors.name ? T.red : undefined }} />
          </Field>
          <Field label="Kategori" required error={errors.category}>
            <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setErrors(v => ({...v, category: ''})); }}
              required className="form-field" style={{ ...fieldStyle, cursor: 'pointer', borderColor: errors.category ? T.red : undefined }}>
              <option value="">Pilih Kategori…</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>

        {/* Sell per unit */}
        <Field label="Jual Per Satuan" hint="mengontrol tombol di kasir">
          <select value={sellPerUnit} onChange={e => setSellPerUnit(e.target.value)}
            className="form-field" style={{ ...fieldStyle, cursor: 'pointer' }}>
            {SELL_UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: errors.price ? T.red : T.muted, textTransform: 'uppercase' }}>Harga Jual</p>
            {errors.price && <p style={{ fontSize: 10, color: T.red, fontWeight: 600 }}>⚠ {errors.price}</p>}
          </div>
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
                  <input type="number" value={u.val} onChange={e => { u.set(e.target.value); setErrors(v => ({...v, price: ''})); }}
                    placeholder="0" className="form-field" style={{ ...fieldStyle, paddingLeft: 26, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Min stock + notes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
          <Field label="Minimal Stok">
            <input type="number" value={minStock} onChange={e => setMinStock(e.target.value)} min="0" placeholder="0" className="form-field" style={{ ...fieldStyle, fontFamily: 'JetBrains Mono, monospace' }} />
          </Field>
          <Field label="Keterangan">
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opsional…" className="form-field" style={fieldStyle} />
          </Field>
        </div>

        {/* Notice */}
        <div style={{ padding: '10px 14px', borderRadius: 10, background: T.blue + '10', border: `1px solid ${T.blue}25`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke={T.blue} strokeWidth="1.4"/><path d="M7 6v4M7 4.5v.5" stroke={T.blue} strokeWidth="1.4" strokeLinecap="round"/></svg>
          <p style={{ fontSize: 11, color: T.blue }}>Untuk mengubah stok, gunakan halaman <strong>Inventori</strong>.</p>
        </div>

        <FormActions onClose={onClose} loading={saving} submitLabel="✓ Simpan Perubahan" loadingLabel="Menyimpan…" />
      </form>
    </FormModal>
  );
}

export default EditProductForm;