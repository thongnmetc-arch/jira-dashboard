import { useState, useEffect, useCallback, useRef } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
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
  const diff = day === 0 ? -6 : 1 - day;
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

function getWeekKey(monday) {
  const y = monday.getFullYear();
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
  return { id: genId(), name: '', hours: 1, jiraKey: '', status: 'Open', issueType: '' };
}

function createDayPlan() {
  return [];
}

function createWeekPlan() {
  return { Mon: createDayPlan(), Tue: createDayPlan(), Wed: createDayPlan(), Thu: createDayPlan(), Fri: createDayPlan() };
}

// ── Task Card ───────────────────────────────────────────────────────────────

function TaskCard({ task, day, onUpdate }) {
  const isJiraTask = !!task.jiraKey;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-[var(--bg-primary)] rounded-lg px-3 py-2 border border-[var(--border-primary)]"
    >
      {/* Row 1: Name */}
      <div className="flex items-start gap-1">
        <input
          type="text"
          value={task.name}
          onChange={(e) => onUpdate(day, task.id, { name: e.target.value })}
          disabled={isJiraTask}
          placeholder="Tên task..."
          className={`flex-1 min-w-0 text-[11px] font-medium bg-transparent border-none outline-none p-0 placeholder:text-[var(--text-tertiary)] ${
            isJiraTask
              ? 'text-[var(--text-primary)] cursor-default'
              : 'text-[var(--text-primary)]'
          }`}
        />
      </div>

      {/* Row 2: Status | Hours | JIRA key */}
      <div className="flex items-center gap-1.5 mt-1.5">
        {/* Status — plain text with color */}
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
          (task.status || 'Open').toLowerCase() === 'in progress'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            : (task.status || 'Open').toLowerCase() === 'closed' || (task.status || 'Open').toLowerCase() === 'resolved'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : (task.status || 'Open').toLowerCase() === 'cancelled'
            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
        }`}>
          {task.status || 'Open'}
        </span>

        {/* Hours — plain text */}
        <span className="text-[10px] text-[var(--text-secondary)] font-mono">{task.hours}h</span>

        {/* JIRA key + issueType */}
        {task.jiraKey && (
          <span className="text-[9px] text-[var(--text-tertiary)] font-mono ml-auto">
            {task.issueType && <span className="mr-1">{task.issueType}</span>}
            {task.jiraKey}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── Day Column ──────────────────────────────────────────────────────────────

function DayColumn({ day, dayDate, tasks, weekKey, onUpdate }) {
  const { t } = useI18n();
  const dayTotal = tasks.reduce((s, t) => s + (t.hours || 0), 0);
  const isToday = new Date().toDateString() === dayDate.toDateString();
  const isUnder = dayTotal < MIN_HOURS_PER_DAY;

  return (
    <div className={`flex flex-col rounded-2xl border-2 overflow-hidden ${
      isToday 
        ? 'border-blue-400 dark:border-blue-500 ring-2 ring-blue-400/30 shadow-lg shadow-blue-500/10' 
        : 'border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-shadow'
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
      <div className="flex-1 p-2 pb-4 space-y-1.5 bg-[var(--bg-primary)] min-h-[200px]">
        <AnimatePresence mode="popLayout">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} day={day} onUpdate={onUpdate} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Weekly Planner ──────────────────────────────────────────────────────────

export default function WeeklyPlanner() {
  const { t } = useI18n();
  const { state } = useApp();

  // Current week's Monday
  const [monday, setMonday] = useState(() => getMonday(new Date()));
  const weekKey = getWeekKey(monday);

  // Plan data: { Mon: [...], Tue: [...], ... }
  const [plan, setPlan] = useState(() => loadPlan(weekKey) || createWeekPlan());

  // Track which week was last loaded to guard against StrictMode double-invoke
  const lastLoadedWeekKey = useRef('');

  // Load JIRA tasks when week changes
  useEffect(() => {
    if (lastLoadedWeekKey.current === weekKey) return; // Already loaded this week
    lastLoadedWeekKey.current = weekKey;
    loadJiraTasks();
  }, [weekKey]); // eslint-disable-line

  // ── Load JIRA tasks ──

  async function loadJiraTasks() {
    // Try state first, fall back to localStorage (for when outer AppProvider doesn't have config)
    let config = state.jiraConfig;
    if (!config?.url) {
      try {
        const saved = localStorage.getItem('jira-dash-config');
        if (saved) config = JSON.parse(saved);
      } catch(e) {}
    }
    const { url, assignee, token, projectKey, jql } = config || {};
    if (!url || !token || !projectKey) return;

    try {
      // Build query with assignee filter from wizard email
      let queryJql = jql || '';
      if (assignee && assignee.trim()) {
        const assigneeFilter = `assignee = "${assignee.trim()}"`;
        if (queryJql.trim()) {
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
        const d = t.startDate || t.dueDate || t.resolved;
        if (!d) return false;
        const dt = new Date(d);
        return dt >= weekStart && dt < weekEnd;
      });

      // Distribute to days
      const newPlan = createWeekPlan();
      weekTasks.forEach(t => {
        const d = t.startDate || t.dueDate || t.resolved;
        if (!d) return;
        const dt = new Date(d);
        const dayIndex = dt.getDay() - 1;
        if (dayIndex < 0 || dayIndex > 4) return;
        const day = DAYS[dayIndex];
        newPlan[day].push({
          id: genId(),
          name: t.summary || t.key,
          hours: Math.round(((t.originalEstimateHr || t.estimateHr || 1)) * 2) / 2,
          jiraKey: t.key,
          status: t.status || 'Open',
          issueType: t.issueType || 'Task',
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

          merged[day] = (existingPlan[day] || []).map(t => {
            if (t.jiraKey && jiraTaskMap[t.jiraKey]) {
              const fresh = jiraTaskMap[t.jiraKey];
              return { ...t, status: fresh.status || t.status, name: fresh.name, hours: fresh.hours };
            }
            return t;
          });

          const existingKeys = new Set((existingPlan[day] || []).map(t => t.jiraKey));
          const newForDay = (newPlan[day] || []).filter(t => t.jiraKey && !existingKeys.has(t.jiraKey));
          merged[day] = [...merged[day], ...newForDay];
        }
        setPlan(merged);
      } else {
        setPlan(newPlan);
      }
    } catch (err) {
      console.error('Failed to load JIRA tasks:', err);
    }
  }

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



  const updateTask = useCallback((day, taskId, updates) => {
    setPlan((prev) => ({
      ...prev,
      [day]: (prev[day] || []).map((t) =>
        t.id === taskId ? { ...t, ...updates } : t
      ),
    }));
  }, []);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* ── Header: Week navigation + progress bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={goPrevWeek} className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={goCurrentWeek} className="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]">
            📅 {formatDate(mondayDate)} – {formatDate(fridayDate)}
          </button>
          <button onClick={goNextWeek} className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)]"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={loadJiraTasks}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors"
            title="Đồng bộ từ JIRA">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
            <strong className="text-[var(--text-primary)]">{totalHours.toFixed(1)}h</strong> / {TARGET_WEEKLY_HOURS}h
          </span>
          <div className="w-28 h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: progressPct + '%' }}
              transition={{ duration: 0.5 }}
              className={`h-full rounded-full ${progressPct >= 100 ? 'bg-[var(--success)]' : 'bg-[var(--accent)]'}`}
            />
          </div>
        </div>
      </div>

      {/* ── Day columns ── */}
      <div className="grid grid-cols-5 gap-3 mb-6 overflow-x-auto pb-2 min-h-[400px]">
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
            />
          );
        })}
      </div>
    </motion.div>
  );
}
