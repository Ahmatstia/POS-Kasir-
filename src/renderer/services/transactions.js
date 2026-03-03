import { deductStockFIFO } from "./inventory";

// ─── TRANSACTIONS SERVICE ────────────────────────────────────────────────────

export async function createTransaction(transactionData) {
  const {
    items,
    subtotal,
    discount,
    total,
    payment,
    change,
    paymentMethod,
    customerName,
    notes,
  } = transactionData;

  // Generate invoice number
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  const invoiceNo = `INV-${y}${m}${d}-${rand}`;

  try {
    await window.electronAPI.run("BEGIN TRANSACTION");

    // Insert transaction header
    const txResult = await window.electronAPI.run(
      `INSERT INTO transactions
         (invoice_no, subtotal, discount, total_amount, payment_amount, change_amount, payment_method, customer_name, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED')`,
      [invoiceNo, subtotal, discount || 0, total, payment, change, paymentMethod, customerName || "", notes || ""]
    );
    const transactionId = txResult.lastID;

    // Process each item
    for (const item of items) {
      // Insert transaction item
      await window.electronAPI.run(
        `INSERT INTO transaction_items
           (transaction_id, product_id, product_name, quantity, unit, price_per_unit, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [transactionId, item.product_id, item.name, item.quantity, item.unit, item.price, item.subtotal]
      );

      // Deduct stock (FIFO) only for real products (not manual items)
      if (item.product_id) {
        // Calculate pcs to deduct based on unit
        const [productInfo] = await window.electronAPI.query(
          "SELECT pcs_per_pack, pack_per_dus FROM products WHERE id = ?",
          [item.product_id]
        );
        const pcsPerPack = productInfo?.pcs_per_pack || 1;
        const packPerDus = productInfo?.pack_per_dus || 1;

        let pcsToDeduct = item.quantity;
        if (item.unit === "pack") pcsToDeduct = item.quantity * pcsPerPack;
        else if (item.unit === "dus") pcsToDeduct = item.quantity * packPerDus * pcsPerPack;

        // FIFO deduction from stocks table
        await deductStockFIFO(item.product_id, pcsToDeduct, invoiceNo);
      }
    }

    await window.electronAPI.run("COMMIT");
    return { success: true, transactionId, invoiceNo };
  } catch (error) {
    await window.electronAPI.run("ROLLBACK");
    console.error("Error creating transaction:", error);
    return { success: false, error: error.message };
  }
}

// Get transaction list
export async function getTransactions(limit = 100) {
  try {
    return await window.electronAPI.query(
      "SELECT * FROM transactions ORDER BY created_at DESC LIMIT ?",
      [limit]
    );
  } catch (error) {
    console.error("Error getting transactions:", error);
    return [];
  }
}

// Get transaction detail with items
export async function getTransactionDetail(transactionId) {
  try {
    const [transaction] = await window.electronAPI.query(
      "SELECT * FROM transactions WHERE id = ?",
      [transactionId]
    );
    const items = await window.electronAPI.query(
      "SELECT * FROM transaction_items WHERE transaction_id = ?",
      [transactionId]
    );
    return { transaction, items };
  } catch (error) {
    console.error("Error getting transaction detail:", error);
    return null;
  }
}

// Cancel transaction (restore stock)
export async function cancelTransaction(transactionId) {
  try {
    await window.electronAPI.run("BEGIN TRANSACTION");

    // Get items
    const items = await window.electronAPI.query(
      "SELECT * FROM transaction_items WHERE transaction_id = ?",
      [transactionId]
    );
    const [tx] = await window.electronAPI.query(
      "SELECT invoice_no FROM transactions WHERE id = ?",
      [transactionId]
    );

    for (const item of items) {
      if (!item.product_id) continue;
      const [productInfo] = await window.electronAPI.query(
        "SELECT pcs_per_pack, pack_per_dus FROM products WHERE id = ?",
        [item.product_id]
      );
      const pcsPerPack = productInfo?.pcs_per_pack || 1;
      const packPerDus = productInfo?.pack_per_dus || 1;
      let pcsToReturn = item.quantity;
      if (item.unit === "pack") pcsToReturn = item.quantity * pcsPerPack;
      else if (item.unit === "dus") pcsToReturn = item.quantity * packPerDus * pcsPerPack;

      // Add stock back (create a RETURN batch)
      await window.electronAPI.run(
        "INSERT INTO stocks (product_id, batch_code, quantity, notes) VALUES (?, ?, ?, ?)",
        [item.product_id, `RETURN-${tx.invoice_no}`, pcsToReturn, `Retur transaksi ${tx.invoice_no}`]
      );
      await window.electronAPI.run(
        `INSERT INTO inventory_log (product_id, type, quantity_input, unit_input, quantity_pcs, reference_id, notes)
         VALUES (?, 'RETURN', ?, ?, ?, ?, ?)`,
        [item.product_id, pcsToReturn, item.unit, pcsToReturn, tx.invoice_no, `Retur transaksi ${tx.invoice_no}`]
      );
    }

    await window.electronAPI.run(
      "UPDATE transactions SET status = 'CANCELLED' WHERE id = ?",
      [transactionId]
    );

    await window.electronAPI.run("COMMIT");
    return { success: true };
  } catch (error) {
    await window.electronAPI.run("ROLLBACK");
    console.error("Error cancelling transaction:", error);
    return { success: false, error: error.message };
  }
}
