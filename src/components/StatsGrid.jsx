import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Clock, CheckCircle2, Target, BarChart3 } from 'lucide-react';
import EffortCard from './EffortCard';

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
  const stats = useMemo(() => {
    const totalHr = tasks.reduce((s, t) => s + t.timeSpentHr, 0);
    const totalEst = tasks.reduce((s, t) => s + t.estimateHr, 0);
    const avgHr = tasks.length > 0 ? totalHr / tasks.length : 0;
    return [
      { label: 'Tổng số công việc', value: tasks.length, decimals: 0, sub: 'tất cả các sprint' },
      { label: 'Tổng giờ đã log', value: totalHr, decimals: 1, sub: 'giờ (Time Spent)' },
      { label: 'Tổng giờ ước tính', value: totalEst, decimals: 1, sub: 'giờ (Original Estimate)' },
      { label: 'Thời gian TB mỗi task', value: avgHr, decimals: 1, sub: 'giờ / công việc' },
    ];
  }, [tasks]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {stats.map((stat, i) => (
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
      ))}
      <EffortCard tasks={tasks} />
    </div>
  );
}
