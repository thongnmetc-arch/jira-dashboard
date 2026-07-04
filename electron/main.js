const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');

let mainWindow;
// ── IPC Handlers ────────────────────────────────────────────────────────

// IPC: Make HTTP request to JIRA (bypasses CORS)
ipcMain.handle('jira-fetch', async (event, { url, method, headers, body }) => {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const reqHeaders = {
      ...headers,
      'Accept': headers?.['Accept'] || 'application/json',
    };

    // Ignore self-signed certificates for internal JIRA
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: method || 'GET',
      headers: reqHeaders,
      rejectUnauthorized: false, // Accept self-signed certs
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (err) => {
      reject({ message: err.message });
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject({ message: 'Timeout sau 30s' });
    });

    if (body) req.write(body);
    req.end();
  });
});

// IPC Handler: Persistent key-value store via JSON file
ipcMain.handle('store-get', async (event, key) => {
  const storePath = path.join(app.getPath('userData'), 'jira-dash-config.json');
  try {
    const data = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    return data[key];
  } catch (e) {
    return null;
  }
});

ipcMain.handle('store-set', async (event, { key, value }) => {
  const storePath = path.join(app.getPath('userData'), 'jira-dash-config.json');
  try {
    let data = {};
    try { data = JSON.parse(fs.readFileSync(storePath, 'utf-8')); } catch (e) { /* ignore */ }
    data[key] = value;
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    return false;
  }
});

// ── Main window ─────────────────────────────────────────────────────────

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'JIRA Dashboard — Theo dõi thời gian',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // In development: load from Vite dev server
  // In production: load built files
  const isDev = process.argv.includes('--dev');
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
