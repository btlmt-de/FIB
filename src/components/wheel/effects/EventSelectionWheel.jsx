// ============================================
// EventSelectionWheel.jsx
// ============================================
//
// Which global event the milestone just picked, rolled in the banner slot.
//
// This was a full-screen takeover: `position: fixed`, a 90%-black scrim over the
// entire page at z-index 10000, a 28px title, a 400x120 strip and a bounce-in
// result panel. It is now a strip inside the row between the ticker and the reel —
// the same row the milestone meter counts down in, and the same row the event
// banner appears in a moment later.
//
// Three reasons it moved.
//
// It reads as one mechanism now. The meter fills, the roll happens in the same
// place, and the winning event's banner opens there. Before, the slot counted up to
// something that then happened somewhere else entirely.
//
// It stops covering the page at the exact moment the page is interesting. The scrim
// blacked out the reel, the ticker and everyone's live drops for four seconds to
// show a four-item strip; the reel carries on running behind this.
//
// And DESIGN.md recorded the takeover as an unreviewed surface running its own
// undocumented palette — a warm `#1a1814` family that was ratified nowhere. The
// shell here is the milestone meter's: the Nocturne's viaduct deck (see
// DESIGN.md §8, THE NOCTURNE). The meter counts down to this moment in this
// exact spot, so the roll arriving in the same plinth reads as the same machine
// continuing — the station's departure board naming the next train. The only
// colours that may signal here are the event identities themselves; everything
// else is deck and amber.
//
// The mechanism is untouched: same strip build, same rAF, same quartic ease-out,
// same phases, same server-supplied `selectionDuration`. Only the frame changed.

import React, { useState, useEffect, useRef, memo } from 'react';
import { Crown, Sparkles, Zap, Crosshair, Target } from 'lucide-react';
import { COLORS, SPACE, Z } from '../config/constants';
import { useActivity } from '../../../context/ActivityContext.jsx';
import { useSound } from '../../../context/SoundContext.jsx';

// Event configurations
const EVENT_CONFIG = {
    gold_rush: {
        name: 'GOLD RUSH',
        icon: Sparkles,
        color: '#F59E0B',
        bgGradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        description: '2x odds on a random rarity!',
    },
    king_of_wheel: {
        name: 'KING OF THE WHEEL',
        icon: Crown,
        color: '#F43F5E',
        bgGradient: 'linear-gradient(135deg, #F43F5E 0%, #BE123C 100%)',
        description: 'Compete for Lucky Spins!',
    },
    first_blood: {
        name: 'FIRST BLOOD',
        icon: Crosshair,
        color: '#DC2626',
        bgGradient: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
        description: 'First special drop wins!',
    },
    community_goal: {
        name: 'COMMUNITY GOAL',
        icon: Target,
        color: '#2DD4BF',
        bgGradient: 'linear-gradient(135deg, #2DD4BF 0%, #0D9488 100%)',
        description: 'Hit the target together!',
    },
};

/**
 * The cell pitch, in one place because two things need it and they must agree.
 *
 * The animation computes how far to travel as `FINAL_INDEX * cellWidth`, and the
 * strip renders cells of `cellWidth`. When those disagree the reel lands on the
 * wrong event — silently, because both halves look fine on their own. Resizing the
 * cells for the inline layout without moving the animation's copy did exactly that:
 * the roll travelled 29 x 180 = 5,220px across a strip of 132px cells, landing on
 * index 39 of 40 instead of 29, so the header named one event and the strip stopped
 * on another.
 */
function cellWidth(isMobile) {
    return isMobile ? 108 : 132;
}

// Build a strip of events for the spinning animation
function buildEventStrip(availableEvents, selectedEvent, stripLength = 30) {
    const strip = [];

    // Fill most of the strip with random events
    for (let i = 0; i < stripLength - 1; i++) {
        const randomEvent = availableEvents[Math.floor(Math.random() * availableEvents.length)];
        strip.push(randomEvent);
    }

    // The selected event (where it lands)
    strip.push(selectedEvent);

    // Add padding items AFTER the selected event so the strip doesn't look empty
    const paddingCount = 10;
    for (let i = 0; i < paddingCount; i++) {
        const randomEvent = availableEvents[Math.floor(Math.random() * availableEvents.length)];
        strip.push(randomEvent);
    }

    return strip;
}

