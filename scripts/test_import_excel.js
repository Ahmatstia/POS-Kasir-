const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const XLSX = require('../node_modules/xlsx');

const excelPath = path.resolve(__dirname, '../data/data.xlsx');
const testDbPath = path.resolve(__dirname, 'test_import.db');

if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const db = new sqlite3.Database(testDbPath);
const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

async function setupTables() {
  await run(`
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT,
      description TEXT
    )
  `);

  await run(`
    CREATE TABLE products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER,
      sell_per_unit TEXT DEFAULT 'all',
      purchase_price INTEGER DEFAULT 0,
      price_pcs INTEGER DEFAULT 0,
      price_pack INTEGER DEFAULT 0,
      price_dus INTEGER DEFAULT 0,
      price_kg INTEGER DEFAULT 0,
      price_karung INTEGER DEFAULT 0,
      pcs_per_pack INTEGER DEFAULT 1,
      pack_per_dus INTEGER DEFAULT 1,
      kg_per_karung REAL DEFAULT 25,
      min_stock INTEGER DEFAULT 5,
      min_stock_kg REAL DEFAULT 5,
      notes TEXT,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);
}

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

  return { headers: row0.map((h, i) => h ? String(h).trim() : `Kolom ${i+1}`), dataStartIndex: 1 };
}

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

async function testImport() {
  console.log('=== AUDIT & TEST FITUR IMPORT EXCEL DENGAN DATA CLIENT ===');
  await setupTables();

  const wb = XLSX.readFile(excelPath);
  console.log('Sheet terdeteksi di Excel:', wb.SheetNames);

  const targetSheet = wb.SheetNames.find(s => s.toLowerCase().includes('barang')) || wb.SheetNames[0];
  console.log('Memilih sheet target:', targetSheet);

  const ws = wb.Sheets[targetSheet];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const { headers, dataStartIndex } = extractSmartHeaders(data);

  console.log('\n--- HEADER CERDAS YANG DIEKSTRAK ---');
  headers.forEach((h, i) => console.log(`[Col ${i}] ${h}`));
  console.log('Data dimulai dari baris indeks:', dataStartIndex);

  // Auto-map
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

    if (hl.includes('modal') || hl.includes('beli') || hl.includes('hpp')) {
      if (hl.includes('pcs') || hl.includes('/pcs')) m.modal_pcs = i;
      else if (hl.includes('pack') || hl.includes('kg') || hl.includes('pk')) m.purchase_price = i;
      else if (hl.includes('dus') || hl.includes('bal') || hl.includes('sak')) m.modal_dus = i;
      else if (m.purchase_price === '') m.purchase_price = i;
    }

    if (hl.includes('jual') || hl.includes('harga') || hl.includes('price')) {
      if (hl.includes('pcs') || hl === '/pcs' || hl === 'pcs') m.price_pcs = i;
      else if (hl.includes('pack') || hl === '/pack' || hl === 'pack' || hl.includes('pk')) m.price_pack = i;
      else if (hl.includes('dus') || hl.includes('bal') || hl.includes('sak')) m.price_dus = i;
      else if (hl.includes('kg') || hl === '/kg' || hl === 'kg') m.price_kg = i;
    }
  });

  console.log('\n--- HASIL PEMETAAN KOLOM OTOMATIS (MAPPING) ---');
  console.log(m);

  // Proses Import Baris per Baris
  const rows = data.slice(dataStartIndex);
  let successCount = 0;
  const errors = [];
  let localCategories = [];

  const getOrCreateCategoryId = async (catName) => {
    if (!catName) return null;
    const formatName = String(catName).trim().toLowerCase();
    let cat = localCategories.find(c => c.name.toLowerCase() === formatName);
    if (cat) return cat.id;

    const res = await run('INSERT INTO categories (name, color, description) VALUES (?, ?, ?)', [catName.trim(), '#3B82F6', 'Import']);
    const newId = res.lastID;
    localCategories.push({ id: newId, name: catName.trim() });
    return newId;
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.some(c => c?.toString().trim())) continue;

    const name = row[m.name]?.toString().trim() || '';
    if (!name) continue;

    let categoryName = m.category !== '' ? (row[m.category]?.toString().trim() || '') : '';
    if (!categoryName) {
      categoryName = detectCategoryFromName(name);
    }

    const category_id = await getOrCreateCategoryId(categoryName);
    if (!category_id) {
      errors.push(`Baris ${i + dataStartIndex + 1}: Kategori gagal`);
      continue;
    }

    const rawIsi = m.isi !== '' ? (row[m.isi]?.toString().trim() || '') : '';
    const rawSatuan = m.sell_per_unit !== '' ? (row[m.sell_per_unit]?.toString().trim().toLowerCase() || '') : '';
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

    const modalPackKg = m.purchase_price !== '' ? cleanPrice(row[m.purchase_price]) : 0;
    const modalPcs    = m.modal_pcs      !== '' ? cleanPrice(row[m.modal_pcs])      : 0;
    const modalDus    = m.modal_dus      !== '' ? cleanPrice(row[m.modal_dus])      : 0;

    const pricePack   = m.price_pack     !== '' ? cleanPrice(row[m.price_pack])     : 0;
    const pricePcs    = m.price_pcs      !== '' ? cleanPrice(row[m.price_pcs])      : 0;
    const priceDus    = m.price_dus      !== '' ? cleanPrice(row[m.price_dus])      : 0;
    const priceKgVal  = m.price_kg       !== '' ? cleanPrice(row[m.price_kg])       : 0;

    if (modalPackKg > 0 && modalPcs > 0) {
      pcs_per_pack = Math.max(1, Math.round(modalPackKg / modalPcs));
    } else if (pricePack > 0 && pricePcs > 0 && pricePack > pricePcs) {
      pcs_per_pack = Math.max(1, Math.round(pricePack / pricePcs));
    }

    let purchase_price = 0;
    if (isKg) {
      purchase_price = modalPackKg || (modalDus > 0 && kg_per_karung > 0 ? Math.round(modalDus / kg_per_karung) : 0);
    } else {
      if (modalPcs > 0) purchase_price = modalPcs;
      else if (modalPackKg > 0) purchase_price = modalPackKg;
      else if (modalDus > 0 && pack_per_dus > 1) purchase_price = Math.round(modalDus / pack_per_dus);
    }

    let finalPriceKg = isKg ? (priceKgVal || pricePack) : 0;
    let finalPriceDus = priceDus;
    if (finalPriceDus === 0 && !isKg && pricePack > 0 && pack_per_dus > 1) {
      finalPriceDus = Math.round((pricePack * pack_per_dus * 0.95) / 1000) * 1000;
    }

    let finalPriceKarung = isKg && (priceDus > 0 ? priceDus : (finalPriceKg > 0 ? Math.round((finalPriceKg * kg_per_karung * 0.95) / 5000) * 5000 : 0));

    await run(`
      INSERT INTO products 
        (name, category_id, sell_per_unit, purchase_price, price_pcs, price_pack, price_dus, price_kg, price_karung, pcs_per_pack, pack_per_dus, kg_per_karung)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, category_id, sell_per_unit, purchase_price, pricePcs, pricePack, finalPriceDus, finalPriceKg, finalPriceKarung, pcs_per_pack, pack_per_dus, kg_per_karung]);

    successCount++;
  }

  console.log(`\n🎉 HASIL TEST IMPORT:`);
  console.log(`- Berhasil diimpor: ${successCount} produk`);
  console.log(`- Gagal / Error: ${errors.length}`);

  const totalInDb = await all('SELECT count(*) as count FROM products');
  console.log(`- Total produk dalam database pengujian: ${totalInDb[0].count}`);

  const categoriesInDb = await all(`
    SELECT c.name, count(p.id) as count 
    FROM categories c 
    LEFT JOIN products p ON p.category_id = c.id 
    GROUP BY c.id
  `);
  console.log('\n--- DISTRIBUSI KATEGORI TERBENTUK ---');
  categoriesInDb.forEach(c => console.log(`${c.name}: ${c.count} produk`));

  const sampleProducts = await all(`
    SELECT name, sell_per_unit, purchase_price, price_pcs, price_pack, price_dus, price_kg, pcs_per_pack, pack_per_dus
    FROM products
    WHERE name LIKE '%Kharisma%' OR name LIKE '%Hijau%' OR name LIKE '%Punggawa%'
    LIMIT 3
  `);
  console.log('\n--- SAMPEL PRODUK HASIL IMPORT ---');
  console.log(sampleProducts);

  db.close();
  // Cleanup test db
  fs.unlinkSync(testDbPath);
  console.log('\n✅ PENGUJIAN SELESAI & DATABASE TEST BERSIH.');
}

testImport();
