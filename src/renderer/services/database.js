// Fungsi untuk mengambil semua produk
export async function getProducts() {
  try {
    const result = await window.electronAPI.query(
      "SELECT * FROM products ORDER BY name",
    );
    return result;
  } catch (error) {
    console.error("Error getting products:", error);
    return [];
  }
}

// Fungsi untuk mengambil semua kategori
export async function getCategories() {
  try {
    const result = await window.electronAPI.query(
      "SELECT * FROM categories ORDER BY name",
    );
    return result;
  } catch (error) {
    console.error("Error getting categories:", error);
    return [];
  }
}

// Fungsi untuk menambah produk (DENGAN PENCATATAN STOK AWAL)
export async function addProduct(product) {
  try {
    await window.electronAPI.run("BEGIN TRANSACTION");

    const sql = `INSERT INTO products (name, category_id, sell_per_unit, price_pcs, price_pack, price_kg, stock, min_stock, notes) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      product.name,
      product.category_id,
      product.sell_per_unit || "all",
      product.price_pcs || 0,
      product.price_pack || 0,
      product.price_kg || 0,
      product.stock || 0,
      product.min_stock || 0,
      product.notes || "",
    ];

    const result = await window.electronAPI.run(sql, params);
    const productId = result.lastID;

    // Catat stok awal di riwayat jika stok > 0
    if (product.stock > 0) {
      const historySql = `
        INSERT INTO stock_history (product_id, type, quantity, unit, reference_id, notes)
        VALUES (?, 'restock', ?, ?, 'Initial Stock', 'Pemasukan stok awal saat tambah produk')
      `;
      await window.electronAPI.run(historySql, [
        productId,
        product.stock,
        product.sell_per_unit || "pcs",
      ]);
    }

    await window.electronAPI.run("COMMIT");
    return { success: true, id: productId };
  } catch (error) {
    await window.electronAPI.run("ROLLBACK");
    console.error("Error adding product:", error);
    return { success: false, error: error.message };
  }
}

// Update produk (DENGAN PENCATATAN RIWAYAT STOK)
export async function updateProduct(id, product) {
  try {
    // Ambil data stok lama untuk dibandingkan
    const oldProduct = await getProductById(id);
    const oldStock = oldProduct ? oldProduct.stock : 0;
    const stockDiff = (product.stock || 0) - oldStock;

    await window.electronAPI.run("BEGIN TRANSACTION");

    const sql = `UPDATE products 
                 SET name = ?, category_id = ?, sell_per_unit = ?, 
                     price_pcs = ?, price_pack = ?, price_kg = ?, 
                     stock = ?, min_stock = ?, notes = ?,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`;
    const params = [
      product.name,
      product.category_id,
      product.sell_per_unit || "all",
      product.price_pcs || 0,
      product.price_pack || 0,
      product.price_kg || 0,
      product.stock || 0,
      product.min_stock || 0,
      product.notes || "",
      id,
    ];

    const result = await window.electronAPI.run(sql, params);

    // Jika stok berubah, catat di riwayat
    if (stockDiff !== 0) {
      const historySql = `
        INSERT INTO stock_history (product_id, type, quantity, unit, reference_id, notes)
        VALUES (?, 'adjustment', ?, ?, 'Manual Update', ?)
      `;
      await window.electronAPI.run(historySql, [
        id,
        stockDiff,
        product.sell_per_unit || "pcs",
        "Penyesuaian stok manual via edit produk",
      ]);
    }

    await window.electronAPI.run("COMMIT");
    return { success: true, changes: result.changes };
  } catch (error) {
    await window.electronAPI.run("ROLLBACK");
    console.error("Error updating product:", error);
    return { success: false, error: error.message };
  }
}

// Hapus produk
export async function deleteProduct(id) {
  const sql = "DELETE FROM products WHERE id = ?";

  try {
    const result = await window.electronAPI.run(sql, [id]);
    return { success: true, changes: result.changes };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { success: false, error: error.message };
  }
}

// Get product by ID
export async function getProductById(id) {
  const sql = "SELECT * FROM products WHERE id = ?";

  try {
    const result = await window.electronAPI.query(sql, [id]);
    return result[0] || null;
  } catch (error) {
    console.error("Error getting product:", error);
    return null;
  }
}
