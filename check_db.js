const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:/Users/ACER/AppData/Roaming/pos-toko-bumbu/pos-toko-bumbu.db');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  
  if (tables.length === 0) {
    console.log("No tables found.");
    process.exit(0);
  }

  const counts = {};
  let completed = 0;

  tables.forEach(table => {
    db.get(`SELECT COUNT(*) as count FROM ${table.name}`, (err, row) => {
      counts[table.name] = row ? row.count : 0;
      completed++;
      if (completed === tables.length) {
        console.log(JSON.stringify(counts, null, 2));
        db.close();
      }
    });
  });
});
