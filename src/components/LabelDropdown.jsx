import { useCallback, useRef, useEffect, useState, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import LabelBadge from './LabelBadge';

/**
 * Dropdown popover to assign/remove labels from one or more tasks.
 * Props:
 *   taskKeys   – single key string or array of keys (for bulk)
 *   onClose    – callback when closing
 *   anchorRef  – optional ref to the trigger element (for positioning)
 */
export default function LabelDropdown({ taskKeys, onClose, anchorRef }) {
  const { state, dispatch } = useApp();
  const { labelDefs, labelAssignments } = state;
  const keys = Array.isArray(taskKeys) ? taskKeys : [taskKeys];
  const dropdownRef = useRef(null);
  const [position, setPosition] = useState({ top: -9999, left: -9999 });

  // For a single key: get its labels; for bulk: intersect all selected tasks' labels
  const getCheckedLabels = () => {
    if (keys.length === 1) {
      return labelAssignments[keys[0]] || [];
    }
    // Intersection
    const allSets = keys.map(k => new Set(labelAssignments[k] || []));
    if (allSets.length === 0) return [];
    const intersection = [...allSets[0]].filter(id => allSets.every(s => s.has(id)));
    return intersection;
  };

  const checked = getCheckedLabels();

  const handleToggle = useCallback((labelId) => {
    const isChecked = checked.includes(labelId);
    if (keys.length === 1) {
      // Single task
      const key = keys[0];
      if (isChecked) {
        dispatch({ type: 'REMOVE_LABEL', payload: { taskKey: key, labelId } });
      } else {
        dispatch({ type: 'ASSIGN_LABEL', payload: { taskKey: key, labelId } });
      }
    } else {
      // Bulk
      const taskKeyList = keys;
      if (isChecked) {
        dispatch({ type: 'BULK_REMOVE_LABELS', payload: { taskKeys: taskKeyList, labelId } });
      } else {
        dispatch({ type: 'BULK_ASSIGN_LABELS', payload: { taskKeys: taskKeyList, labelId } });
      }
    }
  }, [checked, keys, dispatch]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!dropdownRef.current || dropdownRef.current.contains(e.target)) return;
      // If anchorRef is provided, also allow clicks on the anchor element
      if (anchorRef?.current && anchorRef.current.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorRef]);

  // Position the dropdown using fixed positioning based on anchor element's rect
  // useLayoutEffect ensures DOM is updated before getBoundingClientRect reads it
  useLayoutEffect(() => {
    const updatePosition = () => {
      if (anchorRef?.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        const dropdownWidth = 256; // w-64 = 16rem = 256px
        const vw = window.innerWidth;
        const left = Math.max(8, Math.min(rect.left, vw - dropdownWidth - 8));
        setPosition({ top: rect.bottom + 4, left });
      } else {
        // Fallback: centered in viewport
        setPosition({
          top: Math.max(20, window.innerHeight / 2 - 150),
          left: Math.max(20, window.innerWidth / 2 - 128),
        });
      }
    };

    // Use requestAnimationFrame to ensure layout is complete after React re-render
    const frame = requestAnimationFrame(() => {
      updatePosition();
    });

    window.addEventListener('resize', updatePosition);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePosition);
    };
  }, [anchorRef, checked]); // Recalculate when checked labels change

  const labelIds = Object.keys(labelDefs || {});

  return (
    <motion.div
      ref={dropdownRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="fixed z-50 w-64 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-xl overflow-hidden"
      style={{ 
        top: position.top,
        left: position.left,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-primary)]">
        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Gán nhãn
        </span>
        <button
          onClick={onClose}
          className="p-0.5 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Label list */}
      <div className="max-h-56 overflow-y-auto p-2 space-y-0.5">
        {labelIds.length === 0 ? (
          <p className="text-xs text-[var(--text-tertiary)] text-center py-3">
            Chưa có nhãn nào. Tạo nhãn trong Quản lý nhãn.
          </p>
        ) : (
          labelIds.map((id) => {
            const isChecked = checked.includes(id);
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
      <div className="px-3 py-2 border-t border-[var(--border-primary)] flex justify-end">
        <button
          onClick={onClose}
          className="text-xs font-medium px-3 py-1.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
        >
          Đóng
        </button>
      </div>
    </motion.div>
  );
}
