/**
 * FIB Stats — design tokens ("The Artifact Record")
 *
 * Stats carries its own identity within FIB, the way the Wheel does. It is
 * deliberately NOT the wiki's amber/Barlow-Condensed system: those pages are
 * documentation, and a stats module that looks like documentation reads as one
 * more doc page rather than a record of what you did.
 *
 * The reference is a museum vitrine, not a dashboard: a near-black field, an
 * object lit from above sitting on a plinth, and metadata set quietly beneath
 * it. Four rules govern everything downstream:
 *
 *  1. DARKNESS IS THE FIELD, ACCENTS ARE PLACED. `void` covers almost every
 *     pixel. Gold, diamond and emerald each mean exactly one thing and are
 *     never used decoratively — a gold pixel that isn't about rank is a bug.
 *
 *  2. THE NUMBER IS THE DISPLAY TYPE. There is no display face. Words are set
 *     in a tight grotesk at UI sizes; digits are set in tabular mono at up to
 *     4.25rem and carry the entire hierarchy. `12,438` at 68px against
 *     near-black IS the headline.
 *
 *  3. DEPTH IS LIGHTNESS, AND LIGHT FALLS DOWNWARD. Surfaces step up the L
 *     axis (0.148 -> 0.178 -> 0.228 -> 0.272). No blur, no translucent glass.
 *     Objects sit in `sunk` wells with a lit top edge so a 16x16 sprite reads
 *     as a thing on a shelf rather than an icon in a void.
 *
 *  4. RARER IS LITERALLY BRIGHTER. The rarity ramp climbs monotonically in
 *     lightness (0.690 -> 0.740 -> 0.802 -> 0.845 -> 0.886) so rarity is
 *     readable from luminance alone, which means it survives greyscale and
 *     colour blindness both. The HUES are not a design choice — they are the
 *     plugin's `Rarity.java` colours, because the tier is a thing the player
 *     saw in chat before they saw it here. See the `rarity` block.
 *
 * Every value below is OKLCH and was verified in-gamut, and every ink and
 * accent clears WCAG AA (>=4.5:1) as text against ALL FOUR surface steps.
 * The floor is `ink-3` at 5.00:1 on `plinth-2`. Do not lower an ink lightness
 * or raise a surface lightness without re-running that check — the two ends of
 * the ramp sit closer together than they look.
 */

