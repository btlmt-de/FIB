/*
 * ══════════════════════════════════════════════════════════════════════════
 * THE ARRIVAL — the theatre
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The event used to be two objects: a station in the reel band and a 440px card
 * of numbers stacked above it. The owner's note was that it "shifts the strip
 * down and shows the lucky spin distribution above… it would be better if the
 * whole scenery is one epic animation". This file is the answer to that. There
 * is one composition now, and everything that happens happens inside it.
 *
 * ── THE SEQUENCE ─────────────────────────────────────────────────────────────
 *
 *   The reel shutters closed, slot by slot, exactly where the reel is.
 *   The page goes dark around it — the house lights, before the curtain.
 *   The band OPENS: the same rectangle grows out into a wide frame over the
 *     column, and the train is already coming in as it does.
 *   Three shots: the arrival, the payout, the departure.
 *   The frame collapses back onto the band, the page comes back, the shutters
 *     roll up, and the reel is where it always was.
 *
 * ── WHAT ACTUALLY MOVES, AND WHAT ONLY LOOKS LIKE IT ─────────────────────────
 *
 * Nothing on the page moves. Not one pixel of layout changes for the whole
 * eighteen seconds — which was the complaint, and it is the constraint the rest
 * of this file is built around.
 *
 * The frame is a FIXED element, sitting at its final size from the first frame,
 * revealed through an animated `clip-path` that starts as the reel mount's own
 * rectangle. So "the band growing" is a clip opening, not a box resizing: no
 * reflow, no scrollbar, and — the reason that matters most here — no `setSize`
 * on a WebGL renderer sixty times a second for a second and a bit while a
 * locomotive is arriving. The scene renders at its final resolution throughout
 * and simply has more of itself shown.
 *
 * The veils are the other half of the same trick. They are two plain bars above
 * and below the frame rather than one scrim with a hole in it, because a hole in
 * a scrim is a `clip-path` with an even-odd fill that has to be rebuilt every
 * frame, and two heights are two numbers. While the frame is still the band,
 * they cover everything except the band — which is why the shutter closing is
 * the one part of this that is NOT dimmed. You watch your own wheel shut down at
 * full brightness, and the room goes dark around it.
 *
 * ── IT DOES NOT TAKE THE PAGE, ONLY THE PICTURE ──────────────────────────────
 *
 * `pointer-events: none` throughout, including the veils. The arrival owns the
 * screen visually for fifteen seconds and it fires about twice a day; blocking
 * chat, the nav and the collection book for that long because we are showing an
 * animation would be the site holding the player still. Spinning is already
 * refused for the duration in WheelSpinner, which is the one interaction that
 * genuinely cannot happen here, and it is refused there for its own reasons.
 *
 * ── AND WHY IT IS A PORTAL ───────────────────────────────────────────────────
 *
 * The reel mount is `overflow: hidden` and sits inside a grid cell with its own
 * stacking context. A frame that has to cover the column cannot be a child of a
 * box that clips at 170px. What stays behind in the mount is the shutter and a
 * probe div whose only job is to have the mount's rectangle, measured every
 * frame so a scroll, a resize or a topbar changing height moves the frame's
 * origin with it.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useActivity } from '../../../context/ActivityContext.jsx';
import { prefersReducedMotion } from '../../../utils/motion.js';
import { ArrivalShutter } from './ArrivalShutter.jsx';
import { ArrivalBoard } from './ArrivalBoard.jsx';
import { ArrivalMotes } from './ArrivalMotes.jsx';
import {
    T_SHUTTER, T_SCRIM, T_SCRIM_END, T_IRIS, T_IRIS_END, T_LIFT, SCENE_FADE_S,
    sortManifest,
} from './arrivalTimeline.js';

/*
 * three.js is fetched WHEN A TRAIN ARRIVES, not when the page loads.
 *
 * Statically imported it added 132KB gzipped to the wheel chunk — 140KB to
 * 272KB, very nearly doubling the heaviest route on a site PRODUCT.md describes
 * as "a phone beside a running game". Arrivals fire roughly twice a day, so
 * almost every visit was paying for a locomotive it would never see.
 *
 * The shutter is what buys the time: the reel spends 1.3 seconds closing before
 * the train is due, and the chunk is requested the instant this component mounts
 * — which is the same instant the arrival broadcast lands. On a slow connection
 * the platform simply stands empty a moment longer, which is a train running
 * late rather than a broken animation.
 */
const ArrivalTrain3D = React.lazy(() =>
    import('./ArrivalTrain3D.jsx').then(m => ({ default: m.ArrivalTrain3D }))
);

const clamp01 = t => Math.max(0, Math.min(1, t));
/*
 * The iris opens fast and settles; it closes on the mirror of that. Same pairing
 * as the shutter's blades and for the same reason — a curtain is PULLED open and
 * arrives slowing, and drops shut.
 */
const easeOpen = t => 1 - Math.pow(1 - t, 3.4);
const easeShut = t => t * t;

/**
 * The frame the whole event plays in, in viewport pixels.
 *
 * Centred on the band the player was already looking at rather than on the
 * viewport, and then clamped into it. The band is where their eye is; a frame
 * that opened around some other point would make them find it again.
 */
function cinemaRect(band) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const narrow = vw < 900;
    const inset = narrow ? 12 : 34;
    const h = Math.min(vh - inset * 2, Math.max(340, vh * (narrow ? 0.84 : 0.76)));
    const mid = band.top + band.height / 2;
    const top = Math.max(inset, Math.min(vh - h - inset, Math.round(mid - h / 2)));
    return { top, height: h, bottom: top + h, vh };
}

