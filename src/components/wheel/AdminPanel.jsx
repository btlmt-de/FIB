import React, { useState, useEffect } from 'react';
import { COLORS, API_BASE_URL, IMAGE_BASE_URL, TEAM_MEMBERS, RARE_MEMBERS } from '../../config/constants.js';
import { getMinecraftHeadUrl } from '../../utils/helpers.js';
import { Bell, Plus, Trash2, FileText, Megaphone, Wrench, AlertTriangle, Crown, Sparkles, Star, Diamond, Zap } from 'lucide-react';

// User Collection Editor Sub-component
function UserCollectionEditor({ user, allItems, onClose, onAddItem, onRemoveItem }) {
    const [mode, setMode] = useState('add');
    const [itemType, setItemType] = useState('regular');
    const [selectedItem, setSelectedItem] = useState('');
    const [count, setCount] = useState(1);
    const [userCollection, setUserCollection] = useState({});
    const [loadingCollection, setLoadingCollection] = useState(true);

    const specialItems = [
        { texture: 'mythic_cavendish', name: 'Cavendish', type: 'mythic' },
        ...TEAM_MEMBERS.map(m => ({ texture: `special_${m.username}`, name: m.name, type: 'legendary' })),
        ...RARE_MEMBERS.map(m => ({ texture: `rare_${m.username}`, name: m.name, type: 'rare' }))
    ];

    useEffect(() => {
        async function fetchUserCollection() {
            try {
                const res = await fetch(`${API_BASE_URL}/admin/users/${user.id}/collection`, { credentials: 'include' });
                if (!res.ok) {
                    console.error(`Failed to fetch user collection: ${res.status} ${res.statusText}`);
                    return;
                }
                const data = await res.json();
                const collectionObj = {};
                if (Array.isArray(data.collection)) {
                    data.collection.forEach(item => {
                        collectionObj[item.item_texture] = item.count;
                    });
                }
                setUserCollection(collectionObj);
            } catch (error) {
                console.error('Failed to fetch user collection:', error);
            } finally {
                setLoadingCollection(false);
            }
        }
        fetchUserCollection();
    }, [user.id]);

    const collectedItems = Object.entries(userCollection)
        .filter(([_, count]) => count > 0)
        .map(([texture, count]) => {
            const regularItem = allItems.find(i => i.texture === texture);
            const specialItem = specialItems.find(i => i.texture === texture);
            const item = regularItem || specialItem || { texture, name: texture, type: 'regular' };
            return { ...item, count };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

    function handleAdd() {
        if (itemType === 'regular' && selectedItem) {
            const item = allItems.find(i => i.texture === selectedItem);
            if (item) onAddItem(user.id, item.texture, item.name, 'regular', count);
        } else if (itemType === 'special' && selectedItem) {
            const item = specialItems.find(i => i.texture === selectedItem);
            if (item) onAddItem(user.id, item.texture, item.name, item.type, count);
        }
    }

    function handleRemove() {
        if (selectedItem && onRemoveItem) {
            onRemoveItem(user.id, selectedItem, count);
        }
    }

    return (
        <div style={{ background: COLORS.bg, borderRadius: '16px', border: `1px solid ${COLORS.border}`, padding: '24px', maxWidth: '500px', width: '100%' }}>
            <h3 style={{ margin: '0 0 16px 0', color: COLORS.text }}>Edit Collection: {user.custom_username || user.discord_username}</h3>

            <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { setMode('add'); setSelectedItem(''); }} style={{
                        flex: 1, padding: '10px', background: mode === 'add' ? COLORS.green + '22' : COLORS.bgLight,
                        border: `1px solid ${mode === 'add' ? COLORS.green : COLORS.border}`,
                        borderRadius: '6px', color: mode === 'add' ? COLORS.green : COLORS.textMuted,
                        cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                    }}>+ Add Items</button>
                    <button onClick={() => { setMode('remove'); setSelectedItem(''); }} style={{
                        flex: 1, padding: '10px', background: mode === 'remove' ? COLORS.red + '22' : COLORS.bgLight,
                        border: `1px solid ${mode === 'remove' ? COLORS.red : COLORS.border}`,
                        borderRadius: '6px', color: mode === 'remove' ? COLORS.red : COLORS.textMuted,
                        cursor: 'pointer', fontSize: '13px', fontWeight: '600'
                    }}>- Remove Items</button>
                </div>
            </div>

            {mode === 'add' && (
                <>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '8px' }}>Item Type</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {['regular', 'special'].map(t => (
                                <button key={t} onClick={() => { setItemType(t); setSelectedItem(''); }} style={{
                                    flex: 1, padding: '8px', background: itemType === t ? COLORS.bgLighter : COLORS.bgLight,
                                    border: `1px solid ${itemType === t ? COLORS.accent : COLORS.border}`,
                                    borderRadius: '6px', color: itemType === t ? COLORS.accent : COLORS.textMuted,
                                    cursor: 'pointer', fontSize: '12px'
                                }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                            ))}
                        </div>
                    </div>

                    {itemType === 'regular' && (
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '4px' }}>Select Item</label>
                            <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', background: COLORS.bgLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, fontSize: '14px' }}>
                                <option value="">Select an item...</option>
                                {allItems.map(item => <option key={item.texture} value={item.texture}>{item.name}</option>)}
                            </select>
                        </div>
                    )}

                    {itemType === 'special' && (
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '4px' }}>Select Special Item</label>
                            <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', background: COLORS.bgLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, fontSize: '14px' }}>
                                <option value="">Select a special item...</option>
                                {specialItems.map(item => <option key={item.texture} value={item.texture}>{getRarityIcon(item.type)} {item.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '4px' }}>Count to Add</label>
                        <input type="number" min="1" max="1000" value={count} onChange={e => setCount(parseInt(e.target.value) || 1)}
                               style={{ width: '100px', padding: '10px 12px', background: COLORS.bgLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, fontSize: '14px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${COLORS.border}`, borderRadius: '8px', color: COLORS.textMuted, cursor: 'pointer' }}>Cancel</button>
                        <button onClick={handleAdd} disabled={!selectedItem} style={{ flex: 1, padding: '12px', background: selectedItem ? COLORS.green : COLORS.bgLighter, border: 'none', borderRadius: '8px', color: selectedItem ? COLORS.bg : COLORS.textMuted, fontWeight: '600', cursor: selectedItem ? 'pointer' : 'not-allowed' }}>Add to Collection</button>
                    </div>
                </>
            )}

            {mode === 'remove' && (
                <>
                    {loadingCollection ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: COLORS.textMuted }}>Loading collection...</div>
                    ) : collectedItems.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: COLORS.textMuted }}>User has no items in collection</div>
                    ) : (
                        <>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '4px' }}>Select Item to Remove</label>
                                <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)}
                                        style={{ width: '100%', padding: '10px 12px', background: COLORS.bgLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, fontSize: '14px' }}>
                                    <option value="">Select an item...</option>
                                    {collectedItems.map(item => (
                                        <option key={item.texture} value={item.texture}>
                                            {getRarityIcon(item.type)} {item.name} (x{item.count})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '4px' }}>Count to Remove</label>
                                <input type="number" min="1" max={collectedItems.find(i => i.texture === selectedItem)?.count || 1000} value={count} onChange={e => setCount(parseInt(e.target.value) || 1)}
                                       style={{ width: '100px', padding: '10px 12px', background: COLORS.bgLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, fontSize: '14px' }}
                                />
                                {selectedItem && (
                                    <span style={{ marginLeft: '8px', color: COLORS.textMuted, fontSize: '12px' }}>
                                        (max: {collectedItems.find(i => i.texture === selectedItem)?.count || 0})
                                    </span>
                                )}
                            </div>
                        </>
                    )}

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${COLORS.border}`, borderRadius: '8px', color: COLORS.textMuted, cursor: 'pointer' }}>Cancel</button>
                        <button onClick={handleRemove} disabled={!selectedItem} style={{ flex: 1, padding: '12px', background: selectedItem ? COLORS.red : COLORS.bgLighter, border: 'none', borderRadius: '8px', color: selectedItem ? '#fff' : COLORS.textMuted, fontWeight: '600', cursor: selectedItem ? 'pointer' : 'not-allowed' }}>Remove from Collection</button>
                    </div>
                </>
            )}
        </div>
    );
}

// Helper functions
function getRarityIcon(rarity) {
    if (rarity === 'insane') return <Crown size={12} style={{ color: '#FFD700' }} />;
    if (rarity === 'mythic') return <Sparkles size={12} style={{ color: COLORS.aqua }} />;
    if (rarity === 'legendary') return <Star size={12} style={{ color: COLORS.purple }} />;
    if (rarity === 'event') return <Zap size={12} style={{ color: COLORS.orange }} />;
    if (rarity === 'rare') return <Diamond size={12} style={{ color: COLORS.red }} />;
    return null;
}

function getRarityColor(rarity) {
    if (rarity === 'mythic') return COLORS.aqua;
    if (rarity === 'legendary') return COLORS.purple;
    if (rarity === 'event') return COLORS.orange;
    if (rarity === 'rare') return COLORS.red;
    return COLORS.gold;
}

function formatWeight(weight) {
    if (weight >= 1000000) return (weight / 1000000).toFixed(1) + 'M';
    if (weight >= 1000) return (weight / 1000).toFixed(1) + 'K';
    return weight.toString();
}

function formatPercentage(percentage) {
    if (percentage >= 1) return percentage.toFixed(1).replace(/\.?0+$/, '') + '%';
    if (percentage >= 0.1) return percentage.toFixed(2).replace(/\.?0+$/, '') + '%';
    if (percentage >= 0.01) return percentage.toFixed(3).replace(/\.?0+$/, '') + '%';
    if (percentage >= 0.001) return percentage.toFixed(4).replace(/\.?0+$/, '') + '%';
    if (percentage >= 0.0001) return percentage.toFixed(5).replace(/\.?0+$/, '') + '%';
    return percentage.toFixed(6).replace(/\.?0+$/, '') + '%';
}

// Pool Statistics Component
function PoolStatistics({ poolStats }) {
    if (!poolStats) return null;

    // Total weight is always 10 million
    const TOTAL_WEIGHT = 10000000;
    const regularItemsWeight = poolStats.regularItemsWeight || 0;
    const regularPercentage = (regularItemsWeight / TOTAL_WEIGHT) * 100;
    const specialPercentage = Math.max(0, 100 - regularPercentage);

    return (
        <div style={{
            background: `linear-gradient(135deg, ${COLORS.bgLight} 0%, ${COLORS.bgLighter} 100%)`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            border: `1px solid ${COLORS.border}`
        }}>
            <h3 style={{ margin: '0 0 16px 0', color: COLORS.text, fontSize: '16px', fontWeight: '600' }}>
                Pool Statistics
            </h3>

            {/* Visual weight bar */}
            <div style={{ marginBottom: '16px' }}>
                <div style={{
                    height: '24px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'flex',
                    background: COLORS.bg
                }}>
                    <div style={{
                        width: `${regularPercentage}%`,
                        background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.orange})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: COLORS.bg,
                        minWidth: '60px'
                    }}>
                        {regularPercentage.toFixed(1)}%
                    </div>
                    <div style={{
                        flex: 1,
                        background: `linear-gradient(90deg, ${COLORS.purple}, ${COLORS.aqua})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: COLORS.bg,
                        minWidth: '60px'
                    }}>
                        {specialPercentage.toFixed(1)}%
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px' }}>
                    <span style={{ color: COLORS.gold }}>■ Regular Items</span>
                    <span style={{ color: COLORS.purple }}>■ Special Items</span>
                </div>
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div style={{ background: COLORS.bg, borderRadius: '8px', padding: '12px' }}>
                    <div style={{ color: COLORS.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Weight</div>
                    <div style={{ color: COLORS.text, fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>
                        {formatWeight(TOTAL_WEIGHT)}
                    </div>
                    <div style={{ color: COLORS.textMuted, fontSize: '10px', marginTop: '2px' }}>Fixed</div>
                </div>
                <div style={{ background: COLORS.bg, borderRadius: '8px', padding: '12px' }}>
                    <div style={{ color: COLORS.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Special Items</div>
                    <div style={{ color: COLORS.text, fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>
                        {poolStats.specialItemsCount || 0}
                    </div>
                </div>
            </div>

            {/* Regular items weight display (read-only) */}
            <div style={{
                marginTop: '16px',
                padding: '16px',
                background: COLORS.bg,
                borderRadius: '8px',
                border: `1px solid ${COLORS.gold}33`
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ color: COLORS.gold, fontSize: '13px', fontWeight: '600' }}>Regular Items Weight</div>
                        <div style={{ color: COLORS.textMuted, fontSize: '11px', marginTop: '2px' }}>
                            Auto-calculated: 10M - special items weight
                        </div>
                    </div>
                    <div style={{
                        fontSize: '24px',
                        fontWeight: '700',
                        color: COLORS.gold,
                        fontFamily: 'monospace'
                    }}>
                        {regularItemsWeight.toLocaleString()}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Special Item Card Component
function SpecialItemCard({ item, poolStats, onEditWeight, onDelete, isStatic }) {
    const [editing, setEditing] = useState(false);
    const [newWeight, setNewWeight] = useState(item.weight?.toString() || '0');

    // Fixed total weight of 10 million
    const TOTAL_WEIGHT = 10000000;
    const percentage = (item.weight / TOTAL_WEIGHT) * 100;

    const rarityColor = getRarityColor(item.rarity);
    const rarityIcon = getRarityIcon(item.rarity);

    const handleSave = () => {
        onEditWeight(item.id, parseInt(newWeight));
        setEditing(false);
    };

    return (
        <div style={{
            background: COLORS.bgLight,
            borderRadius: '10px',
            padding: '16px',
            border: `1px solid ${COLORS.border}`,
            transition: 'border-color 0.2s'
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                {/* Item image */}
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: `2px solid ${rarityColor}44`,
                    flexShrink: 0,
                    background: COLORS.bg
                }}>
                    <img
                        src={item.image_url || (item.username ? getMinecraftHeadUrl(item.username) : `${IMAGE_BASE_URL}/${item.texture?.replace(/^(special_|rare_|mythic_|event_)/, '')}.png`)}
                        style={{
                            width: '100%',
                            height: '100%',
                            imageRendering: item.username ? 'auto' : 'pixelated',
                            objectFit: 'cover'
                        }}
                        onError={(e) => { e.target.onerror = null; e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }}
                        alt={item.name}
                    />
                </div>

                {/* Item info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ color: rarityColor, fontSize: '14px' }}>{rarityIcon}</span>
                        <span style={{ color: rarityColor, fontWeight: '600', fontSize: '15px' }}>{item.name}</span>
                        {isStatic && (
                            <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                background: COLORS.bgLighter,
                                borderRadius: '4px',
                                color: COLORS.textMuted,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                Core
                            </span>
                        )}
                    </div>

                    {/* Weight and percentage display */}
                    {editing ? (
                        <div style={{ marginTop: '8px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                <div>
                                    <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '10px', marginBottom: '2px' }}>Weight</label>
                                    <input
                                        type="number"
                                        value={newWeight}
                                        onChange={e => setNewWeight(e.target.value)}
                                        style={{
                                            width: '100px',
                                            padding: '6px 10px',
                                            background: COLORS.bg,
                                            border: `1px solid ${COLORS.accent}`,
                                            borderRadius: '4px',
                                            color: COLORS.text,
                                            fontSize: '13px',
                                            fontFamily: 'monospace'
                                        }}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={handleSave}
                                    style={{ padding: '6px 12px', background: COLORS.green, border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => {
                                        setNewWeight(item.weight?.toString() || '0');
                                        setEditing(false);
                                    }}
                                    style={{ padding: '6px 12px', background: COLORS.bgLighter, border: `1px solid ${COLORS.border}`, borderRadius: '4px', color: COLORS.textMuted, cursor: 'pointer', fontSize: '12px' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                            <div>
                                <span style={{ color: COLORS.textMuted, fontSize: '12px' }}>Weight: </span>
                                <span style={{ color: COLORS.text, fontSize: '13px', fontWeight: '600', fontFamily: 'monospace' }}>
                                    {(item.weight || 0).toLocaleString()}
                                </span>
                            </div>
                            <div>
                                <span style={{ color: COLORS.textMuted, fontSize: '12px' }}>Chance: </span>
                                <span style={{ color: COLORS.green, fontSize: '13px', fontWeight: '600' }}>
                                    {formatPercentage(percentage)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {!editing && (
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button
                            onClick={() => setEditing(true)}
                            style={{
                                padding: '6px 12px',
                                background: `${COLORS.accent}22`,
                                border: `1px solid ${COLORS.accent}44`,
                                borderRadius: '6px',
                                color: COLORS.accent,
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500'
                            }}
                        >
                            Edit
                        </button>
                        {!isStatic && (
                            <button
                                onClick={() => onDelete(item.id)}
                                style={{
                                    padding: '6px 12px',
                                    background: `${COLORS.red}22`,
                                    border: `1px solid ${COLORS.red}44`,
                                    borderRadius: '6px',
                                    color: COLORS.red,
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '500'
                                }}
                            >
                                Delete
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Add New Item Form Component
function AddItemForm({ onAdd, poolStats, adding }) {
    const [itemData, setItemData] = useState({
        type: 'playerhead',
        name: '',
        username: '',
        texture: '',
        imageUrl: '',
        weight: '5000',
        rarity: 'rare'
    });

    // Fixed total weight of 10 million - weight directly maps to percentage
    const TOTAL_WEIGHT = 10000000;
    const previewPercentage = (parseInt(itemData.weight || 0) / TOTAL_WEIGHT) * 100;

    const handleSubmit = () => {
        onAdd(itemData);
        setItemData({
            type: 'playerhead',
            name: '',
            username: '',
            texture: '',
            imageUrl: '',
            weight: '5000',
            rarity: 'rare'
        });
    };

    const isValid = itemData.name &&
        (itemData.type === 'playerhead' ? itemData.username : (itemData.texture || itemData.imageUrl)) &&
        parseInt(itemData.weight) > 0;

    return (
        <div style={{
            background: COLORS.bgLight,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${COLORS.border}`,
            marginBottom: '24px'
        }}>
            <h3 style={{ margin: '0 0 16px 0', color: COLORS.text, fontSize: '15px', fontWeight: '600' }}>
                Add New Special Item
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {/* Item Type */}
                <div>
                    <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '6px' }}>Item Type</label>
                    <select
                        value={itemData.type}
                        onChange={e => setItemData({ ...itemData, type: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, fontSize: '14px' }}
                    >
                        <option value="playerhead">Player Head</option>
                        <option value="item">Custom Item</option>
                    </select>
                </div>

                {/* Rarity */}
                <div>
                    <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '6px' }}>Rarity</label>
                    <select
                        value={itemData.rarity}
                        onChange={e => setItemData({ ...itemData, rarity: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, fontSize: '14px' }}
                    >
                        <option value="rare">💎 Rare</option>
                        <option value="legendary">⭐ Legendary</option>
                        <option value="mythic">✨ Mythic</option>
                        <option value="insane">👑 Insane</option>
                        <option value="event">⚡ Event</option>
                    </select>
                </div>

                {/* Display Name */}
                <div style={{ gridColumn: itemData.type === 'playerhead' ? '1' : '1 / -1' }}>
                    <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '6px' }}>Display Name *</label>
                    <input
                        type="text"
                        value={itemData.name}
                        onChange={e => setItemData({ ...itemData, name: e.target.value })}
                        placeholder="e.g. NewPlayer123"
                        style={{ width: '100%', padding: '10px 12px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, fontSize: '14px', boxSizing: 'border-box' }}
                    />
                </div>

                {/* Minecraft Username (for player heads) */}
                {itemData.type === 'playerhead' && (
                    <div>
                        <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '6px' }}>Minecraft Username *</label>
                        <input
                            type="text"
                            value={itemData.username}
                            onChange={e => setItemData({ ...itemData, username: e.target.value })}
                            placeholder="e.g. Notch"
                            style={{ width: '100%', padding: '10px 12px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, fontSize: '14px', boxSizing: 'border-box' }}
                        />
                    </div>
                )}

                {/* Custom item fields */}
                {itemData.type === 'item' && (
                    <>
                        <div>
                            <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '6px' }}>Texture ID</label>
                            <input
                                type="text"
                                value={itemData.texture}
                                onChange={e => setItemData({ ...itemData, texture: e.target.value })}
                                placeholder="e.g. diamond_sword"
                                style={{ width: '100%', padding: '10px 12px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, fontSize: '14px', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '6px' }}>Image URL</label>
                            <input
                                type="text"
                                value={itemData.imageUrl}
                                onChange={e => setItemData({ ...itemData, imageUrl: e.target.value })}
                                placeholder="https://..."
                                style={{ width: '100%', padding: '10px 12px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, fontSize: '14px', boxSizing: 'border-box' }}
                            />
                        </div>
                    </>
                )}

                {/* Weight */}
                <div>
                    <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '6px' }}>
                        Weight *
                    </label>
                    <input
                        type="number"
                        value={itemData.weight}
                        onChange={e => setItemData({ ...itemData, weight: e.target.value })}
                        placeholder="5000"
                        style={{ width: '100%', padding: '10px 12px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, fontSize: '14px', boxSizing: 'border-box', fontFamily: 'monospace' }}
                    />
                </div>

                {/* Display Chance */}
                {/* Info row */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        padding: '10px 12px',
                        background: COLORS.bg,
                        borderRadius: '6px',
                        border: `1px solid ${COLORS.border}`
                    }}>
                        <div>
                            <span style={{ color: COLORS.textMuted, fontSize: '12px' }}>Drop rate: </span>
                            <span style={{ color: COLORS.green, fontSize: '12px', fontWeight: '600', fontFamily: 'monospace' }}>
                                {formatPercentage(previewPercentage)}
                            </span>
                        </div>
                    </div>
                    <div style={{ color: COLORS.textMuted, fontSize: '11px', marginTop: '6px' }}>
                        Weight 10 = 0.0001% • Weight 1000 = 0.01% • Weight 100000 = 1%
                    </div>
                </div>
            </div>

            <button
                onClick={handleSubmit}
                disabled={adding || !isValid}
                style={{
                    width: '100%',
                    padding: '14px',
                    background: isValid ? COLORS.accent : COLORS.bgLighter,
                    border: 'none',
                    borderRadius: '8px',
                    color: isValid ? '#fff' : COLORS.textMuted,
                    fontWeight: '600',
                    cursor: isValid ? 'pointer' : 'not-allowed',
                    marginTop: '16px',
                    fontSize: '14px'
                }}
            >
                {adding ? 'Adding...' : 'Add to Wheel Pool'}
            </button>
        </div>
    );
}

// Main Admin Panel Component
export function AdminPanel({ onClose, allItems }) {
    const [tab, setTab] = useState('pending');
    const [pending, setPending] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchUser, setSearchUser] = useState('');
    const [dynamicItems, setDynamicItems] = useState([]);
    const [poolStats, setPoolStats] = useState(null);
    const [addingItem, setAddingItem] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Notification state
    const [notifications, setNotifications] = useState([]);
    const [showNotificationForm, setShowNotificationForm] = useState(false);
    const [notificationForm, setNotificationForm] = useState({ title: '', content: '', type: 'changelog', priority: 'normal' });
    const [submittingNotification, setSubmittingNotification] = useState(false);
    const [notificationError, setNotificationError] = useState('');

    useEffect(() => {
        if (tab === 'pending') fetchPending();
        if (tab === 'users') fetchUsers();
        if (tab === 'special') {
            fetchSpecialItems();
            fetchPoolStats();
        }
        if (tab === 'notifications') fetchNotifications();
    }, [tab]);

    async function fetchPending() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/pending`, { credentials: 'include' });
            if (!res.ok) {
                console.error(`Failed to fetch pending: ${res.status} ${res.statusText}`);
                return;
            }
            const data = await res.json();
            setPending(data.pending || []);
        } catch (error) { console.error('Failed to fetch pending:', error); }
        finally { setLoading(false); }
    }

    async function fetchUsers() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users`, { credentials: 'include' });
            if (!res.ok) {
                console.error(`Failed to fetch users: ${res.status} ${res.statusText}`);
                return;
            }
            const data = await res.json();
            setUsers(data.users || []);
        } catch (error) { console.error('Failed to fetch users:', error); }
        finally { setLoading(false); }
    }

    async function fetchSpecialItems() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/special-items`, { credentials: 'include' });
            if (!res.ok) {
                console.error(`Failed to fetch special items: ${res.status} ${res.statusText}`);
                return;
            }
            const data = await res.json();
            setDynamicItems(data.items || []);
        } catch (error) { console.error('Failed to fetch special items:', error); }
        finally { setLoading(false); }
    }

    async function fetchPoolStats() {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/pool-stats`, { credentials: 'include' });
            if (!res.ok) {
                console.error(`Failed to fetch pool stats: ${res.status} ${res.statusText}`);
                return;
            }
            const data = await res.json();
            setPoolStats(data);
        } catch (error) { console.error('Failed to fetch pool stats:', error); }
    }

    // Notification functions
    async function fetchNotifications() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/notifications`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
            }
        } catch (error) { console.error('Failed to fetch notifications:', error); }
        finally { setLoading(false); }
    }

    async function createNotification(e) {
        e.preventDefault();
        setSubmittingNotification(true);
        setNotificationError('');

        try {
            const res = await fetch(`${API_BASE_URL}/admin/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(notificationForm)
            });

            const data = await res.json();

            if (res.ok) {
                setNotifications(prev => [data.notification, ...prev]);
                setNotificationForm({ title: '', content: '', type: 'changelog', priority: 'normal' });
                setShowNotificationForm(false);
            } else {
                setNotificationError(data.error || 'Failed to create notification');
            }
        } catch (error) {
            setNotificationError('Failed to create notification');
        } finally {
            setSubmittingNotification(false);
        }
    }

    async function deleteNotification(id) {
        if (!confirm('Are you sure you want to delete this notification?')) return;

        try {
            const res = await fetch(`${API_BASE_URL}/admin/notifications/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (res.ok) {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    }

    function getNotificationTypeIcon(type) {
        switch (type) {
            case 'announcement': return <Megaphone size={14} />;
            case 'maintenance': return <Wrench size={14} />;
            default: return <FileText size={14} />;
        }
    }

    function getNotificationTypeColor(type) {
        switch (type) {
            case 'announcement': return COLORS.gold;
            case 'maintenance': return COLORS.orange;
            default: return COLORS.accent;
        }
    }

    function formatNotificationDate(dateStr) {
        return new Date(dateStr).toLocaleString();
    }

    async function approve(userId) {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/approve/${userId}`, { method: 'POST', credentials: 'include' });
            if (!res.ok) {
                const errorText = await res.text().catch(() => 'Unknown error');
                alert(`Failed to approve user: ${res.status} - ${errorText}`);
                return;
            }
            setPending(prev => prev.filter(p => p.id !== userId));
        } catch (e) {
            console.error('Approve error:', e);
            alert('Network error while approving user');
        }
    }

    async function reject(userId) {
        const reason = prompt('Rejection reason:');
        if (reason === null) return;
        try {
            const res = await fetch(`${API_BASE_URL}/admin/reject/${userId}`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            if (!res.ok) {
                const errorText = await res.text().catch(() => 'Unknown error');
                alert(`Failed to reject user: ${res.status} - ${errorText}`);
                return;
            }
            setPending(prev => prev.filter(p => p.id !== userId));
        } catch (e) {
            console.error('Reject error:', e);
            alert('Network error while rejecting user');
        }
    }

    async function addItemToUser(userId, texture, name, type, count = 1) {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/collection`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texture, name, type, count })
            });
            if (res.ok) {
                setMessage({ text: 'Item added successfully!', type: 'success' });
                setSelectedUser(null);
            } else {
                const data = await res.json();
                setMessage({ text: 'Failed: ' + data.error, type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Failed to add item', type: 'error' });
        }
    }

    async function removeItemFromUser(userId, texture, count = 1) {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/collection`, {
                method: 'DELETE', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texture, count })
            });
            if (res.ok) {
                setMessage({ text: 'Item removed successfully!', type: 'success' });
                setSelectedUser(null);
            } else {
                const data = await res.json();
                setMessage({ text: 'Failed: ' + data.error, type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Failed to remove item', type: 'error' });
        }
    }

    async function addSpecialItemToPool(itemData) {
        setAddingItem(true);
        setMessage({ text: '', type: '' });
        try {
            const weightValue = parseInt(itemData.weight, 10);

            const payload = {
                ...itemData,
                weight: weightValue
            };

            const res = await fetch(`${API_BASE_URL}/admin/special-items`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ text: `Added "${data.item.name}" to the pool!`, type: 'success' });
                fetchSpecialItems();
                fetchPoolStats();
            } else {
                setMessage({ text: 'Failed: ' + data.error, type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Failed to add special item: ' + error.message, type: 'error' });
        }
        finally { setAddingItem(false); }
    }

    async function deleteSpecialItem(itemId) {
        if (!confirm('Are you sure you want to remove this item from the pool?')) return;
        try {
            await fetch(`${API_BASE_URL}/admin/special-items/${itemId}`, {
                method: 'DELETE', credentials: 'include'
            });
            fetchSpecialItems();
            fetchPoolStats();
            setMessage({ text: 'Item removed from pool', type: 'success' });
        } catch (error) {
            console.error('Failed to delete item:', error);
            setMessage({ text: 'Failed to delete item', type: 'error' });
        }
    }

    async function updateItemWeight(itemId, newWeight) {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/special-items/${itemId}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weight: newWeight })
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ text: `Updated weight to ${newWeight.toLocaleString()}`, type: 'success' });
                fetchSpecialItems();
                fetchPoolStats();
            } else {
                setMessage({ text: 'Failed: ' + data.error, type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Failed to update weight', type: 'error' });
        }
    }

    const filteredUsers = users.filter(u =>
        (u.custom_username?.toLowerCase() || '').includes(searchUser.toLowerCase()) ||
        (u.discord_username?.toLowerCase() || '').includes(searchUser.toLowerCase())
    );

    const tabs = [
        { id: 'pending', label: 'Pending', count: pending.length },
        { id: 'users', label: 'Users' },
        { id: 'special', label: 'Item Pool' },
        { id: 'notifications', label: 'Notifications', icon: <Bell size={14} /> }
    ];

    // Separate items by type
    const coreItems = dynamicItems.filter(i => i.is_static);
    const customItems = dynamicItems.filter(i => !i.is_static);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div style={{
                background: COLORS.bg,
                borderRadius: '16px',
                border: `1px solid ${COLORS.border}`,
                width: '100%',
                maxWidth: '800px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: COLORS.bgLight
                }}>
                    <h2 style={{ margin: 0, color: COLORS.text, fontWeight: '600', fontSize: '18px' }}>
                        Admin Panel
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: COLORS.bgLighter,
                            border: `1px solid ${COLORS.border}`,
                            color: COLORS.textMuted,
                            fontSize: '18px',
                            cursor: 'pointer',
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        x
                    </button>
                </div>

                {/* Tabs */}
                <div style={{
                    padding: '12px 24px',
                    borderBottom: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    gap: '8px',
                    background: COLORS.bgLight
                }}>
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            style={{
                                padding: '10px 20px',
                                background: tab === t.id ? COLORS.accent : 'transparent',
                                border: tab === t.id ? 'none' : `1px solid ${COLORS.border}`,
                                borderRadius: '8px',
                                color: tab === t.id ? '#fff' : COLORS.textMuted,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontWeight: tab === t.id ? '600' : '500',
                                transition: 'all 0.2s'
                            }}
                        >
                            {t.icon && t.icon}
                            {t.label}
                            {t.count > 0 && (
                                <span style={{
                                    background: tab === t.id ? 'rgba(255,255,255,0.2)' : COLORS.red,
                                    color: '#fff',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                    fontWeight: '600'
                                }}>
                                    {t.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Message */}
                {message.text && (
                    <div style={{
                        margin: '16px 24px 0',
                        padding: '12px 16px',
                        background: message.type === 'success' ? `${COLORS.green}22` : `${COLORS.red}22`,
                        border: `1px solid ${message.type === 'success' ? COLORS.green : COLORS.red}44`,
                        borderRadius: '8px',
                        color: message.type === 'success' ? COLORS.green : COLORS.red,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <span>{message.text}</span>
                        <button
                            onClick={() => setMessage({ text: '', type: '' })}
                            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px' }}
                        >
                            x
                        </button>
                    </div>
                )}

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
                    {/* Pending Approvals Tab */}
                    {tab === 'pending' && (
                        loading ? (
                            <div style={{ color: COLORS.textMuted, textAlign: 'center', padding: '40px' }}>Loading...</div>
                        ) : pending.length === 0 ? (
                            <div style={{
                                color: COLORS.textMuted,
                                textAlign: 'center',
                                padding: '60px 20px',
                                background: COLORS.bgLight,
                                borderRadius: '12px'
                            }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
                                <div style={{ fontSize: '16px', fontWeight: '500' }}>No pending approvals</div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {pending.map(user => (
                                    <div key={user.id} style={{
                                        background: COLORS.bgLight,
                                        borderRadius: '10px',
                                        padding: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        border: `1px solid ${COLORS.border}`
                                    }}>
                                        <div>
                                            <div style={{ color: COLORS.gold, fontWeight: '600', fontSize: '15px' }}>
                                                {user.custom_username}
                                            </div>
                                            <div style={{ color: COLORS.textMuted, fontSize: '12px', marginTop: '4px' }}>
                                                Discord: {user.discord_username}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => approve(user.id)}
                                                style={{
                                                    padding: '8px 16px',
                                                    background: COLORS.green,
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    color: COLORS.bg,
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    fontWeight: '600'
                                                }}
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => reject(user.id)}
                                                style={{
                                                    padding: '8px 16px',
                                                    background: `${COLORS.red}22`,
                                                    border: `1px solid ${COLORS.red}44`,
                                                    borderRadius: '6px',
                                                    color: COLORS.red,
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* Users Tab */}
                    {tab === 'users' && (
                        <>
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchUser}
                                onChange={e => setSearchUser(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    background: COLORS.bgLight,
                                    border: `1px solid ${COLORS.border}`,
                                    borderRadius: '10px',
                                    color: COLORS.text,
                                    fontSize: '14px',
                                    marginBottom: '16px',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                            {loading ? (
                                <div style={{ color: COLORS.textMuted, textAlign: 'center', padding: '40px' }}>Loading...</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {filteredUsers.slice(0, 50).map(user => (
                                        <div key={user.id} style={{
                                            background: COLORS.bgLight,
                                            borderRadius: '10px',
                                            padding: '14px 16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            border: `1px solid ${COLORS.border}`
                                        }}>
                                            <div>
                                                <div style={{ color: COLORS.text, fontWeight: '600', fontSize: '14px' }}>
                                                    {user.custom_username || user.discord_username}
                                                    {user.username_approved && (
                                                        <span style={{ color: COLORS.green, marginLeft: '8px', fontSize: '12px' }}>✓</span>
                                                    )}
                                                </div>
                                                <div style={{ color: COLORS.textMuted, fontSize: '12px', marginTop: '2px' }}>
                                                    {user.total_spins} spins - {user.unique_items || 0} items
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedUser(user)}
                                                style={{
                                                    padding: '8px 14px',
                                                    background: COLORS.accent,
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    color: '#fff',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                Edit Collection
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* Special Items / Pool Tab */}
                    {tab === 'special' && (
                        <>
                            {/* Pool Statistics */}
                            <PoolStatistics poolStats={poolStats} />

                            {/* Add New Item Form */}
                            <AddItemForm
                                onAdd={addSpecialItemToPool}
                                poolStats={poolStats}
                                adding={addingItem}
                            />

                            {/* Core Items Section */}
                            {coreItems.length > 0 && (
                                <div style={{ marginBottom: '24px' }}>
                                    <h3 style={{
                                        margin: '0 0 12px 0',
                                        color: COLORS.text,
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        Core Items
                                        <span style={{
                                            fontSize: '12px',
                                            color: COLORS.textMuted,
                                            fontWeight: '400'
                                        }}>
                                            ({coreItems.length})
                                        </span>
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {coreItems.map(item => (
                                            <SpecialItemCard
                                                key={item.id}
                                                item={item}
                                                poolStats={poolStats}
                                                onEditWeight={updateItemWeight}
                                                onDelete={deleteSpecialItem}
                                                isStatic={true}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Custom Items Section */}
                            {customItems.length > 0 && (
                                <div>
                                    <h3 style={{
                                        margin: '0 0 12px 0',
                                        color: COLORS.text,
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        Custom Items
                                        <span style={{
                                            fontSize: '12px',
                                            color: COLORS.textMuted,
                                            fontWeight: '400'
                                        }}>
                                            ({customItems.length})
                                        </span>
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {customItems.map(item => (
                                            <SpecialItemCard
                                                key={item.id}
                                                item={item}
                                                poolStats={poolStats}
                                                onEditWeight={updateItemWeight}
                                                onDelete={deleteSpecialItem}
                                                isStatic={false}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {dynamicItems.length === 0 && !loading && (
                                <div style={{
                                    color: COLORS.textMuted,
                                    textAlign: 'center',
                                    padding: '40px',
                                    background: COLORS.bgLight,
                                    borderRadius: '12px'
                                }}>
                                    No special items in the pool yet
                                </div>
                            )}
                        </>
                    )}

                    {/* Notifications Tab */}
                    {tab === 'notifications' && (
                        <div style={{
                            background: COLORS.bgLight,
                            borderRadius: '12px',
                            border: `1px solid ${COLORS.border}`,
                            overflow: 'hidden'
                        }}>
                            {/* Header */}
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: `1px solid ${COLORS.border}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Bell size={18} color={COLORS.accent} />
                                    <span style={{ color: COLORS.text, fontWeight: '600' }}>Notification Center</span>
                                    <span style={{
                                        fontSize: '12px',
                                        color: COLORS.textMuted,
                                        background: COLORS.bg,
                                        padding: '2px 8px',
                                        borderRadius: '10px'
                                    }}>
                                        {notifications.length} total
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowNotificationForm(!showNotificationForm)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 14px',
                                        background: showNotificationForm ? COLORS.bgLighter : COLORS.accent,
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '500'
                                    }}
                                >
                                    <Plus size={14} />
                                    {showNotificationForm ? 'Cancel' : 'New Notification'}
                                </button>
                            </div>

                            {/* Create Form */}
                            {showNotificationForm && (
                                <form onSubmit={createNotification} style={{
                                    padding: '20px',
                                    borderBottom: `1px solid ${COLORS.border}`,
                                    background: COLORS.bg
                                }}>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '6px' }}>
                                            Title *
                                        </label>
                                        <input
                                            type="text"
                                            value={notificationForm.title}
                                            onChange={e => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder="e.g., New Feature: Lucky Spins!"
                                            maxLength={100}
                                            required
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                background: COLORS.bgLight,
                                                border: `1px solid ${COLORS.border}`,
                                                borderRadius: '6px',
                                                color: COLORS.text,
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '6px' }}>
                                            Content *
                                        </label>
                                        <textarea
                                            value={notificationForm.content}
                                            onChange={e => setNotificationForm(prev => ({ ...prev, content: e.target.value }))}
                                            placeholder="Describe the update, changes, or announcement..."
                                            maxLength={2000}
                                            required
                                            rows={4}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                background: COLORS.bgLight,
                                                border: `1px solid ${COLORS.border}`,
                                                borderRadius: '6px',
                                                color: COLORS.text,
                                                fontSize: '14px',
                                                outline: 'none',
                                                resize: 'vertical',
                                                boxSizing: 'border-box',
                                                fontFamily: 'inherit'
                                            }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '6px' }}>
                                                Type
                                            </label>
                                            <select
                                                value={notificationForm.type}
                                                onChange={e => setNotificationForm(prev => ({ ...prev, type: e.target.value }))}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    background: COLORS.bgLight,
                                                    border: `1px solid ${COLORS.border}`,
                                                    borderRadius: '6px',
                                                    color: COLORS.text,
                                                    fontSize: '14px',
                                                    outline: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value="changelog">📝 Changelog</option>
                                                <option value="announcement">📢 Announcement</option>
                                                <option value="maintenance">🔧 Maintenance</option>
                                            </select>
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '6px' }}>
                                                Priority
                                            </label>
                                            <select
                                                value={notificationForm.priority}
                                                onChange={e => setNotificationForm(prev => ({ ...prev, priority: e.target.value }))}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    background: COLORS.bgLight,
                                                    border: `1px solid ${COLORS.border}`,
                                                    borderRadius: '6px',
                                                    color: COLORS.text,
                                                    fontSize: '14px',
                                                    outline: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value="low">Low</option>
                                                <option value="normal">Normal</option>
                                                <option value="high">High (shows badge)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {notificationError && (
                                        <div style={{
                                            padding: '10px 12px',
                                            background: `${COLORS.red}20`,
                                            border: `1px solid ${COLORS.red}`,
                                            borderRadius: '6px',
                                            color: COLORS.red,
                                            fontSize: '13px',
                                            marginBottom: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <AlertTriangle size={14} />
                                            {notificationError}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={submittingNotification || !notificationForm.title || !notificationForm.content}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: COLORS.accent,
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: '#fff',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            cursor: submittingNotification ? 'wait' : 'pointer',
                                            opacity: submittingNotification || !notificationForm.title || !notificationForm.content ? 0.5 : 1
                                        }}
                                    >
                                        {submittingNotification ? 'Publishing...' : 'Publish Notification'}
                                    </button>
                                </form>
                            )}

                            {/* Notifications List */}
                            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                                {loading ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: COLORS.textMuted }}>
                                        Loading...
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: COLORS.textMuted }}>
                                        <Bell size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                        <div>No notifications yet</div>
                                        <div style={{ fontSize: '12px', marginTop: '4px' }}>
                                            Create one to notify all users
                                        </div>
                                    </div>
                                ) : (
                                    notifications.map(notification => {
                                        const typeColor = getNotificationTypeColor(notification.type);
                                        const priorityColors = { low: COLORS.textMuted, normal: COLORS.accent, high: COLORS.red };

                                        return (
                                            <div
                                                key={notification.id}
                                                style={{
                                                    padding: '14px 20px',
                                                    borderBottom: `1px solid ${COLORS.border}`,
                                                    display: 'flex',
                                                    gap: '12px',
                                                    alignItems: 'flex-start'
                                                }}
                                            >
                                                {/* Type Icon */}
                                                <div style={{
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: '8px',
                                                    background: `${typeColor}20`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: typeColor,
                                                    flexShrink: 0
                                                }}>
                                                    {getNotificationTypeIcon(notification.type)}
                                                </div>

                                                {/* Content */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        marginBottom: '4px'
                                                    }}>
                                                        <span style={{
                                                            color: COLORS.text,
                                                            fontWeight: '600',
                                                            fontSize: '14px'
                                                        }}>
                                                            {notification.title}
                                                        </span>
                                                        <span style={{
                                                            fontSize: '10px',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            background: `${priorityColors[notification.priority]}20`,
                                                            color: priorityColors[notification.priority],
                                                            fontWeight: '600',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {notification.priority}
                                                        </span>
                                                    </div>
                                                    <div style={{
                                                        color: COLORS.textMuted,
                                                        fontSize: '13px',
                                                        lineHeight: '1.4',
                                                        whiteSpace: 'pre-wrap',
                                                        wordBreak: 'break-word'
                                                    }}>
                                                        {notification.content.length > 150
                                                            ? notification.content.substring(0, 150) + '...'
                                                            : notification.content
                                                        }
                                                    </div>
                                                    <div style={{
                                                        fontSize: '11px',
                                                        color: COLORS.textMuted,
                                                        marginTop: '6px'
                                                    }}>
                                                        {formatNotificationDate(notification.created_at)}
                                                    </div>
                                                </div>

                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => deleteNotification(notification.id)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: COLORS.textMuted,
                                                        cursor: 'pointer',
                                                        padding: '6px',
                                                        borderRadius: '4px',
                                                        transition: 'color 0.2s, background 0.2s'
                                                    }}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.color = COLORS.red;
                                                        e.currentTarget.style.background = `${COLORS.red}20`;
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.color = COLORS.textMuted;
                                                        e.currentTarget.style.background = 'transparent';
                                                    }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* User Collection Editor Modal */}
            {selectedUser && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1001,
                    padding: '20px'
                }}>
                    <UserCollectionEditor
                        user={selectedUser}
                        allItems={allItems}
                        onClose={() => setSelectedUser(null)}
                        onAddItem={addItemToUser}
                        onRemoveItem={removeItemFromUser}
                    />
                </div>
            )}
        </div>
    );
}