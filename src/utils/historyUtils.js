/**
 * History Manager — snapshot compression, localStorage CRUD, storage checks.
 *
 * Snapshot structure (localStorage):
 *   Key:   jira-dash-sa_<id>
 *   Value: JSON.stringify({
 *     version: 1,
 *     id: 'sa_YYYYMMDD_HHmm',
 *     name: 'Sprint 25',
 *     savedAt: ISO string,
 *     taskCount: number,
 *     metadata: { fileName, totalTasks, totalHours, period, filters, otLeaveData, labelDefs, labelAssignments },
 *     tasks: [compressed tuples],
 *   })
 */

export const SNAPSHOT_KEY_PREFIX = 'jira-dash-sa_';
export const STORAGE_WARNING_THRESHOLD = 4500; // KB (4.5 MB)

// ── Compression ──────────────────────────────────────────

/**
 * Compress Task objects into compact tuple arrays for storage.
 * Each tuple: [key, timeSpentSec, estimateSec, compsStr, primarySprint, assignee, status, summary]
 * @param {Array<Object>} tasks
 * @returns {Array<Array>}
 */
export function compressTasks(tasks) {
  if (!Array.isArray(tasks)) return [];
  return tasks.map((t) => [
    t.key || '',
    t.timeSpentSec || 0,
    t.estimateSec || 0,
    Array.isArray(t.comps) ? t.comps.join('|') : String(t.comps || ''),
    t.primarySprint || '',
    t.assignee || '',
    t.status || '',
    t.summary || '',
    t.created instanceof Date ? t.created.toISOString() : (t.created || null),
    t.resolved instanceof Date ? t.resolved.toISOString() : (t.resolved || null),
    t.startDate instanceof Date ? t.startDate.toISOString() : (t.startDate || null),
    t.issueType || '',
    t.priority || '',
  ]);
}

/**
 * Decompress tuple arrays back into full Task objects.
 * Fields not stored get default / empty values.
 * @param {Array<Array>} tuples
 * @returns {Array<Object>}
 */
export function decompressTasks(tuples) {
  if (!Array.isArray(tuples)) return [];
  return tuples.map((t) => {
    const [
      key = '',
      timeSpentSec = 0,
      estimateSec = 0,
      compsStr = '',
      primarySprint = '',
      assignee = '',
      status = '',
      summary = '',
      createdISO = null,
      resolvedISO = null,
      startDateISO = null,
      issueType = 'Task',
      priority = '',
    ] = t;
    const comps = compsStr ? compsStr.split('|').filter(Boolean) : [];
    return {
      key,
      timeSpentSec,
      timeSpentHr: timeSpentSec / 3600,
      estimateSec,
      estimateHr: estimateSec / 3600,
      comps,
      primarySprint,
      assignee,
      status,
      summary,
      issueType,
      priority,
      // Restore dates from ISO strings
      created: createdISO ? new Date(createdISO) : null,
      resolved: resolvedISO ? new Date(resolvedISO) : null,
      startDate: startDateISO ? new Date(startDateISO) : null,
      // Default values for fields not stored in snapshot
      project: '',
      resolution: '',
      reporter: '',
      creator: '',
      sprints: primarySprint ? [primarySprint] : [],
      originalEstimateSec: 0,
      originalEstimateHr: 0,
      updated: null,
      dueDate: null,
      dueDateTime: null,
      rank: '',
      labels: [],
    };
  });
}

// ── Helpers ──────────────────────────────────────────────

/** Generate a snapshot id: "sa_YYYYMMDD_HHmm" */
function makeSnapshotId() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `sa_${y}${m}${d}_${hh}${mm}`;
}

