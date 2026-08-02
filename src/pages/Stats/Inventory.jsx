/**
 * FIB Stats — the match inventory.
 *
 * One competitor's complete item log from a single match, laid out as a grid of
 * labelled tiles — one tile per item, in collection order. This was a nine-wide
 * Minecraft-shaped grid of bare 48px slots whose names lived only in a hover
 * caption; that shape was authentic but unreadable, a wall of tiny squares you
 * had to point at one at a time to decode. The tile keeps the sprite in the
 * module's `well` recess but sets its NAME beside it, always on, so the run
 * reads as a list of things collected rather than a puzzle to hover through.
 *
 * Every signal is on the tile itself, none of it behind a pointer:
 *
 *   name         the item, spelled out
 *   sprite well  seated in the shared recess, so this is the same system
 *   phase bleed  early / mid / late, the green→yellow→red the item index uses
 *   rim          back-to-back rarity, on the five-tier ramp
 *   corner index collection order, where Minecraft puts stack size
 *   meta line    time to collect · rarity · skipped
 *
 * Skips are desaturated rather than reddened. A skipped item still scores, so
 * it means "gave up on this one", not "failed" — colouring it like an error
 * would misreport the rules of the game.
 *
 * ── The rail ──
 *
 * Three figures, the pool-phase split, then the back-to-back ramp: the run as a
 * whole, how it was composed, then the rare part of it.
 *
 * The split is a stacked bar and not a second ramp beside the rarity one,
 * because the phases PARTITION the run — every item is exactly one of early,
 * mid or late, and the parts sum to the total. A shape that sums says "this is
 * the whole inventory, divided"; the ramp says "these counts, side by side",
 * which is the right sentence for rarity tiers spanning orders of magnitude and
 * the wrong one here. It also doubles as the legend for the grid's phase bleed,
 * which this view otherwise never names — the item index prints exactly this
 * colour code above its cards for the same reason.
 *
 * Every duration on this screen goes through `f.duration`, so anything past a
 * minute reads as "15m 17s". A bare "917s" is arithmetic handed to the reader:
 * they cannot tell whether the longest stall was a bad minute or a quarter of
 * the match without doing the division themselves.
 *
 * ── The playback ──
 *
 * Tiles do not appear on a uniform stagger. Each one's delay is its REAL
 * collection time, scaled proportionally onto ~4.5 seconds, so the gaps survive
 * the compression: a 13-second item snaps in, a 114-second item visibly
 * grinds. The consequence is that every player's inventory fills with a
 * different rhythm — streaks burst, hard items stall — which is what separates
 * this from decoration. A uniform stagger would animate identically for
 * everyone and tell you nothing.
 *
 * The timing is pure CSS: each tile carries its own `--delay` and the container
 * flips one attribute. No per-frame JavaScript, and the browser owns the
 * scheduling.
 *
 * *It used to run on open, and that was the wrong default.* The claim right
 * here was that the full grid "is also the default render — the animation is
 * only ever an override of something already correct and on screen". It was
 * not: `phase` initialised to `pending`, `pending` sets `opacity: 0` on every
 * tile, and so opening the drawer bought a blank grid for up to 4.74 seconds.
 * The sprites are the app's own 4KB of PNG and land in about 12ms — every bit
 * of that wait was the animation, and it read as the page loading rather than
 * as a replay. That is precisely what "Motion Never Withholds" exists to
 * forbid, and the rule's other half was broken too: an entrance belongs on
 * elements genuinely below the fold, and the first row of tiles is the first
 * thing the drawer shows.
 *
 * So the grid is now correct and complete on the frame it opens, and the replay
 * is a control. Nothing about the rhythm changed — the same proportional delays
 * over the same 4.5 seconds — but a reader who wants to watch the run asks for
 * it, and a reader who wants to read the list is not charged for a show they
 * did not order. Reduced motion, a hidden tab, and the skip control all still
 * land on the same fully-populated grid, which is now also where they start.
 */

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { itemSegments, itemPhase } from './adapter.js';
import { RARITY_KEYS, RARITY_LABEL, rarityColor } from './tokens.js';
import { prefersReducedMotion } from './env.js';
import { ItemImage, Figure, RarityRamp, RarityTag, Empty } from './Primitives.jsx';
import * as f from './format.js';

/** Match-phase key → colour token, for the slot's phase bleed. */
const PHASE_VAR = {
  EARLY: 'var(--fib-phase-early)',
  MID: 'var(--fib-phase-mid)',
  LATE: 'var(--fib-phase-late)',
};

/*
 * The split's parts, in match order, with the pool's unassigned tail last.
 *
 * `itemPhase` returns null for an item the plugin never gave a state, and those
 * are real items sitting in a real inventory. Dropping them would leave the
 * parts summing to less than the run, which is the one thing a stacked bar
 * promises. It takes the netherite tone and the item index's own word for them —
 * "Unassigned" — rather than inventing a fourth phase that the pool does not have.
 */
