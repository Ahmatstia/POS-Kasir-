// ─── UTILITY FORMAT RUPIAH & NOMINAL DENGAN TITIK (INDONESIA) ─────────────────

/**
 * Mengubah angka/string menjadi format ribuan dengan titik (pemisah ribuan Indonesia):
 * Contoh: 100000 -> "100.000", "5000" -> "5.000", "" -> ""
 */
export function formatNominal(val) {
  if (val === undefined || val === null || val === '') return '';
  const clean = String(val).replace(/\D/g, '');
  if (!clean) return '';
  const num = parseInt(clean, 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('id-ID');
}

/**
 * Membersihkan string berformat titik menjadi angka murni (number):
 * Contoh: "100.000" -> 100000, "" -> 0
 */
export function parseNominal(val) {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(/\D/g, '');
  return clean ? parseInt(clean, 10) : 0;
}

/**
 * Format mata uang lengkap dengan awalan "Rp ":
 * Contoh: 100000 -> "Rp 100.000"
 */
export function fmt(val) {
  const n = parseNominal(val);
  return `Rp ${n.toLocaleString('id-ID')}`;
}

export default {
  formatNominal,
  parseNominal,
  fmt,
};
