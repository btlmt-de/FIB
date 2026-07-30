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
/* Active item wears the interactive accent: a blue-tinted pill, blue label and
   icon, and a top gloss so it reads as the lit, current destination. */
.fib-nav-item[aria-current="page"] {
  background: var(--fib-blue-tint); color: var(--fib-blue-ink); font-weight: 600;
  box-shadow: inset 0 1px 0 0 var(--fib-gloss-top);
}
.fib-nav-item svg { flex: none; opacity: 0.7; }
.fib-nav-item[aria-current="page"] svg { opacity: 1; color: var(--fib-blue-ink); }

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
.fib-pcard-title {
  font-size: var(--fib-text-lg); font-weight: 600;
  letter-spacing: -0.01em; line-height: 1.2;
  overflow-wrap: anywhere;
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

/* ── The player directory ─────────────────────────────────────────────────
 *
 * A contacts-list, not a leaderboard: no numbers, just a face and a name that
 * routes into a profile. Grouped A–Z when browsing, flat when searching.
 */

/* The A–Z jump strip, docked to the top of the scroll so it stays reachable as
   the roster grows. A soft void wash so tiles pass cleanly beneath it. */
.fib-dir-index {
  position: sticky; top: 0; z-index: 5;
  display: flex; flex-wrap: wrap; gap: 4px;
  padding: var(--fib-space-3) 0;
  margin-bottom: var(--fib-space-2);
  background: linear-gradient(var(--fib-void) 72%, transparent);
}
.fib-dir-jump {
  min-width: 26px; height: 26px; padding: 0 6px;
  border-radius: var(--fib-radius-sm);
  font-family: var(--fib-font-mono);
  font-size: var(--fib-text-2xs); font-variant-numeric: tabular-nums;
  color: var(--fib-ink-3);
  transition: color var(--fib-motion-fast) var(--fib-ease),
              background var(--fib-motion-fast) var(--fib-ease);
}
.fib-dir-jump:hover { background: var(--fib-blue-tint); color: var(--fib-blue-ink); }

.fib-dir-group { scroll-margin-top: var(--fib-space-6); }
.fib-dir-group + .fib-dir-group { margin-top: var(--fib-space-6); }
/* The initial, set in the number face — a quiet divider, not a shout. */
.fib-dir-letter {
  font-family: var(--fib-font-mono);
  font-size: var(--fib-text-lg); font-weight: 600;
  color: var(--fib-ink-3);
  padding-bottom: var(--fib-space-2);
  margin-bottom: var(--fib-space-4);
  border-bottom: 1px solid var(--fib-line-soft);
}

.fib-dir-grid {
  display: grid;
  /* Wider than the 184px it was: the tile now carries two facts under the name,
     and at 184px "1,203 items · 2 days ago" wrapped to a second line on every
     tile. */
  grid-template-columns: repeat(auto-fill, minmax(228px, 1fr));
  gap: var(--fib-space-3);
}
/* One player: a seated tile that lifts and lights blue on hover, because it IS
   a link (blue is the module's interactive chrome, never a value colour). */
.fib-dir-tile {
  display: flex; align-items: center; gap: var(--fib-space-3);
  min-width: 0; padding: var(--fib-space-3);
  border-radius: var(--fib-radius-md);
  background: var(--fib-plinth);
  box-shadow: inset 0 0 0 1px var(--fib-line-soft),
              inset 0 1px 0 0 var(--fib-gloss-top);
  text-align: left; cursor: pointer;
  transition: background var(--fib-motion-fast) var(--fib-ease),
              box-shadow var(--fib-motion-fast) var(--fib-ease),
              transform var(--fib-motion-fast) var(--fib-ease);
}
.fib-dir-tile:hover {
  background: var(--fib-plinth-2);
  box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--fib-blue) 48%, var(--fib-line)),
              inset 0 1px 0 0 var(--fib-gloss-top),
              0 10px 22px -14px var(--fib-blue);
  transform: translateY(-2px);
}
.fib-dir-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.fib-dir-name {
  display: block;
  font-size: var(--fib-text-sm); font-weight: 500; color: var(--fib-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
/* The two facts under a name, separated by a middot rather than by a gap — at
   this size a gap alone reads as one string with a hole in it. Rendered per-fact
   so a player missing one (never seen in the recent window) simply shows the
   other, with no stray separator. */
.fib-dir-facts { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 6px; }
.fib-dir-facts > span + span::before { content: '·'; margin-right: 6px; color: var(--fib-trace-dim); }

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
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; gap: var(--fib-space-2);
  text-align: center; min-width: 0;
  padding: var(--fib-space-6) var(--fib-space-4) var(--fib-space-5);
  /* A filled, medal-lit card — the colour falls from the top (where the avatar
     and medal sit) over an opaque body, so the slot reads as a substantial
     object rather than a transparent tray with a glow floating around it. */
  background:
    radial-gradient(130% 78% at 50% 0, color-mix(in oklch, var(--medal, var(--fib-line)) 20%, transparent), transparent 60%),
    linear-gradient(var(--fib-plinth-2), var(--fib-plinth));
  border: 1px solid color-mix(in oklch, var(--medal, var(--fib-line-soft)) 32%, var(--fib-line-soft));
  border-radius: var(--fib-radius-lg);
  box-shadow: inset 0 1px 0 0 var(--fib-gloss-top);
  transition: transform var(--fib-motion-base) var(--fib-ease),
              box-shadow var(--fib-motion-base) var(--fib-ease);
}
/* The medal line rides the top edge, the same tone as the bleed. */
.fib-podium-slot::before {
  content: ''; position: absolute; inset: 0 0 auto 0; height: 3px;
  background: var(--medal, var(--fib-line));
}
.fib-podium-slot:hover {
  transform: translateY(-4px);
  box-shadow: inset 0 1px 0 0 var(--fib-gloss-top),
              0 18px 44px -22px var(--medal, var(--fib-shadow-deep));
}
.fib-podium-slot[data-place="1"] { --medal: var(--fib-medal-gold);   padding-top: var(--fib-space-7); }
.fib-podium-slot[data-place="2"] { --medal: var(--fib-medal-silver); order: -1; padding-top: var(--fib-space-6); }
.fib-podium-slot[data-place="3"] { --medal: var(--fib-medal-bronze); padding-top: var(--fib-space-5); }

.fib-podium-faces { display: flex; gap: var(--fib-space-2); }
.fib-podium-name {
  font-weight: 600; letter-spacing: -0.01em;
  overflow-wrap: anywhere; line-height: 1.25;
}
.fib-podium-name button { font: inherit; }
.fib-podium-name button:hover { color: var(--fib-blue-ink); }
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

/* Overview. */
.fib-overview-head { padding-bottom: var(--fib-space-6); }
.fib-overview-head .fib-lede { margin: var(--fib-space-3) 0 0; }
.fib-overview-head .fib-pulse { margin-top: var(--fib-space-7); }

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
              border-color var(--fib-motion-fast) var(--fib-ease),
              box-shadow var(--fib-motion-base) var(--fib-ease),
              transform var(--fib-motion-base) var(--fib-ease);
}
/* The featured card lights up and lifts on hover — the one panel that behaves
   like a CSFloat product card, because it is the page's headline object. */
.fib-feature-card:hover {
  background: var(--fib-plinth-2);
  border-color: color-mix(in oklch, var(--fib-blue) 40%, var(--fib-line));
  box-shadow: inset 0 1px 0 0 var(--fib-gloss-top), 0 16px 50px -20px var(--fib-blue);
  transform: translateY(-2px);
}
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
.fib-feature-go { display: inline-flex; align-items: center; gap: 7px; color: var(--fib-blue-ink); }
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

/* Collection order, where Minecraft puts stack size. */
.fib-inv-order {
  position: absolute; right: 2px; bottom: 0;
  font-family: var(--fib-font-mono);
  font-size: var(--fib-text-2xs);
  font-variant-numeric: tabular-nums;
  color: var(--fib-ink-3);
  text-shadow: 0 1px 2px var(--fib-shadow-deep);
  pointer-events: none;
  z-index: 2;
}

.fib-inv-tile-text {
  display: flex; flex-direction: column; gap: 3px;
  min-width: 0;
}
.fib-inv-name {
  font-size: var(--fib-text-sm); font-weight: 600;
  line-height: 1.2; color: var(--fib-ink);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
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
  /* Keep the directory tile's colour feedback, drop its lift. */
  .fib-dir-tile:hover { transform: none; }
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
