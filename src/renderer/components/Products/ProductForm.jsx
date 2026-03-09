import React, { useState, useEffect } from 'react';
import { getCategories, addProduct } from '../../services/database';
import { useToast } from '../Toast';
import { T } from '../../theme';

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
        width: '100%', maxWidth: 580,
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

export const fieldStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 10,
  border: `1px solid ${T.border2}`, background: T.bg, color: T.text,
  fontFamily: 'Syne, sans-serif', fontSize: 13, outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

export function Field({ label, required, hint, error, children }) {
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: error ? T.red : T.muted, marginBottom: 7 }}>
        {label}
        {required && <span style={{ color: T.accent, fontSize: 10 }}>✱</span>}
        {hint    && <span style={{ color: T.muted, fontWeight: 400, letterSpacing: 0, textTransform: 'none', fontSize: 9, marginLeft: 2 }}>({hint})</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: 10, color: T.red, marginTop: 4, fontWeight: 600 }}>⚠ {error}</p>}
    </div>
  );
}

// sell_per_unit options
export const SELL_UNIT_OPTIONS = [
  { value: 'all',  label: '📦 Kemasan / Biji (Pcs, Pack, Dus)' },
  { value: 'kg',   label: '⚖️ Timbangan / Curah (Gram, Ons, Kg)' },
];

