import { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { ChevronDown, Layers, Box, User } from 'lucide-react';
import LabelFilter from './LabelFilter';

function FilterPopover({ label, icon: Icon, options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const hasValue = value && value !== '';

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
          hasValue
            ? 'border-[var(--accent)]/40 bg-[var(--accent-light)] text-[var(--accent)]'
            : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
        }`}
      >
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="max-w-[100px] truncate">{hasValue ? value : placeholder}</span>
        <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-56 max-h-60 overflow-y-auto bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-xl py-1">
          <button
            onClick={() => { onChange(''); setOpen(false); }}
            className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[var(--bg-secondary)] cursor-pointer ${
              !hasValue
                ? 'text-[var(--accent)] font-medium'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            {placeholder}
          </button>
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[var(--bg-secondary)] cursor-pointer truncate ${
                value === opt
                  ? 'text-[var(--accent)] font-medium bg-[var(--accent-light)]'
                  : 'text-[var(--text-primary)]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

  // Reusable class builder: base + active indicator (used by date inputs)
  const filterClass = (hasValue, widthClass = 'w-[120px] max-w-[120px]') =>
    `input-like flex-shrink-0 text-xs h-8 ${widthClass} truncate rounded-lg transition-colors ${
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
        {/* Sprint popover */}
        <FilterPopover
          label="Sprint"
          icon={Layers}
          options={sprints}
          value={state.filters.sprint}
          onChange={(v) => updateFilter('sprint', v)}
          placeholder="Tất cả Sprint"
        />

        {/* Component popover */}
        <FilterPopover
          label="Phân hệ"
          icon={Box}
          options={comps}
          value={state.filters.component}
          onChange={(v) => updateFilter('component', v)}
          placeholder="Tất cả phân hệ"
        />

        {/* Assignee popover */}
        <FilterPopover
          label="Người TH"
          icon={User}
          options={assignees}
          value={state.filters.assignee}
          onChange={(v) => updateFilter('assignee', v)}
          placeholder="Tất cả"
        />

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
