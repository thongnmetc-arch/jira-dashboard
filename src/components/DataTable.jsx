import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useMemo, useCallback, useState, useRef } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square, Download, AlertCircle, Tag } from 'lucide-react';
import TaskDetail from './TaskDetail';
import LabelBadge from './LabelBadge';
import LabelDropdown from './LabelDropdown';
import { exportCSV } from '../utils/exportUtils';

const TABLE_PAGE_SIZE = 20;

export default function DataTable() {
  const { state, dispatch } = useApp();
  const [selectedTask, setSelectedTask] = useState(null);
  const [labelDropdownTask, setLabelDropdownTask] = useState(null);
  const [bulkLabelOpen, setBulkLabelOpen] = useState(false);
  const labelDropdownRef = useRef(null);
  const bulkButtonRef = useRef(null);

  const { tableSortCol, tableSortDir, tablePage, tableSearchTerm, selectedTasks } = state;

  const filtered = useMemo(() => {
    let data = state.allTasks;
    // Apply filters first
    const f = state.filters;
    data = data.filter(t => {
      if (f.sprint && t.primarySprint !== f.sprint) return false;
      if (f.component && !t.comps.includes(f.component)) return false;
      if (f.assignee && t.assignee !== f.assignee) return false;
      if (f.dateFrom) {
        const d = new Date(f.dateFrom);
        if (t.resolved && t.resolved < d) return false;
        if (!t.resolved && t.created && t.created < d) return false;
      }
      if (f.dateTo) {
        const d = new Date(f.dateTo);
        d.setHours(23, 59, 59);
        if (t.resolved && t.resolved > d) return false;
        if (!t.resolved && t.created && t.created > d) return false;
      }
      if (f.labels && f.labels.length > 0) {
        if (!t.labels || !f.labels.some(l => t.labels.includes(l))) return false;
      }
      return true;
    });

    if (tableSearchTerm) {
      const q = tableSearchTerm.toLowerCase();
      data = data.filter(t =>
        t.key.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.comps.some(c => c.toLowerCase().includes(q)) ||
        t.assignee.toLowerCase().includes(q) ||
        (t.labels || []).some(lid => {
          const def = state.labelDefs?.[lid];
          return def?.name?.toLowerCase().includes(q) || lid.toLowerCase().includes(q);
        })
      );
    }

    data.sort((a, b) => {
      let va = a[tableSortCol];
      let vb = b[tableSortCol];
      if (tableSortCol === 'comps') { va = (a.comps || []).join(', '); vb = (b.comps || []).join(', '); }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va == null) va = '';
      if (vb == null) vb = '';
      if (va < vb) return tableSortDir === 'asc' ? -1 : 1;
      if (va > vb) return tableSortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [state.allTasks, state.filters, tableSortCol, tableSortDir, tableSearchTerm]);

  const totalPages = Math.max(Math.ceil(filtered.length / TABLE_PAGE_SIZE), 1);
  const currentPage = Math.min(tablePage, totalPages);
  const start = (currentPage - 1) * TABLE_PAGE_SIZE;
  const page = filtered.slice(start, start + TABLE_PAGE_SIZE);

  const handleSort = useCallback((col) => {
    if (tableSortCol === col) {
      dispatch({ type: 'SET_TABLE_SORT', payload: { col, dir: tableSortDir === 'asc' ? 'desc' : 'asc' } });
    } else {
      dispatch({ type: 'SET_TABLE_SORT', payload: { col, dir: 'desc' } });
    }
  }, [tableSortCol, tableSortDir, dispatch]);

  const handleSearch = useCallback((e) => {
    dispatch({ type: 'SET_TABLE_SEARCH', payload: e.target.value });
  }, [dispatch]);

  const goToPage = useCallback((p) => {
    dispatch({ type: 'SET_TABLE_PAGE', payload: p });
  }, [dispatch]);

  const columns = [
    { key: 'key', label: 'Issue Key' },
    { key: 'summary', label: 'Tóm tắt' },
    { key: 'comps', label: 'Phân hệ' },
    { key: 'primarySprint', label: 'Sprint' },
    { key: 'assignee', label: 'Người thực hiện' },
    { key: 'timeSpentHr', label: 'Giờ log' },
    { key: 'originalEstimateHr', label: 'Giờ ước tính' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'labels', label: 'Nhãn' },
  ];

  const handleSelectAll = useCallback(() => {
    const pageKeys = page.map(t => t.key);
    const allSelected = pageKeys.every(k => selectedTasks.includes(k));
    if (allSelected) {
      dispatch({ type: 'SET_SELECTED_TASKS', payload: selectedTasks.filter(k => !pageKeys.includes(k)) });
    } else {
      const newSelected = [...selectedTasks];
      pageKeys.forEach(k => { if (!newSelected.includes(k)) newSelected.push(k); });
      dispatch({ type: 'SET_SELECTED_TASKS', payload: newSelected });
    }
  }, [page, selectedTasks, dispatch]);

  const handleRowClick = useCallback((t) => {
    setSelectedTask(t);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedTask(null);
  }, []);

  const handleBulkClose = useCallback(() => {
    if (selectedTasks.length === 0) return;
    dispatch({ type: 'BULK_UPDATE_STATUS', payload: { keys: selectedTasks, status: 'Closed' } });
  }, [selectedTasks, dispatch]);

  const handleBulkExport = useCallback(() => {
    const selected = state.allTasks.filter(t => selectedTasks.includes(t.key));
    if (selected.length === 0) return;
    exportCSV(selected);
  }, [state.allTasks, selectedTasks]);

  const SortIcon = ({ col }) => {
    if (tableSortCol !== col) return <ArrowUpDown className="w-3 h-3 inline-block ml-0.5 opacity-40" />;
    return tableSortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 inline-block ml-0.5 text-[var(--accent)]" />
      : <ArrowDown className="w-3 h-3 inline-block ml-0.5 text-[var(--accent)]" />;
  };

  if (!state.tableVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card mb-5"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Bảng dữ liệu chi tiết
        </h3>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={tableSearchTerm}
              onChange={handleSearch}
              className="input-like pl-8 w-[180px] text-xs"
              style={{ paddingLeft: '2rem' }}
            />
          </div>
          <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">
            {filtered.length} dòng · Trang {currentPage}/{totalPages}
          </span>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          className="flex items-center gap-2 mb-3 p-2.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg"
        >
          <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
            Đã chọn {selectedTasks.length} task
          </span>
          <div className="flex-1" />
          <button
            onClick={handleBulkClose}
            className="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors cursor-pointer"
          >
            Đánh dấu đã xong
          </button>
          <button
            ref={bulkButtonRef}
            onClick={() => setBulkLabelOpen(true)}
            className="px-3 py-1.5 text-xs font-medium bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-primary)] rounded-md transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Tag className="w-3 h-3" />
            Gán nhãn
          </button>
          <button
            onClick={handleBulkExport}
            className="px-3 py-1.5 text-xs font-medium bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-primary)] rounded-md transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3 h-3" />
            Xuất CSV
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_SELECTED_TASKS', payload: [] })}
            className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
          >
            <span className="text-xs">×</span>
          </button>
        </motion.div>
      )}

      {/* Warning note */}
      {selectedTasks.length > 0 && (
        <div className="flex items-center gap-1.5 mb-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/50">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>Thay đổi chỉ hiển thị trong app, không đồng bộ JIRA</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto rounded-md border border-[var(--border-primary)]">
        <table className="w-full border-collapse text-[0.8rem]">
          <thead>
            <tr>
              {/* Checkbox column */}
              <th className="sticky top-0 z-[2] bg-[var(--bg-secondary)] px-2 py-2 text-center border-b border-[var(--border-primary)] w-10">
                <button
                  onClick={handleSelectAll}
                  className="cursor-pointer hover:opacity-70 transition-opacity"
                  title={page.every(t => selectedTasks.includes(t.key)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                >
                  {page.every(t => selectedTasks.includes(t.key)) ? (
                    <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                  ) : (
                    <Square className="w-4 h-4 text-[var(--text-tertiary)]" />
                  )}
                </button>
              </th>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="sticky top-0 z-[2] bg-[var(--bg-secondary)] px-2.5 py-2 text-left text-[11px] uppercase tracking-wider font-semibold text-[var(--text-secondary)] cursor-pointer select-none whitespace-nowrap border-b border-[var(--border-primary)] hover:text-[var(--accent)] transition-colors"
                >
                  {col.label}
                  <SortIcon col={col.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {page.map((t) => (
              <tr
                key={t.key}
                className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-[var(--border-primary)] last:border-b-0 cursor-pointer ${
                  selectedTasks.includes(t.key) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                }`}
                onClick={() => handleRowClick(t)}
              >
                {/* Checkbox cell */}
                <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => dispatch({ type: 'TOGGLE_TASK_SELECTION', payload: t.key })}
                    className="cursor-pointer hover:opacity-70 transition-opacity"
                  >
                    {selectedTasks.includes(t.key) ? (
                      <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                    ) : (
                      <Square className="w-4 h-4 text-[var(--text-tertiary)]" />
                    )}
                  </button>
                </td>
                <td className="px-2.5 py-2 text-[13px] text-[var(--text-primary)] whitespace-nowrap">
                  <span className="font-semibold text-[var(--accent)] text-xs">{t.key}</span>
                </td>
                <td
                  className="px-2.5 py-2 text-[13px] text-[var(--text-primary)] max-w-[250px] overflow-hidden text-ellipsis whitespace-nowrap"
                  title={t.summary}
                >
                  {t.summary}
                </td>
                <td className="px-2.5 py-2 text-[13px] text-[var(--text-secondary)]">
                  {t.comps.join(', ') || '—'}
                </td>
                <td className="px-2.5 py-2 text-[13px] text-[var(--text-secondary)]">
                  {t.primarySprint || '—'}
                </td>
                <td className="px-2.5 py-2 text-[13px] text-[var(--text-secondary)]">
                  {t.assignee || '—'}
                </td>
                <td className="px-2.5 py-2 text-[13px] text-right tabular-nums whitespace-nowrap text-[var(--text-primary)] font-mono">
                  {(t.timeSpentHr ?? 0).toFixed(1)}h
                </td>
                <td className="px-2.5 py-2 text-[13px] text-right tabular-nums whitespace-nowrap text-[var(--text-secondary)] font-mono">
                  {(t.originalEstimateHr ?? 0).toFixed(1)}h
                </td>
                <td className="px-2.5 py-2 text-[13px] text-[var(--text-secondary)]">
                  {t.status || '—'}
                </td>
                <td className="px-2.5 py-2 relative">
                  <div
                    ref={(el) => { if (labelDropdownTask === t.key) labelDropdownRef.current = el; }}
                    className="flex flex-wrap gap-1 cursor-pointer min-h-[20px] items-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLabelDropdownTask(labelDropdownTask === t.key ? null : t.key);
                    }}
                  >
                    {(t.labels || []).length > 0 ? (
                      (t.labels || []).map(lid => (
                        <LabelBadge key={lid} labelId={lid} labelDefs={state.labelDefs} />
                      ))
                    ) : (
                      <span className="text-[11px] text-[var(--text-tertiary)]">—</span>
                    )}
                    {/* Label dropdown for single task */}
                    <AnimatePresence>
                      {labelDropdownTask === t.key && (
                        <LabelDropdown
                          taskKeys={t.key}
                          onClose={() => setLabelDropdownTask(null)}
                          anchorRef={labelDropdownRef}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-3">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => goToPage(p)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                p === currentPage
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Bulk label dropdown */}
      <AnimatePresence>
        {bulkLabelOpen && selectedTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="relative mt-2"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--text-secondary)]">
                Gán nhãn cho {selectedTasks.length} task
              </span>
              <button
                onClick={() => setBulkLabelOpen(false)}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <div className="relative">
              <LabelDropdown
                taskKeys={selectedTasks}
                onClose={() => setBulkLabelOpen(false)}
                anchorRef={bulkButtonRef}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Detail Modal */}
      {selectedTask && <TaskDetail task={selectedTask} onClose={handleCloseDetail} />}
    </motion.div>
  );
}
