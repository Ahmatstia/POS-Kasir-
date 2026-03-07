// Fungsi untuk mendapatkan data dashboard
export async function getDashboardData() {
  try {
    // Hitung tanggal lokal (WIB) sebagai string untuk dipakai di query
    const today = new Date();
    const y  = today.getFullYear();
    const mo = String(today.getMonth() + 1).padStart(2, '0');
    const d  = String(today.getDate()).padStart(2, '0');
    const todayStr   = `${y}-${mo}-${d}`;          // 'YYYY-MM-DD'
    const yearMonStr = `${y}-${mo}`;               // 'YYYY-MM'

    // Tanggal 7 hari lalu
    const d7 = new Date(today);
    d7.setDate(today.getDate() - 6);
    const d7y  = d7.getFullYear();
    const d7mo = String(d7.getMonth() + 1).padStart(2, '0');
    const d7d  = String(d7.getDate()).padStart(2, '0');
    const sevenDaysAgo = `${d7y}-${d7mo}-${d7d}`;

    // Query total penjualan hari ini
    const todaySales = await window.electronAPI.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM transactions 
      WHERE date(created_at) = ?
        AND status = 'COMPLETED'
    `, [todayStr]);

    // Query jumlah transaksi hari ini
    const todayTransactions = await window.electronAPI.query(`
      SELECT COUNT(*) as count 
      FROM transactions 
      WHERE date(created_at) = ?
        AND status = 'COMPLETED'
    `, [todayStr]);

    // Query total penjualan bulan ini
    const monthSales = await window.electronAPI.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM transactions 
      WHERE strftime('%Y-%m', created_at) = ?
        AND status = 'COMPLETED'
    `, [yearMonStr]);

    // Query profit hari ini
    // Kita sudah punya todaySales[0].total, jadi hanya butuh hari_ini_cost
    const todayCostRaw = await window.electronAPI.query(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN il.quantity_kg > 0 THEN il.quantity_kg * COALESCE(NULLIF(il.purchase_price, 0), p.purchase_price, 0)
          ELSE il.quantity_pcs * COALESCE(NULLIF(il.purchase_price, 0), p.purchase_price, 0)
        END
      ), 0) as total_cost
      FROM inventory_log il
      JOIN transactions t ON t.invoice_no = il.reference_id
      LEFT JOIN products p ON p.id = il.product_id
      WHERE il.type = 'SALE' 
        AND t.status = 'COMPLETED'
        AND date(t.created_at) = ?
    `, [todayStr]);

    // Query profit bulan ini
    // Kita sudah punya monthSales[0].total, jadi hanya butuh bulan_ini_cost
    const monthCostRaw = await window.electronAPI.query(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN il.quantity_kg > 0 THEN il.quantity_kg * COALESCE(NULLIF(il.purchase_price, 0), p.purchase_price, 0)
          ELSE il.quantity_pcs * COALESCE(NULLIF(il.purchase_price, 0), p.purchase_price, 0)
        END
      ), 0) as total_cost
      FROM inventory_log il
      JOIN transactions t ON t.invoice_no = il.reference_id
      LEFT JOIN products p ON p.id = il.product_id
      WHERE il.type = 'SALE' 
        AND t.status = 'COMPLETED'
        AND strftime('%Y-%m', t.created_at) = ?
    `, [yearMonStr]);

    // Query produk stok menipis
    const lowStock = await window.electronAPI.query(`
      SELECT p.id, p.name, p.min_stock, p.min_stock_kg, p.sell_per_unit,
             COALESCE(SUM(s.quantity), 0) as total_stock,
             COALESCE(SUM(s.qty_kg), 0) as total_stock_kg
      FROM products p
      LEFT JOIN stocks s ON s.product_id = p.id AND s.is_active = 1
      WHERE p.is_active = 1
      GROUP BY p.id
      HAVING 
        (p.sell_per_unit != 'kg' AND p.min_stock > 0 AND total_stock <= p.min_stock)
        OR (p.sell_per_unit = 'kg' AND p.min_stock_kg > 0 AND total_stock_kg <= p.min_stock_kg)
      ORDER BY 
        CASE WHEN p.sell_per_unit = 'kg' THEN total_stock_kg ELSE total_stock END ASC
      LIMIT 10
    `);

    // Query 5 produk terlaris bulan ini
    const topProducts = await window.electronAPI.query(`
      SELECT 
        ti.product_id,
        ti.product_name,
        SUM(ti.quantity) as total_terjual,
        SUM(ti.subtotal) as total_omzet
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE strftime('%Y-%m', t.created_at) = ?
        AND t.status = 'COMPLETED'
      GROUP BY ti.product_id, ti.product_name
      ORDER BY total_terjual DESC
      LIMIT 5
    `, [yearMonStr]);

    // Query penjualan 7 hari terakhir
    const dailySalesRaw = await window.electronAPI.query(`
      SELECT 
        date(created_at) as date,
        COALESCE(SUM(total_amount), 0) as total
      FROM transactions 
      WHERE date(created_at) >= ?
        AND status = 'COMPLETED'
      GROUP BY date(created_at)
      ORDER BY date ASC
    `, [sevenDaysAgo]);

    // Fill gaps in 7 days data if any
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      // Use local date format YYYY-MM-DD
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      last7Days.push(dateStr);
    }

    const dailySales = last7Days.map(dateStr => {
      const match = dailySalesRaw.find(r => r.date === dateStr);
      return { date: dateStr, total: match ? match.total : 0 };
    });

    // Query untuk total produk
    const totalProducts = await window.electronAPI.query(`
      SELECT COUNT(*) as count FROM products WHERE is_active = 1
    `);

    // Query untuk total kategori
    const totalCategories = await window.electronAPI.query(`
      SELECT COUNT(*) as count FROM categories
    `);

    return {
      todaySales: todaySales[0].total,
      todayProfit: todaySales[0].total - todayCostRaw[0].total_cost,
      todayTransactions: todayTransactions[0].count,
      monthSales: monthSales[0].total,
      monthProfit: monthSales[0].total - monthCostRaw[0].total_cost,
      lowStock: lowStock,
      topProducts: topProducts,
      dailySales: dailySales,
      totalProducts: totalProducts[0].count,
      totalCategories: totalCategories[0].count
    };
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    return {
      todaySales: 0,
      todayTransactions: 0,
      monthSales: 0,
      lowStock: [],
      topProducts: [],
      dailySales: [],
      totalProducts: 0,
      totalCategories: 0
    };
  }
}