import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';

export default function OTPanelInline() {
  const { t } = useI18n();
  const { state, dispatch } = useApp();
  const [otTotal, setOtTotal] = useState(state.otLeaveData?.otTotal && state.otLeaveData.otTotal > 0 ? state.otLeaveData.otTotal : '');
  const [leaveTotal, setLeaveTotal] = useState(state.otLeaveData?.leaveTotal && state.otLeaveData.leaveTotal > 0 ? state.otLeaveData.leaveTotal : '');

  useEffect(() => {
    setOtTotal(state.otLeaveData?.otTotal && state.otLeaveData.otTotal > 0 ? state.otLeaveData.otTotal : '');
    setLeaveTotal(state.otLeaveData?.leaveTotal && state.otLeaveData.leaveTotal > 0 ? state.otLeaveData.leaveTotal : '');
  }, [state.otLeaveData]);

  const handleSave = () => {
    const data = { otTotal: parseFloat(otTotal) || 0, leaveTotal: parseFloat(leaveTotal) || 0 };
    dispatch({ type: 'SET_OT_LEAVE', payload: data });
    try { localStorage.setItem('jira-dash-ot-leave', JSON.stringify(data)); } catch(e) {}
    // No close — inline tab
  };

  return (
    <motion.div
      key="ot"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-[var(--accent)]" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          {t('ot.title')}
        </h2>
      </div>

      <div className="space-y-4">
        {/* OT Hours */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            {t('ot.otLabel')}
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
            <span className="text-xs text-[var(--text-tertiary)]">{t('ot.totalLabel')}</span>
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
            <span className="text-sm text-[var(--text-secondary)]">{t('ot.hoursUnit')}</span>
            <button onClick={() => setOtTotal('')}
              className="text-xs text-[var(--text-tertiary)] hover:text-red-500 transition-colors ml-1">
              {t('ot.clear')}
            </button>
          </div>
        </div>

        {/* Leave Hours */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            {t('ot.leaveLabel')}
          </label>

          {/* Quick add buttons — each click adds to total */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            <button onClick={() => setLeaveTotal((prev) => (parseFloat(prev) || 0) + 1.75)}
              className="text-xs px-2.5 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
              {t('ot.quickAddQuarter')}
            </button>
            <button onClick={() => setLeaveTotal((prev) => (parseFloat(prev) || 0) + 3.5)}
              className="text-xs px-2.5 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
              {t('ot.quickAddHalf')}
            </button>
            <button onClick={() => setLeaveTotal((prev) => (parseFloat(prev) || 0) + 7)}
              className="text-xs px-2.5 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
              {t('ot.quickAddOneDay')}
            </button>
            <button onClick={() => setLeaveTotal((prev) => (parseFloat(prev) || 0) + 14)}
              className="text-xs px-2.5 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
              {t('ot.quickAddTwoDay')}
            </button>
          </div>

          {/* Display current total + manual input for fine-tuning */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-tertiary)]">{t('ot.totalLabel')}</span>
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
            <span className="text-sm text-[var(--text-secondary)]">{t('ot.hoursUnit')}</span>
            <button onClick={() => setLeaveTotal('')}
              className="text-xs text-[var(--text-tertiary)] hover:text-red-500 transition-colors ml-1">
              {t('ot.clear')}
            </button>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full bg-[var(--accent)] hover:opacity-90 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-opacity cursor-pointer"
        >
          💾 {t('ot.save')}
        </button>

        <p className="text-xs text-[var(--text-tertiary)]">
          {t('ot.effortFormula')}
        </p>
      </div>
    </motion.div>
  );
}
