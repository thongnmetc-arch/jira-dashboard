import { countWorkingDays } from './dateUtils';

/**
 * Effort = (workingDays × 7h + OT - leave) / totalEstimateHours
 * Chỉ loại trừ các task có trạng thái Cancelled.
 * effort < 1 → số giờ chuẩn ít hơn ước tính (tốt)
 * effort = 1 → vừa đúng ước tính
 * effort > 1 → số giờ chuẩn nhiều hơn ước tính (cảnh báo)
 */
export function calculateEffort(tasks, otLeaveData) {
  const validTasks = tasks.filter(t => {
    const s = t.status?.toLowerCase();
    return s !== 'cancelled';
  });
  if (validTasks.length === 0) return { effort: 0, totalEstHr: 0, workingDays: 0, otHr: 0, leaveHr: 0, detail: '' };

  const dates = validTasks.map(t => t.resolved || t.created).filter(Boolean);
  if (dates.length === 0) return { effort: 0, totalEstHr: 0, workingDays: 0, otHr: 0, leaveHr: 0, detail: 'Không có ngày' };

  const monthCounts = {};
  dates.forEach(d => { const k = d.getFullYear() + '-' + (d.getMonth() + 1); monthCounts[k] = (monthCounts[k] || 0) + 1; });
  const primaryMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0][0];
  const [year, month] = primaryMonth.split('-').map(Number);

  const totalEstHr = validTasks.reduce((s, t) => s + (t.originalEstimateHr || t.estimateHr || 0), 0);
  const workingDays = countWorkingDays(year, month);

  const otHr = otLeaveData?.otTotal || 0;
  const leaveHr = otLeaveData?.leaveTotal || 0;

  const availableHr = workingDays * 7 + otHr - leaveHr;
  const effort = totalEstHr > 0 ? availableHr / totalEstHr : 0;

  const detail = workingDays + ' ngày × 7h' + (otHr > 0 ? ' + ' + otHr.toFixed(1) + 'h OT' : '') + (leaveHr > 0 ? ' - ' + leaveHr.toFixed(1) + 'h nghỉ' : '') + ' = ' + availableHr.toFixed(1) + 'h chuẩn' + ' / ' + totalEstHr.toFixed(1) + 'h ước tính';

  return { effort, totalEstHr, workingDays, otHr, leaveHr, detail };
}

/**
 * Average effort across all months that have resolved/closed tasks.
 * Groups tasks by month, calculates effort per month (distributing OT/leave
 * proportionally by task count), then returns the mean.
 */
export function calculateAverageEffort(tasks, otLeaveData) {
  const validTasks = tasks.filter(t => {
    const s = t.status?.toLowerCase();
    return s !== 'cancelled';
  });
  if (validTasks.length === 0) return { avgEffort: 0, monthsWithData: 0, totalMonths: 0 };

  // Group tasks by month (YYYY-M key)
  const monthGroups = {};
  validTasks.forEach(t => {
    const d = t.resolved || t.created;
    if (!d) return;
    const k = d.getFullYear() + '-' + (d.getMonth() + 1);
    if (!monthGroups[k]) {
      monthGroups[k] = { tasks: [], year: d.getFullYear(), month: d.getMonth() + 1 };
    }
    monthGroups[k].tasks.push(t);
  });

  const monthKeys = Object.keys(monthGroups);
  if (monthKeys.length === 0) return { avgEffort: 0, monthsWithData: 0, totalMonths: 0 };

  const totalTasks = validTasks.length;
  const otTotal = otLeaveData?.otTotal || 0;
  const leaveTotal = otLeaveData?.leaveTotal || 0;

  let effortSum = 0;
  let monthsWithData = 0;

  monthKeys.forEach(k => {
    const { tasks: monthTasks, year, month } = monthGroups[k];
    const monthTotalEstHr = monthTasks.reduce((s, t) => s + (t.originalEstimateHr || t.estimateHr || 0), 0);
    if (monthTotalEstHr <= 0) return;

    const workingDays = countWorkingDays(year, month);
    const taskShare = monthTasks.length / totalTasks;
    const otShare = otTotal * taskShare;
    const leaveShare = leaveTotal * taskShare;

    const availableHr = workingDays * 7 + otShare - leaveShare;
    const effort = availableHr / monthTotalEstHr;
    effortSum += effort;
    monthsWithData++;
  });

  const avgEffort = monthsWithData > 0 ? effortSum / monthsWithData : 0;
  return { avgEffort, monthsWithData, totalMonths: monthKeys.length };
}
