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
  '&family=Jersey+10' +
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

/* One focus ring everywhere. Blue, the interactive accent — focus is a
   "you can act here" signal, which is exactly what blue means now. */
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

/*
 * The wordmark. It used to be "Statistics" in 14px Inter Bold beside a mono
 * "Beta" - a label, not a mark, and the only place on the page that could have
 * said whose statistics these were. Now it is the game's own initials in the
 * jersey, with the section name set a step down on the same baseline.
 */
.fib-rail-brand {
  display: flex; align-items: baseline; gap: 7px;
  padding: 0 var(--fib-space-3) var(--fib-space-6);
  font-family: var(--fib-font-display); font-weight: 400;
  line-height: 0.8;
}
.fib-rail-brand b { font-size: var(--fib-display-mark); font-weight: 400; color: var(--fib-ink); }
.fib-rail-brand span { font-size: var(--fib-display-sm); color: var(--fib-ink-3); }
.fib-rail-brand em {
  align-self: flex-start;
  font-style: normal; font-family: var(--fib-font-mono);
  font-size: var(--fib-text-2xs); color: var(--fib-netherite);
  letter-spacing: 0.04em; line-height: 1;
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
/* Active item wears the interactive accent: a blue-tinted pill, blue label and
   icon, and a top gloss so it reads as the lit, current destination. */
.fib-nav-item[aria-current="page"] {
  background: var(--fib-blue-tint); color: var(--fib-blue-ink); font-weight: 600;
  box-shadow: inset 0 1px 0 0 var(--fib-gloss-top);
}
/* The destination's item. Softened at rest - part-desaturated, slightly dim -
   not greyed out: fully grey, 16px sprites stopped reading as items at all.
   Softened so a column of
   five full-colour sprites does not outshout the labels; full colour on hover
   and on the current page, where it is the "you are here" cue beside the blue. */
.fib-nav-item .fib-nav-sprite {
  flex: none; width: 16px; height: 16px;
  image-rendering: pixelated;
  filter: saturate(0.55); opacity: 0.8;
  transition: filter var(--fib-motion-fast) var(--fib-ease), opacity var(--fib-motion-fast) var(--fib-ease),
              transform var(--fib-motion-base) var(--fib-ease);
}
.fib-nav-item:hover .fib-nav-sprite,
.fib-nav-item[aria-current="page"] .fib-nav-sprite {
  filter: drop-shadow(0 1px 1px var(--fib-shadow-deep)); opacity: 1;
}
.fib-nav-item:hover .fib-nav-sprite { transform: translateY(-1px); }

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
  max-width: var(--fib-measure, 1180px); margin: 0 auto;
  padding: var(--fib-space-7) var(--fib-space-6) var(--fib-space-8);
  container: fib-page / inline-size;
}

/*
 * The wide measure, for the three views that are a GRID or a TABLE rather than a
 * document: items, matches, ranking, players.
 *
 * 1180px is the right measure for a page you read — the profile, a match report,
 * anything with prose and a chart. It is the wrong measure for a marketplace
 * grid. At 1920 the rail took 232px and the grid took 1180, which left 259px of
 * dead space to the right of the content and the rail pinned to the left edge:
 * visibly off-centre, and four columns where there was room for six.
 *
 * That gap is the single biggest reason a dense listing read as documentation
 * rather than as an index. Prose does not get wider with it — every lede and
 * paragraph is capped at its own ch measure independently — so the extra width
 * goes only to the things that can use it.
 */
.fib-page--wide { --fib-measure: 1560px; }

/* ── 3. Type + section furniture ──────────────────────────────────────── */

/*
 * Headings are set in the jersey (see tokens.js, rule 2). One weight, no
 * tracking: the face is drawn on a pixel grid, and both synthetic bold and
 * negative letter-spacing push its pixels off that grid. Leading is tight
 * because the face's ascenders are short - at 1.15 a two-line heading reads
 * as two separate lines.
 */
.fib-h1 {
  font-family: var(--fib-font-display);
  font-size: var(--fib-display-md); font-weight: 400;
  letter-spacing: 0; line-height: 0.95; text-wrap: balance;
}
.fib-display {
  font-family: var(--fib-font-display);
  font-size: var(--fib-display-xl); font-weight: 400;
  line-height: 0.9; letter-spacing: 0; text-wrap: balance;
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
  /* A hairline top highlight: the CSFloat card cue that lifts a flat fill into
     a surface catching light from above. */
  box-shadow: inset 0 1px 0 0 var(--fib-gloss-top);
}
.fib-panel--flush { padding: 0; overflow: hidden; }

/*
 * ── Product card (the CSFloat shape) ──────────────────────────────────────
 *
 * The marketplace grammar, adopted deliberately for LISTING views (players,
 * items, matches): a uniform, data-rich card as the atomic unit. This is the
 * "identical card grid" the museum system warned against — legitimate here
 * because each card carries genuinely different, scannable data (a rank, a win
 * rate, a score, a meter), not a decorative icon+heading+text repeat. Featured
 * rows only; the long tail stays a table, so the grid never runs on forever.
 *
 * A tone top-LINE (never a side stripe) marks rank/rarity; the card lifts and
 * lights on hover, CSFloat's headline behaviour, made a reusable shell here.
 */
.fib-pcard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(216px, 1fr));
  gap: var(--fib-space-4);
}
.fib-pcard {
  position: relative; display: flex; flex-direction: column;
  width: 100%; text-align: left; cursor: pointer;
  background: linear-gradient(var(--fib-plinth-2), var(--fib-plinth));
  border: 1px solid var(--fib-line-soft);
  border-radius: var(--fib-radius-lg);
  overflow: hidden;
  box-shadow: inset 0 1px 0 0 var(--fib-gloss-top);
  transition: transform var(--fib-motion-base) var(--fib-ease),
              border-color var(--fib-motion-fast) var(--fib-ease),
              box-shadow var(--fib-motion-base) var(--fib-ease);
}
/* The tone line rides the top edge — rank gold, scarcity diamond, else a quiet
   line. A line, not a stripe: the banned pattern is a >1px colour on the SIDE. */
.fib-pcard::before {
  content: ''; position: absolute; inset: 0 0 auto 0; height: 3px;
  background: var(--pcard-tone, var(--fib-line));
  z-index: 2;
}
.fib-pcard:hover {
  transform: translateY(-4px);
  border-color: color-mix(in oklch, var(--pcard-tone, var(--fib-blue)) 55%, var(--fib-line));
  box-shadow: inset 0 1px 0 0 var(--fib-gloss-top),
              0 20px 52px -18px var(--pcard-glow, var(--fib-blue));
}
/*
 * The media band: object on a lit field, CSFloat's image area — the object sits
 * over a colour that BLEEDS up from the bottom in the card's own tone (the
 * marketplace's rarity bleed), a top catch of light, and a bright tone line
 * closing it off from the data below. This is what turns an empty square into a
 * lit display.
 */
.fib-pcard-media {
  position: relative;
  display: grid; place-items: center;
  min-height: 160px;
  padding: var(--fib-space-5) var(--fib-space-4);
  background:
    radial-gradient(130% 96% at 50% 128%, color-mix(in oklch, var(--pcard-tone, var(--fib-blue)) 30%, transparent), transparent 68%),
    radial-gradient(92% 120% at 50% 0, var(--fib-gloss-top), transparent 70%);
  border-bottom: 1px solid color-mix(in oklch, var(--pcard-tone, var(--fib-line-soft)) 45%, var(--fib-line-soft));
}
/*
 * Item-index variant. The top of an item card carries no phase bar: the phase
 * is spoken once, where it matters — as the line dividing the texture from the
 * item name. So the top tone line is dropped, and the media/body seam is
 * promoted from a near-invisible tinted hairline to a 2px band in the card's
 * own phase tone (green EARLY, yellow MID, red LATE, netherite for the
 * unpooled). One phase mark per card, seated at the divide it explains.
 */
.fib-items-cards .fib-pcard::before { display: none; }
.fib-items-cards .fib-pcard-media {
  border-bottom: 2px solid var(--pcard-tone, var(--fib-line-soft));
}
/* The object gets its own seat of shadow so it lifts off the lit field. */
.fib-pcard-media > .fib-avatar { box-shadow: 0 6px 18px -6px var(--fib-shadow-deep); }
/*
 * The item texture sits DIRECTLY on the lit field — no inner well. The media
 * band is already the lit display (tone bleed, top catch, closing line), so a
 * box inside a box was one surface too many. Bigger, and it scales down rather
 * than overflowing the narrowest card. A pixel-art drop shadow seats it.
 */
.fib-pcard-media .fib-pcard-sprite {
  width: 128px; max-width: 100%; height: auto;
  /* A gentle seat — enough to lift the texture off the field — plus the tight
     light halo that rescues dark items (blackstone, basalt) against it. */
  filter: drop-shadow(0 3px 5px var(--fib-shadow-soft))
          drop-shadow(0 0 1px oklch(1 0 0 / 0.55));
}
/* The rank/medal badge, docked to the media corner like a CSFloat quality tag. */
.fib-pcard-badge { position: absolute; top: var(--fib-space-3); left: var(--fib-space-3); }
.fib-pcard-body {
  display: flex; flex-direction: column; gap: var(--fib-space-3);
  padding: var(--fib-space-4) var(--fib-space-4) var(--fib-space-4);
  flex: 1 1 auto; min-width: 0;
}
/* An item's name is a name, so it takes the jersey like a player's does. Long
   ones ("Waxed Oxidized Cut Copper Stairs") wrap to two lines rather than
   shrinking; balance keeps the break even. */
.fib-pcard-title {
  font-family: var(--fib-font-display); font-weight: 400;
  font-size: var(--fib-display-sm); letter-spacing: 0; line-height: 0.95;
  overflow-wrap: anywhere; text-wrap: balance;
}
.fib-pcard-sub { margin-top: 2px; }
/* The item card's phase tag: a short uppercase word in the phase colour. Colour
   is set inline per phase (LATE takes the lighter text-safe red); the shape is
   here so every card's tag is sized and tracked identically. */
.fib-pcard-phase { font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
/* A labelled meter inside a card: the track spans the card and its value sits
   to the right, the CSFloat price+bar rhythm. Reuses .fib-ramp-track. */
.fib-pcard-meter { display: flex; flex-direction: column; gap: 6px; }
.fib-pcard-meter-head {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: var(--fib-space-3);
}
.fib-pcard-foot {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--fib-space-3);
  margin-top: auto;
  padding: var(--fib-space-3) var(--fib-space-4);
  border-top: 1px solid var(--fib-line-soft);
}

/* Phase legend for the item index: the colour code named, once, above the grid. */
.fib-phase-legend { display: flex; align-items: center; gap: var(--fib-space-4); }
.fib-phase-legend span {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: var(--fib-text-xs); color: var(--fib-ink-3);
}
.fib-phase-legend i { width: 9px; height: 9px; border-radius: var(--fib-radius-sm); flex: none; }

/*
 * The item index's records. Three objects, not three cards of the grid below:
 * the sprite at 128px on a floor lit in its match phase (the same
 * green/yellow/red the grid's cards carry), the name in the jersey, the
 * record in mono. The pressed one is the grid's current sort, rimmed blue.
 */
