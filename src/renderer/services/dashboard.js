// Fungsi untuk mendapatkan data dashboard
export async function getDashboardData() {
  try {
    // Hitung total penjualan hari ini
    const today = new Date();
    const startOfDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 00:00:00`;
    const endOfDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 23:59:59`;

    // Query untuk total penjualan hari ini
    const todaySales = await window.electronAPI.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM transactions 
      WHERE date(created_at, 'localtime') = date('now', 'localtime')
        AND status = 'COMPLETED'
    `);

    // Query untuk jumlah transaksi hari ini
    const todayTransactions = await window.electronAPI.query(`
      SELECT COUNT(*) as count 
      FROM transactions 
      WHERE date(created_at, 'localtime') = date('now', 'localtime')
        AND status = 'COMPLETED'
    `);

    // Query untuk total penjualan bulan ini
    const monthSales = await window.electronAPI.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM transactions 
      WHERE strftime('%Y-%m', created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')
        AND status = 'COMPLETED'
    `);

    // Query untuk produk stok menipis (dari tabel stocks)
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

    // Query untuk 5 produk terlaris bulan ini (localtime)
    const topProducts = await window.electronAPI.query(`
      SELECT 
        ti.product_id,
        ti.product_name,
        SUM(ti.quantity) as total_terjual,
        SUM(ti.subtotal) as total_omzet
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE strftime('%Y-%m', t.created_at, 'localtime') = strftime('%Y-%m', 'now', 'localtime')
        AND t.status = 'COMPLETED'
      GROUP BY ti.product_id, ti.product_name
      ORDER BY total_terjual DESC
      LIMIT 5
    `);

    // Query untuk penjualan 7 hari terakhir (Optimized single query with localtime)
    const dailySalesRaw = await window.electronAPI.query(`
      SELECT 
        date(created_at, 'localtime') as date,
        COALESCE(SUM(total_amount), 0) as total
      FROM transactions 
      WHERE date(created_at, 'localtime') >= date('now', 'localtime', '-6 days')
        AND status = 'COMPLETED'
      GROUP BY date(created_at, 'localtime')
      ORDER BY date ASC
    `);

    // Fill gaps in 7 days data if any
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().split('T')[0]);
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
      todayTransactions: todayTransactions[0].count,
      monthSales: monthSales[0].total,
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