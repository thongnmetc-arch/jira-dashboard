import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, X, Save, Eye, Trash2, CheckSquare, Square } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  saveSnapshot,
  loadSnapshot,
  listSnapshots,
  deleteSnapshot,
  getStorageUsage,
  isStorageAvailable,
  formatSavedAt,
  SNAPSHOT_KEY_PREFIX,
  STORAGE_WARNING_THRESHOLD,
} from '../utils/historyUtils';
import CompareView from './CompareView';

/**
 * HistoryPanel — slide-out drawer for saving, listing, restoring,
 * and comparing task snapshots.
 *
 * Mirrors the OTPanel.jsx / LabelManager.jsx drawer pattern exactly.
 */
export default function HistoryPanel() {
  const { state, dispatch } = useApp();
  const { historyPanelOpen, allTasks, fileName, dataSource } = state;

  // ── Local state ──────────────────────────────────────────
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotName, setSnapshotName] = useState('');
  const [selectedCompare, setSelectedCompare] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [storageUsage, setStorageUsage] = useState({ totalKB: 0, snapshotsKB: 0, snapshotsCount: 0 });
  const [saveStatus, setSaveStatus] = useState(null); // { type: 'success'|'error', msg }
  const [compareData, setCompareData] = useState(null); // [snapshotA, snapshotB]
  const [storageError, setStorageError] = useState(null);

  // ── Derived ──────────────────────────────────────────────
  const currentTotalHours = allTasks.reduce((s, t) => s + (t.timeSpentHr || 0), 0);
  const periodText =
    allTasks.length > 0
      ? `${allTasks.length} công việc · ${currentTotalHours.toFixed(1)}h`
      : 'Chưa có dữ liệu';
  const storageAvailable = isStorageAvailable();
  const isWarning = storageUsage.totalKB >= STORAGE_WARNING_THRESHOLD;
  const storagePercent = Math.min(100, Math.round((storageUsage.totalKB / (5 * 1024)) * 100));

  // ── Refresh snapshot list from localStorage ────────────
  const refreshList = useCallback(() => {
    try {
      const list = listSnapshots();
      setSnapshots(list);
      setStorageUsage(getStorageUsage());
      setStorageError(null);
    } catch (err) {
      setStorageError('Không thể truy cập bộ nhớ localStorage.');
    }
  }, []);

  // Reload list when panel opens
  useEffect(() => {
    if (historyPanelOpen) {
      refreshList();
      setSnapshotName('');
      setSelectedCompare([]);
      setSaveStatus(null);
      setCompareData(null);
      setDeleteTarget(null);
      setRestoreTarget(null);
    }
  }, [historyPanelOpen, refreshList]);

  // Load full snapshot data for comparison when exactly 2 selected
  useEffect(() => {
    if (selectedCompare.length === 2) {
      const [idA, idB] = selectedCompare;
      const a = loadSnapshot(idA);
      const b = loadSnapshot(idB);
      if (a && b) {
        setCompareData([a, b]);
      } else {
        setCompareData(null);
      }
    } else {
      setCompareData(null);
    }
  }, [selectedCompare]);

  // ── Handlers ─────────────────────────────────────────────
  const closePanel = () => {
    dispatch({ type: 'SET_HISTORY_PANEL_OPEN', payload: false });
  };

  const handleSave = () => {
    const name = snapshotName.trim();
    if (!name) return;
    if (allTasks.length === 0) {
      setSaveStatus({ type: 'error', msg: 'Không có dữ liệu để lưu.' });
      return;
    }

    const result = saveSnapshot(state, name);
    if (result.success) {
      setSaveStatus({ type: 'success', msg: `Đã lưu "${name}"` });
      setSnapshotName('');
      refreshList();
      setTimeout(() => setSaveStatus(null), 3000); // Auto-clear after 3s
    } else {
      setSaveStatus({ type: 'error', msg: result.error || 'Lưu thất bại.' });
      setTimeout(() => setSaveStatus(null), 5000); // Auto-clear after 5s
    }
  };

  const handleRestore = () => {
    if (!restoreTarget) return;
    const snapshot = loadSnapshot(restoreTarget.id);
    if (!snapshot) {
      setSaveStatus({ type: 'error', msg: 'Không thể đọc bản lưu. Dữ liệu có thể bị hỏng.' });
      setRestoreTarget(null);
      return;
    }

    dispatch({
      type: 'RESTORE_SNAPSHOT',
      payload: {
        tasks: snapshot.tasks,
        name: snapshot.name,
        fileName: snapshot.metadata?.fileName || '',
        otLeaveData: snapshot.metadata?.otLeaveData || { otTotal: 0, leaveTotal: 0 },
        labelDefs: snapshot.metadata?.labelDefs || {},
        labelAssignments: snapshot.metadata?.labelAssignments || {},
      },
    });
    setRestoreTarget(null);
    closePanel();
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const deleted = deleteSnapshot(deleteTarget);
    if (deleted) {
      // Clear compare selection if deleted snapshot was selected
      setSelectedCompare((prev) => prev.filter((id) => id !== deleteTarget));
      refreshList();
    }
    setDeleteTarget(null);
  };

  const handleToggleCompare = (id) => {
    setSelectedCompare((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 2) {
        // Replace the oldest selection
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <AnimatePresence>
      {historyPanelOpen && (
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
            className="fixed right-0 top-0 bottom-0 z-50 w-[480px] max-w-[90vw] bg-[var(--bg-primary)] border-l border-[var(--border-primary)] shadow-xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Lịch sử
                </h2>
              </div>
              <button
                onClick={closePanel}
                className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

              {/* ─── Section A: Save ─── */}
              <div>
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                  Lưu phiên hiện tại
                </h3>

                {/* Current session summary */}
                <div className="mb-3 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                  <div className="text-xs text-[var(--text-primary)] font-medium truncate">
                    {fileName || 'Chưa có tên file'}
                  </div>
                  <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                    {periodText}
                  </div>
                </div>

                {/* Name input */}
                <input
                  type="text"
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                  placeholder="VD: Sprint 25, 2026-06-28"
                  className="input-like w-full text-xs py-1.5 px-2.5 mb-2"
                  disabled={!storageAvailable}
                />

                {/* Save button */}
                <button
                  onClick={handleSave}
                  disabled={!snapshotName.trim() || allTasks.length === 0 || !storageAvailable}
                  className="w-full flex items-center justify-center gap-1.5 bg-[var(--accent)] hover:opacity-90 text-white px-4 py-2 rounded-lg text-xs font-medium transition-opacity disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  title={
                    allTasks.length === 0
                      ? 'Không có dữ liệu để lưu'
                      : !snapshotName.trim()
                        ? 'Nhập tên bản lưu'
                        : undefined
                  }
                >
                  <Save className="w-3.5 h-3.5" />
                  Lưu
                </button>

                {/* Save status feedback */}
                {saveStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-2 text-xs px-3 py-1.5 rounded-lg ${
                      saveStatus.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                    }`}
                  >
                    {saveStatus.msg}
                    <button
                      onClick={() => setSaveStatus(null)}
                      className="ml-2 font-bold hover:opacity-70 cursor-pointer"
                    >
                      ×
                    </button>
                  </motion.div>
                )}

                {/* Storage bar */}
                {storageAvailable && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)] mb-1">
                      <span>
                        Đã dùng: {storageUsage.totalKB} KB / 5 MB ({storageSnapshotsText(storageUsage.snapshotsCount)})
                      </span>
                      <span>{storagePercent}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${storagePercent}%` }}
                        transition={{ duration: 0.4 }}
                        className={`h-full rounded-full ${
                          isWarning ? 'bg-amber-500' : 'bg-[var(--accent)]'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Storage warning */}
                {isWarning && storageAvailable && (
                  <div className="mt-2 flex items-start gap-1.5 text-xs px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
                    <span className="text-sm leading-none mt-0.5">⚠</span>
                    <span>
                      Bộ nhớ đã dùng {(storageUsage.totalKB / 1024).toFixed(1)} MB / 5 MB. Nên xóa bản lưu cũ.
                    </span>
                  </div>
                )}

                {/* Storage disabled message */}
                {!storageAvailable && (
                  <div className="mt-2 flex items-start gap-1.5 text-xs px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
                    <span className="text-sm leading-none mt-0.5">✕</span>
                    <span>localStorage không khả dụng. Không thể lưu bản lưu mới.</span>
                  </div>
                )}
              </div>

              {/* ─── Section B: List ─── */}
              <div>
                <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                  Danh sách đã lưu ({snapshots.length})
                </h3>

                {snapshots.length === 0 ? (
                  <p className="text-xs text-[var(--text-tertiary)] py-4 text-center">
                    Chưa có bản lưu nào. Hãy nhập tên và nhấn "Lưu" ở trên.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {snapshots.map((s) => {
                      const isSelected = selectedCompare.includes(s.id);
                      const displayName = s.name || s.id;
                      const totalHrs = s.metadata?.totalHours != null
                        ? `${Number(s.metadata.totalHours).toFixed(1)}h`
                        : '';
                      const period = s.metadata?.period || '';

                      return (
                        <motion.div
                          key={s.id}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] group"
                        >
                          {/* Compare checkbox */}
                          <button
                            onClick={() => handleToggleCompare(s.id)}
                            className="flex-shrink-0 text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                            title="Chọn để so sánh"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)]" />
                            ) : (
                              <Square className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-[var(--text-primary)] truncate">
                              {displayName}
                            </div>
                            <div className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1.5 flex-wrap">
                              <span>{formatSavedAt(s.savedAt)}</span>
                              <span>·</span>
                              <span>{s.taskCount} tasks</span>
                              {totalHrs && (
                                <>
                                  <span>·</span>
                                  <span>{totalHrs}</span>
                                </>
                              )}
                              {period && (
                                <>
                                  <span>·</span>
                                  <span>{period}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <button
                            onClick={() => setRestoreTarget({ id: s.id, name: displayName })}
                            className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer"
                            title="Xem / Khôi phục"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(s.id)}
                            className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-900/20 transition-all cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ─── Section C: Compare (conditional) ─── */}
              {compareData && compareData.length === 2 && (
                <div>
                  <CompareView
                    snapshotA={compareData[0]}
                    snapshotB={compareData[1]}
                  />
                </div>
              )}
            </div>
          </motion.div>

          {/* ─── Restore confirmation modal ─── */}
          <AnimatePresence>
            {restoreTarget && (
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
                    Khôi phục bản lưu
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Khôi phục bản lưu <strong>"{restoreTarget.name}"</strong> sẽ thay thế dữ liệu hiện tại.
                    Tiếp tục?
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setRestoreTarget(null)}
                      className="px-4 py-1.5 text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-md transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleRestore}
                      className="px-4 py-1.5 text-xs font-medium bg-[var(--accent)] hover:opacity-90 text-white rounded-md transition-opacity cursor-pointer"
                    >
                      Khôi phục
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Delete confirmation modal ─── */}
          <AnimatePresence>
            {deleteTarget && (
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
                    Xóa bản lưu
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Xóa bản lưu này? Hành động này không thể hoàn tác.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setDeleteTarget(null)}
                      className="px-4 py-1.5 text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-md transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleDelete}
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

/** Helper: build a human-friendly snapshots count string */
function storageSnapshotsText(count) {
  if (count === 0) return 'chưa có bản lưu';
  if (count === 1) return '1 bản lưu';
  return `${count} bản lưu`;
}
