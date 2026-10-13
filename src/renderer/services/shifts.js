// ─── SHIFTS & CASH MANAGEMENT SERVICE (KAS HARIAN & SHIFT KASIR) ─────────────
import { getLocalDatetimeStr } from "./transactions";

/**
 * Mengambil shift kasir yang sedang aktif / buka saat ini.
 * Jika tidak ada shift yang buka, return null.
 */
export async function getCurrentShift() {
  try {
    const rows = await window.electronAPI.query(
      `SELECT * FROM cash_shifts WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1`
    );
    if (!rows || rows.length === 0) return null;
    const shift = rows[0];

    // Hitung ringkasan live untuk shift ini
    const summary = await calculateShiftSummary(shift.id);
    return {
      ...shift,
      summary,
    };
  } catch (error) {
    console.error("Error getting current shift:", error);
    return null;
  }
}

/**
 * Menghitung rekapitulasi angka kas & penjualan untuk sebuah shift
 */
export async function calculateShiftSummary(shiftId) {
  try {
    const [shift] = await window.electronAPI.query(
      `SELECT * FROM cash_shifts WHERE id = ?`,
      [shiftId]
    );
    if (!shift) return null;

    // 1. Penjualan Tunai (Cash Sales)
    const [cashTx] = await window.electronAPI.query(
      `SELECT 
         COALESCE(SUM(total_amount), 0) AS total_cash,
         COUNT(id) AS count_cash
       FROM transactions 
       WHERE status = 'COMPLETED' 
         AND payment_method = 'cash' 
         AND (shift_id = ? OR (shift_id IS NULL AND created_at >= ? AND (created_at <= ? OR ? IS NULL)))`,
      [shiftId, shift.opened_at, shift.closed_at, shift.closed_at]
    );

    // 2. Penjualan Non-Tunai (QRIS, Debit, Kasbon)
    const [nonCashTx] = await window.electronAPI.query(
      `SELECT 
         COALESCE(SUM(total_amount), 0) AS total_non_cash,
         COUNT(id) AS count_non_cash
       FROM transactions 
       WHERE status = 'COMPLETED' 
         AND payment_method != 'cash' 
         AND (shift_id = ? OR (shift_id IS NULL AND created_at >= ? AND (created_at <= ? OR ? IS NULL)))`,
      [shiftId, shift.opened_at, shift.closed_at, shift.closed_at]
    );

    // 3. Pelunasan Kasbon Tunai (Uang pembayaran utang yang masuk ke kasir selama shift)
    const [debtColl] = await window.electronAPI.query(
      `SELECT 
         COALESCE(SUM(payment_amount), 0) AS total_debt_collected,
         COUNT(id) AS count_payments
       FROM debt_payments
       WHERE payment_method = 'cash'
         AND (shift_id = ? OR (shift_id IS NULL AND created_at >= ? AND (created_at <= ? OR ? IS NULL)))`,
      [shiftId, shift.opened_at, shift.closed_at, shift.closed_at]
    );

    // 4. Kas Masuk Laci Lainnya (Kas Masuk Manual / Tambahan Modal)
    const [cashIn] = await window.electronAPI.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_in 
       FROM cash_movements 
       WHERE shift_id = ? AND type = 'IN'`,
      [shiftId]
    );

    // 5. Kas Keluar Laci (Biaya Darurat / Ambil Kasir / Galon / Plastik)
    const [cashOut] = await window.electronAPI.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_out 
       FROM cash_movements 
       WHERE shift_id = ? AND type = 'OUT'`,
      [shiftId]
    );

    // 6. Transaksi Void / Batal Tunai
    const [voidTx] = await window.electronAPI.query(
      `SELECT 
         COALESCE(SUM(total_amount), 0) AS total_void_cash,
         COUNT(id) AS count_void
       FROM transactions 
       WHERE status = 'CANCELLED' 
         AND payment_method = 'cash' 
         AND (shift_id = ? OR (shift_id IS NULL AND created_at >= ? AND (created_at <= ? OR ? IS NULL)))`,
      [shiftId, shift.opened_at, shift.closed_at, shift.closed_at]
    );

    const startingCash = Number(shift.starting_cash || 0);
    const cashSales = Number(cashTx?.total_cash || 0);
    const nonCashSales = Number(nonCashTx?.total_non_cash || 0);
    const debtCollected = Number(debtColl?.total_debt_collected || 0);
    const totalCashIn = Number(cashIn?.total_in || 0);
    const totalCashOut = Number(cashOut?.total_out || 0);
    const totalVoidCash = Number(voidTx?.total_void_cash || 0);

    // Uang fisik yang seharusnya ada di laci kasir saat ini
    const expectedCash = startingCash + cashSales + debtCollected + totalCashIn - totalCashOut;

    return {
      startingCash,
      cashSales,
      cashTxCount: cashTx?.count_cash || 0,
      nonCashSales,
      nonCashTxCount: nonCashTx?.count_non_cash || 0,
      transactionCount: (cashTx?.count_cash || 0) + (nonCashTx?.count_non_cash || 0),
      totalSales: cashSales + nonCashSales,
      debtCollected,
      totalCashIn,
      totalCashOut,
      totalVoidCash,
      voidTxCount: voidTx?.count_void || 0,
      expectedCash,
    };
  } catch (error) {
    console.error("Error calculating shift summary:", error);
    return null;
  }
}

/**
 * Membuka shift kasir baru
 */
