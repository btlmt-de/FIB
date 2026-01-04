import React, { useState, useEffect } from 'react';
import { COLORS, API_BASE_URL, IMAGE_BASE_URL } from '../../config/constants.js';
import { getMinecraftHeadUrl } from '../../utils/helpers.js';
import { Achievements } from './Achievements.jsx';
import * as LucideIcons from 'lucide-react';
import {
    X, User, Trophy, Sparkles, Star, Diamond, Zap, Target,
    TrendingUp, Calendar, BarChart3, Crown, Flame, Clock,
    ChevronRight, Award, Edit3, Percent, HelpCircle, Plus, Check,
    Package, Settings, Image
} from 'lucide-react';

// Helper to render Lucide icons by name
function AchievementIcon({ name, size = 16, color, style = {} }) {
    const IconComponent = LucideIcons[name];
    if (!IconComponent) {
        return <Award size={size} color={color} style={style} />;
    }
    return <IconComponent size={size} color={color} style={style} />;
}

export function UserProfile({ userId, onClose, isOwnProfile, onEditUsername }) {
    const [profile, setProfile] = useState(null);
    const [extendedStats, setExtendedStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [showLuckTooltip, setShowLuckTooltip] = useState(false);
    const [rankings, setRankings] = useState({ spins: null, events: null });
    const [specialItemTotals, setSpecialItemTotals] = useState({ mythic: 0, legendary: 0, rare: 0 });
    const [uniqueCollected, setUniqueCollected] = useState({ mythic: 0, legendary: 0, rare: 0 });
    const [showAchievements, setShowAchievements] = useState(false);

    // Showcase data
    const [badges, setBadges] = useState([]);
    const [showcase, setShowcase] = useState([]);
    const [userAchievements, setUserAchievements] = useState([]);
    const [userCollection, setUserCollection] = useState([]);

    // Edit modals
    const [showBadgeEditor, setShowBadgeEditor] = useState(false);
    const [showShowcaseEditor, setShowShowcaseEditor] = useState(false);
    const [pendingBadges, setPendingBadges] = useState([]);
    const [pendingShowcase, setPendingShowcase] = useState([]);

    useEffect(() => {
        loadProfile();
    }, [userId]);

    async function loadProfile() {
        try {
            // Batch all fetches together for better performance
            const fetchPromises = [
                fetch(`${API_BASE_URL}/api/user/${userId}/profile`),
                isOwnProfile
                    ? fetch(`${API_BASE_URL}/api/stats/me`, { credentials: 'include' })
                    : Promise.resolve(null),
                fetch(`${API_BASE_URL}/api/user/${userId}/badges`),
                fetch(`${API_BASE_URL}/api/user/${userId}/showcase`),
                isOwnProfile
                    ? fetch(`${API_BASE_URL}/api/stats/rankings/${userId}`, { credentials: 'include' })
                    : Promise.resolve(null),
                fetch(`${API_BASE_URL}/api/special-items`),
                fetch(`${API_BASE_URL}/api/user/${userId}/collection`)
            ];

            const [profileRes, statsRes, badgesRes, showcaseRes, rankingsRes, specialRes, collectionRes] = await Promise.all(fetchPromises);

            const profileData = await profileRes.json();
            setProfile(profileData);

            if (statsRes) {
                const statsData = await statsRes.json();
                setExtendedStats(statsData);
            }

            const badgesData = await badgesRes.json();
            setBadges(badgesData.badges || []);

            const showcaseData = await showcaseRes.json();
            setShowcase(showcaseData.showcase || []);

            // Process rankings if available
            if (rankingsRes && rankingsRes.ok) {
                const rankingsData = await rankingsRes.json();
                setRankings(rankingsData);
            }

            // Get special items and collection for completion tracking
            const specialData = await specialRes.json();
            const items = specialData.items || [];

            const mythicItems = items.filter(i => i.rarity === 'mythic');
            const legendaryItems = items.filter(i => i.rarity === 'legendary');
            const rareItems = items.filter(i => i.rarity === 'rare');

            setSpecialItemTotals({
                mythic: mythicItems.length,
                legendary: legendaryItems.length,
                rare: rareItems.length
            });

            // Get user's collection to count unique collected per rarity
            const collectionData = await collectionRes.json();
            const userCollectionMap = collectionData.collection || {};

            // Count how many unique items of each rarity the user has
            const collectedMythic = mythicItems.filter(item => userCollectionMap[item.texture] > 0).length;
            const collectedLegendary = legendaryItems.filter(item => userCollectionMap[item.texture] > 0).length;
            const collectedRare = rareItems.filter(item => userCollectionMap[item.texture] > 0).length;

            setUniqueCollected({
                mythic: collectedMythic,
                legendary: collectedLegendary,
                rare: collectedRare
            });
        } catch (e) {
            console.error('Failed to load profile:', e);
        } finally {
            setLoading(false);
        }
    }

    async function loadAchievementsForEditor() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/achievements/me`, { credentials: 'include' });
            const data = await res.json();
            setUserAchievements(data.unlocked || []);
            setPendingBadges(badges.map(b => b.id));
        } catch (e) {
            console.error('Failed to load achievements:', e);
        }
    }

    async function loadCollectionForEditor() {
        try {
            // Fetch both collection and special items data
            const [collectionRes, specialRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/collection`, { credentials: 'include' }),
                fetch(`${API_BASE_URL}/api/special-items`)
            ]);

            const collectionData = await collectionRes.json();
            const specialData = await specialRes.json();

            // Create lookup map for special items (username, image_url)
            const specialItemsMap = {};
            (specialData.items || []).forEach(item => {
                specialItemsMap[item.texture] = {
                    username: item.username,
                    image_url: item.image_url
                };
            });

            // Convert collectionDetails object to array and filter for special items only
            const collectionDetails = collectionData.collectionDetails || {};
            const items = Object.entries(collectionDetails)
                .map(([texture, info]) => ({
                    item_texture: texture,
                    item_name: info.name,
                    item_type: info.type,
                    count: info.count,
                    username: specialItemsMap[texture]?.username,
                    image_url: specialItemsMap[texture]?.image_url
                }))
                .filter(item => ['mythic', 'legendary', 'rare', 'event'].includes(item.item_type));

            // Sort by rarity: mythic > legendary > rare > event
            const rarityOrder = { mythic: 0, legendary: 1, rare: 2, event: 3 };
            const sorted = items.sort((a, b) => {
                const orderA = rarityOrder[a.item_type] ?? 4;
                const orderB = rarityOrder[b.item_type] ?? 4;
                return orderA - orderB;
            });

            setUserCollection(sorted);
            setPendingShowcase(showcase.map(s => s.item_texture));
        } catch (e) {
            console.error('Failed to load collection:', e);
        }
    }

    async function saveBadges() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/badges/me`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ badges: pendingBadges })
            });
            const data = await res.json();
            if (data.badges) {
                setBadges(data.badges);
            }
            setShowBadgeEditor(false);
        } catch (e) {
            console.error('Failed to save badges:', e);
        }
    }

    async function saveShowcase() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/showcase/me`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ items: pendingShowcase })
            });
            const data = await res.json();
            if (data.showcase) {
                setShowcase(data.showcase);
            }
            setShowShowcaseEditor(false);
        } catch (e) {
            console.error('Failed to save showcase:', e);
        }
    }

    function toggleBadge(achievementId) {
        if (pendingBadges.includes(achievementId)) {
            setPendingBadges(pendingBadges.filter(id => id !== achievementId));
        } else if (pendingBadges.length < 3) {
            setPendingBadges([...pendingBadges, achievementId]);
        }
    }

    function toggleShowcaseItem(texture) {
        if (pendingShowcase.includes(texture)) {
            setPendingShowcase(pendingShowcase.filter(t => t !== texture));
        } else if (pendingShowcase.length < 3) {
            setPendingShowcase([...pendingShowcase, texture]);
        }
    }

    function getDiscordAvatarUrl(discordId, avatarHash, size = 128) {
        if (!discordId) return 'https://cdn.discordapp.com/embed/avatars/0.png';
        if (avatarHash) {
            const format = avatarHash.startsWith('a_') ? 'gif' : 'png';
            return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${format}?size=${size}`;
        }
        try {
            const defaultIndex = Number(BigInt(discordId) >> 22n) % 6;
            return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
        } catch {
            return 'https://cdn.discordapp.com/embed/avatars/0.png';
        }
    }

    function getLuckInfo(rating, percentile) {
        if (!rating) return { color: COLORS.textMuted, label: 'Unknown' };

        let label;
        if (percentile != null) {
            const top = 100 - percentile;
            if (top <= 1) label = 'Top 1%';
            else if (top <= 5) label = 'Top 5%';
            else if (top <= 10) label = 'Top 10%';
            else if (top <= 25) label = 'Top 25%';
            else if (top <= 50) label = 'Top 50%';
            else label = 'Bottom 50%';
        } else {
            label = 'Calculating...';
        }

        let color;
        if (rating >= 150) color = '#00ff88';
        else if (rating >= 120) color = COLORS.green;
        else if (rating >= 100) color = COLORS.gold;
        else if (rating >= 80) color = COLORS.orange;
        else color = COLORS.red;

        return { color, label };
    }

    function getRankBadge(rank) {
        if (rank === 1) return { icon: '👑', color: '#FFD700', glow: '#FFD70066' };
        if (rank === 2) return { icon: '🥈', color: '#C0C0C0', glow: '#C0C0C066' };
        if (rank === 3) return { icon: '🥉', color: '#CD7F32', glow: '#CD7F3266' };
        if (rank <= 10) return { icon: '⭐', color: COLORS.gold, glow: `${COLORS.gold}66` };
        return null;
    }

    function getCategoryColor(category) {
        // More muted colors for badges
        switch (category) {
            case 'beginner': return '#3d9970';  // muted green
            case 'collection': return '#8855aa'; // muted purple
            case 'spins': return '#cc7722';      // muted orange
            case 'events': return '#cc4444';     // muted red
            case 'duplicates': return '#bb8800'; // muted gold
            case 'special': return '#44aaaa';    // muted aqua
            default: return COLORS.textMuted;
        }
    }

    function getRarityColor(rarity) {
        switch (rarity) {
            case 'mythic': return COLORS.aqua;
            case 'legendary': return COLORS.purple;
            case 'rare': return COLORS.red;
            case 'event': return COLORS.gold;
            default: return COLORS.textMuted;
        }
    }

    function getShowcaseImageUrl(item) {
        if (!item) return `${IMAGE_BASE_URL}/barrier.png`;

        // Custom image URL (e.g., from database)
        if (item.image_url) {
            return item.image_url;
        }

        // Mythic items without username - use constants
        if (item.item_type === 'mythic' && !item.username) {
            // Check for known mythics
            if (item.item_texture === 'mythic_cavendish') {
                return 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/item/cavendish.png';
            }
            if (item.item_texture === 'mythic_jimbo') {
                return '/jimbo.png';
            }
            // Fallback for unknown mythics
            return 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/item/cavendish.png';
        }

        // Player heads (legendaries and rares with usernames)
        if (item.username) {
            return getMinecraftHeadUrl(item.username);
        }

        // Event items
        if (item.item_type === 'event') {
            return '/event.png';
        }

        // Fallback to texture-based URL (shouldn't reach here for special items)
        return `${IMAGE_BASE_URL}/${item.item_texture}.png`;
    }

    function getChartData() {
        if (!extendedStats?.dailyStats) return [];

        const last14Days = [];
        const today = new Date();

        for (let i = 13; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayStats = extendedStats.dailyStats.find(d => d.date === dateStr);

            last14Days.push({
                date: dateStr,
                label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                shortLabel: date.toLocaleDateString('en-US', { day: 'numeric' }),
                spins: dayStats?.spins || 0,
                mythic: dayStats?.mythic_count || 0,
                legendary: dayStats?.legendary_count || 0,
                rare: dayStats?.rare_count || 0
            });
        }

        return last14Days;
    }

    if (loading) {
        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.88)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1100
            }}>
                <div style={{
                    width: '40px', height: '40px',
                    border: `3px solid ${COLORS.border}`,
                    borderTopColor: COLORS.accent,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
            </div>
        );
    }

    if (!profile) {
        onClose();
        return null;
    }

    const rankBadge = getRankBadge(profile.rank);
    const completionPercent = ((profile.unique_items / profile.total_possible) * 100);
    const luckRating = extendedStats?.luckRating;
    const luckInfo = getLuckInfo(luckRating?.rating, luckRating?.percentile);
    const luckiestDay = extendedStats?.luckiestDay;
    const chartData = getChartData();
    const maxSpins = Math.max(...chartData.map(d => d.spins), 1);

    return (
        <div
            onClick={(e) => e.target === e.currentTarget && onClose()}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.88)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1100, padding: '20px',
                animation: 'fadeIn 0.2s ease-out'
            }}
        >
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .rarity-card {
                    transition: all 0.3s ease;
                }
                .rarity-card:hover {
                    transform: translateY(-3px);
                }
                .stat-card {
                    transition: all 0.2s ease;
                }
                .stat-card:hover {
                    transform: translateY(-2px);
                }
                /* Showcase item hover effects - simple glow only */
                .showcase-item {
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .showcase-item:hover {
                    transform: translateY(-4px) scale(1.05);
                }
                .showcase-mythic {
                    box-shadow: 0 0 12px ${COLORS.aqua}55, 0 0 20px ${COLORS.purple}33;
                }
                .showcase-mythic:hover {
                    box-shadow: 0 0 18px ${COLORS.aqua}77, 0 0 30px ${COLORS.purple}44;
                }
                /* Completion celebration */
                @keyframes completionShine {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes completionPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.02); }
                }
                .completion-banner {
                    animation: completionPulse 2s ease-in-out infinite;
                }
                .completion-banner::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: linear-gradient(
                        90deg, 
                        transparent 0%, 
                        rgba(255,255,255,0.15) 50%, 
                        transparent 100%
                    );
                    background-size: 200% 100%;
                    animation: completionShine 3s linear infinite;
                    border-radius: inherit;
                    pointer-events: none;
                }
            `}</style>

            <div style={{
                background: COLORS.bg,
                borderRadius: '20px',
                border: `1px solid ${COLORS.border}`,
                width: '100%',
                maxWidth: '520px',
                maxHeight: '90vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUp 0.3s ease-out',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)'
            }}>
                {/* Header */}
                <div style={{
                    position: 'relative',
                    padding: '24px 24px 20px',
                    background: COLORS.bgLight,
                    borderBottom: `1px solid ${COLORS.border}`
                }}>
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute', top: '16px', right: '16px',
                            background: COLORS.bg,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: '8px',
                            color: COLORS.textMuted,
                            width: '32px', height: '32px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <X size={16} />
                    </button>

                    {/* Profile Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Avatar */}
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                width: '72px', height: '72px',
                                borderRadius: '16px',
                                padding: '2px',
                                background: COLORS.accent,
                            }}>
                                <img
                                    src={getDiscordAvatarUrl(profile.discord_id, profile.discord_avatar, 256)}
                                    alt={profile.custom_username}
                                    style={{
                                        width: '100%', height: '100%',
                                        borderRadius: '14px',
                                        background: COLORS.bg,
                                        objectFit: 'cover'
                                    }}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                                    }}
                                />
                            </div>
                            {rankBadge && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '-6px', right: '-6px',
                                    background: COLORS.bg,
                                    borderRadius: '8px',
                                    padding: '3px 6px',
                                    border: `2px solid ${rankBadge.color}`,
                                    fontSize: '12px',
                                    boxShadow: `0 2px 8px ${rankBadge.glow}`
                                }}>
                                    {rankBadge.icon}
                                </div>
                            )}
                        </div>

                        {/* Name & Meta */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h2 style={{
                                    margin: 0,
                                    color: COLORS.text,
                                    fontWeight: '700',
                                    fontSize: '22px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {profile.custom_username}
                                </h2>
                                {isOwnProfile && onEditUsername && (
                                    <button
                                        onClick={onEditUsername}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: COLORS.textMuted,
                                            cursor: 'pointer',
                                            padding: '4px',
                                            display: 'flex'
                                        }}
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                )}
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                color: COLORS.textMuted,
                                fontSize: '12px',
                                marginTop: '4px'
                            }}>
                                <span style={{ color: COLORS.gold, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Trophy size={12} />
                                    #{profile.rank}
                                </span>
                                <span style={{ color: COLORS.border }}>•</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Calendar size={12} />
                                    {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                </span>
                            </div>

                            {/* Achievement Badges */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginTop: '8px'
                            }}>
                                {badges.length > 0 ? (
                                    badges.map((badge, idx) => (
                                        <div
                                            key={badge.id || idx}
                                            title={badge.name}
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '8px',
                                                background: getCategoryColor(badge.category),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: `1px solid ${getCategoryColor(badge.category)}66`
                                            }}
                                        >
                                            <AchievementIcon
                                                name={badge.icon}
                                                size={14}
                                                color="#fff"
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <span style={{ color: COLORS.textMuted, fontSize: '10px' }}>
                                        No badges equipped
                                    </span>
                                )}
                                {isOwnProfile && (
                                    <button
                                        onClick={() => {
                                            loadAchievementsForEditor();
                                            setShowBadgeEditor(true);
                                        }}
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '8px',
                                            background: 'transparent',
                                            border: `1px dashed ${COLORS.border}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            color: COLORS.textMuted
                                        }}
                                        title="Edit badges"
                                    >
                                        <Settings size={12} />
                                    </button>
                                )}

                                {/* View All Achievements Button */}
                                <button
                                    onClick={() => setShowAchievements(true)}
                                    style={{
                                        marginLeft: 'auto',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        background: 'transparent',
                                        border: `1px solid ${COLORS.border}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        cursor: 'pointer',
                                        color: COLORS.textMuted,
                                        fontSize: '10px',
                                        transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = COLORS.gold;
                                        e.currentTarget.style.color = COLORS.gold;
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = COLORS.border;
                                        e.currentTarget.style.color = COLORS.textMuted;
                                    }}
                                    title="View all achievements"
                                >
                                    <Trophy size={10} />
                                    Achievements
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Item Showcase */}
                    {(showcase.length > 0 || isOwnProfile) && (
                        <div style={{
                            marginTop: '16px',
                            padding: '12px',
                            background: COLORS.bg,
                            borderRadius: '10px',
                            border: `1px solid ${COLORS.border}`
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '10px'
                            }}>
                                <span style={{
                                    color: COLORS.textMuted,
                                    fontSize: '10px',
                                    fontWeight: '500',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <Image size={10} />
                                    Item Showcase
                                </span>
                                {isOwnProfile && (
                                    <button
                                        onClick={() => {
                                            loadCollectionForEditor();
                                            setShowShowcaseEditor(true);
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: COLORS.textMuted,
                                            cursor: 'pointer',
                                            padding: '2px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontSize: '10px'
                                        }}
                                    >
                                        <Edit3 size={10} />
                                        Edit
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                {showcase.length > 0 ? (
                                    <>
                                        {showcase.map((item, idx) => {
                                            const isMythic = item.item_type === 'mythic';
                                            return (
                                                <div
                                                    key={item.item_texture || idx}
                                                    className={`showcase-item ${isMythic ? 'showcase-mythic' : ''}`}
                                                    title={`${item.item_name} (${item.item_type})`}
                                                    style={{
                                                        width: '52px',
                                                        height: '52px',
                                                        borderRadius: '8px',
                                                        background: COLORS.bgLight,
                                                        border: `2px solid ${getRarityColor(item.item_type)}`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: isMythic ? undefined : `0 0 10px ${getRarityColor(item.item_type)}33`,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <img
                                                        src={getShowcaseImageUrl(item)}
                                                        alt={item.item_name}
                                                        style={{
                                                            width: '40px',
                                                            height: '40px',
                                                            imageRendering: 'pixelated'
                                                        }}
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = `${IMAGE_BASE_URL}/barrier.png`;
                                                        }}
                                                    />
                                                </div>
                                            );
                                        })}
                                        {/* Fill remaining slots if less than 3 and own profile */}
                                        {isOwnProfile && showcase.length < 3 && (
                                            Array(3 - showcase.length).fill(0).map((_, idx) => (
                                                <button
                                                    key={`empty-${idx}`}
                                                    onClick={() => {
                                                        loadCollectionForEditor();
                                                        setShowShowcaseEditor(true);
                                                    }}
                                                    style={{
                                                        width: '52px',
                                                        height: '52px',
                                                        borderRadius: '8px',
                                                        background: COLORS.bgLight,
                                                        border: `1px dashed ${COLORS.border}`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: COLORS.textMuted,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    title="Add item to showcase"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            ))
                                        )}
                                    </>
                                ) : isOwnProfile ? (
                                    [0, 1, 2].map(idx => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                loadCollectionForEditor();
                                                setShowShowcaseEditor(true);
                                            }}
                                            style={{
                                                width: '52px',
                                                height: '52px',
                                                borderRadius: '8px',
                                                background: COLORS.bgLight,
                                                border: `1px dashed ${COLORS.border}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: COLORS.textMuted,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            title="Add item to showcase"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    ))
                                ) : (
                                    <div style={{ color: COLORS.textMuted, fontSize: '12px', padding: '10px' }}>
                                        No items showcased
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Collection Progress Bar */}
                    <div style={{ marginTop: '16px' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            marginBottom: '6px'
                        }}>
                            <span style={{ color: COLORS.textMuted, fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Collection
                            </span>
                            <span style={{ color: COLORS.text, fontSize: '13px', fontWeight: '600' }}>
                                {profile.unique_items} <span style={{ color: COLORS.textMuted, fontWeight: '400' }}>/ {profile.total_possible}</span>
                                <span style={{ color: COLORS.accent, marginLeft: '6px' }}>({completionPercent.toFixed(1)}%)</span>
                            </span>
                        </div>
                        <div style={{
                            height: '10px',
                            background: COLORS.bg,
                            borderRadius: '5px',
                            overflow: 'hidden',
                            border: `1px solid ${COLORS.border}`
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${Math.min(completionPercent, 100)}%`,
                                background: COLORS.accent,
                                borderRadius: '4px',
                                transition: 'width 0.5s ease'
                            }} />
                        </div>
                    </div>
                </div>

                {/* Special Items Showcase */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '16px 24px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    background: COLORS.bg
                }}>
                    {/* Mythic - Special but toned down treatment */}
                    <div
                        className="rarity-card"
                        style={{
                            flex: 1,
                            background: profile.mythic_count > 0
                                ? `linear-gradient(135deg, ${COLORS.aqua}20, ${COLORS.purple}15)`
                                : `linear-gradient(135deg, ${COLORS.aqua}10, ${COLORS.purple}08)`,
                            borderRadius: '12px',
                            padding: '16px 12px',
                            border: `1px solid ${profile.mythic_count > 0 ? COLORS.aqua + '66' : COLORS.aqua + '33'}`,
                            textAlign: 'center',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{
                            color: profile.mythic_count > 0 ? COLORS.aqua : COLORS.aqua + '88',
                            marginBottom: '6px',
                            display: 'flex',
                            justifyContent: 'center'
                        }}>
                            <Sparkles size={20} />
                        </div>
                        <div style={{
                            color: profile.mythic_count > 0 ? COLORS.aqua : COLORS.aqua + '88',
                            fontSize: '24px',
                            fontWeight: '700',
                            lineHeight: 1
                        }}>
                            {profile.mythic_count}
                        </div>
                        <div style={{
                            color: profile.mythic_count > 0 ? COLORS.aqua : COLORS.aqua + '88',
                            fontSize: '10px',
                            marginTop: '4px',
                            opacity: profile.mythic_count > 0 ? 1 : 0.7,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            fontWeight: '600'
                        }}>
                            Mythic
                        </div>
                    </div>

                    {/* Legendary */}
                    <RarityCard
                        icon={<Star size={18} />}
                        label="Legendary"
                        value={profile.legendary_count}
                        color={COLORS.purple}
                    />

                    {/* Rare */}
                    <RarityCard
                        icon={<Diamond size={18} />}
                        label="Rare"
                        value={profile.rare_count}
                        color={COLORS.red}
                    />
                </div>

                {/* Collection Completion Banners */}
                {(
                    (specialItemTotals.mythic > 0 && uniqueCollected.mythic >= specialItemTotals.mythic) ||
                    (specialItemTotals.legendary > 0 && uniqueCollected.legendary >= specialItemTotals.legendary) ||
                    (specialItemTotals.rare > 0 && uniqueCollected.rare >= specialItemTotals.rare)
                ) && (
                    <div style={{
                        padding: '0 24px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                    }}>
                        {specialItemTotals.mythic > 0 && uniqueCollected.mythic >= specialItemTotals.mythic && (
                            <div
                                className="completion-banner"
                                style={{
                                    background: `linear-gradient(135deg, ${COLORS.aqua}33, ${COLORS.purple}22)`,
                                    border: `1px solid ${COLORS.aqua}66`,
                                    borderRadius: '10px',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{
                                    width: '36px', height: '36px',
                                    borderRadius: '8px',
                                    background: `linear-gradient(135deg, ${COLORS.aqua}, ${COLORS.purple})`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: `0 0 15px ${COLORS.aqua}66`
                                }}>
                                    <Trophy size={18} color="#fff" />
                                </div>
                                <div>
                                    <div style={{
                                        color: COLORS.aqua,
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        textShadow: `0 0 10px ${COLORS.aqua}44`
                                    }}>
                                        Mythic Collection Complete!
                                    </div>
                                    <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>
                                        All {specialItemTotals.mythic} mythic items collected
                                    </div>
                                </div>
                                <Sparkles size={16} color={COLORS.aqua} style={{ marginLeft: 'auto', opacity: 0.7 }} />
                            </div>
                        )}

                        {specialItemTotals.legendary > 0 && uniqueCollected.legendary >= specialItemTotals.legendary && (
                            <div
                                className="completion-banner"
                                style={{
                                    background: `linear-gradient(135deg, ${COLORS.purple}33, ${COLORS.gold}22)`,
                                    border: `1px solid ${COLORS.purple}66`,
                                    borderRadius: '10px',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{
                                    width: '36px', height: '36px',
                                    borderRadius: '8px',
                                    background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.gold})`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: `0 0 15px ${COLORS.purple}66`
                                }}>
                                    <Trophy size={18} color="#fff" />
                                </div>
                                <div>
                                    <div style={{
                                        color: COLORS.purple,
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        textShadow: `0 0 10px ${COLORS.purple}44`
                                    }}>
                                        Legendary Collection Complete!
                                    </div>
                                    <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>
                                        All {specialItemTotals.legendary} legendary items collected
                                    </div>
                                </div>
                                <Star size={16} color={COLORS.purple} style={{ marginLeft: 'auto', opacity: 0.7 }} />
                            </div>
                        )}

                        {specialItemTotals.rare > 0 && uniqueCollected.rare >= specialItemTotals.rare && (
                            <div
                                className="completion-banner"
                                style={{
                                    background: `linear-gradient(135deg, ${COLORS.red}33, ${COLORS.orange}22)`,
                                    border: `1px solid ${COLORS.red}66`,
                                    borderRadius: '10px',
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                <div style={{
                                    width: '36px', height: '36px',
                                    borderRadius: '8px',
                                    background: `linear-gradient(135deg, ${COLORS.red}, ${COLORS.orange})`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: `0 0 15px ${COLORS.red}66`
                                }}>
                                    <Trophy size={18} color="#fff" />
                                </div>
                                <div>
                                    <div style={{
                                        color: COLORS.red,
                                        fontSize: '13px',
                                        fontWeight: '700',
                                        textShadow: `0 0 10px ${COLORS.red}44`
                                    }}>
                                        Rare Collection Complete!
                                    </div>
                                    <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>
                                        All {specialItemTotals.rare} rare items collected
                                    </div>
                                </div>
                                <Diamond size={16} color={COLORS.red} style={{ marginLeft: 'auto', opacity: 0.7 }} />
                            </div>
                        )}
                    </div>
                )}

                {/* Tabs */}
                {isOwnProfile && extendedStats && (
                    <div style={{
                        display: 'flex',
                        gap: '4px',
                        padding: '12px 24px',
                        borderBottom: `1px solid ${COLORS.border}`,
                        background: COLORS.bg
                    }}>
                        {[
                            { id: 'overview', label: 'Overview', icon: <User size={14} /> },
                            { id: 'activity', label: 'Activity', icon: <BarChart3 size={14} /> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: activeTab === tab.id ? COLORS.accent : 'transparent',
                                    color: activeTab === tab.id ? '#fff' : COLORS.textMuted,
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
                    {activeTab === 'overview' && (
                        <>
                            {/* Primary Stats Row */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '12px',
                                marginBottom: '16px'
                            }}>
                                <div className="stat-card" style={{
                                    background: COLORS.bgLight,
                                    borderRadius: '12px',
                                    padding: '16px 12px',
                                    border: `1px solid ${COLORS.border}`,
                                    textAlign: 'center'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px',
                                        color: COLORS.textMuted,
                                        fontSize: '10px',
                                        marginBottom: '8px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        <Zap size={12} color={COLORS.orange} />
                                        Total Spins
                                    </div>
                                    <div style={{ color: COLORS.orange, fontSize: '24px', fontWeight: '700' }}>
                                        {profile.total_spins.toLocaleString()}
                                    </div>
                                    {rankings.spins && (
                                        <div style={{
                                            color: COLORS.textMuted,
                                            fontSize: '10px',
                                            marginTop: '4px'
                                        }}>
                                            {rankings.spins.rank <= 10
                                                ? <span style={{ color: COLORS.gold }}>#{rankings.spins.rank}</span>
                                                : rankings.spins.percentile != null
                                                    ? (rankings.spins.percentile >= 50 ? `Top ${100 - rankings.spins.percentile}%` : `Bottom ${rankings.spins.percentile}%`)
                                                    : null
                                            }
                                        </div>
                                    )}
                                </div>

                                {/* Luck Rating */}
                                <div
                                    className="stat-card"
                                    style={{
                                        background: COLORS.bgLight,
                                        borderRadius: '12px',
                                        padding: '16px 12px',
                                        border: `1px solid ${COLORS.border}`,
                                        textAlign: 'center',
                                        position: 'relative',
                                        overflow: 'visible'
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px',
                                        color: COLORS.textMuted,
                                        fontSize: '10px',
                                        marginBottom: '8px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        <TrendingUp size={12} color={luckInfo.color} />
                                        Luck
                                        <div style={{ position: 'relative', display: 'inline-flex' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowLuckTooltip(!showLuckTooltip);
                                                }}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    padding: '2px',
                                                    cursor: 'pointer',
                                                    color: COLORS.textMuted,
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <HelpCircle size={10} />
                                            </button>

                                            {/* Tooltip - positioned relative to the ? button */}
                                            {showLuckTooltip && (
                                                <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '20px',
                                                        left: '50%',
                                                        transform: 'translateX(-50%)',
                                                        background: COLORS.bg,
                                                        border: `1px solid ${COLORS.border}`,
                                                        borderRadius: '10px',
                                                        padding: '14px',
                                                        width: '220px',
                                                        fontSize: '11px',
                                                        color: COLORS.text,
                                                        textAlign: 'left',
                                                        zIndex: 100,
                                                        boxShadow: '0 8px 32px rgba(0,0,0,0.8)'
                                                    }}
                                                >
                                                    {/* Arrow pointing up */}
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '-6px',
                                                        left: '50%',
                                                        transform: 'translateX(-50%) rotate(45deg)',
                                                        width: '10px',
                                                        height: '10px',
                                                        background: COLORS.bg,
                                                        borderTop: `1px solid ${COLORS.border}`,
                                                        borderLeft: `1px solid ${COLORS.border}`
                                                    }} />
                                                    <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '12px' }}>
                                                        How Luck Works
                                                    </div>
                                                    <div style={{ color: COLORS.textMuted, lineHeight: 1.5 }}>
                                                        Compares your rare pulls per spin to the average player.
                                                    </div>
                                                    <div style={{
                                                        marginTop: '10px',
                                                        padding: '8px',
                                                        background: COLORS.bgLight,
                                                        borderRadius: '6px',
                                                        fontSize: '10px'
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                            <span style={{ color: COLORS.gold }}>100</span>
                                                            <span style={{ color: COLORS.textMuted }}>= Average</span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                            <span style={{ color: COLORS.green }}>&gt;100</span>
                                                            <span style={{ color: COLORS.textMuted }}>= Lucky</span>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <span style={{ color: COLORS.red }}>&lt;100</span>
                                                            <span style={{ color: COLORS.textMuted }}>= Unlucky</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ color: luckInfo.color, fontSize: '24px', fontWeight: '700' }}>
                                        {luckRating?.rating || '—'}
                                    </div>
                                    <div style={{
                                        color: luckInfo.color,
                                        fontSize: '10px',
                                        marginTop: '4px',
                                        fontWeight: '500'
                                    }}>
                                        {luckInfo.label}
                                    </div>
                                </div>

                                <div className="stat-card" style={{
                                    background: COLORS.bgLight,
                                    borderRadius: '12px',
                                    padding: '16px 12px',
                                    border: `1px solid ${COLORS.border}`,
                                    textAlign: 'center'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px',
                                        color: COLORS.textMuted,
                                        fontSize: '10px',
                                        marginBottom: '8px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}>
                                        <Flame size={12} color={COLORS.red} />
                                        Events
                                    </div>
                                    <div style={{ color: COLORS.red, fontSize: '24px', fontWeight: '700' }}>
                                        {profile.event_triggers}
                                    </div>
                                    {rankings.events && (
                                        <div style={{
                                            color: COLORS.textMuted,
                                            fontSize: '10px',
                                            marginTop: '4px'
                                        }}>
                                            {rankings.events.rank <= 10
                                                ? <span style={{ color: COLORS.gold }}>#{rankings.events.rank}</span>
                                                : rankings.events.percentile != null
                                                    ? (rankings.events.percentile >= 50 ? `Top ${100 - rankings.events.percentile}%` : `Bottom ${rankings.events.percentile}%`)
                                                    : null
                                            }
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Secondary Stats */}
                            <div className="stat-card" style={{
                                background: COLORS.bgLight,
                                borderRadius: '12px',
                                padding: '14px 16px',
                                border: `1px solid ${COLORS.border}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginBottom: '12px'
                            }}>
                                <div style={{
                                    width: '40px', height: '40px',
                                    borderRadius: '10px',
                                    background: `${COLORS.purple}22`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: COLORS.purple
                                }}>
                                    <Target size={20} />
                                </div>
                                <div>
                                    <div style={{ color: COLORS.text, fontSize: '18px', fontWeight: '700' }}>
                                        {profile.total_duplicates.toLocaleString()}
                                    </div>
                                    <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>
                                        Duplicates • {profile.unique_items > 0 ? (profile.total_duplicates / profile.unique_items).toFixed(1) : 0} per item avg
                                    </div>
                                </div>
                            </div>

                            {/* Average Spins Between Special Finds */}
                            {(() => {
                                const totalSpecialFinds = profile.mythic_count + profile.legendary_count + profile.rare_count;
                                const avgSpinsBetween = totalSpecialFinds > 0
                                    ? Math.round(profile.total_spins / totalSpecialFinds)
                                    : null;

                                if (avgSpinsBetween === null || profile.total_spins < 10) return null;

                                return (
                                    <div className="stat-card" style={{
                                        background: COLORS.bgLight,
                                        borderRadius: '12px',
                                        padding: '14px 16px',
                                        border: `1px solid ${COLORS.border}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        marginBottom: '16px'
                                    }}>
                                        <div style={{
                                            width: '40px', height: '40px',
                                            borderRadius: '10px',
                                            background: `${COLORS.gold}22`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: COLORS.gold
                                        }}>
                                            <TrendingUp size={20} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ color: COLORS.text, fontSize: '18px', fontWeight: '700' }}>
                                                ~{avgSpinsBetween.toLocaleString()} spins
                                            </div>
                                            <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>
                                                Avg. between special finds ({totalSpecialFinds} total)
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Best Day - Simplified */}
                            {luckiestDay && luckiestDay.spins > 0 && (luckiestDay.mythic_count > 0 || luckiestDay.legendary_count > 0 || luckiestDay.rare_count > 0) && (
                                <div style={{
                                    background: COLORS.bgLight,
                                    borderRadius: '12px',
                                    padding: '16px',
                                    border: `1px solid ${COLORS.gold}33`
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        color: COLORS.gold,
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        marginBottom: '12px'
                                    }}>
                                        <Crown size={14} />
                                        Best Day
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <div>
                                            <div style={{
                                                color: COLORS.text,
                                                fontSize: '15px',
                                                fontWeight: '600'
                                            }}>
                                                {new Date(luckiestDay.date).toLocaleDateString('en-US', {
                                                    weekday: 'long',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </div>
                                            <div style={{ color: COLORS.textMuted, fontSize: '11px', marginTop: '2px' }}>
                                                {luckiestDay.spins} spins
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '16px' }}>
                                            {luckiestDay.mythic_count > 0 && (
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ color: COLORS.aqua, fontSize: '20px', fontWeight: '700' }}>
                                                        {luckiestDay.mythic_count}
                                                    </div>
                                                    <div style={{ color: COLORS.aqua, fontSize: '9px', textTransform: 'uppercase' }}>Mythic</div>
                                                </div>
                                            )}
                                            {luckiestDay.legendary_count > 0 && (
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ color: COLORS.purple, fontSize: '20px', fontWeight: '700' }}>
                                                        {luckiestDay.legendary_count}
                                                    </div>
                                                    <div style={{ color: COLORS.purple, fontSize: '9px', textTransform: 'uppercase' }}>Legend</div>
                                                </div>
                                            )}
                                            {luckiestDay.rare_count > 0 && (
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ color: COLORS.red, fontSize: '20px', fontWeight: '700' }}>
                                                        {luckiestDay.rare_count}
                                                    </div>
                                                    <div style={{ color: COLORS.red, fontSize: '9px', textTransform: 'uppercase' }}>Rare</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'activity' && extendedStats && (
                        <>
                            {/* Quick Stats with labels */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '10px',
                                marginBottom: '20px'
                            }}>
                                <div className="stat-card" style={{
                                    background: COLORS.bgLight,
                                    borderRadius: '10px',
                                    padding: '14px 12px',
                                    border: `1px solid ${COLORS.border}`,
                                    textAlign: 'center'
                                }}>
                                    <div style={{ color: COLORS.textMuted, fontSize: '10px', textTransform: 'uppercase', marginBottom: '6px' }}>
                                        Today
                                    </div>
                                    <div style={{ color: COLORS.orange, fontSize: '22px', fontWeight: '700' }}>
                                        {extendedStats.spinsToday?.spins || 0}
                                    </div>
                                    <div style={{ color: COLORS.textMuted, fontSize: '10px', marginTop: '2px' }}>
                                        spins
                                    </div>
                                </div>
                                <div className="stat-card" style={{
                                    background: COLORS.bgLight,
                                    borderRadius: '10px',
                                    padding: '14px 12px',
                                    border: `1px solid ${COLORS.border}`,
                                    textAlign: 'center'
                                }}>
                                    <div style={{ color: COLORS.textMuted, fontSize: '10px', textTransform: 'uppercase', marginBottom: '6px' }}>
                                        This Week
                                    </div>
                                    <div style={{ color: COLORS.accent, fontSize: '22px', fontWeight: '700' }}>
                                        {chartData.slice(-7).reduce((sum, d) => sum + d.spins, 0)}
                                    </div>
                                    <div style={{ color: COLORS.textMuted, fontSize: '10px', marginTop: '2px' }}>
                                        spins
                                    </div>
                                </div>
                                <div className="stat-card" style={{
                                    background: COLORS.bgLight,
                                    borderRadius: '10px',
                                    padding: '14px 12px',
                                    border: `1px solid ${COLORS.border}`,
                                    textAlign: 'center'
                                }}>
                                    <div style={{ color: COLORS.textMuted, fontSize: '10px', textTransform: 'uppercase', marginBottom: '6px' }}>
                                        Daily Avg
                                    </div>
                                    <div style={{ color: COLORS.purple, fontSize: '22px', fontWeight: '700' }}>
                                        {(chartData.reduce((sum, d) => sum + d.spins, 0) / 14).toFixed(1)}
                                    </div>
                                    <div style={{ color: COLORS.textMuted, fontSize: '10px', marginTop: '2px' }}>
                                        spins
                                    </div>
                                </div>
                            </div>

                            {/* Activity Chart */}
                            <div style={{
                                background: COLORS.bgLight,
                                borderRadius: '12px',
                                padding: '16px',
                                border: `1px solid ${COLORS.border}`
                            }}>
                                <div style={{
                                    color: COLORS.textMuted,
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    marginBottom: '16px'
                                }}>
                                    Spins per Day (Last 14 Days)
                                </div>

                                {/* Chart */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    gap: '4px',
                                    height: '100px',
                                    position: 'relative'
                                }}>
                                    {chartData.map((day, idx) => {
                                        const height = maxSpins > 0 ? (day.spins / maxSpins) * 100 : 0;
                                        const hasSpecial = day.mythic + day.legendary + day.rare > 0;
                                        const isToday = idx === chartData.length - 1;

                                        return (
                                            <div
                                                key={day.date}
                                                style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    height: '100%',
                                                    justifyContent: 'flex-end',
                                                    position: 'relative'
                                                }}
                                                title={`${day.label}: ${day.spins} spins`}
                                            >
                                                {/* Bar */}
                                                <div style={{
                                                    width: '100%',
                                                    height: `${Math.max(height, 3)}%`,
                                                    background: hasSpecial
                                                        ? COLORS.purple
                                                        : isToday
                                                            ? COLORS.accent
                                                            : `${COLORS.accent}55`,
                                                    borderRadius: '3px 3px 0 0',
                                                    minHeight: day.spins > 0 ? '4px' : '2px',
                                                    position: 'relative'
                                                }}>
                                                    {hasSpecial && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '-6px',
                                                            left: '50%',
                                                            transform: 'translateX(-50%)',
                                                            width: '4px',
                                                            height: '4px',
                                                            borderRadius: '50%',
                                                            background: day.mythic > 0 ? COLORS.aqua : day.legendary > 0 ? COLORS.purple : COLORS.red,
                                                            boxShadow: `0 0 6px ${day.mythic > 0 ? COLORS.aqua : day.legendary > 0 ? COLORS.purple : COLORS.red}`
                                                        }} />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* X-axis labels */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginTop: '8px',
                                    fontSize: '9px',
                                    color: COLORS.textMuted
                                }}>
                                    <span>{chartData[0]?.shortLabel}</span>
                                    <span>Today</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Badge Editor Modal */}
            {showBadgeEditor && (
                <div
                    onClick={(e) => e.target === e.currentTarget && setShowBadgeEditor(false)}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1200,
                        padding: '20px'
                    }}
                >
                    <div style={{
                        background: COLORS.bg,
                        borderRadius: '16px',
                        border: `1px solid ${COLORS.border}`,
                        width: '100%',
                        maxWidth: '400px',
                        maxHeight: '80vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: `1px solid ${COLORS.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <h3 style={{ margin: 0, color: COLORS.text, fontSize: '16px' }}>
                                Edit Badges
                            </h3>
                            <button
                                onClick={() => setShowBadgeEditor(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: COLORS.textMuted,
                                    cursor: 'pointer',
                                    padding: '4px'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{
                            padding: '12px 20px',
                            borderBottom: `1px solid ${COLORS.border}`,
                            background: COLORS.bgLight
                        }}>
                            <div style={{ color: COLORS.textMuted, fontSize: '11px', marginBottom: '8px' }}>
                                Selected ({pendingBadges.length}/3):
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[0, 1, 2].map(idx => {
                                    const badgeId = pendingBadges[idx];
                                    const badge = userAchievements.find(a => a.id === badgeId);
                                    return (
                                        <div
                                            key={idx}
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                background: badge ? getCategoryColor(badge.category) : COLORS.bg,
                                                border: badge ? 'none' : `1px dashed ${COLORS.border}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            {badge ? (
                                                <AchievementIcon name={badge.icon} size={18} color="#fff" />
                                            ) : (
                                                <Plus size={14} color={COLORS.textMuted} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
                            <div style={{ color: COLORS.textMuted, fontSize: '11px', marginBottom: '12px' }}>
                                Your unlocked achievements:
                            </div>
                            {userAchievements.length === 0 ? (
                                <div style={{ color: COLORS.textMuted, textAlign: 'center', padding: '20px' }}>
                                    No achievements unlocked yet
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                    {userAchievements.map(achievement => {
                                        const isSelected = pendingBadges.includes(achievement.id);
                                        return (
                                            <button
                                                key={achievement.id}
                                                onClick={() => toggleBadge(achievement.id)}
                                                title={achievement.name}
                                                style={{
                                                    aspectRatio: '1',
                                                    borderRadius: '10px',
                                                    background: isSelected ? getCategoryColor(achievement.category) : COLORS.bgLight,
                                                    border: isSelected ? 'none' : `1px solid ${COLORS.border}`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    position: 'relative',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <AchievementIcon
                                                    name={achievement.icon}
                                                    size={20}
                                                    color={isSelected ? '#fff' : getCategoryColor(achievement.category)}
                                                />
                                                {isSelected && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: '2px',
                                                        right: '2px',
                                                        width: '14px',
                                                        height: '14px',
                                                        borderRadius: '50%',
                                                        background: '#fff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <Check size={10} color={getCategoryColor(achievement.category)} />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div style={{
                            padding: '16px 20px',
                            borderTop: `1px solid ${COLORS.border}`,
                            display: 'flex',
                            gap: '10px'
                        }}>
                            <button
                                onClick={() => setShowBadgeEditor(false)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: `1px solid ${COLORS.border}`,
                                    background: 'transparent',
                                    color: COLORS.textMuted,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveBadges}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: COLORS.accent,
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Showcase Editor Modal */}
            {showShowcaseEditor && (
                <div
                    onClick={(e) => e.target === e.currentTarget && setShowShowcaseEditor(false)}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1200,
                        padding: '20px'
                    }}
                >
                    <div style={{
                        background: COLORS.bg,
                        borderRadius: '16px',
                        border: `1px solid ${COLORS.border}`,
                        width: '100%',
                        maxWidth: '450px',
                        maxHeight: '80vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: `1px solid ${COLORS.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <h3 style={{ margin: 0, color: COLORS.text, fontSize: '16px' }}>
                                Edit Item Showcase
                            </h3>
                            <button
                                onClick={() => setShowShowcaseEditor(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: COLORS.textMuted,
                                    cursor: 'pointer',
                                    padding: '4px'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{
                            padding: '12px 20px',
                            borderBottom: `1px solid ${COLORS.border}`,
                            background: COLORS.bgLight
                        }}>
                            <div style={{ color: COLORS.textMuted, fontSize: '11px', marginBottom: '8px' }}>
                                Selected ({pendingShowcase.length}/3):
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                {[0, 1, 2].map(idx => {
                                    const texture = pendingShowcase[idx];
                                    const item = userCollection.find(i => i.item_texture === texture);
                                    return (
                                        <div
                                            key={idx}
                                            style={{
                                                width: '56px',
                                                height: '56px',
                                                borderRadius: '10px',
                                                background: COLORS.bg,
                                                border: item
                                                    ? `2px solid ${getRarityColor(item.item_type)}`
                                                    : `1px dashed ${COLORS.border}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            {item ? (
                                                <img
                                                    src={getShowcaseImageUrl(item)}
                                                    alt={item.item_name}
                                                    style={{
                                                        width: '44px',
                                                        height: '44px',
                                                        imageRendering: 'pixelated'
                                                    }}
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = `${IMAGE_BASE_URL}/barrier.png`;
                                                    }}
                                                />
                                            ) : (
                                                <Plus size={16} color={COLORS.textMuted} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
                            <div style={{ color: COLORS.textMuted, fontSize: '11px', marginBottom: '12px' }}>
                                Your special items (Mythic, Legendary, Rare, Event):
                            </div>
                            {userCollection.length === 0 ? (
                                <div style={{ color: COLORS.textMuted, textAlign: 'center', padding: '20px' }}>
                                    No special items found yet. Keep spinning!
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                                    {userCollection.map(item => {
                                        const isSelected = pendingShowcase.includes(item.item_texture);
                                        return (
                                            <button
                                                key={item.item_texture}
                                                onClick={() => toggleShowcaseItem(item.item_texture)}
                                                title={`${item.item_name} (${item.item_type})`}
                                                style={{
                                                    aspectRatio: '1',
                                                    borderRadius: '8px',
                                                    background: COLORS.bgLight,
                                                    border: isSelected
                                                        ? `2px solid ${getRarityColor(item.item_type)}`
                                                        : `1px solid ${COLORS.border}`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    position: 'relative',
                                                    padding: '4px',
                                                    transition: 'all 0.2s',
                                                    boxShadow: isSelected ? `0 0 10px ${getRarityColor(item.item_type)}44` : 'none'
                                                }}
                                            >
                                                <img
                                                    src={getShowcaseImageUrl(item)}
                                                    alt={item.item_name}
                                                    style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        imageRendering: 'pixelated'
                                                    }}
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = `${IMAGE_BASE_URL}/barrier.png`;
                                                    }}
                                                />
                                                {isSelected && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: '2px',
                                                        right: '2px',
                                                        width: '14px',
                                                        height: '14px',
                                                        borderRadius: '50%',
                                                        background: getRarityColor(item.item_type),
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        <Check size={10} color="#fff" />
                                                    </div>
                                                )}
                                                {/* Rarity indicator dot */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '2px',
                                                    right: '2px',
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    background: getRarityColor(item.item_type)
                                                }} />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div style={{
                            padding: '16px 20px',
                            borderTop: `1px solid ${COLORS.border}`,
                            display: 'flex',
                            gap: '10px'
                        }}>
                            <button
                                onClick={() => setShowShowcaseEditor(false)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: `1px solid ${COLORS.border}`,
                                    background: 'transparent',
                                    color: COLORS.textMuted,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveShowcase}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: COLORS.accent,
                                    color: '#fff',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Achievements Modal */}
            {showAchievements && (
                <Achievements onClose={() => setShowAchievements(false)} />
            )}
        </div>
    );
}

// Rarity card for Legendary and Rare
function RarityCard({ icon, label, value, color }) {
    const hasValue = value > 0;

    return (
        <div
            className="rarity-card"
            style={{
                flex: 1,
                background: hasValue ? `${color}15` : `${color}08`,
                borderRadius: '12px',
                padding: '14px 12px',
                border: `1px solid ${hasValue ? `${color}44` : `${color}33`}`,
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            <div style={{
                color: hasValue ? color : `${color}88`,
                marginBottom: '6px',
                display: 'flex',
                justifyContent: 'center'
            }}>
                {icon}
            </div>
            <div style={{
                color: hasValue ? color : `${color}88`,
                fontSize: '22px',
                fontWeight: '700',
                lineHeight: 1
            }}>
                {value}
            </div>
            <div style={{
                color: hasValue ? color : `${color}88`,
                fontSize: '10px',
                marginTop: '4px',
                opacity: hasValue ? 0.9 : 0.7,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
            }}>
                {label}
            </div>
        </div>
    );
}