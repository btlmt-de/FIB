import React, { useState, useEffect, useRef, useCallback } from 'react';
import { COLORS, API_BASE_URL } from '../../config/constants.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { UserProfile } from './UserProfile.jsx';
import {
    Trophy, RefreshCw, ExternalLink, Crown, Medal, Award,
    Sparkles, Star, Diamond, BookOpen, TrendingUp, Layers, Zap
} from 'lucide-react';

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
    const intervalRef = useRef(null);
    const { user } = useAuth();

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