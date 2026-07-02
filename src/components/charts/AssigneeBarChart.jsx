import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useMemo } from 'react';
import { useI18n } from '../../i18n';
import { CHART_PALETTE } from '../../utils/exportUtils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function AssigneeBarChart({ tasks }) {
  const { t } = useI18n();
  const chartData = useMemo(() => {
    const groups = {};
    tasks.forEach(task => {
      const a = task.assignee || t('common.tasks');
      groups[a] = (groups[a] || 0) + task.timeSpentHr;
    });

    const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(e => e[0]);
    const data = sorted.map(e => Math.round(e[1] * 10) / 10);
    const colors = labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]);

    return {
      labels,
      datasets: [{ label: t('common.hours'), data, backgroundColor: colors, borderRadius: 4 }],
    };
  }, [tasks, t]);

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => ctx.raw.toFixed(1) + 'h' } },
    },
    scales: {
      x: {
        beginAtZero: true,
        title: { display: true, text: t('common.hours'), font: { size: 11 } },
        ticks: { font: { size: 10 }, callback: (v) => v + 'h' },
      },
      y: { grid: { display: false }, ticks: { font: { size: 10 } } },
    },
  };

  return (
    <div className="card chart-card">
      <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
        {t('filter.assignee')}
      </h3>
      <div className="relative h-[350px]">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
