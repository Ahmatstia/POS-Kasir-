const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
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

// --- BACKUP LOGIC ---
async function backupDatabase() {
  try {
    const dbPath = dbManager.dbPath;
    const backupDir = path.join(app.getPath("userData"), "backups");
    
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDir, `pos-backup-${timestamp}.db`);

    // Copy file
    fs.copyFileSync(dbPath, backupPath);
    console.log("✅ Backup created at:", backupPath);

    // Rotation Policy: KEEP ONLY LAST 5
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith(".db"))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 5) {
      files.slice(5).forEach(f => {
        fs.unlinkSync(path.join(backupDir, f.name));
        console.log("🗑️ Deleted old backup:", f.name);
      });
    }
    return { success: true, path: backupPath };
  } catch (error) {
    console.error("❌ Backup failed:", error);
    return { success: false, error: error.message };
  }
}

ipcMain.handle("db:backup", async () => {
  return await backupDatabase();
});

ipcMain.handle("db:open-backup-folder", async () => {
  try {
    const backupDir = path.join(app.getPath("userData"), "backups");
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
    await shell.openPath(backupDir);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("db:restore", async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: "Pilih File Backup Database (.db)",
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
      properties: ["openFile"]
    });

    if (canceled || filePaths.length === 0) return { success: false, error: "Dibatalkan" };

    const selectedFile = filePaths[0];
    const dbPath = dbManager.dbPath;

    // 1. Close current connection
    await dbManager.close();

    // 2. Overwrite with selected file
    fs.copyFileSync(selectedFile, dbPath);
    console.log("✅ Database restored from:", selectedFile);

    // 3. Restart the app
    app.relaunch();
    app.exit();

    return { success: true };
  } catch (error) {
    console.error("❌ Restore failed:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("db:get-activity-logs", async (event, limit = 100) => {
  try {
    return await dbManager.query("SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?", [limit]);
  } catch (error) {
    return [];
  }
});
ipcMain.handle("app:getVersion", () => {
  return app.getVersion();
});

const createWindow = async () => {
  console.log("Creating main window...");

  // ✅ Wait for DB to be fully ready before loading the renderer
  try {
    await dbManager.connect();
    console.log("✅ DB ready — loading window");
  } catch (err) {
    console.error("❌ Failed to initialize database:", err);
    app.quit();
    return;
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
