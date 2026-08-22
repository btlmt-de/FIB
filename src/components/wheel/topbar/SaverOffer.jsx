import React, { useEffect, useState } from 'react';
import { BatteryLow } from 'lucide-react';
import { COLORS, SURFACE_NOISE, Z } from '../config/constants';
import { shouldOfferSaver, markSaverOffered, setSaverMode } from '../../../config/power.js';

/**
 * The one time this site brings up its own power consumption.
 *
 * ── WHY IT ASKS RATHER THAN ACTS ─────────────────────────────────────────────
 *
 * The device signals behind `shouldOfferSaver` are weak — `deviceMemory` is
 * absent on iOS, the Battery API is gone from two of three engines — and even a
 * correct reading does not answer the question. A player on 15% who is about to
 * close the tab wants nothing; a player settling in for an hour on a four-core
 * phone wants everything. Only they know which one they are.
 *
 * The stronger reason is what saver mode does to the surface. It takes away the
 * drift, the twinkle and the slick — the things that make this page look like it
 * is running rather than loading. Flipping that on by itself, on a page the
 * player has already seen alive, produces a site that looks broken and gives
 * them no vocabulary to describe what happened. Asked first, the same change is
 * a setting they chose, and they know where it lives.
 *
 * ── WHY IT IS NOT A MODAL ────────────────────────────────────────────────────
 *
 * Nothing here needs protected focus and nothing is at stake: both answers are
 * correct, and the wrong one is undone in two taps from the ⋯ sheet. So it sits
 * above the bottom bar, in the deck's own material, and lets the surface behind
 * it keep working. It also does not steal focus — a prompt that swallows the
 * spin button on a page somebody opened to spin has misunderstood which of the
 * two of them is the errand.
 *
 * It appears once, ever — and "once" is counted from the moment it is **shown**,
 * not from the moment it is answered. Marking on answer was the first version
 * and it did not mean what the sentence above says: ignoring the panel, or
 * simply navigating away or reloading with it on screen, left the key unwritten,
 * so it came back on the next visit and the one after that. Silence is the most
 * common response to a prompt nobody asked for, and treating it as "not yet
 * asked" is how a one-time offer becomes a recurring one.
 *
 * The cost of this direction is a player who never registers the panel and never
 * gets offered again. That is the right way round: the toggle is two taps away
 * in the ⋯ sheet and named in plain words, so the offer is a convenience, while
 * a prompt that returns every session is the thing people write in about.
 */
export function SaverOffer({ isMobile }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (!isMobile) return undefined;
        let cancelled = false;

        // Deliberately late. Arriving during the wheel's cold start — atlas
        // decode, first paint, the SSE handshake — would put a panel about
        // performance on screen at the exact moment the phone is least able to
        // draw one, and would ask the question before the player has seen what
        // they are being asked to give up.
        const timer = setTimeout(async () => {
            const offer = await shouldOfferSaver();
            if (cancelled || !offer) return;
            // Written here, with the panel going up, so the offer is spent
            // whether or not it is ever answered.
            markSaverOffered();
            setVisible(true);
        }, 12000);

        return () => { cancelled = true; clearTimeout(timer); };
    }, [isMobile]);

    if (!visible) return null;

    const answer = (on) => {
        if (on) setSaverMode(true);
        setVisible(false);
    };

    return (
        <div
            role="region"
            aria-label="Battery saver"
            // The panel is inserted 12 seconds in and deliberately does not take
            // focus, so without this a screen-reader user is never told it
            // arrived — the two buttons simply appear in the tab order with no
            // announcement. `polite` rather than `assertive`: it is a suggestion,
            // and it should wait for a gap rather than interrupt.
            aria-live="polite"
            style={{
                position: 'fixed',
                // Clear of the bottom tab bar (68px) and its safe-area inset —
                // this is a suggestion, and a suggestion does not cover the four
                // destinations.
                bottom: 'calc(76px + env(safe-area-inset-bottom, 0px))',
                left: '12px',
                right: '12px',
                zIndex: Z.modal,
                padding: '16px 18px 14px',
                borderRadius: '10px',
                backgroundImage: `${SURFACE_NOISE}, linear-gradient(180deg, #0f1626 0%, #0a0e18 100%)`,
                // The plinth's own light: a lit top rail and a shadow that
                // carries an offset, the way every raised thing on this deck is
                // built. Not a halo.
                boxShadow: 'inset 0 1px 0 rgba(190,198,220,0.16), 0 12px 32px rgba(0,0,0,0.55)',
                animation: 'fibSheetRise 0.3s cubic-bezier(0.22,1,0.36,1) both',
            }}
        >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <BatteryLow size={20} color={COLORS.gold} style={{ flexShrink: 0, marginTop: '1px' }} />
                <div style={{ minWidth: 0 }}>
                    <div style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: COLORS.text,
                        marginBottom: '4px',
                    }}>
                        This page is working your phone hard
                    </div>
                    {/* Names the trade in the player's own terms. Not "reduces
                        GPU load" — what they will actually notice is that the
                        reel stops drifting, and they should hear that from us
                        before they see it. */}
                    <div style={{
                        fontSize: '13px',
                        lineHeight: 1.5,
                        color: COLORS.textMuted,
                    }}>
                        Saver mode stops the reel drifting and the background moving.
                        Spinning still works exactly the same.
                    </div>
                </div>
            </div>

            <div style={{
                display: 'flex',
                gap: '8px',
                marginTop: '14px',
                justifyContent: 'flex-end',
            }}>
                <button
                    type="button"
                    onClick={() => answer(false)}
                    style={{
                        minHeight: '40px',
                        padding: '0 16px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'transparent',
                        color: COLORS.textMuted,
                        font: 'inherit',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent',
                    }}
                >
                    No thanks
                </button>
                <button
                    type="button"
                    onClick={() => answer(true)}
                    style={{
                        minHeight: '40px',
                        padding: '0 18px',
                        borderRadius: '6px',
                        border: 'none',
                        background: COLORS.gold,
                        color: '#100c04',
                        font: 'inherit',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        WebkitTapHighlightColor: 'transparent',
                    }}
                >
                    Turn on
                </button>
            </div>
        </div>
    );
}

export default SaverOffer;
