import React from 'react';
import { COLORS, SPACE, SURFACE_NOISE } from '../config/constants';
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
 * The phone's payoff: the winning row grows into the answer.
 *
 * ── WHY THERE IS NO PANEL BELOW THE REEL ─────────────────────────────────────
 *
 * Every other presentation of a result on this surface appears *underneath* the
 * reel, and on a phone that costs a row of the reel to hold it. The apron had to
 * be sized for the taller of two states — ~208px for the payoff against ~63px of
 * idle copy — so either the shaft lost 145px permanently, or the reel moved every
 * time a spin landed. The first spends the surface's whole point on a state that
 * lasts four seconds; the second moves the reel at the exact moment the player is
 * watching it.
 *
 * So the result is not a place. The landed row expands in situ and shows what it
 * won, and the pool keeps running above and below it — about a row and a half
 * each side at 390×800. The reel never moves and the apron never reserves.
 *
 * ── IT IS THE PAYOFF PANEL, NOT A CAPTION ────────────────────────────────────
 *
 * The first version of this laid the words out to the *side* of the canvas's own
 * sprite, so the row stayed its normal height and the text sat in the space
 * beside the item. It read as a label crowding the artwork rather than as a
 * result, which was the whole point of moving it here. Corrected on review: the
 * row grows to `HEIGHT` and takes `SpinResult`'s own stack — tier line, the item
 * large and centred in its light, the name, the drop rate — so a player meets the
 * same object on both breakpoints and learns it once. What changed is where it
 * lives, not what it is.
 *
 * The sprite is drawn here rather than left to the canvas underneath: at this
 * size it is 92px against the row's 90, and it needs its own pool and halo to sit
 * in the light rather than in front of it.
 *
 * ── IT IS A ROW, NOT A CARD ──────────────────────────────────────────────────
 *
 * No radius, no border, no floating. It is full-bleed across the shaft, carries
 * the band's own ground with the tier's light rising through it, and is closed
 * top and bottom by the same dark/lit hairline pair every row boundary uses — so
 * it reads as one of the shaft's own rows that has opened up, which is what it
 * is. The Nocturne has no cards and a payoff card is the one this surface would
 * most easily slip back into.
 */
export const SHAFT_RESULT_HEIGHT = 236;

