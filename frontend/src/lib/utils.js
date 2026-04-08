/** Shared utility functions used across components */

const IST = 'Asia/Kolkata';

export function formatDate(dateStr) {
  // dateStr is YYYY-MM-DD — treat as a calendar date in IST, not UTC midnight
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: IST,
  });
}

/**
 * Convert a UTC time string (HH:MM from API) to IST and return 12-hr format.
 * Times stored in DB come from API responses in UTC.
 */
export function formatTime(timeStr) {
  if (!timeStr || timeStr === '00:00') return 'All Day';
  // Build a Date using today's date + the UTC time, then convert to IST
  const [h, m] = timeStr.split(':');
  const now = new Date();
  const utcDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    parseInt(h, 10),
    parseInt(m, 10)
  ));
  return utcDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: IST,
  });
}

/** Returns today's date string in IST (YYYY-MM-DD) */
export function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: IST }); // en-CA gives YYYY-MM-DD
}
