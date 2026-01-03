import React, { useState, useEffect } from 'react';
import { COLORS, API_BASE_URL, IMAGE_BASE_URL } from './constants';
import { useAuth } from './AuthContext';

// Helper to get Discord avatar URL
function getDiscordAvatarUrl(discordId, avatarHash, size = 64) {
    if (avatarHash) {
        // User has a custom avatar
        const format = avatarHash.startsWith('a_') ? 'gif' : 'png';
        return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${format}?size=${size}`;
    }
    // Default avatar based on user id
    const defaultIndex = (BigInt(discordId) >> 22n) % 6n;
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

// Helper to get item image URL
function getItemImageUrl(texture) {
    if (!texture) return `${IMAGE_BASE_URL}/barrier.png`;
    // Special items (player heads)
    if (texture.startsWith('special_') || texture.startsWith('rare_')) {
        const username = texture.replace(/^(special_|rare_)/, '');
        return `https://mc-heads.net/avatar/${username}/32`;
    }
    if (texture.startsWith('mythic_') && texture !== 'mythic_cavendish') {
        const username = texture.replace('mythic_', '');
        return `https://mc-heads.net/avatar/${username}/32`;
    }
    if (texture === 'mythic_cavendish') {
        return 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/item/cavendish.png';
    }
    // Regular minecraft items
    return `${IMAGE_BASE_URL}/${texture}.png`;
}

// Tab Button Component
function TabButton({ active, onClick, children, icon }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '10px 16px',
                background: active ? COLORS.accent : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: active ? '#fff' : COLORS.textMuted,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500', // Fixed weight to prevent width shifts
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background 0.2s ease, color 0.2s ease', // Only animate non-layout properties
                minWidth: 'max-content', // Prevent shrinking
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
            {icon && <span style={{ fontSize: '14px' }}>{icon}</span>}
            {children}
        </button>
    );
}

