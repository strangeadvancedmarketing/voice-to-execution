const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const WebSocket = require('ws');

let mainWindow;
let wss;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const windowWidth = 300;
  const windowHeight = 400;
  const margin = 16;

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: screenWidth - windowWidth - margin,
    y: screenHeight - windowHeight - margin,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');

  // Allow click-through on transparent areas but keep interactivity on the widget
  mainWindow.setIgnoreMouseEvents(false);

  // Forward IPC from renderer to set ignore mouse events on transparent areas
  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    mainWindow.setIgnoreMouseEvents(ignore, options || { forward: true });
  });

  // Close Buddy only (the X button). Quits this overlay app — the Claude Code
  // terminal is a separate process and is left running.
  ipcMain.on('close-buddy', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
  });

  // Manual window drag (renderer computes new pos, main moves it). Replaces
  // -webkit-app-region:drag, which is unreliable on Windows transparent
  // windows and fought the click-through handler — that's why he wouldn't move.
  ipcMain.on('get-window-position', (event) => {
    const [x, y] = mainWindow.getPosition();
    event.returnValue = { x, y };
  });
  ipcMain.on('move-window', (event, x, y) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setPosition(Math.round(x), Math.round(y));
  });
}

function startWebSocketServer() {
  wss = new WebSocket.Server({ port: 9876 });

  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('hook-event', message);
        }
      } catch (e) {
        // ignore malformed messages
      }
    });

    ws.on('error', () => {});
  });

  wss.on('error', (err) => {
    if (err.code !== 'EADDRINUSE') {
      console.error('WebSocket server error:', err.message);
    }
  });
}

// Single-instance lock — never allow two Buddy overlays at once (that caused
// the "I moved it and it jumped back" bug: a second instance was reopening).
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.whenReady().then(() => {
    createWindow();
    startWebSocketServer();
  });
}

app.on('window-all-closed', () => {
  if (wss) wss.close();
  app.quit();
});