/** Compute a human-readable period string from task dates. */
function computePeriod(tasks) {
  if (!tasks || tasks.length === 0) return '';
  let minDate = null;
  let maxDate = null;
  for (const t of tasks) {
    const d = t.resolved || t.created || null;
    if (!d) continue;
    if (!minDate || d < minDate) minDate = d;
    if (!maxDate || d > maxDate) maxDate = d;
  }
  if (!minDate || !maxDate) return '';
  const fmt = (dt) => {
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yy = String(dt.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  };
  return minDate.toDateString() === maxDate.toDateString()
    ? fmt(minDate)
    : `${fmt(minDate)} - ${fmt(maxDate)}`;
}

// ── CRUD ─────────────────────────────────────────────────

/**
 * Save a snapshot of current app state to localStorage.
 * @param {Object} state - App state (allTasks, filters, otLeaveData, labelDefs, labelAssignments, fileName, fileStats)
 * @param {string} name - User-given name for this snapshot
 * @returns {{ success: boolean, snapshot?: Object, warning?: string, error?: string, storageKB?: number }}
 */
export function saveSnapshot(state, name) {
  try {
    const id = makeSnapshotId();
    const tasks = state.allTasks || [];
    const compressed = compressTasks(tasks);
    const totalHours = tasks.reduce((s, t) => {
      const hrs = t.timeSpentHr != null ? t.timeSpentHr : t.timeSpentSec / 3600;
      return s + (hrs || 0);
    }, 0);

    const snapshot = {
      version: 1,
      id,
      name,
      savedAt: new Date().toISOString(),
      taskCount: tasks.length,
      metadata: {
        fileName: state.fileName || '',
        totalTasks: tasks.length,
        totalHours,
        period: computePeriod(tasks),
        filters: { ...(state.filters || {}) },
        otLeaveData: { ...(state.otLeaveData || {}) },
        labelDefs: state.labelDefs ? { ...state.labelDefs } : {},
        labelAssignments: state.labelAssignments ? { ...state.labelAssignments } : {},
      },
      tasks: compressed,
    };

    const json = JSON.stringify(snapshot);
    const key = `${SNAPSHOT_KEY_PREFIX}${id}`;
    localStorage.setItem(key, json);

    const usage = getStorageUsage();
    const warning =
      usage.totalKB >= STORAGE_WARNING_THRESHOLD
        ? `Bộ nhớ đã dùng ${(usage.totalKB / 1024).toFixed(1)} MB / 5 MB. Nên xóa bản lưu cũ.`
        : undefined;

    return {
      success: true,
      snapshot: {
        id,
        name,
        savedAt: snapshot.savedAt,
        taskCount: tasks.length,
        metadata: snapshot.metadata,
      },
      warning,
      storageKB: usage.totalKB,
    };
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_FILE_NO_DISK_SPACE')
    ) {
      return {
        success: false,
        error: 'Bộ nhớ localStorage đã đầy. Hãy xóa bớt bản lưu cũ trước khi lưu mới.',
        storageKB: getStorageUsage().totalKB,
      };
    }
    if (err instanceof DOMException && err.name === 'SecurityError') {
      return { success: false, error: 'Trình duyệt không cho phép lưu trữ (private browsing?).' };
    }
    return { success: false, error: `Lỗi lưu snapshot: ${err.message}` };
  }
}

/**
 * Load a full snapshot (with decompressed tasks) by id.
 * @param {string} id
 * @returns {Object|null} { id, name, savedAt, taskCount, metadata, tasks }
 */
export function loadSnapshot(id) {
  try {
    const key = `${SNAPSHOT_KEY_PREFIX}${id}`;
    const json = localStorage.getItem(key);
    if (!json) return null;
    const raw = JSON.parse(json);
    const tasks = decompressTasks(raw.tasks || []);
    return {
      id: raw.id || id,
      name: raw.name || '',
      savedAt: raw.savedAt || '',
      taskCount: raw.taskCount || tasks.length,
      metadata: raw.metadata || {},
      tasks,
    };
  } catch (err) {
    console.warn('Lỗi đọc snapshot:', id, err.message);
    return null;
  }
}

/**
 * List all saved snapshots (metadata only — no task decompression).
 * Sorted newest first.
 * @returns {Array<{ id, name, savedAt, taskCount, metadata }>}
 */
export function listSnapshots() {
  const results = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(SNAPSHOT_KEY_PREFIX)) continue;
      const id = key.slice(SNAPSHOT_KEY_PREFIX.length);
      if (!id) continue;
      try {
        const json = localStorage.getItem(key);
        if (!json) continue;
        const raw = JSON.parse(json);
        if (raw && raw.version === 1) {
          results.push({
            id: raw.id || id,
            name: raw.name || '',
            savedAt: raw.savedAt || '',
            taskCount: raw.taskCount || 0,
            metadata: raw.metadata || {},
          });
        }
      } catch (e) {
        console.warn('Bỏ qua snapshot lỗi:', key, e.message);
      }
    }
  } catch (err) {
    console.warn('Lỗi quét localStorage:', err.message);
  }
  results.sort((a, b) => {
    const ta = a.savedAt ? new Date(a.savedAt).getTime() : 0;
    const tb = b.savedAt ? new Date(b.savedAt).getTime() : 0;
    return tb - ta;
  });
  return results;
}

/**
 * Delete a snapshot by id.
 * @param {string} id
 * @returns {boolean} true if deleted, false if not found
 */
export function deleteSnapshot(id) {
  try {
    const key = `${SNAPSHOT_KEY_PREFIX}${id}`;
    if (localStorage.getItem(key) === null) return false;
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.warn('Lỗi xóa snapshot:', id, err.message);
    return false;
  }
}

/**
 * Get storage usage statistics.
 * @returns {{ totalKB: number, snapshotsKB: number, snapshotsCount: number }}
 */
export function getStorageUsage() {
  let totalBytes = 0;
  let snapshotsBytes = 0;
  let snapshotsCount = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const val = localStorage.getItem(key);
      const bytes = val ? new Blob([val]).size : 0;
      totalBytes += bytes;
      if (key.startsWith(SNAPSHOT_KEY_PREFIX)) {
        snapshotsBytes += bytes;
        snapshotsCount++;
      }
    }
  } catch (err) {
    // localStorage not available — return zeros
  }
  return {
    totalKB: Math.round(totalBytes / 1024),
    snapshotsKB: Math.round(snapshotsBytes / 1024),
    snapshotsCount,
  };
}

/**
 * Check if localStorage is accessible.
 * @returns {boolean}
 */
export function isStorageAvailable() {
  try {
    const testKey = `${SNAPSHOT_KEY_PREFIX}_test`;
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format a savedAt ISO string for display.
 * @param {string} isoString
 * @returns {string}
 */
export function formatSavedAt(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}
