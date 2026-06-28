const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // JIRA API — bypasses CORS via main process
  jiraFetch: (url, options) => ipcRenderer.invoke('jira-fetch', {
    url,
    method: options?.method || 'GET',
    headers: options?.headers || {},
    body: options?.body || null,
  }),

  // JIRA cookie-based authentication (Electron in-app login with Microsoft SSO)
  jiraLoginStatus: () => ipcRenderer.invoke('jira-login-status'),
  jiraLogin: () => ipcRenderer.invoke('jira-login'),
  jiraLogout: () => ipcRenderer.invoke('jira-logout'),
  jiraGetCookies: () => ipcRenderer.invoke('jira-get-cookies'),

  // Listen for login-success events from the main process
  onLoginSuccess: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('jira-login-success', handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener('jira-login-success', handler);
  },

  // Persistent storage (stored in userData directory)
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store-set', { key, value }),

  // App info
  isElectron: true,
});
