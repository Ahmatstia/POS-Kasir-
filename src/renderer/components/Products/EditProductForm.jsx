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
  
  // States matching ProductForm
  const [name, setName]               = useState("");
  const [categoryId, setCategoryId]   = useState("");
  const [notes, setNotes]             = useState("");
  const [minStock, setMinStock]       = useState(0);

  const [pricePcs, setPricePcs]       = useState(0);
  const [pricePack, setPricePack]     = useState(0);
  const [priceDus, setPriceDus]       = useState(0);
  const [priceKg, setPriceKg]         = useState(0);

  const [pcsPerPack, setPcsPerPack]   = useState(1);
  const [packPerDus, setPackPerDus]   = useState(1);

  const [qtyDus, setQtyDus]           = useState(0);
  const [qtyPack, setQtyPack]         = useState(0);
  const [qtyPcs, setQtyPcs]           = useState(0);
  const [qtyKg, setQtyKg]             = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [cats, product] = await Promise.all([
        getCategories(),
        getProductById(productId),
      ]);
      setCategories(cats);
      if (product) {
        setName(product.name || "");
        setCategoryId(product.category_id || "");
        setNotes(product.notes || "");
        setMinStock(product.min_stock || 0);
        setPricePcs(product.price_pcs || 0);
        setPricePack(product.price_pack || 0);
        setPriceDus(product.price_dus || 0);
        setPriceKg(product.price_kg || 0);
        setPcsPerPack(product.pcs_per_pack || 1);
        setPackPerDus(product.pack_per_dus || 1);
        
        // Untuk Edit, kita tampilkan total stok saat ini di bagian Pcs/Kg 
        // Agar user bisa melihat totalnya dan menyesuaikannya.
        setQtyPcs(product.stock || 0);
      }
      setLoading(false);
    })();
  }, [productId]);

  const totalStock = (Number(qtyDus) * Number(packPerDus) * Number(pcsPerPack)) + 
                     (Number(qtyPack) * Number(pcsPerPack)) + 
                     Number(qtyPcs) + Number(qtyKg);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !categoryId) return alert("Nama dan Kategori wajib diisi");

    setSaving(true);
    const result = await updateProduct(productId, {
      name,
      category_id: categoryId,
      sell_per_unit: "all",
      price_pcs: pricePcs,
      price_pack: pricePack,
      price_dus: priceDus,
      price_kg: priceKg,
      stock: totalStock,
      min_stock: minStock,
      pcs_per_pack: pcsPerPack,
      pack_per_dus: packPerDus,
      notes,
    });
    setSaving(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      alert("Gagal update produk: " + result.error);
    }
  };

  if (loading) return <FormModal title="Edit Produk" subtitle="Memuat..." onClose={onClose}>...</FormModal>;

  return (
    <FormModal title="Edit Produk" subtitle="Ubah data dan stok produk" onClose={onClose}>
      <style>{MODAL_CSS}</style>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Nama Produk" required>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required style={fieldStyle} />
          </Field>
          <Field label="Kategori" required>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required style={fieldStyle}>
              <option value="">Pilih Kategori</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>

        {/* Konversi */}
        <div style={{ padding: 12, background: T.border + "40", borderRadius: 12, border: `1px dashed ${T.border2}` }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", marginBottom: 10 }}>Faktor Konversi</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="1 Pack Berapa Pcs?">
              <input type="number" value={pcsPerPack} onChange={e => setPcsPerPack(e.target.value)} style={fieldStyle} />
            </Field>
            <Field label="1 Dus Berapa Pack?">
              <input type="number" value={packPerDus} onChange={e => setPackPerDus(e.target.value)} style={fieldStyle} />
            </Field>
          </div>
        </div>

        {/* Harga */}
        <div>
          <p style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: "uppercase", marginBottom: 10 }}>Harga Jual</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {[
              { label: "Pcs", val: pricePcs, set: setPricePcs, col: T.blue },
              { label: "Pack", val: pricePack, set: setPricePack, col: T.green },
              { label: "Dus", val: priceDus, set: setPriceDus, col: T.accent },
              { label: "Kg", val: priceKg, set: setPriceKg, col: T.purple },
            ].map(u => (
              <div key={u.label}>
                <label style={{ fontSize: 9, fontWeight: 700, color: u.col, display: "block", marginBottom: 4 }}>{u.label}</label>
                <input type="number" value={u.val} onChange={e => u.set(e.target.value)} style={fieldStyle} />
              </div>
            ))}
          </div>
        </div>

        {/* Stok */}
        <div style={{ padding: 12, background: T.accent + "08", borderRadius: 12, border: `1px solid ${T.accent}20` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: T.accent, textTransform: "uppercase" }}>Update Stok</p>
            <p style={{ fontSize: 10, fontWeight: 800, color: T.text }}>Total: <span style={{ color: T.green }}>{totalStock} Pcs</span></p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {[
              { label: "Dus", val: qtyDus, set: setQtyDus },
              { label: "Pack", val: qtyPack, set: setQtyPack },
              { label: "Pcs", val: qtyPcs, set: setQtyPcs },
              { label: "Kg", val: qtyKg, set: setQtyKg },
            ].map(u => (
              <div key={u.label}>
                <label style={{ fontSize: 8, fontWeight: 700, color: T.muted, display: "block", marginBottom: 4 }}>{u.label}</label>
                <input type="number" value={u.val} onChange={e => u.set(e.target.value)} style={fieldStyle} />
              </div>
            ))}
          </div>
          <p style={{ fontSize: 8, color: T.muted, marginTop: 8, fontStyle: "italic" }}>
            * Isilah kolom di atas untuk menghitung total stok baru.
          </p>
        </div>

        <Field label="Keterangan">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...fieldStyle, resize: "none" }} />
        </Field>

        <FormActions onClose={onClose} loading={saving} submitLabel="Simpan Perubahan" />
      </form>
    </FormModal>
  );
}

export default EditProductForm;