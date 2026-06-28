/**
 * JIRA API Utility — connects to self-hosted JIRA REST API
 * Uses Vite proxy in dev mode to bypass CORS
 * Uses Electron IPC when running as desktop app (no CORS)
 *
 * Two authentication modes:
 *   A) API Token (Basic Auth) — works everywhere
 *   B) Cookie-based (Electron only) — uses in-app Microsoft SSO login
 *
 * Two-step flow:
 *   1. testJiraConnection — verify auth + REST API reachability
 *   2. fetchJiraIssues   — only called after test succeeds
 */

// Helper: build the base API URL from a JIRA URL
function buildBaseUrl(url) {
  return url.replace(/\/$/, '').replace(/\/secure\/Dashboard\.jspa$/, '');
}

// Helper: build auth header value
function buildAuth(email, token) {
  return 'Basic ' + btoa(unescape(encodeURIComponent(email)) + ':' + token);
}

// Default JIRA URL for cookie-based login (Electron SSO)
const JIRA_URL = 'https://20.84.97.109:3033';

// ── Cookie-based (Electron SSO login) ──────────────────────────────────

// Test connection using captured JIRA session cookies (no Basic Auth)
async function electronCookieTestConnection() {
  const apiUrl = `${JIRA_URL}/rest/api/latest/myself`;

  try {
    const response = await window.electronAPI.jiraFetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Atlassian-Token': 'no-check',
      }
      // No Authorization header → main process auto-injects cookies
    });

    if (response.status === 200) {
      const user = JSON.parse(response.body);
      return { success: true, user: user.displayName || user.name };
    }

    if (response.status === 401 || response.status === 403) {
      // Session expired — trigger re-login via main process
      await window.electronAPI.jiraLogin();
      return { success: false, error: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.' };
    }

    return { success: false, error: `Lỗi ${response.status}: ${(response.body || '').substring(0, 500)}` };
  } catch (err) {
    return { success: false, error: err.message || 'Không thể kết nối đến JIRA qua Electron (cookie).' };
  }
}

// Fetch issues using captured JIRA session cookies (no Basic Auth)
async function electronCookieFetchIssues(projectKey, jql) {
  const jqls = jql && jql.trim()
    ? [jql.trim().replace(/\n/g, ' ')]
    : [
        `project = ${projectKey} ORDER BY created DESC`,
        `project = "${projectKey}" ORDER BY created DESC`,
        `project="${projectKey}"`,
      ];

  let lastError = null;

  for (const jqlQuery of jqls) {
    const apiUrl = `${JIRA_URL}/rest/api/latest/search?jql=${encodeURIComponent(jqlQuery)}&maxResults=500&fields=*all`;

    try {
      const response = await window.electronAPI.jiraFetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'X-Atlassian-Token': 'no-check',
        }
        // No Authorization header → main process auto-injects cookies
      });

      if (response.status === 200) {
        const data = JSON.parse(response.body);
        return (data.issues || []).map(issue => parseJiraIssue(issue));
      }

      const errorBody = (response.body || '').substring(0, 300);

      if (response.status === 400) {
        lastError = new Error('JIRA từ chối tìm kiếm. Có thể project "' + projectKey + '" không tồn tại hoặc không có quyền.\nChi tiết: ' + errorBody.substring(0, 200));
        continue;
      }
      if (response.status === 401 || response.status === 403) {
        // Session expired — trigger re-login
        await window.electronAPI.jiraLogin();
        lastError = new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        break;
      }

      lastError = new Error(`Lỗi ${response.status}: ${errorBody.substring(0, 200) || response.statusText}`);
    } catch (err) {
      lastError = new Error(err.message || 'Không thể kết nối đến JIRA qua Electron (cookie).');
    }
  }

  throw lastError || new Error('Không thể lấy dữ liệu từ JIRA.');
}

// ── API Token (Basic Auth) — works everywhere ──────────────────────────

// Electron-specific: test connection via IPC (no CORS)
async function electronTestConnection(url, email, token) {
  const baseUrl = buildBaseUrl(url);
  const apiUrl = `${baseUrl}/rest/api/latest/myself`;
  const auth = buildAuth(email, token);

  try {
    const response = await window.electronAPI.jiraFetch(apiUrl, {
      headers: {
        'Authorization': auth,
        'Accept': 'application/json',
        'X-Atlassian-Token': 'no-check',
      }
    });

    if (response.status === 200) {
      const user = JSON.parse(response.body);
      return { success: true, user: user.displayName || user.name };
    }

    if (response.status === 401) {
      return { success: false, error: 'Xác thực thất bại. Token không hợp lệ hoặc hết hạn.' };
    }
    if (response.status === 403) {
      return { success: false, error: 'Tài khoản không có quyền truy cập API.' };
    }
    if (response.status === 404) {
      return { success: false, error: 'Không tìm thấy endpoint REST API. JIRA có thể không bật REST API.' };
    }

    return { success: false, error: `Lỗi ${response.status}: ${(response.body || '').substring(0, 500)}` };

  } catch (err) {
    return { success: false, error: err.message || 'Không thể kết nối đến JIRA qua Electron.' };
  }
}

