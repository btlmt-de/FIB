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
import { ArrivalTrain3D } from './arrivalScene.js';
import { useSound } from '../../../context/SoundContext.jsx';
import { prefersReducedMotion } from '../../../utils/motion.js';
import { ArrivalShutter } from './ArrivalShutter.jsx';
import { ArrivalBoard } from './ArrivalBoard.jsx';
import { ArrivalMotes } from './ArrivalMotes.jsx';
import {
    T_SHUTTER, T_SCRIM, T_SCRIM_END, T_IRIS, T_IRIS_END, T_LIFT, SCENE_FADE_S,
    MAX_CRATES, crateCueAt,
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
// The lazy component lives in arrivalScene.js, beside the prefetch the
// selection wheel calls — one file names the chunk, so both name the same one.
// See the note there.

/**
 * The train, and only the train, is allowed to fail.
 *
 * Suspense covers the chunk being SLOW; it does nothing whatever about the
 * chunk not arriving. A rejected `import()` — the deploy that replaced the
 * hashed file under a tab that had been open since the last one, or the phone
 * that left the tunnel with the request half-served — throws during render, and
 * with no boundary anywhere above it that unmounts the entire wheel to a white
 * page. Trading a locomotive for the site is a bad trade at any odds.
 *
 * So the scene is fenced off on its own. Losing it leaves the shutter, the
 * motes, the veils and — the part that actually matters — ArrivalBoard, which
 * is where the manifest and the payout are. The event degrades to a lit, empty
 * platform, which is a train that did not turn up rather than a broken site.
 *
 * `null` and not a placeholder: the frame is a scene or it is nothing, and a
 * spinner sitting where a train should be reads as still loading, forever.
 */
class TrainBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { failed: false };
    }

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error) {
        console.error('[Arrival] Train scene failed to load; showing the platform without it.', error);
    }

    render() {
        return this.state.failed ? null : this.props.children;
    }
}

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
    const { startArrivalSoundtrack, stopArrivalSoundtrack, playArrivalCrate, stopArrivalCrates } = useSound();

    /*
     * ── ONE CLOCK FOR THE WHOLE EVENT ────────────────────────────────────────
     *
     * Established in render, before any effect and long before the scene's
     * chunk resolves, and then shared by everything that has to agree: the
     * shutter, the crate cue sheet, and the 3D scene itself.
     *
     * ── THE BUG THIS FIXES, WHICH WAS NEVER THE SOUND ────────────────────────
     *
     * `ArrivalTrain3D` is a 551KB lazy chunk requested on mount, and it used to
     * start its own `performance.now()` when it finally mounted — which is when
     * the CHUNK arrived, not when the event did. On the first arrival of a
     * session that is a fetch and a parse later, so the train, and every crate
     * with it, ran that far behind a shutter and a cue sheet that were both on
     * time. On the second arrival the chunk is cached, the offset is nil, and
     * everything lines up — which is why this read as a sound problem and
     * survived two passes at the sound.
     *
     * The header above already describes a slow chunk as "a train running late
     * rather than a broken animation". That is true of the picture on its own;
     * it stops being true the moment anything else in the event is on time.
     *
     * With one epoch, a chunk that lands at t=1.5 renders the frame for t=1.5 —
     * the train is already on its way in rather than starting its approach a
     * second and a half after the platform lit. Every one-shot in the scene is
     * written `if (!fired && t >= X)`, so they catch up rather than misfire.
     *
     * Adjusted during render rather than in an effect, which is the pattern
     * React documents for a value derived from a prop — and effects run in
     * order, so an epoch established in one would already be younger than
     * whatever ran above it. `FlapText` resets its cascade the same way.
     */
    const epochRef = useRef({ event: null, at: 0 });
    if (epochRef.current.event !== arrival) {
        epochRef.current = { event: arrival, at: performance.now() };
    }
    const epoch = epochRef.current.at;

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

    /*
     * ── THE SOUND ────────────────────────────────────────────────────────────
     *
     * Read through refs, and the effect below depends on `arrival` alone.
     *
     * `useSound`'s callbacks are rebuilt whenever any setting changes, and a
     * volume slider moved during an arrival would otherwise re-run this effect:
     * the cleanup stops the take and the body starts it again from zero, which
     * is a train that restarts because somebody turned it down.
     *
     * Seeded at construction and refreshed in a bare effect after every render
     * — not assigned in the render body, which is a write during render — so
     * the mount's own call already has the callbacks and a timer that fires ten
     * seconds later still reaches the current ones. Same device, and the same
     * ordering constraint, as `playSfxRef` in WheelSpinner.
     */
    const soundRef = useRef({ startArrivalSoundtrack, stopArrivalSoundtrack, playArrivalCrate, stopArrivalCrates });
    useEffect(() => {
        soundRef.current = { startArrivalSoundtrack, stopArrivalSoundtrack, playArrivalCrate, stopArrivalCrates };
    });

    /*
     * The bed, and the crates coming down on top of it.
     *
     * ── WHY THE CRATES ARE ON TIMERS AND NOT ON THE SCENE ────────────────────
     *
     * The obvious place is ArrivalTrain3D: it already has a one-shot `landed`
     * flag per crate, fired on the frame the box touches the paving. But the
     * scene is a lazy chunk behind an error boundary that is explicitly allowed
     * to fail, and it renders in an effect that knows nothing about React
     * context. Hanging the audio off it means a slow chunk delays the sound and
     * a failed one deletes it, and the board — which is the part that survives
     * a failed train — would pay out in silence.
     *
     * So they read the timeline instead, which is the same clock the scene's
     * arcs are drawn from: `crateCueAt(i, n)` whatever is or is not on screen.
     * Two clocks reading one table cannot drift — the note at the top of
     * arrivalTimeline.js, applied to the fifth consumer of it.
     *
     * `crateCueAt` and NOT the landing beat. The takes are the whole arc, hit
     * included, so they start as the crate is released; see the note on
     * `CRATE_IMPACT_OFFSET_S`. Cueing them on the landing put every impact six
     * tenths of a second behind its own crate.
     *
     * `n` is the PLAYER count and the loop stops at `MAX_CRATES`, matching the
     * scene exactly: the cadence is per player, the consist is capped, and rows
     * past the cap have no crate to make a noise.
     */
    useEffect(() => {
        if (!arrival || rows.length === 0) return undefined;

        /*
         * The bed, against the event's own epoch.
         *
         * Handed over as a FUNCTION rather than started at zero, because the
         * first arrival of a session has to fetch the file before it can play a
         * note of it. Read at call time that is 0.0 and the take begins three
         * quarters of a second after the shutter; read when the audio is
         * actually ready, it is 0.75 and the take joins the picture where the
         * picture is. `joinTake` in SoundContext owns the mechanism.
         *
         * `performance.now()` and not `serverNow()`: an arrival is a portal that
         * opens when you are shown it, so the picture is the authority. THE
         * PARLOUR is the opposite case and uses the server clock for exactly
         * that reason.
         */
        soundRef.current?.startArrivalSoundtrack?.(
            () => (performance.now() - epoch) / 1000,
        );

        /*
         * Under reduced motion every crate is already down on the first frame,
         * so a stagger has nothing to be staggered against and the four takes
         * would arrive as one chord. The bed stays — it is the event's voice and
         * a motion preference is not a sound preference — and the impacts go.
         */
        /*
         * ── THE CUE SHEET IS HANDED OVER, NOT SLEPT ON ───────────────────────
         *
         * Every impact is offered to the sound layer at once, each carrying how
         * far from now it belongs. Given decoded samples that becomes four
         * `start(currentTime + t)` calls on the audio thread, which keeps them
         * whatever the main thread is doing — and what the main thread is doing
         * during these two seconds is starting a 3D scene, which is exactly why
         * the impacts used to be late on the first arrival of a session.
         *
         * A timer is now the FALLBACK rather than the mechanism, taken only for
         * the cues the sound layer refused: no Web Audio, a context still
         * waiting on a gesture, or a decode that has not finished. That is the
         * same shape as before, so nothing gets worse where the samples are
         * unavailable — it just stops being the normal path.
         */
        const timers = [];
        if (!prefersReducedMotion()) {
            // Against the epoch rather than against "now". They are the same
            // instant to within a frame today, and would silently stop being so
            // the moment anything is added above this effect.
            const since = () => (performance.now() - epoch) / 1000;
            for (let i = 0; i < Math.min(rows.length, MAX_CRATES); i++) {
                const at = Math.max(0, crateCueAt(i, rows.length) - since());
                const scheduled = soundRef.current?.playArrivalCrate?.(i, at);
                if (!scheduled) {
                    timers.push(setTimeout(
                        () => soundRef.current?.playArrivalCrate?.(i),
                        at * 1000,
                    ));
                }
            }
        }

        return () => {
            timers.forEach(clearTimeout);
            // The audio thread holds any impact that has not sounded yet, and a
            // theatre that closes early has to take those back — a cleared timer
            // no longer covers them.
            soundRef.current?.stopArrivalCrates?.();
            soundRef.current?.stopArrivalSoundtrack?.();
        };
    }, [arrival, rows.length, epoch]);

    useEffect(() => {
        const probe = probeRef.current;
        const frame = frameRef.current;
        const topVeil = topVeilRef.current;
        const botVeil = botVeilRef.current;
        if (!probe || !frame || !topVeil || !botVeil) return undefined;

        const motionOff = prefersReducedMotion();
        // The event's clock, not this effect's. See `epoch`.
        const start = epoch;
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
    }, [arrival, epoch]);

    if (!arrival || rows.length === 0) return null;

    return (
        <>
            {/* Stays in the reel mount: the blades, and the rectangle the
                theatre opens out of. */}
            <div ref={probeRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <ArrivalShutter />
            </div>

            {createPortal(
                /*
                 * NOT aria-hidden. It was, once, and that silenced the whole
                 * event for anyone using a screen reader: ArrivalBoard carries
                 * the role="status" live region that announces the payout, and
                 * an aria-hidden ancestor removes a live region from the
                 * accessibility tree no matter what the descendant declares.
                 * The decorative layers each hide themselves instead — the
                 * shutter, the motes and the 3D scene all set their own
                 * aria-hidden, and the veils below do the same — which leaves
                 * the board as the one thing here that is meant to be heard.
                 */
                <div className="fib-arrival-theatre">
                    <div ref={topVeilRef} className="fib-arrival-veil is-top" aria-hidden="true" />
                    <div ref={botVeilRef} className="fib-arrival-veil is-bottom" aria-hidden="true" />

                    <div ref={frameRef} className="fib-arrival-frame">
                        <TrainBoundary>
                            <React.Suspense fallback={null}>
                                <ArrivalTrain3D
                                    crateCount={rows.length}
                                    epoch={epoch}
                                    emitRef={emitRef}
                                    style={{ animation: `fadeIn 0.5s ease-out ${T_SHUTTER * 0.75}s both` }}
                                />
                            </React.Suspense>
                        </TrainBoundary>

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
