import React, { useState } from 'react';
import { COLORS } from '../../../config/constants.js';
import { useAuth } from '../../../context/AuthContext.jsx';

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