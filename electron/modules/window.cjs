const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { loadWindowState, isOnScreen } = require('./windowState.cjs');

const MIN_WIDTH = 1100;
const MIN_HEIGHT = 700;
const DEFAULT_WIDTH = 1440;
const DEFAULT_HEIGHT = 900;

function createMainWindow({ isDev, restored }) {
  const bounds =
    restored && isOnScreen(restored)
      ? { x: restored.x, y: restored.y, width: restored.width, height: restored.height }
      : { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };

  const win = new BrowserWindow({
    ...bounds,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    title: 'DevDesk',
    backgroundColor: '#0a0a0a',
    show: false,
    icon: path.join(__dirname, '..', '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '..', '..', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.once('ready-to-show', () => win.show());

  if (restored && restored.isMaximized) {
    win.maximize();
  }

  // Persist bounds on move/resize/close (debounced inside the state module).
  ['resize', 'move', 'close'].forEach((evt) =>
    win.on(evt, () => require('./windowState.cjs').scheduleSave(win))
  );

  // New windows / target=_blank open in the user's default browser; the app
  // window itself never navigates away from the packaged app content.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const devUrl = process.env.ELECTRON_START_URL;
    if (isDev && devUrl && url.startsWith(devUrl)) return;
    if (!isDev && url.startsWith('file://')) return;
    event.preventDefault();
  });

  if (isDev && process.env.ELECTRON_START_URL) {
    win.loadURL(process.env.ELECTRON_START_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  }

  return win;
}

function getMainWindow() {
  const windows = BrowserWindow.getAllWindows();
  return windows.length ? windows[0] : null;
}

module.exports = { createMainWindow, getMainWindow, MIN_WIDTH, MIN_HEIGHT };
