const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const src = path.join(process.env.APPDATA, 'POS', 'pos-toko-bumbu.db');
const dest = path.join(__dirname, 'temp.db');

try {
  fs.copyFileSync(src, dest);
  const db = new sqlite3.Database(dest, sqlite3.OPEN_READONLY, (err) => {
    if (err) return console.error(err);
    db.all('SELECT id, name, sell_per_unit, price_kg, price_karung, kg_per_karung FROM products', [], (err, rows) => {
      console.log(JSON.stringify(rows, null, 2));
      db.close();
    });
  });
} catch (e) {
  console.error(e);
}
