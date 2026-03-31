const { app, BrowserWindow, Menu, Tray, nativeImage, desktopCapturer, session } = require('electron');

// Linux Wayland PipeWire support - MUST be called before app.ready
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');
}
const path = require('path');

let mainWindow;
let tray;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Frogcord",
    icon: path.join(__dirname, 'frontend/public/logo.png'),
    backgroundColor: '#313338',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  if (app.isPackaged) {
    mainWindow.loadURL('https://samatha-unpotable-untouchably.ngrok-free.dev');
  } else {
    mainWindow.loadURL('http://localhost:9000');
  }

  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      // Linux/Windows için ekstra odaklanma zorlaması
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setAlwaysOnTop(false);
    }
  });

  app.whenReady().then(() => {
    // Screen share handler for Electron renderer calls
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
      desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
        // Automatically pick the first entire screen source
        const selectedSource = sources.find(s => s.name === 'Entire Screen' || s.name.includes('Screen')) || sources[0];
        if (selectedSource) {
          callback({ video: selectedSource, audio: 'loopback' });
        } else {
          callback({ video: null });
        }
      }).catch(err => {
        console.error("Desktop capturer error:", err);
        callback({ video: null });
      });
    });

    createWindow();
    createTray();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else {
        mainWindow.show();
      }
    });
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'frontend/public/logo.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Show Frogcord', 
      click: () => {
        mainWindow.show();
      } 
    },
    { 
      label: 'Quit', 
      click: () => {
        app.isQuitting = true;
        app.quit();
      } 
    }
  ]);

  tray.setToolTip('Frogcord');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow.show();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // app.quit(); // We keep it running in tray
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});
