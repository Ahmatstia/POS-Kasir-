const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { app } = require("electron");

// console.log("dbManager.js is loaded!");

class DatabaseManager {
  constructor() {
    this.db = null;
    this.ready = false;
    this.dbPath = path.join(app.getPath("userData"), "pos-toko-bumbu.db");
    console.log("Database path:", this.dbPath);
  }

  // Returns a Promise that resolves when tables are ready
  connect() {
    return new Promise((resolve, reject) => {
      // console.log("Connecting to database...");
      this.db = new sqlite3.Database(this.dbPath, async (err) => {
        if (err) {
          console.error("❌ Database connection error:", err);
          reject(err);
        } else {
          console.log("✅ Connected to database at:", this.dbPath);
          this.db.run("PRAGMA foreign_keys = ON");
          try {
            await this.initTables();
            
            // Redundant check to ensure updated_at exists (critical for recent errors)
            await this._runSQL("ALTER TABLE categories ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", "FIX categories.updated_at");
            await this._runSQL("ALTER TABLE products ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", "FIX products.updated_at");
            await this._runSQL("ALTER TABLE products ADD COLUMN purchase_price INTEGER DEFAULT 0", "FIX products.purchase_price");
            await this._runSQL("ALTER TABLE stocks ADD COLUMN purchase_price INTEGER DEFAULT 0", "FIX stocks.purchase_price");
            await this._runSQL("ALTER TABLE inventory_log ADD COLUMN purchase_price INTEGER DEFAULT 0", "FIX inventory_log.purchase_price");
            await this._runSQL("ALTER TABLE stocks ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", "FIX stocks.updated_at");
            await this._runSQL("ALTER TABLE transactions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", "FIX transactions.updated_at");
            await this._runSQL("ALTER TABLE inventory_log ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", "FIX inventory_log.updated_at");
            await this._runSQL("ALTER TABLE transaction_items ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", "FIX transaction_items.updated_at");
            await this._runSQL("ALTER TABLE transaction_items ADD COLUMN cost_price INTEGER DEFAULT 0", "FIX transaction_items.cost_price");

            // EXTRA FAIL-SAFE for settings table
            await this._runSQL("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)", "EXTRA CREATE settings");
            await this._runSQL("INSERT OR IGNORE INTO settings (key, value) VALUES ('ignore_stock', '0')", "EXTRA SEED settings");
            await this._runSQL("INSERT OR IGNORE INTO settings (key, value) VALUES ('hide_cost', '0')", "EXTRA SEED hide_cost");

            this.ready = true;
            console.log("✅ Database fully ready");
            resolve();
          } catch (e) {
            console.error("❌ initTables error:", e);
            reject(e);
          }
        }
      });
    });
  }

  // Safely run a statement (no-throw for "already exists" / "duplicate column")
  _runSQL(sql, label) {
    return new Promise((resolve) => {
      this.db.run(sql, (err) => {
        if (err) {
          if (
            err.message.includes("duplicate column name") ||
            err.message.includes("already exists")
          ) {
            console.log(`⚠️  ${label}: already exists`);
          } else {
            console.error(`❌ ${label}:`, err.message);
          }
        } else {
          console.log(`✅ ${label}`);
        }
        resolve(); // never reject — keep going
      });
    });
  }

