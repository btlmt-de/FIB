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
  itemKey, itemLabel, itemSearchText, itemTexture, ITEM_POOL, ITEM_STATE,
  LEADERBOARD_SCOPES, LEADERBOARD_CATEGORIES,
  matchStandings, matchDuration, raceEntries, standingsAt, leadChanges, leadChangeTimes, itemSegments,
  winRate, itemsPerGame, secondsPerItem, timeAgo,
} from './data.js';
import { RARITY_KEYS, RARITY_FIELDS } from './tokens.js';

export {
  playerName, playerAvatar, idUuid, idName, idLabel,
  itemKey, itemLabel, itemSearchText, itemTexture, ITEM_POOL, ITEM_STATE,
  LEADERBOARD_SCOPES, LEADERBOARD_CATEGORIES,
  matchStandings, matchDuration, raceEntries, standingsAt, leadChanges, leadChangeTimes, itemSegments,
  winRate, itemsPerGame, secondsPerItem, timeAgo,
};

/**
 * An item's match phase — EARLY / MID / LATE — from ITEM_STATE (vendored from
 * the plugin), or null for an item never assigned one. Shared by the item index
 * and the collection so a sprite reads the same phase colour in both places.
 */
export const itemPhase = (itemName) => ITEM_STATE[itemKey(itemName).toUpperCase()] || null;

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
 * The head as an OBJECT rather than a face: mc-heads' isometric render, the same
 * three-quarter view Minecraft uses for a block in an inventory slot. The podium
 * stands these on stacked block sprites, and a flat face on an isometric block
 * reads as a sticker, not a player standing there.
 *
 * `facing` is the renderer's own vocabulary: the default render looks right,
 * `left` looks left. The podium turns the outer two toward the winner.
 */
export const headAt = (uuid, size = 128, facing = 'right') => {
  const step = AVATAR_STEPS.find((s) => s >= size) ?? 128;
  const id = uuid ?? 'MHF_Steve';
  return facing === 'left'
    ? `https://mc-heads.net/head/${id}/left/${step}`
    : `https://mc-heads.net/head/${id}/${step}`;
};

/**
 * One line that says how a match was won, derived only from what the match
 * record can prove.
 *
 * The overview's featured card used to say every match was "decided in the
 * final stretch" whatever the race actually did - a sentence written once and
 * printed over every match, which is the interface asserting a story the data
 * never told it. Each branch below is a fact about the race: no lead change at
 * all, the last lead change landing in the final fifth of the clock, the
 * margin. The match page and the overview both headline with this, so the
 * story a reader clicks on is the story the page they land on tells.
 *
 * `lastChange` is the offset of the final lead change in seconds, or null.
 * Returns { winner, text } where text is the whole headline.
 */
export const matchHeadline = (match, lastChange = null) => {
  const standings = matchStandings(match);
  const [first, second] = standings;
  if (!first) return { winner: null, text: 'Match result' };
  const winner = first.members.map(idLabel).join(' & ');
  if (!second) return { winner, text: `${winner} won uncontested` };

  const loser = second.members.map(idLabel).join(' & ');
  const margin = (first.score ?? 0) - (second.score ?? 0);
  const duration = matchDuration(match);
  const lateTurn = lastChange != null && duration > 0 && lastChange >= duration * 0.8;

  let text;
  if (margin === 0) text = `${winner} edged ${loser} level on score`;
  else if (lateTurn) text = `${winner} came through late against ${loser}`;
  else if ((match.leadChanges ?? 0) === 0 && lastChange == null) text = `${winner} led ${loser} from start to finish`;
  else if (margin <= 3) text = `${winner} held off ${loser} by ${margin}`;
  else text = `${winner} beat ${loser} by ${margin}`;
  return { winner, text };
};

/**
 * Shown when the head renderer is unreachable or rate-limits us. It is a third party we do not
 * control, and a row of blank squares reads as a broken page rather than a slow one.
 */
export const AVATAR_FALLBACK = 'https://mc-heads.net/avatar/MHF_Steve/64';
