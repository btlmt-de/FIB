// ============================================
// FirstBloodBanner.jsx
// ============================================
// First Blood event banner - race to land first special item
// Features: countdown, timer, winner announcement with item

import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { COLORS, API_BASE_URL } from '../../config/constants.js';
import { useActivity } from '../../context/ActivityContext.jsx';
import { useSound } from '../../context/SoundContext.jsx';
import { Crosshair, Timer, X, Zap, Target, FlaskConical, Swords, Droplet, Sparkles, Diamond, Star, Crown } from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

// Blood/Combat theme
const FB_PRIMARY = '#DC2626';      // Blood Red
const FB_SECONDARY = '#991B1B';    // Dark Blood
const FB_ACCENT = '#FCA5A5';       // Light Red
const FB_BG = '#1C1917';           // Dark background
const FB_BG_DARK = '#0C0A09';      // Darker background
const FB_TEXT = '#FAFAF9';         // Light text
const FB_GOLD = '#F59E0B';         // Gold for rewards

// Rarity colors for winner item display
const RARITY_COLORS = {
    rare: COLORS.red || '#EF4444',
    legendary: COLORS.purple || '#A855F7',
    mythic: COLORS.aqua || '#06B6D4',
    insane: COLORS.insane || '#F59E0B',
};

// ============================================
// Floating Target Decorations
// ============================================
function FloatingTargets({ isMobile }) {
    const decorations = [
        { Icon: Target, left: '6%', size: 0.9, delay: 0 },
        { Icon: Crosshair, left: '14%', size: 0.7, delay: 0.5 },
        { Icon: Zap, left: '10%', size: 0.5, delay: 1.0, top: '25%' },
        { Icon: Droplet, left: '18%', size: 0.55, delay: 1.5, top: '75%' },
        { Icon: Target, right: '6%', size: 0.9, delay: 0.3 },
        { Icon: Crosshair, right: '14%', size: 0.7, delay: 0.8 },
        { Icon: Zap, right: '10%', size: 0.5, delay: 1.3, top: '75%' },
        { Icon: Droplet, right: '18%', size: 0.55, delay: 1.8, top: '25%' },
    ];

    const baseSize = isMobile ? 16 : 24;

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 0,
        }}>
            <style>{`
                @keyframes floatTarget {
                    0%, 100% { transform: translateY(0) scale(1); opacity: 0.2; }
                    50% { transform: translateY(-6px) scale(1.1); opacity: 0.35; }
                }
            `}</style>
            {decorations.map((item, index) => {
                const { Icon, left, right, size, delay, top } = item;
                return (
                    <Icon
                        key={index}
                        size={Math.round(baseSize * size)}
                        color={FB_PRIMARY}
                        style={{
                            position: 'absolute',
                            left: left || 'auto',
                            right: right || 'auto',
                            top: top || '50%',
                            transform: top ? 'none' : 'translateY(-50%)',
                            opacity: 0.25,
                            filter: `drop-shadow(0 0 6px ${FB_PRIMARY})`,
                            animation: `floatTarget ${2.5 + (index % 3) * 0.3}s ease-in-out infinite`,
                            animationDelay: `${delay}s`,
                        }}
                    />
                );
            })}
        </div>
    );
}

