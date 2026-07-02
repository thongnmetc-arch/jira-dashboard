import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, Bell, BellOff, Clock, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';

const REPORT_TYPES = [
  { value: 'monthly', labelKey: 'stats.effortMonth' },
  { value: 'task-detail', labelKey: 'table.title' },
  { value: 'effort', labelKey: 'stats.effort' },
];

const FORMATS = [
  { value: 'csv', labelKey: 'table.exportCsv' },
  { value: 'json', labelKey: 'common.save' },
];

function generateCSV(tasks, reportType, t) {
  const headers = [t('table.key'), t('table.summary'), t('filter.component'), t('filter.sprint'), t('filter.assignee'), t('table.hoursLogged'), t('table.hoursEstimate'), t('table.status'), t('table.key'), t('table.key'), t('dashboard.noData'), t('dashboard.noData')];
  const rows = tasks.map(tk => [
    tk.key, tk.summary, (tk.comps || []).join('; '), tk.primarySprint, tk.assignee,
    (tk.timeSpentHr || 0).toFixed(1), (tk.estimateHr || 0).toFixed(1), tk.status,
    tk.issueType || '', tk.priority || '',
    tk.created ? tk.created.toISOString().slice(0, 10) : '',
    tk.resolved ? tk.resolved.toISOString().slice(0, 10) : '',
  ]);

  let filteredRows = rows;
  if (reportType === 'effort') {
    filteredRows = rows.map(r => [r[0], r[1], r[5], r[6]]);
    return [t('table.key') + ',' + t('table.summary') + ',' + t('table.hoursLogged') + ',' + t('table.hoursEstimate'), ...filteredRows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(','))].join('\n');
  }
  if (reportType === 'task-detail') {
    filteredRows = rows;
  }

  return [headers.join(','), ...filteredRows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(','))].join('\n');
}

