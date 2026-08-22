import React, { useState } from 'react';
import { BookOpen, Trophy } from 'lucide-react';
import { COLORS, SPACE, Z, SURFACE_NOISE } from '../config/constants';
import { getDiscordAvatarUrl } from '../../../utils/helpers.js';
import { RARITY, RARITY_KEYS, getRarityIcon, getRarityInk } from '../../../utils/rarityHelpers.jsx';
import { prestigeColor, prestigeInk, prestigeLabel, isIridescentPrestige, prestigeStanding } from '../../../utils/prestigeHelpers.js';
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

/**
 * A plinth you can press, with content inside it that may also be pressable.
 *
 * ── WHY THE CONTROL IS AN OVERLAY AND NOT THE PANEL ──────────────────────────
 *
 * The panel used to *be* a `<button>`, with the label, the stats and the
 * progress bar as its children. That broke twice over the moment the prestige
 * work put a scope toggle inside it:
 *
 *   1. **A `<button>` cannot contain a `<button>.`** It is invalid HTML, React
 *      logs a DOM nesting error on every mount, and the parser is free to hoist
 *      the inner control out of the outer one — so what the browser ends up with
 *      is not what the JSX says. The `stopPropagation` that used to sit on the
 *      toggle's wrapper was treating the click symptom of a structural problem.
 *   2. **`aria-label` on a button replaces everything inside it.** The panel
 *      announced as "Open your collection book, button" and nothing else: the
 *      held count, the completion figure and the progress bar were all
 *      unreachable to a screen reader. The numbers were the reason for the panel.
 *
 * So the plinth is a plain `<div>` again — it keeps every one of its styles,
 * because the material is the design — and the press target is a transparent
 * `<button>` stretched across it underneath the content. The content sits above
 * with `pointer-events: none`, so a click anywhere still lands on the overlay
 * and the whole panel is still one big target. Anything genuinely interactive
 * inside opts back in with `pointer-events: auto` and is now a *sibling* of the
 * press target rather than its descendant, which is what makes it reachable by
 * keyboard and legal as markup.
 *
 * Hover moves to the container so the plinth still lights from anywhere on it;
 * focus stays on the overlay, and lighting the rail is the focus indicator (the
 * same one the hover state uses — it is a 272px slab, not a 24px icon).
 */
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
            <div
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    position: 'relative',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    textAlign: 'left',
                    padding: `${SPACE.md}px`,
                    // No radius, no ring: the Nocturne's platform furniture is the
                    // band's deck material at rest — a square plinth, a lit rail
                    // along the top, station amber entering from the floor. It is
                    // the same machine as the reel above, not a card near it. The
                    // grain is SURFACE_NOISE, the concrete's own micro-glitter —
                    // it sits above the light layers so the amber still rises
                    // through it, and it never moves.
                    borderRadius: 0,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundImage: active
                        // Hover is light, not paint: the street glow's amber rises
                        // through the plinth instead of the slab changing colour.
                        ? `${SURFACE_NOISE}, linear-gradient(180deg, rgba(255,183,94,0.05), rgba(255,183,94,0) 55%), linear-gradient(180deg, #0d1322 0%, #0a0d18 100%)`
                        : `${SURFACE_NOISE}, linear-gradient(180deg, #0d1322 0%, #0a0d18 100%)`,
                    boxShadow: [
                        `inset 0 1px 0 rgba(206,214,236,${active ? '0.16' : '0.09'})`,
                        `inset 0 -1px 0 ${COLORS.gold}${active ? '66' : '22'}`,
                    ].join(', '),
                    // No lift. The control is seated in the page the same way the
                    // spin card and the band are; hovering lights it.
                    transition: 'background 0.2s ease-out, box-shadow 0.2s ease-out',
                    color: 'inherit',
                }}
            >
                {/* The press target. First in source order and at the bottom of
                    the stack, so the content paints over it — it is a hit area,
                    not a layer you can see. It carries the accessible name for
                    the action; the panel's numbers stay as readable content
                    beside it instead of being swallowed by an aria-label. */}
                <button
                    type="button"
                    onClick={onClick}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    aria-label={actionLabel}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 0,
                        border: 'none',
                        borderRadius: 0,
                        background: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        // The lit rail above IS the focus indicator, and it is
                        // driven by `focused`. A default ring would draw a second
                        // one inside the plinth's own edge.
                        outline: 'none',
                    }}
                />

                {/* Everything below is content over the hit area. `pointer-events:
                    none` is what keeps the whole 272px slab clickable — without
                    it the text would eat the clicks the overlay is there to
                    catch. Interactive children opt back in. */}
                <span style={{
                    position: 'relative',
                    zIndex: 1,
                    pointerEvents: 'none',
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

                <div style={{
                    position: 'relative',
                    zIndex: 1,
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                }}>
                    {children}
                </div>
            </div>
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

/**
 * The prestige ring around an avatar.
 *
 * One treatment: a solid ring in the level's own colour with a real bloom,
 * whether the level is earned or still being worked toward. The level itself is
 * the thing worth showing, and the ring shows it.
 *
 * ── THREE THINGS THIS WENT THROUGH, ALL RECORDED ────────────────────────────
 *
 * It first read only COMPLETED runs, and completing one means collecting all
 * 1,559 items a second time — so every player who had prestiged wore nothing at
 * all, and it was reported from production as prestige not showing up.
 *
 * Then in-progress was drawn dimmer: thinner ring, dimmer colour, weaker glow.
 * Reported as looking worse than the earned ring, which it did — dimming is the
 * wrong axis for "finished" versus "still going".
 *
 * Then in-progress was drawn as a dashed ring at full strength, which was
 * honest and legible and which the owner simply did not like. So the visual
 * distinction is gone: **earned and in-progress look identical**, and the
 * difference lives in the tooltip and in the leaderboard's own prestige column.
 * That is a deliberate trade, not an oversight — a player mid-run reads as
 * prestiged, because they are.
 *
 * The one thing that must never come back: `opacity` on this element. The avatar
 * is its child, so opacity dims the player's face along with the ring. Alpha
 * belongs in the colour.
 */
export function PrestigeRing({ standing, children, pad = 2 }) {
    const { level, earned } = standing;
    if (!level) return <>{children}</>;

    const holo = isIridescentPrestige(level);
    const tone = prestigeColor(level);

    return (
        <span
            className={holo ? 'fib-holo' : undefined}
            title={`${prestigeLabel(level)}${earned ? '' : ' — in progress'}`}
            style={{
                position: 'relative',
                zIndex: 2,
                flexShrink: 0,
                display: 'block',
                // `pad` IS the ring's thickness, and it is a prop because this
                // ring now goes on faces from 18px (a live-activity toast) to
                // 68px (the player board's head). 2px on an 18px avatar is a
                // fifth of its diameter — a ring that thick stops reading as a
                // frame around a face and starts reading as a coloured disc with
                // a face on it. The bloom scales with it for the same reason.
                padding: `${pad}px`,
                borderRadius: '50%',
                lineHeight: 0,
                // The ring only ever shows in the padding — the avatar covers the
                // middle — so this background IS the ring.
                background: holo ? undefined : tone,
                boxShadow: `0 0 ${pad * 4}px ${tone}AA`,
            }}
        >
            {children}
        </span>
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
    prestige,
    userId,
    isMobile,
    onOpenCollection,
    onOpenLeaderboard,
}) {
    const { leaderboard, myRank } = useCollectionLeaderboard(userId);
    /*
     * Which collection the counter is reading.
     *
     * Only offered to a player who has a run open — for everyone else there is
     * one collection and a toggle between it and nothing is furniture. The
     * default stays `main` so the panel a player has read a thousand times says
     * the same thing it always did until they ask it not to.
     */
    const [scope, setScope] = useState('main');
    const run = prestige?.activeRun || null;
    const showing = scope === 'prestige' && run ? 'prestige' : 'main';

    // Never on mobile. These exist because a wide stage has room beside a centred
    // panel; a phone has none, and the topbar keeps its own entry points there.
    if (isMobile) return null;

    const held = showing === 'prestige' ? (run?.held ?? 0) : collectedCount;
    const total = showing === 'prestige' ? (run?.total ?? poolSize) : poolSize;
    const tone = showing === 'prestige' ? prestigeColor(run.level) : COLORS.gold;
    const pct = total > 0 ? Math.min(100, (held / total) * 100) : 0;
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
                    value={`${held.toLocaleString('en-US')} / ${total.toLocaleString('en-US')}`}
                    caption={showing === 'prestige' ? `${prestigeLabel(run.level)?.toLowerCase()} items` : 'items collected'}
                    tone={showing === 'prestige' ? prestigeInk(run.level) : undefined}
                />

                {/* The lens. Two words, only for a player who has a run open.
                    `pointer-events: auto` opts it back out of the content layer's
                    pass-through: the panel opens the collection book, and
                    switching which number you are reading is not a request to
                    leave. This used to be `stopPropagation` on the click, which
                    was the only tool available while these were nested inside the
                    panel's own button — they are siblings now, so the toggle
                    simply receives its own clicks and nothing bubbles anywhere. */}
                {run && (
                    <div
                        style={{
                            position: 'relative',
                            zIndex: 1,
                            pointerEvents: 'auto',
                            display: 'flex',
                            gap: '10px',
                            marginTop: '2px',
                        }}
                    >
                        {[['main', 'Collection'], ['prestige', 'Prestige']].map(([id, text]) => {
                            const active = showing === id;
                            return (
                                <button
                                    key={id}
                                    onClick={() => setScope(id)}
                                    aria-pressed={active}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: '2px 0',
                                        cursor: 'pointer',
                                        font: 'inherit',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        letterSpacing: '0.12em',
                                        textTransform: 'uppercase',
                                        color: active
                                            ? (id === 'prestige' ? prestigeInk(run.level) : COLORS.gold)
                                            : COLORS.textMuted,
                                        boxShadow: active
                                            ? `inset 0 -2px 0 ${id === 'prestige' ? prestigeColor(run.level) : COLORS.gold}`
                                            : 'none',
                                    }}
                                >
                                    {text}
                                </button>
                            );
                        })}
                    </div>
                )}

                <div
                    role="progressbar"
                    aria-valuenow={Math.round(pct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={showing === 'prestige' ? 'Prestige run completion' : 'Collection completion'}
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
                        // The bar follows the lens, so the number and its
                        // measure are never in two different colours.
                        background: tone,
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
                            {/*
                              * The prestige ring.
                              *
                              * A player who has prestiged wears their level around
                              * their avatar, in the tier's own colour — the ladder
                              * is the only place a colour comes from, so a ring
                              * cannot drift from the rarity it is named after.
                              *
                              * Level 5 takes the full holo sweep via `.fib-holo`
                              * and never a sampled point: insane's ramp passes
                              * through magenta, aqua and gold, which are exotic,
                              * mythic and legendary, so a ring painted from one
                              * sample off it would spend two thirds of its cycle
                              * impersonating a lower prestige. A 2px ring is small
                              * enough that a wrong colour is the only thing it
                              * would ever say.
                              *
                              * The board's ORDER is untouched: prestige is status,
                              * not standing, so a prestiged player still sits
                              * exactly where their collection puts them.
                              */}
                            <PrestigeRing standing={prestigeStanding(entry)}>
                                <img
                                    src={getDiscordAvatarUrl(entry.discord_id, entry.discord_avatar)}
                                    alt=""
                                    width={18}
                                    height={18}
                                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; }}
                                    style={{ borderRadius: '50%', flexShrink: 0, display: 'block' }}
                                />
                            </PrestigeRing>
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
