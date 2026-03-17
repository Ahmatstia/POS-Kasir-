/**
 * Audit Service
 * Handles logging of important system actions for accountability.
 */

import { getLocalDatetimeStr } from "./transactions";

export async function logActivity(action, module, details = "") {
  try {
    const nowStr = getLocalDatetimeStr();
    const sql = `
      INSERT INTO activity_logs (action, module, details, user, created_at)
      VALUES (?, ?, ?, 'Admin', ?)
    `;
    await window.electronAPI.run(sql, [action, module, details, nowStr]);
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

export async function getActivityLogs(limit = 100) {
  try {
    return await window.electronAPI.invoke("db:get-activity-logs", limit);
  } catch (error) {
    console.error("Failed to get activity logs:", error);
    return [];
  }
}

export async function clearLogs() {
  try {
    return await window.electronAPI.clearLogs();
  } catch (error) {
    console.error("Failed to clear logs:", error);
    return { success: false, error: error.message };
  }
}

export const AUDIT_ACTIONS = {
  // Products
  CREATE_PRODUCT: "CREATE_PRODUCT",
  UPDATE_PRODUCT: "UPDATE_PRODUCT",
  DELETE_PRODUCT: "DELETE_PRODUCT",
  
  // Inventory
  STOCK_IN: "STOCK_IN",
  STOCK_ADJUST: "STOCK_ADJUST",
  
  // Transactions
  CREATE_TRANSACTION: "CREATE_TRANSACTION",
  CANCEL_TRANSACTION: "CANCEL_TRANSACTION",
  DELETE_TRANSACTION: "DELETE_TRANSACTION",
  DELETE_ALL_TRANSACTIONS: "DELETE_ALL_TRANSACTIONS",
  
  // Security & DB
  MANUAL_BACKUP: "MANUAL_BACKUP",
  BACKUP_DB: "BACKUP_DB",
  RESTORE_DB: "RESTORE_DB",
  DELETE_LOGS: "DELETE_LOGS",
  LOGIN: "LOGIN",
};
