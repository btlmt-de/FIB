/*
 * ══════════════════════════════════════════════════════════════════════════
 * THE PARLOUR — the table
 * ══════════════════════════════════════════════════════════════════════════
 *
 * The half of this event that is not scenery: the countdown, the three colours,
 * the room's bets as they come in, and the payout board that replaces all of it
 * once the ball has stopped.
 *
 * ── THIS IS THE ONE OVERLAY ON THE SITE THAT TAKES INPUT ─────────────────────
 *
 * Every other takeover is `pointer-events: none` — the arrival's header is
 * explicit that owning the screen for fifteen seconds is already a lot to ask,
 * and blocking the page on top of that would be the site holding the player
 * still. This one has a decision in it with lucky spins behind it, so the
 * BUTTONS take pointer events and nothing else does. The frame around them, the
 * wheel, the seat rail and both veils stay transparent to the mouse, so chat,
 * the nav and the collection book are all still reachable during the thirty
 * seconds — you can ignore the table entirely and it will pay you anyway.
 *
 * ── AND WHY THE COUNTDOWN IS NOT THE DEADLINE ────────────────────────────────
 *
 * The number on screen is drawn from `betsCloseAt` on the server's clock, but it
 * is only ever a picture of the deadline: `placeRouletteBet` re-checks the
 * window itself, so a client whose clock is slow shows a second that is not
 * there and gets a 409 if it tries to spend it. That is the right way round.
 * The alternative — trusting the client's countdown — is a bet accepted after
 * the pocket was rolled, which is the one bug this event cannot survive.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '../../../config/constants.js';
import { COLORS } from '../config/constants';
import { useSound } from '../../../context/SoundContext.jsx';
import { getDiscordAvatarUrl } from '../../../utils/helpers.js';
import { serverNow } from '../../../utils/serverClock.js';
import {
    T_TURN, T_CALL, T_REVEAL, COLOURS, BRASS, PARLOUR_GREEN_INK,
    seatResolvesAt, totalResolvesAt,
} from './rouletteTimeline.js';

const ORDER = ['red', 'black', 'green'];

/**
 * The table's own column, centred under the wheel.
 *
 * The frame is full-bleed — it is a room, and the felt should reach the edges —
 * but the controls are not, and letting them inherit that width produced three
 * 500px buttons on a desktop viewport. A bet is a small, deliberate act; the
 * target should be the size of a chip tray, not of the room it is in.
 */
const tableBox = (isMobile) => ({
    width: '100%',
    maxWidth: 640,
    margin: '0 auto',
    padding: isMobile ? '0 12px 12px' : '0 22px 18px',
    boxSizing: 'border-box',
});

/**
 * The seats, ordered so the board resolves shortest odds first.
 *
 * Folds and losses, then colour hits, then greens — and within a group by name,
 * so it is stable rather than dependent on however the server happened to
 * enumerate the room. The arrival's `sortManifest` exists for the identical
 * reason and its comment is the longer version of this one: two things index
 * into this array, and a second sort anywhere would pair a row with somebody
 * else's money.
 */
function sortSeats(seats) {
    return [...seats].sort(
        (a, b) => (a.payout ?? 0) - (b.payout ?? 0)
            || String(a.username).localeCompare(String(b.username))
    );
}

function Avatar({ seat, size = 26, ring }) {
    return (
        <img
            src={getDiscordAvatarUrl(seat.discordId, seat.discordAvatar, 64)}
            alt=""
            width={size}
            height={size}
            loading="lazy"
            style={{
                width: size, height: size, borderRadius: '50%', display: 'block',
                border: `1.5px solid ${ring || 'rgba(255,255,255,0.18)'}`,
                background: COLORS.bg,
            }}
        />
    );
}

/**
 * One colour's button, and the pile of chips already on it.
 *
 * The pile is part of the button rather than a separate legend because the thing
 * a player wants to know in the last five seconds is not "how many are on red"
 * in the abstract — it is whether to join them, which is a property of the thing
 * they are about to press. Faces rather than a count, because the answer to "is
 * anyone else on this" is a face, and a stack of them is legible at a glance in
 * a way "4" is not.
 */
