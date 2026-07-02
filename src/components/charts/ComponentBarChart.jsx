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
import { getComponentColor } from '../../utils/exportUtils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ComponentBarChart({ tasks }) {
  const { t } = useI18n();
  const chartData = useMemo(() => {
    const groups = {};
    tasks.forEach(task => {
      const comps = task.comps;
      if (comps.length === 0) return;
      const share = task.timeSpentHr / comps.length;
      comps.forEach(c => {
        if (!groups[c]) groups[c] = 0;
        groups[c] += share;
      });
    });

    const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(e => e[0].length > 30 ? e[0].slice(0, 27) + '…' : e[0]);
    const data = sorted.map(e => Math.round(e[1] * 10) / 10);
    const bgColors = sorted.map(e => getComponentColor(e[0]));

    return {
      labels,
      datasets: [{ label: t('common.hours'), data, backgroundColor: bgColors, borderRadius: 4 }],
    };
  }, [tasks, t]);

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ctx.raw.toFixed(1) + ' ' + t('common.hours'),
        },
      },
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
        {t('filter.component')}
      </h3>
      <div className="relative h-[300px]">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
