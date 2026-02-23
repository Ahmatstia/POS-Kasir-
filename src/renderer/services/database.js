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

// Fungsi untuk menambah produk
export async function addProduct(product) {
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

  try {
    const result = await window.electronAPI.run(sql, params);
    return { success: true, id: result.lastID };
  } catch (error) {
    console.error("Error adding product:", error);
    return { success: false, error: error.message };
  }
}

// Update produk (HANYA SATU FUNGSI INI)
export async function updateProduct(id, product) {
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

  try {
    const result = await window.electronAPI.run(sql, params);
    return { success: true, changes: result.changes };
  } catch (error) {
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
