export function exportCSV(tasks) {
  if (!tasks || tasks.length === 0) return;
  const headers = ['Issue Key', 'Summary', 'Component', 'Sprint', 'Assignee', 'Time Spent (h)', 'Estimate (h)', 'Status', 'Labels', 'Created', 'Resolved'];
  const rows = tasks.map(t => [
    t.key, t.summary, (t.comps || []).join('; '), t.primarySprint, t.assignee,
    t.timeSpentHr.toFixed(1), t.estimateHr.toFixed(1), t.status,
    (t.labels || []).join('; '),
    t.created ? t.created.toISOString().slice(0, 10) : '',
    t.resolved ? t.resolved.toISOString().slice(0, 10) : ''
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'jira-export.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportChartPNG() {
  const canvas = document.getElementById('chartSprint');
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = 'jira-chart-sprint.png';
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Component colors — same as original app */
export const COMP_COLORS = {
  'vos': '#6366f1',
  'violation': '#ef4444',
  'opeartor': '#f59e0b',
  'vân hành backend cao tốc': '#06b6d4',
  'build và đẩy app mobile lên chợ môi trường prod': '#8b5cf6',
  'billing': '#10b981',
};

export function getComponentColor(comp) {
  return COMP_COLORS[(comp || '').trim().toLowerCase()] || '#6b7280';
}

export const CHART_PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#a855f7', '#84cc16', '#e11d48'];
