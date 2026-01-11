import React, { useMemo, useState, useEffect, useRef } from 'react';
import { COLORS } from '../../config/constants.js';
import { Activity, Sparkles, Crown } from 'lucide-react';
import { formatTimeAgo, getItemImageUrl, getDiscordAvatarUrl } from '../../utils/helpers.js';
import { getRarityIcon, getRarityColor } from '../../utils/rarityHelpers.jsx';
import { useActivity } from '../../context/ActivityContext';

// Format exact timestamp for Mythic & Insane tab
function formatExactTime(dateStr) {
    let d = dateStr;
    if (!d.includes('Z') && !d.includes('+')) {
        d = d.replace(' ', 'T') + 'Z';
    }
    const date = new Date(d);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
        return `Today at ${time}`;
    } else if (isYesterday) {
        return `Yesterday at ${time}`;
    } else {
        const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        return `${dateStr} at ${time}`;
    }
}

export function ActivityFeedSidebar() {
    const { feed: rawFeed, initialized, serverTime } = useActivity();
    const [activeTab, setActiveTab] = useState('all'); // 'all' or 'special'
    const [delayedFeed, setDelayedFeed] = useState([]);
    const processedIdsRef = useRef(new Set());
    const timeoutsRef = useRef([]);
    const isMountedRef = useRef(true);
    const serverTimeRef = useRef(serverTime);

    // Keep serverTimeRef in sync without causing effect re-runs
    useEffect(() => {
        serverTimeRef.current = serverTime;
    }, [serverTime]);

    // Track mounted state and cleanup timeouts on unmount only
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            // Clear timeouts only on unmount
            timeoutsRef.current.forEach(id => clearTimeout(id));
            timeoutsRef.current = [];
        };
    }, []);

    // Delay new items by 4.5 seconds to respect spin animation (bonus spins take ~4.8s)
    useEffect(() => {
        if (!rawFeed) return;

        // Use serverTime if available to avoid client clock skew (read from ref to avoid dependency)
        const now = serverTimeRef.current || Date.now();

        rawFeed.forEach(item => {
            if (item.event_type === 'achievement_unlock') return;
            if (processedIdsRef.current.has(item.id)) return;

            processedIdsRef.current.add(item.id);

            // Check if item is fresh (< 2 seconds old = from SSE)
            let createdAtStr = item.created_at;
            if (!createdAtStr.includes('Z') && !createdAtStr.includes('+')) {
                createdAtStr = createdAtStr.replace(' ', 'T') + 'Z';
            }
            const itemAge = now - new Date(createdAtStr).getTime();

            if (itemAge < 2000) {
                // Fresh SSE item - delay by 4.5 seconds to cover spin animations
                const timeoutId = setTimeout(() => {
                    if (!isMountedRef.current) return;
                    setDelayedFeed(prev => {
                        if (prev.some(i => i.id === item.id)) return prev;
                        return [item, ...prev].slice(0, 150);
                    });
                    // Remove this timeout from the ref after it executes
                    timeoutsRef.current = timeoutsRef.current.filter(id => id !== timeoutId);
                }, 4500);
                timeoutsRef.current.push(timeoutId);
            } else {
                // Older item from initial fetch - show immediately
                if (isMountedRef.current) {
                    setDelayedFeed(prev => {
                        if (prev.some(i => i.id === item.id)) return prev;
                        return [item, ...prev].slice(0, 150);
                    });
                }
            }
        });

        // Keep processedIds clean
        if (processedIdsRef.current.size > 200) {
            const ids = Array.from(processedIdsRef.current);
            processedIdsRef.current = new Set(ids.slice(-100));
        }
        // Note: No cleanup here - timeouts are managed separately and cleared on unmount
    }, [rawFeed]); // serverTime accessed via ref to avoid frequent re-runs

    // Sort delayed feed by created_at
    const feed = useMemo(() => {
        return [...delayedFeed].sort((a, b) => {
            const dateA = new Date(a.created_at.replace(' ', 'T') + (a.created_at.includes('Z') ? '' : 'Z'));
            const dateB = new Date(b.created_at.replace(' ', 'T') + (b.created_at.includes('Z') ? '' : 'Z'));
            return dateB - dateA;
        });
    }, [delayedFeed]);

    // Filter for mythic and insane only
    const specialFeed = useMemo(() => {
        return feed.filter(item =>
            item.item_rarity === 'mythic' || item.item_rarity === 'insane'
        );
    }, [feed]);

    const displayFeed = activeTab === 'all' ? feed : specialFeed;
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
                @keyframes insaneShimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes mythicShimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
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
                .activity-tab {
                    flex: 1;
                    padding: 8px 12px;
                    background: transparent;
                    border: none;
                    color: ${COLORS.textMuted};
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    border-radius: 6px;
                }
                .activity-tab:hover {
                    color: ${COLORS.text};
                    background: ${COLORS.bgLighter};
                }
                .activity-tab.active {
                    color: ${COLORS.text};
                    background: ${COLORS.bgLight};
                }
            `}</style>

            {/* Header */}
            <div style={{
                padding: '16px 18px 12px',
                borderBottom: `1px solid ${COLORS.border}`,
                background: `linear-gradient(135deg, ${COLORS.bgLight}aa 0%, ${COLORS.bg}aa 100%)`,
                borderRadius: '14px 14px 0 0',
                boxShadow: `inset 0 1px 0 ${COLORS.border}`
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
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

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '6px',
                    background: COLORS.bg,
                    padding: '4px',
                    borderRadius: '8px'
                }}>
                    <button
                        className={`activity-tab ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        <Activity size={13} />
                        All Drops
                    </button>
                    <button
                        className={`activity-tab ${activeTab === 'special' ? 'active' : ''}`}
                        onClick={() => setActiveTab('special')}
                    >
                        <Crown size={13} color={activeTab === 'special' ? COLORS.insane : undefined} />
                        <Sparkles size={13} color={activeTab === 'special' ? COLORS.aqua : undefined} />
                        Rare Pulls
                    </button>
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
                ) : displayFeed.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: COLORS.textMuted }}>
                        {activeTab === 'special' ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '12px', opacity: 0.4 }}>
                                    <Crown size={28} color={COLORS.insane} />
                                    <Sparkles size={28} color={COLORS.aqua} />
                                </div>
                                <div style={{ fontSize: '13px' }}>No mythic or insane drops yet</div>
                                <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
                                    The rarest pulls will appear here
                                </div>
                            </>
                        ) : (
                            <>
                                <Activity size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                                <div style={{ fontSize: '13px' }}>No recent drops</div>
                                <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
                                    Special items will appear here
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    displayFeed.slice(0, activeTab === 'special' ? 50 : 15).map((item, idx) => {
                        const rarityColor = getRarityColor(item.item_rarity);
                        const isInsane = item.item_rarity === 'insane';
                        const isMythic = item.item_rarity === 'mythic';
                        const isSpecial = isInsane || isMythic;

                        return (
                            <div
                                key={item.id || idx}
                                className="sidebar-feed-item"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: isInsane ? '12px 12px' : isMythic ? '11px 12px' : '10px 12px',
                                    borderLeft: `3px solid ${rarityColor}`,
                                    background: isInsane
                                        ? `linear-gradient(90deg, ${rarityColor}18 0%, ${rarityColor}08 50%, transparent 100%)`
                                        : isMythic
                                            ? `linear-gradient(90deg, ${rarityColor}14 0%, ${rarityColor}06 50%, transparent 100%)`
                                            : `linear-gradient(90deg, ${rarityColor}08 0%, transparent 100%)`,
                                    boxShadow: isInsane
                                        ? `inset 0 0 15px ${rarityColor}15, 0 0 10px ${rarityColor}10`
                                        : isMythic
                                            ? `inset 0 0 12px ${rarityColor}12, 0 0 8px ${rarityColor}08`
                                            : `inset 0 0 8px ${rarityColor}06`,
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                {/* Shimmer effect for insane */}
                                {isInsane && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundImage: `linear-gradient(90deg, transparent 0%, ${rarityColor}10 50%, transparent 100%)`,
                                        backgroundSize: '200% 100%',
                                        animation: 'insaneShimmer 3s ease-in-out infinite',
                                        pointerEvents: 'none'
                                    }} />
                                )}

                                {/* Shimmer effect for mythic */}
                                {isMythic && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundImage: `linear-gradient(90deg, transparent 0%, ${rarityColor}08 50%, transparent 100%)`,
                                        backgroundSize: '200% 100%',
                                        animation: 'mythicShimmer 4s ease-in-out infinite',
                                        pointerEvents: 'none'
                                    }} />
                                )}

                                {/* User avatar */}
                                <img
                                    src={getDiscordAvatarUrl(item.discord_id, item.discord_avatar)}
                                    alt=""
                                    style={{
                                        width: isInsane ? '32px' : isMythic ? '30px' : '28px',
                                        height: isInsane ? '32px' : isMythic ? '30px' : '28px',
                                        borderRadius: '50%',
                                        flexShrink: 0,
                                        border: isInsane ? `2px solid ${rarityColor}` : isMythic ? `1.5px solid ${rarityColor}` : `1.5px solid ${COLORS.border}`,
                                        boxShadow: isInsane ? `0 0 12px ${rarityColor}40` : isMythic ? `0 0 10px ${rarityColor}30` : `0 0 8px ${rarityColor}20`,
                                        position: 'relative',
                                        zIndex: 1
                                    }}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                                    }}
                                />

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
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
                                            {/* Show exact time for special tab, relative for all */}
                                            {activeTab === 'special' && isSpecial
                                                ? formatExactTime(item.created_at)
                                                : formatTimeAgo(item.created_at)
                                            }
                                        </span>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        color: rarityColor,
                                        fontWeight: isInsane ? '700' : isMythic ? '650' : '600',
                                        fontSize: isInsane ? '13px' : isMythic ? '12.5px' : '12px',
                                        marginTop: '2px',
                                        textShadow: isInsane ? `0 0 8px ${rarityColor}44` : isMythic ? `0 0 6px ${rarityColor}33` : 'none'
                                    }}>
                                        {getRarityIcon(item.item_rarity, isInsane ? 14 : isMythic ? 13 : 12)}
                                        <span style={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {item.item_name}
                                        </span>
                                        {item.is_lucky === 1 && (
                                            <span style={{
                                                fontSize: '9px',
                                                background: 'linear-gradient(135deg, #00440033, #00FF0022)',
                                                color: '#00FF00',
                                                padding: '2px 5px',
                                                borderRadius: '4px',
                                                fontWeight: '700',
                                                flexShrink: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                border: '1px solid #00FF0033',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.3px',
                                                textShadow: '0 0 6px #00FF0044'
                                            }}>
                                                Lucky Spin
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
                gap: '10px',
                fontSize: '10px',
                color: COLORS.textMuted,
                background: `linear-gradient(135deg, ${COLORS.bg}aa 0%, ${COLORS.bgLight}aa 100%)`,
                boxShadow: `inset 0 -1px 0 ${COLORS.border}`
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {getRarityIcon('insane', 11)}
                    <span>Insane</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {getRarityIcon('mythic', 11)}
                    <span>Mythic</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {getRarityIcon('legendary', 11)}
                    <span>Legendary</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {getRarityIcon('rare', 11)}
                    <span>Rare</span>
                </div>
            </div>
        </div>
    );
}