function BetButton({ colour, multiplier, seats, mine, locked, onPick }) {
    const c = COLOURS[colour];
    const chosen = mine === colour;

    return (
        <button
            type="button"
            disabled={locked}
            onClick={() => onPick(chosen ? null : colour)}
            aria-pressed={chosen}
            aria-label={`Bet on ${c.label}, pays ${multiplier} times${chosen ? ' — your bet' : ''}`}
            style={{
                position: 'relative',
                flex: '1 1 0',
                minWidth: 0,
                padding: '10px 8px 8px',
                borderRadius: 12,
                cursor: locked ? 'default' : 'pointer',
                pointerEvents: 'auto',
                background: chosen
                    ? `linear-gradient(180deg, ${c.hex}, ${c.hex}CC)`
                    : `linear-gradient(180deg, ${c.hex}55, ${c.hex}22)`,
                border: `2px solid ${chosen ? c.ink : `${c.hex}AA`}`,
                boxShadow: chosen
                    ? `0 0 22px ${c.hex}77, inset 0 1px 0 rgba(255,255,255,0.22)`
                    : 'none',
                color: '#fff',
                opacity: locked && !chosen ? 0.45 : 1,
                transition: 'opacity 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
            }}
        >
            <div style={{
                fontWeight: 800, letterSpacing: '0.06em', fontSize: 15,
                color: chosen ? '#fff' : c.ink,
            }}>
                {c.label}
            </div>
            <div style={{ fontSize: 11, opacity: 0.85, marginTop: 1, fontWeight: 700 }}>
                {multiplier}x
            </div>

            <div style={{
                display: 'flex', justifyContent: 'center', minHeight: 20, marginTop: 6,
                paddingLeft: seats.length ? 8 : 0,
            }}>
                {seats.slice(0, 5).map(s => (
                    <div key={s.userId} style={{ marginLeft: -8 }}>
                        <Avatar seat={s} size={20} ring={c.ink} />
                    </div>
                ))}
                {seats.length > 5 && (
                    <span style={{
                        marginLeft: -4, fontSize: 10, fontWeight: 800, alignSelf: 'center',
                        color: c.ink,
                    }}>
                        +{seats.length - 5}
                    </span>
                )}
            </div>
        </button>
    );
}

