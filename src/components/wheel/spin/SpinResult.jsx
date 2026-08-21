import React from 'react';
import { COLORS, SPACE, Z } from '../config/constants';
import { formatChance, getItemRarity, getItemImageUrl } from '../../../utils/helpers.js';
import {
    RARITY,
    getRarityColor,
    getRarityInk,
    getRarityIcon,
    isIridescentRarity,
} from '../../../utils/rarityHelpers.jsx';
import { PrestigeFlag, PrestigeCount } from './PrestigeFlag.jsx';

/**
 * The payoff panel: what you just won.
 *
 * Rebuilt for two reasons.
 *
 * The visual one: the reel above is now a band of light columns, and the result
 * was still a small bordered card with a tinted radial behind it. It read as a
 * different piece of software from the thing that produced it. This continues the
 * reel's language instead — the winner's column appears to carry on downward
 * through the panel, so the result looks like the consequence of the spin rather
 * than a receipt printed after it.
 *
 * The structural one: the old panel hand-wrote six near-identical rarity badges
 * inline, each with its own gradient, padding, font size and `getRarityOnColor`
 * call. That is precisely the duplication the rarity ladder exists to prevent,
 * and it had already drifted — the exotic badge blended purple into red, and the
 * legendary one had previously been half exotic's colour. Everything here reads
 * from RARITY via the shared helpers, so a tier is defined in exactly one place.
 */
