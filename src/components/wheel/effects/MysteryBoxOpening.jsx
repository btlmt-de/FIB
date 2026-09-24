import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { COLORS, Z } from '../config/constants';
import { useCalm } from '../../../config/power.js';
// The gilt text treatment (`fib-gilt-text`) is the plaque's, shared.
import './DailyBounty.css';
import './MysteryBoxOpening.css';

/*
 * THE MYSTERY BOX, UNWRAPPED BY HAND - the bounty's prize as an object on the
 * screen, and the moment it becomes the wheel.
 *
 * The box is NOT opened here. The reel is the opening: the box's contents are
 * drawn by the server when it is spun (services/dailyBounty.js openBox), and the
 * gilded reel of specials is where that happens. What this scene does is the
 * handing over. The winner is shown the box, taps it, and it bursts - lid off,
 * gilt out - and pours itself into the reel band, which takes the coat
 * (WheelSpinner's `boxCoating`) and is the mystery reel from then on.
 *
 * An earlier version of this ran the whole spin inside the scene: the box
 * rattled while the reel turned underneath and the item rose out of it on
 * landing. The owner turned it down on sight - it sat over the reel, and the
 * reel is the event. Nothing covers the reel now; the scene is gone before the
 * spin can start.
 *
 * Two callbacks, because the hand-over overlaps: `onGild` fires as the gilt
 * reaches the band, so the reel turns gold under the landing particles rather
 * than after them, and `onDone` when the last of them has settled.
 *
 * "Later" is the other way out, and it is a move too, not a dismissal: the box
 * shrinks and flies to the shelf in the reel header (MysteryBoxShelf, below),
 * which catches it, and from which it can be taken down again. It is also the
 * only way out during an event, when the box may not be opened at all - the
 * primary button becomes "Keep for later" and does exactly what "Later" does.
 */

const giltVars = {
    '--gilt-pale': COLORS.mysteryGilt[0],
    '--gilt-mid': COLORS.mysteryGilt[1],
    '--gilt-deep': COLORS.mysteryGilt[2],
    '--bounty': COLORS.bounty,
};

const BURST_MS = 380;   // lid off, the first spray - before anything travels
const GILD_AT_MS = 1050; // the first of the stream reaches the band
const DONE_MS = 1750;    // the last of it has landed
const SHELVED_MS = 820;  // "Later": the box has reached the shelf

/** Where the box sits and where the reel is, in viewport pixels. */
function measure(boxEl, targetEl) {
    const b = boxEl?.getBoundingClientRect();
    const t = targetEl?.getBoundingClientRect();
    if (!b) return null;
    const from = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    // No reel to aim at (it should always be there) - fall to the lower middle.
    const band = t && t.width > 0
        ? { left: t.left, width: t.width, y: t.top + t.height / 2, h: t.height }
        : { left: 0, width: window.innerWidth, y: window.innerHeight * 0.6, h: 120 };
    return { from, band };
}

/** The stream: gilt from the burst box to points spread along the band. */
function makeStream(m, count) {
    const colors = [...COLORS.mysteryGilt.slice(0, 3), COLORS.bounty];
    return Array.from({ length: count }, (_, i) => {
        // Spread across the band, denser at the middle where the box lands.
        const u = (Math.random() + Math.random()) / 2;
        const tx = m.band.left + m.band.width * (0.04 + u * 0.92);
        const ty = m.band.y + (Math.random() - 0.5) * m.band.h * 0.7;
        const sx = m.from.x + (Math.random() - 0.5) * 60;
        const sy = m.from.y + (Math.random() - 0.5) * 40;
        return {
            id: i,
            x: sx,
            y: sy,
            dx: tx - sx,
            dy: ty - sy,
            // Up first, then down onto the reel - an arc, not a straight line.
            lift: -(60 + Math.random() * 140),
            size: 3 + Math.random() * 5,
            delay: BURST_MS - 120 + Math.random() * 520,
            dur: 620 + Math.random() * 380,
            color: colors[i % colors.length],
        };
    });
}

function Box() {
    return (
        <span className="fib-mbox" aria-hidden="true">
            <span className="fib-mbox-shadow" />
            <span className="fib-mbox-body">
                <span className="fib-mbox-ribbon" />
                <b className="fib-mbox-mark">?</b>
            </span>
            <span className="fib-mbox-seam" />
            <span className="fib-mbox-lid">
                <span className="fib-mbox-ribbon" />
                <span className="fib-mbox-bow"><i /><i /></span>
            </span>
        </span>
    );
}

