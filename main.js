const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "CloudSmartSpend",
    icon: path.join(__dirname, 'assets/icons/favicon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js') // Optional, but good practice
    },
    backgroundColor: '#f4f6fb' // Match the app's light theme
  });

  // Load the index.html
  win.loadFile('index.html');

  // Remove default menu for a premium standalone feel
  Menu.setApplicationMenu(null);

  // Open external links in real browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  // Smooth appearance
  win.once('ready-to-show', () => {
    win.show();
  });
}

// Create window when Electron is ready
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
