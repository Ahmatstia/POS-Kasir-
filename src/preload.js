const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Database functions
  query: (sql, params) => ipcRenderer.invoke("db:query", sql, params),
  run: (sql, params) => ipcRenderer.invoke("db:run", sql, params),

  // Generic invoke — used by special IPC channels
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),

  // Convenience: Backup
  backup: () => ipcRenderer.invoke("db:backup"),
  openBackupFolder: () => ipcRenderer.invoke("db:open-backup-folder"),

  // Convenience: Activity Logs
  getActivityLogs: (limit) => ipcRenderer.invoke("db:get-activity-logs", limit),

  // App info
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
});
