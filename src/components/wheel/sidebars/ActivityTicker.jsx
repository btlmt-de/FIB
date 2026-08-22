import React, { useEffect, useMemo, useReducer } from 'react';
import { COLORS, SPACE } from '../config/constants';
import { Radio } from 'lucide-react';
import { formatTimeAgo, parseServerDate, getItemImageUrl, getDiscordAvatarUrl } from '../../../utils/helpers.js';
import { getRarityIcon, getRarityColor, getRarityInk } from '../../../utils/rarityHelpers.jsx';
import { useActivity } from '../../../context/ActivityContext.jsx';
import { visibleInterval } from '../../../config/power.js';

/**
 * Live drops as a horizontal strip above the reel.
 *
 * The vertical `ActivityFeedSidebar` still exists and is what the mobile drawer
 * opens — this is the desktop presentation, not a replacement. The reason for two
 * is layout, not taste: a 380px column beside the reel is 380px the reel cannot
 * have, and the reel is the page. Moved above it as a strip, the feed costs ~86px
 * of a dimension the page has to spare and gives back a dimension it does not.
 *
 * A strip also changes what the feed is *for*. A tall column invites reading down
 * a history; this is glanced at. So the text is cut back — no absolute
 * timestamps, no All/Mythic tab, one line of name and one of item — and the tier
 * carries the weight instead. That is the right trade only if the tier is
 * legible at a glance, which is what the styling below is for.
 *
 * That cut went one item too far. "No absolute timestamps" is right; no timestamp
 * at all is not, because without one the strip cannot answer whether it is showing
 * the last five minutes or the last five hours — and on a quiet server those look
 * identical. A relative age is back, compact, on the line that already exists.
 *
 * Deliberately NOT auto-scrolling. A marquee makes the newest drop a moving
 * target and needs a `prefers-reduced-motion` alternative that ends up being this
 * anyway; entries appear at the left and push the rest along.
 */

/**
 * Per-tier presentation, ported from the sidebar's rows.
 *
 * The first version of this strip flattened every tier to `${color}12` fill and
 * `${color}33` border, and an insane pull ended up looking like a common with a
 * different hue — which is a real loss, because the tier IS the news. Everything
 * the sidebar used to separate tiers is back: the oil-slick fill and drifting
 * `.fib-holo` overlay for insane, the cool-band gradient for mythic, tier-tinted
 * glow on the avatar, and the item name in its `ink` step with a matching
 * text-shadow.
 *
 * What is deliberately NOT ported is the sidebar's per-tier *geometry* — its
 * 12/11/10px padding, 34/32/30px avatars and 13/12.5/12px type. A 1px padding
 * step is below the threshold at which anyone reads it as hierarchy, but it does
 * give every row a different height, which in a horizontal strip means tiles that
 * do not line up. Tiles here are one size and the tier is carried entirely by
 * colour, glow and the slick, which is the stronger signal anyway.
 */
function tierStyle(rarity) {
    const color = getRarityColor(rarity);
    const isInsane = rarity === 'insane';
    const isMythic = rarity === 'mythic';

    return {
        color,
        // `ink` rather than `color` for anything that is text: several tier
        // colours are Minecraft chat colours picked for a black chat box and fail
        // contrast on these panels. Icons count as text.
        ink: getRarityInk(rarity),
        isInsane,
        isMythic,
        // Insane carries all three slick hues even at ~7% alpha, so the tile is
        // identifiable as top tier before you read the icon.
        background: isInsane
            ? `linear-gradient(135deg, ${COLORS.insaneHolo[0]}1E, ${COLORS.insaneHolo[1]}12, ${COLORS.insaneHolo[2]}1E)`
            : isMythic
                ? `linear-gradient(135deg, ${COLORS.mythicCycle[0]}18, ${COLORS.mythicCycle[1]}0C)`
                : `linear-gradient(135deg, ${color}14, ${color}08)`,
        border: `1px solid ${color}${isInsane ? '55' : isMythic ? '45' : '30'}`,
        boxShadow: isInsane
            ? `0 4px 20px ${COLORS.insaneHolo[0]}28, inset 0 1px 0 ${COLORS.insaneFlat}25`
            : isMythic
                ? `0 4px 16px ${COLORS.aqua}18, inset 0 1px 0 ${COLORS.aqua}14`
                : `inset 0 1px 0 ${color}10`,
    };
}

/**
 * An age in the fewest characters that still say something: `now`, `4m`, `2h`,
 * `3d`.
 *
 * Not `formatTimeAgo`, which is the right wording everywhere else and the wrong
 * one here — "Just now" and "42s ago" are three to four times the width of the
 * thing they sit beside, on a line that is already carrying the username, in a
 * strip whose whole argument is that it is glanced at. Same instant, different
 * register. The parsing is shared (`parseServerDate`) so the two can never
 * disagree about *when*, only about how to say it.
 *
 * Seconds are deliberately not shown. They would demand a re-render every second
 * to stay honest, and a number ticking in the corner of ten tiles pulls the eye
 * away from the reel, which is the thing on this page worth watching. Under a
 * minute is `now` — true for the whole minute, and no refresh can make it a lie.
 */
