import React, { useState, useEffect } from 'react';
import { COLORS, API_BASE_URL, IMAGE_BASE_URL } from '../../config/constants.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { UserProfile } from './UserProfile.jsx';
import {
    X, Trophy, BookOpen, Zap, Layers, Sparkles, Star, Diamond,
    Medal, Crown, Award, Users, TrendingUp
} from 'lucide-react';

// Helper to get Discord avatar URL
function getDiscordAvatarUrl(discordId, avatarHash, size = 64) {
    if (avatarHash) {
        const format = avatarHash.startsWith('a_') ? 'gif' : 'png';
        return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${format}?size=${size}`;
    }
    const defaultIndex = (BigInt(discordId) >> 22n) % 6n;
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

// Tab Button Component
function TabButton({ active, onClick, children, icon }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '8px 14px',
                background: active ? COLORS.accent : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: active ? '#fff' : COLORS.textMuted,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background 0.2s ease, color 0.2s ease',
                minWidth: 'max-content',
            }}
            onMouseEnter={e => {
                if (!active) {
                    e.currentTarget.style.background = COLORS.bgLighter;
                    e.currentTarget.style.color = COLORS.text;
                }
            }}
            onMouseLeave={e => {
                if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = COLORS.textMuted;
                }
            }}
        >
            {icon}
            {children}
        </button>
    );
}

// Main Leaderboard Component
export function Leaderboard({ onClose }) {
    const [leaderboard, setLeaderboard] = useState([]);
    const [globalStats, setGlobalStats] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('collection');
    const [selectedUser, setSelectedUser] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/stats/global`)
            .then(res => res.json())
            .then(data => setGlobalStats(data))
            .catch(err => console.error('Failed to fetch global stats:', err));
    }, []);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/leaderboard?sort=${activeTab}`);
                const data = await res.json();
                setLeaderboard(data.leaderboard || []);
            } catch (err) {
                console.error('Failed to fetch leaderboard:', err);
            } finally {
                setInitialLoading(false);
            }
        };
        fetchLeaderboard();
    }, [activeTab]);

    const sortOptions = {
        collection: { label: 'Collection', icon: <BookOpen size={14} />, sortKey: 'unique_items' },
        spins: { label: 'Total Spins', icon: <TrendingUp size={14} />, sortKey: 'total_spins' },
        duplicates: { label: 'Duplicates', icon: <Layers size={14} />, sortKey: 'total_duplicates' },
        events: { label: 'Events', icon: <Zap size={14} />, sortKey: 'event_triggers' },
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

    const getColorForTab = () => {
        switch (activeTab) {
            case 'collection': return COLORS.gold;
            case 'spins': return COLORS.text;
            case 'duplicates': return COLORS.accent;
            case 'events': return COLORS.orange;
            default: return COLORS.gold;
        }
    };

    // Rank badge component
    const RankBadge = ({ rank }) => {
        if (rank === 1) {
            return (
                <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(255, 215, 0, 0.4)'
                }}>
                    <Crown size={16} color="#1a1a1a" />
                </div>
            );
        }
        if (rank === 2) {
            return (
                <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #C0C0C0, #A8A8A8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(192, 192, 192, 0.4)'
                }}>
                    <Medal size={16} color="#fff" />
                </div>
            );
        }
        if (rank === 3) {
            return (
                <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #CD7F32, #B87333)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(205, 127, 50, 0.4)'
                }}>
                    <Award size={16} color="#fff" />
                </div>
            );
        }
        return (
            <span style={{
                color: COLORS.textMuted,
                fontSize: '14px',
                width: '28px',
                display: 'inline-block',
                textAlign: 'center'
            }}>
                {rank}
            </span>
        );
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
        }}>
            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .leaderboard-row:hover {
                    background: ${COLORS.bgLighter} !important;
                }
            `}</style>

            <div style={{
                background: COLORS.bg,
                borderRadius: '16px',
                border: `1px solid ${COLORS.border}`,
                width: '100%',
                maxWidth: '700px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUp 0.3s ease'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <h2 style={{
                        margin: 0,
                        color: COLORS.text,
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '18px'
                    }}>
                        <Trophy size={22} color={COLORS.gold} />
                        Leaderboard
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: COLORS.bgLight,
                            border: `1px solid ${COLORS.border}`,
                            color: COLORS.textMuted,
                            cursor: 'pointer',
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.background = COLORS.bgLighter;
                            e.currentTarget.style.color = COLORS.text;
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.background = COLORS.bgLight;
                            e.currentTarget.style.color = COLORS.textMuted;
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Global Stats Bar */}
                {globalStats && (
                    <div style={{
                        padding: '14px 24px',
                        borderBottom: `1px solid ${COLORS.border}`,
                        background: COLORS.bgLight,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: '12px'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                color: COLORS.text,
                                fontSize: '15px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                            }}>
                                <Users size={12} color={COLORS.textMuted} />
                                {globalStats.total_players?.toLocaleString() || 0}
                            </div>
                            <div style={{ color: COLORS.textMuted, fontSize: '10px', marginTop: '2px' }}>Players</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: COLORS.gold, fontSize: '15px', fontWeight: '700' }}>
                                {globalStats.total_spins?.toLocaleString() || 0}
                            </div>
                            <div style={{ color: COLORS.textMuted, fontSize: '10px', marginTop: '2px' }}>Total Spins</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                color: COLORS.aqua,
                                fontSize: '15px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                            }}>
                                <Sparkles size={12} />
                                {globalStats.total_mythics || 0}
                            </div>
                            <div style={{ color: COLORS.textMuted, fontSize: '10px', marginTop: '2px' }}>Mythics</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                color: COLORS.purple,
                                fontSize: '15px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                            }}>
                                <Star size={12} />
                                {globalStats.total_legendaries?.toLocaleString() || 0}
                            </div>
                            <div style={{ color: COLORS.textMuted, fontSize: '10px', marginTop: '2px' }}>Legendaries</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                color: COLORS.red,
                                fontSize: '15px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                            }}>
                                <Diamond size={12} />
                                {globalStats.total_rares?.toLocaleString() || 0}
                            </div>
                            <div style={{ color: COLORS.textMuted, fontSize: '10px', marginTop: '2px' }}>Rares</div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div style={{
                    padding: '12px 24px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    gap: '6px',
                    overflowX: 'auto'
                }}>
                    {Object.entries(sortOptions).map(([key, opt]) => (
                        <TabButton
                            key={key}
                            active={activeTab === key}
                            onClick={() => setActiveTab(key)}
                            icon={opt.icon}
                        >
                            {opt.label}
                        </TabButton>
                    ))}
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
                    {initialLoading ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: COLORS.textMuted }}>
                            <TrendingUp size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                            <div>Loading...</div>
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: COLORS.textMuted }}>
                            <Trophy size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
                            <div>No entries yet!</div>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                            <tr style={{
                                borderBottom: `1px solid ${COLORS.border}`,
                                background: COLORS.bgLight
                            }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: COLORS.textMuted, fontSize: '11px', fontWeight: '500', textTransform: 'uppercase' }}>#</th>
                                <th style={{ padding: '12px 8px', textAlign: 'left', color: COLORS.textMuted, fontSize: '11px', fontWeight: '500', textTransform: 'uppercase' }}>Player</th>
                                <th style={{ padding: '12px 8px', textAlign: 'right', color: getColorForTab(), fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                            {sortOptions[activeTab].icon}
                                            {sortOptions[activeTab].label}
                                        </span>
                                </th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', color: COLORS.textMuted, fontSize: '11px', fontWeight: '500', textTransform: 'uppercase' }}>Special</th>
                            </tr>
                            </thead>
                            <tbody>
                            {leaderboard.map((entry, idx) => {
                                const isCurrentUser = user?.id === entry.id;
                                const rank = idx + 1;
                                const isTopThree = rank <= 3;

                                return (
                                    <tr
                                        key={entry.id}
                                        className="leaderboard-row"
                                        onClick={() => setSelectedUser(entry.id)}
                                        style={{
                                            borderBottom: `1px solid ${COLORS.border}22`,
                                            background: isCurrentUser
                                                ? `${COLORS.accent}15`
                                                : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s'
                                        }}
                                    >
                                        <td style={{ padding: '12px 16px' }}>
                                            <RankBadge rank={rank} />
                                        </td>
                                        <td style={{ padding: '12px 8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <img
                                                    src={getDiscordAvatarUrl(entry.discord_id, entry.discord_avatar, 64)}
                                                    alt={entry.custom_username}
                                                    style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '8px',
                                                        background: COLORS.bgLighter,
                                                    }}
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = `https://cdn.discordapp.com/embed/avatars/0.png`;
                                                    }}
                                                />
                                                <div>
                                                        <span style={{
                                                            color: isCurrentUser ? COLORS.accent : COLORS.text,
                                                            fontWeight: isCurrentUser || isTopThree ? '600' : '400',
                                                            fontSize: '14px'
                                                        }}>
                                                            {entry.custom_username}
                                                        </span>
                                                    {isCurrentUser && (
                                                        <span style={{
                                                            marginLeft: '6px',
                                                            fontSize: '10px',
                                                            color: COLORS.accent,
                                                            background: `${COLORS.accent}22`,
                                                            padding: '2px 6px',
                                                            borderRadius: '4px'
                                                        }}>
                                                                You
                                                            </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{
                                            padding: '12px 8px',
                                            textAlign: 'right',
                                            color: getColorForTab(),
                                            fontWeight: '600',
                                            fontFamily: 'monospace',
                                            fontSize: '14px'
                                        }}>
                                            {getValueForTab(entry).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                {entry.mythic_count > 0 && (
                                                    <span style={{
                                                        color: COLORS.aqua,
                                                        fontSize: '12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '3px',
                                                        fontWeight: '600'
                                                    }}>
                                                            <Sparkles size={12} />
                                                        {entry.mythic_count}
                                                        </span>
                                                )}
                                                {entry.legendary_count > 0 && (
                                                    <span style={{
                                                        color: COLORS.purple,
                                                        fontSize: '12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '3px',
                                                        fontWeight: '600'
                                                    }}>
                                                            <Star size={12} />
                                                        {entry.legendary_count}
                                                        </span>
                                                )}
                                                {entry.rare_count > 0 && (
                                                    <span style={{
                                                        color: COLORS.red,
                                                        fontSize: '12px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '3px',
                                                        fontWeight: '600'
                                                    }}>
                                                            <Diamond size={12} />
                                                        {entry.rare_count}
                                                        </span>
                                                )}
                                                {!entry.mythic_count && !entry.legendary_count && !entry.rare_count && (
                                                    <span style={{ color: COLORS.textMuted, fontSize: '12px' }}>—</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer hint */}
                <div style={{
                    padding: '12px 24px',
                    borderTop: `1px solid ${COLORS.border}`,
                    textAlign: 'center',
                    color: COLORS.textMuted,
                    fontSize: '11px'
                }}>
                    Click on a player to view their profile
                </div>
            </div>

            {/* User Profile Modal */}
            {selectedUser && (
                <UserProfile
                    userId={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    isOwnProfile={user && user.id === selectedUser}
                />
            )}
        </div>
    );
}