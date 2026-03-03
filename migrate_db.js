/**
 * migrate_db.js - v2 Migration Script
 * Adds new tables and columns to the existing POS database.
 * Run: node migrate_db.js
 */
const sqlite3 = require("sqlite3").verbose();
const path    = require("path");
const os      = require("os");
const fs      = require("fs");

const LOG = path.join(process.cwd(), "migration_v2_log.txt");
fs.writeFileSync(LOG, `=== Migration v2 started at ${new Date().toISOString()} ===\n`);

function log(msg) {
  console.log(msg);
  fs.appendFileSync(LOG, msg + "\n");
}

// Try all common Electron userData paths
const possiblePaths = [
  path.join(os.homedir(), "AppData", "Roaming", "pos-toko-bumbu", "pos-toko-bumbu.db"),
  path.join(os.homedir(), "AppData", "Roaming", "Electron",        "pos-toko-bumbu.db"),
  path.join(os.homedir(), "AppData", "Local",   "pos-toko-bumbu", "pos-toko-bumbu.db"),
];

function run(db, sql, lbl) {
  return new Promise((res) => {
    db.run(sql, (err) => {
      if (err) {
        if (err.message.includes("duplicate column name") || err.message.includes("already exists")) {
          log(`⚠️  ${lbl} (already exists, skipped)`);
        } else {
          log(`❌ ${lbl}: ${err.message}`);
        }
      } else {
        log(`✅ ${lbl}`);
      }
      res();
    });
  });
}

function query(db, sql) {
  return new Promise((res, rej) => {
    db.all(sql, [], (err, rows) => err ? rej(err) : res(rows));
  });
}

async function migrateDb(dbPath) {
  if (!fs.existsSync(dbPath)) {
    log(`⏩ Not found: ${dbPath}`);
    return;
  }
  log(`\n🗄️  Migrating: ${dbPath}`);

  const db = new sqlite3.Database(dbPath);

  await new Promise((res) => {
    db.serialize(async () => {
      // 1. Add new columns to categories
      await run(db, "ALTER TABLE categories ADD COLUMN description TEXT", "categories.description");
      await run(db, "ALTER TABLE categories ADD COLUMN color TEXT DEFAULT '#5B8AF5'", "categories.color");

      // 2. Add new columns to products
      await run(db, "ALTER TABLE products ADD COLUMN price_dus INTEGER DEFAULT 0",    "products.price_dus");
      await run(db, "ALTER TABLE products ADD COLUMN pcs_per_pack INTEGER DEFAULT 1", "products.pcs_per_pack");
      await run(db, "ALTER TABLE products ADD COLUMN pack_per_dus INTEGER DEFAULT 1", "products.pack_per_dus");
      await run(db, "ALTER TABLE products ADD COLUMN sell_per_unit TEXT DEFAULT 'all'", "products.sell_per_unit");
      await run(db, "ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT 1",   "products.is_active");
      await run(db, "ALTER TABLE products ADD COLUMN barcode TEXT",                  "products.barcode");
      await run(db, "ALTER TABLE products ADD COLUMN sku TEXT",                      "products.sku");

      // 3. Create stocks table
      await run(db, `
        CREATE TABLE IF NOT EXISTS stocks (
          id             INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id     INTEGER NOT NULL,
          batch_code     TEXT,
          quantity       INTEGER DEFAULT 0,
          purchase_price INTEGER DEFAULT 0,
          expiry_date    DATE,
          is_active      BOOLEAN DEFAULT 1,
          notes          TEXT,
          created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id)
        )
      `, "CREATE TABLE stocks");

      // 4. Create inventory_log table
      await run(db, `
        CREATE TABLE IF NOT EXISTS inventory_log (
          id             INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id     INTEGER NOT NULL,
          stock_id       INTEGER,
          type           TEXT NOT NULL CHECK(type IN ('IN','OUT','SALE','ADJUSTMENT','EXPIRED','RETURN')),
          quantity_input INTEGER NOT NULL,
          unit_input     TEXT,
          quantity_pcs   INTEGER NOT NULL,
          stock_before   INTEGER,
          stock_after    INTEGER,
          purchase_price INTEGER DEFAULT 0,
          selling_price  INTEGER DEFAULT 0,
          batch_code     TEXT,
          expiry_date    DATE,
          reference_id   TEXT,
          notes          TEXT,
          created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id),
          FOREIGN KEY (stock_id)   REFERENCES stocks(id)
        )
      `, "CREATE TABLE inventory_log");

      // 5. Add stock_id to transaction_items if needed
      await run(db, "ALTER TABLE transaction_items ADD COLUMN stock_id INTEGER", "transaction_items.stock_id");

      // 6. Migrate existing stock from products.stock column → stocks table
      try {
        const cols = await query(db, "PRAGMA table_info(products)");
        const hasStock = cols.some(c => c.name === "stock");
        if (hasStock) {
          const products = await query(db, "SELECT id, stock FROM products WHERE stock > 0");
          log(`📦 Migrating ${products.length} products with stock > 0...`);
          for (const p of products) {
            const existing = await query(db, `SELECT id FROM stocks WHERE product_id = ${p.id}`);
            if (existing.length === 0) {
              await new Promise((r) => {
                db.run(
                  "INSERT INTO stocks (product_id, batch_code, quantity, notes) VALUES (?, 'MIGRASI-AWAL', ?, 'Stok sebelum v2')",
                  [p.id, p.stock],
                  (err) => {
                    if (!err) log(`   ✅ Product ${p.id}: ${p.stock} pcs → stocks`);
                    else      log(`   ❌ Product ${p.id}: ${err.message}`);
                    r();
                  }
                );
              });
            } else {
              log(`   ⚠️  Product ${p.id}: already migrated, skipped`);
            }
          }
        } else {
          log("ℹ️  products.stock column not found - nothing to migrate");
        }
      } catch (e) {
        log(`❌ Migration error: ${e.message}`);
      }

      // 7. Seed default category colors
      const catColors = {
        'Bumbu Instan':    '#F5A623',
        'Bahan Kue':       '#A78BFA',
        'Rempah-rempah':   '#34C98B',
        'Gelas & Cup':     '#5B8AF5',
        'Mika':            '#E85858',
        'Thinwall':        '#34C98B',
        'Plastik':         '#9998A3',
        'Kantong Plastik': '#9998A3',
        'Kecap':           '#F5A623',
        'Saus':            '#E85858',
        'Kotak Makan':     '#5B8AF5',
        'Gula':            '#F5A623',
        'Sendok':          '#9998A3',
        'Botol':           '#5B8AF5',
        'Lainnya':         '#5C5C66',
      };
      for (const [name, color] of Object.entries(catColors)) {
        await new Promise(r => {
          db.run("UPDATE categories SET color = ? WHERE name = ? AND (color IS NULL OR color = '')", [color, name], r);
        });
      }
      log("✅ Category colors updated");

      log("\n🎉 Migration v2 COMPLETE!");
      res();
    });
  });

  db.close();
}

(async () => {
  let migrated = false;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      await migrateDb(p);
      migrated = true;
    }
  }
  if (!migrated) {
    log("\n❌ No database found. Run the app first to create it.");
  }
  log(`\n=== Done at ${new Date().toISOString()} ===`);
  log(`Log saved to: ${LOG}`);
})();
