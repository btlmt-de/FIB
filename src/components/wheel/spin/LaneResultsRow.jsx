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
import { LANE_SEAM } from './SpinLanes.jsx';

/**
 * A common in a triple-lucky spin is not a grey common.
 *
 * The reel paints it green — `isLuckySpin` is what tells `drawItem` that every
 * tile in a lucky strip is worth the same, so the whole band goes green — and
 * for one build the readout under it called the same item grey. The mode's
 * identity has to survive the trip down to the answer: the band and its answer
 * are one object, and the moment they disagree about a colour the reader stops
 * believing either.
 *
 * Only the triple applies it. The 5x is an ordinary-odds spin whose commons are
 * genuinely grey in the band, so gilding them here — which an earlier version
 * did — invented a distinction the reel never made.
 */
function modeCommonColor(rarity, isTripleLucky) {
    return rarity === 'common' && isTripleLucky ? COLORS.green : null;
}

/**
 * The 5x / triple readout: one answer per track, standing under its own track.
 *
 * ── WHAT THIS REPLACED, AND WHY (2026-08-19, owner review) ───────────────────
 *
 * It was a centred, wrapping row of plaques: square plinths in the deck's grain
 * with a lit rail on top, a floating tier pill, a filled chance chip and a NEW
 * chip. Two things were wrong with it and they were the same thing twice.
 *
 * **It had no positional relationship to the lanes.** Five columns of light land
 * in five places and five plaques appeared in one centred cluster somewhere
 * below, so the reader had to re-pair them by rarity colour — which is exactly
 * the work the layout should have done. The plaques share the tracks' grid now:
 * one column per track, the same `flex: 1` and the same seam width, so answer N
 * is *under* track N and the pairing costs nothing.
 *
 * **It was a box under a band whose whole argument is that rarity is light.**
 * The plinth register was ratified here before the lanes filled the band, and
 * once a column can sit directly under its own track there is a better device
 * already ratified one panel over: `SpinResult` continues the winner's column
 * downward as a shaft of tier light, so the payoff reads as the consequence of
 * the spin rather than a receipt printed after it. That is what this does now,
 * five times — five shafts continuing out of five tracks — and the deck grain,
 * the rail and the three pills are gone with the boxes they were decorating.
 * The grammar is `SpinResult`'s at track scale, deliberately, so the surface
 * speaks one language whether it answered once or five times.
 *
 * DESIGN.md §8's earlier note ("plaques are the signboard register: square, the
 * deck's grain, a lit rail in the item's own ink") is superseded by this and has
 * been rewritten there rather than deleted — the signboard register is still
 * right for the *bonus board's* answer, which names an event rather than an item.
 *
 * ── MOBILE IS ROWS, NOT COLUMNS ──────────────────────────────────────────────
 *
 * A track on a phone is ~70px wide, and a column that narrow cannot carry a
 * Minecraft item name at any size above the surface's 10px floor — "Waxed
 * Oxidized Cut Copper Stairs" in a 70px column is either four lines of 8px type
 * or an ellipsis. So mobile keeps the answers as full-width rows in lane order,
 * each led by a tick of its track's own light. Top-to-bottom against
 * left-to-right is a rotation, and it is the cheaper one: the alternative was
 * type nobody can read.
 */
