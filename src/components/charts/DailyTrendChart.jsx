import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useMemo } from 'react';
import { useI18n } from '../../i18n';
import { toDateStr } from '../../utils/dateUtils';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

export default function DailyTrendChart({ tasks }) {
  const { t } = useI18n();
  const chartData = useMemo(() => {
    const daily = {};
    tasks.forEach(task => {
      const d = task.resolved || task.created;
      if (!d) return;
      const key = toDateStr(d);
      daily[key] = (daily[key] || 0) + task.timeSpentHr;
    });

    const sorted = Object.entries(daily).sort((a, b) => {
      const pa = a[0].split('/');
      const pb = b[0].split('/');
      return (pa[2] + pa[1] + pa[0]).localeCompare(pb[2] + pb[1] + pb[0]);
    });

    const labels = sorted.map(e => e[0]);
    const data = sorted.map(e => Math.round(e[1] * 10) / 10);

    let cum = 0;
    const cumData = data.map(v => { cum += v; return Math.round(cum * 10) / 10; });

    return {
      labels,
      datasets: [
        {
          label: t('table.hoursLogged'),
          data,
          backgroundColor: 'rgba(91,106,240,.55)',
          borderColor: '#5b6af0',
          borderWidth: 1,
          borderRadius: 3,
          order: 1,
        },
        {
          label: t('stats.overview'),
          data: cumData,
          type: 'line',
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,.1)',
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: '#f59e0b',
          fill: true,
          tension: 0.3,
          order: 0,
        },
      ],
    };
  }, [tasks, t]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 10, padding: 8, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx) => ctx.dataset.label + ': ' + ctx.raw.toFixed(1) + 'h',
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45 } },
      y: {
        beginAtZero: true,
        title: { display: true, text: t('common.hours'), font: { size: 11 } },
        ticks: { font: { size: 10 }, callback: (v) => v + 'h' },
      },
    },
  };

  return (
    <div className="card chart-card">
      <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
        {t('tabs.overview')}
      </h3>
      <div className="relative h-[300px]">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
