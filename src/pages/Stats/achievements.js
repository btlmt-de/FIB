/**
 * Derived achievements.
 *
 * FIB has no achievement table for match statistics — the only achievement API
 * on this site belongs to the Wheel, and it is keyed by site account rather
 * than Minecraft UUID, so it cannot describe a player's match record.
 *
 * Rather than fabricate one or leave the section empty, achievements here are
 * DERIVED: each is a threshold over a field the service already returns. That
 * makes them honest (nothing is invented), immediately live (no backend work),
 * and — the part that matters — genuinely rare, because rarity is measured
 * against the actual player set rather than asserted by a designer.
 *
 * Two rules keep this from becoming decoration:
 *
 *  1. RARITY IS COUNTED, NOT DECLARED. `heldBy` is the number of players in the
 *     loaded set who hold the achievement. The UI always renders the
 *     denominator alongside it — "2 of 8", never a bare "25%" — because a
 *     percentage over a small population reads as far more authoritative than
 *     it is.
 *
 *  2. LOCKED IS INFORMATION. Every achievement renders whether or not it is
 *     unlocked, with real progress toward it. A grid that only shows what you
 *     earned can't answer "what should I do next".
 *
 * The shape each achievement resolves to is deliberately the shape the Wheel's
 * achievement API already returns — `{ id, name, description, tier, progress,
 * unlocked, unlockedAt }` — so if a match-stats endpoint ever lands, only
 * `achievementsFor` changes and no component does.
 */

import { RARITY_KEYS, RARITY_FIELDS } from './tokens.js';

/**
 * Scope payloads describe the same player three different ways: solo stats,
 * one duo's team stats, and the combined roll-up across every duo. The
 * combined shape renames four fields (`totalGamesPlayed`, `highestTeamScore`
 * …), which would otherwise force every consumer to branch on scope.
 *
 * This flattens all three into one vocabulary. Fields genuinely absent from a
 * scope come back `null`, never 0 — a duo has no "wheel uses of its own" and
 * rendering that as zero would be a lie rather than a gap.
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
 * The catalogue.
 *
 * `tier` is the rarity colour the row wears — it describes how hard the
 * achievement is to get, and is chosen to match the tier of pull or the
 * order of magnitude involved, not the designer's mood.
 *
 * `icon` is a Minecraft item key, resolved against the vendored sprite set. It
 * carries meaning where it can (a boat for distance, a spawn egg for the
 * teleporter) — the item IS the visual language of this product.
 *
 * `sense: 'low'` marks an achievement where a SMALLER number is the
 * accomplishment. Progress for those inverts, and they gate on a minimum
 * sample so a player with two games doesn't "earn" a low-deaths award for
 * having barely played.
 */
export const CATALOGUE = [
  {
    id: 'first-win', name: 'First Blood', icon: 'diamond_axe', tier: 'RARE',
    description: 'Win a match.',
    field: 'gamesWon', goal: 1,
  },
  {
    id: 'centurion', name: 'Centurion', icon: 'cobblestone', tier: 'RARE',
    description: 'Play 100 matches.',
    field: 'gamesPlayed', goal: 100,
  },
  {
    id: 'prospector', name: 'Prospector', icon: 'emerald_ore', tier: 'RARE',
    description: 'Find 1,000 items across every match.',
    field: 'totalItemsFound', goal: 1000,
  },
  {
    id: 'hoarder', name: 'Hoarder', icon: 'black_bundle', tier: 'EPIC',
    description: 'Find 2,000 items across every match.',
    field: 'totalItemsFound', goal: 2000,
  },
  {
    id: 'wheel-regular', name: 'Regular', icon: 'dripstone_block', tier: 'RARE',
    description: 'Spin the wheel of fortune 50 times.',
    field: 'wheelOfFortuneUses', goal: 50,
  },
  {
    id: 'chain', name: 'Chain Reaction', icon: 'blaze_powder', tier: 'EPIC',
    description: 'Hit a back-to-back streak of 5.',
    field: 'highestB2BStreak', goal: 5,
  },
  {
    id: 'veil', name: 'Through the Veil', icon: 'husk_spawn_egg', tier: 'EPIC',
    description: 'Enter the antimatter teleporter 30 times.',
    field: 'enteredAntimatterTeleporter', goal: 30,
  },
  {
    id: 'on-tilt', name: 'On Tilt', icon: 'copper_grate', tier: 'EPIC',
    description: 'Run an item streak of 25 without a skip.',
    field: 'longestItemStreak', goal: 25,
  },
  {
    id: 'survivor', name: 'Survivor', icon: 'beetroot', tier: 'EPIC',
    description: 'Keep deaths under 40 across at least 30 matches.',
    field: 'deaths', goal: 40, sense: 'low', minGames: 30,
  },
  {
    id: 'unbroken', name: 'Unbroken', icon: 'chorus_plant', tier: 'LEGENDARY',
    description: 'Hit a back-to-back streak of 9.',
    field: 'highestB2BStreak', goal: 9,
  },
  {
    id: 'high-score', name: 'Record Holder', icon: 'daylight_detector', tier: 'LEGENDARY',
    description: 'Post a score of 15,000 or better.',
    field: 'highestScore', goal: 15000,
  },
  {
    id: 'globetrotter', name: 'Globetrotter', icon: 'oak_boat', tier: 'LEGENDARY',
    description: 'Travel one million blocks.',
    field: 'blocksTravelled', goal: 1000000,
  },
  {
    id: 'rngesus', name: 'RNGesus Takes the Wheel', icon: 'allium', tier: 'RNGESUS',
    description: 'Land a single RNGesus-tier back-to-back.',
    rarityTier: 'RNGESUS', goal: 1,
  },
  {
    id: 'extraordinary', name: 'Extraordinary', icon: 'end_stone', tier: 'EXTRAORDINARY',
    description: 'Land five Extraordinary-tier back-to-backs.',
    rarityTier: 'EXTRAORDINARY', goal: 5,
  },
];