export const tokens = {
  color: {
    /*
     * Surfaces. The brief specified #060708 / #101214, and at full page scale
     * those read as a void rather than a room — objects had nothing to sit
     * against. The whole ladder is lifted ~0.05 L from those values, keeping
     * every step relationship intact: still unmistakably a dark room, but one
     * with a floor.
     */
    sunk: 'oklch(0.148 0.005 250)',
    void: 'oklch(0.178 0.005 250)',
    plinth: 'oklch(0.228 0.006 250)',
    plinth2: 'oklch(0.272 0.007 250)',
    line: 'oklch(0.320 0.008 250)',
    lineSoft: 'oklch(0.262 0.007 250)',

    /* Ink, lifted with the surfaces so the reading hierarchy keeps its spacing
       instead of collapsing toward the now-lighter field. */
    ink: 'oklch(0.970 0.002 250)',
    ink2: 'oklch(0.780 0.012 260)',
    ink3: 'oklch(0.670 0.013 255)',

    /* Accents. One meaning each, no exceptions. */
    gold: 'oklch(0.800 0.140 85)',       // rank, victory, prestige. Podium only.
    diamond: 'oklch(0.830 0.100 200)',   // rarity, exceptional, the top of a ramp
    emerald: 'oklch(0.780 0.130 155)',   // wins, positive delta
    netherite: 'oklch(0.672 0.016 285)', // technical metadata: seeds, IDs, timestamps

    /* Dark ink for use ON gold/diamond/emerald fills. */
    onAccent: 'oklch(0.140 0.010 250)',
    /* Hover step for the diamond primary action — one lightness step up. */
    diamondHi: 'oklch(0.870 0.100 200)',

    /*
     * Interactive blue — the CSFloat-inspired layer, added deliberately.
     *
     * The original brief held that this module had NO single primary accent:
     * gold, diamond and emerald each carry a meaning and interactive chrome
     * borrowed diamond. That was a compromise — "clickable" and "rare" are not
     * the same idea, and diamond was doing two jobs. Blue now owns the one job
     * nothing owned cleanly: "this is interactive." It signals links, the active
     * nav item, the match scrubber, primary buttons and the focus ring, and
     * NOTHING about rank (gold), rarity (diamond) or wins (emerald), which keep
     * their meanings untouched. `#237bff`, the CSFloat signature, converted to
     * OKLCH and verified in-gamut.
     *
     * `blue` is the fill (buttons, focus, meters); `blueInk` is the lighter step
     * used when blue is TEXT on the dark field, where the fill is too dark to
     * clear 4.5:1. `blueTint` is the 15% wash for active/hover backgrounds.
     */
    blue: 'oklch(0.585 0.20 258)',
    blueHi: 'oklch(0.655 0.185 258)',
    blueInk: 'oklch(0.720 0.150 250)',
    blueTint: 'oklch(0.585 0.20 258 / 0.15)',
    focus: 'oklch(0.585 0.20 258)',

    /*
     * Glass + gloss — the second deliberate override. The brief banned blur and
     * translucent glass; it is now permitted, SCOPED to floating action controls
     * layered over sprite art (exactly CSFloat's use), never as a decorative
     * panel. `glossTop` is the top-edge highlight that makes a surface read as a
     * lit card rather than a flat fill.
     */
    glassBg: 'oklch(0.210 0.006 250 / 0.55)',
    glassBorder: 'oklch(1 0 0 / 0.12)',
    glossTop: 'oklch(1 0 0 / 0.06)',

    negative: 'oklch(0.720 0.110 25)',

    /*
     * Match-phase colours, for the item index — which phase of a match an item
     * can start coming up in. Green / yellow / red, the same EARLY→MID→LATE
     * ramp the ItemPools pages use, so an item reads the same in both places.
     * Assigned from ITEM_STATE (vendored from the plugin), never guessed.
     */
    phaseEarly: 'oklch(0.720 0.170 148)',
    phaseMid: 'oklch(0.830 0.150 95)',
    phaseLate: 'oklch(0.640 0.200 27)',
    /* Text-on-dark step for LATE, the blue/blueInk split applied to phase: the
       fill red (0.640) is a lit tone-line/bleed colour but only clears ~4.05:1
       as small text on plinth-2, under the module's 4.5 floor. This lighter red
       reads as the same phase but passes (4.67:1). EARLY and MID already clear
       it as text (6.4 / 8.9), so only LATE needs the split. */
    phaseLateInk: 'oklch(0.675 0.190 27)',

    /*
     * Podium metals. Universal rather than FIB-specific, and the only place in
     * the module a coloured glow is allowed. `medalGold` is deliberately the
     * same value as `gold`: first place and the rank accent are the same idea,
     * so they are the same colour by construction, not by coincidence.
     */
    medalGold: 'oklch(0.800 0.140 85)',
    medalSilver: 'oklch(0.780 0.008 250)',
    medalBronze: 'oklch(0.660 0.075 55)',

    /*
     * Shadow blacks. Wells and plinths cast real shadow; keeping the three
     * depths named stops them drifting into arbitrary alphas per component.
     */
    shadowSoft: 'oklch(0 0 0 / 0.40)',
    shadowMid: 'oklch(0 0 0 / 0.50)',
    shadowDeep: 'oklch(0 0 0 / 0.60)',

    /* Lit-from-above edges. Depth is lightness; these are the highlight, never
       a glass border that emits its own colour. */
    edge: 'oklch(1 0 0 / 0.055)',
    edgeStrong: 'oklch(1 0 0 / 0.11)',

    /* De-emphasised chart geometry. Still >=3:1 on `void` (3.43:1), because a
       chart line is a non-text graphical object and has a contrast floor too. */
    traceDim: 'oklch(0.520 0.012 250)',
  },

  /**
   * Ordinal rarity ramp, lowest tier first.
   *
   * THE HUES ARE NOT OURS TO CHOOSE. A back-to-back is announced in chat by the
   * plugin before it is ever a row on this site, and `Rarity.java` fixes what
   * colour each tier is:
   *
   *   RARE          <blue>                        #5555FF   h 275
   *   EPIC          <dark_purple>                 #AA00AA   h 328
   *   LEGENDARY     <gold>                        #FFAA00   h 73
   *   RNGESUS       <gradient:#E41EBC:#9A4992>              h 339
   *   EXTRAORDINARY <gradient:#73FF00:#14C8FF>              h 137 -> 227
   *
   * Each tier below takes the plugin's hue. The two gradient tiers collapse to
   * their FIRST stop, because a `--tier` value feeds `color-mix()` and
   * `box-shadow` as well as text and has to stay a single colour — the first
   * stop is also the one the eye reads the label as.
   *
   * *This ramp previously walked hue 250 -> 300 -> 55 -> 195 -> 160, chosen so
   * no two adjacent tiers sat on adjacent hues.* It was internally elegant and
   * wrong: it painted RNGesus cyan and Extraordinary mint, so the pull that
   * lights the server up magenta in chat arrived here as the same colour as the
   * diamond accent. A player checking a match they played needs the tier to be
   * the colour they just saw. Hue answers to the plugin now; the rest of the
   * ramp's construction still answers to rule 4.
   *
   * Lightness still climbs monotonically (0.690 -> 0.886) so rarity survives
   * greyscale, and every tier still clears the module's 5.0:1 floor as text on
   * all four surfaces (worst: RARE at 5.24 on plinth-2). Where the plugin's
   * colour is too dark to clear that floor — #5555FF is 2.94:1, #AA00AA 2.34:1
   * — the hue is kept and the lightness lifted to the ramp's step, with chroma
   * taken as high as sRGB allows there. LEGENDARY needs no lifting: #FFAA00 is
   * already L 0.802 and lands on its own step.
   *
   * The cost of that faithfulness, accepted knowingly: LEGENDARY now sits 12
   * hue degrees off `gold`, the rank accent (rule 1 wanted rarity to stay clear
   * of it — but the plugin calls the tier `<gold>`, so the game conflated them
   * first), and EXTRAORDINARY sits near `emerald`/`phaseEarly`. Both are held
   * apart by chroma: the rarity tiers are the loudest colours in the module,
   * which is the one place the Earned Glow Rule already allows spectacle.
   *
   * RNGesus is the one tier that reads softer than in-game. #E41EBC is a vivid
   * magenta at L 0.630; the tier sits ABOVE legendary on the lightness ramp, and
   * sRGB has no bright saturated pink (max chroma at L 0.845, h 339 is 0.117).
   * Hue is right, intensity is capped by the gamut, not by taste.
   */
  rarity: {
    RARE: 'oklch(0.690 0.150 275)',
    EPIC: 'oklch(0.740 0.220 328)',
    LEGENDARY: 'oklch(0.802 0.168 73)',
    RNGESUS: 'oklch(0.845 0.112 339)',
    EXTRAORDINARY: 'oklch(0.886 0.250 137)',
  },

  /**
   * Race lanes. The one place hue is assigned arbitrarily rather than
   * meaningfully — a race chart where every competitor is the same colour is a
   * spec sheet, not a race. Every value sits at L 0.70–0.82 so all lanes read
   * equally against the dark track, and RaceTrace pairs these with dash
   * patterns so colour is never the only differentiator.
   */
  race: [
    'oklch(0.80 0.10 200)', // diamond
    'oklch(0.80 0.14 85)',  // gold
    'oklch(0.78 0.13 155)', // emerald
    'oklch(0.74 0.14 300)', // violet
    'oklch(0.76 0.15 30)',  // ember
    'oklch(0.78 0.09 250)', // steel
    'oklch(0.82 0.11 130)', // lime
    'oklch(0.74 0.12 340)', // rose
  ],

  font: {
    /* One grotesk for every word. Inter is the product-register default and
       ships a true tabular figure set; the stack degrades to system UI faces
       that also have one. No display face — see rule 2 in the header. */
    sans: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    /* Every digit in the module. Loaded, not merely stacked, because the
       fallback chain's metrics differ enough to change layout. */
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },

  /** Fixed rem scale, ratio ~1.2. Product UI: no fluid type on chrome. */
  size: {
    '2xs': '0.6875rem',  // 11px — micro labels, table units
    xs: '0.75rem',       // 12px — labels, metadata
    sm: '0.8125rem',     // 13px — dense table body
    md: '0.875rem',      // 14px — secondary body
    base: '0.9375rem',   // 15px — body
    lg: '1.125rem',      // 18px — card titles
    xl: '1.375rem',      // 22px — section headings
    '2xl': '1.75rem',    // 28px — small figures
    '3xl': '2.25rem',    // 36px — figures
    '4xl': '3rem',       // 48px — large figures
    '5xl': '4.25rem',    // 68px — the hero figure. The ceiling.
  },

  space: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '24px', 6: '32px', 7: '48px', 8: '72px' },
  radius: { sm: '3px', md: '6px', lg: '10px', xl: '16px', pill: '999px' },

  /** Semantic stack. Never arbitrary values. */
  z: { base: 0, sticky: 10, rail: 20, dropdown: 30, backdrop: 40, modal: 50, toast: 60, tooltip: 70 },

  motion: {
    fast: '120ms',
    base: '180ms',
    slow: '260ms',
    count: 640,                                // ms, JS-driven count-ups
    ease: 'cubic-bezier(0.22, 1, 0.36, 1)',    // ease-out-quint
  },
};

