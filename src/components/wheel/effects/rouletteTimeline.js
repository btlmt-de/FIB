/*
 * THE PARLOUR's timeline, in seconds, in one place.
 *
 *   TURN     0.00–1.20   the reel's slots turn over, one after another, and come
 *                        back up as roulette pockets. The room warms around them
 *   TABLE    1.20        the table is live, betting opens, the ring idles
 *   BETS    1.20–31.20   THIRTY SECONDS — the only interactive window on the site
 *   CALL     31.20       "no more bets"
 *   SPIN     31.90       the ring runs, on the reel's own easing
 *   LAND     35.90       the winning pocket comes to rest under the detent
 *   REVEAL   36.35       it lights, and the payout board opens under it
 *   FALL     43.20       the room cools; the pockets turn back into items
 *   END      44.60       the reel is the reel again
 *
 * ── THE REEL IS THE WHEEL, UNROLLED ──────────────────────────────────────────
 *
 * This event does not open a picture of a roulette table next to the reel. It
 * turns the reel INTO one, in place, in the same band, landing under the same
 * detent — and that is not a shortcut, it is the more honest object. The reel
 * already spins a sequence past a fixed pointer and decelerates onto a result;
 * a roulette wheel is that with twelve coloured slots instead of 1,559 items.
 * `CanvasBonusStrip` established the pattern and its header says it plainly —
 * the board is "the reel's understudy… it replaces it in the same row" — and it
 * takes the reel's own pitch for the same reason this does.
 *
 * The first build of this event got that wrong in an instructive way: it
 * shuttered the reel closed and opened a cinema frame containing a 3/4-view
 * canvas roulette wheel, borrowing THE ARRIVAL's whole theatre. It worked, and
 * it was the wrong object — a second wheel on a page that already has one, with
 * the site's own vocabulary (band, pitch, detent, landing) thrown away and
 * rebuilt in ellipses. What the owner asked for was the reel becoming a
 * roulette, and the reel becoming a roulette is also simply better: no portal,
 * no shutter, no second geometry, and the landing reads in the language every
 * other spin on this surface already speaks.
 *
 * ── AND THE ROOM CHANGES, NOT A BOX IN IT ────────────────────────────────────
 *
 * The atmosphere is site-wide — see ParlourAtmosphere.jsx. THE ARRIVAL dims the
 * page and opens a lit rectangle over it because a train is somewhere else; a
 * parlour is where you already are, so the surface itself warms rather than
 * being covered up.
 *
 * ── WHY THE CLOCK IS THE SERVER'S ────────────────────────────────────────────
 *
 * Every beat is measured `(serverNow() - openedAt) / 1000`. The event runs for
 * three quarters of a minute, one of them is a betting deadline with lucky spins
 * behind it, and a player can load the page in the middle of it. That buys three
 * things: a late join renders the table it walked in on rather than replaying
 * the opening, a backgrounded tab returns to the right beat, and the countdown
 * on screen cannot disagree with the window the server is enforcing.
 *
 * The backend's ROULETTE_TABLE_OPENS_MS / _BET_WINDOW_MS / _SETTLE_MS restate
 * T_TABLE, the window and (T_END − T_CALL). That duplication is deliberate and
 * one-directional: the server owns the DEADLINE because it has money behind it,
 * the client owns the ANIMATION because it is the thing being watched, and the
 * server's total need only OUTLAST T_END — never match it.
 */

import { SPIN_DURATION } from '../../../config/constants.js';
import { COLORS } from '../config/constants';

/** The slots have finished turning over. Betting opens here, not at zero. */
export const T_TURN = 1.20;
/** Thirty seconds, the owner's call. Must equal the server's window. */
export const BET_WINDOW_S = 30;
export const T_CALL = T_TURN + BET_WINDOW_S;

/** A beat of a locked, still table before it runs. The croupier's pause. */
export const T_SPIN = T_CALL + 0.70;
/**
 * The reel's own spin length, imported rather than restated.
 *
 * The whole point of this event is that it lands like a spin, so it has to take
 * as long as one. A local 4.2 here would drift the moment SPIN_DURATION was
 * tuned, and `serverClock.js` already records that this constant is the lever
 * the reveal budget is spent from — a second copy would silently opt out of it.
 */
export const T_LAND = T_SPIN + SPIN_DURATION / 1000;
export const T_REVEAL = T_LAND + 0.45;
export const T_PAYOUT = T_REVEAL + 0.70;

/** The room cools and the pockets turn back into items. */
export const T_FALL = T_CALL + 12.0;
export const T_END = T_FALL + 1.40;

/** How long one slot takes to turn over, at either end of the event. */
export const TURN_FLIP_S = 0.42;

/**
 * The identity. One green, and it is the table's own.
 *
 * Deliberately the same colour as the wheel's rarest pocket rather than a fifth
 * event colour picked to sit beside the other four. The green pocket IS the
 * house — it is what the room is really playing against — so the event wearing
 * its colour is the honest choice rather than a coincidence.
 *
 * It sits closer to the Community Goal's #2DD4BF than any other pair of event
 * colours on the site. They read apart because this is a green and that is a
 * cyan, and the selection wheel gives every cell an icon; if a future surface
 * ever stacks them without icons, this is the one to move.
 */
export const PARLOUR_GREEN = '#19B36B';
/** Green as TEXT. The baize fails badly as a word. */
export const PARLOUR_GREEN_INK = '#3DDC97';

/** The room's materials. Not tokens — a room has surfaces. See DESIGN.md §9b. */
export const FELT = '#0B3D2E';
export const FELT_LIGHT = '#12563F';
export const BRASS = '#C9A227';

/**
 * The three pocket colours, and the one rule about them.
 *
 * `ink` exists for the reason §8's rarity ladder has one, and the rule is
 * word-for-word the same: fills, wedges, chips and glows take `hex`; anything
 * that is a WORD takes `ink`. Icons count as words.
 *
 * Two of the three inks are the ladder's own steps rather than new colours. A
 * red meaning "you lost" and a red meaning "rare" are the same red on this site,
 * and inventing a second would be the drift §8 spent a rewrite undoing. Black
 * has no usable ink of its own — the pocket is very nearly the page — so it
 * borrows the body text step. Only green is new, because no token is a baize.
 */
export const COLOURS = {
    red:   { hex: '#B01B28', ink: COLORS.redInk,     label: 'RED'   },
    black: { hex: '#14171F', ink: COLORS.text,       label: 'BLACK' },
    green: { hex: '#12855A', ink: PARLOUR_GREEN_INK, label: 'GREEN' },
};

/**
 * When seat `i` of `n` resolves on the payout board.
 *
 * Shortest odds first — losses and folds, then colour hits, then the greens —
 * so the board climbs to the biggest number on it rather than opening with it.
 * Same shape as THE ARRIVAL's manifest and the same reasoning: a row that
 * resolves before the rows it beats is the animation spending its own ending
 * early.
 *
 * Capped so a full room still finishes before T_FALL. Beyond the cap the rows
 * resolve faster rather than later, which is a crowded table rather than a
 * broken one.
 */
export function seatResolvesAt(i, n) {
    const span = Math.min(3.4, Math.max(1.0, n * 0.26));
    return T_PAYOUT + (n <= 1 ? 0 : (i / (n - 1)) * span);
}

/** The total, a beat after the last seat — it is the sum, so it lands last. */
export function totalResolvesAt(n) {
    return seatResolvesAt(Math.max(0, n - 1), n) + 0.40;
}
