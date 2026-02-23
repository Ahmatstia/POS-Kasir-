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

const createWindow = () => {
  console.log("Creating main window...");

  // Inisialisasi database
  dbManager.connect();

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  console.log("App is ready");
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
