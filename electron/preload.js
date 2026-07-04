const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // JIRA API — bypasses CORS via main process
  jiraFetch: (url, options) => ipcRenderer.invoke('jira-fetch', {
    url,
    method: options?.method || 'GET',
    headers: options?.headers || {},
    body: options?.body || null,
  }),

  // App authentication: API Token only (no SSO)

  // Persistent storage (stored in userData directory)
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store-set', { key, value }),

  // App info
  isElectron: true,
});
