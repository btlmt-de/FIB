import React from 'react';
import { BookOpen, Trophy, Activity, MessageSquare, User } from 'lucide-react';
import { COLORS, SURFACE_NOISE, Z } from '../config/constants';

/**
 * The phone's four destinations, in the thumb zone.
 *
 * ── WHAT THIS REPLACED ───────────────────────────────────────────────────────
 *
 * Two things at once, because on a phone they were the same problem.
 *
 * The **topbar** carried ten controls — back, wordmark, collection, achievements,
 * activity, a leaderboard pill, the avatar, edit, sound, notifications, settings,
 * logout — on a bar that is 390px wide. It did not wrap or scroll; it simply ran
 * off the right edge, so `settings` and `logout` were unreachable on any phone.
 *
 * The **stage flanks** are the desktop's way into the collection book and the
 * leaderboard, and they are two absolutely-positioned 272px panels. They cannot
 * exist on a phone, which left the two most-used views in the surface with no
 * entry point at all below 1200px except the topbar icons that were falling off
 * the edge.
 *
 * So the flanks do not shrink on a phone — they change category. They stop being
 * readouts you glance at and become destinations you travel to, which is what
 * they already were functionally: DESIGN.md records that each panel "is both a
 * readout and the way in, because a number you cannot act on and a button that
 * tells you nothing waste the same space in different ways". On a phone there is
 * no room for the readout half, and the way-in half is the half that matters.
 *
 * ── WHY A BAR AND NOT A DRAWER ───────────────────────────────────────────────
 *
 * Everything here is one tap from the reel, and the reel is the thing a player
 * came for. A drawer would put every destination two taps deep and hand the
 * bottom of the screen — the only part of a phone a thumb reaches without
 * regripping — back to nothing.
 *
 * ── IT IS DECK, NOT CHROME ───────────────────────────────────────────────────
 *
 * The Nocturne has no cards and no frames, so this is not a floating pill with a
 * blur behind it. It is the platform's own material continuing to the bottom of
 * the screen: the band's blue-hour ground, the shared `SURFACE_NOISE` grain, a
 * lit rail along its top edge where it meets the page, and station amber rising
 * from the floor under the active destination. The same treatment the stage
 * flanks and the status console already wear.
 *
 * `env(safe-area-inset-bottom)` on the padding rather than the height, so the
 * home indicator gets its clearance without the touch targets moving up.
 */
/**
 * Five, since the live-drops ticker left the phone.
 *
 * The ticker was a 68px strip above the reel — the largest remaining piece of
 * chrome on an 800px screen, spending a twelfth of the surface on an ambient
 * readout. It is a destination here instead, which is what it always was: the
 * strip's own "All drops" control opened this same feed. The reel gets the 68px.
 *
 * Five tabs at 390px is 78px each — comfortably past the 44px touch floor, and
 * "Collection" at the 11px label step measures ~58px, so nothing truncates.
 * Live sits in the middle because it is the one that changes on its own.
 */
const TABS = [
    { id: 'collection', label: 'Collection', Icon: BookOpen },
    { id: 'leaderboard', label: 'Board', Icon: Trophy },
    { id: 'activity', label: 'Live', Icon: Activity },
    { id: 'chat', label: 'Chat', Icon: MessageSquare },
    { id: 'profile', label: 'You', Icon: User },
];

export function MobileTabBar({ onSelect, active = null, unreadChat = 0 }) {
    return (
        <nav
            aria-label="Wheel sections"
            style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: Z.banner,
                display: 'grid',
                gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
                // The rail where the deck meets the page, and nothing else. No
                // border, no radius, no shadow lifting it off the surface — it is
                // the surface.
                boxShadow: 'inset 0 1px 0 rgba(190,198,220,0.12)',
                backgroundImage: `${SURFACE_NOISE}, linear-gradient(180deg, #0d1322 0%, #080b14 100%)`,
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
        >
            {TABS.map((tab) => {
                const { id, label } = tab;
                const isActive = active === id;
                return (
                    <button
                        key={id}
                        type="button"
                        onClick={() => onSelect?.(id)}
                        aria-current={isActive ? 'page' : undefined}
                        style={{
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            // 56px, comfortably past the 44px floor, and the label
                            // sits inside the target rather than beside it.
                            minHeight: '56px',
                            padding: '8px 4px',
                            border: 'none',
                            borderRadius: 0,
                            background: 'transparent',
                            color: isActive ? COLORS.gold : COLORS.textMuted,
                            cursor: 'pointer',
                            font: 'inherit',
                            WebkitTapHighlightColor: 'transparent',
                        }}
                    >
                        {/* Station amber rising through the active destination —
                            light through the deck, never a repainted background.
                            The same hover gesture the stage flanks use, promoted to
                            a selected state because a phone has no hover. */}
                        {isActive && (
                            <span
                                aria-hidden="true"
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'linear-gradient(0deg, rgba(255,183,94,0.10) 0%, rgba(255,183,94,0) 72%)',
                                    pointerEvents: 'none',
                                }}
                            />
                        )}
                        <span style={{ position: 'relative', display: 'flex' }}>
                            <tab.Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                            {id === 'chat' && unreadChat > 0 && (
                                <span
                                    aria-hidden="true"
                                    style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-8px',
                                        // 10px, not 9. The surface has a 10px floor
                                        // for anything carrying a glyph a player
                                        // reads, and it has already been breached
                                        // and fixed once here — the ticker's LUCKY
                                        // badge went 9 -> 10 for exactly this. A
                                        // digit is read, so the badge grows to fit
                                        // the type rather than the type shrinking to
                                        // fit the badge.
                                        minWidth: '16px',
                                        height: '16px',
                                        padding: '0 4px',
                                        borderRadius: '999px',
                                        background: COLORS.red,
                                        color: '#fff',
                                        fontSize: '10px',
                                        fontWeight: 800,
                                        lineHeight: '16px',
                                        textAlign: 'center',
                                    }}
                                >
                                    {unreadChat > 9 ? '9+' : unreadChat}
                                </span>
                            )}
                        </span>
                        <span style={{
                            position: 'relative',
                            // 11px is the system's label step. The tab label is a
                            // label in the strict sense — it names an icon that is
                            // already carrying the meaning — so it takes the step
                            // rather than the 12.5px the ticker's headlines get.
                            fontSize: '11px',
                            fontWeight: isActive ? 700 : 600,
                            letterSpacing: '0.02em',
                        }}>
                            {label}
                        </span>
                        {unreadChat > 0 && id === 'chat' && (
                            <span className="sr-only">{unreadChat} unread messages</span>
                        )}
                    </button>
                );
            })}
        </nav>
    );
}

export default MobileTabBar;
