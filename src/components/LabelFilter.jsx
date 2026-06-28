import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import LabelBadge from './LabelBadge';

/**
 * Dropdown filter for labels.
 * Renders a trigger button with active count badge,
 * opens a popover with checkable label list.
 */
export default function LabelFilter() {
  const { state, dispatch } = useApp();
  const { labelDefs, filters } = state;
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  const selectedLabels = filters.labels || [];

  const toggleDropdown = () => setOpen(v => !v);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        open &&
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleToggle = (labelId) => {
    const current = [...selectedLabels];
    const idx = current.indexOf(labelId);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(labelId);
    }
    dispatch({ type: 'SET_FILTERS', payload: { ...filters, labels: current } });
  };

  const handleClear = () => {
    const { labels, ...rest } = filters;
    dispatch({ type: 'SET_FILTERS', payload: { ...rest, labels: [] } });
    setOpen(false);
  };

  const labelIds = Object.keys(labelDefs || {});

  return (
    <div className="relative inline-flex">
      {/* Trigger button */}
      <button
        ref={triggerRef}
        onClick={toggleDropdown}
        className={`flex items-center gap-1.5 px-2.5 h-8 text-xs rounded-lg border transition-colors cursor-pointer ${
          selectedLabels.length > 0
            ? 'bg-[var(--accent-light)] border-[var(--accent)]/30 text-[var(--accent)]'
            : 'bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
        }`}
      >
        <Filter className="w-3 h-3" />
        <span>Nhãn</span>
        {selectedLabels.length > 0 && (
          <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold leading-none">
            {selectedLabels.length}
          </span>
        )}
      </button>

      {/* Dropdown popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full left-0 mt-1.5 z-50 w-56 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-primary)]">
              <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Lọc theo nhãn
              </span>
              <button
                onClick={() => setOpen(false)}
                className="p-0.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Label list */}
            <div className="max-h-52 overflow-y-auto p-2 space-y-0.5">
              {labelIds.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)] text-center py-3">
                  Chưa có nhãn
                </p>
              ) : (
                labelIds.map((id) => {
                  const isChecked = selectedLabels.includes(id);
                  return (
                    <label
                      key={id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-[var(--accent-light)]'
                          : 'hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggle(id)}
                        className="w-3.5 h-3.5 rounded border-[var(--border-secondary)] text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                      />
                      <LabelBadge labelId={id} labelDefs={labelDefs} />
                      <span className="text-xs text-[var(--text-secondary)] truncate flex-1">
                        {labelDefs[id]?.name || id}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {selectedLabels.length > 0 && (
              <div className="px-3 py-2 border-t border-[var(--border-primary)]">
                <button
                  onClick={handleClear}
                  className="text-xs text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-colors cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