.fib-item-records {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--fib-space-4);
  margin-bottom: var(--fib-space-7);
}
.fib-item-record {
  display: grid; grid-template-columns: 136px minmax(0, 1fr);
  align-items: center; gap: var(--fib-space-5);
  padding: var(--fib-space-4) var(--fib-space-5) var(--fib-space-4) var(--fib-space-4);
  border-radius: var(--fib-radius-lg);
  background: var(--fib-plinth);
  box-shadow: inset 0 0 0 1px var(--fib-line-soft), inset 0 1px 0 0 var(--fib-gloss-top);
  text-align: left; cursor: pointer;
  transition: box-shadow var(--fib-motion-fast) var(--fib-ease), transform var(--fib-motion-base) var(--fib-ease);
}
.fib-item-record:hover { transform: translateY(-2px); }
.fib-item-record[aria-pressed="true"] {
  box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--fib-blue) 60%, var(--fib-line)),
              inset 0 1px 0 0 var(--fib-gloss-top), 0 14px 34px -22px var(--fib-blue);
}
.fib-item-record-media {
  position: relative; display: grid; place-items: center;
  width: 136px; height: 136px; border-radius: var(--fib-radius-md);
  background:
    radial-gradient(90% 60% at 50% 115%, color-mix(in oklch, var(--phase) 48%, transparent), transparent 70%),
    linear-gradient(var(--fib-plinth-2), var(--fib-sunk));
  box-shadow: inset 0 1px 0 0 var(--fib-edge-strong);
}
.fib-item-record-media img {
  width: 112px; height: 112px; image-rendering: pixelated;
  filter: drop-shadow(0 8px 8px var(--fib-shadow-deep));
  transition: transform var(--fib-motion-base) var(--fib-ease);
}
.fib-item-record:hover .fib-item-record-media img { transform: translateY(-4px) scale(1.03); }
.fib-item-record-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.fib-item-record-name {
  font-family: var(--fib-font-display); font-weight: 400;
  font-size: var(--fib-display-sm); line-height: 1; text-wrap: balance;
}
.fib-item-record-figure { color: var(--fib-ink-3); font-size: var(--fib-text-sm); margin-top: var(--fib-space-2); }
.fib-item-record-figure b {
  font-family: var(--fib-font-mono); font-variant-numeric: tabular-nums;
  font-size: var(--fib-text-2xl); font-weight: 600; color: var(--fib-ink); letter-spacing: -0.02em;
}

@container fib-page (max-width: 520px) {
  .fib-item-record { grid-template-columns: 88px minmax(0, 1fr); gap: var(--fib-space-4); }
  .fib-item-record-media { width: 88px; height: 88px; }
  .fib-item-record-media img { width: 64px; height: 64px; }
}

/* ── The player directory ─────────────────────────────────────────────────
 *
 * One card per player, grouped by whether they have played lately. See
 * PlayerCard in Players.jsx. Not a leaderboard: nothing is ordered by a
 * placing, and no card is gilded for being better than another.
 */

.fib-dir-group + .fib-dir-group { margin-top: var(--fib-space-7); }
.fib-dir-head {
  display: flex; align-items: baseline; gap: var(--fib-space-3); flex-wrap: wrap;
  margin-bottom: var(--fib-space-4);
  font-family: var(--fib-font-display); font-weight: 400;
  font-size: var(--fib-display-sm); line-height: 1; color: var(--fib-ink-2);
}

.fib-player-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: var(--fib-space-4);
}

/*
 * The card. A plinth-lit panel that lifts and rims blue on hover, because it
 * is a link. The head stands on its block in a column of its own, so every
 * card's name starts on the same x whatever the head render's width.
 */
.fib-player-card {
  display: grid; grid-template-columns: 84px minmax(0, 1fr);
  align-items: center; gap: var(--fib-space-4);
  padding: var(--fib-space-4) var(--fib-space-5) var(--fib-space-4) var(--fib-space-4);
  border-radius: var(--fib-radius-lg);
  background: linear-gradient(var(--fib-plinth), color-mix(in oklch, var(--fib-plinth) 60%, var(--fib-void)));
  box-shadow: inset 0 0 0 1px var(--fib-line-soft), inset 0 1px 0 0 var(--fib-gloss-top);
  text-align: left; cursor: pointer;
  transition: box-shadow var(--fib-motion-fast) var(--fib-ease),
              transform var(--fib-motion-base) var(--fib-ease);
}
.fib-player-card:hover {
  box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--fib-blue) 48%, var(--fib-line)),
              inset 0 1px 0 0 var(--fib-gloss-top),
              0 14px 30px -18px var(--fib-blue);
  transform: translateY(-2px);
}
/* Players the server has not seen lately stand a step back: the same card,
   dimmer, so the regulars read first without anyone being hidden. */
.fib-player-grid[data-away] .fib-player-card { background: var(--fib-void); }
.fib-player-grid[data-away] .fib-player-stand { opacity: 0.7; filter: saturate(0.6); }

/* The head on its block - the podium's tower, one block high. Same measured
   fractions as ".fib-podium-tower". */
.fib-player-stand {
  --block: 64px;
  position: relative;
  display: flex; flex-direction: column-reverse; align-items: center;
  padding-top: 4px;
}
.fib-player-stand::after {
  content: ''; position: absolute; left: 50%; bottom: -6px;
  width: 76px; height: 12px; transform: translateX(-50%);
  background: radial-gradient(closest-side, var(--fib-shadow-deep), transparent);
}
.fib-player-block { position: relative; z-index: 1; width: var(--block); height: var(--block); filter: none; }
.fib-player-stand .fib-podium-head {
  position: relative; z-index: 2;
  width: 54px; margin-bottom: calc(var(--block) * -0.29);
  transition: transform var(--fib-motion-base) var(--fib-ease);
}
.fib-player-card:hover .fib-player-stand .fib-podium-head { transform: translateY(-4px); }

