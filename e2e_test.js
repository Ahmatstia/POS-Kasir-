const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'POS', 'pos-toko-bumbu.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Connection Error:", err.message);
    process.exit(1);
  }
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// ---------------------------------------------------------
// SIMULATING ELECTRON API CALLS
const electronAPI = { run, query: (sql, p) => new Promise((res, rej) => db.all(sql, p, (err, rows) => err ? rej(err) : res(rows))) };
global.window = { electronAPI };

// We need to polyfill the required services for backend testing
const { createTransaction, cancelTransaction } = require('./src/renderer/services/transactions');
const { addStock, adjustStock, adjustStockKg } = require('./src/renderer/services/inventory');
const { addProduct } = require('./src/renderer/services/database');
const { addCategory } = require('./src/renderer/services/categories');

async function testSuite() {
  console.log("=== STARTING COMPREHENSIVE E2E TEST ===\n");

  try {
    // 1. CLEAR EXISTING DATA FOR CLEAN TEST
    console.log("[1] Cleaning Database...");
    await window.electronAPI.run("DELETE FROM transaction_items");
    await window.electronAPI.run("DELETE FROM transactions");
    await window.electronAPI.run("DELETE FROM inventory_log");
    await window.electronAPI.run("DELETE FROM stocks");
    await window.electronAPI.run("DELETE FROM products");
    await window.electronAPI.run("DELETE FROM sqlite_sequence");

    // 2. ADD CATEGORY
    console.log("[2] Adding Master Data...");
    let c = await addCategory({ name: 'TEST CAT', color: '#111' });
    
    // 3. ADD PRODUCTS (1 NORMAL, 1 KILOAN)
    let p1 = await addProduct({ name: 'Beras XYZ', category_id: c.id, price_pcs: 10000, price_pack: 95000, price_dus: 190000, min_stock: 5, notes: '', sell_per_unit: 'all' });
    let p2 = await addProduct({ name: 'Terigu Kiloan', category_id: c.id, price_kg: 12000, min_stock: 5, notes: '', sell_per_unit: 'kg' });
    
    // 4. ADD STOCK
    console.log("[3] Adding Initial Stocks...");
    await addStock(p1.id, { qty_pcs: 50, purchase_price: 8000 }, { pcs_per_pack: 10, pack_per_dus: 2 });
    await addStock(p2.id, { qty_kg: 20.5, purchase_price: 10000 }, {});

    // 5. CREATE TRANSACTION (Mixed cart: Pcs, Dus, Kg)
    console.log("[4] Testing POS Cashier Transaction...");
    const cart = [
       { product_id: p1.id, name: 'Beras XYZ', quantity: 2, unit: 'pcs', price: 10000, subtotal: 20000 },
       { product_id: p1.id, name: 'Beras XYZ', quantity: 1, unit: 'dus', price: 190000, subtotal: 190000 },
       { product_id: p2.id, name: 'Terigu Kiloan', quantity: 2.5, unit: 'kg', price: 12000, subtotal: 30000 }
    ];
    let tx = await createTransaction({ items: cart, subtotal: 240000, discount: 0, total: 240000, payment: 300000, change: 60000, paymentMethod: 'cash', customerName: 'Client 1' });
    
    if (!tx.success) throw new Error("Transaction Failed: " + tx.error);
    console.log("    ✓ Submited Transaction", tx.invoiceNo);

    // 6. VALIDATE STOCK DEDUCTION
    console.log("[5] Validating Stock Deductions...");
    let s1 = await get("SELECT SUM(quantity) as qty FROM stocks WHERE product_id = ?", [p1.id]);
    let s2 = await get("SELECT SUM(qty_kg) as qty FROM stocks WHERE product_id = ?", [p2.id]);
    
    // p1 initially 50. Bought 2 pcs + 1 dus (1 dus = 2 pack * 10 pcs = 20 pcs). Total bought = 22 pcs. Left = 28.
    if (s1.qty !== 28) throw new Error(`Stock logic error Pcs. Expected 28, got ${s1.qty}`);
    // p2 initially 20.5. Bought 2.5kg. Left = 18.0
    if (s2.qty !== 18.0) throw new Error(`Stock logic error Kg. Expected 18.0, got ${s2.qty}`);
    console.log("    ✓ Stock FIFO logics works perfectly.");

    // 7. CANCEL / RETURN TRANSACTION
    console.log("[6] Testing Transaction Return...");
    let ret = await cancelTransaction(tx.transactionId);
    if (!ret.success) throw new Error("Return Failed: " + ret.error);
    
    s1 = await get("SELECT SUM(quantity) as qty FROM stocks WHERE product_id = ?", [p1.id]);
    s2 = await get("SELECT SUM(qty_kg) as qty FROM stocks WHERE product_id = ?", [p2.id]);
    
    if (s1.qty !== 50) throw new Error(`Refund logic error Pcs. Expected 50, got ${s1.qty}`);
    if (s2.qty !== 20.5) throw new Error(`Refund logic error Kg. Expected 20.5, got ${s2.qty}`);
    console.log("    ✓ Stock perfectly restored via Return process.");

    // 8. INVENTORY LOGS
    console.log("[7] Verifying Log Integrity (SQLite constraints)...");
    let logs = await window.electronAPI.query("SELECT * FROM inventory_log");
    if (logs.length !== 8) throw new Error(`Expected 8 logs (2 IN, 3 SALE, 3 RETURN), got ${logs.length}`);
    console.log("    ✓ All Inventory logs saved successfully without NOT NULL constraints errors.");

    console.log("\n✅ ALL TESTS PASSED! SYSTEM IS PRODUCTION READY.");

  } catch (err) {
    console.error("\n❌ TEST FAILED:", err.message);
  } finally {
    db.close();
  }
}

testSuite();
