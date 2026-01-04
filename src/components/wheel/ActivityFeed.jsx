import React, { useState, useEffect, useRef, useCallback } from 'react';
import { COLORS, API_BASE_URL, IMAGE_BASE_URL } from '../../config/constants.js';
import { X, Activity, Sparkles, Star, Diamond, RefreshCw } from 'lucide-react';
import { formatTimeAgo, getMinecraftHeadUrl } from '../../utils/helpers.js';

export function ActivityFeed({ onClose }) {
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const intervalRef = useRef(null);

    const loadFeed = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/activity?limit=50`);
            const data = await res.json();
            setFeed(data.feed || []);
        } catch (e) {
            console.error('Failed to load activity feed:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadFeed();

        // Auto-refresh every 10 seconds if enabled
        if (autoRefresh) {
            intervalRef.current = setInterval(loadFeed, 10000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [autoRefresh, loadFeed]);

    function getRarityIcon(rarity) {
        if (rarity === 'mythic') return <Sparkles size={14} color={COLORS.aqua} />;
        if (rarity === 'legendary') return <Star size={14} color={COLORS.purple} />;
        if (rarity === 'rare') return <Diamond size={14} color={COLORS.red} />;
        return null;
    }

    function getRarityColor(rarity) {
        if (rarity === 'mythic') return COLORS.aqua;
        if (rarity === 'legendary') return COLORS.purple;
        if (rarity === 'rare') return COLORS.red;
        return COLORS.gold;
    }

    function getItemImageUrl(item) {
        // Mythic items with specific images
        if (item.item_texture?.startsWith('mythic_')) {
            if (item.item_texture === 'mythic_cavendish') {
                return 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/item/cavendish.png';
            }
            if (item.item_texture === 'mythic_jimbo') {
                return '/jimbo.png';
            }
            // Other mythic playerheads
            const username = item.item_texture.replace('mythic_', '');
            return getMinecraftHeadUrl(username);
        }
        if (item.item_texture?.startsWith('special_') || item.item_texture?.startsWith('rare_')) {
            const username = item.item_texture.split('_').slice(1).join('_');
            return getMinecraftHeadUrl(username);
        }
        return `${IMAGE_BASE_URL}/${item.item_texture}.png`;
    }

    function getDiscordAvatarUrl(discordId, discordAvatar) {
        if (discordAvatar) {
            return `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}.png?size=64`;
        }
        if (!discordId) return 'https://cdn.discordapp.com/embed/avatars/0.png';
        try {
            const defaultIndex = Number(BigInt(discordId) >> 22n) % 6;
            return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
        } catch {
            return 'https://cdn.discordapp.com/embed/avatars/0.png';
        }
    }

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .feed-item {
                    transition: all 0.2s ease;
                }
                .feed-item:hover {
                    background: ${COLORS.bgLighter} !important;
                }
            `}</style>

            <div style={{
                background: COLORS.bg,
                borderRadius: '16px',
                border: `1px solid ${COLORS.border}`,
                width: '100%',
                maxWidth: '500px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUp 0.3s ease-out',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bg} 100%)`
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Activity size={22} color={COLORS.green} />
                        <div>
                            <h2 style={{
                                margin: 0,
                                color: COLORS.text,
                                fontWeight: '600',
                                fontSize: '18px'
                            }}>
                                Activity Feed
                            </h2>
                            <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>
                                Live special item drops
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Auto-refresh toggle */}
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            style={{
                                background: autoRefresh ? COLORS.green + '22' : COLORS.bgLight,
                                border: `1px solid ${autoRefresh ? COLORS.green : COLORS.border}`,
                                borderRadius: '6px',
                                padding: '6px 10px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: autoRefresh ? COLORS.green : COLORS.textMuted,
                                fontSize: '11px'
                            }}
                        >
                            <RefreshCw size={12} style={{ animation: autoRefresh ? 'pulse 2s infinite' : 'none' }} />
                            {autoRefresh ? 'Live' : 'Paused'}
                        </button>
                        <button onClick={onClose} style={{
                            background: 'transparent',
                            border: 'none',
                            color: COLORS.textMuted,
                            cursor: 'pointer',
                            padding: '4px'
                        }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Feed content */}
                <div style={{
                    flex: 1,
                    overflow: 'auto',
                    padding: '8px 0'
                }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMuted }}>
                            Loading activity...
                        </div>
                    ) : feed.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.textMuted }}>
                            <Activity size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
                            <div>No recent activity</div>
                            <div style={{ fontSize: '12px', marginTop: '4px' }}>
                                Special item drops will appear here
                            </div>
                        </div>
                    ) : (
                        feed.map((item, idx) => {
                            const rarityColor = getRarityColor(item.item_rarity);

                            return (
                                <div
                                    key={item.id || idx}
                                    className="feed-item"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 20px',
                                        borderLeft: `3px solid ${rarityColor}`,
                                        marginLeft: '4px'
                                    }}
                                >
                                    {/* User avatar */}
                                    <img
                                        src={getDiscordAvatarUrl(item.discord_id, item.discord_avatar)}
                                        alt=""
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            border: `2px solid ${rarityColor}44`
                                        }}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                                        }}
                                    />

                                    {/* Content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            <span style={{ color: COLORS.text, fontWeight: '600', fontSize: '13px' }}>
                                                {item.custom_username || item.discord_username || 'Unknown'}
                                            </span>
                                            <span style={{ color: COLORS.textMuted, fontSize: '12px' }}>
                                                got
                                            </span>
                                            <span style={{
                                                color: rarityColor,
                                                fontWeight: '600',
                                                fontSize: '13px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                {getRarityIcon(item.item_rarity)}
                                                {item.item_name}
                                            </span>
                                        </div>
                                        <div style={{
                                            color: COLORS.textMuted,
                                            fontSize: '11px',
                                            marginTop: '2px'
                                        }}>
                                            {formatTimeAgo(item.created_at)}
                                        </div>
                                    </div>

                                    {/* Item image */}
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        background: rarityColor + '22',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `1px solid ${rarityColor}44`,
                                        flexShrink: 0
                                    }}>
                                        <img
                                            src={getItemImageUrl(item)}
                                            alt={item.item_name}
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                imageRendering: 'pixelated'
                                            }}
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = `${IMAGE_BASE_URL}/barrier.png`;
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '12px 20px',
                    borderTop: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '16px',
                    fontSize: '11px',
                    color: COLORS.textMuted
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Sparkles size={12} color={COLORS.aqua} /> Mythic
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Star size={12} color={COLORS.purple} /> Legendary
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Diamond size={12} color={COLORS.red} /> Rare
                    </span>
                </div>
            </div>
        </div>
    );
}