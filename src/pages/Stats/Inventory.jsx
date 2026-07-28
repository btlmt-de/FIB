/**
 * FIB Stats — the match inventory.
 *
 * One competitor's complete item log from a single match, laid out as a
 * nine-wide inventory grid. Nine columns is not decoration: it is the width of
 * a Minecraft inventory row, and reading the run in the same shape the player
 * saw it in-game is the point. The slot itself is the module's existing `well`
 * recess, so this reads as the same system rather than a bolt-on.
 *
 * Three signals ride on each slot, all of them already in the data:
 *
 *   rim          back-to-back rarity, on the five-tier ramp
 *   corner index collection order, where Minecraft puts stack size
 *   slash + grey skipped
 *
 * Skips are desaturated rather than reddened. A skipped item still scores, so
 * it means "gave up on this one", not "failed" — colouring it like an error
 * would misreport the rules of the game.
 *
 * ── The playback ──
 *
 * Slots do not appear on a uniform stagger. Each one's delay is its REAL
 * collection time, scaled proportionally onto ~4.5 seconds, so the gaps survive
 * the compression: a 13-second item snaps in, a 114-second item visibly
 * grinds. The consequence is that every player's inventory fills with a
 * different rhythm — streaks burst, hard items stall — which is what separates
 * this from decoration. A uniform stagger would animate identically for
 * everyone and tell you nothing.
 *
 * The timing is pure CSS: each slot carries its own `--delay` and the container
 * flips one attribute. No per-frame JavaScript, and the browser owns the
 * scheduling. Reduced motion, a hidden tab, or the skip control all land on the
 * same fully-populated grid, which is also the default render — the animation
 * is only ever an override of something already correct and on screen.
 */

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { itemSegments } from './adapter.js';
import { RARITY_KEYS, RARITY_LABEL, rarityColor } from './tokens.js';
import { prefersReducedMotion } from './env.js';
import { ItemImage, Figure, RarityRamp, RarityTag, Empty } from './Primitives.jsx';
import * as f from './format.js';

/** Total wall-clock length of the fill animation. */
const PLAYBACK_MS = 4500;
/** How long one slot takes to land once its turn arrives. */
const SLOT_MS = 240;

const canAnimate = () =>
  !prefersReducedMotion() && !(typeof document !== 'undefined' && document.hidden);

/** Highest tier present, or null. `RARITY_KEYS` is ordered lowest-first. */
function rarestOf(segments) {
  let best = null;
  for (const s of segments) {
    if (!s.b2b) continue;
    if (best == null || RARITY_KEYS.indexOf(s.b2b) > RARITY_KEYS.indexOf(best.b2b)) best = s;
  }
  return best;
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
    return {
      total: segments.length,
      found: segments.length - skipped,
      skipped,
      pulls: pulls.length,
      counts,
      rarest: rarestOf(segments),
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

    // One frame after the hidden paint, flip to 'run' so the per-slot
    // transitions have a start value to animate from.
    const raf = requestAnimationFrame(() => setPhase('run'));
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

  const [hovered, setHovered] = useState(null);

  if (!segments.length) {
    return (
      <Empty title={`${ownerLabel} collected nothing in this match`}>
        Every item a player picks up is logged the moment it is collected, so an empty
        inventory means they joined after the match had already finished.
      </Empty>
    );
  }

  // The caption defaults to the run's headline moment and follows the pointer
  // from there — a readout beats 61 native tooltips, which are slow to appear
  // and cannot be styled.
  const caption = hovered ?? summary.rarest ?? summary.stall;

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
            <span className="fib-meta">{summary.total} slots, in collection order</span>
          )}
        </div>

        {/* Runs only while the fill is playing; it is the affordance that tells
            you the grid is still populating and can be skipped. */}
        <div className="fib-inv-progress" data-play={phase} aria-hidden="true"><i /></div>

        <ol
          className="fib-inv-grid"
          data-play={phase}
          onMouseLeave={() => setHovered(null)}
        >
          {segments.map((s) => {
            const tier = s.b2b;
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
                /* Composes the shared well: surface, lighting and seating come
                   from there, and only the slot geometry is local. */
                className="fib-well fib-inv-slot"
                data-skipped={s.skipped || undefined}
                data-tier={tier || undefined}
                style={{ '--delay': `${delay.toFixed(0)}ms`, '--tier': tier ? rarityColor(tier) : undefined }}
                title={label}
                onMouseEnter={() => setHovered(s)}
                /* Touch has no hover; a tap moves the readout. The full text is
                   already in the accessible name, so this is enhancement only
                   and deliberately stays out of the tab order — 61 tab stops
                   between the standings and the next control is not a keyboard
                   path anyone wants. */
                onClick={() => setHovered(s)}
              >
                {/* Eager, not lazy. The reader has just asked for this grid and
                    the fill starts immediately — a lazily-loaded slot would pop
                    in blank and fill after its own reveal had already played. */}
                <ItemImage name={s.itemName} size={32} loading="eager" />
                <span className="fib-inv-order">{s.order}</span>
                {/*
                  A visually-hidden span rather than `aria-label` on the <li>.
                  Naming a bare listitem is unreliable — several screen readers
                  drop the label entirely and announce an empty slot — whereas
                  the text node is read wherever the list is. The full readout
                  is therefore available to a reader walking the list even
                  though the slot itself is deliberately not a tab stop.
                */}
                <span className="fib-sr">{label}</span>
              </li>
            );
          })}
        </ol>

        <p className="fib-inv-caption" aria-live="off">
          {caption ? (
            <>
              <b>{f.itemLabel(caption.itemName)}</b>
              <span className="fib-meta">
                #{caption.order} · {Math.round(caption.took)}s · {f.clock(caption.t)}
              </span>
              {caption.b2b ? <RarityTag tier={caption.b2b} /> : null}
              {caption.skipped ? <span className="fib-inv-skipped-tag">skipped</span> : null}
            </>
          ) : null}
        </p>
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
