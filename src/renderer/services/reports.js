// Fungsi untuk mendapatkan laporan penjualan berdasarkan periode
export async function getSalesReport(startDate, endDate) {
  try {
    // Query untuk ringkasan penjualan
    const summary = await window.electronAPI.query(`
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(AVG(total_amount), 0) as average_sales,
        COALESCE(SUM(payment_amount), 0) as total_payment,
        COALESCE(SUM(change_amount), 0) as total_change,
        COUNT(DISTINCT strftime('%Y-%m-%d', created_at)) as active_days
      FROM transactions 
      WHERE date(created_at) BETWEEN date(?) AND date(?)
    `, [startDate, endDate]);

    // Query untuk penjualan per hari
    const dailySales = await window.electronAPI.query(`
      SELECT 
        date(created_at) as date,
        COUNT(*) as transaction_count,
        COALESCE(SUM(total_amount), 0) as total
      FROM transactions 
      WHERE date(created_at) BETWEEN date(?) AND date(?)
      GROUP BY date(created_at)
      ORDER BY date ASC
    `, [startDate, endDate]);

    // Query untuk metode pembayaran
    const paymentMethods = await window.electronAPI.query(`
      SELECT 
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total
      FROM transactions 
      WHERE date(created_at) BETWEEN date(?) AND date(?)
      GROUP BY payment_method
    `, [startDate, endDate]);

    // Query untuk produk terlaris periode ini
    const topProducts = await window.electronAPI.query(`
      SELECT 
        ti.product_id,
        ti.product_name,
        SUM(ti.quantity) as total_quantity,
        SUM(ti.subtotal) as total_sales,
        COUNT(DISTINCT ti.transaction_id) as times_sold
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE date(t.created_at) BETWEEN date(?) AND date(?)
      GROUP BY ti.product_id, ti.product_name
      ORDER BY total_quantity DESC
      LIMIT 10
    `, [startDate, endDate]);

    // Query untuk kategori terlaris
    const topCategories = await window.electronAPI.query(`
      SELECT 
        c.name as category_name,
        COUNT(DISTINCT ti.product_id) as product_count,
        SUM(ti.quantity) as total_quantity,
        SUM(ti.subtotal) as total_sales
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      JOIN products p ON ti.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE date(t.created_at) BETWEEN date(?) AND date(?)
      GROUP BY c.id, c.name
      ORDER BY total_sales DESC
    `, [startDate, endDate]);

    // Query untuk jam sibuk
    const peakHours = await window.electronAPI.query(`
      SELECT 
        strftime('%H', created_at) as hour,
        COUNT(*) as transaction_count,
        COALESCE(SUM(total_amount), 0) as total
      FROM transactions 
      WHERE date(created_at) BETWEEN date(?) AND date(?)
      GROUP BY hour
      ORDER BY hour ASC
    `, [startDate, endDate]);

    return {
      summary: summary[0],
      dailySales,
      paymentMethods,
      topProducts,
      topCategories,
      peakHours,
      startDate,
      endDate
    };
  } catch (error) {
    console.error('Error getting sales report:', error);
    return null;
  }
}

// Fungsi untuk mendapatkan laporan stok
export async function getStockReport() {
  try {
    // Ringkasan stok
    const summary = await window.electronAPI.query(`
      SELECT 
        COUNT(*) as total_products,
        SUM(stock) as total_stock,
        AVG(stock) as average_stock,
        COUNT(CASE WHEN stock <= min_stock THEN 1 END) as low_stock_count,
        COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock_count
      FROM products
    `);

    // Stok per kategori
    const stockByCategory = await window.electronAPI.query(`
      SELECT 
        c.name as category_name,
        COUNT(p.id) as product_count,
        SUM(p.stock) as total_stock,
        COALESCE(SUM(p.stock * p.price_pcs), 0) as total_value_pcs,
        COALESCE(SUM(p.stock * p.price_pack), 0) as total_value_pack,
        COALESCE(SUM(p.stock * p.price_kg), 0) as total_value_kg
      FROM products p
      JOIN categories c ON p.category_id = c.id
      GROUP BY c.id, c.name
      ORDER BY total_stock DESC
    `);

    // Produk dengan stok menipis
    const lowStock = await window.electronAPI.query(`
      SELECT 
        p.*,
        c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.stock <= p.min_stock
      ORDER BY (p.stock * 1.0 / p.min_stock) ASC
    `);

    return {
      summary: summary[0],
      stockByCategory,
      lowStock
    };
  } catch (error) {
    console.error('Error getting stock report:', error);
    return null;
  }
}

// Fungsi untuk ekspor ke CSV
export function exportToCSV(data, filename) {
  if (!data || data.length === 0) return;

  // Buat header CSV
  const headers = Object.keys(data[0]).join(',');
  
  // Buat baris data
  const rows = data.map(row => 
    Object.values(row).map(value => 
      typeof value === 'string' && value.includes(',') 
        ? `"${value}"` 
        : value
    ).join(',')
  ).join('\n');

  const csv = `${headers}\n${rows}`;
  
  // Download file
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}