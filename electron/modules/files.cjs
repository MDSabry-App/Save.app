// Native file dialogs + filesystem access for export/import and SKILL.md saves.
// All operations validate arguments from the renderer before touching the disk.
const { dialog, shell } = require('electron');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const MAX_OPEN_FILE_BYTES = 20 * 1024 * 1024; // import files stay well below this
const MAX_SAVE_BYTES = 50 * 1024 * 1024;

const MIME_EXTENSIONS = {
  'application/json': '.json',
  'text/markdown': '.md',
  'text/plain': '.txt',
  'text/yaml': '.yaml',
  'image/png': '.png',
};

function sanitizeFilename(name, mimeType) {
  const fallbackExt = MIME_EXTENSIONS[mimeType] || '';
  const base = path.basename(String(name || 'download'))
    .replace(/[/\\?%*:|"<>]/g, '-')
    .trim();
  if (!base) return fallbackExt ? `download${fallbackExt}` : 'download';
  // Guarantee a usable extension when Windows filters rely on it.
  if (fallbackExt && !base.toLowerCase().endsWith(fallbackExt)) {
    return base + fallbackExt;
  }
  return base;
}

function lastDirFile() {
  const { app } = require('electron');
  return path.join(app.getPath('userData'), 'last-dialog-dir.txt');
}

function readLastDir() {
  try {
    const dir = fs.readFileSync(lastDirFile(), 'utf8').trim();
    return dir && fs.existsSync(dir) ? dir : undefined;
  } catch {
    return undefined;
  }
}

function writeLastDir(dir) {
  try {
    fs.writeFileSync(lastDirFile(), dir, 'utf8');
  } catch {
    // Convenience only.
  }
}

function registerFileHandlers(ipcMain) {
  ipcMain.handle('fs:saveFile', async (event, payload) => {
    const win = require('electron').BrowserWindow.fromWebContents(event.sender);
    try {
      const { filename, content, mimeType } = payload || {};
      if (typeof filename !== 'string' || typeof content !== 'string') {
        return false;
      }
      if (Buffer.byteLength(content, 'utf8') > MAX_SAVE_BYTES) {
        return false;
      }
      const safeName = sanitizeFilename(filename, typeof mimeType === 'string' ? mimeType : undefined);
      const lastDir = readLastDir();
      const result = await dialog.showSaveDialog(win, {
        title: 'Save File',
        defaultPath: lastDir ? path.join(lastDir, safeName) : safeName,
        buttonLabel: 'Save',
      });
      if (result.canceled || !result.filePath) {
        return false;
      }
      await fsp.writeFile(result.filePath, content, 'utf8');
      writeLastDir(path.dirname(result.filePath));
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('fs:openFile', async (event, accept) => {
    const win = require('electron').BrowserWindow.fromWebContents(event.sender);
    try {
      const filters = [];
      if (typeof accept === 'string' && accept.trim()) {
        const exts = accept
          .split(/[, ]+/)
          .map((part) => part.trim().replace(/^\./, '').toLowerCase())
          .filter((ext) => /^[a-z0-9]{1,8}$/.test(ext));
        if (exts.length) filters.push({ name: 'Supported files', extensions: exts });
      }
      filters.push({ name: 'All files', extensions: ['*'] });

      const lastDir = readLastDir();
      const result = await dialog.showOpenDialog(win, {
        title: 'Open File',
        defaultPath: lastDir,
        properties: ['openFile'],
        filters,
      });
      if (result.canceled || !result.filePaths.length) {
        return null;
      }
      const filePath = result.filePaths[0];
      const stat = await fsp.stat(filePath);
      if (stat.size > MAX_OPEN_FILE_BYTES) {
        return null;
      }
      const content = await fsp.readFile(filePath, 'utf8');
      writeLastDir(path.dirname(filePath));
      return { filename: path.basename(filePath), content };
    } catch {
      return null;
    }
  });

  // Reveal a file/folder in Explorer (used for "show exported file" flows).
  ipcMain.handle('fs:revealPath', async (_event, targetPath) => {
    if (typeof targetPath !== 'string' || !targetPath.trim()) return false;
    try {
      const resolved = path.resolve(targetPath);
      if (!fs.existsSync(resolved)) return false;
      shell.showItemInFolder(resolved);
      return true;
    } catch {
      return false;
    }
  });
}

module.exports = { registerFileHandlers, sanitizeFilename };
