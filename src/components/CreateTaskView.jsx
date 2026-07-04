import { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Check, Loader2, Layers, User, ChevronDown, Clock, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { fetchJiraIssues, fetchComponents, createIssue } from '../utils/jiraApi';

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'jira-dash-weekly-plan';
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LABELS_VN = {
  Mon: 'T2',
  Tue: 'T3',
  Wed: 'T4',
  Thu: 'T5',
  Fri: 'T6',
  Sat: 'T7',
  Sun: 'CN',
};
const HOUR_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7];

// ── Helpers (mirrors WeeklyPlanner's getMonday / getWeekKey) ──────────────────

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWeekKey(monday) {
  const y = monday.getFullYear();
  const startOfYear = new Date(y, 0, 1);
  const diff =
    (monday -
      startOfYear +
      (startOfYear.getTimezoneOffset() - monday.getTimezoneOffset()) * 60000) /
    86400000;
  const weekNum = Math.ceil((diff + startOfYear.getDay() + 1) / 7);
  return `${y}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Encode a Date to a local YYYY-MM-DD key (avoids timezone pitfalls of toISOString).
 */
function dateToKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse a local YYYY-MM-DD key back to a Date at midnight local time.
 */
function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ── Calculate end time based on work schedule ────────────────────────────────

function calculateEndTime(hours) {
  // Full day (7h): 8:00 → 17:00
  if (hours >= 7) return { hour: 17, min: 0 };
  
  // Normal calculation for other hours
  const capped = Math.min(Math.max(hours, 0.5), 7);
  const workMin = Math.round(capped * 60);
  const morningMinutes = 4 * 60;
  
  let endMin;
  if (workMin <= morningMinutes) {
    endMin = 8 * 60 + workMin;
  } else {
    endMin = 13 * 60 + (workMin - morningMinutes);
  }
  
  return { hour: Math.floor(endMin / 60), min: endMin % 60 };
}

// ── PopoverSelect ─────────────────────────────────────────────────────────────

function PopoverSelect({ value, onChange, options, placeholder, icon: Icon }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const isObj = options.length > 0 && typeof options[0] === 'object';
  const filtered = options.filter(opt =>
    (isObj ? opt.label : opt).toLowerCase().includes(search.toLowerCase())
  );
  const hasValue = value && value !== '';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) setSearch(''); }}
        className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium border transition-colors cursor-pointer w-full ${
          hasValue
            ? 'border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]'
            : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
        }`}
      >
        {Icon && <Icon className="w-3 h-3" />}
        <span className="flex-1 text-left truncate">{hasValue ? (isObj ? (options.find(o => o.value === value)?.label || value) : value) : placeholder}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-full max-h-60 overflow-y-auto bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-xl py-1">
          {/* Search input */}
          <div className="px-2 pb-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md px-2 py-1 outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <button onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
            className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] cursor-pointer">
            {placeholder}
          </button>
          {filtered.map(opt => {
            const optValue = isObj ? opt.value : opt;
            const optLabel = isObj ? opt.label : opt;
            return (
              <button key={optValue} onClick={() => { onChange(optValue); setOpen(false); setSearch(''); }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-secondary)] cursor-pointer truncate ${
                  value === optValue ? 'text-[var(--accent)] font-medium bg-[var(--accent-light)]' : 'text-[var(--text-primary)]'
                }`}>
                {optLabel}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CreateTaskView() {
  const { t } = useI18n();
  const { state } = useApp();

  // Month navigation
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDays, setSelectedDays] = useState([]);

  // Task form
  const [taskName, setTaskName] = useState('');
  const [hours, setHours] = useState('');

  // ── Auto-calculate start/end dates when hours change ──

  useEffect(() => {
    if (!hours || hours <= 0) {
      setStartDate('');
      setDueDate('');
      return;
    }

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0);
    const endTime = calculateEndTime(parseFloat(hours));
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endTime.hour, endTime.min, 0);

    // Format as datetime-local value: "YYYY-MM-DDTHH:MM"
    const fmt = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${day}T${h}:${min}`;
    };

    setStartDate(fmt(start));
    setDueDate(fmt(end));
  }, [hours]);

  const [sprint, setSprint] = useState('');
  const [assignee, setAssignee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [component, setComponent] = useState('');
  const [components, setComponents] = useState([]);
  const [success, setSuccess] = useState(false);
  const [createResult, setCreateResult] = useState('');
  const [creating, setCreating] = useState(false);

  // ── Calendar data ──

  const monthData = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // Monday = 0 offset
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  }, [viewDate]);

  // ── Meta data fetched from JIRA API ──

  const [sprints, setSprints] = useState([]);
  const [assigneeList, setAssigneeList] = useState([]); // array of { label, value }
  const [loadingMeta, setLoadingMeta] = useState(false);

  const metaLoadedRef = useRef(false);

  useEffect(() => {
    let config = state.jiraConfig;
    if (!config?.url) {
      try {
        const saved = localStorage.getItem('jira-dash-config');
        if (saved) config = JSON.parse(saved);
      } catch(e) {}
    }
    const { url, token, projectKey } = config || {};
    if (!url || !token || !projectKey) return;
    if (metaLoadedRef.current) return;

    metaLoadedRef.current = true;

    const loadMeta = async () => {
      setLoadingMeta(true);
      try {
        const tasks = await fetchJiraIssues(url, token, projectKey, '', '');

        // Extract unique sprints
        const sprintSet = new Set();
        tasks.forEach((t) => {
          if (t.primarySprint) sprintSet.add(t.primarySprint);
        });
        setSprints([...sprintSet].sort());

        // Extract unique assignees with displayName as label, name as value
        const assigneeMap = new Map();
        tasks.forEach((t) => {
          if (t.assigneeName && t.assigneeEmail) {
            const label = t.assigneeName;
            const value = t.assigneeEmail;
            if (!assigneeMap.has(value)) {
              assigneeMap.set(value, { label, value });
            }
          } else if (t.assignee) {
            // Fallback: use same value for both
            const v = t.assignee;
            if (!assigneeMap.has(v)) {
              assigneeMap.set(v, { label: v, value: v });
            }
          }
        });
        const assigneeOptions = [...assigneeMap.values()].sort((a, b) => a.label.localeCompare(b.label));
        setAssigneeList(assigneeOptions);

        // Fetch components from dedicated project API (more complete than extracting from issues)
        let compsFromApi;
        try {
          compsFromApi = await fetchComponents(url, token, projectKey);
        } catch (compErr) {
          console.warn('fetchComponents failed, falling back to extraction from tasks:', compErr.message);
          compsFromApi = null;
        }

        // Extract components from fetched issues as fallback
        const compSet = new Set();
        tasks.forEach((t) => {
          if (t.comps && Array.isArray(t.comps)) {
            t.comps.forEach((c) => { if (c) compSet.add(c); });
          }
        });

        if (compsFromApi && compsFromApi.length > 0) {
          setComponents(compsFromApi);
        } else {
          setComponents([...compSet].sort());
        }

        console.log('Loaded metadata:', { sprints: sprintSet.size, assignees: assigneeMap.size, components: compsFromApi ? compsFromApi.length : compSet.size });
      } catch (err) {
        console.error('Failed to load metadata:', err);
      } finally {
        setLoadingMeta(false);
      }
    };

    loadMeta();
  }, [state.jiraConfig]);

  // ── Month navigation ──

  const goPrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  // ── Day selection ──

  const toggleDay = (date) => {
    if (!date) return;
    const key = dateToKey(date);
    setSelectedDays((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const isSelected = (date) => {
    if (!date) return false;
    return selectedDays.includes(dateToKey(date));
  };

  const isToday = (date) => {
    if (!date) return false;
    const t = new Date();
    return (
      date.getFullYear() === t.getFullYear() &&
      date.getMonth() === t.getMonth() &&
      date.getDate() === t.getDate()
    );
  };

  const isWeekend = (date) => {
    if (!date) return false;
    return date.getDay() === 0 || date.getDay() === 6;
  };

  // ── Create tasks ──

  const handleCreate = async () => {
    console.log('handleCreate called', { taskName, selectedDays, hours, sprint, assignee, component, startDate, dueDate });
    if (!taskName.trim() || selectedDays.length === 0) {
      console.warn('handleCreate bailed — taskName or selectedDays empty', {
        taskName: `"${taskName}"`,
        taskNameTrimmed: `"${taskName.trim()}"`,
        selectedDays
      });
      return;
    }
    setCreating(true);

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const allPlans = raw ? JSON.parse(raw) : {};

      selectedDays.forEach((dateKey) => {
        const d = keyToDate(dateKey);
        const monday = getMonday(d);
        const weekKey = getWeekKey(monday);
        const dayIndex = d.getDay() === 0 ? 6 : d.getDay() - 1;
        const dayName = DAY_NAMES[dayIndex];
        const dayLabel = d.toLocaleDateString('vi-VN', { weekday: 'long' });
        const finalName = selectedDays.length > 1
          ? `${taskName.trim()} (${dayLabel})`
          : taskName.trim();

        // Ensure the week entry exists (init with Mon-Fri only, per WeeklyPlanner convention)
        if (!allPlans[weekKey]) {
          allPlans[weekKey] = {
            Mon: [],
            Tue: [],
            Wed: [],
            Thu: [],
            Fri: [],
          };
        }
        if (!allPlans[weekKey][dayName]) {
          allPlans[weekKey][dayName] = [];
        }

        allPlans[weekKey][dayName].push({
          id:
            'task_' +
            Date.now() +
            '_' +
            Math.random().toString(36).slice(2, 8),
          name: finalName,
          hours,
          jiraKey: '',
          status: 'Open',
          issueType: '',
          sprint,
          assignee,
          startDate,
          dueDate,
          component,
          createdVia: 'bulk',
          logged: false,
          logError: '',
        });
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(allPlans));

      // Also create JIRA issues
      let config = state.jiraConfig;
      if (!config?.url) {
        try {
          const saved = localStorage.getItem('jira-dash-config');
          if (saved) config = JSON.parse(saved);
        } catch(e) {}
      }
const { url, token, projectKey, assignee: configAssignee, jql } = config || {};
      if (url && token && projectKey) {
        let created = 0;
        let failed = 0;

        for (const dateKey of selectedDays) {
          const d = keyToDate(dateKey);
          const dayLabel = d.toLocaleDateString('vi-VN', { weekday: 'long' });
          const finalName = selectedDays.length > 1
            ? `${taskName.trim()} (${dayLabel})`
            : taskName.trim();

          try {
            // Format dates for JIRA
            const fmtDate = (dateStr) => {
              if (!dateStr) return undefined;
              const [datePart, timePart] = dateStr.split('T');
              const [y, m, d] = datePart.split('-');
              const [h, min] = (timePart || '00:00').split(':');
              const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              return `${d}/${months[parseInt(m)-1]}/${y.slice(2)} ${h}:${min}:00 AM`;
            };

            await createIssue(url, token, projectKey, {
              issueType: 'Task',
              summary: finalName,
              description: `Created from JIRA Dashboard\nSprint: ${sprint || 'N/A'}\nComponent: ${component || 'N/A'}`,
              assignee: configAssignee || undefined,
              sprint: sprint || undefined,
              startDate: fmtDate(startDate),
              dueDate: fmtDate(dueDate),
              originalEstimate: `${hours}h`,
            });
            created++;
          } catch (err) {
            console.error('Failed to create issue:', finalName, err);
            failed++;
          }
        }

        // Show result
        if (created > 0) {
          setSuccess(true);
          setCreateResult(`Đã tạo ${created} issue trên JIRA${failed > 0 ? `, ${failed} lỗi` : ''}`);
          setTimeout(() => { setSuccess(false); setCreateResult(''); }, 5000);
        }
      }

      // Reset form
      setSuccess(true);
      setTaskName('');
      setSelectedDays([]);
      setSprint('');
      setAssignee('');
      setHours('');
      setStartDate('');
      setDueDate('');
      setComponent('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Create tasks failed:', err);
    } finally {
      setCreating(false);
    }
  };

  // ── Display ──

  const monthYear = `Tháng ${viewDate.getMonth() + 1}/${viewDate.getFullYear()}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">
          📅 Tạo công việc
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={goPrevMonth}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-[var(--text-primary)] min-w-[120px] text-center select-none">
            {monthYear}
          </span>
          <button
            onClick={goNextMonth}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors"
            aria-label="Tháng sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Body: Calendar + Form ── */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* ================================================================ */}
        {/* LEFT — Month Calendar                                            */}
        {/* ================================================================ */}
        <div className="flex-1 min-w-0">
          <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-primary)] p-4 shadow-sm">
            {/* Day-of-week header row */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_NAMES.map((day) => (
                <div
                  key={day}
                  className="text-center text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider py-1"
                >
                  {DAY_LABELS_VN[day]}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {monthData.map((date, idx) => {
                const selected = isSelected(date);
                const today = isToday(date);
                const weekend = isWeekend(date);

                return (
                  <button
                    key={idx}
                    onClick={() => toggleDay(date)}
                    disabled={!date}
                    className={`
                      relative aspect-square rounded-xl text-sm font-medium transition-all
                      flex items-center justify-center
                      ${!date ? 'invisible pointer-events-none' : ''}
                      ${selected
                        ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20'
                        : today
                          ? 'bg-[var(--accent-light)] text-[var(--accent)] ring-2 ring-[var(--accent)]/40'
                          : weekend
                            ? 'text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)]'
                            : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                      }
                      ${date ? 'cursor-pointer' : ''}
                    `}
                    aria-label={
                      date
                        ? `${date.getDate()}/${date.getMonth() + 1}`
                        : undefined
                    }
                  >
                    {date && (
                      <>
                        <span className={selected ? 'opacity-90' : ''}>
                          {date.getDate()}
                        </span>
                        {selected && (
                          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <Check className="w-2.5 h-2.5 text-[var(--accent)]" />
                          </div>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selection counter */}
            <div className="mt-3 pt-3 border-t border-[var(--border-primary)] text-xs text-[var(--text-secondary)]">
              Đã chọn:{' '}
              <strong className="text-[var(--text-primary)]">
                {selectedDays.length}
              </strong>{' '}
              ngày
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* RIGHT — Task Form                                                */}
        {/* ================================================================ */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-primary)] p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">
              📋 Thông tin công việc
            </h3>

            {/* Task name */}
            <div className="mb-3.5">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Tên task
              </label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Nhập tên công việc..."
                className="input-like w-full text-sm"
                autoComplete="off"
              />
              {selectedDays.length > 1 && (
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                  Tên công việc sẽ được thêm ngày trong tuần để phân biệt
                </p>
              )}
            </div>

            {/* Hours */}
            <div className="mb-3.5">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Giờ
              </label>
              <PopoverSelect
                value={String(hours)}
                onChange={(v) => setHours(Number(v))}
                options={HOUR_OPTIONS.map(h => String(h))}
                placeholder="Chọn giờ"
                icon={Clock}
              />
            </div>

            {/* Start Date */}
            <div className="mb-3.5">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Ngày bắt đầu
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                readOnly
                className="input-like w-full text-sm"
              />
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                Tự động tính theo giờ làm việc: sáng 8h-12h, chiều 13h-17h (nghỉ trưa 12h-13h)
              </p>
            </div>

            {/* Due Date */}
            <div className="mb-3.5">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Ngày kết thúc
              </label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                readOnly
                className="input-like w-full text-sm"
              />
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                Tự động tính theo giờ làm việc: sáng 8h-12h, chiều 13h-17h (nghỉ trưa 12h-13h)
              </p>
            </div>

            {/* Sprint */}
            <div className="mb-3.5">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Sprint
              </label>
              <PopoverSelect
                value={sprint}
                onChange={setSprint}
                options={sprints}
                placeholder="Chọn Sprint"
                icon={Layers}
              />
            </div>

            {/* Assignee */}
            <div className="mb-3.5">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Người thực hiện
              </label>
              <PopoverSelect
                value={assignee}
                onChange={setAssignee}
                options={assigneeList}
                placeholder="Chọn người thực hiện"
                icon={User}
              />
            </div>

            {/* Component */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Component
              </label>
              <PopoverSelect
                value={component}
                onChange={setComponent}
                options={components}
                placeholder="Chọn Component"
                icon={Layers}
              />
            </div>

            {/* DEBUG: remove after fix */}
            <div className="text-[10px] text-[var(--text-tertiary)] mb-1">
              name:{taskName.length} days:{selectedDays.length} hours:{String(hours).length}
            </div>

            {/* Create / Reset buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setTaskName('');
                  setHours('');
                  setSprint('');
                  setAssignee('');
                  setStartDate('');
                  setDueDate('');
                  setComponent('');
                  setSelectedDays([]);
                }}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-colors cursor-pointer flex-shrink-0"
                title="Đặt lại"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCreate}
                disabled={
                  !taskName.trim() || selectedDays.length === 0 || creating
                }
                className="flex-1 h-9 py-2 px-4 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold
                  hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed
                  transition-all flex items-center justify-center gap-2"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {creating ? 'Đang tạo...' : 'Tạo công việc'}
              </button>
            </div>

            {/* Success feedback */}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 text-xs text-center text-[var(--success)] font-medium"
              >
                {createResult || '✓ Đã tạo công việc thành công!'}
              </motion.div>
            )}

            {/* Validation hint */}
            {!taskName.trim() && selectedDays.length > 0 && (
              <p className="mt-2 text-[10px] text-[var(--warning)] text-center">
                Vui lòng nhập tên công việc
              </p>
            )}
            {taskName.trim() && selectedDays.length === 0 && (
              <p className="mt-2 text-[10px] text-[var(--text-tertiary)] text-center">
                Chọn ngày trên lịch để tạo công việc
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
