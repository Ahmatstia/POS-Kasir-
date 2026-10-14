import React, { useState, useEffect } from "react";
import { getCategories, addCategory, updateCategory, deleteCategory } from "../../services/categories";
import { T } from "../../theme";
import { CategoriesIcon } from "../Icons/AppIcons";
import { useToast } from "../Toast";

const fieldStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  border: `1px solid ${T.border2}`,
  background: T.bg,
  color: T.text,
  fontFamily: 'Syne, sans-serif',
  fontSize: 12,
  outline: 'none',
  transition: 'border-color 0.15s',
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color, icon, onClick, active }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.surface,
        border: `1px solid ${active ? color : T.border}`,
        borderRadius: 14,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s ease',
        boxShadow: active ? `0 0 0 1px ${color}40` : 'none',
      }}
      onMouseEnter={e => {
        if (onClick) {
          e.currentTarget.style.borderColor = color;
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={e => {
        if (onClick) {
          e.currentTarget.style.borderColor = active ? color : T.border;
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: color + '14', border: `1px solid ${color}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 10, fontWeight: 800, color: T.sub, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>{value}</p>
      </div>
    </div>
  );
}

function CategoryForm({ initial = {}, onSave, onCancel, loading }) {
  const [name, setName] = useState(initial.name || '');
  const [desc, setDesc] = useState(initial.description || '');

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
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

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            border: `1px solid ${T.border2}`,
            background: 'transparent',
            color: T.sub,
            fontFamily: 'Syne, sans-serif',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          style={{
            padding: '8px 18px',
            borderRadius: 10,
            border: `1px solid ${T.green}40`,
            background: loading ? T.border : T.green + '14',
            color: loading ? T.muted : T.green,
            fontFamily: 'Syne, sans-serif',
            fontSize: 11,
            fontWeight: 800,
            cursor: loading ? 'wait' : 'pointer',
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
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [saving, setSaving]         = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const data = await getCategories();
    setCategories(data);
    setLoading(false);
  };

  const handleAdd = async (data) => {
    setSaving(true);
    const res = await addCategory(data);
    setSaving(false);
    if (res.success) {
      showToast('success', `Kategori "${data.name}" berhasil ditambahkan`);
      setShowAdd(false);
      load();
    } else {
      showToast('error', 'Gagal menambahkan kategori: ' + res.error);
    }
  };

  const handleUpdate = async (id, data) => {
    setSaving(true);
    const res = await updateCategory(id, data);
    setSaving(false);
    if (res.success) {
      showToast('success', `Kategori "${data.name}" berhasil diperbarui`);
      setEditingId(null);
      load();
    } else {
      showToast('error', 'Gagal memperbarui kategori: ' + res.error);
    }
  };

  const handleDelete = async (cat) => {
    if (cat.product_count > 0) {
      showToast('error', `Tidak bisa dihapus karena masih ada ${cat.product_count} produk di kategori ini`);
      return;
    }
    setDeletingId(cat.id);
    const res = await deleteCategory(cat.id);
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (res.success) {
      showToast('success', `Kategori "${cat.name}" berhasil dihapus`);
      load();
    } else {
      showToast('error', 'Gagal menghapus: ' + res.error);
    }
  };

  // Filter
  const filtered = categories.filter(c => {
    if (searchTerm.trim() && !c.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterType === 'terisi' && (c.product_count || 0) <= 0) return false;
    if (filterType === 'kosong' && (c.product_count || 0) > 0) return false;
    return true;
  });

  // Stats
  const totalCats    = categories.length;
  const catsWithProd = categories.filter(c => (c.product_count || 0) > 0).length;
  const emptyCats    = categories.filter(c => (c.product_count || 0) === 0).length;
  const totalItems   = categories.reduce((sum, c) => sum + (c.product_count || 0), 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 280 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: `2px solid ${T.border2}`, borderTopColor: T.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 11, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Syne, sans-serif' }}>Memuat kategori…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

        .cat-input {
          width: 100%; padding: 9px 12px;
          border-radius: 10px; border: 1px solid ${T.border2};
          background: ${T.bg}; color: ${T.text};
          font-family: 'Syne', sans-serif; font-size: 12px;
          outline: none; transition: border-color 0.15s;
        }
        .cat-input:focus { border-color: ${T.accent}60; box-shadow: 0 0 0 2px ${T.accent}10; }

        /* TABLE view */
        .cat-table { width: 100%; border-collapse: collapse; font-family: 'Syne', sans-serif; }
        .cat-table th {
          padding: 10px 14px; font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: ${T.muted};
          border-bottom: 1px solid ${T.border}; text-align: left; white-space: nowrap;
        }
        .cat-table td {
          padding: 12px 14px; font-size: 12px; color: ${T.sub};
          border-bottom: 1px solid ${T.border}; white-space: nowrap;
        }
        .cat-table tbody tr { transition: background 0.12s; }
        .cat-table tbody tr:hover td { background: ${T.border}40; }
        .cat-table tbody tr:last-child td { border-bottom: none; }

        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 4px; }
      `}</style>

      <div style={{ animation: 'fadeUp 0.4s ease both', fontFamily: 'Syne, sans-serif' }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <CategoriesIcon />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: '-0.01em' }}>Kategori Produk</h2>
          </div>

          {!showAdd && (
            <button
              onClick={() => { setShowAdd(true); setEditingId(null); }}
              style={{
                padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                transition: 'all 0.15s', border: `1px solid ${T.green}40`, background: T.green + '14', color: T.green,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.green + '24'}
              onMouseLeave={e => e.currentTarget.style.background = T.green + '14'}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 2v9M2 6.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              Tambah Kategori Baru
            </button>
          )}
        </div>

        {/* ── STAT CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 8 }}>
          <StatCard
            label="Total Kategori"
            value={totalCats}
            color={T.blue}
            active={filterType === ''}
            onClick={() => setFilterType('')}
            icon={
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="6" height="6" rx="1.5" stroke={T.blue} strokeWidth="1.5"/><rect x="10" y="2" width="6" height="6" rx="1.5" stroke={T.blue} strokeWidth="1.5"/><rect x="2" y="10" width="6" height="6" rx="1.5" stroke={T.blue} strokeWidth="1.5"/><rect x="10" y="10" width="6" height="6" rx="1.5" stroke={T.blue} strokeWidth="1.5"/></svg>
            }
          />
          <StatCard
            label="Kategori Aktif"
            value={catsWithProd}
            color={T.green}
            active={filterType === 'terisi'}
            onClick={() => setFilterType(filterType === 'terisi' ? '' : 'terisi')}
            icon={
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9l3.5 3.5L14 5" stroke={T.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            }
          />
          <StatCard
            label="Kategori Kosong"
            value={emptyCats}
            color={T.accent}
            active={filterType === 'kosong'}
            onClick={() => setFilterType(filterType === 'kosong' ? '' : 'kosong')}
            icon={
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2L16 14H2L9 2Z" stroke={T.accent} strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 7v3.5M9 12v.5" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round"/></svg>
            }
          />
          <StatCard
            label="Total Produk Terhubung"
            value={totalItems}
            color={T.purple}
            icon={
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke={T.purple} strokeWidth="1.5"/><path d="M9 5v4l2.5 2.5" stroke={T.purple} strokeWidth="1.5" strokeLinecap="round"/></svg>
            }
          />
        </div>

        {/* ── ADD FORM CARD ── */}
        {showAdd && (
          <div style={{ background: T.surface, border: `1px solid ${T.accent}40`, borderRadius: 14, padding: '16px 20px', marginBottom: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tambah Kategori Baru</p>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
            <CategoryForm 
              onSave={handleAdd} 
              onCancel={() => setShowAdd(false)} 
              loading={saving} 
            />
          </div>
        )}

        {/* ── FILTER BAR ── */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px auto', gap: 10, alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', opacity: 0.35, pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="5.5" cy="5.5" r="4" stroke={T.sub} strokeWidth="1.4"/>
                <path d="M8.5 8.5L11 11" stroke={T.sub} strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <input
                type="text" value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Cari nama kategori…"
                className="cat-input"
                style={{ paddingLeft: 30 }}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 16, lineHeight: 1 }}>×</button>
              )}
            </div>

            {/* Type filter */}
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="cat-input" style={{ cursor: 'pointer' }}>
              <option value="">Semua Kategori</option>
              <option value="terisi">Kategori Terisi Produk</option>
              <option value="kosong">Kategori Kosong</option>
            </select>

            {/* Reset */}
            <button
              onClick={() => { setSearchTerm(''); setFilterType(''); }}
              style={{ padding: '9px 12px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, fontSize: 11, fontWeight: 700, fontFamily: 'Syne, sans-serif', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { e.currentTarget.style.background = T.border; e.currentTarget.style.color = T.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.sub; }}
            >
              Reset
            </button>
          </div>

          {/* Result count */}
          <div style={{ marginTop: 10, fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
            <span style={{ color: T.accent, fontWeight: 700 }}>{filtered.length}</span>
            <span> / {categories.length} kategori ditampilkan</span>
            {searchTerm && <span style={{ color: T.sub }}> · "{searchTerm}"</span>}
          </div>
        </div>

        {/* ── TABLE ── */}
        {filtered.length === 0 ? (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto 16px', opacity: 0.25 }}>
              <rect x="6" y="6" width="36" height="36" rx="6" stroke={T.sub} strokeWidth="2"/>
              <path d="M16 24h16M16 32h10M16 16h6" stroke={T.sub} strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p style={{ fontSize: 14, fontWeight: 700, color: T.muted, marginBottom: 8 }}>
              {categories.length === 0 ? 'Belum ada kategori' : 'Tidak ada kategori yang cocok'}
            </p>
            <p style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>
              {categories.length === 0 ? 'Mulai dengan menambahkan kategori produk pertama' : 'Coba ubah atau hapus filter'}
            </p>
            {categories.length === 0 ? (
              <button onClick={() => setShowAdd(true)} style={{ padding: '9px 18px', borderRadius: 10, border: `1px solid ${T.green}35`, background: T.green + '10', color: T.green, fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Tambah Kategori</button>
            ) : (
              <button onClick={() => { setSearchTerm(''); setFilterType(''); }} style={{ padding: '9px 18px', borderRadius: 10, border: `1px solid ${T.blue}35`, background: T.blue + '10', color: T.blue, fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Reset Filter</button>
            )}
          </div>
        ) : (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="cat-table">
                <thead>
                  <tr>
                    {['No', 'Nama Kategori', 'Deskripsi', 'Jumlah Produk Terhubung', 'Aksi'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((cat, idx) => (
                    <React.Fragment key={cat.id}>
                      <tr>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: T.muted, fontWeight: 600, width: 50 }}>
                          {idx + 1}
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>{cat.name}</span>
                        </td>
                        <td style={{ color: cat.description ? T.sub : T.muted, fontSize: 12 }}>
                          {cat.description || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>—</span>}
                        </td>
                        <td>
                          <span style={{
                            padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                            background: cat.product_count > 0 ? T.blue + '15' : T.border,
                            color: cat.product_count > 0 ? T.blue : T.muted,
                            border: `1px solid ${cat.product_count > 0 ? T.blue + '30' : T.border2}`,
                            fontFamily: 'JetBrains Mono, monospace',
                          }}>
                            {cat.product_count || 0} produk
                          </span>
                        </td>
                        <td>
                          {confirmDeleteId === cat.id ? (
                            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                              <span style={{ fontSize: 10, color: T.red, fontWeight: 600 }}>Hapus?</span>
                              <button
                                onClick={() => handleDelete(cat)}
                                disabled={deletingId === cat.id}
                                style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid ${T.red}40`, background: T.red + '15', color: T.red, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                              >
                                {deletingId === cat.id ? '…' : 'Ya'}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid ${T.border2}`, background: 'transparent', color: T.sub, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => { setEditingId(editingId === cat.id ? null : cat.id); setShowAdd(false); }}
                                style={{
                                  padding: '5px 10px', borderRadius: 7,
                                  border: `1px solid ${T.blue}30`,
                                  background: editingId === cat.id ? T.blue + '20' : T.blue + '0C',
                                  color: T.blue, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                                  fontFamily: 'Syne, sans-serif', transition: 'all 0.15s',
                                }}
                              >
                                {editingId === cat.id ? 'Tutup' : 'Edit'}
                              </button>
                              <button
                                onClick={() => {
                                  if (cat.product_count > 0) {
                                    showToast('error', `Kategori "${cat.name}" tidak dapat dihapus karena masih memuat ${cat.product_count} produk`);
                                  } else {
                                    setConfirmDeleteId(cat.id);
                                  }
                                }}
                                disabled={cat.product_count > 0}
                                title={cat.product_count > 0 ? `Masih ada ${cat.product_count} produk` : 'Hapus kategori'}
                                style={{
                                  padding: '5px 8px', borderRadius: 7,
                                  border: `1px solid ${cat.product_count > 0 ? T.border2 : T.red + '30'}`,
                                  background: cat.product_count > 0 ? 'transparent' : T.red + '0C',
                                  color: cat.product_count > 0 ? T.muted : T.red,
                                  cursor: cat.product_count > 0 ? 'not-allowed' : 'pointer',
                                  opacity: cat.product_count > 0 ? 0.4 : 1,
                                  fontFamily: 'Syne, sans-serif', transition: 'all 0.15s',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                              >
                                <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 2.5h8M4 2.5V2a1 1 0 012 0v.5M4.5 5v2.5M6.5 5v2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><rect x="2" y="2.5" width="7" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/></svg>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {/* Inline Edit Row */}
                      {editingId === cat.id && (
                        <tr>
                          <td colSpan={5} style={{ padding: '16px 20px', background: T.card, borderBottom: `1px solid ${T.border}` }}>
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
            </div>
            {/* Footer */}
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
                <span style={{ color: T.accent, fontWeight: 700 }}>{filtered.length}</span> dari {categories.length} kategori terdaftar
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default CategoryList;
