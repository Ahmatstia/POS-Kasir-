// ─── INVENTORY SERVICE ───────────────────────────────────────────────────────

// Get all products with their TOTAL aggregated stock across all batches
export async function getInventorySummary() {
  try {
    const sql = `
      SELECT 
        p.id, p.name, p.category_id, p.min_stock, p.min_stock_kg, p.sell_per_unit,
        p.pcs_per_pack, p.pack_per_dus,
        p.price_pcs, p.price_pack, p.price_dus, p.price_kg,
        c.name as category_name, c.color as category_color,
        COALESCE(SUM(s.quantity), 0) as stock,
        COALESCE(SUM(s.qty_kg), 0) as stock_kg
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stocks s ON s.product_id = p.id AND s.is_active = 1
      WHERE p.is_active = 1
      GROUP BY p.id
      ORDER BY p.name ASC
    `;
    return await window.electronAPI.query(sql);
  } catch (error) {
    console.error("Error getting inventory:", error);
    return [];
  }
}

// Get all stock batches for one product
export async function getProductBatches(productId) {
  try {
    const sql = `
      SELECT * FROM stocks
      WHERE product_id = ? AND is_active = 1
      ORDER BY created_at ASC
    `;
    return await window.electronAPI.query(sql, [productId]);
  } catch (error) {
    console.error("Error getting batches:", error);
    return [];
  }
}

// Get products with low stock (below min_stock)
export async function getLowStockProducts() {
  try {
    const sql = `
      SELECT 
        p.id, p.name, p.min_stock, p.min_stock_kg, p.sell_per_unit,
        COALESCE(SUM(s.quantity), 0) as stock,
        COALESCE(SUM(s.qty_kg), 0) as stock_kg,
        c.name as category_name, c.color as category_color
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stocks s ON s.product_id = p.id AND s.is_active = 1
      WHERE p.is_active = 1
      GROUP BY p.id
      HAVING (p.sell_per_unit != 'kg' AND stock <= p.min_stock) 
          OR (p.sell_per_unit = 'kg' AND stock_kg <= p.min_stock_kg)
      ORDER BY stock ASC, stock_kg ASC
    `;
    return await window.electronAPI.query(sql);
  } catch (error) {
    console.error("Error getting low stock:", error);
    return [];
  }
}