// Electron-specific: fetch issues via IPC (no CORS)
async function electronFetchIssues(url, email, token, projectKey, jql) {
  const baseUrl = buildBaseUrl(url);
  const auth = buildAuth(email, token);

  // Use custom JQL if provided, otherwise try multiple formats for the projectKey
  const jqls = jql && jql.trim()
    ? [jql.trim().replace(/\n/g, ' ')]
    : [
        `project = ${projectKey} ORDER BY created DESC`,
        `project = "${projectKey}" ORDER BY created DESC`,
        `project="${projectKey}"`,
      ];

  let lastError = null;

  for (const jqlQuery of jqls) {
    const apiUrl = `${baseUrl}/rest/api/latest/search?jql=${encodeURIComponent(jqlQuery)}&maxResults=500&fields=*all`;

    try {
      const response = await window.electronAPI.jiraFetch(apiUrl, {
        headers: {
          'Authorization': auth,
          'Accept': 'application/json',
          'X-Atlassian-Token': 'no-check',
        }
      });

      if (response.status === 200) {
        const data = JSON.parse(response.body);
        return (data.issues || []).map(issue => parseJiraIssue(issue));
      }

      const errorBody = (response.body || '').substring(0, 300);

      if (response.status === 400) {
        lastError = new Error('JIRA từ chối tìm kiếm. Có thể project "' + projectKey + '" không tồn tại hoặc không có quyền.\nChi tiết: ' + errorBody.substring(0, 200));
        continue;
      }
      if (response.status === 401) {
        lastError = new Error('Xác thực thất bại khi tìm kiếm.');
        break;
      }
      if (response.status === 404) {
        lastError = new Error('Không tìm thấy endpoint tìm kiếm. Kiểm tra JIRA REST API đã được bật.\nChi tiết: ' + errorBody.substring(0, 200));
        continue;
      }

      lastError = new Error(`Lỗi ${response.status}: ${errorBody.substring(0, 200) || response.statusText}`);

    } catch (err) {
      lastError = new Error(err.message || 'Không thể kết nối đến JIRA qua Electron.');
    }
  }

  throw lastError || new Error('Không thể lấy dữ liệu từ JIRA.');
}

// ── Public API ─────────────────────────────────────────────────────────

