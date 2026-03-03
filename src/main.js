const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const dbManager = require("./main/database/dbManager");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

// Setup IPC handlers untuk database
ipcMain.handle("db:query", async (event, sql, params) => {
  console.log("IPC: query received", sql);
  try {
    const result = await dbManager.query(sql, params);
    return result;
  } catch (error) {
    console.error("Query error:", error);
    throw error;
  }
});

ipcMain.handle("db:run", async (event, sql, params) => {
  console.log("IPC: run received", sql);
  try {
    const result = await dbManager.run(sql, params);
    return result;
  } catch (error) {
    console.error("Run error:", error);
    throw error;
  }
});

const createWindow = async () => {
  console.log("Creating main window...");

  // ✅ Wait for DB to be fully ready before loading the renderer
  try {
    await dbManager.connect();
    console.log("✅ DB ready — loading window");
  } catch (err) {
    console.error("❌ Failed to initialize database:", err);
  }

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.webContents.openDevTools();
};

app.whenReady().then(() => {
  console.log("App is ready");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
