const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');
const dbPath = path.join(process.env.APPDATA, 'POS', 'pos-toko-bumbu.db');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
    process.exit(1);
  }
});

db.all('SELECT id, name, sell_per_unit, price_kg, price_karung, kg_per_karung FROM products', [], (err, rows) => {
  if (err) {
    console.error('Query error:', err.message);
  } else {
    console.log(JSON.stringify(rows, null, 2));
  }
  db.close();
});
