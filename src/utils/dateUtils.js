const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

export function parseJiraDate(str) {
  if (!str || typeof str !== 'string') return null;
  str = str.trim();
  if (!str) return null;
  // "02/Jun/26 1:43 PM" — 2-digit year, month abbreviation
  const m = str.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const mon = m[2].toLowerCase().slice(0, 3);
  const month = MONTH_MAP[mon];
  if (month === undefined) return null;
  let year = 2000 + parseInt(m[3], 10);
  let hour = parseInt(m[4], 10);
  const min = parseInt(m[5], 10);
  if (m[7].toUpperCase() === 'PM' && hour < 12) hour += 12;
  if (m[7].toUpperCase() === 'AM' && hour === 12) hour = 0;
  return new Date(year, month, day, hour, min);
}

export function fmtShortDate(d) {
  if (!d) return '';
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
}

export function toDateStr(d) {
  if (!d) return '';
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getFullYear()).slice(-2);
}

export function daysBetween(a, b) {
  return (b.getTime() - a.getTime()) / 86400000;
}

export function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function normalizeDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function countWorkingDays(year, month) {
  let count = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}
