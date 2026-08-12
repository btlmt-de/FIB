// ============================================
// CommunityGoalBanner.jsx
// ============================================
// Community Goal event banner - the whole server works staged targets together
// Features: countdown, staged progress bar, timer, result with per-stage payout
//
// Structure follows the other event banners deliberately: one horizontal row of pill
// boxes (icon, title, status, timer) over floating decorations, a shimmer sweep and a
// bottom glow line. The progress bar lives inside a pill rather than on its own row so
// this banner is the same height as Gold Rush, KOTW and First Blood.
//
// Progress arrives pre-throttled from the server (see COMMUNITY_GOAL_BROADCAST_DELAY_MS
// in globalEvents.js): a bar that ticked up the instant a rare landed would tell whoever
// was mid-spin what they had just pulled, seconds before their own wheel did.

import React, { useState, useEffect, useRef, memo } from 'react';
import { API_BASE_URL } from '../../../config/constants.js';
import { COLORS } from '../config/constants';
import { useActivity } from '../../../context/ActivityContext.jsx';
import { useSound } from '../../../context/SoundContext.jsx';
import { Target, Timer, Users, Sparkles, Gem, HandHeart, Trophy } from 'lucide-react';

// ============================================
// CONSTANTS
// ============================================

// Teal/cyan theme - deliberately unused by the other three events
// (Gold Rush amber, KOTW crimson/gold, First Blood blood red)
const CG_PRIMARY = '#2DD4BF';      // Teal
const CG_SECONDARY = '#0D9488';    // Deep teal
const CG_ACCENT = '#99F6E4';       // Light teal
const CG_BG = '#0F2E2B';           // Dark background
const CG_BG_DARK = '#061A18';      // Darker background
const CG_TEXT = '#F0FDFA';         // Light text
const CG_FAIL = '#F87171';         // Missed

// Stage colours, keyed to the server's tier keys
const TIER_COLORS = {
    iron: '#CBD5E1',
    gold: '#FBBF24',
    diamond: '#22D3EE',
};
const tierColor = key => TIER_COLORS[key] || CG_PRIMARY;

// ============================================
// Floating Decorations
// ============================================
function FloatingGoals({ isMobile }) {
    const decorations = [
        { Icon: Target, left: '6%', size: 0.9, delay: 0 },
        { Icon: Users, left: '14%', size: 0.7, delay: 0.5 },
        { Icon: Gem, left: '10%', size: 0.5, delay: 1.0, top: '25%' },
        { Icon: Sparkles, left: '18%', size: 0.55, delay: 1.5, top: '75%' },
        { Icon: Target, right: '6%', size: 0.9, delay: 0.3 },
        { Icon: Users, right: '14%', size: 0.7, delay: 0.8 },
        { Icon: Gem, right: '10%', size: 0.5, delay: 1.3, top: '75%' },
        { Icon: Sparkles, right: '18%', size: 0.55, delay: 1.8, top: '25%' },
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
                @keyframes floatGoal {
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
                        color={CG_PRIMARY}
                        style={{
                            position: 'absolute',
                            left: left || 'auto',
                            right: right || 'auto',
                            top: top || '50%',
                            transform: top ? 'none' : 'translateY(-50%)',
                            opacity: 0.25,
                            filter: `drop-shadow(0 0 6px ${CG_PRIMARY})`,
                            animation: `floatGoal ${2.5 + (index % 3) * 0.3}s ease-in-out infinite`,
                            animationDelay: `${delay}s`,
                        }}
                    />
                );
            })}
        </div>
    );
}

