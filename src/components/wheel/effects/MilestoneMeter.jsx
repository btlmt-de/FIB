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
            <div
                // The full sentence lives here rather than on screen. The visible
                // copy has to carry "server-wide" in three words; the tooltip can
                // afford to explain the mechanism to whoever wonders.
                title={`Global events trigger on a server-wide spin count. Every player's spins count toward it — ${remaining.toLocaleString('en-US')} to go.`}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '7px',
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
                <div style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: `${SPACE.md}px`,
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

                    <span style={{
                        fontSize: isMobile ? '12px' : '13px',
                        color: COLORS.textMuted,
                        whiteSpace: 'nowrap',
                    }}>
                        <strong style={{
                            color: imminent ? COLORS.gold : COLORS.text,
                            fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                        }}>
                            {remaining.toLocaleString('en-US')}
                        </strong>
                        {' '}spins to go, server-wide
                    </span>
                </div>

                {/* The meter. A pill track with the fill scaled rather than widened:
                    this updates on a timer, and `width` would lay the row out again
                    every time — see the same call in the spin control's loading bar. */}
                <div
                    role="progressbar"
                    aria-valuenow={Math.round(progress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Progress to the next global event"
                    style={{
                        height: '4px',
                        borderRadius: '999px',
                        background: 'rgba(206,214,236,0.08)',
                        overflow: 'hidden',
                    }}
                >
                    <div style={{
                        height: '100%',
                        width: '100%',
                        transformOrigin: 'left center',
                        transform: `scaleX(${progress / 100})`,
                        borderRadius: '999px',
                        background: `linear-gradient(90deg, ${COLORS.gold}77, ${COLORS.gold})`,
                        boxShadow: `0 0 8px ${COLORS.gold}${imminent ? '99' : '55'}`,
                        // Long, because the value only moves every 20s and in jumps:
                        // a slow glide reads as a meter filling, where a snap reads
                        // as the number having been wrong a moment ago.
                        transition: 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }} />
                </div>
            </div>
        </div>
    );
}

export default MilestoneMeter;
