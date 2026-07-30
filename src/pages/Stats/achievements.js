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
/* Titles are MiniMessage, so every comparison and search over them has to run on
   the flattened text — sorting raw markup orders by `<gold>` before `<green>`
   rather than by the words a reader sees. */
import { stripMiniMessage } from './MiniMessage.jsx';

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
    // The service reports this in MILLISECONDS (a 5-match player carries ~17.7M),
    // but every consumer — secondsPerItem, the `hours` formatter — reads it as
    // seconds, which rendered "108,557 s/item" and "4,915h spent on items" (204
    // days). Normalise to seconds once, here at the boundary, so the unified
    // vocabulary means seconds like the rest of it. Guarded so a genuinely-absent
    // value stays null rather than collapsing to 0 (a real 0/1000).
    totalTimeSpentOnItems: Number.isFinite(payload.totalTimeSpentOnItems)
      ? payload.totalTimeSpentOnItems / 1000
      : null,
    topThreeItems: payload.topThreeItems ?? [],
    teamsCount: payload.teamsCount ?? null,
  };
}

const rarityCount = (s, tier) => s.rarities?.[RARITY_FIELDS[tier]] ?? 0;

/** Total pulls across every rarity tier. */
export const totalPulls = (s) =>
    RARITY_KEYS.reduce((a, tier) => a + rarityCount(s, tier), 0);

/* ────────────────────────────────────────────────────────────────────────────
 * Progress on what is not yet earned.
 *
 * "The Case and the Chase" splits this section in two: what you hold is a set of
 * objects, and what you are chasing is a progress list, closest first. A progress
 * list needs a numerator, and the achievement endpoints do not carry one — the
 * catalogue gives a title, a description and a scope, and nothing else.
 *
 * So progress is derived, and the derivation is keyed by `achievementId` rather
 * than parsed out of the description text. That choice is the whole design:
 *
 *   - A description is prose the plugin owns and may reword at any time. "Die 500
 *     times" becoming "Die 500 times total" would silently break a regex, and a
 *     silently-wrong progress bar is worse than none.
 *   - An id is a contract. If the plugin adds an achievement, it is simply absent
 *     from this table and renders with no bar, which is the correct default.
 *
 * The table covers every achievement whose progress a career stat actually
 * measures: all 26 GLOBAL (cumulative lifetime counters), all 4 COLLECTION
 * (distinct items held), and both META (a count of other achievements). The 54
 * ROUND achievements are deliberately absent — they are single-round events
 * ("Visit all three dimensions in one round", "Collect 3 items in the final
 * minute") and no career total measures how close you are to one. Inventing a
 * bar for those would be the fabrication this table exists to avoid.
 *
 * Each entry is `[pick, target]`, where `pick` reads the numerator from the
 * context and `target` is the threshold stated in the description. A pick that
 * returns a non-number yields no bar for that row.
 * ──────────────────────────────────────────────────────────────────────────── */

const rarity = (tier) => (ctx) => ctx.career?.rarities?.[tier];
const stat = (key) => (ctx) => ctx.career?.[key];
const streak = (ctx) => ctx.streaks?.highestWinStreak;

/** Distinct items held, as a fraction of the whole pool — the COLLECTION axis. */
const distinct = (ctx) => ctx.collection?.distinctItems;
const poolSize = (ctx) => ctx.collection?.totalItems;

export const ACHIEVEMENT_PROGRESS = {
  /* GLOBAL — lifetime counters, straight off the combined career block. */
  LEARNING_EXPERIENCE: [stat('deaths'), 50],
  BETTER_LUCK_NEXT_TIME: [stat('deaths'), 250],
  ARE_YOU_EVEN_TRYING: [stat('deaths'), 500],

  FORTUNE_FAVOURS: [totalPulls, 100],
  PROBABILITY_BROKEN: [totalPulls, 250],
  BACK_TO_BACK_TO_BACK_TO_BACK: [totalPulls, 1000],

  NOTHING_SPECIAL: [rarity('rare'), 250],
  PURPLE_REIGN: [rarity('epic'), 100],
  STUFF_OF_LEGENDS: [rarity('legendary'), 50],
  BLESSED_BY_RNGESUS: [rarity('rngesus'), 2],
  FEELS_FAMILIAR: [rarity('extraordinary'), 5],

  FIRST_OF_MANY: [stat('gamesPlayed'), 10],
  SEASONED_VETERAN: [stat('gamesPlayed'), 50],

  TASTE_OF_VICTORY: [stat('gamesWon'), 5],
  HALL_OF_FAME: [stat('gamesWon'), 25],

  HAT_TRICK: [streak, 3],
  UNSTOPPABLE: [streak, 5],

  STOCKPILE: [stat('totalItemsFound'), 1000],
  WAREHOUSE: [stat('totalItemsFound'), 5000],

  GLOBETROTTER: [stat('blocksTravelled'), 50000],
  MARATHON_RUNNER: [stat('blocksTravelled'), 250000],

  FREQUENT_FLYER: [stat('enteredAntimatterTeleporter'), 100],
  QUANTUM_COMMUTER: [stat('enteredAntimatterTeleporter'), 250],

  WHEEL_ENTHUSIAST: [stat('wheelOfFortuneUses'), 250],
  WHEEL_ADDICT: [stat('wheelOfFortuneUses'), 500],
  GAMBA_GAMBA_GAMA: [stat('wheelOfFortuneUses'), 1000],

  /* COLLECTION — a share of the item pool. The target is a fraction of the pool
     rather than a fixed count, so it tracks the pool growing with the game. */
  COLLECTOR_I: [distinct, (ctx) => poolSize(ctx) * 0.25],
  COLLECTOR_II: [distinct, (ctx) => poolSize(ctx) * 0.5],
  COLLECTOR_III: [distinct, (ctx) => poolSize(ctx) * 0.75],
  FORCEITEMBATTLE: [distinct, poolSize],

  /* META — measured against the other achievements, so the numerator comes from
     the rows themselves rather than from a stat. */
  COMPLETIONIST: [(ctx) => ctx.scopeEarned?.ROUND, (ctx) => ctx.scopeTotal?.ROUND],
  COMPLETIONIST_PLUS_PLUS: [
    (ctx) => ['ROUND', 'GLOBAL', 'COLLECTION'].reduce((a, s) => a + (ctx.scopeEarned?.[s] ?? 0), 0),
    (ctx) => ['ROUND', 'GLOBAL', 'COLLECTION'].reduce((a, s) => a + (ctx.scopeTotal?.[s] ?? 0), 0),
  ],
};

