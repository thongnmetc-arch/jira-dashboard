import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { countWorkingDays } from '../utils/dateUtils';

/**
 * CompareView — delta comparison table between two snapshots.
 *
 * Props:
 *   snapshotA  — full snapshot object (with decompressed tasks)
 *   snapshotB  — full snapshot object (with decompressed tasks)
 */
export default function CompareView({ snapshotA, snapshotB }) {
  const { tasks: tasksA = [], metadata: metaA = {} } = snapshotA || {};
  const { tasks: tasksB = [], metadata: metaB = {} } = snapshotB || {};

  const delta = useMemo(() => {
    const countA = tasksA.length;
    const countB = tasksB.length;
    const hoursA = tasksA.reduce((s, t) => s + (t.timeSpentHr || 0), 0);
    const hoursB = tasksB.reduce((s, t) => s + (t.timeSpentHr || 0), 0);
    const estA = tasksA.reduce((s, t) => s + (t.estimateHr || 0), 0);
    const estB = tasksB.reduce((s, t) => s + (t.estimateHr || 0), 0);
    const avgA = countA > 0 ? hoursA / countA : 0;
    const avgB = countB > 0 ? hoursB / countB : 0;

    // OT / Leave
    const otA = metaA.otLeaveData?.otTotal || 0;
    const otB = metaB.otLeaveData?.otTotal || 0;
    const leaveA = metaA.otLeaveData?.leaveTotal || 0;
    const leaveB = metaB.otLeaveData?.leaveTotal || 0;

    // Effort: (workingDays * 7 + OT - Leave) / totalHours
    // Use current month as reference for working days
    const now = new Date();
    const workingDays = countWorkingDays(now.getFullYear(), now.getMonth() + 1);
    const capacityHrs = workingDays * 7;
    const effortA =
      hoursA > 0 && capacityHrs > 0
        ? ((capacityHrs + otA - leaveA) / hoursA).toFixed(2)
        : '—';
    const effortB =
      hoursB > 0 && capacityHrs > 0
        ? ((capacityHrs + otB - leaveB) / hoursB).toFixed(2)
        : '—';

    // Intersection by task key
    const keysA = new Set(tasksA.map((t) => t.key));
    const keysB = new Set(tasksB.map((t) => t.key));
    const common = [...keysA].filter((k) => keysB.has(k));
    const onlyA = [...keysA].filter((k) => !keysB.has(k));
    const onlyB = [...keysB].filter((k) => !keysA.has(k));

    return {
      countA,
      countB,
      deltaCount: countB - countA,
      hoursA,
      hoursB,
      deltaHours: hoursB - hoursA,
      estA,
      estB,
      deltaEst: estB - estA,
      avgA,
      avgB,
      deltaAvg: avgB - avgA,
      otA,
      otB,
      deltaOt: otB - otA,
      leaveA,
      leaveB,
      deltaLeave: leaveB - leaveA,
      effortA,
      effortB,
      commonCount: common.length,
      onlyACount: onlyA.length,
      onlyBCount: onlyB.length,
    };
  }, [tasksA, tasksB, metaA, metaB]);

  const nameA = snapshotA?.name || 'A';
  const nameB = snapshotB?.name || 'B';

  /** Helper: render a delta value with green/red coloring */
  const DeltaCell = ({ value, suffix = '', decimals = 1, isTime = false }) => {
    if (value === 0) return <span className="text-[var(--text-tertiary)]">0{isTime ? 'h' : ''}</span>;
    const sign = value > 0 ? '+' : '';
    const cls = value > 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]';
    const arrow = value > 0 ? '\u2191' : '\u2193';
    const formatted = isTime ? `${sign}${Math.abs(value).toFixed(decimals)}h` : `${sign}${value}`;
    return (
      <span className={`font-medium ${cls}`}>
        {arrow} {formatted}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
        So sánh: {nameA} vs {nameB}
      </h4>

      {/* Summary table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--border-primary)]">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)]">
              <th className="text-left px-3 py-2 font-semibold text-[var(--text-secondary)]">Chỉ số</th>
              <th className="text-right px-3 py-2 font-semibold text-[var(--text-secondary)]">{nameA}</th>
              <th className="text-right px-3 py-2 font-semibold text-[var(--text-secondary)]">{nameB}</th>
              <th className="text-right px-3 py-2 font-semibold text-[var(--text-secondary)]">Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-primary)]">
            <Row label="Tổng task" a={delta.countA} b={delta.countB} delta={delta.deltaCount} />
            <Row label="Tổng giờ log" a={delta.hoursA} b={delta.hoursB} delta={delta.deltaHours} isTime suffix="h" />
            <Row label="Tổng ước tính" a={delta.estA} b={delta.estB} delta={delta.deltaEst} isTime suffix="h" />
            <Row label="TB giờ/task" a={delta.avgA} b={delta.avgB} delta={delta.deltaAvg} isTime suffix="h" />
            <Row label="Tăng ca (OT)" a={delta.otA} b={delta.otB} delta={delta.deltaOt} isTime suffix="h" />
            <Row label="Nghỉ phép" a={delta.leaveA} b={delta.leaveB} delta={delta.deltaLeave} isTime suffix="h" />
            <Row label="Effort" a={delta.effortA} b={delta.effortB} delta={null} noDelta />
            {/* Task overlap */}
            <tr className="border-b border-[var(--border-primary)]">
              <td className="px-3 py-2 text-[var(--text-secondary)]">Task chung</td>
              <td className="px-3 py-2 text-right text-[var(--text-primary)] font-medium">
                {delta.commonCount}
              </td>
              <td className="px-3 py-2 text-right text-[var(--text-primary)] font-medium">
                {delta.commonCount}
              </td>
              <td className="px-3 py-2 text-right text-[var(--text-tertiary)]">
                {delta.commonCount === delta.countA && delta.commonCount === delta.countB
                  ? 'Giống nhau'
                  : ''}
              </td>
            </tr>
            <tr className="border-b border-[var(--border-primary)]">
              <td className="px-3 py-2 text-[var(--text-secondary)]">Chỉ có ở {nameA}</td>
              <td className="px-3 py-2 text-right text-[var(--danger)] font-medium">
                {delta.onlyACount}
              </td>
              <td className="px-3 py-2 text-right text-[var(--text-tertiary)]">—</td>
              <td className="px-3 py-2 text-right text-[var(--danger)] text-[10px]">
                {delta.onlyACount > 0 ? '\u2193 Mất' : ''}
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-[var(--text-secondary)]">Chỉ có ở {nameB}</td>
              <td className="px-3 py-2 text-right text-[var(--text-tertiary)]">—</td>
              <td className="px-3 py-2 text-right text-[var(--success)] font-medium">
                {delta.onlyBCount}
              </td>
              <td className="px-3 py-2 text-right text-[var(--success)] text-[10px]">
                {delta.onlyBCount > 0 ? '\u2191 Mới' : ''}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

/** A single row helper */
function Row({ label, a, b, delta, isTime = false, suffix = '', noDelta = false }) {
  const fmt = (v) => {
    if (v == null || v === '—') return '—';
    if (typeof v === 'string') return v;
    if (isTime || suffix) return `${Number(v).toFixed(1)}${suffix}`;
    return Number.isInteger(v) ? String(v) : Number(v).toFixed(1);
  };

  const renderDelta = () => {
    if (noDelta || delta === null) return <span className="text-[var(--text-tertiary)]">—</span>;
    if (delta === 0) return <span className="text-[var(--text-tertiary)]">0</span>;
    const sign = delta > 0 ? '+' : '';
    const cls = delta > 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]';
    const arrow = delta > 0 ? '\u2191' : '\u2193';
    const val = isTime || suffix ? `${sign}${Math.abs(delta).toFixed(1)}${suffix}` : `${sign}${delta}`;
    return (
      <span className={`font-medium ${cls}`}>
        {arrow} {val}
      </span>
    );
  };

  return (
    <tr className="border-b border-[var(--border-primary)] last:border-b-0">
      <td className="px-3 py-2 text-[var(--text-secondary)]">{label}</td>
      <td className="px-3 py-2 text-right text-[var(--text-primary)] font-medium">{fmt(a)}</td>
      <td className="px-3 py-2 text-right text-[var(--text-primary)] font-medium">{fmt(b)}</td>
      <td className="px-3 py-2 text-right">{renderDelta()}</td>
    </tr>
  );
}
