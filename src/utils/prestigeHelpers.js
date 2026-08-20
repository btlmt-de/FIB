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