/**
 * Ordinal, lowest tier first. `data.js` imports this to fold member rarities
 * into team totals, so the order and the casing are a contract, not a detail.
 */
export const RARITY_KEYS = ['RARE', 'EPIC', 'LEGENDARY', 'RNGESUS', 'EXTRAORDINARY'];

/** Tier key -> the field name it occupies on a FibRarities payload. */
export const RARITY_FIELDS = {
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
  RNGESUS: 'rngesus',
  EXTRAORDINARY: 'extraordinary',
};

/** Kept as an alias so either name resolves. */
export const RARITY_ORDER = RARITY_KEYS;

/** The CSS custom property carrying a rarity tier's colour. */
export const rarityColor = (tier) => `var(--fib-rarity-${String(tier).toLowerCase()})`;

export const RARITY_LABEL = {
  RARE: 'Rare',
  EPIC: 'Epic',
  LEGENDARY: 'Legendary',
  RNGESUS: 'RNGesus',
  EXTRAORDINARY: 'Extraordinary',
};

/**
 * Item sprites, served from this app's own origin.
 *
 * These are vendored out of the FIB resource pack by
 * `scripts/vendor-textures.mjs` into `public/fib-items/`. They are NOT loaded
 * from raw.githubusercontent.com any more: that host sends
 * `cache-control: max-age=300` and throttles, so every sprite on the item
 * index revalidated every five minutes. Re-run the script after adding items
 * to the pool.
 *
 * `ITEM_TEXTURE_FALLBACK` covers items that exist in the data but were never
 * vendored (the pack has ~1,500 textures; only the ones the app can actually
 * render are shipped). Sprite renders swap to it on error rather than showing
 * a broken image.
 */
