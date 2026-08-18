import React from 'react';
import { BookOpen, Trophy } from 'lucide-react';
import { COLORS, SPACE, Z } from '../config/constants';
import { getDiscordAvatarUrl } from '../../../utils/helpers.js';
import { RARITY, RARITY_KEYS, getRarityIcon, getRarityInk } from '../../../utils/rarityHelpers.jsx';
import { useCollectionLeaderboard } from '../../../hooks/useCollectionLeaderboard.js';

/**
 * The two panels either side of the stage: your collection, and the standings.
 *
 * The stage is a full-width row with a centred result in it, so at 1920px several
 * hundred pixels sit empty on each side of the one thing anybody is looking at.
 * These fill it with the two destinations a player actually wants between spins —
 * and each one is *both* a readout and the way in, because a number you cannot act
 * on and a button that tells you nothing are the same waste of the same space.
 *
 * **They are the primary entry points, not a second set.** The topbar previously
 * carried a `BookOpen` icon for the collection and a leaderboard pill showing the
 * podium; both are gone, moved here. That follows the rule this page has already
 * applied twice — a Trophy button was deleted from the topbar for being "a second,
 * blanker entry point to the identical view", and the same objection would have
 * applied to these. A 19px icon in a crowded bar is also a weaker affordance than a
 * panel with your actual progress on it.
 *
 * **They do not touch the reel.** The two sidebars that used to flank the *band*
 * were removed so the reel could run the full width of the screen, and that is not
 * being undone: these live in the stage row underneath it. The reel keeps every
 * pixel it was given.
 *
 * Present at idle, through the spin and at the result, because a shortcut that
 * exists only in the seconds after a spin is not a shortcut. When a spin lands, the
 * collection panel gains one line about what the pull changed; nothing else moves.
 */

// 272, up from 208, to carry the per-player rarity tally. Measured rather than
// guessed: the stage is 1920 wide, the result's content is ~250px and a worst-case
// item name ("Waxed Oxidized Cut Copper Stairs", stepped down to 22px) about 420px,
// so each side has roughly 640px free. 272 uses well under half of that and still
// leaves ~350px of air between the panel and the payoff.
//
// Both panels take the same width even though the collection side needs less. Two
// panels of different widths flanking a centred object read as a mistake before
// they read as an optimisation.
const PANEL_WIDTH = 272;

function Panel({ side, label, icon, onClick, actionLabel, children }) {
    const [hovered, setHovered] = React.useState(false);
    const [focused, setFocused] = React.useState(false);
    const active = hovered || focused;

    return (
        <div style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            [side]: 'clamp(20px, 5vw, 96px)',
            width: `${PANEL_WIDTH}px`,
            zIndex: Z.content,
        }}>
            <button
                type="button"
                onClick={onClick}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                aria-label={actionLabel}
                style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    textAlign: 'left',
                    padding: `${SPACE.md}px`,
                    // No radius, no ring: the Nocturne's platform furniture is the
                    // band's deck material at rest — a square plinth, a lit rail
                    // along the top, station amber entering from the floor. It is
                    // the same machine as the reel above, not a card near it.
                    borderRadius: 0,
                    border: 'none',
                    cursor: 'pointer',
                    background: active
                        // Hover is light, not paint: the street glow's amber rises
                        // through the plinth instead of the slab changing colour.
                        ? 'linear-gradient(180deg, rgba(255,183,94,0.05), rgba(255,183,94,0) 55%), linear-gradient(180deg, #0d1322 0%, #0a0d18 100%)'
                        : 'linear-gradient(180deg, #0d1322 0%, #0a0d18 100%)',
                    boxShadow: [
                        `inset 0 1px 0 rgba(206,214,236,${active ? '0.16' : '0.09'})`,
                        `inset 0 -1px 0 ${COLORS.gold}${active ? '66' : '22'}`,
                    ].join(', '),
                    // No lift. The control is seated in the page the same way the
                    // spin card and the band are; hovering lights it.
                    transition: 'background 0.2s ease-out, box-shadow 0.2s ease-out',
                    outline: 'none',
                    color: 'inherit',
                }}
            >
                <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    color: active ? COLORS.gold : COLORS.textMuted,
                    transition: 'color 0.2s ease-out',
                }}>
                    {icon}
                    {label}
                </span>

                {children}
            </button>
        </div>
    );
}

/**
 * A player's collection by tier: how many distinct insane, mythic, legendary,
 * exotic and rare items they hold.
 *
 * The five slots are always rendered, with a muted dot where the count is zero,
 * because the tiers are a fixed ladder and a fixed ladder should line up between
 * rows. Dropping the empty ones would shift every badge left and make two rows
 * impossible to compare at a glance, which is the only reason to put them here.
 *
 * Icons and colour come from the shared ladder — `getRarityIcon` and
 * `getRarityInk`, never a local table. `ink` rather than `color` because these are
 * a glyph and a number read at 11px, and icons count as text: several of the
 * ladder's fills are Minecraft chat colours that fail contrast at this size.
 */
function RarityTally({ entry }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {RARITY_KEYS
                .filter(key => key !== 'common' && key !== 'event')
                .map(key => {
                    const count = entry[`${key}_count`] || 0;
                    const ink = getRarityInk(key);
                    return (
                        <span
                            key={key}
                            title={`${count} ${RARITY[key]?.label || key}`}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '11px',
                                fontVariantNumeric: 'tabular-nums',
                                color: count > 0 ? ink : COLORS.textMuted,
                                opacity: count > 0 ? 1 : 0.45,
                            }}
                        >
                            {getRarityIcon(key, 10)}
                            {count > 0 ? count : '·'}
                        </span>
                    );
                })}
        </div>
    );
}

