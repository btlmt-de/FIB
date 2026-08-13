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
