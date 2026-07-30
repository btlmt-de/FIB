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
 *   meta line    seconds to collect · rarity · skipped
 *
 * Skips are desaturated rather than reddened. A skipped item still scores, so
 * it means "gave up on this one", not "failed" — colouring it like an error
 * would misreport the rules of the game.
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
 * scheduling. Reduced motion, a hidden tab, or the skip control all land on the
 * same fully-populated grid, which is also the default render — the animation
 * is only ever an override of something already correct and on screen.
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

/** Total wall-clock length of the fill animation. */
const PLAYBACK_MS = 4500;
/** How long one slot takes to land once its turn arrives. */
const SLOT_MS = 240;

const canAnimate = () =>
  !prefersReducedMotion() && !(typeof document !== 'undefined' && document.hidden);

export function Inventory({ entry, duration, ownerLabel, mode }) {
  const segments = useMemo(() => itemSegments(entry), [entry]);

  const summary = useMemo(() => {
    const skipped = segments.filter((s) => s.skipped).length;
    const pulls = segments.filter((s) => s.b2b);
    const counts = Object.fromEntries(
      RARITY_KEYS.map((k) => [k, pulls.filter((s) => s.b2b === k).length]),
    );
    const stall = segments.reduce((a, b) => (b.took > (a?.took ?? -1) ? b : a), null);
    return {
      total: segments.length,
      found: segments.length - skipped,
      skipped,
      pulls: pulls.length,
      counts,
      stall,
    };
  }, [segments]);

  /* ── Playback ─────────────────────────────────────────────────────────
     'idle' is the resting, fully-visible state, and where every non-animating
     path lands so the grid is never left half-filled.

     The starting phase is decided in the initialiser rather than in an effect:
     deciding it after mount would paint one frame of full grid before hiding
     it, which is the flash the animation exists to avoid. */
  const [phase, setPhase] = useState(() => (canAnimate() ? 'pending' : 'idle'));
  const timers = useRef([]);
  const frame = useRef(0);

  const clearTimers = () => {
    cancelAnimationFrame(frame.current);
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useLayoutEffect(() => {
    if (phase !== 'pending') return undefined;

    // One frame after the hidden paint, flip to 'run' so the per-tile
    // transitions have a start value to animate from.
    frame.current = requestAnimationFrame(() => setPhase('run'));
    timers.current.push(setTimeout(() => setPhase('idle'), PLAYBACK_MS + SLOT_MS + 60));

    return () => {
      clearTimers();
    };
    // Runs once, off the initial phase; `phase` moving on must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Backgrounding mid-fill stops CSS transitions dead. Land on the full grid
  // rather than leaving half an inventory stranded for the reader's return.
  useEffect(() => {
    if (phase === 'idle' || typeof document === 'undefined') return undefined;
    const onVisibility = () => { if (document.hidden) { clearTimers(); setPhase('idle'); } };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [phase]);

  const skip = () => { clearTimers(); setPhase('idle'); };

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
          {phase === 'run' ? (
            <button type="button" className="fib-btn fib-btn--quiet fib-inv-skip" onClick={skip}>
              Skip replay
            </button>
          ) : (
            <span className="fib-meta">{summary.total} items, in collection order</span>
          )}
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
              `${Math.round(s.took)} seconds`,
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
                    <span className="fib-inv-took">{Math.round(s.took)}s</span>
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
          <Figure
            size="sm"
            value={summary.stall ? summary.stall.took : null}
            format={(n) => `${Math.round(n)}s`}
            label="Longest stall"
            count={false}
          />
        </div>

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
