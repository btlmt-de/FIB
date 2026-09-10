/** A smooth burgundy room underneath the live interface. */
import React, { memo, useEffect, useRef, useState } from 'react';
import { prefersCalm } from '../../../config/power.js';
import { serverNow } from '../../../utils/serverClock.js';
import { useWheelViewport } from '../config/breakpoints.js';
import ParlourWheel from './ParlourWheel.jsx';
import ParlourDeck from './ParlourDeck.jsx';
import { T_TURN, T_REVEAL, T_FALL, T_END, roomHush } from './rouletteTimeline.js';

function ParlourAtmosphere({ openedAt, pocketColour = null }) {
    const { isPhone } = useWheelViewport();
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