function EventSelectionWheel({ isMobile = false }) {
    const { eventSelection } = useActivity();
    const { playSfx } = useSound();

    const [isVisible, setIsVisible] = useState(false);
    const [strip, setStrip] = useState([]);
    const [offset, setOffset] = useState(0);
    const [phase, setPhase] = useState('idle'); // 'idle', 'spinning', 'landing', 'result'
    const [resultEvent, setResultEvent] = useState(null);

    const animationRef = useRef(null);
    const startTimeRef = useRef(null);

    const STRIP_LENGTH = 30;
    const FINAL_INDEX = STRIP_LENGTH - 1;

    // Start animation when eventSelection is received
    useEffect(() => {
        if (eventSelection && eventSelection.selectedEvent) {
            // Capture item width at animation start to prevent resize mid-spin
            const itemWidth = isMobile ? 140 : 180;

            const newStrip = buildEventStrip(
                eventSelection.availableEvents || ['gold_rush', 'king_of_wheel'],
                eventSelection.selectedEvent,
                STRIP_LENGTH
            );
            setStrip(newStrip);
            setIsVisible(true);
            setPhase('spinning');
            setOffset(0);
            startTimeRef.current = Date.now();

            playSfx?.('spin_start');

            // Calculate total distance to travel
            // We want to land on FINAL_INDEX (the last item in the strip)
            // The strip starts with item 0 centered, so we need to move FINAL_INDEX items
            const totalDistance = FINAL_INDEX * itemWidth;
            const duration = eventSelection.selectionDuration || 4000;

            const animate = () => {
                const elapsed = Date.now() - startTimeRef.current;
                const progress = Math.min(elapsed / duration, 1);

                // Easing function - slow down at end
                const eased = 1 - Math.pow(1 - progress, 4);

                setOffset(eased * totalDistance);

                if (progress < 1) {
                    animationRef.current = requestAnimationFrame(animate);
                } else {
                    // Animation complete
                    setPhase('result');
                    setResultEvent(eventSelection.selectedEvent);
                    playSfx?.('event_start');
                }
            };

            animationRef.current = requestAnimationFrame(animate);
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [eventSelection, playSfx]);

    // Exit fades rather than pops. The context clears eventSelection about a
    // second after the landing; that clear is the cue — the event's own banner
    // slides into this same slot right about then, so the roll dissolves
    // beneath it instead of vanishing the moment it is beaten. A fresh
    // selection mid-fade (events queue fast on a busy server) snaps it back:
    // the reset below is a render-phase state correction, the pattern React
    // prescribes for deriving state from changing props.
    const [isGone, setIsGone] = useState(false);
    const isClosing = isVisible && !eventSelection && !isGone;
    if (eventSelection && isGone) setIsGone(false);
    useEffect(() => {
        if (!isClosing) return undefined;
        const id = setTimeout(() => setIsGone(true), 320);
        return () => clearTimeout(id);
    }, [isClosing]);

    if (isGone || !isVisible || strip.length === 0) return null;

    // 132, down from 180. The slot is one row, not a screen.
    const ITEM_WIDTH = isMobile ? 108 : 132;
    const STRIP_HEIGHT = isMobile ? 46 : 52;
    const config = resultEvent ? EVENT_CONFIG[resultEvent] : null;

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            paddingBottom: `${SPACE.sm}px`,
            zIndex: Z.content,
        }}>
            <style>{`
                @keyframes eventRollIn {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            <div style={{
                // The milestone meter's shell, deliberately — and now the meter's
                // plinth exactly: square, no ring, the Nocturne's blue-hour deck
                // material, lit rail on top, a signal entering from the floor.
                // While the roll runs the signal is amber; the moment it lands it
                // becomes the event's own colour, which is the result.
                width: isMobile ? 'min(340px, 92vw)' : '460px',
                padding: isMobile ? '9px 14px 11px' : '10px 18px 12px',
                borderRadius: 0,
                background: 'linear-gradient(180deg, #0d1322 0%, #0a0d18 100%)',
                boxShadow: [
                    'inset 0 1px 0 rgba(206,214,236,0.10)',
                    `inset 0 -1px 0 ${config ? config.color : COLORS.gold}88`,
                ].join(', '),
                animation: isClosing ? 'none' : 'eventRollIn 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
                opacity: isClosing ? 0 : 1,
                transition: 'opacity 0.32s ease-in',
            }}>
                {/* The header line, in the meter's own format: what this is on the
                    left, what is happening on the right. While it rolls the right
                    side says so; when it lands it becomes the event's name in the
                    event's colour, which is the result — no separate panel. */}
                <div style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: `${SPACE.md}px`,
                    marginBottom: '7px',
                }}>
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.09em',
                        textTransform: 'uppercase',
                        color: COLORS.gold,
                    }}>
                        <Zap size={12} />
                        Global event
                    </span>

                    <span style={{
                        fontSize: isMobile ? '12px' : '13px',
                        fontWeight: config ? 700 : 400,
                        color: config ? config.color : COLORS.textMuted,
                        textShadow: config ? `0 0 14px ${config.color}66` : 'none',
                        whiteSpace: 'nowrap',
                        transition: 'color 0.3s ease-out',
                    }}>
                        {config ? config.name : 'Selecting…'}
                    </span>
                </div>

            {/* Spinning Strip Container */}
            <div style={{
                position: 'relative',
                width: '100%',
                height: `${STRIP_HEIGHT}px`,
                // A lit window in the plinth, not a recessed box: no radius, and
                // the depth is the deck's own darker blue-hour ground rather than
                // a shadow. The only edges are the rail passing in front above and
                // the signal below; the cells carry their own floor light.
                background: 'linear-gradient(180deg, #090c15 0%, #05070d 100%)',
                borderRadius: 0,
                boxShadow: 'inset 0 1px 0 rgba(206,214,236,0.06)',
                overflow: 'hidden',
            }}>
                {/* The indicator, built like the reel's detent rather than the reel's
                    old 4px bar: a mark seated in each edge with the line between
                    them opening out, so nothing is drawn through the event it is
                    pointing at. Same reasoning as DESIGN.md's indicator section. */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '1px',
                    background: `linear-gradient(180deg, ${COLORS.gold} 0%, ${COLORS.gold}22 32%, ${COLORS.gold}22 68%, ${COLORS.gold} 100%)`,
                    boxShadow: `0 0 8px ${COLORS.gold}66`,
                    zIndex: 10,
                }} />

                {/* Strip */}
                <div style={{
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    height: '100%',
                    left: `calc(50% - ${ITEM_WIDTH / 2}px)`,
                    transform: `translateX(-${offset}px)`,
                    transition: phase === 'result' ? 'none' : undefined,
                }}>
                    {strip.map((eventType, index) => {
                        const eventConfig = EVENT_CONFIG[eventType];
                        if (!eventConfig) return null;

                        const Icon = eventConfig.icon;
                        const isLanding = phase === 'result' && index === FINAL_INDEX;

                        return (
                            <div
                                key={index}
                                style={{
                                    width: `${ITEM_WIDTH}px`,
                                    // Without this the cells collapse. The strip is
                                    // an absolutely positioned flex container with
                                    // `left` but no width, so it is shrink-to-fit
                                    // and bounded by the box it sits in — the cells
                                    // are flex items, `flex-shrink` defaults to 1,
                                    // and forty of them divide up 424px instead of
                                    // taking 132 each. The strip looked half empty
                                    // because most of it was squeezed into a sliver.
                                    flexShrink: 0,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    // The reel's own language: light from the floor
                                    // rather than a box. The winner used to get 3px
                                    // borders on all four sides plus two glow bars —
                                    // four edges and a fill, which is the boxed tile
                                    // §8 spent a rebuild getting rid of.
                                    background: isLanding
                                        ? `linear-gradient(180deg, transparent 30%, ${eventConfig.color}18 76%, ${eventConfig.color}44 100%)`
                                        : 'transparent',
                                    boxShadow: isLanding
                                        ? `inset 0 -2px 0 ${eventConfig.color}, 0 0 18px -6px ${eventConfig.color}`
                                        : 'none',
                                    transition: isLanding ? 'background 0.3s ease-out, box-shadow 0.3s ease-out' : 'none',
                                    position: 'relative',
                                }}
                            >
                                {/* The seam between cells, bottom-weighted for the
                                    same reason the reel's is: a full-height rule
                                    repeated at the cell pitch is a grid. */}
                                <div style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    bottom: 0,
                                    width: '1px',
                                    background: 'linear-gradient(180deg, transparent 45%, rgba(206,214,236,0.10) 100%)',
                                }} />
                                <Icon
                                    size={isMobile ? 18 : 20}
                                    color={eventConfig.color}
                                    style={{
                                        filter: `drop-shadow(0 0 ${isLanding ? 10 : 6}px ${eventConfig.color}${isLanding ? 'AA' : '66'})`,
                                        transition: 'filter 0.3s ease-out',
                                    }}
                                />
                                <span style={{
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    color: eventConfig.color,
                                    textAlign: 'center',
                                    letterSpacing: '0.06em',
                                    lineHeight: 1.1,
                                    padding: '0 6px',
                                }}>
                                    {eventConfig.name}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Edge fades */}
                <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '52px',
                    background: 'linear-gradient(90deg, #05070d 0%, transparent 100%)',
                    pointerEvents: 'none',
                    zIndex: 5,
                }} />
                <div style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '52px',
                    background: 'linear-gradient(270deg, #05070d 0%, transparent 100%)',
                    pointerEvents: 'none',
                    zIndex: 5,
                }} />
            </div>
            </div>

            {/* The separate result panel is gone — a 32px name flanked by two
                pulsing icons on a `bounceIn`, plus a description line, plus a
                "Selecting event..." line during the roll. All four are said by the
                header row above: it reads "Selecting…" while it turns and becomes
                the event's name in the event's colour when it lands.

                Its `bounceIn` was also a 1.1 overshoot, which §8 permits on the spin
                control alone. The banner that opens a moment later carries the
                description and everything else about the event, so repeating it here
                for 1.5 seconds was saying the same thing twice in a row. */}
        </div>
    );
}

export default memo(EventSelectionWheel);