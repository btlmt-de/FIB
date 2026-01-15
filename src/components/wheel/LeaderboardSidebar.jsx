import React, { useState, useEffect, useRef, useCallback } from 'react';
import { COLORS, API_BASE_URL } from '../../config/constants.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useActivity } from '../../context/ActivityContext.jsx';
import { UserProfile } from './UserProfile.jsx';
import {
    Trophy, RefreshCw, ExternalLink, Crown, Medal, Award,
    Sparkles, Star, Diamond, BookOpen, TrendingUp, Layers, Zap, Timer, Swords, Info
} from 'lucide-react';

// KOTW Colors - Crimson Obsidian theme (aggressive/competitive)
const KOTW_BG = '#1E293B';        // Cool Slate Grey
const KOTW_BG_DARK = '#0F172A';   // Dark Graphite (depth)
const KOTW_PRIMARY = '#F43F5E';   // Vivid Crimson/Blood Orange
const KOTW_TEXT = '#F8FAFC';      // Ice White
const KOTW_GOLD = '#F59E0B';      // Gold for 1st place
const KOTW_SILVER = '#94A3B8';    // Silver for 2nd
const KOTW_BRONZE = '#D97706';    // Bronze for 3rd

// Helper to get Discord avatar URL
function getDiscordAvatarUrl(discordId, avatarHash, size = 64) {
    if (avatarHash) {
        const format = avatarHash.startsWith('a_') ? 'gif' : 'png';
        return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${format}?size=${size}`;
    }
    try {
        if (!discordId || !/^\d+$/.test(String(discordId))) {
            return `https://cdn.discordapp.com/embed/avatars/0.png`;
        }
        const defaultIndex = (BigInt(discordId) >> 22n) % 6n;
        return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
    } catch {
        return `https://cdn.discordapp.com/embed/avatars/0.png`;
    }
}

