import React, { useState, useMemo } from 'react';
import { Sparkles, Zap, Crown, Star, Gem, Diamond, AlertTriangle } from 'lucide-react';
import { COLORS } from '../config/constants';
import { WHEEL_TEXTURE_URL } from '../../../config/constants.js';
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
// THE CARD AND ITS ORNAMENTS
// ============================================
//
// The Wheel of Fortune card is the control, and the rings and motes around it are
// its setting. Both were removed in favour of a drawn button — twice, by two
// different arguments — and both are back by the owner's decision after seeing
// each replacement on the page.
//
// The arguments against are recorded because they are still true and whoever
// touches this next should know what they are choosing: a picture does not say
// "press me" the way a bevelled control does, and artwork has nowhere natural to
// show *disabled* or *loading*. What answers them here is behaviour rather than
// chrome — the card lifts and brightens under the cursor, presses in when held,
// and dims with a plain caption when it cannot be used. The card is also the
// wordmark in the topbar and the icon in the status bar, so a player meets the
// same object three times and learns it once.
//
// The counter-argument that lost, also worth keeping: the rings were called the
// ghost of a wheel, since this surface went round, then card, then linear reel.
// That reading assumed the ornament describes the *mechanism*. It does not. It
// describes the card — which is a tarot card, of a wheel, and has been the
// gamemode's mark the whole time. The reel is how the machine works; the card is
// what the thing is called.

/** A concentric rule around the card. Static: motion here belongs to the reel. */
const OrbitalRing = ({ size, color, opacity = 0.3 }) => (
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
        pointerEvents: 'none',
    }} />
);

/**
 * One mote in the ring of eight around the card.
 *
 * Every varying value is derived from `index` rather than `Math.random()`. The
 * random version was called inside a `useMemo` keyed on `[index, color]`, so the
 * moment the accent changed — a recursion or KOTW spin becoming available, which
 * is exactly when this block is supposed to look deliberate — all eight motes
 * jumped to new radii and sizes. A constellation that reshuffles itself on a state
 * change reads as a glitch, and there was never a reason for these positions to be
 * random rather than merely irregular. The golden-angle offsets keep them off an
 * obvious lattice while staying identical across renders.
 */
const FloatingParticle = ({ index, color }) => {
    const style = useMemo(() => {
        const angle = (index / 8) * Math.PI * 2;
        const jitter = (index * 0.618034) % 1;
        const radius = 80 + jitter * 40;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const size = 2 + ((index * 0.381966) % 1) * 4;

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
        {/* 11px, which is the system's label step and the floor of its type ramp.
            This was 10px — the smallest text anywhere on the surface, set in a
            tier colour, in uppercase, at weight 500. Every one of those choices
            costs legibility, and it was carrying the one thing on the page that
            explains what the colours mean. Going up a step is the whole fix; the
            row is centred, so the extra few pixels of width cost nothing. */}
        <span style={{
            fontSize: '11px',
            color: color,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: '500',
        }}>{label}</span>
    </div>
);

/**
 * The rarity key.
 *
 * It used to vanish the instant you pressed Spin — during the one stretch of time
 * when a player is actually staring at coloured columns flying past and might
 * want to know what a colour means. A legend that is present only while nothing
 * is happening is a legend for a screen nobody is reading. It now survives the
 * spin because this whole block does; see the `isSpinning` note below.
 *
 * Colours come from `getRarityInk` rather than `getRarityColor`: these are labels
 * and a 12px icon beside them, and icons count as text. Several of the ladder's
 * fills are Minecraft chat colours picked for a black chat box — exotic's #AA00AA
 * measures 2.07:1 here — so the fill would fail contrast at exactly the size that
 * needs it most.
 */
const RarityLegend = ({ style }) => (
    <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        ...style,
    }}>
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
);

// ============================================
// KEYBOARD HINT
// ============================================
/**
 * The `SPACE to spin` accelerator.
 *
 * The wrapper carried `opacity: 0.6`, which is the quiet failure worth recording:
 * opacity multiplies contrast for everything inside it, so `textMuted` — already
 * the second-quietest ink in the system — landed at 2.27:1 against the page.
 * That is below the 4.5:1 floor and below even the 3:1 large-text floor, on the
 * one piece of text whose entire job is to teach a shortcut nobody would
 * otherwise discover. An accelerator you cannot read is an accelerator nobody
 * uses.
 *
 * The opacity is gone and the quiet comes from the ink instead, which is what the
 * ink ramp is for. Muted on the label, and the keycap keeps its own slightly
 * brighter text so it reads as a key rather than as more prose.
 */
