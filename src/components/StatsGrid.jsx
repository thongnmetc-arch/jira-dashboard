import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Clock, CheckCircle2, Target, BarChart3 } from 'lucide-react';
import EffortCard from './EffortCard';
import { useI18n } from '../i18n';

function AnimatedNumber({ value, decimals = 1 }) {
  const display = typeof value === 'number' ? value.toFixed(decimals) : value;
  return (
    <motion.div
      key={display}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-4xl font-bold tracking-tight font-mono tabular-nums text-[var(--text-primary)] mt-1"
    >
      {display}
    </motion.div>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: 'easeOut' },
  }),
};

const icons = [
  <CheckCircle2 key="tasks" className="w-5 h-5 text-[var(--accent)]" />,
  <Clock key="spent" className="w-5 h-5 text-[var(--success)]" />,
  <Target key="est" className="w-5 h-5 text-[var(--warning)]" />,
  <BarChart3 key="avg" className="w-5 h-5 text-[var(--accent)]" />,
];

export default function StatsGrid({ tasks }) {
  const { t } = useI18n();
  const { overallStats } = useMemo(() => {
    // ---- Row 1: all tasks, all statuses ----
    const totalCount = tasks.length;
    const resolvedTasks = tasks.filter(t => { const s = t.status?.toLowerCase(); return s === 'resolved' || s === 'closed'; });
    const totalSpent = resolvedTasks.reduce((s, t) => s + (t.timeSpentHr || 0), 0);
    const totalEst = resolvedTasks.reduce((s, t) => s + (t.originalEstimateHr || t.estimateHr || 0), 0);
    const overallAvg = resolvedTasks.length > 0 ? totalSpent / resolvedTasks.length : 0;

    return {
      overallStats: [
        { label: t('stats.totalTasks'), value: totalCount, decimals: 0, sub: t('stats.allStatuses') },
        { label: t('stats.totalHours'), value: totalSpent, decimals: 1, sub: `${t('common.hours')} (Time Spent)` },
        { label: t('stats.totalEstimate'), value: totalEst, decimals: 1, sub: `${t('common.hours')} (Estimate)` },
        { label: t('stats.avgPerTask'), value: overallAvg, decimals: 1, sub: `${t('common.hours')} / ${t('common.tasks')}` },
      ],
    };
  }, [tasks]);

  function renderStatCards(stats) {
    return stats.map((stat, i) => (
      <motion.div
        key={stat.label}
        custom={i}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="card rounded-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-800/50 border border-[var(--border-primary)]"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
            {stat.label}
          </div>
          <div className="p-1.5 rounded-md bg-[var(--bg-secondary)]">
            {icons[i]}
          </div>
        </div>
        <AnimatedNumber value={stat.value} decimals={stat.decimals} />
        <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{stat.sub}</div>
      </motion.div>
    ));
  }

  return (
    <>
      {/* Row 1 — Tổng quan (all tasks, all statuses) */}
      <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
        📊 {t('stats.overview')}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {renderStatCards(overallStats)}
        <EffortCard tasks={tasks} variant="avg" />
      </div>

      {/* Row 2 — Tháng hiện tại (only Resolved / Closed) */}
      <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 mt-4">
        📅 {t('stats.currentMonth')}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {renderStatCards(overallStats)}
        <EffortCard tasks={tasks} variant="month" />
      </div>
    </>
  );
}