export function LaneResultsRow({
    items = [],
    isTripleLucky = false,
    isMobile = false,
    isNew = [],
    laneCount = 5,
}) {
    const present = items.filter(Boolean);
    if (present.length === 0) return null;

    if (isMobile) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                gap: `${SPACE.sm}px`,
                paddingTop: `${SPACE.sm}px`,
            }}>
                {present.map((item, idx) => (
                    <LaneAnswerRow
                        key={idx}
                        item={item}
                        index={idx}
                        isNewItem={isNew[idx] === true}
                        isTripleLucky={isTripleLucky}
                    />
                ))}
            </div>
        );
    }

    const seam = LANE_SEAM(false);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'stretch',
            width: '100%',
            // No padding-top: the shafts start at this row's top edge, which is
            // the underside of the band, so the light has to be continuous
            // across the seam. The breathing room is inside each column.
        }}>
            {present.map((item, idx) => (
                <React.Fragment key={idx}>
                    <LaneAnswerColumn
                        item={item}
                        index={idx}
                        isNewItem={isNew[idx] === true}
                        isTripleLucky={isTripleLucky}
                        laneCount={laneCount}
                    />
                    {idx < present.length - 1 && (
                        /* The track seam, continuing past the deck and dying.
                           The mirror of the seam in the band above, which is
                           nothing at the top and full at the floor: down here
                           the light comes from the deck, so the cut is full at
                           the top and gone a third of the way down. It is what
                           holds the five columns in register once the plinths
                           are gone. */
                        <div aria-hidden="true" style={{
                            alignSelf: 'stretch',
                            flex: `0 0 ${seam}px`,
                            width: `${seam}px`,
                            // Built from `seam` rather than hardcoded stops: the
                            // channel widened from 3px to 7px on review and a
                            // gradient written against the old width left four
                            // transparent pixels in the middle of the cut.
                            background: `linear-gradient(90deg, rgba(0,0,0,0.42) 0 1px, rgba(0,0,0,0.58) 1px ${seam - 1}px, rgba(190,198,220,0.14) ${seam - 1}px ${seam}px)`,
                            WebkitMaskImage: 'linear-gradient(180deg, #000 0%, rgba(0,0,0,0.3) 22%, transparent 44%)',
                            maskImage: 'linear-gradient(180deg, #000 0%, rgba(0,0,0,0.3) 22%, transparent 44%)',
                        }} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

/**
 * One track's answer, desktop.
 *
 * Sized by the track count rather than by taste: three tracks get ~638px each
 * at 1920 and five get ~381px, so the triple runs a step larger everywhere. It
 * is also the honest read — fewer spins, bigger payoff.
 */
function LaneAnswerColumn({ item, index, isNewItem, isTripleLucky, laneCount }) {
    const rarity = getItemRarity(item);
    const iridescent = isIridescentRarity(rarity);
    const modeCommon = modeCommonColor(rarity, isTripleLucky);
    const tierColor = modeCommon || getRarityColor(rarity);
    const tierInk = modeCommon || getRarityInk(rarity);
    // The flat hue for the pieces that cannot take a gradient. Insane's `color`
    // is the near-white platinum fallback — right for a badge, useless as light
    // — so it borrows the slick's opening stop instead, the same correction
    // SpinResult documents.
    const tierGlow = iridescent ? COLORS.insaneHolo[0] : tierColor;

    const wide = laneCount <= 3;
    const itemPx = wide ? 84 : 64;
    // Item names run from "Dirt" to "Waxed Oxidized Cut Copper Stairs". The
    // column is narrow enough that the long end has to wrap rather than step
    // down as far as SpinResult's does — two balanced lines beat one line of
    // 11px type.
    const nameSize = wide ? '19px' : '15px';

    // Only the 5x shows a drop rate: the triple lucky is an equal-chance roll
    // and printing the pool's own odds beside it would be a different number
    // answering a different question.
    const chance = !isTripleLucky && item.chance != null ? formatChance(item.chance) : null;

    return (
        <div style={{
            position: 'relative',
            flex: '1 1 0',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            paddingTop: `${SPACE.md}px`,
            paddingLeft: '10px',
            paddingRight: '10px',
            paddingBottom: `${SPACE.sm}px`,
            // Lane order, at the cadence the lanes themselves landed in.
            animation: `textFadeUp 0.42s cubic-bezier(0.22, 1, 0.36, 1) ${index * 0.07}s both`,
        }}>
            {/* The shaft, continuing out of this column's track. Widest where it
                leaves the band and thinning into the page, the mirror of the
                column above, which is brightest at its floor. */}
            <div
                aria-hidden="true"
                className={iridescent ? 'fib-holo' : undefined}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '112%',
                    height: wide ? '190px' : '150px',
                    ...(iridescent
                        ? {
                            opacity: 0.3,
                            WebkitMaskImage: 'radial-gradient(ellipse 56% 100% at 50% 0%, #000 0%, rgba(0,0,0,0.32) 45%, transparent 78%)',
                            maskImage: 'radial-gradient(ellipse 56% 100% at 50% 0%, #000 0%, rgba(0,0,0,0.32) 45%, transparent 78%)',
                        }
                        : { background: `radial-gradient(ellipse 56% 100% at 50% 0%, ${tierColor}33 0%, ${tierColor}12 45%, transparent 78%)` }),
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
                gap: '6px',
            }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                    {getRarityIcon(rarity, wide ? 14 : 12)}
                </span>
                <span
                    className={iridescent ? 'fib-holo' : undefined}
                    style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
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
            </div>

            {/* The item, standing in its own light. */}
            <div style={{
                position: 'relative',
                zIndex: Z.content,
                width: `${itemPx}px`,
                height: `${itemPx}px`,
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
                        opacity: iridescent ? 0.8 : 0.4,
                        filter: iridescent ? 'blur(8px)' : 'blur(12px)',
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
                    src={getItemImageUrl(item)}
                    alt={item.name}
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        imageRendering: 'pixelated',
                        filter: `drop-shadow(0 0 14px ${tierGlow}99) drop-shadow(0 5px 8px rgba(0,0,0,0.55))`,
                    }}
                />
            </div>

            {/* Floor. The pool the item stands in, so it is grounded in this
                column rather than floating in the middle of it. */}
            <div
                aria-hidden="true"
                className={iridescent ? 'fib-holo' : undefined}
                style={{
                    width: `${Math.round(itemPx * 1.5)}px`,
                    maxWidth: '100%',
                    height: wide ? '10px' : '8px',
                    marginTop: '-4px',
                    borderRadius: '50%',
                    ...(iridescent
                        ? {
                            WebkitMaskImage: 'radial-gradient(ellipse at center, #000 0%, rgba(0,0,0,0.33) 38%, transparent 72%)',
                            maskImage: 'radial-gradient(ellipse at center, #000 0%, rgba(0,0,0,0.33) 38%, transparent 72%)',
                        }
                        : { background: `radial-gradient(ellipse at center, ${tierColor} 0%, ${tierColor}55 38%, transparent 72%)` }),
                    boxShadow: `0 0 20px ${tierGlow}55`,
                    pointerEvents: 'none',
                }}
            />

            {/* Name. Two balanced lines at most — the column is the width, so a
                long name wraps rather than being cut with an ellipsis the way
                the old fixed-width plaque cut it. */}
            <div style={{
                position: 'relative',
                zIndex: Z.content,
                marginTop: '4px',
                fontSize: nameSize,
                fontWeight: 800,
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
                textAlign: 'center',
                color: COLORS.text,
                textShadow: `0 0 24px ${tierGlow}55`,
                textWrap: 'balance',
                maxWidth: '100%',
            }}>
                {item.name}
            </div>

            {(chance || isNewItem) && (
                <div style={{
                    position: 'relative',
                    zIndex: Z.content,
                    display: 'flex',
                    alignItems: 'center',
                    gap: `${SPACE.sm}px`,
                    marginTop: '2px',
                }}>
                    {/* The rate as type, not as a chip. SpinResult's 999px pill
                        is the surface's "this is a figure to screenshot" shape
                        and it is a single object on a single answer; five of
                        them in a row would turn the readout back into the pill
                        rack this replaced. Tier ink because it is text. */}
                    {chance && (
                        <span style={{
                            fontSize: wide ? '13px' : '12px',
                            fontWeight: 700,
                            color: tierInk,
                            fontVariantNumeric: 'tabular-nums',
                            textShadow: `0 0 14px ${tierGlow}44`,
                        }}>
                            {chance}%
                        </span>
                    )}
                    {isNewItem && <NewFlag />}
                </div>
            )}
        </div>
    );
}

/** One track's answer, mobile: a full-width row led by its track's light. */
function LaneAnswerRow({ item, index, isNewItem, isTripleLucky }) {
    const rarity = getItemRarity(item);
    const iridescent = isIridescentRarity(rarity);
    const modeCommon = modeCommonColor(rarity, isTripleLucky);
    const tierColor = modeCommon || getRarityColor(rarity);
    const tierInk = modeCommon || getRarityInk(rarity);
    const tierGlow = iridescent ? COLORS.insaneHolo[0] : tierColor;
    const chance = !isTripleLucky && item.chance != null ? formatChance(item.chance) : null;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            paddingRight: '4px',
            animation: `textFadeUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${index * 0.07}s both`,
        }}>
            {/* The track's tick: this row's link back to the lane it came from,
                in that lane's own light. Not a card's accent border — there is
                no card here; it is the shaft, seen end-on. */}
            <div
                aria-hidden="true"
                className={iridescent ? 'fib-holo' : undefined}
                style={{
                    flex: '0 0 3px',
                    width: '3px',
                    alignSelf: 'stretch',
                    minHeight: '34px',
                    ...(iridescent ? {} : { background: tierColor }),
                    boxShadow: `0 0 10px ${tierGlow}88`,
                }}
            />

            <div style={{
                position: 'relative',
                flex: '0 0 34px',
                width: '34px',
                height: '34px',
                display: 'grid',
                placeItems: 'center',
            }}>
                <div
                    aria-hidden="true"
                    className={iridescent ? 'fib-holo' : undefined}
                    style={{
                        position: 'absolute',
                        inset: '-14%',
                        borderRadius: '50%',
                        opacity: iridescent ? 0.75 : 0.36,
                        filter: 'blur(8px)',
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
                    src={getItemImageUrl(item)}
                    alt={item.name}
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        imageRendering: 'pixelated',
                        filter: `drop-shadow(0 0 8px ${tierGlow}88)`,
                    }}
                />
            </div>

            <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                <div style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: COLORS.text,
                    lineHeight: 1.25,
                }}>
                    {item.name}
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '2px',
                }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                        {getRarityIcon(rarity, 11)}
                    </span>
                    <span
                        className={iridescent ? 'fib-holo' : undefined}
                        style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            letterSpacing: '0.14em',
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
                    {chance && (
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: tierInk,
                            fontVariantNumeric: 'tabular-nums',
                        }}>
                            {chance}%
                        </span>
                    )}
                </div>
            </div>

            {isNewItem && <NewFlag />}
        </div>
    );
}

/** The same NEW marker the payoff panel uses, so the flag means one thing. */
function NewFlag() {
    return (
        <span style={{
            flex: '0 0 auto',
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
    );
}

export default LaneResultsRow;
