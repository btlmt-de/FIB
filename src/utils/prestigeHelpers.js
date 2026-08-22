/**
 * Prestige, as the site sees it.
 *
 * A prestige level is a number from the server (1–5, 0 meaning none) and a rarity
 * key on this side. That mapping lives here and nowhere else, for exactly the
 * reason `rarityHelpers.jsx` exists: the moment a second file decides that level
 * 3 is "legendary", the two can disagree, and a badge that promises one tier
 * while the board shows another is the defect that file's header comment is
 * about.
 *
 * Everything visual is *borrowed*, not invented. A prestige level has no colour
 * of its own — it wears the tier's, from the shared ladder — so a prestige ring
 * cannot drift from the rarity it is named after, and the palette gains nothing
 * to maintain.
 */

import { RARITY, getRarityColor, getRarityInk, getRarityIcon, isIridescentRarity } from './rarityHelpers.jsx';

/** Level 1 is the first index. Mirrors PRESTIGE_LEVELS in the wheel backend. */
export const PRESTIGE_LEVELS = ['rare', 'exotic', 'legendary', 'mythic', 'insane'];
export const MAX_PRESTIGE_LEVEL = PRESTIGE_LEVELS.length;

/** The rarity key for a level, or null for 0 / out of range. */
export function prestigeKey(level) {
    return PRESTIGE_LEVELS[level - 1] || null;
}

/** The label a player reads: "Mythic Prestige". */
export function prestigeLabel(level) {
    const key = prestigeKey(level);
    return key ? `${RARITY[key].label} Prestige` : null;
}

/**
 * Just the rank's name — "Mythic".
 *
 * For the places that already say "prestige" in their own furniture and would
 * only be repeating themselves: the phone's board title, which sits directly on
 * top of a lens whose selected option reads PRESTIGE, and the ceremony's
 * proclamation, which prints the word above it at label size. Both were doing
 * this with a `.replace(' Prestige', '')` on the full label, which is a string
 * operation standing in for a missing accessor.
 */
export function prestigeName(level) {
    const key = prestigeKey(level);
    return key ? RARITY[key].label : null;
}

/** Fill colour for a level's ring, dot or bar. */
export function prestigeColor(level) {
    const key = prestigeKey(level);
    return key ? getRarityColor(key) : null;
}

/** The same hue lifted for text. Icons count as text. */
export function prestigeInk(level) {
    const key = prestigeKey(level);
    return key ? getRarityInk(key) : null;
}

/**
 * What a player should be shown wearing, from a leaderboard row or a state object.
 *
 * Two facts, and the site needs both: the level they have EARNED (runs finished)
 * and the run they are IN. They are wildly different in duration — earning a
 * level means collecting all 1,559 items again — so a player who prestiged
 * yesterday has earned nothing and is nonetheless unmistakably prestiging.
 *
 * Showing only the earned level is what put nothing at all on the standings, the
 * leaderboard and the collection board for every player who had prestiged. So
 * the mark is the highest level they have *touched*, and `earned` says which of
 * the two it is — a full ring for a level won, a quieter one for a level being
 * worked toward. Nothing is claimed that has not happened.
 *
 * Accepts either shape: a leaderboard row (`prestige_level` /
 * `prestige_active_level`) or /api/prestige's state (`level` / `activeRun`).
 */
export function prestigeStanding(source) {
    if (!source) return { level: 0, earned: false, inProgress: false };

    const done = source.prestige_level ?? source.level ?? 0;
    const active = source.prestige_active_level ?? source.activeRun?.level ?? 0;
    const level = Math.max(done, active);

    return {
        level,
        earned: level > 0 && level <= done,
        inProgress: level > 0 && level > done,
    };
}

/**
 * The level's mark: the rarity's own icon, not a generic prestige glyph.
 *
 * Rare Prestige wears rare's diamond, Exotic Prestige wears exotic's gem, and so
 * on up to Insane Prestige, which lands on the crown because insane's icon IS a
 * crown. That falls out for free from borrowing the ladder rather than inventing
 * a set, which is this file's whole argument.
 *
 * `colored` defaults to false because every place this is used has already set
 * the right ink on its container — the icon inherits `currentColor` and cannot
 * disagree with the text beside it.
 *
 * The one exception the ladder makes for insane is deliberate here too: passing
 * `colored: true` gives insane's glyph the shared SVG gradient, which is only
 * mounted inside the wheel tree. Leaving it false keeps the glyph on the
 * container's own colour, which is what a badge on a holo background wants.
 */
export function prestigeIcon(level, size = 12, colored = false) {
    const key = prestigeKey(level);
    return key ? getRarityIcon(key, size, colored) : null;
}

/**
 * Whether this level must be painted with the whole gradient rather than a
 * colour.
 *
 * Only level 5 — insane — and it is not optional. DESIGN.md §8's Whole-Gradient
 * Rule: insane's ramp travels through magenta, aqua and gold, which are exotic,
 * mythic and legendary, so anything painted from a single sampled point off it
 * spends two thirds of every cycle wearing a lower tier's colour. A top-level
 * prestige ring that intermittently looks like a level-3 ring is the same bug in
 * a new place.
 */
export function isIridescentPrestige(level) {
    const key = prestigeKey(level);
    return Boolean(key && isIridescentRarity(key));
}
