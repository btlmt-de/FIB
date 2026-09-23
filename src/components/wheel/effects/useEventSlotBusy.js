import { useActivity } from '../../../context/ActivityContext.jsx';

/**
 * Whether an event owns the banner slot right now - running, being rolled, or
 * still saying goodbye. The milestone meter's question, in its own module because the daily
 * bounty's plaque shares the slot and has to step aside at exactly the same
 * moments; a second copy of this would drift the way every copied rule on this
 * surface has.
 */
export function useEventSlotBusy() {
    const { globalEventStatus, eventSelection,
        communityGoalResult, communityGoalResultPending, firstBloodWinner,
        firstBloodResultPending, kotwWinner, kotwWinnerPending, roulette, highRoller } = useActivity();

    // `eventSelection` counts as active. The roll happens in this same slot, and it
    // fires *before* the event itself flips to active — so without this the meter
    // and the roll would both be mounted for the four seconds of the selection,
    // stacked in a row that holds one thing at a time. It would also be reading
    // "0 spins to go", which is true and useless.
    const active = globalEventStatus?.active || globalEventStatus?.pending || !!eventSelection;

    // The event's aftermath counts as active too. Once an event ends, its result or
    // winner sits in this same slot for its display period - a fixed window in the
    // ActivityContext result handlers (12s community goal, 8s first blood, 30s
    // king of the wheel), fading out only after that. `global_event_end` clears
    // `active` the moment the event is over, so without this the meter would pop
    // in under a result banner that is still saying goodbye, reading "next global
    // event" while a 0:00-timer banner is on screen. Include the pending flags:
    // they are the moments between the end broadcast and the result landing, and
    // that gap is precisely when the old meter used to jump in.
    const aftermathVisible = !!communityGoalResult || communityGoalResultPending
        || !!firstBloodWinner || firstBloodResultPending
        || !!kotwWinner || kotwWinnerPending;
    /*
     * THE PARLOUR counts as active for as long as the room is on screen, and it
     * is asked about separately from `globalEventStatus` on purpose.
     *
     * Its scenery is not a banner in this slot - it takes the reel itself and
     * warms the whole surface, so the meter does not get covered up by it the
     * way the arrival's shutters cover it. It sits in the middle of the room
     * saying "next global event", which is both wrong and the one sentence that
     * breaks the illusion the event is built on.
     *
     * The status is right about the parlour now (the `roulette_open` handler
     * sets it), so this is belt and braces - but the two do not end on the same
     * tick. The server closes the event ~0.4s after the client's teardown timer
     * is due, and a late `roulette_result` or a throttled background tab pushes
     * that timer the other side of the end broadcast. `roulette` being set is
     * the question actually being asked: is there a room here?
     */
    return active || aftermathVisible || !!roulette || !!highRoller;
}
