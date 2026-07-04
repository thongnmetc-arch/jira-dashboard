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
function buildAuth(token) {
  return 'Bearer ' + token;
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
async function electronCookieFetchIssues(projectKey, assignee, jql) {
  const jqls = jql && jql.trim()
    ? [jql.trim().replace(/\n/g, ' ')]
    : assignee
      ? [`project = "${projectKey}" AND assignee = "${assignee}" ORDER BY created DESC`]
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
async function electronTestConnection(url, token) {
  const baseUrl = buildBaseUrl(url);
  const apiUrl = `${baseUrl}/rest/api/latest/myself`;
  const auth = buildAuth(token);

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
async function electronFetchIssues(url, token, projectKey, assignee, jql) {
  const baseUrl = buildBaseUrl(url);
  const auth = buildAuth(token);

  // Use custom JQL if provided, otherwise try multiple formats for the projectKey
  const jqls = jql && jql.trim()
    ? [jql.trim().replace(/\n/g, ' ')]
    : assignee
      ? [`project = "${projectKey}" AND assignee = "${assignee}" ORDER BY created DESC`]
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

// ── Fetch Projects (Electron helpers) ──────────────────────────────────

// Electron cookie-based: fetch project list
async function electronCookieFetchProjects() {
  const apiUrl = `${JIRA_URL}/rest/api/latest/project`;

  try {
    const response = await window.electronAPI.jiraFetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Atlassian-Token': 'no-check',
      }
    });

    if (response.status === 200) {
      const projects = JSON.parse(response.body);
      return projects.map(p => ({
        key: p.key,
        name: p.name,
        description: p.description || p.name,
        lead: p.lead?.displayName || p.lead?.name || '',
        issueCount: p.issueCount || 0,
      }));
    }

    let errorBody = '';
    try { errorBody = JSON.parse(response.body); } catch(e) { errorBody = response.body || ''; }
    throw new Error(`Lỗi ${response.status}: ${typeof errorBody === 'string' ? errorBody.substring(0, 300) : JSON.stringify(errorBody).substring(0, 300)}`);
  } catch (err) {
    if (err.message?.startsWith('Lỗi')) throw err;
    throw new Error(err.message || 'Không thể lấy danh sách dự án qua Electron (cookie).');
  }
}

// Electron API-token: fetch project list via IPC
async function electronFetchProjects(url, token) {
  const baseUrl = buildBaseUrl(url);
  const apiUrl = `${baseUrl}/rest/api/latest/project`;
  const auth = buildAuth(token);

  try {
    const response = await window.electronAPI.jiraFetch(apiUrl, {
      headers: {
        'Authorization': auth,
        'Accept': 'application/json',
        'X-Atlassian-Token': 'no-check',
      }
    });

    if (response.status === 200) {
      const projects = JSON.parse(response.body);
      return projects.map(p => ({
        key: p.key,
        name: p.name,
        description: p.description || p.name,
        lead: p.lead?.displayName || p.lead?.name || '',
        issueCount: p.issueCount || 0,
      }));
    }

    let errorBody = '';
    try { errorBody = JSON.parse(response.body); } catch(e) { errorBody = response.body || ''; }
    throw new Error(`Lỗi ${response.status}: ${typeof errorBody === 'string' ? errorBody.substring(0, 300) : JSON.stringify(errorBody).substring(0, 300)}`);
  } catch (err) {
    if (err.message?.startsWith('Lỗi')) throw err;
    throw new Error(err.message || 'Không thể lấy danh sách dự án qua Electron.');
  }
}

// ── Fetch Project Components ───────────────────────────────────────────

/**
 * Fetch ALL components for a project from the JIRA project API.
 * This is more reliable than extracting from issues (which may be capped at 500).
 * Falls back gracefully if the endpoint is not available on older JIRA versions.
 */
async function electronFetchComponents(url, token, projectKey) {
  const baseUrl = (url || '').replace(/\/$/, '');
  const apiUrl = `${baseUrl}/rest/api/latest/project/${projectKey}/components`;
  const response = await window.electronAPI.jiraFetch(apiUrl, {
    method: 'GET',
    headers: {
      'Authorization': buildAuth(token),
      'Accept': 'application/json',
    },
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Lỗi ${response.status}: ${String(response.body || '').substring(0, 300)}`);
  }

  // Try to parse, handle non-JSON responses
  try {
    const data = JSON.parse(response.body);
    return (Array.isArray(data) ? data : []).map(c => c.name).filter(Boolean).sort();
  } catch {
    throw new Error(`Invalid response (not JSON): ${String(response.body || '').substring(0, 200)}`);
  }
}

export async function fetchComponents(url, token, projectKey) {
  // Electron desktop app
  if (window.electronAPI?.isElectron) {
    return electronFetchComponents(url, token, projectKey);
  }

  // Browser via Vite proxy
  const proxyPath = `/api/jira/rest/api/latest/project/${encodeURIComponent(projectKey)}/components`;
  const auth = buildAuth(token);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(proxyPath, {
      method: 'GET',
      headers: {
        'Authorization': auth,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      let errorText = '';
      try { errorText = await res.text(); } catch (e) { /* ignore */ }
      throw new Error(`Lỗi ${res.status}: ${errorText.substring(0, 300) || res.statusText}`);
    }

    const data = await res.json();
    return (data || []).map(c => c.name).filter(Boolean).sort();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Kết nối quá thời gian khi lấy components.');
    throw err;
  }
}

// ── Public API ─────────────────────────────────────────────────────────

// Step 0: Fetch available projects (used by ProjectSelector wizard step)
export async function fetchProjects(url, email, token) {
  // Electron with cookie-based login
  if (window.electronAPI?.isElectron && !token) {
    return electronCookieFetchProjects();
  }
  // Electron desktop app — no CORS, call JIRA directly via IPC
  if (window.electronAPI?.isElectron) {
    return electronFetchProjects(url, token);
  }

  // Browser — use Vite proxy (ignores url)
  const auth = buildAuth(token);
  const apiPath = `/api/jira/rest/api/latest/project`;

  console.log('[JIRA API] Fetching projects');

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

    if (!res.ok) {
      let errorBody = '';
      try { errorBody = await res.text(); } catch(e) {}
      throw new Error(`Lỗi ${res.status}: ${errorBody.substring(0, 300)}`);
    }

    const projects = await res.json();
    return projects.map(p => ({
      key: p.key,
      name: p.name,
      description: p.description || p.name,
      lead: p.lead?.displayName || p.lead?.name || '',
      issueCount: p.issueCount || 0,
    }));
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Kết nối quá thời gian khi lấy danh sách dự án.');
    }
    console.error('[JIRA API] fetchProjects error:', err);
    throw err;
  }
}

// Step 1: Test connection and auth before fetching issues

// Step 1: Test connection and auth before fetching issues
export async function testJiraConnection(url, token) {
  // Electron with cookie-based login: ignore url/token, use session cookies
  if (window.electronAPI?.isElectron && !token) {
    return electronCookieTestConnection();
  }
  // Electron desktop app — no CORS, call JIRA directly via IPC
  if (window.electronAPI?.isElectron) {
    return electronTestConnection(url, token);
  }

  let apiPath = '/api/jira/rest/api/latest/search?jql=&maxResults=0';

  const auth = buildAuth(token);

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
      return { success: true };
    }

    // Try to read error body
    let errorBody = '';
    try {
      const text = await res.text();
      errorBody = text.substring(0, 2000);
      console.error('[JIRA API] Error body:', errorBody);
    } catch (e) {
      // ignore read errors
    }

    if (res.status === 401) {
      return { success: false, error: 'Xác thực thất bại (401). Token không hợp lệ hoặc hết hạn.\n' + errorBody };
    }
    if (res.status === 403) {
      return { success: false, error: 'Từ chối truy cập (403).\n' + errorBody };
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
      return { success: false, error: 'Không thể kết nối đến JIRA.\n- Kiểm tra JIRA có đang chạy không\n- Kiểm tra URL: https://20.84.97.109:3033' };
    }
    return { success: false, error: err.message };
  }
}

// Step 2: Fetch issues (only called after test succeeds)
export async function fetchJiraIssues(url, token, projectKey, assignee, jql) {
  // Electron with cookie-based login: use session cookies (no token needed)
  if (window.electronAPI?.isElectron && !token) {
    return electronCookieFetchIssues(projectKey, assignee, jql);
  }
  // Electron desktop app — no CORS, call JIRA directly via IPC
  if (window.electronAPI?.isElectron) {
    return electronFetchIssues(url, token, projectKey, assignee, jql);
  }

  // Use custom JQL if provided, otherwise try multiple formats for the projectKey
  const jqls = jql && jql.trim()
    ? [jql.trim().replace(/\n/g, ' ')]
    : assignee
      ? [`project = "${projectKey}" AND assignee = "${assignee}" ORDER BY created DESC`]
      : [
          `project = ${projectKey} ORDER BY created DESC`,
          `project = "${projectKey}" ORDER BY created DESC`,
          `project="${projectKey}"`,
        ];

  const auth = buildAuth(token);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  let lastError = null;

  for (const jql of jqls) {
    const apiPath = `/api/jira/rest/api/latest/search?jql=${encodeURIComponent(jql)}&maxResults=500&fields=*all`;

    console.log('[JIRA API] Fetching:', apiPath);

    try {
    console.log('[CREATE ISSUE] Sending POST request...');
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

  // Start date — try common custom field IDs
  let startDate = null;
  const startDateIds = ['customfield_10300', 'customfield_10015', 'customfield_10105'];
  for (const id of startDateIds) {
    if (fields[id]) {
      const val = fields[id];
      if (typeof val === 'string') {
        const d = new Date(val);
        if (!isNaN(d.getTime())) { startDate = d; break; }
      } else if (val instanceof Date) {
        startDate = val; break;
      }
    }
  }

  // Due date — system field and custom field
  let dueDate = fields.duedate ? new Date(fields.duedate) : null;
  let dueDateTime = null;
  if (fields['customfield_10302']) {
    const val = fields['customfield_10302'];
    dueDateTime = typeof val === 'string' ? new Date(val) : val;
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
    assigneeName: fields.assignee?.displayName || '',
    assigneeEmail: fields.assignee?.name || fields.assignee?.emailAddress || '',
    assignee: fields.assignee?.name || fields.assignee?.emailAddress || fields.assignee?.displayName || '',
    comps,
    sprints: sprints.filter(Boolean),
    primarySprint: sprints.length > 0 ? sprints[sprints.length - 1] : '',
    timeSpentSec: fields.timespent || 0,
    timeSpentHr: (fields.timespent || 0) / 3600,
    estimateSec: fields.timeestimate || 0,
    estimateHr: (fields.timeestimate || 0) / 3600,
    originalEstimateSec: fields.timeoriginalestimate || 0,
    originalEstimateHr: (fields.timeoriginalestimate || 0) / 3600,
    created: createdDate,
    resolved: resolvedDate,
    startDate, // from custom field mapping
    dueDate: dueDate || null,
    dueDateTime: dueDateTime || null,
    labels: fields.labels || [],
  };
}

// ── Fetch single issue by key ────────────────────────────────────────────

export async function fetchIssueByKey(url, token, issueKey) {
  const baseUrl = buildBaseUrl(url);
  const apiPath = `/api/jira/rest/api/latest/issue/${encodeURIComponent(issueKey)}`;
  const auth = buildAuth(token);

  // Electron desktop app
  if (window.electronAPI?.isElectron) {
    const response = await window.electronAPI.jiraFetch(`${baseUrl}/rest/api/latest/issue/${encodeURIComponent(issueKey)}`, {
      headers: { 'Authorization': auth, 'Accept': 'application/json' }
    });
    if (response.status >= 200 && response.status < 300) {
      return JSON.parse(response.body);
    }
    throw new Error(`Lỗi ${response.status}: ${(response.body || '').substring(0, 300)}`);
  }

  // Browser — Vite proxy
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(apiPath, {
      method: 'GET',
      headers: {
        'Authorization': auth,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      let errorText = '';
      try { errorText = await res.text(); } catch (e) { /* ignore */ }
      throw new Error(`Lỗi ${res.status}: ${errorText.substring(0, 300) || res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Kết nối quá thời gian.');
    throw err;
  }
}

// ── Create Issue ─────────────────────────────────────────────────────────

/**
 * Create a JIRA issue via POST /rest/api/latest/issue
 * @param {string} url        - JIRA base URL
 * @param {string} token      - API token
 * @param {string} projectKey - Project key (e.g. "BXDBE")
 * @param {object} issueData  - { issueType, summary, description, assignee, sprint, startDate, dueDate, originalEstimate }
 * @returns {Promise<object>} JIRA API response with key, id, self
 */
export async function createIssue(url, token, projectKey, issueData) {
  const baseUrl = buildBaseUrl(url);

  const body = {
    fields: {
      project: { key: projectKey },
      issuetype: { name: issueData.issueType || 'Task' },
      summary: issueData.summary,
      description: issueData.description || '',
      assignee: issueData.assignee ? { name: issueData.assignee } : undefined,
      customfield_10206: issueData.sprint || undefined,
      customfield_10300: issueData.startDate || undefined,
      customfield_10302: issueData.dueDate || undefined,
      timetracking: issueData.originalEstimate
        ? { originalEstimate: (String(issueData.originalEstimate).includes('h') ? issueData.originalEstimate : issueData.originalEstimate + 'h') }
        : undefined,
    }
  };

  // Remove undefined fields
  Object.keys(body.fields).forEach(k => body.fields[k] === undefined && delete body.fields[k]);

  const auth = buildAuth(token);

  // Electron desktop app
  if (window.electronAPI?.isElectron) {
    const apiUrl = `${baseUrl}/rest/api/latest/issue`;
    const response = await window.electronAPI.jiraFetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Atlassian-Token': 'no-check',
      },
      body: JSON.stringify(body),
    });
    if (response.status >= 200 && response.status < 300) {
      return JSON.parse(response.body);
    }
    throw new Error(`Lỗi ${response.status}: ${(response.body || '').substring(0, 300)}`);
  }

  // Browser — Vite proxy
  const apiPath = `/api/jira/rest/api/latest/issue`;

  console.log('[CREATE ISSUE] URL:', apiPath);
  console.log('[CREATE ISSUE] Headers:', JSON.stringify({
    'Authorization': auth.substring(0, 20) + '...',
    'Content-Type': 'application/json',
  }));
  console.log('[CREATE ISSUE] Body:', JSON.stringify(body, null, 2));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(apiPath, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      credentials: 'include',
    });

    clearTimeout(timeout);

    console.log('[CREATE ISSUE] Response status:', res.status);
    console.log('[CREATE ISSUE] Response headers:', [...res.headers.entries()]);

    if (!res.ok) {
      let errorText = '';
      try { errorText = await res.text(); } catch (e) { /* ignore */ }
      console.log('[CREATE ISSUE] Error response:', errorText);
      throw new Error(`Lỗi ${res.status}: ${errorText.substring(0, 300) || res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Kết nối quá thời gian khi tạo issue.');
    throw err;
  }
}