// Add stock (Stock In) — creates a new batch or adds to existing
export async function addStock(productId, {
  qty_dus = 0,
  qty_pack = 0,
  qty_pcs = 0,
  qty_kg = 0,
  purchase_price = 0,
  expiry_date = null,
  batch_code = null,
  notes = ""
}, product) {
  try {
    const finalPurchasePrice = 0;

    const pcsPerPack = product?.pcs_per_pack || 1;
    const packPerDus = product?.pack_per_dus || 1;

    // Convert all to Pcs (base unit), kg is separate
    const totalPcs = (Number(qty_dus) * packPerDus * pcsPerPack)
                   + (Number(qty_pack) * pcsPerPack)
                   + Number(qty_pcs);
    const totalKg = Number(qty_kg);

    if (totalPcs <= 0 && totalKg <= 0) return { success: false, error: "Jumlah stok harus lebih dari 0" };

    // Get current total stock
    const [beforeRow] = await window.electronAPI.query(
      "SELECT COALESCE(SUM(quantity), 0) as total, COALESCE(SUM(qty_kg), 0) as total_kg FROM stocks WHERE product_id = ? AND is_active = 1",
      [productId]
    );
    const stockBefore = beforeRow?.total || 0;
    const stockKgBefore = beforeRow?.total_kg || 0;

    await window.electronAPI.run("BEGIN TRANSACTION");

    // Generate batch code if not provided
    const date = new Date();
    const autoCode = batch_code?.trim() || 
      `BATCH-${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;

    // Create new batch
    const stockResult = await window.electronAPI.run(
      `INSERT INTO stocks (product_id, batch_code, quantity, qty_kg, purchase_price, expiry_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [productId, autoCode, totalPcs, totalKg, finalPurchasePrice, expiry_date || null, notes]
    );
    const stockId = stockResult.lastID;

    // Log the movement
    const isKg = totalKg > 0;
    const finalStockBefore = isKg ? stockKgBefore : stockBefore;
    const finalStockAfter = isKg ? (stockKgBefore + totalKg) : (stockBefore + totalPcs);

    await window.electronAPI.run(
      `INSERT INTO inventory_log 
         (product_id, stock_id, type, quantity_input, unit_input, quantity_pcs, quantity_kg,
          stock_before, stock_after, purchase_price, batch_code, expiry_date, notes)
       VALUES (?, ?, 'IN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [productId, stockId, isKg ? totalKg : totalPcs, isKg ? 'kg' : 'pcs', totalPcs, totalKg, finalStockBefore, finalStockAfter,
       finalPurchasePrice, autoCode, expiry_date || null, notes]
    );

    await window.electronAPI.run("COMMIT");
    return { success: true, batchCode: autoCode, totalPcs };
  } catch (error) {
    await window.electronAPI.run("ROLLBACK");
    console.error("Error adding stock:", error);
    return { success: false, error: error.message };
  }
}

// Adjust stock manually (correction)
export async function adjustStock(productId, newTotalPcs, reason = "Koreksi manual", purchasePrice = 0) {
  try {
    const finalPurchasePrice = 0;

    // Get current total
    const [beforeRow] = await window.electronAPI.query(
      "SELECT COALESCE(SUM(quantity), 0) as total FROM stocks WHERE product_id = ? AND is_active = 1",
      [productId]
    );
    const currentTotal = beforeRow?.total || 0;
    const diff = newTotalPcs - currentTotal;
    if (diff === 0) return { success: true };

    await window.electronAPI.run("BEGIN TRANSACTION");

    if (diff > 0) {
      // Add a new batch for positive adjustment
      const stockResult = await window.electronAPI.run(
        "INSERT INTO stocks (product_id, batch_code, quantity, purchase_price, notes) VALUES (?, 'KOREKSI', ?, ?, ?)",
        [productId, diff, finalPurchasePrice, reason]
      );
      await window.electronAPI.run(
        `INSERT INTO inventory_log (product_id, stock_id, type, quantity_input, unit_input, quantity_pcs, stock_before, stock_after, purchase_price, notes)
         VALUES (?, ?, 'ADJUSTMENT', ?, 'pcs', ?, ?, ?, ?, ?)`,
        [productId, stockResult.lastID, diff, diff, currentTotal, newTotalPcs, finalPurchasePrice, reason]
      );
    } else {
      // Reduce from existing batches (FIFO)
      let toRemove = Math.abs(diff);
      const batches = await window.electronAPI.query(
        "SELECT * FROM stocks WHERE product_id = ? AND is_active = 1 ORDER BY created_at ASC",
        [productId]
      );
      for (const batch of batches) {
        if (toRemove <= 0) break;
        const remove = Math.min(batch.quantity, toRemove);
        const newQty = batch.quantity - remove;
        // 1. Update quantity first
        await window.electronAPI.run(
          "UPDATE stocks SET quantity = ?, is_active = ? WHERE id = ?",
          [newQty, newQty > 0 ? 1 : 0, batch.id]
        );
        // 2. Try to update updated_at (resilient)
        try {
          await window.electronAPI.run(
            "UPDATE stocks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [batch.id]
          );
        } catch (e) {
          console.warn("⚠️ updated_at column missing in stocks table");
        }
        toRemove -= remove;
      }
      await window.electronAPI.run(
        `INSERT INTO inventory_log (product_id, type, quantity_input, unit_input, quantity_pcs, stock_before, stock_after, notes)
         VALUES (?, 'ADJUSTMENT', ?, 'pcs', ?, ?, ?, ?)`,
        [productId, diff, diff, currentTotal, newTotalPcs, reason]
      );
    }

    await window.electronAPI.run("COMMIT");
    return { success: true };
  } catch (error) {
    await window.electronAPI.run("ROLLBACK");
    console.error("Error adjusting stock:", error);
    return { success: false, error: error.message };
  }
}

// Get inventory log for a product or all
export async function getInventoryLog(productId = null, limit = 100) {
  try {
    const sql = productId
      ? `SELECT il.*, p.name as product_name FROM inventory_log il
         JOIN products p ON p.id = il.product_id
         WHERE il.product_id = ? ORDER BY il.created_at DESC LIMIT ?`
      : `SELECT il.*, p.name as product_name FROM inventory_log il
         JOIN products p ON p.id = il.product_id
         ORDER BY il.created_at DESC LIMIT ?`;
    const params = productId ? [productId, limit] : [limit];
    return await window.electronAPI.query(sql, params);
  } catch (error) {
    console.error("Error getting inventory log:", error);
    return [];
  }
}

// Get total stock for one product (used by cashier)
export async function getProductStock(productId) {
  try {
    const [row] = await window.electronAPI.query(
      "SELECT COALESCE(SUM(quantity), 0) as total FROM stocks WHERE product_id = ? AND is_active = 1",
      [productId]
    );
    return row?.total || 0;
  } catch (error) {
    return 0;
  }
}

// Deduct stock FIFO (used internally by transactions)
export async function deductStockFIFO(productId, quantityPcs, invoiceNo, createdAt = null) {
  let toDeduct = quantityPcs;
  const batches = await window.electronAPI.query(
    "SELECT * FROM stocks WHERE product_id = ? AND is_active = 1 AND quantity > 0 ORDER BY created_at ASC",
    [productId]
  );

  const [beforeRow] = await window.electronAPI.query(
    "SELECT COALESCE(SUM(quantity), 0) as total FROM stocks WHERE product_id = ? AND is_active = 1",
    [productId]
  );
  const stockBefore = beforeRow?.total || 0;

  // Deduction from batches
  for (const batch of batches) {
    if (toDeduct <= 0) break;
    const deduct = Math.min(batch.quantity, toDeduct);
    const newQty = batch.quantity - deduct;
    
    // 1. Update quantity
    await window.electronAPI.run(
      "UPDATE stocks SET quantity = ?, is_active = ? WHERE id = ?",
      [newQty, (newQty > 0 || batch.qty_kg > 0) ? 1 : 0, batch.id]
    );
    // 2. Try to update updated_at (resilient)
    try {
      await window.electronAPI.run(
        "UPDATE stocks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [batch.id]
      );
    } catch (e) {
      console.warn("⚠️ updated_at column missing in stocks table");
    }
    toDeduct -= deduct;
  }

  const avgPurchasePrice = 0;

  const stockAfter = stockBefore - quantityPcs;
  const logSql = createdAt 
    ? `INSERT INTO inventory_log (product_id, type, quantity_input, unit_input, quantity_pcs, stock_before, stock_after, purchase_price, reference_id, created_at)
       VALUES (?, 'SALE', ?, 'pcs', ?, ?, ?, ?, ?, ?)`
    : `INSERT INTO inventory_log (product_id, type, quantity_input, unit_input, quantity_pcs, stock_before, stock_after, purchase_price, reference_id)
       VALUES (?, 'SALE', ?, 'pcs', ?, ?, ?, ?, ?)`;
  
  const logParams = createdAt
    ? [productId, quantityPcs, quantityPcs, stockBefore, stockAfter, avgPurchasePrice, invoiceNo, createdAt]
    : [productId, quantityPcs, quantityPcs, stockBefore, stockAfter, avgPurchasePrice, invoiceNo];

  await window.electronAPI.run(logSql, logParams);

  if (toDeduct > 0) throw new Error("Stok tidak mencukupi");
}

// Adjust stock manually (correction) specifically for Kg
export async function adjustStockKg(productId, newTotalKg, reason = "Koreksi manual", purchasePrice = 0) {
  try {
    const finalPurchasePrice = 0;

    const [beforeRow] = await window.electronAPI.query(
      "SELECT COALESCE(SUM(qty_kg), 0) as total FROM stocks WHERE product_id = ? AND is_active = 1",
      [productId]
    );
    const currentTotal = beforeRow?.total || 0;
    const diff = newTotalKg - currentTotal;
    if (diff === 0) return { success: true };

    await window.electronAPI.run("BEGIN TRANSACTION");

    if (diff > 0) {
      const stockResult = await window.electronAPI.run(
        "INSERT INTO stocks (product_id, batch_code, qty_kg, quantity, purchase_price, notes) VALUES (?, 'KOREKSI', ?, 0, ?, ?)",
        [productId, diff, finalPurchasePrice, reason]
      );
      await window.electronAPI.run(
        `INSERT INTO inventory_log (product_id, stock_id, type, quantity_input, unit_input, quantity_pcs, quantity_kg, stock_before, stock_after, purchase_price, notes)
         VALUES (?, ?, 'ADJUSTMENT', ?, 'kg', 0, ?, ?, ?, ?, ?)`,
        [productId, stockResult.lastID, diff, diff, currentTotal, newTotalKg, finalPurchasePrice, reason]
      );
    } else {
      let toRemove = Math.abs(diff);
      const batches = await window.electronAPI.query(
        "SELECT * FROM stocks WHERE product_id = ? AND is_active = 1 AND qty_kg > 0 ORDER BY created_at ASC",
        [productId]
      );
      for (const batch of batches) {
        if (toRemove <= 0) break;
        const remove = Math.min(batch.qty_kg, toRemove);
        const newQtyKg = batch.qty_kg - remove;
        await window.electronAPI.run(
          "UPDATE stocks SET qty_kg = ?, is_active = ? WHERE id = ?",
          [newQtyKg, (newQtyKg > 0 || batch.quantity > 0) ? 1 : 0, batch.id]
        );
        try {
          await window.electronAPI.run("UPDATE stocks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [batch.id]);
        } catch (e) {
          /* ignore */
        }
        toRemove -= remove;
      }
      await window.electronAPI.run(
        `INSERT INTO inventory_log (product_id, type, quantity_input, unit_input, quantity_pcs, quantity_kg, stock_before, stock_after, notes)
         VALUES (?, 'ADJUSTMENT', ?, 'kg', 0, ?, ?, ?, ?)`,
        [productId, diff, diff, currentTotal, newTotalKg, reason]
      );
    }

    await window.electronAPI.run("COMMIT");
    return { success: true };
  } catch (error) {
    await window.electronAPI.run("ROLLBACK");
    return { success: false, error: error.message };
  }
}

// Deduct stock FIFO specifically for Kg (used by transactions)
export async function deductStockFIFOKg(productId, quantityKg, invoiceNo, createdAt = null) {
  let toDeduct = quantityKg;
  const batches = await window.electronAPI.query(
    "SELECT * FROM stocks WHERE product_id = ? AND is_active = 1 AND qty_kg > 0 ORDER BY created_at ASC",
    [productId]
  );

  const [beforeRow] = await window.electronAPI.query(
    "SELECT COALESCE(SUM(qty_kg), 0) as total FROM stocks WHERE product_id = ? AND is_active = 1",
    [productId]
  );
  const stockBefore = beforeRow?.total || 0;

  // Deduction from batches
  for (const batch of batches) {
    if (toDeduct <= 0) break;
    const deduct = Math.min(batch.qty_kg, toDeduct);
    const newQtyKg = batch.qty_kg - deduct;

    // Update quantity
    await window.electronAPI.run(
      "UPDATE stocks SET qty_kg = ?, is_active = ? WHERE id = ?",
      [newQtyKg, (newQtyKg > 0 || batch.quantity > 0) ? 1 : 0, batch.id]
    );
    try {
      await window.electronAPI.run("UPDATE stocks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [batch.id]);
    } catch (e) {
      /* ignore */
    }
    toDeduct -= deduct;
  }

  const avgPurchasePrice = 0;

  const stockAfter = stockBefore - quantityKg;
  const logSql = createdAt
    ? `INSERT INTO inventory_log (product_id, type, quantity_input, unit_input, quantity_pcs, quantity_kg, stock_before, stock_after, purchase_price, reference_id, created_at)
       VALUES (?, 'SALE', ?, 'kg', 0, ?, ?, ?, ?, ?, ?)`
    : `INSERT INTO inventory_log (product_id, type, quantity_input, unit_input, quantity_pcs, quantity_kg, stock_before, stock_after, purchase_price, reference_id)
       VALUES (?, 'SALE', ?, 'kg', 0, ?, ?, ?, ?, ?)`;
  
  const logParams = createdAt
    ? [productId, quantityKg, quantityKg, stockBefore, stockAfter, avgPurchasePrice, invoiceNo, createdAt]
    : [productId, quantityKg, quantityKg, stockBefore, stockAfter, avgPurchasePrice, invoiceNo];

  await window.electronAPI.run(logSql, logParams);

  if (toDeduct > 0.001) throw new Error("Stok Kg tidak mencukupi"); // Use small margin for floats
}