// ============================================
// Main First Blood Banner Component
// ============================================
function FirstBloodBanner({ isMobile = false, isAdmin = false }) {
    const { globalEventStatus, updateGlobalEventStatus, firstBloodWinner } = useActivity();
    const { playSound, startFirstBloodSoundtrack, stopFirstBloodSoundtrack } = useSound();

    const [remainingTime, setRemainingTime] = useState(0);
    const [countdownTime, setCountdownTime] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [showWinnerInBanner, setShowWinnerInBanner] = useState(false);

    const hasPlayedSoundRef = useRef(false);
    const hasSoundtrackStartedRef = useRef(false);
    const wasActiveRef = useRef(false);
    const wasPendingRef = useRef(false);
    const winnerDisplayTimeoutRef = useRef(null);

    // Only respond to first_blood events
    const isFirstBlood = globalEventStatus?.type === 'first_blood';
    const isActive = isFirstBlood && globalEventStatus?.active;
    const isPending = isFirstBlood && globalEventStatus?.pending;

    // Start/stop First Blood soundtrack when event starts/ends
    useEffect(() => {
        if (isActive && !hasSoundtrackStartedRef.current) {
            startFirstBloodSoundtrack?.();
            hasSoundtrackStartedRef.current = true;
        }
        if (!isActive && !isPending && hasSoundtrackStartedRef.current) {
            stopFirstBloodSoundtrack?.();
            hasSoundtrackStartedRef.current = false;
        }
    }, [isActive, isPending, startFirstBloodSoundtrack, stopFirstBloodSoundtrack]);

    // Handle winner display
    useEffect(() => {
        if (firstBloodWinner?.winner) {
            console.log('[FirstBlood] Winner received, showing in banner');
            setShowWinnerInBanner(true);
            playSound?.('event_win');

            // Clear any existing timeout
            if (winnerDisplayTimeoutRef.current) {
                clearTimeout(winnerDisplayTimeoutRef.current);
            }

            // Hide banner after showing winner for 6 seconds
            winnerDisplayTimeoutRef.current = setTimeout(() => {
                console.log('[FirstBlood] Hiding banner after winner display');
                setShowWinnerInBanner(false);
                setIsVisible(false);
                // Stop soundtrack when winner display ends
                // Don't reset hasSoundtrackStartedRef - let main useEffect handle it when isActive becomes false
                // This prevents race condition where soundtrack restarts if isActive is still true momentarily
                stopFirstBloodSoundtrack?.();
            }, 6000);
        } else if (firstBloodWinner?.noWinner) {
            // No winner - time ran out
            console.log('[FirstBlood] No winner - time expired');
            setIsVisible(false);
            // Stop soundtrack when event ends with no winner
            stopFirstBloodSoundtrack?.();
        }

        return () => {
            if (winnerDisplayTimeoutRef.current) {
                clearTimeout(winnerDisplayTimeoutRef.current);
            }
        };
    }, [firstBloodWinner, playSound, stopFirstBloodSoundtrack]);

    // Handle visibility and sound
    useEffect(() => {
        if (isPending && !wasPendingRef.current && !isActive) {
            console.log('[FirstBlood] Starting countdown phase');
            setIsVisible(true);
            wasPendingRef.current = true;
        } else if (isActive && !wasActiveRef.current) {
            console.log('[FirstBlood] Event now ACTIVE - race begins!');
            setIsVisible(true);
            if (!hasPlayedSoundRef.current) {
                playSound?.('event_start');
                hasPlayedSoundRef.current = true;
            }
            wasActiveRef.current = true;
            wasPendingRef.current = false;
        } else if (!isActive && !isPending && (wasActiveRef.current || wasPendingRef.current)) {
            // Only hide if we're not showing a winner
            if (!showWinnerInBanner) {
                console.log('[FirstBlood] Event ENDED');
                setIsVisible(false);
                // Stop soundtrack when event ends (e.g., admin ended it)
                // Main useEffect will handle hasSoundtrackStartedRef reset
                stopFirstBloodSoundtrack?.();
            }
            hasPlayedSoundRef.current = false;
            wasActiveRef.current = false;
            wasPendingRef.current = false;
        }
    }, [isActive, isPending, playSound, showWinnerInBanner, stopFirstBloodSoundtrack]);

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

            // Fallback: if timer hits 0, hide banner and stop music even if SSE hasn't arrived
            if (remaining <= 0 && isVisible && !showWinnerInBanner) {
                console.log('[FirstBlood] Timer expired - hiding banner (fallback)');
                setIsVisible(false);
                hasPlayedSoundRef.current = false;
                wasActiveRef.current = false;
                wasPendingRef.current = false;
                // Stop soundtrack - SSE might not arrive in time
                // Don't reset hasSoundtrackStartedRef to prevent restart race condition
                stopFirstBloodSoundtrack?.();
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 100);
        return () => clearInterval(interval);
    }, [isActive, globalEventStatus?.expiresAt, isVisible, showWinnerInBanner, stopFirstBloodSoundtrack]);

    // Admin trigger function
    const triggerTestEvent = useCallback(async (duration = 2) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/global-event/trigger`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: 'first_blood',
                    duration: duration,
                }),
            });
            const data = await res.json();
            if (data.error) {
                alert(`Failed: ${data.error}`);
            } else if (data.event) {
                updateGlobalEventStatus?.(data.event);
            }
        } catch (e) {
            console.error('[FirstBlood] Trigger error:', e);
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
            console.error('[FirstBlood] End error:', e);
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
        : 5 * 60 * 1000;
    const isCriticalTime = remainingTime > 0 && remainingTime < 30000;
    const countdownSecs = Math.ceil(countdownTime / 1000);

    // Determine if we should show the banner
    const shouldShowBanner = isVisible || showWinnerInBanner;

    if (!shouldShowBanner) return null;

    return (
        <>
            {/* Banner */}
            {shouldShowBanner && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    animation: 'slideDownFB 0.4s ease-out forwards',
                }}>
                    <style>{`
                        @keyframes slideDownFB {
                            from { transform: translateY(-100%); opacity: 0; }
                            to { transform: translateY(0); opacity: 1; }
                        }
                        @keyframes bloodPulse {
                            0%, 100% { filter: drop-shadow(0 0 8px ${FB_PRIMARY}); }
                            50% { filter: drop-shadow(0 0 20px ${FB_PRIMARY}); }
                        }
                        @keyframes heartbeat {
                            0%, 100% { transform: scale(1); }
                            15% { transform: scale(1.15); }
                            30% { transform: scale(1); }
                            45% { transform: scale(1.1); }
                        }
                        @keyframes countdownPulseFB {
                            0%, 100% { box-shadow: 0 0 10px ${FB_PRIMARY}44; }
                            50% { box-shadow: 0 0 20px ${FB_PRIMARY}88, 0 0 30px ${FB_PRIMARY}44; }
                        }
                        @keyframes bloodShimmer {
                            0% { background-position: -200% 0; }
                            100% { background-position: 200% 0; }
                        }
                        @keyframes winnerGlowFB {
                            0%, 100% { text-shadow: 0 0 20px ${FB_PRIMARY}88; }
                            50% { text-shadow: 0 0 40px ${FB_PRIMARY}, 0 0 60px ${FB_PRIMARY}66; }
                        }
                        @keyframes fadeInFB {
                            from { opacity: 0; transform: translateY(-10px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>

                    {/* Banner Content */}
                    <div style={{
                        background: `linear-gradient(180deg, ${FB_BG} 0%, ${FB_BG_DARK} 50%, ${FB_BG} 100%)`,
                        padding: isMobile ? '12px 12px 14px 12px' : '18px 32px 20px 32px',
                        borderBottom: `2px solid ${FB_PRIMARY}`,
                        overflow: 'visible',
                        position: 'relative',
                    }}>
                        {/* Floating decorations */}
                        <FloatingTargets isMobile={isMobile} />

                        {/* Blood shimmer overlay */}
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: `linear-gradient(90deg, transparent 0%, ${FB_PRIMARY}08 30%, ${FB_TEXT}08 50%, ${FB_PRIMARY}08 70%, transparent 100%)`,
                            backgroundSize: '200% 100%',
                            animation: 'bloodShimmer 4s ease-in-out infinite',
                            pointerEvents: 'none',
                        }} />

                        {/* Bottom glow */}
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '2px',
                            background: FB_PRIMARY,
                            boxShadow: `0 0 15px ${FB_PRIMARY}, 0 0 30px ${FB_PRIMARY}88`,
                        }} />

                        {/* Content */}
                        <div style={{
                            position: 'relative',
                            zIndex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: isMobile ? '8px' : '12px',
                        }}>
                            {/* Winner Display Mode */}
                            {showWinnerInBanner && firstBloodWinner?.winner ? (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: isMobile ? '6px' : '10px',
                                    animation: 'fadeInFB 0.5s ease-out',
                                }}>
                                    {/* Winner header row */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: isMobile ? '10px' : '16px',
                                    }}>
                                        <Crosshair
                                            size={isMobile ? 28 : 40}
                                            color={FB_PRIMARY}
                                            style={{
                                                filter: `drop-shadow(0 0 15px ${FB_PRIMARY})`,
                                                animation: 'bloodPulse 1s ease-in-out infinite',
                                            }}
                                        />
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{
                                                fontSize: isMobile ? '11px' : '14px',
                                                fontWeight: 700,
                                                color: FB_PRIMARY,
                                                letterSpacing: '2px',
                                                marginBottom: '2px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                            }}>
                                                <Target size={isMobile ? 14 : 18} /> FIRST BLOOD <Target size={isMobile ? 14 : 18} />
                                            </div>
                                            <div style={{
                                                fontSize: isMobile ? '20px' : '28px',
                                                fontWeight: 900,
                                                color: FB_TEXT,
                                                animation: 'winnerGlowFB 2s ease-in-out infinite',
                                            }}>
                                                {firstBloodWinner.winner.username}
                                            </div>
                                        </div>
                                        <Crosshair
                                            size={isMobile ? 28 : 40}
                                            color={FB_PRIMARY}
                                            style={{
                                                filter: `drop-shadow(0 0 15px ${FB_PRIMARY})`,
                                                animation: 'bloodPulse 1s ease-in-out infinite',
                                                animationDelay: '0.5s',
                                            }}
                                        />
                                    </div>

                                    {/* Winner stats - item + lucky spins */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: isMobile ? '16px' : '24px',
                                        fontSize: isMobile ? '12px' : '14px',
                                        color: FB_ACCENT,
                                    }}>
                                        <span style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}>
                                            Unboxed{' '}
                                            <strong style={{
                                                color: RARITY_COLORS[firstBloodWinner.winner.itemRarity] || FB_PRIMARY,
                                                textShadow: `0 0 8px ${RARITY_COLORS[firstBloodWinner.winner.itemRarity] || FB_PRIMARY}66`,
                                            }}>
                                                {firstBloodWinner.winner.item}
                                            </strong>
                                        </span>
                                        <span style={{ color: FB_PRIMARY, opacity: 0.6 }}>|</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Sparkles size={14} color={FB_GOLD} />{' '}
                                            <strong style={{ color: FB_GOLD }}>{firstBloodWinner.winner.luckySpinsAwarded}</strong>{' '}
                                            Lucky Spins Awarded!
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                /* Normal Active/Pending Mode */
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: isMobile ? '10px' : '18px',
                                    flexWrap: 'wrap',
                                }}>
                                    {/* Left icon */}
                                    <Crosshair
                                        size={isMobile ? 22 : 30}
                                        color={FB_PRIMARY}
                                        style={{
                                            animation: 'bloodPulse 2s ease-in-out infinite',
                                        }}
                                    />

                                    {/* Title */}
                                    <span style={{
                                        fontSize: isMobile ? '13px' : '18px',
                                        fontWeight: 800,
                                        color: FB_TEXT,
                                        textShadow: `0 0 20px ${FB_PRIMARY}88`,
                                        letterSpacing: isMobile ? '1px' : '2px',
                                    }}>
                                        FIRST BLOOD
                                    </span>

                                    {/* Countdown (during pending) */}
                                    {isPending && !isActive && (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: isMobile ? '4px 12px' : '6px 16px',
                                            background: FB_BG_DARK,
                                            border: `2px solid ${FB_PRIMARY}`,
                                            borderRadius: '8px',
                                            animation: 'countdownPulseFB 0.5s ease-in-out infinite',
                                        }}>
                                            <Swords size={isMobile ? 16 : 20} color={FB_PRIMARY} />
                                            <span style={{
                                                fontSize: isMobile ? '18px' : '24px',
                                                fontWeight: 900,
                                                color: FB_PRIMARY,
                                                textShadow: `0 0 12px ${FB_PRIMARY}`,
                                            }}>
                                                {countdownSecs}
                                            </span>
                                        </div>
                                    )}

                                    {/* Status indicator (during active) */}
                                    {isActive && (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: isMobile ? '6px 12px' : '8px 16px',
                                            background: FB_BG_DARK,
                                            borderRadius: '8px',
                                            border: `2px solid ${FB_PRIMARY}66`,
                                        }}>
                                            <Swords size={isMobile ? 16 : 20} color={FB_ACCENT} style={{
                                                filter: `drop-shadow(0 0 4px ${FB_PRIMARY})`,
                                            }} />
                                            <span style={{
                                                fontSize: isMobile ? '11px' : '14px',
                                                fontWeight: 600,
                                                color: FB_ACCENT,
                                                textTransform: 'uppercase',
                                                letterSpacing: '1px',
                                            }}>
                                                Race Active
                                            </span>
                                        </div>
                                    )}

                                    {/* Timer (during active) */}
                                    {isActive && (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: isMobile ? '5px 10px' : '6px 14px',
                                            background: isCriticalTime ? 'rgba(255,68,68,0.2)' : FB_BG_DARK,
                                            border: `2px solid ${isCriticalTime ? '#ff4444' : FB_PRIMARY}88`,
                                            borderRadius: '8px',
                                        }}>
                                            <Timer size={isMobile ? 16 : 20} color={isCriticalTime ? '#ff4444' : FB_PRIMARY} />
                                            <span style={{
                                                fontSize: isMobile ? '14px' : '18px',
                                                fontWeight: 700,
                                                color: isCriticalTime ? '#ff4444' : FB_TEXT,
                                                fontFamily: 'monospace',
                                            }}>
                                                {formatTime(remainingTime)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Prize indicator */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: isMobile ? '5px 10px' : '6px 14px',
                                        background: FB_BG_DARK,
                                        border: `2px solid ${FB_GOLD}66`,
                                        borderRadius: '8px',
                                    }}>
                                        <Zap size={isMobile ? 16 : 20} color={FB_GOLD} style={{
                                            filter: `drop-shadow(0 0 4px ${FB_GOLD})`,
                                        }} />
                                        <span style={{
                                            fontSize: isMobile ? '12px' : '14px',
                                            fontWeight: 700,
                                            color: FB_GOLD,
                                            textShadow: `0 0 6px ${FB_GOLD}44`,
                                        }}>
                                            9-25 Lucky Spins
                                        </span>
                                    </div>

                                    {/* Right icon */}
                                    <Crosshair
                                        size={isMobile ? 22 : 30}
                                        color={FB_PRIMARY}
                                        style={{
                                            animation: 'bloodPulse 2s ease-in-out infinite',
                                            animationDelay: '1s',
                                        }}
                                    />
                                </div>
                            )}

                            {/* Explanation text - shows during active phase */}
                            {isActive && !showWinnerInBanner && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: isMobile ? '6px' : '12px',
                                    fontSize: isMobile ? '10px' : '12px',
                                    color: FB_ACCENT,
                                    opacity: 0.9,
                                    marginTop: isMobile ? '6px' : '8px',
                                    flexWrap: 'wrap',
                                }}>
                                    <span style={{ color: FB_TEXT, fontWeight: 600 }}>Race:</span>
                                    <span>First to land <strong style={{ color: '#EF4444' }}>Rare</strong> or higher wins!</span>
                                    <span style={{ color: FB_PRIMARY, opacity: 0.5 }}>|</span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Diamond size={isMobile ? 10 : 12} color="#EF4444" /> 9-12</span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Star size={isMobile ? 10 : 12} color="#A855F7" /> 13-16</span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Sparkles size={isMobile ? 10 : 12} color="#06B6D4" /> 17-20</span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Crown size={isMobile ? 10 : 12} color={FB_GOLD} /> 20-25</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Admin End Button */}
            {isAdmin && isActive && (
                <button
                    onClick={endTestEvent}
                    style={{
                        position: 'fixed',
                        top: isMobile ? '90px' : '100px',
                        right: '20px',
                        zIndex: 101,
                        background: FB_PRIMARY,
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: '#fff',
                        fontWeight: 700,
                    }}
                >
                    End First Blood
                </button>
            )}
        </>
    );
}

export default memo(FirstBloodBanner);