/** One figure and its caption. The figure leads; the caption explains it. */
function Stat({ value, caption, tone }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <span style={{
                fontSize: '19px',
                fontWeight: 700,
                lineHeight: 1.1,
                color: tone || COLORS.text,
                fontVariantNumeric: 'tabular-nums',
            }}>
                {value}
            </span>
            <span style={{ fontSize: '11px', color: COLORS.textMuted }}>
                {caption}
            </span>
        </div>
    );
}

export function StageFlanks({
    // Result context — present only while a spin's result is on screen.
    showResultLine,
    isNewItem,
    owned,
    tierInk,
    // Always available.
    collectedCount,
    poolSize,
    userId,
    isMobile,
    onOpenCollection,
    onOpenLeaderboard,
}) {
    const { leaderboard, myRank } = useCollectionLeaderboard(userId);

    // Never on mobile. These exist because a wide stage has room beside a centred
    // panel; a phone has none, and the topbar keeps its own entry points there.
    if (isMobile) return null;

    const pct = poolSize > 0 ? Math.min(100, (collectedCount / poolSize) * 100) : 0;
    const topFive = leaderboard.slice(0, 5);

    return (
        <>
            <Panel
                side="left"
                label="Collection"
                icon={<BookOpen size={13} />}
                onClick={onOpenCollection}
                actionLabel="Open your collection book"
            >
                {/* The result line, and only this, comes and goes. It sits above
                    the standing figures rather than replacing them, so nothing
                    below it moves when a spin lands. */}
                {showResultLine && (
                    <Stat
                        value={isNewItem ? 'New' : 'Duplicate'}
                        caption={isNewItem ? 'first one you own' : `you now hold ${owned}`}
                        tone={isNewItem ? tierInk : COLORS.text}
                    />
                )}

                <Stat
                    value={`${collectedCount.toLocaleString('en-US')} / ${poolSize.toLocaleString('en-US')}`}
                    caption="items collected"
                />

                <div
                    role="progressbar"
                    aria-valuenow={Math.round(pct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Collection completion"
                    style={{
                        width: '100%',
                        height: '3px',
                        borderRadius: '999px',
                        background: 'rgba(206,214,236,0.10)',
                        overflow: 'hidden',
                    }}
                >
                    <div style={{
                        height: '100%',
                        width: '100%',
                        transformOrigin: 'left center',
                        transform: `scaleX(${pct / 100})`,
                        borderRadius: '999px',
                        background: COLORS.gold,
                        transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }} />
                </div>
            </Panel>

            <Panel
                side="right"
                label="Standings"
                icon={<Trophy size={13} />}
                onClick={onOpenLeaderboard}
                actionLabel="Open the full leaderboard"
            >
                {/* Five rows, by collection size — the board's default sort and the
                    one the rank means something for. Ranks six and below are what
                    the full board is for. */}
                {topFive.map((entry, i) => {
                    const isMe = userId != null && entry.id === userId;
                    return (
                        <div key={entry.id} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            minWidth: 0,
                        }}>
                            <span style={{
                                width: '13px',
                                flexShrink: 0,
                                fontSize: '11px',
                                fontWeight: 700,
                                fontVariantNumeric: 'tabular-nums',
                                color: i === 0 ? COLORS.gold : COLORS.textMuted,
                            }}>
                                {i + 1}
                            </span>
                            <img
                                src={getDiscordAvatarUrl(entry.discord_id, entry.discord_avatar)}
                                alt=""
                                width={18}
                                height={18}
                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; }}
                                style={{ borderRadius: '50%', flexShrink: 0 }}
                            />
                            <span style={{
                                flex: 1,
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '12px',
                                // Your own row is the one you are looking for, so it
                                // is the one that is not muted.
                                color: isMe ? COLORS.text : COLORS.textMuted,
                                fontWeight: isMe ? 700 : 400,
                            }}>
                                {entry.custom_username || 'Unknown'}
                            </span>
                            <span style={{
                                flexShrink: 0,
                                fontSize: '11px',
                                color: COLORS.textMuted,
                                fontVariantNumeric: 'tabular-nums',
                            }}>
                                {entry.unique_items?.toLocaleString('en-US')}
                            </span>
                        </div>

                        {/* Indented to start under the name, so the tallies form a
                            column of their own rather than restarting at the rank
                            number and colliding with it visually. */}
                        <div style={{ paddingLeft: '38px' }}>
                            <RarityTally entry={entry} />
                        </div>
                        </div>
                    );
                })}

                {/* Your own rank, but only when you are not already in the five
                    above — otherwise it is the same fact twice, and your row up
                    there is already the highlighted one. */}
                {myRank && myRank > 5 && (
                    <span style={{
                        fontSize: '11px',
                        color: COLORS.textMuted,
                        borderTop: '1px solid rgba(206,214,236,0.08)',
                        paddingTop: '7px',
                    }}>
                        You are <strong style={{ color: COLORS.text, fontWeight: 700 }}>#{myRank}</strong>
                    </span>
                )}
            </Panel>
        </>
    );
}

export default StageFlanks;