export function MysteryBoxOpening({
    held = false,       // a box is held but the reel cannot take it right now
    claimedName = null, // the bounty that paid it
    targetRef,          // the reel band, where an opened box goes
    shelfRef,           // the shelf, where a box put away goes
    onGild,
    onDone,
    onShelved,
}) {
    const calm = useCalm();
    // null | 'unwrap' | 'shelve' - which way the box is leaving.
    const [leaving, setLeaving] = useState(null);
    const [flight, setFlight] = useState(null);
    const [stream, setStream] = useState([]);
    const boxRef = useRef(null);
    const openButtonRef = useRef(null);
    const timersRef = useRef([]);
    const unwrapping = leaving === 'unwrap';

    useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

    useEffect(() => {
        openButtonRef.current?.focus({ preventScroll: true });
    }, []);

    const later = (fn, ms) => timersRef.current.push(setTimeout(fn, ms));

    // Both flights are measured at the click, when the box is exactly where
    // the player sees it - before anything has started to move.
    const shelve = () => {
        if (leaving) return;
        const b = boxRef.current?.getBoundingClientRect();
        const s = shelfRef?.current?.getBoundingClientRect();
        if (b) {
            // No shelf to find (it is always mounted; this is belt and braces) -
            // the box just sinks and goes.
            setFlight(s && s.width + s.height > 0
                ? { dx: s.left + s.width / 2 - (b.left + b.width / 2), dy: s.top + s.height / 2 - (b.top + b.height / 2) }
                : { dx: 0, dy: 80 });
        }
        setLeaving('shelve');
        later(() => onShelved?.(), calm ? 0 : SHELVED_MS);
    };

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') shelve();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const unwrap = () => {
        if (leaving || held) return;
        const m = measure(boxRef.current, targetRef?.current);
        if (m) {
            setFlight({ dx: m.band.left + m.band.width / 2 - m.from.x, dy: m.band.y - m.from.y });
            if (!calm) setStream(makeStream(m, 70));
        }
        setLeaving('unwrap');
        if (calm) {
            // No flight to watch: the reel takes the coat and the box is gone.
            later(() => onGild?.(), 150);
            later(() => onDone?.(), 300);
            return;
        }
        later(() => onGild?.(), GILD_AT_MS);
        later(() => onDone?.(), DONE_MS);
    };

    const style = {
        ...giltVars,
        '--fly-x': `${flight?.dx ?? 0}px`,
        '--fly-y': `${flight?.dy ?? 0}px`,
        zIndex: Z.modal,
    };

    return createPortal(
        <div
            className={`fib-mbox-scene${leaving ? ' is-leaving' : ''}${unwrapping ? ' is-unwrapping' : ''}${leaving === 'shelve' ? ' is-shelving' : ''}${flight ? ' is-flying' : ''}`}
            style={style}
            role="dialog"
            aria-modal="true"
            aria-label="Mystery box"
        >
            <span className="fib-mbox-wash" aria-hidden="true" />
            <span className="fib-mbox-rays" aria-hidden="true" />
            {unwrapping && <span className="fib-mbox-flash" aria-hidden="true" />}

            <div className="fib-mbox-stage">
                <button
                    ref={boxRef}
                    type="button"
                    className="fib-mbox-hit"
                    disabled={!!leaving || held}
                    onClick={unwrap}
                    aria-label="Open the mystery box"
                    tabIndex={-1}
                >
                    <Box />
                </button>
            </div>

            <div className="fib-mbox-copy">
                <span className="fib-mbox-eyebrow">
                    {claimedName ? <>Bounty claimed · {claimedName}</> : 'You hold a bounty prize'}
                </span>
                <strong className="fib-mbox-title fib-gilt-text">Mystery box</strong>
                <span className="fib-mbox-sub">One special inside - every one of them at equal odds.</span>
                <span className="fib-mbox-actions">
                    {held ? (
                        // An event owns the wheel: the box cannot be opened
                        // inside one, so the only way on is the shelf.
                        <button
                            ref={openButtonRef}
                            type="button"
                            className="fib-mbox-open"
                            disabled={!!leaving}
                            onClick={shelve}
                        >
                            Keep for later
                        </button>
                    ) : (
                        <>
                            <button
                                ref={openButtonRef}
                                type="button"
                                className="fib-mbox-open"
                                disabled={!!leaving}
                                onClick={unwrap}
                            >
                                Open it
                            </button>
                            <button type="button" className="fib-mbox-later" onClick={shelve} disabled={!!leaving}>
                                Later
                            </button>
                        </>
                    )}
                </span>
                <span className="fib-mbox-hint">
                    {held
                        ? 'Boxes open after the event. It waits on the shelf above the reel.'
                        : 'Opening it gilds the wheel - your next spin is the box. Later puts it on the shelf.'}
                </span>
            </div>

            {/* Fixed to the viewport, not the stage: they travel to the reel. */}
            <span className="fib-mbox-stream" aria-hidden="true">
                {stream.map(p => (
                    <i
                        key={p.id}
                        style={{
                            left: p.x,
                            top: p.y,
                            width: p.size,
                            height: p.size,
                            background: p.color,
                            '--dx': `${p.dx}px`,
                            '--dy': `${p.dy}px`,
                            '--lift': `${p.lift}px`,
                            animationDelay: `${p.delay}ms`,
                            animationDuration: `${p.dur}ms`,
                        }}
                    />
                ))}
            </span>
        </div>,
        document.body,
    );
}