// Step 1: Test connection and auth before fetching issues
export async function testJiraConnection(url, email, token) {
  // Electron with cookie-based login: ignore url/email/token, use session cookies
  if (window.electronAPI?.isElectron && !token) {
    return electronCookieTestConnection();
  }
  // Electron desktop app — no CORS, call JIRA directly via IPC
  if (window.electronAPI?.isElectron) {
    return electronTestConnection(url, email, token);
  }

  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  let apiPath;
  if (isDev) {
    apiPath = '/api/jira/rest/api/latest/myself';
  } else {
    apiPath = `${buildBaseUrl(url)}/rest/api/latest/myself`;
  }

  const auth = buildAuth(email, token);

  console.log('[JIRA API] Testing connection to:', apiPath);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(apiPath, {
      method: 'GET',
      headers: {
        'Authorization': auth,
        'Accept': 'application/json',
        'X-Atlassian-Token': 'no-check',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    console.log('[JIRA API] Test response:', res.status, res.statusText);

    if (res.ok) {
      const user = await res.json();
      return { success: true, user: user.displayName || user.name };
    }

    // Try to read error body
    let errorBody = '';
    try {
      const text = await res.text();
      errorBody = text.substring(0, 500);
      console.error('[JIRA API] Error body:', errorBody);
    } catch (e) {
      // ignore read errors
    }

    if (res.status === 401) {
      return { success: false, error: 'Xác thực thất bại. Token không hợp lệ hoặc hết hạn.' };
    }
    if (res.status === 403) {
      return { success: false, error: 'Tài khoản không có quyền truy cập API.' };
    }
    if (res.status === 404) {
      return { success: false, error: 'Không tìm thấy endpoint REST API. JIRA có thể không bật REST API.\nPhản hồi: ' + errorBody };
    }

    return { success: false, error: `Lỗi ${res.status}: ${errorBody || res.statusText}` };

  } catch (err) {
    clearTimeout(timeout);
    console.error('[JIRA API] Connection error:', err);

    if (err.name === 'AbortError') {
      return { success: false, error: 'Kết nối quá thời gian (15s). Kiểm tra URL và kết nối mạng.' };
    }
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      return { success: false, error: 'Không thể kết nối đến JIRA.\n- Nếu đang mở file HTML trực tiếp: chạy "npm run dev"\n- Kiểm tra JIRA có đang chạy không\n- Kiểm tra URL: ' + (isDev ? '(qua proxy)' : url) };
    }
    return { success: false, error: err.message };
  }
}

// Step 2: Fetch issues (only called after test succeeds)
export async function fetchJiraIssues(url, email, token, projectKey, jql) {
  // Electron with cookie-based login: use session cookies (no token needed)
  if (window.electronAPI?.isElectron && !token) {
    return electronCookieFetchIssues(projectKey, jql);
  }
  // Electron desktop app — no CORS, call JIRA directly via IPC
  if (window.electronAPI?.isElectron) {
    return electronFetchIssues(url, email, token, projectKey, jql);
  }

  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Use custom JQL if provided, otherwise try multiple formats for the projectKey
  const jqls = jql && jql.trim()
    ? [jql.trim().replace(/\n/g, ' ')]
    : [
        `project = ${projectKey} ORDER BY created DESC`,
        `project = "${projectKey}" ORDER BY created DESC`,
        `project="${projectKey}"`,
      ];

  const auth = buildAuth(email, token);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  let lastError = null;

  for (const jql of jqls) {
    let apiPath;
    if (isDev) {
      apiPath = `/api/jira/rest/api/latest/search?jql=${encodeURIComponent(jql)}&maxResults=500&fields=*all`;
    } else {
      apiPath = `${buildBaseUrl(url)}/rest/api/latest/search?jql=${encodeURIComponent(jql)}&maxResults=500&fields=*all`;
    }

    console.log('[JIRA API] Fetching:', apiPath);

    try {
      const res = await fetch(apiPath, {
        method: 'GET',
        headers: {
          'Authorization': auth,
          'Accept': 'application/json',
          'X-Atlassian-Token': 'no-check',
        },
        signal: controller.signal,
      });

      if (res.ok) {
        clearTimeout(timeout);
        const data = await res.json();
        return (data.issues || []).map(issue => parseJiraIssue(issue));
      }

      // Read error body
      let errorBody = '';
      try {
        errorBody = await res.text();
      } catch (e) {
        // ignore read errors
      }
      console.error('[JIRA API] Search error:', res.status, errorBody.substring(0, 300));

      if (res.status === 400) {
        lastError = new Error('JIRA từ chối tìm kiếm. Có thể project "' + projectKey + '" không tồn tại hoặc không có quyền.\nChi tiết: ' + errorBody.substring(0, 200));
        continue; // try next JQL format
      }

      if (res.status === 401) {
        lastError = new Error('Xác thực thất bại khi tìm kiếm.');
        break;
      }

      if (res.status === 404) {
        lastError = new Error('Không tìm thấy endpoint tìm kiếm. Kiểm tra JIRA REST API đã được bật.\nChi tiết: ' + errorBody.substring(0, 200));
        continue;
      }

      lastError = new Error(`Lỗi ${res.status}: ${errorBody.substring(0, 200) || res.statusText}`);

    } catch (err) {
      if (err.name === 'AbortError') {
        lastError = new Error('Kết nối quá thời gian (30s).');
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        lastError = new Error('Không thể kết nối đến JIRA. Kiểm tra URL và kết nối mạng.');
      } else {
        lastError = err;
      }
    }
  }

  clearTimeout(timeout);
  throw lastError || new Error('Không thể lấy dữ liệu từ JIRA.');
}

function parseJiraIssue(issue) {
  const fields = issue.fields || {};

  // Sprint fields — try MANY common custom field IDs across JIRA versions
  let sprintField = null;
  const sprintIds = ['customfield_10206', 'customfield_10020', 'customfield_10010', 'customfield_10007', 'customfield_10002', 'customfield_10021', 'customfield_10100'];
  for (const id of sprintIds) {
    if (fields[id] && Array.isArray(fields[id]) && fields[id].length > 0) {
      sprintField = fields[id];
      break;
    }
  }
  console.log('[SPRINT DEBUG] Sprint fields found:', sprintIds.filter(id => fields[id] !== undefined).map(id => ({ id, type: typeof fields[id], isArray: Array.isArray(fields[id]) })));
  console.log('[SPRINT DEBUG] Sprint raw:', sprintField);

  let sprints = [];
  if (sprintField && Array.isArray(sprintField)) {
    sprints = sprintField.map(s => {
      if (typeof s === 'string') {
        // Parse JIRA sprint string format: "name=Sprint 11,..."
        const match = s.match(/name=([^,]+)/);
        return match ? match[1] : s;
      }
      return s?.name || s?.value || s?.toString?.() || '';
    }).filter(Boolean);
  }

  // Get component names
  const comps = (fields.components || []).map(c => c?.name || '').filter(Boolean);

  // Resolved date
  const resolvedDate = fields.resolutiondate ? new Date(fields.resolutiondate) : null;
  const createdDate = fields.created ? new Date(fields.created) : null;

  return {
    key: issue.key || '',
    summary: fields.summary || '',
    issueType: fields.issuetype?.name || '',
    status: fields.status?.name || '',
    priority: fields.priority?.name || '',
    assignee: fields.assignee?.displayName || fields.assignee?.name || '',
    comps,
    sprints: sprints.filter(Boolean),
    primarySprint: sprints.length > 0 ? sprints[sprints.length - 1] : '',
    timeSpentSec: fields.timespent || 0,
    timeSpentHr: (fields.timespent || 0) / 3600,
    estimateSec: fields.timeestimate || 0,
    estimateHr: (fields.timeestimate || 0) / 3600,
    created: createdDate,
    resolved: resolvedDate,
    startDate: createdDate, // fallback to created when no custom start date
    labels: fields.labels || [],
  };
}
