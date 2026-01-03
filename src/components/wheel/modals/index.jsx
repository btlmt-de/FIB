import React, { useState, useEffect } from 'react';
import { COLORS, API_BASE_URL } from '../constants';
import { useAuth } from '../AuthContext';

// ============================================
// Username Modal
// ============================================
export function UsernameModal({ onClose }) {
    const { user, setUsername } = useAuth();
    const [input, setInput] = useState(user?.customUsername || '');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await setUsername(input);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px', animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                background: COLORS.bg, borderRadius: '16px',
                border: `1px solid ${COLORS.border}`,
                padding: '32px', maxWidth: '400px', width: '100%',
                animation: 'slideUp 0.3s ease-out'
            }}>
                <h2 style={{ margin: '0 0 8px 0', color: COLORS.text, fontWeight: '600' }}>Choose Your Username</h2>
                <p style={{ margin: '0 0 24px 0', color: COLORS.textMuted, fontSize: '14px' }}>
                    This will be shown on the leaderboard. Usernames require approval.
                </p>

                {user?.usernameRejected && (
                    <div style={{ background: `${COLORS.red}22`, border: `1px solid ${COLORS.red}`, borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: COLORS.red }}>
                        Your previous username was rejected: {user.rejectionReason}
                    </div>
                )}

                {user?.customUsername && !user?.usernameApproved && !user?.usernameRejected && (
                    <div style={{ background: `${COLORS.gold}22`, border: `1px solid ${COLORS.gold}`, borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: COLORS.gold }}>
                        Your username "{user.customUsername}" is pending approval
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <input
                        type="text" value={input} onChange={e => setInput(e.target.value)}
                        placeholder="Enter username..." maxLength={20}
                        style={{
                            width: '100%', padding: '12px 16px', background: COLORS.bgLight,
                            border: `1px solid ${error ? COLORS.red : COLORS.border}`,
                            borderRadius: '8px', color: COLORS.text, fontSize: '14px',
                            outline: 'none', boxSizing: 'border-box'
                        }}
                    />
                    <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: COLORS.textMuted }}>
                        3-20 characters. Letters, numbers, underscores, and hyphens only.
                    </p>
                    {error && <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: COLORS.red }}>{error}</p>}

                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                        <button type="button" onClick={onClose} style={{
                            flex: 1, padding: '12px', background: 'transparent',
                            border: `1px solid ${COLORS.border}`, borderRadius: '8px',
                            color: COLORS.textMuted, cursor: 'pointer', fontSize: '14px'
                        }}>Cancel</button>
                        <button type="submit" disabled={submitting || input.length < 3} style={{
                            flex: 1, padding: '12px', background: COLORS.accent,
                            border: 'none', borderRadius: '8px', color: '#fff',
                            cursor: submitting ? 'wait' : 'pointer', fontSize: '14px', fontWeight: '600',
                            opacity: submitting || input.length < 3 ? 0.5 : 1
                        }}>{submitting ? 'Submitting...' : 'Submit'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ============================================
// Import Prompt Modal
// ============================================
export function ImportPromptModal({ onImport, onSkip, localData }) {
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px', animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                background: COLORS.bg, borderRadius: '16px',
                border: `1px solid ${COLORS.gold}44`,
                padding: '32px', maxWidth: '450px', width: '100%',
                animation: 'slideUp 0.3s ease-out', textAlign: 'center'
            }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                <h2 style={{ margin: '0 0 12px 0', color: COLORS.gold, fontWeight: '600' }}>
                    Welcome Back!
                </h2>
                <p style={{ margin: '0 0 24px 0', color: COLORS.text, fontSize: '15px', lineHeight: '1.5' }}>
                    We found your previous collection! Would you like to import it to your account?
                </p>

                <div style={{ background: COLORS.bgLight, borderRadius: '8px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: COLORS.textMuted }}>Items Found</span>
                        <span style={{ color: COLORS.gold, fontWeight: '600' }}>{localData.totalItems}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: COLORS.textMuted }}>Total Spins</span>
                        <span style={{ color: COLORS.text, fontWeight: '600' }}>{localData.totalSpins.toLocaleString()}</span>
                    </div>
                    {(localData.mythicCount > 0 || localData.legendaryCount > 0 || localData.rareCount > 0) && (
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${COLORS.border}` }}>
                            <div style={{ fontSize: '12px', color: COLORS.textMuted, marginBottom: '6px' }}>Including Special Items:</div>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                {localData.mythicCount > 0 && <span style={{ color: COLORS.aqua, fontSize: '13px' }}>✦ {localData.mythicCount} Mythic</span>}
                                {localData.legendaryCount > 0 && <span style={{ color: COLORS.purple, fontSize: '13px' }}>★ {localData.legendaryCount} Legendary</span>}
                                {localData.rareCount > 0 && <span style={{ color: COLORS.red, fontSize: '13px' }}>◆ {localData.rareCount} Rare</span>}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={onSkip} style={{
                        flex: 1, padding: '14px', background: 'transparent',
                        border: `1px solid ${COLORS.border}`, borderRadius: '8px',
                        color: COLORS.textMuted, cursor: 'pointer', fontSize: '14px'
                    }}>Start Fresh</button>
                    <button onClick={onImport} style={{
                        flex: 1, padding: '14px', background: `linear-gradient(135deg, ${COLORS.gold}, ${COLORS.orange})`,
                        border: 'none', borderRadius: '8px', color: COLORS.bg,
                        cursor: 'pointer', fontSize: '14px', fontWeight: '600'
                    }}>Import Collection</button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// Migration Modal
// ============================================
export function MigrationModal({ onClose, onSuccess }) {
    const [status, setStatus] = useState('checking');
    const [localData, setLocalData] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => { checkMigration(); }, []);

    async function checkMigration() {
        try {
            const res = await fetch(`${API_BASE_URL}/api/migrate/status`, { credentials: 'include' });
            const data = await res.json();

            if (!data.canMigrate) {
                setStatus('unavailable');
                setError(data.reason || 'Migration not available');
                return;
            }

            const stored = localStorage.getItem('fib_wheel_collection');
            if (stored) {
                const collection = JSON.parse(stored);
                const totalItems = Object.keys(collection).length;
                const totalSpins = Object.values(collection).reduce((sum, count) => sum + count, 0);

                let mythicCount = 0, legendaryCount = 0, rareCount = 0;
                for (const [texture, count] of Object.entries(collection)) {
                    if (texture === 'mythic_cavendish' || texture.startsWith('mythic_')) mythicCount += count;
                    else if (texture.startsWith('special_')) legendaryCount += count;
                    else if (texture.startsWith('rare_')) rareCount += count;
                }

                if (totalItems > 0) {
                    setLocalData({ collection, totalItems, totalSpins, mythicCount, legendaryCount, rareCount });
                    setStatus('available');
                    return;
                }
            }
            setStatus('unavailable');
            setError('No local collection found');
        } catch (err) {
            setStatus('unavailable');
            setError('Failed to check migration status');
        }
    }

    async function performMigration() {
        if (!localData) return;
        setStatus('migrating');
        try {
            const res = await fetch(`${API_BASE_URL}/api/migrate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ collection: localData.collection })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setResult(data);
            setStatus('success');
            localStorage.removeItem('fib_wheel_collection');
            if (onSuccess) onSuccess();
        } catch (err) {
            setError(err.message);
            setStatus('available');
        }
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
        }}>
            <div style={{
                background: COLORS.bg, borderRadius: '16px',
                border: `1px solid ${COLORS.border}`,
                padding: '32px', maxWidth: '450px', width: '100%'
            }}>
                <h2 style={{ margin: '0 0 8px 0', color: COLORS.text, fontWeight: '600' }}>📦 Import Collection</h2>
                <p style={{ margin: '0 0 24px 0', color: COLORS.textMuted, fontSize: '14px' }}>
                    Transfer your existing wheel collection to your account.
                </p>

                {status === 'checking' && <div style={{ textAlign: 'center', padding: '20px', color: COLORS.textMuted }}>Checking for local data...</div>}

                {status === 'unavailable' && (
                    <div>
                        <div style={{ background: `${COLORS.orange}22`, border: `1px solid ${COLORS.orange}`, borderRadius: '8px', padding: '16px', marginBottom: '20px', color: COLORS.orange }}>{error}</div>
                        <button onClick={onClose} style={{ width: '100%', padding: '12px', background: COLORS.bgLight, border: `1px solid ${COLORS.border}`, borderRadius: '8px', color: COLORS.text, cursor: 'pointer' }}>Close</button>
                    </div>
                )}

                {status === 'available' && localData && (
                    <div>
                        <div style={{ background: COLORS.bgLight, borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                            <div style={{ color: COLORS.text, fontWeight: '600', marginBottom: '12px' }}>Found Local Collection:</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: COLORS.textMuted }}>Unique Items</span>
                                <span style={{ color: COLORS.gold, fontWeight: '600' }}>{localData.totalItems}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: COLORS.textMuted }}>Total Spins</span>
                                <span style={{ color: COLORS.text, fontWeight: '600' }}>{localData.totalSpins.toLocaleString()}</span>
                            </div>
                            {(localData.mythicCount > 0 || localData.legendaryCount > 0 || localData.rareCount > 0) && (
                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${COLORS.border}` }}>
                                    <div style={{ fontSize: '12px', color: COLORS.textMuted, marginBottom: '8px' }}>Special Items Found:</div>
                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                        {localData.mythicCount > 0 && <span style={{ color: COLORS.aqua, fontSize: '13px' }}>✦ {localData.mythicCount} Mythic</span>}
                                        {localData.legendaryCount > 0 && <span style={{ color: COLORS.purple, fontSize: '13px' }}>★ {localData.legendaryCount} Legendary</span>}
                                        {localData.rareCount > 0 && <span style={{ color: COLORS.red, fontSize: '13px' }}>◆ {localData.rareCount} Rare</span>}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ background: `${COLORS.green}15`, border: `1px solid ${COLORS.green}44`, borderRadius: '8px', padding: '12px', marginBottom: '20px', fontSize: '13px', color: COLORS.textMuted }}>
                            <strong style={{ color: COLORS.green }}>✓ All items will be imported</strong> including Mythic, Legendary, and Rare items!
                        </div>

                        {error && <div style={{ background: `${COLORS.red}22`, padding: '12px', borderRadius: '8px', marginBottom: '16px', color: COLORS.red, fontSize: '13px' }}>{error}</div>}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={onClose} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${COLORS.border}`, borderRadius: '8px', color: COLORS.textMuted, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={performMigration} style={{ flex: 1, padding: '12px', background: COLORS.green, border: 'none', borderRadius: '8px', color: COLORS.bg, cursor: 'pointer', fontWeight: '600' }}>Import All</button>
                        </div>
                    </div>
                )}

                {status === 'migrating' && <div style={{ textAlign: 'center', padding: '20px', color: COLORS.textMuted }}><div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>Importing your collection...</div>}

                {status === 'success' && result && (
                    <div>
                        <div style={{ background: `${COLORS.green}22`, border: `1px solid ${COLORS.green}`, borderRadius: '8px', padding: '16px', marginBottom: '20px', textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                            <div style={{ color: COLORS.green, fontWeight: '600' }}>Imported {result.imported.uniqueItems} items!</div>
                            <div style={{ color: COLORS.textMuted, fontSize: '13px' }}>({result.imported.totalSpins.toLocaleString()} total spins)</div>
                            {(result.imported.mythicCount > 0 || result.imported.legendaryCount > 0 || result.imported.rareCount > 0) && (
                                <div style={{ marginTop: '8px', fontSize: '12px' }}>
                                    {result.imported.mythicCount > 0 && <span style={{ color: COLORS.aqua, marginRight: '8px' }}>✦ {result.imported.mythicCount} Mythic</span>}
                                    {result.imported.legendaryCount > 0 && <span style={{ color: COLORS.purple, marginRight: '8px' }}>★ {result.imported.legendaryCount} Legendary</span>}
                                    {result.imported.rareCount > 0 && <span style={{ color: COLORS.red }}>◆ {result.imported.rareCount} Rare</span>}
                                </div>
                            )}
                        </div>
                        <button onClick={onClose} style={{ width: '100%', padding: '12px', background: COLORS.accent, border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>Start Spinning!</button>
                    </div>
                )}
            </div>
        </div>
    );
}