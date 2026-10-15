import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { addProduct } from "../../services/database";
import { getCategories, addCategory } from "../../services/categories";
import { addStock } from "../../services/inventory";
import { FormModal, MODAL_CSS } from "./ProductForm";
import { T } from "../../theme";

// ─── FIELD CONFIGS ────────────────────────────────────────────────────────────
const MAPPING_FIELDS = [
  { key: 'name',           label: 'Nama Produk',          required: true,  color: T.text,   hint: 'Wajib' },
  { key: 'category',       label: 'Kategori',             required: false, color: T.text,   hint: 'Opsional jika pakai default' },
  { key: 'isi',            label: 'Isi / Konversi',       required: false, color: T.sub,    hint: 'Cth: 100 Pack, 25 Pack, 15Kg' },
  { key: 'sell_per_unit',  label: 'Satuan Jual',          required: false, color: T.text,   hint: 'Pack, Kg, Pcs, Dus' },
  { key: 'purchase_price', label: 'Harga Beli (Modal)',   required: false, color: T.accent, hint: 'Modal Pack/Kg atau umum' },
  { key: 'modal_pcs',      label: 'Modal Pcs',            required: false, color: T.accent, hint: 'Modal per satuan kecil' },
  { key: 'modal_dus',      label: 'Modal Dus/Bal',        required: false, color: T.accent, hint: 'Modal per karton' },
  { key: 'price_pack',     label: 'Harga Jual /Pack',     required: false, color: T.green,  hint: 'Eceran pack' },
  { key: 'price_pcs',      label: 'Harga Jual /Pcs',      required: false, color: T.blue,   hint: 'Eceran satuan' },
  { key: 'price_dus',      label: 'Harga Jual /Dus',      required: false, color: T.accent, hint: 'Grosir karton' },
  { key: 'price_kg',       label: 'Harga Jual /Kg',       required: false, color: T.purple, hint: 'Timbangan sembako' },
  { key: 'stock',          label: 'Stok Awal',            required: false, color: T.green,  hint: 'Jumlah stok fisik' },
  { key: 'min_stock',      label: 'Min Stok',             required: false, color: T.sub,    hint: 'Peringatan stok menipis' },
];

const selectStyle = {
  width: '100%', padding: '8px 11px',
  borderRadius: 9, border: `1px solid ${T.border2}`,
  background: T.bg, color: T.text,
  fontFamily: 'Syne, sans-serif', fontSize: 12,
  outline: 'none', cursor: 'pointer',
  transition: 'border-color 0.15s',
};

// Deteksi header 2-level (misal Modal -> Sak/Dus/Bal, Pack/Kg, Pcs)
function extractSmartHeaders(data) {
  if (!data || data.length === 0) return { headers: [], dataStartIndex: 0 };
  const row0 = data[0] || [];
  const row1 = data[1] || [];

  const row1SubheaderIndicators = ['sak', 'dus', 'bal', 'pack', 'kg', 'pcs', 'ons', 'gram', 'lusin'];
  const isRow1Subheader = row1.some(c => {
    if (!c) return false;
    const s = String(c).toLowerCase().trim();
    return row1SubheaderIndicators.some(ind => s.includes(ind));
  });

  if (isRow1Subheader) {
    let lastParentHeader = '';
    const mergedHeaders = [];
    const maxCols = Math.max(row0.length, row1.length);
    for (let c = 0; c < maxCols; c++) {
      const h0 = row0[c] ? String(row0[c]).trim() : '';
      const h1 = row1[c] ? String(row1[c]).trim() : '';

      if (h0) lastParentHeader = h0;

      if (h0 && !h1) {
        mergedHeaders.push(h0);
      } else if (h1) {
        if (lastParentHeader && !h1.toLowerCase().includes(lastParentHeader.toLowerCase())) {
          mergedHeaders.push(`${lastParentHeader} (${h1})`);
        } else {
          mergedHeaders.push(h1);
        }
      } else {
        mergedHeaders.push(lastParentHeader ? `${lastParentHeader} (Kolom ${c+1})` : `Kolom ${c+1}`);
      }
    }
    return { headers: mergedHeaders, dataStartIndex: 2 };
  }

  return { 
    headers: row0.map((h, i) => h ? String(h).trim() : `Kolom ${i+1}`), 
    dataStartIndex: 1 
  };
}

