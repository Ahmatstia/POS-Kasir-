const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const os = require("os");
const fs = require("fs");

const logFile = path.join(process.cwd(), "migration_log.txt");
function log(msg) {
  console.log(msg);
  fs.appendFileSync(logFile, msg + "\n");
}

fs.writeFileSync(logFile, `Migration started at ${new Date().toISOString()}\n`);

const possiblePaths = [
  path.join(os.homedir(), "AppData", "Roaming", "pos-toko-bumbu", "pos-toko-bumbu.db"),
  path.join(os.homedir(), "AppData", "Roaming", "Electron", "pos-toko-bumbu.db"),
  path.join(os.homedir(), "AppData", "Local", "pos-toko-bumbu", "pos-toko-bumbu.db")
];

function migrate(dbPath) {
  if (!fs.existsSync(dbPath)) {
    log(`❌ DB not found at: ${dbPath}`);
    return;
  }
  log(`✅ Found DB at: ${dbPath}. Migrating...`);

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      log(`❌ Connection error for ${dbPath}: ${err.message}`);
      return;
    }
    
    const columnsToAdd = [
      "ALTER TABLE products ADD COLUMN price_dus INTEGER DEFAULT 0",
      "ALTER TABLE products ADD COLUMN pcs_per_pack INTEGER DEFAULT 1",
      "ALTER TABLE products ADD COLUMN pack_per_dus INTEGER DEFAULT 1"
    ];

    db.serialize(() => {
      columnsToAdd.forEach((sql) => {
        db.run(sql, (err) => {
          if (err) {
            if (err.message.includes("duplicate column name")) {
              log(`⚠️ Column already exists in ${dbPath}`);
            } else {
              log(`❌ Error in ${dbPath}: ${sql} -> ${err.message}`);
            }
          } else {
            log(`✅ Success in ${dbPath}: ${sql}`);
          }
        });
      });
    });

    db.close();
  });
}

possiblePaths.forEach(migrate);
setTimeout(() => {
  log("Migration process finished check.");
}, 5000);
