import React, { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { COLORS, SPACE, SURFACE_NOISE, Z } from '../config/constants';
import { useActivity } from '../../../context/ActivityContext.jsx';
import { getDiscordAvatarUrl, getItemImageUrl } from '../../../utils/helpers.js';
import { RARITY, getRarityInk } from '../../../utils/rarityHelpers.jsx';
import { serverNow } from '../../../utils/serverClock.js';
import { visibleInterval } from '../../../config/power.js';
import { useEventSlotBusy } from './useEventSlotBusy.js';
import './DailyBounty.css';

/*
 * THE DAILY BOUNTY - the plaque that names the day's item, and the moment
 * somebody pulls it.
 *
 * The rules live in wheel-backend services/dailyBounty.js: one common a day,
 * drawn at 00:00 UTC, the first player to pull it takes the reward. This file
 * only says so. What it deliberately does NOT do is hold any of that state -
 * ActivityContext owns it, and in particular owns WHEN a claim becomes visible,
 * which is after the winning reel has landed and never on arrival.
 *
 * The identity is a sight, not a colour: four corners around the item and the
 * word, in `COLORS.bounty`, the same mark the reel draws on the tile itself.
 * See that token's note for why the bounty takes no hue of its own.
 */

const bountyVar = {
    '--bounty': COLORS.bounty,
    '--gilt-pale': COLORS.mysteryGilt[0],
    '--gilt-mid': COLORS.mysteryGilt[1],
    '--gilt-deep': COLORS.mysteryGilt[2],
};

/** "4h 12m", "38m", "under a minute" - to the next UTC midnight. */
function formatLeft(ms) {
    if (ms <= 60_000) return 'under a minute';
    const mins = Math.floor(ms / 60_000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

/** Re-renders once a minute while visible, for the reset countdown. */
function useMinuteTick() {
    const [, setTick] = useState(0);
    useEffect(() => visibleInterval(() => setTick(t => t + 1), 60_000), []);
}

function Sight({ texture, name, rarity = 'regular', imageUrl = null, size, claimed = false, locking = false }) {
    return (
        <span
            className={`fib-bounty-sight${claimed ? ' is-claimed' : ''}${locking ? ' is-locking' : ''}`}
            style={{ ...bountyVar, width: size, height: size }}
        >
            <img
                src={getItemImageUrl({ texture, type: rarity, imageUrl })}
                alt={name}
                width={Math.round(size * 0.66)}
                height={Math.round(size * 0.66)}
            />
            <i /><i /><i /><i />
        </span>
    );
}

/**
 * The box, closed: a gilt block with the gift mark cut into it. The gilt is the
 * ramp, drifting (fib-mystery-box in DailyBounty.css), because the box's metal
 * is never flat - see COLORS.mysteryGilt.
 */
function MysteryBoxGlyph({ size }) {
    return (
        <span className="fib-mystery-box" style={{ width: size, height: size }} aria-hidden="true">
            <Gift size={Math.round(size * 0.5)} strokeWidth={1.6} color="#3A2708" />
        </span>
    );
}

/**
 * The plaque, in the banner slot beside the milestone meter.
 *
 * It shares that slot's one rule: when an event owns the slot, this steps aside
 * with the meter (`useEventSlotBusy`). The bounty is still live underneath -
 * the reel keeps marking it - only the plaque yields, because the slot holds
 * one kind of news at a time and an event is louder news than an all-day hunt.
 *
 * Not a control. There is nowhere for it to go that is worth a click, and a
 * plinth that lights on hover promises a destination; the full rules sit in the
 * tooltip instead, where whoever wonders can find them.
 */
export function DailyBountyPlaque({ isMobile }) {
    const { dailyBounty } = useActivity();
    const busy = useEventSlotBusy();
    useMinuteTick();

    if (busy || !dailyBounty) return null;

    const claimed = !!dailyBounty.winner;
    // Most days the bounty is a common; about one in 45 it is a special, and then
    // the plaque says so in the tier's own ink - it changes how the day plays.
    const special = !!dailyBounty.rarity && dailyBounty.rarity !== 'regular';
    const tierLabel = special ? (RARITY[dailyBounty.rarity]?.label || dailyBounty.rarity) : null;
    const tierInk = special ? getRarityInk(dailyBounty.rarity) : null;
    const left = formatLeft(Date.parse(dailyBounty.endsAt) - serverNow());
    const winnerName = dailyBounty.winner?.username || 'someone';
    // The prize is a mystery box, and the word is the gilt one on this plaque.
    const reward = 'a mystery box';

    const title = claimed
        ? `Today's bounty was ${dailyBounty.name}, claimed by ${winnerName}${dailyBounty.box ? `, whose mystery box held ${dailyBounty.box.name}` : ''}. A new bounty is drawn at 00:00 UTC, in ${left}.`
        : `Today's bounty: the first player to pull ${dailyBounty.name} wins a mystery box: one special item, every special at equal odds.${special ? ` It is a ${RARITY[dailyBounty.rarity]?.label || dailyBounty.rarity} today, so it drops at its own odds - and a lucky spin, which draws every item equally, is the way to chase it.` : ' It is a common today, so every spin has the same chance at it.'} Resets at 00:00 UTC, in ${left}.`;

    const plinth = {
        ...bountyVar,
        backgroundImage: `${SURFACE_NOISE}, linear-gradient(180deg, #0d1322 0%, #0a0d18 100%)`,
    };

    // ── The phone: one line, the meter's own compaction ──────────────────
    if (isMobile) {
        return (
            <div
                className={`fib-bounty-plaque${claimed ? ' is-claimed' : ''}`}
                title={title}
                style={{ ...plinth, width: '100%', gap: '8px', padding: '6px 16px', zIndex: Z.content }}
            >
                <Sight texture={dailyBounty.texture} name={dailyBounty.name} rarity={dailyBounty.rarity} imageUrl={dailyBounty.imageUrl} size={26} claimed={claimed} />
                <span className="fib-bounty-eyebrow" style={{ color: claimed ? COLORS.textMuted : special ? tierInk : COLORS.bounty }}>
                    {claimed ? 'Claimed' : special ? `${tierLabel} bounty` : 'Bounty'}
                </span>
                <span style={{
                    flex: 1, minWidth: 0, fontSize: '13px', fontWeight: 700,
                    color: claimed ? COLORS.textMuted : COLORS.text,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                    {claimed ? winnerName : dailyBounty.name}
                </span>
                <span style={{ fontSize: '11px', color: COLORS.textMuted, whiteSpace: 'nowrap' }}>
                    {claimed ? `new in ${left}` : 'box'}
                </span>
            </div>
        );
    }

    return (
        <div
            className={`fib-bounty-plaque${claimed ? ' is-claimed' : ''}`}
            title={title}
            style={{ ...plinth, width: '300px', padding: '10px 18px 12px', zIndex: Z.content }}
        >
            <Sight texture={dailyBounty.texture} name={dailyBounty.name} rarity={dailyBounty.rarity} imageUrl={dailyBounty.imageUrl} size={54} claimed={claimed} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                    <span className="fib-bounty-eyebrow" style={{ color: claimed ? COLORS.textMuted : COLORS.bounty }}>
                        {claimed ? 'Bounty claimed' : "Today's bounty"}
                    </span>
                    <span style={{ fontSize: '11px', color: COLORS.textMuted, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {claimed ? `new in ${left}` : `${left} left`}
                    </span>
                </span>

                <span style={{ display: 'flex', alignItems: 'baseline', gap: '8px', minWidth: 0 }}>
                    <strong style={{
                        fontSize: '17px', fontWeight: 800, lineHeight: 1.2,
                        color: claimed ? COLORS.textMuted : COLORS.text,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {dailyBounty.name}
                    </strong>
                    {/* The tier word, in its ink: the one line that says today is not a
                        common day. Ink, not the tier's fill - it is text. */}
                    {special && (
                        <span className="fib-bounty-eyebrow" style={{ color: claimed ? COLORS.textMuted : tierInk, flexShrink: 0 }}>
                            {tierLabel}
                        </span>
                    )}
                </span>

                <span style={{
                    fontSize: '12px', color: COLORS.textMuted,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                    {claimed
                        ? <>by <span style={{ color: COLORS.text, fontWeight: 700 }}>{winnerName}</span>{dailyBounty.box && <> · box held <span style={{ color: COLORS.text }}>{dailyBounty.box.name}</span></>}</>
                        : <>first to pull it wins <span style={{ color: COLORS.mystery, fontWeight: 700 }}>{reward}</span></>}
                </span>
            </div>
        </div>
    );
}

/**
 * The claim, for everyone - and a larger version for the player who made it.
 *
 * Raised by ActivityContext once the winning reel has landed, and cleared by
 * it too; this renders whatever `bountyCelebration` holds and nothing else.
 * The room sees a card drop in under the topbar, out of the way of the reel
 * that is the actual event. The winner sees theirs in the centre of the screen
 * with the payout as the headline, because for them the payout IS the news,
 * and can wave it away.
 *
 * The corners lock onto the item as it arrives - the one geometric move the
 * mark ever makes - and a single sweep of sight white crosses the card. Both
 * are frozen under reduced motion; the card and its words are the content and
 * stay.
 */
export function BountyCelebration({ currentUserId }) {
    const { bountyCelebration } = useActivity();
    const [dismissed, setDismissed] = useState(null);

    if (!bountyCelebration?.winner) return null;
    const key = `${bountyCelebration.day}-${bountyCelebration.winner.userId}`;
    if (dismissed === key) return null;

    const { winner } = bountyCelebration;
    const mine = currentUserId != null && winner.userId === currentUserId;

    const card = {
        ...bountyVar,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '20px',
        backgroundImage: `${SURFACE_NOISE}, linear-gradient(180deg, #0d1322 0%, #0a0d18 100%)`,
        boxShadow: [
            'inset 0 1px 0 rgba(206,214,236,0.12)',
            // The winner's card is the box's, so its hairline is the gilt.
            `inset 0 0 0 1px ${mine ? `${COLORS.mystery}66` : `${COLORS.bounty}33`}`,
            '0 18px 50px rgba(0,0,0,0.55)',
        ].join(', '),
    };

    if (mine) {
        return (
            <div
                className="fib-bounty-celebration is-mine"
                role="status"
                aria-live="polite"
                onClick={() => setDismissed(key)}
                style={{ zIndex: Z.modal }}
            >
                <div style={{ ...card, padding: '28px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center' }}>
                    <span className="fib-bounty-eyebrow" style={{ color: COLORS.bounty }}>
                        You claimed today's bounty · {bountyCelebration.name}
                    </span>
                    {/* The box itself, closed. What is in it is decided when it
                        is opened, not now - see services/dailyBounty.js - so the
                        card shows the box and the reel does the reveal. */}
                    <MysteryBoxGlyph size={112} />
                    <strong className="fib-gilt-text" style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1.1, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Mystery box
                    </strong>
                    <span style={{ fontSize: '14px', color: COLORS.text }}>
                        One special - any of them, every one at equal odds.
                    </span>
                    <span style={{ fontSize: '12px', color: COLORS.textMuted }}>
                        Your next spin opens it. Tap to close.
                    </span>
                    <span className="fib-bounty-flash" aria-hidden="true" />
                </div>
            </div>
        );
    }

    return (
        <div className="fib-bounty-celebration" role="status" aria-live="polite" style={{ zIndex: Z.banner }}>
            <div style={{ ...card, padding: `${SPACE.md}px ${SPACE.md + 2}px`, display: 'flex', alignItems: 'center', gap: '14px' }}>
                <Sight texture={bountyCelebration.texture} name={bountyCelebration.name} rarity={bountyCelebration.rarity} imageUrl={bountyCelebration.imageUrl} size={56} locking />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, flex: 1 }}>
                    <span className="fib-bounty-eyebrow" style={{ color: COLORS.bounty }}>Bounty claimed</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                        <img
                            src={getDiscordAvatarUrl(winner.discordId, winner.discordAvatar)}
                            alt=""
                            width={20}
                            height={20}
                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; }}
                            style={{ borderRadius: '50%', flexShrink: 0 }}
                        />
                        <strong style={{ fontSize: '15px', color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {winner.username}
                        </strong>
                    </span>
                    <span style={{ fontSize: '12px', color: COLORS.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        pulled {bountyCelebration.name} ·{' '}
                        <span className="fib-gilt-text" style={{ fontWeight: 700 }}>won the mystery box</span>
                    </span>
                </div>
                <span className="fib-bounty-flash" aria-hidden="true" />
            </div>
        </div>
    );
}
