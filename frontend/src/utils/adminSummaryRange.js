/** YYYY-MM-DD in local calendar */
export function formatLocalDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfLocalDayFromYmd(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** Exclusive upper bound for API range: tasks with createdAt < this are included through end of toYmd */
export function exclusiveEndAfterInclusiveLocalDay(toYmd) {
  const start = startOfLocalDayFromYmd(toYmd);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1, 0, 0, 0, 0);
}
