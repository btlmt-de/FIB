/*
 * ══════════════════════════════════════════════════════════════════════════
 * THE PARLOUR — the room
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The whole surface becomes the casino. Not a lit rectangle over a dimmed page
 * — THE ARRIVAL does that, correctly, because a train is somewhere else and you
 * are watching it. A parlour is the room you are already standing in, so the
 * room itself changes: the Nocturne's blue hour turns to crimson and brass, a
 * wheel comes into frame at the corner, the deck goes into the air, and the
 * light hangs there for as long as the table is open.
 *
 * ── THE ROOM WAS GREEN, AND IS NOW RED ───────────────────────────────────────
 *
 * The first build laid a green baize over the whole page. The reasoning was
 * sound as far as it went — the green pocket is the house — and it is kept
 * where it belongs: green is still the house pocket, still the 6x, still this
 * event's cell on the selection wheel. It was the wrong thing to make a ROOM
 * out of, and the fault is a lighting one rather than a taste one. Green over
 * the Nocturne's blue is two cool casts stacked; the surface went flat, the
 * reel's red pockets read brown through it, and the leaderboard lost its
 * separation from the ground. Crimson is the one ground on this site the blue
 * hour is genuinely opposite to, so the city stays visible through it.
 *
 * The full note is in rouletteTimeline.js beside the materials.
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
 * ── WHAT IS CSS HERE, AND WHAT IS NOT ────────────────────────────────────────
 *
 * The room is a gradient, a blur and a slow transform, which is what
 * compositors are for: the ground, the lamp, the shafts, the dust and the walls
 * cost a handful of GPU layers and no per-frame JavaScript at all.
 *
 * The two objects IN the room are canvases, and each states its own case in its
 * own header. `ParlourWheel` is a rigid body turning about its centre — as DOM
 * it would be forty elements re-rasterised at every angle, where as a canvas it
 * is one pre-rendered bitmap and a `rotate`. `ParlourDeck` is a field of
 * tumbling cards whose density is four different things at four different beats,
 * which is a particle system however it is spelled. The dust stays divs,
 * because "the air in here is warm and still" is still the one idea on this page
 * that does not need simulating.
 *
 * Everything in both canvases is a function of the server's clock, never
 * integrated frame to frame — the rule the whole event is built on, and the
 * timeline's header says why.
 */

import React, { memo, useEffect, useMemo, useState } from 'react';
import { prefersCalm } from '../../../config/power.js';
import { serverNow } from '../../../utils/serverClock.js';
import { useWheelViewport } from '../config/breakpoints.js';
import ParlourWheel from './ParlourWheel.jsx';
import ParlourDeck from './ParlourDeck.jsx';
import { BRASS, CRIMSON_LIT, T_TURN, T_FALL, T_END } from './rouletteTimeline.js';

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

function ParlourAtmosphere({ openedAt, pocketColour = null }) {
    const calm = prefersCalm();
    const { isPhone } = useWheelViewport();
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
            {/* The floor. A crimson ground pulled over the Nocturne's blue,
                darkest at the edges so the room has walls — and the nap of the
                carpet over it, which is only visible under the lamp. */}
            <div className="fib-parlour-floor" />
            <div className="fib-parlour-weave" />

            {/* The machine, three quarters of it off the corner. Behind the
                lamp, because the lamp is what lights it.

                Desktop only, and that is a decision rather than an omission.
                §8's shaft is a different machine: the reel runs vertically and
                fills the phone's viewport, so there is no corner left over —
                the wheel was drawn every frame behind an opaque canvas and a
                topbar, and what reached the player was a brass smear under the
                nav. Painting a machine nobody can see is cost with no picture,
                and lifting it in FRONT of the reel would put a second wheel
                over the one the player is reading, which is the thing §9b
                forbids outright.

                The phone's room is the crimson in the shaft's margins and the
                deck in the air in front of it — see ParlourDeck's portal. */}
            {!isPhone && <ParlourWheel openedAt={openedAt} />}

            {/* The lamp. Low, centred on the band, and the reason the middle of
                the page is the brightest thing in the room. */}
            <div
                className="fib-parlour-lamp"
                style={{ '--parlour-lamp': BRASS, '--parlour-crimson': CRIMSON_LIT }}
            />

            {/* Two slow shafts of light crossing the floor. They are what stops
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

            {/* The deck, in front of the light and behind the walls — so a card
                falling through the corner of the room falls into shadow rather
                than staying lit all the way down.

                Desktop only here. On the shaft the deck is mounted inside the
                reel's band instead, because the phone has no margins for it to
                fall through; ParlourDeck's own footer explains the rule that
                decides which. */}
            {!isPhone && (
                <ParlourDeck openedAt={openedAt} pocketColour={pocketColour} isMobile={false} />
            )}

            {/* The vignette closes the room. Last, so it darkens everything
                above including the lamp's own spill. */}
            <div className="fib-parlour-walls" />
        </div>
    );
}

export default memo(ParlourAtmosphere);
