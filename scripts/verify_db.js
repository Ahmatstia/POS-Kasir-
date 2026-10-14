const sqlite3 = require('sqlite3').verbose();
const dbPath = 'C:/Users/ACER/AppData/Roaming/POS/pos-toko-bumbu.db';
const db = new sqlite3.Database(dbPath);

const tables = [
  'categories', 'products', 'stocks', 'inventory_log',
  'customers', 'customer_debts', 'debt_payments',
  'cash_shifts', 'cash_movements', 'transactions', 'transaction_items'
];

async function verify() {
  console.log('=== VERIFYING DATABASE:', dbPath, '===');

  for (const t of tables) {
    const row = await new Promise(res => db.get('SELECT COUNT(*) as c FROM ' + t, (_, r) => res(r)));
    console.log(t.padEnd(20), ':', row ? row.c : 0, 'rows');
  }

  console.log('\n--- CATEGORIES BREAKDOWN ---');
  const cats = await new Promise(res => db.all(`
    SELECT c.id, c.name, c.color, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id
  `, (_, r) => res(r)));
  cats.forEach(c => console.log(`[${c.id}] ${c.name} (${c.color}): ${c.product_count} produk`));

  console.log('\n--- SAMPLE KEMASAN PRODUCTS ---');
  const prods = await new Promise(res => db.all(`
    SELECT id, name, sku, sell_per_unit, purchase_price, price_pcs, price_pack, price_dus, pcs_per_pack, pack_per_dus
    FROM products
    WHERE sell_per_unit != 'kg'
    LIMIT 4
  `, (_, r) => res(r)));
  console.log(prods);

  console.log('\n--- SAMPLE CURAH (KG) PRODUCTS ---');
  const curah = await new Promise(res => db.all(`
    SELECT id, name, sku, sell_per_unit, purchase_price, price_kg, price_karung, kg_per_karung
    FROM products
    WHERE sell_per_unit = 'kg'
    LIMIT 4
  `, (_, r) => res(r)));
  console.log(curah);

  console.log('\n--- SHIFTS ---');
  const shifts = await new Promise(res => db.all(`
    SELECT id, cashier_name, status, starting_cash, cash_sales, non_cash_sales, expected_cash
    FROM cash_shifts
  `, (_, r) => res(r)));
  console.log(shifts);

  console.log('\n--- CUSTOMER DEBTS (KASBON) ---');
  const debts = await new Promise(res => db.all(`
    SELECT cd.id, c.name as customer_name, cd.invoice_no, cd.total_debt, cd.remaining_debt, cd.status
    FROM customer_debts cd
    JOIN customers c ON cd.customer_id = c.id
  `, (_, r) => res(r)));
  if (!debts || debts.length === 0) {
    console.log('✅ Bersih / Tidak ada data kasbon (0 data)');
  } else {
    console.log(debts);
  }

  db.close();
}

verify();
