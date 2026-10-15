import { isPrivacyModeEnabled } from "./settings";
import { getLocalDatetimeStr } from "./transactions";

// ─── INVENTORY SERVICE ───────────────────────────────────────────────────────

// Get all products with their TOTAL aggregated stock across all batches
export async function getInventorySummary() {
  try {
    const sql = `
      SELECT 
        p.id, p.name, p.category_id, p.min_stock, p.min_stock_kg, p.sell_per_unit,
        p.pcs_per_pack, p.pack_per_dus, p.dus_label,
        p.price_pcs, p.price_pack, p.price_dus, p.price_kg, p.price_karung, p.kg_per_karung,
        p.purchase_price,
        c.name as category_name, c.color as category_color,
        COALESCE(SUM(s.quantity), 0) as stock,
        COALESCE(SUM(s.qty_kg), 0) as stock_kg,
        (CASE WHEN (p.price_pcs > 0 OR p.price_pack > 0 OR p.price_dus > 0) THEN 1 ELSE 0 END) as has_unit_price,
        (CASE WHEN (p.price_kg > 0 OR p.price_karung > 0) THEN 1 ELSE 0 END) as has_weight_price
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stocks s ON s.product_id = p.id AND s.is_active = 1
      WHERE p.is_active = 1
      GROUP BY p.id
      ORDER BY p.name ASC
    `;
    const hideCost = await isPrivacyModeEnabled();
    const result = await window.electronAPI.query(sql);
    
    if (hideCost) {
      return result.map(p => ({
        ...p,
        price_pcs: 0, price_pack: 0, price_dus: 0, price_kg: 0, price_karung: 0,
        purchase_price: 0
      }));
    }
    return result;
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

// Get products with low stock (below min_stock) — Hybrid aware
export async function getLowStockProducts() {
  try {
    const sql = `
      SELECT 
        p.id, p.name, p.min_stock, p.min_stock_kg, p.sell_per_unit,
        COALESCE(SUM(s.quantity), 0) as stock,
        COALESCE(SUM(s.qty_kg), 0) as stock_kg,
        c.name as category_name, c.color as category_color,
        (CASE WHEN (p.price_pcs > 0 OR p.price_pack > 0 OR p.price_dus > 0) THEN 1 ELSE 0 END) as has_unit_price,
        (CASE WHEN (p.price_kg > 0 OR p.price_karung > 0) THEN 1 ELSE 0 END) as has_weight_price
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN stocks s ON s.product_id = p.id AND s.is_active = 1
      WHERE p.is_active = 1
      GROUP BY p.id
      HAVING 
        (has_unit_price = 1 AND (stock <= 0 OR (p.min_stock > 0 AND stock <= p.min_stock)))
        OR (has_weight_price = 1 AND (stock_kg <= 0 OR (p.min_stock_kg > 0 AND stock_kg <= p.min_stock_kg)))
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
    const finalPurchasePrice = Number(purchase_price) || 0;

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
    const nowStr = getLocalDatetimeStr();
    const stockResult = await window.electronAPI.run(
      `INSERT INTO stocks (product_id, batch_code, quantity, qty_kg, purchase_price, expiry_date, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [productId, autoCode, totalPcs, totalKg, finalPurchasePrice, expiry_date || null, notes, nowStr, nowStr]
    );
    const stockId = stockResult.lastID;

    // Log the movement
    const isKg = totalKg > 0;
    const finalStockBefore = isKg ? stockKgBefore : stockBefore;
    const finalStockAfter = isKg ? (stockKgBefore + totalKg) : (stockBefore + totalPcs);

    await window.electronAPI.run(
      `INSERT INTO inventory_log 
         (product_id, stock_id, type, quantity_input, unit_input, quantity_pcs, quantity_kg,
          stock_before, stock_after, purchase_price, batch_code, expiry_date, notes, created_at)
       VALUES (?, ?, 'IN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [productId, stockId, isKg ? totalKg : totalPcs, isKg ? 'kg' : 'pcs', totalPcs, totalKg, finalStockBefore, finalStockAfter,
       finalPurchasePrice, autoCode, expiry_date || null, notes, nowStr]
    );

    if (finalPurchasePrice > 0) {
      await window.electronAPI.run(
        "UPDATE products SET purchase_price = ?, updated_at = ? WHERE id = ?",
        [finalPurchasePrice, nowStr, productId]
      );
    }

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
    const finalPurchasePrice = Number(purchasePrice) || 0;
    const nowStr = getLocalDatetimeStr();

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
        "INSERT INTO stocks (product_id, batch_code, quantity, purchase_price, notes, created_at, updated_at) VALUES (?, 'KOREKSI', ?, ?, ?, ?, ?)",
        [productId, diff, finalPurchasePrice, reason, nowStr, nowStr]
      );
      await window.electronAPI.run(
        `INSERT INTO inventory_log (product_id, stock_id, type, quantity_input, unit_input, quantity_pcs, stock_before, stock_after, purchase_price, notes, created_at, updated_at)
         VALUES (?, ?, 'ADJUSTMENT', ?, 'pcs', ?, ?, ?, ?, ?, ?, ?)`,
        [productId, stockResult.lastID, diff, diff, currentTotal, newTotalPcs, finalPurchasePrice, reason, nowStr, nowStr]
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
          "UPDATE stocks SET quantity = ?, is_active = ?, updated_at = ? WHERE id = ?",
          [newQty, (newQty > 0 || batch.qty_kg > 0) ? 1 : 0, nowStr, batch.id]
        );
        toRemove -= remove;
      }
      await window.electronAPI.run(
        `INSERT INTO inventory_log (product_id, type, quantity_input, unit_input, quantity_pcs, stock_before, stock_after, notes, created_at, updated_at)
         VALUES (?, 'ADJUSTMENT', ?, 'pcs', ?, ?, ?, ?, ?, ?)`,
        [productId, diff, diff, currentTotal, newTotalPcs, reason, nowStr, nowStr]
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
export async function deductStockFIFO(productId, quantityPcs, invoiceNo, createdAt = null, allowNegative = false) {
  const nowStr = createdAt || getLocalDatetimeStr();
  const batches = await window.electronAPI.query(
    "SELECT * FROM stocks WHERE product_id = ? AND is_active = 1 AND quantity > 0 ORDER BY created_at ASC",
    [productId]
  );

  const [beforeRow] = await window.electronAPI.query(
    "SELECT COALESCE(SUM(quantity), 0) as total FROM stocks WHERE product_id = ? AND is_active = 1",
    [productId]
  );
  const stockBefore = beforeRow?.total || 0;

  const totalAvailable = batches.reduce((sum, b) => sum + b.quantity, 0);
  if (!allowNegative && totalAvailable < quantityPcs) {
    throw new Error(`Stok tidak mencukupi (tersedia: ${totalAvailable}, dibutuhkan: ${quantityPcs})`);
  }

  // Get base purchase price from products table for fallback if negative or no batch
  const [productRow] = await window.electronAPI.query(
    "SELECT purchase_price FROM products WHERE id = ?",
    [productId]
  );
  const defaultPurchasePrice = productRow?.purchase_price || 0;

  let toDeduct = quantityPcs;
  let totalCost = 0;

  if (batches.length > 0) {
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      if (toDeduct <= 0) break;

      const isLastBatch = (i === batches.length - 1);
      const deduct = (allowNegative && isLastBatch) ? toDeduct : Math.min(batch.quantity, toDeduct);
      const newQty = batch.quantity - deduct;

      await window.electronAPI.run(
        "UPDATE stocks SET quantity = ?, is_active = ?, updated_at = ? WHERE id = ?",
        [newQty, (newQty !== 0 || batch.qty_kg > 0) ? 1 : 0, nowStr, batch.id]
      );

      const actualDeductedFromBatch = Math.max(0, Math.min(batch.quantity, deduct));
      const negativePortion = Math.max(0, deduct - actualDeductedFromBatch);
      totalCost += (actualDeductedFromBatch * (batch.purchase_price || 0)) + (negativePortion * defaultPurchasePrice);

      toDeduct -= deduct;
    }
  } else if (allowNegative) {
    // No active batches exist at all, create an active batch with negative quantity
    const newQty = -quantityPcs;
    await window.electronAPI.run(
      "INSERT INTO stocks (product_id, batch_code, quantity, qty_kg, purchase_price, is_active, notes, created_at, updated_at) VALUES (?, ?, ?, 0, ?, 1, 'Auto-created negative batch', ?, ?)",
      [productId, `MINUS-${invoiceNo}`, newQty, defaultPurchasePrice, nowStr, nowStr]
    );
    totalCost = quantityPcs * defaultPurchasePrice;
    toDeduct = 0;
  }

  const avgPurchasePrice = quantityPcs > 0 ? Math.round(totalCost / quantityPcs) : defaultPurchasePrice;
  const stockAfter = stockBefore - quantityPcs;

  await window.electronAPI.run(
    `INSERT INTO inventory_log 
       (product_id, type, quantity_input, unit_input, quantity_pcs, stock_before, stock_after, purchase_price, reference_id, created_at, updated_at)
     VALUES (?, 'SALE', ?, 'pcs', ?, ?, ?, ?, ?, ?, ?)`,
    [productId, quantityPcs, quantityPcs, stockBefore, stockAfter, avgPurchasePrice, invoiceNo, nowStr, nowStr]
  );

  return totalCost;
}

// Adjust stock manually (correction) specifically for Kg
export async function adjustStockKg(productId, newTotalKg, reason = "Koreksi manual", purchasePrice = 0) {
  try {
    const finalPurchasePrice = Number(purchasePrice) || 0;
    const nowStr = getLocalDatetimeStr();

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
        "INSERT INTO stocks (product_id, batch_code, qty_kg, quantity, purchase_price, notes, created_at, updated_at) VALUES (?, 'KOREKSI', ?, 0, ?, ?, ?, ?)",
        [productId, diff, finalPurchasePrice, reason, nowStr, nowStr]
      );
      await window.electronAPI.run(
        `INSERT INTO inventory_log (product_id, stock_id, type, quantity_input, unit_input, quantity_pcs, quantity_kg, stock_before, stock_after, purchase_price, notes, created_at, updated_at)
         VALUES (?, ?, 'ADJUSTMENT', ?, 'kg', 0, ?, ?, ?, ?, ?, ?, ?)`,
        [productId, stockResult.lastID, diff, diff, currentTotal, newTotalKg, finalPurchasePrice, reason, nowStr, nowStr]
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
        const newQtyKg = Math.round((batch.qty_kg - remove) * 1000) / 1000;
        await window.electronAPI.run(
          "UPDATE stocks SET qty_kg = ?, is_active = ?, updated_at = ? WHERE id = ?",
          [newQtyKg, (newQtyKg > 0 || batch.quantity > 0) ? 1 : 0, nowStr, batch.id]
        );
        toRemove = Math.round((toRemove - remove) * 1000) / 1000;
      }
      await window.electronAPI.run(
        `INSERT INTO inventory_log (product_id, type, quantity_input, unit_input, quantity_pcs, quantity_kg, stock_before, stock_after, notes, created_at, updated_at)
         VALUES (?, 'ADJUSTMENT', ?, 'kg', 0, ?, ?, ?, ?, ?, ?)`,
        [productId, diff, diff, currentTotal, newTotalKg, reason, nowStr, nowStr]
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
export async function deductStockFIFOKg(productId, quantityKg, invoiceNo, createdAt = null, allowNegative = false) {
  const nowStr = createdAt || getLocalDatetimeStr();
  const batches = await window.electronAPI.query(
    "SELECT * FROM stocks WHERE product_id = ? AND is_active = 1 AND qty_kg > 0 ORDER BY created_at ASC",
    [productId]
  );

  const [beforeRow] = await window.electronAPI.query(
    "SELECT COALESCE(SUM(qty_kg), 0) as total FROM stocks WHERE product_id = ? AND is_active = 1",
    [productId]
  );
  const stockBefore = beforeRow?.total || 0;

  const totalAvailableKg = batches.reduce((sum, b) => sum + (b.qty_kg || 0), 0);
  if (!allowNegative && totalAvailableKg < quantityKg - 0.001) {
    throw new Error(`Stok Kg tidak mencukupi (tersedia: ${totalAvailableKg.toFixed(3)} kg, dibutuhkan: ${quantityKg.toFixed(3)} kg)`);
  }

  const [productRow] = await window.electronAPI.query(
    "SELECT purchase_price FROM products WHERE id = ?",
    [productId]
  );
  const defaultPurchasePrice = productRow?.purchase_price || 0;

  let toDeduct = quantityKg;
  let totalCost = 0;

  if (batches.length > 0) {
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      if (toDeduct <= 0) break;

      const isLastBatch = (i === batches.length - 1);
      const deduct = (allowNegative && isLastBatch) ? toDeduct : Math.min(batch.qty_kg, toDeduct);
      const newQtyKg = Math.round((batch.qty_kg - deduct) * 1000) / 1000;

      await window.electronAPI.run(
        "UPDATE stocks SET qty_kg = ?, is_active = ?, updated_at = ? WHERE id = ?",
        [newQtyKg, (newQtyKg !== 0 || batch.quantity > 0) ? 1 : 0, nowStr, batch.id]
      );

      const actualDeductedFromBatch = Math.max(0, Math.min(batch.qty_kg, deduct));
      const negativePortion = Math.max(0, deduct - actualDeductedFromBatch);
      totalCost += (actualDeductedFromBatch * (batch.purchase_price || 0)) + (negativePortion * defaultPurchasePrice);

      toDeduct = Math.round((toDeduct - deduct) * 1000) / 1000;
    }
  } else if (allowNegative) {
    const newQtyKg = -quantityKg;
    await window.electronAPI.run(
      "INSERT INTO stocks (product_id, batch_code, qty_kg, quantity, purchase_price, is_active, notes, created_at, updated_at) VALUES (?, ?, ?, 0, ?, 1, 'Auto-created negative batch', ?, ?)",
      [productId, `MINUS-${invoiceNo}`, newQtyKg, defaultPurchasePrice, nowStr, nowStr]
    );
    totalCost = quantityKg * defaultPurchasePrice;
    toDeduct = 0;
  }

  const avgPurchasePrice = quantityKg > 0 ? Math.round(totalCost / quantityKg) : defaultPurchasePrice;
  const stockAfter = Math.round((stockBefore - quantityKg) * 1000) / 1000;

  await window.electronAPI.run(
    `INSERT INTO inventory_log 
       (product_id, type, quantity_input, unit_input, quantity_pcs, quantity_kg, stock_before, stock_after, purchase_price, reference_id, created_at, updated_at)
     VALUES (?, 'SALE', ?, 'kg', 0, ?, ?, ?, ?, ?, ?, ?)`,
    [productId, quantityKg, quantityKg, stockBefore, stockAfter, avgPurchasePrice, invoiceNo, nowStr, nowStr]
  );

  return Math.round(totalCost);
}
