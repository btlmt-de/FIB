import React, { useMemo, useState, useEffect, useRef } from 'react';
import { COLORS } from '../config/constants';
import { Activity, Sparkles, Crown, Radio } from 'lucide-react';
import { formatTimeAgo, getItemImageUrl, getDiscordAvatarUrl, parseActivityDate } from '../../../utils/helpers.js';
import { RARITY, RARITY_KEYS, getRarityIcon, getRarityColor, getRarityInk } from '../../../utils/rarityHelpers.jsx';
import { prestigeStanding } from '../../../utils/prestigeHelpers.js';
import { PrestigeRing } from '../spin/StageFlanks.jsx';
import { useActivity } from '../../../context/ActivityContext.jsx';

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
    const { feed: rawFeed, rareFeed, initialized, serverTime } = useActivity();
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
            const itemAge = now - parseActivityDate(item.created_at);

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

    // Sort delayed feed by created_at and filter out any achievements that may have slipped through
    const feed = useMemo(() => {
        return [...delayedFeed]
            .filter(item => item.event_type !== 'achievement_unlock')
            .sort((a, b) => parseActivityDate(b.created_at) - parseActivityDate(a.created_at));
    }, [delayedFeed]);

    // Mythic & Insane board - all time, not just what is still in the live feed.
    // rawFeed is capped at the most recent 150 entries and the delayed feed inherits that
    // cap, so filtering it only ever surfaced the handful of rare drops recent enough to
    // still be in the window. rareFeed carries the full history; the delayed feed is still
    // unioned in so a drop that lands right now appears on the same 4.5s delay as
    // everywhere else, instead of spoiling the spin that produced it.
    const specialFeed = useMemo(() => {
        const isSpecialRarity = item => item.item_rarity === 'mythic' || item.item_rarity === 'insane';
        const byId = new Map();
        for (const item of rareFeed) {
            if (isSpecialRarity(item)) byId.set(item.id, item);
        }
        for (const item of feed) {
            if (isSpecialRarity(item)) byId.set(item.id, item);
        }
        return [...byId.values()].sort(
            (a, b) => parseActivityDate(b.created_at) - parseActivityDate(a.created_at)
        );
    }, [feed, rareFeed]);

    const displayFeed = activeTab === 'all' ? feed : specialFeed;
    const loading = !initialized;

    return (
        <div style={{
            // 380px wide, and `height: 100%` rather than a fixed 520px.
            //
            // This component no longer sits beside the reel — the desktop feed is
            // ActivityTicker, a horizontal strip above it. The only thing that
            // renders this now is the "All drops" drawer in WheelPage.
            //
            // `height: 100%` therefore depends entirely on that drawer giving it a
            // definite height to resolve against. It briefly did not, and the
            // percentage collapsed to `auto`: the feed grew to its full content
            // length, ran off the bottom of the screen, and could not be scrolled,
            // because the element that would have scrolled was the one growing.
            // If this is ever mounted somewhere new, that container needs a real
            // height, not just a maxHeight.
            width: '380px',
            height: '100%',
            background: `linear-gradient(180deg, ${COLORS.bgLight}f8 0%, ${COLORS.bg}fc 100%)`,
            borderRadius: '16px',
            border: `1px solid ${COLORS.border}`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 60px ${COLORS.gold}08, inset 0 1px 0 rgba(255,255,255,0.05)`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative'
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
                @keyframes liveIndicator {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.9); }
                }
                @keyframes headerGlow {
                    0%, 100% { box-shadow: 0 1px 0 ${COLORS.gold}20; }
                    50% { box-shadow: 0 1px 0 ${COLORS.gold}40, 0 4px 20px ${COLORS.gold}10; }
                }
                @keyframes shimmerSweep {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .activity-item:hover {
                    background: ${COLORS.bgLighter}80 !important;
                    transform: translateX(2px);
                }
            `}</style>

            {/* Corner accents */}
            <div style={{ position: 'absolute', top: '8px', left: '8px', width: '16px', height: '16px', borderTop: `2px solid ${COLORS.gold}40`, borderLeft: `2px solid ${COLORS.gold}40`, borderRadius: '4px 0 0 0', zIndex: 5 }} />
            <div style={{ position: 'absolute', top: '8px', right: '8px', width: '16px', height: '16px', borderTop: `2px solid ${COLORS.gold}40`, borderRight: `2px solid ${COLORS.gold}40`, borderRadius: '0 4px 0 0', zIndex: 5 }} />

            {/* Header */}
            <div style={{
                padding: '16px 16px 12px 16px',
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
                    position: 'relative',
                    zIndex: 1,
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: `linear-gradient(135deg, ${COLORS.gold}25, ${COLORS.orange}15)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `1px solid ${COLORS.gold}30`,
                            boxShadow: `0 0 20px ${COLORS.gold}15`,
                        }}>
                            <Activity size={18} color={COLORS.gold} />
                        </div>
                        <div>
                            <h3 style={{
                                margin: 0,
                                color: COLORS.text,
                                fontSize: '15px',
                                fontWeight: '700',
                                letterSpacing: '-0.3px'
                            }}>
                                Live Activity
                            </h3>
                            <div style={{
                                fontSize: '11px',
                                color: COLORS.textMuted,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                marginTop: '2px'
                            }}>
                                <Radio size={10} color={COLORS.green} style={{ animation: 'none' }} />
                                Real-time feed
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '14px'
                }}>
                    <button
                        onClick={() => setActiveTab('all')}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: activeTab === 'all' ? `1px solid ${COLORS.gold}50` : `1px solid ${COLORS.border}`,
                            borderRadius: '8px',
                            background: activeTab === 'all'
                                ? `linear-gradient(135deg, ${COLORS.gold}20, ${COLORS.orange}10)`
                                : 'transparent',
                            color: activeTab === 'all' ? COLORS.gold : COLORS.textMuted,
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease',
                            boxShadow: activeTab === 'all' ? `0 0 15px ${COLORS.gold}15` : 'none',
                        }}
                    >
                        <Activity size={13} />
                        All Drops
                    </button>
                    <button
                        onClick={() => setActiveTab('special')}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            border: activeTab === 'special' ? `1px solid ${COLORS.aqua}50` : `1px solid ${COLORS.border}`,
                            borderRadius: '8px',
                            background: activeTab === 'special'
                                ? `linear-gradient(135deg, ${COLORS.mythicCycle[0]}15, ${COLORS.mythicCycle[1]}10)`
                                : 'transparent',
                            color: activeTab === 'special' ? COLORS.aqua : COLORS.textMuted,
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease',
                            boxShadow: activeTab === 'special' ? `0 0 15px ${COLORS.aqua}15` : 'none',
                        }}
                    >
                        <Crown size={13} />
                        Mythic & Insane
                    </button>
                </div>
            </div>

            {/* Feed List */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '8px',
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
                                height: '52px',
                                background: `linear-gradient(90deg, ${COLORS.bgLighter}40 0%, ${COLORS.bgLighter}60 50%, ${COLORS.bgLighter}40 100%)`,
                                backgroundSize: '200% 100%',
                                borderRadius: '10px',
                                animation: 'none'
                            }} />
                        ))}
                    </div>
                ) : displayFeed.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        color: COLORS.textMuted
                    }}>
                        <Sparkles size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
                        <p style={{ margin: 0, fontSize: '13px' }}>
                            {activeTab === 'special' ? 'No mythic or insane drops yet' : 'No activity yet'}
                        </p>
                    </div>
                ) : (
                    displayFeed.slice(0, 50).map((item, index) => {
                        const rarityColor = getRarityColor(item.item_rarity);
                        const isInsane = item.item_rarity === 'insane';
                        const isMythic = item.item_rarity === 'mythic';
                        const isSpecial = isInsane || isMythic;

                        return (
                            <div
                                key={item.id}
                                className="activity-item"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: isInsane ? '12px' : isMythic ? '11px' : '10px',
                                    marginBottom: '6px',
                                    borderRadius: '10px',
                                    // Insane carries all three slick hues even at
                                    // 7% alpha, so the row is identifiable as the
                                    // top tier without reading the badge.
                                    background: isInsane
                                        ? `linear-gradient(135deg, ${COLORS.insaneHolo[0]}12, ${COLORS.insaneHolo[1]}0A, ${COLORS.insaneHolo[2]}12)`
                                        : isMythic
                                            ? `linear-gradient(135deg, ${COLORS.mythicCycle[0]}10, ${COLORS.mythicCycle[1]}06)`
                                            : `linear-gradient(135deg, ${rarityColor}08, ${rarityColor}04)`,
                                    border: `1px solid ${rarityColor}${isInsane ? '35' : isMythic ? '30' : '25'}`,
                                    boxShadow: isInsane
                                        ? `0 4px 20px ${COLORS.insaneHolo[0]}18, inset 0 1px 0 ${COLORS.insaneFlat}20`
                                        : isMythic
                                            ? `0 4px 16px ${COLORS.aqua}10, inset 0 1px 0 ${COLORS.aqua}10`
                                            : `inset 0 1px 0 ${rarityColor}08`,
                                    animation: index < 3 ? `slideIn 0.3s ease-out ${index * 0.05}s both` : 'none',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    cursor: 'default',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {/* The oil-slick drifting across an insane row.
                                    This was a static overlay with `animation:
                                    'none'` hardcoded — a shimmer that had never
                                    shimmered. It takes the shared .fib-holo class
                                    now, which also gets it the reduced-motion path
                                    for free: the gradient stays, the drift stops. */}
                                {isInsane && (
                                    <div className="fib-holo" style={{
                                        position: 'absolute',
                                        inset: 0,
                                        opacity: 0.14,
                                        mixBlendMode: 'screen',
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
                                        animation: 'none',
                                        pointerEvents: 'none'
                                    }} />
                                )}

                                {/* Avatar. The ring is the player's PRESTIGE, not
                                    the item's tier — see the note in
                                    ActivityTicker: a ring around a face means
                                    one thing everywhere else on this site, and
                                    the row already states the item's rarity in
                                    its fill, its border, its glow and the item's
                                    own name. The per-tier SIZE step stays; that
                                    one is this row's own hierarchy. */}
                                <PrestigeRing standing={prestigeStanding(item)}>
                                <img
                                    src={getDiscordAvatarUrl(item.discord_id, item.discord_avatar)}
                                    alt=""
                                    style={{
                                        width: isInsane ? '34px' : isMythic ? '32px' : '30px',
                                        height: isInsane ? '34px' : isMythic ? '32px' : '30px',
                                        borderRadius: '50%',
                                        flexShrink: 0,
                                        display: 'block',
                                        position: 'relative',
                                        zIndex: 1
                                    }}
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                                    }}
                                />
                                </PrestigeRing>

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
                                            <span style={{ color: COLORS.text, fontWeight: '600' }}>
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
                                        marginTop: '3px',
                                        textShadow: isInsane ? `0 0 10px ${rarityColor}55` : isMythic ? `0 0 8px ${rarityColor}44` : 'none'
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
                                                padding: '2px 6px',
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
                                                Lucky
                                            </span>
                                        )}
                                        {item.is_gold_rush === 1 && (
                                            <span style={{
                                                fontSize: '9px',
                                                background: 'linear-gradient(135deg, #FFD70033, #FFD70022)',
                                                color: '#FFD700',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontWeight: '700',
                                                flexShrink: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                border: '1px solid #FFD70033',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.3px',
                                                textShadow: '0 0 6px #FFD70044'
                                            }}>
                                                Rush
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Item image */}
                                <div style={{
                                    width: isInsane ? '34px' : isMythic ? '32px' : '30px',
                                    height: isInsane ? '34px' : isMythic ? '32px' : '30px',
                                    background: `linear-gradient(135deg, ${rarityColor}25, ${rarityColor}10)`,
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    border: `1px solid ${rarityColor}30`,
                                    boxShadow: `0 0 12px ${rarityColor}15`
                                }}>
                                    <img
                                        src={getItemImageUrl(item)}
                                        alt={item.item_name}
                                        style={{
                                            width: isInsane ? '26px' : isMythic ? '24px' : '22px',
                                            height: isInsane ? '26px' : isMythic ? '24px' : '22px',
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
                padding: '12px 16px',
                borderTop: `1px solid ${COLORS.border}`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'wrap',
                rowGap: '6px',
                columnGap: '12px',
                fontSize: '10px',
                color: COLORS.textMuted,
                background: `linear-gradient(180deg, transparent 0%, ${COLORS.bgLighter}30 100%)`,
            }}>
                {/* Legend, derived from the shared ladder. This was four hardcoded
                    blocks with their colours written out beside the labels, which
                    is how the feed and its own legend could disagree. Five tiers no
                    longer fit one line in a 300px rail, so it wraps and the
                    dividers are dropped — a wrapped row with dangling separators
                    reads worse than spacing alone. */}
                {RARITY_KEYS.filter(key => key !== 'common' && key !== 'event').map(key => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {getRarityIcon(key, 11)}
                        <span style={{ color: getRarityInk(key) }}>{RARITY[key].label}</span>
                    </div>
                ))}
            </div>

            {/* Bottom corner accents */}
            <div style={{ position: 'absolute', bottom: '8px', left: '8px', width: '16px', height: '16px', borderBottom: `2px solid ${COLORS.gold}40`, borderLeft: `2px solid ${COLORS.gold}40`, borderRadius: '0 0 0 4px', zIndex: 5 }} />
            <div style={{ position: 'absolute', bottom: '8px', right: '8px', width: '16px', height: '16px', borderBottom: `2px solid ${COLORS.gold}40`, borderRight: `2px solid ${COLORS.gold}40`, borderRadius: '0 0 4px 0', zIndex: 5 }} />
        </div>
    );
}