import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, RefreshCw, Wifi, FileText, ArrowUp, ArrowLeftRight, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchJiraIssues } from '../utils/jiraApi';
import { useI18n } from '../i18n';
import DashboardTabs from './DashboardTabs';
import FilterBar from './FilterBar';
import StatsGrid from './StatsGrid';
import ChartGrid from './ChartGrid';
import SprintBarChart from './charts/SprintBarChart';
import ComponentBarChart from './charts/ComponentBarChart';
import DailyTrendChart from './charts/DailyTrendChart';
import TypeDoughnutChart from './charts/TypeDoughnutChart';
import AssigneeBarChart from './charts/AssigneeBarChart';
import BurndownChart from './charts/BurndownChart';
import GanttChart from './GanttChart';
import DataTable from './DataTable';
import OTPanelInline from './OTPanelInline';
import LabelsPanelInline from './LabelsPanelInline';
import HistoryPanelInline from './HistoryPanelInline';
import MonthComparison from './MonthComparison';
import AutoReport from './AutoReport';
import EffortCard from './EffortCard';
import CompareView from './CompareView';

const AUTO_REFRESH_OPTIONS = (t) => [
  { value: 'off', label: t('dashboard.off') },
  { value: '5', label: t('dashboard.min5') },
  { value: '15', label: t('dashboard.min15') },
  { value: '30', label: t('dashboard.min30') },
  { value: '60', label: t('dashboard.hour1') },
];

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
        <span className="max-w-[100px] truncate">{displayLabel}</span>
        <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-56 max-h-60 overflow-y-auto bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-xl py-1">
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

// ── Panel wrappers ──────────────────────────────────────────────────────────

function OverviewPanel({ tasks }) {
  const { t } = useI18n();
  const { dispatch } = useApp();

  // Overdue detection
  const overdueTasks = tasks.filter(t => {
    const s = t.status?.toLowerCase();
    return s && s !== 'closed' && s !== 'resolved' && s !== 'cancelled';
  });

  const totalHr = tasks.reduce((s, t) => s + t.timeSpentHr, 0);

  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* ── Overdue tasks warning ── */}
      {overdueTasks.length > 0 && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-3">
          <span className="text-lg">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              {overdueTasks.length} {t('common.overdue')}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">
              {overdueTasks.slice(0, 3).map(t => t.key).join(', ')}
              {overdueTasks.length > 3 ? ' ' + t('dashboard.overdueMore') + ' ' + (overdueTasks.length - 3) + ' ' + t('dashboard.otherTask') : ''}
            </p>
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_DASHBOARD_TAB', payload: 'data' })}
            className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            {t('common.viewTable')}
          </button>
        </div>
      )}

      {/* ── Summary bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="text-sm text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)] font-semibold">{tasks.length}</strong> {t('dashboard.taskCount')} ·
          <strong className="text-[var(--text-primary)] font-semibold ml-1">
            {totalHr.toFixed(1)}h
          </strong>{' '}
          {t('dashboard.logged')}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <FilterBar />

      {/* ── StatsGrid ── */}
      <StatsGrid tasks={tasks} />

    </motion.div>
  );
}

