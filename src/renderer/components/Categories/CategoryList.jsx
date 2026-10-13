import React, { useState, useEffect } from "react";
import { getCategories, addCategory, updateCategory, deleteCategory } from "../../services/categories";
import { T } from "../../theme";
import { CategoriesIcon } from "../Icons/AppIcons";

const fieldStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: `1px solid ${T.border2}`,
  background: T.bg,
  color: T.text,
  fontFamily: 'Syne, sans-serif',
  fontSize: 13,
  outline: 'none',
  transition: 'border-color 0.15s',
};

function CategoryForm({ initial = {}, onSave, onCancel, loading }) {
  const [name, setName] = useState(initial.name || '');
  const [desc, setDesc] = useState(initial.description || '');

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) return alert("Nama kategori wajib diisi");
    onSave({ name: name.trim(), description: desc.trim() });
  };

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
            Nama Kategori *
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            style={fieldStyle}
            placeholder="Contoh: Sembako, Bumbu Dapur, Minuman"
            autoFocus
            required
          />
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
            Deskripsi (Opsional)
          </label>
          <input
            value={desc}
            onChange={e => setDesc(e.target.value)}
            style={fieldStyle}
            placeholder="Keterangan singkat kelompok produk…"
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '9px 18px',
            borderRadius: 10,
            border: `1px solid ${T.border2}`,
            background: 'transparent',
            color: T.sub,
            fontFamily: 'Syne, sans-serif',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '9px 20px',
            borderRadius: 10,
            border: `1px solid ${T.accent}50`,
            background: loading ? T.border : T.accent,
            color: loading ? T.muted : '#fff',
            fontFamily: 'Syne, sans-serif',
            fontSize: 12,
            fontWeight: 800,
            cursor: loading ? 'wait' : 'pointer',
            letterSpacing: '0.02em',
            transition: 'all 0.15s',
          }}
        >
          {loading ? 'Menyimpan…' : (initial.id ? 'Simpan Perubahan' : 'Simpan Kategori')}
        </button>
      </div>
    </form>
  );
}

