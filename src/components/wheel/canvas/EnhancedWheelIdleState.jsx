import React, { useState, useMemo } from 'react';
import { Sparkles, Info, Zap, Crown, Star, Gem, Diamond, RotateCw } from 'lucide-react';
import { COLORS } from '../config/constants';
import { RARITY, RARITY_KEYS, getRarityInk } from '../../../utils/rarityHelpers.jsx';

// RarityIndicator takes an icon *component* rather than a rendered element, so it
// cannot use getRarityIcon. Only the glyph is declared here; label and colour come
// from the shared ladder.
const RARITY_ICON = {
    insane: Crown,
    mythic: Sparkles,
    legendary: Star,
    exotic: Gem,
    rare: Diamond,
};

// ============================================
// ORBITAL RING COMPONENT
// ============================================
const OrbitalRing = ({ size, duration, reverse = false, delay = 0, color, opacity = 0.3 }) => (
    <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: size,
        height: size,
        border: `1px solid ${color}`,
        borderRadius: '50%',
        opacity,
        animation: 'none',
        animationDelay: `${delay}s`,
        pointerEvents: 'none',
    }} />
);

// ============================================
// FLOATING PARTICLE
// ============================================
const FloatingParticle = ({ index, color, isRecursion }) => {
    const style = useMemo(() => {
        const angle = (index / 8) * Math.PI * 2;
        const radius = 80 + Math.random() * 40;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const size = 2 + Math.random() * 4;
        const duration = 3 + Math.random() * 2;
        const delay = Math.random() * 3;

        return {
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: size,
            height: size,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 ${size * 2}px ${color}`,
            transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
            animation: 'none',
            animationDelay: `${delay}s`,
            pointerEvents: 'none',
        };
    }, [index, color]);

    return <div style={style} />;
};

// ============================================
// RARITY INDICATOR WITH ICON
// ============================================
const RarityIndicator = ({ color, label, icon: Icon, delay }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        animation: `fadeIn 0.5s ease-out ${delay}s both`,
    }}>
        <Icon
            size={12}
            color={color}
            style={{
                filter: `drop-shadow(0 0 4px ${color})`,
            }}
        />
        <span style={{
            fontSize: '10px',
            color: color,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: '500',
        }}>{label}</span>
    </div>
);

// ============================================
// KEYBOARD HINT
// ============================================
const KeyboardHint = () => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginTop: '8px',
        opacity: 0.6,
    }}>
        <div style={{
            padding: '4px 10px',
            background: COLORS.bgLighter,
            borderRadius: '6px',
            border: `1px solid ${COLORS.border}`,
            fontSize: '11px',
            fontWeight: '600',
            fontFamily: 'monospace',
            color: COLORS.textMuted,
            animation: 'none',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        }}>
            SPACE
        </div>
        <span style={{ fontSize: '11px', color: COLORS.textMuted }}>to spin</span>
    </div>
);

// ============================================
// ENHANCED WHEEL IDLE STATE
// ============================================
export function EnhancedWheelIdleState({
                                           user,
                                           allItems,
                                           totalItemCount,
                                           recursionActive,
                                           recursionSpinsRemaining,
                                           kotwLuckySpins = 0,
                                           error,
                                           onSpin,
                                           onShowOddsInfo,
                                           isMobile,
                                           isLoading = false,
                                           loadingProgress = 0,
                                       }) {
    const [isHovered, setIsHovered] = useState(false);
    const isDisabled = !user || allItems.length === 0 || isLoading;
    const showRecursionEffects = recursionActive && recursionSpinsRemaining > 0;
    const showKotwLuckyEffects = kotwLuckySpins > 0 && !showRecursionEffects;
    const showAnyLuckyEffects = showRecursionEffects || showKotwLuckyEffects;

    // KOTW Theme colors - crimson/gold royal aesthetic
    const KOTW_CRIMSON = '#F43F5E';
    const KOTW_GOLD = '#F59E0B';
    const KOTW_SLATE = '#1E293B';

    // Get the lucky accent color (recursion = matrix green, KOTW = gold)
    const luckyAccentColor = showRecursionEffects ? COLORS.recursion : KOTW_GOLD;
    // Get the primary color (recursion = matrix green, KOTW = crimson)
    const luckyPrimaryColor = showRecursionEffects ? COLORS.recursion : KOTW_CRIMSON;

    // Particle colors based on state
    const particleColor = showRecursionEffects ? COLORS.recursion : showKotwLuckyEffects ? KOTW_GOLD : COLORS.gold;
    // The spin button's accent. Same source as the particles so the whole idle
    // block shifts together when a recursion or KOTW spin is queued — the button
    // is the thing being offered, so it should be the first to say which kind.
    const accentColor = particleColor;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: isMobile ? '12px' : '14px',
            position: 'relative',
            // No minHeight any more. This 440 used to be what held the wheel
            // row open — the page's own reservation never bound because this was
            // larger. In the HUD the grid owns vertical space: this sits in a
            // flexible row that is already sized, and a floor here would push that
            // row past the viewport on short screens, which is the one thing a
            // surface that cannot scroll must never do.
            justifyContent: 'center',
            padding: isMobile ? '8px 12px' : '16px 20px',
        }}>
            {/* Wheel Container with Effects */}
            <div style={{
                position: 'relative',
                width: isMobile ? '150px' : '130px',
                height: isMobile ? '150px' : '130px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                {/* Background Aura */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: showAnyLuckyEffects ? (isMobile ? '200px' : '280px') : (isMobile ? '190px' : '260px'),
                    height: showAnyLuckyEffects ? (isMobile ? '200px' : '280px') : (isMobile ? '190px' : '260px'),
                    background: showRecursionEffects
                        ? `radial-gradient(circle, ${COLORS.recursion}40 0%, ${COLORS.recursion}15 40%, transparent 70%)`
                        : showKotwLuckyEffects
                            ? `radial-gradient(circle, ${KOTW_CRIMSON}30 0%, ${KOTW_GOLD}15 30%, transparent 70%)`
                            : `radial-gradient(circle, ${COLORS.gold}25 0%, ${COLORS.orange}10 40%, transparent 70%)`,
                    borderRadius: '50%',
                    animation: 'none',
                    pointerEvents: 'none',
                    // filter: 'blur(20px)', // removed for GPU performance
                }} />

                {/* Secondary Aura Ring */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: isMobile ? '150px' : '200px',
                    height: isMobile ? '150px' : '200px',
                    background: showRecursionEffects
                        ? `radial-gradient(circle, transparent 60%, ${COLORS.recursion}15 80%, transparent 100%)`
                        : showKotwLuckyEffects
                            ? `radial-gradient(circle, transparent 60%, ${KOTW_CRIMSON}12 70%, ${KOTW_GOLD}10 85%, transparent 100%)`
                            : `radial-gradient(circle, transparent 60%, ${COLORS.gold}10 80%, transparent 100%)`,
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    animation: 'none',
                    pointerEvents: 'none',
                }} />

                {/* Orbital Rings */}
                {!isMobile && (
                    <>
                        <OrbitalRing
                            size="220px"
                            duration={12}
                            color={showRecursionEffects ? COLORS.recursion : showKotwLuckyEffects ? KOTW_CRIMSON : COLORS.gold}
                            opacity={0.2}
                        />
                        <OrbitalRing
                            size="260px"
                            duration={18}
                            reverse
                            delay={2}
                            color={showRecursionEffects ? COLORS.recursion : showKotwLuckyEffects ? KOTW_GOLD : COLORS.purple}
                            opacity={0.15}
                        />
                        <OrbitalRing
                            size="300px"
                            duration={24}
                            delay={4}
                            color={showRecursionEffects ? COLORS.recursion : showKotwLuckyEffects ? KOTW_CRIMSON : COLORS.aqua}
                            opacity={0.1}
                        />
                    </>
                )}

                {/* Floating Particles */}
                {!isMobile && Array.from({ length: 8 }).map((_, i) => (
                    <FloatingParticle
                        key={i}
                        index={i}
                        color={particleColor}
                        isRecursion={showAnyLuckyEffects}
                    />
                ))}

                {/* The spin button.
                 *
                 * Was the tarot card itself: a sprite you clicked. Artwork is a
                 * weak affordance for the page's only verb — nothing about a
                 * picture says "press me", and it carried no disabled or loading
                 * appearance beyond going translucent.
                 *
                 * The first replacement was a flat tinted rectangle, which read as
                 * cheap next to a reel made of animated light. This one is built
                 * from the same material as the reel: a lit plinth rather than a
                 * filled box. The card sits on a dark well so it looks placed on
                 * the button rather than pasted into it; the accent lives in a
                 * gradient rim and a floor glow instead of a wash over the whole
                 * shape; and the whole thing lifts and brightens on hover with a
                 * sweep across it, so pressing it feels like an action rather than
                 * a form submit.
                 */}
                <button
                    onClick={onSpin}
                    disabled={isDisabled}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        // The halo around this is a fixed 130px square, and a flex
                        // item shrinks below its content by default — so the button
                        // was being squeezed to 130px and its label wrapped onto
                        // two lines. It overflows the halo now, which is correct:
                        // the halo is a glow behind the button, not a box holding
                        // it.
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        gap: isMobile ? '12px' : '16px',
                        padding: isMobile ? '13px 24px' : '16px 32px',
                        borderRadius: '18px',
                        border: 'none',
                        // Two layers: a near-black plinth, then the tier accent as
                        // a rim and a pool of light at the floor. Nothing is a flat
                        // fill — that was what made the old one look printed.
                        background: isDisabled
                            ? 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))'
                            : `radial-gradient(120% 140% at 50% 118%, ${accentColor}55 0%, ${accentColor}18 38%, transparent 70%),
                               linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.28) 100%),
                               linear-gradient(180deg, #1b1b28 0%, #12121c 100%)`,
                        color: isDisabled ? COLORS.textMuted : '#fff',
                        fontSize: isMobile ? '17px' : '20px',
                        fontWeight: 800,
                        letterSpacing: '0.01em',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        zIndex: 2,
                        transform: isHovered && !isDisabled ? 'translateY(-3px)' : 'translateY(0)',
                        transition: 'transform 0.22s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.22s, filter 0.22s',
                        filter: isHovered && !isDisabled ? 'brightness(1.14)' : 'none',
                        // The rim is a gradient, so it catches the light along its
                        // top edge the way a physical bevel would. `inset` keeps it
                        // inside the radius without a second element.
                        boxShadow: isDisabled
                            ? 'inset 0 0 0 1px rgba(255,255,255,0.08)'
                            : [
                                `inset 0 0 0 1px ${accentColor}66`,
                                'inset 0 1px 0 rgba(255,255,255,0.22)',
                                `inset 0 -14px 24px -14px ${accentColor}`,
                                isHovered
                                    ? `0 14px 40px -12px ${accentColor}, 0 0 0 5px ${accentColor}1F`
                                    : `0 8px 26px -14px ${accentColor}`,
                            ].join(', '),
                    }}
                >
                    {/* Sheen. A single diagonal highlight that slides across on
                        hover — the cheapest way to say "this is a physical thing
                        you can press" without animating anything expensive. Sits
                        under the content, above the plinth. */}
                    {!isDisabled && (
                        <span
                            aria-hidden="true"
                            style={{
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                width: '55%',
                                left: isHovered ? '75%' : '-60%',
                                background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.16), transparent)',
                                transition: 'left 0.55s cubic-bezier(0.4,0,0.2,1)',
                                pointerEvents: 'none',
                            }}
                        />
                    )}

                    {/* A glyph, not the card.
                     *
                     * The tarot card lived here at 46px and was the wrong asset for
                     * the job: it is a detailed illustration — border, title text,
                     * figures, the wheel motif — and at button size all of that
                     * collapses into an unreadable smudge. Shrinking artwork past
                     * the size it reads at does not make a small version of it, it
                     * makes noise.
                     *
                     * A line glyph is drawn for this size and scales cleanly at any
                     * other. The card's identity is not lost: the wordmark carries
                     * it in the topbar and the status bar keeps its icon, so the
                     * button does not have to say it a third time.
                     */}
                    <RotateCw
                        size={isMobile ? 22 : 26}
                        strokeWidth={2.6}
                        aria-hidden="true"
                        style={{
                            flexShrink: 0,
                            color: isDisabled ? COLORS.textMuted : accentColor,
                            filter: isDisabled ? 'none' : `drop-shadow(0 0 10px ${accentColor}88)`,
                            transform: isHovered && !isDisabled ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.45s cubic-bezier(0.34,1.3,0.64,1), filter 0.22s',
                        }}
                    />

                    <span style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        lineHeight: 1.15,
                    }}>
                        <span style={{
                            whiteSpace: 'nowrap',
                            textShadow: isDisabled ? 'none' : `0 0 18px ${accentColor}55`,
                        }}>
                            {isLoading ? 'Loading…' : isMobile ? 'Tap to spin' : 'Spin'}
                        </span>
                        {/* The secondary line the CTA text underneath used to
                            carry. On the button it is where the eye already is. */}
                        {!isLoading && !isDisabled && (
                            <span style={{
                                fontSize: isMobile ? '10px' : '11px',
                                fontWeight: 600,
                                letterSpacing: '0.09em',
                                textTransform: 'uppercase',
                                color: accentColor,
                                opacity: 0.85,
                                whiteSpace: 'nowrap',
                            }}>
                                {totalItemCount ? `${totalItemCount.toLocaleString()} items` : 'Good luck'}
                            </span>
                        )}
                    </span>
                </button>
            </div>

            {/* Text Content */}
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                {/* Main CTA Text or Loading Bar */}
                {isLoading ? (() => {
                    const clampedProgress = Math.min(100, Math.max(0, loadingProgress));
                    return (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: isMobile ? '4px' : '8px',
                        }}>
                            <div style={{
                                color: COLORS.gold,
                                fontSize: isMobile ? '13px' : '14px',
                                fontWeight: 600,
                            }}>
                                Loading items... {clampedProgress}%
                            </div>
                            <div style={{
                                width: isMobile ? '140px' : '120px',
                                height: '6px',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '3px',
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    width: `${clampedProgress}%`,
                                    height: '100%',
                                    background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.orange})`,
                                    borderRadius: '3px',
                                    transition: 'width 0.15s ease-out',
                                    boxShadow: `0 0 8px ${COLORS.gold}66`,
                                }} />
                            </div>
                        </div>
                    );
                })() : (
                    <div style={{
                        color: showRecursionEffects ? COLORS.recursion : showKotwLuckyEffects ? '#F8FAFC' : COLORS.gold,
                        fontSize: isMobile ? '15px' : '18px',
                        fontWeight: '700',
                        marginBottom: isMobile ? '4px' : '8px',
                        textShadow: showRecursionEffects
                            ? `0 0 20px ${COLORS.recursion}`
                            : showKotwLuckyEffects
                                ? `0 0 15px ${KOTW_CRIMSON}88`
                                : `0 0 20px ${COLORS.gold}44`,
                        letterSpacing: showAnyLuckyEffects ? '2px' : '0.5px',
                        animation: 'none',
                    }}>
                        {!user ? 'Login to spin!'
                            : allItems.length === 0 ? 'Fetching item pool...'
                                : showRecursionEffects
                                    ? (
                                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                            <Zap size={isMobile ? 16 : 18} /> {recursionSpinsRemaining} LUCKY SPIN{recursionSpinsRemaining !== 1 ? 'S' : ''}! <Zap size={isMobile ? 16 : 18} />
                                        </span>
                                    )
                                    : showKotwLuckyEffects
                                        ? (
                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                <Crown size={isMobile ? 16 : 18} /> {kotwLuckySpins} Event Lucky Spin{kotwLuckySpins !== 1 ? 's' : ''}!
                                            </span>
                                        )
                                        // Nothing here any more. The button
                                        // directly above says "Spin"; a line
                                        // under it reading "Click to spin!" was
                                        // the same instruction twice. This line
                                        // survives for what the button cannot
                                        // carry — not signed in, pool still
                                        // loading, and the two lucky-spin states,
                                        // which announce how many you hold.
                                        : null}
                    </div>
                )}

                {/* Subtitle */}
                <div style={{
                    color: COLORS.textMuted,
                    fontSize: isMobile ? '11px' : '13px',
                    marginBottom: isMobile ? '8px' : '12px',
                }}>
                    {showRecursionEffects ? (
                        <span style={{
                            color: COLORS.recursion,
                            fontWeight: '500',
                        }}>
                            Equal chance for ALL items!
                        </span>
                    ) : showKotwLuckyEffects ? (
                        <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                        }}>
                            <span style={{ color: KOTW_GOLD, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}><Sparkles size={14} /> Equal odds!</span>
                            <span style={{
                                color: KOTW_CRIMSON,
                                fontSize: isMobile ? '9px' : '10px',
                                fontWeight: '700',
                                background: `${KOTW_CRIMSON}22`,
                                padding: '2px 6px',
                                borderRadius: '4px',
                            }}>KING OF THE WHEEL</span>
                        </span>
                    ) : null}
                    {/* "Win one of N items!" used to sit here. The count moved
                        onto the spin button, where the eye already is — having it
                        in both places was the same number twice, six pixels
                        apart. */}
                </div>

                {/* Rarity Indicators */}
                {!showAnyLuckyEffects && allItems.length > 0 && !isMobile && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '16px',
                        marginBottom: '12px',
                    }}>
                        {/* Derived from the shared ladder. Was four hardcoded rows with
                            legendary on purple — exotic's colour — and no exotic row. */}
                        {RARITY_KEYS
                            .filter(key => key !== 'common' && key !== 'event')
                            .map((key, index) => (
                                <RarityIndicator
                                    key={key}
                                    color={getRarityInk(key)}
                                    label={RARITY[key].label}
                                    icon={RARITY_ICON[key]}
                                    delay={index * 0.1}
                                />
                            ))}
                    </div>
                )}

                {/* Keyboard Hint - Desktop Only */}
                {!isMobile && user && allItems.length > 0 && <KeyboardHint />}

                {/* Error Display */}
                {error && (
                    <div style={{
                        marginTop: '16px',
                        padding: '12px 20px',
                        background: `linear-gradient(135deg, ${COLORS.red}22 0%, ${COLORS.red}11 100%)`,
                        border: `1px solid ${COLORS.red}44`,
                        borderRadius: '10px',
                        color: COLORS.red,
                        fontSize: '13px',
                        fontWeight: '500',
                        animation: 'slideUp 0.3s ease-out',
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* The "How odds work" button used to sit here.
                    
                    Removed rather than restyled: the reel's status bar carries a
                    `?` that opens the very same OddsInfoModal, and it is on screen
                    in every state rather than only while idle. Two controls for one
                    modal, one of which disappears the moment you spin, is the kind
                    of duplicate affordance a fixed-height surface cannot afford —
                    this block was overflowing the stage and taking the rarity
                    legend below the fold with it. */}
            </div>
        </div>
    );
}