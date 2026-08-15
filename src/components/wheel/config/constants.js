/**
 * Spacing scale for the wheel's page shell.
 *
 * A layout audit of this page counted eighteen distinct spacing values across
 * WheelPage and WheelSpinner — essentially every even number up to 40 — and two
 * different implied scales contradicting each other and DESIGN.md. DESIGN.md's
 * frontmatter declares xs 4 / sm 8 / md 14 / lg 20 / xl 28, but the wheel had
 * already voted with its feet for an 8-based rhythm (8/16/24/40 dominate the
 * shell), while 5, 6, 10, 11, 18, 26, 32 and 36 belonged to neither. DESIGN.md
 * §5 grants the wheel an exception for *glow and spectacle*; it does not license
 * an arbitrary spacing scale, so this ratifies the majority rhythm rather than
 * inventing a third one.
 *
 * Scope is the shell — the HUD's rows, the gaps between the reel, the sidebars
 * and the stage. Component interiors are not retrofitted; that is a much larger
 * sweep and would bury the layout work.
 */
export const SPACE = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 40,
};

/**
 * Stacking order for the HUD, in one place.
 *
 * The wheel surface currently reaches 10000, via a 9996–10000 run across the
 * effects overlays plus one-off 900 / 950 / 999 / 1001 / 101 and an orphaned 19
 * sitting next to a pair of 20s. Nothing in that range is reasoned about; the
 * numbers just had to be bigger than whatever was already there.
 *
 * This scale covers the shell and the reel, which is what the HUD rebuild
 * touches. It matters more than it used to: the reel's pointers used to paint
 * below the card's own overlays purely because they shared one stacking context,
 * and once the overlays move to the shell that relationship has to be stated
 * rather than inherited. The `effects/` range above is deliberately left alone —
 * untangling it is a separate job across roughly two dozen files — so `banner`
 * and `modal` here are documentation of where those live, not a re-basing of
 * them.
 */
export const Z = {
    base: 0,        // shell background, cosmic canvas
    content: 1,     // topbar, stage, sidebars — normal HUD furniture
    reel: 2,        // the reel row sits above the stage's ambient glow
    pointer: 4,     // centre line and pointers, above the reel's own fades
    overlay: 6,     // full-surface spin-mode washes (recursion, KOTW shimmer)
    banner: 100,    // FirstBlood / CommunityGoal, the better-behaved banners
    modal: 10000,   // EventSelectionWheel and the celebration stack
};

export const COLORS = {
    bg: '#1a1a2e',
    bgLight: '#252542',
    bgLighter: '#2d2d4a',
    text: '#e0e0e0',
    textMuted: '#888',
    border: '#3d3d5c',
    accent: '#5865F2',
    gold: '#FFAA00',
    aqua: '#55FFFF',
    green: '#55FF55',
    yellow: '#FFFF55',
    purple: '#AA00AA',
    red: '#FF5555',
    orange: '#FF8800',
    insane: '#FFD700',  // Bright gold — now spent on LEGENDARY, see rarityHelpers
    recursion: '#00FF00', // Matrix green for recursion
    recursionDark: '#001100', // Dark green/black for recursion

    // ── Rarity ink steps ──────────────────────────────────────────────────────
    // Minecraft's chat colours were chosen to sit on a black chat box, not on a
    // #1a1a2e panel, and they do not all survive the move. Measured against the
    // three panel steps (bg / bgLight / bgLighter), #AA00AA is 2.67 / 2.31 / 2.07
    // and #FF5555 is 5.43 / 4.70 / 4.21 — magenta fails AA everywhere, red passes
    // on the page and fails on a raised row. The hue is what players recognise
    // from chat, so the hue is kept and the lightness lifted; the same fix the
    // stats module documents in DESIGN.md §7. Use the base colour for fills,
    // borders, dots and glows; use the `*Ink` step the moment it becomes text.
    // Ratios below are the worst of the three surfaces, i.e. on bgLighter.
    purpleInk: '#DE6BDE',   // Exotic as text — 4.58:1
    redInk: '#FF8A8A',      // Rare as text — 5.84:1
    // Common's old #888 is 3.74:1 on bgLighter, under the floor, and a neutral
    // grey on a midnight-blue field reads as dead rather than quiet. This is the
    // same grey pulled toward the field's own hue.
    neutralInk: '#9AA0B4',  // Common as text — 5.08:1

    // ── Insane: the iridescent step ───────────────────────────────────────────
    // Insane is the only tier with no flat colour, because every flat colour it
    // could take is already spoken for one rung down (gold = legendary, aqua =
    // mythic, magenta = exotic). It gets an oil-slick instead, and where a single
    // hex is unavoidable it falls back to a near-white platinum: white outranks
    // the whole ladder and collides with nothing on it.
    insaneFlat: '#F2ECFF',
    // Stops for the holographic sweep. Magenta is deliberately the *hot* #FF55FF
    // rather than exotic's #AA00AA — two full lightness steps apart, and insane's
    // never sits still on it, so the two never read as the same tier.
    insaneHolo: ['#FF55FF', '#55FFFF', '#FFD700', '#FF55FF'],

    // ── Mythic: the prismatic cycle, confined to the cool band ────────────────
    // Mythic has always shimmered rather than sat on one colour, and it keeps
    // that. What changed is where it is allowed to travel: the cycle used to run
    // aqua -> purple -> gold, and after the ladder was rebuilt those last two
    // stops are *other tiers* — purple is exotic and gold is legendary. A mythic
    // tile spent two thirds of every cycle wearing another tier's colour, which
    // was caught in review with two mythic tiles sitting magenta in one frame and
    // aqua in the next.
    //
    // The replacement stays multi-hue, so it still reads as a shimmer and not a
    // pulse, but every stop is in the cool blue-green band that no other tier
    // owns: aqua, azure, teal. Teal is far enough from recursion's #00FF00 matrix
    // green, which is a spin mode rather than a tier in any case.
    mythicCycle: ['#55FFFF', '#2E86FF', '#3BE8B0', '#55FFFF'],
};