// ============================================
// Staged Progress Bar
// ============================================
// Sits inside a pill in the main row. Spans to the FINAL stage so the markers are at
// their true relative positions and the bar shows how much is left to climb, rather
// than snapping to full the moment the first stage falls.
function StagedBar({ progress, tiers, isMobile }) {
    const max = tiers.length > 0 ? tiers[tiers.length - 1].threshold : 0;
    if (max <= 0) return null;

    const pct = Math.min(100, (progress / max) * 100);
    const reached = [...tiers].reverse().find(t => progress >= t.threshold) || null;
    const fill = reached ? tierColor(reached.key) : CG_PRIMARY;
    const width = isMobile ? 130 : 220;

    return (
        <div
            title={tiers.map(t => `${t.name}: ${t.threshold} drops`).join('  |  ')}
            style={{
                position: 'relative',
                width: `${width}px`,
                height: isMobile ? '14px' : '16px',
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '999px',
                overflow: 'hidden',
                boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.6)',
            }}
        >
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${fill}aa, ${fill})`,
                borderRadius: '999px',
                transition: 'width 0.8s cubic-bezier(0.22, 1, 0.36, 1), background 0.6s ease',
                boxShadow: `0 0 10px ${fill}88`,
            }} />

            {/* Stage markers - the last is the bar's end, so it needs no divider */}
            {tiers.slice(0, -1).map(tier => (
                <div key={tier.key} style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${(tier.threshold / max) * 100}%`,
                    width: '2px',
                    background: progress >= tier.threshold ? `${CG_TEXT}cc` : `${CG_TEXT}44`,
                    pointerEvents: 'none',
                }} />
            ))}

            <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '9px' : '10px',
                fontWeight: 800,
                color: CG_TEXT,
                textShadow: '0 1px 3px rgba(0,0,0,0.95)',
                fontFamily: 'monospace',
                pointerEvents: 'none',
            }}>
                {progress}/{max}
            </div>
        </div>
    );
}