export function ArrivalTheatre() {
    const { arrival, arrivalCrate } = useActivity();

    const probeRef = useRef(null);
    const frameRef = useRef(null);
    const topVeilRef = useRef(null);
    const botVeilRef = useRef(null);
    /** Written by the scene each frame, read by the overlay and the board. */
    const emitRef = useRef(null);
    const rowElsRef = useRef([]);

    /*
     * One sort, three consumers: the board renders these rows, the scene gives
     * wagon `i` row `i`'s crate, and the overlay flies row `i`'s spins from that
     * wagon's crate to that row. They cannot disagree, because there is one
     * array.
     */
    const rows = useMemo(() => (arrival?.manifest ? sortManifest(arrival.manifest) : []), [arrival]);

    useEffect(() => {
        const probe = probeRef.current;
        const frame = frameRef.current;
        const topVeil = topVeilRef.current;
        const botVeil = botVeilRef.current;
        if (!probe || !frame || !topVeil || !botVeil) return undefined;

        const motionOff = prefersReducedMotion();
        const start = performance.now();
        let raf = 0;

        const paint = (t) => {
            /*
             * The band is re-measured every frame rather than captured on mount.
             * The page underneath is live for the whole event — the activity
             * ticker grows, the topbar can change height, and the player can
             * scroll, which they are welcome to do — and a frame anchored to a
             * rectangle that has moved is a frame that opens out of nowhere.
             */
            const band = probe.getBoundingClientRect();
            const cinema = cinemaRect(band);

            const iris = motionOff ? 1 : (
                t < T_LIFT
                    ? easeOpen(clamp01((t - T_IRIS) / (T_IRIS_END - T_IRIS)))
                    : 1 - easeShut(clamp01((t - T_LIFT) / SCENE_FADE_S))
            );

            const top = band.top + (cinema.top - band.top) * iris;
            const bottom = band.bottom + (cinema.bottom - band.bottom) * iris;

            /*
             * The frame IS the cinema rectangle, at full size, from the first
             * frame — written here rather than in the stylesheet because it is
             * derived from the band and the viewport together.
             *
             * That it is the final rectangle and not the visible one is the
             * whole design: the scene renders at the shape it will be seen at,
             * so the lens that frames the locomotive is solved once for a 2.5:1
             * picture instead of being re-solved every frame of the opening for
             * a rectangle that is on its way somewhere. Written every frame and
             * almost always to the same two values, so the ResizeObserver in the
             * renderer only fires when the page underneath actually moves.
             */
            frame.style.top = `${cinema.top}px`;
            frame.style.height = `${cinema.height}px`;

            /*
             * Clamped at zero because the clip is expressed relative to the
             * frame's own box: if the reel band ever sits ABOVE the frame — a
             * very short viewport, where the clamp in `cinemaRect` has pushed
             * the frame down past the band — a negative inset would stop
             * clipping altogether and the frame would simply appear. Clamped, it
             * degrades to opening from slightly too large, which is a softer
             * failure than a jump cut.
             */
            const clipTop = Math.max(0, top - cinema.top);
            const clipBot = Math.max(0, cinema.bottom - bottom);
            frame.style.clipPath = `inset(${clipTop}px 0 ${clipBot}px 0)`;

            topVeil.style.height = `${Math.max(0, top)}px`;
            botVeil.style.top = `${bottom}px`;

            const veil = motionOff ? 1 : (
                t < T_LIFT
                    ? clamp01((t - T_SCRIM) / (T_SCRIM_END - T_SCRIM))
                    : 1 - clamp01((t - T_LIFT) / SCENE_FADE_S)
            );
            topVeil.style.opacity = String(veil);
            botVeil.style.opacity = String(veil);

            /*
             * The frame's own fade at the end is on top of the scene's. The
             * station dims itself — lamps down, glows down, canvas out — and the
             * frame takes the board and the spin overlay with it a fraction
             * later, so the last thing on screen is the platform going dark
             * rather than a board hanging over nothing.
             */
            frame.style.opacity = motionOff ? '1' : String(
                t < T_LIFT ? 1 : 1 - clamp01((t - T_LIFT - 0.1) / (SCENE_FADE_S - 0.1))
            );
        };

        // One measured frame under reduced motion: the theatre open, the station
        // standing still inside it. The information never depends on the motion.
        if (motionOff) {
            paint(0);
            const ro = new ResizeObserver(() => paint(0));
            ro.observe(document.documentElement);
            return () => ro.disconnect();
        }

        const tick = (now) => {
            // Clamped at the source: a rAF timestamp can precede the
            // performance.now() captured just before it was scheduled.
            paint(Math.max(0, (now - start) / 1000));
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [arrival]);

    if (!arrival || rows.length === 0) return null;

    return (
        <>
            {/* Stays in the reel mount: the blades, and the rectangle the
                theatre opens out of. */}
            <div ref={probeRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <ArrivalShutter />
            </div>

            {createPortal(
                <div className="fib-arrival-theatre" aria-hidden="true">
                    <div ref={topVeilRef} className="fib-arrival-veil is-top" />
                    <div ref={botVeilRef} className="fib-arrival-veil is-bottom" />

                    <div ref={frameRef} className="fib-arrival-frame">
                        <React.Suspense fallback={null}>
                            <ArrivalTrain3D
                                crateCount={rows.length}
                                emitRef={emitRef}
                                style={{ animation: `fadeIn 0.5s ease-out ${T_SHUTTER * 0.75}s both` }}
                            />
                        </React.Suspense>

                        <ArrivalMotes
                            emitRef={emitRef}
                            rows={rows}
                            rowElsRef={rowElsRef}
                            frameRef={frameRef}
                        />

                        <ArrivalBoard
                            arrival={arrival}
                            arrivalCrate={arrivalCrate}
                            rows={rows}
                            emitRef={emitRef}
                            rowElsRef={rowElsRef}
                        />
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
