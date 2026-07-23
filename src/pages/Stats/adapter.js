/**
 * The seam between `data.js` and the UI.
 *
 * `data.js` is already a faithful mock of the FIB service: generators that
 * return DTO shapes, plus derivations that read those same shapes. So this file
 * does almost nothing — it assembles the per-screen payloads and gives the
 * components one import instead of twenty. When the real API lands, the
 * generators inside `loadStats` become fetches and nothing above this line
 * changes.
 */

import {
  MOCK_PLAYERS, playerName, playerAvatar,
  itemKey, itemLabel, itemTexture,
  mockSoloStats, mockPlayerStats, mockTeamStats, mockPartners, mockCombinedTeamStats,
  mockSoloLeaderboard, mockCombinedLeaderboard, mockDuoLeaderboard, mockSoloRank,
  LEADERBOARD_SCOPES, LEADERBOARD_CATEGORIES,
  mockMatches, matchStandings, itemsForOwner, raceEntries, scoreAt, eventTimes,
  standingsAt, leadChanges, leadChangeTimes, itemSegments,
  mockWeeklyBoard, mockMatchOfTheWeek, mockRareMoments, mockItemIndex,
  mockGlobalStats, mockActivity,
  formatNumber, formatDistance, mmss, formatTime, formatDate, formatClock, formatByKind,
  winRate, itemsPerGame, secondsPerItem, totalRarities, timeAgo,
} from './data.js';
import { RARITY_KEYS, RARITY_FIELDS } from './tokens.js';

export {
  MOCK_PLAYERS, playerName, playerAvatar,
  itemKey, itemLabel, itemTexture,
  mockSoloStats, mockPlayerStats, mockTeamStats, mockPartners, mockCombinedTeamStats,
  mockSoloLeaderboard, mockCombinedLeaderboard, mockDuoLeaderboard, mockSoloRank,
  LEADERBOARD_SCOPES, LEADERBOARD_CATEGORIES,
  matchStandings, itemsForOwner, raceEntries, scoreAt, eventTimes,
  standingsAt, leadChanges, leadChangeTimes, itemSegments,
  formatNumber, formatDistance, mmss, formatTime, formatDate, formatClock, formatByKind,
  winRate, itemsPerGame, secondsPerItem, totalRarities, timeAgo,
};

/**
 * A missing export from `data.js` otherwise surfaces as a bare
 * "doesn't provide an export named X" link error with no hint about which side
 * is wrong. This names the contract instead. Runs once, costs nothing.
 */
(function assertContract() {
  const required = { MOCK_PLAYERS, mockMatches, mockSoloStats, mockTeamStats, mockItemIndex, LEADERBOARD_CATEGORIES };
  const missing = Object.entries(required).filter(([, v]) => v === undefined).map(([k]) => k);
  if (missing.length) {
    throw new Error(
      `FIB stats: data.js is missing ${missing.join(', ')}. ` +
      'If your data layer uses different names, remap them in adapter.js — it is the only file that imports data.js. ' +
      'If the names look right, your dev server is serving a stale transform: rm -rf node_modules/.vite and restart.',
    );
  }
})();

/** Order-independent pair key, matching FibTeamKey. */
export const teamKey = (a, b) => [a, b].slice().sort().join('~');

/** Rarity counts keyed by tier, in tier order, from a FibRarities payload. */
export const rarityCounts = (rarities) =>
  Object.fromEntries(RARITY_KEYS.map((k) => [k, rarities?.[RARITY_FIELDS[k]] ?? 0]));

/**
 * Player head at a usable size.
 *
 * `avatarUrl` on MOCK_PLAYERS is baked at 48px and the renderer takes the size
 * in the path, so the size is swapped rather than upscaling a 48px render.
 *
 * The requested size is snapped to one of three steps instead of being passed
 * through. Avatars appear at half a dozen different sizes across the module,
 * and an unsnapped size means a separate third-party request — and a separate
 * cache entry — for every one of them. Three URLs per player covers the lot.
 */
const AVATAR_STEPS = [32, 64, 128];

export const avatarAt = (uuid, size = 32) => {
  const step = AVATAR_STEPS.find((s) => s >= size) ?? 128;
  return String(playerAvatar(uuid)).replace(/\/(\d+)$/, `/${step}`);
};

/**
 * Shown when the head renderer is unreachable or rate-limits us. It is a third
 * party we do not control, and a row of blank squares reads as a broken page
 * rather than a slow one.
 */
export const AVATAR_FALLBACK = 'https://mc-heads.net/avatar/MHF_Steve/64';

/**
 * Assembled once on mount. `matches` is the expensive part — every dashboard
 * rollup derives from the same array rather than regenerating it, because
 * `mockMatches` rebuilds an item log per call.
 */
export function loadStats(matchCount = 24) {
  const matches = mockMatches(matchCount);
  return {
    players: MOCK_PLAYERS,
    matches,
    items: mockItemIndex(matches),
    globals: mockGlobalStats(matches),
    weekly: mockWeeklyBoard(),
    featured: mockMatchOfTheWeek(matches),
    moments: mockRareMoments(matches, 7),
    activity: mockActivity(matches, 10),
  };
}

/**
 * Everything one profile needs, in one call. `duo` is intentionally a LIST, not
 * a single block: a duo is one specific pair, so the profile picks a partner
 * and reads that pair's own numbers rather than an average across partners.
 */
export function loadPlayer(uuid) {
  const partners = mockPartners(uuid).map((partnerUuid) => {
    const team = mockTeamStats(uuid, partnerUuid);
    const self = team.memberStats.find((m) => m.memberUuid === uuid);
    const other = team.memberStats.find((m) => m.memberUuid !== uuid);
    return { uuid: partnerUuid, name: playerName(partnerUuid), team, self, other };
  });
  return {
    uuid,
    name: playerName(uuid),
    meta: mockPlayerStats(uuid),
    rank: mockSoloRank(uuid),
    solo: mockSoloStats(uuid),
    combined: mockCombinedTeamStats(uuid),
    partners,
  };
}

/**
 * Things the brief flags as genuinely absent server-side. Kept in one list so
 * the backend ask stays legible, and surfaced in the UI as pending rather than
 * as a fabricated zero.
 */
export const PENDING_BACKEND = {
  rankPosition: 'No rank-position endpoint. Rank is computed client-side over the loaded player set and is only meaningful within it.',
  leadChanges: 'Not materialised on fib_match, so it is recomputed from the item log on every render.',
  weeklyAggregation: 'No per-week rollup. Weekly wins and movement come from the mock and need a real GROUP BY over two windows.',
};
