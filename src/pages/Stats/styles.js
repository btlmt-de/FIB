/**
 * FIB Stats — stylesheet ("The Artifact Record")
 *
 * Injected once, imperatively, because this module drops into an app with no
 * CSS pipeline of its own (no CSS modules, no Tailwind — the wiki pages use
 * inline styles). Everything is namespaced under `.fib` so it cannot leak into
 * pages that render in the same document.
 *
 * Structure, top to bottom:
 *   1. reset, scoped
 *   2. shell (atmosphere, rail, main, page)
 *   3. type + section furniture
 *   4. objects (well, sprite, avatar, medal)
 *   5. figures — the mono numerals that carry the hierarchy
 *   6. controls
 *   7. tables + rows
 *   8. charts
 *   9. achievements + rarity + the trophy case
 *  10. states (skeleton, empty)
 *  11. motion + reduced motion
 *  12. views (overview, profile, ledger, match detail)
 *  13. match inventory
 *  14. responsive
 */

import { cssVariables, tokens } from './tokens.js';

/**
 * Fonts load as <link> rather than @import so they resolve in parallel with
 * the stylesheet instead of after it. `display=swap` means text paints in the
 * fallback immediately — a stats page that shows nothing until a webfont lands
 * is a stats page nobody reads.
 */
const FONT_HREF =
  'https://fonts.googleapis.com/css2' +
  '?family=Inter:wght@400;500;600;700' +
  '&family=JetBrains+Mono:wght@400;500;700' +
  '&display=swap';

