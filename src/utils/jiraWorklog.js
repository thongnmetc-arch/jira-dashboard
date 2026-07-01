/**
 * JIRA Worklog API — log time to JIRA issues
 *
 * POST /rest/api/latest/issue/{issueKey}/worklog
 * Body: { timeSpent: "3h", comment: "...", started: "2026-06-30T08:00:00+07:00" }
 */

function buildBaseUrl(url) {
  return (url || '').replace(/\/$/, '').replace(/\/secure\/Dashboard\.jspa$/, '');
}

function buildAuth(token) {
  return 'Bearer ' + token;
}

/**
 * Log worklog entry to a JIRA issue
 * @param {string} url       - JIRA base URL
 * @param {string} email     - JIRA email (unused in bearer auth, kept for interface compat)
 * @param {string} token     - JIRA API token
 * @param {string} issueKey  - e.g. "BXDBE-123"
 * @param {string} timeSpent - e.g. "3h", "1h 30m"
 * @param {string} comment   - work description
 * @param {string} startedDate - ISO date string, e.g. "2026-06-30T08:00:00+07:00"
 * @returns {Promise<object>} JIRA API response
 */
export async function logWorklog(url, email, token, issueKey, timeSpent, comment, startedDate) {
  if (!issueKey || !timeSpent) {
    throw new Error('Thiếu issueKey hoặc timeSpent.');
  }

  const body = {
    timeSpent,
    comment: comment || '',
    started: startedDate || new Date().toISOString(),
  };

  // Electron desktop app — use IPC (no CORS)
  if (window.electronAPI?.isElectron) {
    const baseUrl = buildBaseUrl(url);
    const apiUrl = `${baseUrl}/rest/api/latest/issue/${issueKey}/worklog`;
    const response = await window.electronAPI.jiraFetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': buildAuth(token),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.status >= 200 && response.status < 300) {
      return JSON.parse(response.body);
    }

    let errBody = '';
    try { errBody = JSON.parse(response.body); } catch (e) { errBody = response.body || ''; }
    throw new Error(
      `Lỗi ${response.status}: ${typeof errBody === 'string' ? errBody.substring(0, 300) : JSON.stringify(errBody).substring(0, 300)}`
    );
  }

  // Browser — use Vite proxy
  const proxyPath = `/api/jira/rest/api/latest/issue/${issueKey}/worklog`;
  const auth = buildAuth(token);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(proxyPath, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
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
    if (err.name === 'AbortError') {
      throw new Error('Kết nối quá thời gian khi log worklog.');
    }
    throw err;
  }
}

/**
 * Log multiple worklog entries in sequence
 * @param {string} url
 * @param {string} email
 * @param {string} token
 * @param {Array<{issueKey, timeSpent, comment, startedDate}>} entries
 * @returns {Promise<{success: Array, failed: Array}>}
 */
export async function logMultipleWorklogs(url, email, token, entries) {
  const success = [];
  const failed = [];

  for (const entry of entries) {
    try {
      const result = await logWorklog(
        url, email, token,
        entry.issueKey,
        entry.timeSpent,
        entry.comment,
        entry.startedDate
      );
      success.push({ issueKey: entry.issueKey, result });
    } catch (err) {
      failed.push({ issueKey: entry.issueKey, error: err.message });
    }
  }

  return { success, failed };
}
