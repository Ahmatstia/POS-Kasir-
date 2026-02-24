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
      WHERE created_at BETWEEN ? AND ?
    `, [startOfDay, endOfDay]);

    // Query untuk jumlah transaksi hari ini
    const todayTransactions = await window.electronAPI.query(`
      SELECT COUNT(*) as count 
      FROM transactions 
      WHERE created_at BETWEEN ? AND ?
    `, [startOfDay, endOfDay]);

    // Query untuk total penjualan bulan ini
    const startOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;
    const monthSales = await window.electronAPI.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM transactions 
      WHERE created_at >= ?
    `, [startOfMonth]);

    // Query untuk produk stok menipis 
    const lowStock = await window.electronAPI.query(`
  SELECT * FROM products 
  WHERE stock <= min_stock AND min_stock > 0
  ORDER BY stock ASC
  LIMIT 10
`);

    // Query untuk 5 produk terlaris
const topProducts = await window.electronAPI.query(`
  SELECT 
    ti.product_id,
    ti.product_name,
    SUM(ti.quantity) as total_terjual,
    SUM(ti.subtotal) as total_omzet
  FROM transaction_items ti
  JOIN transactions t ON ti.transaction_id = t.id
  WHERE t.created_at >= ?
  GROUP BY ti.product_id, ti.product_name
  ORDER BY total_terjual DESC
  LIMIT 5
`, [startOfMonth]);

    // Query untuk penjualan 7 hari terakhir
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      last7Days.push(dateStr);
    }

    const dailySales = [];
    for (const dateStr of last7Days) {
      const start = `${dateStr} 00:00:00`;
      const end = `${dateStr} 23:59:59`;
      
      const result = await window.electronAPI.query(`
        SELECT COALESCE(SUM(total_amount), 0) as total 
        FROM transactions 
        WHERE created_at BETWEEN ? AND ?
      `, [start, end]);
      
      dailySales.push({
        date: dateStr,
        total: result[0].total
      });
    }

    // Query untuk total produk
    const totalProducts = await window.electronAPI.query(`
      SELECT COUNT(*) as count FROM products
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