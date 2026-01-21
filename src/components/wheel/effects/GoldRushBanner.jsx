// ============================================
// GoldRushBanner.jsx
// ============================================
// Gold Rush event banner with treasure/gold aesthetics
// Features: rarity selection strip animation, countdown on banner

import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { COLORS, API_BASE_URL } from '../../../config/constants.js';
import { useActivity } from '../../../context/ActivityContext.jsx';
import { useSound } from '../../../context/SoundContext.jsx';
import { Crown, Sparkles, Star, Diamond, X, Timer, FlaskConical, Coins, TrendingUp, Crosshair } from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

const RARITY_CONFIG = {
    rare: { name: 'Rare', color: COLORS.red, icon: Diamond },
    legendary: { name: 'Legendary', color: COLORS.purple, icon: Star },
    mythic: { name: 'Mythic', color: COLORS.aqua, icon: Sparkles },
    insane: { name: 'Insane', color: COLORS.insane, icon: Crown },
};

const RARITY_ORDER = ['rare', 'legendary', 'mythic', 'insane'];
const GOLD_COLOR = '#FFD700';
const GOLD_DARK = '#B8860B';

// ============================================
// Gold Drop Counter - Shows boosted drops during event
// ============================================
function GoldDropCounter({ count = 0, isMobile }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '6px' : '10px',
            padding: isMobile ? '6px 12px' : '8px 16px',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '8px',
            border: `2px solid ${GOLD_COLOR}66`,
            boxShadow: `0 0 15px ${GOLD_COLOR}22`,
        }}>
            <TrendingUp size={isMobile ? 16 : 20} color={GOLD_COLOR} style={{
                filter: `drop-shadow(0 0 4px ${GOLD_COLOR})`,
            }} />
            <span style={{
                fontSize: isMobile ? '18px' : '24px',
                fontWeight: 900,
                color: GOLD_COLOR,
                fontFamily: 'monospace',
                textShadow: `0 0 10px ${GOLD_COLOR}88`,
            }}>
                {count}
            </span>
            <span style={{
                fontSize: isMobile ? '11px' : '14px',
                fontWeight: 600,
                color: `${GOLD_COLOR}cc`,
                textTransform: 'uppercase',
                letterSpacing: '1px',
            }}>
                drops
            </span>
        </div>
    );
}

// ============================================
// Floating Rarity Icons - Background decoration
// ============================================
function FloatingRarityIcons({ isMobile }) {
    // Generate multiple icons across the banner
    const icons = [
        // Left side
        { Icon: Diamond, color: COLORS.red, left: '5%', size: 0.9, delay: 0 },
        { Icon: Star, color: COLORS.purple, left: '12%', size: 0.7, delay: 0.4 },
        { Icon: Diamond, color: COLORS.red, left: '18%', size: 0.5, delay: 0.8 },
        { Icon: Sparkles, color: COLORS.aqua, left: '8%', size: 0.6, delay: 1.2, top: '30%' },
        { Icon: Crown, color: COLORS.insane, left: '15%', size: 0.55, delay: 1.6, top: '70%' },
        { Icon: Star, color: COLORS.purple, left: '22%', size: 0.45, delay: 2.0 },
        // Right side
        { Icon: Crown, color: COLORS.insane, right: '5%', size: 0.9, delay: 0.2 },
        { Icon: Sparkles, color: COLORS.aqua, right: '12%', size: 0.7, delay: 0.6 },
        { Icon: Crown, color: COLORS.insane, right: '18%', size: 0.5, delay: 1.0 },
        { Icon: Diamond, color: COLORS.red, right: '8%', size: 0.6, delay: 1.4, top: '70%' },
        { Icon: Star, color: COLORS.purple, right: '15%', size: 0.55, delay: 1.8, top: '30%' },
        { Icon: Sparkles, color: COLORS.aqua, right: '22%', size: 0.45, delay: 2.2 },
    ];

    const baseSize = isMobile ? 18 : 26;

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 0,
        }}>
            <style>{`
                @keyframes floatIcon {
                    0%, 100% { transform: translateY(0) scale(1); opacity: 0.25; }
                    50% { transform: translateY(-6px) scale(1.15); opacity: 0.4; }
                }
                @keyframes floatIconAlt {
                    0%, 100% { transform: translateY(-3px) scale(1.1); opacity: 0.35; }
                    50% { transform: translateY(3px) scale(0.95); opacity: 0.2; }
                }
            `}</style>
            {icons.map((item, index) => {
                const { Icon, color, left, right, size, delay, top } = item;
                const useAltAnimation = index % 2 === 1;
                return (
                    <Icon
                        key={index}
                        size={Math.round(baseSize * size)}
                        color={color}
                        style={{
                            position: 'absolute',
                            left: left || 'auto',
                            right: right || 'auto',
                            top: top || '50%',
                            transform: top ? 'none' : 'translateY(-50%)',
                            opacity: 0.3,
                            filter: `drop-shadow(0 0 8px ${color})`,
                            animation: `${useAltAnimation ? 'floatIconAlt' : 'floatIcon'} ${2.5 + (index % 3) * 0.5}s ease-in-out infinite`,
                            animationDelay: `${delay}s`,
                        }}
                    />
                );
            })}
        </div>
    );
}