.fib-player-body { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.fib-player-name {
  font-family: var(--fib-font-display); font-weight: 400;
  font-size: var(--fib-display-sm); line-height: 1;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.fib-player-card:hover .fib-player-name { color: var(--fib-blue-ink); }

.fib-player-record {
  display: flex; align-items: center; flex-wrap: wrap;
  gap: 6px var(--fib-space-3);
  margin-top: var(--fib-space-2);
}
.fib-player-wl {
  font-family: var(--fib-font-mono); font-variant-numeric: tabular-nums;
  font-size: var(--fib-text-md); color: var(--fib-ink-3);
}
.fib-player-wl b { color: var(--fib-ink); font-weight: 600; }
.fib-player-record .fib-form-pips { grid-template-columns: repeat(var(--cols, 10), 10px); gap: 3px; }
.fib-player-record .fib-form-pips i { width: 10px; height: 10px; }

.fib-player-facts {
  display: flex; flex-wrap: wrap; align-items: center; gap: 2px var(--fib-space-4);
  margin-top: var(--fib-space-2);
  font-size: var(--fib-text-xs); color: var(--fib-ink-3);
}
.fib-player-facts b { color: var(--fib-ink-2); font-weight: 600; }
.fib-player-facts > span:first-child b { font-family: var(--fib-font-mono); font-variant-numeric: tabular-nums; }
.fib-player-partner { display: inline-flex; align-items: center; gap: 5px; }

@container fib-page (max-width: 420px) {
  .fib-player-grid { grid-template-columns: minmax(0, 1fr); }
  .fib-player-card { grid-template-columns: 64px minmax(0, 1fr); padding: var(--fib-space-3); gap: var(--fib-space-3); }
  .fib-player-stand { --block: 48px; }
  .fib-player-stand .fib-podium-head { width: 42px; }
}

/* ── 4. Objects: wells, sprites, avatars, medals ──────────────────────── */

/*
 * The well is the module's signature: a recess cut into the surface, lit from
 * above, so a 16x16 sprite reads as an object on a shelf rather than an icon
 * floating in a void. Inset shadow, not a drop shadow — the object is IN the
 * surface.
 */
.fib-well {
  position: relative;
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
 * Match-phase bleed. A soft wash of the item's phase colour rising from the
 * floor of the well — the same green/yellow/red the item index uses, sitting on
 * a different axis from the rarity rim so a scarce EARLY item can show both.
 */
.fib-well[data-phase]::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit;
  pointer-events: none; z-index: 0;
  background: radial-gradient(86% 64% at 50% 122%, color-mix(in oklch, var(--phase) 58%, transparent), transparent 60%);
}
.fib-well[data-phase] > .fib-sprite { position: relative; z-index: 1; }

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

/*
 * The background is a head waiting to arrive. Heads come from mc-heads, a third
 * party that routinely takes a second or two, and until then every avatar was a
 * flat grey square - five of nine on the player directory at first paint, which
 * read as missing players rather than slow ones. Two dark pixels on the 8x8 grid
 * where a face's eyes sit make the placeholder say "a head goes here"; the real
 * render is opaque and covers it the moment it lands.
 */
.fib-avatar {
  image-rendering: pixelated;
  border-radius: var(--fib-radius-sm);
  background:
    /* Two pixels wide, one tall, at columns 1-2 and 5-6 of row 4 - the 8x8
       face grid. Percent positions resolve against (box - tile), hence the
       odd-looking numbers. */
    linear-gradient(var(--fib-plinth), var(--fib-plinth)) 16.7% 57.1% / 25% 12.5% no-repeat,
    linear-gradient(var(--fib-plinth), var(--fib-plinth)) 83.3% 57.1% / 25% 12.5% no-repeat,
    var(--fib-line);
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
  /* A duration like "33m 8s" carries an internal space; without this it breaks
     across two lines on a narrow card. The number is one token — keep it whole
     and let the container query shrink the type instead. */
  white-space: nowrap;
}
.fib-figure-unit {
  font-size: 0.42em; font-weight: 400; letter-spacing: 0;
  color: var(--fib-ink-3);
  white-space: normal;
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
  position: relative; height: 4px; margin-top: 8px;
  background: var(--fib-plinth-2); border-radius: var(--fib-radius-pill);
  box-shadow: inset 0 1px 1px 0 var(--fib-shadow-soft);
  overflow: hidden;
}
/*
 * The fill carries a top-edge gloss over its colour — the CSFloat meter look.
 * Share-of-best is not good/bad, so the gloss is a lightness highlight within
 * the fill's OWN hue, never a green→red judgment the data doesn't make.
 */
.fib-gauge i {
  position: absolute; inset: 0 auto 0 0;
  display: block; width: 100%; border-radius: inherit;
  background: linear-gradient(var(--fib-gloss-top), transparent 65%), var(--fib-ink-3);
  transform-origin: left center; transform: scaleX(var(--fill, 0));
  transition: transform var(--fib-motion-slow) var(--fib-ease);
}
.fib-gauge[data-tone="gold"] i    { background: linear-gradient(var(--fib-gloss-top), transparent 65%), var(--fib-gold); }
.fib-gauge[data-tone="diamond"] i { background: linear-gradient(var(--fib-gloss-top), transparent 65%), var(--fib-diamond); }
.fib-gauge[data-tone="emerald"] i { background: linear-gradient(var(--fib-gloss-top), transparent 65%), var(--fib-emerald); }
.fib-gauge[data-tone="blue"] i    { background: linear-gradient(var(--fib-gloss-top), transparent 65%), var(--fib-blue); }

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
/* Primary action wears the interactive accent, white ink on blue, with a soft
   glow that gives the button the "live" lift CSFloat's primaries have. */
.fib-btn--primary {
  background: var(--fib-blue); color: var(--fib-ink); font-weight: 600;
  box-shadow: inset 0 1px 0 0 var(--fib-gloss-top), 0 6px 18px -10px var(--fib-blue);
}
.fib-btn--primary:hover { background: var(--fib-blue-hi); }
.fib-btn--quiet { background: none; color: var(--fib-ink-2); box-shadow: none; }
.fib-btn--quiet:hover { background: var(--fib-plinth); color: var(--fib-ink); }

/*
 * Segmented control for scope (solo / duos / combined) — the most-used control
 * in the module, so it is a real segmented control with a sliding indicator
 * rather than three buttons that happen to sit together.
 */
/* Wraps, because the thumb measures both axes (see Segmented in Primitives) —
   so one control covers three options and eight, and there is no second
   "pick one of N" vocabulary for the wide cases. */
.fib-seg {
  position: relative; display: inline-flex; flex-wrap: wrap; gap: 2px;
  max-width: 100%;
  padding: 3px; border-radius: var(--fib-radius-md);
  background: var(--fib-plinth);
  box-shadow: inset 0 0 0 1px var(--fib-line-soft);
}
.fib-seg-thumb {
  position: absolute; top: 0; left: 0;
  border-radius: var(--fib-radius-sm);
  background: var(--fib-plinth-2);
  box-shadow: inset 0 1px 0 0 var(--fib-edge);
  transition: transform var(--fib-motion-base) var(--fib-ease),
              width var(--fib-motion-base) var(--fib-ease),
              height var(--fib-motion-base) var(--fib-ease);
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

/* .fib-chip is gone with the Chip component — every one of its five call sites
   was a "pick one of N" that Segmented already owned. See the note where Chip
   used to be defined in Primitives.jsx. */

.fib-search {
  display: flex; align-items: center; gap: 9px;
  padding: 0 12px; height: 38px;
  border-radius: var(--fib-radius-md);
  background: var(--fib-sunk);
  box-shadow: inset 0 0 0 1px var(--fib-line-soft);
  transition: box-shadow var(--fib-motion-fast) var(--fib-ease);
}
.fib-search:focus-within { box-shadow: inset 0 0 0 1px var(--fib-blue); }
/* The label's :focus-within border above IS the focus indicator; suppress the
   input's own global :focus-visible outline so it doesn't draw a second ring
   that overflows the box top and bottom. */
.fib-search input:focus-visible { outline: none; }
.fib-search svg { flex: none; color: var(--fib-netherite); }
.fib-search input {
  flex: 1; min-width: 0; height: 100%;
  background: none; border: none; outline: none;
  color: var(--fib-ink); font: inherit; font-size: var(--fib-text-md);
}
/* Placeholder sits at ink-3, not a browser-default grey: it is text and has to
   clear 4.5:1 like any other text. */
.fib-search input::placeholder { color: var(--fib-ink-3); opacity: 1; }

/* The / accelerator, printed in the field. A shortcut nobody can see is a
   shortcut nobody uses, which is why the marketplace this module takes its cues
   from prints it too. */
.fib-search-key {
  flex: none;
  font-family: var(--fib-font-mono); font-size: var(--fib-text-2xs);
  line-height: 1; color: var(--fib-ink-3);
  padding: 3px 5px;
  border-radius: var(--fib-radius-sm);
  background: var(--fib-plinth);
  box-shadow: inset 0 0 0 1px var(--fib-line-soft);
}
/* Once you are typing, the hint has done its job and the field needs the room. */
.fib-search:focus-within .fib-search-key { display: none; }

/* ── Facets ───────────────────────────────────────────────────────────────
 *
 * The filter rail. Two columns on desktop: the rail, then the content. The rail
 * is the affordance the module was missing — 616 items sortable three ways and
 * searchable by name, with no way to ask the index a question.
 *
 * It is a <details> at every size, not only on mobile, so the same element is
 * doing the same job in both layouts. On desktop the marker is hidden and it sits
 * open; below the shell's breakpoint the summary becomes a real disclosure button.
 */
.fib-faceted {
  display: grid;
  grid-template-columns: var(--facet-rail, 236px) minmax(0, 1fr);
  gap: var(--fib-space-6);
  align-items: start;
}
.fib-faceted-body { min-width: 0; }

.fib-facet-rail {
  position: sticky; top: var(--fib-space-5);
  display: flex; flex-direction: column;
  padding: var(--fib-space-4);
  border-radius: var(--fib-radius-lg);
  background: var(--fib-plinth);
  border: 1px solid var(--fib-line-soft);
  box-shadow: inset 0 1px 0 0 var(--fib-gloss-top);
}
.fib-facet-rail > summary {
  display: flex; align-items: center; gap: var(--fib-space-3);
  font-size: var(--fib-text-xs); font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--fib-ink-2);
  cursor: pointer;
}
.fib-facet-rail > summary::-webkit-details-marker { display: none; }
.fib-facet-rail > summary::marker { content: ''; }
.fib-facet-count {
  font-family: var(--fib-font-mono); font-size: var(--fib-text-2xs);
  letter-spacing: 0; text-transform: none;
  min-width: 18px; padding: 2px 5px; text-align: center;
  border-radius: var(--fib-radius-pill);
  background: var(--fib-blue-tint); color: var(--fib-blue-ink);
}
.fib-facet-rail-body {
  display: flex; flex-direction: column; gap: var(--fib-space-5);
  margin-top: var(--fib-space-5);
}

.fib-facet { display: flex; flex-direction: column; gap: 7px; border: none; padding: 0; margin: 0; }
.fib-facet + .fib-facet { padding-top: var(--fib-space-5); border-top: 1px solid var(--fib-line-soft); }
.fib-facet-title {
  padding: 0;
  font-size: var(--fib-text-sm); font-weight: 600;
  color: var(--fib-ink); letter-spacing: -0.005em;
}
.fib-facet-hint {
  font-size: var(--fib-text-2xs); line-height: 1.5;
  color: var(--fib-ink-3); text-wrap: pretty;
  margin-bottom: 2px;
}
.fib-facet-clear { align-self: flex-start; }

.fib-check {
  display: flex; align-items: center; gap: 9px;
  font-size: var(--fib-text-sm); color: var(--fib-ink-2);
  cursor: pointer; padding: 2px 0;
}
/* The native box, tinted rather than replaced: a filter is the last control to
   reinvent, because the reader has to trust that what they ticked is what they
   got. accent-color recolours it without giving up the platform's own focus
   ring, keyboard behaviour or indeterminate state. */
.fib-check input {
  flex: none; width: 14px; height: 14px; margin: 0;
  accent-color: var(--fib-blue);
  cursor: pointer;
}
.fib-check-swatch { width: 8px; height: 8px; border-radius: var(--fib-radius-sm); flex: none; }
.fib-check-label { flex: 1; min-width: 0; }
.fib-check:hover .fib-check-label { color: var(--fib-ink); }

.fib-range { display: flex; gap: var(--fib-space-3); }
.fib-range label {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; gap: 4px;
}
.fib-range label > span {
  display: flex; align-items: baseline; gap: 4px;
  font-size: var(--fib-text-2xs); font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--fib-ink-3);
}
.fib-range label em {
  font-style: normal; letter-spacing: 0; color: var(--fib-netherite);
}
.fib-range input {
  width: 100%; min-width: 0; height: 32px;
  padding: 0 8px;
  border: none; border-radius: var(--fib-radius-md);
  background: var(--fib-sunk);
  box-shadow: inset 0 0 0 1px var(--fib-line-soft);
  color: var(--fib-ink);
  font-family: var(--fib-font-mono); font-size: var(--fib-text-sm);
  font-variant-numeric: tabular-nums;
}
.fib-range input:focus-visible { outline: none; box-shadow: inset 0 0 0 1px var(--fib-blue); }
.fib-range input::placeholder { color: var(--fib-ink-3); opacity: 1; }

/* The bar above a faceted grid: the sort on the left, the colour legend on the
   right, wrapping to two rows before either has to shrink. */
.fib-items-bar {
  display: flex; flex-wrap: wrap; align-items: center;
  gap: var(--fib-space-3) var(--fib-space-5);
  margin-bottom: var(--fib-space-5);
}
.fib-items-bar .fib-phase-legend { margin-left: auto; }
.fib-items-count { padding: var(--fib-space-6) 0; text-align: center; }

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

/* A cell holding one or two of them — a duo is two names in one row. */
.fib-cell-players {
  display: flex; align-items: center; flex-wrap: wrap;
  gap: var(--fib-space-3); min-width: 0;
}

/* A whole row that opens something. The chevron is the real control, but the
   row takes the click too, and a clickable row that keeps the text cursor never
   tells anyone that. */
.fib-row-toggle { cursor: pointer; }

/* Rows that are themselves links into a deeper view. */
.fib-row-link {
  display: flex; align-items: center; gap: var(--fib-space-4);
  width: 100%; padding: var(--fib-space-4);
  border-bottom: 1px solid var(--fib-line-soft);
  text-align: left;
  transition: background var(--fib-motion-fast) var(--fib-ease);
}
.fib-row-link:hover { background: var(--fib-blue-tint); }
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
/* The full-size trace names its ticks in the caption beside it, so they have to
   survive being looked for. The miniature keeps the quiet weight above. */
.fib-chart .tick--lead { stroke: var(--fib-ink-3); stroke-width: 1.5; opacity: 0.9; }
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

/*
 * The match page's legend is a lane panel: each competitor's swatch, heads and
 * name, then what they are doing at the cursor - the item they are hunting and
 * for how long, or their last find at rest - and their score at that moment.
 * One card per lane, so the panel reads as a scoreboard beside the race.
 */
.fib-chart-legend.fib-lanes {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--fib-space-3);
  padding-top: var(--fib-space-4);
}
.fib-lanes li {
  display: grid;
  grid-template-columns: 14px auto minmax(0, 1fr);
  grid-template-areas: "swatch faces name" "now now now";
  align-items: center; column-gap: 8px; row-gap: var(--fib-space-3);
  padding: var(--fib-space-3) var(--fib-space-4);
  border-radius: var(--fib-radius-md);
  background: var(--fib-plinth);
  box-shadow: inset 0 0 0 1px var(--fib-line-soft);
  font-size: var(--fib-text-sm); color: var(--fib-ink);
}
.fib-lanes li > i { grid-area: swatch; }
.fib-lanes li > .fib-lane-faces { grid-area: faces; }
.fib-lanes li > span:not(.fib-lane-faces):not(.fib-lane-now) { grid-area: name; font-weight: 600; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fib-lane-now {
  grid-area: now;
  display: grid; grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center; gap: var(--fib-space-3);
}
.fib-lane-now-empty { width: 40px; height: 40px; border-radius: var(--fib-radius-md); box-shadow: inset 0 0 0 1px var(--fib-line-soft); }
.fib-lane-now-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.fib-lane-now-text .fib-label { text-transform: uppercase; letter-spacing: 0.06em; font-size: var(--fib-text-2xs); }
.fib-lane-now-text b {
  font-family: var(--fib-font-display); font-weight: 400;
  font-size: var(--fib-text-xl); line-height: 1;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.fib-lane-now-score {
  font-family: var(--fib-font-mono); font-variant-numeric: tabular-nums;
  font-size: var(--fib-text-2xl); font-weight: 600; letter-spacing: -0.02em;
}

/* The race's item layers. Sprites in an SVG take no CSS class of their own,
   so the pixel rendering is set on the group. */
.fib-race-turn image, .fib-race-pull image { image-rendering: pixelated; }
.fib-race-turn, .fib-race-pull { transition: opacity var(--fib-motion-base) var(--fib-ease); }

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
  /* A top-edge gloss over the fill's own colour — the CSFloat meter sheen. The
     colour is currentColor (set by the caller); the gloss is a lightness
     highlight, never a hue shift. */
  background: linear-gradient(var(--fib-gloss-top), transparent 55%), currentColor;
  transform-origin: left center; transform: scaleX(var(--fill, 0));
  transition: transform var(--fib-motion-slow) var(--fib-ease);
}
.fib-ramp-row > em {
  font-family: var(--fib-font-mono); font-style: normal;
  font-size: var(--fib-text-xs); font-variant-numeric: tabular-nums;
  color: var(--fib-ink-2); min-width: 4ch; text-align: right;
}

.fib-trophy figcaption { gap: 5px; }

/*
 * ── The case and the chase ──────────────────────────────────────────────
 *
 * What a player holds and what they are chasing are different questions, so
 * they get different furniture rather than one list with a "Locked" word on
 * half the rows.
 *
 * THE CASE is a shelf of objects. Each tile is a glyph in a lit well, rimmed in
 * emerald.
 *
 * Emerald and not gold, though a trophy case argues for gold: gold means a rank
 * or a win in this module and an achievement is neither, and the old row list
 * already spent emerald on exactly this meaning (its unlocked tick was
 * --fib-emerald). Widening gold to cover "earned" would cost the podium its
 * only colour; reusing emerald costs nothing and keeps the vocabulary the module
 * already had.
 *
 * There is no per-achievement artwork in the plugin's payload, so the glyph names
 * the KIND of achievement and nothing more; a made-up sprite per row would be
 * decoration pretending to be data.
 *
 * THE CHASE is a progress list, closest first, and every row carries its own
 * numerator. It is one of the few places in the module where the number is
 * *not* the display element — here the bar is the point, because "how close"
 * is the question and a bar answers it faster than a fraction does.
 */
.fib-case {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(232px, 1fr));
  gap: var(--fib-space-5) var(--fib-space-5);
  list-style: none;
}
.fib-case-tile {
  display: grid; grid-template-columns: auto minmax(0, 1fr);
  align-items: start; gap: var(--fib-space-4);
}
/* The well is square and sized here rather than by the Sprite component, which
   measures itself from a 128px texture that a glyph does not have. */
