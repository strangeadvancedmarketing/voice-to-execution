const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onHookEvent: (callback) => {
    ipcRenderer.on('hook-event', (event, data) => callback(data));
  },
  setIgnoreMouseEvents: (ignore, options) => {
    ipcRenderer.send('set-ignore-mouse-events', ignore, options);
  },
  closeBuddy: () => ipcRenderer.send('close-buddy'),
  getWindowPosition: () => ipcRenderer.sendSync('get-window-position'),
  moveWindow: (x, y) => ipcRenderer.send('move-window', x, y),
});