export async function openShift({ cashier_name = "Kasir", starting_cash = 0, notes = "" }) {
  try {
    // Pastikan tidak ada shift OPEN sebelumnya
    const existing = await getCurrentShift();
    if (existing) {
      throw new Error(`Masih ada shift yang aktif (#${existing.id} dibuka oleh ${existing.cashier_name}). Silakan tutup shift tersebut terlebih dahulu.`);
    }

    const nowStr = getLocalDatetimeStr();
    const result = await window.electronAPI.run(
      `INSERT INTO cash_shifts 
         (cashier_name, opened_at, starting_cash, status, notes)
       VALUES (?, ?, ?, 'OPEN', ?)`,
      [cashier_name.trim() || "Kasir", nowStr, Math.max(0, Number(starting_cash) || 0), notes?.trim() || ""]
    );

    return {
      success: true,
      shiftId: result.lastID,
    };
  } catch (error) {
    console.error("Error opening shift:", error);
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Menutup shift kasir & mencatat hasil hitung fisik uang di laci
 */
export async function closeShift({ shift_id, actual_cash, notes = "" }) {
  try {
    const summary = await calculateShiftSummary(shift_id);
    if (!summary) throw new Error("Data shift tidak ditemukan.");

    const actual = Math.max(0, Number(actual_cash) || 0);
    const expected = summary.expectedCash;
    const difference = actual - expected; // 0 = Pas, >0 = Lebih, <0 = Kurang
    const nowStr = getLocalDatetimeStr();

    await window.electronAPI.run(
      `UPDATE cash_shifts
       SET closed_at = ?,
           expected_cash = ?,
           actual_cash = ?,
           difference = ?,
           cash_sales = ?,
           non_cash_sales = ?,
           debt_collected = ?,
           cash_in = ?,
           cash_out = ?,
           status = 'CLOSED',
           notes = ?
       WHERE id = ?`,
      [
        nowStr,
        expected,
        actual,
        difference,
        summary.cashSales,
        summary.nonCashSales,
        summary.debtCollected,
        summary.totalCashIn,
        summary.totalCashOut,
        notes?.trim() || "",
        shift_id,
      ]
    );

    const [closedShift] = await window.electronAPI.query(
      `SELECT * FROM cash_shifts WHERE id = ?`,
      [shift_id]
    );

    return {
      success: true,
      shift: closedShift,
      summary: {
        ...summary,
        actualCash: actual,
        difference,
      },
    };
  } catch (error) {
    console.error("Error closing shift:", error);
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Mencatat uang masuk / keluar laci (Petty cash / Ambil kasir)
 */
export async function recordCashMovement({ shift_id, type, amount, reason }) {
  try {
    const cleanAmount = Math.max(0, Number(amount) || 0);
    if (cleanAmount <= 0) throw new Error("Nominal uang harus lebih dari Rp 0");
    if (!reason?.trim()) throw new Error("Keterangan keperluan wajib diisi");

    const nowStr = getLocalDatetimeStr();
    const res = await window.electronAPI.run(
      `INSERT INTO cash_movements (shift_id, type, amount, reason, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [shift_id, type === "IN" ? "IN" : "OUT", cleanAmount, reason.trim(), nowStr]
    );

    return { success: true, id: res.lastID };
  } catch (error) {
    console.error("Error recording cash movement:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Mengambil riwayat mutasi uang laci untuk suatu shift
 */
export async function getCashMovements(shiftId) {
  try {
    return await window.electronAPI.query(
      `SELECT * FROM cash_movements WHERE shift_id = ? ORDER BY created_at ASC`,
      [shiftId]
    );
  } catch (error) {
    console.error("Error getting cash movements:", error);
    return [];
  }
}

/**
 * Mengambil daftar riwayat shift terdahulu
 */
export async function getShiftHistory(limit = 50) {
  try {
    return await window.electronAPI.query(
      `SELECT * FROM cash_shifts ORDER BY opened_at DESC LIMIT ?`,
      [limit]
    );
  } catch (error) {
    console.error("Error getting shift history:", error);
    return [];
  }
}

/**
 * Mengambil detail shift berdasarkan ID
 */
export async function getShiftById(id) {
  try {
    const [shift] = await window.electronAPI.query(
      `SELECT * FROM cash_shifts WHERE id = ?`,
      [id]
    );
    if (!shift) return null;

    const movements = await getCashMovements(id);
    return { ...shift, movements };
  } catch (error) {
    console.error("Error getting shift by id:", error);
    return null;
  }
}

/**
 * Membatalkan/menghapus shift (HANYA BOLEH jika belum ada transaksi di dalamnya!)
 * Mengatasi celah BUG 5.2 dari audit Flutter POS (Mencegah Orphaned Transactions).
 */
export async function cancelOrDeleteShift(shiftId) {
  try {
    const [txCheck] = await window.electronAPI.query(
      "SELECT COUNT(id) AS count FROM transactions WHERE shift_id = ?",
      [shiftId]
    );
    if (txCheck && txCheck.count > 0) {
      throw new Error(`Shift #${shiftId} tidak dapat dibatalkan karena sudah memiliki ${txCheck.count} transaksi belanja! Silakan gunakan menu "Tutup Kasir & Hitung Laci".`);
    }

    const [debtCheck] = await window.electronAPI.query(
      "SELECT COUNT(id) AS count FROM debt_payments WHERE shift_id = ?",
      [shiftId]
    );
    if (debtCheck && debtCheck.count > 0) {
      throw new Error(`Shift #${shiftId} tidak dapat dibatalkan karena sudah memiliki ${debtCheck.count} penerimaan kasbon! Silakan gunakan menu "Tutup Kasir & Hitung Laci".`);
    }

    await window.electronAPI.run("DELETE FROM cash_movements WHERE shift_id = ?", [shiftId]);
    await window.electronAPI.run("DELETE FROM cash_shifts WHERE id = ?", [shiftId]);
    return { success: true };
  } catch (err) {
    console.error("Gagal membatalkan shift:", err);
    return { success: false, message: err.message };
  }
}
