// ─── CATEGORIES SERVICE ──────────────────────────────────────────────────────

export async function getCategories() {
  try {
    const sql = `
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
      GROUP BY c.id
      ORDER BY c.name ASC
    `;
    return await window.electronAPI.query(sql);
  } catch (error) {
    console.error("Error getting categories:", error);
    return [];
  }
}

export async function addCategory({ name, description = "", color = "#5B8AF5" }) {
  try {
    const result = await window.electronAPI.run(
      "INSERT INTO categories (name, description, color) VALUES (?, ?, ?)",
      [name.trim(), description.trim(), color]
    );
    return { success: true, id: result.lastID };
  } catch (error) {
    console.error("Error adding category:", error);
    return { success: false, error: error.message };
  }
}

export async function updateCategory(id, { name, description, color }) {
  try {
    await window.electronAPI.run(
      "UPDATE categories SET name = ?, description = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [name.trim(), description?.trim() || "", color || "#5B8AF5", id]
    );
    return { success: true };
  } catch (error) {
    console.error("Error updating category:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCategory(id) {
  try {
    // Check if any products use this category
    const [usage] = await window.electronAPI.query(
      "SELECT COUNT(*) as count FROM products WHERE category_id = ? AND is_active = 1",
      [id]
    );
    if (usage.count > 0) {
      return { success: false, error: `Kategori ini masih digunakan oleh ${usage.count} produk aktif.` };
    }
    await window.electronAPI.run("DELETE FROM categories WHERE id = ?", [id]);
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    return { success: false, error: error.message };
  }
}
