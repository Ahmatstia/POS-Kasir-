// ─── CUSTOMERS SERVICE (DATA KONTAK & PELANGGAN) ─────────────────────────────
import {
  getCustomers,
  getCustomerById,
  addCustomer,
  updateCustomer,
  deleteCustomer
} from "./debts";

export {
  getCustomers,
  getCustomerById,
  addCustomer,
  updateCustomer,
  deleteCustomer
};

// ─── RIWAYAT TRANSAKSI PELANGGAN ─────────────────────────────────────────────
export async function getCustomerTransactions(customerId) {
  try {
    const sql = `
      SELECT t.*, 
        COUNT(ti.id) as item_count
      FROM transactions t
      LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
      WHERE t.customer_id = ?
      GROUP BY t.id
      ORDER BY t.created_at DESC
      LIMIT 50
    `;
    return await window.electronAPI.query(sql, [customerId]);
  } catch (error) {
    console.error("Error getting customer transactions:", error);
    return [];
  }
}