// Stat Card Component
function StatCard({ label, value, icon, color, subValue }) {
    return (
        <div style={{
            background: `linear-gradient(135deg, ${COLORS.bgLighter} 0%, ${COLORS.bgLight} 100%)`,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            position: 'relative',
            overflow: 'hidden',
        }}>
            <div style={{
                position: 'absolute',
                top: '-10px',
                right: '-10px',
                fontSize: '48px',
                opacity: 0.05,
                transform: 'rotate(15deg)',
            }}>{icon}</div>
            <div style={{ color: COLORS.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {label}
            </div>
            <div style={{ color: color || COLORS.text, fontSize: '24px', fontWeight: '700', fontFamily: 'monospace' }}>
                {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            {subValue && (
                <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>
                    {subValue}
                </div>
            )}
        </div>
    );
}

// User Profile Modal
function UserProfileModal({ userId, onClose }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const { user: currentUser } = useAuth();

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/user/${userId}/profile`)
            .then(res => res.json())
            .then(data => setProfile(data))
            .catch(err => console.error('Failed to fetch profile:', err))
            .finally(() => setLoading(false));
    }, [userId]);

    if (loading) {
        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', zIndex: 1100
            }}>
                <div style={{ color: COLORS.textMuted }}>Loading profile...</div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', zIndex: 1100
            }}>
                <div style={{ color: COLORS.red }}>Failed to load profile</div>
            </div>
        );
    }

    const isCurrentUser = currentUser?.id === profile.id;

    return (
        <div
            onClick={(e) => e.target === e.currentTarget && onClose()}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', zIndex: 1100, padding: '20px'
            }}
        >
            <div style={{
                background: COLORS.bg,
                borderRadius: '16px',
                border: `1px solid ${COLORS.border}`,
                width: '100%',
                maxWidth: '500px',
                maxHeight: '85vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUp 0.3s ease'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bg} 100%)`,
                    position: 'relative'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute', top: '16px', right: '16px',
                            background: 'transparent', border: 'none',
                            color: COLORS.textMuted, fontSize: '24px', cursor: 'pointer'
                        }}
                    >Ã—</button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <img
                            src={getDiscordAvatarUrl(profile.discord_id, profile.discord_avatar, 128)}
                            alt={profile.custom_username}
                            style={{
                                width: '64px', height: '64px',
                                borderRadius: '12px',
                                background: COLORS.bgLighter,
                            }}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `https://cdn.discordapp.com/embed/avatars/0.png`;
                            }}
                        />
                        <div>
                            <h2 style={{ margin: 0, color: COLORS.text, fontWeight: '600', fontSize: '20px' }}>
                                {profile.custom_username}
                                {isCurrentUser && (
                                    <span style={{ marginLeft: '8px', fontSize: '12px', color: COLORS.accent, fontWeight: '400' }}>
                                        (You)
                                    </span>
                                )}
                            </h2>
                            <div style={{ color: COLORS.textMuted, fontSize: '12px', marginTop: '4px' }}>
                                Rank #{profile.rank} • Joined {new Date(profile.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div style={{ padding: '20px', overflowY: 'auto' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '12px',
                        marginBottom: '20px'
                    }}>
                        <StatCard
                            label="Unique Items"
                            value={profile.unique_items}
                            icon="ðŸ“¦"
                            color={COLORS.gold}
                            subValue={`${((profile.unique_items / profile.total_possible) * 100).toFixed(1)}% complete`}
                        />
                        <StatCard
                            label="Total Spins"
                            value={profile.total_spins}
                            icon="🎰"
                        />
                        <StatCard
                            label="Total Duplicates"
                            value={profile.total_duplicates}
                            icon="ðŸ“‹"
                            subValue={`${profile.unique_items > 0 ? (profile.total_duplicates / profile.unique_items).toFixed(1) : 0} avg per item`}
                        />
                        <StatCard
                            label="Event Triggers"
                            value={profile.event_triggers}
                            icon="⚡"
                            color={COLORS.orange}
                        />
                    </div>

                    {/* Most Duplicated Item */}
                    {profile.most_duplicated && (
                        <div style={{
                            background: COLORS.bgLight,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '16px'
                        }}>
                            <div style={{ color: COLORS.textMuted, fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Most Duplicated Item
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '40px', height: '40px',
                                    background: COLORS.bgLighter,
                                    borderRadius: '8px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <img
                                        src={getItemImageUrl(profile.most_duplicated.item_texture)}
                                        alt={profile.most_duplicated.item_name}
                                        style={{ width: '32px', height: '32px', imageRendering: 'pixelated' }}
                                        onError={(e) => { e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: COLORS.text, fontWeight: '500' }}>
                                        {profile.most_duplicated.item_name}
                                    </div>
                                    <div style={{ color: COLORS.textMuted, fontSize: '12px' }}>
                                        Ã—{profile.most_duplicated.count.toLocaleString()} collected
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Rarity Breakdown */}
                    <div style={{
                        background: COLORS.bgLight,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: '12px',
                        padding: '16px'
                    }}>
                        <div style={{ color: COLORS.textMuted, fontSize: '11px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Rarity Breakdown
                        </div>
                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-around' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ color: COLORS.aqua, fontSize: '20px', fontWeight: '700' }}>
                                    {profile.mythic_count}
                                </div>
                                <div style={{ color: COLORS.aqua, fontSize: '11px' }}>✦ Mythic</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ color: COLORS.purple, fontSize: '20px', fontWeight: '700' }}>
                                    {profile.legendary_count}
                                </div>
                                <div style={{ color: COLORS.purple, fontSize: '11px' }}>★ Legendary</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ color: COLORS.red, fontSize: '20px', fontWeight: '700' }}>
                                    {profile.rare_count}
                                </div>
                                <div style={{ color: COLORS.red, fontSize: '11px' }}>◆ Rare</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Main Leaderboard Component
export function Leaderboard({ onClose }) {
    const [leaderboard, setLeaderboard] = useState([]);
    const [globalStats, setGlobalStats] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true); // Only for first load
    const [activeTab, setActiveTab] = useState('collection');
    const [selectedUser, setSelectedUser] = useState(null);
    const { user } = useAuth();

    // Fetch global stats once on mount
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/stats/global`)
            .then(res => res.json())
            .then(data => setGlobalStats(data))
            .catch(err => console.error('Failed to fetch global stats:', err));
    }, []);

    // Fetch leaderboard when tab changes
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
        collection: { label: 'Collection', icon: 'ðŸ“¦', sortKey: 'unique_items' },
        spins: { label: 'Total Spins', icon: '🎰', sortKey: 'total_spins' },
        duplicates: { label: 'Duplicates', icon: 'ðŸ“‹', sortKey: 'total_duplicates' },
        events: { label: 'Events', icon: '⚡', sortKey: 'event_triggers' },
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
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
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
                    <h2 style={{ margin: 0, color: COLORS.text, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>ðŸ†</span>
                        Leaderboard
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent', border: 'none',
                            color: COLORS.textMuted, fontSize: '24px', cursor: 'pointer',
                            width: '32px', height: '32px', borderRadius: '8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = COLORS.bgLighter}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >Ã—</button>
                </div>

                {/* Global Stats Bar */}
                {globalStats && (
                    <div style={{
                        padding: '16px 24px',
                        borderBottom: `1px solid ${COLORS.border}`,
                        background: COLORS.bgLight,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                        gap: '12px'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: COLORS.text, fontSize: '16px', fontWeight: '700' }}>
                                {globalStats.total_players?.toLocaleString() || 0}
                            </div>
                            <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>Players</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: COLORS.gold, fontSize: '16px', fontWeight: '700' }}>
                                {globalStats.total_spins?.toLocaleString() || 0}
                            </div>
                            <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>Total Spins</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: COLORS.aqua, fontSize: '16px', fontWeight: '700' }}>
                                {globalStats.total_mythics || 0}
                            </div>
                            <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>Mythics</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: COLORS.purple, fontSize: '16px', fontWeight: '700' }}>
                                {globalStats.total_legendaries?.toLocaleString() || 0}
                            </div>
                            <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>Legendaries</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: COLORS.red, fontSize: '16px', fontWeight: '700' }}>
                                {globalStats.total_rares?.toLocaleString() || 0}
                            </div>
                            <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>Rares</div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div style={{
                    padding: '12px 24px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    gap: '8px',
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
                <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
                    {initialLoading ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: COLORS.textMuted }}>
                            <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'fadeIn 0.5s ease infinite alternate' }}>🎰</div>
                            Loading...
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: COLORS.textMuted }}>
                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎰</div>
                            <div>No entries yet!</div>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                            <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                                <th style={{ padding: '12px 8px', textAlign: 'left', color: COLORS.textMuted, fontSize: '12px', fontWeight: '500' }}>#</th>
                                <th style={{ padding: '12px 8px', textAlign: 'left', color: COLORS.textMuted, fontSize: '12px', fontWeight: '500' }}>Player</th>
                                <th style={{ padding: '12px 8px', textAlign: 'right', color: getColorForTab(), fontSize: '12px', fontWeight: '600' }}>
                                    {sortOptions[activeTab].icon} {sortOptions[activeTab].label}
                                </th>
                                <th style={{ padding: '12px 8px', textAlign: 'right', color: COLORS.textMuted, fontSize: '12px', fontWeight: '500' }}>Rare+</th>
                            </tr>
                            </thead>
                            <tbody>
                            {leaderboard.map((entry, idx) => {
                                const isCurrentUser = user?.id === entry.id;
                                const rank = idx + 1;

                                // Top 3 styling
                                const podiumColors = {
                                    1: { bg: 'rgba(255, 215, 0, 0.08)', border: '#FFD700', gradient: 'linear-gradient(135deg, #FFD700, #FFA500)' },  // Gold
                                    2: { bg: 'rgba(192, 192, 192, 0.08)', border: '#C0C0C0', gradient: 'linear-gradient(135deg, #C0C0C0, #A8A8A8)' }, // Silver
                                    3: { bg: 'rgba(205, 127, 50, 0.08)', border: '#CD7F32', gradient: 'linear-gradient(135deg, #CD7F32, #B87333)' }   // Bronze
                                };
                                const podiumStyle = podiumColors[rank];

                                // Rank badge for top 3
                                const rankBadge = rank <= 3 ? (
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '6px',
                                        background: podiumStyle.gradient,
                                        color: rank === 1 ? '#1a1a1a' : '#fff',
                                        fontWeight: '700',
                                        fontSize: '12px',
                                        boxShadow: `0 2px 4px ${podiumStyle.border}44`
                                    }}>
                                        {rank}
                                    </span>
                                ) : rank;

                                return (
                                    <tr
                                        key={entry.id}
                                        className="leaderboard-row"
                                        onClick={() => setSelectedUser(entry.id)}
                                        style={{
                                            borderBottom: `1px solid ${COLORS.border}22`,
                                            background: isCurrentUser
                                                ? `${COLORS.accent}11`
                                                : podiumStyle
                                                    ? podiumStyle.bg
                                                    : 'transparent',
                                            borderLeft: podiumStyle ? `3px solid ${podiumStyle.border}` : '3px solid transparent',
                                            cursor: 'pointer',
                                            transition: 'background 0.15s'
                                        }}
                                    >
                                        <td style={{
                                            padding: '14px 8px',
                                            color: rank <= 3 ? podiumStyle.border : COLORS.textMuted,
                                            fontSize: '14px'
                                        }}>
                                            {rankBadge}
                                        </td>
                                        <td style={{ padding: '14px 8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <img
                                                    src={getDiscordAvatarUrl(entry.discord_id, entry.discord_avatar, 64)}
                                                    alt={entry.custom_username}
                                                    style={{
                                                        width: '28px', height: '28px',
                                                        borderRadius: '6px',
                                                        background: COLORS.bgLighter,
                                                    }}
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = `https://cdn.discordapp.com/embed/avatars/0.png`;
                                                    }}
                                                />
                                                <span style={{ color: isCurrentUser ? COLORS.accent : COLORS.text, fontWeight: isCurrentUser ? '600' : '400' }}>
                                                        {entry.custom_username}
                                                    {isCurrentUser && (
                                                        <span style={{ marginLeft: '8px', fontSize: '11px', color: COLORS.accent, opacity: 0.7 }}>(You)</span>
                                                    )}
                                                    </span>
                                            </div>
                                        </td>
                                        <td style={{
                                            padding: '14px 8px',
                                            textAlign: 'right',
                                            color: getColorForTab(),
                                            fontWeight: '600',
                                            fontFamily: 'monospace',
                                            fontSize: '14px'
                                        }}>
                                            {getValueForTab(entry).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                {entry.mythic_count > 0 && (
                                                    <span style={{
                                                        color: COLORS.aqua,
                                                        fontSize: '12px',
                                                        display: 'flex', alignItems: 'center', gap: '2px'
                                                    }}>
                                                            ✦{entry.mythic_count}
                                                        </span>
                                                )}
                                                {entry.legendary_count > 0 && (
                                                    <span style={{
                                                        color: COLORS.purple,
                                                        fontSize: '12px',
                                                        display: 'flex', alignItems: 'center', gap: '2px'
                                                    }}>
                                                            ★{entry.legendary_count}
                                                        </span>
                                                )}
                                                {entry.rare_count > 0 && (
                                                    <span style={{
                                                        color: COLORS.red,
                                                        fontSize: '12px',
                                                        display: 'flex', alignItems: 'center', gap: '2px'
                                                    }}>
                                                            ◆{entry.rare_count}
                                                        </span>
                                                )}
                                                {!entry.mythic_count && !entry.legendary_count && !entry.rare_count && (
                                                    <span style={{ color: COLORS.textMuted }}>-</span>
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
                    fontSize: '12px'
                }}>
                    Click on a player to view their profile
                </div>
            </div>

            {/* User Profile Modal */}
            {selectedUser && (
                <UserProfileModal
                    userId={selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            )}
        </div>
    );
}