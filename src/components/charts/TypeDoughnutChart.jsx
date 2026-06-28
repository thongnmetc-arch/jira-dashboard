import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useMemo } from 'react';
import { CHART_PALETTE } from '../../utils/exportUtils';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function TypeDoughnutChart({ tasks }) {
  const chartData = useMemo(() => {
    const groups = {};
    tasks.forEach(t => {
      const type = t.issueType || 'Không xác định';
      groups[type] = (groups[type] || 0) + t.timeSpentHr;
    });

    const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(e => e[0]);
    const data = sorted.map(e => Math.round(e[1] * 10) / 10);
    const colors = labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]);

    return {
      labels: labels.map((l, i) => l + ' (' + data[i].toFixed(1) + 'h)'),
      datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: 'var(--bg-primary)' }],
    };
  }, [tasks]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '55%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 10, padding: 8, font: { size: 10 } },
      },
      tooltip: {
        callbacks: {
          label: function (ctx) {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total > 0 ? (ctx.parsed / total * 100).toFixed(1) : 0;
            return ctx.parsed.toFixed(1) + ' giờ (' + pct + '%)';
          },
        },
      },
    },
  };

  return (
    <div className="card chart-card">
      <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
        Phân bổ thời gian theo loại CV
      </h3>
      <div className="relative h-[300px]">
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  );
}