// ============================================
// Rarity Selection Strip - Horizontal slot machine style
// ============================================
function RaritySelectionStrip({ targetRarity, isSpinning, onSpinComplete, isMobile, duration = 5 }) {
    const [animationState, setAnimationState] = useState('idle'); // idle, spinning, winner
    const animationEndRef = useRef(null);
    const onSpinCompleteRef = useRef(onSpinComplete);
    const spinDurationRef = useRef(null);
    const animationStateRef = useRef('idle');

    // Keep callback ref updated
    useEffect(() => {
        onSpinCompleteRef.current = onSpinComplete;
    }, [onSpinComplete]);

    // Keep animation state ref in sync
    useEffect(() => {
        animationStateRef.current = animationState;
    }, [animationState]);

    const ITEM_WIDTH = isMobile ? 90 : 120;
    const STRIP_WIDTH = isMobile ? 200 : 320; // Visible area
    const STRIP_HEIGHT = isMobile ? 32 : 40; // Match Recursion banner content height
    // Animation duration matches countdown exactly (captured at start)
    const SPIN_DURATION = spinDurationRef.current ?? Math.max(2, duration);

    // Build strip items - need enough to scroll through
    const STRIP_ITEMS = [];
    // More items for longer durations
    const cycles = Math.max(20, Math.ceil(SPIN_DURATION * 4));
    for (let i = 0; i < cycles; i++) {
        STRIP_ITEMS.push(...RARITY_ORDER);
    }

    // Calculate final position to land on target (centered in view)
    const targetIndex = RARITY_ORDER.indexOf(targetRarity);
    const cycleWidth = RARITY_ORDER.length * ITEM_WIDTH;
    // Land on a cycle near the end
    const landingCycle = Math.max(8, cycles - 3);
    // Center the target item in the visible area
    const centerOffset = (STRIP_WIDTH - ITEM_WIDTH) / 2;
    const finalOffset = (cycleWidth * landingCycle) + (targetIndex * ITEM_WIDTH) - centerOffset;
    // Overshoot dramatically - almost shows next item!
    const overshootOffset = finalOffset + (ITEM_WIDTH * 0.6);

    const config = RARITY_CONFIG[targetRarity];

    useEffect(() => {
        if (isSpinning && animationStateRef.current === 'idle') {
            // Capture duration at start
            const actualDuration = Math.max(2, duration);
            spinDurationRef.current = actualDuration;
            console.log('[GoldRush Strip] Starting horizontal animation, duration:', actualDuration, 'seconds');
            animationStateRef.current = 'spinning';
            setAnimationState('spinning');

            // Animation completes exactly when countdown ends - then show winner
            animationEndRef.current = setTimeout(() => {
                console.log('[GoldRush Strip] Animation complete - showing winner!');
                animationStateRef.current = 'winner';
                setAnimationState('winner');
                onSpinCompleteRef.current?.();
            }, actualDuration * 1000);
        }
    }, [isSpinning]); // eslint-disable-line react-hooks/exhaustive-deps

    // Cleanup on unmount only
    useEffect(() => {
        return () => {
            if (animationEndRef.current) {
                clearTimeout(animationEndRef.current);
            }
        };
    }, []);

    const isWinner = animationState === 'winner';
    const isAnimating = animationState === 'spinning';

    return (
        <div style={{
            position: 'relative',
            width: STRIP_WIDTH,
            height: STRIP_HEIGHT,
            overflow: 'hidden',
            background: 'rgba(0,0,0,0.8)',
            borderRadius: '8px',
            border: `2px solid ${isWinner ? config?.color : GOLD_COLOR}88`,
            boxShadow: isWinner
                ? `0 0 30px ${config?.color}66, inset 0 0 20px ${config?.color}22`
                : `0 0 15px ${GOLD_COLOR}44, inset 0 0 10px rgba(0,0,0,0.5)`,
            transition: 'border-color 0.3s, box-shadow 0.3s',
        }}>
            {/* Keyframe animations - horizontal scroll with bounce */}
            <style>{`
                @keyframes goldRushSpinH_${targetRarity}_${Math.round(SPIN_DURATION)} {
                    0% { transform: translateX(0); }
                    80% { transform: translateX(-${overshootOffset}px); }
                    90% { transform: translateX(-${finalOffset - ITEM_WIDTH * 0.12}px); }
                    95% { transform: translateX(-${finalOffset + ITEM_WIDTH * 0.04}px); }
                    100% { transform: translateX(-${finalOffset}px); }
                }
                
                @keyframes winnerPulseH {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.08); }
                }
            `}</style>

            {/* Strip content - horizontal */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                transform: isWinner
                    ? `translateX(-${finalOffset}px)`
                    : 'translateX(0)',
                animation: isAnimating
                    ? `goldRushSpinH_${targetRarity}_${Math.round(SPIN_DURATION)} ${SPIN_DURATION}s cubic-bezier(0.12, 0.8, 0.2, 1) forwards`
                    : 'none',
            }}>
                {STRIP_ITEMS.map((rarity, index) => {
                    const itemConfig = RARITY_CONFIG[rarity];
                    const Icon = itemConfig.icon;
                    const winnerItemIndex = (RARITY_ORDER.length * landingCycle) + targetIndex;
                    const isWinnerItem = isWinner && index === winnerItemIndex;

                    return (
                        <div
                            key={index}
                            style={{
                                width: ITEM_WIDTH,
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                flexShrink: 0,
                                background: isWinnerItem
                                    ? `linear-gradient(180deg, ${itemConfig.color}22 0%, ${itemConfig.color}44 50%, ${itemConfig.color}22 100%)`
                                    : 'transparent',
                                borderLeft: `1px solid ${itemConfig.color}22`,
                                animation: isWinnerItem ? 'winnerPulseH 0.8s ease-in-out infinite' : 'none',
                            }}
                        >
                            <Icon
                                size={isMobile ? 18 : 22}
                                color={itemConfig.color}
                                style={{
                                    filter: `drop-shadow(0 0 ${isWinnerItem ? '10px' : '4px'} ${itemConfig.color})`,
                                    transition: 'filter 0.3s',
                                }}
                            />
                            <span style={{
                                color: itemConfig.color,
                                fontWeight: 700,
                                fontSize: isMobile ? '12px' : '15px',
                                textShadow: `0 0 ${isWinnerItem ? '12px' : '6px'} ${itemConfig.color}`,
                                transition: 'text-shadow 0.3s',
                            }}>
                                {itemConfig.name}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Edge gradients for fade effect */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: '25%',
                background: 'linear-gradient(90deg, rgba(0,0,0,0.95) 0%, transparent 100%)',
                pointerEvents: 'none',
                zIndex: 2,
            }} />
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: '25%',
                background: 'linear-gradient(-90deg, rgba(0,0,0,0.95) 0%, transparent 100%)',
                pointerEvents: 'none',
                zIndex: 2,
            }} />

            {/* Center selection indicator */}
            <div style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '50%',
                width: isWinner ? '4px' : '2px',
                background: isWinner ? config?.color : GOLD_COLOR,
                boxShadow: isWinner
                    ? `0 0 15px ${config?.color}, 0 0 30px ${config?.color}`
                    : `0 0 8px ${GOLD_COLOR}`,
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
                zIndex: 3,
                transition: 'all 0.3s',
            }} />

            {/* Top/bottom selection arrows */}
            <div style={{
                position: 'absolute',
                top: '4px',
                left: '50%',
                transform: `translateX(-50%) ${isWinner ? 'scale(1.3)' : 'scale(1)'}`,
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: `10px solid ${isWinner ? config?.color : GOLD_COLOR}`,
                filter: `drop-shadow(0 0 ${isWinner ? '8px' : '3px'} ${isWinner ? config?.color : GOLD_COLOR})`,
                zIndex: 3,
                transition: 'all 0.3s',
            }} />
            <div style={{
                position: 'absolute',
                bottom: '4px',
                left: '50%',
                transform: `translateX(-50%) ${isWinner ? 'scale(1.3)' : 'scale(1)'}`,
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderBottom: `10px solid ${isWinner ? config?.color : GOLD_COLOR}`,
                filter: `drop-shadow(0 0 ${isWinner ? '8px' : '3px'} ${isWinner ? config?.color : GOLD_COLOR})`,
                zIndex: 3,
                transition: 'all 0.3s',
            }} />
        </div>
    );
}

