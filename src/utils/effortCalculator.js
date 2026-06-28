import { countWorkingDays } from './dateUtils';

/**
 * Effort = (workingDays × 7h + OT - leave) / totalLogHours
 * effort < 1 → tốt (đã log nhiều hơn giờ chuẩn)
 * effort = 1 → vừa đủ
 * effort > 1 → chưa log đủ (cảnh báo)
 */
export function calculateEffort(tasks, otLeaveData) {
  if (tasks.length === 0) return { effort: 0, totalHr: 0, workingDays: 0, otHr: 0, leaveHr: 0, detail: '' };

  const dates = tasks.map(t => t.resolved || t.created).filter(Boolean);
  if (dates.length === 0) return { effort: 0, totalHr: 0, workingDays: 0, otHr: 0, leaveHr: 0, detail: 'Không có ngày' };

  const monthCounts = {};
  dates.forEach(d => { const k = d.getFullYear() + '-' + (d.getMonth() + 1); monthCounts[k] = (monthCounts[k] || 0) + 1; });
  const primaryMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0][0];
  const [year, month] = primaryMonth.split('-').map(Number);

  const totalHr = tasks.reduce((s, t) => s + t.timeSpentHr, 0);
  const workingDays = countWorkingDays(year, month);

  const otHr = otLeaveData?.otTotal || 0;
  const leaveHr = otLeaveData?.leaveTotal || 0;

  const availableHr = workingDays * 7 + otHr - leaveHr;
  const effort = totalHr > 0 ? availableHr / totalHr : 0;

  const detail = workingDays + ' ngày × 7h' + (otHr > 0 ? ' + ' + otHr.toFixed(1) + 'h OT' : '') + (leaveHr > 0 ? ' - ' + leaveHr.toFixed(1) + 'h nghỉ' : '') + ' = ' + availableHr.toFixed(1) + 'h chuẩn' + ' / ' + totalHr.toFixed(1) + 'h đã log';

  return { effort, totalHr, workingDays, otHr, leaveHr, detail };
}
