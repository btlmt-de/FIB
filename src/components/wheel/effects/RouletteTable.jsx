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
import { createPortal } from 'react-dom';
import { API_BASE_URL } from '../../../config/constants.js';
import { COLORS } from '../config/constants';
import { useSound } from '../../../context/SoundContext.jsx';
import { getDiscordAvatarUrl } from '../../../utils/helpers.js';
import { serverNow } from '../../../utils/serverClock.js';
import {
    T_TURN, T_CALL, T_REVEAL, COLOURS, BRASS, BRASS_INK, CARD_IVORY,
    seatResolvesAt, totalResolvesAt, shade, glow,
} from './rouletteTimeline.js';

const ORDER = ['red', 'black', 'green'];

/**
 * The table's own column.
 *
 * ── DESKTOP: THE APRON ───────────────────────────────────────────────────────
 *
 * Centred under the band, in the row the bonus plaque and the lane readout
 * already answer in. The frame around it is full-bleed — it is a room, and the
 * floor should reach the edges — but the controls are not, and letting them
 * inherit that width produced three 500px buttons on a desktop viewport. A bet
 * is a small, deliberate act; the target should be the size of a chip tray, not
 * of the room it is in.
 *
 * ── THE PHONE HAS NO APRON, AND THE TABLE FELL OFF THE SCREEN ────────────────
 *
 * This is the shaft (DESIGN.md §8): the reel runs vertically and is sized to
 * fill the viewport, so the row underneath it is below the fold — and the wheel
 * shell does not scroll, `scrollHeight` being exactly `innerHeight`. Measured at
 * 390x844 the three plaques laid out at **y = 846**, two pixels past the bottom
 * of a page with nowhere to go.
 *
 * So on a phone this was an event that asked the player a question they could
 * not answer, and paid them the fold either way. It survived because every
 * review of this feature had been done on a desktop, where the apron exists.
 *
 * The fix is not to shrink the shaft — the reel becoming the roulette is the
 * whole event, and cropping it to make room for the controls would trade the
 * picture for the buttons. The table becomes a fixed tray above the tab bar,
 * which is where a phone puts a decision anyway. It is transparent to touch
 * except on the plaques themselves, so the rest of the surface stays live for
 * the whole forty-five seconds exactly as it does on desktop.
 */
const PHONE_TAB_BAR = 56;

