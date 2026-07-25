/**
 * Achievements — the real ones.
 *
 * This replaces a derived system: the site used to synthesise badges from stat thresholds ("find
 * 1,000 items") and measure their rarity against the loaded player set. That was honest about being
 * an approximation and clever about it, but it was still an approximation — "held by 2 of 8" meant
 * two of whoever happened to be loaded — and the plugin has a real achievement system underneath it
 * the whole time.
 *
 * So these are now the plugin's actual achievements: things a player unlocked in-game, at a time,
 * sometimes with a named teammate. Two endpoints, both exact, no synthesis:
 *
 *   GET /catalogue                  — every achievement that exists: id, title, description, scope
 *   GET /achievements/{player}      — this player's unlocks: id, mode, teammate, unlockedAt
 *
 * ## What this gains, and what it drops
 *
 * Gains: it is real. An unlock happened — there is a timestamp, and for a team unlock, a partner.
 * A threshold "achievement" was never an event and could carry neither. And locked achievements
 * come from the catalogue, so "what's left" is the true remaining set rather than a hardcoded list.
 *
 * Drops: measured rarity. The plugin's endpoints do not carry "how many players hold each
 * achievement" — the leaderboard ranks players by how many they hold, which is the other axis — so
 * a trustworthy "held by N of M" would need a GROUP BY achievement_id endpoint that does not exist
 * yet. Rather than ship the biased approximation the derived system shipped (now "of the top 100"
 * instead of "of the loaded 8", the same sin in a bigger costume), rarity is left out. The shape
 * below keeps an optional slot for it, so if that endpoint ever lands, `heldBy`/`population` fill in
 * and no component changes.
 *
 * ## Scope grouping is data-driven
 *
 * The catalogue's `scope` is a free string the plugin owns (SOLO, TEAM, GLOBAL, COLLECTION, META
 * today). This module does not hardcode that set — it groups by whatever distinct scopes come back,
 * ordered by SCOPE_ORDER with any unknown scope sorted last. A scope added plugin-side appears on
 * the site with no change here, the same SSOT rule the leaderboard categories follow.
 */

import { RARITY_KEYS, RARITY_FIELDS } from './tokens.js';

/* ────────────────────────────────────────────────────────────────────────────
 * General stats helpers.
 *
 * These are NOT achievement functions and never were — they normalise a stats
 * payload and count pulls, and the profile's stats rendering leans on them
 * throughout. They live here only because the old derived-achievement system
 * housed them here; the migration keeps them exactly as they were rather than
 * move them, to avoid touching every call site for a rename. If a stats module
 * is ever carved out, they belong there, but that is a separate refactor.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Scope payloads describe the same player three ways: solo, one duo, and the combined roll-up. The
 * combined shape renames four fields, which would otherwise force every consumer to branch on
 * scope. This flattens all three into one vocabulary. Fields genuinely absent from a scope come
 * back null, never 0 — a duo has no wheel uses of its own, and rendering that as zero would be a
 * lie rather than a gap.
 */
export function unifyStats(payload, scope = 'solo') {
  if (!payload) return null;
  const combined = scope === 'combined';

  return {
    scope,
    gamesPlayed: combined ? payload.totalGamesPlayed : payload.gamesPlayed,
    gamesWon: combined ? payload.totalGamesWon : payload.gamesWon,
    highestScore: combined ? payload.highestTeamScore : payload.highestScore,
    longestItemStreak: combined ? payload.longestTeamItemStreak : payload.longestItemStreak,
    highestB2BStreak: payload.highestB2BStreak,
    totalItemsFound: payload.totalItemsFound,
    rarities: payload.rarities ?? {},
    blocksTravelled: payload.blocksTravelled,
    deaths: payload.deaths,
    wheelOfFortuneUses: payload.wheelOfFortuneUses,
    enteredAntimatterTeleporter: payload.enteredAntimatterTeleporter,
    totalTimeSpentOnItems: payload.totalTimeSpentOnItems,
    topThreeItems: payload.topThreeItems ?? [],
    teamsCount: payload.teamsCount ?? null,
  };
}

const rarityCount = (s, tier) => s.rarities?.[RARITY_FIELDS[tier]] ?? 0;

/** Total pulls across every rarity tier. */
export const totalPulls = (s) =>
    RARITY_KEYS.reduce((a, tier) => a + rarityCount(s, tier), 0);

/**
 * A preferred display order for the known scopes. Anything not listed sorts after these, in
 * alphabetical order, so a new plugin scope is never hidden — just appended.
 */
