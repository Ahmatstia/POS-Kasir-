const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

// We use the same DB path pattern as main.js
// If running standalone, we need to pass the appData path or use a hardcoded fallback for dev
const dbPath = path.join(__dirname, '..', '..', 'database.sqlite'); 
console.log('Connecting to database at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to db:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database.');
});

db.serialize(() => {
  console.log('Running Kg stock migrations...');

  // Helper macro
  const addColumn = (table, col, def) => {
    return new Promise((resolve) => {
      db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`, (err) => {
        if (err) {
          if (err.message.includes('duplicate column name')) {
            console.log(`[OK] Column ${table}.${col} already exists.`);
            resolve();
          } else {
            console.error(`[ERROR] Failed to add ${table}.${col}:`, err.message);
            resolve(); // continue anyway
          }
        } else {
          console.log(`[SUCCESS] Added ${table}.${col}`);
          resolve();
        }
      });
    });
  };

  const runMigrations = async () => {
    // 1. Min stock kg in products
    await addColumn('products', 'min_stock_kg', 'REAL DEFAULT 0');

    // 2. Qty kg in stocks Table
    await addColumn('stocks', 'qty_kg', 'REAL DEFAULT 0');

    // 3. Qty kg in inventory_log Table
    await addColumn('inventory_log', 'quantity_kg', 'REAL DEFAULT 0');
    
    console.log('Migrations finished.');
    
    db.close((err) => {
      if (err) console.error('Error closing DB:', err.message);
      else console.log('Database connection closed.');
    });
  };

  runMigrations();
});
