/*
 * ══════════════════════════════════════════════════════════════════════════
 * THE PARLOUR — the room
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The whole surface becomes the casino. Not a lit rectangle over a dimmed page
 * — THE ARRIVAL does that, correctly, because a train is somewhere else and you
 * are watching it. A parlour is the room you are already standing in, so the
 * room itself changes: the Nocturne's blue hour warms to felt and brass, a lamp
 * comes down over the reel, and the light hangs there for as long as the table
 * is open.
 *
 * ── IT DOES NOT TAKE THE PAGE ────────────────────────────────────────────────
 *
 * `pointer-events: none` throughout, and it sits UNDER the interface rather than
 * over it: chat, the nav, the collection book and the leaderboards are all still
 * live and still readable for the whole forty-five seconds. The only thing this
 * event asks of the player is one tap on a colour, and asking for that by
 * holding the rest of the site hostage would be a bad trade — especially at
 * three quarters of a minute, four times the length of an arrival.
 *
 * ── WHY IT IS CSS AND NOT A CANVAS ───────────────────────────────────────────
 *
 * Everything here is a gradient, a blur and a slow transform, which is what
 * compositors are for: the whole atmosphere costs a handful of GPU layers and no
 * per-frame JavaScript at all. The one canvas on this surface during the event
 * is the ring in the reel band, where the pixels actually carry information.
 * RecursionOverlay reached the same conclusion for its matrix rain and its
 * comment says so — CSS animations are GPU-accelerated and much faster than
 * canvas fillText.
 *
 * ── AND WHY THE MOTES ARE NOT PARTICLES ──────────────────────────────────────
 *
 * The drifting dust is twelve absolutely-positioned divs on keyframes, seeded
 * once. A particle system would need a frame loop to say the same thing, and the
 * thing it says is "the air in here is warm and still" — which is the one visual
 * idea on this page that genuinely does not need to be simulated.
 */

import React, { memo, useEffect, useMemo, useState } from 'react';
import { prefersCalm } from '../../../config/power.js';
import { serverNow } from '../../../utils/serverClock.js';
import { PARLOUR_GREEN, BRASS, T_TURN, T_FALL, T_END } from './rouletteTimeline.js';

/**
 * Stable dust. Seeded from the index rather than from `Math.random()` at render,
 * so a re-render (the countdown ticks four times a second) does not teleport
 * every mote — which it did, and read as flicker rather than as air.
 */
const MOTES = Array.from({ length: 12 }, (_, i) => {
    const r = (n) => { const s = Math.sin((i + 1) * n) * 43758.5453; return s - Math.floor(s); };
    return {
        left: `${r(12.9898) * 100}%`,
        top: `${20 + r(78.233) * 70}%`,
        size: 2 + r(39.425) * 3,
        delay: r(93.989) * 9,
        duration: 11 + r(27.135) * 9,
        drift: -30 + r(58.712) * 60,
    };
});

function ParlourAtmosphere({ openedAt }) {
    const calm = prefersCalm();
    const motes = useMemo(() => (calm ? [] : MOTES), [calm]);

    /*
     * Two timers and a CSS transition. The room has exactly two beats — it warms
     * when the slots turn over and cools when they turn back — so this is two
     * `setTimeout`s and one transition, and the browser interpolates between
     * them for free.
     *
     * ── WHY NOT requestAnimationFrame, WHICH THIS FILE TRIED TWICE ───────────
     *
     * The first version flipped `lit` inside a `requestAnimationFrame`, on the
     * usual reasoning that a transition needs the two values in separate paints.
     * The second abandoned state entirely for a keyframe animation seeked by a
     * negative `animation-delay`. Both looked correct and neither ever lit the
     * room, and the reason turned out to be the same one: **rAF callbacks do not
     * fire, and CSS animations do not advance, in a hidden tab.** A state change
     * gated behind either one simply never happens until something forces a
     * frame.
     *
     * `setTimeout` keeps firing when the tab is hidden (throttled, which does not
     * matter for two beats a minute apart). So the state is always correct, and
     * the only thing lost while nobody is looking is the interpolation between
     * the two values — which is exactly the right thing to lose.
     *
     * The canvases in this feature are still rAF-driven and that is fine: they
     * paint pixels, and a hidden tab has no pixels to paint. This is state.
     */
    const [lit, setLit] = useState(false);
    useEffect(() => {
        if (!openedAt) return undefined;

        // Measured from the server's origin, so a page loaded mid-event opens
        // already lit rather than replaying the warm-up from the top.
        const elapsed = (serverNow() - openedAt) / 1000;
        if (elapsed >= T_FALL) return undefined;

        const warm = setTimeout(() => setLit(true), 16);
        const cool = setTimeout(() => setLit(false), Math.max(0, (T_FALL - elapsed) * 1000));
        return () => { clearTimeout(warm); clearTimeout(cool); };
    }, [openedAt]);

    return (
        <div
            className="fib-parlour-air"
            aria-hidden="true"
            style={{
                opacity: lit ? 1 : 0,
                transitionDuration: `${lit ? T_TURN : T_END - T_FALL}s`,
            }}
        >
            {/* The felt. A warm green ground pulled over the Nocturne's blue,
                darkest at the edges so the room has walls — and the nap of the
                cloth over it, which is only visible under the lamp. */}
            <div className="fib-parlour-felt" />
            <div className="fib-parlour-weave" />

            {/* The lamp. Low, centred on the band, and the reason the middle of
                the page is the brightest thing in the room. */}
            <div
                className="fib-parlour-lamp"
                style={{ '--parlour-lamp': BRASS, '--parlour-green': PARLOUR_GREEN }}
            />

            {/* Two slow shafts of light crossing the felt. They are what stops
                the ground from reading as a flat colour, and they move slowly
                enough that you notice the room is lit rather than the animation. */}
            {!calm && (
                <>
                    <div className="fib-parlour-shaft is-a" />
                    <div className="fib-parlour-shaft is-b" />
                </>
            )}

            {motes.map((m, i) => (
                <span
                    key={i}
                    className="fib-parlour-mote"
                    style={{
                        left: m.left,
                        top: m.top,
                        width: m.size,
                        height: m.size,
                        animationDelay: `${m.delay}s`,
                        animationDuration: `${m.duration}s`,
                        '--drift': `${m.drift}px`,
                    }}
                />
            ))}

            {/* The vignette closes the room. Last, so it darkens everything
                above including the lamp's own spill. */}
            <div className="fib-parlour-walls" />
        </div>
    );
}

export default memo(ParlourAtmosphere);
