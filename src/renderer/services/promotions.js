// ─── PROMOTIONS & DISCOUNTS SERVICE ──────────────────────────────────────────
// Handles promo codes, percentage / nominal discounts, validity & min spend

// Ensure table exists on first run
let tableEnsured = false;
async function ensurePromoTable() {
  if (tableEnsured) return;
  try {
    await window.electronAPI.run(`
      CREATE TABLE IF NOT EXISTS promotions (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        name           TEXT NOT NULL,
        code           TEXT NOT NULL UNIQUE,
        discount_type  TEXT NOT NULL CHECK(discount_type IN ('nominal', 'percent')),
        discount_value REAL NOT NULL,
        min_spend      INTEGER DEFAULT 0,
        start_date     TEXT,
        end_date       TEXT,
        is_active      INTEGER DEFAULT 1,
        created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    try {
      await window.electronAPI.run("ALTER TABLE transactions ADD COLUMN promo_id INTEGER");
    } catch (_) {}
    try {
      await window.electronAPI.run("ALTER TABLE transactions ADD COLUMN promo_code TEXT");
    } catch (_) {}
    tableEnsured = true;
  } catch (err) {
    console.error("Error ensuring promotions table:", err);
  }
}

// ─── GET ALL PROMOTIONS (FOR MANAGEMENT) ──────────────────────────────────────
export async function getPromotions(searchTerm = "") {
  await ensurePromoTable();
  try {
    let sql = `SELECT * FROM promotions`;
    const params = [];
    if (searchTerm?.trim()) {
      sql += ` WHERE name LIKE ? OR code LIKE ?`;
      params.push(`%${searchTerm.trim()}%`, `%${searchTerm.trim()}%`);
    }
    sql += ` ORDER BY is_active DESC, id DESC`;
    return await window.electronAPI.query(sql, params);
  } catch (error) {
    console.error("Error getting promotions:", error);
    return [];
  }
}

// ─── GET ACTIVE PROMOTIONS (FOR CASHIER CHECKOUT) ────────────────────────────
export async function getActivePromotions() {
  await ensurePromoTable();
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const sql = `
      SELECT * FROM promotions 
      WHERE is_active = 1
        AND (start_date IS NULL OR start_date = '' OR start_date <= ?)
        AND (end_date IS NULL OR end_date = '' OR end_date >= ?)
      ORDER BY min_spend ASC, name ASC
    `;
    return await window.electronAPI.query(sql, [today, today]);
  } catch (error) {
    console.error("Error getting active promotions:", error);
    return [];
  }
}

// ─── GET PROMOTION BY CODE (CASE-INSENSITIVE) ──────────────────────────────────
export async function getPromotionByCode(code) {
  await ensurePromoTable();
  try {
    const cleanCode = (code || "").trim().toUpperCase();
    if (!cleanCode) return null;
    const today = new Date().toISOString().split("T")[0];
    const sql = `
      SELECT * FROM promotions 
      WHERE UPPER(code) = ? 
        AND is_active = 1
        AND (start_date IS NULL OR start_date = '' OR start_date <= ?)
        AND (end_date IS NULL OR end_date = '' OR end_date >= ?)
      LIMIT 1
    `;
    const rows = await window.electronAPI.query(sql, [cleanCode, today, today]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error finding promotion by code:", error);
    return null;
  }
}

// ─── ADD PROMOTION ────────────────────────────────────────────────────────────
export async function addPromotion({
  name,
  code,
  discount_type = "nominal",
  discount_value = 0,
  min_spend = 0,
  start_date = null,
  end_date = null,
  is_active = 1,
}) {
  await ensurePromoTable();
  const cleanName = (name || "").trim();
  const cleanCode = (code || "").trim().toUpperCase();
  const cleanType = discount_type === "percent" ? "percent" : "nominal";
  const cleanValue = parseFloat(discount_value) || 0;
  const cleanMinSpend = parseInt(min_spend, 10) || 0;

  if (!cleanName) throw new Error("Nama promo wajib diisi");
  if (!cleanCode) throw new Error("Kode promo unik wajib diisi");
  if (cleanValue <= 0) throw new Error("Nilai potongan harus lebih besar dari 0");
  if (cleanType === "percent" && cleanValue > 100) {
    throw new Error("Diskon persen tidak boleh melebihi 100%");
  }

  // Check unique code
  const existing = await window.electronAPI.query(
    "SELECT id FROM promotions WHERE UPPER(code) = ?",
    [cleanCode]
  );
  if (existing && existing.length > 0) {
    throw new Error(`Kode promo "${cleanCode}" sudah digunakan promo lain`);
  }

  const sql = `
    INSERT INTO promotions 
      (name, code, discount_type, discount_value, min_spend, start_date, end_date, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const result = await window.electronAPI.run(sql, [
    cleanName,
    cleanCode,
    cleanType,
    cleanValue,
    cleanMinSpend,
    start_date || null,
    end_date || null,
    is_active ? 1 : 0,
  ]);
  return result.lastID;
}

// ─── UPDATE PROMOTION ─────────────────────────────────────────────────────────
export async function updatePromotion(id, {
  name,
  code,
  discount_type = "nominal",
  discount_value = 0,
  min_spend = 0,
  start_date = null,
  end_date = null,
  is_active = 1,
}) {
  await ensurePromoTable();
  const cleanName = (name || "").trim();
  const cleanCode = (code || "").trim().toUpperCase();
  const cleanType = discount_type === "percent" ? "percent" : "nominal";
  const cleanValue = parseFloat(discount_value) || 0;
  const cleanMinSpend = parseInt(min_spend, 10) || 0;

  if (!cleanName) throw new Error("Nama promo wajib diisi");
  if (!cleanCode) throw new Error("Kode promo unik wajib diisi");
  if (cleanValue <= 0) throw new Error("Nilai potongan harus lebih besar dari 0");
  if (cleanType === "percent" && cleanValue > 100) {
    throw new Error("Diskon persen tidak boleh melebihi 100%");
  }

  // Check unique code excluding current ID
  const existing = await window.electronAPI.query(
    "SELECT id FROM promotions WHERE UPPER(code) = ? AND id != ?",
    [cleanCode, id]
  );
  if (existing && existing.length > 0) {
    throw new Error(`Kode promo "${cleanCode}" sudah digunakan promo lain`);
  }

  const sql = `
    UPDATE promotions
    SET name = ?, code = ?, discount_type = ?, discount_value = ?, min_spend = ?,
        start_date = ?, end_date = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  return await window.electronAPI.run(sql, [
    cleanName,
    cleanCode,
    cleanType,
    cleanValue,
    cleanMinSpend,
    start_date || null,
    end_date || null,
    is_active ? 1 : 0,
    id,
  ]);
}

// ─── TOGGLE PROMOTION STATUS ──────────────────────────────────────────────────
export async function togglePromotionStatus(id, newStatus) {
  await ensurePromoTable();
  return await window.electronAPI.run(
    "UPDATE promotions SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [newStatus ? 1 : 0, id]
  );
}

// ─── DELETE PROMOTION ─────────────────────────────────────────────────────────
export async function deletePromotion(id) {
  await ensurePromoTable();
  return await window.electronAPI.run("DELETE FROM promotions WHERE id = ?", [id]);
}

// ─── HELPER: CALCULATE DISCOUNT & VALIDATE RULES ──────────────────────────────
export function calculatePromoDiscount(promo, subtotal) {
  if (!promo) return { valid: false, discount: 0, reason: "Promo tidak ditemukan" };
  const sub = Number(subtotal) || 0;
  const min = Number(promo.min_spend) || 0;

  if (min > 0 && sub < min) {
    return {
      valid: false,
      discount: 0,
      reason: `Minimal belanja Rp ${min.toLocaleString("id-ID")} (kurang Rp ${(min - sub).toLocaleString("id-ID")})`,
    };
  }

  let discount = 0;
  if (promo.discount_type === "percent") {
    discount = Math.round(sub * (Number(promo.discount_value) / 100));
  } else {
    discount = Math.round(Number(promo.discount_value));
  }

  // Potongan tidak boleh melebihi subtotal
  discount = Math.min(sub, Math.max(0, discount));

  return {
    valid: true,
    discount,
    reason: null,
  };
}
