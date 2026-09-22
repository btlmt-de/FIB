/*
 * HIGH ROLLER's pacing, as numbers several places have to agree on.
 *
 * The table animates three things on its own clock: the SHUFFLE in the intro,
 * the DEAL, and the dealer's REVEAL - the hole card turning over, then each card
 * the house draws dealt one at a time, so "16... draw... 19" plays as beats
 * rather than one frame. WheelPage holds the player's new lucky-spin balance
 * until the reveal is over, because the balance IS the result: a counter that
 * jumps to +30 while the hole card is still turning tells the player how the
 * hand ended before the table does. The Parlour holds its payout behind its
 * ball for the same reason (T_REVEAL in rouletteTimeline.js).
 *
 * So the timings live here, once, rather than as a delay in the card component
 * and a guess in the page that drift apart the first time either is tuned.
 *
 * ── WHY THESE ARE SLOWER THAN THEY WERE ─────────────────────────────────────
 *
 * The first cut dealt at 300ms a card and flew each one in 1150ms, flipped the
 * hole card after 300ms and drew every 850ms. The owner found all of it too
 * fast - the event was over before it had been watched. Everything below is
 * roughly half as fast again, and the server gained an intro phase (Jimbo's
 * welcome and the shuffle, HIGH_ROLLER_INTRO_MS) for the same reason.
 *
 * ── THE LIMITS ───────────────────────────────────────────────────────────────
 *
 *   - The deal must land inside the server's HIGH_ROLLER_DEAL_MS (3s): the last
 *     dealt card leaves at 3 × DEAL_STEP_MS and lands CARD_TRAVEL_MS later -
 *     2.8s.
 *   - The reveal must end inside ActivityContext's HIGH_ROLLER_TEARDOWN_MS (13s)
 *     with time left to read the outcome: a dealer drawing seven cards - about
 *     as long a hand as the house plays - ends at 9.9s.
 *
 * All milliseconds. Deal times are measured from `dealAt`; reveal times from
 * the moment the result arrives.
 */

/** The deal alternates player, house, player, house, one card this far apart. */
export const DEAL_STEP_MS = 500;

/** A card's flight from the deck to the felt. */
export const CARD_TRAVEL_MS = 1300;

/** Jimbo says it is his turn, then the hole card turns. */
export const HOLE_FLIP_DELAY_MS = 600;
export const HOLE_FLIP_MS = 1100;

/** The first card the house draws leaves the deck after the flip has settled. */
export const DRAW_START_MS = HOLE_FLIP_DELAY_MS + HOLE_FLIP_MS + 300;

/** Between one drawn card and the next: long enough to read the new total. */
export const DRAW_GAP_MS = 1100;

/**
 * The intro's shuffle: three riffles, starting once Jimbo has said hello, then
 * the squared-up deck slides across the felt to where it sits for the deal -
 * the deck that was shuffled IS the deck that deals, not a prop that vanishes
 * while another one waits at the side. Measured back from `dealAt`, so it
 * still lines up if the server's intro is retimed.
 */
export const SHUFFLE_RIFFLES = 3;
export const SHUFFLE_RIFFLE_MS = 1000;
export const SHUFFLE_TO_DECK_MS = 650;
/** Room after the last riffle for the slide to the deck, and a breath before the first card. */
export const SHUFFLE_ENDS_BEFORE_DEAL_MS = SHUFFLE_TO_DECK_MS + 200;

/** When the n-th card the house DRAWS (0-based, after the dealt two) leaves the deck. */
export function drawDelay(n) {
    return DRAW_START_MS + n * DRAW_GAP_MS;
}

/**
 * How long the dealer's turn takes to play out, given the dealer's final hand.
 * Two cards means the house stood on what it was dealt (or had a natural): the
 * flip is the whole reveal.
 */
export function revealDuration(dealerCardCount) {
    const drawn = Math.max(0, (dealerCardCount ?? 2) - 2);
    if (drawn === 0) return HOLE_FLIP_DELAY_MS + HOLE_FLIP_MS;
    return drawDelay(drawn - 1) + CARD_TRAVEL_MS;
}
