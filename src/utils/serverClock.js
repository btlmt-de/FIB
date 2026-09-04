// ============================================
// Server clock — the reference every reveal delay is measured against
// ============================================
//
// The wheel's reveal delays are a subtraction between two clocks: a drop's
// `created_at`, stamped by the server, and "now", read from the browser. That is
// only a delay if the two agree, and one visitor's did not — their machine ran a
// few seconds fast, so every drop arrived already "older" than the reveal
// window, `spinRevealDelay` returned 0, and the live activity ticker printed
// their own item the instant their wheel started turning. Nobody else saw it,
// because nobody else's clock was wrong: an unsynced clock is invisible from the
// outside and looks exactly like "it works for everyone but him".
//
// A fast clock is not exotic. Windows resyncs on a weekly timer by default and
// a VM resuming from sleep can be out by minutes, so this is not a machine that
// had to be broken to reproduce it — only slightly behind on an NTP poll.
//
// The offset is free to measure. Every SSE frame carries the server's own
// `timestamp` (broadcastToAll stamps it), and the activity fetch carries
// `serverTime`, so noting either on arrival is enough: `serverNow()` then reads
// the server's clock through the browser's, and the reveal windows stop
// depending on the visitor having set theirs.
//
// ── THE LATENCY TERM, AND WHY IT IS NOT JUST TOLERATED ──────────────────────
//
// A timestamp is created before it arrives, so a sample taken with no allowance
// for the trip reads the server's clock as EARLIER than it is, and `serverNow()`
// sits one one-way latency behind the truth. That is the safe direction — drops
// read as slightly younger than they are, so they are held slightly longer, never
// shorter — but "safe" is not "free". The reveal window is 4200ms against a
// 4000ms reel, so the whole budget between the wheel stopping and the feed
// printing is 200ms, and spending 100ms of it on an artefact of measurement was
// half the gap given away for nothing. That budget was 500ms when this was
// written and is 200ms now, which only sharpens the point: the tighter
// SPIN_REVEAL_MS gets, the less of it there is to lose to a measurement error.
//
// So a sample can carry what it cost. `fetchActivity` measures its own round trip
// and hands over half of it; the server stamped the body somewhere in the middle
// of that trip, so adding it back removes the bias rather than merely bounding
// it. A machine with a correct clock then measures an offset of about zero and
// the reveal behaves exactly as it did before any of this existed.
//
// SSE frames cannot measure a round trip — nothing was sent to provoke them — so
// they are the biased kind. They are still worth having: they arrive constantly
// and they seed the offset before the first fetch resolves. They just must not
// overwrite a measured sample with a worse one, which is what `quality` is for.
//
// Deliberately a module, not context state. The consumers are `spinRevealDelay`
// and its callers — a pure helper and a component that already receives the item
// — and threading an offset through both to correct a browser-wide fact would be
// plumbing for its own sake. A React re-render on every SSE frame would be worse.

// serverNow() - Date.now(). Zero until the first sample lands, which is the right
// default: a client that has heard nothing from the server has no evidence its
// own clock is wrong.
let offsetMs = 0;
let synced = false;
// null | 'seeded' (biased by one-way latency) | 'measured' (round trip removed).
let quality = null;

/**
 * How far an unmeasured sample must disagree with the stored offset before it is
 * allowed to replace a measured one.
 *
 * A clock does move mid-session — an NTP step, a DST change on a machine that
 * keeps its hardware clock in local time, a laptop waking after a week — and a
 * session that refused to notice would keep a stale offset until the tab was
 * reloaded. Far above any credible one-way latency, so ordinary jitter can never
 * reach it, and far below the reveal window it protects.
 */
const RESYNC_THRESHOLD_MS = 5000;

/**
 * A round trip beyond this is not a measurement, it is a stall — a request that
 * queued behind something, or a connection that dropped and retried. Half of it
 * would be a large forward correction built on nothing, and forward is the
 * direction that spoils spins, so such a sample is demoted to unmeasured.
 */
const MAX_CREDIBLE_RTT_MS = 4000;

/**
 * Record the server's clock from a message that carries it.
 *
 * @param {number|string|Date} serverTime - epoch ms, an ISO string, or a Date.
 *   Anything unparseable is ignored rather than defaulting, since a bad value
 *   here would corrupt every reveal window on the page.
 * @param {number} [roundTripMs] - the measured round trip of the request that
 *   returned this timestamp, when the caller made one and can time it. Omit for
 *   anything the server sent unprompted; see the note above.
 */
export function noteServerTime(serverTime, roundTripMs) {
    if (serverTime == null) return;

    const ms = typeof serverTime === 'number'
        ? serverTime
        : new Date(serverTime).getTime();

    if (!Number.isFinite(ms)) return;

    const timed = Number.isFinite(roundTripMs)
        && roundTripMs >= 0
        && roundTripMs <= MAX_CREDIBLE_RTT_MS;

    // The body was stamped roughly halfway through the trip.
    const candidate = ms + (timed ? roundTripMs / 2 : 0) - Date.now();

    if (timed) {
        offsetMs = candidate;
        quality = 'measured';
        synced = true;
        return;
    }

    // Unmeasured. Take it while nothing better exists, and afterwards only if the
    // clock has plainly moved — otherwise every SSE frame would drag a good
    // sample back down by one one-way latency.
    if (quality !== 'measured' || Math.abs(candidate - offsetMs) > RESYNC_THRESHOLD_MS) {
        offsetMs = candidate;
        quality = 'seeded';
        synced = true;
    }
}

/** The server's clock, in epoch ms, read through the local one. */
export function serverNow() {
    return Date.now() + offsetMs;
}

/**
 * How far the browser's clock is from the server's, in ms. Positive means the
 * browser is running slow. Exposed for diagnostics — a visitor reporting a
 * spoiled reveal can be confirmed or cleared from the console in one line.
 */
export function clockOffset() {
    return offsetMs;
}

/** Whether any server timestamp has been seen yet. */
export function isClockSynced() {
    return synced;
}

/**
 * How the current offset was obtained: 'measured' (a timed request, latency
 * removed), 'seeded' (an SSE frame, biased one one-way latency slow), or null.
 * Diagnostics only.
 */
export function clockQuality() {
    return quality;
}
