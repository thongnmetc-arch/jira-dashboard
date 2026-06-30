import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { motion } from 'framer-motion';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function getWeekDays(startDate, endDate) {
  const days = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) {
      days.push(new Date(cur));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function formatDateLabel(d) {
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
}

export default function BurndownChart({ tasks }) {
  const [selectedSprint, setSelectedSprint] = useState('');

  const { sprints, chartData } = useMemo(() => {
    // Group by sprint
    const sprintMap = {};
    tasks.forEach(t => {
      const s = t.primarySprint || '(Không có Sprint)';
      if (!sprintMap[s]) sprintMap[s] = [];
      sprintMap[s].push(t);
    });

    const sprintNames = Object.keys(sprintMap).sort((a, b) => {
      const na = parseInt((a.match(/(\d+)$/) || [, '0'])[1], 10);
      const nb = parseInt((b.match(/(\d+)$/) || [, '0'])[1], 10);
      return na - nb;
    });

    const current = selectedSprint || sprintNames[0] || '';

    // Compute burndown data for the selected sprint
    const sprintTasks = sprintMap[current] || [];
    if (sprintTasks.length === 0) {
      return { sprints: sprintNames, chartData: null };
    }

    // Find sprint date range from task created/resolved dates
    let minDate = null;
    let maxDate = null;
    sprintTasks.forEach(t => {
      const start = t.created || t.startDate;
      const end = t.resolved || t.created || t.startDate;
      if (start && (!minDate || start < minDate)) minDate = new Date(start);
      if (end && (!maxDate || end > maxDate)) maxDate = new Date(end);
    });

    if (!minDate || !maxDate) {
      return { sprints: sprintNames, chartData: null };
    }

    // Use only working days
    const days = getWeekDays(minDate, maxDate);
    if (days.length === 0) {
      return { sprints: sprintNames, chartData: null };
    }

    const totalEstimate = sprintTasks.reduce((s, t) => s + (t.originalEstimateHr || t.estimateHr || 0), 0);
    const dayCount = days.length;

    // Compute ideal burndown: linear from totalEstimate to 0
    const ideal = days.map((_, idx) => {
      return totalEstimate * (1 - idx / (dayCount - 1 || 1));
    });

    // Compute actual remaining: totalEstimate - cumulative timeSpentHr of resolved tasks
    // Sort tasks by resolved date
    const resolvedTasks = sprintTasks
      .filter(t => t.resolved)
      .sort((a, b) => new Date(a.resolved) - new Date(b.resolved));

    let cumulativeSpent = 0;
    let resolvedIdx = 0;

    const actual = days.map((day) => {
      // Count all resolved tasks up to this day
      while (resolvedIdx < resolvedTasks.length) {
        const rDate = new Date(resolvedTasks[resolvedIdx].resolved);
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const rDayStart = new Date(rDate);
        rDayStart.setHours(0, 0, 0, 0);
        if (rDayStart <= dayStart) {
          cumulativeSpent += resolvedTasks[resolvedIdx].timeSpentHr || 0;
          resolvedIdx++;
        } else {
          break;
        }
      }
      return Math.max(0, totalEstimate - cumulativeSpent);
    });

    return {
      sprints: sprintNames,
      chartData: {
        labels: days.map(formatDateLabel),
        datasets: [
          {
            label: 'Lý tưởng',
            data: ideal,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34,197,94,0.08)',
            borderWidth: 2,
            borderDash: [6, 3],
            pointRadius: 0,
            pointHitRadius: 5,
            fill: false,
            tension: 0.3,
          },
          {
            label: 'Thực tế',
            data: actual,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.12)',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            pointHitRadius: 6,
            fill: true,
            tension: 0.3,
          },
        ],
      },
    };
  }, [tasks, selectedSprint]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { boxWidth: 12, padding: 10, font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ctx.dataset.label + ': ' + ctx.raw.toFixed(1) + 'h',
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, maxRotation: 45 },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Giờ còn lại', font: { size: 11 } },
        ticks: { font: { size: 10 }, callback: (v) => v + 'h' },
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card chart-card"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          Biểu đồ Burndown
        </h3>
        <select
          value={selectedSprint}
          onChange={(e) => setSelectedSprint(e.target.value)}
          className="input-like text-xs py-1 px-2 min-w-[140px]"
        >
          <option value="">Chọn Sprint</option>
          {sprints.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {chartData ? (
        <div className="relative h-[300px]">
          <Line data={chartData} options={options} />
        </div>
      ) : (
        <div className="py-8 text-center text-[var(--text-tertiary)] text-sm">
          {tasks.length === 0
            ? 'Chưa có dữ liệu để hiển thị'
            : 'Không có đủ dữ liệu ngày để vẽ burndown cho Sprint này'}
        </div>
      )}
    </motion.div>
  );
}
