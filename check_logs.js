const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve('pos-toko-bumbu.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT il.*, p.name FROM inventory_log il JOIN products p ON p.id = il.product_id WHERE il.type = 'SALE' ORDER BY il.created_at DESC LIMIT 10", (err, rows) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(JSON.stringify(rows, null, 2));
  db.close();
});
