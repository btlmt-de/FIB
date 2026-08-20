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

/**
 * The lucky spin's payoff, on the stage.
 *
 * The lucky spin is the same single-strip surface as a normal spin wearing the
 * green lamp, so its result is the same panel wearing it too: the winner's
 * column continuing down from the reel, the item standing in its tier's light.
 * The only additions are the mode's: the equal-chance chip in the lucky green,
 * and the tier label reads "Lucky" rather than the tier name — the equal-chance
 * roll is the story here, not the rarity.
 *
 * The old design boxed this in a rounded card with sparkles, corner icons and
 * floating particles; none of that survived the move to the band language.
 */
export function LuckyResultPanel({ result, isNewItem, collection, isMobile }) {
    if (!result) return null;

    const rarity = getItemRarity(result);
    const tierColor = rarity === 'common' ? COLORS.green : getRarityColor(rarity);
    const tierInk = rarity === 'common' ? COLORS.green : getRarityInk(rarity);
    const label = rarity === 'common' ? 'Lucky' : (RARITY[rarity] || RARITY.common).label;
    const iridescent = isIridescentRarity(rarity);
    const tierGlow = iridescent ? COLORS.insaneHolo[0] : tierColor;

    const nameLength = (result.name || '').length;
    const nameSize = isMobile
        ? (nameLength > 24 ? '17px' : nameLength > 16 ? '20px' : '22px')
        : (nameLength > 30 ? '22px' : nameLength > 22 ? '25px' : '30px');

    const itemPx = isMobile ? '92px' : '118px';
    const owned = collection?.[result.texture];

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
            <div
                aria-hidden="true"
                className={iridescent ? 'fib-holo' : undefined}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: isMobile ? '92vw' : '620px',
                    maxWidth: '96vw',
                    height: isMobile ? '150px' : '210px',
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
                    {label}
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
            </div>

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
                    <div
                        aria-hidden="true"
                        className={iridescent ? 'fib-holo' : undefined}
                        style={{
                            position: 'absolute',
                            inset: '-18%',
                            borderRadius: '50%',
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
                            filter: `drop-shadow(0 0 18px ${iridescent ? COLORS.insaneHolo[0] : tierColor}AA) drop-shadow(0 6px 10px rgba(0,0,0,0.55))`,
                        }}
                    />
                </div>

                <div
                    aria-hidden="true"
                    className={iridescent ? 'fib-holo' : undefined}
                    style={{
                        width: isMobile ? '132px' : '178px',
                        height: isMobile ? '10px' : '13px',
                        marginTop: isMobile ? '2px' : '4px',
                        borderRadius: '50%',
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
                maxWidth: isMobile ? '90vw' : '600px',
                textWrap: 'balance',
            }}>
                {result.name}
            </h2>

            {(result.equalChance != null || owned > 1) && (
                <div style={{
                    position: 'relative',
                    zIndex: Z.content,
                    display: 'flex',
                    alignItems: 'center',
                    gap: `${SPACE.sm}px`,
                    marginTop: '12px',
                }}>
                    {result.equalChance != null && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: isMobile ? '5px 11px' : '6px 14px',
                            borderRadius: '999px',
                            background: `${COLORS.green}1A`,
                            border: `1px solid ${COLORS.green}4D`,
                            color: COLORS.green,
                            fontSize: isMobile ? '13px' : '15px',
                            fontWeight: 700,
                            letterSpacing: '0.01em',
                            fontVariantNumeric: 'tabular-nums',
                            textShadow: `0 0 16px ${COLORS.green}44`,
                        }}>
                            {formatChance(result.equalChance)}% · equal chance
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
                </div>
            )}
        </div>
    );
}

export default LuckyResultPanel;