const PHASE_PARTS = [
  { id: 'EARLY', label: 'Early' },
  { id: 'MID', label: 'Mid' },
  { id: 'LATE', label: 'Late' },
  { id: 'NONE', label: 'Unassigned' },
];

const phaseTone = (id) => PHASE_VAR[id] ?? 'var(--fib-netherite)';

/** Total wall-clock length of the fill animation. */
const PLAYBACK_MS = 4500;
/** How long one slot takes to land once its turn arrives. */
const SLOT_MS = 240;

const canAnimate = () =>
  !prefersReducedMotion() && !(typeof document !== 'undefined' && document.hidden);

/**
 * How much of this run came out of the early, mid and late pools — one bar,
 * read at a glance, with the counts spelled out beneath it.
 */
function PhaseSplit({ counts }) {
  const parts = PHASE_PARTS
    .map((p) => ({ ...p, n: counts[p.id] ?? 0 }))
    /* Early / Mid / Late always hold their row: "Late 0" is an answer, and a row
       that disappears at zero leaves the reader unable to tell which phases the
       pool even has. "Unassigned" is not a phase, so it only appears when it has
       something to report. */
    .filter((p) => p.id !== 'NONE' || p.n > 0);

  return (
    <div className="fib-phase-split">
      <h5 className="fib-label fib-inv-subhead">Pool phase</h5>

      {/* Empty parts are dropped rather than grown to nothing — the 2px seam
          between segments would still be drawn around a segment that isn't
          there, reading as a phase too thin to see rather than one absent. */}
      <div className="fib-phase-split-bar" aria-hidden="true">
        {parts.filter((p) => p.n > 0).map((p) => (
          <i key={p.id} style={{ flexGrow: p.n, backgroundColor: phaseTone(p.id) }} />
        ))}
      </div>

      {/* The key carries the counts as ordinary text, so the bar can stay purely
          visual: describing it for a screen reader would only say the same
          numbers a second time, one line above where they already are. */}
      <ul className="fib-phase-split-key">
        {parts.map((p) => (
          <li key={p.id} data-empty={p.n === 0 || undefined}>
            <i style={{ backgroundColor: phaseTone(p.id) }} aria-hidden="true" />
            <span>{p.label}</span>
            <em>{p.n}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Inventory({ entry, duration, ownerLabel, mode }) {
  const segments = useMemo(() => itemSegments(entry), [entry]);

  const summary = useMemo(() => {
    const skipped = segments.filter((s) => s.skipped).length;
    const pulls = segments.filter((s) => s.b2b);
    const counts = Object.fromEntries(
      RARITY_KEYS.map((k) => [k, pulls.filter((s) => s.b2b === k).length]),
    );
    const stall = segments.reduce((a, b) => (b.took > (a?.took ?? -1) ? b : a), null);
    // Keyed by the same ids the split renders, so a phase with none of this
    // run's items still has a bucket to report zero from.
    const phases = { EARLY: 0, MID: 0, LATE: 0, NONE: 0 };
    for (const s of segments) phases[itemPhase(s.itemName) ?? 'NONE'] += 1;
    return {
      total: segments.length,
      found: segments.length - skipped,
      skipped,
      pulls: pulls.length,
      counts,
      phases,
      stall,
    };
  }, [segments]);

  /* ── Playback ─────────────────────────────────────────────────────────
     'idle' is the resting, fully-visible state. It is where the drawer OPENS,
     where every non-animating path lands, and where the replay returns to, so
     the grid is never left half-filled and never starts empty. */
  const [phase, setPhase] = useState('idle');
  const timers = useRef([]);
  const frame = useRef(0);

  const clearTimers = () => {
    cancelAnimationFrame(frame.current);
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  /* Keyed on 'pending', so the same path serves the first press and every one
     after it. The body is a no-op in the other two phases, which is what keeps
     the 'pending' → 'run' transition from tearing down its own return-to-idle
     timer the way a cleanup on this effect would. */
  useLayoutEffect(() => {
    if (phase !== 'pending') return;

    // One frame after the hidden paint, flip to 'run' so the per-tile
    // transitions have a start value to animate from.
    frame.current = requestAnimationFrame(() => setPhase('run'));
    timers.current.push(setTimeout(() => setPhase('idle'), PLAYBACK_MS + SLOT_MS + 60));
  }, [phase]);

  // Unmount is the only time everything in flight has to be dropped. Closing the
  // drawer mid-replay unmounts this, and a timer left holding `setPhase` would
  // fire into a component that no longer exists.
  useEffect(() => () => clearTimers(), []);

  // Backgrounding mid-fill stops CSS transitions dead. Land on the full grid
  // rather than leaving half an inventory stranded for the reader's return.
  useEffect(() => {
    if (phase === 'idle' || typeof document === 'undefined') return undefined;
    const onVisibility = () => { if (document.hidden) { clearTimers(); setPhase('idle'); } };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [phase]);

  const skip = () => { clearTimers(); setPhase('idle'); };

  /* A press starts the run from the top. `canAnimate` is checked here as well as
     at render time: the button is hidden under reduced motion, but the setting
     can be turned on between the render that drew it and the press. */
  const replay = () => {
    if (!canAnimate()) return;
    clearTimers();
    setPhase('pending');
  };

  const motionOk = !prefersReducedMotion();

  if (!segments.length) {
    return (
      <Empty title={`${ownerLabel} collected nothing in this match`}>
        Every item a player picks up is logged the moment it is collected, so an empty
        inventory means they joined after the match had already finished.
      </Empty>
    );
  }

  return (
    <div className="fib-inv">
      <div className="fib-inv-main">
        <div className="fib-inv-head">
          <h4 className="fib-h2">
            {mode === 'SOLO' ? `${ownerLabel}'s items` : `${ownerLabel} — shared items`}
          </h4>
          <div className="fib-inv-head-aside">
            {phase === 'run' ? (
              <button type="button" className="fib-btn fib-btn--quiet fib-inv-skip" onClick={skip}>
                Skip replay
              </button>
            ) : (
              <>
                <span className="fib-meta">{summary.total} items, in collection order</span>
                {/* Offered, never imposed — see "The playback" above. Absent under
                    reduced motion rather than present and inert: a control that
                    does nothing when pressed is worse than one that isn't there. */}
                {motionOk ? (
                  <button type="button" className="fib-btn fib-btn--quiet fib-inv-skip" onClick={replay}>
                    Replay the run
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>

        {/* Runs only while the fill is playing; it is the affordance that tells
            you the grid is still populating and can be skipped. */}
        <div className="fib-inv-progress" data-play={phase} aria-hidden="true"><i /></div>

        <ol className="fib-inv-grid" data-play={phase}>
          {segments.map((s) => {
            const tier = s.b2b;
            const phase = itemPhase(s.itemName);
            // Delay IS the item's real collection time, proportionally scaled.
            const delay = (Math.min(s.t, duration) / Math.max(1, duration)) * PLAYBACK_MS;
            const label = [
              f.itemLabel(s.itemName),
              `#${s.order}`,
              // Spelled out, not the on-screen "1m 54s" — an abbreviation that
              // reads well is not the same string as one that speaks well.
              f.durationWords(s.took),
              tier ? `${RARITY_LABEL[tier]} back-to-back` : null,
              s.skipped ? 'skipped' : null,
            ].filter(Boolean).join(', ');

            return (
              <li
                key={s.order}
                className="fib-inv-tile"
                data-skipped={s.skipped || undefined}
                style={{ '--delay': `${delay.toFixed(0)}ms` }}
              >
                {/* Composes the shared well: surface, lighting, seating, the
                    phase bleed and the rarity rim all come from there. */}
                <div
                  className="fib-well fib-inv-cell"
                  data-tier={tier || undefined}
                  data-phase={phase || undefined}
                  style={{
                    ...(tier ? { '--tier': rarityColor(tier) } : null),
                    ...(phase && PHASE_VAR[phase] ? { '--phase': PHASE_VAR[phase] } : null),
                  }}
                >
                  {/* Eager, not lazy. The reader has just asked for this grid
                      and the fill starts immediately — a lazily-loaded sprite
                      would pop in blank after its own reveal had played. */}
                  <ItemImage name={s.itemName} size={40} loading="eager" />
                  <span className="fib-inv-order">{s.order}</span>
                </div>

                <div className="fib-inv-tile-text">
                  <b className="fib-inv-name">{f.itemLabel(s.itemName)}</b>
                  <span className="fib-inv-meta">
                    <span className="fib-inv-took">{f.duration(s.took)}</span>
                    {tier ? <RarityTag tier={tier} /> : null}
                    {s.skipped ? <span className="fib-inv-skipped-tag">skipped</span> : null}
                  </span>
                </div>

                {/* The full readout for a screen reader walking the list; the
                    tile itself is deliberately not a tab stop. */}
                <span className="fib-sr">{label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="fib-inv-side">
        <div className="fib-inv-figures">
          <Figure size="sm" value={summary.found} label="Found" count={false} />
          <Figure size="sm" value={summary.skipped} label="Skipped" count={false} />
          {/* `f.duration` past a minute, not a raw second count: the whole point
              of this figure is how long the run got stuck, and "917s" makes the
              reader divide before they can tell. The item is named beneath it —
              a stall has a subject, and without it the number sends you scanning
              the grid for which one it was. */}
          <Figure
            size="sm"
            value={summary.stall ? summary.stall.took : null}
            format={f.duration}
            label="Longest stall"
            note={summary.stall ? f.itemLabel(summary.stall.itemName) : null}
            count={false}
          />
        </div>

        <PhaseSplit counts={summary.phases} />

        {summary.pulls > 0 ? (
          <>
            <h5 className="fib-label fib-inv-subhead">
              {summary.pulls} back-to-back {summary.pulls === 1 ? 'pull' : 'pulls'}
            </h5>
            <RarityRamp counts={summary.counts} keys={RARITY_KEYS} />
          </>
        ) : (
          <p className="fib-meta fib-inv-subhead">
            No back-to-back pulls in this match.
          </p>
        )}
      </div>
    </div>
  );
}
