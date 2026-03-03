/**
 * fix_db_v3.js - Standalone Fix Script
 * Adds missing created_at and updated_at columns to all tables.
 * Run: node fix_db_v3.js
 */
const sqlite3 = require("sqlite3").verbose();
const path    = require("path");
const os      = require("os");
const fs      = require("fs");

const LOG = path.join(process.cwd(), "fix_db_v3_log.txt");
fs.writeFileSync(LOG, `=== Database Fix v3 started at ${new Date().toISOString()} ===\n`);

function log(msg) {
  console.log(msg);
  fs.appendFileSync(LOG, msg + "\n");
}

// Try all common Electron userData paths
const possiblePaths = [
  path.join(os.homedir(), "AppData", "Roaming", "pos-toko-bumbu", "pos-toko-bumbu.db"),
  path.join(os.homedir(), "AppData", "Roaming", "Electron",        "pos-toko-bumbu.db"),
  path.join(os.homedir(), "AppData", "Local",   "pos-toko-bumbu", "pos-toko-bumbu.db"),
  path.join(process.cwd(), "pos-toko-bumbu.db"),
];

function run(db, sql, lbl) {
  return new Promise((res) => {
    db.run(sql, (err) => {
      if (err) {
        if (err.message.includes("duplicate column name") || err.message.includes("already exists")) {
          log(`⚠️  ${lbl} (already exists, skipped)`);
        } else {
          log(`❌ ${lbl}: ${err.message}`);
        }
      } else {
        log(`✅ ${lbl}`);
      }
      res();
    });
  });
}

async function fixDb(dbPath) {
  if (!fs.existsSync(dbPath)) {
    log(`⏩ Not found: ${dbPath}`);
    return;
  }
  log(`\n🗄️  Fixing Database: ${dbPath}`);

  const db = new sqlite3.Database(dbPath);

  await new Promise((res) => {
    db.serialize(async () => {
      // List of tables and columns to ensure
      const fixes = [
        ["categories", "created_at"],
        ["categories", "updated_at"],
        ["products", "created_at"],
        ["products", "updated_at"],
        ["stocks", "created_at"],
        ["stocks", "updated_at"],
        ["inventory_log", "created_at"],
        ["inventory_log", "updated_at"],
        ["transactions", "created_at"],
        ["transactions", "updated_at"],
        ["transaction_items", "created_at"],
        ["transaction_items", "updated_at"],
      ];

      for (const [table, col] of fixes) {
        await run(db, `ALTER TABLE ${table} ADD COLUMN ${col} DATETIME DEFAULT CURRENT_TIMESTAMP`, `ADD ${table}.${col}`);
      }

      log("\n🎉 Database Fix COMPLETE!");
      res();
    });
  });

  db.close();
}

(async () => {
  let found = false;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      await fixDb(p);
      found = true;
    }
  }
  if (!found) {
    log("\n❌ No database found in common locations.");
  }
  log(`\n=== Done at ${new Date().toISOString()} ===`);
  log(`Log saved to: ${LOG}`);
})();
