// SaveDesk preload bridge.
// Exposes a narrow, validated desktopAPI surface through contextBridge.
// No ipcRenderer, Node.js, or filesystem primitives leak into the renderer.
const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, payload) => ipcRenderer.invoke(channel, payload);

contextBridge.exposeInMainWorld('desktopAPI', {
  isElectron: true,
  platform: `electron-${process.platform}`,
  version: process.env.DEVDESK_VERSION || '1.0.0',

  http: {
    request: (config) => invoke('http:request', config),
  },

  clipboard: {
    readText: () => invoke('clipboard:readText'),
    writeText: (text) => invoke('clipboard:writeText', text),
  },

  fs: {
    saveFile: (filename, content, mimeType) => invoke('fs:saveFile', { filename, content, mimeType }),
    openFile: (accept) => invoke('fs:openFile', accept),
  },

  notifications: {
    send: (title, options) => invoke('notifications:send', title, options),
  },

  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },

  app: {
    getInfo: () => invoke('app:getInfo'),
    openExternal: (url) => invoke('app:openExternal', url),
  },
});
