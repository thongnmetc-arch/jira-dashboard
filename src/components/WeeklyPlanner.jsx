import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Save,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { logMultipleWorklogs } from '../utils/jiraWorklog';
import { fetchJiraIssues } from '../utils/jiraApi';

const STORAGE_KEY = 'jira-dash-weekly-plan';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_LABELS = { Mon: 'Thứ 2', Tue: 'Thứ 3', Wed: 'Thứ 4', Thu: 'Thứ 5', Fri: 'Thứ 6' };
const MIN_HOURS_PER_DAY = 7;
const TARGET_WEEKLY_HOURS = 35;

// ── Helpers ─────────────────────────────────────────────────────────────────

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday=1, Sunday=0 -> go back to Mon
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}`;
}

function formatISODate(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function getWeekKey(monday) {
  const y = monday.getFullYear();
  // ISO week number
  const startOfYear = new Date(y, 0, 1);
  const diff = (monday - startOfYear + (startOfYear.getTimezoneOffset() - monday.getTimezoneOffset()) * 60000) / 86400000;
  const weekNum = Math.ceil((diff + startOfYear.getDay() + 1) / 7);
  return `${y}-W${String(weekNum).padStart(2, '0')}`;
}

function computeDayDate(monday, dayIndex) {
  const d = new Date(monday);
  d.setDate(d.getDate() + dayIndex);
  return d;
}

function loadPlan(weekKey) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw);
    return all[weekKey] || null;
  } catch {
    return null;
  }
}

function savePlan(weekKey, plan) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[weekKey] = plan;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Failed to save weekly plan:', e);
  }
}

let taskIdCounter = 1;
function genId() {
  return 'task_' + Date.now() + '_' + (taskIdCounter++);
}

function createDefaultTask() {
  return { id: genId(), name: '', hours: 1, jiraKey: '', status: 'Open', issueType: '', logged: false, logError: '' };
}

function createDayPlan() {
  return [];
}

function createWeekPlan() {
  return { Mon: createDayPlan(), Tue: createDayPlan(), Wed: createDayPlan(), Thu: createDayPlan(), Fri: createDayPlan() };
}

// ── Workflow state machine ───────────────────────────────────────────────────

function getValidTransitions(currentStatus, issueType, hasJiraKey) {
  // Manual tasks (no JIRA key): full freedom — return null means all transitions allowed
  if (!hasJiraKey) return null;

  const s = (currentStatus || 'Open').toLowerCase();

  // Terminal states — no transitions
  if (s === 'cancelled' || s === 'closed' || s === 'resolved') return [];

  if (s === 'open') {
    return ['In Progress', 'Cancelled'];
  }
  if (s === 'in progress') {
    return ['Cancelled'];
  }

  // Filter out statuses by issue type
  const t = (issueType || '').toLowerCase();
  const all = ['In Progress', 'Cancelled', 'Resolved', 'Closed'];
  return all.filter(st => {
    if (t === 'task' && st === 'Resolved') return false;
    if (t === 'sub-task' && st === 'Closed') return false;
    return true;
  });
}

function getTargetStatusAfterLog(issueType) {
  return (issueType || '').toLowerCase() === 'sub-task' ? 'Resolved' : 'Closed';
}

// ── Custom dropdown ─────────────────────────────────────────────────────────

function Dropdown({ value, onChange, options, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasValue = value !== '' && value !== undefined && value !== null;
  const selected = options.find(o => o.value === value);
  const displayLabel = selected ? selected.label : '';

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
          hasValue
            ? 'border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]'
            : 'border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50'
        } ${className || ''}`}
      >
        <span className="max-w-[60px] truncate">{displayLabel}</span>
        <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-28 max-h-60 overflow-y-auto bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-xl py-1">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[var(--bg-secondary)] cursor-pointer ${
                value === opt.value
                  ? 'text-[var(--accent)] font-medium bg-[var(--accent-light)]'
                  : 'text-[var(--text-primary)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Status Dropdown ─────────────────────────────────────────────────────────

