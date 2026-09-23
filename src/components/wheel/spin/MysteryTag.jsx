import React from 'react';
import { COLORS } from '../config/constants';

/*
 * MYSTERY - the mark on a pull that came out of the daily bounty's box, wherever
 * the LUCKY badge would otherwise sit.
 *
 * One component rather than a sixth inline copy: the LUCKY badge exists in five
 * files and has drifted into three greens (the ticker's COLORS.green, the toast's
 * and the sidebar's #00FF00 - recursion's matrix green, which is a mode). This one
 * starts in one place so it cannot.
 *
 * A box pull is also written is_lucky = 1 (see the wheel backend's migration for
 * why), so callers show this INSTEAD of LUCKY, never beside it: the box is the
 * more specific truth, and two badges on one row say the same thing twice.
 *
 * Gilt, per COLORS.mysteryGilt: the word itself carries the metal ramp, and the
 * pill is only its hairline. 10px bold at the badge scale the ticker ratified,
 * 11px where a surface's own badges already run a step larger.
 */
export function MysteryTag({ size = 10, title = 'Pulled from a mystery box' }) {
    const [pale, mid, deep] = COLORS.mysteryGilt;
    return (
        <span
            title={title}
            style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: `${size}px`,
                fontWeight: 800,
                lineHeight: 1,
                padding: '2px 5px',
                borderRadius: '4px',
                border: `1px solid ${mid}66`,
                background: `linear-gradient(135deg, ${deep}33, ${mid}14)`,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
            }}
        >
            <span style={{
                background: `linear-gradient(100deg, ${pale}, ${mid} 55%, ${deep})`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                WebkitTextFillColor: 'transparent',
            }}>
                Mystery
            </span>
        </span>
    );
}

export default MysteryTag;
