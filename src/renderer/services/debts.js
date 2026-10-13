// ─── DEBTS & CUSTOMERS SERVICE (BUKU KASBON) ───────────────────────────
import { getLocalDatetimeStr } from "./transactions";

// ─── GET ALL CUSTOMERS (WITH AGGREGATED DEBT) ────────────────────────────────
export async function getCustomers(searchTerm = "") {
  try {
    let sql = `
      SELECT 
        c.*,
        COALESCE(SUM(CASE WHEN cd.status IN ('UNPAID', 'PARTIAL') THEN cd.remaining_debt ELSE 0 END), 0) AS total_debt,
        COUNT(CASE WHEN cd.status IN ('UNPAID', 'PARTIAL') THEN 1 END) AS unpaid_invoices_count,
        MAX(cd.created_at) AS last_debt_date
      FROM customers c
      LEFT JOIN customer_debts cd ON cd.customer_id = c.id
    `;
    const params = [];
    if (searchTerm?.trim()) {
      sql += ` WHERE c.name LIKE ? OR c.phone LIKE ?`;
      params.push(`%${searchTerm.trim()}%`, `%${searchTerm.trim()}%`);
    }
    sql += ` GROUP BY c.id ORDER BY total_debt DESC, c.name ASC`;

    return await window.electronAPI.query(sql, params);
  } catch (error) {
    console.error("Error getting customers:", error);
    return [];
  }
}