const SCOPE_ORDER = ['SOLO', 'TEAM', 'GLOBAL', 'COLLECTION', 'META'];

const SCOPE_LABELS = {
  SOLO: 'Solo',
  TEAM: 'Team',
  GLOBAL: 'Global',
  COLLECTION: 'Collection',
  META: 'Meta',
};

/** A human label for a scope, falling back to a title-cased version of an unknown one. */
export function scopeLabel(scope) {
  if (SCOPE_LABELS[scope]) return SCOPE_LABELS[scope];
  const s = String(scope || '').toLowerCase();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Other';
}

/**
 * Merge the catalogue with a player's unlocks into the rows the profile renders, grouped by scope.
 *
 * Every catalogue entry becomes a row — unlocked or not — because a locked achievement is
 * information: the grid answers "what's left", not just "what you have". An unlock contributes its
 * timestamp and, for a team unlock, the teammate. An achievement earned both solo and in a team
 * appears once (it is one achievement) with both unlock records kept on `unlocks` so the UI can
 * show "solo, and with X".
 *
 * @param catalogue  the /catalogue payload: { achievements: [{ achievementId, title, description, scope }] }
 * @param player     the /achievements/{player} payload: { count, total, achievements: [{ achievementId, mode, teammate, unlockedAt }] }
 * @returns          [{ scope, label, achievements: [row] }], row = see below, groups in SCOPE_ORDER
 */
export function achievementGroups(catalogue, player) {
  const catalogueList = catalogue?.achievements ?? [];
  const unlocks = player?.achievements ?? [];

  // Index a player's unlock records by achievement id — an achievement may have more than one
  // (solo and team), so this is id -> [record].
  const unlocksById = new Map();
  for (const u of unlocks) {
    const list = unlocksById.get(u.achievementId) ?? [];
    list.push(u);
    unlocksById.set(u.achievementId, list);
  }

  const rows = catalogueList.map((entry) => {
    const records = unlocksById.get(entry.achievementId) ?? [];
    const unlocked = records.length > 0;

    // The earliest unlock is the one that "counts" as when they earned it; a later re-earn in the
    // other mode does not reset the date.
    const earnedAt = unlocked
        ? Math.min(...records.map((r) => r.unlockedAt))
        : null;

    // Teammates across every team-mode unlock of this achievement, de-duplicated. A player who
    // earned one achievement with two different partners shows both.
    const teammates = records
        .filter((r) => r.mode === 'TEAM' && r.teammate)
        .map((r) => r.teammate);

    return {
      id: entry.achievementId,
      title: entry.title,             // MiniMessage — rendered by the component, not here
      description: entry.description, // MiniMessage
      scope: entry.scope,
      unlocked,
      earnedAt,
      modes: [...new Set(records.map((r) => r.mode))], // ['SOLO'], ['TEAM'], or both
      teammates,
      // Rarity slot, deliberately absent until a per-achievement count endpoint exists. A component
      // renders "held by N of M" only when both are present, so leaving them undefined hides the
      // line cleanly rather than showing a fabricated number.
      heldBy: undefined,
      population: undefined,
    };
  });

  // Group by scope, order groups, and within a group put unlocked first then by earliest earned.
  const byScope = new Map();
  for (const row of rows) {
    const list = byScope.get(row.scope) ?? [];
    list.push(row);
    byScope.set(row.scope, list);
  }

  const orderedScopes = [...byScope.keys()].sort(compareScopes);

  return orderedScopes.map((scope) => ({
    scope,
    label: scopeLabel(scope),
    achievements: byScope.get(scope).sort(compareRows),
  }));
}

/** Known scopes in SCOPE_ORDER, unknowns after, alphabetical among themselves. */
function compareScopes(a, b) {
  const ia = SCOPE_ORDER.indexOf(a);
  const ib = SCOPE_ORDER.indexOf(b);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b);
}

/** Unlocked before locked; among unlocked, earliest earned first; else stable by title text. */
function compareRows(a, b) {
  if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
  if (a.unlocked && b.unlocked) return a.earnedAt - b.earnedAt;
  return 0;
}

/**
 * The headline numbers for the section, straight from the player payload — NOT recomputed from the
 * rows, because the payload's `count` is authoritative: it is distinct achievements earned, defined
 * server-side (one per achievement+mode collapsed to one), and the frontend should not second-guess
 * it by counting rows it happened to render.
 */
export function achievementSummary(catalogue, player) {
  return {
    earned: player?.count ?? 0,
    total: catalogue?.achievements?.length ?? 0,
  };
}
