/*
 * THE PARLOUR's timeline, in seconds, in one place.
 *
 *   TURN     0.00–1.20   the reel's slots turn over, one after another, and come
 *                        back up as roulette pockets. The room warms around them
 *   TABLE    1.20        the table is live, betting opens, the ring idles
 *   BETS    1.20–16.20   FIFTEEN SECONDS — the only interactive window on the site
 *   CALL     16.20       "no more bets"
 *   SPIN     16.90       the ring runs, on the reel's own easing
 *   LAND     20.90       the winning pocket comes to rest under the detent
 *   REVEAL   21.35       it lights, and the payout board opens under it
 *   FALL     28.20       the room cools; the pockets turn back into items
 *   END      29.60       the reel is the reel again
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
 * half a minute, one beat of it is a betting deadline with lucky spins
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
/** Fifteen seconds, the owner's call. Must equal the server's window. */
export const BET_WINDOW_S = 15;
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

const smoothBeat = x => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };
/** The room holds its breath at the call and releases after the reveal. */
export const roomHush = t => smoothBeat((t - T_CALL + 0.45) / 0.65)
    * (1 - smoothBeat((t - T_REVEAL) / 0.9));

// Integral of smoothBeat: a clock whose velocity changes smoothly, without
// teleporting props when the room slows or a tab resumes mid-event.
const beatIntegral = x => x <= 0 ? 0 : x >= 1 ? x - 0.5 : x ** 3 - x ** 4 / 2;
export const propTime = t => t - 0.72 * (
    0.65 * beatIntegral((t - T_CALL + 0.45) / 0.65)
    - 0.9 * beatIntegral((t - T_REVEAL) / 0.9)
);

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

/**
 * The room's materials. Not tokens — a room has surfaces. See DESIGN.md §9b.
 *
 * ── THE ROOM WAS GREEN, AND IS NOW RED ───────────────────────────────────────
 *
 * The first build laid a green baize over the whole surface, on the reasoning
 * recorded below the palette: the green pocket is the house, so the house wears
 * green. That reasoning still holds for the POCKET and for the event's identity
 * on the selection wheel — both of which are unchanged — but it was the wrong
 * thing to paint a room with, for a reason the felt itself demonstrated. A
 * green wash over a blue-hour city is two cool casts stacked, and the surface
 * went flat and slightly sick: the reel's red pockets read brown through it and
 * the leaderboard lost its separation from the ground. The owner's reference
 * for this pass is a crimson floor, and it is right for a reason beyond taste —
 * red is the only ground on this site that the Nocturne's blue is genuinely
 * OPPOSITE to, so the city stays visible through it instead of merging with it.
 *
 * The green is not gone; it is demoted to what it always described. It is the
 * house pocket, its ink, and the cell this event owns on the selection wheel.
 * A room is not an identity colour.
 *
 * FELT / FELT_LIGHT keep their names because they are still the cloth — a
 * roulette table's baize is under the crimson carpet, and the band's own recess
 * still uses them. They are simply no longer what the room is made of.
 */
export const FELT = '#0B3D2E';
export const FELT_LIGHT = '#12563F';
export const BRASS = '#C9A227';
/**
 * Brass as a WORD, and §8's ink rule applied to the room's metal.
 *
 * `#C9A227` is a fill: it is the frets, the rails, the lamp and the plaques'
 * milled edge, and against the crimson floor it measures 3.4:1 — fine for a
 * hairline, short of AA for the denomination cut into a plaque. This is the
 * same hue lifted until it passes, and it is the step every brass NUMERAL and
 * label on this surface takes. The rule is the ladder's, word for word: fills,
 * frets, rails and glows take `BRASS`; anything that is a word takes this.
 */
export const BRASS_INK = '#E0C766';

/** The carpet under the lamp, where the light actually falls. */
export const CRIMSON_LIT = '#8E1622';
/** The room's ground, between the lamp and the walls. */
export const CRIMSON = '#5A0C15';
/** The walls. Almost the page, and the reason the room has corners. */
export const CRIMSON_DEEP = '#1C0407';
/** Card stock. The only warm light-value in the room, so it carries the deck. */
export const CARD_IVORY = '#EFE2C6';

/**
 * The spin, 0 → 1, shared by everything in the room that turns.
 *
 * The corner wheel and the reel's ring are the same machine seen twice, so they
 * take their easing from one function rather than each restating `easeOutQuart`
 * and drifting the first time one of them is tuned. It is a pure function of
 * `t` for the reason the whole event is — see the header: thirty of these
 * seconds may be spent in a tab receiving no frames, and anything integrated
 * frame to frame comes back somewhere else.
 */
export function spinPhase(t) {
    if (t <= T_SPIN) return 0;
    if (t >= T_LAND) return 1;
    const p = (t - T_SPIN) / (T_LAND - T_SPIN);
    return 1 - Math.pow(1 - p, 4);
}

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
 * A pocket colour lifted toward white (`amount > 0`) or dropped toward black.
 *
 * The plaques need three steps of each pocket — lit, true, and in shadow — and
 * the lacquer has to be the SAME ramp for all three colours or the black plaque
 * ends up on a different curve from the red one and reads as a different
 * material. Three hand-picked literals per colour was the first version and it
 * did exactly that.
 *
 * It lives here rather than in the CSS, next to the palette that owns it. The
 * alternative was `color-mix()`, which is fine in every browser this site
 * supports; the reason not to is that the ramp is a property of these colours,
 * and a rule that mixes them in a stylesheet is the one place nobody looks when
 * asking what a pocket is made of.
 *
 * Returns `rgb()` rather than hex because nothing downstream does arithmetic on
 * it — it goes straight into a custom property.
 */
export function shade(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const target = amount > 0 ? 255 : 0;
    const k = Math.min(1, Math.abs(amount));
    const ch = (shift) => Math.round(((n >> shift) & 255) * (1 - k) + target * k);
    return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

/** The same colour as a cast light. For shadows a plaque throws, never for text. */
export function glow(hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

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
