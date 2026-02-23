const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Database functions
  query: (sql, params) => ipcRenderer.invoke("db:query", sql, params),
  run: (sql, params) => ipcRenderer.invoke("db:run", sql, params),

  // App info
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
});
