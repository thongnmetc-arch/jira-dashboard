import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, X, Pencil, Trash2, Plus, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import LabelBadge from './LabelBadge';
import RuleEditor from './RuleEditor';
import { generateLabelId, PRESET_COLORS } from '../utils/labelUtils';

/**
 * Slide-out drawer for managing labels:
 * - List / edit / delete labels
 * - Create new labels with color picker
 * - Auto-label rules
 * Mirrors OTPanel.jsx drawer pattern exactly.
 */
export default function LabelManager() {
  const { state, dispatch } = useApp();
  const { labelDefs, labelAssignments, autoRules, labelPanelOpen } = state;

  // Local state for label creation / editing
  const [editId, setEditId] = useState(null); // null = new
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(PRESET_COLORS[0]);
  const [customHex, setCustomHex] = useState('');

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // New rule row (inline)
  const [showNewRule, setShowNewRule] = useState(false);

  /** Start editing an existing label */
  const startEdit = useCallback((id) => {
    const def = labelDefs[id];
    if (!def) return;
    setEditId(id);
    setEditName(def.name);
    setEditColor(def.color);
    setCustomHex('');
  }, [labelDefs]);

  /** Start creating a new label */
  const startNew = useCallback(() => {
    setEditId(null);
    setEditName('');
    setEditColor(PRESET_COLORS[0]);
    setCustomHex('');
  }, []);

  /** Save (create or update) a label */
  const handleSaveLabel = useCallback(() => {
    const name = editName.trim();
    if (!name) return;

    const id = editId || generateLabelId(name);
    const color = customHex.trim() || editColor;

    if (editId) {
      dispatch({ type: 'UPDATE_LABEL', payload: { id, data: { name, color } } });
    } else {
      dispatch({ type: 'ADD_LABEL', payload: { id, name, color } });
    }

    // Reset form
    setEditId(null);
    setEditName('');
    setEditColor(PRESET_COLORS[0]);
    setCustomHex('');
  }, [editId, editName, editColor, customHex, dispatch]);

  /** Cancel editing */
  const handleCancelEdit = useCallback(() => {
    setEditId(null);
    setEditName('');
    setEditColor(PRESET_COLORS[0]);
    setCustomHex('');
  }, []);

  /** Confirm and execute delete */
  const handleDeleteConfirm = useCallback(() => {
    if (!deleteConfirm) return;
    dispatch({ type: 'DELETE_LABEL', payload: { id: deleteConfirm } });
    setDeleteConfirm(null);
    if (editId === deleteConfirm) handleCancelEdit();
  }, [deleteConfirm, dispatch, editId, handleCancelEdit]);

  /** Save a new auto-rule */
  const handleSaveRule = useCallback((ruleData) => {
    const newRule = {
      ...ruleData,
      id: ruleData.id || `rule_${Date.now()}`,
    };
    const existing = autoRules || [];
    const idx = existing.findIndex(r => r.id === newRule.id);
    let updated;
    if (idx >= 0) {
      updated = existing.map((r, i) => (i === idx ? newRule : r));
    } else {
      updated = [...existing, newRule];
    }
    dispatch({ type: 'SET_AUTO_RULES', payload: updated });
    setShowNewRule(false);
    // Also run auto-rules immediately
    dispatch({ type: 'RUN_AUTO_RULES' });
  }, [autoRules, dispatch]);

  /** Delete an auto-rule */
  const handleDeleteRule = useCallback((ruleId) => {
    const updated = (autoRules || []).filter(r => r.id !== ruleId);
    dispatch({ type: 'SET_AUTO_RULES', payload: updated });
    dispatch({ type: 'RUN_AUTO_RULES' });
  }, [autoRules, dispatch]);

  const closePanel = () => {
    dispatch({ type: 'SET_LABEL_PANEL_OPEN', payload: false });
  };

  /** Count how many tasks use a given label */
  const countTasksForLabel = (labelId) => {
    if (!labelAssignments) return 0;
    return Object.values(labelAssignments).filter(ids => ids.includes(labelId)).length;
  };

  return (
    <AnimatePresence>
      {labelPanelOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={closePanel}
          />

          {/* Slide-out drawer */}
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-[420px] max-w-[90vw] bg-[var(--bg-primary)] border-l border-[var(--border-primary)] shadow-xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Quản lý nhãn
                </h2>
              </div>
              <button
                onClick={closePanel}
                className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">

              {/* === SECTION A: Danh sách nhãn === */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Danh sách nhãn
                  </h3>
                  {!editId && (
                    <button
                      onClick={startNew}
                      className="flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Tạo nhãn
                    </button>
                  )}
                </div>

                {Object.keys(labelDefs || {}).length === 0 && !editId ? (
                  <p className="text-xs text-[var(--text-tertiary)] py-4 text-center">
                    Chưa có nhãn nào. Nhấn "Tạo nhãn" để bắt đầu.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {Object.entries(labelDefs || {}).map(([id, def]) => (
                      <motion.div
                        key={id}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] group"
                      >
                        <LabelBadge labelId={id} labelDefs={labelDefs} />
                        <span className="text-xs text-[var(--text-primary)] flex-1 truncate">
                          {def.name}
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)] whitespace-nowrap">
                          {countTasksForLabel(id)} tasks
                        </span>
                        <button
                          onClick={() => startEdit(id)}
                          className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--bg-tertiary)] opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          title="Sửa nhãn"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(id)}
                          className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          title="Xóa nhãn"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* === SECTION B: Tạo / Chỉnh sửa nhãn === */}
              {(editId || editName !== '' || editId === null) && (
                <div className="p-4 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] space-y-3">
                  <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    {editId ? 'Chỉnh sửa nhãn' : 'Tạo nhãn mới'}
                  </h3>

                  {/* Name input */}
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                      Tên nhãn
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => {
                        setEditName(e.target.value);
                        // Auto-generate ID for new labels
                        if (!editId) {
                          // ID is generated on save
                        }
                      }}
                      placeholder="VD: Bug, Feature, UI..."
                      className="input-like w-full text-xs py-1.5 px-2.5"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveLabel(); }}
                    />
                  </div>

                  {/* Color palette */}
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
                      Màu sắc
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => { setEditColor(c); setCustomHex(''); }}
                          className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                            (editColor === c && !customHex)
                              ? 'border-[var(--text-primary)] scale-110'
                              : 'border-transparent hover:scale-110'
                          }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        >
                          {(editColor === c && !customHex) && (
                            <Check className="w-3 h-3 mx-auto text-white drop-shadow-sm" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom hex */}
                  <div>
                    <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                      Màu tùy chỉnh (hex)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customHex}
                        onChange={(e) => {
                          setCustomHex(e.target.value);
                          if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                            setEditColor(e.target.value);
                          }
                        }}
                        placeholder="#6366f1"
                        className="input-like text-xs py-1.5 px-2.5 w-28 font-mono"
                      />
                      {customHex && /^#[0-9a-fA-F]{6}$/.test(customHex) && (
                        <div className="w-6 h-6 rounded-full border border-[var(--border-primary)]" style={{ backgroundColor: customHex }} />
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleSaveLabel}
                      disabled={!editName.trim()}
                      className="px-4 py-1.5 text-xs font-medium bg-[var(--accent)] hover:opacity-90 text-white rounded-md transition-opacity disabled:opacity-40 cursor-pointer"
                    >
                      {editId ? 'Cập nhật' : 'Thêm nhãn'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-1.5 text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-md transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {/* === SECTION C: Quy tắc tự động === */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Quy tắc tự động
                  </h3>
                  {!showNewRule && (
                    <button
                      onClick={() => setShowNewRule(true)}
                      className="flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Thêm quy tắc
                    </button>
                  )}
                </div>

                {(!autoRules || autoRules.length === 0) && !showNewRule ? (
                  <p className="text-xs text-[var(--text-tertiary)] py-3 text-center">
                    Chưa có quy tắc tự động nào. Quy tắc sẽ tự gán nhãn khi tải dữ liệu.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(autoRules || []).map((rule) => (
                      <RuleEditor
                        key={rule.id}
                        rule={rule}
                        labelDefs={labelDefs}
                        onSave={handleSaveRule}
                        onDelete={handleDeleteRule}
                        onCancel={() => {}}
                      />
                    ))}
                    {showNewRule && (
                      <RuleEditor
                        rule={null}
                        labelDefs={labelDefs}
                        onSave={handleSaveRule}
                        onDelete={null}
                        onCancel={() => setShowNewRule(false)}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Delete confirmation dialog */}
          <AnimatePresence>
            {deleteConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
              >
                <div
                  className="pointer-events-auto w-full max-w-sm bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-2xl p-5 space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    Xóa nhãn
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Nhãn <strong>"{labelDefs[deleteConfirm]?.name}"</strong> đang được gán cho{' '}
                    <strong>{countTasksForLabel(deleteConfirm)}</strong> task. Xóa vẫn tiếp tục?
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-4 py-1.5 text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-md transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      className="px-4 py-1.5 text-xs font-medium bg-[var(--danger)] hover:opacity-90 text-white rounded-md transition-opacity cursor-pointer"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
