/*
 * ═══════════════════════════════════════════════════════════════════════════
 * KING OF THE WHEEL — the standings, ordered by what is actually on screen
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * One rule, and everything here exists to enforce it:
 *
 *   A BOARD SORTS BY THE NUMBERS IT IS SHOWING.
 *
 * ── THE BUG THIS REPLACES ───────────────────────────────────────────────────
 *
 * KOTW points are awarded server-side the moment a spin resolves, and the
 * leaderboard is broadcast to every client from there. But the client that
 * threw the spin is still watching its reel turn — `kotwSpinPending` is the
 * flag for exactly that window, and the server's own debounce
 * (LEADERBOARD_BROADCAST_DELAY_MS, "match spin animation duration") is a
 * leading-edge one, so the first spin in a quiet window broadcasts immediately
 * and lands on the board while the wheel is mid-flight.
 *
 * Both boards already knew this and both handled half of it: the POINTS were
 * frozen to the confirmed total for the spinning player, so the digits would
 * not jump early. Neither did anything about the ORDER, which came straight
 * off the broadcast array and had already been re-sorted on the new score.
 *
 * The result was a chip sliding to first place — with the overtake animation,
 * so you could hardly miss it — still displaying the old, lower number, sitting
 * above someone showing more points than it. The owner's note: "sometimes you
 * can see jump someone to the top with less points, and then they land a hit
 * and get the points, but it should only update placement if the points arrived
 * already."
 *
 * Freezing the number without freezing the position did not delay the reveal at
 * all. It only made the board briefly lie about arithmetic, and left the
 * placement to give the result away a full spin early — which is worse than
 * either doing nothing or doing it properly, because the board contradicted
 * itself while it did it.
 *
 * ── WHY IT IS A SORT AND NOT A SECOND FREEZE ────────────────────────────────
 *
 * The obvious fix is another flag: hold the previous order until the spin
 * lands. That needs the board to remember its last order, decide when a
 * remembered order has gone stale, and cope with entries joining and leaving
 * while it is held — three pieces of state, each with its own way of getting
 * stuck.
 *
 * Sorting by the displayed value needs none of it. The board cannot show an
 * order inconsistent with its own numbers because the numbers ARE the sort key;
 * when the spin lands and the frozen value is released, the row moves and the
 * digits change in the same commit, which is the beat the whole thing was
 * supposed to have. It is also indifferent to WHY a value is being held back —
 * any future reason to show something other than the server's number gets the
 * matching placement for free.
 *
 * ── AND WHY IT LIVES HERE ───────────────────────────────────────────────────
 *
 * Two surfaces render live standings — the chips in the reel's status bar
 * (`KotwReelBoard`) and the sidebar's KOTW mode — and they had already grown
 * two copies of the freeze that disagreed with each other: one fell back to the
 * server's value when the confirmed total was missing, the other fell back to
 * ZERO and showed a live player on nought points. That is the same drift the
 * rarity ladder went through before `rarityHelpers` existed. One function, two
 * callers; do not fork it.
 *
 * (`MiniLeaderboard` in KingOfWheelBanner.jsx is a third renderer with no
 * freeze at all, and is currently unreferenced — dead since the standings moved
 * into the status bar. If it is ever revived it should come through here too.)
 */

/**
 * The live standings, in the order they should be drawn.
 *
 * @param {Array}  leaderboard      the server's `kotw_leaderboard` array
 * @param {Object} opts
 * @param {number|string|null} opts.userId          this client's user id
 * @param {boolean}            opts.pending         is this client's spin still resolving
 * @param {number|null}        opts.confirmedPoints this client's last CONFIRMED total
 *
 * @returns {Array} entries with `points` replaced by the value to display and
 *                  `rank` renumbered to match, sorted by that value.
 */
export function kotwStandings(leaderboard, { userId = null, pending = false, confirmedPoints = null } = {}) {
    if (!Array.isArray(leaderboard) || leaderboard.length === 0) return [];

    /*
     * The freeze only applies when there is something confirmed to freeze TO.
     * With no confirmed total the honest value is the server's, not zero: a
     * player who is on the board is on it because they have scored, and one of
     * the two copies this replaces printed them at 0 pts for the length of a
     * spin.
     */
    const holding = pending && userId != null && confirmedPoints != null;

    return leaderboard
        .map((entry, seq) => ({
            entry,
            /*
             * `seq` keeps the server's own order among equal scores. The server
             * sorts on `b.points - a.points` and nothing else, so ties fall
             * back to its insertion order — arbitrary, but stable, and stable
             * is the whole requirement: without this, two players level on
             * points would swap places on every broadcast and the overtake
             * animation would fire on a change that never happened.
             */
            seq,
            points: (holding && entry.userId === userId) ? confirmedPoints : entry.points,
        }))
        .sort((a, b) => b.points - a.points || a.seq - b.seq)
        /*
         * `points` is OVERWRITTEN rather than added alongside, so a caller
         * cannot render the server's number next to this order by reaching for
         * the wrong field. Every consumer wants the shown value; nothing
         * client-side reads KOTW points for anything but display.
         *
         * `rank` is renumbered for the same reason — the server stamps its own,
         * and a board drawing "#1" on a chip this function placed third would
         * reintroduce the contradiction one field over.
         */
        .map(({ entry, points }, index) => ({ ...entry, points, rank: index + 1 }));
}
