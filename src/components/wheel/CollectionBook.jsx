import React, { useState, useEffect } from 'react';
import { COLORS, IMAGE_BASE_URL, MYTHIC_ITEM, TEAM_MEMBERS, RARE_MEMBERS } from './constants';
import { formatChance, getMinecraftHeadUrl } from './helpers';

// Item Detail Modal Component
function ItemDetailModal({ item, details, onClose }) {
    const isCollected = details && details.count > 0;
    const isMythic = item.type === 'mythic';
    const isLegendary = item.type === 'legendary';
    const isRare = item.type === 'rare';
    const isSpecialType = isMythic || isLegendary || isRare;

    const rarityColor = isMythic ? COLORS.aqua : isLegendary ? COLORS.purple : isRare ? COLORS.red : COLORS.gold;
    const rarityLabel = isMythic ? '✦ MYTHIC' : isLegendary ? '★ LEGENDARY' : isRare ? '◆ RARE' : 'COMMON';

    function getItemImageUrl() {
        if (item.imageUrl) return item.imageUrl;
        if (item.type === 'mythic' && !item.username) return MYTHIC_ITEM.imageUrl;
        if (item.username) return getMinecraftHeadUrl(item.username);
        return `${IMAGE_BASE_URL}/${item.texture}.png`;
    }

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
                    >×</button>

                    {/* Rarity badge */}
                    {isSpecialType && (
                        <div style={{
                            display: 'inline-block',
                            background: isMythic
                                ? `linear-gradient(135deg, ${COLORS.aqua}, ${COLORS.purple}, ${COLORS.gold})`
                                : isLegendary
                                    ? `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.gold})`
                                    : `linear-gradient(135deg, ${COLORS.red}, ${COLORS.orange})`,
                            color: '#fff',
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
                            src={getItemImageUrl()}
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
                                {item.chance ? `${formatChance(item.chance)}%` : '—'}
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
    );
}

export function CollectionBook({ collection, collectionDetails, stats, allItems, dynamicItems, onClose }) {
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);

    // Build special items list from API data (dynamicItems)
    const hasApiData = dynamicItems && dynamicItems.length > 0;

    let mythicItems, legendaryItems, rareItems;

    if (hasApiData) {
        mythicItems = dynamicItems.filter(i => i.rarity === 'mythic').map(i => ({
            name: i.name, texture: i.texture, type: 'mythic', chance: i.chance, username: i.username, imageUrl: i.image_url || i.imageUrl
        }));
        legendaryItems = dynamicItems.filter(i => i.rarity === 'legendary').map(i => ({
            name: i.name, texture: i.texture, type: 'legendary', chance: i.chance, username: i.username, imageUrl: i.image_url || i.imageUrl
        }));
        rareItems = dynamicItems.filter(i => i.rarity === 'rare').map(i => ({
            name: i.name, texture: i.texture, type: 'rare', chance: i.chance, username: i.username, imageUrl: i.image_url || i.imageUrl
        }));
    } else {
        mythicItems = [{ ...MYTHIC_ITEM, texture: 'mythic_cavendish' }];
        legendaryItems = TEAM_MEMBERS.map(m => ({ name: m.name, texture: `special_${m.username}`, type: 'legendary', username: m.username, chance: m.chance }));
        rareItems = RARE_MEMBERS.map(m => ({ name: m.name, texture: `rare_${m.username}`, type: 'rare', username: m.username, chance: m.chance }));
    }

    const allItemsWithSpecial = [...mythicItems, ...legendaryItems, ...rareItems, ...allItems];

    const collectedCount = Object.keys(collection).filter(k => collection[k] > 0).length;
    const totalCount = allItemsWithSpecial.length;
    const percentage = totalCount > 0 ? ((collectedCount / totalCount) * 100).toFixed(1) : 0;

    const collectedMythicCount = mythicItems.filter(item => collection[item.texture] > 0).length;
    const collectedLegendaryCount = legendaryItems.filter(item => collection[item.texture] > 0).length;
    const collectedRareCount = rareItems.filter(item => collection[item.texture] > 0).length;

    const filteredItems = allItemsWithSpecial.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
        const isCollected = collection[item.texture] > 0;
        if (!matchesSearch) return false;
        if (filter === 'mythic') return item.type === 'mythic';
        if (filter === 'legendary') return item.type === 'legendary';
        if (filter === 'rare') return item.type === 'rare';
        if (filter === 'collected') return isCollected;
        if (filter === 'missing') return !isCollected;
        return true;
    });

    const sortedItems = [...filteredItems].sort((a, b) => {
        const typeOrder = { mythic: 0, legendary: 1, rare: 2 };
        const aOrder = typeOrder[a.type] ?? 3;
        const bOrder = typeOrder[b.type] ?? 3;
        if (aOrder !== bOrder) return aOrder - bOrder;
        const aCount = collection[a.texture] || 0;
        const bCount = collection[b.texture] || 0;
        if (aCount !== bCount) return bCount - aCount;
        return a.name.localeCompare(b.name);
    });

    function getItemImageUrl(item) {
        if (item.imageUrl) return item.imageUrl;
        if (item.type === 'mythic' && !item.username) return MYTHIC_ITEM.imageUrl;
        if (item.username) return getMinecraftHeadUrl(item.username);
        return `${IMAGE_BASE_URL}/${item.texture}.png`;
    }

    const filterButtons = [
        { id: 'all', label: 'All' },
        { id: 'collected', label: 'Collected' },
        { id: 'missing', label: 'Missing' },
        { id: 'mythic', label: '✦ Mythic', color: COLORS.aqua },
        { id: 'legendary', label: '★ Legendary', color: COLORS.purple },
        { id: 'rare', label: '◆ Rare', color: COLORS.red },
    ];

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', animation: 'fadeIn 0.2s ease-out' }}>
            <div style={{ background: COLORS.bg, borderRadius: '16px', border: `1px solid ${COLORS.border}`, width: '100%', maxWidth: '900px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s ease-out' }}>
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: COLORS.text, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '24px' }}>📖</span>
                            Collection Book
                        </h2>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: COLORS.textMuted }}>
                            Track your Wheel of Fortune discoveries
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: COLORS.textMuted, fontSize: '24px', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}>×</button>
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px' }}>
                        <div><span style={{ color: COLORS.aqua, fontSize: '12px' }}>✦ Mythic</span><div style={{ color: COLORS.aqua, fontWeight: '600' }}>{collectedMythicCount}/{mythicItems.length}</div></div>
                        <div><span style={{ color: COLORS.purple, fontSize: '12px' }}>★ Legendary</span><div style={{ color: COLORS.purple, fontWeight: '600' }}>{collectedLegendaryCount}/{legendaryItems.length}</div></div>
                        <div><span style={{ color: COLORS.red, fontSize: '12px' }}>◆ Rare</span><div style={{ color: COLORS.red, fontWeight: '600' }}>{collectedRareCount}/{rareItems.length}</div></div>
                        <div><span style={{ color: COLORS.textMuted, fontSize: '12px' }}>Total Spins</span><div style={{ color: COLORS.text, fontWeight: '600' }}>{stats.totalSpins.toLocaleString()}</div></div>
                        <div><span style={{ color: COLORS.textMuted, fontSize: '12px' }}>Duplicates</span><div style={{ color: COLORS.text, fontWeight: '600' }}>{stats.totalDuplicates?.toLocaleString() || 0}</div></div>
                        <div title="Average spins between special (Rare+) drops">
                            <span style={{ color: COLORS.orange, fontSize: '12px' }}>⚡ Avg/Special</span>
                            <div style={{ color: COLORS.orange, fontWeight: '600' }}>
                                {(() => {
                                    const totalSpecials = (stats.mythicCount || 0) + (stats.legendaryCount || 0) + (stats.rareCount || 0);
                                    if (totalSpecials === 0) return '—';
                                    return (stats.totalSpins / totalSpecials).toFixed(1);
                                })()}
                            </div>
                        </div>
                    </div>

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

                {/* Items Grid */}
                <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '8px' }}>
                        {sortedItems.map((item, idx) => {
                            const count = collection[item.texture] || 0;
                            const isCollected = count > 0;
                            const isMythic = item.type === 'mythic';
                            const isLegendary = item.type === 'legendary';
                            const isRare = item.type === 'rare';
                            const isSpecialType = isMythic || isLegendary || isRare;

                            return (
                                <div
                                    key={idx}
                                    onClick={() => setSelectedItem(item)}
                                    style={{
                                        position: 'relative', aspectRatio: '1',
                                        background: isMythic
                                            ? (isCollected ? `linear-gradient(135deg, ${COLORS.aqua}33, ${COLORS.purple}22, ${COLORS.gold}22)` : COLORS.bg)
                                            : isLegendary
                                                ? (isCollected ? `linear-gradient(135deg, ${COLORS.purple}33, ${COLORS.gold}22)` : COLORS.bg)
                                                : isRare
                                                    ? (isCollected ? `linear-gradient(135deg, ${COLORS.red}33, ${COLORS.orange}22)` : COLORS.bg)
                                                    : (isCollected ? COLORS.bgLight : COLORS.bg),
                                        border: `2px solid ${
                                            isMythic ? (isCollected ? COLORS.aqua : COLORS.aqua + '44')
                                                : isLegendary ? (isCollected ? COLORS.purple : COLORS.purple + '44')
                                                    : isRare ? (isCollected ? COLORS.red : COLORS.red + '44')
                                                        : (isCollected ? COLORS.gold + '66' : COLORS.border)
                                        }`,
                                        borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.15s', cursor: 'pointer',
                                        boxShadow: isMythic && isCollected ? `0 0 15px ${COLORS.aqua}44, 0 0 25px ${COLORS.purple}22`
                                            : isLegendary && isCollected ? `0 0 12px ${COLORS.purple}44`
                                                : isRare && isCollected ? `0 0 10px ${COLORS.red}44` : 'none',
                                        animation: isMythic && isCollected ? 'mythicGlowSoft 2s ease-in-out infinite' : 'none'
                                    }}>
                                    {/* Special badge */}
                                    {isSpecialType && (
                                        <div style={{
                                            position: 'absolute', top: '-4px', right: '-4px',
                                            background: isMythic
                                                ? (isCollected ? `linear-gradient(135deg, ${COLORS.aqua}, ${COLORS.purple}, ${COLORS.gold})` : COLORS.bgLighter)
                                                : isLegendary
                                                    ? (isCollected ? `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.gold})` : COLORS.bgLighter)
                                                    : (isCollected ? COLORS.red : COLORS.bgLighter),
                                            color: isCollected ? '#fff' : COLORS.textMuted,
                                            fontSize: '8px', width: '14px', height: '14px', borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            border: `1px solid ${isMythic ? (isCollected ? COLORS.aqua : COLORS.border) : isLegendary ? (isCollected ? COLORS.purple : COLORS.border) : (isCollected ? COLORS.red : COLORS.border)}`,
                                            zIndex: 2
                                        }}>
                                            {isMythic ? '✦' : isLegendary ? '★' : '◆'}
                                        </div>
                                    )}

                                    <img src={getItemImageUrl(item)} alt={item.name}
                                         style={{
                                             width: '70%', height: '70%',
                                             imageRendering: (item.username) ? 'auto' : 'pixelated',
                                             borderRadius: (item.username) ? '4px' : '0',
                                             opacity: isCollected ? 1 : 0.2,
                                             filter: isCollected ? 'none' : 'grayscale(100%)',
                                             transition: 'all 0.15s'
                                         }}
                                         onError={(e) => { e.target.onerror = null; e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }}
                                    />

                                    {count > 1 && (
                                        <div style={{
                                            position: 'absolute', bottom: '2px', right: '2px',
                                            background: isMythic ? COLORS.aqua : isLegendary ? COLORS.purple : isRare ? COLORS.red : COLORS.gold,
                                            color: '#fff', fontSize: '10px', fontWeight: '700',
                                            padding: '1px 5px', borderRadius: '4px', minWidth: '18px', textAlign: 'center'
                                        }}>×{count}</div>
                                    )}

                                    {isCollected && count === 1 && !isSpecialType && (
                                        <div style={{ position: 'absolute', bottom: '2px', right: '2px', color: COLORS.green, fontSize: '12px' }}>✓</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {sortedItems.length === 0 && <div style={{ textAlign: 'center', padding: '48px', color: COLORS.textMuted }}><div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div><div>No items found</div></div>}
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