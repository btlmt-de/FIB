/**
 * Presentation helpers.
 *
 * `data.js` already owns the canonical formatters (they match what the service
 * returns), so this file re-exports those and adds only what the layout needs
 * on top. Nothing here reimplements a formatter that already exists there.
 *
 * Note the unit convention inherited from the service: `winRate` and `skipRate`
 * are percentages on a 0–100 scale, NOT fractions.
 */

export {
  formatNumber as num,
  formatTime as duration,
  formatDistance as distance,
  formatDate as date,
  formatClock as timeOfDay,
  formatByKind as byKind,
  mmss as clock,
  totalRarities,
  timeAgo,
  winRate,
  itemsPerGame,
  secondsPerItem,
  itemLabel,
} from './data.js';

/**
 * Grouped, never abbreviated: "12,438", not "12.4K".
 *
 * `num` shortens anything over ten thousand, which is right in a table cell and
 * wrong for the numbers this product is actually about. "12,438 items found"
 * reads as an achievement; "12.4K items found" reads as a metric. Use this
 * wherever the number IS the statement.
 */
export const full = (n) =>
  Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—';

/**
 * Absolute date and time: "20 Jul, 21:14".
 *
 * `date` is itself relative for anything inside a week ("Today", "2 days
 * ago"), so pairing it with `timeAgo` printed the same phrase twice in the
 * match feed. Rows need one relative phrase for scanning and one absolute
 * stamp for pinning it down, and this is the absolute one.
 */
export function stamp(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const day = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  return `${day}, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
}

/** 0–100 in, "38%" out. */
export const pct = (n, places = 0) =>
  Number.isFinite(n) ? `${n.toFixed(places)}%` : '—';

export const dec = (n, places = 1) =>
  Number.isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: places, maximumFractionDigits: places }) : '—';

/** Long spans on the profile: 157h 41m reads better than 9461m. */
export function hours(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  const s = Math.round(seconds);
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`;
}

export const signed = (n) =>
  !Number.isFinite(n) || n === 0
    ? '±0'
    : n > 0
      ? `+${n.toLocaleString('en-US')}`
      : `−${Math.abs(n).toLocaleString('en-US')}`;

export const deltaDir = (n) => (!Number.isFinite(n) || n === 0 ? 'flat' : n > 0 ? 'up' : 'down');

/** Movement vs last week. Never a bare arrow — the number carries the meaning. */
export function movement(n) {
  if (!Number.isFinite(n) || n === 0) return { dir: 'flat', label: 'no change', text: '—' };
  return n > 0
    ? { dir: 'up', label: `up ${n} place${n === 1 ? '' : 's'}`, text: `▲ ${n}` }
    : { dir: 'down', label: `down ${-n} place${n === -1 ? '' : 's'}`, text: `▼ ${-n}` };
}

/** Player names are 3–16 user-generated characters; duo labels join two. */
export const truncate = (s, max = 16) =>
  String(s ?? '').length > max ? `${String(s).slice(0, max - 1)}…` : String(s ?? '');

export const ordinal = (n) => ['1st', '2nd', '3rd'][n - 1] ?? `${n}th`;
