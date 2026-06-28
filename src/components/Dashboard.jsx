import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, RefreshCw, Wifi, FileText, ArrowUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { fetchJiraIssues } from '../utils/jiraApi';
import { exportCSV, exportChartPNG } from '../utils/exportUtils';
import FilterBar from './FilterBar';
import StatsGrid from './StatsGrid';
import ChartGrid from './ChartGrid';
import GanttChart from './GanttChart';
import DataTable from './DataTable';
import OTPanel from './OTPanel';
import LabelManager from './LabelManager';
import HistoryPanel from './HistoryPanel';
import MonthComparison from './MonthComparison';
import AutoReport from './AutoReport';

const AUTO_REFRESH_OPTIONS = [
  { value: 'off', label: 'Tắt' },
  { value: '5', label: '5 phút' },
  { value: '15', label: '15 phút' },
  { value: '30', label: '30 phút' },
  { value: '60', label: '1 giờ' },
];

export default function Dashboard() {
  const { state, dispatch } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const intervalRef = useRef(null);

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
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only auto-refresh when connected to JIRA
    if (state.dataSource === 'jira' && state.jiraConnected && state.jiraAutoRefresh !== 'off') {
      const minutes = parseInt(state.jiraAutoRefresh, 10);
      if (!isNaN(minutes) && minutes > 0) {
        intervalRef.current = setInterval(async () => {
          try {
            setRefreshError('');
            const { url, email, token, projectKey, jql } = state.jiraConfig;
            if (!url || !email || !token || !projectKey) return;
            const tasks = await fetchJiraIssues(url, email, token, projectKey, jql);
            const totalHr = tasks.reduce((s, t) => s + t.timeSpentHr, 0);
            const totalEst = tasks.reduce((s, t) => s + t.estimateHr, 0);
            const stats = `${tasks.length} công việc · ${totalHr.toFixed(1)} giờ đã log · ${totalEst.toFixed(1)} giờ ước tính`;
            dispatch({ type: 'SET_FILE_INFO', payload: { fileName: projectKey, fileStats: stats } });
            dispatch({ type: 'SET_TASKS', payload: tasks });
            dispatch({ type: 'SET_OT_LEAVE', payload: { otTotal: 0, leaveTotal: 0 } });
            try { localStorage.removeItem('jira-dash-ot-leave'); } catch(e) {}
            dispatch({ type: 'SET_LAST_REFRESH_TIME', payload: new Date().toISOString() });
          } catch (err) {
            setRefreshError('Tự động cập nhật thất bại: ' + err.message);
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
      const { url, email, token, projectKey, jql } = state.jiraConfig;
      if (!url || !email || !token || !projectKey) return;
      const tasks = await fetchJiraIssues(url, email, token, projectKey, jql);
      const totalHr = tasks.reduce((s, t) => s + t.timeSpentHr, 0);
      const totalEst = tasks.reduce((s, t) => s + t.estimateHr, 0);
      const stats = `${tasks.length} công việc · ${totalHr.toFixed(1)} giờ đã log · ${totalEst.toFixed(1)} giờ ước tính`;
      dispatch({ type: 'SET_FILE_INFO', payload: { fileName: projectKey, fileStats: stats } });
      dispatch({ type: 'SET_TASKS', payload: tasks });
      dispatch({ type: 'SET_OT_LEAVE', payload: { otTotal: 0, leaveTotal: 0 } });
      try { localStorage.removeItem('jira-dash-ot-leave'); } catch(e) {}
      dispatch({ type: 'SET_LAST_REFRESH_TIME', payload: new Date().toISOString() });
    } catch (err) {
      setRefreshError('Cập nhật thất bại: ' + err.message);
    } finally {
      setRefreshing(false);
    }
  }, [state.dataSource, state.jiraConnected, state.jiraConfig, dispatch]);

  const handleReset = () => {
    dispatch({ type: 'RESET' });
  };


  const setAutoRefresh = (value) => {
    dispatch({ type: 'SET_JIRA_AUTO_REFRESH', payload: value });
  };

  const totalHr = filteredTasks.reduce((s, t) => s + t.timeSpentHr, 0);

  const formatTime = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
        {/* Connection info + Auto-refresh bar (JIRA only) */}
        {state.dataSource === 'jira' && state.jiraConnected && (
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6 p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)]">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-[var(--success)] font-medium">
              <Wifi className="w-3.5 h-3.5" />
              <span>JIRA: {state.jiraConfig.projectKey}</span>
            </div>
            <span className="text-[var(--text-tertiary)]">·</span>
            <span className="text-[var(--text-tertiary)]">
              Cập nhật lần cuối: <strong>{formatTime(state.lastRefreshTime)}</strong>
            </span>
            {refreshing && (
              <span className="text-[var(--accent)] flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Đang cập nhật...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Auto-refresh dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[0.65rem] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider whitespace-nowrap">
                Tự động cập nhật:
              </span>
              <select
                value={state.jiraAutoRefresh}
                onChange={(e) => setAutoRefresh(e.target.value)}
                className="input-like text-xs py-1 px-2 min-w-[80px]"
              >
                {AUTO_REFRESH_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--accent)] transition-colors disabled:opacity-50 cursor-pointer"
              title="Cập nhật thủ công"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Data Source Info */}
      {state.dataSource && (
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg px-2.5 py-1.5">
            {state.dataSource === 'csv' ? (
              <>📂 <span>Nguồn: <strong>File</strong></span></>
            ) : state.dataSource === 'jira' ? (
              <>🔌 <span>Nguồn: <strong>JIRA API</strong> · {state.jiraConfig?.projectKey || ''}</span></>
            ) : state.dataSource === 'jira-bookmarklet' ? (
              <>📌 <span>Nguồn: <strong>JIRA Bookmark</strong></span></>
            ) : state.dataSource === 'html' ? (
              <>📄 <span>Nguồn: <strong>HTML Export</strong></span></>
            ) : state.dataSource === 'history' ? (
              <>🕒 <span>Nguồn: <strong>Lịch sử</strong> · {state.fileName || ''}</span></>
            ) : null}
          </div>
          
          {state.jqlUsed && (
            <div className="flex items-center gap-1.5 text-[11px] bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-2.5 py-1.5 max-w-lg">
              🔍 <span className="truncate">JQL: <code className="text-xs bg-blue-100 dark:bg-blue-900/40 px-1 rounded">{state.jqlUsed.length > 60 ? state.jqlUsed.substring(0, 60) + '...' : state.jqlUsed}</code></span>
            </div>
          )}
          
          <span className="text-[11px] text-[var(--text-tertiary)]">
            {state.allTasks.length} công việc
          </span>
        </div>
      )}

      {/* Refresh error */}
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

      {/* Overdue tasks warning */}
      {(() => {
        const overdueTasks = filteredTasks.filter(t => {
          return t.status && t.status.toLowerCase() !== 'closed';
        });
        return overdueTasks.length > 0 ? (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-3">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                {overdueTasks.length} task chưa được đóng
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                {overdueTasks.slice(0, 3).map(t => t.key).join(', ')}
                {overdueTasks.length > 3 ? ' và ' + (overdueTasks.length - 3) + ' task khác' : ''}
              </p>
            </div>
            <button
              onClick={() => document.getElementById('data-table-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Xem bảng
            </button>
          </div>
        ) : null;
      })()}

      {/* OT/Leave notification */}
      {(state.otLeaveData?.otTotal > 0 || state.otLeaveData?.leaveTotal > 0) && (
        <div className="mb-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-2.5 flex items-center gap-3 text-xs">
          <span className="text-base">📝</span>
          <div className="flex items-center gap-4 flex-wrap">
            {state.otLeaveData.otTotal > 0 && (
              <span className="text-indigo-700 dark:text-indigo-300 font-medium">
                ⏱ Tăng ca: +{state.otLeaveData.otTotal}h
              </span>
            )}
            {state.otLeaveData.leaveTotal > 0 && (
              <span className="text-indigo-700 dark:text-indigo-300 font-medium">
                🏖 Nghỉ phép: -{state.otLeaveData.leaveTotal}h
              </span>
            )}
          </div>
        </div>
      )}

      {/* Summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="text-sm text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)] font-semibold">{filteredTasks.length}</strong> công việc ·
          <strong className="text-[var(--text-primary)] font-semibold ml-1">
            {totalHr.toFixed(1)}h
          </strong>{' '}
          đã log

        </div>
      </div>

      <FilterBar />
      <StatsGrid tasks={filteredTasks} />
      <div className="border-t border-[var(--border-primary)] my-6" />
      <div id="burndown-section">
        <ChartGrid tasks={filteredTasks} />
      </div>
      <GanttChart tasks={filteredTasks} />

      {/* Data Table anchor */}
      <div id="data-table-section" className="mb-6">
        <DataTable />
      </div>

      <OTPanel />
      <LabelManager />
      <HistoryPanel />

      <MonthComparison tasks={filteredTasks} />
      <AutoReport />

      {/* Reset button */}
      <div className="mb-8">
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] rounded-md text-sm font-medium transition-all cursor-pointer"
        >
          Tải file khác
        </button>
      </div>
    </motion.div>

      {/* Back to top — always visible */}
      <button
        onClick={() => {
          const main = document.querySelector('.app-main');
          if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
          else window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className="fixed bottom-6 right-6 z-[100] w-10 h-10 rounded-full bg-[var(--accent)] text-white shadow-lg hover:opacity-90 hover:scale-110 transition-all flex items-center justify-center"
        title="Lên đầu trang"
      >
        <ArrowUp size={20} />
      </button>
    </>
  );
}
