// ─── PRODUCTS SERVICE ────────────────────────────────────────────────────────

// Get all products (with aggregated stock from stocks table)
export async function getProducts() {
  try {
    const sql = `
      SELECT 
        p.*,
        c.name  as category_name,
        c.color as category_color,
        COALESCE(SUM(s.quantity), 0) as stock,
        COALESCE(SUM(s.qty_kg), 0) as stock_kg
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
        COALESCE(SUM(s.quantity), 0) as stock,
        COALESCE(SUM(s.qty_kg), 0) as stock_kg
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
    // Validation & Sanitization
    const name = (product.name || "").trim();
    if (!name) throw new Error("Nama produk tidak boleh kosong");

    const pcs_per_pack = Math.max(1, Number(product.pcs_per_pack) || 1);
    const pack_per_dus = Math.max(1, Number(product.pack_per_dus) || 1);
    const kg_per_karung = Math.max(0.1, Number(product.kg_per_karung) || 25);

    const sql = `
      INSERT INTO products 
        (name, category_id, sell_per_unit, price_pcs, price_pack, price_dus, price_kg,
         pcs_per_pack, pack_per_dus, min_stock, min_stock_kg, purchase_price, notes, price_karung, kg_per_karung)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      name,
      product.category_id,
      product.sell_per_unit || "all",
      Math.max(0, Number(product.price_pcs) || 0),
      Math.max(0, Number(product.price_pack) || 0),
      Math.max(0, Number(product.price_dus) || 0),
      Math.max(0, Number(product.price_kg) || 0),
      pcs_per_pack,
      pack_per_dus,
      Math.max(0, Number(product.min_stock) || 0),
      Math.max(0, Number(product.min_stock_kg) || 0),
      Math.max(0, Number(product.purchase_price) || 0),
      (product.notes || "").trim(),
      Math.max(0, Number(product.price_karung) || 0),
      kg_per_karung
    ];
    const result = await window.electronAPI.run(sql, params);
    if (result.lastID) {
      import("./audit").then(({ logActivity, AUDIT_ACTIONS }) => {
        logActivity(AUDIT_ACTIONS.ADD_PRODUCT, "Products", `Added new product: ${name} (ID: ${result.lastID})`);
      });
    }
    return { success: true, id: result.lastID };
  } catch (error) {
    console.error("Error adding product:", error);
    return { success: false, error: error.message };
  }
}

// Update product data only (no stock)
export async function updateProduct(id, product) {
  try {
    // Validation & Sanitization
    const name = (product.name || "").trim();
    if (!name) throw new Error("Nama produk tidak boleh kosong");

    const pcs_per_pack = Math.max(1, Number(product.pcs_per_pack) || 1);
    const pack_per_dus = Math.max(1, Number(product.pack_per_dus) || 1);
    const kg_per_karung = Math.max(0.1, Number(product.kg_per_karung) || 25);

    const sql = `
      UPDATE products
      SET name = ?, category_id = ?, sell_per_unit = ?,
          price_pcs = ?, price_pack = ?, price_dus = ?, price_kg = ?,
          pcs_per_pack = ?, pack_per_dus = ?,
          min_stock = ?, min_stock_kg = ?, purchase_price = ?, notes = ?,
          price_karung = ?, kg_per_karung = ?
      WHERE id = ?
    `;
    const params = [
      name,
      product.category_id,
      product.sell_per_unit || "all",
      Math.max(0, Number(product.price_pcs) || 0),
      Math.max(0, Number(product.price_pack) || 0),
      Math.max(0, Number(product.price_dus) || 0),
      Math.max(0, Number(product.price_kg) || 0),
      pcs_per_pack,
      pack_per_dus,
      Math.max(0, Number(product.min_stock) || 0),
      Math.max(0, Number(product.min_stock_kg) || 0),
      Math.max(0, Number(product.purchase_price) || 0),
      (product.notes || "").trim(),
      Math.max(0, Number(product.price_karung) || 0),
      kg_per_karung,
      id,
    ];
    const result = await window.electronAPI.run(sql, params);

    if (result.changes > 0) {
      import("./audit").then(({ logActivity, AUDIT_ACTIONS }) => {
        logActivity(AUDIT_ACTIONS.UPDATE_PRODUCT, "Products", `Updated product: ${product.name} (ID: ${id})`);
      });
    }

    // Try to update updated_at separately
    try {
      await window.electronAPI.run(
        "UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [id]
      );
    } catch (e) {
      console.warn("⚠️ updated_at column missing in products table, skipping...");
    }

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
      "UPDATE products SET is_active = 0 WHERE id = ?",
      [id]
    );

    // Try to update updated_at separately
    try {
      await window.electronAPI.run(
        "UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [id]
      );
    } catch (e) {
      console.warn("⚠️ updated_at column missing in products table, skipping...");
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { success: false, error: error.message };
  }
}

// Soft-delete ALL products
export async function deleteAllProducts() {
  try {
    const result = await window.electronAPI.run(
      "UPDATE products SET is_active = 0 WHERE is_active = 1"
    );

    // Try to update updated_at separately
    try {
      await window.electronAPI.run(
        "UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE is_active = 0"
      );
    } catch (e) {
      // ignore
    }

    return { success: true, changes: result.changes };
  } catch (error) {
    console.error("Error deleting all products:", error);
    return { success: false, error: error.message };
  }
}
