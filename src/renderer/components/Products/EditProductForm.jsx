import React, { useState, useEffect } from 'react';
import { getCategories, getProductById, updateProduct } from '../../services/database';
import { FormModal, FormActions, MODAL_CSS, fieldStyle, Field, SELL_UNIT_OPTIONS } from './ProductForm';
import { useToast } from '../Toast';
import { T } from '../../theme';

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
  const [minStockKg, setMinStockKg]   = useState(0);
  const [sellPerUnit, setSellPerUnit] = useState('all');
  const [pricePcs, setPricePcs]       = useState(0);
  const [pricePack, setPricePack]     = useState(0);
  const [priceDus, setPriceDus]       = useState(0);
  const [priceKg, setPriceKg]         = useState(0);
  const [pcsPerPack, setPcsPerPack]   = useState(1);
  const [packPerDus, setPackPerDus]   = useState(1);
  const pp = Number(pcsPerPack) || 1;
  const pd = Number(packPerDus) || 1;

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
        setMinStockKg(product.min_stock_kg || 0);
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
      min_stock_kg: Number(minStockKg)  || 0,
      purchase_price: 0,
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
        <div style={{ padding: '2px 0 0 0' }}>
           <Field label="Tipe Produk" hint="menentukan cara kasir melayani (bulat / desimal timbangan)">
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
               {SELL_UNIT_OPTIONS.map(o => {
                  const isActive = sellPerUnit === o.value;
                  const color = o.value === 'kg' ? T.purple : T.blue;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setSellPerUnit(o.value)}
                      style={{
                        padding: '12px', borderRadius: 12, cursor: 'pointer',
                        border: `1.5px solid ${isActive ? color : T.border2}`,
                        background: isActive ? color + '10' : T.bg,
                        color: isActive ? color : T.sub,
                        fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700,
                        transition: 'all 0.2s', textAlign: 'left'
                      }}
                    >
                      {o.label}
                    </button>
                  );
               })}
             </div>
           </Field>
        </div>

        {/* Conversion */}
        {sellPerUnit !== 'kg' && (
        <div style={{ padding: 16, background: T.blue + '06', borderRadius: 14, border: `1px solid ${T.blue}20` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: T.blue, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Konversi Satuan (Grosir)</p>
            <div style={{ padding: '2px 8px', borderRadius: 100, background: T.blue + '14', color: T.blue, fontSize: 9, fontWeight: 700 }}>
              Base: Pcs
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="1 Pack = Isi Berapa Pcs?">
              <div style={{ position: 'relative' }}>
                <input type="number" value={pcsPerPack} onChange={e => setPcsPerPack(e.target.value)} min="1" className="form-field" style={{ ...fieldStyle, fontFamily: 'JetBrains Mono, monospace', paddingRight: 40 }} />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: T.muted, fontWeight: 700 }}>Pcs</span>
              </div>
            </Field>
            <Field label="1 Dus = Isi Berapa Pack?">
              <div style={{ position: 'relative' }}>
                <input type="number" value={packPerDus} onChange={e => setPackPerDus(e.target.value)} min="1" className="form-field" style={{ ...fieldStyle, fontFamily: 'JetBrains Mono, monospace', paddingRight: 45 }} />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: T.muted, fontWeight: 700 }}>Pack</span>
              </div>
            </Field>
          </div>

          <div style={{ 
            marginTop: 16, padding: '10px 12px', borderRadius: 10, 
            background: T.surface, border: `1px solid ${T.border2}`,
            display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center'
          }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 8, color: T.muted, fontWeight: 700, marginBottom: 2 }}>1 DUS</p>
              <p style={{ fontSize: 13, fontWeight: 800, color: T.text }}>= {Number(packPerDus)}</p>
              <p style={{ fontSize: 8, color: T.sub }}>Pack</p>
            </div>
            <div style={{ color: T.muted, fontSize: 12 }}>×</div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 8, color: T.muted, fontWeight: 700, marginBottom: 2 }}>1 PACK</p>
              <p style={{ fontSize: 13, fontWeight: 800, color: T.text }}>= {Number(pcsPerPack)}</p>
              <p style={{ fontSize: 8, color: T.sub }}>Pcs</p>
            </div>
            <div style={{ color: T.accent, fontSize: 14, fontWeight: 800 }}>=</div>
            <div style={{ textAlign: 'center', padding: '0 10px', borderLeft: `1px solid ${T.border}` }}>
              <p style={{ fontSize: 8, color: T.accent, fontWeight: 700, marginBottom: 2 }}>TOTAL</p>
              <p style={{ fontSize: 16, fontWeight: 900, color: T.accent, fontFamily: 'JetBrains Mono, monospace' }}>
                {Number(packPerDus) * Number(pcsPerPack)}
              </p>
              <p style={{ fontSize: 8, color: T.accent, fontWeight: 700 }}>PCS / DUS</p>
            </div>
          </div>
        </div>
        )}

        {/* Prices */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: errors.price ? T.red : T.muted, textTransform: 'uppercase' }}>Harga Jual</p>
            {errors.price && <p style={{ fontSize: 10, color: T.red, fontWeight: 600 }}>⚠ {errors.price}</p>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: sellPerUnit === 'kg' ? '1fr' : 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { label: 'Pcs',  val: pricePcs,  set: setPricePcs,  col: T.blue   },
              { label: 'Pack', val: pricePack, set: setPricePack, col: T.green  },
              { label: 'Dus',  val: priceDus,  set: setPriceDus,  col: T.accent },
              { label: 'Kg',   val: priceKg,   set: setPriceKg,   col: T.purple },
            ].filter(u => {
               if (sellPerUnit === 'kg') return u.label === 'Kg';
               return u.label !== 'Kg';
            }).map(u => (
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
          {sellPerUnit !== 'kg' ? (
              <Field label="Min Stok (Pcs)">
                <input type="number" value={minStock} onChange={e => setMinStock(e.target.value)} min="0" placeholder="0" className="form-field" style={{ ...fieldStyle, fontFamily: 'JetBrains Mono, monospace' }} />
              </Field>
            ) : (
              <Field label="Min Stok (Kg)">
                <input type="number" step="0.01" value={minStockKg} onChange={e => setMinStockKg(e.target.value)} min="0" placeholder="0.0" className="form-field" style={{ ...fieldStyle, fontFamily: 'JetBrains Mono, monospace' }} />
              </Field>
          )}
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