import React, { useMemo } from 'react';
import { COLORS } from '../../config/constants.js';
import { Activity } from 'lucide-react';
import { formatTimeAgo, getItemImageUrl, getDiscordAvatarUrl } from '../../utils/helpers.js';
import { getRarityIcon, getRarityColor } from '../../utils/rarityHelpers.jsx';
import { useActivity } from '../../context/ActivityContext';

export function ActivityFeedSidebar() {
    const { feed: rawFeed, serverTime, initialized } = useActivity();

    // Filter feed to show only item drops that are 8+ seconds old
    const feed = useMemo(() => {
        if (!rawFeed || !serverTime) return [];

        const DELAY_AFTER_CREATION = 5000;

        return rawFeed.filter(item => {
            // Filter out achievement unlocks
            if (item.event_type === 'achievement_unlock') return false;

            // Parse created_at - append 'Z' if no timezone to treat as UTC
            let createdAtStr = item.created_at;
            if (!createdAtStr.includes('Z') && !createdAtStr.includes('+')) {
                createdAtStr = createdAtStr.replace(' ', 'T') + 'Z';
            }
            const itemCreatedAt = new Date(createdAtStr).getTime();
            const itemAge = serverTime - itemCreatedAt;
            return itemAge >= DELAY_AFTER_CREATION;
        });
    }, [rawFeed, serverTime]);

    const loading = !initialized;

    return (
        <div style={{
            width: '340px',
            height: '520px',
            background: `${COLORS.bg}ee`,
            borderRadius: '14px',
            border: `1px solid ${COLORS.border}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backdropFilter: 'blur(10px)'
        }}>
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateX(-8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                .sidebar-feed-item {
                    transition: all 0.3s ease;
                    animation: slideIn 0.4s ease-out;
                    border-radius: 8px;
                    margin: 0 8px;
                }
                .sidebar-feed-item:hover {
                    background: ${COLORS.bgLighter} !important;
                    transform: translateX(4px);
                    box-shadow: inset 0 0 12px rgba(88, 101, 242, 0.1);
                }
                .activity-feed-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                .activity-feed-scroll::-webkit-scrollbar-track {
                    background: ${COLORS.bg};
                    border-radius: 3px;
                }
                .activity-feed-scroll::-webkit-scrollbar-thumb {
                    background: ${COLORS.border};
                    border-radius: 3px;
                }
                .activity-feed-scroll::-webkit-scrollbar-thumb:hover {
                    background: ${COLORS.textMuted};
                }
            `}</style>

            {/* Header */}
            <div style={{
                padding: '16px 18px',
                borderBottom: `1px solid ${COLORS.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: `linear-gradient(135deg, ${COLORS.bgLight}aa 0%, ${COLORS.bg}aa 100%)`,
                borderRadius: '14px 14px 0 0',
                boxShadow: `inset 0 1px 0 ${COLORS.border}`
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Activity size={18} color={COLORS.green} />
                    <span style={{
                        color: COLORS.text,
                        fontWeight: '600',
                        fontSize: '15px'
                    }}>
                        Live Activity
                    </span>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: COLORS.green,
                        animation: 'pulse 2s infinite'
                    }} />
                </div>
            </div>

            {/* Feed content */}
            <div className="activity-feed-scroll" style={{
                flex: 1,
                overflow: 'auto',
                padding: '6px 0'
            }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: COLORS.textMuted, fontSize: '13px' }}>
                        Loading...
                    </div>
                ) : feed.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: COLORS.textMuted }}>
                        <Activity size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                        <div style={{ fontSize: '13px' }}>No recent drops</div>
                        <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
                            Special items will appear here
                        </div>
                    </div>
                ) : (
                    feed.slice(0, 15).map((item, idx) => {
                        const rarityColor = getRarityColor(item.item_rarity);

                        return (
                            <div
                                key={item.id || idx}
                                className="sidebar-feed-item"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '10px 12px',
                                    borderLeft: `3px solid ${rarityColor}`,
                                    background: `linear-gradient(90deg, ${rarityColor}08 0%, transparent 100%)`,
                                    boxShadow: `inset 0 0 8px ${rarityColor}06`
                                }}
                            >
                                {/* User avatar */}
                                <img
                                    src={getDiscordAvatarUrl(item.discord_id, item.discord_avatar)}
                                    alt=""
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        flexShrink: 0,
                                        border: `1.5px solid ${COLORS.border}`,
                                        boxShadow: `0 0 8px ${rarityColor}20`
                                    }}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                                    }}
                                />

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '8px'
                                    }}>
                                        <div style={{
                                            fontSize: '12px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <span style={{ color: COLORS.text, fontWeight: '500' }}>
                                                {item.custom_username || 'Unknown'}
                                            </span>
                                            <span style={{ color: COLORS.textMuted }}>got</span>
                                        </div>
                                        <span style={{
                                            fontSize: '10px',
                                            color: COLORS.textMuted,
                                            flexShrink: 0
                                        }}>
                                            {formatTimeAgo(item.created_at)}
                                        </span>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        color: rarityColor,
                                        fontWeight: '600',
                                        fontSize: '12px',
                                        marginTop: '2px'
                                    }}>
                                        {getRarityIcon(item.item_rarity, 12)}
                                        <span style={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {item.item_name}
                                        </span>
                                        {item.is_lucky === 1 && (
                                            <span title="Lucky Spin" style={{
                                                fontSize: '10px',
                                                background: `${COLORS.gold}33`,
                                                color: COLORS.gold,
                                                padding: '1px 4px',
                                                borderRadius: '4px',
                                                fontWeight: '600',
                                                flexShrink: 0
                                            }}>
                                                🍀
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Item image */}
                                <div style={{
                                    width: '28px',
                                    height: '28px',
                                    background: `linear-gradient(135deg, ${rarityColor}30, ${rarityColor}15)`,
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    border: `1px solid ${rarityColor}20`,
                                    boxShadow: `0 0 10px ${rarityColor}15`
                                }}>
                                    <img
                                        src={getItemImageUrl(item)}
                                        alt={item.item_name}
                                        style={{
                                            width: '22px',
                                            height: '22px',
                                            objectFit: 'contain',
                                            imageRendering: 'pixelated'
                                        }}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.style.display = 'none';
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
                padding: '12px 14px',
                borderTop: `1px solid ${COLORS.border}`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px',
                fontSize: '10px',
                color: COLORS.textMuted,
                background: `linear-gradient(135deg, ${COLORS.bg}aa 0%, ${COLORS.bgLight}aa 100%)`,
                boxShadow: `inset 0 -1px 0 ${COLORS.border}`
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {getRarityIcon('mythic', 12)}
                    <span>Mythic</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {getRarityIcon('legendary', 12)}
                    <span>Legendary</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {getRarityIcon('rare', 12)}
                    <span>Rare</span>
                </div>
            </div>
        </div>
    );
}