.fib-case-well {
  width: 44px; height: 44px; flex: none;
  color: var(--fib-emerald);
  --tier: var(--fib-emerald);
}
.fib-case-body { min-width: 0; }
.fib-case-body b {
  display: block; font-size: var(--fib-text-md); font-weight: 600;
  letter-spacing: -0.005em; text-wrap: pretty;
}
.fib-case-body p { margin-top: 2px; text-wrap: pretty; }
.fib-case-when { display: block; margin-top: 5px; color: var(--fib-netherite); }

.fib-chase-head { margin-top: var(--fib-space-7); }
.fib-chase { display: flex; flex-direction: column; list-style: none; }
.fib-chase-row {
  display: grid; grid-template-columns: minmax(0, 1fr) 176px;
  align-items: center; gap: var(--fib-space-5);
  padding: var(--fib-space-4) 0;
  border-bottom: 1px solid var(--fib-line-soft);
}
.fib-chase-row:last-child { border-bottom: none; }
.fib-chase-body { min-width: 0; }
.fib-chase-body b {
  display: block; font-size: var(--fib-text-md); font-weight: 500;
  color: var(--fib-ink-2); letter-spacing: -0.005em;
}
.fib-chase-body p { font-size: var(--fib-text-sm); color: var(--fib-ink-3); text-wrap: pretty; }

.fib-chase-track {
  display: flex; flex-direction: column; align-items: stretch; gap: 6px;
}
.fib-chase-count {
  font-family: var(--fib-font-mono); font-size: var(--fib-text-xs);
  font-variant-numeric: tabular-nums; color: var(--fib-ink-2);
  text-align: right;
}
/* A single-round feat has no lifetime total to measure it. The row says which
   kind it is instead of drawing a bar that would mean nothing. */
.fib-chase-unmeasured { text-align: right; }

.fib-ach-filters {
  display: flex; flex-wrap: wrap; gap: 7px;
  margin-bottom: var(--fib-space-6);
}

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
/* The well lifts toward the viewer and catches an outer shadow — the CSFloat
   card behaviour, so a shelf of artifacts feels handled rather than pinned. */
