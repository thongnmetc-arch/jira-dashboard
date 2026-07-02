import { useState, useEffect, useRef, useCallback } from 'react';
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
const MAX_HOURS_PER_DAY = 8;
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
  return { id: genId(), name: '', hours: 1, jiraKey: '', logged: false, logError: '' };
}

function createDayPlan() {
  return [];
}

function createWeekPlan() {
  return { Mon: createDayPlan(), Tue: createDayPlan(), Wed: createDayPlan(), Thu: createDayPlan(), Fri: createDayPlan() };
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

// ── Task Card ───────────────────────────────────────────────────────────────

function TaskCard({ task, day, dayDate, weekKey, onUpdate, onDelete, onLogOne }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);

  const logStatusIcon = task.logged ? (
    <CheckCircle2 className="w-3 h-3 text-[var(--success)]" title={t('planner.logged')} />
  ) : task.logError ? (
    <AlertCircle className="w-3 h-3 text-[var(--danger)]" title={task.logError} />
  ) : task.jiraKey ? (
    <Clock className="w-3 h-3 text-[var(--text-tertiary)]" title={t('planner.logToJira')} />
  ) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="bg-white dark:bg-slate-800 shadow-sm rounded-lg p-3 border border-[var(--border-primary)] group"
    >
      {/* Header row: name + delete */}
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <input
          type="text"
          value={task.name}
          onChange={(e) => onUpdate(day, task.id, { name: e.target.value })}
          placeholder={t('planner.addTask') + '...'}
          className="flex-1 text-xs font-medium bg-transparent border-none outline-none p-0 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
        />
        <button
          onClick={() => onDelete(day, task.id)}
          className="opacity-0 group-hover:opacity-100 text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-all p-0.5 cursor-pointer"
          title={t('common.delete')}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Row 2: hours + JIRA key + status */}
      <div className="flex items-center gap-2">
        {/* Hours */}
        <div className="flex items-center gap-1">
          <Dropdown
            value={String(task.hours)}
            onChange={(val) => onUpdate(day, task.id, { hours: parseFloat(val) })}
            options={[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8].map(h => ({ value: String(h), label: h + 'h' }))}
          />
        </div>

        {/* JIRA key */}
        <input
          type="text"
          value={task.jiraKey}
          onChange={(e) => onUpdate(day, task.id, { jiraKey: e.target.value.toUpperCase() })}
          placeholder="KEY-123"
          className="flex-1 text-[11px] bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-1.5 py-0.5 outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] font-mono min-w-0"
        />

        {/* Log status */}
        <div className="flex-shrink-0">{logStatusIcon}</div>
      </div>
    </motion.div>
  );
}

// ── Day Column ──────────────────────────────────────────────────────────────

