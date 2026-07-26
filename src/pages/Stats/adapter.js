/**
 * The seam between the pure data helpers and the UI.
 *
 * This used to assemble mock payloads — `loadStats`, `loadPlayer`, and a wall of `mock*` generators
 * re-exported for the views. All of that is gone: the views fetch real data through `api.js` now.
 * What remains here is the small set of pure, data-source-agnostic helpers the components still
 * import — match derivations, identity and item formatting, a few metadata lists — plus this file's
 * own additions (avatar sizing, rarity counting). None of it synthesises data; it shapes and reads
 * shapes the real endpoints return, exactly as it read the mock's before.
 *
 * `data.js` has been stripped to match: only these helpers live there now, no generators.
 */

import {
  playerName, playerAvatar, idUuid, idName, idLabel,
  itemKey, itemLabel, itemTexture,
  LEADERBOARD_SCOPES, LEADERBOARD_CATEGORIES,
  matchStandings, matchDuration, raceEntries, standingsAt, leadChanges, leadChangeTimes, itemSegments,
  winRate, itemsPerGame, secondsPerItem, timeAgo,
} from './data.js';
import { RARITY_KEYS, RARITY_FIELDS } from './tokens.js';

export {
  playerName, playerAvatar, idUuid, idName, idLabel,
  itemKey, itemLabel, itemTexture,
  LEADERBOARD_SCOPES, LEADERBOARD_CATEGORIES,
  matchStandings, matchDuration, raceEntries, standingsAt, leadChanges, leadChangeTimes, itemSegments,
  winRate, itemsPerGame, secondsPerItem, timeAgo,
};

/** Order-independent pair key, matching FibTeamKey. */
export const teamKey = (a, b) => [a, b].slice().sort().join('~');

/** Rarity counts keyed by tier, in tier order, from a FibRarities payload. */
export const rarityCounts = (rarities) =>
    Object.fromEntries(RARITY_KEYS.map((k) => [k, rarities?.[RARITY_FIELDS[k]] ?? 0]));

/**
 * Player head at a usable size.
 *
 * The head renderer takes the size in the path, so the size is swapped rather than upscaling a
 * smaller render. The requested size is snapped to one of three steps instead of being passed
 * through: avatars appear at half a dozen sizes across the module, and an unsnapped size means a
 * separate third-party request — and a separate cache entry — for each. Three URLs per player
 * covers the lot.
 */
const AVATAR_STEPS = [32, 64, 128];

export const avatarAt = (uuid, size = 32) => {
  const step = AVATAR_STEPS.find((s) => s >= size) ?? 128;
  return String(playerAvatar(uuid)).replace(/\/(\d+)$/, `/${step}`);
};

/**
 * Shown when the head renderer is unreachable or rate-limits us. It is a third party we do not
 * control, and a row of blank squares reads as a broken page rather than a slow one.
 */
export const AVATAR_FALLBACK = 'https://mc-heads.net/avatar/MHF_Steve/64';
