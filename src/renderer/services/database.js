// ─── PRODUCTS SERVICE ────────────────────────────────────────────────────────

// Get all products (with aggregated stock from stocks table)
export async function getProducts() {
  try {
    const sql = `
      SELECT 
        p.*,
        c.name  as category_name,
        c.color as category_color,
        COALESCE(SUM(s.quantity), 0) as stock
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stocks s ON s.product_id = p.id AND s.is_active = 1
      WHERE p.is_active = 1
      GROUP BY p.id
      ORDER BY p.name ASC
    `;
    return await window.electronAPI.query(sql);
  } catch (error) {
    console.error("Error getting products:", error);
    return [];
  }
}

// Get categories (for dropdowns)
export async function getCategories() {
  try {
    return await window.electronAPI.query(
      "SELECT * FROM categories ORDER BY name ASC"
    );
  } catch (error) {
    console.error("Error getting categories:", error);
    return [];
  }
}

// Get single product by ID (with stock)
export async function getProductById(id) {
  try {
    const sql = `
      SELECT 
        p.*,
        c.name  as category_name,
        c.color as category_color,
        COALESCE(SUM(s.quantity), 0) as stock
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stocks s ON s.product_id = p.id AND s.is_active = 1
      WHERE p.id = ?
      GROUP BY p.id
    `;
    const result = await window.electronAPI.query(sql, [id]);
    return result[0] || null;
  } catch (error) {
    console.error("Error getting product:", error);
    return null;
  }
}

// Add product (NO stock input — stock managed via Inventory)
export async function addProduct(product) {
  try {
    const sql = `
      INSERT INTO products 
        (name, category_id, sell_per_unit, price_pcs, price_pack, price_dus, price_kg,
         pcs_per_pack, pack_per_dus, min_stock, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      product.name,
      product.category_id,
      product.sell_per_unit || "all",
      product.price_pcs     || 0,
      product.price_pack    || 0,
      product.price_dus     || 0,
      product.price_kg      || 0,
      product.pcs_per_pack  || 1,
      product.pack_per_dus  || 1,
      product.min_stock     || 0,
      product.notes         || "",
    ];
    const result = await window.electronAPI.run(sql, params);
    return { success: true, id: result.lastID };
  } catch (error) {
    console.error("Error adding product:", error);
    return { success: false, error: error.message };
  }
}

// Update product data only (no stock)
export async function updateProduct(id, product) {
  try {
    const sql = `
      UPDATE products
      SET name = ?, category_id = ?, sell_per_unit = ?,
          price_pcs = ?, price_pack = ?, price_dus = ?, price_kg = ?,
          pcs_per_pack = ?, pack_per_dus = ?,
          min_stock = ?, notes = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const params = [
      product.name,
      product.category_id,
      product.sell_per_unit || "all",
      product.price_pcs     || 0,
      product.price_pack    || 0,
      product.price_dus     || 0,
      product.price_kg      || 0,
      product.pcs_per_pack  || 1,
      product.pack_per_dus  || 1,
      product.min_stock     || 0,
      product.notes         || "",
      id,
    ];
    const result = await window.electronAPI.run(sql, params);
    return { success: true, changes: result.changes };
  } catch (error) {
    console.error("Error updating product:", error);
    return { success: false, error: error.message };
  }
}

// Soft-delete a product
export async function deleteProduct(id) {
  try {
    await window.electronAPI.run(
      "UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );
    return { success: true };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { success: false, error: error.message };
  }
}