export function LeaderboardSidebar({ onOpenFull }) {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [activeTab, setActiveTab] = useState('collection');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showKotwMode, setShowKotwMode] = useState(false);
    const intervalRef = useRef(null);
    const { user } = useAuth();
    const { globalEventStatus, kotwLeaderboard, kotwUserStats, kotwSpinPending } = useActivity();

    // Auto-enable KOTW mode when event is active, auto-disable when it ends
    const isKotwActive = globalEventStatus?.type === 'king_of_wheel' &&
        (globalEventStatus?.active || globalEventStatus?.pending);

    // KOTW timer state for real-time updates
    const [kotwRemainingTime, setKotwRemainingTime] = useState(0);
    const [pendingCountdownTime, setPendingCountdownTime] = useState(0);

    useEffect(() => {
        if (isKotwActive && !showKotwMode) {
            setShowKotwMode(true);
        } else if (!isKotwActive && showKotwMode) {
            // Auto-disable KOTW mode after event ends (with delay to show final results)
            const timeout = setTimeout(() => {
                setShowKotwMode(false);
            }, 8000); // 8 seconds to see final standings
            return () => clearTimeout(timeout);
        }
    }, [isKotwActive, showKotwMode]);

    // Update KOTW timer every second (both active and pending countdown)
    useEffect(() => {
        if (!isKotwActive || !showKotwMode) return;

        const updateTimer = () => {
            // Update active event remaining time
            if (globalEventStatus?.expiresAt) {
                setKotwRemainingTime(Math.max(0, globalEventStatus.expiresAt - Date.now()));
            }
            // Update pending countdown time
            if (globalEventStatus?.pending && globalEventStatus?.activatesAt) {
                setPendingCountdownTime(Math.max(0, globalEventStatus.activatesAt - Date.now()));
            } else {
                setPendingCountdownTime(0);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [isKotwActive, showKotwMode, globalEventStatus?.expiresAt, globalEventStatus?.activatesAt, globalEventStatus?.pending]);

    const loadLeaderboard = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/leaderboard?sort=${activeTab}`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setLeaderboard(data.leaderboard || []);
            setLastUpdated(new Date());
        } catch (e) {
            console.error('Failed to load leaderboard:', e);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        loadLeaderboard();

        // Auto-refresh every 5 minutes
        intervalRef.current = setInterval(loadLeaderboard, 5 * 60 * 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [loadLeaderboard]);

    const sortOptions = {
        collection: { label: 'Items', icon: <BookOpen size={12} />, color: COLORS.gold },
        spins: { label: 'Spins', icon: <TrendingUp size={12} />, color: COLORS.text },
        duplicates: { label: 'Dupes', icon: <Layers size={12} />, color: COLORS.accent },
        events: { label: 'Events', icon: <Zap size={12} />, color: COLORS.orange },
    };

    const getValueForTab = (entry) => {
        let value;
        switch (activeTab) {
            case 'collection': value = entry.unique_items; break;
            case 'spins': value = entry.total_spins; break;
            case 'duplicates': value = entry.total_duplicates; break;
            case 'events': value = entry.event_triggers; break;
            default: value = entry.unique_items;
        }
        return value ?? 0; // Coerce null/undefined to 0
    };

    const RankBadge = ({ rank }) => {
        if (rank === 1) {
            return (
                <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #FFE55C, #FFA500)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #FFD700',
                    boxShadow: '0 0 15px #FFAA0050, inset 0 1px 2px rgba(255,255,255,0.4)'
                }}>
                    <Crown size={14} color="#1a1a1a" />
                </div>
            );
        }
        if (rank === 2) {
            return (
                <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #E8E8E8, #B8B8B8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #D0D0D0',
                    boxShadow: '0 0 15px #C0C0C050, inset 0 1px 2px rgba(255,255,255,0.5)'
                }}>
                    <Medal size={14} color="#1a1a1a" />
                </div>
            );
        }
        if (rank === 3) {
            return (
                <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #E8956F, #CD7F32)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #D2691E',
                    boxShadow: '0 0 15px #CD7F3250, inset 0 1px 2px rgba(255,255,255,0.3)'
                }}>
                    <Award size={14} color="#fff" />
                </div>
            );
        }
        return (
            <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: `linear-gradient(135deg, ${COLORS.bgLighter}, ${COLORS.bg})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: '700',
                color: COLORS.textMuted,
                border: `1px solid ${COLORS.border}`,
                boxShadow: `0 0 8px ${COLORS.border}40`
            }}>
                {rank}
            </div>
        );
    };

    // Format time for KOTW timer
    const formatKotwTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Render KOTW Leaderboard overlay
    const renderKotwLeaderboard = () => {
        const remainingTime = kotwRemainingTime;
        const isPending = globalEventStatus?.pending;
        const countdownTime = pendingCountdownTime;

        const rankColors = [KOTW_GOLD, KOTW_SILVER, KOTW_BRONZE];
        const RankIcons = [Crown, Trophy, Medal];

        return (
            <div style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(180deg, ${KOTW_BG} 0%, ${KOTW_BG_DARK} 50%, ${KOTW_BG}ee 100%)`,
                borderRadius: '16px',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* KOTW Header */}
                <div style={{
                    padding: '16px 18px',
                    borderBottom: `2px solid ${KOTW_PRIMARY}`,
                    background: `linear-gradient(180deg, ${KOTW_PRIMARY}18 0%, transparent 100%)`,
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: `linear-gradient(135deg, ${KOTW_PRIMARY}30, ${KOTW_BG_DARK})`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: `1px solid ${KOTW_PRIMARY}50`,
                            }}>
                                <Crown size={20} color={KOTW_PRIMARY} />
                            </div>
                            <div>
                                <h3 style={{
                                    margin: 0,
                                    color: KOTW_TEXT,
                                    fontSize: '15px',
                                    fontWeight: '700',
                                }}>
                                    King of the Wheel
                                </h3>
                                <div style={{
                                    fontSize: '11px',
                                    color: KOTW_PRIMARY,
                                }}>
                                    {isPending ? 'Starting soon...' : 'Competition active'}
                                </div>
                            </div>
                        </div>

                        {/* Timer / Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isPending ? (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    background: `${KOTW_PRIMARY}33`,
                                    borderRadius: '8px',
                                    border: `1px solid ${KOTW_PRIMARY}`,
                                }}>
                                    <Swords size={14} color={KOTW_PRIMARY} />
                                    <span style={{
                                        fontSize: '16px',
                                        fontWeight: 700,
                                        color: KOTW_PRIMARY,
                                    }}>
                                        {Math.ceil(countdownTime / 1000)}
                                    </span>
                                </div>
                            ) : (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    background: remainingTime < 60000 ? 'rgba(255,68,68,0.2)' : `${KOTW_PRIMARY}22`,
                                    borderRadius: '8px',
                                    border: `1px solid ${remainingTime < 60000 ? '#ff4444' : KOTW_PRIMARY}66`,
                                }}>
                                    <Timer size={14} color={remainingTime < 60000 ? '#ff4444' : KOTW_PRIMARY} />
                                    <span style={{
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        color: remainingTime < 60000 ? '#ff4444' : KOTW_PRIMARY,
                                        fontFamily: 'monospace',
                                    }}>
                                        {formatKotwTime(remainingTime)}
                                    </span>
                                </div>
                            )}

                            <button
                                onClick={() => setShowKotwMode(false)}
                                style={{
                                    background: `${COLORS.bgLighter}60`,
                                    border: `1px solid ${COLORS.border}`,
                                    color: COLORS.textMuted,
                                    cursor: 'pointer',
                                    padding: '7px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                                title="Show normal leaderboard"
                            >
                                <Trophy size={14} />
                            </button>
                        </div>
                    </div>

                    {/* User's stats */}
                    {kotwUserStats && kotwUserStats.points > 0 && (
                        <div style={{
                            marginTop: '12px',
                            padding: '10px 14px',
                            background: KOTW_BG_DARK,
                            borderRadius: '10px',
                            border: `1px solid ${KOTW_PRIMARY}44`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: KOTW_SILVER, fontSize: '12px' }}>Your score:</span>
                                <span style={{
                                    fontSize: '20px',
                                    fontWeight: 900,
                                    color: KOTW_PRIMARY,
                                    fontFamily: 'monospace',
                                }}>
                                    {kotwUserStats.points}
                                </span>
                                <span style={{ color: KOTW_SILVER, fontSize: '12px' }}>pts</span>
                            </div>
                            {kotwUserStats.rank && (
                                <div style={{
                                    padding: '4px 10px',
                                    background: kotwUserStats.rank <= 3 ? `${rankColors[kotwUserStats.rank - 1]}33` : `${KOTW_PRIMARY}33`,
                                    borderRadius: '6px',
                                    border: `1px solid ${kotwUserStats.rank <= 3 ? rankColors[kotwUserStats.rank - 1] : KOTW_PRIMARY}66`,
                                }}>
                                    <span style={{
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        color: kotwUserStats.rank <= 3 ? rankColors[kotwUserStats.rank - 1] : KOTW_TEXT,
                                    }}>
                                        #{kotwUserStats.rank}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Leaderboard List */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px',
                }}>
                    {(!kotwLeaderboard || kotwLeaderboard.length === 0) ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: KOTW_PRIMARY,
                            gap: '12px',
                        }}>
                            <Swords size={40} style={{ opacity: 0.6 }} />
                            <span style={{ fontSize: '14px', color: KOTW_TEXT, opacity: 0.8 }}>
                                {isPending ? 'Competition starting soon...' : 'Spin to earn points!'}
                            </span>
                            <span style={{ fontSize: '12px', color: KOTW_SILVER, opacity: 0.6 }}>
                                Rarer items = more points
                            </span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {kotwLeaderboard.map((entry, index) => {
                                const RankIcon = RankIcons[index] || Award;
                                const rankColor = rankColors[index] || KOTW_SILVER;
                                const isCurrentUser = entry.userId === user?.id;

                                return (
                                    <div
                                        key={entry.userId}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px 14px',
                                            background: isCurrentUser
                                                ? `linear-gradient(135deg, ${KOTW_PRIMARY}25, ${KOTW_BG_DARK})`
                                                : KOTW_BG_DARK,
                                            borderRadius: '10px',
                                            border: isCurrentUser
                                                ? `2px solid ${KOTW_PRIMARY}88`
                                                : `1px solid ${KOTW_BG}`,
                                        }}
                                    >
                                        {/* Rank */}
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            background: index < 3
                                                ? `linear-gradient(135deg, ${rankColor}40, ${rankColor}20)`
                                                : KOTW_BG,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: `1px solid ${index < 3 ? rankColor : KOTW_BG}60`,
                                        }}>
                                            {index < 3 ? (
                                                <RankIcon size={16} color={rankColor} />
                                            ) : (
                                                <span style={{
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    color: KOTW_SILVER,
                                                }}>
                                                    {index + 1}
                                                </span>
                                            )}
                                        </div>

                                        {/* Name */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '14px',
                                                fontWeight: isCurrentUser ? 700 : 600,
                                                color: isCurrentUser ? KOTW_PRIMARY : KOTW_TEXT,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {entry.username}
                                                {isCurrentUser && ' (You)'}
                                            </div>
                                            <div style={{
                                                fontSize: '11px',
                                                color: KOTW_SILVER,
                                            }}>
                                                {entry.spins} spin{entry.spins !== 1 ? 's' : ''}
                                            </div>
                                        </div>

                                        {/* Points */}
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{
                                                fontSize: '18px',
                                                fontWeight: 900,
                                                color: index < 3 ? rankColor : KOTW_TEXT,
                                                fontFamily: 'monospace',
                                            }}>
                                                {/* For current user while spinning, show confirmed value to prevent premature updates */}
                                                {isCurrentUser && kotwSpinPending
                                                    ? (kotwUserStats?.points || 0)
                                                    : entry.points}
                                            </div>
                                            <div style={{
                                                fontSize: '10px',
                                                color: KOTW_SILVER,
                                            }}>
                                                pts
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div style={{
                    padding: '10px 16px',
                    borderTop: `1px solid ${KOTW_PRIMARY}44`,
                    background: KOTW_BG_DARK,
                    fontSize: '11px',
                    color: KOTW_TEXT,
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                }}>
                    <style>{`
                        .kotw-lucky-info:hover .kotw-lucky-tooltip {
                            opacity: 1 !important;
                            visibility: visible !important;
                        }
                    `}</style>
                    <Trophy size={14} color={KOTW_GOLD} /> Winner earns Lucky Spins based on score!
                    <span style={{ position: 'relative', display: 'inline-flex' }} className="kotw-lucky-info">
                        <Info size={12} color="#94A3B8" style={{ cursor: 'help' }} />
                        <span className="kotw-lucky-tooltip" style={{
                            position: 'absolute',
                            bottom: '100%',
                            right: 0,
                            marginBottom: '8px',
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
                            textAlign: 'left',
                        }}>
                            <div style={{ fontWeight: 700, color: KOTW_GOLD, marginBottom: '6px' }}>Lucky Spin Formula</div>
                            <div style={{ fontFamily: 'monospace', color: '#94A3B8', marginBottom: '8px' }}>
                                log₁₀(points ÷ 50 + 1) × 4
                            </div>
                            <div style={{ display: 'flex', gap: '12px', color: '#CBD5E1' }}>
                                <span>50pts → <strong style={{ color: '#22C55E' }}>4</strong></span>
                                <span>500pts → <strong style={{ color: '#22C55E' }}>13</strong></span>
                                <span>3000pts → <strong style={{ color: '#22C55E' }}>23</strong></span>
                            </div>
                            {/* Tooltip arrow */}
                            <div style={{
                                position: 'absolute',
                                bottom: '-6px',
                                right: '8px',
                                width: 0,
                                height: 0,
                                borderLeft: '6px solid transparent',
                                borderRight: '6px solid transparent',
                                borderTop: `6px solid ${KOTW_PRIMARY}44`,
                            }} />
                        </span>
                    </span>
                </div>
            </div>
        );
    };

    return (
        <>
            <div style={{
                width: '420px',
                height: '520px',
                background: `linear-gradient(180deg, ${COLORS.bgLight}f8 0%, ${COLORS.bg}fc 100%)`,
                borderRadius: '16px',
                border: `1px solid ${COLORS.border}`,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 60px ${COLORS.accent}08, inset 0 1px 0 rgba(255,255,255,0.05)`,
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Corner accents */}
                <div style={{ position: 'absolute', top: '8px', left: '8px', width: '16px', height: '16px', borderTop: `2px solid ${COLORS.accent}40`, borderLeft: `2px solid ${COLORS.accent}40`, borderRadius: '4px 0 0 0', zIndex: 5 }} />
                <div style={{ position: 'absolute', top: '8px', right: '8px', width: '16px', height: '16px', borderTop: `2px solid ${COLORS.accent}40`, borderRight: `2px solid ${COLORS.accent}40`, borderRadius: '0 4px 0 0', zIndex: 5 }} />

                {/* KOTW Overlay */}
                {showKotwMode && isKotwActive && renderKotwLeaderboard()}

                {/* Header */}
                <div style={{
                    padding: '16px 18px 14px 18px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    background: `linear-gradient(180deg, ${COLORS.bgLighter}60 0%, transparent 100%)`,
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Subtle shimmer effect */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: '-100%',
                        width: '50%',
                        height: '100%',
                        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
                        animation: 'none',
                        pointerEvents: 'none',
                    }} />

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '14px',
                        position: 'relative',
                        zIndex: 1,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: `linear-gradient(135deg, ${COLORS.accent}25, ${COLORS.purple}15)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: `1px solid ${COLORS.accent}30`,
                                boxShadow: `0 0 20px ${COLORS.accent}15`,
                            }}>
                                <Trophy size={18} color={COLORS.gold} />
                            </div>
                            <div>
                                <h3 style={{
                                    margin: 0,
                                    color: COLORS.text,
                                    fontSize: '15px',
                                    fontWeight: '700',
                                    letterSpacing: '-0.3px'
                                }}>
                                    Leaderboard
                                </h3>
                                <div style={{
                                    fontSize: '11px',
                                    color: COLORS.textMuted,
                                    marginTop: '2px'
                                }}>
                                    Top 12 players
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {/* KOTW Toggle Button */}
                            {isKotwActive && !showKotwMode && (
                                <button
                                    onClick={() => setShowKotwMode(true)}
                                    style={{
                                        background: `linear-gradient(135deg, ${KOTW_PRIMARY}40, ${KOTW_BG_DARK})`,
                                        border: `1px solid ${KOTW_PRIMARY}80`,
                                        color: KOTW_PRIMARY,
                                        cursor: 'pointer',
                                        padding: '7px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        borderRadius: '8px',
                                        animation: 'pulse 2s ease-in-out infinite',
                                    }}
                                    title="View KOTW Competition"
                                >
                                    <Crown size={14} />
                                </button>
                            )}
                            <button
                                onClick={loadLeaderboard}
                                style={{
                                    background: `${COLORS.bgLighter}60`,
                                    border: `1px solid ${COLORS.border}`,
                                    color: COLORS.textMuted,
                                    cursor: 'pointer',
                                    padding: '7px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderRadius: '8px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = COLORS.bgLighter;
                                    e.currentTarget.style.color = COLORS.text;
                                    e.currentTarget.style.borderColor = COLORS.accent + '50';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = `${COLORS.bgLighter}60`;
                                    e.currentTarget.style.color = COLORS.textMuted;
                                    e.currentTarget.style.borderColor = COLORS.border;
                                }}
                                title="Refresh"
                            >
                                <RefreshCw size={14} />
                            </button>
                            {onOpenFull && (
                                <button
                                    onClick={onOpenFull}
                                    style={{
                                        background: `${COLORS.bgLighter}60`,
                                        border: `1px solid ${COLORS.border}`,
                                        color: COLORS.textMuted,
                                        cursor: 'pointer',
                                        padding: '7px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        borderRadius: '8px',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = COLORS.bgLighter;
                                        e.currentTarget.style.color = COLORS.text;
                                        e.currentTarget.style.borderColor = COLORS.accent + '50';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = `${COLORS.bgLighter}60`;
                                        e.currentTarget.style.color = COLORS.textMuted;
                                        e.currentTarget.style.borderColor = COLORS.border;
                                    }}
                                    title="Open full view"
                                >
                                    <ExternalLink size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Tab buttons - Enhanced pill design */}
                    <div style={{
                        display: 'flex',
                        gap: '6px',
                        background: `${COLORS.bg}cc`,
                        borderRadius: '10px',
                        padding: '5px',
                        border: `1px solid ${COLORS.border}50`,
                    }}>
                        {Object.entries(sortOptions).map(([key, { label, icon, color }]) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                style={{
                                    flex: 1,
                                    padding: '7px 8px',
                                    background: activeTab === key
                                        ? `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent}cc)`
                                        : 'transparent',
                                    border: activeTab === key
                                        ? `1px solid ${COLORS.accent}80`
                                        : '1px solid transparent',
                                    borderRadius: '6px',
                                    color: activeTab === key ? '#fff' : COLORS.textMuted,
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '5px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: activeTab === key
                                        ? `0 2px 10px ${COLORS.accent}40, inset 0 1px 0 rgba(255,255,255,0.2)`
                                        : 'none'
                                }}
                                onMouseEnter={e => {
                                    if (activeTab !== key) {
                                        e.currentTarget.style.background = `${COLORS.bgLighter}`;
                                        e.currentTarget.style.color = COLORS.text;
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (activeTab !== key) {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = COLORS.textMuted;
                                    }
                                }}
                            >
                                {icon}
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <style>{`
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-4px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes shimmerSweep {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(300%); }
                }
                @keyframes pulse {
                    0%, 100% { background-position: 200% 0; }
                    50% { background-position: 0% 0; }
                }
                .sidebar-leaderboard-row {
                    transition: all 0.2s ease;
                    animation: slideIn 0.4s ease-out;
                    border-radius: 10px;
                    margin: 0 8px 4px 8px;
                }
                .sidebar-leaderboard-row:hover {
                    background: ${COLORS.bgLighter}aa !important;
                    transform: translateX(3px);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.2), inset 0 0 20px ${COLORS.accent}08;
                }
                .leaderboard-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                .leaderboard-scroll::-webkit-scrollbar-track {
                    background: transparent;
                    border-radius: 3px;
                }
                .leaderboard-scroll::-webkit-scrollbar-thumb {
                    background: ${COLORS.border};
                    border-radius: 3px;
                }
                .leaderboard-scroll::-webkit-scrollbar-thumb:hover {
                    background: ${COLORS.textMuted};
                }
            `}</style>

                {/* Leaderboard content */}
                <div className="leaderboard-scroll" style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '8px 0'
                }}>
                    {loading ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            padding: '8px'
                        }}>
                            {[...Array(6)].map((_, i) => (
                                <div key={i} style={{
                                    height: '48px',
                                    background: `linear-gradient(90deg, ${COLORS.bgLighter}40 0%, ${COLORS.bgLighter}60 50%, ${COLORS.bgLighter}40 100%)`,
                                    backgroundSize: '200% 100%',
                                    borderRadius: '10px',
                                    margin: '0 8px',
                                    animation: 'none'
                                }} />
                            ))}
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: COLORS.textMuted }}>
                            <Trophy size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                            <div style={{ fontSize: '13px' }}>No data yet</div>
                        </div>
                    ) : (
                        leaderboard.slice(0, 12).map((entry, idx) => {
                            const rank = idx + 1;
                            const isCurrentUser = user?.id === entry.id;
                            const isTopThree = rank <= 3;

                            return (
                                <div
                                    key={entry.id}
                                    className="sidebar-leaderboard-row"
                                    onClick={() => setSelectedUser(entry.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '10px 12px',
                                        background: isCurrentUser
                                            ? `linear-gradient(90deg, ${COLORS.accent}18 0%, transparent 100%)`
                                            : isTopThree
                                                ? `${COLORS.bgLighter}30`
                                                : 'transparent',
                                        cursor: 'pointer',
                                        border: isCurrentUser
                                            ? `1px solid ${COLORS.accent}30`
                                            : '1px solid transparent',
                                    }}
                                >
                                    <RankBadge rank={rank} />

                                    {/* Avatar */}
                                    <img
                                        src={getDiscordAvatarUrl(entry.discord_id, entry.discord_avatar, 32)}
                                        alt=""
                                        style={{
                                            width: '30px',
                                            height: '30px',
                                            borderRadius: '8px',
                                            flexShrink: 0,
                                            border: isTopThree
                                                ? `2px solid ${rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32'}50`
                                                : `1.5px solid ${COLORS.border}`,
                                            boxShadow: isTopThree
                                                ? `0 0 12px ${rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32'}30`
                                                : `0 0 8px ${COLORS.accent}10`
                                        }}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                                        }}
                                    />

                                    {/* Name */}
                                    <div style={{
                                        flex: 1,
                                        minWidth: 0,
                                        fontSize: '13px',
                                        fontWeight: isCurrentUser ? '700' : isTopThree ? '600' : '500',
                                        color: isCurrentUser ? COLORS.accent : COLORS.text,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {entry.custom_username}
                                    </div>

                                    {/* Value */}
                                    <div style={{
                                        width: '50px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: sortOptions[activeTab].color,
                                        textAlign: 'right',
                                        fontFamily: 'monospace',
                                    }}>
                                        {getValueForTab(entry).toLocaleString()}
                                    </div>

                                    {/* Rarity badges */}
                                    <div style={{
                                        display: 'flex',
                                        gap: '3px',
                                        width: '140px',
                                        justifyContent: 'flex-end',
                                        flexShrink: 0
                                    }}>
                                        {(() => {
                                            // Show event stats for events tab
                                            if (activeTab === 'events') {
                                                const recursion = entry.recursion_triggers || 0;
                                                const eventRate = entry.total_spins > 0
                                                    ? ((entry.event_triggers / entry.total_spins) * 100).toFixed(1)
                                                    : '0.0';

                                                return (
                                                    <>
                                                        {recursion > 0 && (
                                                            <span title="Recursion Events Triggered" style={{
                                                                color: '#00FF00',
                                                                fontSize: '10px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '2px',
                                                                background: '#00FF0015',
                                                                padding: '3px 5px',
                                                                borderRadius: '4px',
                                                                border: '1px solid #00FF0030',
                                                                fontWeight: '600'
                                                            }}>
                                                                <RefreshCw size={9} />{recursion}
                                                            </span>
                                                        )}
                                                        <span title="Event trigger rate" style={{
                                                            color: COLORS.textMuted,
                                                            fontSize: '10px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '2px',
                                                            background: `${COLORS.text}10`,
                                                            padding: '3px 5px',
                                                            borderRadius: '4px',
                                                            border: `1px solid ${COLORS.border}`,
                                                            fontWeight: '500'
                                                        }}>
                                                            {eventRate}%
                                                        </span>
                                                    </>
                                                );
                                            }

                                            // Show totals on duplicates tab, unique counts otherwise
                                            const showTotals = activeTab === 'duplicates';
                                            const insane = showTotals ? (entry.total_insane || 0) : (entry.insane_count || 0);
                                            const mythic = showTotals ? (entry.total_mythic || 0) : (entry.mythic_count || 0);
                                            const legendary = showTotals ? (entry.total_legendary || 0) : (entry.legendary_count || 0);
                                            const rare = showTotals ? (entry.total_rare || 0) : (entry.rare_count || 0);

                                            return (
                                                <>
                                                    {insane > 0 && (
                                                        <span style={{
                                                            color: COLORS.insane,
                                                            fontSize: '10px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '2px',
                                                            background: `${COLORS.insane}15`,
                                                            padding: '3px 5px',
                                                            borderRadius: '4px',
                                                            border: `1px solid ${COLORS.insane}30`,
                                                            fontWeight: '600'
                                                        }}>
                                                            <Crown size={9} />{insane}
                                                        </span>
                                                    )}
                                                    {mythic > 0 && (
                                                        <span style={{
                                                            color: COLORS.aqua,
                                                            fontSize: '10px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '2px',
                                                            background: `${COLORS.aqua}12`,
                                                            padding: '3px 5px',
                                                            borderRadius: '4px',
                                                            border: `1px solid ${COLORS.aqua}30`,
                                                            fontWeight: '600'
                                                        }}>
                                                            <Sparkles size={9} />{mythic}
                                                        </span>
                                                    )}
                                                    {legendary > 0 && (
                                                        <span style={{
                                                            color: COLORS.purple,
                                                            fontSize: '10px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '2px',
                                                            background: `${COLORS.purple}12`,
                                                            padding: '3px 5px',
                                                            borderRadius: '4px',
                                                            border: `1px solid ${COLORS.purple}30`,
                                                            fontWeight: '600'
                                                        }}>
                                                            <Star size={9} />{legendary}
                                                        </span>
                                                    )}
                                                    {rare > 0 && (
                                                        <span style={{
                                                            color: COLORS.red,
                                                            fontSize: '10px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '2px',
                                                            background: `${COLORS.red}12`,
                                                            padding: '3px 5px',
                                                            borderRadius: '4px',
                                                            border: `1px solid ${COLORS.red}30`,
                                                            fontWeight: '600'
                                                        }}>
                                                            <Diamond size={9} />{rare}
                                                        </span>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '12px 16px',
                    borderTop: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px',
                    color: COLORS.textMuted,
                    background: `linear-gradient(180deg, transparent 0%, ${COLORS.bgLighter}30 100%)`,
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Trophy size={12} color={COLORS.gold} />
                        Sorted by {sortOptions[activeTab].label.toLowerCase()}
                    </span>
                    {lastUpdated && (
                        <span>
                            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>

                {/* Bottom corner accents */}
                <div style={{ position: 'absolute', bottom: '8px', left: '8px', width: '16px', height: '16px', borderBottom: `2px solid ${COLORS.accent}40`, borderLeft: `2px solid ${COLORS.accent}40`, borderRadius: '0 0 0 4px', zIndex: 5 }} />
                <div style={{ position: 'absolute', bottom: '8px', right: '8px', width: '16px', height: '16px', borderBottom: `2px solid ${COLORS.accent}40`, borderRight: `2px solid ${COLORS.accent}40`, borderRadius: '0 0 4px 0', zIndex: 5 }} />
            </div>

            {/* User Profile Modal - rendered outside sidebar container for proper fixed positioning */}
            {selectedUser && (
                <UserProfile
                    userId={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    isOwnProfile={user && user.id === selectedUser}
                />
            )}
        </>
    );
}