.fib-sprite-lift .fib-well { transition: box-shadow var(--fib-motion-base) var(--fib-ease), transform var(--fib-motion-base) var(--fib-ease); }
.fib-sprite-lift:hover .fib-well {
  transform: translateY(-3px);
  box-shadow: inset 0 1px 0 0 var(--fib-edge-strong),
              inset 0 -1px 0 0 var(--fib-shadow-soft),
              0 14px 28px -14px var(--fib-shadow-deep);
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
              inset 0 -1px 0 0 var(--fib-shadow-soft),
              0 14px 28px -14px var(--fib-shadow-deep);
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

/* The profile's head on its block. The podium's measured fractions at hero
   scale: the head's lowest vertex rests 22% down the block, less the render's
   own 7% padding - hence -29% of the block. */
.fib-hero-stand {
  --block: 128px;
  position: relative; flex: none;
  display: flex; flex-direction: column-reverse; align-items: center;
  width: var(--block);
}
.fib-hero-stand::after {
  content: ''; position: absolute; left: 50%; bottom: -8px;
  width: calc(var(--block) * 1.15); height: 18px; transform: translateX(-50%);
  background: radial-gradient(closest-side, var(--fib-shadow-deep), transparent);
}
.fib-hero-block { position: relative; z-index: 1; width: var(--block); height: var(--block); filter: none; }
.fib-hero-stand .fib-podium-head {
  position: relative; z-index: 2;
  width: calc(var(--block) * 0.875);
  margin-bottom: calc(var(--block) * -0.29);
}

.fib-hero-name {
  font-family: var(--fib-font-display);
  font-size: var(--fib-display-lg); font-weight: 400;
  letter-spacing: 0; line-height: 0.9;
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

/*
 * The record as three stories (Winning, Hunting, Luck) and a footnote (Out in
 * the world). Each story: an item emblem and a jersey title, one headline
 * figure, then its supporting numbers as a quiet definition list - label left,
 * figure and standing right - so the headline is the only large number in the
 * column. Columns are divided by a rule, never boxed.
 */
.fib-stories {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
}
.fib-story {
  display: flex; flex-direction: column; gap: var(--fib-space-4);
  padding: 0 var(--fib-space-6);
  border-left: 1px solid var(--fib-line-soft);
  container: fib-figure / inline-size;
  min-width: 0;
}
.fib-story:first-child { border-left: none; padding-left: 0; }
.fib-story:last-child { padding-right: 0; }
.fib-story-head {
  display: flex; align-items: center; gap: var(--fib-space-3);
  font-family: var(--fib-font-display); font-weight: 400;
  font-size: var(--fib-display-sm); line-height: 1; color: var(--fib-ink-2);
}
.fib-story-head .fib-story-emblem { width: 32px; height: 32px; }
.fib-story-rest { display: flex; flex-direction: column; margin: 0; }
.fib-story-rest > div {
  display: flex; align-items: baseline; justify-content: space-between; gap: var(--fib-space-3);
  padding: 9px 0;
  border-top: 1px solid var(--fib-line-soft);
}
.fib-story-rest dt { font-size: var(--fib-text-sm); color: var(--fib-ink-3); }
.fib-story-rest dd { margin: 0; display: flex; align-items: baseline; gap: var(--fib-space-3); text-align: right; }
.fib-story-rest dd b, .fib-story-world-figs dd b {
  font-family: var(--fib-font-mono); font-variant-numeric: tabular-nums;
  font-size: var(--fib-text-lg); font-weight: 600; color: var(--fib-ink);
}

/* The footnote: one line, three figures, set small. */
.fib-story-world {
  display: flex; align-items: center; flex-wrap: wrap; gap: var(--fib-space-4) var(--fib-space-7);
  margin-top: var(--fib-space-6); padding-top: var(--fib-space-5);
  border-top: 1px solid var(--fib-line-soft);
}
.fib-story-world .fib-story-head { font-size: var(--fib-text-xl); }
.fib-story-world-figs { display: flex; flex-wrap: wrap; gap: var(--fib-space-3) var(--fib-space-7); margin: 0; }
.fib-story-world-figs > div { display: flex; flex-direction: column; gap: 2px; }
.fib-story-world-figs dt { font-size: var(--fib-text-xs); color: var(--fib-ink-3); order: 2; }
.fib-story-world-figs dd { margin: 0; display: flex; align-items: baseline; gap: 6px; }
.fib-story-world-figs dd em { font-style: normal; font-size: var(--fib-text-xs); color: var(--fib-ink-3); }

@container fib-page (max-width: 760px) {
  .fib-stories { grid-template-columns: minmax(0, 1fr); row-gap: var(--fib-space-6); }
  .fib-story { border-left: none; padding: 0; }
  .fib-story + .fib-story { border-top: 1px solid var(--fib-line-soft); padding-top: var(--fib-space-5); }
}

/* Achievement kinds as items, in the case's emerald-rimmed well. */
.fib-case-well .fib-case-sprite { width: 32px; height: 32px; }

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
 * Podium - built out of the game. See Podium in Primitives.jsx for the why.
 *
 * No cards. Each place is one tower per entrant - a stack of block sprites
 * with a head on top - the towers stand on one floor, and the names sit in a
 * row under that floor. The rows are a subgrid, so a name that wraps in one
 * column does not push the floor out of line in the others.
 *
 * "--block" is the block's rendered size. The stacking fractions come from
 * measuring the 128px sprite: its top face runs from y 1 to y 57 at the centre
 * column and its vertical edge from 57 to 126, so a block stacked on another
 * sits 54% of a block higher (overlap: 46%), and the centre of the top face -
 * where a head's lowest point should rest - is 22% down from the block's top.
 * The head render (128x136) carries ~7% transparent padding under its lowest
 * vertex, and is drawn at 60px against a 64px block so it sits inside the
 * top face rather than overhanging it.
 */
.fib-podium {
  --block: 64px;
  --head: 60px;
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: auto auto auto auto;
  column-gap: var(--fib-space-4);
  max-width: 760px; margin-inline: auto;
}
.fib-podium-slot {
  grid-row: span 4;
  display: grid; grid-template-rows: subgrid;
  justify-items: center; text-align: center; min-width: 0;
  row-gap: 0;
}
.fib-podium-slot[data-place="1"] { --medal: var(--fib-medal-gold); }
.fib-podium-slot[data-place="2"] { --medal: var(--fib-medal-silver); order: -1; }
.fib-podium-slot[data-place="3"] { --medal: var(--fib-medal-bronze); }

/* The floor under a place: one line across all three, and a soft contact
   shadow under each tower so the blocks stand on it rather than float. */
.fib-podium-stand {
  align-self: end;
  display: flex; justify-content: center; align-items: flex-end;
  gap: calc(var(--block) * 0.06);
  width: 100%;
  padding-bottom: var(--fib-space-4);
  margin-bottom: var(--fib-space-4);
  border-bottom: 1px solid var(--fib-line-soft);
}
.fib-podium-tower {
  position: relative;
  display: flex; flex-direction: column-reverse; align-items: center;
}
.fib-podium-tower::after {
  content: ''; position: absolute; left: 50%; bottom: -7px;
  width: calc(var(--block) * 1.2); height: 14px; transform: translateX(-50%);
  background: radial-gradient(closest-side, var(--fib-shadow-deep), transparent);
  z-index: 0;
}
.fib-podium-block {
  position: relative; z-index: 1;
  width: var(--block); height: var(--block);
  filter: none;
}
.fib-podium-block + .fib-podium-block { margin-bottom: calc(var(--block) * -0.46); }

.fib-podium-heads {
  position: relative; z-index: 2;
  display: flex; justify-content: center;
  margin-bottom: calc(var(--block) * -0.29);
}
.fib-podium-head {
  width: var(--head); height: auto; image-rendering: pixelated;
  filter: drop-shadow(0 6px 5px var(--fib-shadow-mid));
  opacity: 0; transition: opacity var(--fib-motion-slow) var(--fib-ease);
}
.fib-podium-head[data-loaded] { opacity: 1; }
/* The Earned Glow Rule's one bloom, where the winner actually stands. */
.fib-podium-slot[data-place="1"] .fib-podium-heads::before {
  content: ''; position: absolute; inset: -30% -45% -10%; z-index: -1;
  background: radial-gradient(closest-side, color-mix(in oklch, var(--fib-medal-gold) 34%, transparent), transparent);
  pointer-events: none;
}

/* Ceremony: the heads land on their blocks bronze, silver, gold. A transition
   FROM the pending flag, never a keyframe gated on it (Motion Never Withholds). */
.fib-podium .fib-podium-heads {
  transition: transform 520ms var(--fib-ease), opacity 320ms var(--fib-ease);
  transition-delay: calc(var(--ceremony, 0) * 160ms);
}
.fib-podium[data-ceremony="pending"] .fib-podium-heads {
  opacity: 0; transform: translateY(-36px); transition: none;
}
.fib-podium-slot:hover .fib-podium-heads { transform: translateY(-6px); transition-delay: 0s; }

.fib-podium-name {
  font-family: var(--fib-font-display); font-weight: 400;
  font-size: var(--fib-display-sm); line-height: 1;
  overflow-wrap: anywhere; max-width: 100%;
}
/* A duo's names stack, one per tower, rather than running on as "a & b" and
   wrapping wherever the column happens to end. */
.fib-podium[data-duo] .fib-podium-name { display: flex; flex-direction: column; gap: 4px; }
.fib-podium[data-duo] .fib-podium-amp { display: none; }
.fib-podium-name button { font: inherit; transition: color var(--fib-motion-fast) var(--fib-ease); }
.fib-podium-name button:hover { color: var(--fib-blue-ink); }
.fib-podium-amp { color: var(--fib-netherite); }
.fib-podium-value {
  margin-top: var(--fib-space-2);
  font-family: var(--fib-font-mono); font-variant-numeric: tabular-nums;
  font-size: var(--fib-text-3xl); font-weight: 600; letter-spacing: -0.03em;
  line-height: 1.1;
}
.fib-podium-slot[data-place="1"] .fib-podium-value { color: var(--fib-gold); }
.fib-podium-move { margin-top: 5px; }

@container fib-page (max-width: 560px) {
  .fib-podium { --block: 44px; --head: 41px; column-gap: var(--fib-space-2); }
  .fib-podium[data-duo] { --block: 36px; --head: 34px; }
  .fib-podium-name { font-size: var(--fib-text-lg); }
  .fib-podium-value { font-size: var(--fib-text-2xl); }
}

/* Match feed rows. */
.fib-match-row { display: grid; grid-template-columns: 96px minmax(0, 1.3fr) minmax(0, 1fr) auto; align-items: center; }
.fib-match-when { display: flex; flex-direction: column; gap: 2px; }
.fib-match-when b { font-size: var(--fib-text-sm); font-weight: 500; }
.fib-match-winner { display: flex; align-items: center; gap: var(--fib-space-3); min-width: 0; }
.fib-match-names { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
.fib-match-margin { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
/* Shared with the overview's "Latest wins" feed, which prints the same figure
   for the same reason. "flex: none" is for that use — inside the match feed's
   grid it is inert; inside a ".fib-row-link" it stops the score cell shrinking
   under a long pair of names. */
.fib-match-score { text-align: right; flex: none; }
.fib-match-score b {
  display: block; font-family: var(--fib-font-mono); font-variant-numeric: tabular-nums;
  font-size: var(--fib-text-xl); font-weight: 600; color: var(--fib-gold); letter-spacing: -0.02em;
  /* The module's numeral leading (".fib-podium-value", ".fib-figure-value"), which
     this cell was inheriting body line-height instead of. At 22px that is 34px of
     line box for a 22px digit, and it made the score the tallest thing in the row:
     every row in the overview's win feed was 17px taller than its content, and the
     score sat visibly off the baseline of the name beside it. */
  line-height: 1.1;
}

/*
 * Day groups. A long feed of identical rows needs chronology landmarks —
 * "the match last Tuesday" is how people actually look for a game.
 */
.fib-day { margin-top: var(--fib-space-5); }
.fib-day:first-child { margin-top: 0; }
/* The day is a heading the reader scans for ("the one on Tuesday"), so it is
   set in the jersey at a size that can be found, not in 11px uppercase mono. */
.fib-day > h3 {
  display: flex; align-items: center; gap: var(--fib-space-3);
  margin-bottom: var(--fib-space-3);
  font-family: var(--fib-font-display); font-weight: 400;
  font-size: var(--fib-display-sm); line-height: 1;
  color: var(--fib-ink-2);
}
.fib-day > h3::after { content: ''; flex: 1; height: 1px; background: var(--fib-line-soft); }

/* The feed's footer: the next page, and how much of the history is on screen.
   Centred and given real space above the fold's end, because its job is to be
   found by someone who has just scrolled to the bottom looking for more. */
.fib-more {
  display: flex; flex-direction: column; align-items: center;
  gap: var(--fib-space-2);
  padding: var(--fib-space-6) 0 var(--fib-space-2);
}

/*
 * Scrubber + replay. A native range input, themed with accent-color only —
 * building a custom slider would cost drag, keyboard stepping and
 * screen-reader support to gain nothing. The replay button beside it makes
 * the scrubber's best trick discoverable: the match can be WATCHED.
 */
.fib-scrub { margin-top: var(--fib-space-5); }
.fib-scrub-row { display: flex; align-items: center; gap: var(--fib-space-3); }
.fib-scrub input[type="range"] {
  flex: 1; width: 100%; accent-color: var(--fib-blue); cursor: grab;
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

/*
 * Twenty-four rules in one undifferentiated grid is a list you search rather
 * than read, and the two that decide what the match even was — the format and
 * the item pool — sat wherever the server happened to send them. The groups are
 * the wiki's own categories, separated by a label and space, never boxed.
 */
.fib-settings-group + .fib-settings-group { margin-top: var(--fib-space-6); }
.fib-settings-head {
  /* More air above the heading than below it: the label belongs to the rows
     under it, not to the group it just left. Colour is ".fib-label"'s own
     ink-3 — the module's proven label step — not a dimmer one; a heading that
     has to be hunted for is not doing the job the grouping exists to do. */
  margin: 0 0 var(--fib-space-3);
  text-transform: uppercase; letter-spacing: 0.06em;
}
.fib-match-id { margin-top: var(--fib-space-6); }

/*
 * The versus row (MatchVersus). Two sides facing each other across the score:
 * the winners' names run INTO the centre (right-aligned, heads last), the
 * beaten side runs OUT of it (heads first), so both sets of heads sit against
 * the score and the eye reads "these beat those" in one sweep.
 *
 * The score column is a fixed width so every row's score sits on one vertical
 * line down the feed - the way a results table is scanned.
 */
.fib-vs {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) 128px minmax(0, 1fr) 150px;
  align-items: center; gap: var(--fib-space-4);
  width: 100%; padding: var(--fib-space-3) var(--fib-space-4);
  text-align: left;
  transition: background var(--fib-motion-fast) var(--fib-ease);
}
.fib-vs + .fib-vs { border-top: 1px solid var(--fib-line-soft); }
.fib-vs:hover { background: var(--fib-plinth-2); }
.fib-vs[data-compact] { grid-template-columns: 64px minmax(0, 1fr) 104px minmax(0, 1fr); gap: var(--fib-space-3); }

.fib-vs-when { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
/* Ranked by score: the place leads the row, the date sits under it. */
.fib-vs-rank { flex-direction: row; align-items: center; gap: var(--fib-space-3); }
.fib-vs[data-ranked] { grid-template-columns: 150px minmax(0, 1fr) 128px minmax(0, 1fr) 150px; }

/* The feed's two lenses side by side: order, then mode. */
.fib-matches-controls { display: flex; flex-wrap: wrap; gap: var(--fib-space-3); }
.fib-vs-when b { font-size: var(--fib-text-sm); font-weight: 500; white-space: nowrap; }

.fib-vs-side { display: flex; align-items: center; gap: var(--fib-space-3); min-width: 0; }
.fib-vs-side[data-side="win"] { justify-content: flex-end; }
.fib-vs-side[data-side="lose"] { color: var(--fib-ink-2); }
.fib-vs-names {
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-weight: 500;
}
.fib-vs-side[data-side="win"] .fib-vs-names { font-weight: 600; text-align: right; }
.fib-vs:hover .fib-vs-side[data-side="win"] .fib-vs-names { color: var(--fib-blue-ink); }
.fib-vs-heads { display: flex; flex: none; }
.fib-vs-heads .fib-avatar { box-shadow: 0 0 0 2px var(--fib-plinth); }
.fib-vs-heads .fib-avatar + .fib-avatar { margin-left: -8px; }
.fib-vs-side[data-side="lose"] .fib-vs-heads { opacity: 0.8; }
.fib-vs-rest { flex: none; }

.fib-vs-score { display: flex; flex-direction: column; align-items: center; gap: 1px; }
.fib-vs-figures {
  display: flex; align-items: baseline; gap: 8px;
  font-family: var(--fib-font-mono); font-variant-numeric: tabular-nums;
  line-height: 1.05;
}
.fib-vs-figures b { font-size: var(--fib-text-xl); font-weight: 600; letter-spacing: -0.02em; }
.fib-vs-figures b[data-side="win"] { color: var(--fib-gold); }
.fib-vs-figures b[data-side="lose"] { color: var(--fib-ink-3); font-weight: 500; }
.fib-vs-figures i { font-style: normal; color: var(--fib-netherite); }

.fib-vs-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; text-align: right; }
/* Five or more lead changes is a contested match: diamond, the module's colour
   for the exceptional, and the reason to open this row over its neighbours. */
.fib-vs-meta [data-hot] { color: var(--fib-diamond); }

/*
 * Narrow: the scoreboard keeps its shape - winners, score, beaten on one line -
 * and the time moves above it. What goes is the names' room, never the score.
 */
@container fib-page (max-width: 760px) {
  .fib-vs, .fib-vs[data-compact], .fib-vs[data-ranked] {
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    row-gap: 6px; column-gap: var(--fib-space-3);
  }
  .fib-vs-when { grid-column: 1 / -1; flex-direction: row; gap: var(--fib-space-3); align-items: baseline; }
  .fib-vs-meta { display: none; }
  /* Each side stacks its heads over its names, so a name gets the side's whole
     width instead of what is left beside the heads - on a phone that was about
     fifty pixels, and every name truncated to "elto…". */
  .fib-vs-side { flex-direction: column; align-items: flex-start; gap: 4px; }
  .fib-vs-side[data-side="win"] { flex-direction: column-reverse; align-items: flex-end; }
  .fib-vs-names { white-space: normal; overflow-wrap: anywhere; font-size: var(--fib-text-sm); line-height: 1.25; }
}
/* The overview's feed sits in half the page; it goes narrow sooner. */
@container fib-split (max-width: 560px) {
  .fib-vs[data-compact] {
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    row-gap: 6px; column-gap: var(--fib-space-3);
  }
  .fib-vs[data-compact] .fib-vs-when { grid-column: 1 / -1; }
  .fib-vs[data-compact] .fib-vs-side { flex-direction: column; align-items: flex-start; gap: 4px; }
  .fib-vs[data-compact] .fib-vs-side[data-side="win"] { flex-direction: column-reverse; align-items: flex-end; }
  .fib-vs[data-compact] .fib-vs-names { white-space: normal; overflow-wrap: anywhere; font-size: var(--fib-text-sm); line-height: 1.25; }
}

/* ── The match page ──────────────────────────────────────────────────────
 *
 * Headline and scoreboard, the round as a ledger line, the race over its pool
 * phases, the live board under it, the round's records, then every team's
 * round in full. See MatchReport.jsx.
 */

.fib-match-head { padding-bottom: var(--fib-space-6); }
.fib-match-head-grid {
  display: flex; justify-content: space-between; align-items: flex-end;
  gap: var(--fib-space-5) var(--fib-space-7); flex-wrap: wrap;
  margin-bottom: var(--fib-space-6);
}
.fib-match-head-copy { flex: 1 1 460px; min-width: 0; }
/* A match headline is a page title here, not the overview's lead: one step
   down from the overview's 72px, because the race below is the subject. */
.fib-match-title { font-size: var(--fib-display-lg); max-width: 24ch; }
.fib-match-head .fib-lead-sub { margin-top: var(--fib-space-3); }
.fib-match-ledger [data-hot] b { color: var(--fib-diamond); }

.fib-match-race { padding-top: var(--fib-space-3); }
.fib-race-phase-label {
  font-family: var(--fib-font-mono); font-size: 11px; font-weight: 500;
  letter-spacing: 0.02em;
}

/*
 * The live board. One column of rows, because the FLIP re-rank measures
 * vertical position: a row that travels past another is the overtake. The
 * leader's row carries a faint gold floor - a place, which is what gold means.
 */
.fib-board-title {
  display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px;
  margin: var(--fib-space-6) 0 var(--fib-space-3);
  font-family: var(--fib-font-display); font-weight: 400;
  font-size: var(--fib-display-sm); line-height: 1;
}
.fib-board { display: flex; flex-direction: column; gap: 6px; }
.fib-board-row {
  display: grid;
  grid-template-columns: 34px 4px minmax(0, 1.2fr) minmax(0, 1fr) 92px;
  align-items: center; gap: var(--fib-space-4);
  padding: var(--fib-space-3) var(--fib-space-4);
  border-radius: var(--fib-radius-md);
  background: var(--fib-plinth);
  box-shadow: inset 0 0 0 1px var(--fib-line-soft), inset 0 1px 0 0 var(--fib-gloss-top);
}
.fib-board-row:not([data-flipping]) { transition: transform var(--fib-motion-slow) var(--fib-ease); }
.fib-board-row[data-leading] {
  background: linear-gradient(90deg, color-mix(in oklch, var(--fib-gold) 10%, var(--fib-plinth)), var(--fib-plinth) 45%);
}
.fib-board-swatch { width: 4px; height: 28px; border-radius: 2px; }
.fib-board-who { display: flex; align-items: center; gap: var(--fib-space-3); min-width: 0; }
.fib-board-heads { display: flex; flex: none; }
.fib-board-heads .fib-avatar { box-shadow: 0 0 0 2px var(--fib-plinth); }
.fib-board-heads .fib-avatar + .fib-avatar { margin-left: -8px; }
.fib-board-names {
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-family: var(--fib-font-display); font-size: var(--fib-text-xl); line-height: 1;
}
.fib-board-names button { font: inherit; transition: color var(--fib-motion-fast) var(--fib-ease); }
.fib-board-names button:hover { color: var(--fib-blue-ink); }
.fib-board-amp { color: var(--fib-netherite); }
.fib-board-now {
  display: grid; grid-template-columns: 40px minmax(0, 1fr); align-items: center; gap: var(--fib-space-3);
  min-width: 0;
}
.fib-board-score { display: flex; flex-direction: column; align-items: flex-end; }
.fib-board-score b {
  font-family: var(--fib-font-mono); font-variant-numeric: tabular-nums;
  font-size: var(--fib-text-3xl); font-weight: 600; letter-spacing: -0.03em; line-height: 1;
}
.fib-board-row[data-leading] .fib-board-score b { color: var(--fib-gold); }

/* The round's records: four objects, the items index's record language. */
.fib-round-records {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--fib-space-4);
}
.fib-round-record {
  display: flex; align-items: center; gap: var(--fib-space-4); margin: 0;
  padding: var(--fib-space-4);
  border-radius: var(--fib-radius-lg);
  background: var(--fib-plinth);
  box-shadow: inset 0 0 0 1px var(--fib-line-soft), inset 0 1px 0 0 var(--fib-gloss-top);
}
.fib-round-record figcaption { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.fib-round-record-name {
  font-family: var(--fib-font-display); font-weight: 400;
  font-size: var(--fib-text-xl); line-height: 1; text-wrap: balance;
}
.fib-round-record-figure em {
  font-style: normal; font-family: var(--fib-font-mono); font-variant-numeric: tabular-nums;
  font-size: var(--fib-text-lg); font-weight: 600;
}

/*
 * A team's report. Header (place, heads, names, score), then facts beside the
 * back-to-backs and the phase split, then the run: every item as a slot. The
 * winner's report carries the gold floor the board's leader does.
 */
.fib-reports { display: flex; flex-direction: column; gap: var(--fib-space-5); }
.fib-report {
  padding: var(--fib-space-5);
  border-radius: var(--fib-radius-lg);
  background: var(--fib-plinth);
  box-shadow: inset 0 0 0 1px var(--fib-line-soft), inset 0 1px 0 0 var(--fib-gloss-top);
}
.fib-report[data-won] {
  background: linear-gradient(180deg, color-mix(in oklch, var(--fib-gold) 8%, var(--fib-plinth)), var(--fib-plinth) 140px);
  box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--fib-gold) 30%, var(--fib-line-soft)), inset 0 1px 0 0 var(--fib-gloss-top);
}
.fib-report-head {
  display: flex; align-items: center; gap: var(--fib-space-4);
  padding-bottom: var(--fib-space-4); margin-bottom: var(--fib-space-4);
  border-bottom: 1px solid var(--fib-line-soft);
}
.fib-report-head .fib-board-heads .fib-avatar { box-shadow: 0 0 0 2px var(--fib-plinth); }
.fib-report-names {
  flex: 1 1 auto; min-width: 0;
  font-family: var(--fib-font-display); font-weight: 400;
  font-size: var(--fib-display-sm); line-height: 1;
  overflow-wrap: anywhere;
}
.fib-report-names button { font: inherit; transition: color var(--fib-motion-fast) var(--fib-ease); }
.fib-report-names button:hover { color: var(--fib-blue-ink); }
.fib-report-score { display: flex; flex-direction: column; align-items: flex-end; flex: none; }
.fib-report-score b {
  font-family: var(--fib-font-mono); font-variant-numeric: tabular-nums;
  font-size: var(--fib-text-4xl); font-weight: 600; letter-spacing: -0.03em; line-height: 1;
}
.fib-report[data-won] .fib-report-score b { color: var(--fib-gold); }

.fib-report-body {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--fib-space-6); margin-bottom: var(--fib-space-5);
}
.fib-report-facts { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); align-content: start; gap: var(--fib-space-4) var(--fib-space-5); margin: 0; }
.fib-report-facts dt { font-size: var(--fib-text-xs); color: var(--fib-ink-3); }
.fib-report-facts dd { margin: 4px 0 0; display: flex; align-items: center; gap: 6px; }
.fib-report-facts dd b {
  font-family: var(--fib-font-mono); font-variant-numeric: tabular-nums;
  font-size: var(--fib-text-xl); font-weight: 600;
}
/* Fastest find and longest hunt span two columns: a time, and the item it
   belongs to, named. */