  async initTables() {
    return new Promise((resolve, reject) => {
      this.db.serialize(async () => {
        try {
          // ── CATEGORIES ──────────────────────────────────────────────────────
          await this._runSQL(`
            CREATE TABLE IF NOT EXISTS categories (
              id          INTEGER PRIMARY KEY AUTOINCREMENT,
              name        TEXT NOT NULL UNIQUE,
              description TEXT,
              color       TEXT DEFAULT '#5B8AF5',
              created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, "CREATE categories");

          // Add missing columns to existing categories table
          await this._runSQL("ALTER TABLE categories ADD COLUMN description TEXT",         "ADD categories.description");
          await this._runSQL("ALTER TABLE categories ADD COLUMN color TEXT DEFAULT '#5B8AF5'", "ADD categories.color");
          await this._runSQL("ALTER TABLE categories ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", "ADD categories.created_at");
          await this._runSQL("ALTER TABLE categories ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", "ADD categories.updated_at");

          // ── PRODUCTS ────────────────────────────────────────────────────────
          await this._runSQL(`
            CREATE TABLE IF NOT EXISTS products (
              id            INTEGER PRIMARY KEY AUTOINCREMENT,
              barcode       TEXT,
              sku           TEXT,
              name          TEXT NOT NULL,
              category_id   INTEGER,
              sell_per_unit TEXT DEFAULT 'all',
              price_pcs     INTEGER DEFAULT 0,
              price_pack    INTEGER DEFAULT 0,
              price_dus     INTEGER DEFAULT 0,
              price_kg      INTEGER DEFAULT 0,
              pcs_per_pack  INTEGER DEFAULT 1,
              pack_per_dus  INTEGER DEFAULT 1,
              min_stock     INTEGER DEFAULT 0,
              notes         TEXT,
              is_active     BOOLEAN DEFAULT 1,
              purchase_price INTEGER DEFAULT 0,
              price_karung  INTEGER DEFAULT 0,
              kg_per_karung REAL DEFAULT 25,
              created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (category_id) REFERENCES categories(id)
            )`, "CREATE products");

          // Add columns if missing (existing DB upgrade)
          await this._runSQL("ALTER TABLE products ADD COLUMN price_dus    INTEGER DEFAULT 0",    "ADD products.price_dus");
          await this._runSQL("ALTER TABLE products ADD COLUMN pcs_per_pack INTEGER DEFAULT 1",    "ADD products.pcs_per_pack");
          await this._runSQL("ALTER TABLE products ADD COLUMN pack_per_dus INTEGER DEFAULT 1",    "ADD products.pack_per_dus");
          await this._runSQL("ALTER TABLE products ADD COLUMN sell_per_unit TEXT    DEFAULT 'all'", "ADD products.sell_per_unit");
          await this._runSQL("ALTER TABLE products ADD COLUMN is_active    BOOLEAN DEFAULT 1",    "ADD products.is_active");
          await this._runSQL("ALTER TABLE products ADD COLUMN barcode      TEXT",                 "ADD products.barcode");
          await this._runSQL("ALTER TABLE products ADD COLUMN sku          TEXT",                 "ADD products.sku");
          await this._runSQL("ALTER TABLE products ADD COLUMN min_stock    INTEGER DEFAULT 0",    "ADD products.min_stock");
          await this._runSQL("ALTER TABLE products ADD COLUMN created_at   DATETIME DEFAULT CURRENT_TIMESTAMP", "ADD products.created_at");
          await this._runSQL("ALTER TABLE products ADD COLUMN updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP", "ADD products.updated_at");
          await this._runSQL("ALTER TABLE products ADD COLUMN min_stock_kg REAL DEFAULT 0", "ADD products.min_stock_kg");
          await this._runSQL("ALTER TABLE products ADD COLUMN purchase_price INTEGER DEFAULT 0 CHECK(purchase_price >= 0)", "ADD products.purchase_price");
          await this._runSQL("ALTER TABLE products ADD COLUMN price_karung INTEGER DEFAULT 0 CHECK(price_karung >= 0)", "ADD products.price_karung");
          await this._runSQL("ALTER TABLE products ADD COLUMN kg_per_karung REAL DEFAULT 25 CHECK(kg_per_karung > 0)", "ADD products.kg_per_karung");

          // ── STOCKS ──────────────────────────────────────────────────────────
          await this._runSQL(`
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
            )`, "CREATE stocks");
          
          await this._runSQL("ALTER TABLE stocks ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", "ADD stocks.created_at");
          await this._runSQL("ALTER TABLE stocks ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", "ADD stocks.updated_at");
          await this._runSQL("ALTER TABLE stocks ADD COLUMN qty_kg REAL DEFAULT 0 CHECK(qty_kg >= 0)", "ADD stocks.qty_kg");

          // ── INVENTORY LOG ────────────────────────────────────────────────────
          await this._runSQL(`
            CREATE TABLE IF NOT EXISTS inventory_log (
              id             INTEGER PRIMARY KEY AUTOINCREMENT,
              product_id     INTEGER NOT NULL,
              stock_id       INTEGER,
              type           TEXT NOT NULL CHECK(type IN ('IN','OUT','SALE','ADJUSTMENT','EXPIRED','RETURN')),
              quantity_input REAL NOT NULL,
              unit_input     TEXT,
              quantity_pcs   INTEGER NOT NULL,
              stock_before   REAL,
              stock_after    REAL,
              purchase_price INTEGER DEFAULT 0,
              selling_price  INTEGER DEFAULT 0,
              batch_code     TEXT,
              expiry_date    DATE,
              reference_id   TEXT,
              notes          TEXT,
              created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (product_id) REFERENCES products(id),
              FOREIGN KEY (stock_id)   REFERENCES stocks(id)
            )`, "CREATE inventory_log");
          
          await this._runSQL("ALTER TABLE inventory_log ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", "ADD inventory_log.created_at");
          await this._runSQL("ALTER TABLE inventory_log ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", "ADD inventory_log.updated_at");
          await this._runSQL("ALTER TABLE inventory_log ADD COLUMN quantity_kg REAL DEFAULT 0", "ADD inventory_log.quantity_kg");

          // ── ACTIVITY LOGS (AUDIT TRAIL) ──────────────────────────────────────
          await this._runSQL(`
            CREATE TABLE IF NOT EXISTS activity_logs (
              id          INTEGER PRIMARY KEY AUTOINCREMENT,
              action      TEXT NOT NULL,
              module      TEXT,
              details     TEXT,
              user        TEXT DEFAULT 'Admin',
              created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, "CREATE activity_logs");

          // ── TRANSACTIONS ─────────────────────────────────────────────────────
          await this._runSQL(`
            CREATE TABLE IF NOT EXISTS transactions (
              id               INTEGER PRIMARY KEY AUTOINCREMENT,
              invoice_no       TEXT UNIQUE,
              transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
              subtotal         INTEGER NOT NULL,
              discount         INTEGER DEFAULT 0,
              total_amount     INTEGER NOT NULL,
              payment_amount   INTEGER NOT NULL,
              change_amount    INTEGER NOT NULL,
              payment_method   TEXT DEFAULT 'cash',
              customer_name    TEXT,
              notes            TEXT,
              status           TEXT DEFAULT 'COMPLETED' CHECK(status IN ('COMPLETED','CANCELLED','RETURNED')),
              created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, "CREATE transactions");

          await this._runSQL("ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'COMPLETED'",     "ADD transactions.status");
          await this._runSQL("ALTER TABLE transactions ADD COLUMN discount INTEGER DEFAULT 0",           "ADD transactions.discount");
          await this._runSQL("ALTER TABLE transactions ADD COLUMN invoice_no TEXT",                     "ADD transactions.invoice_no");
          await this._runSQL("ALTER TABLE transactions ADD COLUMN customer_name TEXT",                  "ADD transactions.customer_name");
          await this._runSQL("ALTER TABLE transactions ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", "ADD transactions.created_at");
          await this._runSQL("ALTER TABLE transactions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", "ADD transactions.updated_at");

          // ── TRANSACTION ITEMS ────────────────────────────────────────────────
          await this._runSQL(`
            CREATE TABLE IF NOT EXISTS transaction_items (
              id             INTEGER PRIMARY KEY AUTOINCREMENT,
              transaction_id INTEGER NOT NULL,
              product_id     INTEGER,
              stock_id       INTEGER,
              product_name   TEXT,
              quantity       REAL,
              unit           TEXT,
              price_per_unit INTEGER,
              subtotal       INTEGER,
              cost_price     INTEGER DEFAULT 0,
              created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (transaction_id) REFERENCES transactions(id),
              FOREIGN KEY (product_id)     REFERENCES products(id)
            )`, "CREATE transaction_items");

          await this._runSQL("ALTER TABLE transaction_items ADD COLUMN stock_id INTEGER", "ADD transaction_items.stock_id");
          await this._runSQL("ALTER TABLE transaction_items ADD COLUMN cost_price INTEGER DEFAULT 0", "ADD transaction_items.cost_price");
          await this._runSQL("ALTER TABLE transaction_items ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", "ADD transaction_items.created_at");
          await this._runSQL("ALTER TABLE transaction_items ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", "ADD transaction_items.updated_at");

          // ── SETTINGS ─────────────────────────────────────────────────────────
          await this._runSQL(`
            CREATE TABLE IF NOT EXISTS settings (
              key TEXT PRIMARY KEY,
              value TEXT
            )`, "CREATE settings");
          
          await this._runSQL("INSERT OR IGNORE INTO settings (key, value) VALUES ('ignore_stock', '0')", "SEED settings.ignore_stock");
          await this._runSQL("INSERT OR IGNORE INTO settings (key, value) VALUES ('hide_cost', '0')", "SEED settings.hide_cost");

          // EXTRA FAIL-SAFE for settings table
          await this._runSQL("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)", "EXTRA CREATE settings");
          await this._runSQL("INSERT OR IGNORE INTO settings (key, value) VALUES ('ignore_stock', '0')", "EXTRA SEED ignore_stock");
          await this._runSQL("INSERT OR IGNORE INTO settings (key, value) VALUES ('hide_cost', '0')", "EXTRA SEED hide_cost");

          // ── INDEXES ──────────────────────────────────────────────────────────
          await this._runSQL("CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)", "INDEX transactions.created_at");
          await this._runSQL("CREATE INDEX IF NOT EXISTS idx_inventory_log_ref_id ON inventory_log(reference_id)", "INDEX inventory_log.reference_id");
          await this._runSQL("CREATE INDEX IF NOT EXISTS idx_stocks_product_active ON stocks(product_id, is_active)", "INDEX stocks.product_active");
          await this._runSQL("CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id)", "INDEX transaction_items.transaction_id");

          // ── ENSURE DATA CONSISTENCY ──────────────────────────────────────────
          await this._runSQL("UPDATE transactions SET status = 'COMPLETED' WHERE status IS NULL", "FIX transactions.status");
          await this._runSQL("UPDATE transactions SET created_at = transaction_date WHERE created_at IS NULL AND transaction_date IS NOT NULL", "FIX transactions.created_at");
          await this._runSQL("UPDATE transaction_items SET cost_price = 0 WHERE cost_price IS NULL", "FIX transaction_items.cost_price");
          await this._runSQL("UPDATE transaction_items SET created_at = (SELECT created_at FROM transactions WHERE transactions.id = transaction_items.transaction_id) WHERE created_at IS NULL", "FIX transaction_items.created_at");

          // ── MIGRATE OLD STOCK → stocks table ─────────────────────────────────
          await this.migrateStockData();

          // ── SEED CATEGORIES ──────────────────────────────────────────────────
          await this.seedCategories();

          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  async migrateStockData() {
    // Check if products table has old 'stock' column
    const cols = await this.query("PRAGMA table_info(products)");
    const hasStockCol = cols.some(c => c.name === "stock");
    if (!hasStockCol) return;

    const products = await this.query("SELECT id, stock FROM products WHERE stock > 0");
    if (!products.length) return;

    console.log(`🔄 Migrating ${products.length} products' stock to stocks table...`);
    for (const p of products) {
      const existing = await this.query("SELECT id FROM stocks WHERE product_id = ?", [p.id]);
      if (existing.length === 0) {
        await this.run(
          "INSERT INTO stocks (product_id, batch_code, quantity, notes) VALUES (?, 'MIGRASI-AWAL', ?, 'Stok sebelum v2')",
          [p.id, p.stock]
        );
        await this.run(
          `INSERT INTO inventory_log (product_id, type, quantity_input, unit_input, quantity_pcs, stock_before, stock_after, notes)
           VALUES (?, 'IN', ?, 'pcs', ?, 0, ?, 'Migrasi stok awal v2')`,
          [p.id, p.stock, p.stock, p.stock]
        );
        console.log(`  ✅ Product ${p.id}: ${p.stock} pcs migrated`);
      }
    }
    console.log("✅ Stock migration complete");
  }

  async seedCategories() {
    // Check if categories table already has data
    const existing = await this.query("SELECT COUNT(*) as count FROM categories");
    if (existing[0].count > 0) {
      console.log("ℹ️ Categories already exist, skipping default seeding.");
      return;
    }

    const defaults = [
      ['Bumbu Instan', '#F5A623'], ['Bahan Kue', '#A78BFA'], ['Rempah-rempah', '#34C98B'],
      ['Gelas & Cup', '#5B8AF5'], ['Mika', '#E85858'], ['Thinwall', '#06B6D4'],
      ['Plastik', '#9998A3'],     ['Kantong Plastik', '#4B5563'], ['Kecap', '#F97316'],
      ['Saus', '#EF4444'],        ['Kotak Makan', '#3B82F6'],     ['Gula', '#FBBF24'],
      ['Sendok', '#6366F1'],      ['Botol', '#0EA5E9'],           ['Lainnya', '#5C5C66'],
    ];
    // FIX: Use parameterized queries to prevent SQL injection
    for (const [name, color] of defaults) {
      await this.run(
        "INSERT OR IGNORE INTO categories (name, color) VALUES (?, ?)",
        [name, color]
      );
      // Update color if it's missing (failsafe), also parameterized
      await this.run(
        "UPDATE categories SET color = ? WHERE name = ? AND (color IS NULL OR color = '')",
        [color, name]
      );
    }
    console.log("✅ Default categories seeded.");
  }

  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }
      this.db.close((err) => {
        if (err) {
          console.error("❌ Error closing database:", err);
          reject(err);
        } else {
          console.log("✅ Database connection closed");
          this.db = null;
          this.ready = false;
          resolve();
        }
      });
    });
  }

  checkpoint() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }
      // Checkpoint flushes WAL to the main .db file
      this.db.run("PRAGMA wal_checkpoint(FULL)", (err) => {
        if (err) {
          console.error("❌ Checkpoint failed:", err);
          reject(err);
        } else {
          console.log("✅ Database checkpoint complete (flushed to disk)");
          resolve();
        }
      });
    });
  }
}

module.exports = new DatabaseManager();