export function SpinResult({
    result,
    isNewItem,
    prestigePull,
    collection,
    resultWasRecursionSpin,
    resultWasKotwLuckySpin,
    isMobile,
}) {
    if (!result) return null;

    const KOTW_CRIMSON = '#F43F5E';

    // Recursion and KOTW are spin *modes*, not tiers — they colour the panel
    // without claiming a rung on the ladder, which is why they override here
    // rather than being added to RARITY.
    const rarity = getItemRarity(result);
    const tierColor = resultWasRecursionSpin
        ? COLORS.recursion
        : resultWasKotwLuckySpin
            ? KOTW_CRIMSON
            : getRarityColor(rarity);
    const tierInk = resultWasRecursionSpin
        ? COLORS.recursion
        : resultWasKotwLuckySpin
            ? KOTW_CRIMSON
            : getRarityInk(rarity);
    const label = (RARITY[rarity] || RARITY.common).label;
    const iridescent = isIridescentRarity(rarity) && !resultWasRecursionSpin && !resultWasKotwLuckySpin;

    // The flat hue to use where this panel needs a colour and cannot take a
    // gradient — a text-shadow, a border, a tinted fill.
    //
    // For every tier but one that is simply `tierColor`. Insane is the exception
    // and it mattered more than it looks: its `color` is the near-white platinum
    // fallback, which is right for a badge and useless as light, so every element
    // here that reached for `tierColor` painted the game's rarest pull in grey.
    // The disc behind the sprite had already been given the slick; the beam, the
    // floor pool, the name's glow and the drop-rate chip had not. Four of the six
    // tinted elements on the payoff panel, so a 0.0001% drop landed looking
    // duller than the exotic that had just gone past it in the reel — the ladder
    // inverted at the exact moment it is supposed to pay out.
    //
    // Magenta is the slick's opening stop and the same one the sprite's own
    // drop-shadow already borrows, so the flat pieces agree with the animated
    // ones instead of drifting to a second colour.
    const tierGlow = iridescent ? COLORS.insaneHolo[0] : tierColor;

    // Minecraft item names run from "Dirt" to "Waxed Oxidized Cut Copper Stairs",
    // a 7x range, and one fixed size cannot serve both. Fixed steps rather than a
    // clamp() on viewport width: the constraint here is the length of this
    // particular name, not how wide the window is.
    //
    // Keeping it to one line matters more than it looks. The stage row is sized
    // to its content and currently fits exactly, so a second line of 30px type
    // would push the panel past the row and bring back the internal scrollbar
    // this layout exists to avoid.
    const nameLength = (result.name || '').length;
    const nameSize = isMobile
        ? (nameLength > 24 ? '17px' : nameLength > 16 ? '20px' : '22px')
        : (nameLength > 30 ? '22px' : nameLength > 22 ? '25px' : '30px');

    // A mirrored reflection sat under the item for a while and has been removed.
    // The floor pool below already does the grounding, and at the size this panel
    // runs the reflection mostly read as a smudge of duplicated pixels rather than
    // as a surface. Its height is back in the item, which is the thing worth
    // looking at.
    const itemPx = isMobile ? '92px' : '118px';

    const owned = collection?.[result.texture];
    const chance = result.equalChance != null
        ? `${formatChance(result.equalChance)}% · equal chance`
        : result.chance != null
            ? `${formatChance(result.chance)}% drop rate`
            : null;

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: isMobile ? `${SPACE.md}px` : `${SPACE.lg}px`,
            animation: 'textFadeUp 0.45s cubic-bezier(0.25,0.46,0.45,0.94) both',
        }}>
            {/* The winner's column, continuing. It starts at the panel's top edge
                — which is the underside of the reel — and falls away, so the eye
                reads one shaft of light running from the band down to the item.
                Widest at the top and fading out, the mirror of the column above,
                which is brightest at its floor. */}
            <div
                aria-hidden="true"
                // Insane takes the whole slick and is masked into the same
                // top-down falloff the flat tiers get from their gradient. A
                // sampled point off the ramp would have been the cheaper fix and
                // the wrong one — for two thirds of every cycle it lands on cyan
                // or gold, so the rarest pull in the game would spend most of the
                // payoff frame impersonating mythic or legendary.
                className={iridescent ? 'fib-holo' : undefined}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    // Wide enough to sit behind the name, not just the item. At
                    // 260px anything longer than about "Cyan Concrete" ran past
                    // the light and looked like it had escaped the panel — the
                    // beam has to be the widest thing here, because everything
                    // else is inside it.
                    width: isMobile ? '92vw' : '620px',
                    maxWidth: '96vw',
                    height: isMobile ? '150px' : '210px',
                    // An ellipse anchored on the top edge, not a linear fade down
                    // a rectangle.
                    //
                    // The linear version faded correctly downward and then simply
                    // stopped at its left and right edges, which at 620px wide is
                    // not a beam of light, it is a pale card sitting behind the
                    // item — and on a common pull, whose tier colour is a neutral
                    // grey, it read as exactly that: a grey box. The panel's whole
                    // argument is that rarity is light rather than a container,
                    // and the container was the biggest shape on it.
                    //
                    // Radial gives the horizontal falloff a shaft needs, so the
                    // light now spreads from the underside of the reel and thins
                    // out into the page on every side.
                    ...(iridescent
                        ? {
                            opacity: 0.34,
                            WebkitMaskImage: 'radial-gradient(ellipse 58% 100% at 50% 0%, #000 0%, rgba(0,0,0,0.34) 45%, transparent 78%)',
                            maskImage: 'radial-gradient(ellipse 58% 100% at 50% 0%, #000 0%, rgba(0,0,0,0.34) 45%, transparent 78%)',
                        }
                        : { background: `radial-gradient(ellipse 58% 100% at 50% 0%, ${tierColor}3D 0%, ${tierColor}14 45%, transparent 78%)` }),
                    filter: 'blur(1px)',
                    pointerEvents: 'none',
                    zIndex: Z.base,
                }}
            />

            {/* Tier line. One row, and the only place the tier is named. */}
            <div style={{
                position: 'relative',
                zIndex: Z.content,
                display: 'flex',
                alignItems: 'center',
                gap: `${SPACE.sm}px`,
                marginBottom: isMobile ? '10px' : '14px',
            }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                    {getRarityIcon(rarity, isMobile ? 13 : 15)}
                </span>
                <span
                    className={iridescent ? 'fib-holo' : undefined}
                    style={{
                        fontSize: isMobile ? '12px' : '13px',
                        fontWeight: 800,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        // Insane is the one tier with no flat colour, so its label
                        // takes the whole slick through the shared .fib-holo class
                        // rather than one sampled point off it — a single sample
                        // spends most of the cycle impersonating another tier.
                        ...(iridescent
                            ? {
                                WebkitBackgroundClip: 'text',
                                backgroundClip: 'text',
                                color: 'transparent',
                                WebkitTextFillColor: 'transparent',
                            }
                            : { color: tierInk }),
                    }}
                >
                    {/*
                      * "Lucky Spin", not the name of an event.
                      *
                      * This said "King of the Wheel" for every lucky spin a
                      * player had banked, and it was wrong for most of them:
                      * KOTW, First Blood and the Community Goal all pay into the
                      * same `users.lucky_spins` column, and none of them records
                      * which event the credit came from. So a player who earned
                      * their spins from the community goal was told, at the
                      * moment of the payoff, that they had won a competition
                      * they may never have entered.
                      *
                      * The panel cannot name the source because the data does
                      * not carry it. It CAN name what the spin is, which is true
                      * of all three — and a label that is right every time beats
                      * one that is specific and wrong most of the time. Naming
                      * the source needs a column on `users` (or a small ledger),
                      * and is worth doing the day the payouts are worth
                      * distinguishing.
                      */}
                    {resultWasRecursionSpin ? 'Recursion' : resultWasKotwLuckySpin ? 'Lucky Spin' : label}
                </span>
                {isNewItem && (
                    <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        padding: '3px 7px',
                        borderRadius: '5px',
                        background: `${COLORS.green}22`,
                        border: `1px solid ${COLORS.green}55`,
                        color: COLORS.green,
                    }}>
                        NEW
                    </span>
                )}
                {/* The prestige twin. During a run the green NEW above can never
                    light — you prestige with a complete collection, so every pull
                    is a main-collection duplicate by definition — and this badge
                    carries the meaning instead. */}
                <PrestigeFlag pull={prestigePull} itemName={result.name} />
            </div>

            {/* The item, standing in the light.
             *
             * It used to be a CanvasResultItem: a rounded box with a tier border,
             * a fill and an animated rim. That component is still right for the
             * 3x/5x grids, where several items sit side by side and need frames to
             * be told apart — but here there is exactly one item, and framing it
             * put a box back on a page whose whole visual argument is that rarity
             * is light rather than a box around something.
             *
             * So the frame is gone and the presentation matches the reel: a pool
             * of tier light on the floor, the item standing in it, and its own
             * reflection falling away underneath. Insane keeps its slick through
             * the shared .fib-holo class behind the sprite, which is also how it
             * inherits the reduced-motion behaviour.
             */}
            <div style={{
                position: 'relative',
                zIndex: Z.content,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                animation: 'itemBoxReveal 0.5s cubic-bezier(0.25,0.46,0.45,0.94) 0.1s both',
            }}>
                <div style={{
                    position: 'relative',
                    width: itemPx,
                    height: itemPx,
                    display: 'grid',
                    placeItems: 'center',
                }}>
                    {/* The tier's light behind the item. For insane this is the
                        drifting slick, masked to a soft disc so it reads as glow
                        rather than as a rectangle sitting behind the sprite. */}
                    <div
                        aria-hidden="true"
                        className={iridescent ? 'fib-holo' : undefined}
                        style={{
                            position: 'absolute',
                            inset: '-18%',
                            borderRadius: '50%',
                            // Insane runs hotter and tighter than the flat tiers.
                            // Its `color` is the near-white platinum fallback —
                            // correct for a badge, useless as a glow — so for this
                            // tier the light has to come from the slick itself,
                            // and it needs enough opacity and little enough blur
                            // to still read as magenta/cyan/gold rather than as a
                            // white haze.
                            opacity: iridescent ? 0.85 : 0.42,
                            filter: iridescent ? 'blur(9px)' : 'blur(14px)',
                            ...(iridescent ? {} : { background: `radial-gradient(circle, ${tierColor} 0%, transparent 68%)` }),
                            ...(iridescent ? {
                                WebkitMaskImage: 'radial-gradient(circle, #000 0%, transparent 68%)',
                                maskImage: 'radial-gradient(circle, #000 0%, transparent 68%)',
                            } : {}),
                            pointerEvents: 'none',
                        }}
                    />

                    <img
                        src={getItemImageUrl(result)}
                        alt={result.name}
                        style={{
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            imageRendering: 'pixelated',
                            // The sprite's halo takes a real hue for insane. CSS
                            // drop-shadow cannot take a gradient, so it borrows the
                            // slick's magenta while the disc behind supplies the
                            // rest of the cycle.
                            filter: `drop-shadow(0 0 18px ${iridescent ? COLORS.insaneHolo[0] : tierColor}AA) drop-shadow(0 6px 10px rgba(0,0,0,0.55))`,
                        }}
                    />
                </div>

                {/* Floor. An elliptical pool rather than the reel's straight bar:
                    the reel's slots are columns in a row and share a floor line,
                    whereas this is one object standing on its own. */}
                <div
                    aria-hidden="true"
                    className={iridescent ? 'fib-holo' : undefined}
                    style={{
                        width: isMobile ? '132px' : '178px',
                        height: isMobile ? '10px' : '13px',
                        marginTop: isMobile ? '2px' : '4px',
                        borderRadius: '50%',
                        // Same split as the beam: the slick masked into the pool's
                        // shape for insane, a flat radial for every other tier.
                        ...(iridescent
                            ? {
                                WebkitMaskImage: 'radial-gradient(ellipse at center, #000 0%, rgba(0,0,0,0.33) 38%, transparent 72%)',
                                maskImage: 'radial-gradient(ellipse at center, #000 0%, rgba(0,0,0,0.33) 38%, transparent 72%)',
                            }
                            : { background: `radial-gradient(ellipse at center, ${tierColor} 0%, ${tierColor}55 38%, transparent 72%)` }),
                        boxShadow: `0 0 26px ${tierGlow}66`,
                        pointerEvents: 'none',
                    }}
                />

            </div>

            {/* Name. The largest text on the page at this moment, which is correct
                — it is the answer to the only question the spin asked. */}
            <h2 style={{
                position: 'relative',
                zIndex: Z.content,
                margin: `${isMobile ? 12 : 16}px 0 0`,
                fontSize: nameSize,
                fontWeight: 800,
                letterSpacing: '-0.01em',
                lineHeight: 1.15,
                textAlign: 'center',
                color: COLORS.text,
                textShadow: `0 0 30px ${tierGlow}55`,
                // Bounded so a long name wraps rather than widening the stage,
                // and balanced so if it does wrap the two lines come out even
                // instead of leaving one word stranded underneath.
                maxWidth: isMobile ? '90vw' : '600px',
                textWrap: 'balance',
            }}>
                {result.name}
            </h2>

            {/* Drop rate, and then everything else.
                
                These were one muted line together, which undersold the half that
                is actually the point. "0.0001% drop rate" is the brag — it is the
                number a player screenshots — while "12 in collection" is genuinely
                reference. Treating them as equal metadata made the interesting one
                disappear.
                
                So the rate gets its own chip in the tier's ink, sized to be read
                rather than found, and the collection count stays quiet beside it.
                Tier ink rather than the flat tier colour because this is text:
                several of the ladder's colours are Minecraft chat colours that
                fail contrast on these panels. */}
            {(chance || owned > 1 || (prestigePull && prestigePull.count > 1)) && (
                <div style={{
                    position: 'relative',
                    zIndex: Z.content,
                    display: 'flex',
                    alignItems: 'center',
                    gap: `${SPACE.sm}px`,
                    marginTop: '12px',
                }}>
                    {chance && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: isMobile ? '5px 11px' : '6px 14px',
                            borderRadius: '999px',
                            background: `${tierGlow}1A`,
                            border: `1px solid ${tierGlow}4D`,
                            color: tierInk,
                            fontSize: isMobile ? '13px' : '15px',
                            fontWeight: 700,
                            letterSpacing: '0.01em',
                            fontVariantNumeric: 'tabular-nums',
                            textShadow: `0 0 16px ${tierGlow}44`,
                        }}>
                            {chance}
                        </span>
                    )}
                    {owned > 1 && (
                        <span style={{
                            fontSize: isMobile ? '11px' : '12px',
                            color: COLORS.textMuted,
                        }}>
                            {owned} in collection
                        </span>
                    )}
                    <PrestigeCount
                        pull={prestigePull}
                        style={{ fontSize: isMobile ? '11px' : '12px' }}
                    />
                </div>
            )}
        </div>
    );
}
