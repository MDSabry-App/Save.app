// Native clipboard: reliable even when the window is not focused (the Web
// Clipboard API in Chromium can require a user gesture/focus).
const { clipboard } = require('electron');

const MAX_CLIPBOARD_BYTES = 10 * 1024 * 1024;

function registerClipboardHandlers(ipcMain) {
  ipcMain.handle('clipboard:readText', () => {
    try {
      return clipboard.readText();
    } catch {
      return '';
    }
  });

  ipcMain.handle('clipboard:writeText', (_event, text) => {
    try {
      if (typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > MAX_CLIPBOARD_BYTES) {
        return false;
      }
      clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  });
}

module.exports = { registerClipboardHandlers };
