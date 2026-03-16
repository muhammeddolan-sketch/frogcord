const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Frogcord",
    icon: path.join(__dirname, 'frontend/public/logo.png'), // Varsa logonuzu buraya ekleriz
    backgroundColor: '#313338', // Discord koyu teması
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Geliştirme aşamasında lokal sunucuyu açar
  // Projeyi build ettiğimizde burayı değiştirebiliriz
  win.loadURL('http://localhost:5173');

  // Menü çubuğunu gizle (Discord gibi görünmesi için)
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