function DayColumn({ day, dayDate, tasks, weekKey, onUpdate, onDelete, onAdd }) {
  const { t } = useI18n();
  const dayTotal = tasks.reduce((s, t) => s + (t.hours || 0), 0);
  const dateStr = formatDate(dayDate);
  const isOver = dayTotal > MAX_HOURS_PER_DAY;

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-[var(--border-primary)] min-h-[300px]">
      {/* Day header */}
      <div className="p-3 border-b border-[var(--border-primary)] text-center">
        <div className="text-xs font-semibold text-[var(--text-primary)]">{DAY_LABELS[day]}</div>
        <div className="text-[11px] text-[var(--text-tertiary)]">{dateStr}</div>
        <div className={`mt-1 text-sm font-bold font-mono ${isOver ? 'text-[var(--danger)]' : 'text-[var(--accent)]'}`}>
          {dayTotal.toFixed(1)}h
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              day={day}
              dayDate={dayDate}
              weekKey={weekKey}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </AnimatePresence>

        {tasks.length === 0 && (
          <div className="text-center py-6 text-[11px] text-[var(--text-tertiary)]">
            {t('planner.noTasks')}
          </div>
        )}
      </div>

      {/* Add button */}
      <div className="p-2 border-t border-[var(--border-primary)]">
        <button
          onClick={() => onAdd(day)}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)] rounded-md transition-colors cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>{t('planner.addTask')}</span>
        </button>
      </div>
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

  // Load plan when week changes
  useEffect(() => {
    const saved = loadPlan(weekKey);
    if (saved) {
      setPlan(saved);
    } else {
      setPlan(createWeekPlan());
      loadJiraTasks();
    }
    setLogResults(null);
    setSaveMessage('');
  }, [weekKey]);

  // ── Load JIRA tasks ──

  const loadJiraTasks = useCallback(async (force = false) => {
    const { url, assignee, token, projectKey, jql } = state.jiraConfig || {};
    if (!url || !token || !projectKey) return;

    // Auto-load: skip if we already have a saved plan with data (unless forced)
    if (!force) {
      const existing = loadPlan(weekKey);
      if (existing && Object.values(existing).some(arr => arr.length > 0)) {
        return;
      }
    }

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
          logged: false,
          logError: '',
        });
      });

      // Merge with existing plan if any
      const existingPlan = loadPlan(weekKey);
      if (existingPlan) {
        const merged = { ...existingPlan };
        for (const day of DAYS) {
          const existingKeys = new Set((existingPlan[day] || []).map(t => t.jiraKey));
          const newForDay = (newPlan[day] || []).filter(t => !existingKeys.has(t.jiraKey));
          merged[day] = [...(existingPlan[day] || []), ...newForDay];
        }
        setPlan(merged);
      } else {
        setPlan(newPlan);
      }
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

  // ── Computed totals ──

  const dayTotals = DAYS.map((day) => {
    const tasks = plan[day] || [];
    return tasks.reduce((s, t) => s + (t.hours || 0), 0);
  });
  const totalHours = dayTotals.reduce((s, h) => s + h, 0);
  const progressPct = Math.min((totalHours / TARGET_WEEKLY_HOURS) * 100, 100);

  const mondayDate = monday;
  const fridayDate = new Date(monday);
  fridayDate.setDate(fridayDate.getDate() + 4);

  const isCurrentWeek =
    getMonday(new Date()).getTime() === monday.getTime();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* ── Header: Week navigation ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-[var(--text-primary)]">{t('planner.title')}</h2>

          <div className="flex items-center gap-1">
            <button
              onClick={goPrevWeek}
              className="p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--accent)] transition-colors cursor-pointer"
              title={t('planner.logToJira')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={goCurrentWeek}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                isCurrentWeek
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {formatDate(mondayDate)} - {formatDate(fridayDate)}
            </button>

            <button
              onClick={goNextWeek}
              className="p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--accent)] transition-colors cursor-pointer"
              title={t('planner.logToJira')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-secondary)]">
            {t('planner.target')}: <strong className="text-[var(--text-primary)]">{totalHours.toFixed(1)}h</strong> / {TARGET_WEEKLY_HOURS}h
          </span>
          <div className="w-24 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: progressPct + '%' }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full rounded-full ${progressPct >= 100 ? 'bg-[var(--success)]' : 'bg-[var(--accent)]'}`}
            />
          </div>
        </div>

        {/* JIRA actions */}
        <div className="flex items-center gap-2">
          {!state.jiraConfig?.url || !state.jiraConfig?.token ? (
            <span className="text-[11px] text-[var(--text-tertiary)] italic">{t('planner.error')}</span>
          ) : (
            <button
              onClick={() => loadJiraTasks(true)}
              disabled={loadingJira}
              className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              title={t('planner.logToJira')}
            >
              {loadingJira ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {t('planner.addTask')}
            </button>
          )}
        </div>
      </div>

      {/* ── Day columns ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
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
            />
          );
        })}
      </div>

      {/* ── Log results ── */}
      {logResults && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-4 p-3 rounded-lg border text-xs ${
            logResults.failed.length === 0 || logResults.success.length > 0
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
          }`}
        >
          {logResults.success.length > 0 && (
            <p>{t('planner.logged')} {logResults.success.length} {t('planner.hours')}</p>
          )}
          {logResults.failed.length > 0 && (
            <div className="mt-1">
              <p className="font-medium">{t('common.error')}: {logResults.failed.length}</p>
              <ul className="list-disc list-inside mt-0.5">
                {logResults.failed.map((f, i) => (
                  <li key={i}>
                    {f.issueKey && <strong>{f.issueKey}</strong>}
                    {f.issueKey ? ': ' : ''}
                    {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Bottom actions ── */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg">
        {/* Progress bar */}
        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
          <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
            <strong className="text-[var(--text-primary)]">{totalHours.toFixed(1)}h</strong> / {TARGET_WEEKLY_HOURS}h
          </span>
          <div className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: progressPct + '%' }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full rounded-full ${progressPct >= 100 ? 'bg-[var(--success)]' : 'bg-[var(--accent)]'}`}
            />
          </div>
          <span className="text-[11px] text-[var(--text-tertiary)] whitespace-nowrap font-mono">
            {progressPct.toFixed(0)}%
          </span>
        </div>

        {/* Save button */}
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t('planner.save')}</span>
          </button>

          {/* Log to JIRA button */}
          <button
            onClick={handleLogAll}
            disabled={logging}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
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
