import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useMemo } from 'react';
import LabelFilter from './LabelFilter';

export default function FilterBar() {
  const { state, dispatch } = useApp();

  const sprints = useMemo(() => {
    return [...new Set(state.allTasks.map(t => t.primarySprint).filter(Boolean))].sort();
  }, [state.allTasks]);

  const comps = useMemo(() => {
    return [...new Set(state.allTasks.flatMap(t => t.comps).filter(Boolean))].sort();
  }, [state.allTasks]);

  const assignees = useMemo(() => {
    return [...new Set(state.allTasks.map(t => t.assignee).filter(Boolean))].sort();
  }, [state.allTasks]);

  const updateFilter = (key, value) => {
    dispatch({ type: 'SET_FILTERS', payload: { ...state.filters, [key]: value } });
  };

  const resetFilters = () => {
    dispatch({
      type: 'SET_FILTERS',
      payload: { sprint: '', component: '', assignee: '', dateFrom: '', dateTo: '', labels: [] }
    });
  };

  // Count active filters (handle array filters like labels)
  const activeFilterCount = Object.entries(state.filters).filter(([k, v]) => {
    if (Array.isArray(v)) return v.length > 0;
    return v && v !== '';
  }).length;

  // Reusable class builder: base + active indicator
  const filterClass = (hasValue, widthClass = 'min-w-[110px]') =>
    `input-like flex-shrink-0 text-xs h-8 ${widthClass} rounded-lg transition-colors ${
      hasValue
        ? 'border-l-2 border-[var(--accent)] bg-[var(--accent-light)]'
        : ''
    }`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card mb-5"
    >
      <div className="flex items-center gap-2">
        {/* Compact Sprint select */}
        <select
          value={state.filters.sprint}
          onChange={(e) => updateFilter('sprint', e.target.value)}
          className={filterClass(!!state.filters.sprint)}
        >
          <option value="">Tất cả Sprint</option>
          {sprints.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Compact Component select */}
        <select
          value={state.filters.component}
          onChange={(e) => updateFilter('component', e.target.value)}
          className={filterClass(!!state.filters.component)}
        >
          <option value="">Tất cả phân hệ</option>
          {comps.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Compact Assignee select */}
        <select
          value={state.filters.assignee}
          onChange={(e) => updateFilter('assignee', e.target.value)}
          className={filterClass(!!state.filters.assignee)}
        >
          <option value="">Tất cả người TH</option>
          {assignees.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {/* Vertical separator */}
        <div className="w-px h-5 bg-[var(--border-primary)] flex-shrink-0" />

        {/* Date from */}
        <input
          type="date"
          value={state.filters.dateFrom}
          onChange={(e) => updateFilter('dateFrom', e.target.value)}
          placeholder="Từ ngày"
          className={filterClass(!!state.filters.dateFrom, 'w-[135px]') + ' pr-6'}
        />

        {/* Date to */}
        <input
          type="date"
          value={state.filters.dateTo}
          onChange={(e) => updateFilter('dateTo', e.target.value)}
          placeholder="Đến ngày"
          className={filterClass(!!state.filters.dateTo, 'w-[135px]') + ' pr-6'}
        />

        {/* Label filter */}
        {state.labelDefs && Object.keys(state.labelDefs).length > 0 && (
          <LabelFilter />
        )}

        {/* Reset — only when filters active */}
        {activeFilterCount > 0 && (
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={resetFilters}
            className="flex-shrink-0 h-8 w-8 flex items-center justify-center text-sm bg-[var(--bg-secondary)] hover:bg-[var(--accent-light)] rounded-lg border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors cursor-pointer"
            title="Xóa tất cả bộ lọc"
          >
            ↺
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