// ============================================
// Main Community Goal Banner Component
// ============================================
function CommunityGoalBanner({ isMobile = false, isAdmin = false }) {
    const {
        globalEventStatus,
        updateGlobalEventStatus,
        communityGoal,
        communityGoalResult,
        communityGoalResultPending,
        communityGoalReward,
    } = useActivity();
    const { playSfx, startCommunityGoalSoundtrack, stopCommunityGoalSoundtrack } = useSound();

    const [remainingTime, setRemainingTime] = useState(0);
    const [countdownTime, setCountdownTime] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    const hasPlayedSoundRef = useRef(false);
    const hasSoundtrackStartedRef = useRef(false);
    const wasActiveRef = useRef(false);
    const wasPendingRef = useRef(false);

    // Only respond to community_goal events
    const isCommunityGoal = globalEventStatus?.type === 'community_goal';
    const isActive = isCommunityGoal && globalEventStatus?.active;
    const isPending = isCommunityGoal && globalEventStatus?.pending;

    const progress = communityGoal?.progress ?? 0;
    const participants = communityGoal?.participants ?? 0;
    const tiers = communityGoal?.tiers?.length ? communityGoal.tiers : (globalEventStatus?.data?.tiers || []);
    const participationReward = communityGoal?.participationReward
        ?? globalEventStatus?.data?.participationReward
        ?? 0;

    const reachedTier = [...tiers].reverse().find(t => progress >= t.threshold) || null;
    const nextTier = tiers.find(t => progress < t.threshold) || null;
    const currentPayout = communityGoal?.payout ?? (participationReward + (reachedTier?.bonus || 0));

    // Prize pill copy: a range while the event is still counting down and nobody has
    // banked anything, the live figure once it is running.
    const topBonus = tiers.length > 0 ? tiers[tiers.length - 1].bonus : 0;
    const payoutRange = isPending && tiers.length > 0
        ? `${participationReward}-${participationReward + topBonus}`
        : (isActive ? String(currentPayout) : null);

    // Start/stop soundtrack. hasSoundtrackStartedRef is never reset by the expiry fallback
    // below - only by the event genuinely ending - or a re-run of this effect would read
    // the cleared flag as a new event and restart the music we just stopped.
    useEffect(() => {
        if (isActive && !hasSoundtrackStartedRef.current) {
            startCommunityGoalSoundtrack?.();
            hasSoundtrackStartedRef.current = true;
        }
        if (!isActive && !isPending && hasSoundtrackStartedRef.current) {
            stopCommunityGoalSoundtrack?.();
            hasSoundtrackStartedRef.current = false;
        }
    }, [isActive, isPending, startCommunityGoalSoundtrack, stopCommunityGoalSoundtrack]);

    // Visibility
    useEffect(() => {
        if (isPending && !wasPendingRef.current && !isActive) {
            setIsVisible(true);
            wasPendingRef.current = true;
        } else if (isActive && !wasActiveRef.current) {
            setIsVisible(true);
            if (!hasPlayedSoundRef.current) {
                playSfx?.('event_start');
                hasPlayedSoundRef.current = true;
            }
            wasActiveRef.current = true;
            wasPendingRef.current = false;
        } else if (!isActive && !isPending && (wasActiveRef.current || wasPendingRef.current)) {
            setIsVisible(false);
            hasPlayedSoundRef.current = false;
            wasActiveRef.current = false;
            wasPendingRef.current = false;
        }
    }, [isActive, isPending, playSfx]);

    // Countdown before the event starts
    useEffect(() => {
        if (!isPending || !globalEventStatus?.activatesAt) {
            setCountdownTime(0);
            return;
        }
        const update = () => setCountdownTime(Math.max(0, globalEventStatus.activatesAt - Date.now()));
        update();
        const interval = setInterval(update, 100);
        return () => clearInterval(interval);
    }, [isPending, globalEventStatus?.activatesAt]);

    // Active timer, with the same expiry fallback the other banners carry in case the
    // end message never arrives
    useEffect(() => {
        if (!isActive || !globalEventStatus?.expiresAt) {
            setRemainingTime(0);
            return;
        }
        const update = () => {
            const remaining = Math.max(0, globalEventStatus.expiresAt - Date.now());
            setRemainingTime(remaining);
            if (remaining <= 0 && isVisible) {
                setIsVisible(false);
                hasPlayedSoundRef.current = false;
                wasActiveRef.current = false;
                wasPendingRef.current = false;
                stopCommunityGoalSoundtrack?.();
            }
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [isActive, globalEventStatus?.expiresAt, isVisible, stopCommunityGoalSoundtrack]);

    // Admin test controls
    const triggerTestEvent = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/global-event/trigger`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventType: 'community_goal', duration: 2 }),
            });
            const data = await res.json();
            if (data.event) updateGlobalEventStatus?.(data.event);
        } catch (e) {
            console.error('[CommunityGoal] Trigger error:', e);
        }
    };

    const endTestEvent = async () => {
        try {
            await fetch(`${API_BASE_URL}/api/admin/global-event/end`, { method: 'POST', credentials: 'include' });
        } catch (e) {
            console.error('[CommunityGoal] End error:', e);
        }
    };

    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const showResult = !!communityGoalResult;
    // The stretch between the event ending and its summary being ready. The banner keeps
    // showing the final state of the bar rather than disappearing and popping back a few
    // seconds later, which read as a glitch.
    const isSettling = communityGoalResultPending && !showResult;
    const showLiveLayout = isActive || isSettling;
    const shouldShowBanner = isVisible || showResult || isSettling;
    if (!shouldShowBanner) return null;

    const countdownSecs = Math.ceil(countdownTime / 1000);
    const isCriticalTime = remainingTime > 0 && remainingTime < 60000;
    const succeeded = communityGoalResult?.succeeded;
    const resultColor = succeeded ? tierColor(communityGoalResult?.tierReached) : CG_FAIL;
    const edgeColor = showResult ? resultColor : (reachedTier ? tierColor(reachedTier.key) : CG_PRIMARY);

    // Shared pill styling, matching the other event banners
    const pill = (borderColor, opts = {}) => ({
        display: 'flex',
        alignItems: 'center',
        gap: opts.gap || '8px',
        padding: isMobile ? (opts.padMobile || '5px 10px') : (opts.pad || '6px 14px'),
        background: opts.background || CG_BG_DARK,
        border: `2px solid ${borderColor}`,
        borderRadius: '8px',
        ...opts.extra,
    });

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            animation: 'slideDownCG 0.4s ease-out forwards',
        }}>
            <style>{`
                @keyframes slideDownCG {
                    from { transform: translateY(-100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes goalPulse {
                    0%, 100% { filter: drop-shadow(0 0 8px ${CG_PRIMARY}); }
                    50% { filter: drop-shadow(0 0 20px ${CG_PRIMARY}); }
                }
                @keyframes countdownPulseCG {
                    0%, 100% { box-shadow: 0 0 10px ${CG_PRIMARY}44; }
                    50% { box-shadow: 0 0 20px ${CG_PRIMARY}88, 0 0 30px ${CG_PRIMARY}44; }
                }
                @keyframes goalShimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                @keyframes winnerGlowCG {
                    0%, 100% { text-shadow: 0 0 20px ${CG_PRIMARY}88; }
                    50% { text-shadow: 0 0 40px ${CG_PRIMARY}, 0 0 60px ${CG_PRIMARY}66; }
                }
                @keyframes fadeInCG {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                /* The bar holds its final position while the tally comes in, so the
                   hand-off to the result reads as one continuous banner. */
                @keyframes settleDots {
                    0%   { clip-path: inset(0 100% 0 0); }
                    100% { clip-path: inset(0 0 0 0); }
                }
            `}</style>

            <div style={{
                background: `linear-gradient(180deg, ${CG_BG} 0%, ${CG_BG_DARK} 50%, ${CG_BG} 100%)`,
                padding: isMobile ? '12px 12px 14px 12px' : '18px 32px 20px 32px',
                borderBottom: `2px solid ${edgeColor}`,
                overflow: 'visible',
                position: 'relative',
            }}>
                <FloatingGoals isMobile={isMobile} />

                {/* Shimmer overlay */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `linear-gradient(90deg, transparent 0%, ${CG_PRIMARY}08 30%, ${CG_TEXT}08 50%, ${CG_PRIMARY}08 70%, transparent 100%)`,
                    backgroundSize: '200% 100%',
                    animation: 'goalShimmer 4s ease-in-out infinite',
                    pointerEvents: 'none',
                }} />

                {/* Bottom glow */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: edgeColor,
                    boxShadow: `0 0 15px ${edgeColor}, 0 0 30px ${edgeColor}88`,
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
                    {showResult ? (
                        /* ---------- Result mode ---------- */
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: isMobile ? '6px' : '10px',
                            animation: 'fadeInCG 0.5s ease-out',
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: isMobile ? '10px' : '16px',
                            }}>
                                <Target
                                    size={isMobile ? 28 : 40}
                                    color={resultColor}
                                    style={{
                                        filter: `drop-shadow(0 0 15px ${resultColor})`,
                                        animation: 'goalPulse 1s ease-in-out infinite',
                                    }}
                                />
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        fontSize: isMobile ? '11px' : '14px',
                                        fontWeight: 700,
                                        color: resultColor,
                                        letterSpacing: '2px',
                                        marginBottom: '2px',
                                    }}>
                                        COMMUNITY GOAL
                                    </div>
                                    <div style={{
                                        fontSize: isMobile ? '20px' : '28px',
                                        fontWeight: 900,
                                        color: CG_TEXT,
                                        animation: 'winnerGlowCG 2s ease-in-out infinite',
                                    }}>
                                        {succeeded ? `${communityGoalResult.tierName} Reached` : 'No Stage Reached'}
                                    </div>
                                </div>
                                <Target
                                    size={isMobile ? 28 : 40}
                                    color={resultColor}
                                    style={{
                                        filter: `drop-shadow(0 0 15px ${resultColor})`,
                                        animation: 'goalPulse 1s ease-in-out infinite',
                                        animationDelay: '0.5s',
                                    }}
                                />
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: isMobile ? '16px' : '24px',
                                fontSize: isMobile ? '12px' : '14px',
                                color: CG_ACCENT,
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                            }}>
                                <span>
                                    <strong style={{ color: CG_TEXT }}>{communityGoalResult.progress}</strong> drops by{' '}
                                    <strong style={{ color: CG_TEXT }}>{communityGoalResult.participantCount}</strong>{' '}
                                    player{communityGoalResult.participantCount !== 1 ? 's' : ''}
                                </span>
                                {communityGoalReward && (
                                    <>
                                        <span style={{ color: CG_PRIMARY, opacity: 0.6 }}>|</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Sparkles size={14} color={resultColor} />{' '}
                                            <strong style={{ color: resultColor }}>
                                                {communityGoalReward.luckySpinsAwarded}
                                            </strong>{' '}
                                            Lucky Spins for you
                                            {communityGoalReward.tierBonus > 0 && (
                                                <span style={{ opacity: 0.7, fontSize: isMobile ? '10px' : '12px' }}>
                                                    {' '}({communityGoalReward.participationReward}+{communityGoalReward.tierBonus})
                                                </span>
                                            )}
                                        </span>
                                    </>
                                )}
                                {communityGoalResult.topContributors?.length > 0 && (
                                    <>
                                        <span style={{ color: CG_PRIMARY, opacity: 0.6 }}>|</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Trophy size={13} color={COLORS.gold} />{' '}
                                            <strong style={{ color: CG_TEXT }}>
                                                {communityGoalResult.topContributors[0].username}
                                            </strong>{' '}
                                            &times;{communityGoalResult.topContributors[0].contributions}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* ---------- Normal Active/Pending mode ---------- */
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: isMobile ? '10px' : '18px',
                            flexWrap: 'wrap',
                        }}>
                            {/* Left icon */}
                            <Target
                                size={isMobile ? 22 : 30}
                                color={CG_PRIMARY}
                                style={{ animation: 'goalPulse 2s ease-in-out infinite' }}
                            />

                            {/* Title */}
                            <span style={{
                                fontSize: isMobile ? '13px' : '18px',
                                fontWeight: 800,
                                color: CG_TEXT,
                                textShadow: `0 0 20px ${CG_PRIMARY}88`,
                                letterSpacing: isMobile ? '1px' : '2px',
                            }}>
                                COMMUNITY GOAL
                            </span>

                            {/* Countdown (during pending) - same treatment as the other banners */}
                            {isPending && !isActive && (
                                <div style={{
                                    ...pill(CG_PRIMARY, { pad: '6px 16px', padMobile: '4px 12px' }),
                                    animation: 'countdownPulseCG 0.5s ease-in-out infinite',
                                }}>
                                    <HandHeart size={isMobile ? 16 : 20} color={CG_PRIMARY} />
                                    <span style={{
                                        fontSize: isMobile ? '18px' : '24px',
                                        fontWeight: 900,
                                        color: CG_PRIMARY,
                                        textShadow: `0 0 12px ${CG_PRIMARY}`,
                                    }}>
                                        {countdownSecs}
                                    </span>
                                </div>
                            )}

                            {/* Progress (while running, and frozen while settling) */}
                            {showLiveLayout && (
                                <div style={pill(`${edgeColor}66`, { pad: '6px 14px', gap: '10px' })}>
                                    <StagedBar progress={progress} tiers={tiers} isMobile={isMobile} />
                                    <span style={{
                                        fontSize: isMobile ? '10px' : '12px',
                                        fontWeight: 600,
                                        color: CG_ACCENT,
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {isSettling
                                            ? 'time up'
                                            : nextTier
                                                ? <>{nextTier.threshold - progress} to {nextTier.name}</>
                                                : 'all stages clear'}
                                    </span>
                                </div>
                            )}

                            {/* Timer, or the hand-off once the clock has run out */}
                            {showLiveLayout && (
                                isSettling ? (
                                    <div style={pill(`${CG_PRIMARY}88`, { gap: '8px', pad: '6px 14px', padMobile: '5px 10px' })}>
                                        <Timer size={isMobile ? 16 : 20} color={CG_PRIMARY} style={{
                                            animation: 'goalPulse 1s ease-in-out infinite',
                                        }} />
                                        <span style={{
                                            fontSize: isMobile ? '11px' : '13px',
                                            fontWeight: 600,
                                            color: CG_ACCENT,
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                        }}>
                                            Counting up
                                            <span style={{ animation: 'settleDots 1.2s steps(4, end) infinite' }}>...</span>
                                        </span>
                                    </div>
                                ) : (
                                    <div style={pill(`${isCriticalTime ? '#ff4444' : CG_PRIMARY}88`, {
                                        gap: '6px',
                                        pad: '6px 14px',
                                        padMobile: '5px 10px',
                                        background: isCriticalTime ? 'rgba(255,68,68,0.2)' : CG_BG_DARK,
                                    })}>
                                        <Timer size={isMobile ? 16 : 20} color={isCriticalTime ? '#ff4444' : CG_PRIMARY} />
                                        <span style={{
                                            fontSize: isMobile ? '14px' : '18px',
                                            fontWeight: 700,
                                            color: isCriticalTime ? '#ff4444' : CG_TEXT,
                                            fontFamily: 'monospace',
                                        }}>
                                            {formatTime(remainingTime)}
                                        </span>
                                    </div>
                                )
                            )}

                            {/* Prize indicator. During the countdown there is no progress yet, so
                                show the range on offer; once running, show what is actually banked. */}
                            {(payoutRange || isSettling) && (
                                <div style={pill(`${edgeColor}66`, { gap: '6px' })}>
                                    <Sparkles size={isMobile ? 16 : 20} color={edgeColor} style={{
                                        filter: `drop-shadow(0 0 4px ${edgeColor})`,
                                    }} />
                                    <span style={{
                                        fontSize: isMobile ? '12px' : '14px',
                                        fontWeight: 700,
                                        color: edgeColor,
                                        textShadow: `0 0 6px ${edgeColor}44`,
                                    }}>
                                        {payoutRange || currentPayout} Lucky Spins
                                    </span>
                                </div>
                            )}

                            {/* Right icon */}
                            <Target
                                size={isMobile ? 22 : 30}
                                color={CG_PRIMARY}
                                style={{
                                    animation: 'goalPulse 2s ease-in-out infinite',
                                    animationDelay: '1s',
                                }}
                            />
                        </div>
                    )}

                    {/* Explanation - shows during active phase, same shape as the other banners */}
                    {showLiveLayout && !showResult && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: isMobile ? '6px' : '12px',
                            fontSize: isMobile ? '10px' : '12px',
                            color: CG_ACCENT,
                            opacity: 0.9,
                            marginTop: isMobile ? '6px' : '8px',
                            flexWrap: 'wrap',
                        }}>
                            <span style={{ color: CG_TEXT, fontWeight: 600 }}>Goal:</span>
                            <span>
                                Everyone lands <strong style={{ color: '#EF4444' }}>Rare</strong> or higher together
                            </span>
                            <span style={{ color: CG_PRIMARY, opacity: 0.5 }}>|</span>
                            {tiers.map(tier => (
                                <span
                                    key={tier.key}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        // Stages already cleared read as done rather than pending
                                        opacity: progress >= tier.threshold ? 1 : 0.75,
                                        fontWeight: progress >= tier.threshold ? 700 : 400,
                                    }}
                                >
                                    <Gem size={isMobile ? 10 : 12} color={tierColor(tier.key)} />
                                    {tier.name} {tier.threshold}
                                    <strong style={{ color: tierColor(tier.key) }}>
                                        &rarr; {participationReward + tier.bonus}
                                    </strong>
                                </span>
                            ))}
                            <span style={{ color: CG_PRIMARY, opacity: 0.5 }}>|</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Sparkles size={isMobile ? 10 : 12} color="#22C55E" />
                                Lucky Spins <strong style={{ color: '#22C55E' }}>each</strong>, just for taking part
                            </span>
                            {!isMobile && (
                                <>
                                    <span style={{ color: CG_PRIMARY, opacity: 0.5 }}>|</span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <Users size={12} color={CG_ACCENT} /> {participants} spinning
                                    </span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Admin controls */}
                    {isAdmin && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={triggerTestEvent} style={{
                                padding: '3px 10px', fontSize: '10px', cursor: 'pointer',
                                background: 'transparent', color: CG_ACCENT,
                                border: `1px solid ${CG_PRIMARY}55`, borderRadius: '6px',
                            }}>Test</button>
                            <button onClick={endTestEvent} style={{
                                padding: '3px 10px', fontSize: '10px', cursor: 'pointer',
                                background: 'transparent', color: CG_ACCENT,
                                border: `1px solid ${CG_PRIMARY}55`, borderRadius: '6px',
                            }}>End</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default memo(CommunityGoalBanner);