/**
 * The rarity tier an achievement actually earns, from how many players hold it.
 *
 * The catalogue's own `tier` is a designer's guess at difficulty, and the guess
 * is often wrong: "land five Extraordinary-tier back-to-backs" sounds legendary
 * and turns out to be something everybody has. Showing that guess as a badge
 * directly above a measured "held by 8 of 8" makes the interface argue with
 * itself, and the reader believes the count.
 *
 * So the badge is computed from the count. Rarity in this module is observed,
 * never asserted — which is the whole reason it can be trusted.
 */
const OBSERVED_TIERS = [
  [0.125, 'EXTRAORDINARY'],
  [0.25, 'RNGESUS'],
  [0.5, 'LEGENDARY'],
  [0.75, 'EPIC'],
  [Infinity, 'RARE'],
];

export function observedTier(heldBy, population) {
  if (!population) return null;
  const share = heldBy / population;
  return OBSERVED_TIERS.find(([max]) => share <= max)[1];
}

/** The raw number an achievement measures, from a unified stats object. */
function readValue(def, stats) {
  if (!stats) return 0;
  if (def.rarityTier) return rarityCount(stats, def.rarityTier);
  const v = stats[def.field];
  return Number.isFinite(v) ? v : 0;
}

/**
 * Resolve one definition against one player.
 *
 * `progress` is clamped 0–1 and is meaningful for locked rows only; unlocked
 * rows always read 1. For `sense: 'low'` achievements progress runs the other
 * way — being at 80 deaths against a goal of 40 is 0 progress, not 200%.
 */
function resolve(def, stats) {
  const value = readValue(def, stats);
  const low = def.sense === 'low';
  const eligible = !def.minGames || (stats?.gamesPlayed ?? 0) >= def.minGames;

  const unlocked = eligible && (low ? value <= def.goal : value >= def.goal);

  let progress;
  if (unlocked) {
    progress = 1;
  } else if (low) {
    // Approaching from above: at 2x the goal you are at zero, at the goal you
    // are at one. Anything worse than 2x reads as zero rather than negative.
    progress = Math.max(0, Math.min(1, (def.goal * 2 - value) / def.goal));
  } else {
    progress = Math.max(0, Math.min(1, def.goal > 0 ? value / def.goal : 0));
  }

  return { ...def, value, unlocked, progress, eligible };
}

/**
 * Every achievement for one player, each carrying how many players in the
 * comparison set also hold it.
 *
 * `population` is the full list of unified stats objects for the players being
 * compared against — the caller decides what "everyone" means (the whole
 * loaded set, one season, one scope), which keeps that policy out of here.
 *
 * Sorted so the record reads as an achievement wall: unlocked first, rarest
 * first within that, then closest-to-unlocking among the locked. A player
 * should see what they have, then what is nearly in reach.
 */
export function achievementsFor(stats, population = []) {
  const total = population.length;

  const held = new Map(
    CATALOGUE.map((def) => [
      def.id,
      population.reduce((n, other) => n + (resolve(def, other).unlocked ? 1 : 0), 0),
    ]),
  );

  return CATALOGUE.map((def) => {
    const row = resolve(def, stats);
    const count = held.get(def.id) ?? 0;
    return {
      ...row,
      heldBy: count,
      population: total,
      // The badge is what the player set says it is. `designTier` keeps the
      // catalogue's own guess around for anything that wants it.
      designTier: def.tier,
      tier: observedTier(count, total) ?? def.tier,
      // Null rather than 0 when there is nobody to compare against: "held by
      // 0%" and "we don't know yet" are different claims.
      heldPct: total > 0 ? (count / total) * 100 : null,
    };
  }).sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    // Earned achievements read rarest first, by the measured count — so the
    // order, the badge and the number all tell the same story.
    if (a.unlocked) return a.heldBy - b.heldBy || a.name.localeCompare(b.name);
    return b.progress - a.progress;
  });
}

/** Headline counts for the section header. */
export function achievementSummary(rows) {
  const unlocked = rows.filter((r) => r.unlocked);
  const rarest = unlocked.reduce(
    (best, r) =>
      best == null || r.heldBy < best.heldBy ? r : best,
    null,
  );
  return { unlocked: unlocked.length, total: rows.length, rarest };
}
