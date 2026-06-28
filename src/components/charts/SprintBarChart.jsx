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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function SprintBarChart({ tasks }) {
  const chartData = useMemo(() => {
    const groups = {};
    tasks.forEach(t => {
      const s = t.primarySprint;
      if (!groups[s]) groups[s] = { spent: 0, est: 0 };
      groups[s].spent += t.timeSpentHr;
      groups[s].est += t.estimateHr;
    });

    const sorted = Object.entries(groups).sort((a, b) => {
      const na = parseInt((a[0].match(/(\d+)$/) || [, '0'])[1], 10);
      const nb = parseInt((b[0].match(/(\d+)$/) || [, '0'])[1], 10);
      return na - nb;
    });

    const labels = sorted.map(e => {
      const parts = e[0].split(' ');
      return parts.length > 2 ? parts.slice(-2).join(' ') : e[0];
    });
    const spentData = sorted.map(e => Math.round(e[1].spent * 10) / 10);
    const estData = sorted.map(e => Math.round(e[1].est * 10) / 10);

    return {
      labels,
      datasets: [
        {
          label: 'Giờ đã log',
          data: spentData,
          backgroundColor: 'rgba(91,106,240,.75)',
          borderColor: '#5b6af0',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Giờ ước tính',
          data: estData,
          backgroundColor: 'rgba(34,197,94,.65)',
          borderColor: '#22c55e',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [tasks]);

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
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Giờ', font: { size: 11 } },
        ticks: { font: { size: 10 }, callback: (v) => v + 'h' },
      },
    },
  };

  return (
    <div className="card chart-card">
      <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
        Tổng giờ theo Sprint
      </h3>
      <div className="relative h-[300px]">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
