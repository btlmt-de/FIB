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
        switch (activeTab) {
            case 'collection': return entry.unique_items;
            case 'spins': return entry.total_spins;
            case 'duplicates': return entry.total_duplicates;
            case 'events': return entry.event_triggers;
            default: return entry.unique_items;
        }
    };

    const RankBadge = ({ rank }) => {
        if (rank === 1) {
            return (
                <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #FFE55C, #FFA500)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #FFD700',
                    boxShadow: '0 0 12px #FFAA0040, inset 0 1px 2px rgba(255,255,255,0.3)'
                }}>
                    <Crown size={13} color="#1a1a1a" />
                </div>
            );
        }
        if (rank === 2) {
            return (
                <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #E8E8E8, #C0C0C0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #D0D0D0',
                    boxShadow: '0 0 12px #C0C0C040, inset 0 1px 2px rgba(255,255,255,0.4)'
                }}>
                    <Medal size={13} color="#1a1a1a" />
                </div>
            );
        }
        if (rank === 3) {
            return (
                <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #E8956F, #CD7F32)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #D2691E',
                    boxShadow: '0 0 12px #CD7F3240, inset 0 1px 2px rgba(255,255,255,0.2)'
                }}>
                    <Award size={13} color="#fff" />
                </div>
            );
        }
        return (
            <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: `linear-gradient(135deg, ${COLORS.bgLighter}, ${COLORS.bg})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
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
                width: '340px',
                height: '520px',
                background: `${COLORS.bg}ee`,
                borderRadius: '14px',
                border: `1px solid ${COLORS.border}`,
                display: 'flex',
                flexDirection: 'column',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 18px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    background: `linear-gradient(135deg, ${COLORS.bgLight}aa 0%, ${COLORS.bg}aa 100%)`,
                    borderRadius: '14px 14px 0 0',
                    boxShadow: `inset 0 1px 0 ${COLORS.border}`
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Trophy size={18} color={COLORS.gold} />
                            <span style={{
                                color: COLORS.text,
                                fontWeight: '600',
                                fontSize: '15px'
                            }}>
                            Leaderboard
                        </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                                onClick={loadLeaderboard}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: COLORS.textMuted,
                                    cursor: 'pointer',
                                    padding: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    borderRadius: '6px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = COLORS.bgLighter;
                                    e.currentTarget.style.color = COLORS.text;
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = COLORS.textMuted;
                                }}
                                title="Refresh"
                            >
                                <RefreshCw size={16} />
                            </button>
                            {onOpenFull && (
                                <button
                                    onClick={onOpenFull}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: COLORS.textMuted,
                                        cursor: 'pointer',
                                        padding: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        borderRadius: '6px',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = COLORS.bgLighter;
                                        e.currentTarget.style.color = COLORS.text;
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = COLORS.textMuted;
                                    }}
                                    title="Open full view"
                                >
                                    <ExternalLink size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Tab buttons */}
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        background: COLORS.bg,
                        borderRadius: '8px',
                        padding: '4px'
                    }}>
                        {Object.entries(sortOptions).map(([key, { label, icon }]) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                style={{
                                    flex: 1,
                                    padding: '6px 6px',
                                    background: activeTab === key ? `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent}dd)` : 'transparent',
                                    border: activeTab === key ? `1px solid ${COLORS.accent}` : '1px solid transparent',
                                    borderRadius: '5px',
                                    color: activeTab === key ? '#fff' : COLORS.textMuted,
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    transition: 'all 0.3s',
                                    boxShadow: activeTab === key ? `0 0 8px ${COLORS.accent}30` : 'none'
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
                .sidebar-leaderboard-row {
                    transition: all 0.3s ease;
                    animation: slideIn 0.4s ease-out;
                    border-radius: 6px;
                    margin: 0 6px;
                }
                .sidebar-leaderboard-row:hover {
                    background: ${COLORS.bgLighter} !important;
                    transform: translateX(3px);
                    box-shadow: inset 0 0 10px rgba(88, 101, 242, 0.08);
                }
                .leaderboard-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                .leaderboard-scroll::-webkit-scrollbar-track {
                    background: ${COLORS.bg};
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
                    padding: '6px 0'
                }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '30px', color: COLORS.textMuted, fontSize: '13px' }}>
                            Loading...
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
                                        background: isCurrentUser ? `linear-gradient(90deg, ${COLORS.accent}15 0%, transparent 100%)` : 'transparent',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <RankBadge rank={rank} />

                                    {/* Avatar */}
                                    <img
                                        src={getDiscordAvatarUrl(entry.discord_id, entry.discord_avatar, 32)}
                                        alt=""
                                        style={{
                                            width: '26px',
                                            height: '26px',
                                            borderRadius: '5px',
                                            flexShrink: 0,
                                            border: `1.5px solid ${COLORS.border}`,
                                            boxShadow: `0 0 8px ${COLORS.accent}15`
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
                                        fontWeight: isCurrentUser ? '600' : '400',
                                        color: isCurrentUser ? COLORS.accent : COLORS.text,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {entry.custom_username}
                                        {isCurrentUser && (
                                            <span style={{
                                                marginLeft: '6px',
                                                fontSize: '9px',
                                                color: '#fff',
                                                background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent}dd)`,
                                                padding: '3px 6px',
                                                borderRadius: '4px',
                                                fontWeight: '600',
                                                border: `1px solid ${COLORS.accent}`,
                                                boxShadow: `0 0 8px ${COLORS.accent}40`
                                            }}>
                                            You
                                        </span>
                                        )}
                                    </div>

                                    {/* Value */}
                                    <div style={{
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: sortOptions[activeTab].color,
                                        fontFamily: 'monospace'
                                    }}>
                                        {(getValueForTab(entry) || 0).toLocaleString()}
                                    </div>

                                    {/* Special items indicators */}
                                    <div style={{
                                        display: 'flex',
                                        gap: '6px',
                                        alignItems: 'center',
                                        minWidth: '55px',
                                        justifyContent: 'flex-end'
                                    }}>
                                        {entry.mythic_count > 0 && (
                                            <span style={{
                                                color: COLORS.aqua,
                                                fontSize: '11px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '2px',
                                                background: `${COLORS.aqua}15`,
                                                padding: '2px 4px',
                                                borderRadius: '3px',
                                                border: `1px solid ${COLORS.aqua}30`,
                                                fontWeight: '600'
                                            }}>
                                            <Sparkles size={10} />{entry.mythic_count}
                                        </span>
                                        )}
                                        {entry.legendary_count > 0 && (
                                            <span style={{
                                                color: COLORS.purple,
                                                fontSize: '11px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '2px',
                                                background: `${COLORS.purple}15`,
                                                padding: '2px 4px',
                                                borderRadius: '3px',
                                                border: `1px solid ${COLORS.purple}30`,
                                                fontWeight: '600'
                                            }}>
                                            <Star size={10} />{entry.legendary_count}
                                        </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '12px 14px',
                    borderTop: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '10px',
                    color: COLORS.textMuted,
                    background: `linear-gradient(135deg, ${COLORS.bg}aa 0%, ${COLORS.bgLight}aa 100%)`,
                    boxShadow: `inset 0 -1px 0 ${COLORS.border}`
                }}>
                    <span>Top 12 players</span>
                    {lastUpdated && (
                        <span>Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                </div>
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