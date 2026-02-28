import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { getCategories, addProduct } from "../../services/database";
import { FormModal, MODAL_CSS } from "./ProductForm";

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

// ─── FIELD CONFIGS ────────────────────────────────────────────────────────────
const MAPPING_FIELDS = [
  { key: 'name',       label: 'Nama Produk', required: true,  color: T.text   },
  { key: 'category',   label: 'Kategori',    required: true,  color: T.text   },
  { key: 'price_pcs',  label: 'Harga Pcs',   required: false, color: T.blue   },
  { key: 'price_pack', label: 'Harga Pack',  required: false, color: T.green  },
  { key: 'price_kg',   label: 'Harga Kg',    required: false, color: T.purple },
  { key: 'stock',      label: 'Stok',        required: false, color: T.accent },
  { key: 'min_stock',  label: 'Min Stok',    required: false, color: T.sub    },
];

const selectStyle = {
  width: '100%', padding: '8px 11px',
  borderRadius: 9, border: `1px solid ${T.border2}`,
  background: T.bg, color: T.text,
  fontFamily: 'Syne, sans-serif', fontSize: 12,
  outline: 'none', cursor: 'pointer',
  transition: 'border-color 0.15s',
};

function ImportExcel({ onClose, onSuccess }) {
  const [file, setFile]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [preview, setPreview]   = useState(null);
  const [categories, setCategories] = useState([]);
  const [result, setResult]     = useState(null); // { success, error, total }
  const [mapping, setMapping]   = useState({
    name: '', category: '',
    price_pcs: '', price_pack: '', price_kg: '',
    stock: '', min_stock: '',
  });

  useEffect(() => { getCategories().then(setCategories); }, []);

  // ── File handling ──
  const handleFileUpload = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb   = XLSX.read(evt.target.result, { type: 'binary' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const headers = data[0] || [];
        const rows    = data.slice(1, 11).filter(r => r?.some(c => c?.toString().trim()));

        setPreview({ headers, rows });

        // Auto-map
        const m = {};
        headers.forEach((h, i) => {
          if (!h) return;
          const hl = String(h).toLowerCase();
          if (hl.includes('nama'))                                         m.name       = i;
          if (hl.includes('kategori'))                                     m.category   = i;
          if (hl.includes('harga pcs') || hl.includes('harga per pcs'))   m.price_pcs  = i;
          if (hl.includes('harga pack') || hl.includes('harga per pack')) m.price_pack = i;
          if (hl.includes('harga kg')  || hl.includes('harga per kg'))    m.price_kg   = i;
          if (hl.includes('stok') && !hl.includes('min'))                 m.stock      = i;
          if (hl.includes('min stok') || hl.includes('minimal'))          m.min_stock  = i;
        });
        setMapping(prev => ({ ...prev, ...m }));
      } catch (err) {
        alert('Error membaca file: ' + err.message);
      }
    };
    reader.readAsBinaryString(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && /\.(xlsx|xls|csv)$/i.test(f.name)) {
      handleFileUpload({ target: { files: [f] } });
    }
  };

  // ── Import ──
  const findCategoryId = (name) => {
    if (!name) return null;
    const n = String(name).trim().toLowerCase();
    return (
      categories.find(c => c.name.toLowerCase() === n)?.id ||
      categories.find(c => c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase()))?.id ||
      null
    );
  };

  const processImport = async () => {
    if (!file) return;
    if (mapping.name === '' || mapping.category === '') {
      alert('Pilih kolom Nama dan Kategori terlebih dahulu');
      return;
    }
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb   = XLSX.read(evt.target.result, { type: 'binary' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const rows = data.slice(1);

        const cleanPrice = (val) => {
          if (val === undefined || val === null) return 0;
          if (typeof val === 'number') return val;
          const n = parseInt(String(val).replace(/[Rp.,\s]/g, ''));
          return isNaN(n) ? 0 : n;
        };

        let successCount = 0;
        const errors = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row?.some(c => c?.toString().trim())) continue;

          const name         = row[mapping.name]?.toString().trim() || '';
          const categoryName = row[mapping.category]?.toString().trim() || '';
          const category_id  = findCategoryId(categoryName);

          if (!name)        { errors.push(`Baris ${i + 2}: Nama kosong`);                              continue; }
          if (!category_id) { errors.push(`Baris ${i + 2}: Kategori "${categoryName}" tidak ditemukan`); continue; }

          const r = await addProduct({
            name, category_id,
            price_pcs:  mapping.price_pcs  !== '' ? cleanPrice(row[mapping.price_pcs])  : 0,
            price_pack: mapping.price_pack !== '' ? cleanPrice(row[mapping.price_pack]) : 0,
            price_kg:   mapping.price_kg   !== '' ? cleanPrice(row[mapping.price_kg])   : 0,
            stock:      mapping.stock      !== '' ? cleanPrice(row[mapping.stock])      : 0,
            min_stock:  mapping.min_stock  !== '' ? cleanPrice(row[mapping.min_stock])  : 0,
            notes: 'Import dari Excel',
          });

          if (r.success) successCount++;
          else errors.push(`Baris ${i + 2}: ${r.error || 'Gagal'}`);
        }

        setResult({ success: successCount, error: errors.length, errors });
        setLoading(false);
        if (successCount > 0) onSuccess();
      } catch (err) {
        alert('Error: ' + err.message);
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const isReady = !loading && mapping.name !== '' && mapping.category !== '' && file;

  // ── Steps ──
  const step = !file ? 1 : !preview ? 1 : result ? 3 : 2;

  return (
    <FormModal title="Import dari Excel" subtitle="Produk" onClose={onClose}>
      <style>{MODAL_CSS + EXTRA_CSS}</style>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
        {['Upload File', 'Mapping Kolom', 'Hasil'].map((s, i) => {
          const n = i + 1;
          const done   = step > n;
          const active = step === n;
          return (
            <React.Fragment key={n}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: done ? T.green + '20' : active ? T.accent + '18' : T.border,
                  border: `1px solid ${done ? T.green + '50' : active ? T.accent + '50' : T.border2}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800,
                  color: done ? T.green : active ? T.accent : T.muted,
                  transition: 'all 0.3s',
                }}>
                  {done ? '✓' : n}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                  color: active ? T.text : done ? T.sub : T.muted,
                  transition: 'color 0.3s',
                }}>{s}</span>
              </div>
              {i < 2 && <div style={{ flex: 1, height: 1, background: done ? T.green + '40' : T.border, margin: '0 10px', transition: 'background 0.3s' }} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── STEP 1: Upload ── */}
      {step === 1 && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          style={{
            border: `2px dashed ${file ? T.green + '60' : T.border2}`,
            borderRadius: 14, padding: '32px 24px', textAlign: 'center',
            background: file ? T.green + '06' : T.bg,
            transition: 'all 0.2s', cursor: 'pointer',
            marginBottom: 20,
          }}
          onClick={() => document.getElementById('excel-file-input').click()}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 14, margin: '0 auto 12px',
            background: file ? T.green + '18' : T.border,
            border: `1px solid ${file ? T.green + '40' : T.border2}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M4 14v3a1 1 0 001 1h12a1 1 0 001-1v-3" stroke={file ? T.green : T.sub} strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M11 4v10M8 7l3-3 3 3" stroke={file ? T.green : T.sub} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <p style={{ fontSize: 13, fontWeight: 700, color: file ? T.green : T.text, marginBottom: 4 }}>
            {file ? file.name : 'Klik atau drag & drop file Excel'}
          </p>
          <p style={{ fontSize: 11, color: T.muted }}>
            {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Format: .xlsx, .xls, .csv'}
          </p>

          <input
            id="excel-file-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* ── STEP 2: Mapping + Preview ── */}
      {step === 2 && preview && (
        <>
          {/* Mapping grid */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, marginBottom: 12 }}>
              Mapping Kolom
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {MAPPING_FIELDS.map(({ key, label, required, color }) => (
                <div key={key}>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6,
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color,
                  }}>
                    {label}
                    {required && <span style={{ color: T.accent }}>✱</span>}
                    {mapping[key] !== '' && (
                      <span style={{
                        marginLeft: 'auto', fontSize: 9,
                        color: T.green, fontWeight: 700,
                      }}>
                        ✓ {preview.headers[mapping[key]] || `Kol.${mapping[key]+1}`}
                      </span>
                    )}
                  </label>
                  <select
                    value={mapping[key]}
                    onChange={e => setMapping(prev => ({ ...prev, [key]: e.target.value !== '' ? parseInt(e.target.value) : '' }))}
                    className="import-select"
                    style={{
                      ...selectStyle,
                      borderColor: required && mapping[key] === '' ? T.red + '40' : T.border2,
                    }}
                  >
                    <option value="">— Tidak dipakai —</option>
                    {preview.headers.map((h, i) => (
                      <option key={i} value={i}>{h || `Kolom ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Validation hint */}
            {(mapping.name === '' || mapping.category === '') && (
              <div style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 9,
                background: T.red + '0C', border: `1px solid ${T.red}25`,
                fontSize: 11, color: T.red, display: 'flex', alignItems: 'center', gap: 7,
              }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M6.5 1L12 11.5H1L6.5 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                  <path d="M6.5 5v3M6.5 9.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                Kolom Nama dan Kategori wajib dipilih sebelum import
              </div>
            )}
          </div>

          {/* Preview table */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, marginBottom: 10 }}>
              Preview Data <span style={{ color: T.muted, fontWeight: 400 }}>({preview.rows.length} baris pertama)</span>
            </p>
            <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: 11 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Syne, sans-serif' }}>
                <thead>
                  <tr>
                    {preview.headers.map((h, i) => {
                      const isMapped = Object.values(mapping).includes(i);
                      return (
                        <th key={i} style={{
                          padding: '8px 12px', textAlign: 'left',
                          fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                          textTransform: 'uppercase', whiteSpace: 'nowrap',
                          borderBottom: `1px solid ${T.border}`,
                          color: isMapped ? T.accent : T.muted,
                          background: isMapped ? T.accent + '06' : T.bg,
                        }}>
                          {h || `Kolom ${i + 1}`}
                          {isMapped && <span style={{ marginLeft: 4, fontSize: 8, color: T.accent }}>●</span>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, ri) => (
                    <tr key={ri} style={{ transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = T.border + '50'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {row.map((cell, ci) => {
                        const isMapped = Object.values(mapping).includes(ci);
                        return (
                          <td key={ci} style={{
                            padding: '8px 12px', fontSize: 11, whiteSpace: 'nowrap',
                            borderBottom: `1px solid ${T.border}`,
                            color: isMapped ? T.text : T.sub,
                            fontFamily: typeof cell === 'number' ? 'JetBrains Mono, monospace' : 'Syne, sans-serif',
                          }}>
                            {cell ?? '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* File info & change */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', borderRadius: 10,
            background: T.border, border: `1px solid ${T.border2}`,
            marginBottom: 18,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="1" width="10" height="12" rx="1.5" stroke={T.green} strokeWidth="1.3"/>
                <path d="M5 5h4M5 7.5h4M5 10h2" stroke={T.green} strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{file?.name}</span>
              <span style={{ fontSize: 10, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>{(file?.size / 1024).toFixed(1)} KB</span>
            </div>
            <button
              onClick={() => { setFile(null); setPreview(null); setResult(null); }}
              style={{
                fontSize: 10, fontWeight: 700, color: T.sub, letterSpacing: '0.06em',
                background: 'none', border: `1px solid ${T.border2}`,
                padding: '3px 10px', borderRadius: 7, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = T.sub; }}
              onMouseLeave={e => { e.currentTarget.style.color = T.sub; e.currentTarget.style.borderColor = T.border2; }}
            >Ganti File</button>
          </div>
        </>
      )}

      {/* ── STEP 3: Result ── */}
      {step === 3 && result && (
        <div style={{ marginBottom: 20 }}>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{
              padding: '16px', borderRadius: 12, textAlign: 'center',
              background: T.green + '10', border: `1px solid ${T.green}30`,
            }}>
              <p style={{ fontSize: 32, fontWeight: 800, color: T.green, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
                {result.success}
              </p>
              <p style={{ fontSize: 10, fontWeight: 700, color: T.green + 'AA', marginTop: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Berhasil Diimpor
              </p>
            </div>
            <div style={{
              padding: '16px', borderRadius: 12, textAlign: 'center',
              background: result.error > 0 ? T.red + '10' : T.border,
              border: `1px solid ${result.error > 0 ? T.red + '30' : T.border2}`,
            }}>
              <p style={{ fontSize: 32, fontWeight: 800, color: result.error > 0 ? T.red : T.muted, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1 }}>
                {result.error}
              </p>
              <p style={{ fontSize: 10, fontWeight: 700, color: result.error > 0 ? T.red + 'AA' : T.muted, marginTop: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Gagal / Dilewati
              </p>
            </div>
          </div>

          {/* Error details */}
          {result.errors?.length > 0 && (
            <div style={{ borderRadius: 11, border: `1px solid ${T.red}25`, overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', background: T.red + '0C', borderBottom: `1px solid ${T.red}20` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: T.red, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Detail Error
                </p>
              </div>
              <div style={{ maxHeight: 160, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {result.errors.slice(0, 20).map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                    <span style={{ color: T.red, fontSize: 10, flexShrink: 0, marginTop: 1 }}>×</span>
                    <span style={{ fontSize: 11, color: T.sub, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.5 }}>{e}</span>
                  </div>
                ))}
                {result.errors.length > 20 && (
                  <p style={{ fontSize: 10, color: T.muted, fontStyle: 'italic' }}>… dan {result.errors.length - 20} error lainnya</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ACTION BUTTONS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: step === 3 ? '1fr' : '1fr 2fr', gap: 10, paddingBottom: 4 }}>
        {step !== 3 && (
          <button type="button" onClick={onClose} style={{
            padding: '11px', borderRadius: 12,
            border: `1px solid ${T.border2}`, background: 'transparent',
            color: T.sub, fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = T.border; e.currentTarget.style.color = T.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.sub; }}
          >Batal</button>
        )}

        {step === 3 ? (
          <button onClick={onClose} style={{
            padding: '11px', borderRadius: 12,
            border: `1px solid ${T.green}50`, background: T.green + '18',
            color: T.green, fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 800,
            cursor: 'pointer', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
            onMouseEnter={e => e.currentTarget.style.background = T.green + '28'}
            onMouseLeave={e => e.currentTarget.style.background = T.green + '18'}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7.5l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Selesai
          </button>
        ) : (
          <button
            onClick={processImport}
            disabled={!isReady}
            style={{
              padding: '11px', borderRadius: 12,
              border: `1px solid ${isReady ? T.purple + '50' : T.border2}`,
              background: isReady ? T.purple + '14' : T.border,
              color: isReady ? T.purple : T.muted,
              fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 800,
              letterSpacing: '0.04em', cursor: isReady ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s', opacity: isReady ? 1 : 0.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseEnter={e => { if (isReady) e.currentTarget.style.background = T.purple + '24'; }}
            onMouseLeave={e => { if (isReady) e.currentTarget.style.background = T.purple + '14'; }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 13, height: 13, border: `2px solid ${T.muted}`,
                  borderTopColor: T.purple, borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Memproses…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M4 5h6M4 7.5h4M4 10h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                Mulai Import
              </>
            )}
          </button>
        )}
      </div>
    </FormModal>
  );
}

const EXTRA_CSS = `
  .import-select:focus {
    border-color: ${T.accent}70 !important;
    box-shadow: 0 0 0 2px ${T.accent}12 !important;
  }
  select option { background: ${T.surface}; color: ${T.text}; }
`;

export default ImportExcel;