function compactAge(dateString) {
    const date = parseServerDate(dateString);
    if (!date) return null;

    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'now';              // covers clock skew (negative) too
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
}

/** How often the ages are recomputed. Half the smallest unit they display. */
const AGE_REFRESH_MS = 30_000;

export function ActivityTicker({ onOpenFull }) {
    const { feed, initialized } = useActivity();

    // A relative time that never recomputes is a clock that stopped: the feed only
    // re-renders when a new drop arrives, so on a quiet server every tile would sit
    // at whatever it said when it was mounted. Half the display resolution means an
    // age is never wrong by a whole minute.
    const [, tickAges] = useReducer(n => n + 1, 0);
    useEffect(() => {
        // Not stretched in saver mode: the whole point of this timer is that an
        // age is never wrong by a whole minute, and a stretched one would be.
        // Visibility is the saving here - ages nobody is looking at do not need
        // recomputing, and one catch-up tick on return fixes them all at once.
        return visibleInterval(tickAges, AGE_REFRESH_MS);
    }, []);

    // Newest first, achievements excluded — they are not drops and have no item to
    // show. Capped at 10: beyond that they are off the right edge at any realistic
    // width, and rendering tiles nobody can see costs the same as tiles they can.
    const entries = useMemo(() => (
        (feed || [])
            .filter(e => e.event_type !== 'achievement_unlock')
            .slice(0, 10)
    ), [feed]);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: `${SPACE.md}px`,
            padding: `${SPACE.sm}px ${SPACE.lg}px`,
            minWidth: 0,
        }}>
            {/* Label — fixed, so the strip reads as a labelled rail rather than a
                loose row of chips that happens to start with an icon. */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
                color: COLORS.textMuted,
            }}>
                <Radio size={14} style={{ color: COLORS.green }} />
                <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                }}>
                    Live
                </span>
            </div>

            {/* `overflow: hidden` rather than `auto`: this is a glance surface, and
                a horizontal scrollbar under a ten-item strip is more chrome than
                the content it reveals. The mask fades the right edge so tiles look
                like they continue past the viewport rather than being chopped. */}
            <div style={{
                display: 'flex',
                alignItems: 'stretch',
                gap: '10px',
                overflow: 'hidden',
                flex: 1,
                minWidth: 0,
                maskImage: 'linear-gradient(90deg, #000 0%, #000 90%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(90deg, #000 0%, #000 90%, transparent 100%)',
            }}>
                {!initialized && (
                    <span style={{ fontSize: '12px', color: COLORS.textMuted, alignSelf: 'center' }}>
                        Connecting…
                    </span>
                )}
                {initialized && entries.length === 0 && (
                    <span style={{ fontSize: '12px', color: COLORS.textMuted, alignSelf: 'center' }}>
                        No drops yet — be the first.
                    </span>
                )}
                {entries.map(item => {
                    const t = tierStyle(item.item_rarity);
                    const age = compactAge(item.created_at);
                    return (
                        <div
                            key={item.id}
                            title={`${item.custom_username || 'Unknown'} got ${item.item_name} — ${formatTimeAgo(item.created_at)}`}
                            style={{
                                position: 'relative',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '9px',
                                padding: '8px 12px',
                                borderRadius: '12px',
                                background: t.background,
                                border: t.border,
                                boxShadow: t.boxShadow,
                                flexShrink: 0,
                                // No maxWidth, deliberately. It was 230px, which
                                // after the avatar, the sprite and the padding left
                                // the item name about 128px — under twenty
                                // characters, while Minecraft names run to "Waxed
                                // Oxidized Cut Copper Stairs" at thirty-two. So the
                                // strip routinely ellipsised the single most
                                // newsworthy word on the tile, and did it *more*
                                // often to the rarer, longer-named items.
                                //
                                // Tiles size to their content instead. A short name
                                // makes a narrow tile and more of them fit; a long
                                // one takes the room it needs. Nothing here is
                                // laid out in a grid, so there is no column for a
                                // wide tile to break, and the newest drop is
                                // leftmost and therefore never the one pushed out.
                            }}
                        >
                            {/* The oil-slick drifting across an insane tile. Shared
                                `.fib-holo` class, which also brings the
                                reduced-motion path with it: the gradient stays, the
                                drift stops. */}
                            {t.isInsane && (
                                <div className="fib-holo" style={{
                                    position: 'absolute',
                                    inset: 0,
                                    opacity: 0.16,
                                    mixBlendMode: 'screen',
                                    pointerEvents: 'none',
                                }} />
                            )}

                            <img
                                src={getDiscordAvatarUrl(item.discord_id, item.discord_avatar)}
                                alt=""
                                width={28}
                                height={28}
                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; }}
                                style={{
                                    borderRadius: '50%',
                                    flexShrink: 0,
                                    border: t.isInsane
                                        ? `2px solid ${t.color}`
                                        : t.isMythic
                                            ? `2px solid ${t.color}99`
                                            : `1.5px solid ${t.color}55`,
                                    boxShadow: t.isInsane
                                        ? `0 0 15px ${t.color}55`
                                        : t.isMythic
                                            ? `0 0 12px ${t.color}44`
                                            : `0 0 8px ${t.color}22`,
                                    position: 'relative',
                                    zIndex: 1,
                                }}
                            />

                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                position: 'relative',
                                zIndex: 1,
                            }}>
                                {/* Who and when, on one line. The age goes here
                                    rather than anywhere else on the tile because
                                    this line already exists, is already muted, and
                                    already holds the context rather than the news —
                                    so the age costs no height and competes with
                                    nothing. It is also the line that may still
                                    truncate: a Discord username runs to 32
                                    characters and is the least newsworthy thing
                                    here, so it is what gives way, never the item. */}
                                <span style={{
                                    display: 'flex',
                                    // Centre, not baseline: a padded pill sitting on
                                    // a text baseline hangs below the line it is on.
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: '11px',
                                    color: COLORS.textMuted,
                                    minWidth: 0,
                                }}>
                                    <span style={{
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '116px',
                                    }}>
                                        {item.custom_username || 'Unknown'}
                                    </span>
                                    {/* Same muted step as the username rather than
                                        a dimmer one. There is no step below
                                        `textMuted` on this palette, and inventing
                                        one would put 11px text under the 4.5:1
                                        floor PRODUCT.md commits to — `#888` on
                                        these tinted tiles is already near it. The
                                        separator does the demoting instead, which
                                        costs no contrast at all. */}
                                    {age && (
                                        <span style={{
                                            flexShrink: 0,
                                            whiteSpace: 'nowrap',
                                            color: COLORS.textMuted,
                                            fontVariantNumeric: 'tabular-nums',
                                        }}>
                                            · {age}
                                        </span>
                                    )}

                                    {/* Lucky drops say so in words. This was a bare
                                        `⚡` glyph sitting between the text and the
                                        sprite, which is a worse version of the same
                                        idea twice over: an unlabelled icon has to be
                                        learned before it means anything, and parked
                                        in the tile's own row it competed with the
                                        item name — the one thing on the tile that
                                        should win. On the context line it reads as
                                        what it is, a condition of the drop rather
                                        than part of the drop.
                                        The badge keeps `COLORS.green`, which is what
                                        the reel paints a lucky common. The sidebar's
                                        original used `#00FF00` — that is recursion's
                                        matrix green, a spin *mode*, and borrowing it
                                        here would have the ticker disagreeing with
                                        the reel about what lucky looks like. */}
                                    {item.is_lucky === 1 && (
                                        <span style={{
                                            flexShrink: 0,
                                            // 10px, one step up from the sidebar's
                                            // 9px. That 9px is recorded in DESIGN.md
                                            // §8 as tolerable only because it was a
                                            // glyph with no text beside it; this is
                                            // a word, and a word has to be read.
                                            fontSize: '10px',
                                            fontWeight: 700,
                                            lineHeight: 1,
                                            padding: '2px 5px',
                                            borderRadius: '4px',
                                            background: `linear-gradient(135deg, ${COLORS.green}33, ${COLORS.green}18)`,
                                            border: `1px solid ${COLORS.green}44`,
                                            color: COLORS.green,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.4px',
                                            textShadow: `0 0 6px ${COLORS.green}55`,
                                            whiteSpace: 'nowrap',
                                        }}>
                                            Lucky
                                        </span>
                                    )}
                                </span>
                                <span style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: '12.5px',
                                    fontWeight: t.isInsane ? 700 : 600,
                                    color: t.ink,
                                    textShadow: t.isInsane
                                        ? `0 0 10px ${t.color}66`
                                        : t.isMythic
                                            ? `0 0 8px ${t.color}55`
                                            : 'none',
                                    // One line, never clipped. The tile is what
                                    // gives now that it has no maxWidth.
                                    whiteSpace: 'nowrap',
                                }}>
                                    {getRarityIcon(item.item_rarity, 12)}
                                    <span>{item.item_name}</span>
                                </span>
                            </div>

                            <img
                                src={getItemImageUrl(item)}
                                alt=""
                                width={32}
                                height={32}
                                style={{
                                    imageRendering: 'pixelated',
                                    flexShrink: 0,
                                    position: 'relative',
                                    zIndex: 1,
                                    filter: t.isInsane
                                        ? `drop-shadow(0 0 8px ${COLORS.insaneHolo[1]}88)`
                                        : t.isMythic
                                            ? `drop-shadow(0 0 6px ${t.color}66)`
                                            : 'none',
                                }}
                            />
                        </div>
                    );
                })}
            </div>

            <button
                onClick={onOpenFull}
                style={{
                    flexShrink: 0,
                    alignSelf: 'center',
                    background: 'transparent',
                    // Signboard, not a box: the Nocturne has no frames, and this
                    // readout sits on the open street. One line of amber type that
                    // lights on hover keeps the affordance without drawing a box
                    // around it — the label column next door already anchors the
                    // strip.
                    border: 'none',
                    color: COLORS.textMuted,
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    padding: '7px 4px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = COLORS.gold; }}
                onMouseLeave={e => { e.currentTarget.style.color = COLORS.textMuted; }}
            >
                All drops
            </button>
        </div>
    );
}
