/** A smooth burgundy room underneath the live interface. */
import React, { memo, useEffect, useState } from 'react';
import { serverNow } from '../../../utils/serverClock.js';
import { useWheelViewport } from '../config/breakpoints.js';
import ParlourWheel from './ParlourWheel.jsx';
import ParlourDeck from './ParlourDeck.jsx';
import { T_TURN, T_FALL, T_END } from './rouletteTimeline.js';

function ParlourAtmosphere({ openedAt, pocketColour = null }) {
    const { isPhone } = useWheelViewport();
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
        <div className="fib-parlour-air" aria-hidden="true" style={{
            opacity: lit ? 1 : 0,
            transitionDuration: `${lit ? T_TURN : T_END - T_FALL}s`,
        }}>
            <div className="fib-parlour-floor" />
            {!isPhone && <ParlourWheel openedAt={openedAt} />}
            {!isPhone && <ParlourDeck openedAt={openedAt} pocketColour={pocketColour} />}
            <div className="fib-parlour-walls" />
        </div>
    );
}

export default memo(ParlourAtmosphere);