export const ITEM_TEXTURE_BASE = '/fib-items';

export const ITEM_TEXTURE_FALLBACK =
  'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/fib';

/**
 * Source textures are 128x128 (8x upscales of the 16x16 originals), so display
 * sizes are restricted to exact integer downscales. Nearest-neighbour at a
 * fractional ratio drops source pixels unevenly and makes pixel art look
 * chewed. Anything that renders a sprite picks from this set.
 */
export const SPRITE_SIZES = [16, 32, 64, 128];

export const spriteSize = (px) =>
  SPRITE_SIZES.reduce((best, s) => (Math.abs(s - px) < Math.abs(best - px) ? s : best), 128);

/** Emitted once into :root by styles.js. */
export function cssVariables() {
  const lines = [
    ...Object.entries(tokens.color).map(([k, v]) => `  --fib-${kebab(k)}: ${v};`),
    ...Object.entries(tokens.rarity).map(([k, v]) => `  --fib-rarity-${k.toLowerCase()}: ${v};`),
    ...tokens.race.map((v, i) => `  --fib-race-${i}: ${v};`),
    `  --fib-font-sans: ${tokens.font.sans};`,
    `  --fib-font-mono: ${tokens.font.mono};`,
    ...Object.entries(tokens.size).map(([k, v]) => `  --fib-text-${k}: ${v};`),
    ...Object.entries(tokens.space).map(([k, v]) => `  --fib-space-${k}: ${v};`),
    ...Object.entries(tokens.radius).map(([k, v]) => `  --fib-radius-${k}: ${v};`),
    ...Object.entries(tokens.z).map(([k, v]) => `  --fib-z-${k}: ${v};`),
    `  --fib-motion-fast: ${tokens.motion.fast};`,
    `  --fib-motion-base: ${tokens.motion.base};`,
    `  --fib-motion-slow: ${tokens.motion.slow};`,
    `  --fib-ease: ${tokens.motion.ease};`,
  ];
  return lines.join('\n');
}

/**
 * `ink2` must emit `--fib-ink-2`, not `--fib-ink2`. Breaking only on capitals
 * silently produced token names no stylesheet referenced, so every
 * `var(--fib-ink-3)` resolved to nothing: muted text fell back to full ink and
 * SVG `fill` — which has no inherit fallback — painted black.
 */
function kebab(s) {
  return s
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .toLowerCase();
}
