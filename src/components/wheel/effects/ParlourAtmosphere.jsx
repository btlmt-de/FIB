/** A smooth burgundy room underneath the live interface. */
import React, { memo, useEffect, useRef, useState } from 'react';
import { prefersCalm } from '../../../config/power.js';
import { serverNow } from '../../../utils/serverClock.js';
import { useSound } from '../../../context/SoundContext.jsx';
import { useWheelViewport } from '../config/breakpoints.js';
import ParlourWheel from './ParlourWheel.jsx';
import ParlourDeck from './ParlourDeck.jsx';
import { T_TURN, T_REVEAL, T_FALL, T_END, roomHush } from './rouletteTimeline.js';

function ParlourAtmosphere({ openedAt, pocketColour = null }) {
    const { isPhone } = useWheelViewport();
    const { startParlourSoundtrack, stopParlourSoundtrack } = useSound();
    const [lit, setLit] = useState(false);
    const dimRef = useRef(null);
    const washRef = useRef(null);
    useEffect(() => {
        if (!openedAt || prefersCalm()) return undefined;
        let raf;
        const paint = () => {
            const t = (serverNow() - openedAt) / 1000;
            if (dimRef.current) dimRef.current.style.opacity = String(0.24 * roomHush(t));
            const age = t - T_REVEAL;
            const wash = pocketColour && age >= 0 && t < T_FALL
                ? 0.30 * (1 - Math.exp(-age * 4)) * Math.exp(-age * 0.55) : 0;
            if (washRef.current) washRef.current.style.opacity = String(wash);
            if (t < T_END) raf = requestAnimationFrame(paint);
        };
        paint();
        return () => cancelAnimationFrame(raf);
    }, [openedAt, pocketColour]);
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

    /*
     * The room's voice.
     *
     * ── WHY IT HANGS OFF THE ROOM AND NOT OFF THE TABLE ──────────────────────
     *
     * `RouletteTable` is the obvious home — it owns the beats the take is cut
     * against and it already calls `playSfx`. It is the wrong one for the same
     * reason this component exists at all: the bed is scored to the EVENT, and
     * the event is the whole surface warming for half a minute, not the panel
     * under the reel. This component is mounted by WheelPage for exactly the
     * table's lifetime, keyed on `openedAt`, and is the one piece of THE
     * PARLOUR that is neither behind a viewport check nor inside the band — the
     * wheel and the deck below are both `!isPhone`, and a phone should still
     * hear the room.
     *
     * ── AND WHY IT SEEKS ─────────────────────────────────────────────────────
     *
     * The same `(serverNow() - openedAt) / 1000` the light two effects up is
     * measured with, handed to the bed. A player who loads the page at the
     * call gets a room that is already lit and a take that is already at the
     * call; starting at zero would put the deal under the reveal and make the
     * one honest clock on this event disagree with itself.
     *
     * `prefersCalm()` is deliberately NOT consulted. It gates the rAF loops
     * above because those are motion; a reduced-motion preference is not a
     * sound preference, and `parlourSoundtrackEnabled` is where a player says
     * they do not want this. Same call as THE ARRIVAL's bed.
     *
     * The callbacks are read through a ref and the effect depends on
     * `openedAt` alone — `useSound`'s callbacks are rebuilt whenever any
     * setting changes, so a volume slider moved mid-event would otherwise run
     * the cleanup and start the take again from the top. That is the note in
     * ArrivalTheatre.jsx, applied to the same hazard here.
     */
    const soundRef = useRef({ startParlourSoundtrack, stopParlourSoundtrack });
    useEffect(() => {
        soundRef.current = { startParlourSoundtrack, stopParlourSoundtrack };
    });
    useEffect(() => {
        if (!openedAt) return undefined;

        const elapsed = (serverNow() - openedAt) / 1000;
        // A table this far gone has no room left to score. Nothing else in the
        // component bothers guarding past T_END because a finished animation is
        // a still frame, but a bed started here would be audible.
        if (elapsed >= T_END) return undefined;

        // The clock, not a reading of it. `elapsed` above is measured before the
        // file has even been asked for, so on a cold first play it is stale by
        // exactly the fetch it was meant to survive; the function is evaluated
        // on the far side of that. See `joinTake` in SoundContext.
        soundRef.current?.startParlourSoundtrack?.(
            () => Math.max(0, (serverNow() - openedAt) / 1000),
        );
        return () => soundRef.current?.stopParlourSoundtrack?.();
    }, [openedAt]);

    return (
        <div className="fib-parlour-air" aria-hidden="true" style={{
            opacity: lit ? 1 : 0,
            transitionDuration: `${lit ? T_TURN : T_END - T_FALL}s`,
        }}>
            <div className="fib-parlour-floor" />
            {!isPhone && <ParlourWheel openedAt={openedAt} />}
            {!isPhone && <ParlourDeck openedAt={openedAt} pocketColour={pocketColour} />}
            <div className="fib-parlour-walls" />
            <div ref={dimRef} style={{ position: 'absolute', inset: 0, background: '#080308', opacity: 0 }} />
            <div ref={washRef} style={{
                position: 'absolute', inset: 0, opacity: 0,
                background: `radial-gradient(ellipse at 50% 42%, ${pocketColour === 'green' ? '#299761' : pocketColour === 'red' ? '#B53640' : '#9B8771'} 0%, transparent 72%)`,
            }} />
        </div>
    );
}

export default memo(ParlourAtmosphere);