function generateJSON(tasks, reportType, t) {
  if (reportType === 'effort') {
    return JSON.stringify(tasks.map(tk => ({
      key: tk.key,
      summary: tk.summary,
      timeSpentHr: tk.timeSpentHr,
      estimateHr: tk.estimateHr,
      effort: tk.estimateHr > 0 ? (tk.timeSpentHr / tk.estimateHr).toFixed(2) : 0,
    })), null, 2);
  }
  if (reportType === 'task-detail') {
    return JSON.stringify(tasks.map(tk => ({
      key: tk.key,
      summary: tk.summary,
      status: tk.status,
      issueType: tk.issueType,
      priority: tk.priority,
      assignee: tk.assignee,
      comps: tk.comps,
      primarySprint: tk.primarySprint,
      timeSpentHr: tk.timeSpentHr,
      estimateHr: tk.estimateHr,
      created: tk.created ? tk.created.toISOString() : null,
      resolved: tk.resolved ? tk.resolved.toISOString() : null,
    })), null, 2);
  }
  // monthly summary
  const monthMap = {};
  tasks.forEach(tk => {
    const d = tk.resolved || tk.created;
    if (!d) return;
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if (!monthMap[key]) monthMap[key] = { taskCount: 0, totalHours: 0, totalEstimate: 0 };
    monthMap[key].taskCount += 1;
    monthMap[key].totalHours += tk.timeSpentHr || 0;
    monthMap[key].totalEstimate += tk.estimateHr || 0;
  });
  return JSON.stringify(monthMap, null, 2);
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AutoReport() {
  const { t } = useI18n();
  const { state } = useApp();
  const [reportType, setReportType] = useState('monthly');
  const [format, setFormat] = useState('csv');
  const [lastReportDate, setLastReportDate] = useState(
    () => localStorage.getItem('jira-dash-last-report-date') || ''
  );
  const [reminderEnabled, setReminderEnabled] = useState(
    () => localStorage.getItem('jira-dash-report-reminder') === 'true'
  );
  const [showSuccess, setShowSuccess] = useState(false);

  // Reminder scheduling
  useEffect(() => {
    const stored = localStorage.getItem('jira-dash-report-reminder');
    if (stored === 'true') {
      setReminderEnabled(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('jira-dash-report-reminder', reminderEnabled ? 'true' : 'false');
  }, [reminderEnabled]);

  const handleGenerate = useCallback(() => {
    const tasks = state.allTasks;
    if (tasks.length === 0) return;

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    let content;
    let filename;
    let mimeType;

    if (format === 'csv') {
      content = generateCSV(tasks, reportType, t);
      filename = `jira-report-${reportType}-${dateStr}.csv`;
      mimeType = 'text/csv';
    } else {
      content = generateJSON(tasks, reportType, t);
      filename = `jira-report-${reportType}-${dateStr}.json`;
      mimeType = 'application/json';
    }

    downloadFile(content, filename, mimeType);

    // Save last report date
    const today = now.toLocaleDateString('vi-VN');
    setLastReportDate(today);
    localStorage.setItem('jira-dash-last-report-date', today);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);

    // Request Notification permission if not granted
    if (reminderEnabled && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [state.allTasks, reportType, format, reminderEnabled, t]);

  const toggleReminder = () => {
    const next = !reminderEnabled;
    setReminderEnabled(next);

    if (next) {
      // Request permission
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
      // Schedule a weekly reminder via setTimeout (will work as long as page is open)
      // In a real app, use service worker; for this demo we store the preference
      if (Notification.permission === 'granted') {
        new Notification('JIRA Dashboard', {
          body: t('planner.logToJira'),
        });
      }
    }
  };

  const scheduleReminder = () => {
    if (!reminderEnabled) return;

    // Check every hour on Fridays (5) and notify
    const checkDay = () => {
      const now = new Date();
      if (now.getDay() === 5 && now.getHours() >= 9 && now.getHours() <= 17) {
        if (Notification.permission === 'granted') {
          new Notification('JIRA Dashboard', {
            body: t('planner.logToJira'),
          });
        }
      }
    };

    // Run once on enable
    checkDay();

    // Set interval (every hour)
    const interval = setInterval(checkDay, 3600000);
    // Store interval id for cleanup
    window.__reportReminderInterval = interval;
  };

  useEffect(() => {
    if (reminderEnabled) {
      scheduleReminder();
    } else {
      if (window.__reportReminderInterval) {
        clearInterval(window.__reportReminderInterval);
        window.__reportReminderInterval = null;
      }
    }
    return () => {
      if (window.__reportReminderInterval) {
        clearInterval(window.__reportReminderInterval);
        window.__reportReminderInterval = null;
      }
    };
  }, [reminderEnabled, t]);

  return (
    <motion.div
      id="auto-report-section"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card mb-6"
    >
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--border-primary)]">
        <Download className="w-4 h-4 text-[var(--accent)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {t('planner.target')}
        </h3>
      </div>

      <div className="space-y-4">
        {/* Report type */}
        <div>
          <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
            {t('stats.effortMonth')}
          </label>
          <div className="flex gap-2 flex-wrap">
            {REPORT_TYPES.map(rt => (
              <button
                key={rt.value}
                onClick={() => setReportType(rt.value)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                  reportType === rt.value
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                {t(rt.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div>
          <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
            {t('table.export')}
          </label>
          <div className="flex gap-2">
            {FORMATS.map(f => (
              <button
                key={f.value}
                onClick={() => setFormat(f.value)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                  format === f.value
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                {t(f.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* File location hint */}
        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] bg-[var(--bg-secondary)] rounded-lg px-3 py-2">
          <Download className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{t('common.file')}</span>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={state.allTasks.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
        >
          {showSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              {t('planner.logged')}
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              {t('planner.save')}
            </>
          )}
        </button>

        {/* Last report date */}
        {lastReportDate && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
            <Clock className="w-3 h-3" />
            <span>{t('dashboard.lastUpdate')} <strong>{lastReportDate}</strong></span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-[var(--border-primary)]" />

        {/* Reminder */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
              {t('planner.save')}
            </label>
            <button
              onClick={toggleReminder}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                reminderEnabled
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {reminderEnabled ? (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  {t('planner.logged')}
                </>
              ) : (
                <>
                  <BellOff className="w-3.5 h-3.5" />
                  {t('common.close')}
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            {reminderEnabled
              ? t('planner.logToJira')
              : t('planner.noTasks')}
          </p>
        </div>

        {/* Note */}
        <p className="text-[11px] text-[var(--text-tertiary)] italic">
          {t('common.file')}
        </p>
      </div>
    </motion.div>
  );
}
