import React, { useState } from 'react';
import { Check, Clock } from 'lucide-react';
import { COLORS, SPACE } from '../config/constants';
import { PrestigeRing } from '../spin/StageFlanks.jsx';
import { prestigeIcon, prestigeInk, prestigeLabel } from '../../../utils/prestigeHelpers.js';

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
 * The identity control: who you are, and the way in to your own board.
 *
 * ── WHY IT WAS REDESIGNED ────────────────────────────────────────────────────
 *
 * It was a 999px capsule with a 1px border, sitting in a row of 10px-radius
 * buttons that have no border at all. The file's own opening note describes the
 * problem it was left in the middle of: the topbar used to speak three dialects,
 * they were folded into one, and this was the one control that kept its own. Two
 * roundnesses touching is what made the end of the bar read as assembled rather
 * than designed, and shrinking the capsule to fit only the identity treated the
 * symptom.
 *
 * So it is a `TopbarIconButton` that happens to be wide: same 38px height, same
 * 10px radius, same transparent-to-wash hover, same tooltip. What makes it the
 * identity rather than another icon is what is *inside* it.
 *
 * ── AND WHAT IS INSIDE IT ────────────────────────────────────────────────────
 *
 * The prestige ring, which is the point of the change. A ring around a player's
 * face means their prestige level everywhere else on this site, and the one face
 * that never wore one was the player's own, in the corner of every page. A
 * player who has prestiged now sees it on themselves — and at the top level it
 * takes the whole slick, like every insane surface.
 *
 * The level's own numeral rides beside the name when there is one, in the
 * level's tier ink, which is the same badge the collection board and the player
 * board wear. Nothing here invents a colour: `prestigeHelpers` maps a level to a
 * rarity and the ladder supplies the rest.
 */
export function TopbarUserChip({ avatarUrl, name, approved, pending, standing, onClick }) {
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const active = hovered || focused;
    const palette = TONES.default;
    const level = standing?.level || 0;

    return (
        <div style={{ position: 'relative', display: 'flex' }}>
            <button
                type="button"
                onClick={onClick}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                // The level rides in the accessible name, not in the tooltip.
                // See the tooltip line at the end of this component for why.
                aria-label={level > 0 ? `Open your profile — ${prestigeLabel(level)}` : 'Open your profile'}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: `${SPACE.sm}px`,
                    height: `${TOPBAR_CONTROL_SIZE}px`,
                    // 4px + a 28px avatar + 4px is the 36px core; the ring, when
                    // there is one, spends its 2px inside that gap rather than
                    // growing the control — so a prestiged player's chip is
                    // exactly as tall as everyone else's and the row does not
                    // move when someone earns a level.
                    padding: `0 ${SPACE.md}px 0 ${level ? 3 : 5}px`,
                    background: active ? palette.wash : 'transparent',
                    border: '1px solid transparent',
                    borderRadius: '10px',
                    color: active ? palette.hover : COLORS.text,
                    cursor: 'pointer',
                    flexShrink: 1,
                    minWidth: 0,
                    transition: 'background 0.18s ease, color 0.18s ease',
                }}
            >
                <PrestigeRing standing={standing || { level: 0 }}>
                    <img
                        src={avatarUrl}
                        alt=""
                        width={28}
                        height={28}
                        style={{
                            display: 'block',
                            borderRadius: '50%',
                            background: COLORS.bgLighter,
                        }}
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                        }}
                    />
                </PrestigeRing>

                <span style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    minWidth: 0,
                }}>
                    {name}
                </span>

                {/* The level's mark, in its tier's ink, and nothing else.
                    A topbar row has no room to spell it out and the numeral that
                    used to sit beside the mark was carrying the same single bit
                    — the level determines the icon. The tooltip below names it,
                    and the two surfaces with room say it on screen. */}
                {level > 0 && (
                    <span
                        aria-hidden="true"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            flexShrink: 0,
                            color: prestigeInk(level),
                        }}
                    >
                        {prestigeIcon(level, 13)}
                    </span>
                )}

                {/* Approval state, in the chip because it is a fact about the
                    name rather than an action you can take on it. */}
                {approved && <Check size={15} color={COLORS.green} style={{ flexShrink: 0 }} />}
                {pending && <Clock size={15} color={COLORS.gold} style={{ flexShrink: 0 }} />}
            </button>

            {/*
              * The tooltip names the ACTION, always, and never the status.
              *
              * It read "Rare Prestige" for a prestiged player, which is the one
              * thing a tooltip on a button must not do: every other tooltip in
              * this row answers "what happens if I click this", and this one
              * answered "what are you" instead. A player hovering their own name
              * to find the way into their profile got told their rank.
              *
              * The level has three other homes on this control — the ring, the
              * mark, and the accessible name above — so nothing is lost by
              * keeping it out of the one slot that belongs to the verb.
              */}
            {active && <TopbarTooltip label="Your profile" align="center" />}
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
