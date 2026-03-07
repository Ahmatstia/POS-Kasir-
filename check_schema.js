const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve('pos-toko-bumbu.db');
const db = new sqlite3.Database(dbPath);

console.log("Checking stocks table info...");
db.all("PRAGMA table_info(stocks);", (err, rows) => {
  if (err) { console.error(err); process.exit(1); }
  console.log("STOCKS TABLE:", JSON.stringify(rows, null, 2));

  console.log("\nChecking inventory_log table info...");
  db.all("PRAGMA table_info(inventory_log);", (err, rows) => {
    if (err) { console.error(err); process.exit(1); }
    console.log("INVENTORY_LOG TABLE:", JSON.stringify(rows, null, 2));
    db.close();
  });
});
