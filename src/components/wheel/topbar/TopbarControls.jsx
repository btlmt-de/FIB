import React, { useState } from 'react';
import { COLORS, SPACE } from '../config/constants';

/**
 * The topbar's shared control vocabulary.
 *
 * The redesign folded three separate clusters into one row — the floating nav
 * grid that used to live under the stage, the leaderboard, and the user chip —
 * and each arrived wearing the styling it had wherever it came from. The result
 * was one strip of buttons speaking three dialects at once:
 *
 *   - nav:   44x44, radius 12, gradient fill, hover lifted the button 2px and
 *            threw a 24px shadow
 *   - user:  ~38px circles, transparent, hover tinted the background only
 *   - sound: 36x36, radius 8, permanently filled, no hover at all
 *
 * Sitting apart on different parts of the page that was survivable. Shoulder to
 * shoulder in a 56px row it is not: hovering the nav group made one button jump
 * out of the row while its neighbours stayed put, which is the "hover looks
 * broken" symptom — the lift was never wrong on its own, it was wrong next to
 * buttons that don't have it, in a row with no vertical room to absorb it.
 *
 * So there is one control here and everything in the topbar uses it. Hover is a
 * background tint and a colour step; nothing moves, and nothing casts a shadow
 * into a 56px row. `tone` carries the two states that genuinely differ in
 * meaning rather than in decoration: `attention` (the mobile Live button, the
 * bell with unread items) and `danger` (logout).
 */

const TONES = {
    // Everything that is just a way in to something else.
    default: { idle: COLORS.textMuted, hover: COLORS.text, wash: 'rgba(255,255,255,0.07)' },
    // Something is waiting for you: unread notifications, live activity on mobile.
    attention: { idle: COLORS.green, hover: COLORS.green, wash: `${COLORS.green}22` },
    // Something is running right now — music playing. Distinct from `attention`
    // because it is not asking for anything.
    active: { idle: COLORS.accent, hover: COLORS.accent, wash: `${COLORS.accent}22` },
    // Something is off in a way you would want to notice — sound muted. Coloured
    // at rest, unlike `danger`, because the point is to be readable without a
    // pointer anywhere near it.
    muted: { idle: COLORS.red, hover: COLORS.red, wash: `${COLORS.red}22` },
    // Destructive on click, unremarkable until then: logout.
    danger: { idle: COLORS.textMuted, hover: COLORS.red, wash: `${COLORS.red}22` },
};

export const TOPBAR_CONTROL_SIZE = 38;

export function TopbarIconButton({
    onClick,
    icon,
    label,
    tone = 'default',
    badge = null,
    // 'center' hangs the tooltip under the middle of the button; 'end' pins its
    // right edge to the button's. The last control on the row sits ~43px from the
    // viewport edge, so anything wider than ~86px centred under it would hang off
    // the page — see TopbarTooltip.
    align = 'center',
    children,
}) {
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const palette = TONES[tone] ?? TONES.default;
    const active = hovered || focused;

    return (
        <div style={{ position: 'relative', display: 'flex' }}>
            <button
                type="button"
                onClick={onClick}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                // The tooltip is decoration for pointer users; the accessible
                // name has to exist whether or not it is showing.
                aria-label={label}
                style={{
                    width: `${TOPBAR_CONTROL_SIZE}px`,
                    height: `${TOPBAR_CONTROL_SIZE}px`,
                    padding: 0,
                    background: active ? palette.wash : 'transparent',
                    border: '1px solid transparent',
                    borderRadius: '10px',
                    color: active ? palette.hover : palette.idle,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    transition: 'background 0.18s ease, color 0.18s ease',
                }}
            >
                {icon}
                {badge}
                {children}
            </button>

            {active && label && <TopbarTooltip label={label} align={align} />}
        </div>
    );
}

/**
 * Tooltips hang below, because in the topbar there is nothing above them but the
 * edge of the viewport.
 *
 * The arrow used to be pinned to `bottom: -5px` with its right and bottom borders
 * lit — geometry for a tooltip sitting *above* its button. Moved below the button
 * and left unchanged, it drew a notch on the far side of the bubble pointing at
 * empty page, so every nav tooltip looked like it belonged to something further
 * down. Same for the entry animation, which rose 5px into place: correct coming
 * up from under a button, backwards coming down from one.
 */
function TopbarTooltip({ label, align = 'center' }) {
    const end = align === 'end';

    return (
        <div
            role="tooltip"
            style={{
                position: 'absolute',
                top: '100%',
                marginTop: `${SPACE.sm}px`,
                ...(end
                    ? { right: 0 }
                    : { left: '50%', transform: 'translateX(-50%)' }),
                padding: '6px 12px',
                background: COLORS.bgLighter,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                color: COLORS.text,
                fontSize: '12px',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 10,
                // Two keyframes rather than one, because the centred variant has
                // to keep its `translateX(-50%)` for the whole animation and the
                // end-aligned one must not have it at all.
                animation: `${end ? 'tooltipDropEnd' : 'tooltipDrop'} 0.18s ease-out`,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
        >
            {label}
            <div style={{
                position: 'absolute',
                top: '-5px',
                // Half the control's width, less half the arrow — so the notch
                // still points at the middle of the button it belongs to.
                ...(end
                    ? { right: `${TOPBAR_CONTROL_SIZE / 2 - 4}px`, transform: 'rotate(45deg)' }
                    : { left: '50%', transform: 'translateX(-50%) rotate(45deg)' }),
                width: '8px',
                height: '8px',
                background: COLORS.bgLighter,
                borderLeft: `1px solid ${COLORS.border}`,
                borderTop: `1px solid ${COLORS.border}`,
            }} />
        </div>
    );
}

/**
 * A hairline between two groups of controls.
 *
 * The right-hand end of the topbar carries three unrelated things — where you can
 * go, where you stand, and who you are — and with a uniform gap between every
 * control they read as one undifferentiated run of twelve buttons. The dividers
 * are what make it three groups; they are doing the work the old separate panels
 * used to do by simply being in different places.
 */
export function TopbarDivider() {
    return (
        <div
            aria-hidden="true"
            style={{
                width: '1px',
                alignSelf: 'stretch',
                margin: `${SPACE.xs}px ${SPACE.xs}px`,
                background: COLORS.border,
                opacity: 0.7,
                flexShrink: 0,
            }}
        />
    );
}
