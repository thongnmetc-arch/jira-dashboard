import { countWorkingDays } from './dateUtils';

/**
 * Effort = (workingDays × 7h + OT - leave) / totalEstimateHours
 * Chỉ tính các task có trạng thái Resolved hoặc Closed.
 * effort < 1 → số giờ chuẩn ít hơn ước tính (tốt)
 * effort = 1 → vừa đúng ước tính
 * effort > 1 → số giờ chuẩn nhiều hơn ước tính (cảnh báo)
 */
export function calculateEffort(tasks, otLeaveData) {
  const activeTasks = tasks.filter(t => {
    const s = t.status?.toLowerCase();
    return s === 'resolved' || s === 'closed';
  });
  if (activeTasks.length === 0) return { effort: 0, totalEstHr: 0, workingDays: 0, otHr: 0, leaveHr: 0, detail: '' };

  const dates = activeTasks.map(t => t.resolved || t.created).filter(Boolean);
  if (dates.length === 0) return { effort: 0, totalEstHr: 0, workingDays: 0, otHr: 0, leaveHr: 0, detail: 'Không có ngày' };

  const monthCounts = {};
  dates.forEach(d => { const k = d.getFullYear() + '-' + (d.getMonth() + 1); monthCounts[k] = (monthCounts[k] || 0) + 1; });
  const primaryMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0][0];
  const [year, month] = primaryMonth.split('-').map(Number);

  const totalEstHr = activeTasks.reduce((s, t) => s + (t.originalEstimateHr || t.estimateHr || 0), 0);
  const workingDays = countWorkingDays(year, month);

  const otHr = otLeaveData?.otTotal || 0;
  const leaveHr = otLeaveData?.leaveTotal || 0;

  const availableHr = workingDays * 7 + otHr - leaveHr;
  const effort = totalEstHr > 0 ? availableHr / totalEstHr : 0;

  const detail = workingDays + ' ngày × 7h' + (otHr > 0 ? ' + ' + otHr.toFixed(1) + 'h OT' : '') + (leaveHr > 0 ? ' - ' + leaveHr.toFixed(1) + 'h nghỉ' : '') + ' = ' + availableHr.toFixed(1) + 'h chuẩn' + ' / ' + totalEstHr.toFixed(1) + 'h ước tính';

  return { effort, totalEstHr, workingDays, otHr, leaveHr, detail };
}