const tableBox = (isMobile) => (isMobile
    ? {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: PHONE_TAB_BAR + 8,
        // Above the reel and its overlays, below the banners and the tab bar.
        zIndex: 12,
        width: '100%',
        maxWidth: 640,
        margin: '0 auto',
        padding: '14px 12px 12px',
        boxSizing: 'border-box',
        // The tray reads OUT of the shaft rather than sitting on top of it: no
        // edge, no card, just the room getting denser toward the bottom of the
        // screen until the plaques are on solid ground.
        background: 'linear-gradient(180deg, rgba(28,4,7,0) 0%, rgba(28,4,7,0.82) 26%, rgba(28,4,7,0.93) 100%)',
        pointerEvents: 'none',
    }
    : {
        width: '100%',
        maxWidth: 510,
        margin: '0 auto',
        padding: '0 22px 18px',
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

/**
 * The table's container, and on a phone its escape hatch.
 *
 * `position: fixed` was not enough on its own, which is worth writing down
 * because it looks like it should be: the apron sits inside an ancestor with
 * `position: relative; z-index: 1`, and that is a STACKING CONTEXT, so the
 * tray's `z-index: 12` only ever competed with its own siblings. The shaft's
 * canvas is a sibling of that ancestor at a higher level, so the tray was laid
 * out correctly, at the right coordinates, fully opaque — and painted
 * underneath the reel, where `elementFromPoint` found a canvas instead of a
 * plaque. A control that is present, positioned and invisible is worse than one
 * that is missing, because nothing about the DOM says anything is wrong.
 *
 * So on a phone it portals to `document.body`, out of every stacking context
 * the wheel builds. THE ARRIVAL's theatre does the same thing for the same
 * reason and its header says so. Desktop stays in the apron, in flow, where the
 * row is its own.
 */
function Tray({ isMobile, style, className, children }) {
    const tray = <div className={className} style={{ ...tableBox(isMobile), ...style }}>{children}</div>;
    return isMobile ? createPortal(tray, document.body) : tray;
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
 * One colour's plaque, and the pile of chips already on it.
 *
 * ── IT IS A PLAQUE, NOT A COLOURED BUTTON ────────────────────────────────────
 *
 * This shipped as three rounded rectangles filled with a translucent wash of
 * their own colour — which is what a web button looks like when it has been
 * given a hue and nothing else. In a room made of brass, lacquer and card stock
 * it was the one object on screen that had visibly come from somewhere else,
 * and it is the ONLY thing in this event a player touches, so it should be the
 * best-made object in the room rather than the cheapest.
 *
 * A casino plaque is what it actually is: a chamfered slab with a milled metal
 * edge, a lacquered face and the denomination cut into it. Two absolutely
 * positioned layers do the edge and the face, both wearing the same chamfer, so
 * the metal follows the corner cuts instead of a rectangle sitting behind them.
 *
 * ── THE STATES LIVE IN CSS ───────────────────────────────────────────────────
 *
 * Hover, focus-visible and active are three things an inline `style` object
 * cannot express, and the previous build therefore had none of them: no hover
 * at all, and the browser's default focus ring on the site's only interactive
 * overlay. Everything the plaque does on its own is in `.fib-parlour-plaque`;
 * everything that comes from the pocket's colour arrives as a custom property.
 *
 * ── THE PILE IS PART OF THE PLAQUE ───────────────────────────────────────────
 *
 * Unchanged, and still right. What a player wants to know in the last five
 * seconds is not "how many are on red" in the abstract — it is whether to join
 * them, which is a property of the thing they are about to press. Faces rather
 * than a count, because the answer to "is anyone else on this" is a face, and a
 * stack of them is legible at a glance in a way "4" is not.
 */
function BetButton({ colour, multiplier, seats, mine, locked, onPick }) {
    const c = COLOURS[colour];
    const chosen = mine === colour;

    return (
        <button
            type="button"
            className="fib-parlour-plaque"
            data-chosen={chosen ? 'true' : 'false'}
            disabled={locked}
            onClick={() => onPick(chosen ? null : colour)}
            aria-pressed={chosen}
            aria-label={`Bet on ${c.label}, pays ${multiplier} times${chosen ? ' — your bet' : ''}`}
            style={{
                '--c': c.hex,
                '--c-top': shade(c.hex, -0.65),
                '--c-lo': shade(c.hex, -0.45),
                '--c-glow': glow(c.hex, 0.55),
                /*
                 * All three words are the same ivory, which is what a real
                 * plaque does — the denomination is cut in one colour whatever
                 * the chip is worth — and it is also the only step that clears
                 * AA on all three lacquers. The pocket's own ink stays where
                 * §8 put it: on the payout board, where the word is on the
                 * page rather than on the colour it names.
                 */
                '--ink': chosen ? '#FFFFFF' : CARD_IVORY,
            }}
        >
            <span className="fib-parlour-plaque-edge" aria-hidden="true" />
            <span className="fib-parlour-plaque-face" aria-hidden="true" />

            <span className="fib-parlour-plaque-body">
                <span className="fib-parlour-bet-chip" aria-hidden="true" />
                <span className="fib-parlour-plaque-label">{c.label}</span>
                {/* "PAYS 6×" rather than "6x": the multiplier is the one number
                    on this surface a player has to reason about before the
                    clock runs out, and a bare figure beside a colour is a label
                    they have to interpret. Multiplication sign, not the letter. */}
                <span className="fib-parlour-plaque-odds">PAYS {multiplier}×</span>

                <span style={{
                    gridColumn: '1 / -1',
                    display: 'flex', justifyContent: 'center', minHeight: 20, marginTop: 4,
                    paddingLeft: seats.length ? 8 : 0,
                }}>
                    {seats.slice(0, 5).map(s => (
                        <span key={s.userId} style={{ marginLeft: -8, display: 'block' }}>
                            <Avatar seat={s} size={20} ring={BRASS} />
                        </span>
                    ))}
                    {seats.length > 5 && (
                        <span style={{
                            marginLeft: -4, fontSize: 10, fontWeight: 800, alignSelf: 'center',
                            color: BRASS_INK,
                        }}>
                            +{seats.length - 5}
                        </span>
                    )}
                </span>
            </span>
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

        const totalShown = t >= totalResolvesAt(rows.length);
        const award = mine?.luckySpinsAwarded;
        const headline = mine?.outcome === 'hit' ? 'You called it'
            : mine?.outcome === 'fold' ? 'You sat out'
                : mine?.outcome === 'loss' ? 'Not this time' : 'The wheel has landed';
        const amount = Number.isFinite(award) ? award.toLocaleString() : null;

        return (
            <Tray isMobile={isMobile} className="fib-parlour-result-tray" style={{
                maxHeight: isMobile ? 'min(52dvh, 360px)' : '100%',
                minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                paddingBottom: isMobile ? 12 : 8,
            }}>
                <div className="fib-parlour-settlement" data-outcome={mine?.outcome || 'spectator'}>
                    <div className="fib-parlour-result-hero" role="status">
                        <div className="fib-parlour-winning-pocket" style={{
                            '--pocket': pocket.hex, '--pocket-ink': pocket.ink,
                        }}>
                            <strong>{result.pocket?.n ?? '?'}</strong>
                            <span>{pocket.label}</span>
                        </div>
                        <div className="fib-parlour-award">
                            <div className="fib-parlour-result-caption">{headline}</div>
                            <div className="fib-parlour-award-value">
                                {amount !== null ? (
                                    <><strong>{award > 0 ? '+' : ''}{amount}</strong><span>lucky spins</span></>
                                ) : <strong className="fib-parlour-public-result">{pocket.label} wins</strong>}
                            </div>
                            <div className="fib-parlour-result-note">
                                {mine?.outcome === 'hit' ? 'Your colour came in.'
                                    : mine?.outcome === 'fold' ? 'Your spins stayed with you.'
                                        : mine?.outcome === 'loss' ? (
                                            result.pocket?.colour === 'green' && mine.bet !== 'green'
                                                ? 'The house pocket takes this round.' : 'Your colour did not land.'
                                        ) : 'The table is settling.'}
                            </div>
                        </div>
                    </div>
                    <div className="fib-parlour-payout-heading">
                        <span>AT THE TABLE</span><span>LUCKY SPINS</span>
                    </div>
                    <div className="fib-parlour-payout-list" role="region" aria-label="Player payouts" tabIndex={0}>
                        {rows.length === 0 && <div className="fib-parlour-payout-empty">No player results this round</div>}
                        {rows.map((r, i) => {
                            const shown = t >= seatResolvesAt(i, rows.length);
                            const c = COLOURS[r.bet];
                            return (
                                <div key={r.userId} className="fib-parlour-payout-row"
                                    data-shown={shown} data-outcome={r.outcome} aria-hidden={!shown}>
                                    <Avatar seat={r} size={24} ring={c?.ink} />
                                    <span className="fib-parlour-player-name" title={r.username}>{r.username}</span>
                                    <span className="fib-parlour-player-bet" style={{ color: c?.ink || '#c6aaa0' }}>
                                        {c?.label || 'SAT OUT'}
                                    </span>
                                    <strong className="fib-parlour-player-payout">
                                        {r.payout > 0 ? '+' + r.payout.toLocaleString() : '0'}
                                    </strong>
                                </div>
                            );
                        })}
                    </div>
                    <div className="fib-parlour-payout-total" aria-live="polite">
                        <span>{totalShown ? 'TABLE PAID' : 'SETTLING THE TABLE'}</span>
                        <strong>{totalShown ? (result.totalPaid ?? 0).toLocaleString() + ' lucky spins' : '?'}</strong>
                    </div>
                </div>
            </Tray>
        );
    }

    /* ── before the ball: the table ───────────────────────────────────────── */
    // Nothing until the slots have finished turning over. There is no table to
    // bet at while the reel is still becoming one.
    if (t < T_TURN) return null;

    const secondsLeft = Math.max(0, Math.ceil(((betsCloseAt ?? 0) - serverNow()) / 1000));

    return (
        <Tray isMobile={isMobile}>
            {/*
                THE MARQUEE IS GONE, AND IT IS NOT COMING BACK.

                It read "THE PARLOUR · 5 ON THE TABLE" in tracked brass above
                "PLACE YOUR BETS" — which is a kicker, and a kicker is the one
                thing the craft floor bans outright rather than defaults away
                from: no brief earns it back, the heading carries its own
                weight. It was also saying the same fact twice inside 200px,
                because the stake is already stated at the bottom of this same
                tray ("5 lucky spins on the table") where it sits beside the
                fold button it actually informs.

                The argument for it was that the player needs the terms stated
                somewhere. They still are — on the plaques, which now read PAYS
                2× and PAYS 6×, and in that bottom line. Nothing was lost but
                the eyebrow.

                The brass hairline stays. A rule is furniture, not a label: the
                band above separates itself with exactly this line, twice, and
                it is what gives the tray a top edge on a phone. */}
            <div className="fib-parlour-rule" aria-hidden="true" />
            <div className="fib-parlour-caption">THE PARLOUR <span>· {stake} ON THE TABLE</span></div>

            {/* The call. One line, and it changes exactly once. */}
            <div
                role="status"
                style={{
                    textAlign: 'center', marginBottom: 10,
                    fontWeight: 900, letterSpacing: '0.16em',
                    fontSize: isMobile ? 14 : 17,
                    color: locked ? COLORS.redInk : BRASS_INK,
                    textShadow: locked ? `0 0 20px ${COLOURS.red.hex}CC` : 'none',
                }}
            >
                {locked ? 'NO MORE BETS' : (
                    <>
                        PLACE YOUR BETS
                        {/* The seconds are the one figure here that changes
                            every second, so they are set on the numeral's own
                            fixed advance — otherwise 19 → 18 → 17 walks the
                            whole line left and right while the player is
                            reading it. */}
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

            <div className="fib-parlour-bet-tray">
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
                position: 'relative', zIndex: 1,
            }}>
                <button
                    type="button"
                    className="fib-parlour-keep"
                    data-chosen={!myBet?.bet ? 'true' : 'false'}
                    disabled={locked}
                    onClick={() => pick(null)}
                    aria-pressed={!myBet?.bet}
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
        </Tray>
    );
}

export default memo(RouletteTable);
