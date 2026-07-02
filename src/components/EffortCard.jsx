import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { useI18n } from '../i18n';
import { calculateEffort, calculateAverageEffort } from '../utils/effortCalculator';
import { useMemo } from 'react';
import { Gauge } from 'lucide-react';

export default function EffortCard({ tasks, variant = 'month' }) {
  const { t } = useI18n();
  const { state } = useApp();

  const result = useMemo(() => {
    return calculateEffort(tasks, state.otLeaveData);
  }, [tasks, state.otLeaveData]);

  const avgResult = useMemo(() => {
    return calculateAverageEffort(tasks, state.otLeaveData);
  }, [tasks, state.otLeaveData]);

  const effort = result.effort;
  const avgEffort = avgResult.avgEffort;
  const hasAvg = avgResult.monthsWithData > 0;
  // Gauge shows how much of standard time was covered by actual logs
  const gaugePercent = effort > 0 ? Math.min(100, (1 / effort) * 100) : 100;

  if (variant === 'avg') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3, ease: 'easeOut' }}
        className="card rounded-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 border border-[var(--border-primary)]"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
            {t('stats.effortAvg')}
          </div>
          <div className="p-1.5 rounded-md bg-[var(--bg-secondary)]">
            <Gauge className="w-5 h-5 text-[var(--success)]" />
          </div>
        </div>

        {/* Average effort */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-3xl font-bold tracking-tight font-mono tabular-nums text-[var(--text-primary)]">
            {avgEffort.toFixed(3)}
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
            color: avgEffort < 1 ? 'var(--success)' : avgEffort > 1 ? 'var(--danger)' : 'var(--warning)',
            background: avgEffort < 1 ? 'var(--success)' : avgEffort > 1 ? 'var(--danger)' : 'var(--warning)',
            opacity: 0.12
          }}>
          </span>
          <span className="text-xs font-semibold" style={{
            color: avgEffort < 1 ? 'var(--success)' : avgEffort > 1 ? 'var(--danger)' : 'var(--warning)'
          }}>
            {avgEffort < 1 ? t('stats.above') : avgEffort > 1 ? t('stats.below') : t('stats.sufficient')}
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)] ml-auto">{t('stats.avgDetail').replace('{n}', avgResult.monthsWithData)}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3, ease: 'easeOut' }}
      className="card rounded-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 border border-[var(--border-primary)]"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
          {t('stats.effortMonth')}
        </div>
        <div className="p-1.5 rounded-md bg-[var(--bg-secondary)]">
          <Gauge className="w-5 h-5 text-[var(--success)]" />
        </div>
      </div>

      {/* Current month effort */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-3xl font-bold tracking-tight font-mono tabular-nums text-[var(--text-primary)]">
          {effort.toFixed(3)}
        </span>
        <span id="effortLabel" className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
          color: effort < 1 ? 'var(--success)' : effort > 1 ? 'var(--danger)' : 'var(--warning)',
          background: effort < 1 ? 'var(--success)' : effort > 1 ? 'var(--danger)' : 'var(--warning)',
          opacity: 0.12
        }}>
        </span>
        <span id="effortLabelText" className="text-xs font-semibold" style={{
          color: effort < 1 ? 'var(--success)' : effort > 1 ? 'var(--danger)' : 'var(--warning)'
        }}>
          {effort < 1 ? t('stats.above') : effort > 1 ? t('stats.below') : t('stats.sufficient')}
        </span>
        <span className="text-[10px] text-[var(--text-tertiary)] ml-auto">{t('stats.currentMonth')}</span>
      </div>
      <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate" title={result.detail}>
        {result.detail || t('dashboard.noData')}
      </div>
      <div className="w-full h-2.5 bg-[var(--bg-tertiary)] rounded-full mt-2.5 overflow-hidden">
        <motion.div
          id="effortFill"
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: gaugePercent + '%' }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            background: effort < 1 ? 'var(--success)' : Math.abs(effort - 1) < 0.01 ? 'var(--warning)' : 'var(--danger)'
          }}
        />
      </div>

      {effort > 1 && (
        <div className="mt-2 text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded flex items-center gap-1">
          <span>⚠️</span>
          <span>{t('stats.effortWarning')}</span>
        </div>
      )}
    </motion.div>
  );
}