// ============================================
// Gold Coin Particles
// ============================================
function GoldParticles({ intensity = 1 }) {
    const particles = useRef(
        Array.from({ length: 12 }, (_, i) => ({
            left: Math.random() * 100,
            delay: Math.random() * 2,
            duration: 2 + Math.random() * 2,
            size: 4 + Math.random() * 4,
        }))
    ).current;

    return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <style>{`
                @keyframes coinRise {
                    0% { transform: translateY(100%) rotate(0deg); opacity: 0; }
                    20% { opacity: ${0.6 * intensity}; }
                    80% { opacity: ${0.6 * intensity}; }
                    100% { transform: translateY(-100%) rotate(360deg); opacity: 0; }
                }
            `}</style>
            {particles.map((p, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        left: `${p.left}%`,
                        bottom: 0,
                        width: p.size,
                        height: p.size,
                        borderRadius: '50%',
                        background: `radial-gradient(circle at 30% 30%, #FFF5B0, ${GOLD_COLOR}, ${GOLD_DARK})`,
                        boxShadow: `0 0 ${p.size}px ${GOLD_COLOR}88`,
                        animation: `coinRise ${p.duration}s ease-in-out ${p.delay}s infinite`,
                    }}
                />
            ))}
        </div>
    );
}

// ============================================
// Main Gold Rush Banner Component
// ============================================
function GoldRushBanner({
                            isMobile = false,
                            isAdmin = false,
                        }) {
    const { globalEventStatus, updateGlobalEventStatus, feed } = useActivity();
    const { playSound, startGoldRushSoundtrack, stopGoldRushSoundtrack } = useSound();

    const [remainingTime, setRemainingTime] = useState(0);
    const [countdownTime, setCountdownTime] = useState(0);
    const [initialCountdownDuration, setInitialCountdownDuration] = useState(5);
    const [isVisible, setIsVisible] = useState(false);
    const [isStripSpinning, setIsStripSpinning] = useState(false);
    const [showStrip, setShowStrip] = useState(false);
    const [stripFadingOut, setStripFadingOut] = useState(false);
    const [goldDropCount, setGoldDropCount] = useState(0);

    const hasPlayedSoundRef = useRef(false);
    const hasSoundtrackStartedRef = useRef(false);
    const lastEventStartTimeRef = useRef(null); // Track which event we started soundtrack for
    const wasActiveRef = useRef(false);
    const wasPendingRef = useRef(false);
    const lastActivityIdRef = useRef(null);
    const eventStartTimeRef = useRef(null);
    const pendingDropTimeoutsRef = useRef([]);

    // Only respond to gold_rush events, not other event types
    const isGoldRush = globalEventStatus?.type === 'gold_rush';
    const isActive = isGoldRush && globalEventStatus?.active;
    const isPending = isGoldRush && globalEventStatus?.pending;
    const boostedRarity = globalEventStatus?.data?.boostedRarity;
    const multiplier = globalEventStatus?.data?.multiplier || 2;
    const rarityConfig = boostedRarity ? RARITY_CONFIG[boostedRarity] : null;

    // Start/stop Gold Rush soundtrack when event starts/ends
    useEffect(() => {
        const currentEventStart = globalEventStatus?.activatesAt;

        // Check if this is a new event (different start time than last tracked)
        if (isActive && lastEventStartTimeRef.current !== currentEventStart) {
            // New event detected - reset soundtrack state
            hasSoundtrackStartedRef.current = false;
            lastEventStartTimeRef.current = currentEventStart;
        }

        if (isActive && !hasSoundtrackStartedRef.current) {
            startGoldRushSoundtrack?.();
            hasSoundtrackStartedRef.current = true;
            // Record when this event started for filtering drops
            eventStartTimeRef.current = currentEventStart || Date.now();
        }
        if (!isActive && !isPending && hasSoundtrackStartedRef.current) {
            stopGoldRushSoundtrack?.();
            hasSoundtrackStartedRef.current = false;
            lastEventStartTimeRef.current = null;
        }
    }, [isActive, isPending, startGoldRushSoundtrack, stopGoldRushSoundtrack, globalEventStatus?.activatesAt]);

    // Track gold drops from activity feed
    // Only count drops that happened AFTER the event started, with delay for spin animation
    useEffect(() => {
        if (!isActive || !feed?.length || !eventStartTimeRef.current) return;

        const latestActivity = feed[0];
        if (latestActivity && latestActivity.id !== lastActivityIdRef.current) {
            lastActivityIdRef.current = latestActivity.id;

            // Only count if it matches the boosted rarity
            if (latestActivity.item_rarity !== boostedRarity) return;

            // Parse the activity timestamp - try parsing first, only normalize if needed
            let createdAtStr = latestActivity.created_at;
            let activityTime = Date.parse(createdAtStr);

            // If parsing failed, try normalizing the timestamp
            if (isNaN(activityTime)) {
                // Check if there's already a timezone indicator (Z, +offset, or -offset after time portion)
                const hasTimezone = /Z|[+-]\d{2}:?\d{2}$/.test(createdAtStr) || createdAtStr.includes('+');
                if (!hasTimezone) {
                    createdAtStr = createdAtStr.replace(' ', 'T') + 'Z';
                }
                activityTime = new Date(createdAtStr).getTime();
            }

            // Bail out if timestamp is still invalid after normalization
            if (isNaN(activityTime)) return;

            // Only count drops that happened AFTER this event started
            if (activityTime < eventStartTimeRef.current) return;

            // Delay increment by 4.5s to match when user sees result (spin animation duration)
            const timeoutId = setTimeout(() => {
                setGoldDropCount(prev => prev + 1);
                // Remove from pending list
                pendingDropTimeoutsRef.current = pendingDropTimeoutsRef.current.filter(id => id !== timeoutId);
            }, 4500);
            pendingDropTimeoutsRef.current.push(timeoutId);
        }
    }, [feed, isActive, boostedRarity]);

    // Reset drop count and clear pending timeouts when event starts
    useEffect(() => {
        if (isPending && !wasPendingRef.current) {
            setGoldDropCount(0);
            lastActivityIdRef.current = null;
            eventStartTimeRef.current = null;
            // Clear any pending drop timeouts from previous event
            pendingDropTimeoutsRef.current.forEach(id => clearTimeout(id));
            pendingDropTimeoutsRef.current = [];
        }
    }, [isPending]);

    // Cleanup pending timeouts on unmount
    useEffect(() => {
        return () => {
            pendingDropTimeoutsRef.current.forEach(id => clearTimeout(id));
        };
    }, []);

    // Handle visibility and animations
    useEffect(() => {
        console.log('[GoldRush] State change - isPending:', isPending, 'isActive:', isActive, 'boostedRarity:', boostedRarity);

        if (isPending && !wasPendingRef.current && !isActive) {
            // Event countdown starting - show strip and spin
            console.log('[GoldRush] Starting countdown phase, showing strip');
            // Capture the initial countdown duration
            const duration = globalEventStatus?.activatesAt
                ? Math.max(2, (globalEventStatus.activatesAt - Date.now()) / 1000)
                : 5;
            setInitialCountdownDuration(duration);
            console.log('[GoldRush] Countdown duration:', duration);

            setIsVisible(true);
            setShowStrip(true);
            setStripFadingOut(false);
            setIsStripSpinning(true);
            wasPendingRef.current = true;
        } else if (isActive && !wasActiveRef.current) {
            // Event just became active
            console.log('[GoldRush] Event now ACTIVE');
            setIsVisible(true);
            if (!hasPlayedSoundRef.current) {
                playSound?.('event_start');
                hasPlayedSoundRef.current = true;
            }
            wasActiveRef.current = true;
            wasPendingRef.current = false;
            // The strip animation handles its own completion timing
            // It will call onSpinComplete which triggers the crossfade
        } else if (!isActive && !isPending && (wasActiveRef.current || wasPendingRef.current)) {
            // Event just ended
            console.log('[GoldRush] Event ENDED');
            setIsVisible(false);
            setShowStrip(false);
            setStripFadingOut(false);
            setIsStripSpinning(false);
            hasPlayedSoundRef.current = false;
            wasActiveRef.current = false;
            wasPendingRef.current = false;
        }
    }, [isActive, isPending, boostedRarity, playSound, globalEventStatus?.activatesAt]);

    // Handle strip animation completion - start crossfade to badge
    const handleSpinComplete = useCallback(() => {
        console.log('[GoldRush] Strip animation complete - starting crossfade');
        setIsStripSpinning(false);
        // Show winner for 1.2s, then smooth crossfade to badge
        setTimeout(() => {
            setStripFadingOut(true);
            // Badge fades in over 400ms while strip fades out
            setTimeout(() => setShowStrip(false), 400);
        }, 1200);
    }, []);

    // Countdown timer for pending phase
    useEffect(() => {
        if (!isPending || !globalEventStatus?.activatesAt) {
            setCountdownTime(0);
            return;
        }

        const updateCountdown = () => {
            const remaining = Math.max(0, globalEventStatus.activatesAt - Date.now());
            setCountdownTime(remaining);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 100);
        return () => clearInterval(interval);
    }, [isPending, globalEventStatus?.activatesAt]);

    // Active timer
    useEffect(() => {
        if (!isActive || !globalEventStatus?.expiresAt) {
            setRemainingTime(0);
            return;
        }

        const updateTimer = () => {
            const remaining = Math.max(0, globalEventStatus.expiresAt - Date.now());
            setRemainingTime(remaining);

            // Fallback: if timer hits 0, hide banner even if SSE message hasn't arrived
            if (remaining <= 0 && isVisible) {
                console.log('[GoldRush] Timer expired - hiding banner (fallback)');
                setIsVisible(false);
                setShowStrip(false);
                setStripFadingOut(false);
                setIsStripSpinning(false);
                hasPlayedSoundRef.current = false;
                wasActiveRef.current = false;
                wasPendingRef.current = false;
                // Stop soundtrack and reset event identity tracking
                // This allows new events to properly start their soundtrack
                stopGoldRushSoundtrack?.();
                lastEventStartTimeRef.current = null;
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [isActive, globalEventStatus?.expiresAt, isVisible, stopGoldRushSoundtrack]);

    // Admin test functions
    const triggerTestEvent = useCallback(async (rarity = null) => {
        try {
            console.log('[GoldRush] Triggering test event with rarity:', rarity);
            const res = await fetch(`${API_BASE_URL}/api/admin/global-event/trigger`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: 'gold_rush',
                    rarity: rarity,
                    duration: 2,
                }),
            });
            const data = await res.json();
            console.log('[GoldRush] API response:', data);
            if (data.error) {
                alert(`Failed: ${data.error}`);
            } else if (data.event) {
                console.log('[GoldRush] Updating state with event:', data.event);
                updateGlobalEventStatus?.(data.event);
            }
        } catch (e) {
            console.error('[GoldRush] Trigger error:', e);
            alert('Failed to trigger event');
        }
    }, [updateGlobalEventStatus]);

    const endTestEvent = useCallback(async () => {
        try {
            await fetch(`${API_BASE_URL}/api/admin/global-event/end`, {
                method: 'POST',
                credentials: 'include',
            });
            updateGlobalEventStatus?.({ active: false, pending: false });
        } catch (e) {
            console.error('[GoldRush] End error:', e);
        }
    }, [updateGlobalEventStatus]);

    // Trigger King of the Wheel event
    const triggerKotwEvent = useCallback(async () => {
        try {
            console.log('[KOTW] Triggering King of the Wheel event');
            const res = await fetch(`${API_BASE_URL}/api/admin/global-event/trigger`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: 'king_of_wheel',
                    duration: 2, // 2 minutes for testing
                }),
            });
            const data = await res.json();
            console.log('[KOTW] API response:', data);
            if (data.error) {
                alert(`Failed: ${data.error}`);
            } else if (data.event) {
                updateGlobalEventStatus?.(data.event);
            }
        } catch (e) {
            console.error('[KOTW] Trigger error:', e);
            alert('Failed to trigger KOTW event');
        }
    }, [updateGlobalEventStatus]);

    // Trigger First Blood event
    const triggerFirstBloodEvent = useCallback(async () => {
        try {
            console.log('[FirstBlood] Triggering First Blood event');
            const res = await fetch(`${API_BASE_URL}/api/admin/global-event/trigger`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: 'first_blood',
                    duration: 2, // 2 minutes for testing
                }),
            });
            const data = await res.json();
            console.log('[FirstBlood] API response:', data);
            if (data.error) {
                alert(`Failed: ${data.error}`);
            } else if (data.event) {
                updateGlobalEventStatus?.(data.event);
            }
        } catch (e) {
            console.error('[FirstBlood] Trigger error:', e);
            alert('Failed to trigger First Blood event');
        }
    }, [updateGlobalEventStatus]);

    // Format time
    const formatTime = (ms) => {
        const totalSeconds = Math.ceil(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Calculate progress
    const totalDuration = globalEventStatus?.expiresAt && globalEventStatus?.activatesAt
        ? globalEventStatus.expiresAt - globalEventStatus.activatesAt
        : 15 * 60 * 1000;
    const progressPercent = isActive ? Math.max(0, (remainingTime / totalDuration) * 100) : 100;
    const isLowTime = remainingTime > 0 && remainingTime < 60000;
    const isCriticalTime = remainingTime > 0 && remainingTime < 30000;

    // If no event, render nothing
    if (!isVisible) return null;

    const RarityIcon = rarityConfig?.icon || Sparkles;
    const countdownSecs = Math.ceil(countdownTime / 1000);

    return (
        <>
            <style>{`
                @keyframes goldShimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes goldPulse {
                    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px ${GOLD_COLOR}); }
                    50% { transform: scale(1.15); filter: drop-shadow(0 0 16px ${GOLD_COLOR}); }
                }
                @keyframes countdownPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                @keyframes progressGlow {
                    0%, 100% { box-shadow: 0 0 10px ${GOLD_COLOR}; }
                    50% { box-shadow: 0 0 20px ${GOLD_COLOR}, 0 0 30px ${GOLD_COLOR}66; }
                }
            `}</style>

            {/* Subtle screen edge glow */}
            {isActive && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    boxShadow: `inset 0 0 80px ${GOLD_COLOR}08, inset 0 0 150px ${GOLD_COLOR}05`,
                    pointerEvents: 'none',
                    zIndex: 9998,
                }} />
            )}

            {/* Main Banner */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
            }}>
                {/* Progress Bar (only when active) */}
                {isActive && (
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: GOLD_DARK,
                        zIndex: 10,
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${progressPercent}%`,
                            background: isCriticalTime
                                ? `linear-gradient(90deg, #ff4444, #ff6666)`
                                : isLowTime
                                    ? `linear-gradient(90deg, #ffaa00, ${GOLD_COLOR})`
                                    : `linear-gradient(90deg, ${GOLD_COLOR}, ${GOLD_DARK})`,
                            boxShadow: `0 0 10px ${GOLD_COLOR}`,
                            transition: 'width 1s linear',
                            animation: isCriticalTime ? 'progressGlow 0.5s infinite' : 'progressGlow 2s infinite',
                        }} />
                    </div>
                )}

                {/* Banner Content */}
                <div style={{
                    background: `linear-gradient(180deg, #1a1508 0%, #0d0a04 50%, #1a1508 100%)`,
                    padding: isMobile ? '12px 12px 14px 12px' : '18px 32px 20px 32px',
                    borderBottom: `2px solid ${GOLD_COLOR}`,
                    overflow: 'hidden',
                    position: 'relative',
                }}>
                    {/* Floating rarity icons in background */}
                    <FloatingRarityIcons isMobile={isMobile} />

                    {/* Gold particle effects */}
                    <GoldParticles intensity={isActive ? 1 : 0.5} />

                    {/* Golden shimmer overlay */}
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `linear-gradient(90deg, transparent 0%, ${GOLD_COLOR}06 30%, ${GOLD_COLOR}10 50%, ${GOLD_COLOR}06 70%, transparent 100%)`,
                        backgroundSize: '200% 100%',
                        animation: 'goldShimmer 4s ease-in-out infinite',
                        pointerEvents: 'none',
                    }} />

                    {/* Bottom glow line */}
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: GOLD_COLOR,
                        boxShadow: `0 0 15px ${GOLD_COLOR}, 0 0 30px ${GOLD_COLOR}88`,
                    }} />

                    {/* Content - Single row layout */}
                    <div style={{
                        position: 'relative',
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: isMobile ? '10px' : '18px',
                    }}>
                        {/* Left coin */}
                        <Coins
                            size={isMobile ? 20 : 28}
                            color={GOLD_COLOR}
                            style={{
                                filter: `drop-shadow(0 0 8px ${GOLD_COLOR})`,
                                animation: 'goldPulse 2s ease-in-out infinite',
                            }}
                        />

                        {/* Title */}
                        <span style={{
                            fontSize: isMobile ? '14px' : '20px',
                            fontWeight: 800,
                            color: GOLD_COLOR,
                            textShadow: `0 0 20px ${GOLD_COLOR}88, 0 2px 4px rgba(0,0,0,0.5)`,
                            letterSpacing: isMobile ? '1px' : '3px',
                        }}>
                            GOLD RUSH
                        </span>

                        {/* Rarity selection strip OR rarity badge */}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {/* Strip - shows during countdown */}
                            {showStrip && (
                                <div style={{
                                    opacity: stripFadingOut ? 0 : 1,
                                    transform: stripFadingOut ? 'scale(0.95)' : 'scale(1)',
                                    transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out',
                                }}>
                                    <RaritySelectionStrip
                                        targetRarity={boostedRarity || 'rare'}
                                        isSpinning={isStripSpinning && !!boostedRarity}
                                        onSpinComplete={handleSpinComplete}
                                        isMobile={isMobile}
                                        duration={initialCountdownDuration}
                                    />
                                </div>
                            )}

                            {/* Badge - fades in as strip fades out */}
                            {rarityConfig && (stripFadingOut || !showStrip) && (
                                <div style={{
                                    position: showStrip ? 'absolute' : 'relative',
                                    opacity: showStrip ? (stripFadingOut ? 1 : 0) : 1,
                                    transform: stripFadingOut && showStrip ? 'scale(1.02)' : 'scale(1)',
                                    transition: 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: isMobile ? '6px 12px' : '8px 16px',
                                    background: `linear-gradient(135deg, ${rarityConfig.color}22 0%, ${rarityConfig.color}33 100%)`,
                                    border: `2px solid ${rarityConfig.color}`,
                                    borderRadius: '8px',
                                    boxShadow: `0 0 20px ${rarityConfig.color}55`,
                                }}>
                                    <RarityIcon size={isMobile ? 18 : 22} color={rarityConfig.color} style={{
                                        filter: `drop-shadow(0 0 6px ${rarityConfig.color})`,
                                    }} />
                                    <span style={{
                                        fontSize: isMobile ? '13px' : '16px',
                                        fontWeight: 700,
                                        color: rarityConfig.color,
                                        textShadow: `0 0 8px ${rarityConfig.color}`,
                                    }}>
                                        {rarityConfig.name} ×{multiplier}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Countdown (during pending) */}
                        {isPending && !isActive && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: isMobile ? '4px 12px' : '6px 16px',
                                background: 'rgba(0,0,0,0.6)',
                                border: `2px solid ${GOLD_COLOR}`,
                                borderRadius: '8px',
                                animation: 'countdownPulse 0.5s ease-in-out infinite',
                            }}>
                                <span style={{
                                    fontSize: isMobile ? '18px' : '24px',
                                    fontWeight: 900,
                                    color: GOLD_COLOR,
                                    textShadow: `0 0 12px ${GOLD_COLOR}`,
                                    minWidth: isMobile ? '24px' : '32px',
                                    textAlign: 'center',
                                }}>
                                    {countdownSecs}
                                </span>
                            </div>
                        )}

                        {/* Timer + Drop Counter (during active) */}
                        {isActive && (
                            <>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: isMobile ? '5px 10px' : '6px 14px',
                                    background: isCriticalTime ? 'rgba(255,68,68,0.2)' : 'rgba(255,215,0,0.15)',
                                    border: `2px solid ${isCriticalTime ? '#ff4444' : GOLD_COLOR}88`,
                                    borderRadius: '8px',
                                }}>
                                    <Timer size={isMobile ? 16 : 20} color={isCriticalTime ? '#ff4444' : GOLD_COLOR} />
                                    <span style={{
                                        fontSize: isMobile ? '14px' : '18px',
                                        fontWeight: 700,
                                        color: isCriticalTime ? '#ff4444' : GOLD_COLOR,
                                        fontFamily: 'monospace',
                                    }}>
                                        {formatTime(remainingTime)}
                                    </span>
                                </div>
                                <GoldDropCounter count={goldDropCount} isMobile={isMobile} />
                            </>
                        )}

                        {/* Right coin */}
                        <Coins
                            size={isMobile ? 20 : 28}
                            color={GOLD_COLOR}
                            style={{
                                filter: `drop-shadow(0 0 8px ${GOLD_COLOR})`,
                                animation: 'goldPulse 2s ease-in-out infinite',
                                animationDelay: '1s',
                            }}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}

export default memo(GoldRushBanner);