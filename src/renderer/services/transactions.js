// Fungsi untuk membuat transaksi baru
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

  // Generate nomor invoice: INV-20260223-001
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  const invoiceNo = `INV-${year}${month}${day}-${random}`;

  try {
    // Mulai transaksi database
    await window.electronAPI.run("BEGIN TRANSACTION");

    // Insert ke tabel transactions
    const transactionSql = `
      INSERT INTO transactions (
        invoice_no, subtotal, discount, total_amount, 
        payment_amount, change_amount, payment_method, 
        customer_name, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const transactionParams = [
      invoiceNo,
      subtotal,
      discount,
      total,
      payment,
      change,
      paymentMethod,
      customerName || "",
      notes || "",
    ];

    const transactionResult = await window.electronAPI.run(
      transactionSql,
      transactionParams,
    );
    const transactionId = transactionResult.lastID;

    // Insert ke tabel transaction_items
    for (const item of items) {
      const itemSql = `
        INSERT INTO transaction_items (
          transaction_id, product_id, product_name, 
          quantity, unit, price_per_unit, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const itemParams = [
        transactionId,
        item.product_id,
        item.name,
        item.quantity,
        item.unit,
        item.price,
        item.subtotal,
      ];

      await window.electronAPI.run(itemSql, itemParams);

      // Update stok produk dengan pengamanan stok negatif
      const updateStockSql = `
        UPDATE products 
        SET stock = stock - ? 
        WHERE id = ? AND stock >= ?
      `;
      const updateResult = await window.electronAPI.run(updateStockSql, [
        item.quantity,
        item.product_id,
        item.quantity,
      ]);

      if (updateResult.changes === 0) {
        throw new Error(`Stok tidak mencukupi untuk: ${item.name}`);
      }

      // Catat riwayat stok (audit trail)
      const historySql = `
        INSERT INTO stock_history (product_id, type, quantity, unit, reference_id)
        VALUES (?, 'sale', ?, ?, ?)
      `;
      await window.electronAPI.run(historySql, [
        item.product_id,
        -item.quantity, // Minus karena stok keluar
        item.unit,
        invoiceNo,
      ]);
    }

    // Commit transaksi
    await window.electronAPI.run("COMMIT");

    return {
      success: true,
      transactionId,
      invoiceNo,
    };
  } catch (error) {
    // Rollback jika error
    await window.electronAPI.run("ROLLBACK");
    console.error("Error creating transaction:", error);
    return { success: false, error: error.message };
  }
}

// Fungsi untuk mengambil riwayat transaksi
export async function getTransactions(limit = 50) {
  try {
    const sql = `
      SELECT * FROM transactions 
      ORDER BY created_at DESC 
      LIMIT ?
    `;
    const result = await window.electronAPI.query(sql, [limit]);
    return result;
  } catch (error) {
    console.error("Error getting transactions:", error);
    return [];
  }
}

// Fungsi untuk mengambil detail transaksi
export async function getTransactionDetail(transactionId) {
  try {
    // Ambil data transaksi
    const transactionSql = "SELECT * FROM transactions WHERE id = ?";
    const transaction = await window.electronAPI.query(transactionSql, [
      transactionId,
    ]);

    // Ambil item-item transaksi
    const itemsSql = "SELECT * FROM transaction_items WHERE transaction_id = ?";
    const items = await window.electronAPI.query(itemsSql, [transactionId]);

    return {
      transaction: transaction[0],
      items,
    };
  } catch (error) {
    console.error("Error getting transaction detail:", error);
    return null;
  }
}