.fib-report-fact-item { grid-column: span 2; }
.fib-report-fact-item dd { gap: var(--fib-space-3); }
.fib-report-fact-item dd > span { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.fib-report-fact-item em {
  font-style: normal; font-size: var(--fib-text-sm); color: var(--fib-ink-2);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.fib-report-side { display: flex; flex-direction: column; gap: var(--fib-space-4); }
.fib-report-b2b h4 { margin: 0 0 var(--fib-space-2); }
.fib-report-tiers { display: flex; flex-wrap: wrap; gap: var(--fib-space-2) var(--fib-space-4); }
.fib-report-tiers li { display: inline-flex; align-items: baseline; gap: 6px; }
.fib-report-tiers em {
  font-style: normal; font-family: var(--fib-font-mono); font-variant-numeric: tabular-nums;
  font-weight: 600; color: var(--fib-ink);
}

/* The run: every item as a 40px slot, wrapping. Skips greyed, not reddened. */
.fib-report-run {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(62px, 1fr)); gap: var(--fib-space-3) var(--fib-space-2);
  padding-top: var(--fib-space-4);
  border-top: 1px solid var(--fib-line-soft);
}
.fib-report-run li { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; }
/* The order, in the slot's corner - where Minecraft prints a stack size. */
.fib-report-run-order {
  position: absolute; top: 3px; left: calc(50% - 29px + 5px);
  font-family: var(--fib-font-mono); font-size: 10px; font-weight: 600; line-height: 1;
  color: var(--fib-ink-3); pointer-events: none;
}
.fib-report-run-took {
  font-family: var(--fib-font-mono); font-variant-numeric: tabular-nums;
  font-size: var(--fib-text-xs); color: var(--fib-ink-2); white-space: nowrap;
}
.fib-report-run li[data-skipped] .fib-report-run-took { color: var(--fib-ink-3); text-decoration: line-through; }
.fib-report-run li[data-skipped] .fib-well { filter: grayscale(1) brightness(0.7); opacity: 0.6; }

/* The ribbon race and its pace strip (RibbonRace in Charts.jsx). */
.fib-timeline-bar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--fib-space-3); margin-bottom: var(--fib-space-3); }
.fib-ribbon-end { font-family: var(--fib-font-mono); font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
.fib-ribbon-turn { fill: var(--fib-void); stroke: var(--fib-ink); stroke-width: 2; }
.fib-ribbon-key {
  display: flex; flex-wrap: wrap; align-items: center; gap: var(--fib-space-2) var(--fib-space-5);
  padding: var(--fib-space-2) 0 var(--fib-space-4) 44px;
  font-size: var(--fib-text-sm); font-weight: 500;
}
.fib-ribbon-key li { display: inline-flex; align-items: center; gap: 8px; }
.fib-ribbon-key i { width: 16px; height: 3px; border-radius: 2px; }
/* The pace strip is also the zoom control: it takes a crosshair, and the
   selection it holds is drawn as a lit window between two dimmed flanks. */
.fib-pace[data-brush] { cursor: crosshair; touch-action: none; user-select: none; }
.fib-pace-title { font-family: var(--fib-font-mono); font-size: 11px; fill: var(--fib-ink-3); }
.fib-pace-dim { fill: var(--fib-void); fill-opacity: 0.65; }
.fib-pace-sel { fill: none; stroke: var(--fib-blue); stroke-width: 1.5; rx: 4; }

/* The team runs follow the scrub: the hunted item lit, the ones after it dim. */
.fib-report-run li[data-ahead] { opacity: 0.3; }
.fib-report-run li[data-current] .fib-well {
  box-shadow: inset 0 0 0 2px var(--fib-blue), 0 0 0 3px var(--fib-blue-tint);
}
.fib-report-run li { transition: opacity var(--fib-motion-base) var(--fib-ease); }
.fib-report-run .fib-well { transition: transform var(--fib-motion-fast) var(--fib-ease); }
.fib-report-run li:hover .fib-well { transform: translateY(-2px); }
.fib-report-foot { margin-top: var(--fib-space-4); }
.fib-report-inv { margin-top: var(--fib-space-4); padding-top: var(--fib-space-4); border-top: 1px solid var(--fib-line-soft); }

@container fib-page (max-width: 760px) {
  .fib-board-row {
    grid-template-columns: 30px 4px minmax(0, 1fr) auto;
    grid-template-areas: "place swatch who score" "now now now now";
    row-gap: var(--fib-space-3);
  }
  .fib-board-place { grid-area: place; }
  .fib-board-swatch { grid-area: swatch; }
  .fib-board-who { grid-area: who; }
  .fib-board-score { grid-area: score; }
  .fib-board-now { grid-area: now; }
  .fib-report-body { grid-template-columns: minmax(0, 1fr); }
  .fib-report-score b { font-size: var(--fib-text-3xl); }
  .fib-report { padding: var(--fib-space-4); }
}

/* Overview. */

/*
 * The lead: the week's match as a headline, not a card.
 *
 * It sat in a boxed panel titled "Match of the week" below the totals, which
 * made the one story on the page the fourth thing in it and dressed it the way
 * every other panel was dressed. Now the headline is the page's h1, set in the
 * jersey on the open field, and the only framed thing is the race - the part
 * you click.
 */
.fib-lead { padding-bottom: var(--fib-space-7); }
.fib-lead-top {
  display: flex; justify-content: space-between; align-items: flex-end;
  gap: var(--fib-space-5) var(--fib-space-7); flex-wrap: wrap;
  margin-bottom: var(--fib-space-6);
}
.fib-lead-copy { min-width: 0; flex: 1 1 520px; }
.fib-lead-copy .fib-display { max-width: 24ch; }
.fib-lead-sub {
  margin-top: var(--fib-space-4);
  color: var(--fib-ink-2); font-size: var(--fib-text-md);
  max-width: 62ch; text-wrap: pretty;
}
.fib-lead-sub .fib-meta { white-space: nowrap; }
/* The lead's scoreboard: heads facing across the final score. */
.fib-lead-board {
  display: flex; align-items: center; gap: var(--fib-space-4);
  flex: none;
}
.fib-lead-board-side { display: flex; }
.fib-lead-board-side .fib-avatar { box-shadow: 0 0 0 3px var(--fib-void); }
.fib-lead-board-side .fib-avatar + .fib-avatar { margin-left: -10px; }
.fib-lead-board-side[data-side="lose"] { opacity: 0.75; }
.fib-lead-board-score {
  display: flex; align-items: baseline; gap: 10px;
  font-family: var(--fib-font-mono); font-variant-numeric: tabular-nums;
  line-height: 1;
}
.fib-lead-board-score b { font-size: var(--fib-text-4xl); font-weight: 600; letter-spacing: -0.03em; color: var(--fib-ink-3); }
.fib-lead-board-score b[data-side="win"] { color: var(--fib-gold); }
.fib-lead-board-score i { font-style: normal; font-size: var(--fib-text-2xl); color: var(--fib-netherite); }

/*
 * The server record as a line. Numbers in mono at reading weight, words in the
 * grotesk, separated by space rather than dividers - it is a sentence, not a
 * row of cells.
 */
.fib-ledger {
  display: flex; flex-wrap: wrap; align-items: baseline;
  gap: var(--fib-space-2) var(--fib-space-5);
  padding: var(--fib-space-4) 0;
  border-top: 1px solid var(--fib-line-soft);
  border-bottom: 1px solid var(--fib-line-soft);
  color: var(--fib-ink-3); font-size: var(--fib-text-sm);
}
.fib-ledger b {
  font-family: var(--fib-font-mono); font-variant-numeric: tabular-nums;
  font-weight: 600; color: var(--fib-ink); font-size: var(--fib-text-md);
}
.fib-ledger-week { margin-left: auto; }

/* The two paired sections measure themselves, so a row inside can reflow on
   the column it got rather than on the window. */
.fib-split > .fib-section { container: fib-split / inline-size; }

/*
 * The race and the haul are one control: the match opens from anywhere on
 * it. The band sits in a recess a step darker than the field so the lanes and
 * the sprites have a floor, and the whole thing lifts on hover the way the
 * featured card used to - it is still the page's headline object.
 */
.fib-lead-race {
  display: flex; flex-direction: column; gap: var(--fib-space-4);
  width: 100%; text-align: left; cursor: pointer;
  padding: var(--fib-space-5) var(--fib-space-5) var(--fib-space-4);
  background: var(--fib-sunk);
  border: 1px solid var(--fib-line-soft);
  border-radius: var(--fib-radius-lg);
  box-shadow: inset 0 1px 0 0 var(--fib-gloss-top);
  transition: border-color var(--fib-motion-fast) var(--fib-ease),
              box-shadow var(--fib-motion-base) var(--fib-ease),
              transform var(--fib-motion-base) var(--fib-ease);
}
.fib-lead-race:hover {
  border-color: color-mix(in oklch, var(--fib-blue) 40%, var(--fib-line));
  box-shadow: inset 0 1px 0 0 var(--fib-gloss-top), 0 16px 50px -24px var(--fib-blue);
  transform: translateY(-2px);
}
.fib-race-finish { image-rendering: pixelated; }

/*
 * The haul. Right-aligned so the newest find sits under the finish line, and
 * masked on the left so the older finds trail off rather than stop at an edge
 * - a hard edge would read as "that is all of them". Never wraps: it is one
 * line of the race, not a grid of its own.
 */
.fib-haul {
  display: flex; justify-content: flex-end; gap: 4px;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to right, transparent, #000 38%);
          mask-image: linear-gradient(to right, transparent, #000 38%);
}
.fib-haul .fib-well { flex: none; }
.fib-lead-foot {
  display: flex; align-items: center; justify-content: space-between;
  gap: var(--fib-space-4); flex-wrap: wrap;
  border-top: 1px solid var(--fib-line-soft);
  padding-top: var(--fib-space-4);
}
/* The arrow steps out when the race is hovered or focused: it says which way
   the click goes. */
.fib-feature-go { display: inline-flex; align-items: center; gap: 7px; color: var(--fib-blue-ink); }
.fib-feature-go i {
  font-style: normal;
  transition: transform var(--fib-motion-base) var(--fib-ease);
}
.fib-lead-race:hover .fib-feature-go i,
.fib-lead-race:focus-visible .fib-feature-go i { transform: translateX(4px); }


.fib-podium-scope { margin-bottom: var(--fib-space-6); }

/*
 * The form guide. A grid of matches (columns) by players (rows), so a column
 * is one match and a row is one run. Squares, not dots: the page's objects are
 * pixel art, and a round pip is the one shape Minecraft never draws.
 *
 * Gold is a win - the meaning the module already spends gold on. A loss is a
 * filled step of the surface ladder, and a match the player sat out is an
 * outline, so "lost" and "wasn't there" never look alike.
 */
.fib-form { display: flex; flex-direction: column; }
.fib-form > li + li { border-top: 1px solid var(--fib-line-soft); }
.fib-form-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto 44px;
  align-items: center; gap: var(--fib-space-3);
  width: 100%; padding: 9px var(--fib-space-2);
  border-radius: var(--fib-radius-md);
  text-align: left;
  transition: background var(--fib-motion-fast) var(--fib-ease);
}
.fib-form-row:hover { background: var(--fib-plinth); }
.fib-form-name {
  font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.fib-form-row:hover .fib-form-name { color: var(--fib-blue-ink); }
.fib-form-pips {
  display: grid; grid-template-columns: repeat(var(--cols, 10), 14px); gap: 4px;
}
.fib-form-pips i {
  width: 14px; height: 14px; border-radius: 2px;
  background: var(--fib-plinth-2);
  box-shadow: inset 0 1px 0 0 var(--fib-edge);
}
.fib-form-pips i[data-result="win"] {
  background: var(--fib-gold);
  box-shadow: inset 0 1px 0 0 oklch(1 0 0 / 0.35), inset 0 -2px 0 0 oklch(0 0 0 / 0.22);
}
.fib-form-pips i[data-result="out"] {
  background: none; box-shadow: inset 0 0 0 1px var(--fib-line-soft);
}
.fib-form-record {
  font-family: var(--fib-font-mono); font-variant-numeric: tabular-nums;
  font-size: var(--fib-text-sm); color: var(--fib-ink-3); text-align: right;
}
.fib-form-record b { color: var(--fib-ink); font-weight: 600; }

@container fib-page (max-width: 520px) {
  .fib-form-row { grid-template-columns: 28px minmax(0, 1fr) 40px; }
  .fib-form-pips { grid-column: 1 / -1; grid-row: 2; grid-template-columns: repeat(var(--cols, 10), 1fr); }
  .fib-form-pips i { width: auto; aspect-ratio: 1; }
}

/* Rarest moments: a shelf of objects, each one a way into its match. */
.fib-moments { grid-template-columns: repeat(auto-fill, minmax(136px, 1fr)); }
.fib-moment { text-align: left; cursor: pointer; }
.fib-moment-caption { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.fib-moment-caption b {
  font-size: var(--fib-text-sm); font-weight: 600; letter-spacing: -0.005em;
  overflow-wrap: anywhere;
}
/* Wraps rather than truncating: the time and the names are the caption's whole
   content, and an ellipsis ate the names on every moment at shelf width. */
.fib-moment-caption .fib-meta { overflow-wrap: anywhere; }
.fib-moment:hover b { color: var(--fib-blue-ink); }

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

/*
 * The paired overview feeds. Both rows are the same three parts — an object, a
 * line of text, a figure on the right — because the columns sit side by side
 * and a row shape that only half-works in one of them is visible in the other.
 */

/* The object slot: the winner's head(s) for a win, the item's sprite for a
   pull. Fixed width so the text in both feeds starts on the same x. */
.fib-stream-icon { flex: none; width: 34px; display: grid; place-items: center; }
.fib-stream-body { flex: 1 1 auto; min-width: 0; }
.fib-stream-title { font-weight: 500; }
/*
 * The second line truncates rather than wraps. It is the row's supporting
 * clause ("4d ago · over eltobito & apppaa"), and at a phone's column width it
 * takes two lines on most rows — 17px per row of a feed whose whole value is
 * that it scans in one pass, spent on a fragment reading as a detached line.
 * The relative time is written first precisely so the ellipsis never eats it,
 * and the match is one tap away with the full story in it.
 */
.fib-stream-body .fib-meta { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/*
 * The winners' heads, stacked.
 *
 * This slot used to hold a gold "1" medal on every row. The medal was a
 * constant — the section is titled "Latest wins", so first place is the one
 * thing every row shares — which turned the column into a stack of identical
 * gold pills that outshouted the real sprites in the feed beside it, and spent
 * the module's rank colour on the only part of the row that could not vary. A
 * head answers "who", which does, and two heads say "team" without a word.
 *
 * The overlap is ".fib-lane-faces"' idiom at row scale: the ring is the panel
 * behind the row, so a duo reads as two objects rather than one wide sprite.
 *
 * The slot is widened to hold a pair and the heads are packed to its left edge
 * rather than centred in it — a solo win is one head in a 50px box, and
 * centring it would start that row's name 10px right of every duo's. The empty
 * tail after a lone head is invisible; a ragged text edge is not.
 */
.fib-win-faces {
  display: flex; align-items: center; justify-content: flex-start;
  width: 50px;
}
.fib-win-faces .fib-avatar { margin-left: -10px; box-shadow: 0 0 0 2px var(--fib-plinth); }
.fib-win-faces .fib-avatar:first-child { margin-left: 0; }

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
 * The tile grid takes the room on the left, the run's numbers ride a capped
 * column on the right. The grid fills its column — labelled tiles WANT the
 * width the bare-slot grid refused, so a wider drawer means more tiles per row
 * rather than more empty space around a sprite.
 */
.fib-inv {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 260px);
  gap: var(--fib-space-6);
  align-items: start;
  padding-top: var(--fib-space-4);
}

.fib-inv-head {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: var(--fib-space-4); margin-bottom: var(--fib-space-3);
}
/* The count and the replay control share the right end, and wrap together
   rather than letting the button drop under the heading on its own. */
.fib-inv-head-aside {
  display: flex; align-items: baseline; flex-wrap: wrap;
  gap: var(--fib-space-2) var(--fib-space-4);
  justify-content: flex-end;
}
.fib-inv-skip { padding: 4px 10px; }

/* Labelled tiles that fill the column: as many per row as fit at a readable
   width, so a wide drawer packs more in rather than stretching each one. */
.fib-inv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: var(--fib-space-3);
}

/*
 * One item: the sprite well on the left, its name and meta on the right. The
 * tile is its own recessed plinth so the row reads as a shelf of labelled
 * objects, and it lifts on hover to say "this is the one you're pointing at".
 */
.fib-inv-tile {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--fib-space-3);
  padding: var(--fib-space-2);
  border-radius: var(--fib-radius-md);
  background: var(--fib-plinth);
  box-shadow: inset 0 0 0 1px var(--fib-line-soft);
  transition: background var(--fib-motion-fast) var(--fib-ease),
              box-shadow var(--fib-motion-fast) var(--fib-ease),
              transform var(--fib-motion-fast) var(--fib-ease);
}
.fib-inv-tile:hover {
  background: var(--fib-plinth-2);
  box-shadow: inset 0 0 0 1px var(--fib-line);
  transform: translateY(-1px);
}

/*
 * The sprite's seat. Composes the shared well — surface, lighting, phase bleed
 * and rarity rim all come from there — and only fixes the square geometry.
 */
.fib-inv-cell {
  position: relative;
  width: 52px; height: 52px;
  border-radius: var(--fib-radius-sm);
  flex: none;
}

/*
 * Collection order, where Minecraft puts stack size.
 *
 * The position is the authentic reference and stays. What did not work was the
 * treatment: ink-3 over a text-shadow, sitting directly on the sprite, which on
 * a light item (bone meal, quartz, a torch's flame) had nothing to read against
 * and dissolved into the texture. A stack count in the game is legible over
 * every block in it, and this is the same job.
 *
 * A small plate rather than a heavier shadow — the numeral gets its own dark
 * ground, so it clears the sprite whatever the sprite is, and the ink can stay
 * quiet instead of being pushed to white to survive.
 */
.fib-inv-order {
  position: absolute; right: 1px; bottom: 1px;
  min-width: 14px; padding: 0 3px;
  border-radius: var(--fib-radius-sm);
  background: color-mix(in oklch, var(--fib-void) 78%, transparent);
  font-family: var(--fib-font-mono);
  font-size: var(--fib-text-2xs); line-height: 1.45;
  font-variant-numeric: tabular-nums;
  text-align: center;
  color: var(--fib-ink-2);
  pointer-events: none;
  z-index: 2;
}

.fib-inv-tile-text {
  display: flex; flex-direction: column; gap: 3px;
  min-width: 0;
}
/*
 * Two lines, not one line with an ellipsis.
 *
 * The tile's whole argument is that the name is always on, so the run reads as
 * a list of things collected rather than a grid to hover through — and a third
 * of Minecraft's names do not fit one 130px line. "Waxed Weathered Copper Door"
 * arrived as "Waxed Weathered Coppe…", which is the hover puzzle back again on
 * exactly the items whose names carry the most information.
 *
 * It costs no height. The 52px well sets the tile's floor and a second line of
 * name plus the meta row still measures under it, so the grid's rhythm is
 * unchanged and only the truncation is gone. Past two lines the clamp holds —
 * nothing in the pool needs a third.
 */
.fib-inv-name {
  font-size: var(--fib-text-sm); font-weight: 600;
  line-height: 1.2; color: var(--fib-ink);
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;
  overflow: hidden; overflow-wrap: anywhere;
}
.fib-inv-meta {
  display: flex; align-items: center; gap: var(--fib-space-2);
  flex-wrap: wrap;
}
.fib-inv-took {
  font-family: var(--fib-font-mono);
  font-size: var(--fib-text-2xs);
  font-variant-numeric: tabular-nums;
  color: var(--fib-ink-3);
}

/* Desaturate and LIGHTEN, never darken. Crushing brightness on sprites that
   are already dark (blackstone, basalt, cobblestone) turned the slot into an
   empty square — a skipped item still has to be identifiable. The whole tile
   dims a touch so the run's skips recede without disappearing. */
.fib-inv-tile[data-skipped] { opacity: 0.66; }
.fib-inv-tile[data-skipped] .fib-sprite {
  /* Keeps both shadows: without the halo the desaturated dark items vanish. */
  filter: grayscale(1) brightness(1.15) contrast(0.85)
          drop-shadow(0 1px 2px var(--fib-shadow-deep))
          drop-shadow(0 0 1px oklch(1 0 0 / 0.45));
}
.fib-inv-tile[data-skipped] .fib-inv-name { font-weight: 500; color: var(--fib-ink-2); }

/* The skipped marker on a tile's meta line. */
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

/* The full margin, not just the top. "h5" is absent from the reset's heading
   list, so it kept the UA's ~1.67em margin-block-end and pushed the ramp a good
   20px clear of the heading that names it. */
.fib-inv-subhead { margin: var(--fib-space-2) 0 0; }

/* The stall's SUBJECT, not a measurement. The figure note is mono and tabular
   because it usually carries a standing ("2nd of 8"); an item name set in
   JetBrains Mono is monospace worn as a costume for "technical". */
.fib-inv-figures .fib-figure-note {
  font-family: var(--fib-font-sans);
  font-variant-numeric: normal;
  color: var(--fib-ink-3);
}

/* ── The pool-phase split ──────────────────────────────────────────────
 *
 * A stacked bar, not a fourth ramp: the three phases partition the run, so the
 * shape has to sum to the whole. Segments flex-grow by their count and butt
 * together inside a clipped pill, and the key beneath carries the counts as
 * text — the bar answers "how was this run made up", the key answers "how many".
 *
 * Named "phase-split" and not "split": ".fib-split" is already the overview's
 * two-column pair, and inheriting its "align-items: start" collapsed this bar to
 * 13px of its 260px column.
 */
.fib-phase-split { display: flex; flex-direction: column; gap: var(--fib-space-3); }

.fib-phase-split-bar {
  display: flex; gap: 2px;
  height: 10px; border-radius: var(--fib-radius-pill);
  background: var(--fib-sunk);
  box-shadow: inset 0 1px 0 0 var(--fib-shadow-mid);
  overflow: hidden;
}
.fib-phase-split-bar i {
  /* The same top-edge gloss the ramp fills carry, so both meters in this rail
     are lit from the same place. The colour is set inline per segment, which is
     why this is background-IMAGE — the shorthand would wipe it. */
  background-image: linear-gradient(var(--fib-gloss-top), transparent 55%);
  /* One item out of sixty is still an item. Without a floor its segment rounds
     to a sub-pixel and the phase reads as absent rather than rare. */
  min-width: 3px;
}

.fib-phase-split-key { display: flex; flex-direction: column; gap: 7px; }
.fib-phase-split-key li {
  display: grid; grid-template-columns: 9px minmax(0, 1fr) auto;
  align-items: center; gap: var(--fib-space-3);
}
/* Swatch only: the label stays in ink. Three coloured words above five more in
   the rarity ramp would spend the rail's whole colour budget on legends, and
   phase-late is the fill red that doesn't clear 4.5:1 as small text anyway. */
.fib-phase-split-key i { width: 9px; height: 9px; border-radius: var(--fib-radius-sm); }
.fib-phase-split-key span { font-size: var(--fib-text-xs); color: var(--fib-ink-2); }
.fib-phase-split-key em {
  font-family: var(--fib-font-mono); font-style: normal;
  font-size: var(--fib-text-xs); font-variant-numeric: tabular-nums;
  color: var(--fib-ink-2); min-width: 3ch; text-align: right;
}
/* A phase this run never touched. Dimmed, never hidden — the zero is the answer. */
.fib-phase-split-key li[data-empty] { color: var(--fib-trace-dim); }
.fib-phase-split-key li[data-empty] span,
.fib-phase-split-key li[data-empty] em { color: inherit; }
.fib-phase-split-key li[data-empty] i { opacity: 0.4; }

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
.fib-inv-grid[data-play="pending"] .fib-inv-tile {
  opacity: 0; transform: translateY(7px) scale(0.96);
}
.fib-inv-grid[data-play="run"] .fib-inv-tile {
  opacity: 1; transform: none;
  transition: opacity 240ms var(--fib-ease) var(--delay),
              transform 240ms var(--fib-ease) var(--delay);
}
/* A skipped tile keeps its resting dim through the reveal — the reveal only
   restores opacity to that resting value, so exclude it from the 1.0 override. */
.fib-inv-grid[data-play="run"] .fib-inv-tile[data-skipped] { opacity: 0.66; }

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
  .fib-inv-grid[data-play="pending"] .fib-inv-tile { opacity: 1; transform: none; }
  .fib-inv-grid[data-play="pending"] .fib-inv-tile[data-skipped] { opacity: 0.66; }
  .fib-inv-progress { display: none; }
  .fib-inv-toggle[aria-expanded="true"] { transform: rotate(180deg); }
  /* Keep the player card's colour feedback, drop its lift. */
  .fib-player-card:hover { transform: none; }
  .fib-player-card:hover .fib-player-stand .fib-podium-head { transform: none; }
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
  /* Blue, not diamond. The pill is dropped here because a bottom bar has no room
     for one, but the COLOUR has to stay blue: blue is the module's one
     interactive accent and diamond means rarity and nothing else. Switching hue
     at a breakpoint made the active-nav signal mean two different things
     depending on the width of the window. */
  .fib-nav-item[aria-current="page"] { background: none; color: var(--fib-blue-ink); }

  .fib-main { padding-bottom: 76px; }
  .fib-page { padding: var(--fib-space-6) var(--fib-space-4) var(--fib-space-7); }
  .fib-section { padding-top: var(--fib-space-7); }

  .fib-table th, .fib-table td { padding-left: var(--fib-space-3); padding-right: var(--fib-space-3); }

  /*
   * The facet rail stacks above the grid and collapses. It is the same
   * <details> as on desktop, so there is no second component to keep in sync —
   * only the marker comes back and the default open state goes away.
   *
   * Closed by default here because a phone's first job is to show the list: a
   * rail that ate the first screenful would be a filter panel the reader has to
   * scroll past every visit. The summary carries the active-filter count, so a
   * closed rail that IS filtering still says so.
   */
  .fib-faceted { grid-template-columns: minmax(0, 1fr); gap: var(--fib-space-5); }
  .fib-facet-rail { position: static; }
  .fib-facet-rail > summary { list-style: revert; }
  .fib-facet-rail > summary::marker { content: revert; }
  .fib-facet-rail > summary::-webkit-details-marker { display: revert; }
  .fib-facet-rail:not([open]) { padding-bottom: var(--fib-space-4); }
  /* Two columns of checkboxes and ranges rather than one tall stack. */
  .fib-facet-rail-body { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
  .fib-facet + .fib-facet { padding-top: 0; border-top: none; }
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

  /* Tiles go single-file on a phone: two per row would crush each name to an
     ellipsis, and the whole point of the tile is that the name is readable. */
  .fib-inv-grid { grid-template-columns: minmax(0, 1fr); }
  .fib-inv-drawer > td { padding-left: var(--fib-space-3); padding-right: var(--fib-space-3); }

  /* The chase's track column cannot hold a bar and a fraction at 360px, so the
     row stacks and the track runs full width beneath the words. */
  .fib-chase-row { grid-template-columns: minmax(0, 1fr); row-gap: var(--fib-space-3); }
  .fib-chase-count, .fib-chase-unmeasured { text-align: left; }
  .fib-ramp-row { grid-template-columns: 76px 1fr auto; gap: var(--fib-space-2); }

  /* The hero avatar drops to 64px — an exact 2:1 downscale, still a legal
     sprite size — so the name keeps the width it needs. */
  .fib-hero-id { gap: var(--fib-space-4); }
  .fib-hero-avatar, .fib-hero-avatar img { width: 64px; height: 64px; }
  .fib-hero-stand { --block: 64px; }

  /* ".fib-pulse" is a grid and owns its own two-up rule via "@container
     fib-page"; only the flex strip needs a basis here. */
  .fib-stat-strip > * { flex-basis: 45%; border-left: none; padding-left: 0; }

  /*
   * The podium stays three across. It used to stack into rows here, because
   * three filled cards at 360px gave each name 100px of card. The block stacks
   * are 44px wide at this size (see the fib-page container query beside the
   * podium rules), so each place keeps its column and the heights still read as
   * the ranking - which a stacked list could only say with medals.
   */
  .fib-lead-board-score b { font-size: var(--fib-text-3xl); }
}

/*
 * The headline steps down with the page, not the window: the rail takes 232px
 * on desktop, so the room a 72px jersey line actually gets is the page's.
 */
@container fib-page (max-width: 820px) {
  .fib-display { font-size: var(--fib-display-lg); }
}
@container fib-page (max-width: 480px) {
  .fib-display { font-size: var(--fib-display-md); }
  .fib-hero-name { font-size: var(--fib-display-md); }
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