function CategoryList() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [saving, setSaving]         = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setCategories(await getCategories());
    setLoading(false);
  };

  const handleAdd = async (data) => {
    setSaving(true);
    const res = await addCategory(data);
    setSaving(false);
    if (res.success) { setShowAdd(false); load(); }
    else alert("Gagal: " + res.error);
  };

  const handleUpdate = async (id, data) => {
    setSaving(true);
    const res = await updateCategory(id, data);
    setSaving(false);
    if (res.success) { setEditingId(null); load(); }
    else alert("Gagal: " + res.error);
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Hapus kategori "${cat.name}"?`)) return;
    const res = await deleteCategory(cat.id);
    if (res.success) load();
    else alert(res.error);
  };

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .cat-row { transition: background 0.12s; }
        .cat-row:hover td { background: ${T.border}30; }
        input:focus { border-color: ${T.accent}80 !important; box-shadow: 0 0 0 2px ${T.accent}12; }
      `}</style>

      <div style={{ animation: 'fadeUp 0.4s ease both', fontFamily: 'Syne, sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <CategoriesIcon />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: '-0.01em' }}>Kategori Produk</h2>
              <p style={{ margin: 0, fontSize: 11, color: T.muted }}>Kelompokkan barang dagangan agar rapi saat dicari dan diatur stoknya</p>
            </div>
          </div>

          {!showAdd && (
            <button
              onClick={() => { setShowAdd(true); setEditingId(null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 16px', borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${T.accent}50`, background: T.accent, color: '#fff',
                fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 800, letterSpacing: '0.02em',
                boxShadow: `0 4px 12px ${T.accent}25`, transition: 'all 0.15s',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Tambah Kategori
            </button>
          )}
        </div>

        {/* Add Form Card */}
        {showAdd && (
          <div style={{ background: T.surface, border: `1px solid ${T.accent}40`, borderRadius: 16, padding: '18px 22px', marginBottom: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>+ Tambah Kategori Baru</p>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
            <CategoryForm 
              onSave={handleAdd} 
              onCancel={() => setShowAdd(false)} 
              loading={saving} 
            />
          </div>
        )}

        {/* Table */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: T.muted, fontSize: 12 }}>Memuat kategori…</div>
          ) : categories.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: T.muted, fontSize: 13 }}>Belum ada kategori. Tambahkan yang pertama!</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {[
                    { label: 'NO', width: '60px' },
                    { label: 'NAMA KATEGORI', width: 'auto' },
                    { label: 'DESKRIPSI', width: 'auto' },
                    { label: 'JUMLAH PRODUK', width: '150px' },
                    { label: 'AKSI', width: '140px', align: 'center' }
                  ].map(h => (
                    <th
                      key={h.label}
                      style={{
                        padding: '12px 18px',
                        textAlign: h.align || 'left',
                        fontSize: 10,
                        fontWeight: 800,
                        color: T.muted,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        borderBottom: `1px solid ${T.border}`,
                        width: h.width,
                      }}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, idx) => (
                  <React.Fragment key={cat.id}>
                    <tr className="cat-row">
                      <td style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: T.muted, fontWeight: 600 }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}` }}>
                        <span style={{ fontWeight: 800, color: T.text, fontSize: 13 }}>{cat.name}</span>
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, color: T.sub, fontSize: 12 }}>
                        {cat.description || <span style={{ color: T.muted, fontStyle: 'italic' }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}` }}>
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: 6,
                          background: T.border,
                          border: `1px solid ${T.border2}`,
                          color: cat.product_count > 0 ? T.text : T.muted,
                        }}>
                          {cat.product_count} produk
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            onClick={() => { setEditingId(editingId === cat.id ? null : cat.id); setShowAdd(false); }}
                            style={{
                              padding: '5px 12px',
                              borderRadius: 8,
                              fontSize: 11,
                              fontWeight: 700,
                              border: `1px solid ${T.border2}`,
                              background: editingId === cat.id ? T.border : 'transparent',
                              color: T.text,
                              cursor: 'pointer',
                              fontFamily: 'Syne, sans-serif',
                              transition: 'all 0.15s',
                            }}
                          >
                            {editingId === cat.id ? 'Tutup' : 'Edit'}
                          </button>
                          <button
                            onClick={() => handleDelete(cat)}
                            disabled={cat.product_count > 0}
                            style={{
                              padding: '5px 12px',
                              borderRadius: 8,
                              fontSize: 11,
                              fontWeight: 700,
                              border: `1px solid ${cat.product_count > 0 ? T.border2 : T.red + '35'}`,
                              background: cat.product_count > 0 ? 'transparent' : T.red + '10',
                              color: cat.product_count > 0 ? T.muted : T.red,
                              cursor: cat.product_count > 0 ? 'not-allowed' : 'pointer',
                              fontFamily: 'Syne, sans-serif',
                              opacity: cat.product_count > 0 ? 0.45 : 1,
                              transition: 'all 0.15s',
                            }}
                            title={cat.product_count > 0 ? `Tidak bisa dihapus karena masih ada ${cat.product_count} produk di kategori ini` : 'Hapus kategori'}
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Inline Edit Row */}
                    {editingId === cat.id && (
                      <tr>
                        <td colSpan={5} style={{ padding: '18px 22px', background: T.card, borderBottom: `1px solid ${T.border}` }}>
                          <p style={{ margin: '0 0 12px 0', fontSize: 11, fontWeight: 800, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Edit Kategori: {cat.name}
                          </p>
                          <CategoryForm
                            initial={cat}
                            onSave={data => handleUpdate(cat.id, data)}
                            onCancel={() => setEditingId(null)}
                            loading={saving}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}

          {/* Footer */}
          <div style={{ padding: '12px 18px', borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
            <span style={{ color: T.accent, fontWeight: 700 }}>{categories.length}</span> kategori terdaftar
          </div>
        </div>
      </div>
    </>
  );
}

export default CategoryList;
