const sqlite3 = require('sqlite3');
const dbPath = 'C:\\Users\\ACER\\AppData\\Roaming\\POS\\pos-toko-bumbu.db';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run('DELETE FROM transaction_items');
  db.run('DELETE FROM transactions');
  db.run('DELETE FROM inventory_log');
  db.run('DELETE FROM stocks');
  db.run('DELETE FROM products');
  db.run("DELETE FROM sqlite_sequence WHERE name IN ('products', 'stocks', 'inventory_log', 'transactions', 'transaction_items')");
  console.log("Database cleared for fresh import.");
});
