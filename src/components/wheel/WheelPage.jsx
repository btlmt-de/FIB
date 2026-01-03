import React, { useState, useEffect } from 'react';
import { COLORS, API_BASE_URL, TEAM_MEMBERS, RARE_MEMBERS } from './constants';
import { useAuth, AuthProvider } from './AuthContext';
import { AnimationStyles } from './AnimationStyles';
import { WheelSpinner } from './WheelSpinner';
import { UsernameModal, ImportPromptModal, MigrationModal } from './modals';
import { Leaderboard } from './Leaderboard';
import { CollectionBook } from './CollectionBook';
import { SpinHistory } from './SpinHistory';
import { AdminPanel } from './AdminPanel';

function WheelOfFortunePage({ onBack }) {
    const { user, loading: authLoading, login, logout } = useAuth();
    const [allItems, setAllItems] = useState([]);
    const [dynamicItems, setDynamicItems] = useState([]);
    const [collection, setCollection] = useState({});
    const [collectionDetails, setCollectionDetails] = useState({});
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState({ totalSpins: 0, mythicCount: 0, legendaryCount: 0, rareCount: 0, eventTriggers: 0, totalDuplicates: 0 });
    const [loading, setLoading] = useState(true);

    const [showUsernameModal, setShowUsernameModal] = useState(false);
    const [showMigration, setShowMigration] = useState(false);
    const [showImportPrompt, setShowImportPrompt] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showCollection, setShowCollection] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    const [hasLocalData, setHasLocalData] = useState(false);
    const [localDataInfo, setLocalDataInfo] = useState(null);

    // Check for local data on mount
    useEffect(() => {
        const stored = localStorage.getItem('fib_wheel_collection');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                const totalItems = Object.keys(data).length;
                const totalSpins = Object.values(data).reduce((sum, count) => sum + count, 0);

                let mythicCount = 0, legendaryCount = 0, rareCount = 0;
                for (const [texture, count] of Object.entries(data)) {
                    if (texture === 'mythic_cavendish' || texture.startsWith('mythic_')) mythicCount += count;
                    else if (texture.startsWith('special_')) legendaryCount += count;
                    else if (texture.startsWith('rare_')) rareCount += count;
                }

                if (totalItems > 0) {
                    setHasLocalData(true);
                    setLocalDataInfo({ totalItems, totalSpins, mythicCount, legendaryCount, rareCount });
                }
            } catch {}
        }
    }, []);

    // Show import prompt after login if user has local data and no spins
    useEffect(() => {
        if (user && user.totalSpins === 0 && hasLocalData && localDataInfo) {
            setShowImportPrompt(true);
        }
    }, [user, hasLocalData, localDataInfo]);

    useEffect(() => { fetchItems(); }, []);

    useEffect(() => {
        if (user) { fetchCollection(); fetchHistory(); }
        else { setCollection({}); setHistory([]); setStats({ totalSpins: 0, mythicCount: 0, legendaryCount: 0, rareCount: 0, eventTriggers: 0, totalDuplicates: 0 }); }
    }, [user]);

    async function fetchItems() {
        try {
            console.log('Fetching items from:', `${API_BASE_URL}/api/items`);
            const itemsRes = await fetch(`${API_BASE_URL}/api/items`);
            const itemsData = await itemsRes.json();
            console.log('Items response:', { itemCount: itemsData.items?.length });
            setAllItems(itemsData.items || []);

            const specialRes = await fetch(`${API_BASE_URL}/api/special-items`);
            const specialData = await specialRes.json();
            console.log('Special items response:', { count: specialData.items?.length });
            setDynamicItems(specialData.items || []);
        } catch (error) { console.error('Failed to fetch items:', error); }
        finally { setLoading(false); }
    }

    async function fetchCollection() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/collection`, { credentials: 'include' });
            const data = await res.json();
            setCollection(data.collection || {});
            setCollectionDetails(data.collectionDetails || {});
            setStats({
                totalSpins: data.totalSpins || 0,
                mythicCount: data.mythicCount || 0,
                legendaryCount: data.legendaryCount || 0,
                rareCount: data.rareCount || 0,
                eventTriggers: data.eventTriggers || 0,
                totalDuplicates: data.totalDuplicates || 0
            });
        } catch (error) { console.error('Failed to fetch collection:', error); }
    }

    async function fetchHistory() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/history`, { credentials: 'include' });
            const data = await res.json();
            setHistory(data.history || []);
        } catch (error) { console.error('Failed to fetch history:', error); }
    }

    function handleSpinComplete(result) {
        if (result.isEvent) {
            // Event triggered - update event count but don't add to collection
            setStats(prev => ({
                ...prev,
                eventTriggers: prev.eventTriggers + 1
            }));
        } else {
            setCollection(prev => ({ ...prev, [result.result.texture]: (prev[result.result.texture] || 0) + 1 }));
            setStats(prev => ({
                ...prev,
                totalSpins: prev.totalSpins + 1,
                mythicCount: prev.mythicCount + (result.result.type === 'mythic' ? 1 : 0),
                legendaryCount: prev.legendaryCount + (result.result.type === 'legendary' ? 1 : 0),
                rareCount: prev.rareCount + (result.result.type === 'rare' ? 1 : 0)
            }));
            setHistory(prev => [{ item_texture: result.result.texture, item_name: result.result.name, item_type: result.result.type, spun_at: new Date().toISOString() }, ...prev.slice(0, 99)]);
        }
    }

    function handleImportPrompt() {
        setShowImportPrompt(false);
        setShowMigration(true);
    }

    function handleSkipImport() {
        setShowImportPrompt(false);
    }

    // Calculate total item count - use dynamicItems if available (from API), otherwise use fallback constants
    const hasApiData = dynamicItems && dynamicItems.length > 0;
    const totalItemCount = hasApiData
        ? allItems.length + dynamicItems.length
        : allItems.length + TEAM_MEMBERS.length + RARE_MEMBERS.length + 1; // +1 for mythic
    const collectedCount = Object.keys(collection).filter(k => collection[k] > 0).length;

    if (authLoading || loading) {
        return (
            <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted }}>
                <AnimationStyles />
                Loading...
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: COLORS.bg, color: COLORS.text, padding: '40px 20px', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
            <AnimationStyles />
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 style={{
                        margin: '0 0 8px 0', fontSize: '32px', fontWeight: '700',
                        background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.orange})`,
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
                    }}>
                        Wheel of Fortune
                    </h1>
                    <p style={{ margin: 0, color: COLORS.textMuted }}>
                        Spin to collect all {totalItemCount} items!
                    </p>
                </div>

                {/* Auth Section */}
                <div style={{ background: COLORS.bgLight, borderRadius: '12px', padding: '20px', marginBottom: '24px', border: `1px solid ${COLORS.border}` }}>
                    {!user ? (
                        <div style={{ textAlign: 'center' }}>
                            <button onClick={login} style={{
                                padding: '12px 24px', background: '#5865F2', border: 'none', borderRadius: '8px',
                                color: '#fff', fontSize: '16px', fontWeight: '600', cursor: 'pointer',
                                display: 'inline-flex', alignItems: 'center', gap: '10px'
                            }}>
                                <svg width="24" height="24" viewBox="0 0 71 55" fill="currentColor">
                                    <path d="M60.1 4.9C55.6 2.8 50.7 1.3 45.7.4c-.1 0-.2 0-.2.1-.6 1.1-1.3 2.6-1.8 3.7-5.5-.8-10.9-.8-16.3 0-.5-1.2-1.2-2.6-1.8-3.7 0-.1-.1-.1-.2-.1-5 .9-9.9 2.4-14.4 4.5 0 0 0 0-.1.1C1.6 18.7-.9 32.1.3 45.4c0 .1 0 .1.1.2 6.1 4.5 12 7.2 17.7 9 .1 0 .2 0 .3-.1 1.4-1.9 2.6-3.8 3.6-5.9.1-.1 0-.3-.1-.3-2-.8-3.8-1.7-5.6-2.7-.1-.1-.1-.3 0-.4.4-.3.8-.6 1.1-.9.1-.1.2-.1.2 0 11.6 5.3 24.2 5.3 35.7 0 .1 0 .2 0 .2.1.4.3.7.6 1.1.9.1.1.1.3 0 .4-1.8 1-3.6 1.9-5.6 2.7-.1 0-.2.2-.1.3 1.1 2.1 2.3 4 3.6 5.9.1.1.2.1.3.1 5.8-1.8 11.7-4.5 17.8-9 0 0 .1-.1.1-.2 1.5-15.3-2.5-28.6-10.5-40.4 0 0 0-.1-.1-.1zM23.7 37.3c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.4 3.2 6.4 7.2s-2.8 7.2-6.4 7.2zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.2 6.4 7.2s-2.8 7.2-6.4 7.2z"/>
                                </svg>
                                Login with Discord
                            </button>
                            {hasLocalData && <p style={{ marginTop: '12px', color: COLORS.gold, fontSize: '13px' }}>You have a local collection that can be imported!</p>}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {user.usernameApproved ? (
                                    <span style={{ color: COLORS.text, fontWeight: '600' }}>{user.customUsername}</span>
                                ) : user.customUsername ? (
                                    <span style={{ color: COLORS.gold }}>⏳ {user.customUsername}</span>
                                ) : (
                                    <button onClick={() => setShowUsernameModal(true)} style={{ background: COLORS.accent, border: 'none', borderRadius: '6px', padding: '6px 12px', color: '#fff', cursor: 'pointer', fontSize: '13px' }}>Set Username</button>
                                )}
                                <button onClick={() => setShowUsernameModal(true)} style={{
                                    background: 'transparent',
                                    border: `1px solid ${COLORS.border}`,
                                    color: COLORS.textMuted,
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    transition: 'all 0.15s'
                                }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent; e.currentTarget.style.color = COLORS.accent; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}
                                >Edit</button>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {hasLocalData && (
                                    <button onClick={() => setShowMigration(true)} style={{ padding: '8px 16px', background: COLORS.gold, border: 'none', borderRadius: '6px', color: COLORS.bg, cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Import Local Data</button>
                                )}
                                {user.isAdmin && <button onClick={() => setShowAdmin(true)} style={{ padding: '8px 12px', background: COLORS.bgLighter, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.textMuted, cursor: 'pointer', fontSize: '13px' }}>⚙️</button>}
                                <button onClick={logout} style={{ padding: '8px 12px', background: 'transparent', border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.textMuted, cursor: 'pointer', fontSize: '13px' }}>Logout</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Wheel */}
                <div style={{ marginBottom: '24px' }}>
                    <WheelSpinner allItems={allItems} collection={collection} onSpinComplete={handleSpinComplete} user={user} dynamicItems={dynamicItems} />
                </div>

                {/* Action Buttons */}
                {user && (
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => setShowCollection(true)} style={{
                            padding: '12px 24px', background: COLORS.bgLight, border: `1px solid ${COLORS.border}`,
                            borderRadius: '8px', color: COLORS.text, cursor: 'pointer', fontSize: '14px',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}>📖 Collection</button>
                        <button onClick={() => setShowHistory(true)} style={{
                            padding: '12px 24px', background: COLORS.bgLight, border: `1px solid ${COLORS.border}`,
                            borderRadius: '8px', color: COLORS.text, cursor: 'pointer', fontSize: '14px',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}>📜 History</button>
                        <button onClick={() => setShowLeaderboard(true)} style={{
                            padding: '12px 24px', background: COLORS.bgLight, border: `1px solid ${COLORS.border}`,
                            borderRadius: '8px', color: COLORS.text, cursor: 'pointer', fontSize: '14px',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}>🏆 Leaderboard</button>
                    </div>
                )}

                {/* Footer */}
                <div style={{ textAlign: 'center', marginTop: '48px', color: COLORS.textMuted, fontSize: '13px' }}>
                    <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: COLORS.accent, cursor: 'pointer', fontSize: '13px' }}>
                        ← Back to ForceItemBattle
                    </button>
                </div>
            </div>

            {/* Modals */}
            {showUsernameModal && <UsernameModal onClose={() => setShowUsernameModal(false)} />}
            {showImportPrompt && localDataInfo && <ImportPromptModal onImport={handleImportPrompt} onSkip={handleSkipImport} localData={localDataInfo} />}
            {showMigration && <MigrationModal onClose={() => setShowMigration(false)} onSuccess={() => { setHasLocalData(false); fetchCollection(); }} />}
            {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
            {showCollection && <CollectionBook collection={collection} collectionDetails={collectionDetails} stats={stats} allItems={allItems} dynamicItems={dynamicItems} onClose={() => setShowCollection(false)} />}
            {showHistory && <SpinHistory history={history} onClose={() => setShowHistory(false)} />}
            {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} allItems={allItems} />}
        </div>
    );
}

// Export with Auth Provider wrapper
export default function WheelOfFortune({ onBack }) {
    return (
        <AuthProvider>
            <WheelOfFortunePage onBack={onBack || (() => window.location.hash = '')} />
        </AuthProvider>
    );
}