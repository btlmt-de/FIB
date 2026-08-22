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

/**
 * The three bonus events' identities, in one place.
 *
 * There were three hand-maintained copies of this and all three had drifted:
 * `EVENT_COLORS` in CanvasBonusStrip (the board), `EVENT_IDENTITY` in
 * BonusEventPlaque (the answer), and `modeAccent` in WheelSpinner (the band and
 * its lamp while the mode runs). A player met the same event three times and was
 * told three different colours — the board promised gold for a triple-lucky, the
 * plaque agreed, and then the spin arrived under a green lamp. It is the same
 * failure the rarity ladder was consolidated to stop, one surface over.
 *
 * `color` is the identity — the tile's wash, the plaque's rail, the label. It
 * MUST equal the accent the mode executes under, because those are the same
 * event seen twice. `iconColor` differs only where an identity is literally
 * two-colour: DESIGN.md §8 defines the triple-lucky as "green with a gold
 * crown", so the crown is the one gold thing on a green sign.
 *
 * Icons themselves are not here: the board strokes canvas paths and the plaque
 * renders Lucide components, and there is no shared representation of a glyph
 * that both can take. They agree by drawing the same three shapes — Zap for the
 * lucky family, Layers for the 5x's parallel lines, Crown for triple lucky.
 */
export const BONUS_IDENTITY = {
    lucky_spin: { color: COLORS.green, iconColor: COLORS.green },
    triple_spin: { color: COLORS.gold, iconColor: COLORS.gold },
    triple_lucky_spin: { color: COLORS.green, iconColor: COLORS.gold },
    // Recursion is not a bonus event — it is a global one, triggered by a pull
    // rather than selected by the board — but it is answered by the same
    // signboard and runs the band under the same kind of lamp, so its identity
    // belongs in the same table. The alternative is a fifth private copy of a
    // colour, which is the failure this table was created to end.
    recursion: { color: COLORS.recursion, iconColor: COLORS.recursion },
};

export const BONUS_IDENTITY_FALLBACK = { color: COLORS.orange, iconColor: COLORS.orange };

/**
 * THE NOCTURNE's material grain — wet-night micro-glitter, as SVG noise.
 *
 * "Light is the material": a material is felt, a pattern is seen, so every use
 * renders this at ≤4% baked-in alpha, on the page field and on the plinth
 * furniture (the status console, the stage flanks, the milestone meter). It is
 * the grain of wet asphalt and milled concrete catching the street light —
 * never a texture to look at. At legible opacity it would be this surface's
 * poster-texture failure, the same mistake as a visible scanline or a grid:
 * something drawn on the world instead of the world being there.
 *
 * One URI, tuned once, so the whole surface shares one material. Static by
 * definition — nothing here may animate; the Ambient-Off Rule freezes motion,
 * never material.
 */
export const SURFACE_NOISE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;

/**
 * THE NOCTURNE's deck, as tokens.
 *
 * The blue-hour ramp (#0d1322 -> #0a0d18 -> #05060a), the rail light
 * (rgba(206,214,236,a)) and the sky light are the most reused values on this
 * whole surface, and until now every one of them was a literal. DESIGN.md counts
 * the rail light alone at 25 uses across 5 files and states the Named-Or-Nothing
 * Rule about exactly this: a colour that appears in more than one file is a
 * token or a bug.
 *
 * This names them. It deliberately does NOT sweep the six files that already
 * spell them by hand — that is a mechanical pass across the canvases and the
 * effects tree, and burying it inside a redesign is how a refactor stops being
 * reviewable. New work takes the tokens; the sweep is owed separately.
 *
 * `rail(alpha)` is a function rather than a scale because the value is always
 * spent translucent and the alpha is the whole decision: 0.06 for a seam between
 * two neighbours, 0.10 for a lit top edge, 0.20 for a front lip. Three steps in
 * practice, but the call site is where the edge is being described, so it is the
 * call site that should say which edge it is.
 */
export const rail = alpha => `rgba(206,214,236,${alpha})`;

export const DECK = {
    // The band's own ground, top to curb.
    faceTop: '#0d1322',
    faceMid: '#0a0d18',
    faceDeep: '#05060a',

    /** A plinth's material: the deck's ramp under the surface's shared grain. */
    plinth: `${SURFACE_NOISE}, linear-gradient(180deg, #0d1322 0%, #0a0d18 100%)`,
    /** The board's own face — deeper, because things stand on it. */
    face: `${SURFACE_NOISE}, linear-gradient(180deg, #0d1322 0%, #0a0d18 46%, #05060a 100%)`,

    /** Blue-hour sky light, falling from the top of a surface. */
    sky: 'rgba(148,168,212,0.06)',
    /** Station amber pooling up from a floor. */
    amberWash: 'rgba(255,183,94,0.07)',

    // Station amber is the board's chrome and its one signal colour. It is the
    // surface's existing gold (COLORS.gold) named for the job it does here, so
    // the board and the band's centre line are literally the same lamp.
    amber: COLORS.gold,

    // The board's ink ladder. Measured on #0a0d18: 15.9:1, 8.6:1, 5.2:1.
    ink: '#E8ECF6',
    inkMid: '#A8B0C6',
    inkDim: '#7C859C',
};