function ChartsPanel({ tasks }) {
  const [chartSubTab, setChartSubTab] = useState('sprint');
  const chartSubTabs = [
    { id: 'sprint', label: 'Sprint', Comp: SprintBarChart },
    { id: 'component', label: 'Component', Comp: ComponentBarChart },
    { id: 'daily', label: 'Daily', Comp: DailyTrendChart },
    { id: 'type', label: 'Type', Comp: TypeDoughnutChart },
    { id: 'assignee', label: 'Assignee', Comp: AssigneeBarChart },
    { id: 'burndown', label: 'Burndown', Comp: BurndownChart },
  ];
  const ActiveChart = chartSubTabs.find(st => st.id === chartSubTab)?.Comp || SprintBarChart;

  return (
    <motion.div
      key="charts"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="flex items-center gap-1 mb-4 bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border-primary)] w-fit">
        {chartSubTabs.map(st => (
          <button key={st.id} onClick={() => setChartSubTab(st.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${chartSubTab === st.id ? 'bg-[var(--bg-primary)] text-[var(--accent)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
            {st.label}
          </button>
        ))}
      </div>
      <ActiveChart tasks={tasks} />
    </motion.div>
  );
}

function DataPanel({ tasks }) {
  return (
    <motion.div
      key="data"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <DataTable />
    </motion.div>
  );
}

function GanttPanel({ tasks }) {
  return (
    <motion.div
      key="gantt"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <GanttChart tasks={tasks} />
    </motion.div>
  );
}

function ComparePanel({ tasks }) {
  const { state } = useApp();
  const hasCompare = Array.isArray(state.compareSnapshots) && state.compareSnapshots.length === 2;
  const [compareSubTab, setCompareSubTab] = useState('compare-month');
  const compareSubTabs = [
    { id: 'compare-month', label: 'So sánh tháng' },
    { id: 'report', label: 'Báo cáo' },
  ];

  return (
    <motion.div
      key="compare"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="flex items-center gap-1 mb-4 bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border-primary)] w-fit">
        {compareSubTabs.map(st => (
          <button key={st.id} onClick={() => setCompareSubTab(st.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${compareSubTab === st.id ? 'bg-[var(--bg-primary)] text-[var(--accent)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
            {st.label}
          </button>
        ))}
      </div>

      {compareSubTab === 'compare-month' && <MonthComparison tasks={tasks} />}
      {compareSubTab === 'report' && (
        <div className="mt-6">
          <AutoReport />
        </div>
      )}

      {hasCompare && (
        <div className="mt-6">
          <CompareView
            snapshotA={state.compareSnapshots[0]}
            snapshotB={state.compareSnapshots[1]}
          />
        </div>
      )}
    </motion.div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const { t, lang } = useI18n();
  const { state, dispatch, onChangeProject } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const intervalRef = useRef(null);
  const navigate = useNavigate();
  const { tab } = useParams();

  // Local active tab (initialized from URL param or context)
  const [activeTab, setActiveTab] = useState(tab || state.dashboardTab || 'overview');

  // Sync local tab state up to context and URL
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    navigate(`/dashboard/${tabId}`);
    dispatch({ type: 'SET_DASHBOARD_TAB', payload: tabId });
  }, [dispatch, navigate]);

  // Sync activeTab when URL param changes (e.g. browser back/forward)
  useEffect(() => {
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [tab]);

  // Sync from context when sidebar dispatches SET_DASHBOARD_TAB
  useEffect(() => {
    setActiveTab(state.dashboardTab);
  }, [state.dashboardTab]);

  const { allTasks, filters } = state;

  // Compute filtered tasks
  const filteredTasks = allTasks.filter(t => {
    if (filters.sprint && t.primarySprint !== filters.sprint) return false;
    if (filters.component && !t.comps.includes(filters.component)) return false;
    if (filters.assignee && t.assignee !== filters.assignee) return false;
    if (filters.dateFrom) {
      const d = new Date(filters.dateFrom);
      if (t.resolved && t.resolved < d) return false;
      if (!t.resolved && t.created && t.created < d) return false;
    }
    if (filters.dateTo) {
      const d = new Date(filters.dateTo);
      d.setHours(23, 59, 59);
      if (t.resolved && t.resolved > d) return false;
      if (!t.resolved && t.created && t.created > d) return false;
    }
    if (filters.labels && filters.labels.length > 0) {
      const taskLabels = t.labels || [];
      if (!filters.labels.some(lid => taskLabels.includes(lid))) return false;
    }
    return true;
  });

  // Auto-refresh interval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (state.dataSource === 'jira' && state.jiraConnected && state.jiraAutoRefresh !== 'off') {
      const minutes = parseInt(state.jiraAutoRefresh, 10);
      if (!isNaN(minutes) && minutes > 0) {
        intervalRef.current = setInterval(async () => {
          try {
            setRefreshError('');
            const { url, token, projectKey, assignee, jql } = state.jiraConfig;
            if (!url || !token || !projectKey) return;
            const freshTasks = await fetchJiraIssues(url, token, projectKey.toUpperCase(), assignee || '', jql || '');
            if (freshTasks.length === 0) return;
            dispatch({ type: 'SET_TASKS', payload: freshTasks });
            dispatch({ type: 'SET_LAST_REFRESH_TIME', payload: new Date().toISOString() });
          } catch (err) {
            setRefreshError(t('dashboard.refreshError') + ' ' + (err.message || t('common.error')));
          }
        }, minutes * 60 * 1000);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.dataSource, state.jiraConnected, state.jiraAutoRefresh, state.jiraConfig, dispatch]);

  // Manual refresh
  const handleManualRefresh = useCallback(async () => {
    if (state.dataSource !== 'jira' || !state.jiraConnected) return;
    setRefreshing(true);
    setRefreshError('');
    try {
      const { url, token, projectKey, assignee, jql } = state.jiraConfig;
      if (!url || !token || !projectKey) return;
      const freshTasks = await fetchJiraIssues(url, token, projectKey.toUpperCase(), assignee || '', jql || '');
      if (freshTasks.length === 0) {
        setRefreshError(t('dashboard.noTasksFound'));
        return;
      }
      dispatch({ type: 'SET_TASKS', payload: freshTasks });
      dispatch({ type: 'SET_LAST_REFRESH_TIME', payload: new Date().toISOString() });
    } catch (err) {
      setRefreshError(t('dashboard.manualRefreshError') + ' ' + (err.message || t('common.error')));
    } finally {
      setRefreshing(false);
    }
  }, [state.dataSource, state.jiraConnected, state.jiraConfig, dispatch]);

  const setAutoRefresh = (value) => {
    dispatch({ type: 'SET_JIRA_AUTO_REFRESH', payload: value });
  };

  const totalHr = filteredTasks.reduce((s, t) => s + t.timeSpentHr, 0);

  const formatTime = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '—';
    }
  };

  return (
    <>
      <motion.div
        key="dashboard"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {/* ── Top bar: Connection info + Auto-refresh (JIRA only) ── */}
        {state.dataSource === 'jira' && state.jiraConnected && (
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6 p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)]">
            <div className="flex items-center gap-3 text-xs">
              <button
                onClick={() => onChangeProject?.()}
                className="flex items-center gap-1.5 text-[var(--success)] font-medium hover:underline cursor-pointer"
                title={t('dashboard.changeProject')}
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>JIRA: {state.jiraConfig.projectKey}</span>
                <ArrowLeftRight className="w-3 h-3 ml-0.5 text-[var(--text-tertiary)]" />
              </button>
              <span className="text-[var(--text-tertiary)]">·</span>
              <span className="text-[var(--text-tertiary)]">
                {t('dashboard.lastUpdate')} <strong>{formatTime(state.lastRefreshTime)}</strong>
              </span>
              {refreshing && (
                <span className="text-[var(--accent)] flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  {t('dashboard.updating')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[0.65rem] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider whitespace-nowrap">
                  {t('dashboard.autoRefresh')}:
                </span>
                <Dropdown
                  value={state.jiraAutoRefresh}
                  onChange={setAutoRefresh}
                  options={AUTO_REFRESH_OPTIONS(t)}
                />
              </div>
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--accent)] transition-colors disabled:opacity-50 cursor-pointer"
                title={t('dashboard.manualRefresh')}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        )}

        {/* ── Data Source Info ── */}
        {state.dataSource && (
          <div className="mb-6 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-[11px] bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg px-2.5 py-1.5">
              {state.dataSource === 'csv' ? (
                <>📂 <span>{t('dashboard.source')} <strong>{t('dashboard.csvSource')}</strong></span></>
              ) : state.dataSource === 'jira' ? (
                <>🔌 <span>{t('dashboard.source')} <strong>{t('dashboard.jiraApi')}</strong> · {state.jiraConfig?.projectKey || ''}</span></>
              ) : state.dataSource === 'jira-bookmarklet' ? (
                <>📌 <span>{t('dashboard.source')} <strong>{t('dashboard.bookmark')}</strong></span></>
              ) : state.dataSource === 'html' ? (
                <>📄 <span>{t('dashboard.source')} <strong>{t('dashboard.htmlExport')}</strong></span></>
              ) : state.dataSource === 'history' ? (
                <>🕒 <span>{t('dashboard.source')} <strong>{t('dashboard.historySource')}</strong> · {state.fileName || ''}</span></>
              ) : null}
            </div>

            {state.jqlUsed && (
              <div className="flex items-center gap-1.5 text-[11px] bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-2.5 py-1.5 max-w-lg">
                🔍 <span className="truncate">JQL: <code className="text-xs bg-blue-100 dark:bg-blue-900/40 px-1 rounded">{state.jqlUsed.length > 60 ? state.jqlUsed.substring(0, 60) + '...' : state.jqlUsed}</code></span>
              </div>
            )}

            <span className="text-[11px] text-[var(--text-tertiary)]">
              {state.allTasks.length} {t('dashboard.taskCount')}
            </span>
          </div>
        )}

        {/* ── Refresh error ── */}
        {refreshError && (
          <div className="mb-4 p-2.5 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-xs text-[var(--danger)] flex items-start gap-2">
            <span>{refreshError}</span>
            <button
              onClick={() => setRefreshError('')}
              className="ml-auto font-bold cursor-pointer hover:opacity-70"
            >
              ×
            </button>
          </div>
        )}

        {/* ── OT/Leave notification ── */}
        {(state.otLeaveData?.otTotal > 0 || state.otLeaveData?.leaveTotal > 0) && (
          <div className="mb-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-2.5 flex items-center gap-3 text-xs">
            <span className="text-base">📝</span>
            <div className="flex items-center gap-4 flex-wrap">
              {state.otLeaveData.otTotal > 0 && (
                <span className="text-indigo-700 dark:text-indigo-300 font-medium">
                  ⏱ {t('dashboard.otPrefix')}{state.otLeaveData.otTotal}h
                </span>
              )}
              {state.otLeaveData.leaveTotal > 0 && (
                <span className="text-indigo-700 dark:text-indigo-300 font-medium">
                  🏖 {t('dashboard.leavePrefix')}{state.otLeaveData.leaveTotal}h
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Tab navigation ── */}
        <DashboardTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {/* ── Tab content panels ── */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && <OverviewPanel tasks={filteredTasks} />}
          {activeTab === 'charts' && <ChartsPanel tasks={filteredTasks} />}
          {activeTab === 'data' && <DataPanel tasks={filteredTasks} />}
          {activeTab === 'gantt' && <GanttPanel tasks={filteredTasks} />}
          {activeTab === 'compare' && <ComparePanel tasks={filteredTasks} />}
          {activeTab === 'ot' && <OTPanelInline />}
          {activeTab === 'labels' && <LabelsPanelInline />}
          {activeTab === 'history' && <HistoryPanelInline />}
        </AnimatePresence>

      </motion.div>

      {/* ── Back to top ── */}
      <button
        onClick={() => {
          const main = document.querySelector('.app-main');
          if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
          else window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className="fixed bottom-6 right-6 z-[100] w-10 h-10 rounded-full bg-[var(--accent)] text-white shadow-lg hover:opacity-90 hover:scale-110 transition-all flex items-center justify-center"
        title={t('dashboard.backToTop')}
      >
        <ArrowUp size={20} />
      </button>
    </>
  );
}
