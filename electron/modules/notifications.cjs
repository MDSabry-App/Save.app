// Native Windows toast notifications (respects the app's notification
// permission model — the renderer decides whether/when to send them).
const { Notification } = require('electron');
const path = require('path');

function registerNotificationHandlers(ipcMain) {
  ipcMain.handle('notifications:send', (_event, title, options) => {
    try {
      if (typeof title !== 'string' || !title.trim()) return false;
      if (!Notification.isSupported()) return false;
      const body = options && typeof options.body === 'string' ? options.body.slice(0, 300) : undefined;
      const notification = new Notification({
        title: title.slice(0, 120),
        body,
        icon: path.join(__dirname, '..', '..', 'build', 'icon.png'),
        silent: false,
      });
      notification.show();
      return true;
    } catch {
      return false;
    }
  });
}

module.exports = { registerNotificationHandlers };