export function ShaftResult({ result, isNewItem, prestigePull, collection, centerY }) {
    if (!result) return null;

    const rarity = getItemRarity(result);
    const iridescent = isIridescentRarity(rarity);
    const tierColor = getRarityColor(rarity);
    const tierInk = getRarityInk(rarity);
    // Insane's flat `color` is a near-white platinum — right for a badge, useless
    // as light — so the flat pieces borrow the slick's opening stop, the same
    // correction SpinResult documents.
    const tierGlow = iridescent ? COLORS.insaneHolo[0] : tierColor;

    const owned = collection?.[result.texture];
    const chance = result.equalChance != null
        ? `${formatChance(result.equalChance)}% · equal chance`
        : result.chance != null
            ? `${formatChance(result.chance)}% drop rate`
            : null;

    // Minecraft names run from "Dirt" to "Waxed Oxidized Cut Copper Stairs". The
    // steps are SpinResult's mobile ramp, one down, because this row is narrower
    // than the stage was.
    const nameLength = (result.name || '').length;
    const nameSize = nameLength > 24 ? '16px' : nameLength > 16 ? '18px' : '21px';

    return (
        <div
            style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: `${Math.round(centerY - SHAFT_RESULT_HEIGHT / 2)}px`,
                height: `${SHAFT_RESULT_HEIGHT}px`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                overflow: 'hidden',
                borderRadius: 0,
                pointerEvents: 'none',
                zIndex: 12,
                // ── It has to be made of the shaft, not laid on top of it ──────
                //
                // This was a flat `#0a0d18 -> #0d1322 -> #05060a` ramp and it read
                // as a panel pasted over the reel: the rows above and below carry
                // the deck's grain and their own seams, and against them a smooth
                // dark slab is obviously a different material. The whole claim of
                // the in-place result is that the row *opened*, and a row cannot
                // open into something the band is not made of.
                //
                // So it takes the same SURFACE_NOISE the console, the plinths and
                // the field share — the Nocturne's one wet-night grain — over the
                // band's own blue-hour ramp. Barely there by contract (4% baked
                // in): a material is felt, a pattern is seen.
                backgroundImage: `${SURFACE_NOISE}, linear-gradient(180deg, #0a0d18 0%, #0d1322 42%, #05060a 100%)`,
                // Closed top and bottom by the row-seam pair — dark under lit —
                // so the expansion reads as a row of the shaft, not a panel on it.
                boxShadow: [
                    'inset 0 1px 0 rgba(190,198,220,0.12)',
                    'inset 0 -1px 0 rgba(190,198,220,0.12)',
                    '0 -1px 0 rgba(0,0,0,0.5)',
                    '0 1px 0 rgba(0,0,0,0.5)',
                ].join(', '),
                animation: 'shaftResultOpen 0.34s cubic-bezier(0.22,1,0.36,1) both',
            }}
        >
            {/* The tier's light, filling the row from its floor. Insane takes the
                whole slick through .fib-holo and is masked into the same falloff
                the flat tiers get from their gradient — a sampled point would
                spend two thirds of every cycle impersonating another tier. */}
            <div
                aria-hidden="true"
                className={iridescent ? 'fib-holo' : undefined}
                style={{
                    position: 'absolute',
                    inset: 0,
                    ...(iridescent
                        ? {
                            opacity: 0.26,
                            WebkitMaskImage: 'radial-gradient(ellipse 62% 92% at 50% 100%, #000 0%, rgba(0,0,0,0.34) 46%, transparent 78%)',
                            maskImage: 'radial-gradient(ellipse 62% 92% at 50% 100%, #000 0%, rgba(0,0,0,0.34) 46%, transparent 78%)',
                        }
                        : { background: `radial-gradient(ellipse 62% 92% at 50% 100%, ${tierColor}3D 0%, ${tierColor}14 46%, transparent 78%)` }),
                    pointerEvents: 'none',
                }}
            />

            {/* Tier line. Icons count as text, so both take the ink step. */}
            <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: `${SPACE.sm}px`,
            }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                    {getRarityIcon(rarity, 13)}
                </span>
                <span
                    className={iridescent ? 'fib-holo' : undefined}
                    style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
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
                    {(RARITY[rarity] || RARITY.common).label}
                </span>
                {isNewItem && (
                    <span style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        padding: '2px 6px',
                        borderRadius: '5px',
                        background: `${COLORS.green}22`,
                        border: `1px solid ${COLORS.green}55`,
                        color: COLORS.green,
                    }}>
                        NEW
                    </span>
                )}
                <PrestigeFlag pull={prestigePull} itemName={result.name} compact />
            </div>

            {/* The item, standing in its light. */}
            <div style={{
                position: 'relative',
                width: '92px',
                height: '92px',
                display: 'grid',
                placeItems: 'center',
            }}>
                <div
                    aria-hidden="true"
                    className={iridescent ? 'fib-holo' : undefined}
                    style={{
                        position: 'absolute',
                        inset: '-16%',
                        borderRadius: '50%',
                        opacity: iridescent ? 0.85 : 0.42,
                        filter: iridescent ? 'blur(9px)' : 'blur(13px)',
                        ...(iridescent
                            ? {
                                WebkitMaskImage: 'radial-gradient(circle, #000 0%, transparent 68%)',
                                maskImage: 'radial-gradient(circle, #000 0%, transparent 68%)',
                            }
                            : { background: `radial-gradient(circle, ${tierColor} 0%, transparent 68%)` }),
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
                        filter: `drop-shadow(0 0 16px ${tierGlow}AA) drop-shadow(0 5px 9px rgba(0,0,0,0.55))`,
                    }}
                />
            </div>

            {/* Name. The answer to the only question the spin asked. */}
            <div style={{
                position: 'relative',
                fontSize: nameSize,
                fontWeight: 800,
                letterSpacing: '-0.01em',
                lineHeight: 1.14,
                textAlign: 'center',
                color: COLORS.text,
                textShadow: `0 0 24px ${tierGlow}55`,
                textWrap: 'balance',
                maxWidth: '88%',
            }}>
                {result.name}
            </div>

            {(chance || owned > 1) && (
                <div style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: `${SPACE.sm}px`,
                }}>
                    {chance && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 11px',
                            // The surface's "this is a figure to screenshot" pill,
                            // the one place DESIGN.md ratifies a 999px radius — and
                            // this is that figure, on the panel that owns it.
                            borderRadius: '999px',
                            background: `${tierGlow}1A`,
                            border: `1px solid ${tierGlow}4D`,
                            color: tierInk,
                            fontSize: '12px',
                            fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                            textShadow: `0 0 14px ${tierGlow}44`,
                        }}>
                            {chance}
                        </span>
                    )}
                    {owned > 1 && (
                        <span style={{ fontSize: '11px', color: COLORS.textMuted }}>
                            {owned} in collection
                        </span>
                    )}
                    <PrestigeCount pull={prestigePull} style={{ fontSize: '11px' }} />
                </div>
            )}
        </div>
    );
}

export default ShaftResult;