function RouletteTable({
    table, result, payout, stake, multipliers, betsCloseAt, myBet, onBet, t, isMobile,
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const { playSfx } = useSound();

    const locked = t >= T_CALL || Boolean(result);

    /*
     * The two beats that are not a player action: the croupier's call, and the
     * pocket lighting. Fired on the edge rather than on the state, because this
     * component re-renders four times a second and a sound tied to a condition
     * rather than to a crossing would play four times a second with it.
     *
     * 250ms of granularity is invisible here — both land inside the animation
     * they belong to, and the reveal's bell rings for over a second.
     */
    const firedRef = useRef({ call: false, reveal: false });
    useEffect(() => {
        const fired = firedRef.current;
        if (!fired.call && t >= T_CALL) {
            fired.call = true;
            playSfx?.('parlour_call');
        }
        if (!fired.reveal && result && t >= T_REVEAL) {
            fired.reveal = true;
            playSfx?.('parlour_reveal');
            // Only if it was YOUR pocket. The bell is the room's; this is yours,
            // and it lands after the bell rather than under it.
            if (payout?.outcome === 'hit') {
                setTimeout(() => playSfx?.('event_win'), 430);
            }
        }
    }, [t, result, payout, playSfx]);

    const pick = useCallback(async (colour) => {
        if (locked) return;
        setBusy(true);
        setError(null);
        // The chip goes down on the press, not on the response. The bet is
        // optimistic for the same reason — see below.
        playSfx?.('parlour_chip');
        /*
         * Shown immediately and reconciled by the next `roulette_bets` frame.
         * Thirty seconds is short enough that a button which waits for a round
         * trip before it looks pressed reads as broken — and the reconcile is
         * what keeps that honest, because the optimistic state is thrown away
         * rather than merged the moment the server says otherwise.
         */
        onBet(colour);
        try {
            const res = await fetch(`${API_BASE_URL}/api/roulette/bet`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ colour }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                setError(body.error || 'That bet did not land');
                onBet(null);
            }
        } catch {
            setError('That bet did not land');
            onBet(null);
        } finally {
            setBusy(false);
        }
    }, [locked, onBet, playSfx]);

    const byColour = useMemo(() => {
        const map = { red: [], black: [], green: [], fold: [] };
        for (const s of table?.seats || []) map[s.bet || 'fold'].push(s);
        return map;
    }, [table]);

    /* ── after the ball: the payout board ─────────────────────────────────── */
    if (result && t >= T_REVEAL) {
        const rows = sortSeats(result.results || []);
        const pocket = COLOURS[result.pocket?.colour] || COLOURS.black;
        /*
         * The player's own line comes from the PRIVATE payout message, not from
         * finding their row in the public list. The server sends that message to
         * one client and no other, which makes "which of these seats is mine" a
         * question this component never has to answer — and therefore never has
         * to be given an identity to answer it with.
         */
        const mine = payout;

        return (
            <div style={{ ...tableBox(isMobile), pointerEvents: 'none' }}>
                <div
                    role="status"
                    style={{
                        textAlign: 'center', marginBottom: 10,
                        fontWeight: 900, letterSpacing: '0.14em',
                        fontSize: isMobile ? 16 : 20, color: pocket.ink,
                        textShadow: `0 0 26px ${pocket.hex}`,
                    }}
                >
                    {pocket.label} {result.pocket?.n}
                    {mine && (
                        <span style={{
                            display: 'block', marginTop: 4, fontSize: 12,
                            letterSpacing: '0.06em', color: COLORS.text, fontWeight: 700,
                        }}>
                            {mine.outcome === 'hit' && `You called it — ${mine.luckySpinsAwarded} lucky spins`}
                            {mine.outcome === 'fold' && `You sat out — ${mine.luckySpinsAwarded} lucky spins`}
                            {/* There is no push. Green takes everything. */}
                            {mine.outcome === 'loss' && (
                                result.pocket?.colour === 'green' && mine.bet !== 'green'
                                    ? 'The house pocket — everything goes'
                                    : 'Not this time'
                            )}
                        </span>
                    )}
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(190px, 1fr))',
                    gap: 6,
                    maxHeight: isMobile ? 150 : 190,
                    overflowY: 'auto',
                }}>
                    {rows.map((r, i) => {
                        const shown = t >= seatResolvesAt(i, rows.length);
                        const c = COLOURS[r.bet] || null;
                        return (
                            <div
                                key={r.userId}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '5px 9px', borderRadius: 9,
                                    background: 'rgba(8,14,24,0.66)',
                                    border: `1px solid ${r.outcome === 'hit' ? `${c?.ink}66` : 'rgba(255,255,255,0.07)'}`,
                                    opacity: shown ? 1 : 0,
                                    transform: shown ? 'none' : 'translateY(6px)',
                                    transition: 'opacity 260ms ease, transform 260ms ease',
                                }}
                            >
                                <Avatar seat={r} size={22} ring={c?.ink} />
                                <span style={{
                                    flex: 1, minWidth: 0, overflow: 'hidden',
                                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    fontSize: 12, fontWeight: 700, color: COLORS.text,
                                }}>
                                    {r.username}
                                </span>
                                <span style={{
                                    fontSize: 10, fontWeight: 800,
                                    color: c ? c.ink : COLORS.neutralInk,
                                }}>
                                    {r.bet ? COLOURS[r.bet].label : 'FOLD'}
                                </span>
                                <span style={{
                                    fontSize: 13, fontWeight: 900, minWidth: 34, textAlign: 'right',
                                    color: r.outcome === 'hit' ? PARLOUR_GREEN_INK
                                        : r.outcome === 'loss' ? COLORS.textMuted
                                            : COLORS.text,
                                }}>
                                    {r.payout > 0 ? `+${r.payout}` : '—'}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {t >= totalResolvesAt(rows.length) && (
                    <div style={{
                        textAlign: 'center', marginTop: 8, fontSize: 11,
                        letterSpacing: '0.1em', color: COLORS.neutralInk, fontWeight: 700,
                    }}>
                        {result.totalPaid} LUCKY SPINS ACROSS {rows.length} SEAT{rows.length === 1 ? '' : 'S'}
                    </div>
                )}
            </div>
        );
    }

    /* ── before the ball: the table ───────────────────────────────────────── */
    // Nothing until the slots have finished turning over. There is no table to
    // bet at while the reel is still becoming one.
    if (t < T_TURN) return null;

    const secondsLeft = Math.max(0, Math.ceil(((betsCloseAt ?? 0) - serverNow()) / 1000));

    return (
        <div style={tableBox(isMobile)}>
            {/* The marquee.

                Every other global event announces itself in a banner across the
                top of the page; this one has no banner, because the reel turning
                into a wheel is the announcement. But "a roulette is happening"
                is not the same fact as "you have five chips and 6x on green",
                and without this the player has the table in front of them and no
                statement of the terms. One line, brass, above the call. */}
            <div style={{
                textAlign: 'center', marginBottom: 5,
                fontSize: 10, fontWeight: 800, letterSpacing: '0.30em',
                color: BRASS, opacity: 0.85, textTransform: 'uppercase',
            }}>
                The Parlour
                <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
                <span style={{ color: COLORS.neutralInk, letterSpacing: '0.12em' }}>
                    {stake} on the table
                </span>
            </div>

            {/* The call. One line, and it changes exactly once. */}
            <div
                role="status"
                style={{
                    textAlign: 'center', marginBottom: 8,
                    fontWeight: 900, letterSpacing: '0.16em',
                    fontSize: isMobile ? 13 : 15,
                    color: locked ? COLORS.redInk : BRASS,
                    textShadow: locked ? `0 0 20px ${COLOURS.red.hex}CC` : 'none',
                }}
            >
                {locked ? 'NO MORE BETS' : (
                    <>
                        PLACE YOUR BETS
                        <span style={{
                            marginLeft: 10,
                            color: secondsLeft <= 5 ? COLORS.redInk : COLORS.text,
                            fontVariantNumeric: 'tabular-nums',
                        }}>
                            {secondsLeft}s
                        </span>
                    </>
                )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                {ORDER.map(colour => (
                    <BetButton
                        key={colour}
                        colour={colour}
                        multiplier={multipliers?.[colour] ?? (colour === 'green' ? 6 : 2)}
                        seats={byColour[colour]}
                        mine={myBet?.bet ?? null}
                        locked={locked || busy}
                        onPick={pick}
                    />
                ))}
            </div>

            {/* Folding is a button too, not an absence of one. A player who has
                decided to keep their five should be able to say so and see it
                confirmed, rather than being left wondering whether not pressing
                anything counted. */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 10, minHeight: 30,
            }}>
                <button
                    type="button"
                    disabled={locked}
                    onClick={() => pick(null)}
                    aria-pressed={!myBet?.bet}
                    style={{
                        pointerEvents: 'auto',
                        padding: '5px 12px', borderRadius: 9, fontSize: 11, fontWeight: 800,
                        letterSpacing: '0.08em', cursor: locked ? 'default' : 'pointer',
                        background: !myBet?.bet ? 'rgba(224,224,224,0.14)' : 'transparent',
                        border: `1px solid ${!myBet?.bet ? 'rgba(224,224,224,0.4)' : 'rgba(224,224,224,0.16)'}`,
                        color: COLORS.text, opacity: locked ? 0.45 : 1,
                    }}
                >
                    KEEP {stake}
                </button>

                <span style={{
                    fontSize: 11, fontWeight: 600, textAlign: 'right',
                    color: error ? COLORS.redInk : COLORS.neutralInk,
                }}>
                    {error || (byColour.fold.length > 0
                        ? `${byColour.fold.length} sitting out`
                        : `${stake} lucky spins on the table`)}
                </span>
            </div>
        </div>
    );
}

export default memo(RouletteTable);
