import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, Bell, BellOff, Clock, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

const REPORT_TYPES = [
  { value: 'monthly', label: 'Tổng hợp tháng' },
  { value: 'task-detail', label: 'Chi tiết task' },
  { value: 'effort', label: 'Effort' },
];

const FORMATS = [
  { value: 'csv', label: 'CSV' },
  { value: 'json', label: 'JSON' },
];

function generateCSV(tasks, reportType) {
  const headers = ['Issue Key', 'Summary', 'Phân hệ', 'Sprint', 'Người thực hiện', 'Giờ log', 'Giờ ước tính', 'Trạng thái', 'Loại', 'Mức độ ưu tiên', 'Ngày tạo', 'Ngày kết thúc'];
  const rows = tasks.map(t => [
    t.key, t.summary, (t.comps || []).join('; '), t.primarySprint, t.assignee,
    (t.timeSpentHr || 0).toFixed(1), (t.estimateHr || 0).toFixed(1), t.status,
    t.issueType || '', t.priority || '',
    t.created ? t.created.toISOString().slice(0, 10) : '',
    t.resolved ? t.resolved.toISOString().slice(0, 10) : '',
  ]);

  let filteredRows = rows;
  if (reportType === 'effort') {
    // Only include key, summary, giờ log, giờ ước tính
    filteredRows = rows.map(r => [r[0], r[1], r[5], r[6]]);
    return ['Issue Key,Summary,Giờ log,Giờ ước tính', ...filteredRows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(','))].join('\n');
  }
  if (reportType === 'task-detail') {
    // Full detail
    filteredRows = rows;
  }

  return [headers.join(','), ...filteredRows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(','))].join('\n');
}

function generateJSON(tasks, reportType) {
  if (reportType === 'effort') {
    return JSON.stringify(tasks.map(t => ({
      key: t.key,
      summary: t.summary,
      timeSpentHr: t.timeSpentHr,
      estimateHr: t.estimateHr,
      effort: t.estimateHr > 0 ? (t.timeSpentHr / t.estimateHr).toFixed(2) : 0,
    })), null, 2);
  }
  if (reportType === 'task-detail') {
    return JSON.stringify(tasks.map(t => ({
      key: t.key,
      summary: t.summary,
      status: t.status,
      issueType: t.issueType,
      priority: t.priority,
      assignee: t.assignee,
      comps: t.comps,
      primarySprint: t.primarySprint,
      timeSpentHr: t.timeSpentHr,
      estimateHr: t.estimateHr,
      created: t.created ? t.created.toISOString() : null,
      resolved: t.resolved ? t.resolved.toISOString() : null,
    })), null, 2);
  }
  // monthly summary
  const monthMap = {};
  tasks.forEach(t => {
    const d = t.resolved || t.created;
    if (!d) return;
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if (!monthMap[key]) monthMap[key] = { taskCount: 0, totalHours: 0, totalEstimate: 0 };
    monthMap[key].taskCount += 1;
    monthMap[key].totalHours += t.timeSpentHr || 0;
    monthMap[key].totalEstimate += t.estimateHr || 0;
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
      content = generateCSV(tasks, reportType);
      filename = `jira-report-${reportType}-${dateStr}.csv`;
      mimeType = 'text/csv';
    } else {
      content = generateJSON(tasks, reportType);
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
  }, [state.allTasks, reportType, format, reminderEnabled]);

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
          body: 'Nhắc nhở: Đã đến lúc tạo báo cáo cuối tuần!',
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
            body: 'Nhắc nhở: Hôm nay là thứ 6 — hãy tạo báo cáo cuối tuần!',
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
  }, [reminderEnabled]);

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
          Báo cáo tự động
        </h3>
      </div>

      <div className="space-y-4">
        {/* Report type */}
        <div>
          <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
            Loại báo cáo
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
                {rt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div>
          <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
            Định dạng
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
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* File location hint */}
        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] bg-[var(--bg-secondary)] rounded-lg px-3 py-2">
          <Download className="w-3.5 h-3.5 flex-shrink-0" />
          <span>File sẽ được tải về thư mục Downloads</span>
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
              Đã tạo báo cáo!
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Tạo báo cáo ngay
            </>
          )}
        </button>

        {/* Last report date */}
        {lastReportDate && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
            <Clock className="w-3 h-3" />
            <span>Báo cáo gần nhất: <strong>{lastReportDate}</strong></span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-[var(--border-primary)]" />

        {/* Reminder */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
              Lên lịch nhắc nhở
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
                  Đã bật
                </>
              ) : (
                <>
                  <BellOff className="w-3.5 h-3.5" />
                  Tắt
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            {reminderEnabled
              ? 'Nhắc tôi tạo báo cáo mỗi thứ 6. Bạn sẽ nhận được thông báo trong giờ làm việc.'
              : 'Bật để nhận nhắc nhở tạo báo cáo vào mỗi thứ 6 hàng tuần.'}
          </p>
        </div>

        {/* Note */}
        <p className="text-[11px] text-[var(--text-tertiary)] italic">
          File được tải trực tiếp về máy, không cần kết nối email hay máy chủ.
        </p>
      </div>
    </motion.div>
  );
}
