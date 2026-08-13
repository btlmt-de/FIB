import React, { useState, useEffect, useMemo } from 'react';
import { IMAGE_BASE_URL, INSANE_ITEMS, MYTHIC_ITEMS, TEAM_MEMBERS, EXOTIC_ITEMS, RARE_MEMBERS, API_BASE_URL } from '../../../config/constants.js';
import { COLORS } from '../config/constants';
import { formatChance, getItemImageUrl } from '../../../utils/helpers.js';
import { RARITY, getRarityColor, getRarityInk, getRarityIcon, getRarityOrder } from '../../../utils/rarityHelpers.jsx';
import { X, Sparkles, Star, Diamond, Zap, BookOpen, Search, Crown, ChevronDown, ChevronUp, BarChart3, Coins } from 'lucide-react';
import { CanvasCollectionGrid } from '../canvas/CanvasCollectionGrid.jsx';

// Insane color constant

// Item Detail Modal Component
function ItemDetailModal({ item, details, onClose }) {
    const isCollected = details && details.count > 0;
    const isInsane = item.type === 'insane';
    const isMythic = item.type === 'mythic';
    const isLegendary = item.type === 'legendary';
    const isExotic = item.type === 'exotic';
    const isRare = item.type === 'rare';
    const isSpecialType = isInsane || isMythic || isLegendary || isExotic || isRare;

    const rarityColor = getRarityColor(item.type);
    const rarityLabel = (RARITY[item.type] || RARITY.common).label.toUpperCase();

    // Use the imported getItemImageUrl helper
    const itemImageUrl = getItemImageUrl(item);

    function formatDate(dateStr) {
        if (!dateStr) return 'No data available';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    return (
        <div
            onClick={(e) => e.target === e.currentTarget && onClose()}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', zIndex: 1100, padding: '20px',
                animation: 'fadeIn 0.2s ease-out'
            }}
        >
            <div style={{
                background: COLORS.bg,
                borderRadius: '16px',
                border: `1px solid ${rarityColor}66`,
                width: '100%',
                maxWidth: '360px',
                overflow: 'hidden',
                animation: 'slideUp 0.3s ease-out',
                boxShadow: isSpecialType ? `0 0 30px ${rarityColor}33` : 'none'
            }}>
                {/* Header with item image */}
                <div style={{
                    padding: '32px 24px',
                    background: isSpecialType
                        ? `radial-gradient(ellipse at center, ${rarityColor}22 0%, ${COLORS.bg} 70%)`
                        : COLORS.bgLight,
                    textAlign: 'center',
                    position: 'relative'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute', top: '12px', right: '12px',
                            background: 'transparent', border: 'none',
                            color: COLORS.textMuted, fontSize: '20px', cursor: 'pointer'
                        }}
                    >x</button>

                    {/* Rarity badge */}
                    {isSpecialType && (
                        <div
                            // Insane's badge takes the drifting slick; every other
                            // tier keeps its static two- or three-stop gradient.
                            className={isInsane ? 'fib-holo' : undefined}
                            style={{
                                display: 'inline-block',
                                background: isInsane
                                    ? undefined
                                    : isMythic
                                        ? `linear-gradient(135deg, ${COLORS.mythicCycle[0]}, ${COLORS.mythicCycle[1]}, ${COLORS.mythicCycle[2]})`
                                        : isLegendary
                                            ? COLORS.insane
                                            : isExotic
                                                ? `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.red})`
                                                : `linear-gradient(135deg, ${COLORS.red}, ${COLORS.orange})`,
                                // Dark ink on the light tiers, white on the dark
                                // ones. Insane, legendary and mythic are all light
                                // fills — mythic's ramp is aqua/azure/teal now, and
                                // white on #55FFFF is 1.2:1 — so they take the dark
                                // ink. Exotic and rare are dark enough for white.
                                color: (isInsane || isLegendary || isMythic) ? '#1a1a1a' : '#fff',
                                fontSize: '10px',
                                fontWeight: '700',
                                padding: '4px 12px',
                                borderRadius: '4px',
                                marginBottom: '16px',
                                letterSpacing: '1px'
                            }}
                        >
                            {rarityLabel}
                        </div>
                    )}

                    {/* Item image */}
                    <div style={{
                        width: '96px', height: '96px',
                        margin: '0 auto 16px',
                        background: COLORS.bgLighter,
                        borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `2px solid ${rarityColor}44`,
                        boxShadow: isSpecialType ? `0 0 20px ${rarityColor}33` : 'none'
                    }}>
                        <img
                            src={itemImageUrl}
                            alt={item.name}
                            style={{
                                width: '64px', height: '64px',
                                imageRendering: item.username ? 'auto' : 'pixelated',
                                borderRadius: item.username ? '8px' : '0',
                                opacity: isCollected ? 1 : 0.3,
                                filter: isCollected ? 'none' : 'grayscale(100%)'
                            }}
                            onError={(e) => { e.target.onerror = null; e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }}
                        />
                    </div>

                    {/* Item name */}
                    <h3 style={{
                        margin: 0,
                        color: isCollected ? rarityColor : COLORS.textMuted,
                        fontSize: '18px',
                        fontWeight: '600'
                    }}>
                        {item.name}
                    </h3>
                </div>

                {/* Stats */}
                <div style={{ padding: '20px 24px' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '16px',
                        marginBottom: '16px'
                    }}>
                        <div style={{
                            background: COLORS.bgLight,
                            padding: '12px',
                            borderRadius: '8px',
                            textAlign: 'center'
                        }}>
                            <div style={{ color: COLORS.textMuted, fontSize: '11px', marginBottom: '4px' }}>
                                Times Collected
                            </div>
                            <div style={{
                                color: isCollected ? COLORS.text : COLORS.textMuted,
                                fontSize: '20px',
                                fontWeight: '700'
                            }}>
                                {details?.count || 0}
                            </div>
                        </div>
                        <div style={{
                            background: COLORS.bgLight,
                            padding: '12px',
                            borderRadius: '8px',
                            textAlign: 'center'
                        }}>
                            <div style={{ color: COLORS.textMuted, fontSize: '11px', marginBottom: '4px' }}>
                                Drop Chance
                            </div>
                            <div style={{
                                color: rarityColor,
                                fontSize: '20px',
                                fontWeight: '700'
                            }}>
                                {item.chance ? `${formatChance(item.chance)}%` : '- '}
                            </div>
                        </div>
                    </div>

                    {/* First obtained */}
                    <div style={{
                        background: COLORS.bgLight,
                        padding: '12px 16px',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{ color: COLORS.textMuted, fontSize: '12px' }}>
                            First Obtained
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {(details?.is_lucky === 1 || details?.isLucky === true) && (
                                <span title="Obtained via Lucky Spin" style={{
                                    fontSize: '11px',
                                    background: `${COLORS.gold}33`,
                                    color: COLORS.gold,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <Sparkles size={12} /> Lucky
                                </span>
                            )}
                            {(details?.is_gold_rush === 1 || details?.isGoldRush === true) && (
                                <span title="Obtained during Gold Rush event" style={{
                                    fontSize: '11px',
                                    background: '#FFD70033',
                                    color: '#FFD700',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <Coins size={12} /> Rush
                                </span>
                            )}
                            <span style={{
                                color: isCollected ? COLORS.text : COLORS.textMuted,
                                fontSize: '12px',
                                fontWeight: '500'
                            }}>
                                {isCollected ? formatDate(details?.firstObtained) : 'Not collected'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function CollectionBook({ collection, collectionDetails, stats, dryStreaks: dryStreaksProp, allItems, dynamicItems, onClose, viewingUser }) {
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [showSpinStats, setShowSpinStats] = useState(false);
    const [ownDryStreaks, setOwnDryStreaks] = useState({ mythic: 0, legendary: 0, rare: 0 });

    // When viewing someone else, their streaks arrive as a prop alongside the rest of
    // their profile - /api/dry-streaks only answers for the logged-in user, so this
    // used to leave the whole row sitting at zero for other people's collections.
    const dryStreaks = dryStreaksProp || ownDryStreaks;

    // Fetch dry streaks data (only for own collection)
    useEffect(() => {
        // Never fetch when looking at someone else - /api/dry-streaks answers for the
        // session, so it would quietly show the viewer's own streaks on another
        // player's collection.
        if (viewingUser || dryStreaksProp) return;

        async function fetchDryStreaks() {
            try {
                const res = await fetch(`${API_BASE_URL}/api/dry-streaks`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setOwnDryStreaks(data);
                }
            } catch (err) {
                console.error('Failed to fetch dry streaks:', err);
            }
        }
        fetchDryStreaks();
    }, [viewingUser, dryStreaksProp]);

    // Memoize special items list - only recalculate when dynamicItems changes
    const { insaneItems, mythicItems, legendaryItems, exoticItems, rareItems, allItemsWithSpecial } = useMemo(() => {
        const hasApiData = dynamicItems && dynamicItems.length > 0;

        // One mapper per source instead of four near-identical filter/map pairs
        // per tier — adding exotic to the hand-written version meant writing the
        // same eight lines a fifth time and getting one of the field names wrong.
        const fromApi = tier => dynamicItems.filter(i => i.rarity === tier).map(i => ({
            name: i.name, texture: i.texture, type: tier,
            chance: i.display_chance || i.chance,
            username: i.username, imageUrl: i.image_url || i.imageUrl
        }));
        const fromMembers = (members, tier, prefix) => members.map(m => ({
            name: m.name, texture: `${prefix}_${m.username}`, type: tier,
            username: m.username, chance: m.chance
        }));

        let insane, mythic, legendary, exotic, rare;

        if (hasApiData) {
            insane = fromApi('insane');
            mythic = fromApi('mythic');
            legendary = fromApi('legendary');
            exotic = fromApi('exotic');
            rare = fromApi('rare');
        } else {
            insane = INSANE_ITEMS.map(i => ({ ...i, texture: i.texture, type: 'insane' }));
            mythic = MYTHIC_ITEMS.map(m => ({ ...m, texture: m.texture }));
            legendary = fromMembers(TEAM_MEMBERS, 'legendary', 'special');
            // Exotic is a list of items, not members — its textures are already
            // whole, so it maps like INSANE_ITEMS rather than through fromMembers.
            exotic = EXOTIC_ITEMS.map(i => ({ ...i, type: 'exotic' }));
            rare = fromMembers(RARE_MEMBERS, 'rare', 'rare');
        }

        return {
            insaneItems: insane,
            mythicItems: mythic,
            legendaryItems: legendary,
            exoticItems: exotic,
            rareItems: rare,
            allItemsWithSpecial: [...insane, ...mythic, ...legendary, ...exotic, ...rare, ...allItems]
        };
    }, [dynamicItems, allItems]);

    // Memoize collection stats - only recalculate when collection or items change
    const { collectedCount, totalCount, percentage, tierProgress } = useMemo(() => {
        const collected = Object.keys(collection).filter(k => collection[k] > 0).length;
        const total = allItemsWithSpecial.length;
        const owned = items => items.filter(item => collection[item.texture] > 0).length;

        // One row per tier, rarest first, so the summary strip below is a map over
        // the ladder rather than five hand-written cells. A tier with no items at
        // all is dropped rather than rendered as "0/0" — exotic sits empty until
        // the backend supplies a roster, and an empty counter reads as a bug.
        return {
            collectedCount: collected,
            totalCount: total,
            percentage: total > 0 ? ((collected / total) * 100).toFixed(1) : 0,
            tierProgress: [
                { key: 'insane', items: insaneItems },
                { key: 'mythic', items: mythicItems },
                { key: 'legendary', items: legendaryItems },
                { key: 'exotic', items: exoticItems },
                { key: 'rare', items: rareItems },
            ]
                .filter(t => t.items.length > 0)
                .map(t => ({ ...t, collected: owned(t.items), total: t.items.length })),
        };
    }, [collection, allItemsWithSpecial, insaneItems, mythicItems, legendaryItems, exoticItems, rareItems]);

    // Memoize filtered and sorted items - recalculate when filter, search, or collection changes
    const sortedItems = useMemo(() => {
        const searchLower = search.toLowerCase();
        const filtered = allItemsWithSpecial.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchLower);
            const isCollected = collection[item.texture] > 0;
            if (!matchesSearch) return false;
            if (filter === 'collected') return isCollected;
            if (filter === 'missing') return !isCollected;
            // Any remaining non-'all' filter is a tier name and matches on type,
            // so a new rarity needs no branch here — only an entry in the button
            // list below.
            if (filter !== 'all') return item.type === filter;
            return true;
        });

        return filtered.sort((a, b) => {
            const aOrder = getRarityOrder(a.type);
            const bOrder = getRarityOrder(b.type);
            if (aOrder !== bOrder) return aOrder - bOrder;
            const aCount = collection[a.texture] || 0;
            const bCount = collection[b.texture] || 0;
            if (aCount !== bCount) return bCount - aCount;
            return a.name.localeCompare(b.name);
        });
    }, [allItemsWithSpecial, collection, filter, search]);

    // getItemImageUrl is imported from helpers.js

    // Tier filters are derived from what the book actually holds, so a tier with
    // no items yet does not get a chip that filters to an empty grid.
    const filterButtons = [
        { id: 'all', label: 'All' },
        { id: 'collected', label: 'Collected' },
        { id: 'missing', label: 'Missing' },
        ...tierProgress.map(({ key }) => ({
            id: key,
            label: RARITY[key].label,
            color: getRarityInk(key),
        })),
    ];

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', animation: 'fadeIn 0.2s ease-out' }}>
            <div style={{ background: COLORS.bg, borderRadius: '16px', border: `1px solid ${COLORS.border}`, width: '100%', maxWidth: '900px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s ease-out' }}>
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: COLORS.text, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <BookOpen size={24} />
                            {viewingUser ? `${viewingUser}'s Collection` : 'Collection Book'}
                        </h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: COLORS.textMuted }}>
                            {viewingUser ? `Viewing ${viewingUser}'s discoveries` : 'Track your Wheel of Fortune discoveries'}
                        </p>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'transparent',
                        border: 'none',
                        color: COLORS.textMuted,
                        fontSize: '24px',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        transition: 'all 0.2s',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = COLORS.bgLighter;
                                e.currentTarget.style.color = COLORS.accent;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = COLORS.textMuted;
                            }}
                    >x</button>
                </div>

                {/* Progress Bars */}
                <div style={{ padding: '16px 24px', borderBottom: `1px solid ${COLORS.border}`, background: COLORS.bgLight }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ color: COLORS.text, fontSize: '14px', fontWeight: '500' }}>Total Progress</span>
                        <span style={{ color: COLORS.gold, fontSize: '14px', fontWeight: '600' }}>{collectedCount} / {totalCount} ({percentage}%)</span>
                    </div>
                    <div style={{ height: '8px', background: COLORS.bg, borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                        <div style={{ height: '100%', width: `${percentage}%`, background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.orange})`, borderRadius: '4px', transition: 'width 0.5s ease-out' }} />
                    </div>

                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                        {tierProgress.map(({ key, collected, total }) => (
                            <div key={key}>
                                <span style={{ color: getRarityInk(key), fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {getRarityIcon(key, 12)} {RARITY[key].label}
                                </span>
                                <div style={{ color: getRarityInk(key), fontWeight: '600' }}>{collected}/{total}</div>
                            </div>
                        ))}
                    </div>

                    {/* Spin Stats Expandable Section */}
                    <button
                        onClick={() => setShowSpinStats(!showSpinStats)}
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            background: COLORS.bg,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: '8px',
                            color: COLORS.text,
                            fontSize: '13px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s'
                        }}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart3 size={14} color={COLORS.orange} />
                            Spin Stats
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: COLORS.textMuted }}>
                            <span style={{ fontSize: '12px' }}>{stats?.totalSpins?.toLocaleString() || 0} spins</span>
                            {showSpinStats ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </span>
                    </button>

                    {/* Expanded Spin Stats */}
                    {showSpinStats && (
                        <div style={{
                            marginTop: '12px',
                            padding: '12px',
                            background: COLORS.bg,
                            borderRadius: '8px',
                            border: `1px solid ${COLORS.border}`,
                            animation: 'fadeIn 0.2s ease-out'
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                {/* Total Spins */}
                                <div style={{ padding: '8px', background: COLORS.bgLight, borderRadius: '6px' }}>
                                    <span style={{ color: COLORS.textMuted, fontSize: '11px', display: 'block', marginBottom: '4px' }}>Total Spins</span>
                                    <div style={{ color: COLORS.text, fontWeight: '600', fontSize: '16px' }}>{stats?.totalSpins?.toLocaleString() || 0}</div>
                                </div>
                                {/* Avg/Special */}
                                <div style={{ padding: '8px', background: COLORS.bgLight, borderRadius: '6px' }} title="Average spins between special (Rare+) drops">
                                    <span style={{ color: COLORS.orange, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}><Zap size={10} /> Avg/Special</span>
                                    <div style={{ color: COLORS.orange, fontWeight: '600', fontSize: '16px' }}>
                                        {(() => {
                                            // Every tier the label calls "Rare+", exotic included —
                                            // leaving it out inflated the average, since the spins
                                            // that produced an exotic still counted in the numerator.
                                            const totalSpecials = (stats?.insaneCount || 0) + (stats?.mythicCount || 0)
                                                + (stats?.legendaryCount || 0) + (stats?.exoticCount || 0) + (stats?.rareCount || 0);
                                            if (totalSpecials === 0) return '-';
                                            return (stats.totalSpins / totalSpecials).toFixed(1);
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Dry Streaks Section */}
                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${COLORS.border}` }}>
                                <span style={{ color: COLORS.textMuted, fontSize: '11px', display: 'block', marginBottom: '8px' }}>Spins Since Last...</span>
                                {/* Only the three tiers the backend actually tracks a streak
                                    for — dry_streaks has no exotic key, so there is nothing
                                    to show for it and a hardcoded 0 would read as "just got
                                    one". Colours come from the ladder; legendary was still
                                    painted in COLORS.purple here, which is exotic's. */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                    {['mythic', 'legendary', 'rare'].map(key => {
                                        const ink = getRarityInk(key);
                                        return (
                                            <div key={key} style={{ padding: '8px', background: `${ink}15`, borderRadius: '6px', border: `1px solid ${ink}33` }}>
                                                <span style={{ color: ink, fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                                                    {getRarityIcon(key, 10, false)} {RARITY[key].label}
                                                </span>
                                                <div style={{ color: ink, fontWeight: '700', fontSize: '18px' }}>{dryStreaks[key]}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Filters */}
                <div style={{ padding: '12px 24px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {filterButtons.map(btn => (
                        <button key={btn.id} onClick={() => setFilter(btn.id)} style={{
                            padding: '6px 12px', background: filter === btn.id ? COLORS.bgLighter : 'transparent',
                            border: `1px solid ${filter === btn.id ? (btn.color || COLORS.gold) : COLORS.border}`,
                            borderRadius: '6px', color: filter === btn.id ? (btn.color || COLORS.text) : COLORS.textMuted,
                            fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s'
                        }}>{btn.label}</button>
                    ))}
                    <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                           style={{ marginLeft: 'auto', padding: '6px 12px', background: COLORS.bgLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, fontSize: '12px', width: '150px', outline: 'none' }}
                    />
                </div>

                {/* Items Grid - Canvas-based with virtual scrolling */}
                <div style={{ flex: 1, overflow: 'hidden', padding: '16px 24px' }}>
                    <CanvasCollectionGrid
                        items={sortedItems}
                        collection={collection}
                        onItemClick={setSelectedItem}
                        containerHeight={400}
                    />
                </div>
            </div>

            {/* Item Detail Modal */}
            {selectedItem && (
                <ItemDetailModal
                    item={selectedItem}
                    details={collectionDetails?.[selectedItem.texture]}
                    onClose={() => setSelectedItem(null)}
                />
            )}
        </div>
    );
}