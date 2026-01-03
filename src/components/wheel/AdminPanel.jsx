import React, { useState, useEffect } from 'react';
import { COLORS, API_BASE_URL, IMAGE_BASE_URL, TEAM_MEMBERS, RARE_MEMBERS } from './constants';
import { formatChance, getMinecraftHeadUrl } from './helpers';

// User Collection Editor Sub-component
function UserCollectionEditor({ user, allItems, onClose, onAddItem, onRemoveItem }) {
    const [mode, setMode] = useState('add'); // 'add' or 'remove'
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

    // Fetch user's collection when modal opens
    useEffect(() => {
        async function fetchUserCollection() {
            try {
                const res = await fetch(`${API_BASE_URL}/admin/users/${user.id}/collection`, { credentials: 'include' });
                const data = await res.json();
                // Convert array to object: { texture: count }
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

    // Get items the user has in their collection (for remove mode)
    const collectedItems = Object.entries(userCollection)
        .filter(([_, count]) => count > 0)
        .map(([texture, count]) => {
            // Find the item details
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

            {/* Mode Toggle */}
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
                    }}>Ã¢Ë†â€™ Remove Items</button>
                </div>
            </div>

            {mode === 'add' && (
                <>
                    {/* Item Type Selection */}
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
                                {specialItems.map(item => <option key={item.texture} value={item.texture}>{item.type === 'mythic' ? 'Ã¢Å“Â¦' : item.type === 'legendary' ? 'Ã¢Ëœâ€¦' : 'Ã¢â€”â€ '} {item.name}</option>)}
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
                                            {item.type === 'mythic' ? 'Ã¢Å“Â¦ ' : item.type === 'legendary' ? 'Ã¢Ëœâ€¦ ' : item.type === 'rare' ? 'Ã¢â€”â€  ' : ''}{item.name} (Ãƒâ€”{item.count})
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

// Main Admin Panel Component
export function AdminPanel({ onClose, allItems }) {
    const [tab, setTab] = useState('pending');
    const [pending, setPending] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchUser, setSearchUser] = useState('');
    const [dynamicItems, setDynamicItems] = useState([]);
    const [editingItem, setEditingItem] = useState(null); // { id, weight }
    const [poolStats, setPoolStats] = useState(null);
    const [regularItemsWeight, setRegularItemsWeight] = useState(10000000);
    const [editingRegularWeight, setEditingRegularWeight] = useState(false);
    const [newSpecialItem, setNewSpecialItem] = useState({
        type: 'playerhead',
        name: '',
        username: '',
        texture: '',
        imageUrl: '',
        weight: '5000',
        rarity: 'rare'
    });
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

    async function fetchPending() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/pending`, { credentials: 'include' });
            const data = await res.json();
            setPending(data.pending || []);
        } catch (error) { console.error('Failed to fetch pending:', error); }
        finally { setLoading(false); }
    }

    async function fetchUsers() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users`, { credentials: 'include' });
            const data = await res.json();
            setUsers(data.users || []);
        } catch (error) { console.error('Failed to fetch users:', error); }
        finally { setLoading(false); }
    }

    async function fetchSpecialItems() {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/special-items`, { credentials: 'include' });
            const data = await res.json();
            setDynamicItems(data.items || []);
        } catch (error) { console.error('Failed to fetch special items:', error); }
        finally { setLoading(false); }
    }

    async function fetchPoolStats() {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/pool-stats`, { credentials: 'include' });
            const data = await res.json();
            setPoolStats(data);
            setRegularItemsWeight(data.regularItemsWeight || 10000000);
        } catch (error) { console.error('Failed to fetch pool stats:', error); }
    }

    async function approve(userId) {
        await fetch(`${API_BASE_URL}/admin/approve/${userId}`, { method: 'POST', credentials: 'include' });
        setPending(prev => prev.filter(p => p.id !== userId));
    }

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

    async function addSpecialItemToPool() {
        setAddingItem(true);
        setMessage({ text: '', type: '' });
        try {
            const weightValue = parseInt(newSpecialItem.weight, 10);
            const payload = { ...newSpecialItem, weight: weightValue };

            const res = await fetch(`${API_BASE_URL}/admin/special-items`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ text: `Added "${data.item.name}" to the pool!`, type: 'success' });
                setNewSpecialItem({ type: 'playerhead', name: '', username: '', texture: '', imageUrl: '', weight: '5000', rarity: 'rare' });
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
        } catch (error) {
            console.error('Failed to delete item:', error);
        }
    }

    async function updateItemWeight(itemId, newWeight) {
        try {
            const weightValue = parseInt(newWeight, 10);
            const res = await fetch(`${API_BASE_URL}/admin/special-items/${itemId}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weight: weightValue })
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ text: `Updated weight to ${newWeight}`, type: 'success' });
                setEditingItem(null);
                fetchSpecialItems();
                fetchPoolStats();
            } else {
                setMessage({ text: 'Failed: ' + data.error, type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Failed to update item', type: 'error' });
        }
    }

    async function updateRegularItemsWeight(newWeight) {
        try {
            const weightValue = parseInt(newWeight, 10);
            const res = await fetch(`${API_BASE_URL}/admin/settings`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ regular_items_weight: weightValue })
            });
            const data = await res.json();
            if (res.ok) {
                setMessage({ text: `Updated regular items weight to ${weightValue.toLocaleString()}`, type: 'success' });
                setEditingRegularWeight(false);
                fetchPoolStats();
            } else {
                setMessage({ text: 'Failed: ' + data.error, type: 'error' });
            }
        } catch (error) {
            setMessage({ text: 'Failed to update regular items weight', type: 'error' });
        }
    }

    // Calculate percentage preview for new item
    function calculateNewItemPercentage(weight) {
        if (!poolStats) return '?';
        const newTotalWeight = poolStats.totalWeight + parseInt(weight || 0, 10);
        if (newTotalWeight === 0) return '0';
        return ((parseInt(weight || 0, 10) / newTotalWeight) * 100).toFixed(6);
    }

    // Calculate percentage for an item based on current pool
    function calculateItemPercentage(weight) {
        if (!poolStats || poolStats.totalWeight === 0) return '0';
        return ((weight / poolStats.totalWeight) * 100).toFixed(6);
    }

    const filteredUsers = users.filter(u =>
        (u.custom_username?.toLowerCase() || '').includes(searchUser.toLowerCase()) ||
        (u.discord_username?.toLowerCase() || '').includes(searchUser.toLowerCase())
    );

    const tabs = [
        { id: 'pending', label: 'Pending Approvals', count: pending.length },
        { id: 'users', label: 'User Management' },
        { id: 'special', label: 'Special Items' }
    ];

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div style={{ background: COLORS.bg, borderRadius: '16px', border: `1px solid ${COLORS.border}`, width: '100%', maxWidth: '750px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ margin: 0, color: COLORS.text, fontWeight: '600' }}>Ã¢Å¡â„¢Ã¯Â¸Â Admin Panel</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: COLORS.textMuted, fontSize: '24px', cursor: 'pointer' }}>Ãƒâ€”</button>
                </div>

                <div style={{ padding: '12px 24px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            padding: '8px 16px', background: tab === t.id ? COLORS.bgLighter : 'transparent',
                            border: `1px solid ${tab === t.id ? COLORS.accent : COLORS.border}`,
                            borderRadius: '6px', color: tab === t.id ? COLORS.accent : COLORS.textMuted,
                            fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                        }}>
                            {t.label}
                            {t.count > 0 && <span style={{ background: COLORS.red, color: '#fff', padding: '1px 6px', borderRadius: '10px', fontSize: '11px' }}>{t.count}</span>}
                        </button>
                    ))}
                </div>

                {message.text && (
                    <div style={{
                        margin: '12px 24px 0',
                        padding: '10px 14px',
                        background: message.type === 'success' ? `${COLORS.green}22` : `${COLORS.red}22`,
                        border: `1px solid ${message.type === 'success' ? COLORS.green : COLORS.red}`,
                        borderRadius: '6px',
                        color: message.type === 'success' ? COLORS.green : COLORS.red,
                        fontSize: '13px'
                    }}>{message.text}</div>
                )}

                <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
                    {tab === 'pending' && (
                        loading ? <div style={{ color: COLORS.textMuted }}>Loading...</div> :
                            pending.length === 0 ? <div style={{ textAlign: 'center', padding: '32px', color: COLORS.textMuted }}>No pending approvals</div> :
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {pending.map(user => (
                                        <div key={user.id} style={{ background: COLORS.bgLight, borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div>
                                                <div style={{ color: COLORS.gold, fontWeight: '600' }}>{user.custom_username}</div>
                                                <div style={{ color: COLORS.textMuted, fontSize: '12px' }}>Discord: {user.discord_username}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => approve(user.id)} style={{ padding: '6px 12px', background: COLORS.green, border: 'none', borderRadius: '6px', color: COLORS.bg, cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Ã¢Å“â€œ Approve</button>
                                                <button onClick={() => reject(user.id)} style={{ padding: '6px 12px', background: COLORS.red, border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>Ã¢Å“â€” Reject</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                    )}

                    {tab === 'users' && (
                        <>
                            <input type="text" placeholder="Search users..." value={searchUser} onChange={e => setSearchUser(e.target.value)}
                                   style={{ width: '100%', padding: '10px 14px', background: COLORS.bgLight, border: `1px solid ${COLORS.border}`, borderRadius: '8px', color: COLORS.text, fontSize: '14px', marginBottom: '16px', outline: 'none', boxSizing: 'border-box' }}
                            />
                            {loading ? <div style={{ color: COLORS.textMuted }}>Loading...</div> :
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {filteredUsers.slice(0, 50).map(user => (
                                        <div key={user.id} style={{ background: COLORS.bgLight, borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div>
                                                <div style={{ color: COLORS.text, fontWeight: '600' }}>{user.custom_username || user.discord_username}{user.username_approved && <span style={{ color: COLORS.green, marginLeft: '8px', fontSize: '11px' }}>Ã¢Å“â€œ</span>}</div>
                                                <div style={{ color: COLORS.textMuted, fontSize: '12px' }}>{user.total_spins} spins Ã¢â‚¬Â¢ {user.unique_items || 0} items</div>
                                            </div>
                                            <button onClick={() => setSelectedUser(user)} style={{ padding: '6px 12px', background: COLORS.accent, border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>Edit Collection</button>
                                        </div>
                                    ))}
                                </div>
                            }
                        </>
                    )}

                    {tab === 'special' && (
                        <>
                            <h3 style={{ margin: '0 0 16px 0', color: COLORS.text, fontSize: '14px' }}>Add Special Item to Wheel Pool</h3>
                            <div style={{ background: COLORS.bgLight, borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '4px' }}>Item Type</label>
                                    <select value={newSpecialItem.type} onChange={e => setNewSpecialItem({ ...newSpecialItem, type: e.target.value })}
                                            style={{ width: '100%', padding: '8px 12px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, fontSize: '14px' }}>
                                        <option value="playerhead">Player Head</option>
                                        <option value="item">Custom Item</option>
                                    </select>
                                </div>
                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '4px' }}>Display Name *</label>
                                    <input type="text" value={newSpecialItem.name} onChange={e => setNewSpecialItem({ ...newSpecialItem, name: e.target.value })} placeholder="e.g. NewPlayer123"
                                           style={{ width: '100%', padding: '8px 12px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, fontSize: '14px', boxSizing: 'border-box' }}
                                    />
                                </div>
                                {newSpecialItem.type === 'playerhead' && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '4px' }}>Minecraft Username *</label>
                                        <input type="text" value={newSpecialItem.username} onChange={e => setNewSpecialItem({ ...newSpecialItem, username: e.target.value })} placeholder="e.g. Notch"
                                               style={{ width: '100%', padding: '8px 12px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, fontSize: '14px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                )}
                                {newSpecialItem.type === 'item' && (
                                    <>
                                        <div style={{ marginBottom: '12px' }}>
                                            <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '4px' }}>Texture ID</label>
                                            <input type="text" value={newSpecialItem.texture} onChange={e => setNewSpecialItem({ ...newSpecialItem, texture: e.target.value })} placeholder="e.g. diamond_sword (optional if URL provided)"
                                                   style={{ width: '100%', padding: '8px 12px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div style={{ marginBottom: '12px' }}>
                                            <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '4px' }}>Custom Image URL</label>
                                            <input type="text" value={newSpecialItem.imageUrl} onChange={e => setNewSpecialItem({ ...newSpecialItem, imageUrl: e.target.value })} placeholder="https://example.com/texture.png"
                                                   style={{ width: '100%', padding: '8px 12px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, fontSize: '14px', boxSizing: 'border-box' }}
                                            />
                                            <p style={{ margin: '4px 0 0', fontSize: '11px', color: COLORS.textMuted }}>Provide a direct URL to the item's texture image</p>
                                        </div>
                                    </>
                                )}
                                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '4px' }}>Rarity</label>
                                        <select value={newSpecialItem.rarity} onChange={e => setNewSpecialItem({ ...newSpecialItem, rarity: e.target.value })}
                                                style={{ width: '100%', padding: '8px 12px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, fontSize: '14px' }}>
                                            <option value="rare">Ã¢â€”â€  Rare</option>
                                            <option value="legendary">Ã¢Ëœâ€¦ Legendary</option>
                                            <option value="mythic">Ã¢Å“Â¦ Mythic</option>
                                        </select>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', color: COLORS.textMuted, fontSize: '12px', marginBottom: '4px' }}>Drop Chance (%)</label>
                                        <input type="text" value={newSpecialItem.chance} onChange={e => setNewSpecialItem({ ...newSpecialItem, chance: e.target.value })} placeholder="0.05"
                                               style={{ width: '100%', padding: '8px 12px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.text, fontSize: '14px', boxSizing: 'border-box' }}
                                        />
                                        <div style={{ color: COLORS.textMuted, fontSize: '10px', marginTop: '2px' }}>e.g. 0.05 = 0.05%</div>
                                    </div>
                                </div>
                                <button onClick={addSpecialItemToPool} disabled={addingItem || !newSpecialItem.name || (newSpecialItem.type === 'playerhead' && !newSpecialItem.username) || (newSpecialItem.type === 'item' && !newSpecialItem.texture && !newSpecialItem.imageUrl)}
                                        style={{ width: '100%', padding: '12px', background: COLORS.accent, border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: addingItem ? 'wait' : 'pointer', opacity: addingItem || !newSpecialItem.name ? 0.5 : 1 }}>
                                    {addingItem ? 'Adding...' : 'Add to Wheel Pool'}
                                </button>
                            </div>

                            {/* List of all special items - separated by static/dynamic */}
                            {dynamicItems.length > 0 && (
                                <>
                                    {/* Core/Static Items */}
                                    {dynamicItems.filter(i => i.is_static).length > 0 && (
                                        <div style={{ marginBottom: '20px' }}>
                                            <h3 style={{ margin: '0 0 12px 0', color: COLORS.text, fontSize: '14px' }}>
                                                Core Items ({dynamicItems.filter(i => i.is_static).length})
                                                <span style={{ fontWeight: '400', color: COLORS.textMuted, fontSize: '11px', marginLeft: '8px' }}>Cannot be deleted</span>
                                            </h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {dynamicItems.filter(i => i.is_static).map(item => (
                                                    <div key={item.id} style={{ background: COLORS.bgLight, borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${COLORS.border}` }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <img
                                                                src={item.image_url || (item.username ? getMinecraftHeadUrl(item.username) : `${IMAGE_BASE_URL}/${item.texture?.replace(/^(special_|rare_|mythic_)/, '')}.png`)}
                                                                style={{ width: '32px', height: '32px', imageRendering: item.username ? 'auto' : 'pixelated', borderRadius: item.username ? '4px' : '0' }}
                                                                onError={(e) => { e.target.onerror = null; e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }}
                                                            />
                                                            <div>
                                                                <div style={{ color: item.rarity === 'mythic' ? COLORS.aqua : item.rarity === 'legendary' ? COLORS.purple : item.rarity === 'event' ? COLORS.orange : COLORS.red, fontWeight: '600' }}>
                                                                    {item.name}
                                                                </div>
                                                                {editingItem?.id === item.id ? (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                                                        <input type="text" value={editingItem.chance} onChange={e => setEditingItem({ ...editingItem, chance: e.target.value })}
                                                                               style={{ width: '70px', padding: '4px 8px', background: COLORS.bg, border: `1px solid ${COLORS.accent}`, borderRadius: '4px', color: COLORS.text, fontSize: '12px' }}
                                                                               autoFocus onKeyDown={e => { if (e.key === 'Enter') updateItemChance(item.id, editingItem.chance); if (e.key === 'Escape') setEditingItem(null); }}
                                                                        />
                                                                        <span style={{ color: COLORS.textMuted, fontSize: '11px' }}>%</span>
                                                                        <button onClick={() => updateItemChance(item.id, editingItem.chance)} style={{ padding: '2px 8px', background: COLORS.green, border: 'none', borderRadius: '3px', color: '#fff', cursor: 'pointer', fontSize: '11px' }}>Save</button>
                                                                        <button onClick={() => setEditingItem(null)} style={{ padding: '2px 8px', background: COLORS.bgLighter, border: `1px solid ${COLORS.border}`, borderRadius: '3px', color: COLORS.textMuted, cursor: 'pointer', fontSize: '11px' }}>Cancel</button>
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>{formatChance(item.chance)}% chance</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {editingItem?.id !== item.id && (
                                                            <button onClick={() => setEditingItem({ id: item.id, chance: formatChance(item.chance) })} style={{ padding: '4px 10px', background: `${COLORS.accent}22`, border: `1px solid ${COLORS.accent}44`, borderRadius: '4px', color: COLORS.accent, cursor: 'pointer', fontSize: '11px' }}>Edit %</button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Custom/Dynamic Items */}
                                    {dynamicItems.filter(i => !i.is_static).length > 0 && (
                                        <div>
                                            <h3 style={{ margin: '0 0 12px 0', color: COLORS.text, fontSize: '14px' }}>Custom Items ({dynamicItems.filter(i => !i.is_static).length})</h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {dynamicItems.filter(i => !i.is_static).map(item => (
                                                    <div key={item.id} style={{ background: COLORS.bgLight, borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <img
                                                                src={item.image_url || (item.username ? getMinecraftHeadUrl(item.username) : `${IMAGE_BASE_URL}/${item.texture?.replace(/^(special_|rare_|mythic_)/, '')}.png`)}
                                                                style={{ width: '32px', height: '32px', imageRendering: item.username ? 'auto' : 'pixelated', borderRadius: item.username ? '4px' : '0' }}
                                                                onError={(e) => { e.target.onerror = null; e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }}
                                                            />
                                                            <div>
                                                                <div style={{ color: item.rarity === 'mythic' ? COLORS.aqua : item.rarity === 'legendary' ? COLORS.purple : COLORS.red, fontWeight: '600' }}>
                                                                    {item.name}
                                                                </div>
                                                                {editingItem?.id === item.id ? (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                                                        <input type="text" value={editingItem.chance} onChange={e => setEditingItem({ ...editingItem, chance: e.target.value })}
                                                                               style={{ width: '70px', padding: '4px 8px', background: COLORS.bg, border: `1px solid ${COLORS.accent}`, borderRadius: '4px', color: COLORS.text, fontSize: '12px' }}
                                                                               autoFocus onKeyDown={e => { if (e.key === 'Enter') updateItemChance(item.id, editingItem.chance); if (e.key === 'Escape') setEditingItem(null); }}
                                                                        />
                                                                        <span style={{ color: COLORS.textMuted, fontSize: '11px' }}>%</span>
                                                                        <button onClick={() => updateItemChance(item.id, editingItem.chance)} style={{ padding: '2px 8px', background: COLORS.green, border: 'none', borderRadius: '3px', color: '#fff', cursor: 'pointer', fontSize: '11px' }}>Save</button>
                                                                        <button onClick={() => setEditingItem(null)} style={{ padding: '2px 8px', background: COLORS.bgLighter, border: `1px solid ${COLORS.border}`, borderRadius: '3px', color: COLORS.textMuted, cursor: 'pointer', fontSize: '11px' }}>Cancel</button>
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ color: COLORS.textMuted, fontSize: '11px' }}>{formatChance(item.chance)}% chance</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            {editingItem?.id !== item.id && (
                                                                <button onClick={() => setEditingItem({ id: item.id, chance: formatChance(item.chance) })} style={{ padding: '4px 10px', background: `${COLORS.accent}22`, border: `1px solid ${COLORS.accent}44`, borderRadius: '4px', color: COLORS.accent, cursor: 'pointer', fontSize: '11px' }}>Edit %</button>
                                                            )}
                                                            <button onClick={() => deleteSpecialItem(item.id)} style={{ padding: '4px 8px', background: `${COLORS.red}22`, border: `1px solid ${COLORS.red}44`, borderRadius: '4px', color: COLORS.red, cursor: 'pointer', fontSize: '11px' }}>Remove</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {selectedUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '20px' }}>
                    <UserCollectionEditor user={selectedUser} allItems={allItems} onClose={() => setSelectedUser(null)} onAddItem={addItemToUser} onRemoveItem={removeItemFromUser} />
                </div>
            )}
        </div>
    );
}