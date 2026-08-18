import React, { useEffect } from 'react';
import { COLORS, SPACE, Z } from '../config/constants';
import { useActivity } from '../../../context/ActivityContext.jsx';

/**
 * How close the server is to its next global event.
 *
 * Fills the banner slot between the ticker and the reel, which is empty whenever
 * no event is running — which is most of the time. The four event banners live in
 * the same slot and take it over when they fire; this is what that space says the
 * rest of the time.
 *
 * **It counts spins, not seconds, and that is not a compromise.** Events trigger on
 * `nextEventTriggerSpin`, a server-wide spin counter with a random 300–600 interval
 * (`globalEvents.js`). There is no scheduled time to count down to, so a clock here
 * would have to estimate a spin rate — a number that is wrong whenever the server is
 * quiet or busy, and precisely the kind of figure PRODUCT.md's "counted, never
 * asserted" rule exists to keep off this site. Spins are the real unit.
 *
 * It also turns out to be the better design. A clock runs down on its own and asks
 * nothing of anybody; a spin counter moves when someone spins, so the meter is a
 * live readout of the thing the page is for, and your own spin visibly moves it.
 *
 * The count is server-wide, and the copy says so. "159 spins to go" on its own
 * reads as a personal target — the difference between "I have to do this" and
 * "everyone here is doing this together" is the whole character of the feature.
 */

/** How often to re-read the counter while it is on screen. */
const REFRESH_MS = 20_000;

