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
        AND status = 'COMPLETED'
    `, [startDate, endDate]);

    // Query untuk penjualan per hari
    const dailySales = await window.electronAPI.query(`
      SELECT 
        date(created_at) as date,
        COUNT(*) as transaction_count,
        COALESCE(SUM(total_amount), 0) as total
      FROM transactions 
      WHERE date(created_at) BETWEEN date(?) AND date(?)
        AND status = 'COMPLETED'
      GROUP BY date(created_at)
      ORDER BY date ASC
    `, [startDate, endDate]);

    // Query untuk metode pembayaran
    const paymentMethods = await window.electronAPI.query(`
      SELECT 
        payment_method AS name,
        COUNT(*) as count,
        COALESCE(SUM(total_amount), 0) as total
      FROM transactions 
      WHERE date(created_at) BETWEEN date(?) AND date(?)
        AND status = 'COMPLETED'
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
        AND t.status = 'COMPLETED'
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
        AND t.status = 'COMPLETED'
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
        AND status = 'COMPLETED'
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

// Fungsi untuk mendapatkan laporan stok (aggregated from stocks table)
export async function getStockReport() {
  try {
    // Ringkasan stok (from stocks table, not products.stock)
    const summary = await window.electronAPI.query(`
      SELECT 
        COUNT(DISTINCT p.id) as total_products,
        COALESCE(SUM(s.quantity), 0) as total_stock,
        COALESCE(SUM(s.qty_kg), 0) as total_stock_kg,
        COALESCE(AVG(stock_agg.stock), 0) as average_stock,
        COUNT(CASE 
          WHEN (p.sell_per_unit != 'kg' AND COALESCE(stock_agg.stock, 0) <= p.min_stock AND p.min_stock > 0)
            OR (p.sell_per_unit = 'kg' AND COALESCE(stock_agg.stock_kg, 0) <= p.min_stock_kg AND p.min_stock_kg > 0)
          THEN 1 END) as low_stock_count,
        COUNT(CASE 
          WHEN (p.sell_per_unit != 'kg' AND COALESCE(stock_agg.stock, 0) = 0)
            OR (p.sell_per_unit = 'kg' AND COALESCE(stock_agg.stock_kg, 0) = 0)
          THEN 1 END) as out_of_stock_count
      FROM products p
      LEFT JOIN (
        SELECT product_id, SUM(quantity) as stock, SUM(qty_kg) as stock_kg
        FROM stocks WHERE is_active = 1
        GROUP BY product_id
      ) stock_agg ON stock_agg.product_id = p.id
      LEFT JOIN stocks s ON s.product_id = p.id AND s.is_active = 1
      WHERE p.is_active = 1
    `);

    // Stok per kategori (from stocks table)
    const stockByCategory = await window.electronAPI.query(`
      SELECT 
        c.name as category_name,
        COUNT(DISTINCT p.id) as product_count,
        COALESCE(SUM(s.quantity), 0) as total_stock,
        COALESCE(SUM(s.qty_kg), 0) as total_stock_kg,
        COALESCE(SUM(s.quantity * p.price_pcs), 0) as total_value_pcs,
        COALESCE(SUM(s.qty_kg * p.price_kg), 0) as total_value_kg
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN stocks s ON s.product_id = p.id AND s.is_active = 1
      WHERE p.is_active = 1
      GROUP BY c.id, c.name
      ORDER BY total_stock DESC, total_stock_kg DESC
    `);

    // Produk dengan stok menipis (from stocks table)
    const lowStock = await window.electronAPI.query(`
      SELECT 
        p.id, p.name, p.min_stock, p.min_stock_kg, p.price_pcs, p.price_kg, p.sell_per_unit,
        p.pcs_per_pack, p.pack_per_dus,
        c.name as category_name,
        COALESCE(SUM(s.quantity), 0) as total_stock,
        COALESCE(SUM(s.qty_kg), 0) as total_stock_kg
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN stocks s ON s.product_id = p.id AND s.is_active = 1
      WHERE p.is_active = 1
      GROUP BY p.id
      HAVING 
        (p.sell_per_unit != 'kg' AND p.min_stock > 0 AND total_stock <= p.min_stock)
        OR (p.sell_per_unit = 'kg' AND p.min_stock_kg > 0 AND total_stock_kg <= p.min_stock_kg)
      ORDER BY 
        CASE WHEN p.sell_per_unit = 'kg' THEN (total_stock_kg * 1.0 / MAX(p.min_stock_kg, 1)) 
             ELSE (total_stock * 1.0 / MAX(p.min_stock, 1)) END ASC
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