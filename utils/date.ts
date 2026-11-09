/**
 * Local-calendar date helpers.
 *
 * `toISOString()` is UTC-based, which shifts the day for users ahead of UTC
 * (e.g. IST before 05:30). Streaks and daily puzzles must follow the
 * player's local calendar, so every date key goes through these helpers.
 */

const pad = (n: number) => String(n).padStart(2, '0');

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** YYYY-MM-DD for the given date in the device's local timezone. */
export function dateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse a YYYY-MM-DD key as local midnight. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Format YYYY-MM-DD as "September 22, 2025". */
export function formatLongDate(key: string = dateKey()): string {
  const d = parseDateKey(key);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

/** Whole calendar days from `a` to `b` (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = parseDateKey(b).getTime() - parseDateKey(a).getTime();
  return Math.round(ms / 86400000);
}

/** Date keys for Monday..Sunday of the week containing `key`. */
export function weekKeys(key: string = dateKey()): string[] {
  const d = parseDateKey(key);
  const mondayOffset = (d.getDay() + 6) % 7;
  const monday = addDays(key, -mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Format milliseconds as m:ss. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${pad(total % 60)}`;
}

/** Format seconds as MM:SS (e.g. "00:28"). */
export function formatMMSS(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** Milliseconds remaining until next local midnight. */
export function msUntilNextDay(now: Date = new Date()): number {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, tomorrow.getTime() - now.getTime());
}

/** Format milliseconds as "8h 12m 25s". */
export function formatHMS(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}h ${m}m ${pad(s)}s`;
}