function StatusDropdown({ value, onChange, allStatuses, disabled, transitions }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const hasValue = value && value !== 'Open';

  if (disabled) {
    return <span className="text-[9px] text-[var(--text-tertiary)] line-through">{value || 'Open'}</span>;
  }
  
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 text-[9px] px-1.5 h-5 rounded border cursor-pointer whitespace-nowrap transition-colors ${
          hasValue
            ? 'border-[var(--accent)]/40 bg-[var(--accent-light)] text-[var(--accent)]'
            : 'border-[var(--border-primary)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--accent)]/30'
        }`}
      >
        {value || 'Open'}
        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-36 max-h-48 overflow-y-auto bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-xl py-1">
          {value && !(transitions != null ? transitions : allStatuses).includes(value) && (
            <button
              onClick={() => { onChange(value); setOpen(false); }}
              className="w-full text-left px-2.5 py-1.5 text-[10px] text-[var(--accent)] font-medium bg-[var(--accent-light)] cursor-pointer truncate"
            >
              {value}
            </button>
          )}
          {(transitions != null ? transitions : allStatuses).map(s => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false); }}
              className={`w-full text-left px-2.5 py-1.5 text-[10px] hover:bg-[var(--bg-secondary)] cursor-pointer truncate ${
                value === s ? 'text-[var(--accent)] font-medium bg-[var(--accent-light)]' : 'text-[var(--text-primary)]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Hours Dropdown ──────────────────────────────────────────────────────────

function HoursDropdown({ value, onChange, disabled, label }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const hoursOptions = ['0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8'];

  if (disabled) {
    return <span className="text-[10px] text-[var(--text-tertiary)] line-through font-mono">{value ? `${value}h` : '-'}</span>;
  }
  
  return (
    <div ref={ref} className="relative inline-block">
      <button
        title={label}
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 text-[10px] px-1.5 h-5 rounded border cursor-pointer transition-colors font-mono ${
          value
            ? 'border-[var(--accent)]/40 bg-[var(--accent-light)] text-[var(--accent)]'
            : 'border-[var(--border-primary)] bg-transparent text-[var(--text-secondary)] hover:border-[var(--accent)]/30'
        }`}
      >
        {value}h
        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-20 max-h-48 overflow-y-auto bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-xl py-1">
          {hoursOptions.map(h => (
            <button
              key={h}
              onClick={() => { onChange(parseFloat(h)); setOpen(false); }}
              className={`w-full text-left px-2.5 py-1.5 text-[10px] font-mono hover:bg-[var(--bg-secondary)] cursor-pointer ${
                value === parseFloat(h) ? 'text-[var(--accent)] font-medium bg-[var(--accent-light)]' : 'text-[var(--text-primary)]'
              }`}
            >
              {h}h
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Task Card ───────────────────────────────────────────────────────────────

function TaskCard({ task, day, dayDate, weekKey, onUpdate, onDelete, onLogOne, allStatuses }) {
  const { t } = useI18n();
  const [logging, setLogging] = useState(false);

  const handleLogOne = async () => {
    if (!task.jiraKey || logging) return;
    setLogging(true);
    try { await onLogOne(task, day, dayDate); }
    finally { setLogging(false); }
  };

  const isCompleted = task.status && ['resolved', 'closed', 'cancelled'].includes(task.status.toLowerCase());
  const transitions = getValidTransitions(task.status, task.issueType, !!task.jiraKey);
  const hoursLabel = task.jiraKey && task.status?.toLowerCase() === 'in progress' ? 'Time spent' : undefined;

  const statusColor = 
    task.status === 'Done' ? 'border-[var(--success)]' :
    task.status === 'In Progress' ? 'border-[var(--warning)]' :
    task.status === 'Blocked' ? 'border-[var(--danger)]' : 'border-transparent';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-[var(--bg-secondary)] rounded-lg p-2 border-l-2 ${statusColor} group relative`}
    >
      {/* Task name + delete */}
      <div className="flex items-start gap-1">
        <input
          type="text"
          value={task.name}
          onChange={(e) => onUpdate(day, task.id, { name: e.target.value })}
          placeholder="Tên task..."
          disabled={isCompleted}
          className={`flex-1 min-w-0 text-[11px] font-medium bg-transparent border-none outline-none p-0 placeholder:text-[var(--text-tertiary)] ${isCompleted ? 'text-[var(--text-tertiary)] line-through cursor-not-allowed' : 'text-[var(--text-primary)]'}`}
        />
        {!isCompleted && (
          <button onClick={() => onDelete(day, task.id)}
            className="opacity-0 group-hover:opacity-100 text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-all flex-shrink-0"
            title={t('common.delete')}>
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Meta row: status + hours + JIRA key */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <StatusDropdown
          value={task.status || 'Open'}
          onChange={(v) => onUpdate(day, task.id, { status: v })}
          allStatuses={allStatuses}
          disabled={isCompleted}
          transitions={transitions}
        />
        
        <HoursDropdown
          value={task.hours}
          onChange={(v) => onUpdate(day, task.id, { hours: v })}
          disabled={isCompleted}
          label={hoursLabel}
        />
        
        {task.jiraKey && (
          <span className="text-[9px] text-[var(--text-tertiary)] font-mono ml-auto">
            {task.issueType && <span className="mr-1">{task.issueType}</span>}
            {task.jiraKey}
          </span>
        )}
        
        {task.logged && <CheckCircle2 className="w-3 h-3 text-[var(--success)]" />}
        {!isCompleted && task.jiraKey && !task.logged && (
          <button onClick={handleLogOne} disabled={logging}
            className="text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors">
            {logging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Day Column ──────────────────────────────────────────────────────────────

function DayColumn({ day, dayDate, tasks, weekKey, onUpdate, onDelete, onAdd, onLogOne, allStatuses }) {
  const { t } = useI18n();
  const dayTotal = tasks.reduce((s, t) => s + (t.hours || 0), 0);
  const isToday = new Date().toDateString() === dayDate.toDateString();
  const isUnder = dayTotal < MIN_HOURS_PER_DAY;

  return (
    <div className={`flex flex-col rounded-xl border ${
      isToday 
        ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/30 shadow-md' 
        : 'border-[var(--border-primary)] shadow-sm'
    }`}>
      {/* Day header — calendar style */}
      <div className={`px-3 py-2 text-center ${isToday ? 'bg-[var(--accent-light)]' : 'bg-[var(--bg-secondary)]'}`}>
        <div className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">{DAY_LABELS[day]}</div>
        <div className={`text-lg font-bold font-mono mt-0.5 ${isToday ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
          {String(dayDate.getDate()).padStart(2, '0')}
        </div>
        <div className="text-[10px] text-[var(--text-tertiary)]">
          Tháng {dayDate.getMonth() + 1}
        </div>
        <div className={`mt-1.5 text-xs font-bold font-mono px-2 py-0.5 rounded-full inline-block ${
          isUnder 
            ? 'bg-[var(--danger)]/10 text-[var(--danger)]' 
            : 'bg-[var(--success)]/10 text-[var(--success)]'
        }`}>
          {dayTotal.toFixed(1)}h
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 p-2 pb-16 space-y-1.5 bg-[var(--bg-primary)]">
        <AnimatePresence mode="popLayout">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} day={day} dayDate={dayDate} weekKey={weekKey} onUpdate={onUpdate} onDelete={onDelete} onLogOne={onLogOne} allStatuses={allStatuses} />
          ))}
        </AnimatePresence>

      </div>

      {/* Add button at bottom */}
      <button
        onClick={() => onAdd(day)}
        className="w-full py-2 text-[11px] font-medium text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)] border-t border-[var(--border-primary)] transition-colors cursor-pointer"
      >
        + {t('planner.addTask')}
      </button>
    </div>
  );
}

// ── Weekly Planner ──────────────────────────────────────────────────────────

export default function WeeklyPlanner() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();

  // Current week's Monday
  const [monday, setMonday] = useState(() => getMonday(new Date()));
  const weekKey = getWeekKey(monday);

  // Plan data: { Mon: [...], Tue: [...], ... }
  const [plan, setPlan] = useState(() => loadPlan(weekKey) || createWeekPlan());

  // Logging state
  const [logging, setLogging] = useState(false);
  const [logResults, setLogResults] = useState(null); // { success, failed }
  const [saveMessage, setSaveMessage] = useState('');
  const [loadingJira, setLoadingJira] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState('off'); // 'off' | '5' | '15' | '30' | '60'
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const intervalRef = useRef(null);

  const AUTO_REFRESH_OPTIONS = [
    { value: 'off', label: 'Tắt' },
    { value: '5', label: '5 phút' },
    { value: '15', label: '15 phút' },
    { value: '30', label: '30 phút' },
    { value: '60', label: '1 giờ' },
  ];

  // Load JIRA tasks every time the week changes (always fetches fresh data)
  useEffect(() => {
    loadJiraTasks();
    setLogResults(null);
    setSaveMessage('');
  }, [weekKey]); // eslint-disable-line

  // Auto-refresh interval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (autoRefresh !== 'off' && state.jiraConfig?.url) {
      const minutes = parseInt(autoRefresh, 10);
      if (!isNaN(minutes) && minutes > 0) {
        intervalRef.current = setInterval(() => {
          loadJiraTasks();
        }, minutes * 60 * 1000);
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, state.jiraConfig]);

  // ── Load JIRA tasks ──

  const loadJiraTasks = useCallback(async () => {
    const { url, assignee, token, projectKey, jql } = state.jiraConfig || {};
    if (!url || !token || !projectKey) return;

    setLoadingJira(true);
    try {
      // Build query with assignee filter from wizard email
      let queryJql = jql || '';
      if (assignee && assignee.trim()) {
        const assigneeFilter = `assignee = "${assignee.trim()}"`;
        if (queryJql.trim()) {
          // Append to existing JQL
          queryJql = `(${queryJql.trim()}) AND ${assigneeFilter}`;
        } else {
          queryJql = `project = "${projectKey}" AND ${assigneeFilter} ORDER BY created DESC`;
        }
      } else if (!queryJql.trim()) {
        queryJql = `project = "${projectKey}" ORDER BY created DESC`;
      }
      const tasks = await fetchJiraIssues(url, token, projectKey, assignee || '', queryJql);

      // Filter to this week's date range
      const weekStart = new Date(monday);
      const weekEnd = new Date(monday);
      weekEnd.setDate(weekEnd.getDate() + 5);

      const weekTasks = tasks.filter(t => {
        if (t.status?.toLowerCase() === 'cancelled') return false;
        const d = t.dueDate || t.resolved || t.startDate;
        if (!d) return false;
        const dt = new Date(d);
        return dt >= weekStart && dt < weekEnd;
      });

      // Distribute to days
      const newPlan = createWeekPlan();
      weekTasks.forEach(t => {
        const d = t.dueDate || t.resolved || t.startDate;
        if (!d) return;
        const dt = new Date(d);
        const dayIndex = dt.getDay() - 1; // 0=Mon, 4=Fri
        if (dayIndex < 0 || dayIndex > 4) return;
        const day = DAYS[dayIndex];
        newPlan[day].push({
          id: genId(),
          name: t.summary || t.key,
          hours: Math.round((t.timeSpentHr || t.estimateHr || 1) * 2) / 2,
          jiraKey: t.key,
          status: t.status || 'Open',
          issueType: t.issueType || 'Task',
          logged: false,
          logError: '',
        });
      });

      // Merge with existing plan if any
      const existingPlan = loadPlan(weekKey);
      if (existingPlan) {
        const merged = { ...existingPlan };
        for (const day of DAYS) {
          const jiraTaskMap = {};
          (newPlan[day] || []).forEach(t => {
            if (t.jiraKey) jiraTaskMap[t.jiraKey] = t;
          });

          // Update existing tasks with fresh JIRA data (status, hours, name), keep manual tasks
          merged[day] = (existingPlan[day] || []).map(t => {
            if (t.jiraKey && jiraTaskMap[t.jiraKey]) {
              const fresh = jiraTaskMap[t.jiraKey];
              return { ...t, status: fresh.status || t.status, name: fresh.name, hours: fresh.hours, logged: false };
            }
            return t;
          });

          // Add new JIRA tasks that don't exist yet
          const existingKeys = new Set((existingPlan[day] || []).map(t => t.jiraKey));
          const newForDay = (newPlan[day] || []).filter(t => t.jiraKey && !existingKeys.has(t.jiraKey));
          merged[day] = [...merged[day], ...newForDay];
        }
        setPlan(merged);
      } else {
        setPlan(newPlan);
      }
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Failed to load JIRA tasks:', err);
    } finally {
      setLoadingJira(false);
    }
  }, [state.jiraConfig, monday, weekKey]);


  // Navigate weeks
  const goPrevWeek = useCallback(() => {
    const prev = new Date(monday);
    prev.setDate(prev.getDate() - 7);
    setMonday(prev);
  }, [monday]);

  const goNextWeek = useCallback(() => {
    const next = new Date(monday);
    next.setDate(next.getDate() + 7);
    setMonday(next);
  }, [monday]);

  const goCurrentWeek = useCallback(() => {
    setMonday(getMonday(new Date()));
  }, []);

  // ── CRUD operations ──

  const addTask = useCallback((day) => {
    setPlan((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), createDefaultTask()],
    }));
  }, []);

  const updateTask = useCallback((day, taskId, updates) => {
    setPlan((prev) => ({
      ...prev,
      [day]: (prev[day] || []).map((t) =>
        t.id === taskId ? { ...t, ...updates } : t
      ),
    }));
  }, []);

  const deleteTask = useCallback((day, taskId) => {
    setPlan((prev) => ({
      ...prev,
      [day]: (prev[day] || []).filter((t) => t.id !== taskId),
    }));
  }, []);

  // ── Save to localStorage ──

  const handleSave = useCallback(() => {
    savePlan(weekKey, plan);
    setLastSyncTime(new Date());
    setSaveMessage(t('planner.logged'));
    setTimeout(() => setSaveMessage(''), 2000);
  }, [weekKey, plan, t]);

  // ── Log to JIRA ──

  const handleLogAll = useCallback(async () => {
    const { url, token } = state.jiraConfig;
    if (!url || !token) {
      setLogResults({ success: [], failed: [{ issueKey: '', error: t('planner.error') + '. ' + t('connect.title') }] });
      return;
    }

    // Collect all tasks that have a JIRA key and haven't been logged yet
    const entries = [];
    const dayMap = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4 };

    for (const day of DAYS) {
      const tasks = plan[day] || [];
      const dayDate = computeDayDate(monday, dayMap[day]);
      for (const task of tasks) {
        if (!task.jiraKey || task.logged) continue;
        // Format started timestamp: YYYY-MM-DDT08:00:00+07:00
        const dateStr = formatISODate(dayDate);
        const started = `${dateStr}T08:00:00+07:00`;
        entries.push({
          issueKey: task.jiraKey,
          timeSpent: task.hours + 'h',
          comment: task.name || 'Worklog from JIRA Dashboard',
          startedDate: started,
          day,
          taskId: task.id,
        });
      }
    }

    if (entries.length === 0) {
      setLogResults({ success: [], failed: [{ issueKey: '', error: t('planner.noTasks') }] });
      return;
    }

    setLogging(true);
    setLogResults(null);

    try {
      const email = state.jiraConfig.assignee || '';
      const result = await logMultipleWorklogs(url, email, token, entries);

      // Mark successfully logged tasks
      const succeededKeys = new Set(result.success.map((e) => e.issueKey));
      setPlan((prev) => {
        const next = { ...prev };
        for (const day of DAYS) {
          next[day] = (prev[day] || []).map((t) => {
            if (succeededKeys.has(t.jiraKey)) {
              return { ...t, logged: true, logError: '' };
            }
            // Mark failed tasks
            const failed = result.failed.find((f) => f.issueKey === t.jiraKey);
            if (failed) {
              return { ...t, logged: false, logError: failed.error };
            }
            return t;
          });
        }
        return next;
      });

      setLogResults(result);
    } catch (err) {
      setLogResults({ success: [], failed: [{ issueKey: '', error: err.message || t('common.error') }] });
    } finally {
      setLogging(false);
    }
  }, [plan, monday, state.jiraConfig, t]);

  // ── Log single task ──

  const handleLogOne = useCallback(async (task, day, dayDate) => {
    const { url, token } = state.jiraConfig || {};
    if (!url || !token || !task.jiraKey) return;

    const started = new Date(dayDate);
    started.setHours(9, 0, 0, 0);

    try {
      await logMultipleWorklogs(url, state.jiraConfig.assignee || '', token, [{
        issueKey: task.jiraKey,
        timeSpent: task.hours + 'h',
        comment: task.name || 'Worklog from JIRA Dashboard',
        startedDate: formatISODate(started),
        day,
        taskId: task.id,
      }]);

      // Mark as logged and update status to target state
      const targetStatus = getTargetStatusAfterLog(task.issueType);
      setPlan(prev => {
        const next = { ...prev };
        next[day] = (prev[day] || []).map(t =>
          t.id === task.id ? { ...t, logged: true, logError: '', status: targetStatus } : t
        );
        return next;
      });
    } catch (err) {
      setPlan(prev => {
        const next = { ...prev };
        next[day] = (prev[day] || []).map(t =>
          t.id === task.id ? { ...t, logged: false, logError: err.message || 'Lỗi' } : t
        );
        return next;
      });
    }
  }, [state.jiraConfig]);

  // ── Computed totals ──

  const dayTotals = DAYS.map((day) => {
    const tasks = plan[day] || [];
    return tasks.reduce((s, t) => s + (t.hours || 0), 0);
  });
  const totalHours = dayTotals.reduce((s, h) => s + h, 0);
  const totalTasks = DAYS.reduce((s, day) => s + (plan[day] || []).length, 0);
  const progressPct = Math.min((totalHours / TARGET_WEEKLY_HOURS) * 100, 100);

  const mondayDate = monday;
  const fridayDate = new Date(monday);
  fridayDate.setDate(fridayDate.getDate() + 4);

  const allStatuses = useMemo(() => {
    const set = new Set();
    DAYS.forEach(day => {
      (plan[day] || []).forEach(t => {
        if (t.status) set.add(t.status);
      });
    });
    return ['Open', ...Array.from(set).filter(s => s !== 'Open')];
  }, [plan]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* ── Header: Calendar-style week title ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={goPrevWeek} className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={goCurrentWeek} className="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
            📅 {formatDate(mondayDate)} – {formatDate(fridayDate)}
          </button>
          <button onClick={goNextWeek} className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* ── Sync status row ── */}
      {state.jiraConfig?.url && (
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]/50 mb-4">
          {/* Sync status */}
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <RefreshCw className="w-3 h-3" />
            {lastSyncTime ? (
              <span>Đồng bộ lúc {lastSyncTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
            ) : (
              <span>Chưa đồng bộ</span>
            )}
          </div>
          
          <div className="flex-1" />
          
          {/* Progress bar */}
          <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
            <strong className="text-[var(--text-primary)]">{totalHours.toFixed(1)}h</strong> / {TARGET_WEEKLY_HOURS}h
          </span>
          <div className="w-28 h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
            <motion.div initial={{width:0}} animate={{width:progressPct+'%'}} transition={{duration:0.5}}
              className={`h-full rounded-full ${progressPct>=100 ? 'bg-[var(--success)]' : 'bg-[var(--accent)]'}`} />
          </div>
          
          {/* Log result inline (compact) */}
          {logResults && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              logResults.failed.length === 0 
                ? 'bg-[var(--success)]/10 text-[var(--success)]' 
                : 'bg-[var(--danger)]/10 text-[var(--danger)]'
            }`}>
              {logResults.success.length > 0 && `${logResults.success.length} ✅ `}
              {logResults.failed.length > 0 && `${logResults.failed.length} ❌`}
            </span>
          )}
          
          {/* Sync now button */}
          <button onClick={loadJiraTasks} disabled={loadingJira}
            className="h-7 text-xs px-2.5 rounded-md border border-[var(--border-primary)] hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] transition-colors disabled:opacity-50 flex items-center gap-1">
            {loadingJira ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Đồng bộ
          </button>
          
          {/* Auto-refresh — force same h-7 */}
          <div className="h-7">
            <Dropdown
              value={autoRefresh}
              onChange={setAutoRefresh}
              options={AUTO_REFRESH_OPTIONS}
              className="h-7"
            />
          </div>
        </div>
      )}

      {/* ── Day columns ── */}
      <div className="grid grid-cols-5 gap-3 mb-6 overflow-x-auto pb-2">
        {DAYS.map((day, idx) => {
          const dayDate = computeDayDate(monday, idx);
          return (
            <DayColumn
              key={day}
              day={day}
              dayDate={dayDate}
              tasks={plan[day] || []}
              weekKey={weekKey}
              onUpdate={updateTask}
              onDelete={deleteTask}
              onAdd={addTask}
              onLogOne={handleLogOne}
              allStatuses={allStatuses}
            />
          );
        })}
      </div>

      {/* ── Bottom actions ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg">
        {/* Summary */}
        <div className="text-xs text-[var(--text-tertiary)]">
          {totalTasks} {t('common.tasks')} · {totalHours.toFixed(1)}h
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {saveMessage && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-[var(--success)] font-medium"
            >
              {saveMessage}
            </motion.span>
          )}

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t('planner.save')}</span>
          </button>

          {/* Log to JIRA button */}
          <button
            onClick={handleLogAll}
            disabled={logging}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-medium rounded-lg bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
          >
            {logging ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t('planner.logging')}</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>{t('planner.logToJira')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
