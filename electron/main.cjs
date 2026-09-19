// DevDesk — Electron main process.
// The renderer is the existing React application (loaded from the Vite dev
// server in development, or the packaged production build via file://).
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { createMainWindow, getMainWindow } = require('./modules/window.cjs');
const { registerHttpHandlers } = require('./modules/http.cjs');
const { registerFileHandlers } = require('./modules/files.cjs');
const { registerClipboardHandlers } = require('./modules/clipboard.cjs');
const { registerNotificationHandlers } = require('./modules/notifications.cjs');
const { buildAppMenu } = require('./modules/menu.cjs');
const { loadWindowState, saveWindowState } = require('./modules/windowState.cjs');

const isDev = !app.isPackaged;

// Windows: notifications and the taskbar identity need a stable App User Model ID.
if (process.platform === 'win32') {
  app.setAppUserModelId('com.devdesk.desktop');
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    const restored = loadWindowState();
    buildAppMenu(isDev);
    createMainWindow({ isDev, restored });
    registerIpcHandlers();

    app.on('activate', () => {
      // macOS convention: re-create the window when the dock icon is clicked.
      if (!getMainWindow()) {
        createMainWindow({ isDev, restored: null });
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function registerIpcHandlers() {
  registerHttpHandlers(ipcMain);
  registerFileHandlers(ipcMain, { isDev });
  registerClipboardHandlers(ipcMain);
  registerNotificationHandlers(ipcMain);

  // Window controls (kept for custom chrome; the stock frame is used today).
  ipcMain.on('window:minimize', () => getMainWindow()?.minimize());
  ipcMain.on('window:maximize', () => {
    const win = getMainWindow();
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });
  ipcMain.on('window:close', () => getMainWindow()?.close());

  ipcMain.handle('app:getInfo', () => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: `electron-${process.platform}`,
    userDataPath: app.getPath('userData'),
  }));

  // External links (bookmarks, docs URLs) open in the user's default browser,
  // never inside the app window.
  ipcMain.handle('app:openExternal', (_event, url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      shell.openExternal(url);
      return true;
    }
    return false;
  });
}

// Persist window bounds so the user's last size/position is restored.
app.on('before-quit', () => {
  const win = getMainWindow();
  if (win) saveWindowState(win);
});
