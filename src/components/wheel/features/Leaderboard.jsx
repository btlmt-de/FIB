import React, { useState, useEffect } from 'react';
import { API_BASE_URL, IMAGE_BASE_URL } from '../../../config/constants.js';
import { COLORS } from '../config/constants';
import { getDiscordAvatarUrl } from '../../../utils/helpers.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { RARITY, RARITY_KEYS, getRarityIcon, getRarityInk } from '../../../utils/rarityHelpers.jsx';
import { UserProfile } from './UserProfile.jsx';
import {
    X, Trophy, BookOpen, Zap, Layers, Sparkles, Star, Diamond,
    Medal, Crown, Award, Users, TrendingUp
} from 'lucide-react';

/**
 * Server-wide totals come back from getGlobalStats under pluralised names that do
 * not follow the per-player `<tier>_count` / `total_<tier>` pattern, so the
 * mapping has to be written out. Kept next to the ladder it maps rather than
 * inlined, because a missing entry here renders a silent zero, not an error.
 */
const GLOBAL_TOTAL_FIELD = {
    insane: 'total_insanes',
    mythic: 'total_mythics',
    legendary: 'total_legendaries',
    exotic: 'total_exotics',
    rare: 'total_rares',
};

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
        let value;
        switch (activeTab) {
            case 'collection': value = entry.unique_items; break;
            case 'spins': value = entry.total_spins; break;
            case 'duplicates': value = entry.total_duplicates; break;
            case 'events': value = entry.event_triggers; break;
            default: value = entry.unique_items;
        }
        return Number(value) || 0;
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
                        // auto-fit, not a fixed count. This was `repeat(6, 1fr)`,
                        // matching the two fixed cells plus four tiers exactly — so
                        // adding exotic pushed rare onto a second row on its own.
                        // The column count now follows the ladder's length and the
                        // available width instead of being a number to remember.
                        gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))',
                        gap: '10px'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                color: COLORS.text,
                                fontSize: '14px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                            }}>
                                <Users size={11} color={COLORS.textMuted} />
                                {globalStats.total_players?.toLocaleString() || 0}
                            </div>
                            <div style={{ color: COLORS.textMuted, fontSize: '9px', marginTop: '2px' }}>Players</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: COLORS.gold, fontSize: '14px', fontWeight: '700' }}>
                                {globalStats.total_spins?.toLocaleString() || 0}
                            </div>
                            <div style={{ color: COLORS.textMuted, fontSize: '9px', marginTop: '2px' }}>Total Spins</div>
                        </div>
                        {/* One cell per tier, derived from the shared ladder. Note the
                            field names here are pluralised and differ from the per-player
                            ones (total_insanes vs insane_count) — they come from
                            getGlobalStats, a separate query. The plural label is the
                            tier's own, so Insane stays "Insane" rather than "Insanes". */}
                        {RARITY_KEYS
                            .filter(key => key !== 'common' && key !== 'event')
                            .map(key => (
                                <div key={key} style={{ textAlign: 'center' }}>
                                    <div style={{
                                        color: getRarityInk(key),
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px'
                                    }}>
                                        {getRarityIcon(key, 11, false)}
                                        {(globalStats[GLOBAL_TOTAL_FIELD[key]] || 0).toLocaleString()}
                                    </div>
                                    <div style={{ color: COLORS.textMuted, fontSize: '9px', marginTop: '2px' }}>
                                        {RARITY[key].label}
                                    </div>
                                </div>
                            ))}
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
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                {(() => {
                                                    // Derived from the shared ladder, so a new tier needs
                                                    // no edit here. The em-dash fallback keys off the same
                                                    // list rather than a hand-written chain of negations —
                                                    // that chain silently stopped covering every tier the
                                                    // moment exotic existed, so a player with only exotic
                                                    // items would have shown both a badge and a "—".
                                                    const owned = RARITY_KEYS
                                                        .filter(key => key !== 'common' && key !== 'event')
                                                        .map(key => ({ key, count: entry[`${key}_count`] || 0 }))
                                                        .filter(t => t.count > 0);

                                                    if (owned.length === 0) {
                                                        return <span style={{ color: COLORS.textMuted, fontSize: '12px' }}>—</span>;
                                                    }

                                                    return owned.map(({ key, count }) => (
                                                        <span key={key} title={RARITY[key].label} style={{
                                                            color: getRarityInk(key),
                                                            fontSize: '12px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '3px',
                                                            fontWeight: '600'
                                                        }}>
                                                            {getRarityIcon(key, 12, false)}
                                                            {count}
                                                        </span>
                                                    ));
                                                })()}
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