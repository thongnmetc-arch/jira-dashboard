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
      <div className="flex items-center gap-2 mb-5">
        <Clock className="w-4 h-4 text-[var(--accent)]" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">⏱ OT &amp; Nghỉ phép</h2>
      </div>

      <div className="space-y-5">
        {/* Two-column cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* OT Card */}
          <div className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--success)]/10 flex items-center justify-center">
                <span className="text-sm">⏱</span>
              </div>
              <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">Tăng ca (OT)</span>
            </div>

            {/* Large number */}
            <div className="text-3xl font-bold text-[var(--success)] mb-1 font-mono tabular-nums">
              {(parseFloat(otTotal) || 0).toFixed(1)}<span className="text-lg font-normal text-[var(--text-tertiary)] ml-1">h</span>
            </div>

            {/* Quick add */}
            <div className="flex gap-1.5 flex-wrap mb-3">
              {[0.5, 1.5, 2, 4, 8].map(h => (
                <button key={h} onClick={() => setOtTotal(prev => (parseFloat(prev) || 0) + h)}
                  className="text-[10px] px-2 py-1 rounded-md bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--success)]/10 hover:text-[var(--success)] hover:border-[var(--success)]/30 transition-all font-mono">
                  +{h}h
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2">
              <input type="number" min="0" max="200" step="0.5" value={otTotal}
                onChange={e => setOtTotal(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1.5 text-sm font-mono bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30 text-center text-[var(--text-primary)]"
                placeholder="0" />
              <button onClick={() => setOtTotal('')}
                className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-colors">Xóa</button>
            </div>
          </div>

          {/* Leave Card — same pattern, different color */}
          <div className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--danger)]/10 flex items-center justify-center">
                <span className="text-sm">🏖</span>
              </div>
              <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">Nghỉ phép</span>
            </div>
            <div className="text-3xl font-bold text-[var(--danger)] mb-1 font-mono tabular-nums">
              {(parseFloat(leaveTotal) || 0).toFixed(1)}<span className="text-lg font-normal text-[var(--text-tertiary)] ml-1">h</span>
            </div>
            <div className="flex gap-1.5 flex-wrap mb-3">
              {[1.75, 3.5, 7, 14].map(h => (
                <button key={h} onClick={() => setLeaveTotal(prev => (parseFloat(prev) || 0) + h)}
                  className="text-[10px] px-2 py-1 rounded-md bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] hover:border-[var(--danger)]/30 transition-all font-mono">
                  +{h}h
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="number" min="0" max="200" step="0.5" value={leaveTotal}
                onChange={e => setLeaveTotal(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1.5 text-sm font-mono bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30 text-center text-[var(--text-primary)]"
                placeholder="0" />
              <button onClick={() => setLeaveTotal('')}
                className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-colors">Xóa</button>
            </div>
          </div>
        </div>

        {/* Info hint */}
        <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]/50">
          <p className="text-xs text-[var(--text-tertiary)]">
            {t('ot.effortFormula')}
          </p>
        </div>

        {/* Save button */}
        <button onClick={handleSave}
          className="w-full bg-[var(--accent)] hover:opacity-90 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-opacity cursor-pointer">
          💾 {t('ot.save')}
        </button>
      </div>
    </motion.div>
  );
}