function ImportExcel({ onClose, onSuccess }) {
  const [file, setFile]                 = useState(null);
  const [workbook, setWorkbook]         = useState(null);
  const [sheetNames, setSheetNames]     = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [loading, setLoading]           = useState(false);
  const [preview, setPreview]           = useState(null); // { headers, rows, dataStartIndex }
  const [categories, setCategories]     = useState([]);
  const [defaultCategory, setDefaultCategory] = useState('auto'); // 'auto' or category id
  const [result, setResult]             = useState(null); // { success, error, total, errors }
  
  const [mapping, setMapping] = useState({
    name: '', category: '', isi: '', sell_per_unit: '',
    purchase_price: '', modal_pcs: '', modal_dus: '',
    price_pcs: '', price_pack: '', price_dus: '', price_kg: '',
    stock: '', min_stock: '',
  });

  useEffect(() => { 
    getCategories().then(setCategories); 
  }, []);

  // Memuat lembar (sheet) data dari workbook
  const loadSheetData = (wb, sheetName) => {
    try {
      const ws = wb.Sheets[sheetName];
      if (!ws) return;
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const { headers, dataStartIndex } = extractSmartHeaders(data);
      const rows = data.slice(dataStartIndex, dataStartIndex + 8).filter(r => r?.some(c => c?.toString().trim()));

      setPreview({ headers, rows, dataStartIndex });

      // Smart Auto-Mapping
      const m = {
        name: '', category: '', isi: '', sell_per_unit: '',
        purchase_price: '', modal_pcs: '', modal_dus: '',
        price_pcs: '', price_pack: '', price_dus: '', price_kg: '',
        stock: '', min_stock: '',
      };

      headers.forEach((h, i) => {
        if (!h) return;
        const hl = String(h).toLowerCase().trim();

        if (hl.includes('nama') || hl.includes('produk') || hl.includes('barang')) m.name = i;
        if (hl.includes('kategori') || hl.includes('category')) m.category = i;
        if (hl.includes('isi') || hl.includes('kemasan')) m.isi = i;
        if (hl === 'satuan' || hl.includes('satuan jual') || hl === 'unit') m.sell_per_unit = i;

        // Modal / Purchase price
        if (hl.includes('modal') || hl.includes('beli') || hl.includes('hpp')) {
          if (hl.includes('pcs') || hl.includes('/pcs')) m.modal_pcs = i;
          else if (hl.includes('pack') || hl.includes('kg') || hl.includes('pk')) m.purchase_price = i;
          else if (hl.includes('dus') || hl.includes('bal') || hl.includes('sak')) m.modal_dus = i;
          else if (m.purchase_price === '') m.purchase_price = i;
        }

        // Selling prices
        if (hl.includes('jual') || hl.includes('harga') || hl.includes('price')) {
          if (hl.includes('pcs') || hl === '/pcs' || hl === 'pcs') m.price_pcs = i;
          else if (hl.includes('pack') || hl === '/pack' || hl === 'pack' || hl.includes('pk')) m.price_pack = i;
          else if (hl.includes('dus') || hl.includes('bal') || hl.includes('sak')) m.price_dus = i;
          else if (hl.includes('kg') || hl === '/kg' || hl === 'kg') m.price_kg = i;
        }

        if (hl.includes('stok') && !hl.includes('min')) m.stock = i;
        if (hl.includes('min stok') || hl.includes('minimal')) m.min_stock = i;
      });

      setMapping(prev => ({ ...prev, ...m }));
    } catch (err) {
      alert('Gagal memproses lembar sheet: ' + err.message);
    }
  };

  // ── File handling ──
  const handleFileUpload = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);

        // Pilih sheet 'Daftar Barang' jika ada, atau sheet pertama
        const targetSheet = wb.SheetNames.find(s => s.toLowerCase().includes('barang') || s.toLowerCase().includes('produk')) || wb.SheetNames[0];
        setSelectedSheet(targetSheet);
        loadSheetData(wb, targetSheet);
      } catch (err) {
        alert('Error membaca file Excel: ' + err.message);
      }
    };
    reader.readAsBinaryString(f);
  };

  const handleSheetChange = (newSheet) => {
    setSelectedSheet(newSheet);
    if (workbook) {
      loadSheetData(workbook, newSheet);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && /\.(xlsx|xls|csv)$/i.test(f.name)) {
      handleFileUpload({ target: { files: [f] } });
    }
  };

  // ── Helper Pembersihan Angka ──
  const cleanNumber = (val, isFloat = false) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    let cleaned = String(val).replace(/rp|r|p|\s|"|'/gi, '');
    if (isFloat) {
      if (cleaned.includes(',') && !cleaned.includes('.')) {
        cleaned = cleaned.replace(',', '.');
      } else if (cleaned.includes('.') && cleaned.includes(',')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      }
      const n = parseFloat(cleaned);
      return isNaN(n) ? 0 : n;
    } else {
      cleaned = cleaned.replace(/,|\./g, '');
      const n = parseInt(cleaned, 10);
      return isNaN(n) ? 0 : n;
    }
  };

  const cleanPrice = (val) => cleanNumber(val, false);
  const cleanQty   = (val) => cleanNumber(val, true);

  // Auto deteksi kategori cerdas berdasarkan kata kunci nama produk
  const detectCategoryFromName = (prodName) => {
    const n = String(prodName).toLowerCase();
    if (n.includes('kacang') || n.includes('sagu') || n.includes('ketan') || n.includes('mentega') || n.includes('beras') || n.includes('gula')) {
      return 'Bahan Curah & Sembako';
    }
    if (n.includes('cup') || n.includes('sedotan') || n.includes('tutup gelas') || n.includes('slim') || n.includes('jelly')) {
      return 'Cup Minuman & Sedotan';
    }
    if (n.includes('mika') || n.includes('thinwall') || n.includes('mangkok') || n.includes('l.box') || n.includes('box') ||
        n.includes('kertas nasi') || n.includes('sendok') || n.includes('tusuk sate') || n.includes('paperkraft')) {
      return 'Kotak Nasi, Mika & Thinwall';
    }
    return 'Kantong Plastik & Kresek';
  };

  // ── Eksekusi Import ──
  const processImport = async () => {
    if (!workbook || !selectedSheet) return;
    if (mapping.name === '') {
      alert('Pilih kolom Nama Produk terlebih dahulu');
      return;
    }
    setLoading(true);

    try {
      const ws   = workbook.Sheets[selectedSheet];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const startIndex = preview?.dataStartIndex || 1;
      const rows = data.slice(startIndex);

      let successCount = 0;
      const errors = [];
      let localCategories = [...categories];

      const getOrCreateCategoryId = async (catName) => {
        if (!catName) return null;
        const formatName = String(catName).trim().toLowerCase();
        let cat = localCategories.find(c => c.name.toLowerCase() === formatName) ||
                  localCategories.find(c => c.name.toLowerCase().includes(formatName) || formatName.includes(c.name.toLowerCase()));
        
        if (cat) return cat.id;

        // Buat kategori otomatis jika belum ada
        const res = await addCategory({ name: catName.trim(), color: '#3B82F6', description: 'Dibuat otomatis dari import Excel' });
        if (res.success) {
          const newId = res.id;
          localCategories.push({ id: newId, name: catName.trim(), color: '#3B82F6' });
          return newId;
        }
        return null;
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !row.some(c => c?.toString().trim())) continue;

        const name = row[mapping.name]?.toString().trim() || '';
        if (!name) continue; // Lewati baris kosong

        // 1. Tentukan Kategori
        let categoryName = mapping.category !== '' ? (row[mapping.category]?.toString().trim() || '') : '';
        if (!categoryName) {
          if (defaultCategory === 'auto') {
            categoryName = detectCategoryFromName(name);
          } else {
            const defCat = localCategories.find(c => String(c.id) === String(defaultCategory));
            categoryName = defCat ? defCat.name : 'Umum';
          }
        }

        const category_id = await getOrCreateCategoryId(categoryName);
        if (!category_id) {
          errors.push(`Baris ${i + startIndex + 1}: Kategori "${categoryName}" gagal diproses`);
          continue;
        }

        // 2. Tentukan Satuan Jual & Konversi Isi
        const rawIsi = mapping.isi !== '' ? (row[mapping.isi]?.toString().trim() || '') : '';
        const rawSatuan = mapping.sell_per_unit !== '' ? (row[mapping.sell_per_unit]?.toString().trim().toLowerCase() || '') : '';
        const nameLower = name.toLowerCase();

        const isKg = rawSatuan === 'kg' || nameLower.includes('kacang') || nameLower.includes('sagu') || nameLower.includes('ketan') || nameLower.includes('mentega');
        const sell_per_unit = isKg ? 'kg' : 'all';

        let pack_per_dus = 1;
        let pcs_per_pack = 1;
        let kg_per_karung = 25;

        if (rawIsi) {
          const s = rawIsi.toLowerCase();
          if (s.includes('kg')) {
            const num = cleanPrice(s);
            kg_per_karung = num > 0 ? num : (nameLower.includes('mentega') ? 15 : 25);
          } else if (s.includes('pack')) {
            const num = cleanPrice(s);
            pack_per_dus = num > 0 ? num : 1;
          }
        }

        // Harga Modal & Jual
        const modalPackKg = mapping.purchase_price !== '' ? cleanPrice(row[mapping.purchase_price]) : 0;
        const modalPcs    = mapping.modal_pcs      !== '' ? cleanPrice(row[mapping.modal_pcs])      : 0;
        const modalDus    = mapping.modal_dus      !== '' ? cleanPrice(row[mapping.modal_dus])      : 0;

        const pricePack   = mapping.price_pack     !== '' ? cleanPrice(row[mapping.price_pack])     : 0;
        const pricePcs    = mapping.price_pcs      !== '' ? cleanPrice(row[mapping.price_pcs])      : 0;
        const priceDus    = mapping.price_dus      !== '' ? cleanPrice(row[mapping.price_dus])      : 0;
        const priceKgVal  = mapping.price_kg       !== '' ? cleanPrice(row[mapping.price_kg])       : 0;

        // Auto hitung pcs_per_pack jika ada modal_pack dan modal_pcs
        if (modalPackKg > 0 && modalPcs > 0) {
          pcs_per_pack = Math.max(1, Math.round(modalPackKg / modalPcs));
        } else if (pricePack > 0 && pricePcs > 0 && pricePack > pricePcs) {
          pcs_per_pack = Math.max(1, Math.round(pricePack / pricePcs));
        }

        // Tentukan purchase_price dasar (selalu dalam satuan dasar eceran: Pcs atau Kg)
        let purchase_price = 0;
        if (isKg) {
          purchase_price = modalPackKg || (modalDus > 0 && kg_per_karung > 0 ? Math.round(modalDus / kg_per_karung) : 0);
        } else {
          if (modalPcs > 0) purchase_price = modalPcs;
          else if (modalPackKg > 0) purchase_price = Math.round(modalPackKg / (pcs_per_pack || 1));
          else if (modalDus > 0 && pack_per_dus > 0 && pcs_per_pack > 0) purchase_price = Math.round(modalDus / (pack_per_dus * pcs_per_pack));
        }

        // Harga jual
        let finalPriceKg = isKg ? (priceKgVal || pricePack) : 0;
        let finalPriceDus = priceDus;
        if (finalPriceDus === 0 && !isKg && pricePack > 0 && pack_per_dus > 1) {
          finalPriceDus = Math.round((pricePack * pack_per_dus * 0.95) / 1000) * 1000;
        }

        let finalPriceKarung = isKg && (priceDus > 0 ? priceDus : (finalPriceKg > 0 ? Math.round((finalPriceKg * kg_per_karung * 0.95) / 5000) * 5000 : 0));

        let defaultDusLabel = 'Dus';
        if (nameLower.includes('plastik') || nameLower.includes('kresek')) {
          defaultDusLabel = 'Karung';
        } else if (nameLower.includes('bal ') || nameLower.includes(' bal')) {
          defaultDusLabel = 'Bal';
        }

        // Tambahkan produk ke database
        const r = await addProduct({
          name,
          category_id,
          sell_per_unit,
          purchase_price,
          price_pcs: pricePcs,
          price_pack: pricePack,
          price_dus: finalPriceDus,
          price_kg: finalPriceKg,
          price_karung: finalPriceKarung,
          pcs_per_pack,
          pack_per_dus,
          kg_per_karung,
          dus_label: defaultDusLabel,
          min_stock: !isKg && mapping.min_stock !== '' ? cleanPrice(row[mapping.min_stock]) : 5,
          min_stock_kg: isKg && mapping.min_stock !== '' ? cleanQty(row[mapping.min_stock]) : 5,
          notes: 'Import dari Excel / CSV',
        });

        if (r.success) {
          successCount++;
          // Input stok awal jika ada kolom stok yang dipetakan
          const initStock = mapping.stock !== '' ? cleanQty(row[mapping.stock]) : 0;
          if (initStock > 0) {
            if (isKg) {
              await addStock(r.id, {
                qty_kg: initStock,
                purchase_price,
                notes: 'Stok Awal dari Import Excel'
              }, { pcs_per_pack, pack_per_dus });
            } else {
              await addStock(r.id, {
                qty_pcs: Math.round(initStock),
                purchase_price,
                notes: 'Stok Awal dari Import Excel'
              }, { pcs_per_pack, pack_per_dus });
            }
          }
        } else {
          errors.push(`Baris ${i + startIndex + 1}: ${r.error || 'Gagal menyimpan produk'}`);
        }
      }

      setResult({ success: successCount, error: errors.length, errors });
      setLoading(false);
      if (successCount > 0) {
        onSuccess();
      }
    } catch (err) {
      alert('Error saat proses import: ' + err.message);
      setLoading(false);
    }
  };

  const isReady = !loading && mapping.name !== '' && file && preview;
  const step = !file ? 1 : !preview ? 1 : result ? 3 : 2;

  return (
    <FormModal title="Import CSV / Excel" subtitle="Daftar Produk Toko" onClose={onClose}>
      <style>{MODAL_CSS + EXTRA_CSS}</style>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20 }}>
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
            borderRadius: 14, padding: '36px 24px', textAlign: 'center',
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
            {file ? file.name : 'Pilih atau Tarik File Excel ke Sini'}
          </p>
          <p style={{ fontSize: 11, color: T.muted }}>
            {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Mendukung format: .xlsx, .xls, .csv'}
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
          {/* Sheet Selector & Default Category Controls */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
            padding: '12px 14px', borderRadius: 12,
            background: T.border + '40', border: `1px solid ${T.border2}`,
            marginBottom: 16,
          }}>
            {/* Sheet Selector */}
            <div>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: T.sub, marginBottom: 5 }}>
                Lembar Excel (Sheet)
              </label>
              <select
                value={selectedSheet}
                onChange={e => handleSheetChange(e.target.value)}
                style={selectStyle}
              >
                {sheetNames.map((s, idx) => (
                  <option key={idx} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Default Category Fallback */}
            <div>
              <label style={{ display: 'block', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: T.accent, marginBottom: 5 }}>
                Kategori Default (Jika di Excel kosong)
              </label>
              <select
                value={defaultCategory}
                onChange={e => setDefaultCategory(e.target.value)}
                style={selectStyle}
              >
                <option value="auto">Otomatis Deteksi Berdasarkan Nama</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Mapping Grid */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted }}>
                Pemetaan Kolom (Auto-Mapped)
              </p>
              <span style={{ fontSize: 10, color: T.sub }}>
                Header terdeteksi pada baris {preview.dataStartIndex}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {MAPPING_FIELDS.map(({ key, label, required, color, hint }) => (
                <div key={key}>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5,
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color,
                  }}>
                    {label}
                    {required && <span style={{ color: T.red }}>✱</span>}
                    {mapping[key] !== '' && (
                      <span style={{ marginLeft: 'auto', fontSize: 9, color: T.green, fontWeight: 700 }}>
                        ✓ {preview.headers[mapping[key]] ? String(preview.headers[mapping[key]]).slice(0, 16) : `Kol.${mapping[key]+1}`}
                      </span>
                    )}
                  </label>
                  <select
                    value={mapping[key]}
                    onChange={e => setMapping(prev => ({ ...prev, [key]: e.target.value !== '' ? parseInt(e.target.value) : '' }))}
                    className="import-select"
                    style={{
                      ...selectStyle,
                      borderColor: required && mapping[key] === '' ? T.red + '50' : T.border2,
                    }}
                  >
                    <option value="">— Tidak Dipakai / Kosong —</option>
                    {preview.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {i + 1}. {h || `Kolom ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {mapping.name === '' && (
              <div style={{
                marginTop: 12, padding: '8px 12px', borderRadius: 9,
                background: T.red + '0C', border: `1px solid ${T.red}25`,
                fontSize: 11, color: T.red, display: 'flex', alignItems: 'center', gap: 7,
              }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M6.5 1L12 11.5H1L6.5 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                  <path d="M6.5 5v3M6.5 9.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                Kolom Nama Produk wajib dipilih untuk import
              </div>
            )}
          </div>

          {/* Preview Table */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.muted, marginBottom: 8 }}>
              Pratinjau Data ({preview.rows.length} Baris Pertama)
            </p>
            <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: 10, maxHeight: 180 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Syne, sans-serif' }}>
                <thead>
                  <tr>
                    {preview.headers.map((h, i) => {
                      const isMapped = Object.values(mapping).includes(i);
                      return (
                        <th key={i} style={{
                          padding: '7px 10px', textAlign: 'left',
                          fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                          textTransform: 'uppercase', whiteSpace: 'nowrap',
                          borderBottom: `1px solid ${T.border}`,
                          color: isMapped ? T.accent : T.muted,
                          background: isMapped ? T.accent + '10' : T.bg,
                          position: 'sticky', top: 0,
                        }}>
                          {h || `Kolom ${i + 1}`}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, ri) => (
                    <tr key={ri} style={{ transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = T.border + '40'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {row.map((cell, ci) => {
                        const isMapped = Object.values(mapping).includes(ci);
                        return (
                          <td key={ci} style={{
                            padding: '6px 10px', fontSize: 11, whiteSpace: 'nowrap',
                            borderBottom: `1px solid ${T.border}`,
                            color: isMapped ? T.text : T.sub,
                            fontFamily: typeof cell === 'number' ? 'JetBrains Mono, monospace' : 'Syne, sans-serif',
                          }}>
                            {cell !== undefined && cell !== null && cell !== '' ? String(cell) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* File info */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', borderRadius: 9,
            background: T.border, border: `1px solid ${T.border2}`,
            marginBottom: 16,
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
              onClick={() => { setFile(null); setWorkbook(null); setPreview(null); setResult(null); }}
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

          {result.errors?.length > 0 && (
            <div style={{ borderRadius: 11, border: `1px solid ${T.red}25`, overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', background: T.red + '0C', borderBottom: `1px solid ${T.red}20` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: T.red, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Detail Catatan
                </p>
              </div>
              <div style={{ maxHeight: 150, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {result.errors.slice(0, 15).map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                    <span style={{ color: T.red, fontSize: 10, flexShrink: 0, marginTop: 1 }}>×</span>
                    <span style={{ fontSize: 11, color: T.sub, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.5 }}>{e}</span>
                  </div>
                ))}
                {result.errors.length > 15 && (
                  <p style={{ fontSize: 10, color: T.muted, fontStyle: 'italic' }}>… dan {result.errors.length - 15} catatan lainnya</p>
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
                Memproses Import…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M4 5h6M4 7.5h4M4 10h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                Mulai Import Produk
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