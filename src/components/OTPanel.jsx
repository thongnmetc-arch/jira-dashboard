import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function OTPanel() {
  const { state, dispatch } = useApp();
  const [otTotal, setOtTotal] = useState(state.otLeaveData?.otTotal && state.otLeaveData.otTotal > 0 ? state.otLeaveData.otTotal : '');
  const [leaveTotal, setLeaveTotal] = useState(state.otLeaveData?.leaveTotal && state.otLeaveData.leaveTotal > 0 ? state.otLeaveData.leaveTotal : '');

  useEffect(() => {
    setOtTotal(state.otLeaveData?.otTotal && state.otLeaveData.otTotal > 0 ? state.otLeaveData.otTotal : '');
    setLeaveTotal(state.otLeaveData?.leaveTotal && state.otLeaveData.leaveTotal > 0 ? state.otLeaveData.leaveTotal : '');
  }, [state.otLeaveData]);

  const { otPanelOpen } = state;

  const handleSave = () => {
    const data = { otTotal: parseFloat(otTotal) || 0, leaveTotal: parseFloat(leaveTotal) || 0 };
    dispatch({ type: 'SET_OT_LEAVE', payload: data });
    try { localStorage.setItem('jira-dash-ot-leave', JSON.stringify(data)); } catch(e) {}
    dispatch({ type: 'SET_OT_PANEL_OPEN', payload: false });
  };

  const closePanel = () => {
    dispatch({ type: 'SET_OT_PANEL_OPEN', payload: false });
  };

  return (
    <AnimatePresence>
      {otPanelOpen && (
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
                <Clock className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  OT & Nghỉ phép
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
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* OT Hours */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  ⏱ Tăng ca (OT)
                </label>

                {/* Quick add buttons */}
                <div className="flex gap-1.5 flex-wrap mb-3">
                  <button onClick={() => setOtTotal((prev) => (parseFloat(prev) || 0) + 0.5)}
                    className="text-xs px-2.5 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                    +0.5h
                  </button>
                  <button onClick={() => setOtTotal((prev) => (parseFloat(prev) || 0) + 1.5)}
                    className="text-xs px-2.5 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                    +1.5h
                  </button>
                  <button onClick={() => setOtTotal((prev) => (parseFloat(prev) || 0) + 2)}
                    className="text-xs px-2.5 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                    +2h
                  </button>
                  <button onClick={() => setOtTotal((prev) => (parseFloat(prev) || 0) + 4)}
                    className="text-xs px-2.5 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                    +4h
                  </button>
                  <button onClick={() => setOtTotal((prev) => (parseFloat(prev) || 0) + 8)}
                    className="text-xs px-2.5 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                    +8h
                  </button>
                </div>

                {/* Manual input */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-tertiary)]">Tổng:</span>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    step="0.5"
                    value={otTotal}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : parseFloat(e.target.value) || 0;
                      setOtTotal(val);
                    }}
                    className="w-24 px-3 py-2 text-sm font-semibold bg-[var(--bg-secondary)] border-2 border-[var(--border-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 text-center"
                    placeholder="0"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">giờ</span>
                  <button onClick={() => setOtTotal('')}
                    className="text-xs text-[var(--text-tertiary)] hover:text-red-500 transition-colors ml-1">
                    Xóa
                  </button>
                </div>
              </div>

              {/* Leave Hours */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  🏖 Nghỉ phép
                </label>

                {/* Quick add buttons — each click adds to total */}
                <div className="flex gap-1.5 flex-wrap mb-3">
                  <button onClick={() => setLeaveTotal((prev) => (parseFloat(prev) || 0) + 1.75)}
                    className="text-xs px-2.5 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                    +¼ ngày (1.75h)
                  </button>
                  <button onClick={() => setLeaveTotal((prev) => (parseFloat(prev) || 0) + 3.5)}
                    className="text-xs px-2.5 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                    +½ ngày (3.5h)
                  </button>
                  <button onClick={() => setLeaveTotal((prev) => (parseFloat(prev) || 0) + 7)}
                    className="text-xs px-2.5 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                    +1 ngày (7h)
                  </button>
                  <button onClick={() => setLeaveTotal((prev) => (parseFloat(prev) || 0) + 14)}
                    className="text-xs px-2.5 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                    +2 ngày (14h)
                  </button>
                </div>

                {/* Display current total + manual input for fine-tuning */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-tertiary)]">Tổng:</span>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    step="0.5"
                    value={leaveTotal}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : parseFloat(e.target.value) || 0;
                      setLeaveTotal(val);
                    }}
                    className="w-24 px-3 py-2 text-sm font-semibold bg-[var(--bg-secondary)] border-2 border-[var(--border-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 text-center"
                    placeholder="0"
                  />
                  <span className="text-sm text-[var(--text-secondary)]">giờ</span>
                  <button onClick={() => setLeaveTotal('')}
                    className="text-xs text-[var(--text-tertiary)] hover:text-red-500 transition-colors ml-1">
                    Xóa
                  </button>
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                className="w-full bg-[var(--accent)] hover:opacity-90 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-opacity cursor-pointer"
              >
                💾 Lưu & Tính lại Effort
              </button>

              <p className="text-xs text-[var(--text-tertiary)]">
                Effort sẽ tự động tính lại: (Ngày công × 7 + OT - Nghỉ) / Tổng giờ log
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