// ─── PRODUCT FORM (Add New Product) ─────────────────────────────────────────
function ProductForm({ onClose, onSuccess }) {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(false);
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
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [totalCost, setTotalCost]             = useState('');

  const pp = Number(pcsPerPack) || 1;
  const pd = Number(packPerDus) || 1;
  const hpp = Number(purchasePrice) || 0;

  const handleTotalCostChange = (val) => {
    setTotalCost(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const divisor = sellPerUnit === 'kg' ? 1 : (pd * pp);
      setPurchasePrice(String(Math.round(num / divisor)));
    }
  };

  useEffect(() => {
    getCategories().then(data => {
      setCategories(data);
      if (data.length > 0) setCategoryId(data[0].id);
    });
  }, []);

  const validate = () => {
    const errs = {};
    if (!name.trim())   errs.name = 'Nama produk harus diisi';
    if (!categoryId)    errs.category = 'Kategori harus dipilih';
    const prices = [Number(pricePcs), Number(pricePack), Number(priceDus), Number(priceKg)];
    if (prices.every(p => p <= 0)) errs.price = 'Minimal satu harga jual harus diisi';
    if (Number(purchasePrice) <= 0) errs.purchasePrice = 'Harga modal (HPP) wajib diisi untuk akurasi laporan laba';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    const result = await addProduct({
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
      purchase_price: Number(purchasePrice) || 0,
      notes,
    });
    setLoading(false);

    if (result.success) {
      showToast('success', `Produk "${name.trim()}" berhasil ditambahkan`);
      onSuccess();
      onClose();
    } else {
      showToast('error', 'Gagal menyimpan produk: ' + result.error);
    }
  };

  return (
    <FormModal title="Tambah Produk" subtitle="Data Produk" onClose={onClose}>
      <style>{MODAL_CSS}</style>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Name + Category */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Nama Produk" required error={errors.name}>
            <input type="text" value={name} onChange={e => { setName(e.target.value); setErrors(v => ({...v, name: ''})); }}
              required className="form-field" style={{ ...fieldStyle, borderColor: errors.name ? T.red : undefined }} placeholder="Masako, Royco…" autoFocus />
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

          {/* Visual Formula */}
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
            <p style={{ fontSize: 9, color: T.muted, marginTop: 10, textAlign: 'center', fontStyle: 'italic' }}>
              * Gunakan angka 1 jika produk tidak memiliki satuan tersebut.
            </p>
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
              <Field label="Min Stok (Pcs)" hint="alert">
                <input type="number" value={minStock} onChange={e => setMinStock(e.target.value)} min="0" placeholder="0" className="form-field" style={{ ...fieldStyle, fontFamily: 'JetBrains Mono, monospace' }} />
              </Field>
            ) : (
              <Field label="Min Stok (Kg)" hint="alert">
                <input type="number" step="0.01" value={minStockKg} onChange={e => setMinStockKg(e.target.value)} min="0" placeholder="0.0" className="form-field" style={{ ...fieldStyle, fontFamily: 'JetBrains Mono, monospace' }} />
              </Field>
          )}
          <Field label="Keterangan">
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opsional…" className="form-field" style={fieldStyle} />
          </Field>
        </div>

        {/* Default HPP + Calculator */}
        <div style={{ padding: '16px', borderRadius: 16, background: T.bg, border: `1.5px dashed ${errors.purchasePrice ? T.red : T.accent + '40'}` }}>
          <Field 
            label={`Harga Beli dari Supplier (Modal per ${sellPerUnit === 'kg' ? 'Kg' : 'Pcs'})`} 
            hint={errors.purchasePrice ? null : "Harga ini akan jadi patokan awal untuk menghitung untung/laba Anda"}
            error={errors.purchasePrice}
          >
            <div style={{ position: 'relative', marginTop: 8 }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: errors.purchasePrice ? T.red : T.muted, fontWeight: 700 }}>Rp</span>
              <input type="number" value={purchasePrice} onChange={e => { setPurchasePrice(e.target.value); setErrors(v => ({...v, purchasePrice: ''})); }}
                placeholder="0" className="form-field" style={{ ...fieldStyle, paddingLeft: 36, fontFamily: 'JetBrains Mono, monospace', border: `1px solid ${errors.purchasePrice ? T.red + '60' : T.accent + '30'}` }} />
            </div>
          </Field>

          {/* Calculator Helper */}
          {sellPerUnit !== 'kg' && (
            <div style={{ marginTop: 14, padding: '12px', borderRadius: 12, background: T.accent + '08', border: `1px solid ${T.accent}15` }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: T.muted, textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>Kalkulator Harga Modal (Opsional)</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10, alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 8, fontWeight: 800, color: T.sub, marginBottom: 5 }}>Total Bayar (Berdasarkan Nota)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: T.muted, fontWeight: 700 }}>Rp</span>
                    <input type="number" value={totalCost} onChange={e => handleTotalCostChange(e.target.value)}
                      placeholder="Contoh: 825.000" style={{ ...fieldStyle, paddingLeft: 30, fontSize: 12, height: 32 }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 8, fontWeight: 800, color: T.sub, marginBottom: 5 }}>Bagi per {pd * pp} Pcs</label>
                  <div style={{ padding: '8px 10px', borderRadius: 10, background: T.surface, border: `1px solid ${T.border2}`, height: 32, display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 700, color: T.accent }}>
                    {purchasePrice ? `Rp ${Number(purchasePrice).toLocaleString('id-ID')}` : 'Rp 0'}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 8, color: T.muted, marginTop: 8, fontStyle: 'italic' }}>*Gunakan jika Anda membeli borongan (misal 1 Dus) tapi ingin tahu harga per bijinya.</p>
            </div>
          )}
        </div>

        {/* Profit Warnings */}
        {hpp > 0 && sellPerUnit !== 'kg' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'Pcs',  sell: pricePcs,  cost: hpp },
              { label: 'Pack', sell: pricePack, cost: hpp * pp },
              { label: 'Dus',  sell: priceDus,  cost: hpp * pp * pd }
            ].map(item => {
              if (item.sell > 0 && item.sell < item.cost) {
                return (
                  <div key={item.label} style={{ padding: '8px 12px', borderRadius: 10, background: T.red + '10', border: `1px solid ${T.red}30`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>⚠️</span>
                    <p style={{ fontSize: 10, color: T.red, fontWeight: 700 }}>
                      Harga Jual {item.label} (Rp {Number(item.sell).toLocaleString('id-ID')}) lebih RENDAH dari Modal (Rp {Number(item.cost).toLocaleString('id-ID')}). Anda akan rugi!
                    </p>
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}


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