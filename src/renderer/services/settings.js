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

export async function getStoreProfile() {
  const [name, address, phone, footer] = await Promise.all([
    getSetting('store_name', 'TOKO BUMBU'),
    getSetting('store_address', 'Jl. Imam Bonjol, Muara Sabak Barat, Tanjung Jabung Timur'),
    getSetting('store_phone', '0822-8324-8946'),
    getSetting('receipt_footer', 'Selamat Belanja Kembali'),
  ]);
  return { name, address, phone, footer };
}

export async function updateStoreProfile({ name, address, phone, footer }) {
  await Promise.all([
    updateSetting('store_name', (name || 'TOKO BUMBU').trim()),
    updateSetting('store_address', (address || '').trim()),
    updateSetting('store_phone', (phone || '').trim()),
    updateSetting('receipt_footer', (footer || 'Selamat Belanja Kembali').trim()),
  ]);
  return { success: true };
}
