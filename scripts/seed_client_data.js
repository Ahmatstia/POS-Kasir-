/**
 * SEEDER SCRIPT: Clean Master Products & Categories Only
 * Source: data/data.xlsx (74 real client products)
 * Target Databases:
 *  - C:/Users/ACER/AppData/Roaming/POS/pos-toko-bumbu.db
 *  - C:/Users/ACER/AppData/Roaming/pos/pos-toko-bumbu.db
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const XLSX = require('../node_modules/xlsx');

const appDir = path.resolve(__dirname, '..');
const excelPath = path.join(appDir, 'data', 'data.xlsx');

const dbTargets = [
  path.join(process.env.APPDATA, 'POS', 'pos-toko-bumbu.db'),
  path.join(process.env.APPDATA, 'pos', 'pos-toko-bumbu.db')
];

console.log('🚀 Seeding Database: MURNI HANYA PRODUK & KATEGORI (Clean State)...');
console.log('📖 Reading Excel:', excelPath);

if (!fs.existsSync(excelPath)) {
  console.error('❌ Excel file not found at:', excelPath);
  process.exit(1);
}

const workbook = XLSX.readFile(excelPath);
const sheet = workbook.Sheets['Daftar Barang'];
const rawExcelData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const cleanNum = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  const num = Number(String(val).replace(/[^0-9.-]+/g, ''));
  return isNaN(num) ? 0 : num;
};

// ─── 4 CATEGORIES DEFINITION ────────────────────────────────────────────────
const CATEGORIES = [
  { id: 1, name: 'Kantong Plastik & Kresek', color: '#3B82F6', description: 'Kresek Asoi, Plastik PE, Plastik HD & Klip Zip' },
  { id: 2, name: 'Cup Minuman & Sedotan',    color: '#8B5CF6', description: 'Gelas Cup Oval, Flat, Slim, Tutup Cup & Sedotan' },
  { id: 3, name: 'Kotak Nasi, Mika & Thinwall', color: '#F59E0B', description: 'Mika Makanan, Thinwall Kotak/Bowl, Lunch Box & Kertas Nasi' },
  { id: 4, name: 'Bahan Curah & Sembako',    color: '#10B981', description: 'Kacang-kacangan, Ketan, Sagu & Mentega Timbangan Kiloan' }
];

function determineCategoryId(name) {
  const n = name.toLowerCase();
  if (n.includes('kacang') || n.includes('sagu') || n.includes('ketan') || n.includes('mentega')) {
    return 4; // Bahan Curah & Sembako
  }
  if (n.includes('cup') || n.includes('sedotan') || n.includes('tutup gelas') || n.includes('slim')) {
    return 2; // Cup Minuman & Sedotan
  }
  if (n.includes('mika') || n.includes('thinwall') || n.includes('mangkok') || n.includes('l.box') || 
      n.includes('kertas nasi') || n.includes('sendok') || n.includes('tusuk sate') || n.includes('paperkraft')) {
    return 3; // Kotak Nasi, Mika & Thinwall
  }
  return 1; // Kantong Plastik & Kresek
}

// Extract 74 products from Excel
const rawProducts = [];
for (let i = 2; i < rawExcelData.length; i++) {
  const r = rawExcelData[i];
  if (!r || !r[1]) continue;

  const no = r[0];
  const name = String(r[1]).trim();
  const rawIsi = r[3];
  const modalDus = cleanNum(r[5]);
  const modalPackKg = cleanNum(r[6]);
  const modalPcs = cleanNum(r[7]);
  const jualDus = cleanNum(r[8]);
  const jualPack = cleanNum(r[9]);
  const jualPcs = cleanNum(r[10]);

  rawProducts.push({ no, name, rawIsi, modalDus, modalPackKg, modalPcs, jualDus, jualPack, jualPcs });
}

console.log(`✅ Loaded ${rawProducts.length} products from Excel sheet 'Daftar Barang'`);

// Process products into finalized database schema
const processedProducts = rawProducts.map((p, index) => {
  const categoryId = determineCategoryId(p.name);
  const nameLower = p.name.toLowerCase();
  const isKgProduct = (categoryId === 4);

  let sellPerUnit = isKgProduct ? 'kg' : 'all';
  let pcsPerPack = 1;
  let packPerDus = 1;
  let kgPerKarung = 25;
  let minStock = 5;
  let minStockKg = 5;

  let purchasePrice = 0;
  let pricePcs = 0;
  let pricePack = 0;
  let priceDus = 0;
  let priceKg = 0;
  let priceKarung = 0;

  // SKU prefix
  let prefix = 'KNT';
  if (categoryId === 2) prefix = 'CUP';
  else if (categoryId === 3) prefix = 'MKA';
  else if (categoryId === 4) prefix = 'SBK';
  const sku = `${prefix}-${String(index + 1).padStart(3, '0')}`;
  const barcode = `8991001${String(index + 1).padStart(5, '0')}`;

  // Parse Isi
  if (p.rawIsi) {
    const s = String(p.rawIsi).toLowerCase().trim();
    if (s.includes('kg')) {
      const kg = cleanNum(s);
      kgPerKarung = kg > 0 ? kg : (nameLower.includes('mentega') ? 15 : 25);
    } else if (s.includes('pack')) {
      const pk = cleanNum(s);
      packPerDus = pk > 0 ? pk : 1;
    }
  }

  if (isKgProduct) {
    // ─── CURAH / TIMBANGAN (KG) ───
    if (nameLower.includes('mentega')) {
      kgPerKarung = 15;
      minStockKg = 15;
      if (nameLower.includes('simas')) {
        purchasePrice = 21600;
        priceKg = 27000;
        priceKarung = 380000; // 1 karton 15kg
      } else {
        purchasePrice = 19000;
        priceKg = 24000;
        priceKarung = 340000; // 1 karton 15kg
      }
    } else {
      kgPerKarung = 25;
      minStockKg = 10;
      if (nameLower.includes('hijau')) {
        purchasePrice = p.modalPackKg || 24500;
        priceKg = p.jualPack || 28000;
      } else if (nameLower.includes('merah')) {
        purchasePrice = p.modalPackKg || 30000;
        priceKg = p.jualPack || 34000;
      } else if (nameLower.includes('tanah')) {
        purchasePrice = 28000;
        priceKg = 32000;
      } else if (nameLower.includes('sagu')) {
        purchasePrice = p.modalPackKg || 24500;
        priceKg = p.jualPack || 28000;
      } else if (nameLower.includes('ketan putih')) {
        purchasePrice = p.modalPackKg || 19000;
        priceKg = p.jualPack || 22000;
      } else if (nameLower.includes('ketan hitam')) {
        purchasePrice = p.modalPackKg || 21500;
        priceKg = p.jualPack || 25000;
      } else {
        purchasePrice = p.modalPackKg || 20000;
        priceKg = p.jualPack || 25000;
      }
      priceKarung = Math.round((priceKg * kgPerKarung * 0.95) / 5000) * 5000;
    }
  } else {
    // ─── KEMASAN (PCS, PACK, DUS) ───
    if (nameLower.includes('pe kharisma') || nameLower.includes('hd idola')) {
      packPerDus = 25;
      pcsPerPack = 4;
      purchasePrice = p.modalPcs || Math.round((p.modalPackKg || 43000) / 4);
      pricePcs = p.jualPcs || 13000;
      pricePack = p.jualPack || 50000;
      priceDus = p.jualDus || (pricePack * packPerDus * 0.95);
      minStock = 20;
    } else if (nameLower.includes('plastik klip')) {
      packPerDus = 20;
      pcsPerPack = 10;
      purchasePrice = p.modalPcs || Math.round((p.modalPackKg || 40000) / 10);
      pricePcs = p.jualPcs || 5000;
      pricePack = p.jualPack || 50000;
      priceDus = p.jualDus || (pricePack * packPerDus * 0.95);
      minStock = 20;
    } else if (nameLower.includes('mika jumbo')) {
      packPerDus = 10;
      pcsPerPack = 50;
      purchasePrice = p.modalPcs || 1260;
      pricePcs = p.jualPcs || 2000;
      pricePack = p.jualPack || 75000;
      priceDus = p.jualDus || 720000;
      minStock = 100;
    } else if (nameLower.includes('mika tx 22')) {
      packPerDus = 4;
      pcsPerPack = 50;
      purchasePrice = p.modalPcs || 1375;
      pricePcs = p.jualPcs || 2500;
      pricePack = p.jualPack || 85000;
      priceDus = p.jualDus || 320000;
      minStock = 100;
    } else if (nameLower.includes('asoi hitam')) {
      packPerDus = 100;
      pcsPerPack = 1;
      purchasePrice = 7500;
      pricePack = 9500;
      priceDus = 900000;
      minStock = 10;
    } else if (nameLower.includes('juzz cup flat (18)')) {
      packPerDus = 40;
      pcsPerPack = 1;
      purchasePrice = 9500;
      pricePack = 13000;
      priceDus = 500000;
      minStock = 8;
    } else {
      pcsPerPack = 1;
      packPerDus = packPerDus > 1 ? packPerDus : 1;
      purchasePrice = p.modalPackKg || (p.modalDus > 0 && packPerDus > 1 ? Math.round(p.modalDus / packPerDus) : 5000);
      pricePack = p.jualPack || Math.round(purchasePrice * 1.25);
      if (p.jualDus > 0) {
        priceDus = p.jualDus;
      } else if (packPerDus > 1 && pricePack > 0) {
        priceDus = Math.round((pricePack * packPerDus * 0.95) / 1000) * 1000;
      }
      minStock = 5;
    }
  }

  return {
    name: p.name,
    sku,
    barcode,
    categoryId,
    sellPerUnit,
    purchasePrice: Math.round(purchasePrice),
    pricePcs: Math.round(pricePcs),
    pricePack: Math.round(pricePack),
    priceDus: Math.round(priceDus),
    priceKg: Math.round(priceKg),
    priceKarung: Math.round(priceKarung),
    pcsPerPack,
    packPerDus,
    kgPerKarung,
    minStock,
    minStockKg
  };
});

function getWibDateNow() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${mi}:${s}`;
}

async function seedCleanDatabase(dbPath) {
  const targetDir = path.dirname(dbPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Backup existing DB if exists
  if (fs.existsSync(dbPath)) {
    const backupPath = `${dbPath}.bak-${Date.now()}`;
    fs.copyFileSync(dbPath, backupPath);
    console.log(`📦 Backup created: ${backupPath}`);
  }

  const db = new sqlite3.Database(dbPath);
  const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

  console.log(`\n⏳ Seeding DB (Hanya Produk & Kategori): ${dbPath}`);

  // Disable FK temporarily for clean truncate
  await run("PRAGMA foreign_keys = OFF");

  // Clean all operational and master tables
  const tables = [
    'debt_payments', 'customer_debts', 'customers',
    'transaction_items', 'transactions', 'cash_movements', 'cash_shifts',
    'inventory_log', 'stocks', 'products', 'categories'
  ];
  for (const t of tables) {
    await run(`DELETE FROM ${t}`);
    await run(`DELETE FROM sqlite_sequence WHERE name = '${t}'`).catch(() => {});
  }

  // Re-enable FK
  await run("PRAGMA foreign_keys = ON");

  const nowStr = getWibDateNow();

  // 1. Insert Categories
  console.log('  ➡️ Inserting 4 master categories...');
  for (const c of CATEGORIES) {
    await run(
      `INSERT INTO categories (id, name, description, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [c.id, c.name, c.description, c.color, nowStr, nowStr]
    );
  }

  // 2. Insert Products (74 Products)
  console.log(`  ➡️ Inserting ${processedProducts.length} products (Stok = 0)...`);
  for (const p of processedProducts) {
    await run(
      `INSERT INTO products 
         (name, sku, barcode, category_id, sell_per_unit, purchase_price, 
          price_pcs, price_pack, price_dus, price_kg, price_karung,
          pcs_per_pack, pack_per_dus, kg_per_karung, min_stock, min_stock_kg, 
          is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        p.name, p.sku, p.barcode, p.categoryId, p.sellPerUnit, p.purchasePrice,
        p.pricePcs, p.pricePack, p.priceDus, p.priceKg, p.priceKarung,
        p.pcsPerPack, p.packPerDus, p.kgPerKarung, p.minStock, p.minStockKg,
        nowStr, nowStr
      ]
    );
  }

  // Close database
  await new Promise((resolve) => db.close(resolve));
  console.log(`✅ Database ${dbPath} berhasil diatur murni: 4 Kategori, 74 Produk, 0 Transaksi, 0 Shift, 0 Stok!`);
}

async function main() {
  for (const dbPath of dbTargets) {
    try {
      await seedCleanDatabase(dbPath);
    } catch (err) {
      console.error(`❌ Error seeding ${dbPath}:`, err);
    }
  }
  console.log('\n🎉 SELESAI! Database sekarang murni hanya berisi Master Produk & Kategori.');
}

main();
