import React, { useState, useEffect, useRef } from "react";
import { getCategories, addCategory, updateCategory, deleteCategory } from "../../services/categories";
import { T } from "../../theme";
import { CategoriesIcon } from "../Icons/AppIcons";

const PRESET_COLORS = [
  '#F5A623','#34C98B','#5B8AF5','#E85858','#A78BFA',
  '#F97316','#06B6D4','#8B5CF6','#10B981','#EF4444',
  '#3B82F6','#EC4899','#84CC16','#F59E0B','#6366F1',
];

const fieldStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 10,
  border: `1px solid ${T.border2}`, background: T.bg, color: T.text,
  fontFamily: 'Syne, sans-serif', fontSize: 13, outline: 'none',
  transition: 'border-color 0.15s',
};

function CategoryForm({ initial = {}, onSave, onCancel, loading, usedColors = [] }) {
  const [name, setName]         = useState(initial.name || '');
  const [desc, setDesc]         = useState(initial.description || '');
  const [color, setColor]       = useState(initial.color || '#5B8AF5');
  const colorInputRef           = useRef(null);

  // Filter out the current category's color if editing
  const otherUsedColors = initial.id 
    ? usedColors.filter(c => c.toLowerCase() !== initial.color?.toLowerCase())
    : usedColors;

  const isColorUsed = (c) => otherUsedColors.some(uc => uc.toLowerCase() === c.toLowerCase());

  const handleSave = () => {
    if (!name.trim()) return alert("Nama kategori wajib diisi");
    onSave({ name, description: desc, color });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Nama Kategori *</label>
          <input value={name} onChange={e => setName(e.target.value)} style={fieldStyle} placeholder="Bumbu Instan" />
        </div>
        <div>
          <label style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Deskripsi</label>
          <input value={desc} onChange={e => setDesc(e.target.value)} style={fieldStyle} placeholder="Opsional…" />
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label style={{ fontSize: 9, fontWeight: 700, color: T.muted, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Warna Badge</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {PRESET_COLORS.map(c => {
            const used = isColorUsed(c);
            return (
              <button 
                key={c} 
                onClick={() => setColor(c)} 
                title={used ? "Warna ini sudah digunakan kategori lain" : ""}
                style={{
                  width: 28, height: 28, borderRadius: 8, background: c, border: 'none',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                  outline: color === c ? `3px solid ${T.text}` : 'none',
                  outlineOffset: 2,
                  transform: color === c ? 'scale(0.9)' : 'scale(1)',
                  position: 'relative',
                  opacity: used ? 0.45 : 1,
                  filter: used ? 'grayscale(0.3)' : 'none',
                }}
              >
                {used && (
                  <div style={{
                    position: 'absolute', bottom: -2, right: -2, width: 10, height: 10,
                    borderRadius: '50%', background: T.surface, border: `1px solid ${T.border2}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: T.muted }} />
                  </div>
                )}
              </button>
            );
          })}

          {/* RGB Color Picker Trigger (Rainbow Wheel) */}
          <div style={{ position: 'relative' }}>
            <input 
              type="color" 
              ref={colorInputRef}
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
            />
            <button 
              onClick={() => colorInputRef.current?.click()}
              title="Pilih Warna Kustom"
              style={{
                width: 32, height: 32, borderRadius: '50%', 
                background: 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)',
                border: `2px solid ${T.surface}`, 
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: `0 2px 5px rgba(0,0,0,0.15)`,
                outline: !PRESET_COLORS.includes(color) ? `3px solid ${T.accent}` : 'none',
                outlineOffset: 2,
                transform: !PRESET_COLORS.includes(color) ? 'scale(1.1)' : 'scale(1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: color, border: '2px solid white', boxShadow: '0 0 4px rgba(0,0,0,0.2)' }} />
            </button>
          </div>

          <div style={{ flex: 1 }} />

          {/* Preview */}
          <div style={{
            padding: '4px 12px', borderRadius: 100,
            background: color + '20', border: `1px solid ${color}50`,
            color, fontSize: 11, fontWeight: 700,
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: 'scale(1.05)'
          }}>
            {name || 'Pratinjau'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button onClick={onCancel} style={{
          padding: '8px 18px', borderRadius: 10, border: `1px solid ${T.border2}`,
          background: 'transparent', color: T.sub, fontFamily: 'Syne, sans-serif',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>Batal</button>
        <button onClick={handleSave} disabled={loading} style={{
          padding: '8px 18px', borderRadius: 10, border: `1px solid ${T.green}40`,
          background: T.green + '15', color: T.green, fontFamily: 'Syne, sans-serif',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>
          {loading ? 'Menyimpan…' : '✓ Simpan'}
        </button>
      </div>
    </div>
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
        .cat-row:hover td { background: ${T.border}40; }
        input:focus, textarea:focus { border-color: ${T.accent}70 !important; box-shadow: 0 0 0 2px ${T.accent}12; }
      `}</style>

      <div style={{ animation: 'fadeUp 0.4s ease both', fontFamily: 'Syne, sans-serif' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
          <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <CategoriesIcon />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: '-0.01em' }}>Kategori Produk</h2>
          </div>
          </div>
          {!showAdd && (
            <button onClick={() => setShowAdd(true)} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
              border: `1px solid ${T.green}35`, background: T.green + '10', color: T.green,
              fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Tambah Kategori
            </button>
          )}
        </div>

        {/* Add Form */}
        {showAdd && (
          <div style={{ background: T.surface, border: `1px solid ${T.accent}35`, borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: T.accent, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>+ Tambah Kategori Baru</p>
            <CategoryForm 
              onSave={handleAdd} 
              onCancel={() => setShowAdd(false)} 
              loading={saving} 
              usedColors={categories.map(c => c.color)}
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
                  {['Warna', 'Nama Kategori', 'Deskripsi', 'Jumlah Produk', 'Aksi'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', borderBottom: `1px solid ${T.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => (
                  <React.Fragment key={cat.id}>
                    <tr className="cat-row">
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: (cat.color || T.blue) + '20', border: `2px solid ${cat.color || T.blue}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 12, height: 12, borderRadius: 4, background: cat.color || T.blue }} />
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>{cat.name}</span>
                          <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 700, background: (cat.color || T.blue) + '18', color: cat.color || T.blue, border: `1px solid ${(cat.color || T.blue)}30` }}>
                            {cat.name}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, color: T.sub, fontSize: 12 }}>
                        {cat.description || <span style={{ color: T.muted, fontStyle: 'italic' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: cat.product_count > 0 ? T.text : T.muted }}>
                          {cat.product_count} produk
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setEditingId(editingId === cat.id ? null : cat.id)} style={{
                            padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                            border: `1px solid ${T.blue}35`, background: T.blue + '10', color: T.blue,
                            cursor: 'pointer', fontFamily: 'Syne, sans-serif',
                          }}>Edit</button>
                          <button onClick={() => handleDelete(cat)} disabled={cat.product_count > 0} style={{
                            padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                            border: `1px solid ${cat.product_count > 0 ? T.border2 : T.red + '35'}`,
                            background: cat.product_count > 0 ? 'transparent' : T.red + '10',
                            color: cat.product_count > 0 ? T.muted : T.red,
                            cursor: cat.product_count > 0 ? 'not-allowed' : 'pointer',
                            fontFamily: 'Syne, sans-serif', opacity: cat.product_count > 0 ? 0.5 : 1,
                          }} title={cat.product_count > 0 ? `Tidak bisa dihapus: ${cat.product_count} produk` : ''}>
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Inline Edit Row */}
                    {editingId === cat.id && (
                      <tr>
                        <td colSpan={5} style={{ padding: '16px', background: T.card, borderBottom: `1px solid ${T.border}` }}>
                          <CategoryForm
                            initial={cat}
                            onSave={data => handleUpdate(cat.id, data)}
                            onCancel={() => setEditingId(null)}
                            loading={saving}
                            usedColors={categories.map(c => c.color)}
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
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
            <span style={{ color: T.accent, fontWeight: 700 }}>{categories.length}</span> kategori total
          </div>
        </div>
      </div>
    </>
  );
}

export default CategoryList;
