import React, { useState, useEffect, useMemo } from 'react';
import { COLORS, IMAGE_BASE_URL, INSANE_ITEMS, MYTHIC_ITEMS, TEAM_MEMBERS, RARE_MEMBERS, API_BASE_URL } from '../../../config/constants.js';
import { formatChance, getItemImageUrl } from '../../../utils/helpers.js';
import { X, Sparkles, Star, Diamond, Zap, BookOpen, Search, Crown, ChevronDown, ChevronUp, BarChart3, Coins } from 'lucide-react';
import { CanvasCollectionGrid } from '../canvas/CanvasCollectionGrid.jsx';

// Insane color constant

// Item Detail Modal Component
function ItemDetailModal({ item, details, onClose }) {
    const isCollected = details && details.count > 0;
    const isInsane = item.type === 'insane';
    const isMythic = item.type === 'mythic';
    const isLegendary = item.type === 'legendary';
    const isRare = item.type === 'rare';
    const isSpecialType = isInsane || isMythic || isLegendary || isRare;

    const rarityColor = isInsane ? COLORS.insane : isMythic ? COLORS.aqua : isLegendary ? COLORS.purple : isRare ? COLORS.red : COLORS.gold;
    const rarityLabel = isInsane ? 'INSANE' : isMythic ? 'MYTHIC' : isLegendary ? 'LEGENDARY' : isRare ? 'RARE' : 'COMMON';

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
                        <div style={{
                            display: 'inline-block',
                            background: isInsane
                                ? `linear-gradient(135deg, ${COLORS.insane}, #FFF5B0, ${COLORS.insane})`
                                : isMythic
                                    ? `linear-gradient(135deg, ${COLORS.aqua}, ${COLORS.purple}, ${COLORS.gold})`
                                    : isLegendary
                                        ? `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.gold})`
                                        : `linear-gradient(135deg, ${COLORS.red}, ${COLORS.orange})`,
                            color: isInsane ? '#1a1a1a' : '#fff',
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            marginBottom: '16px',
                            letterSpacing: '1px'
                        }}>
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

export function CollectionBook({ collection, collectionDetails, stats, allItems, dynamicItems, onClose, viewingUser }) {
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [showSpinStats, setShowSpinStats] = useState(false);
    const [dryStreaks, setDryStreaks] = useState({ mythic: 0, legendary: 0, rare: 0 });

    // Fetch dry streaks data (only for own collection)
    useEffect(() => {
        if (viewingUser) return; // Don't fetch for other users

        async function fetchDryStreaks() {
            try {
                const res = await fetch(`${API_BASE_URL}/api/dry-streaks`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setDryStreaks(data);
                }
            } catch (err) {
                console.error('Failed to fetch dry streaks:', err);
            }
        }
        fetchDryStreaks();
    }, [viewingUser]);

    // Memoize special items list - only recalculate when dynamicItems changes
    const { insaneItems, mythicItems, legendaryItems, rareItems, allItemsWithSpecial } = useMemo(() => {
        const hasApiData = dynamicItems && dynamicItems.length > 0;
        let insane, mythic, legendary, rare;

        if (hasApiData) {
            insane = dynamicItems.filter(i => i.rarity === 'insane').map(i => ({
                name: i.name, texture: i.texture, type: 'insane', chance: i.display_chance || i.chance, username: i.username, imageUrl: i.image_url || i.imageUrl
            }));
            mythic = dynamicItems.filter(i => i.rarity === 'mythic').map(i => ({
                name: i.name, texture: i.texture, type: 'mythic', chance: i.display_chance || i.chance, username: i.username, imageUrl: i.image_url || i.imageUrl
            }));
            legendary = dynamicItems.filter(i => i.rarity === 'legendary').map(i => ({
                name: i.name, texture: i.texture, type: 'legendary', chance: i.display_chance || i.chance, username: i.username, imageUrl: i.image_url || i.imageUrl
            }));
            rare = dynamicItems.filter(i => i.rarity === 'rare').map(i => ({
                name: i.name, texture: i.texture, type: 'rare', chance: i.display_chance || i.chance, username: i.username, imageUrl: i.image_url || i.imageUrl
            }));
        } else {
            insane = INSANE_ITEMS.map(i => ({ ...i, texture: i.texture, type: 'insane' }));
            mythic = MYTHIC_ITEMS.map(m => ({ ...m, texture: m.texture }));
            legendary = TEAM_MEMBERS.map(m => ({ name: m.name, texture: `special_${m.username}`, type: 'legendary', username: m.username, chance: m.chance }));
            rare = RARE_MEMBERS.map(m => ({ name: m.name, texture: `rare_${m.username}`, type: 'rare', username: m.username, chance: m.chance }));
        }

        return {
            insaneItems: insane,
            mythicItems: mythic,
            legendaryItems: legendary,
            rareItems: rare,
            allItemsWithSpecial: [...insane, ...mythic, ...legendary, ...rare, ...allItems]
        };
    }, [dynamicItems, allItems]);

    // Memoize collection stats - only recalculate when collection or items change
    const { collectedCount, totalCount, percentage, collectedInsaneCount, collectedMythicCount, collectedLegendaryCount, collectedRareCount } = useMemo(() => {
        const collected = Object.keys(collection).filter(k => collection[k] > 0).length;
        const total = allItemsWithSpecial.length;
        return {
            collectedCount: collected,
            totalCount: total,
            percentage: total > 0 ? ((collected / total) * 100).toFixed(1) : 0,
            collectedInsaneCount: insaneItems.filter(item => collection[item.texture] > 0).length,
            collectedMythicCount: mythicItems.filter(item => collection[item.texture] > 0).length,
            collectedLegendaryCount: legendaryItems.filter(item => collection[item.texture] > 0).length,
            collectedRareCount: rareItems.filter(item => collection[item.texture] > 0).length
        };
    }, [collection, allItemsWithSpecial, insaneItems, mythicItems, legendaryItems, rareItems]);

    // Memoize filtered and sorted items - recalculate when filter, search, or collection changes
    const sortedItems = useMemo(() => {
        const searchLower = search.toLowerCase();
        const filtered = allItemsWithSpecial.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchLower);
            const isCollected = collection[item.texture] > 0;
            if (!matchesSearch) return false;
            if (filter === 'insane') return item.type === 'insane';
            if (filter === 'mythic') return item.type === 'mythic';
            if (filter === 'legendary') return item.type === 'legendary';
            if (filter === 'rare') return item.type === 'rare';
            if (filter === 'collected') return isCollected;
            if (filter === 'missing') return !isCollected;
            return true;
        });

        return filtered.sort((a, b) => {
            const typeOrder = { insane: 0, mythic: 1, legendary: 2, rare: 3 };
            const aOrder = typeOrder[a.type] ?? 4;
            const bOrder = typeOrder[b.type] ?? 4;
            if (aOrder !== bOrder) return aOrder - bOrder;
            const aCount = collection[a.texture] || 0;
            const bCount = collection[b.texture] || 0;
            if (aCount !== bCount) return bCount - aCount;
            return a.name.localeCompare(b.name);
        });
    }, [allItemsWithSpecial, collection, filter, search]);

    // getItemImageUrl is imported from helpers.js

    const filterButtons = [
        { id: 'all', label: 'All' },
        { id: 'collected', label: 'Collected' },
        { id: 'missing', label: 'Missing' },
        { id: 'insane', label: 'Insane', color: COLORS.insane },
        { id: 'mythic', label: 'Mythic', color: COLORS.aqua },
        { id: 'legendary', label: 'Legendary', color: COLORS.purple },
        { id: 'rare', label: 'Rare', color: COLORS.red },
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
                        <div><span style={{ color: COLORS.insane, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}><Crown size={12} /> Insane</span><div style={{ color: COLORS.insane, fontWeight: '600' }}>{collectedInsaneCount}/{insaneItems.length}</div></div>
                        <div><span style={{ color: COLORS.aqua, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}><Sparkles size={12} /> Mythic</span><div style={{ color: COLORS.aqua, fontWeight: '600' }}>{collectedMythicCount}/{mythicItems.length}</div></div>
                        <div><span style={{ color: COLORS.purple, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={12} /> Legendary</span><div style={{ color: COLORS.purple, fontWeight: '600' }}>{collectedLegendaryCount}/{legendaryItems.length}</div></div>
                        <div><span style={{ color: COLORS.red, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}><Diamond size={12} /> Rare</span><div style={{ color: COLORS.red, fontWeight: '600' }}>{collectedRareCount}/{rareItems.length}</div></div>
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
                                            const totalSpecials = (stats?.insaneCount || 0) + (stats?.mythicCount || 0) + (stats?.legendaryCount || 0) + (stats?.rareCount || 0);
                                            if (totalSpecials === 0) return '-';
                                            return (stats.totalSpins / totalSpecials).toFixed(1);
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Dry Streaks Section */}
                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${COLORS.border}` }}>
                                <span style={{ color: COLORS.textMuted, fontSize: '11px', display: 'block', marginBottom: '8px' }}>Spins Since Last...</span>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                    <div style={{ padding: '8px', background: `${COLORS.aqua}15`, borderRadius: '6px', border: `1px solid ${COLORS.aqua}33` }}>
                                        <span style={{ color: COLORS.aqua, fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}><Sparkles size={10} /> Mythic</span>
                                        <div style={{ color: COLORS.aqua, fontWeight: '700', fontSize: '18px' }}>{dryStreaks.mythic}</div>
                                    </div>
                                    <div style={{ padding: '8px', background: `${COLORS.purple}15`, borderRadius: '6px', border: `1px solid ${COLORS.purple}33` }}>
                                        <span style={{ color: COLORS.purple, fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}><Star size={10} /> Legendary</span>
                                        <div style={{ color: COLORS.purple, fontWeight: '700', fontSize: '18px' }}>{dryStreaks.legendary}</div>
                                    </div>
                                    <div style={{ padding: '8px', background: `${COLORS.red}15`, borderRadius: '6px', border: `1px solid ${COLORS.red}33` }}>
                                        <span style={{ color: COLORS.red, fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}><Diamond size={10} /> Rare</span>
                                        <div style={{ color: COLORS.red, fontWeight: '700', fontSize: '18px' }}>{dryStreaks.rare}</div>
                                    </div>
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