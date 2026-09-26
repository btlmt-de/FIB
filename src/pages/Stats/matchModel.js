/**
 * FIB Stats — derivations for one match: who a row is, when the item pools
 * opened, and what a competitor's run consisted of. Pure functions over the
 * match record, shared by the match page and its report components.
 */

import { idLabel, itemSegments, itemPhase } from './adapter.js';
import { RARITY_KEYS } from './tokens.js';

export const labelFor = (row) => row.members.map(idLabel).join(' & ');

/* ── The pool schedule ───────────────────────────────────────────────── */

/*
 * When each item pool opened, from the plugin's own rule
 * (plugin/.../manager/UnlockSchedule.java):
 *
 *   rounds of 50 minutes or more   MID at minute 5, LATE at minute 15
 *   shorter rounds                 MID at 11.11% of the round, LATE at 28.88%
 *
 * each rounded to a whole minute the way `unlockMinute` rounds it. Quickie
 * caps the pools (1: Early only, 2: Early + Mid) and Hard off keeps Late out.
 *
 * Two honest limits. The rule is keyed on the round's CONFIGURED length, which
 * the match record does not carry, so the recorded duration stands in for it,
 * rounded to the minute - the same number for any round that ran to its timer.
 * And it is today's rule: a match played under an older schedule is drawn on
 * this one. Both are why the chart labels the lines "opens" in plain words and
 * never claims a precision the data cannot back.
 */
const FIXED_MIN_MINUTES = 50;

export function phaseSchedule(duration, settings = {}) {
  const minutes = Math.round(duration / 60);
  const minuteOf = (pct) => Math.round((duration * pct) / 60) * 60;
  const fixed = minutes >= FIXED_MIN_MINUTES;
  const midAt = fixed ? 5 * 60 : minuteOf(0.1111);
  const lateAt = fixed ? 15 * 60 : minuteOf(0.2888);

  const quickie = Number(settings.QUICKIE ?? 0);
  const midOpen = quickie !== 1;
  const lateOpen = quickie === 0 && String(settings.HARD ?? 'true') !== 'false';

  const phases = [{ id: 'EARLY', label: 'Early pool', from: 0, to: midOpen ? midAt : duration }];
  if (midOpen) phases.push({ id: 'MID', label: 'Mid pool opens', from: midAt, to: lateOpen ? lateAt : duration });
  if (lateOpen) phases.push({ id: 'LATE', label: 'Late pool opens', from: lateAt, to: duration });
  return phases.filter((p) => p.from < duration);
}

/* ── Per-competitor derivations ──────────────────────────────────────── */

export const TIER_RANK = Object.fromEntries(RARITY_KEYS.map((k, i) => [k, i]));

/*
 * A find that was actually hunted. A back-to-back is the next item turning out
 * to be in the inventory already, so it lands in the same second as the one
 * before it - "0s" - and crowning it the fastest find calls luck speed. The
 * fastest-find figures skip those (and any other zero-time entry) and measure
 * items somebody went and got.
 */
export const huntedFind = (s) => !s.skipped && !s.b2b && s.took > 0;

/** Everything a report and the records read off one competitor's item log. */
export function runOf(entry) {
  const segments = itemSegments(entry);
  const finds = segments.filter((s) => !s.skipped);
  const pulls = segments.filter((s) => s.b2b);
  const tiers = Object.fromEntries(RARITY_KEYS.map((k) => [k, pulls.filter((s) => s.b2b === k).length]));
  const phases = { EARLY: 0, MID: 0, LATE: 0, NONE: 0 };
  for (const s of segments) phases[itemPhase(s.itemName) ?? 'NONE'] += 1;
  const fastest = finds.filter(huntedFind).reduce((a, b) => (a == null || b.took < a.took ? b : a), null);
  const longest = segments.reduce((a, b) => (a == null || b.took > a.took ? b : a), null);
  const last = segments[segments.length - 1];
  return {
    segments,
    found: finds.length,
    skipped: segments.length - finds.length,
    pulls,
    tiers,
    phases,
    fastest,
    longest,
    /* Average over everything the run moved through, skips included: a skip
       still spent the time before it. */
    perItem: segments.length && last ? last.t / segments.length : null,
  };
}

