import React, { useState, useEffect } from 'react';
import { COLORS, API_BASE_URL } from '../../../config/constants.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { Package, Sparkles, Star, Diamond, Upload, Check, X, AlertCircle } from 'lucide-react';

// ============================================
// Username Modal
/**
 * Render a modal that lets the user choose and submit a custom username.
 *
 * Displays the current username state (pending approval or rejection reasons), enforces client-side length and character guidance, and submits the chosen username to the authentication layer. On successful submission the modal will close; submission errors are shown inline.
 *
 * @param {Object} props
 * @param {Function} props.onClose - Callback invoked to close the modal.
 * @returns {JSX.Element} The username selection modal UI.
 */
export function UsernameModal({ onClose }) {
    const { user, setUsername } = useAuth();
    const [input, setInput] = useState(user?.customUsername || '');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    /**
     * Handle the username form submission by attempting to set the username, closing the modal on success, and updating submission and error state.
     * @param {Event} e - The form submit event.
     */
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
/**
 * Prompt the user to import a previously discovered local collection into their account.
 *
 * Renders a centered modal showing a summary of found items and spins, highlights any mythic/legendary/rare counts,
 * and provides actions to either import the collection or start fresh.
 *
 * @param {Object} props
 * @param {() => void} props.onImport - Callback invoked when the user chooses to import the local collection.
 * @param {() => void} props.onSkip - Callback invoked when the user chooses to start fresh (skip import).
 * @param {Object} props.localDataInfo - Summary of the local collection (may be null/undefined). Expected shape includes
 *   `{ totalItems?: number, totalSpins?: number, mythicCount?: number, legendaryCount?: number, rareCount?: number }`.
 *   This prop is aliased internally as `localData`.
 * @returns {JSX.Element} A modal React element presenting the import prompt and actions.
 */
export function ImportPromptModal({ onImport, onSkip, localDataInfo }) {
    // Support both localData and localDataInfo prop names
    const localData = localDataInfo;

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
                padding: '32px', maxWidth: '450px', width: '100%',
                animation: 'slideUp 0.3s ease-out', textAlign: 'center'
            }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: `${COLORS.gold}22`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px'
                }}>
                    <Package size={28} color={COLORS.gold} />
                </div>

                <h2 style={{ margin: '0 0 12px 0', color: COLORS.text, fontWeight: '600', fontSize: '20px' }}>
                    Welcome Back!
                </h2>
                <p style={{ margin: '0 0 24px 0', color: COLORS.textMuted, fontSize: '14px', lineHeight: '1.5' }}>
                    We found your previous collection! Would you like to import it to your account?
                </p>

                <div style={{ background: COLORS.bgLight, borderRadius: '10px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: COLORS.textMuted, fontSize: '13px' }}>Items Found</span>
                        <span style={{ color: COLORS.gold, fontWeight: '600', fontSize: '14px' }}>{localData?.totalItems || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: COLORS.textMuted, fontSize: '13px' }}>Total Spins</span>
                        <span style={{ color: COLORS.text, fontWeight: '600', fontSize: '14px' }}>{(localData?.totalSpins || 0).toLocaleString()}</span>
                    </div>
                    {localData && (localData.mythicCount > 0 || localData.legendaryCount > 0 || localData.rareCount > 0) && (
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${COLORS.border}` }}>
                            <div style={{ fontSize: '11px', color: COLORS.textMuted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Including Special Items</div>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                {localData.mythicCount > 0 && (
                                    <span style={{ color: COLORS.aqua, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Sparkles size={12} /> {localData.mythicCount} Mythic
                                    </span>
                                )}
                                {localData.legendaryCount > 0 && (
                                    <span style={{ color: COLORS.purple, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Star size={12} /> {localData.legendaryCount} Legendary
                                    </span>
                                )}
                                {localData.rareCount > 0 && (
                                    <span style={{ color: COLORS.red, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Diamond size={12} /> {localData.rareCount} Rare
                                    </span>
                                )}
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
                        flex: 1, padding: '14px', background: COLORS.gold,
                        border: 'none', borderRadius: '8px', color: COLORS.bg,
                        cursor: 'pointer', fontSize: '14px', fontWeight: '600',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}>
                        <Upload size={16} />
                        Import Collection
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// Migration Modal
/**
 * Display a modal that detects a local collection and lets the user import it into their account.
 *
 * The modal checks migration availability via the migration status API, reads a local collection
 * from localStorage (key: "fib_wheel_collection"), summarizes found data, and can submit the
 * collection to the migration API. On successful import the local storage item is removed.
 *
 * @param {Object} props
 * @param {() => void} props.onClose - Callback invoked to close the modal.
 * @param {() => void} [props.onSuccess] - Optional callback invoked after a successful migration.
 * @returns {JSX.Element} A modal UI that manages migration states (checking, available, unavailable, migrating, success, error) and user actions.
 */
export function MigrationModal({ onClose, onSuccess }) {
    const [status, setStatus] = useState('checking');
    const [localData, setLocalData] = useState(null);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => { checkMigration(); }, []);

    /**
     * Checks whether a local collection can be migrated and updates migration-related state.
     *
     * Queries the migration status endpoint and inspects localStorage for a saved
     * 'fib_wheel_collection'. Updates component state by calling setStatus, setLocalData,
     * and setError to reflect one of these outcomes:
     * - Available: local collection found and populated into localData with totals (`collection`, `totalItems`,
     *   `totalSpins`, `mythicCount`, `legendaryCount`, `rareCount`) and `status` set to `'available'`.
     * - Unavailable: migration not permitted, no local collection present, or an error occurred; `status`
     *   set to `'unavailable'` and `error` set with a descriptive message.
     */
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

    /**
     * Upload the local collection to the migration API and update component state to reflect progress and outcome.
     *
     * If no local data is available the function does nothing. On success it stores the migration result, sets status to "success", removes the localStorage collection entry, and invokes `onSuccess` when provided. On failure it records the error message and sets status to "error".
     */
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
            setStatus('error');
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
                padding: '32px', maxWidth: '450px', width: '100%',
                animation: 'slideUp 0.3s ease-out', textAlign: 'center'
            }}>
                {status === 'checking' && (
                    <>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: `${COLORS.accent}22`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px'
                        }}>
                            <Package size={28} color={COLORS.accent} />
                        </div>
                        <h2 style={{ margin: '0 0 12px 0', color: COLORS.text, fontWeight: '600' }}>
                            Checking for Local Data...
                        </h2>
                        <p style={{ margin: '0', color: COLORS.textMuted, fontSize: '14px' }}>
                            Please wait while we check for your collection.
                        </p>
                    </>
                )}

                {status === 'unavailable' && (
                    <>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: `${COLORS.textMuted}22`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px'
                        }}>
                            <AlertCircle size={28} color={COLORS.textMuted} />
                        </div>
                        <h2 style={{ margin: '0 0 12px 0', color: COLORS.text, fontWeight: '600' }}>
                            Nothing to Import
                        </h2>
                        <p style={{ margin: '0 0 24px 0', color: COLORS.textMuted, fontSize: '14px' }}>
                            {error}
                        </p>
                        <button onClick={onClose} style={{
                            padding: '12px 24px', background: COLORS.accent,
                            border: 'none', borderRadius: '8px', color: '#fff',
                            cursor: 'pointer', fontSize: '14px', fontWeight: '600'
                        }}>Close</button>
                    </>
                )}

                {status === 'available' && localData && (
                    <>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: `${COLORS.gold}22`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px'
                        }}>
                            <Package size={28} color={COLORS.gold} />
                        </div>
                        <h2 style={{ margin: '0 0 12px 0', color: COLORS.text, fontWeight: '600' }}>
                            Collection Found!
                        </h2>
                        <p style={{ margin: '0 0 24px 0', color: COLORS.textMuted, fontSize: '14px' }}>
                            Import your local collection to your account?
                        </p>

                        <div style={{ background: COLORS.bgLight, borderRadius: '10px', padding: '16px', marginBottom: '24px', textAlign: 'left' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: COLORS.textMuted, fontSize: '13px' }}>Items</span>
                                <span style={{ color: COLORS.gold, fontWeight: '600' }}>{localData.totalItems}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: COLORS.textMuted, fontSize: '13px' }}>Spins</span>
                                <span style={{ color: COLORS.text, fontWeight: '600' }}>{localData.totalSpins.toLocaleString()}</span>
                            </div>
                            {(localData.mythicCount > 0 || localData.legendaryCount > 0 || localData.rareCount > 0) && (
                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    {localData.mythicCount > 0 && (
                                        <span style={{ color: COLORS.aqua, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Sparkles size={12} /> {localData.mythicCount}
                                        </span>
                                    )}
                                    {localData.legendaryCount > 0 && (
                                        <span style={{ color: COLORS.purple, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Star size={12} /> {localData.legendaryCount}
                                        </span>
                                    )}
                                    {localData.rareCount > 0 && (
                                        <span style={{ color: COLORS.red, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Diamond size={12} /> {localData.rareCount}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={onClose} style={{
                                flex: 1, padding: '12px', background: 'transparent',
                                border: `1px solid ${COLORS.border}`, borderRadius: '8px',
                                color: COLORS.textMuted, cursor: 'pointer', fontSize: '14px'
                            }}>Cancel</button>
                            <button onClick={performMigration} style={{
                                flex: 1, padding: '12px', background: COLORS.gold,
                                border: 'none', borderRadius: '8px', color: COLORS.bg,
                                cursor: 'pointer', fontSize: '14px', fontWeight: '600',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                            }}>
                                <Upload size={16} />
                                Import
                            </button>
                        </div>
                    </>
                )}

                {status === 'migrating' && (
                    <>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: `${COLORS.accent}22`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px'
                        }}>
                            <Upload size={28} color={COLORS.accent} style={{ animation: 'pulse 1s ease-in-out infinite' }} />
                        </div>
                        <h2 style={{ margin: '0 0 12px 0', color: COLORS.text, fontWeight: '600' }}>
                            Importing...
                        </h2>
                        <p style={{ margin: '0', color: COLORS.textMuted, fontSize: '14px' }}>
                            Please wait while we import your collection.
                        </p>
                    </>
                )}

                {status === 'success' && result && (
                    <>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: `${COLORS.green}22`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px'
                        }}>
                            <Check size={28} color={COLORS.green} />
                        </div>
                        <h2 style={{ margin: '0 0 12px 0', color: COLORS.green, fontWeight: '600' }}>
                            Import Complete!
                        </h2>
                        <p style={{ margin: '0 0 24px 0', color: COLORS.textMuted, fontSize: '14px' }}>
                            Successfully imported {result.itemsImported} items.
                        </p>
                        <button onClick={onClose} style={{
                            padding: '12px 24px', background: COLORS.green,
                            border: 'none', borderRadius: '8px', color: '#fff',
                            cursor: 'pointer', fontSize: '14px', fontWeight: '600'
                        }}>Continue</button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: `${COLORS.red}22`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px'
                        }}>
                            <X size={28} color={COLORS.red} />
                        </div>
                        <h2 style={{ margin: '0 0 12px 0', color: COLORS.red, fontWeight: '600' }}>
                            Import Failed
                        </h2>
                        <p style={{ margin: '0 0 24px 0', color: COLORS.textMuted, fontSize: '14px' }}>
                            {error}
                        </p>
                        <button onClick={onClose} style={{
                            padding: '12px 24px', background: COLORS.accent,
                            border: 'none', borderRadius: '8px', color: '#fff',
                            cursor: 'pointer', fontSize: '14px', fontWeight: '600'
                        }}>Close</button>
                    </>
                )}
            </div>
        </div>
    );
}