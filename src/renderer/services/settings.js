// ─── SETTINGS SERVICE ────────────────────────────────────────────────────────

export async function getSetting(key, defaultValue = null) {
  try {
    const rows = await window.electronAPI.query("SELECT value FROM settings WHERE key = ?", [key]);
    if (rows.length > 0) return rows[0].value;
    return defaultValue;
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return defaultValue;
  }
}

export async function updateSetting(key, value) {
  try {
    await window.electronAPI.run(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      [key, String(value)]
    );
    return { success: true };
  } catch (error) {
    console.error(`Error updating setting ${key}:`, error);
    return { success: false, error: error.message };
  }
}

export async function isStockManaged() {
  const val = await getSetting('ignore_stock', '0');
  return val === '0'; // If ignore_stock is '0', then we ARE managing/restricting stock
}

export async function isPrivacyModeEnabled() {
  const val = await getSetting('hide_cost', '0');
  return val === '1';
}
