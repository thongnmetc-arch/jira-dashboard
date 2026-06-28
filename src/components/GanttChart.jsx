import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { daysBetween, addDays, normalizeDay, fmtShortDate, toDateStr } from '../utils/dateUtils';
import { getComponentColor } from '../utils/exportUtils';

function GanttBar({ t, leftPct, widthPct, dur, color, comp, showLabels }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative h-6">
      <div
        className="absolute h-4 top-[4px] rounded-sm cursor-pointer transition-opacity hover:opacity-85 flex items-center px-1 overflow-hidden whitespace-nowrap text-ellipsis text-[0.6rem] text-white font-medium shadow-sm"
        style={{ left: leftPct + '%', width: Math.max(widthPct, 0.5) + '%', background: color, minWidth: '3px' }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-[var(--text-primary)] text-[var(--bg-primary)] px-2.5 py-1.5 rounded-md text-[0.7rem] whitespace-nowrap z-10 pointer-events-none mb-1.5 shadow-md max-w-[280px]">
            <strong>{t.key}</strong>: {t.summary}<br />
            📅 {toDateStr(t.startDate)} → {toDateStr(t._end)}<br />
            ⏱ {t.timeSpentHr.toFixed(1)}h
            {comp ? <><br />📦 {comp}</> : ''}
          </div>
        )}
        {showLabels && dur >= 0.8 && t.key}
      </div>
    </div>
  );
}

export default function GanttChart({ tasks }) {
  const { display, totalDays, padStart, padEnd, compColors } = useMemo(() => {
    let valid = tasks.filter(t => t.startDate && (t.resolved || t.created));
    valid.forEach(t => { t._end = t.resolved || t.created; });

    if (valid.length === 0) {
      return { display: [], totalDays: 0, padStart: null, padEnd: null, compColors: {} };
    }

    valid.sort((a, b) => a.startDate - b.startDate);
    const disp = valid.length <= 30 ? valid : valid.slice(-30);

    let minDate = disp[0].startDate;
    let maxDate = disp[0]._end;
    disp.forEach(t => {
      if (t.startDate < minDate) minDate = t.startDate;
      if (t._end > maxDate) maxDate = t._end;
    });

    const sDay = normalizeDay(minDate);
    const eDay = normalizeDay(maxDate);
    const pStart = addDays(sDay, -1);
    const pEnd = addDays(eDay, 1);
    const tDays = Math.max(Math.round(daysBetween(pStart, pEnd)), 1);

    const colors = {};
    disp.forEach(t => {
      const comp = t.comps.length > 0 ? t.comps[0] : '';
      if (comp && !colors[comp]) colors[comp] = getComponentColor(comp);
    });

    return { display: disp, totalDays: tDays, padStart: pStart, padEnd: pEnd, compColors: colors };
  }, [tasks]);

  if (display.length === 0) {
    return (
      <div className="card chart-card mb-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 pb-2 border-b border-[var(--border-primary)]">
          Biểu đồ Gantt
        </h3>
        <p className="py-5 text-center text-[var(--text-tertiary)] text-sm">
          Không có dữ liệu ngày để hiển thị Gantt.
        </p>
      </div>
    );
  }

  const dayWidth = Math.max(28, Math.min(70, 1000 / totalDays));
  const showLabels = totalDays <= 40;

  const dateHeaders = [];
  for (let d = new Date(padStart); d <= padEnd; d = addDays(d, 1)) {
    const label = fmtShortDate(d);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    dateHeaders.push({ label, isWeekend });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card chart-card mb-6"
    >
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 pb-2 border-b border-[var(--border-primary)]">
        Biểu đồ Gantt
      </h3>
      <div className="overflow-x-auto overflow-y-auto max-h-[500px] relative">
        <table className="border-collapse w-full min-w-[700px] text-[0.78rem]">
          <thead>
            <tr>
              <th
                className="sticky top-0 z-10 bg-[var(--bg-secondary)] px-2 py-1.5 border-b border-[var(--border-primary)] text-left text-[0.65rem] font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap"
                style={{ minWidth: '150px', left: 0 }}
              >
                Công việc
              </th>
              {dateHeaders.map((dh, i) => (
                <th
                  key={i}
                  className={`sticky top-0 z-10 px-1 py-1.5 border-b border-[var(--border-primary)] text-center font-semibold whitespace-nowrap text-[0.6rem] ${
                    dh.isWeekend
                      ? 'text-[var(--text-tertiary)] bg-[var(--bg-secondary)]/50'
                      : 'text-[var(--text-secondary)] bg-[var(--bg-secondary)]'
                  }`}
                  style={{ width: dayWidth + 'px' }}
                >
                  {dh.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {display.map((t, idx) => {
              const startOff = daysBetween(padStart, t.startDate);
              const endOff = daysBetween(padStart, t._end);
              const dur = Math.max(endOff - startOff, 0.05);
              const leftPct = (startOff / totalDays) * 100;
              const widthPct = (dur / totalDays) * 100;

              const comp = t.comps.length > 0 ? t.comps[0] : '';
              const color = getComponentColor(comp);
              const shortName = t.summary.length > 48 ? t.summary.slice(0, 45) + '…' : t.summary;

              return (
                <tr key={t.key + idx} className="hover:bg-[var(--bg-secondary)] transition-colors">
                  <td
                    className="sticky left-0 z-[1] bg-[var(--bg-primary)] px-2 py-1 border-b border-[var(--border-primary)] whitespace-nowrap overflow-hidden text-ellipsis text-[0.78rem] text-[var(--text-primary)]"
                    style={{ maxWidth: '180px' }}
                    title={t.key + ': ' + t.summary}
                  >
                    <span className="font-semibold text-[var(--accent)] text-[0.65rem] mr-1">{t.key}</span>
                    {shortName}
                  </td>
                  <td
                    colSpan={dateHeaders.length}
                    className="p-0 border-b border-[var(--border-primary)] relative"
                  >
                    <GanttBar
                      t={t}
                      leftPct={leftPct}
                      widthPct={widthPct}
                      dur={dur}
                      color={color}
                      comp={comp}
                      showLabels={showLabels}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {Object.keys(compColors).length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[var(--border-primary)]">
          {Object.entries(compColors).map(([name, color]) => (
            <span key={name} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }}></span>
              {name}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
