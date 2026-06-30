import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Bar } from 'react-chartjs-2';
import { useApp } from '../context/AppContext';
import { countWorkingDays } from '../utils/dateUtils';

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

function formatMonthKey(year, month) {
  return year + '-' + String(month).padStart(2, '0');
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return MONTH_NAMES[m - 1] + ' ' + y;
}

export default function MonthComparison({ tasks }) {
  const { state } = useApp();

  const monthData = useMemo(() => {
    const monthMap = {};

    tasks.forEach(t => {
      if (!t.status || (t.status.toLowerCase() !== 'resolved' && t.status.toLowerCase() !== 'closed')) return;
      const d = t.resolved || t.created;
      if (!d) return;
      const key = formatMonthKey(d.getFullYear(), d.getMonth() + 1);
      if (!monthMap[key]) {
        monthMap[key] = { taskCount: 0, totalEstHr: 0, count: 0 };
      }
      monthMap[key].taskCount += 1;
      monthMap[key].totalEstHr += t.originalEstimateHr || t.estimateHr || 0;
      monthMap[key].count += 1;
    });

    const entries = Object.entries(monthMap).sort((a, b) => a[0].localeCompare(b[0]));

    const data = entries.map(([key, val]) => {
      const [y, m] = key.split('-').map(Number);
      const wd = countWorkingDays(y, m);
      const otHr = state.otLeaveData?.otTotal || 0;
      const leaveHr = state.otLeaveData?.leaveTotal || 0;
      const availableHr = wd * 7 + otHr - leaveHr;
      const effort = val.totalEstHr > 0 ? (availableHr / val.totalEstHr) : 0;

      return {
        key,
        label: monthLabel(key),
        year: y,
        month: m,
        workingDays: wd,
        totalEstHr: val.totalEstHr,
        effort,
        taskCount: val.taskCount,
        ot: otHr,
        leave: leaveHr,
      };
    });

    return data;
  }, [tasks, state.otLeaveData]);

  // Find min/max for color coding
  const maxHours = monthData.length > 0 ? Math.max(...monthData.map(d => d.totalEstHr)) : 0;
  const minHours = monthData.length > 0 ? Math.min(...monthData.map(d => d.totalEstHr)) : 0;
  const maxEffort = monthData.length > 0 ? Math.max(...monthData.map(d => d.effort)) : 0;
  const minEffort = monthData.length > 0 ? Math.min(...monthData.map(d => d.effort)) : 0;

  const chartData = {
    labels: monthData.map(d => d.label),
    datasets: [
      {
        label: 'Tổng giờ',
        data: monthData.map(d => Math.round(d.totalEstHr * 10) / 10),
        backgroundColor: monthData.map(d => {
          if (d.totalEstHr >= maxHours) return 'rgba(34,197,94,0.75)';
          if (d.totalEstHr <= minHours) return 'rgba(239,68,68,0.75)';
          return 'rgba(99,102,241,0.65)';
        }),
        borderColor: monthData.map(d => {
          if (d.totalEstHr >= maxHours) return '#22c55e';
          if (d.totalEstHr <= minHours) return '#ef4444';
          return '#6366f1';
        }),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ctx.raw.toFixed(1) + 'h',
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Giờ', font: { size: 11 } },
        ticks: { font: { size: 10 }, callback: (v) => v + 'h' },
      },
    },
  };

  if (monthData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card mb-6"
      >
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 pb-2 border-b border-[var(--border-primary)]">
          So sánh các tháng
        </h3>
        <p className="py-5 text-center text-[var(--text-tertiary)] text-sm">
          Chưa có dữ liệu để so sánh theo tháng.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      id="month-comparison-section"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card mb-6"
    >
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 pb-2 border-b border-[var(--border-primary)]">
        So sánh các tháng
      </h3>

      {/* Bar chart */}
      <div className="relative h-[250px] mb-6">
        <Bar data={chartData} options={chartOptions} />
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.78rem]">
          <thead>
            <tr className="bg-[var(--bg-secondary)]">
              <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider font-semibold text-[var(--text-secondary)] border-b border-[var(--border-primary)]">
                Tháng
              </th>
              <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider font-semibold text-[var(--text-secondary)] border-b border-[var(--border-primary)]">
                Ngày công
              </th>
              <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider font-semibold text-[var(--text-secondary)] border-b border-[var(--border-primary)]">
                Tổng giờ
              </th>
              <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider font-semibold text-[var(--text-secondary)] border-b border-[var(--border-primary)]">
                Effort
              </th>
              <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider font-semibold text-[var(--text-secondary)] border-b border-[var(--border-primary)]">
                Số task
              </th>
              <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider font-semibold text-[var(--text-secondary)] border-b border-[var(--border-primary)]">
                OT
              </th>
              <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider font-semibold text-[var(--text-secondary)] border-b border-[var(--border-primary)]">
                Nghỉ
              </th>
            </tr>
          </thead>
          <tbody>
            {monthData.map((d, i) => (
              <tr
                key={d.key}
                className="border-b border-[var(--border-primary)] last:border-b-0 hover:bg-[var(--bg-secondary)]/50 transition-colors"
              >
                <td className="px-3 py-2.5 font-medium text-[var(--text-primary)]">
                  {d.label}
                </td>
                <td className="px-3 py-2.5 text-center text-[var(--text-secondary)] font-mono">
                  {d.workingDays}
                </td>
                <td
                  className={`px-3 py-2.5 text-center font-mono font-semibold ${
                    d.totalEstHr >= maxHours
                      ? 'text-[var(--success)]'
                      : d.totalEstHr <= minHours
                      ? 'text-[var(--danger)]'
                      : 'text-[var(--text-primary)]'
                  }`}
                >
                  {d.totalEstHr.toFixed(1)}h
                </td>
                <td
                  className={`px-3 py-2.5 text-center font-mono font-semibold ${
                    d.effort <= minEffort + 0.05
                      ? 'text-[var(--success)]'
                      : d.effort >= maxEffort - 0.05
                      ? 'text-[var(--danger)]'
                      : 'text-[var(--text-primary)]'
                  }`}
                >
                  {d.effort.toFixed(3)}
                </td>
                <td className="px-3 py-2.5 text-center text-[var(--text-secondary)] font-mono">
                  {d.taskCount}
                </td>
                <td className="px-3 py-2.5 text-center text-[var(--text-secondary)] font-mono">
                  {d.ot > 0 ? d.ot.toFixed(1) + 'h' : '—'}
                </td>
                <td className="px-3 py-2.5 text-center text-[var(--text-secondary)] font-mono">
                  {d.leave > 0 ? d.leave.toFixed(1) + 'h' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-[var(--text-tertiary)]">
        <span className="text-[var(--success)] font-semibold">● Xanh</span>: cao nhất{' '}
        <span className="text-[var(--danger)] font-semibold">● Đỏ</span>: thấp nhất
      </p>
    </motion.div>
  );
}