// ─── GET SINGLE CUSTOMER BY ID ───────────────────────────────────────────────
export async function getCustomerById(id) {
  try {
    const sql = `
      SELECT 
        c.*,
        COALESCE(SUM(CASE WHEN cd.status IN ('UNPAID', 'PARTIAL') THEN cd.remaining_debt ELSE 0 END), 0) AS total_debt,
        COUNT(CASE WHEN cd.status IN ('UNPAID', 'PARTIAL') THEN 1 END) AS unpaid_invoices_count
      FROM customers c
      LEFT JOIN customer_debts cd ON cd.customer_id = c.id
      WHERE c.id = ?
      GROUP BY c.id
    `;
    const rows = await window.electronAPI.query(sql, [id]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error getting customer by id:", error);
    return null;
  }
}

// ─── ADD CUSTOMER ─────────────────────────────────────────────────────────────
export async function addCustomer({ name, phone = "", address = "", debt_limit = 0, notes = "" }) {
  try {
    const cleanName = (name || "").trim();
    if (!cleanName) throw new Error("Nama pelanggan wajib diisi");

    const sql = `
      INSERT INTO customers (name, phone, address, debt_limit, notes)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      cleanName,
      (phone || "").trim(),
      (address || "").trim(),
      Math.max(0, Number(debt_limit) || 0),
      (notes || "").trim(),
    ];
    const res = await window.electronAPI.run(sql, params);
    if (res.lastID) {
      import("./audit").then(({ logActivity, AUDIT_ACTIONS }) => {
        logActivity(AUDIT_ACTIONS.CUSTOM_ACTION || "ADD_CUSTOMER", "Debts", `Tambah pelanggan kasbon: ${cleanName} (ID: ${res.lastID})`);
      });
    }
    return { success: true, id: res.lastID };
  } catch (error) {
    console.error("Error adding customer:", error);
    return { success: false, error: error.message };
  }
}

// ─── UPDATE CUSTOMER ──────────────────────────────────────────────────────────
export async function updateCustomer(id, { name, phone = "", address = "", debt_limit = 0, notes = "" }) {
  try {
    const cleanName = (name || "").trim();
    if (!cleanName) throw new Error("Nama pelanggan wajib diisi");

    const sql = `
      UPDATE customers
      SET name = ?, phone = ?, address = ?, debt_limit = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const params = [
      cleanName,
      (phone || "").trim(),
      (address || "").trim(),
      Math.max(0, Number(debt_limit) || 0),
      (notes || "").trim(),
      id,
    ];
    await window.electronAPI.run(sql, params);
    return { success: true };
  } catch (error) {
    console.error("Error updating customer:", error);
    return { success: false, error: error.message };
  }
}

// ─── DELETE CUSTOMER ──────────────────────────────────────────────────────────
export async function deleteCustomer(id) {
  try {
    // Pastikan tidak ada utang yang belum lunas
    const debts = await window.electronAPI.query(
      "SELECT id FROM customer_debts WHERE customer_id = ? AND status IN ('UNPAID', 'PARTIAL')",
      [id]
    );
    if (debts.length > 0) {
      return {
        success: false,
        error: "Pelanggan tidak bisa dihapus karena masih memiliki kasbon aktif yang belum lunas.",
      };
    }

    await window.electronAPI.run("DELETE FROM debt_payments WHERE customer_id = ?", [id]);
    await window.electronAPI.run("DELETE FROM customer_debts WHERE customer_id = ?", [id]);
    await window.electronAPI.run("DELETE FROM customers WHERE id = ?", [id]);
    return { success: true };
  } catch (error) {
    console.error("Error deleting customer:", error);
    return { success: false, error: error.message };
  }
}

// ─── GET CUSTOMER INVOICES / DEBTS ────────────────────────────────────────────
export async function getCustomerDebts(customerId) {
  try {
    const sql = `
      SELECT cd.*, t.payment_method, t.discount
      FROM customer_debts cd
      LEFT JOIN transactions t ON t.id = cd.transaction_id
      WHERE cd.customer_id = ?
      ORDER BY cd.created_at DESC
    `;
    return await window.electronAPI.query(sql, [customerId]);
  } catch (error) {
    console.error("Error getting customer debts:", error);
    return [];
  }
}

// ─── GET ALL ACTIVE DEBTS (OVERVIEW) ──────────────────────────────────────────
export async function getAllDebts(statusFilter = "active") {
  try {
    let sql = `
      SELECT cd.*, c.name AS customer_name, c.phone AS customer_phone, c.debt_limit
      FROM customer_debts cd
      JOIN customers c ON c.id = cd.customer_id
    `;
    const params = [];
    if (statusFilter === "active") {
      sql += ` WHERE cd.status IN ('UNPAID', 'PARTIAL')`;
    } else if (statusFilter === "paid") {
      sql += ` WHERE cd.status = 'PAID'`;
    }
    sql += ` ORDER BY cd.created_at DESC`;
    return await window.electronAPI.query(sql, params);
  } catch (error) {
    console.error("Error getting all debts:", error);
    return [];
  }
}

// ─── PAY DEBT (CICIL / LUNAS KASBON DENGAN FIFO ALOKASI) ───────────────────────
export async function payDebt({
  customerId,
  debtId = null,
  amount,
  paymentMethod = "cash",
  notes = "",
}) {
  try {
    const payAmount = Math.max(0, Number(amount) || 0);
    if (payAmount <= 0) throw new Error("Nominal pembayaran harus lebih dari Rp 0");

    // Validasi pencegahan bayar melebihi sisa hutang (Anti-Overpayment)
    if (debtId) {
      const [targetDebt] = await window.electronAPI.query(
        "SELECT remaining_debt FROM customer_debts WHERE id = ?",
        [debtId]
      );
      if (!targetDebt) throw new Error("Nota kasbon tidak ditemukan.");
      const maxPayable = Number(targetDebt.remaining_debt || 0);
      if (maxPayable <= 0) throw new Error("Nota kasbon ini sudah lunas!");
      if (payAmount > maxPayable) {
        throw new Error(`Nominal pembayaran (Rp ${payAmount.toLocaleString('id-ID')}) melebihi sisa hutang nota ini (Rp ${maxPayable.toLocaleString('id-ID')})!`);
      }
    } else {
      const [debtSum] = await window.electronAPI.query(
        `SELECT COALESCE(SUM(remaining_debt), 0) AS total_debt FROM customer_debts WHERE customer_id = ? AND status IN ('UNPAID', 'PARTIAL')`,
        [customerId]
      );
      const maxPayable = Number(debtSum?.total_debt || 0);
      if (maxPayable <= 0) throw new Error("Pelanggan ini tidak memiliki tunggakan kasbon aktif (sudah lunas).");
      if (payAmount > maxPayable) {
        throw new Error(`Nominal pembayaran (Rp ${payAmount.toLocaleString('id-ID')}) melebihi total kasbon pelanggan (Rp ${maxPayable.toLocaleString('id-ID')})!`);
      }
    }

    const createdAt = getLocalDatetimeStr();

    await window.electronAPI.run("BEGIN TRANSACTION");

    let currentShiftId = null;
    try {
      const [activeShift] = await window.electronAPI.query("SELECT id FROM cash_shifts WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1");
      if (activeShift) currentShiftId = activeShift.id;
    } catch (e) {}

    // Catat riwayat pembayaran (terikat ke shift jika ada)
    const payResult = await window.electronAPI.run(
      `INSERT INTO debt_payments (customer_id, debt_id, payment_amount, payment_method, notes, created_at, shift_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [customerId, debtId || null, payAmount, paymentMethod, (notes || "").trim(), createdAt, currentShiftId]
    );
    const paymentRecordId = payResult.lastID;

    let remainingToAllocate = payAmount;

    if (debtId) {
      // Pembayaran khusus untuk satu nota tertentu
      const [debt] = await window.electronAPI.query(
        "SELECT * FROM customer_debts WHERE id = ?",
        [debtId]
      );
      if (debt) {
        const deduct = Math.min(debt.remaining_debt, remainingToAllocate);
        const newRemaining = Math.max(0, debt.remaining_debt - deduct);
        const newStatus = newRemaining === 0 ? "PAID" : "PARTIAL";

        await window.electronAPI.run(
          "UPDATE customer_debts SET remaining_debt = ?, status = ?, updated_at = ? WHERE id = ?",
          [newRemaining, newStatus, createdAt, debtId]
        );
      }
    } else {
      // Pembayaran umum (FIFO): bayar dari nota terlama yang belum lunas
      const unpaidDebts = await window.electronAPI.query(
        `SELECT * FROM customer_debts 
         WHERE customer_id = ? AND status IN ('UNPAID', 'PARTIAL')
         ORDER BY created_at ASC`,
        [customerId]
      );

      for (const debt of unpaidDebts) {
        if (remainingToAllocate <= 0) break;
        const deduct = Math.min(debt.remaining_debt, remainingToAllocate);
        const newRemaining = Math.max(0, debt.remaining_debt - deduct);
        const newStatus = newRemaining === 0 ? "PAID" : "PARTIAL";

        await window.electronAPI.run(
          "UPDATE customer_debts SET remaining_debt = ?, status = ?, updated_at = ? WHERE id = ?",
          [newRemaining, newStatus, createdAt, debt.id]
        );

        remainingToAllocate -= deduct;
      }
    }

    await window.electronAPI.run("COMMIT");

    // Ambil sisa total kasbon pelanggan sekarang
    const updatedCustomer = await getCustomerById(customerId);

    return {
      success: true,
      paymentId: paymentRecordId,
      remainingTotalDebt: updatedCustomer?.total_debt || 0,
      customer: updatedCustomer,
    };
  } catch (error) {
    await window.electronAPI.run("ROLLBACK");
    console.error("Error paying debt:", error);
    return { success: false, error: error.message };
  }
}

// ─── GET DEBT PAYMENTS (RIWAYAT PEMBAYARAN KASBON) ─────────────────────────────
export async function getDebtPayments(customerId = null) {
  try {
    let sql = `
      SELECT dp.*, c.name AS customer_name, cd.invoice_no
      FROM debt_payments dp
      JOIN customers c ON c.id = dp.customer_id
      LEFT JOIN customer_debts cd ON cd.id = dp.debt_id
    `;
    const params = [];
    if (customerId) {
      sql += ` WHERE dp.customer_id = ?`;
      params.push(customerId);
    }
    sql += ` ORDER BY dp.created_at DESC LIMIT 200`;
    return await window.electronAPI.query(sql, params);
  } catch (error) {
    console.error("Error getting debt payments:", error);
    return [];
  }
}

// ─── GET DEBT SUMMARY (RINGKASAN BUKU KASBON) ──────────────────────────────────
export async function getDebtSummary() {
  try {
    const [outstanding] = await window.electronAPI.query(`
      SELECT 
        COALESCE(SUM(remaining_debt), 0) AS total_unpaid_debt,
        COUNT(DISTINCT customer_id) AS debtors_count
      FROM customer_debts
      WHERE status IN ('UNPAID', 'PARTIAL')
    `);

    // Total bayar kasbon bulan ini
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const [paidThisMonth] = await window.electronAPI.query(`
      SELECT COALESCE(SUM(payment_amount), 0) AS total_paid
      FROM debt_payments
      WHERE strftime('%Y-%m', created_at) = ?
    `, [currentYearMonth]);

    return {
      totalUnpaidDebt: outstanding?.total_unpaid_debt || 0,
      debtorsCount: outstanding?.debtors_count || 0,
      paidThisMonth: paidThisMonth?.total_paid || 0,
    };
  } catch (error) {
    console.error("Error getting debt summary:", error);
    return {
      totalUnpaidDebt: 0,
      debtorsCount: 0,
      paidThisMonth: 0,
    };
  }
}