export const css = `
:root {
${cssVariables()}
}

/* ── 1. Reset, scoped ─────────────────────────────────────────────────── */

.fib, .fib *, .fib *::before, .fib *::after { box-sizing: border-box; }

.fib {
  --rail: 232px;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--fib-void);
  color: var(--fib-ink);
  font-family: var(--fib-font-sans);
  font-size: var(--fib-text-base);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-synthesis-weight: none;
}

/*
 * The reset is wrapped in :where() so it contributes ZERO specificity.
 *
 * Written plainly, ".fib a { color: inherit }" scores (0,1,1) and quietly beats
 * every single-class component rule like ".fib-skip-link" (0,1,0). That is not
 * hypothetical: it made the skip link render white-on-white — invisible to the
 * exact keyboard user it exists for — and put ink-coloured text on the diamond
 * primary button. A reset must never outrank the components it resets.
 */
:where(.fib) :where(h1, h2, h3, h4, p, figure, ul, ol) { margin: 0; padding: 0; }
:where(.fib) :where(ul, ol) { list-style: none; }
:where(.fib) :where(button) { font: inherit; color: inherit; background: none; border: none; cursor: pointer; }
:where(.fib) :where(a) { color: inherit; text-decoration: none; }
:where(.fib) :where(img) { display: block; max-width: 100%; }
:where(.fib) :where(table) { border-collapse: collapse; width: 100%; }

/* One focus ring everywhere. Diamond, because gold means rank. */
.fib :focus-visible {
  outline: 2px solid var(--fib-focus);
  outline-offset: 2px;
  border-radius: var(--fib-radius-sm);
}
.fib :focus:not(:focus-visible) { outline: none; }

.fib-skip-link {
  position: absolute; left: var(--fib-space-4); top: var(--fib-space-4);
  z-index: var(--fib-z-toast);
  padding: 10px 16px; border-radius: var(--fib-radius-md);
  background: var(--fib-ink); color: var(--fib-void);
  font-size: var(--fib-text-sm); font-weight: 600;
  transform: translateY(-200%);
}
.fib-skip-link:focus { transform: none; }

.fib-sr {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

/* ── 2. Shell ─────────────────────────────────────────────────────────── */

.fib-shell { display: flex; min-height: 100vh; min-height: 100dvh; position: relative; }

/*
 * The room light. A single faint spotlight falling from the top of the page —
 * the same "lit from above" language as the wells, extended from the objects
 * to the room they sit in. Fixed, so it reads as the room rather than the
 * content; faint enough that it never competes with a lit rim.
 */
.fib-atmosphere {
  position: fixed; inset: 0 0 auto 0; height: 480px;
  z-index: var(--fib-z-base);
  pointer-events: none;
  background: radial-gradient(58% 100% at 50% 0%, oklch(1 0 0 / 0.045), transparent 72%);
}

.fib-main { flex: 1 1 auto; min-width: 0; position: relative; z-index: 1; }

.fib-rail {
  position: sticky; top: 0; align-self: flex-start;
  z-index: var(--fib-z-rail);
  width: var(--rail); flex: 0 0 var(--rail);
  height: 100vh; height: 100dvh;
  display: flex; flex-direction: column;
  padding: var(--fib-space-5) var(--fib-space-4);
  background: var(--fib-void);
  border-right: 1px solid var(--fib-line-soft);
}

.fib-rail-brand {
  display: flex; align-items: baseline; gap: 8px;
  padding: 0 var(--fib-space-3) var(--fib-space-5);
}
.fib-rail-brand b { font-size: var(--fib-text-md); font-weight: 700; letter-spacing: -0.01em; }
.fib-rail-brand span {
  font-family: var(--fib-font-mono);
  font-size: var(--fib-text-2xs); color: var(--fib-netherite);
  letter-spacing: 0.04em;
}

.fib-rail-nav { display: flex; flex-direction: column; gap: 2px; }

.fib-nav-item {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 9px var(--fib-space-3);
  border-radius: var(--fib-radius-md);
  font-size: var(--fib-text-md); font-weight: 500;
  color: var(--fib-ink-2);
  transition: background var(--fib-motion-fast) var(--fib-ease),
              color var(--fib-motion-fast) var(--fib-ease);
}
.fib-nav-item:hover { background: var(--fib-plinth); color: var(--fib-ink); }
.fib-nav-item[aria-current="page"] {
  background: var(--fib-plinth-2); color: var(--fib-ink); font-weight: 600;
}
.fib-nav-item svg { flex: none; opacity: 0.7; }
.fib-nav-item[aria-current="page"] svg { opacity: 1; }

.fib-rail-foot { margin-top: auto; padding-top: var(--fib-space-5); }

.fib-exit {
  display: flex; align-items: center; gap: 8px;
  padding: 8px var(--fib-space-3); border-radius: var(--fib-radius-md);
  font-size: var(--fib-text-sm); color: var(--fib-netherite);
  transition: color var(--fib-motion-fast) var(--fib-ease);
}
.fib-exit:hover { color: var(--fib-ink-2); }

/*
 * Named container. The rail is 232px on desktop and gone below 900px, so the
 * width a strip or a table actually gets is not a function of the viewport —
 * two viewports 100px apart can hand the same section wildly different room.
 * Anything inside that needs to reflow measures THIS, not the window.
 */
.fib-page {
  max-width: 1180px; margin: 0 auto;
  padding: var(--fib-space-7) var(--fib-space-6) var(--fib-space-8);
  container: fib-page / inline-size;
}

/* ── 3. Type + section furniture ──────────────────────────────────────── */

.fib-h1 {
  font-size: var(--fib-text-xl); font-weight: 700;
  letter-spacing: -0.02em; line-height: 1.15; text-wrap: balance;
}
.fib-h2 {
  font-size: var(--fib-text-lg); font-weight: 600;
  letter-spacing: -0.015em; line-height: 1.25; text-wrap: balance;
}
/* "display: block" because the lede is sometimes a <span> — inside a <button>,
   whose content model admits phrasing content only. */
.fib-lede {
  display: block;
  color: var(--fib-ink-2); font-size: var(--fib-text-md);
  max-width: 62ch; text-wrap: pretty;
}
.fib-meta {
  font-family: var(--fib-font-mono);
  font-size: var(--fib-text-2xs); color: var(--fib-netherite);
  letter-spacing: 0.02em; font-variant-numeric: tabular-nums;
}
.fib-label {
  font-size: var(--fib-text-xs); font-weight: 500;
  color: var(--fib-ink-3); letter-spacing: 0.01em;
}

/*
 * Sections are separated by a rule and space, not by being boxed. Boxing every
 * section is what turns a record into a dashboard.
 */
.fib-section { padding-top: var(--fib-space-8); }

/*
 * Scoped to the page's own first section. Written as a bare
 * ".fib-section:first-child" it also matched the first section inside any
 * nested layout — which is how the Overview's two side-by-side lists ended up
 * 72px out of alignment with each other.
 */
.fib-page > .fib-section:first-child { padding-top: 0; }

.fib-section-head {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: var(--fib-space-4); flex-wrap: wrap;
  padding-bottom: var(--fib-space-4);
  margin-bottom: var(--fib-space-5);
  border-bottom: 1px solid var(--fib-line-soft);
}
.fib-section-head p { color: var(--fib-ink-3); font-size: var(--fib-text-sm); }

/* A sub-grouping inside a section: a quiet label with a rule running out. */
.fib-subhead {
  display: flex; align-items: center; gap: var(--fib-space-3);
  margin: var(--fib-space-6) 0 var(--fib-space-4);
  font-size: var(--fib-text-sm); font-weight: 600;
  color: var(--fib-ink-2); letter-spacing: -0.005em;
}
.fib-subhead::after { content: ''; flex: 1; height: 1px; background: var(--fib-line-soft); }

/* A boxed surface, for the few places one is genuinely the right affordance. */
.fib-panel {
  background: var(--fib-plinth);
  border: 1px solid var(--fib-line-soft);
  border-radius: var(--fib-radius-lg);
  padding: var(--fib-space-5);
}
.fib-panel--flush { padding: 0; overflow: hidden; }

/* ── 4. Objects: wells, sprites, avatars, medals ──────────────────────── */

/*
 * The well is the module's signature: a recess cut into the surface, lit from
 * above, so a 16x16 sprite reads as an object on a shelf rather than an icon
 * floating in a void. Inset shadow, not a drop shadow — the object is IN the
 * surface.
 */
.fib-well {
  display: grid; place-items: center;
  /*
   * Lit from above and a step LIGHTER than the field it sits on.
   *
   * This was flat sunk — darker than the page — which turned every sprite
   * surface into a black square and left dark items (blackstone, basalt,
   * crimson hyphae) with nothing to read against. A Minecraft slot is lighter
   * than its panel for exactly this reason, so the authentic reference and the
   * legibility fix point the same way.
   *
   * The vitrine metaphor survives: the object is still lit from above and
   * seated by the shadow along its bottom edge. It sits ON a plinth rather
   * than IN a pit.
   */
  background: linear-gradient(var(--fib-plinth-2), var(--fib-plinth));
  border-radius: var(--fib-radius-md);
  box-shadow: inset 0 1px 0 0 var(--fib-edge-strong),
              inset 0 -1px 0 0 var(--fib-shadow-soft);
  transition: box-shadow var(--fib-motion-base) var(--fib-ease),
              background var(--fib-motion-base) var(--fib-ease);
}

/*
 * Rarity on the rim of a well. Shared by inventory slots and any other sprite
 * that knows its tier, so the five-tier ramp reads the same everywhere instead
 * of living only in an 11px badge off to one side.
 */
.fib-well[data-tier] {
  box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--tier) 60%, transparent),
              inset 0 1px 0 0 var(--fib-edge-strong),
              inset 0 -1px 0 0 var(--fib-shadow-soft);
}

/*
 * The Earned Glow Rule allows exactly this: the top two tiers are the moments
 * the game itself treats as a reward, so they get an outer bloom. Nothing
 * below RNGesus does.
 */
.fib-well[data-tier="RNGESUS"],
.fib-well[data-tier="EXTRAORDINARY"] {
  box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--tier) 80%, transparent),
              0 0 12px -2px color-mix(in oklch, var(--tier) 55%, transparent),
              inset 0 1px 0 0 var(--fib-edge-strong);
}

.fib-sprite {
  image-rendering: pixelated;
  /*
   * Two shadows, pulling in opposite directions, because the sprite set spans
   * both ends of the luminance range and the well is dark.
   *
   * The dark drop-shadow seats light items (clay, end stone) on the surface.
   * The tight light halo is what rescues the dark ones: blackstone_wall renders
   * at a mean luminance of 21 against a slot interior of 29-39 — measured, not
   * guessed — which is roughly 1.2:1 and simply invisible. A 1px rim of light
   * separates it without touching the item's own colours, and reads as the
   * same "lit from above" language as the wells themselves.
   */
  filter: drop-shadow(0 1px 2px var(--fib-shadow-deep))
          drop-shadow(0 0 1px oklch(1 0 0 / 0.55));
  transition: transform var(--fib-motion-base) var(--fib-ease);
}

.fib-avatar {
  image-rendering: pixelated;
  border-radius: var(--fib-radius-sm);
  background: var(--fib-plinth-2);
  flex: none;
}

/*
 * Rank medals: the only place gold, silver and bronze appear, and the only
 * coloured glow in the module. A podium position is the one thing here that is
 * supposed to feel like a reward.
 */
.fib-medal {
  display: inline-grid; place-items: center;
  width: 26px; height: 26px; flex: none;
  border-radius: var(--fib-radius-pill);
  font-family: var(--fib-font-mono);
  font-size: var(--fib-text-xs); font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--fib-on-accent);
}
.fib-medal[data-place="1"] { background: var(--fib-medal-gold);   box-shadow: 0 0 16px -2px color-mix(in oklch, var(--fib-medal-gold) 55%, transparent); }
.fib-medal[data-place="2"] { background: var(--fib-medal-silver); box-shadow: 0 0 14px -3px color-mix(in oklch, var(--fib-medal-silver) 40%, transparent); }
.fib-medal[data-place="3"] { background: var(--fib-medal-bronze); box-shadow: 0 0 14px -3px color-mix(in oklch, var(--fib-medal-bronze) 40%, transparent); }
.fib-medal[data-place="0"] {
  background: none; color: var(--fib-netherite);
  box-shadow: inset 0 0 0 1px var(--fib-line);
}

/* ── 5. Figures — the numerals that carry the hierarchy ───────────────── */

.fib-figure { display: flex; flex-direction: column; gap: 2px; min-width: 0; }

.fib-figure-value {
  font-family: var(--fib-font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 500; line-height: 1; letter-spacing: -0.03em;
  color: var(--fib-ink);
  display: flex; align-items: baseline; gap: 0.18em;
}
.fib-figure-unit {
  font-size: 0.42em; font-weight: 400; letter-spacing: 0;
  color: var(--fib-ink-3);
}
/* 0.42em of an 18px figure is 7.5px, which is not a size type can be read at.
   Small figures carry their unit proportionally larger so it lands on the
   module's 11px floor instead. */
.fib-figure[data-size="sm"] .fib-figure-unit { font-size: 0.62em; }
.fib-figure-label {
  font-size: var(--fib-text-xs); font-weight: 500;
  color: var(--fib-ink-3); letter-spacing: 0.01em;
}
.fib-figure-note {
  font-family: var(--fib-font-mono);
  font-size: var(--fib-text-2xs); color: var(--fib-netherite);
  font-variant-numeric: tabular-nums;
}

.fib-figure[data-size="hero"] .fib-figure-value { font-size: var(--fib-text-5xl); font-weight: 700; }
.fib-figure[data-size="xl"]   .fib-figure-value { font-size: var(--fib-text-4xl); font-weight: 600; }
.fib-figure[data-size="lg"]   .fib-figure-value { font-size: var(--fib-text-3xl); }
.fib-figure[data-size="md"]   .fib-figure-value { font-size: var(--fib-text-2xl); }
.fib-figure[data-size="sm"]   .fib-figure-value { font-size: var(--fib-text-lg); }

/*
 * A figure's size is a function of the box it is in, not of the viewport.
 *
 * The strips below ("fib-pulse", "fib-stat-strip") are flex rows: their items
 * narrow continuously between the point the rail collapses and the point the
 * strip wraps, and the viewport width says nothing useful about how much room
 * any one figure actually got. Seven digits of tabular mono measure ~4em
 * (0.6em advance less the -0.03em tracking), so a 36px numeral needs 144px of
 * content box. "842,190" in a 123px box is what shipped: the digits crossed
 * the divider into the next figure.
 *
 * Each figure is therefore its own container and steps down its own numeral.
 * The thresholds ARE the arithmetic above — 144px for 3xl, 112px for 2xl —
 * not round numbers picked to look tidy.
 */
@container fib-figure (max-width: 191px) {
  .fib-figure[data-size="xl"] .fib-figure-value { font-size: var(--fib-text-3xl); }
}
@container fib-figure (max-width: 143px) {
  .fib-figure[data-size="xl"] .fib-figure-value,
  .fib-figure[data-size="lg"] .fib-figure-value { font-size: var(--fib-text-2xl); }
  .fib-figure[data-size="md"] .fib-figure-value { font-size: var(--fib-text-xl); }
}
@container fib-figure (max-width: 111px) {
  .fib-figure[data-size="xl"] .fib-figure-value,
  .fib-figure[data-size="lg"] .fib-figure-value { font-size: var(--fib-text-xl); }
  .fib-figure[data-size="md"] .fib-figure-value,
  .fib-figure[data-size="sm"] .fib-figure-value { font-size: var(--fib-text-base); }
}

.fib-figure[data-tone="gold"]    .fib-figure-value { color: var(--fib-gold); }
.fib-figure[data-tone="diamond"] .fib-figure-value { color: var(--fib-diamond); }
.fib-figure[data-tone="emerald"] .fib-figure-value { color: var(--fib-emerald); }

/*
 * Comparison gauge. Supporting figures carry one, because a number with no
 * field to sit in doesn't answer "how good is this".
 */
.fib-gauge {
  position: relative; height: 3px; margin-top: 8px;
  background: var(--fib-plinth-2); border-radius: var(--fib-radius-pill);
  overflow: hidden;
}
.fib-gauge i {
  position: absolute; inset: 0 auto 0 0;
  display: block; width: 100%; border-radius: inherit;
  background: var(--fib-ink-3);
  transform-origin: left center; transform: scaleX(var(--fill, 0));
  transition: transform var(--fib-motion-slow) var(--fib-ease);
}
.fib-gauge[data-tone="gold"] i    { background: var(--fib-gold); }
.fib-gauge[data-tone="diamond"] i { background: var(--fib-diamond); }
.fib-gauge[data-tone="emerald"] i { background: var(--fib-emerald); }

.fib-delta {
  font-family: var(--fib-font-mono);
  font-size: var(--fib-text-2xs); font-variant-numeric: tabular-nums;
}
.fib-delta[data-dir="up"]   { color: var(--fib-emerald); }
.fib-delta[data-dir="down"] { color: var(--fib-negative); }
.fib-delta[data-dir="flat"] { color: var(--fib-netherite); }

/* The unit that says what the arrow counts. Set in the reading face and the
   metadata ink, so it never competes with the figure it qualifies. */
.fib-delta-unit {
  font-family: var(--fib-font-sans);
  color: var(--fib-netherite);
  margin-left: 0.4em;
}

/* ── 6. Controls ──────────────────────────────────────────────────────── */

.fib-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 14px; border-radius: var(--fib-radius-md);
  background: var(--fib-plinth-2); color: var(--fib-ink);
  font-size: var(--fib-text-sm); font-weight: 500;
  box-shadow: inset 0 1px 0 0 var(--fib-edge);
  transition: background var(--fib-motion-fast) var(--fib-ease);
}
.fib-btn:hover { background: var(--fib-line); }
.fib-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.fib-btn--primary { background: var(--fib-diamond); color: var(--fib-on-accent); font-weight: 600; }
.fib-btn--primary:hover { background: var(--fib-diamond-hi); }
.fib-btn--quiet { background: none; color: var(--fib-ink-2); box-shadow: none; }
.fib-btn--quiet:hover { background: var(--fib-plinth); color: var(--fib-ink); }

/*
 * Segmented control for scope (solo / duos / combined) — the most-used control
 * in the module, so it is a real segmented control with a sliding indicator
 * rather than three buttons that happen to sit together.
 */
.fib-seg {
  position: relative; display: inline-flex;
  padding: 3px; border-radius: var(--fib-radius-md);
  background: var(--fib-plinth);
  box-shadow: inset 0 0 0 1px var(--fib-line-soft);
}
.fib-seg-thumb {
  position: absolute; top: 3px; bottom: 3px; left: 0;
  border-radius: var(--fib-radius-sm);
  background: var(--fib-plinth-2);
  box-shadow: inset 0 1px 0 0 var(--fib-edge);
  transition: transform var(--fib-motion-base) var(--fib-ease),
              width var(--fib-motion-base) var(--fib-ease);
  pointer-events: none;
}
.fib-seg button {
  position: relative; z-index: 1;
  padding: 6px 14px; border-radius: var(--fib-radius-sm);
  font-size: var(--fib-text-sm); font-weight: 500;
  color: var(--fib-ink-3); white-space: nowrap;
  transition: color var(--fib-motion-fast) var(--fib-ease);
}
.fib-seg button:hover { color: var(--fib-ink-2); }
.fib-seg button[aria-checked="true"] { color: var(--fib-ink); font-weight: 600; }

.fib-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 11px; border-radius: var(--fib-radius-pill);
  font-size: var(--fib-text-xs); font-weight: 500;
  color: var(--fib-ink-3);
  box-shadow: inset 0 0 0 1px var(--fib-line-soft);
  transition: color var(--fib-motion-fast) var(--fib-ease),
              box-shadow var(--fib-motion-fast) var(--fib-ease),
              background var(--fib-motion-fast) var(--fib-ease);
}
.fib-chip:hover { color: var(--fib-ink-2); box-shadow: inset 0 0 0 1px var(--fib-line); }
.fib-chip[aria-pressed="true"] {
  color: var(--fib-ink); background: var(--fib-plinth-2);
  box-shadow: inset 0 0 0 1px var(--fib-line);
}

.fib-search {
  display: flex; align-items: center; gap: 9px;
  padding: 0 12px; height: 38px;
  border-radius: var(--fib-radius-md);
  background: var(--fib-sunk);
  box-shadow: inset 0 0 0 1px var(--fib-line-soft);
  transition: box-shadow var(--fib-motion-fast) var(--fib-ease);
}
.fib-search:focus-within { box-shadow: inset 0 0 0 1px var(--fib-line); }
.fib-search svg { flex: none; color: var(--fib-netherite); }
.fib-search input {
  flex: 1; min-width: 0; height: 100%;
  background: none; border: none; outline: none;
  color: var(--fib-ink); font: inherit; font-size: var(--fib-text-md);
}
/* Placeholder sits at ink-3, not a browser-default grey: it is text and has to
   clear 4.5:1 like any other text. */
.fib-search input::placeholder { color: var(--fib-ink-3); opacity: 1; }

/* ── 7. Tables + rows ─────────────────────────────────────────────────── */

.fib-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }

.fib-table th {
  position: sticky; top: 0; z-index: var(--fib-z-sticky);
  padding: 10px var(--fib-space-4);
  background: var(--fib-void);
  border-bottom: 1px solid var(--fib-line-soft);
  text-align: left;
  font-size: var(--fib-text-2xs); font-weight: 600;
  color: var(--fib-netherite);
  letter-spacing: 0.04em; text-transform: uppercase;
  white-space: nowrap;
}
.fib-table th[data-num], .fib-table td[data-num] { text-align: right; }
.fib-table td {
  padding: 11px var(--fib-space-4);
  border-bottom: 1px solid var(--fib-line-soft);
  font-size: var(--fib-text-sm);
  vertical-align: middle;
}
.fib-table td[data-num] {
  font-family: var(--fib-font-mono);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.fib-table tbody tr:hover { background: var(--fib-plinth); }
.fib-table tbody tr[data-self="true"] {
  background: color-mix(in oklch, var(--fib-diamond) 7%, transparent);
  box-shadow: inset 2px 0 0 0 var(--fib-diamond);
}
.fib-table tbody tr:last-child td { border-bottom: none; }

.fib-cell-player { display: flex; align-items: center; gap: 10px; font-weight: 500; min-width: 0; }
.fib-cell-player span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Rows that are themselves links into a deeper view. */
.fib-row-link {
  display: flex; align-items: center; gap: var(--fib-space-4);
  width: 100%; padding: var(--fib-space-4);
  border-bottom: 1px solid var(--fib-line-soft);
  text-align: left;
  transition: background var(--fib-motion-fast) var(--fib-ease);
}
.fib-row-link:hover { background: var(--fib-plinth); }
.fib-row-link:last-child { border-bottom: none; }

/*
 * A value's share of the leader's, as a column of its own.
 *
 * This used to be a 60×3px stub tucked under the numeral, which is precisely
 * the gauge the career ledger exists to replace — at a real board (leader 49,
 * fourth place 11) every bar below the podium was a 13px mark that answered
 * nothing. It is now the same object the ledger uses, at the ledger's weight,
 * given a full column: the field's shape — runaway leader or pack finish —
 * reads down the table before a single number is parsed. It also absorbs the
 * slack the Player column used to hoard, so a name and its bar sit close
 * enough to be read as one fact.
 */
.fib-share-col { width: 34%; min-width: 96px; }
.fib-share-track { height: 6px; color: var(--fib-ink-3); }

/* On a phone the bar is the first thing to give: the gap column answers the
   same question in less room, and the caption still names the yardstick. */
@container fib-page (max-width: 520px) {
  .fib-share-col { display: none; }
}

.fib-gap { color: var(--fib-netherite); }

/* ── 8. Charts ────────────────────────────────────────────────────────── */

.fib-chart { display: block; width: 100%; overflow: visible; }
.fib-chart[data-scrubbable="true"] { cursor: crosshair; touch-action: pan-y; }
.fib-chart text {
  font-family: var(--fib-font-mono);
  font-size: var(--fib-text-2xs); fill: var(--fib-netherite);
  font-variant-numeric: tabular-nums;
}
.fib-chart .grid  { stroke: var(--fib-line-soft); stroke-width: 1; }
.fib-chart .axis  { stroke: var(--fib-line); stroke-width: 1; }
.fib-chart .trace { fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.fib-chart .trace--dim { stroke: var(--fib-trace-dim); stroke-width: 1.5; }
.fib-chart .area  { stroke: none; }
.fib-chart .dot   { stroke: var(--fib-void); stroke-width: 2; }
/* Lead-change ticks on a race timeline. */
.fib-chart .tick  { stroke: var(--fib-netherite); stroke-width: 1; opacity: 0.55; }
.fib-chart .enddot { stroke: var(--fib-void); stroke-width: 1.5; }

.fib-chart-legend {
  display: flex; flex-wrap: wrap;
  gap: var(--fib-space-2) var(--fib-space-4);
  padding-top: var(--fib-space-3);
}
.fib-chart-legend li {
  display: flex; align-items: center; gap: 7px;
  font-size: var(--fib-text-xs);
  /* Always reading ink. Series colour lives in the swatch, never the label. */
  color: var(--fib-ink-2);
}
.fib-chart-legend i { width: 14px; height: 2px; border-radius: var(--fib-radius-pill); flex: none; background: currentColor; }

/* Avatar chips in a race legend: the name is visibly the lane. */
.fib-lane-faces { display: flex; align-items: center; flex: none; }
.fib-lane-faces .fib-avatar {
  width: 16px; height: 16px; margin-left: -4px;
  box-shadow: 0 0 0 1px var(--fib-void);
}
.fib-lane-faces .fib-avatar:first-child { margin-left: 0; }

/* ── 9. Achievements, rarity, the trophy case ─────────────────────────── */

.fib-rarity {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: var(--fib-text-2xs); font-weight: 600;
  letter-spacing: 0.03em; text-transform: uppercase;
}
.fib-rarity i { width: 6px; height: 6px; border-radius: var(--fib-radius-pill); background: currentColor; flex: none; }

/* The five-tier ramp, drawn as a stacked meter rather than five badges. */
.fib-ramp { display: flex; flex-direction: column; gap: 10px; }
.fib-ramp-row {
  display: grid; grid-template-columns: 92px 1fr auto;
  align-items: center; gap: var(--fib-space-3);
}
.fib-ramp-row > b { font-size: var(--fib-text-xs); font-weight: 500; color: var(--fib-ink-2); }
.fib-ramp-track {
  height: 8px; border-radius: var(--fib-radius-sm);
  background: var(--fib-sunk);
  box-shadow: inset 0 1px 0 0 var(--fib-shadow-mid);
  overflow: hidden;
}
.fib-ramp-track i {
  display: block; height: 100%; width: 100%; border-radius: inherit;
  background: currentColor;
  transform-origin: left center; transform: scaleX(var(--fill, 0));
  transition: transform var(--fib-motion-slow) var(--fib-ease);
}
.fib-ramp-row > em {
  font-family: var(--fib-font-mono); font-style: normal;
  font-size: var(--fib-text-xs); font-variant-numeric: tabular-nums;
  color: var(--fib-ink-2); min-width: 4ch; text-align: right;
}

/*
 * The trophy case. Earned achievements are OBJECTS — a sprite in a well, its
 * rim lit by the tier the player set actually measured — not rows in a list.
 * What you have and what you are chasing are different questions, so they get
 * different furniture: a shelf here, a progress list below.
 */
.fib-case {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: var(--fib-space-5);
}
.fib-trophy figcaption { gap: 5px; }
.fib-trophy-held { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }

/*
 * Locked achievements stay a list: object, what it takes, how far you are.
 * Dimmed but never hidden — absence is information, and "locked" is carried
 * by the sprite losing its colour, never by making the words unreadable.
 */
.fib-ach { display: flex; flex-direction: column; }
.fib-ach-row {
  display: grid; grid-template-columns: auto 1fr auto;
  align-items: center; gap: var(--fib-space-4);
  padding: var(--fib-space-4) 0;
  border-bottom: 1px solid var(--fib-line-soft);
}
.fib-ach-row:last-child { border-bottom: none; }
.fib-ach-row[data-locked="true"] .fib-ach-body b { color: var(--fib-ink-2); font-weight: 500; }
.fib-ach-row[data-locked="true"] .fib-rarity { opacity: 0.75; }
.fib-ach-row[data-locked="true"] .fib-well {
  opacity: 0.6;
  box-shadow: inset 0 1px 0 0 var(--fib-edge);
}
.fib-ach-row[data-locked="true"] .fib-sprite { filter: grayscale(1) brightness(0.75); }

.fib-ach-body { min-width: 0; }
.fib-ach-body b { display: block; font-size: var(--fib-text-md); font-weight: 600; letter-spacing: -0.005em; }
.fib-ach-body p { font-size: var(--fib-text-sm); color: var(--fib-ink-3); text-wrap: pretty; }

.fib-ach-side {
  display: flex; flex-direction: column; align-items: flex-end; gap: 5px;
  text-align: right; flex: none;
}

.fib-ach-progress {
  width: 108px; height: 3px; border-radius: var(--fib-radius-pill);
  background: var(--fib-plinth-2); overflow: hidden;
}
.fib-ach-progress i {
  display: block; height: 100%; width: 100%; border-radius: inherit;
  background: var(--fib-ink-3);
  transform-origin: left center; transform: scaleX(var(--fill, 0));
  transition: transform var(--fib-motion-slow) var(--fib-ease);
}

.fib-ach-group { margin-bottom: var(--fib-space-6); }
.fib-ach-group:last-child { margin-bottom: 0; }
.fib-ach-check { color: var(--fib-emerald); font-weight: 700; }

/* ── 10. States ───────────────────────────────────────────────────────── */

.fib-skel {
  border-radius: var(--fib-radius-sm);
  background: linear-gradient(90deg,
    var(--fib-plinth) 0%, var(--fib-plinth-2) 50%, var(--fib-plinth) 100%);
  background-size: 200% 100%;
  animation: fib-shimmer 1.4s linear infinite;
}
@keyframes fib-shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}

.fib-empty {
  display: flex; flex-direction: column; align-items: flex-start;
  gap: var(--fib-space-3);
  padding: var(--fib-space-6) var(--fib-space-5);
  max-width: 56ch;
}
.fib-empty b { font-size: var(--fib-text-lg); font-weight: 600; letter-spacing: -0.01em; }
.fib-empty p { color: var(--fib-ink-2); font-size: var(--fib-text-md); text-wrap: pretty; }
.fib-empty .fib-btn { margin-top: var(--fib-space-2); }

/* ── 11. Motion ───────────────────────────────────────────────────────── */

/*
 * Reveals ENHANCE an already-visible default. Content renders at full opacity;
 * only once JS has confirmed an element is below the fold does it get
 * data-reveal="pending". A headless renderer, a background tab, or a JS
 * failure therefore ships the page populated rather than blank.
 */
.fib-reveal {
  opacity: 1; transform: none;
  transition: opacity var(--fib-motion-slow) var(--fib-ease),
              transform var(--fib-motion-slow) var(--fib-ease);
}
.fib-reveal[data-reveal="pending"] { opacity: 0; transform: translateY(10px); }

/*
 * The podium ceremony. Medals land bronze, silver, gold — the order a podium
 * is actually announced in, not DOM order — so the stagger carries the ranking
 * rather than just spacing three identical entrances out.
 *
 * They arrive with their glow already on them. This is the module's one
 * sanctioned coloured shadow and the moment the Earned Glow rule reserves it
 * for; nothing else on the overview gets to bloom.
 *
 * A transition FROM a pending state, never a keyframe gated ON it: the flag is
 * removed to START the motion, so an element that never receives the flag —
 * reduced motion, hidden tab, no observer, above the fold — is simply correct
 * and visible from the first paint.
 */
.fib-podium .fib-medal {
  transition: transform 420ms var(--fib-ease), opacity 300ms var(--fib-ease);
  transition-delay: calc(var(--ceremony, 0) * 140ms);
}
.fib-podium[data-ceremony="pending"] .fib-medal {
  opacity: 0; transform: scale(0.55); transition: none;
}

/*
 * The featured race draws itself: one clip rect scaled from its left edge, so
 * the reveal is linear in TIME rather than in path length. See RaceMini for
 * why that distinction is the difference between a race and a lie.
 *
 * 900ms matches the trace draw on the profile's score chart — the module has
 * one speed at which a chart draws itself.
 */
.fib-wipe-rect {
  transform-box: fill-box;
  transform-origin: left center;
  transition: transform 900ms var(--fib-ease);
}
.fib-chart[data-wipe="pending"] .fib-wipe-rect { transform: scaleX(0); transition: none; }

.fib-sprite-lift:hover .fib-sprite { transform: translateY(-2px) scale(1.04); }
.fib-sprite-lift:hover .fib-well {
  box-shadow: inset 0 1px 0 0 var(--fib-edge-strong),
              inset 0 -1px 0 0 var(--fib-shadow-soft);
}

/*
 * Collection scarcity. A measured-scarce holding — held by few of the ranked
 * players — earns diamond, the module's one "rarity / exceptional" colour, and
 * a diamond rim on its well. This is NOT the five-tier back-to-back ramp: that
 * measures how a pull landed, this measures how few others own the item. Two
 * different axes, so they are kept visually distinct — a rim, never a bloom
 * (the Earned Glow Rule reserves the outer glow for podium medals and the top
 * two pull tiers), and the rim persists on hover so a scarce object stays lit.
 */
.fib-well--scarce {
  box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--fib-diamond) 55%, transparent),
              inset 0 1px 0 0 var(--fib-edge-strong),
              inset 0 -1px 0 0 var(--fib-shadow-soft);
}
.fib-sprite-lift:hover .fib-well--scarce {
  box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--fib-diamond) 55%, transparent),
              inset 0 1px 0 0 var(--fib-edge-strong),
              inset 0 -1px 0 0 var(--fib-shadow-soft);
}

/* "Held by N of M" — quiet metadata by default, diamond when the holding is
   genuinely scarce. Sits beside sprites in the shelf and the header. */
.fib-held {
  font-family: var(--fib-font-mono);
  font-size: var(--fib-text-2xs); color: var(--fib-netherite);
  letter-spacing: 0.02em; font-variant-numeric: tabular-nums;
}
.fib-held[data-scarce] { color: var(--fib-diamond); }

/* In the table the scarcity cell reads like its numeric neighbours (ink), and
   only lifts to diamond when the holding is scarce. */
.fib-table td[data-num][data-scarce] { color: var(--fib-diamond); }

/*
 * The trophy — the scarcest holding, on its own plinth between the hero and
 * the case. It was a bare inline strip and read as a caption that had
 * wandered off; a feature this singular earns furniture. Diamond is spent
 * three ways on one fact (the well's rim, the hairline top edge, the holder
 * figure) — allowed, because all three mark the same thing: the module's one
 * rarity colour on the page's one rarity feature.
 */
.fib-trophy {
  display: flex; align-items: center; gap: var(--fib-space-5);
  flex-wrap: wrap;
  margin-top: var(--fib-space-5);
  padding: var(--fib-space-4) var(--fib-space-5);
  background: linear-gradient(var(--fib-plinth), var(--fib-void));
  border: 1px solid var(--fib-line-soft);
  border-radius: var(--fib-radius-lg);
  box-shadow: inset 0 1px 0 0 color-mix(in oklch, var(--fib-diamond) 30%, transparent),
              0 18px 40px -24px var(--fib-shadow-deep);
}
.fib-trophy-id {
  flex: 1 1 auto; min-width: 0;
  display: flex; flex-direction: column; gap: 3px;
}
.fib-trophy-id > b {
  font-size: var(--fib-text-xl); font-weight: 600; letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}
/* The holder figure docks right, rhyming with the hero figure above it. */
.fib-trophy .fib-figure { flex: none; align-items: flex-end; text-align: right; }

/*
 * The collection book — a vitrine, not a spreadsheet.
 *
 * A bare shelf of wells sitting on the page void read as exactly that: placed.
 * So the holdings are set INTO a case — a panel-grade surface with its own
 * light. The case light is the vitrine metaphor at block scale: a soft fall
 * from the top edge (light falls downward, per the tokens), strongest where
 * the case opens and gone by mid-depth, so the block reads as a lit recess
 * rather than a rectangle of squares. It shows only in the tray around the
 * wells; the wells themselves keep their own lighting.
 *
 * Inside: a head strip (the label and the census), then the shelf of cards.
 */
.fib-book-case {
  position: relative;
  background: linear-gradient(var(--fib-plinth), var(--fib-void));
  border: 1px solid var(--fib-line-soft);
  border-radius: var(--fib-radius-lg);
  padding: var(--fib-space-4);
  box-shadow: inset 0 1px 0 0 var(--fib-edge),
              0 18px 40px -24px var(--fib-shadow-deep);
}
/* The case light. A fall from the top edge, no colour of its own, never an
   event target. */
.fib-book-case::before {
  content: '';
  position: absolute; inset: 0;
  border-radius: inherit;
  background: radial-gradient(75% 140px at 50% 0, oklch(1 0 0 / 0.05), transparent 72%);
  pointer-events: none;
}

/* The case head: the label on the left, the census on the right. */
.fib-book-head {
  position: relative;
  display: flex; align-items: baseline; justify-content: space-between;
  gap: var(--fib-space-3); flex-wrap: wrap;
  padding-bottom: var(--fib-space-3);
  margin-bottom: var(--fib-space-4);
  border-bottom: 1px solid var(--fib-line-soft);
}
/* The completion gauge is the first gauge to live inside the right-aligned hero
   figure column, whose align-items:flex-end collapses the zero-content-width bar
   to nothing. Stretch just the gauge back to the figure's width so the
   completion bar actually reads. */
.fib-hero-figures .fib-gauge { align-self: stretch; min-width: 168px; }

/* FLIP transforms are written by useFlip; the row must not transition while
   it is being placed back at its old position. */
.fib-table tbody tr[data-flipping] { transition: none; }
.fib-table tbody tr:not([data-flipping]) {
  transition: transform var(--fib-motion-slow) var(--fib-ease),
              background var(--fib-motion-fast) var(--fib-ease);
}

@media (prefers-reduced-motion: reduce) {
  .fib *, .fib *::before, .fib *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
  /* Every entrance's resting state IS the visible state, so killing the
     transition lands on "shown" rather than stranding content hidden. The
     hooks already refuse to set these flags under reduced motion; this is the
     second lock on the same door. */
  .fib-reveal[data-reveal="pending"] { opacity: 1; transform: none; }
  .fib-podium[data-ceremony="pending"] .fib-medal { opacity: 1; transform: none; }
  .fib-chart[data-wipe="pending"] .fib-wipe-rect { transform: none; }
  .fib-skel { background: var(--fib-plinth-2); animation: none; }
  .fib-sprite-lift:hover .fib-sprite { transform: none; }
}

/* ── 12. Views ────────────────────────────────────────────────────────── */

/* Hero — identity on the left at object scale, the verdict on the right at
   display scale. */
.fib-hero { padding-bottom: var(--fib-space-6); }
.fib-hero-back { margin-bottom: var(--fib-space-5); margin-left: -14px; }

.fib-hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--fib-space-7);
  padding-bottom: var(--fib-space-5);
  border-bottom: 1px solid var(--fib-line-soft);
}

.fib-hero-id { display: flex; align-items: center; gap: var(--fib-space-5); min-width: 0; }
.fib-hero-avatar { width: 128px; height: 128px; padding: 0; }
.fib-hero-avatar img { width: 128px; height: 128px; }

.fib-hero-name {
  font-size: var(--fib-text-3xl); font-weight: 700;
  letter-spacing: -0.03em; line-height: 1.05;
  /* Minecraft names run to 16 characters and must not overflow at 320px. */
  overflow-wrap: anywhere;
}
.fib-hero-rank {
  display: flex; align-items: center; gap: 10px;
  margin-top: 10px; font-size: var(--fib-text-md); color: var(--fib-ink-2);
}
.fib-hero-rank em { font-style: normal; color: var(--fib-netherite); }

.fib-hero-figures { display: flex; flex-direction: column; gap: var(--fib-space-5); align-items: flex-end; }
.fib-hero-figures .fib-figure { align-items: flex-end; text-align: right; }

.fib-hero-scope {
  display: flex; align-items: center; gap: var(--fib-space-4);
  flex-wrap: wrap; padding-top: var(--fib-space-5);
}

/*
 * The sticky identity bar. Whose record this is must survive the scroll — a
 * profile is long, and "which player am I looking at" should never be a
 * question you have to scroll back up to answer.
 *
 * It occupies NO space while the hero is on screen (height 0, not
 * display:none, so position:sticky keeps working), then docks itself to the
 * top of the viewport once the hero leaves. It duplicates what the hero says
 * and nothing more, so it is hidden from assistive tech — the hero remains
 * the accessible identity.
 */
.fib-playerbar {
  position: sticky; top: 0; z-index: var(--fib-z-sticky);
  display: flex; align-items: center; gap: var(--fib-space-3);
  height: 0; padding: 0; margin: 0; overflow: hidden;
  border-bottom: 1px solid transparent;
  opacity: 0;
  transition: opacity var(--fib-motion-base) var(--fib-ease);
}
.fib-playerbar[data-on="true"] {
  height: auto; padding: 10px 0; margin: -10px 0 var(--fib-space-5);
  background: var(--fib-void);
  border-bottom-color: var(--fib-line-soft);
  opacity: 1;
}
.fib-playerbar b { font-size: var(--fib-text-md); font-weight: 600; letter-spacing: -0.01em; }
.fib-playerbar-stat {
  font-family: var(--fib-font-mono); font-variant-numeric: tabular-nums;
  font-size: var(--fib-text-sm); color: var(--fib-gold);
}
.fib-playerbar .fib-spacer { flex: 1; }

/* Secondary figures in a divided strip — used under heroes and summaries. */
.fib-stat-strip {
  display: flex; flex-wrap: wrap;
  gap: var(--fib-space-4) 0;
  margin-top: var(--fib-space-6);
  border-top: 1px solid var(--fib-line-soft);
  padding-top: var(--fib-space-4);
}
.fib-stat-strip > * {
  flex: 1 1 132px; padding: 0 var(--fib-space-4);
  border-left: 1px solid var(--fib-line-soft);
  container: fib-figure / inline-size;
}
.fib-stat-strip > *:first-child { border-left: none; padding-left: 0; }

/*
 * The record — the whole career under the profile hero, in two tiers.
 *
 * Six headline figures at 48px in a 3x2 grid, then the remaining seven at 18px
 * beneath them. Three across rather than six: a third of the page per figure is
 * the room 48px needs, and the second row costs nothing a page this long
 * notices. The 2.7:1 step between the tiers is what makes them read as headline
 * and supporting rather than as thirteen equal claims.
 *
 * Grids rather than flex-wrap, for the reason the server totals are: with a
 * wrapping row "starts a row" is not addressable in CSS, and the first figure
 * of the second row kept a divider it had not earned. A fixed column count
 * makes it addressable (nth-child), and the count steps on the PAGE width, not
 * the viewport, because the rail is 232px on desktop and gone below 900px.
 *
 * The figures step their own numerals down inside these columns via the
 * container query in section 5, so a narrow column never clips a number; the
 * column count only decides how many share a row.
 */
.fib-record-block {
  /* The hero already contributes its own padding-bottom; adding a margin on
     top of it pushed the record clear of the name it belongs to, which read as
     a separate page rather than the same record. */
  border-top: 1px solid var(--fib-line-soft);
  padding-top: var(--fib-space-5);
}

.fib-record {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.fib-record > * {
  padding: 0 var(--fib-space-5);
  border-left: 1px solid var(--fib-line-soft);
  container: fib-figure / inline-size;
}
.fib-record > *:nth-child(3n + 1) { border-left: none; padding-left: 0; }
/* Rows after the first get a rule rather than a bare gap, so 3x2 reads as one
   matrix. Two rows separated by space alone read as two unrelated strips.
   "After the first row" is a function of the column count, so this selector is
   re-stated in each container query below — at two columns, nth-child(n + 4)
   would start the rule halfway along row two. */
.fib-record > *:nth-child(n + 4) {
  margin-top: var(--fib-space-5);
  padding-top: var(--fib-space-5);
  border-top: 1px solid var(--fib-line-soft);
}

.fib-record-more {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--fib-space-4) 0;
  margin-top: var(--fib-space-6);
  padding-top: var(--fib-space-5);
  border-top: 1px solid var(--fib-line-soft);
}
.fib-record-more > * {
  padding: 0 var(--fib-space-4);
  border-left: 1px solid var(--fib-line-soft);
  container: fib-figure / inline-size;
}
.fib-record-more > *:nth-child(4n + 1) { border-left: none; padding-left: 0; }

/* Three across needs 3 x 200px of page; two needs 400px. */
@container fib-page (max-width: 599px) {
  .fib-record { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .fib-record > *:nth-child(3n + 1) {
    border-left: 1px solid var(--fib-line-soft);
    padding-left: var(--fib-space-5);
  }
  .fib-record > *:nth-child(2n + 1) { border-left: none; padding-left: 0; }
  /* Same specificity as the base row rule, so source order can undo it. */
  .fib-record > *:nth-child(n + 1) { margin-top: 0; padding-top: 0; border-top: none; }
  .fib-record > *:nth-child(n + 3) {
    margin-top: var(--fib-space-5);
    padding-top: var(--fib-space-5);
    border-top: 1px solid var(--fib-line-soft);
  }
}
@container fib-page (max-width: 399px) {
  .fib-record { grid-template-columns: minmax(0, 1fr); }
  .fib-record > *:nth-child(n + 1) {
    border-left: none; padding-left: 0;
    margin-top: 0; padding-top: 0; border-top: none;
  }
  .fib-record > *:nth-child(n + 2) {
    margin-top: var(--fib-space-4);
    padding-top: var(--fib-space-4);
    border-top: 1px solid var(--fib-line-soft);
  }
}

/* Four across needs 4 x 140px of page. */
@container fib-page (max-width: 559px) {
  .fib-record-more { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .fib-record-more > *:nth-child(4n + 1) {
    border-left: 1px solid var(--fib-line-soft);
    padding-left: var(--fib-space-4);
  }
  .fib-record-more > *:nth-child(2n + 1) { border-left: none; padding-left: 0; }
}

/* Collection: signature items beside the rarity ramp. */
.fib-collection {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: var(--fib-space-7);
  align-items: start;
}

/*
 * The shelf. Artifacts sit in a row of wells, captioned beneath like museum
 * labels — the item is the object, the text is the placard. A grid, not
 * wrapping flex: uniform columns keep the shelf reading as a shelf at every
 * width.
 */
.fib-shelf {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: var(--fib-space-5);
}
.fib-shelf--wide { gap: var(--fib-space-5) var(--fib-space-6); }

@media (min-width: 1040px) {
  .fib-shelf--wide { grid-template-columns: repeat(6, minmax(0, 1fr)); }
}

.fib-artifact {
  display: flex; flex-direction: column; gap: var(--fib-space-3);
  min-width: 0;
}
.fib-artifact figcaption { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.fib-artifact figcaption b {
  font-size: var(--fib-text-sm); font-weight: 600; letter-spacing: -0.005em;
  overflow-wrap: anywhere;
}

/* Signature — the closing sentence, the only prose set at display scale. */
.fib-signature {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: var(--fib-space-7);
  align-items: start;
}
.fib-signature-line {
  font-size: var(--fib-text-xl); line-height: 1.45; letter-spacing: -0.015em;
  color: var(--fib-ink-2); text-wrap: pretty; max-width: 40ch;
}
.fib-signature-line strong { color: var(--fib-ink); font-weight: 600; }
.fib-signature-line b {
  font-family: var(--fib-font-mono); font-weight: 500;
  font-variant-numeric: tabular-nums; color: var(--fib-ink);
  /* inline-block so the min-width each figure reserves (see Signature) actually
     holds the box; left-aligned so the growing count-up fills it from the start
     rather than drifting in from the right. */
  display: inline-block; text-align: left;
}
.fib-signature-line em { color: var(--fib-gold); font-style: normal; }

.fib-signature-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--fib-space-5);
}
.fib-signature-grid dd { margin: 0; }

/*
 * Podium. Uneven by design — first place stands taller, the way a podium
 * does. Not three equal cards with a gold border on one.
 */
.fib-podium {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--fib-space-4); align-items: end;
}
.fib-podium-slot {
  display: flex; flex-direction: column; align-items: center; gap: var(--fib-space-2);
  text-align: center; min-width: 0;
  padding: var(--fib-space-5) var(--fib-space-3);
  border-top: 1px solid var(--fib-line-soft);
  background: linear-gradient(to bottom, var(--fib-plinth), transparent 70%);
  border-radius: var(--fib-radius-lg) var(--fib-radius-lg) 0 0;
}
.fib-podium-slot[data-place="1"] { padding-top: var(--fib-space-7); border-top-color: var(--fib-medal-gold); }
.fib-podium-slot[data-place="2"] { padding-top: var(--fib-space-6); order: -1; }
.fib-podium-slot[data-place="3"] { padding-top: var(--fib-space-4); }

.fib-podium-faces { display: flex; gap: var(--fib-space-2); }
.fib-podium-name {
  font-weight: 600; letter-spacing: -0.01em;
  overflow-wrap: anywhere; line-height: 1.25;
}
.fib-podium-name button { font: inherit; }
.fib-podium-name button:hover { color: var(--fib-diamond); }
.fib-podium-amp { color: var(--fib-netherite); font-weight: 400; }
.fib-podium-value {
  font-family: var(--fib-font-mono); font-variant-numeric: tabular-nums;
  font-size: var(--fib-text-3xl); font-weight: 600; letter-spacing: -0.03em;
  line-height: 1.1;
}
.fib-podium-slot[data-place="1"] .fib-podium-value { font-size: var(--fib-text-4xl); color: var(--fib-gold); }
.fib-podium-move { margin-top: 5px; }

/* Match feed rows. */
.fib-match-row { display: grid; grid-template-columns: 96px minmax(0, 1.3fr) minmax(0, 1fr) auto; align-items: center; }
.fib-match-when { display: flex; flex-direction: column; gap: 2px; }
.fib-match-when b { font-size: var(--fib-text-sm); font-weight: 500; }
.fib-match-winner { display: flex; align-items: center; gap: var(--fib-space-3); min-width: 0; }
.fib-match-names { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
.fib-match-margin { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.fib-match-score { text-align: right; }
.fib-match-score b {
  display: block; font-family: var(--fib-font-mono); font-variant-numeric: tabular-nums;
  font-size: var(--fib-text-xl); font-weight: 600; color: var(--fib-gold); letter-spacing: -0.02em;
}

/*
 * Day groups. A long feed of identical rows needs chronology landmarks —
 * "the match last Tuesday" is how people actually look for a game.
 */
.fib-day { margin-top: var(--fib-space-5); }
.fib-day:first-child { margin-top: 0; }
.fib-day > h3 {
  display: flex; align-items: center; gap: var(--fib-space-3);
  margin-bottom: var(--fib-space-2);
  font-family: var(--fib-font-mono);
  font-size: var(--fib-text-2xs); font-weight: 500;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--fib-netherite);
}
.fib-day > h3::after { content: ''; flex: 1; height: 1px; background: var(--fib-line-soft); }

/*
 * Scrubber + replay. A native range input, themed with accent-color only —
 * building a custom slider would cost drag, keyboard stepping and
 * screen-reader support to gain nothing. The replay button beside it makes
 * the scrubber's best trick discoverable: the match can be WATCHED.
 */
.fib-scrub { margin-top: var(--fib-space-5); }
.fib-scrub-row { display: flex; align-items: center; gap: var(--fib-space-3); }
.fib-scrub input[type="range"] {
  flex: 1; width: 100%; accent-color: var(--fib-diamond); cursor: grab;
}
.fib-scrub input[type="range"]:active { cursor: grabbing; }
.fib-replay {
  display: inline-grid; place-items: center;
  width: 34px; height: 34px; flex: none;
  border-radius: var(--fib-radius-md);
  background: var(--fib-plinth-2); color: var(--fib-ink);
  box-shadow: inset 0 1px 0 0 var(--fib-edge);
  transition: background var(--fib-motion-fast) var(--fib-ease);
}
.fib-replay:hover { background: var(--fib-line); }
.fib-scrub-foot {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--fib-space-4); flex-wrap: wrap; margin-top: var(--fib-space-2);
}

/* Match settings — a definition list, densely set. */
/*
 * Settings now read as phrases ("Items kept on death"), not as raw enum values
 * ("true"), so the column has to hold a clause rather than a token — hence the
 * wider minimum. "text-transform" is gone: the labels are authored in
 * "MatchDetail.jsx" and "capitalize" would have retitled them ("Random events"
 * → "Random Events"). The value drops out of the mono face for the same reason
 * the module keeps digits in it — mono is for numbers, and these are sentences.
 */
.fib-settings {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--fib-space-3) var(--fib-space-6);
}
.fib-settings > div {
  display: flex; align-items: baseline; justify-content: space-between; gap: var(--fib-space-4);
  padding-bottom: 7px; border-bottom: 1px solid var(--fib-line-soft);
}
.fib-settings dt { font-size: var(--fib-text-sm); color: var(--fib-ink-2); white-space: nowrap; }
.fib-settings dd {
  margin: 0; font-size: var(--fib-text-sm);
  color: var(--fib-ink); font-variant-numeric: tabular-nums;
  text-align: right; text-wrap: pretty;
}

/* Overview. */
.fib-overview-head { padding-bottom: var(--fib-space-6); }
.fib-overview-head .fib-lede { margin: var(--fib-space-3) 0 0; }
.fib-overview-head .fib-pulse { margin-top: var(--fib-space-6); }

/*
 * The featured match: the whole week compressed into one card — the race
 * itself as a band of lanes, with the lead changes ticked underneath.
 * Clicking anywhere on it opens the match; there is no separate CTA button
 * competing with the content.
 */
.fib-feature-card {
  display: flex; flex-direction: column; gap: var(--fib-space-5);
  width: 100%; text-align: left; cursor: pointer;
  transition: background var(--fib-motion-fast) var(--fib-ease),
              border-color var(--fib-motion-fast) var(--fib-ease);
}
.fib-feature-card:hover { background: var(--fib-plinth-2); border-color: var(--fib-line); }
.fib-feature-top {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: var(--fib-space-5) var(--fib-space-6); flex-wrap: wrap;
}
.fib-feature-figures { display: flex; gap: var(--fib-space-6); flex: none; }
.fib-feature-foot {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--fib-space-4); flex-wrap: wrap;
  border-top: 1px solid var(--fib-line-soft);
  padding-top: var(--fib-space-4);
}
/* The arrow steps out when the card is hovered or focused. The card is one
   large click target with only a background change to confirm it; this is the
   bit that says which way the click goes. */
.fib-feature-go { display: inline-flex; align-items: center; gap: 7px; color: var(--fib-ink-3); }
.fib-feature-go i {
  font-style: normal;
  transition: transform var(--fib-motion-base) var(--fib-ease);
}
.fib-feature-card:hover .fib-feature-go i,
.fib-feature-card:focus-visible .fib-feature-go i { transform: translateX(4px); }

/*
 * Two lists side by side. The pair takes the section spacing once, as a
 * block, and the sections inside it take none — otherwise the columns each
 * apply their own top spacing and stop sharing a baseline.
 */
.fib-split {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--fib-space-6) var(--fib-space-7);
  align-items: start;
  margin-top: var(--fib-space-8);
}
.fib-split > .fib-section { padding-top: 0; }

/* Icon slot in the unified stream: medal for a win, sprite for a pull. */
.fib-stream-icon { flex: none; width: 34px; display: grid; place-items: center; }

/*
 * The server record, at the head of the overview. These totals are the
 * yardstick every number further down is read against — see "Scale Sets the
 * Scale" in DESIGN.md, which this stylesheet used to contradict.
 */
/*
 * Grid, not flex-wrap, for one reason: the dividers.
 *
 * With "flex-wrap" the column count is unknowable in CSS, so ":first-child" is
 * the only handle on "starts a row" — and the moment the strip wrapped, the
 * first figure of the second row kept a left divider it had not earned. A
 * fixed column count makes row-leading items addressable (":nth-child(4n+1)"),
 * and the count switches on the PAGE's width rather than the viewport's,
 * because the rail is 232px wide on desktop and absent below 900px.
 *
 * Four across needs 4 × (144px numeral + 32px padding) = 704px of page.
 */
.fib-pulse {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--fib-space-5) 0;
}
.fib-pulse > * {
  padding: 0 var(--fib-space-4);
  border-left: 1px solid var(--fib-line-soft);
  container: fib-figure / inline-size;
}
.fib-pulse > *:nth-child(4n + 1) { border-left: none; padding-left: 0; }

@container fib-page (max-width: 703px) {
  .fib-pulse { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  /* Re-arm every divider, then strip the ones that now lead a row. */
  .fib-pulse > * {
    border-left: 1px solid var(--fib-line-soft);
    padding-left: var(--fib-space-4);
  }
  .fib-pulse > *:nth-child(2n + 1) { border-left: none; padding-left: 0; }
}

/* ── 13. Match inventory ──────────────────────────────────────────────── */

/*
 * The expand control in the standings row. Rotates to point at the drawer it
 * opened, which is the only state it needs.
 */
.fib-inv-toggle {
  display: inline-grid; place-items: center;
  width: 28px; height: 28px; border-radius: var(--fib-radius-md);
  color: var(--fib-netherite);
  transition: color var(--fib-motion-fast) var(--fib-ease),
              background var(--fib-motion-fast) var(--fib-ease),
              transform var(--fib-motion-base) var(--fib-ease);
}
.fib-inv-toggle:hover { color: var(--fib-ink); background: var(--fib-plinth-2); }
.fib-inv-toggle[aria-expanded="true"] { color: var(--fib-ink); transform: rotate(180deg); }

.fib-table tbody tr[data-open] { background: var(--fib-plinth); }
.fib-table tbody tr[data-open] td { border-bottom-color: transparent; }
.fib-table tbody tr:not([data-open]):hover { cursor: pointer; }

/* The drawer cell carries no table padding of its own; the inventory owns it. */
.fib-inv-drawer > td {
  padding: 0 var(--fib-space-4) var(--fib-space-5);
  background: var(--fib-plinth);
}

/*
 * Grid on the left at its natural width, the run's numbers on the right. The
 * grid is NOT allowed to stretch: nine columns spread across a full-width
 * table would put 100px of empty slot around a 32px sprite.
 */
.fib-inv {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--fib-space-6);
  align-items: start;
  padding-top: var(--fib-space-4);
}

.fib-inv-head {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: var(--fib-space-4); margin-bottom: var(--fib-space-3);
}
.fib-inv-skip { padding: 4px 10px; }

/* Nine columns, because that is the width of a Minecraft inventory row. */
.fib-inv-grid {
  --slot: 48px;
  display: grid;
  grid-template-columns: repeat(9, var(--slot));
  gap: 4px;
}

/*
 * Composes the shared well and overrides only what is genuinely slot-specific:
 * a fixed square, a tighter radius for the dense grid, and positioning for the
 * order index. The surface treatment itself now lives on .fib-well, where
 * every other sprite in the module gets it too.
 */
.fib-inv-slot {
  position: relative;
  width: var(--slot); height: var(--slot);
  border-radius: var(--fib-radius-sm);
}

/* Collection order, where Minecraft puts stack size. */
.fib-inv-order {
  position: absolute; right: 2px; bottom: 0;
  font-family: var(--fib-font-mono);
  font-size: var(--fib-text-2xs);
  font-variant-numeric: tabular-nums;
  color: var(--fib-ink-3);
  text-shadow: 0 1px 2px var(--fib-shadow-deep);
  pointer-events: none;
}

/* Desaturate and LIGHTEN, never darken. Crushing brightness on sprites that
   are already dark (blackstone, basalt, cobblestone) turned the slot into an
   empty square — a skipped item still has to be identifiable. */
.fib-inv-slot[data-skipped] .fib-sprite {
  /* Keeps both shadows: without the halo the desaturated dark items vanish. */
  filter: grayscale(1) brightness(1.15) contrast(0.85)
          drop-shadow(0 1px 2px var(--fib-shadow-deep))
          drop-shadow(0 0 1px oklch(1 0 0 / 0.45));
  opacity: 0.72;
}
.fib-inv-slot[data-skipped] .fib-inv-order { color: var(--fib-netherite); }
.fib-inv-slot[data-skipped]::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(
    to top left,
    transparent calc(50% - 1px), var(--fib-ink-3) 50%, transparent calc(50% + 1px));
  opacity: 0.75;
  border-radius: inherit;
  pointer-events: none;
}

/* Readout beneath the grid. Reserves its own height so hovering never reflows. */
.fib-inv-caption {
  display: flex; align-items: center; gap: var(--fib-space-3);
  flex-wrap: wrap;
  min-height: 26px;
  margin-top: var(--fib-space-3);
}
.fib-inv-caption b { font-size: var(--fib-text-sm); font-weight: 600; }
.fib-inv-skipped-tag {
  font-size: var(--fib-text-2xs); font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.03em;
  color: var(--fib-netherite);
}

/* Capped: the rarity ramp reads as a comparison between tiers, and stretching
   its bars across every spare pixel of a wide table only adds travel. */
.fib-inv-side {
  display: flex; flex-direction: column; gap: var(--fib-space-4);
  min-width: 0; max-width: 380px;
}
.fib-inv-figures { display: flex; gap: var(--fib-space-5); flex-wrap: wrap; }
.fib-inv-subhead { margin-top: var(--fib-space-2); }

/* ── The fill ──────────────────────────────────────────────────────────
 *
 * Every slot's delay is its REAL collection time scaled onto the playback
 * window, so the gaps survive: fast items snap in, a ninety-second item
 * visibly stalls. Pure CSS — the container flips one attribute and the browser
 * schedules the rest.
 *
 * idle (no attribute) is the resting, fully-visible state and also the
 * default render. Reduced motion, a hidden tab and the skip control all land
 * there, so the grid is never left half-filled.
 */
.fib-inv-slot {
  opacity: 1; transform: none;
}
.fib-inv-grid[data-play="pending"] .fib-inv-slot {
  opacity: 0; transform: translateY(7px) scale(0.92);
}
.fib-inv-grid[data-play="run"] .fib-inv-slot {
  opacity: 1; transform: none;
  transition: opacity 240ms var(--fib-ease) var(--delay),
              transform 240ms var(--fib-ease) var(--delay);
}

.fib-inv-progress {
  height: 2px; border-radius: var(--fib-radius-pill);
  background: var(--fib-plinth-2);
  overflow: hidden;
  margin-bottom: var(--fib-space-3);
  opacity: 0;
  transition: opacity var(--fib-motion-fast) var(--fib-ease);
}
.fib-inv-progress[data-play="run"] { opacity: 1; }
.fib-inv-progress i {
  display: block; height: 100%; width: 100%;
  background: var(--fib-diamond);
  transform-origin: left center;
  transform: scaleX(0);
}
.fib-inv-progress[data-play="run"] i {
  animation: fib-inv-fill 4500ms linear forwards;
}
@keyframes fib-inv-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }

@media (prefers-reduced-motion: reduce) {
  /* Resting state IS the visible state, so killing the transition lands on a
     populated grid rather than an empty one. */
  .fib-inv-grid[data-play="pending"] .fib-inv-slot { opacity: 1; transform: none; }
  .fib-inv-progress { display: none; }
  .fib-inv-toggle[aria-expanded="true"] { transform: rotate(180deg); }
}

/* ── 14. Responsive ───────────────────────────────────────────────────── */

/*
 * Structural, not fluid. Below 900px the rail becomes a bottom bar: this is a
 * second-screen and phone surface first, and a bottom bar is thumb-reachable
 * where a top bar is not.
 */
@media (max-width: 900px) {
  .fib-shell { display: block; }
  .fib-atmosphere { height: 260px; }

  .fib-rail {
    position: fixed; inset: auto 0 0 0;
    width: auto; flex: none; height: auto;
    flex-direction: row; align-items: center; gap: 2px;
    padding: 6px max(6px, env(safe-area-inset-left))
             max(6px, env(safe-area-inset-bottom))
             max(6px, env(safe-area-inset-right));
    background: var(--fib-plinth);
    border-right: none;
    border-top: 1px solid var(--fib-line-soft);
  }
  .fib-rail-brand, .fib-rail-foot { display: none; }
  .fib-rail-nav { flex-direction: row; flex: 1; justify-content: space-around; gap: 2px; }
  .fib-nav-item {
    flex-direction: column; gap: 3px; padding: 6px 4px;
    font-size: var(--fib-text-2xs); font-weight: 500;
  }
  .fib-nav-item[aria-current="page"] { background: none; color: var(--fib-diamond); }

  .fib-main { padding-bottom: 76px; }
  .fib-page { padding: var(--fib-space-6) var(--fib-space-4) var(--fib-space-7); }
  .fib-section { padding-top: var(--fib-space-7); }

  .fib-table th, .fib-table td { padding-left: var(--fib-space-3); padding-right: var(--fib-space-3); }
}

/* Two-column editorial splits collapse before the shell does — they run out of
   room at a wider viewport than the rail does. */
@media (max-width: 1040px) {
  .fib-hero-grid { grid-template-columns: minmax(0, 1fr); gap: var(--fib-space-5); }
  .fib-hero-figures { align-items: flex-start; }
  .fib-hero-figures .fib-figure { align-items: flex-start; text-align: left; }
  .fib-collection, .fib-signature { grid-template-columns: minmax(0, 1fr); gap: var(--fib-space-6); }
  .fib-signature-line { max-width: none; }
  /* Grid over numbers rather than beside them. */
  .fib-inv { grid-template-columns: minmax(0, 1fr); gap: var(--fib-space-5); }
}

@media (max-width: 720px) {
  /* Secondary columns that stop earning their width before the layout breaks. */
  .fib-hide-sm { display: none; }

  .fib-match-row {
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: var(--fib-space-3);
  }
  .fib-match-when { grid-row: 1; grid-column: 1; }
  .fib-match-score { grid-row: 1; grid-column: 2; }
  .fib-match-winner { grid-row: 2; grid-column: 1 / -1; }
  .fib-match-margin { grid-row: 3; grid-column: 1 / -1; }

}

@media (max-width: 560px) {
  .fib { --fib-text-5xl: 3rem; --fib-text-4xl: 2.5rem; --fib-text-3xl: 2rem; }

  /*
   * Nine columns stay nine columns — that is the whole reference. The slot
   * shrinks to fit instead, and the sprite holds at 32px (an exact 4:1
   * downscale of the 128px source) so the pixel art never gets chewed.
   */
  .fib-inv-grid { --slot: 36px; gap: 3px; }
  .fib-inv-drawer > td { padding-left: var(--fib-space-3); padding-right: var(--fib-space-3); }

  .fib-ach-row { grid-template-columns: auto 1fr; row-gap: var(--fib-space-2); }
  .fib-ach-side { grid-column: 2; align-items: flex-start; text-align: left; }
  .fib-ramp-row { grid-template-columns: 76px 1fr auto; gap: var(--fib-space-2); }

  /* The hero avatar drops to 64px — an exact 2:1 downscale, still a legal
     sprite size — so the name keeps the width it needs. */
  .fib-hero-id { gap: var(--fib-space-4); }
  .fib-hero-avatar, .fib-hero-avatar img { width: 64px; height: 64px; }

  /* ".fib-pulse" is a grid and owns its own two-up rule via "@container
     fib-page"; only the flex strip needs a basis here. */
  .fib-stat-strip > * { flex-basis: 45%; border-left: none; padding-left: 0; }

  /* A three-across podium at 360px gives every name 100px. Stack it. */
  .fib-podium { grid-template-columns: minmax(0, 1fr); }
  .fib-podium-slot,
  .fib-podium-slot[data-place="1"],
  .fib-podium-slot[data-place="2"],
  .fib-podium-slot[data-place="3"] {
    order: 0; padding: var(--fib-space-4) var(--fib-space-3);
    flex-direction: row; text-align: left; gap: var(--fib-space-3);
    background: none; border-radius: 0;
  }
  .fib-podium-slot .fib-podium-name { flex: 1 1 auto; }
  .fib-podium-slot .fib-figure-label { display: none; }
  /* The arrow survives, its spelled-out unit doesn't — the row is tight here
     and the accessible name still carries "up 2 places this week". */
  .fib-podium-move .fib-delta-unit { display: none; }
  .fib-podium-slot[data-place="1"] .fib-podium-value,
  .fib-podium-value { font-size: var(--fib-text-2xl); }

  .fib-feature-figures { gap: var(--fib-space-5); }
}
`;

let injected = false;

/**
 * Idempotent: the shell calls this on mount, and mounting twice (StrictMode
 * does exactly that in development) must not append a second copy of a
 * 700-line stylesheet.
 */
export function injectStyles() {
  if (injected || typeof document === 'undefined') return;
  injected = true;

  if (!document.getElementById('fib-fonts')) {
    const pre1 = document.createElement('link');
    pre1.rel = 'preconnect';
    pre1.href = 'https://fonts.googleapis.com';

    const pre2 = document.createElement('link');
    pre2.rel = 'preconnect';
    pre2.href = 'https://fonts.gstatic.com';
    pre2.crossOrigin = 'anonymous';

    const font = document.createElement('link');
    font.id = 'fib-fonts';
    font.rel = 'stylesheet';
    font.href = FONT_HREF;

    document.head.append(pre1, pre2, font);
  }

  const style = document.createElement('style');
  style.id = 'fib-stats-styles';
  style.textContent = css;
  document.head.appendChild(style);
}

export { tokens };
