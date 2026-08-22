import React, { useEffect } from 'react';
import { COLORS, SPACE, Z, SURFACE_NOISE } from '../config/constants';
import { useActivity } from '../../../context/ActivityContext.jsx';
import { visibleInterval, pollMs } from '../../../config/power.js';

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

/**
 * How often the fallback re-reads the counter while it is on screen.
 *
 * This is the safety net, not the source of truth. The server now pushes a
 * `global_event_milestone` SSE event after every spin (see checkMilestoneTrigger
 * in the wheel backend), so the number moves within a frame of whoever last
 * spun. The 20s interval only covers a silent stream — a reconnecting SSE or a
 * server too busy to broadcast — the same reasons this meter ever polled.
 */
const REFRESH_MS = 20_000;

export function MilestoneMeter({ isMobile }) {
    const { globalEventStatus, eventSelection, refreshMilestone,
        communityGoalResult, communityGoalResultPending, firstBloodWinner,
        firstBloodResultPending, kotwWinner, kotwWinnerPending } = useActivity();

    // `eventSelection` counts as active. The roll happens in this same slot, and it
    // fires *before* the event itself flips to active — so without this the meter
    // and the roll would both be mounted for the four seconds of the selection,
    // stacked in a row that holds one thing at a time. It would also be reading
    // "0 spins to go", which is true and useless.
    const active = globalEventStatus?.active || globalEventStatus?.pending || !!eventSelection;

    // The event's aftermath counts as active too. Once an event ends, its result or
    // winner sits in this same slot for its display period - a fixed window in the
    // ActivityContext result handlers (12s community goal, 8s first blood, 30s
    // king of the wheel), fading out only after that. `global_event_end` clears
    // `active` the moment the event is over, so without this the meter would pop
    // in under a result banner that is still saying goodbye, reading "next global
    // event" while a 0:00-timer banner is on screen. Include the pending flags:
    // they are the moments between the end broadcast and the result landing, and
    // that gap is precisely when the old meter used to jump in.
    const aftermathVisible = !!communityGoalResult || communityGoalResultPending
        || !!firstBloodWinner || firstBloodResultPending
        || !!kotwWinner || kotwWinnerPending;
    const effectiveActive = active || aftermathVisible;
    const milestone = globalEventStatus?.milestone;

    // The number arrives pushed: `global_event_milestone` lands here after every
    // spin with the fresh count, and the layout below just renders it. Nothing
    // about the update loop lives in this component any more — the SSE handler in
    // ActivityContext writes into the same `globalEventStatus.milestone` the
    // status broadcasts write. All this effect does is keep asking, slowly, in
    // case the stream went quiet (reconnect gap, quiet-server stall) — and only
    // while the meter is actually visible; `document.hidden` covers the
    // backgrounded tab.
    useEffect(() => {
        if (effectiveActive) return undefined;

        // The `document.hidden` check this used to do inline is `visibleInterval`'s
        // whole job, and it does the better version: the timer is torn down while
        // hidden rather than firing into a branch that does nothing, and one
        // catch-up refresh runs on the way back so the meter is right before it
        // is looked at. `pollMs` stretches the period in saver mode — this is a
        // backstop for a quiet stream, and a backstop can afford to be slow.
        refreshMilestone();
        return visibleInterval(refreshMilestone, pollMs(REFRESH_MS));
    }, [effectiveActive, refreshMilestone]);

    // Nothing to say rather than a placeholder: an event is running and has its own
    // banner, or the server has not told us yet. A skeleton here would be chrome
    // standing in for a number that arrives in a few hundred milliseconds.
    if (effectiveActive || !milestone || typeof milestone.remaining !== 'number') return null;

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
                    // ── The phone's version is one line ──────────────────────
                    //
                    // At 84px this was the third-largest thing on a 800px phone,
                    // behind only the shaft and the payoff apron — four stacked
                    // rows (label, 22px number, caption, 7px bar) for a single
                    // figure that changes every few seconds and that nobody came
                    // here to read. It cost the reel two thirds of a row.
                    //
                    // Compacted to ~32px: the label folds into the sentence, the
                    // number keeps its instrument treatment because it is still
                    // the only datum, and the progress bar stops being a row of
                    // its own — it becomes the plinth's own lit floor edge,
                    // growing left to right. That is the Nocturne's own move
                    // rather than a smaller widget: the deck section is lit by
                    // how close the event is.
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: isMobile ? 'row' : 'column',
                    alignItems: isMobile ? 'baseline' : 'stretch',
                    gap: isMobile ? '6px' : '5px',
                    width: isMobile ? '100%' : '460px',
                    padding: isMobile ? '7px 16px 9px' : '10px 18px 12px',
                    // No radius, no ring: this is a detached section of the band's
                    // viaduct deck (the Nocturne), not a card sitting in the slot —
                    // square plinth, lit rail along the top, amber entering from
                    // the floor. Deliberately quieter than the event banners that
                    // share this slot — this is a status, and they are news. The
                    // grain is SURFACE_NOISE, the deck's own material.
                    backgroundImage: `${SURFACE_NOISE}, linear-gradient(180deg, #0d1322 0%, #0a0d18 100%)`,
                    boxShadow: [
                        'inset 0 1px 0 rgba(206,214,236,0.10)',
                        `inset 0 -1px 0 ${COLORS.gold}${imminent ? '55' : '2A'}`,
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
                    flexDirection: isMobile ? 'row' : 'column',
                    alignItems: isMobile ? 'baseline' : 'stretch',
                    gap: isMobile ? '6px' : '1px',
                    minWidth: 0,
                }}>
                    {/* The standalone label is desktop-only. On a phone it folds
                        into the sentence after the number — "283 spins to the next
                        event" says the same thing in one line, and an uppercase
                        eyebrow above a figure is exactly the row a 390px screen
                        cannot afford. */}
                    {!isMobile && (
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
                    )}

                    <div style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: isMobile ? '6px' : '7px',
                        flexWrap: isMobile ? 'nowrap' : 'wrap',
                        minWidth: 0,
                    }}>
                        <strong
                            key={remaining}
                            className="fib-meter-tick"
                            style={{
                                fontSize: isMobile ? '17px' : '26px',
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
                            fontSize: isMobile ? '11px' : '13px',
                            color: COLORS.textMuted,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>
                            {/* The phone's copy carries the label the eyebrow used
                                to. "server-wide" is the word that stops the figure
                                reading as a personal target — DESIGN.md §8 records
                                that as the whole character of the feature — so it
                                is the last thing that would be cut, not the first. */}
                            {isMobile ? 'spins to the next event, server-wide' : 'spins to go, server-wide'}
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
                    style={isMobile
                        // On a phone the track is not a row — it is the plinth's
                        // own floor edge, pinned across the bottom of the deck
                        // section and growing left to right. Costs nothing in
                        // height, and it is the more Nocturne answer: the deck is
                        // lit by how close the event is, rather than carrying a
                        // widget that reports it. Square, because it is an edge.
                        ? {
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            height: '3px',
                            borderRadius: 0,
                            background: 'rgba(206,214,236,0.08)',
                            overflow: 'hidden',
                        }
                        : {
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