export function MilestoneMeter({ isMobile }) {
    const { globalEventStatus, eventSelection, refreshMilestone } = useActivity();

    // `eventSelection` counts as active. The roll happens in this same slot, and it
    // fires *before* the event itself flips to active — so without this the meter
    // and the roll would both be mounted for the four seconds of the selection,
    // stacked in a row that holds one thing at a time. It would also be reading
    // "0 spins to go", which is true and useless.
    const active = globalEventStatus?.active || globalEventStatus?.pending || !!eventSelection;
    const milestone = globalEventStatus?.milestone;

    // Polled rather than pushed, and only while it is actually visible: the server
    // does not broadcast the milestone between events, and a meter nobody is
    // looking at should not be asking. `document.hidden` covers the backgrounded
    // tab; the early return below covers a live event, when the banners own this
    // slot and this component renders nothing.
    useEffect(() => {
        if (active) return undefined;

        refreshMilestone();
        const id = setInterval(() => {
            if (!document.hidden) refreshMilestone();
        }, REFRESH_MS);
        return () => clearInterval(id);
    }, [active, refreshMilestone]);

    // Nothing to say rather than a placeholder: an event is running and has its own
    // banner, or the server has not told us yet. A skeleton here would be chrome
    // standing in for a number that arrives in a few hundred milliseconds.
    if (active || !milestone || typeof milestone.remaining !== 'number') return null;

    const remaining = Math.max(0, milestone.remaining);
    const progress = Math.min(100, Math.max(0, milestone.progress || 0));

    // The last stretch runs hotter. This is anticipation the data actually supports
    // — it *is* closer — rather than a flourish bolted on a timer, and it is the one
    // moment this component is allowed to raise its voice.
    const imminent = remaining <= 25;

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            paddingBottom: `${SPACE.sm}px`,
            zIndex: Z.content,
        }}>
            {/*
             * The two keyframes are defined here, in the component, because the
             * wheel's effects each own their animation vocabulary — see the
             * countdownPulse* keyframes in the event banners. Both are frozen by
             * the media query below, matching the surface's rule: light and
             * motion may breathe, geometry and data may not.
             *
             * `fibMeterTick` is the number's "something just moved" pop. It runs
             * exactly once per update because the <strong> remounts on
             * `key={remaining}` — a 20s poll snap turns into a visible tick
             * without inventing any data in between.
             *
             * `fibMeterBreath` is the imminent fill's glow. The static 8px
             * shadow that the rest of the time says "status" gives way to a
             * slow swell — the one moment this component is allowed to raise
             * its voice, and it spends it on light, never on layout.
             */}
            <style>{`
                @keyframes fibMeterTick {
                    0% { transform: scale(1); }
                    40% { transform: scale(1.06); }
                    100% { transform: scale(1); }
                }
                @keyframes fibMeterBreath {
                    0%, 100% { box-shadow: 0 0 6px ${COLORS.gold}55; }
                    50% { box-shadow: 0 0 16px ${COLORS.gold}AA; }
                }
                .fib-meter-tick { animation: fibMeterTick 220ms ease-out; }
                .fib-meter-breath { animation: fibMeterBreath 1.8s ease-in-out infinite; }
                @media (prefers-reduced-motion: reduce) {
                    .fib-meter-tick, .fib-meter-breath { animation: none; }
                }
            `}</style>
            <div
                // The full sentence lives here rather than on screen. The visible
                // copy has to carry "server-wide" in three words; the tooltip can
                // afford to explain the mechanism to whoever wonders.
                title={`Global events trigger on a server-wide spin count. Every player's spins count toward it — ${remaining.toLocaleString('en-US')} to go.`}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    width: isMobile ? 'min(340px, 92vw)' : '460px',
                    padding: isMobile ? '9px 14px 11px' : '10px 18px 12px',
                    borderRadius: '10px',
                    // The band's material at a smaller size: a near-black plinth, a
                    // lit hairline along the top, and the accent entering from the
                    // floor. Deliberately quieter than the event banners that share
                    // this slot — this is a status, and they are news.
                    background: 'linear-gradient(180deg, #1b1b26 0%, #131320 100%)',
                    boxShadow: [
                        'inset 0 1px 0 rgba(206,214,236,0.10)',
                        `inset 0 -1px 0 ${COLORS.gold}${imminent ? '55' : '2A'}`,
                        'inset 0 0 0 1px rgba(206,214,236,0.05)',
                    ].join(', '),
                }}
            >
                {/*
                 * The number is the product, the label is the margin note. It
                 * used to be the other way around — 11px bold caps against 13px
                 * regular — so the only datum that ever changes was the quietest
                 * thing on the card. Now the count reads as an instrument
                 * readout and the prose around it recedes.
                 */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1px',
                }}>
                    <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.09em',
                        textTransform: 'uppercase',
                        color: imminent ? COLORS.gold : COLORS.textMuted,
                        whiteSpace: 'nowrap',
                    }}>
                        Next global event
                    </span>

                    <div style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '7px',
                        flexWrap: 'wrap',
                    }}>
                        <strong
                            key={remaining}
                            className="fib-meter-tick"
                            style={{
                                fontSize: isMobile ? '22px' : '26px',
                                fontWeight: 800,
                                lineHeight: 1.1,
                                fontVariantNumeric: 'tabular-nums',
                                color: imminent ? COLORS.gold : COLORS.text,
                                textShadow: imminent ? `0 0 14px ${COLORS.gold}44` : 'none',
                            }}
                        >
                            {remaining.toLocaleString('en-US')}
                        </strong>
                        <span style={{
                            fontSize: isMobile ? '12px' : '13px',
                            color: COLORS.textMuted,
                            whiteSpace: 'nowrap',
                        }}>
                            spins to go, server-wide
                        </span>
                    </div>
                </div>

                {/*
                 * The meter. A pill track with the fill scaled rather than widened:
                 * this updates on a timer, and `width` would lay the row out again
                 * every time — see the same call in the spin control's loading bar.
                 * 7px rather than the 4px it used to be: the fill's glide is the
                 * only motion on the card, and at 4px on a 460px track it was
                 * invisible from the couch.
                 */}
                <div
                    role="progressbar"
                    aria-valuenow={Math.round(progress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Progress to the next global event"
                    style={{
                        height: '7px',
                        marginTop: '4px',
                        borderRadius: '999px',
                        background: 'rgba(206,214,236,0.08)',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        className={imminent ? 'fib-meter-breath' : undefined}
                        style={{
                            height: '100%',
                            width: '100%',
                            transformOrigin: 'left center',
                            transform: `scaleX(${progress / 100})`,
                            borderRadius: '999px',
                            background: `linear-gradient(90deg, ${COLORS.gold}77, ${COLORS.gold})`,
                            boxShadow: `0 0 8px ${COLORS.gold}${imminent ? '99' : '55'}`,
                            // Long, because the value only moves every 20s and in
                            // jumps: a slow glide reads as a meter filling, where a
                            // snap reads as the number having been wrong a moment ago.
                            transition: 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1)',
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

export default MilestoneMeter;
