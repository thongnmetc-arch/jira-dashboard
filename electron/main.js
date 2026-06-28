const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');

let mainWindow;
let loginWindow;
let jiraCookies = null;
const JIRA_URL = 'https://20.84.97.109:3033';

// ── Cookie / Session management ─────────────────────────────────────────

// Check if we have valid JIRA session cookies in the Electron session store
async function hasJiraSession() {
  try {
    const cookies = await session.defaultSession.cookies.get({ domain: '20.84.97.109' });
    const jsessionid = cookies.find(c => c.name === 'JSESSIONID');
    if (!jsessionid) return false;
    // No expiration → session cookie (valid for this session)
    if (!jsessionid.expirationDate) return true;
    return jsessionid.expirationDate > Date.now() / 1000;
  } catch (e) {
    return false;
  }
}

// Capture JIRA cookies from the Electron session after login
async function captureJiraCookies() {
  try {
    const cookies = await session.defaultSession.cookies.get({ domain: '20.84.97.109' });
    jiraCookies = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Save to persistent store so cookies survive app restart
    const storePath = path.join(app.getPath('userData'), 'config.json');
    let data = {};
    try { data = JSON.parse(fs.readFileSync(storePath, 'utf-8')); } catch (e) { /* ignore */ }
    data.jiraCookies = jiraCookies;
    data.jiraCookiesExpiry = Date.now() + 8 * 3600 * 1000; // 8-hour expiry heuristic
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2));

    // Notify renderer so it can auto-fetch data
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('jira-login-success');
    }

    return true;
  } catch (e) {
    console.error('Failed to capture cookies:', e);
    return false;
  }
}

// Load saved cookies from disk (persisted across app restarts)
async function loadSavedCookies() {
  try {
    const storePath = path.join(app.getPath('userData'), 'config.json');
    const data = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    if (data.jiraCookies && data.jiraCookiesExpiry > Date.now()) {
      jiraCookies = data.jiraCookies;
      return true;
    }
  } catch (e) {
    // No saved config → first launch
  }
  return false;
}

// Open the JIRA login window (modal, parented to main window)
function openLoginWindow() {
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.focus();
    return;
  }

  loginWindow = new BrowserWindow({
    width: 900,
    height: 700,
    parent: mainWindow,
    modal: true,
    title: 'Đăng nhập JIRA',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  loginWindow.loadURL(JIRA_URL);

  // Detect successful login by watching navigation
  loginWindow.webContents.on('did-navigate', async (_event, url) => {
    // After login, JIRA redirects to dashboard or project list
    if (url.includes('/secure/Dashboard.jspa') || url.includes('/projects')) {
      await captureJiraCookies();
      if (loginWindow && !loginWindow.isDestroyed()) {
        loginWindow.close();
      }
      loginWindow = null;
    }
  });

  // Also poll periodically to catch cookie-based sessions
  const checkInterval = setInterval(async () => {
    if (!loginWindow || loginWindow.isDestroyed()) {
      clearInterval(checkInterval);
      return;
    }
    const hasSession = await hasJiraSession();
    if (hasSession) {
      clearInterval(checkInterval);
      await captureJiraCookies();
      if (loginWindow && !loginWindow.isDestroyed()) {
        loginWindow.close();
      }
      loginWindow = null;
    }
  }, 3000);

  loginWindow.on('closed', () => {
    clearInterval(checkInterval);
    loginWindow = null;
  });
}

// ── IPC Handlers ────────────────────────────────────────────────────────

// IPC: Check if we already have a JIRA session
ipcMain.handle('jira-login-status', async () => {
  if (jiraCookies) return { loggedIn: true };
  const saved = await loadSavedCookies();
  return { loggedIn: saved };
});

// IPC: Trigger JIRA login (opens modal login window)
ipcMain.handle('jira-login', async () => {
  openLoginWindow();
  return { success: true };
});

// IPC: Logout — clear cookies from memory, session store, and disk
ipcMain.handle('jira-logout', async () => {
  jiraCookies = null;
  try {
    await session.defaultSession.cookies.remove(`https://${new URL(JIRA_URL).hostname}`, 'JSESSIONID');
  } catch (e) { /* ignore */ }
  const storePath = path.join(app.getPath('userData'), 'config.json');
  try {
    let data = {};
    try { data = JSON.parse(fs.readFileSync(storePath, 'utf-8')); } catch (e) { /* ignore */ }
    delete data.jiraCookies;
    delete data.jiraCookiesExpiry;
    fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
  } catch (e) { /* ignore */ }
  return { success: true };
});

// IPC: Get current cookie string (for renderer debugging / diagnostic)
ipcMain.handle('jira-get-cookies', async () => {
  return { cookies: jiraCookies };
});

// IPC: Make HTTP request to JIRA (bypasses CORS)
// Automatically injects JIRA session cookies when no explicit Authorization is set
ipcMain.handle('jira-fetch', async (event, { url, method, headers, body }) => {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;

    const reqHeaders = {
      ...headers,
      'Accept': headers?.['Accept'] || 'application/json',
    };

    // Inject JIRA session cookies when available AND no explicit auth header
    if (jiraCookies && !reqHeaders['Authorization']) {
      reqHeaders['Cookie'] = jiraCookies;
    }

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

  // Check for existing session on start — if none, open login after a short delay
  const hasSession = await loadSavedCookies();
  if (!hasSession) {
    // Let the renderer window paint first, then show login
    setTimeout(() => openLoginWindow(), 1500);
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
