const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { app } = require("electron");

console.log("dbManager.js is loaded!");

class DatabaseManager {
  constructor() {
    this.db = null;
    this.dbPath = path.join(app.getPath("userData"), "pos-toko-bumbu.db");
    console.log("Database path:", this.dbPath);
  }

  connect() {
    console.log("Connecting to database...");
    this.db = new sqlite3.Database(this.dbPath, (err) => {
      if (err) {
        console.error("❌ Database connection error:", err);
      } else {
        console.log("✅ Connected to database at:", this.dbPath);
        this.initTables();
      }
    });
    return this.db;
  }

  initTables() {
    console.log("Initializing database tables...");

    const queries = `
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        barcode TEXT UNIQUE,
        name TEXT NOT NULL,
        category_id INTEGER,
        sell_per_unit TEXT CHECK(sell_per_unit IN ('pcs', 'pack', 'kg', 'all')),
        price_pcs INTEGER DEFAULT 0,
        price_pack INTEGER DEFAULT 0,
        price_kg INTEGER DEFAULT 0,
        stock INTEGER DEFAULT 0,
        min_stock INTEGER DEFAULT 0,
        notes TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_no TEXT UNIQUE,
        transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        subtotal INTEGER NOT NULL,
        discount INTEGER DEFAULT 0,
        total_amount INTEGER NOT NULL,
        payment_amount INTEGER NOT NULL,
        change_amount INTEGER NOT NULL,
        payment_method TEXT DEFAULT 'cash',
        customer_name TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transaction_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER,
        product_id INTEGER,
        product_name TEXT,
        quantity REAL,
        unit TEXT,
        price_per_unit INTEGER,
        subtotal INTEGER,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
    `;

    this.db.exec(queries, (err) => {
      if (err) {
        console.error("❌ Error creating tables:", err);
      } else {
        console.log("✅ Database tables ready");
        this.seedInitialData();
      }
    });
  }

  seedInitialData() {
    console.log("Seeding initial data...");

    const categories = [
      "Bahan Kue",
      "Rempah-rempah",
      "Gelas & Cup",
      "Mika",
      "Thinwall",
      "Pipet",
      "Plastik",
      "Kantong Plastik",
      "Kecap",
      "Saus",
      "Bumbu Instan",
      "Kotak Makan",
      "Gula",
      "Tutup Cup",
      "Sendok",
      "Botol",
      "Lainnya",
    ];

    let count = 0;
    categories.forEach((name) => {
      this.db.run(
        "INSERT OR IGNORE INTO categories (name) VALUES (?)",
        [name],
        function (err) {
          if (!err && this.changes > 0) {
            count++;
          }
        },
      );
    });

    console.log(`✅ ${categories.length} categories inserted`);
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
}

module.exports = new DatabaseManager();
