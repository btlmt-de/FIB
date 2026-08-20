import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Lucky spins you are holding, shown in the status bar.
 *
 * This is what an event pays out. Every one of them settles the same way — King
 * of the Wheel awards the winner lucky spins, Community Goal pays every
 * participant, First Blood pays whoever lands the rare first — so the payout is
 * one number regardless of which event produced it, and this deliberately does
 * not name the event that did. By the time you are looking at it the event is
 * usually over; what matters is what you now have.
 *
 * It used to sit in the stage, above the spin button, as a large crimson pill
 * with its own pulse animation. That put a persistent badge in the middle of the
 * surface, competing with the result panel for the same space and pushing the
 * spin button down whenever it appeared. Here it occupies the status bar's centre
 * slot — the same place the KOTW standings use while an event is running, which
 * is the natural pairing: standings during, payout after.
 *
 * Styled to match the standings chips rather than the old badge, so the slot
 * looks like one thing whichever of the two is in it.
 */

const KOTW_BG_DARK = '#0F172A';
const KOTW_GOLD = '#F59E0B';
const KOTW_TEXT = '#F8FAFC';

export function EventPayout({ luckySpins = 0, isMobile = false }) {
    if (!luckySpins) return null;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 14px 6px 6px',
                borderRadius: '10px',
                background: `linear-gradient(135deg, ${KOTW_GOLD}26, ${KOTW_BG_DARK}CC)`,
                border: `1px solid ${KOTW_GOLD}88`,
                boxShadow: `0 0 16px -4px ${KOTW_GOLD}`,
                flexShrink: 0,
                // The status bar's own groups handle the centring; this only ever
                // sizes to its content.
                pointerEvents: 'none',
            }}
        >
            <span style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${KOTW_GOLD}40, ${KOTW_GOLD}18)`,
                border: `1px solid ${KOTW_GOLD}55`,
            }}>
                <Sparkles size={16} color={KOTW_GOLD} />
            </span>

            <span style={{
                fontSize: '18px',
                fontWeight: 900,
                fontFamily: 'monospace',
                color: KOTW_GOLD,
                flexShrink: 0,
            }}>
                {luckySpins}
            </span>

            <span style={{
                fontSize: isMobile ? '12px' : '14px',
                fontWeight: 600,
                color: KOTW_TEXT,
                whiteSpace: 'nowrap',
                flexShrink: 0,
            }}>
                Lucky Spin{luckySpins !== 1 ? 's' : ''}
            </span>
        </div>
    );
}