/**
 * The coat going onto the reel band, mounted inside it by WheelSpinner for the
 * length of the hand-over (remounted by key, so a second box restarts it).
 * The sheen spreads out from the middle, where the box went in; two bright
 * edges run ahead of it to the ends; glints flare where the stream landed.
 */
export function MysteryCoat() {
    const [glints] = useState(() => Array.from({ length: 34 }, (_, i) => {
        const u = (Math.random() + Math.random()) / 2;
        return {
            id: i,
            left: `${4 + u * 92}%`,
            top: `${12 + Math.random() * 76}%`,
            // Nearer the middle lands first, as the coat spreads outward.
            delay: Math.abs(u - 0.5) * 900 + Math.random() * 250,
        };
    }));

    return (
        <span className="fib-mbox-coat" aria-hidden="true">
            <span className="fib-mbox-coat-sheen" />
            <span className="fib-mbox-coat-edge is-left" />
            <span className="fib-mbox-coat-edge is-right" />
            {glints.map(g => (
                <i
                    key={g.id}
                    className="fib-mbox-coat-glint"
                    style={{ left: g.left, top: g.top, animationDelay: `${g.delay}ms` }}
                />
            ))}
        </span>
    );
}

/**
 * The shelf: the boxes a player holds and has not opened yet, as a small gilt
 * box in the reel header with a count. Tapping it takes one down - the same
 * scene as a claim, without the claim's line.
 *
 * Always mounted, even empty (then an invisible zero-width anchor), because a
 * box being put away has to have somewhere to fly to, and the flight is
 * measured before the count ticks.
 *
 * During an event the box is still shown, dimmed and marked as waiting: the
 * player should be able to see what they have, just not open it.
 *
 * `caught` is bumped each time a box lands on it, which replays the catch.
 */
export function MysteryBoxShelf({ ref, count = 0, held = false, caught = 0, compact = false, onOpen }) {
    if (count <= 0) {
        return <span ref={ref} className="fib-mbox-shelf-anchor" aria-hidden="true" />;
    }
    const label = held
        ? `${count === 1 ? 'A mystery box' : `${count} mystery boxes`} - opens after the event`
        : `${count === 1 ? 'A mystery box' : `${count} mystery boxes`} - open it`;
    return (
        <button
            ref={ref}
            key={caught}
            type="button"
            className={`fib-mbox-shelf${held ? ' is-held' : ''}${caught ? ' is-caught' : ''}`}
            style={giltVars}
            onClick={onOpen}
            title={label}
            aria-label={label}
        >
            <span className="fib-mbox-shelf-box" aria-hidden="true"><i /></span>
            {!compact && <span className="fib-mbox-shelf-label">{held ? 'After event' : 'Mystery box'}</span>}
            {count > 1 && <span className="fib-mbox-shelf-count">×{count}</span>}
        </button>
    );
}

export default MysteryBoxOpening;
