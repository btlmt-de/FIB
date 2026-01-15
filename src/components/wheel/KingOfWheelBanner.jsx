// ============================================
// KingOfWheelBanner.jsx
// ============================================
// King of the Wheel event banner with competition leaderboard
// Features: live leaderboard, point tracking, winner celebration

import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { COLORS, API_BASE_URL } from '../../config/constants.js';
import { useActivity } from '../../context/ActivityContext.jsx';
import { useSound } from '../../context/SoundContext.jsx';
import { Crown, Trophy, Medal, Star, Timer, X, Swords, Sparkles, TrendingUp, Info } from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

// Crimson Obsidian theme (aggressive/competitive)
const KOTW_BG = '#1E293B';        // Cool Slate Grey
const KOTW_BG_DARK = '#0F172A';   // Dark Graphite (depth)
const KOTW_PRIMARY = '#F43F5E';   // Vivid Crimson/Blood Orange
const KOTW_TEXT = '#F8FAFC';      // Ice White
const KOTW_GOLD = '#F59E0B';      // Gold for 1st place
const KOTW_SILVER = '#94A3B8';    // Silver for 2nd
const KOTW_BRONZE = '#D97706';    // Bronze for 3rd

// ============================================
// Floating Crown Decorations
// ============================================
function FloatingCrowns({ isMobile }) {
    const decorations = [
        { Icon: Crown, left: '6%', size: 0.9, delay: 0, color: KOTW_PRIMARY },
        { Icon: Trophy, left: '14%', size: 0.7, delay: 0.5, color: KOTW_SILVER },
        { Icon: Medal, left: '10%', size: 0.5, delay: 1.0, color: KOTW_PRIMARY, top: '25%' },
        { Icon: Star, left: '18%', size: 0.55, delay: 1.5, color: KOTW_TEXT, top: '75%' },
        { Icon: Crown, right: '6%', size: 0.9, delay: 0.3, color: KOTW_PRIMARY },
        { Icon: Trophy, right: '14%', size: 0.7, delay: 0.8, color: KOTW_SILVER },
        { Icon: Medal, right: '10%', size: 0.5, delay: 1.3, color: KOTW_PRIMARY, top: '75%' },
        { Icon: Star, right: '18%', size: 0.55, delay: 1.8, color: KOTW_TEXT, top: '25%' },
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
                @keyframes floatCrown {
                    0%, 100% { transform: translateY(0) rotate(-5deg); opacity: 0.25; }
                    50% { transform: translateY(-8px) rotate(5deg); opacity: 0.4; }
                }
                .lucky-spin-info:hover .lucky-spin-tooltip {
                    opacity: 1 !important;
                    visibility: visible !important;
                }
            `}</style>
            {decorations.map((item, index) => {
                const { Icon, left, right, size, delay, color, top } = item;
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
                            filter: `drop-shadow(0 0 6px ${color})`,
                            animation: `floatCrown ${2.5 + (index % 3) * 0.3}s ease-in-out infinite`,
                            animationDelay: `${delay}s`,
                        }}
                    />
                );
            })}
        </div>
    );
}

// ============================================
// Mini Leaderboard Display
// ============================================
function MiniLeaderboard({ leaderboard, currentUserId, isMobile }) {
    if (!leaderboard || leaderboard.length === 0) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: isMobile ? '4px 10px' : '6px 14px',
                background: KOTW_BG_DARK,
                borderRadius: '8px',
                border: `1px solid ${KOTW_PRIMARY}44`,
            }}>
                <Swords size={isMobile ? 14 : 18} color={KOTW_PRIMARY} />
                <span style={{
                    fontSize: isMobile ? '11px' : '13px',
                    color: KOTW_SILVER,
                    fontStyle: 'italic',
                }}>
                    Waiting for spins...
                </span>
            </div>
        );
    }

    const top3 = leaderboard.slice(0, 3);
    const rankColors = [KOTW_GOLD, KOTW_SILVER, KOTW_BRONZE];
    const rankIcons = [Crown, Trophy, Medal];

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '6px' : '10px',
            padding: isMobile ? '4px 8px' : '6px 12px',
            background: KOTW_BG_DARK,
            borderRadius: '8px',
            border: `1px solid ${KOTW_PRIMARY}44`,
        }}>
            {top3.map((entry, index) => {
                const RankIcon = rankIcons[index];
                const color = rankColors[index];
                const isCurrentUser = entry.userId === currentUserId;

                return (
                    <div
                        key={entry.userId}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: isMobile ? '2px 6px' : '3px 8px',
                            background: isCurrentUser ? `${color}33` : 'transparent',
                            borderRadius: '6px',
                            border: isCurrentUser ? `1px solid ${color}` : '1px solid transparent',
                        }}
                    >
                        <RankIcon size={isMobile ? 12 : 16} color={color} />
                        <span style={{
                            fontSize: isMobile ? '10px' : '12px',
                            fontWeight: 700,
                            color: color,
                            maxWidth: isMobile ? '50px' : '70px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            {entry.username}
                        </span>
                        <span style={{
                            fontSize: isMobile ? '9px' : '11px',
                            color: `${color}cc`,
                            fontFamily: 'monospace',
                        }}>
                            {entry.points}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

const rankColors = [KOTW_GOLD, KOTW_SILVER, KOTW_BRONZE];

// ============================================
// User Stats Display
// ============================================
function UserStatsDisplay({ stats, isMobile }) {
    if (!stats || stats.points === 0) return null;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '6px' : '8px',
            padding: isMobile ? '4px 10px' : '6px 14px',
            background: KOTW_BG_DARK,
            borderRadius: '8px',
            border: `2px solid ${KOTW_PRIMARY}88`,
        }}>
            <TrendingUp size={isMobile ? 14 : 18} color={KOTW_PRIMARY} />
            <span style={{
                fontSize: isMobile ? '14px' : '18px',
                fontWeight: 900,
                color: KOTW_TEXT,
                fontFamily: 'monospace',
            }}>
                {stats.points}
            </span>
            <span style={{
                fontSize: isMobile ? '10px' : '12px',
                color: KOTW_SILVER,
            }}>
                pts
            </span>
            {stats.rank && (
                <span style={{
                    fontSize: isMobile ? '10px' : '12px',
                    color: stats.rank <= 3 ? rankColors[stats.rank - 1] : KOTW_TEXT,
                    fontWeight: 700,
                }}>
                    #{stats.rank}
                </span>
            )}
        </div>
    );
}

// ============================================
// Winner Celebration Overlay
// ============================================
function WinnerCelebration({ winner, onClose, isMobile }) {
    if (!winner) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.5s ease-out',
        }}>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes crownBounce {
                    0%, 100% { transform: translateY(0) rotate(-5deg); }
                    50% { transform: translateY(-20px) rotate(5deg); }
                }
                @keyframes sparkle {
                    0%, 100% { opacity: 0; transform: scale(0); }
                    50% { opacity: 1; transform: scale(1); }
                }
            `}</style>

            <div style={{
                textAlign: 'center',
                padding: isMobile ? '24px' : '48px',
                background: `linear-gradient(180deg, ${KOTW_BG} 0%, ${KOTW_BG_DARK} 100%)`,
                borderRadius: '20px',
                border: `3px solid ${KOTW_PRIMARY}`,
                boxShadow: `0 0 60px ${KOTW_PRIMARY}44, 0 0 120px ${KOTW_PRIMARY}22`,
                position: 'relative',
                maxWidth: '90vw',
            }}>
                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        padding: '8px',
                        cursor: 'pointer',
                    }}
                >
                    <X size={20} color={KOTW_TEXT} />
                </button>

                {/* Crown */}
                <Crown
                    size={isMobile ? 60 : 100}
                    color={KOTW_PRIMARY}
                    style={{
                        filter: `drop-shadow(0 0 30px ${KOTW_PRIMARY})`,
                        animation: 'crownBounce 2s ease-in-out infinite',
                        marginBottom: '16px',
                    }}
                />

                {/* Title */}
                <h2 style={{
                    fontSize: isMobile ? '24px' : '36px',
                    fontWeight: 900,
                    color: KOTW_PRIMARY,
                    textShadow: `0 0 20px ${KOTW_PRIMARY}88`,
                    margin: '0 0 8px 0',
                    letterSpacing: '3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                }}>
                    <Crown size={isMobile ? 24 : 36} /> KING OF THE WHEEL <Crown size={isMobile ? 24 : 36} />
                </h2>

                {/* Winner name */}
                <p style={{
                    fontSize: isMobile ? '28px' : '42px',
                    fontWeight: 900,
                    color: KOTW_TEXT,
                    textShadow: `0 0 15px ${KOTW_PRIMARY}`,
                    margin: '16px 0',
                }}>
                    {winner.winner?.username || 'No Winner'}
                </p>

                {/* Stats */}
                {winner.winner && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '24px',
                        marginTop: '16px',
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{
                                fontSize: isMobile ? '32px' : '48px',
                                fontWeight: 900,
                                color: KOTW_PRIMARY,
                                margin: 0,
                            }}>
                                {winner.winner.points}
                            </p>
                            <p style={{
                                fontSize: isMobile ? '12px' : '14px',
                                color: KOTW_SILVER,
                                margin: 0,
                            }}>
                                POINTS
                            </p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{
                                fontSize: isMobile ? '32px' : '48px',
                                fontWeight: 900,
                                color: '#50fa7b',
                                margin: 0,
                            }}>
                                +{winner.winner.luckySpinsAwarded}
                            </p>
                            <p style={{
                                fontSize: isMobile ? '12px' : '14px',
                                color: KOTW_SILVER,
                                margin: 0,
                            }}>
                                LUCKY SPINS
                            </p>
                        </div>
                    </div>
                )}

                {/* Runner ups */}
                {winner.leaderboard && winner.leaderboard.length > 1 && (
                    <div style={{
                        marginTop: '24px',
                        padding: '16px',
                        background: KOTW_BG_DARK,
                        borderRadius: '12px',
                    }}>
                        <p style={{
                            fontSize: isMobile ? '12px' : '14px',
                            color: '#888',
                            margin: '0 0 12px 0',
                        }}>
                            FINAL STANDINGS
                        </p>
                        {winner.leaderboard.slice(1, 4).map((entry, index) => (
                            <div
                                key={entry.userId}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    borderBottom: index < 2 ? '1px solid #333' : 'none',
                                }}
                            >
                                <span style={{
                                    color: rankColors[index + 1] || '#888',
                                    fontWeight: 700,
                                }}>
                                    #{index + 2} {entry.username}
                                </span>
                                <span style={{
                                    color: '#aaa',
                                    fontFamily: 'monospace',
                                }}>
                                    {entry.points} pts
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// Main Banner Component
// ============================================
function KingOfWheelBanner({
                               isMobile = false,
                               isAdmin = false,
                               currentUserId = null,
                           }) {
    const { globalEventStatus, updateGlobalEventStatus, kotwLeaderboard, kotwUserStats, kotwWinner } = useActivity();
    const { playSfx, startKotwSoundtrack, stopKotwSoundtrack } = useSound();

    const [remainingTime, setRemainingTime] = useState(0);
    const [countdownTime, setCountdownTime] = useState(0);
    const [showWinnerInBanner, setShowWinnerInBanner] = useState(false);

    const hasPlayedSoundRef = useRef(false);
    const wasActiveRef = useRef(false);
    const wasPendingRef = useRef(false);
    const winnerTimeoutRef = useRef(null);

    const isKotw = globalEventStatus?.type === 'king_of_wheel';
    const isActive = isKotw && globalEventStatus?.active;
    const isPending = isKotw && globalEventStatus?.pending;

    // Check if we've already shown this winner (persisted in localStorage)
    const getShownWinnerId = () => {
        try {
            return localStorage.getItem('kotw-shown-winner-id');
        } catch {
            return null;
        }
    };

    const setShownWinnerId = (id) => {
        try {
            if (id) {
                localStorage.setItem('kotw-shown-winner-id', id);
            } else {
                localStorage.removeItem('kotw-shown-winner-id');
            }
        } catch {
            // Ignore localStorage errors
        }
    };

    // Clear shown winner when a new event starts (using activatesAt as unique ID)
    useEffect(() => {
        const currentEventId = globalEventStatus?.activatesAt?.toString();
        const shownWinnerId = getShownWinnerId();

        // If this is a new event (different activatesAt), clear the shown winner flag
        if (currentEventId && shownWinnerId && !shownWinnerId.startsWith(currentEventId)) {
            setShownWinnerId(null);
        }
    }, [globalEventStatus?.activatesAt]);

    // Start/stop KOTW soundtrack when event starts/ends
    useEffect(() => {
        if (isActive && !hasPlayedSoundRef.current) {
            startKotwSoundtrack?.();
            hasPlayedSoundRef.current = true;
        }
        if (!isActive && !isPending && hasPlayedSoundRef.current) {
            stopKotwSoundtrack?.();
            hasPlayedSoundRef.current = false;
        }
    }, [isActive, isPending, startKotwSoundtrack, stopKotwSoundtrack]);

    // Show winner in banner when winner is announced
    useEffect(() => {
        // Clear any existing timeout
        if (winnerTimeoutRef.current) {
            clearTimeout(winnerTimeoutRef.current);
            winnerTimeoutRef.current = null;
        }

        if (kotwWinner?.winner) {
            // Use eventId if available, otherwise use timestamp (fallback)
            const eventId = kotwWinner.eventId || Date.now();
            const winnerId = `${eventId}-${kotwWinner.winner.userId}`;
            const alreadyShown = getShownWinnerId() === winnerId;

            if (!alreadyShown) {
                setShownWinnerId(winnerId);
                setShowWinnerInBanner(true);
                playSfx?.('mythic'); // Play big win sound

                // Hide banner after 6 seconds
                winnerTimeoutRef.current = setTimeout(() => {
                    setShowWinnerInBanner(false);
                }, 6000);
            }
        }

        return () => {
            if (winnerTimeoutRef.current) {
                clearTimeout(winnerTimeoutRef.current);
            }
        };
    }, [kotwWinner, playSfx]);

    // Determine if banner should be visible
    const shownWinnerId = getShownWinnerId();
    const currentEventId = kotwWinner?.eventId?.toString() || '';
    const hasShownWinner = shownWinnerId && currentEventId && shownWinnerId.startsWith(currentEventId);

    const shouldShowBanner = hasShownWinner
        ? showWinnerInBanner
        : (isPending || isActive);

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
            // Note: visibility is handled by the main visibility useEffect when isActive changes
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [isActive, globalEventStatus?.expiresAt]);

    // Admin test functions
    const triggerTestEvent = useCallback(async () => {
        try {
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
            if (data.error) {
                alert(`Failed: ${data.error}`);
            } else if (data.event) {
                updateGlobalEventStatus?.(data.event);
            }
        } catch (e) {
            console.error('[KOTW] Trigger error:', e);
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
            console.error('[KOTW] End error:', e);
        }
    }, [updateGlobalEventStatus]);

    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const countdownSecs = Math.ceil(countdownTime / 1000);
    const isCriticalTime = remainingTime > 0 && remainingTime < 60000;

    // Don't render if not visible
    if (!shouldShowBanner) return null;

    return (
        <>
            {/* Banner - only render when should show */}
            {shouldShowBanner && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    animation: 'slideDown 0.4s ease-out forwards',
                }}>
                    <style>{`
                    @keyframes slideDown {
                        from { transform: translateY(-100%); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                    @keyframes slideUp {
                        from { transform: translateY(0); opacity: 1; }
                        to { transform: translateY(-100%); opacity: 0; }
                    }
                    @keyframes crownPulse {
                        0%, 100% { filter: drop-shadow(0 0 8px ${KOTW_PRIMARY}); }
                        50% { filter: drop-shadow(0 0 20px ${KOTW_PRIMARY}); }
                    }
                    @keyframes royalShimmer {
                        0% { background-position: -200% 0; }
                        100% { background-position: 200% 0; }
                    }
                    .lucky-spin-info:hover .lucky-spin-tooltip {
                        opacity: 1 !important;
                        visibility: visible !important;
                    }
                `}</style>

                    {/* Banner Content */}
                    <div style={{
                        background: `linear-gradient(180deg, ${KOTW_BG} 0%, ${KOTW_BG_DARK} 50%, ${KOTW_BG} 100%)`,
                        padding: isMobile ? '12px 12px 14px 12px' : '18px 32px 20px 32px',
                        borderBottom: `2px solid ${KOTW_PRIMARY}`,
                        overflow: 'visible',
                        position: 'relative',
                    }}>
                        {/* Floating decorations */}
                        <FloatingCrowns isMobile={isMobile} />

                        {/* Crimson shimmer overlay */}
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: `linear-gradient(90deg, transparent 0%, ${KOTW_PRIMARY}08 30%, ${KOTW_TEXT}08 50%, ${KOTW_PRIMARY}08 70%, transparent 100%)`,
                            backgroundSize: '200% 100%',
                            animation: 'royalShimmer 4s ease-in-out infinite',
                            pointerEvents: 'none',
                        }} />

                        {/* Bottom glow */}
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '2px',
                            background: KOTW_PRIMARY,
                            boxShadow: `0 0 15px ${KOTW_PRIMARY}, 0 0 30px ${KOTW_PRIMARY}88`,
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
                            {showWinnerInBanner && kotwWinner?.winner ? (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: isMobile ? '6px' : '10px',
                                    animation: 'fadeIn 0.5s ease-out',
                                }}>
                                    <style>{`
                                    @keyframes fadeIn {
                                        from { opacity: 0; transform: translateY(-10px); }
                                        to { opacity: 1; transform: translateY(0); }
                                    }
                                    @keyframes winnerGlow {
                                        0%, 100% { text-shadow: 0 0 20px ${KOTW_GOLD}88; }
                                        50% { text-shadow: 0 0 40px ${KOTW_GOLD}, 0 0 60px ${KOTW_GOLD}66; }
                                    }
                                `}</style>

                                    {/* Winner header row */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: isMobile ? '10px' : '16px',
                                    }}>
                                        <Crown
                                            size={isMobile ? 28 : 40}
                                            color={KOTW_GOLD}
                                            style={{
                                                filter: `drop-shadow(0 0 15px ${KOTW_GOLD})`,
                                                animation: 'crownPulse 1s ease-in-out infinite',
                                            }}
                                        />
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{
                                                fontSize: isMobile ? '11px' : '14px',
                                                fontWeight: 700,
                                                color: KOTW_PRIMARY,
                                                letterSpacing: '2px',
                                                marginBottom: '2px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                            }}>
                                                <Crown size={isMobile ? 14 : 18} /> WINNER <Crown size={isMobile ? 14 : 18} />
                                            </div>
                                            <div style={{
                                                fontSize: isMobile ? '20px' : '28px',
                                                fontWeight: 900,
                                                color: KOTW_TEXT,
                                                animation: 'winnerGlow 2s ease-in-out infinite',
                                            }}>
                                                {kotwWinner.winner.username}
                                            </div>
                                        </div>
                                        <Crown
                                            size={isMobile ? 28 : 40}
                                            color={KOTW_GOLD}
                                            style={{
                                                filter: `drop-shadow(0 0 15px ${KOTW_GOLD})`,
                                                animation: 'crownPulse 1s ease-in-out infinite',
                                                animationDelay: '0.5s',
                                            }}
                                        />
                                    </div>

                                    {/* Winner stats */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: isMobile ? '16px' : '24px',
                                        fontSize: isMobile ? '12px' : '14px',
                                        color: KOTW_SILVER,
                                    }}>
                                    <span>
                                        <strong style={{ color: KOTW_GOLD }}>{kotwWinner.winner.points?.toLocaleString()}</strong> points
                                    </span>
                                        <span style={{ color: KOTW_PRIMARY, opacity: 0.6 }}>|</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Sparkles size={14} color="#22C55E" /> <strong style={{ color: '#22C55E' }}>{kotwWinner.winner.luckySpinsAwarded}</strong> Lucky Spins Awarded!
                                    </span>
                                    </div>
                                </div>
                            ) : (
                                /* Normal Active/Pending Mode */
                                <>
                                    {/* Main row */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: isMobile ? '10px' : '18px',
                                        flexWrap: 'wrap',
                                    }}>
                                        {/* Crown icon */}
                                        <Crown
                                            size={isMobile ? 22 : 30}
                                            color={KOTW_PRIMARY}
                                            style={{
                                                animation: 'crownPulse 2s ease-in-out infinite',
                                            }}
                                        />

                                        {/* Title */}
                                        <span style={{
                                            fontSize: isMobile ? '13px' : '18px',
                                            fontWeight: 800,
                                            color: KOTW_TEXT,
                                            textShadow: `0 0 20px ${KOTW_PRIMARY}88`,
                                            letterSpacing: isMobile ? '1px' : '2px',
                                        }}>
                                        KING OF THE WHEEL
                                    </span>

                                        {/* Countdown (pending) */}
                                        {isPending && !isActive && (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: isMobile ? '4px 12px' : '6px 16px',
                                                background: KOTW_BG_DARK,
                                                border: `2px solid ${KOTW_PRIMARY}`,
                                                borderRadius: '8px',
                                                animation: 'pulse 0.5s ease-in-out infinite',
                                            }}>
                                                <Swords size={isMobile ? 16 : 20} color={KOTW_PRIMARY} />
                                                <span style={{
                                                    fontSize: isMobile ? '18px' : '24px',
                                                    fontWeight: 900,
                                                    color: KOTW_PRIMARY,
                                                    textShadow: `0 0 12px ${KOTW_PRIMARY}`,
                                                }}>
                                                {countdownSecs}
                                            </span>
                                            </div>
                                        )}

                                        {/* Timer (active) */}
                                        {isActive && (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: isMobile ? '5px 10px' : '6px 14px',
                                                background: isCriticalTime ? 'rgba(255,68,68,0.2)' : KOTW_BG_DARK,
                                                border: `2px solid ${isCriticalTime ? '#ff4444' : KOTW_PRIMARY}88`,
                                                borderRadius: '8px',
                                            }}>
                                                <Timer size={isMobile ? 16 : 20} color={isCriticalTime ? '#ff4444' : KOTW_PRIMARY} />
                                                <span style={{
                                                    fontSize: isMobile ? '14px' : '18px',
                                                    fontWeight: 700,
                                                    color: isCriticalTime ? '#ff4444' : KOTW_TEXT,
                                                    fontFamily: 'monospace',
                                                }}>
                                                {formatTime(remainingTime)}
                                            </span>
                                            </div>
                                        )}

                                        {/* Crown icon (right) */}
                                        <Crown
                                            size={isMobile ? 22 : 30}
                                            color={KOTW_PRIMARY}
                                            style={{
                                                animation: 'crownPulse 2s ease-in-out infinite',
                                                animationDelay: '1s',
                                            }}
                                        />
                                    </div>

                                    {/* Point system explanation - only show during active phase */}
                                    {isActive && (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: isMobile ? '8px' : '16px',
                                            flexWrap: 'wrap',
                                            fontSize: isMobile ? '10px' : '12px',
                                            color: KOTW_SILVER,
                                            opacity: 0.9,
                                        }}>
                                            <span style={{ color: KOTW_TEXT, fontWeight: 600 }}>Points:</span>
                                            <span>Common <strong style={{ color: KOTW_TEXT }}>1pt</strong></span>
                                            <span style={{ color: KOTW_PRIMARY, opacity: 0.5 }}>|</span>
                                            <span>Rare <strong style={{ color: '#EF4444' }}>~150pt</strong></span>
                                            <span style={{ color: KOTW_PRIMARY, opacity: 0.5 }}>|</span>
                                            <span>Legendary <strong style={{ color: '#A855F7' }}>~500pt</strong></span>
                                            <span style={{ color: KOTW_PRIMARY, opacity: 0.5 }}>|</span>
                                            <span>Mythic <strong style={{ color: '#06B6D4' }}>~3kpt</strong></span>
                                            <span style={{ color: KOTW_PRIMARY, opacity: 0.5 }}>|</span>
                                            <span>Insane <strong style={{ color: KOTW_GOLD }}>~100k pt</strong></span>
                                            {!isMobile && (
                                                <>
                                                    <span style={{ color: KOTW_PRIMARY, margin: '0 4px', opacity: 0.5 }}>|</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
                                                    <Sparkles size={12} color="#22C55E" /> Winner earns <strong style={{ color: '#22C55E' }}>Lucky Spins!</strong>
                                                    <span style={{ position: 'relative', display: 'inline-flex' }} className="lucky-spin-info">
                                                        <Info size={12} color="#94A3B8" style={{ cursor: 'help' }} />
                                                        <span className="lucky-spin-tooltip" style={{
                                                            position: 'absolute',
                                                            top: '100%',
                                                            left: '50%',
                                                            transform: 'translateX(-50%)',
                                                            marginTop: '8px',
                                                            padding: '10px 14px',
                                                            background: '#1E293B',
                                                            border: `1px solid ${KOTW_PRIMARY}44`,
                                                            borderRadius: '8px',
                                                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                                                            whiteSpace: 'nowrap',
                                                            fontSize: '11px',
                                                            color: '#E2E8F0',
                                                            zIndex: 1000,
                                                            opacity: 0,
                                                            visibility: 'hidden',
                                                            transition: 'opacity 0.2s, visibility 0.2s',
                                                            pointerEvents: 'none',
                                                        }}>
                                                            <div style={{ fontWeight: 700, color: KOTW_GOLD, marginBottom: '6px' }}>Lucky Spin Formula</div>
                                                            <div style={{ fontFamily: 'monospace', color: '#94A3B8', marginBottom: '8px' }}>
                                                                6 + (pts ÷ (pts + 500)) × 18
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '12px', color: '#CBD5E1' }}>
                                                                <span>50pts → <strong style={{ color: '#22C55E' }}>8</strong></span>
                                                                <span>350pts → <strong style={{ color: '#22C55E' }}>13</strong></span>
                                                                <span>700pts → <strong style={{ color: '#22C55E' }}>17</strong></span>
                                                                <span>1400pts → <strong style={{ color: '#22C55E' }}>19</strong></span>
                                                            </div>
                                                            {/* Tooltip arrow pointing up */}
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: '-6px',
                                                                left: '50%',
                                                                transform: 'translateX(-50%)',
                                                                width: 0,
                                                                height: 0,
                                                                borderLeft: '6px solid transparent',
                                                                borderRight: '6px solid transparent',
                                                                borderBottom: `6px solid ${KOTW_PRIMARY}44`,
                                                            }} />
                                                        </span>
                                                    </span>
                                                </span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default memo(KingOfWheelBanner);