/**
 * `{ current, target, ratio }` for one achievement, or null where no career stat
 * measures it.
 *
 * `current` is clamped to `target` so a player who is past the threshold but has
 * not been granted the achievement yet (the plugin awards on the next event, not
 * retroactively) reads as "500 of 500" rather than "downloading 512 of 500". The
 * ratio is clamped for the same reason: a bar cannot be more than full.
 */
export function achievementProgress(id, ctx) {
  const entry = ACHIEVEMENT_PROGRESS[id];
  if (!entry || !ctx) return null;

  const [pick, rawTarget] = entry;
  const current = pick(ctx);
  const target = typeof rawTarget === 'function' ? rawTarget(ctx) : rawTarget;

  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return null;

  return {
    current: Math.min(current, target),
    target,
    ratio: Math.max(0, Math.min(1, current / target)),
  };
}

/**
 * A preferred display order for the known scopes. Anything not listed sorts after these, in
 * alphabetical order, so a new plugin scope is never hidden — just appended.
 */
const SCOPE_ORDER = ['SOLO', 'TEAM', 'GLOBAL', 'COLLECTION', 'META', 'ROUND'];

const SCOPE_LABELS = {
  SOLO: 'Solo',
  TEAM: 'Team',
  GLOBAL: 'Global',
  COLLECTION: 'Collection',
  META: 'Meta',
  ROUND: 'In a round',
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
 * @param ctx        optional progress context: { career, streaks, collection }. Supplied, every row
 *                   whose id appears in ACHIEVEMENT_PROGRESS carries `progress`; omitted, no row
 *                   does and the chase list falls back to alphabetical.
 * @returns          [{ scope, label, achievements: [row] }], row = see below, groups in SCOPE_ORDER
 */
export function achievementGroups(catalogue, player, ctx = null) {
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
      /* The same two strings flattened, for sorting and for the search filter.
         Computed once here rather than per keystroke in the view. */
      plainTitle: stripMiniMessage(entry.title),
      plainDescription: stripMiniMessage(entry.description),
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
      // Filled in the second pass below, once the scope tallies META needs exist.
      progress: null,
    };
  });

  /*
   * Progress needs a second pass, because the two META achievements are measured
   * against the other rows ("Complete every round achievement") and those rows do
   * not exist until the first pass has finished. Tallying per scope here also
   * costs nothing extra — the chase list and the group headers both want it.
   */
  if (ctx) {
    const scopeTotal = {};
    const scopeEarned = {};
    for (const row of rows) {
      scopeTotal[row.scope] = (scopeTotal[row.scope] ?? 0) + 1;
      if (row.unlocked) scopeEarned[row.scope] = (scopeEarned[row.scope] ?? 0) + 1;
    }
    const full = { ...ctx, scopeTotal, scopeEarned };
    for (const row of rows) row.progress = achievementProgress(row.id, full);
  }

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

/**
 * The case and the chase: what a player holds, and what they are closest to.
 *
 * These are two different questions and they get different furniture, so they get
 * different lists rather than one list with a `Locked` word on half the rows.
 *
 * `earned` keeps the newest unlock first — a trophy case is read as "what did I
 * just get", not alphabetically.
 *
 * `chase` is sorted closest-first, which is the whole reason this split exists.
 * Ordering is: measurable rows by descending progress, then the unmeasurable ones
 * (every ROUND achievement, and anything the plugin has added that this module has
 * no numerator for). Those trail alphabetically rather than being hidden — "what
 * is left" is information even when "how close" is not.
 */
export function splitAchievements(groups) {
  const all = groups.flatMap((g) =>
      g.achievements.map((a) => ({ ...a, scopeLabel: g.label })));

  const earned = all
      .filter((a) => a.unlocked)
      .sort((a, b) => (b.earnedAt ?? 0) - (a.earnedAt ?? 0));

  const chase = all
      .filter((a) => !a.unlocked)
      .sort((a, b) => {
        const ra = a.progress?.ratio;
        const rb = b.progress?.ratio;
        if (Number.isFinite(ra) && Number.isFinite(rb)) {
          if (rb !== ra) return rb - ra;
        } else if (Number.isFinite(ra) !== Number.isFinite(rb)) {
          return Number.isFinite(ra) ? -1 : 1;
        }
        return a.plainTitle.localeCompare(b.plainTitle);
      });

  return { earned, chase };
}

/** Known scopes in SCOPE_ORDER, unknowns after, alphabetical among themselves. */
function compareScopes(a, b) {
  const ia = SCOPE_ORDER.indexOf(a);
  const ib = SCOPE_ORDER.indexOf(b);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return String(a || '').localeCompare(String(b || ''));
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
