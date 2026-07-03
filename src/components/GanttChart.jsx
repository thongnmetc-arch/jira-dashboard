import { motion } from 'framer-motion';
import { useMemo, useState, useRef, useEffect } from 'react';
import { useI18n } from '../i18n';
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
  const { t } = useI18n();
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const { display, totalDays, padStart, padEnd, compColors } = useMemo(() => {
    let valid = tasks.filter(t => t.startDate);
    valid.forEach(t => { t._end = t.dueDateTime || t.dueDate || t.resolved || t.created; });

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
    const pStart = addDays(sDay, -2);
    const pEnd = addDays(eDay, 7);
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
          {t('tabs.gantt')}
        </h3>
        <p className="py-5 text-center text-[var(--text-tertiary)] text-sm">
          {t('dashboard.noData')}
        </p>
      </div>
    );
  }

  const taskColWidth = 250;
  // containerWidth is a dynamic state variable (set in useEffect via resize listener)
  const cw = containerWidth || 900;
  const available = Math.max(cw - taskColWidth - 32, 400);
  const dayWidth = Math.max(28, Math.min(70, Math.floor(available / Math.max(totalDays, 1))));
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
        {t('tabs.gantt')}
      </h3>
      <div ref={containerRef} className="overflow-x-auto overflow-y-auto max-h-[500px] relative">
        <table className="border-collapse w-full text-[0.78rem]">
          <thead>
            <tr>
              <th
                className="sticky top-0 z-20 bg-[var(--bg-secondary)] px-2 py-1.5 border-b border-[var(--border-primary)] text-left text-[0.65rem] font-semibold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap"
                style={{ width: '250px', left: 0 }}
              >
                {t('table.summary')}
              </th>
              {dateHeaders.map((dh, i) => (
                <th
                  key={i}
                  className={`sticky top-0 z-20 px-1 py-1.5 border-b border-[var(--border-primary)] text-center font-semibold whitespace-nowrap text-[0.6rem] ${
                    dh.isWeekend
                      ? 'text-[var(--text-tertiary)] bg-[var(--bg-secondary)]'
                      : 'text-[var(--text-secondary)] bg-[var(--bg-secondary)]'
                  }`}
                  style={{ width: dayWidth + 'px', maxWidth: dayWidth + 'px' }}
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

              return (
                <tr key={t.key + idx} className="hover:bg-[var(--bg-secondary)] transition-colors">
                  <td
                    className="sticky left-0 z-10 bg-[var(--bg-primary)] pl-1 pr-2 py-1 border-b border-[var(--border-primary)]"
                    style={{ width: '250px' }}
                    title={t.key + ': ' + t.summary}
                  >
                    <div className="text-[0.7rem] leading-snug">
                      <span className="font-semibold text-[var(--accent)] mr-1">{t.key}</span>
                      <span className="text-[var(--text-primary)]">{t.summary}</span>
                    </div>
                    <div className="text-[0.6rem] text-[var(--text-tertiary)] mt-0.5">
                      {toDateStr(t.startDate)} → {toDateStr(t._end)}
                    </div>
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
