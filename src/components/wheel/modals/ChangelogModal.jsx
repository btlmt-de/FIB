// ============================================
// Changelog — "What's new", the release-note surface
// ============================================
//
// Fires once per release on page load, and is reachable again from the topbar
// afterwards. The entries live in config/changelog.js; this file only knows how to
// draw the four block kinds, so a future release writes data and no JSX.
//
// ── WHY IT IS ITS OWN MODAL AND NOT A NOTIFICATION ──────────────────────────
//
// The bell already carries admin notices, and folding this into it was the obvious
// move. It does not work: `notifications.content` is a TEXT column, so a notice can
// say "the odds changed" but cannot draw the ladder, and the whole reason this
// surface exists is that a rarity change is a picture rather than a paragraph. The
// bell also needs an account, and /wheel is readable signed out.
//
// So the two are different things that look similar, and the topbar's
// no-two-entry-points rule is satisfied by them having no overlap: the bell is
// per-user and authored in the admin panel, this is per-release and authored in the
// repo. Neither can show the other's content.

import React, { useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { COLORS } from '../config/constants';
import { CHANGELOG } from '../../../config/changelog.js';
import { RELIC_ITEMS } from '../../../config/constants.js';
import { getRarityColor, getRarityIcon, getRarityOnColor } from '../../../utils/rarityHelpers.jsx';

// The items a `tier` block draws, by rarity key. Only relic has a roster here
// because only relic has one worth showing off; a future tier block for a rarity
// that is not listed simply renders its heading and body with no grid, which is a
// degradation rather than a crash.
// The whole-tier rosters. A `tier` block for one of these draws every item in it
// without having to list them, which is what the relic entry wanted: the tier WAS
// the release, so showing all six was showing the release.
//
// A block can also carry its own `roster` instead, and that is not the same thing
// said twice. An entry announcing ONE addition to an existing tier must not draw
// the tier — six renders under the heading "New in Mythic" says six things are
// new. The block's own roster is the picture of what actually changed.
const TIER_ROSTERS = { relic: RELIC_ITEMS };

/* ── Blocks ──────────────────────────────────────────────────────────────── */

/* ── On the two greys ─────────────────────────────────────────────────────────
 *
 * Body text here takes COLORS.neutralInk, never COLORS.textMuted.
 *
 * `textMuted` is #888, which measures 4.81:1 on the modal's own ground and 4.17:1
 * on the inner panels — under AA's 4.5 floor on exactly the surfaces this modal
 * puts small text on. `neutralInk` exists for this: it is the same grey pulled
 * toward the field's blue, documented in config/constants.js as the fix for "#888
 * on a midnight-blue field reads as dead rather than quiet", and it measures
 * 6.55 / 5.67 on the same two grounds.
 *
 * textMuted survives here for chrome only — the version stamp — where nothing is
 * lost if it recedes.
 *
 * Sizes hold an 11px floor for anything a player reads, per DESIGN.md §8: "The
 * ramp's 11px floor holds for anything a player has to read." The first draft set
 * item names and the ladder's footnote at 10px, which is the badge step and not a
 * reading step.
 */
function SectionHeading({ children }) {
    return (
        <div style={{
            color: COLORS.neutralInk,
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.09em',
            marginBottom: '10px',
        }}>
            {children}
        </div>
    );
}

function RationaleBlock({ block }) {
    return (
        <section style={{ marginBottom: '26px' }}>
            <SectionHeading>{block.heading}</SectionHeading>
            {block.paragraphs.map((text, i) => (
                <p
                    key={i}
                    style={{
                        // The one piece of sustained prose in the modal, so it gets
                        // the body colour and a reading measure rather than the
                        // recessive grey the labels use.
                        color: COLORS.text,
                        fontSize: '13px',
                        lineHeight: 1.6,
                        margin: i === 0 ? '0 0 10px' : '0 0 10px',
                    }}
                >
                    {text}
                </p>
            ))}
        </section>
    );
}

function gridColumns(count, ceiling) {
    if (count <= ceiling) return count;
    const rows = Math.ceil(count / ceiling);
    return Math.ceil(count / rows);
}

function TierBlock({ block, isMobile }) {
    const color = getRarityColor(block.rarity);
    const roster = block.roster || TIER_ROSTERS[block.rarity] || [];

    return (
        <section style={{ marginBottom: '26px' }}>
            <SectionHeading>{block.heading}</SectionHeading>

            {/* The tier's own name, worn in its own colour and at its own rate.
                This is the one place in the modal that gets to be loud. */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
                marginBottom: '10px',
            }}>
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: color,
                    color: getRarityOnColor(block.rarity),
                    padding: '4px 10px',
                    borderRadius: '5px',
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                }}>
                    {getRarityIcon(block.rarity, 14, false)}
                    {block.rarity}
                </span>
                <span style={{
                    color,
                    fontFamily: 'monospace',
                    fontSize: '15px',
                    fontWeight: 700,
                }}>
                    {block.rate}
                </span>
            </div>

            <p style={{ color: COLORS.text, fontSize: '13px', lineHeight: 1.55, margin: '0 0 14px' }}>
                {block.body}
            </p>

            {roster.length > 0 && (
                <div style={{
                    display: 'grid',
                    // Three across on a phone, six on desktop: the roster is the
                    // picture, so it stays a grid rather than collapsing to a list.
                    //
                    // The count is a CEILING, not the answer. Two things bend it:
                    //
                    //   A roster shorter than the ceiling takes its own length. Six
                    //   columns holding one render puts it in the first sixth of the
                    //   width, which reads as five missing ones rather than as one
                    //   item.
                    //
                    //   A roster longer than the ceiling balances its rows instead of
                    //   filling them. Seven relics against six columns is a full row
                    //   and then a single orphan underneath, which looks like a
                    //   layout accident; the same seven at four columns is 4 + 3 and
                    //   looks like a set. `rows` is what the ceiling would give, and
                    //   the columns are then whatever spreads the roster evenly over
                    //   that many rows.
                    //
                    // At six or fewer this is exactly the old behaviour, which is why
                    // the relic tier still draws as one row of six until the seventh
                    // arrives.
                    gridTemplateColumns: `repeat(${gridColumns(roster.length, isMobile ? 3 : 6)}, 1fr)`,
                    gap: '8px',
                }}>
                    {/* No tile, no radius, no shadow.

                        These were 6px rounded panels with a background and an inset
                        floor, and they read as exactly the soft generic cards
                        DESIGN.md's reference world rules out: "almost nothing is
                        rounded", "there are no cards, so there is no card
                        elevation", and the Nocturne "has no frames". Six of them in
                        a row made the section look stamped out rather than built.

                        The renders are cut-out isometric builds on transparency, so
                        they are already objects — they need a ground, not a box, and
                        the tier badge directly above already says whose they are. */}
                    {roster.map(item => (
                        <div key={item.texture} style={{ textAlign: 'center' }}>
                            <img
                                src={item.imageUrl}
                                alt=""
                                loading="lazy"
                                style={{
                                    width: '100%',
                                    maxWidth: '62px',
                                    aspectRatio: '1 / 1',
                                    objectFit: 'contain',
                                    display: 'block',
                                    margin: '0 auto 6px',
                                }}
                            />
                            <div style={{
                                color: COLORS.text,
                                fontSize: '11px',
                                lineHeight: 1.3,
                                fontWeight: 600,
                            }}>
                                {item.name}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function LadderBlock({ block }) {
    // Bar length is FREQUENCY — how often you see the tier — so the ladder widens
    // as it gets commoner and Insane is the sliver.
    //
    // It was drawn the other way round first, length standing for rarity, and that
    // was wrong in the way only a screenshot shows: a bar is read as an amount, so
    // a full-width bar sitting next to the words "1 in 1,000,000" said "lots of
    // these" about the rarest thing on the wheel. Both encodings are equally
    // legible on a log scale; only one of them agrees with the number beside it.
    //
    // Log-scaled, because the ladder spans 1 in 137 to 1 in 1,000,000 and a linear
    // bar renders everything above Legendary as a single pixel. The scale runs
    // between the block's own extremes, so it stays honest if a future entry lists
    // a different set of tiers.
    const logs = block.rows.map(r => Math.log10(r.oneIn));
    const min = Math.min(...logs);
    const max = Math.max(...logs);
    const width = (oneIn) => {
        if (max === min) return 100;
        // Inverted, and floored at 8% so the rarest tier is still a bar rather than
        // nothing at all — a row with no mark reads as missing data.
        return 8 + ((max - Math.log10(oneIn)) / (max - min)) * 92;
    };

    return (
        <section style={{ marginBottom: '26px' }}>
            <SectionHeading>{block.heading}</SectionHeading>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {block.rows.map(row => {
                    const color = getRarityColor(row.rarity);
                    return (
                        <div
                            key={row.rarity}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '84px 1fr auto',
                                alignItems: 'center',
                                gap: '10px',
                            }}
                        >
                            <span style={{
                                color,
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                            }}>
                                {row.label}
                                {/* The badge is 10px, not 9: DESIGN.md §8 removed the
                                    9px floor breach on the ticker's LUCKY badge on the
                                    grounds that a word has to be read and 9px was only
                                    ever defensible for a pictogram. NEW is a word. 5px
                                    is `wheel-badge`, the ratified badge corner. */}
                                {row.isNew && (
                                    <span style={{
                                        background: color,
                                        color: getRarityOnColor(row.rarity),
                                        fontSize: '10px',
                                        fontWeight: 800,
                                        padding: '1px 4px',
                                        borderRadius: '5px',
                                        letterSpacing: '0.06em',
                                    }}>
                                        NEW
                                    </span>
                                )}
                            </span>

                            <span style={{ display: 'block', height: '6px', position: 'relative' }}>
                                <span style={{
                                    display: 'block',
                                    height: '100%',
                                    width: `${width(row.oneIn)}%`,
                                    background: color,
                                    borderRadius: '2px',
                                    // The new tier is the only row that glows. Every
                                    // other row is the same bar it would have been.
                                    boxShadow: row.isNew ? `0 0 10px ${color}` : 'none',
                                    opacity: row.isNew ? 1 : 0.75,
                                }} />
                            </span>

                            <span style={{
                                color: row.isNew ? color : COLORS.neutralInk,
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                fontWeight: row.isNew ? 700 : 500,
                                whiteSpace: 'nowrap',
                            }}>
                                {row.rate}
                            </span>
                        </div>
                    );
                })}
            </div>

            {block.note && (
                <p style={{ color: COLORS.neutralInk, fontSize: '11px', lineHeight: 1.5, margin: '10px 0 0' }}>
                    {block.note}
                </p>
            )}
        </section>
    );
}

function ChangesBlock({ block }) {
    return (
        <section style={{ marginBottom: '26px' }}>
            <SectionHeading>{block.heading}</SectionHeading>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {block.rows.map(row => (
                    <div key={row.label} style={{ background: COLORS.bgLight, borderRadius: '6px', padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                            <span style={{ color: COLORS.text, fontSize: '12px', fontWeight: 700 }}>
                                {row.label}
                            </span>
                            <span style={{ color: COLORS.neutralInk, fontFamily: 'monospace', fontSize: '12px' }}>
                                {row.from}
                            </span>
                            <span style={{ color: COLORS.neutralInk, fontSize: '12px' }}>→</span>
                            <span style={{ color: COLORS.gold, fontFamily: 'monospace', fontSize: '11px', fontWeight: 700 }}>
                                {row.to}
                            </span>
                        </div>
                        <div style={{ color: COLORS.neutralInk, fontSize: '12px', lineHeight: 1.55 }}>
                            {row.note}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function NotesBlock({ block }) {
    return (
        <section style={{ marginBottom: '26px' }}>
            <SectionHeading>{block.heading}</SectionHeading>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {block.items.map(item => (
                    <div key={item.label} style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                        <span style={{
                            color: COLORS.gold,
                            fontSize: '12px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                        }}>
                            {item.label}
                        </span>
                        <span style={{ color: COLORS.neutralInk, fontSize: '12px', lineHeight: 1.55 }}>
                            {item.body}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
}

const BLOCKS = {
    rationale: RationaleBlock,
    tier: TierBlock,
    ladder: LadderBlock,
    changes: ChangesBlock,
    notes: NotesBlock,
};

/* ── The modal ───────────────────────────────────────────────────────────── */

export function ChangelogModal({ onClose, isMobile }) {
    // Escape closes it, like every other overlay on this surface. A release note
    // that traps you is a release note you resent.
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const entry = CHANGELOG[0];
    // timeZone: 'UTC' because the entry dates in changelog.js are bare 'YYYY-MM-DD'
    // strings, which Date parses as UTC midnight. Formatting that in the viewer's
    // own zone moves it BACKWARDS for everyone west of UTC, so a release dated the
    // 20th announced itself as the 19th across the Americas while reading correctly
    // in Europe - which is why nobody here would have seen it.
    const dated = new Date(entry.date).toLocaleDateString(undefined, {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    });

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`What's new — ${entry.title}`}
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0, 0, 0, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: '16px',
                boxSizing: 'border-box',
            }}
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: COLORS.bg,
                    // wheel-card, the ratified radius for a centred card that owns
                    // the screen. See DESIGN.md's `rounded` scale.
                    borderRadius: '20px',
                    border: `1px solid ${COLORS.border}`,
                    width: '100%',
                    maxWidth: '560px',
                    maxHeight: '88vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {/* Header. Sticky by virtue of being outside the scroller, so the
                    close control never scrolls away from a long release. */}
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: isMobile ? '18px 18px 12px' : '22px 24px 14px',
                }}>
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '6px',
                        }}>
                            <Sparkles size={16} color={COLORS.gold} />
                            <span style={{
                                color: COLORS.neutralInk,
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.09em',
                            }}>
                                What&rsquo;s new
                            </span>
                            {/* The one place textMuted survives: a version stamp is
                                chrome, nothing is lost if it recedes, and it sits on
                                the card's own ground where #888 still clears AA. */}
                            <span style={{
                                color: COLORS.textMuted,
                                fontFamily: 'monospace',
                                fontSize: '11px',
                            }}>
                                v{entry.version} · {dated}
                            </span>
                        </div>
                        <div style={{ color: COLORS.text, fontSize: isMobile ? '17px' : '18px', fontWeight: 700 }}>
                            {entry.title}
                        </div>
                        <div style={{ color: COLORS.neutralInk, fontSize: '12px', marginTop: '3px', lineHeight: 1.5 }}>
                            {entry.tagline}
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: 'none',
                            color: COLORS.textMuted,
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '8px',
                            display: 'flex',
                            flexShrink: 0,
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div style={{
                    overflowY: 'auto',
                    padding: isMobile ? '6px 18px 0' : '8px 24px 0',
                }}>
                    {entry.blocks.map((block, i) => {
                        const Block = BLOCKS[block.kind];
                        // An unknown kind is skipped rather than thrown: a data file
                        // one release ahead of this renderer should degrade, not
                        // white-screen the wheel.
                        return Block ? <Block key={i} block={block} isMobile={isMobile} /> : null;
                    })}
                </div>

                {/* Footer */}
                <div style={{
                    padding: isMobile ? '12px 18px 18px' : '14px 24px 20px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: COLORS.gold,
                            color: '#1a1a1a',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 20px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            letterSpacing: '0.02em',
                        }}
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}