const KeyboardHint = () => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginTop: '8px',
    }}>
        <kbd style={{
            padding: '4px 10px',
            background: COLORS.bgLighter,
            borderRadius: '6px',
            border: `1px solid ${COLORS.border}`,
            fontSize: '11px',
            fontWeight: '600',
            fontFamily: 'monospace',
            color: COLORS.text,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        }}>
            SPACE
        </kbd>
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
                                           // `onShowOddsInfo` used to be here. It
                                           // went dead when the "How odds work"
                                           // button was removed from this block in
                                           // favour of the `?` in the reel's status
                                           // bar, which is on screen in every state
                                           // rather than only while idle.
                                           isMobile,
                                           isLoading = false,
                                           loadingProgress = 0,
                                           // Whether a spin is running right now.
                                           //
                                           // This block used to unmount the moment
                                           // Spin was pressed, and that turned out
                                           // to be the whole of the surface's
                                           // vertical-balance problem. Measured at
                                           // 1920x897: the stage row holds 253px of
                                           // content at idle and 285px at the
                                           // result, leaving 115 and 84px of slack
                                           // under it — balanced against the 215px
                                           // of headroom above the reel. During a
                                           // spin it held 54px, so 314px of the
                                           // page fell empty, for four seconds, on
                                           // every single spin. The layout was
                                           // steady in every state a screenshot
                                           // usually catches and collapsed in the
                                           // one people actually watch.
                                           //
                                           // The rest of the surface already worked
                                           // this way — the reel goes dormant
                                           // rather than absent so its row cannot
                                           // collapse — and the stage was the one
                                           // row still swapping its contents out.
                                           // So the control stays put and goes
                                           // busy: same block, same height, button
                                           // disabled and reading "Spinning…". Its
                                           // disabled styling is flat and unlit, so
                                           // it recedes to make room for the reel
                                           // instead of competing with it.
                                           isSpinning = false,
                                       }) {
    const [isHovered, setIsHovered] = useState(false);
    // Keyboard focus was not a state this button had. Every lift, brightening,
    // rim and sweep below was keyed on `isHovered` alone, so tabbing to the
    // page's one verb changed nothing except the browser's default ring — which
    // this button's own `boxShadow` stack then largely buried. `active` is the
    // union, so the focused appearance is the hovered one and a keyboard user
    // gets the same affordance a mouse user does.
    const [isFocused, setIsFocused] = useState(false);
    // Held rather than left to `:active`, because the depression has to survive a
    // pointer that slides off mid-press and has to be releasable by the blur below.
    const [isPressed, setIsPressed] = useState(false);
    // `ready` is "this player could spin if the button were free"; `isDisabled`
    // is "the button is not free". They differ only while a spin is running, and
    // the split is what lets the secondary lines below stay on screen through the
    // spin — they describe the pool, not the button, and blanking them was half
    // of the height this block used to lose.
    const ready = !!user && allItems.length > 0 && !isLoading;
    const isDisabled = !ready || isSpinning;
    const active = (isHovered || isFocused) && !isDisabled;
    const pressed = isPressed && !isDisabled;
    const showRecursionEffects = recursionActive && recursionSpinsRemaining > 0;
    const showKotwLuckyEffects = kotwLuckySpins > 0 && !showRecursionEffects;
    const showAnyLuckyEffects = showRecursionEffects || showKotwLuckyEffects;

    // KOTW Theme colors - crimson/gold royal aesthetic.
    //
    // `KOTW_SLATE`, `luckyAccentColor` and `luckyPrimaryColor` were declared here
    // and read nowhere. The two lucky ones are worth a note because they are not
    // obviously dead: they compute exactly what `particleColor` and the KOTW
    // branches below compute inline, so they were a second source for the same
    // decision, quietly waiting to disagree with the first. `KOTW_SLATE` was
    // invisible to the linter because SCREAMING_CASE is exempt from
    // `no-unused-vars` here — worth knowing when hunting dead constants in this
    // codebase, since none of them will ever be reported.
    const KOTW_CRIMSON = '#F43F5E';
    const KOTW_GOLD = '#F59E0B';

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
            {/* The card, in its setting.
             *
             * 180px on desktop. Big enough that the illustration reads as an
             * illustration � its border, its title plate, the wheel motif � which
             * is the whole reason to use artwork rather than a glyph. The version
             * that lived inside a button at 46px did not have that and was noise;
             * shrinking a detailed drawing past the size it reads at does not make
             * a small version of it.
             *
             * The affordance is carried by behaviour, since the picture cannot
             * carry it: the card lifts and its glow widens under the cursor or
             * keyboard focus, presses in when held, and goes flat and dim when it
             * cannot be used. `cursor: pointer` and a real <button> do the rest.
             */}
            {/* Sized by the card, not by a number.
              *
              * This box was a fixed 130px square left over from when it held a
              * button, and the card is 180x253 — so the artwork overflowed it in
              * both directions and landed on top of the rarity legend below. A
              * container that does not contain its content is not a layout, and the
              * rings hanging off it are absolutely positioned against *this* box,
              * so a wrong size here also puts every ring off-centre.
              *
              * `width: fit-content` and no height: the card decides, everything
              * else is measured from it. */}
            <div style={{
                position: 'relative',
                width: 'fit-content',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                {/* Background aura */}
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
                    // Widens with the card rather than sitting still while the thing
                    // inside it moves. Transform only: a radial that large repainting
                    // on hover is the one expensive thing in this block.
                    scale: active ? '1.06' : '1',
                    transition: 'scale 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                    pointerEvents: 'none',
                }} />

                {/* Secondary aura ring */}
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
                    pointerEvents: 'none',
                }} />

                {!isMobile && (
                    <>
                        <OrbitalRing
                            size="220px"
                            color={showRecursionEffects ? COLORS.recursion : showKotwLuckyEffects ? KOTW_CRIMSON : COLORS.gold}
                            opacity={active ? 0.3 : 0.2}
                        />
                        <OrbitalRing
                            size="260px"
                            color={showRecursionEffects ? COLORS.recursion : showKotwLuckyEffects ? KOTW_GOLD : COLORS.purple}
                            opacity={active ? 0.22 : 0.15}
                        />
                        <OrbitalRing
                            size="300px"
                            color={showRecursionEffects ? COLORS.recursion : showKotwLuckyEffects ? KOTW_CRIMSON : COLORS.aqua}
                            opacity={active ? 0.16 : 0.1}
                        />
                    </>
                )}

                {!isMobile && Array.from({ length: 8 }).map((_, i) => (
                    <FloatingParticle key={i} index={i} color={particleColor} />
                ))}

                <button
                    onClick={onSpin}
                    disabled={isDisabled}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => { setIsFocused(false); setIsPressed(false); }}
                    onMouseDown={() => setIsPressed(true)}
                    onMouseUp={() => setIsPressed(false)}
                    aria-label={isLoading ? 'Loading items' : isSpinning ? 'Spinning' : 'Spin the wheel'}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        position: 'relative',
                        zIndex: 2,
                        lineHeight: 0,
                        outline: 'none',
                        // Lift and press, on one transform so they cannot fight.
                        // The lift is small: the card is already the largest thing
                        // in the stage and does not need to jump to be noticed.
                        transform: pressed
                            ? 'scale(0.97) translateY(1px)'
                            : active ? 'scale(1.05)' : 'scale(1)',
                        transition: 'transform 0.26s cubic-bezier(0.22, 1, 0.36, 1), filter 0.26s, opacity 0.26s',
                        // Disabled is the one state artwork cannot express by itself,
                        // so it is expressed here: desaturated and dimmed, with the
                        // caption below carrying the reason in words.
                        filter: isDisabled
                            ? 'grayscale(0.7) brightness(0.6)'
                            : active
                                ? `drop-shadow(0 6px 22px ${accentColor}66) drop-shadow(0 0 10px ${accentColor}55)`
                                : `drop-shadow(0 4px 14px ${accentColor}33)`,
                        opacity: isDisabled ? 0.6 : 1,
                    }}
                >
                    <img
                        src={WHEEL_TEXTURE_URL}
                        alt=""
                        aria-hidden="true"
                        draggable={false}
                        style={{
                            // 150, not the 180 this used to be. The card is 1.34x
                            // taller than it is wide, so its width is really a
                            // height decision: at 180 the block measured 367px
                            // against a stage row of exactly 367 and the keyboard
                            // hint sat on the viewport's bottom edge. The stage was
                            // roomier when 180 was chosen; the grid has taken that
                            // room back since, and the card is what has to give,
                            // because everything under it is text that cannot.
                            width: isMobile ? '130px' : '150px',
                            height: 'auto',
                            display: 'block',
                            // The card is 108x152 pixel art and is drawn here at
                            // 180px wide, a 1.67x upscale. Nearest neighbour is
                            // correct for that and smoothing would turn its hairline
                            // border to mush � the opposite call from the reel's
                            // sprites, which are downscaled. Same rule either way:
                            // interpolate when shrinking, never when enlarging.
                            imageRendering: 'pixelated',
                            userSelect: 'none',
                        }}
                    />
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
                            <div
                                role="progressbar"
                                aria-valuenow={clampedProgress}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label="Loading items"
                                style={{
                                    width: isMobile ? '140px' : '120px',
                                    height: '6px',
                                    background: 'rgba(255,255,255,0.1)',
                                    // 999px, the surface's ratified pill, rather
                                    // than the 3px that was here. On a 6px bar the
                                    // two are the same picture — a fully rounded
                                    // capsule — but 3px is a magic number that
                                    // happens to equal half the height, and would
                                    // stop being a capsule the moment the bar got
                                    // thicker. The pill is the shape being asked
                                    // for, so name the pill.
                                    borderRadius: '999px',
                                    overflow: 'hidden',
                                }}>
                                <div style={{
                                    // Full width, scaled from the left, rather than
                                    // a `width` percentage. Width is a layout
                                    // property and this updates on every progress
                                    // tick during the one moment the page is already
                                    // busy loading ~1,500 sprites; a transform is
                                    // composited and costs neither layout nor paint.
                                    // The gradient compresses with the fill, so gold
                                    // still meets orange at the leading edge.
                                    width: '100%',
                                    height: '100%',
                                    transformOrigin: 'left center',
                                    transform: `scaleX(${clampedProgress / 100})`,
                                    background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.orange})`,
                                    borderRadius: '999px',
                                    transition: 'transform 0.15s ease-out',
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
                                    // The KOTW branch is gone: the count now lives
                                    // in the status bar's payout chip, and having
                                    // it here as well was the same number twice on
                                    // one screen. The sub-line below still says
                                    // "Equal odds! KING OF THE WHEEL", which is the
                                    // part this line was actually carrying — what
                                    // the next spin will do, not how many you hold.
                                    //
                                    // Recursion keeps its branch above: those spins
                                    // are a mode rather than an event payout and
                                    // are not shown in the status bar.
                                    : showKotwLuckyEffects
                                        ? null
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
                    {/* The pool size is back here, and back for the same reason it
                        left. It moved onto the drawn button because that was where
                        the eye already was; with the card as the control there is
                        no readout surface to put it on — writing over artwork is
                        how you ruin artwork — so it returns to the caption, which
                        is what captions are for.

                        Held on `ready` with `visibility` rather than a conditional,
                        so the line never collapses and takes the legend below it up
                        the page. */}
                    {!showAnyLuckyEffects && (
                        <span style={{
                            visibility: ready ? 'visible' : 'hidden',
                            fontVariantNumeric: 'tabular-nums',
                        }}>
                            {/* Explicitly en-US, not the visitor's locale. Bare
                                `toLocaleString()` follows the browser, and on a
                                German one this rendered "1.559 items" — a dot group
                                that reads as a decimal point to the English-speaking
                                audience this site is written for, turning 1,559
                                items into roughly one and a half. PRODUCT.md commits
                                to English only, so the number format is part of the
                                copy, not part of the environment. */}
                            {totalItemCount
                                ? `Win one of ${totalItemCount.toLocaleString('en-US')} items`
                                : 'Good luck'}
                        </span>
                    )}
                </div>

                {/* Rarity Indicators. Derived from the shared ladder — this was
                    four hardcoded rows with legendary on purple, which is
                    exotic's colour, and no exotic row at all. */}
                {!showAnyLuckyEffects && allItems.length > 0 && !isMobile && (
                    <RarityLegend style={{ marginBottom: '12px' }} />
                )}

                {/* Keyboard Hint - Desktop Only */}
                {!isMobile && user && allItems.length > 0 && <KeyboardHint />}

                {/* Error Display */}
                {/* `role="alert"` because this appears in response to an action
                    the player just took and is the only report they get that it
                    failed. The warning glyph is a drawn icon rather than the ⚠️
                    emoji it used to be: the emoji rendered in whichever colour
                    font the OS supplied, so on the one element in the block that
                    is deliberately red, the icon beside the message was yellow. */}
                {error && (
                    <div role="alert" style={{
                        marginTop: '16px',
                        padding: '12px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: `linear-gradient(135deg, ${COLORS.red}22 0%, ${COLORS.red}11 100%)`,
                        border: `1px solid ${COLORS.red}44`,
                        borderRadius: '10px',
                        color: COLORS.red,
                        fontSize: '13px',
                        fontWeight: '500',
                        animation: 'slideUp 0.3s ease-out',
                    }}>
                        <AlertTriangle size={15} style={{ flexShrink: 0 }} aria-hidden="true" />
                        <span>{error}</span>
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
