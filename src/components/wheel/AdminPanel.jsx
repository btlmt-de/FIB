import React, { useState, useEffect } from 'react';
import { COLORS, API_BASE_URL, IMAGE_BASE_URL, TEAM_MEMBERS, RARE_MEMBERS } from '../../config/constants.js';
import { getMinecraftHeadUrl } from '../../utils/helpers.js';

/**
 * Editor modal UI for viewing and modifying a single user's item collection.
 *
 * Renders controls to add regular or special items to the user's collection, or to remove existing items;
 * fetches the user's current collection on mount and shows counts for removal. Uses callbacks to perform add/remove actions.
 *
 * @param {Object} props
 * @param {Object} props.user - Target user (must include `id`, and may include `custom_username` or `discord_username` for display).
 * @param {Array<Object>} props.allItems - List of all regular items available for selection (each item should include at least `texture` and `name`).
 * @param {Function} props.onClose - Called when the editor should be closed.
 * @param {Function} props.onAddItem - Callback invoked to add items: (userId, texture, name, type, count).
 * @param {Function} props.onRemoveItem - Callback invoked to remove items: (userId, texture, count).
 * @returns {JSX.Element} The UserCollectionEditor component UI.
 */
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
        /**
         * Load the current user's item collection from the admin API and store it in component state.
         *
         * Fetches the collection for `user.id`, maps each item's `item_texture` to its `count` and calls
         * `setUserCollection` with that mapping. Ensures `setLoadingCollection(false)` is called after the
         * operation and logs an error to the console if the request fails.
         */
        async function fetchUserCollection() {
            try {
                const res = await fetch(`${API_BASE_URL}/admin/users/${user.id}/collection`, { credentials: 'include' });
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

    /**
     * Add the currently selected item to the specified user's collection.
     *
     * Finds the selected item in `allItems` when `itemType` is `'regular'` or in `specialItems` when `itemType` is `'special'`, and if found calls `onAddItem` with the user's id, the item's texture, name, type, and the requested count. Does nothing when no item is selected or no matching item is found.
     */
    function handleAdd() {
        if (itemType === 'regular' && selectedItem) {
            const item = allItems.find(i => i.texture === selectedItem);
            if (item) onAddItem(user.id, item.texture, item.name, 'regular', count);
        } else if (itemType === 'special' && selectedItem) {
            const item = specialItems.find(i => i.texture === selectedItem);
            if (item) onAddItem(user.id, item.texture, item.name, item.type, count);
        }
    }

    /**
     * Remove the currently selected item from the user's collection.
     *
     * If a selection exists and an `onRemoveItem` callback is provided, invokes
     * `onRemoveItem` with the user's id, the selected item's texture, and the
     * requested count.
     */
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

/**
 * Returns a single-character symbol representing an item's rarity.
 * @param {string} rarity - One of 'mythic', 'legendary', 'event', or 'rare'.
 * @returns {string} The symbol for the rarity (`'◆'`, `'★'`, `'⚡'`, `'●'`) or an empty string if the rarity is unrecognized.
 */
function getRarityIcon(rarity) {
    if (rarity === 'mythic') return '◆';
    if (rarity === 'legendary') return '★';
    if (rarity === 'event') return '⚡';
    if (rarity === 'rare') return '●';
    return '';
}

/**
 * Map an item's rarity key to its display color.
 * @param {string} rarity - Rarity identifier such as `'mythic'`, `'legendary'`, `'event'`, or `'rare'`.
 * @returns {string} The color value from `COLORS` corresponding to the given rarity; returns `COLORS.gold` if the rarity is unrecognized.
 */
function getRarityColor(rarity) {
    if (rarity === 'mythic') return COLORS.aqua;
    if (rarity === 'legendary') return COLORS.purple;
    if (rarity === 'event') return COLORS.orange;
    if (rarity === 'rare') return COLORS.red;
    return COLORS.gold;
}

/**
 * Format a numeric weight into a compact, human-readable string.
 *
 * Scales values >= 1,000,000 to millions with an 'M' suffix and one decimal,
 * values >= 1,000 to thousands with a 'K' suffix and one decimal, and returns
 * smaller values as a plain string.
 *
 * @param {number} weight - The numeric weight to format.
 * @returns {string} The formatted weight string (e.g., "1.2M", "3.4K", or "123").
 */
function formatWeight(weight) {
    if (weight >= 1000000) return (weight / 1000000).toFixed(1) + 'M';
    if (weight >= 1000) return (weight / 1000).toFixed(1) + 'K';
    return weight.toString();
}

/**
 * Format a numeric percentage into a compact string using variable decimal precision and trimmed trailing zeros.
 * @param {number} percentage - Percentage value (e.g., 12.345) to format.
 * @returns {string} Formatted percentage string with a '%' suffix, using between 0 and 6 decimal places as needed.
 */
function formatPercentage(percentage) {
    if (percentage >= 1) return percentage.toFixed(1).replace(/\.?0+$/, '') + '%';
    if (percentage >= 0.1) return percentage.toFixed(2).replace(/\.?0+$/, '') + '%';
    if (percentage >= 0.01) return percentage.toFixed(3).replace(/\.?0+$/, '') + '%';
    if (percentage >= 0.001) return percentage.toFixed(4).replace(/\.?0+$/, '') + '%';
    if (percentage >= 0.0001) return percentage.toFixed(5).replace(/\.?0+$/, '') + '%';
    return percentage.toFixed(6).replace(/\.?0+$/, '') + '%';
}

/**
 * Renders a visual summary of the wheel pool and an editor for the regular-items weight.
 *
 * Displays a two-segment weight bar (regular vs special), total weight and special item count,
 * and an inline editor to change the regular items' weight. If `poolStats` is falsy, renders nothing.
 *
 * @param {{ totalWeight: number, specialItemsCount?: number }} poolStats - Pool statistics; must include `totalWeight`.
 * @param {number} regularItemsWeight - Current weight allocated to regular items.
 * @param {(newWeight: number) => void} onEditRegularWeight - Callback invoked with the new regular-items weight when saved.
 * @returns {JSX.Element|null} A JSX element showing pool statistics and the regular weight editor, or `null` when `poolStats` is not provided.
 */
function PoolStatistics({ poolStats, regularItemsWeight, onEditRegularWeight }) {
    const [editing, setEditing] = useState(false);
    const [newWeight, setNewWeight] = useState(regularItemsWeight.toString());

    useEffect(() => {
        setNewWeight(regularItemsWeight.toString());
    }, [regularItemsWeight]);

    if (!poolStats) return null;

    const regularPercentage = (regularItemsWeight / poolStats.totalWeight) * 100;
    const specialPercentage = 100 - regularPercentage;

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
                    <span style={{ color: COLORS.gold }}>● Regular Items</span>
                    <span style={{ color: COLORS.purple }}>● Special Items</span>
                </div>
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div style={{ background: COLORS.bg, borderRadius: '8px', padding: '12px' }}>
                    <div style={{ color: COLORS.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Weight</div>
                    <div style={{ color: COLORS.text, fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>
                        {formatWeight(poolStats.totalWeight)}
                    </div>
                </div>
                <div style={{ background: COLORS.bg, borderRadius: '8px', padding: '12px' }}>
                    <div style={{ color: COLORS.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Special Items</div>
                    <div style={{ color: COLORS.text, fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>
                        {poolStats.specialItemsCount || 0}
                    </div>
                </div>
            </div>

            {/* Regular items weight editor */}
            <div style={{
                marginTop: '16px',
                padding: '16px',
                background: COLORS.bg,
                borderRadius: '8px',
                border: `1px solid ${COLORS.gold}33`
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div>
                        <div style={{ color: COLORS.gold, fontSize: '13px', fontWeight: '600' }}>Regular Items Weight</div>
                        <div style={{ color: COLORS.textMuted, fontSize: '11px', marginTop: '2px' }}>
                            Controls the probability of landing on regular items
                        </div>
                    </div>
                </div>

                {editing ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
                        <input
                            type="number"
                            value={newWeight}
                            onChange={e => setNewWeight(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '10px 12px',
                                background: COLORS.bgLight,
                                border: `1px solid ${COLORS.accent}`,
                                borderRadius: '6px',
                                color: COLORS.text,
                                fontSize: '14px',
                                fontFamily: 'monospace'
                            }}
                            autoFocus
                        />
                        <button
                            onClick={() => { onEditRegularWeight(parseInt(newWeight)); setEditing(false); }}
                            style={{ padding: '10px 16px', background: COLORS.green, border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                        >
                            Save
                        </button>
                        <button
                            onClick={() => { setNewWeight(regularItemsWeight.toString()); setEditing(false); }}
                            style={{ padding: '10px 16px', background: COLORS.bgLight, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.textMuted, cursor: 'pointer', fontSize: '13px' }}
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                        <div style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            color: COLORS.gold,
                            fontFamily: 'monospace'
                        }}>
                            {regularItemsWeight.toLocaleString()}
                        </div>
                        <button
                            onClick={() => setEditing(true)}
                            style={{
                                padding: '8px 16px',
                                background: `${COLORS.gold}22`,
                                border: `1px solid ${COLORS.gold}44`,
                                borderRadius: '6px',
                                color: COLORS.gold,
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '500'
                            }}
                        >
                            Edit Weight
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Render a card for a special pool item showing image, rarity, weight, and chance with inline editing controls.
 *
 * Displays the item's image (with fallbacks), rarity styling, current weight and calculated or custom display chance.
 * When editing, allows changing weight and an optional displayed percentage; saving calls `onEditWeight`.
 *
 * @param {Object} props
 * @param {Object} props.item - The special item record; expected fields: `id`, `name`, `weight`, `display_chance` (decimal), `image_url`, `username`, `texture`, and `rarity`.
 * @param {Object} props.poolStats - Pool statistics object containing `totalWeight` used to compute percentage share.
 * @param {(itemId: number|string, newWeight: number, displayChance: number|null) => void} props.onEditWeight - Called when edits are saved; `displayChance` is a decimal (e.g., 0.01) or `null` if unset.
 * @param {(itemId: number|string) => void} props.onDelete - Called to delete the item; disabled when `isStatic` is true.
 * @param {boolean} props.isStatic - When true, marks the item as core/static and disables deletion.
 * @returns {JSX.Element} The special item card element.
 */
function SpecialItemCard({ item, poolStats, onEditWeight, onDelete, isStatic }) {
    const [editing, setEditing] = useState(false);
    const [newWeight, setNewWeight] = useState(item.weight?.toString() || '0');
    const [newDisplayChance, setNewDisplayChance] = useState(
        item.display_chance ? (item.display_chance * 100).toString() : ''
    );

    const percentage = poolStats && poolStats.totalWeight > 0
        ? (item.weight / poolStats.totalWeight) * 100
        : 0;

    // Use display_chance if set, otherwise use calculated percentage
    const displayPercentage = item.display_chance
        ? item.display_chance * 100
        : percentage;

    const rarityColor = getRarityColor(item.rarity);
    const rarityIcon = getRarityIcon(item.rarity);

    const handleSave = () => {
        const displayChanceValue = newDisplayChance.trim() === ''
            ? null
            : parseFloat(newDisplayChance) / 100; // Convert % to decimal
        onEditWeight(item.id, parseInt(newWeight), displayChanceValue);
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
                                <div>
                                    <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '10px', marginBottom: '2px' }}>Display % (optional)</label>
                                    <input
                                        type="text"
                                        value={newDisplayChance}
                                        onChange={e => setNewDisplayChance(e.target.value)}
                                        placeholder="e.g. 0.001"
                                        style={{
                                            width: '100px',
                                            padding: '6px 10px',
                                            background: COLORS.bg,
                                            border: `1px solid ${COLORS.border}`,
                                            borderRadius: '4px',
                                            color: COLORS.text,
                                            fontSize: '13px',
                                            fontFamily: 'monospace'
                                        }}
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
                                        setNewDisplayChance(item.display_chance ? (item.display_chance * 100).toString() : '');
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
                                    {formatPercentage(displayPercentage)}
                                </span>
                                {item.display_chance && (
                                    <span style={{
                                        marginLeft: '4px',
                                        fontSize: '10px',
                                        color: COLORS.textMuted,
                                        background: COLORS.bgLighter,
                                        padding: '1px 4px',
                                        borderRadius: '3px'
                                    }}>
                                        custom
                                    </span>
                                )}
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

/**
 * Render a form for creating and previewing a new special item to add into the wheel pool.
 *
 * The form collects type (player head or custom item), display name, source data (Minecraft username or texture/image URL),
 * rarity, weight, and an optional display percentage. It shows a calculated preview of the item's chance based on the
 * current pool statistics and calls `onAdd` with the assembled item data when submitted. The form resets after a successful submit.
 *
 * @param {Object} props
 * @param {(itemData: {type: 'playerhead'|'item', name: string, username: string, texture: string, imageUrl: string, weight: string|number, rarity: string, displayChance: string|number|null}) => void} props.onAdd - Callback invoked with the item payload when the form is submitted.
 * @param {{ totalWeight: number }} props.poolStats - Current pool statistics used to calculate the preview chance; only `totalWeight` is read.
 * @param {boolean} props.adding - When true, disables the submit button and shows an adding state.
 * @returns {JSX.Element} The AddItemForm component UI.
 */
function AddItemForm({ onAdd, poolStats, adding }) {
    const [itemData, setItemData] = useState({
        type: 'playerhead',
        name: '',
        username: '',
        texture: '',
        imageUrl: '',
        weight: '5000',
        rarity: 'rare',
        displayChance: ''
    });

    const previewPercentage = poolStats && poolStats.totalWeight > 0
        ? (parseInt(itemData.weight || 0) / (poolStats.totalWeight + parseInt(itemData.weight || 0))) * 100
        : 0;

    // Show display chance if set, otherwise show calculated
    const shownPercentage = itemData.displayChance
        ? parseFloat(itemData.displayChance)
        : previewPercentage;

    const handleSubmit = () => {
        onAdd(itemData);
        setItemData({
            type: 'playerhead',
            name: '',
            username: '',
            texture: '',
            imageUrl: '',
            weight: '5000',
            rarity: 'rare',
            displayChance: ''
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
                        <option value="rare">● Rare</option>
                        <option value="legendary">★ Legendary</option>
                        <option value="mythic">◆ Mythic</option>
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
                <div>
                    <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '6px' }}>
                        Display % (optional)
                    </label>
                    <input
                        type="text"
                        value={itemData.displayChance}
                        onChange={e => setItemData({ ...itemData, displayChance: e.target.value })}
                        placeholder="e.g. 0.001"
                        style={{ width: '100%', padding: '10px 12px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, fontSize: '14px', boxSizing: 'border-box', fontFamily: 'monospace' }}
                    />
                </div>

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
                            <span style={{ color: COLORS.textMuted, fontSize: '12px' }}>Calculated: </span>
                            <span style={{ color: COLORS.textMuted, fontSize: '12px', fontFamily: 'monospace' }}>
                                {formatPercentage(previewPercentage)}
                            </span>
                        </div>
                        <div>
                            <span style={{ color: COLORS.textMuted, fontSize: '12px' }}>Shown to users: </span>
                            <span style={{ color: COLORS.green, fontSize: '12px', fontWeight: '600' }}>
                                {formatPercentage(shownPercentage)}
                            </span>
                        </div>
                    </div>
                    <div style={{ color: COLORS.textMuted, fontSize: '11px', marginTop: '6px' }}>
                        Higher weight = more common. Set "Display %" to show a custom chance to users.
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

/**
 * Render the administrative panel for managing pending approvals, users, and the special item pool.
 *
 * Displays three tabs—Pending, Users, and Item Pool—and coordinates fetching data, performing
 * admin actions (approve/reject users, edit user collections, add/remove special items, and update weights),
 * and presenting global messages and modals for editing user collections.
 *
 * @param {Function} onClose - Callback invoked when the panel should be closed.
 * @param {Array<object>} allItems - Array of available regular items used when editing a user's collection.
 * @returns {JSX.Element} The Admin Panel React element.
 */
export function AdminPanel({ onClose, allItems }) {
    const [tab, setTab] = useState('pending');
    const [pending, setPending] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchUser, setSearchUser] = useState('');
    const [dynamicItems, setDynamicItems] = useState([]);
    const [poolStats, setPoolStats] = useState(null);
    const [regularItemsWeight, setRegularItemsWeight] = useState(10000000);
    const [addingItem, setAddingItem] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        if (tab === 'pending') fetchPending();
        if (tab === 'users') fetchUsers();
        if (tab === 'special') {
            fetchSpecialItems();
            fetchPoolStats();
        }
    }, [tab]);

    /**
     * Fetches the list of pending user approvals from the admin endpoint and updates component state.
     *
     * While the request is in progress the component loading state is set to true; on success the pending list
     * state is replaced with the fetched items. On failure the error is logged and the existing pending state is preserved.
     */
    async function fetchPending() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/pending`, { credentials: 'include' });
            const data = await res.json();
            setPending(data.pending || []);
        } catch (error) { console.error('Failed to fetch pending:', error); }
        finally { setLoading(false); }
    }

    /**
     * Fetches the admin users list from the server and updates component state.
     *
     * Sets the loading flag while the request is in progress, updates the users state
     * with `data.users` (or an empty array if missing), and logs an error to the console on failure.
     */
    async function fetchUsers() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users`, { credentials: 'include' });
            const data = await res.json();
            setUsers(data.users || []);
        } catch (error) { console.error('Failed to fetch users:', error); }
        finally { setLoading(false); }
    }

    /**
     * Fetches the list of special pool items from the admin API and updates local state.
     *
     * Calls the admin/special-items endpoint, sets the component loading flag while the request is in progress,
     * updates dynamic items state with the fetched `items` array (or an empty array if absent), and logs errors to the console if the request fails.
     */
    async function fetchSpecialItems() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/special-items`, { credentials: 'include' });
            const data = await res.json();
            setDynamicItems(data.items || []);
        } catch (error) { console.error('Failed to fetch special items:', error); }
        finally { setLoading(false); }
    }

    /**
     * Retrieve pool statistics from the admin API and update local pool state.
     *
     * On success, updates component state by calling `setPoolStats` with the response
     * and `setRegularItemsWeight` with `data.regularItemsWeight` or a fallback of 10000000.
     * Errors are logged to the console.
     */
    async function fetchPoolStats() {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/pool-stats`, { credentials: 'include' });
            const data = await res.json();
            setPoolStats(data);
            setRegularItemsWeight(data.regularItemsWeight || 10000000);
        } catch (error) { console.error('Failed to fetch pool stats:', error); }
    }

    /**
     * Approves a pending user and removes them from the local pending list.
     *
     * Sends an approval request for the specified user to the admin API and, when successful,
     * removes that user from the component's pending state.
     *
     * @param {string|number} userId - The ID of the user to approve.
     */
    async function approve(userId) {
        await fetch(`${API_BASE_URL}/admin/approve/${userId}`, { method: 'POST', credentials: 'include' });
        setPending(prev => prev.filter(p => p.id !== userId));
    }

    /**
     * Prompt for a rejection reason, send it to the admin reject endpoint for the specified user, and remove that user from the local pending list on success.
     *
     * Prompts the administrator for a rejection reason; if provided, POSTs `{ reason }` to `${API_BASE_URL}/admin/reject/:userId` (with credentials) and updates the pending state to remove the rejected user.
     * @param {string|number} userId - The identifier of the user to reject; used in the API path and to remove the user from the pending list.
     */
    async function reject(userId) {
        const reason = prompt('Rejection reason:');
        if (reason === null) return;
        await fetch(`${API_BASE_URL}/admin/reject/${userId}`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });
        setPending(prev => prev.filter(p => p.id !== userId));
    }

    /**
     * Add an item to a user's collection via the admin API.
     *
     * Sends a POST to the admin users collection endpoint and updates UI state based on the response:
     * on success shows a success message and clears the selected user; on failure shows an error message.
     *
     * @param {string|number} userId - ID of the target user.
     * @param {string} texture - Texture identifier for the item (texture ID or resource string).
     * @param {string} name - Display name of the item.
     * @param {'regular'|'special'} type - Item type, e.g., 'regular' or 'special'.
     * @param {number} [count=1] - Quantity of the item to add.
     */
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

    /**
     * Remove a quantity of an item texture from a user's collection via the admin API.
     *
     * Calls the server to delete `count` instances of the specified `texture` from the user identified by `userId`.
     * On success, clears the currently selected user and displays a success message; on failure, displays an error message.
     *
     * @param {string|number} userId - ID of the user whose collection will be modified.
     * @param {string} texture - Texture identifier of the item to remove.
     * @param {number} [count=1] - Quantity to remove; defaults to 1.
     */
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

    /**
     * Add a new special item to the server-side pool and refresh local pool data.
     *
     * Sends a POST to the admin special-items endpoint with `itemData` (converting `weight` to an integer
     * and `displayChance` from a percentage string to a decimal or `null`), updates UI state flags and
     * messages, and triggers a refresh of special items and pool statistics on success.
     *
     * @param {Object} itemData - Payload describing the special item to add.
     * @param {string|number} itemData.weight - Item weight (string or number); will be parsed to an integer.
     * @param {string} [itemData.displayChance] - Display chance as a percentage string (e.g., "12.5"); empty or missing means no custom display chance.
     * @param {string} itemData.name - Display name for the item.
     * @param {('playerhead'|'item')} [itemData.type] - Item type; e.g., 'playerhead' for Minecraft heads or 'item' for custom items.
     * @param {string} [itemData.username] - Minecraft username (for player heads).
     * @param {string} [itemData.texture] - Texture ID (for custom items).
     * @param {string} [itemData.imageUrl] - URL to a custom image.
     * @param {('rare'|'legendary'|'mythic'|'event')} [itemData.rarity] - Rarity classification for the item.
     */
    async function addSpecialItemToPool(itemData) {
        setAddingItem(true);
        setMessage({ text: '', type: '' });
        try {
            const weightValue = parseInt(itemData.weight, 10);
            const payload = {
                ...itemData,
                weight: weightValue,
                // Convert displayChance from percentage string to decimal, or null if empty
                displayChance: itemData.displayChance && itemData.displayChance.trim() !== ''
                    ? parseFloat(itemData.displayChance) / 100
                    : null
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

    /**
     * Prompt for confirmation and remove a special item from the server-side pool.
     *
     * If the user confirms, sends a DELETE request for the given item ID, refreshes the special items list and pool statistics, and sets a success or error message for the UI.
     *
     * @param {string|number} itemId - Identifier of the special item to delete.
     */
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

    /**
     * Update a special pool item's weight and optional display chance on the server and refresh local pool data.
     * @param {string|number} itemId - The ID of the special item to update.
     * @param {number} newWeight - The new integer weight for the item.
     * @param {number|null|undefined} displayChance - Optional display chance as a decimal (e.g., 0.25). Pass `null` to clear the stored display chance; omit/`undefined` to leave it unchanged.
     */
    async function updateItemWeight(itemId, newWeight, displayChance) {
        try {
            const body = { weight: newWeight };
            if (displayChance !== undefined) {
                body.displayChance = displayChance;
            }

            const res = await fetch(`${API_BASE_URL}/admin/special-items/${itemId}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (res.ok) {
                const msg = displayChance !== null && displayChance !== undefined
                    ? `Updated weight to ${newWeight.toLocaleString()} with display ${(displayChance * 100)}%`
                    : `Updated weight to ${newWeight.toLocaleString()}`;
                setMessage({ text: msg, type: 'success' });
                fetchSpecialItems();
                fetchPoolStats();
            } else {
                setMessage({ text: 'Failed: ' + data.error, type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Failed to update weight', type: 'error' });
        }
    }

    /**
     * Update the configured weight for regular (non-special) items on the server and refresh local pool statistics.
     *
     * Attempts to persist `newWeight` to the backend settings. On success, updates local regular-items weight state, displays a success message, and refreshes pool statistics. On failure, sets an error message.
     *
     * @param {number} newWeight - The new weight value to apply for regular items.
     */
    async function updateRegularItemsWeight(newWeight) {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/settings`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ regular_items_weight: newWeight })
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ text: `Updated regular items weight to ${newWeight.toLocaleString()}`, type: 'success' });
                setRegularItemsWeight(newWeight);
                fetchPoolStats();
            } else {
                setMessage({ text: 'Failed: ' + data.error, type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Failed to update regular items weight', type: 'error' });
        }
    }

    const filteredUsers = users.filter(u =>
        (u.custom_username?.toLowerCase() || '').includes(searchUser.toLowerCase()) ||
        (u.discord_username?.toLowerCase() || '').includes(searchUser.toLowerCase())
    );

    const tabs = [
        { id: 'pending', label: 'Pending', count: pending.length },
        { id: 'users', label: 'Users' },
        { id: 'special', label: 'Item Pool' }
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
                            <PoolStatistics
                                poolStats={poolStats}
                                regularItemsWeight={regularItemsWeight}
                                onEditRegularWeight={updateRegularItemsWeight}
                            />

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