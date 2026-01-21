// ============================================
// EventSelectionWheel.jsx
// ============================================
// Animated wheel for selecting global events (Gold Rush, KOTW)
// Shows when a milestone triggers an event selection

import React, { useState, useEffect, useRef, memo } from 'react';
import { Crown, Sparkles, Zap, Trophy, Crosshair } from 'lucide-react';
import { COLORS } from '../../../config/constants.js';
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
};

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

    // Hide after result is shown
    useEffect(() => {
        if (phase === 'result') {
            const timeout = setTimeout(() => {
                setIsVisible(false);
                setPhase('idle');
                setResultEvent(null);
            }, 1500);
            return () => clearTimeout(timeout);
        }
    }, [phase]);

    if (!isVisible || strip.length === 0) return null;

    // Item width for rendering (can update with resize)
    const ITEM_WIDTH = isMobile ? 140 : 180;
    const config = resultEvent ? EVENT_CONFIG[resultEvent] : null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            animation: 'fadeIn 0.3s ease-out',
        }}>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes pulseGlow {
                    0%, 100% { filter: drop-shadow(0 0 20px currentColor); }
                    50% { filter: drop-shadow(0 0 40px currentColor); }
                }
                @keyframes bounceIn {
                    0% { transform: scale(0.5); opacity: 0; }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>

            {/* Title */}
            <div style={{
                fontSize: isMobile ? '20px' : '28px',
                fontWeight: 900,
                color: '#fff',
                marginBottom: '24px',
                letterSpacing: '3px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
            }}>
                <Zap size={isMobile ? 24 : 32} color="#F59E0B" />
                GLOBAL EVENT!
                <Zap size={isMobile ? 24 : 32} color="#F59E0B" />
            </div>

            {/* Spinning Strip Container */}
            <div style={{
                position: 'relative',
                width: isMobile ? '300px' : '400px',
                height: isMobile ? '100px' : '120px',
                background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)',
                borderRadius: '16px',
                border: '3px solid #F59E0B',
                boxShadow: '0 0 40px #F59E0B44, inset 0 0 30px rgba(0,0,0,0.5)',
                overflow: 'hidden',
                marginBottom: '24px',
            }}>
                {/* Center indicator */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '4px',
                    background: '#F59E0B',
                    boxShadow: '0 0 15px #F59E0B',
                    zIndex: 10,
                }} />

                {/* Pointer triangle */}
                <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '12px solid transparent',
                    borderRight: '12px solid transparent',
                    borderTop: '16px solid #F59E0B',
                    zIndex: 10,
                    filter: 'drop-shadow(0 0 8px #F59E0B)',
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
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    background: isLanding
                                        ? `linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)`
                                        : 'rgba(255,255,255,0.05)',
                                    borderLeft: isLanding
                                        ? `3px solid ${eventConfig.color}`
                                        : '1px solid rgba(255,255,255,0.1)',
                                    borderRight: isLanding
                                        ? `3px solid ${eventConfig.color}`
                                        : 'none',
                                    boxShadow: isLanding
                                        ? `inset 0 0 30px ${eventConfig.color}44, 0 0 20px ${eventConfig.color}66`
                                        : 'none',
                                    transition: isLanding ? 'all 0.3s ease' : 'none',
                                    position: 'relative',
                                }}
                            >
                                {/* Winner glow bar at top and bottom */}
                                {isLanding && (
                                    <>
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            height: '3px',
                                            background: eventConfig.color,
                                            boxShadow: `0 0 10px ${eventConfig.color}`,
                                        }} />
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            height: '3px',
                                            background: eventConfig.color,
                                            boxShadow: `0 0 10px ${eventConfig.color}`,
                                        }} />
                                    </>
                                )}
                                <Icon
                                    size={isMobile ? 28 : 36}
                                    color={isLanding ? '#fff' : eventConfig.color}
                                    style={{
                                        filter: isLanding
                                            ? `drop-shadow(0 0 12px ${eventConfig.color})`
                                            : `drop-shadow(0 0 8px ${eventConfig.color})`,
                                    }}
                                />
                                <span style={{
                                    fontSize: isMobile ? '10px' : '12px',
                                    fontWeight: 700,
                                    color: isLanding ? '#fff' : eventConfig.color,
                                    textAlign: 'center',
                                    letterSpacing: '1px',
                                    textShadow: isLanding ? `0 0 10px ${eventConfig.color}` : 'none',
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
                    width: '60px',
                    background: 'linear-gradient(90deg, #0f0f1a 0%, transparent 100%)',
                    pointerEvents: 'none',
                    zIndex: 5,
                }} />
                <div style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '60px',
                    background: 'linear-gradient(270deg, #0f0f1a 0%, transparent 100%)',
                    pointerEvents: 'none',
                    zIndex: 5,
                }} />
            </div>

            {/* Result Display */}
            {phase === 'result' && config && (
                <div style={{
                    animation: 'bounceIn 0.5s ease-out',
                    textAlign: 'center',
                }}>
                    <div style={{
                        fontSize: isMobile ? '24px' : '32px',
                        fontWeight: 900,
                        color: config.color,
                        textShadow: `0 0 20px ${config.color}`,
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                    }}>
                        {React.createElement(config.icon, {
                            size: isMobile ? 28 : 36,
                            style: { animation: 'pulseGlow 1s ease-in-out infinite' }
                        })}
                        {config.name}
                        {React.createElement(config.icon, {
                            size: isMobile ? 28 : 36,
                            style: { animation: 'pulseGlow 1s ease-in-out infinite' }
                        })}
                    </div>
                    <div style={{
                        fontSize: isMobile ? '14px' : '16px',
                        color: '#94A3B8',
                    }}>
                        {config.description}
                    </div>
                </div>
            )}

            {/* Spinning indicator */}
            {phase === 'spinning' && (
                <div style={{
                    fontSize: isMobile ? '14px' : '16px',
                    color: '#94A3B8',
                    animation: 'pulse 1s ease-in-out infinite',
                }}>
                    Selecting event...
                </div>
            )}
        </div>
    );
}

export default memo(EventSelectionWheel);