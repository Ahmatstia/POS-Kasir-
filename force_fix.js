const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dbPath = "C:\\Users\\ACER\\AppData\\Roaming\\pos-toko-bumbu\\pos-toko-bumbu.db";

if (!fs.existsSync(dbPath)) {
    console.error("❌ Database not found at:", dbPath);
    process.exit(1);
}

const db = new sqlite3.Database(dbPath);

const tables = ["categories", "products", "stocks", "transactions", "inventory_log", "transaction_items"];

db.serialize(() => {
    for (const table of tables) {
        db.run(`ALTER TABLE ${table} ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`, (err) => {
            if (err) {
                if (err.message.includes("duplicate column name")) {
                    console.log(`⚠️  ${table}.updated_at: already exists`);
                } else {
                    console.error(`❌ ${table}.updated_at:`, err.message);
                }
            } else {
                console.log(`✅ ${table}.updated_at: FIXED`);
            }
        });
        
        db.run(`ALTER TABLE ${table} ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`, (err) => {
            if (err) {
                if (err.message.includes("duplicate column name")) {
                    console.log(`⚠️  ${table}.created_at: already exists`);
                } else {
                    console.error(`❌ ${table}.created_at:`, err.message);
                }
            } else {
                console.log(`✅ ${table}.created_at: FIXED`);
            }
        });
    }
});

db.close(() => {
    console.log("\n🎉 Force migration complete!");
});
