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
// The round trip of the measured sample the current offset came from, and when it
// was taken. Both exist to stop one unlucky request owning the session — see
// MAX_CREDIBLE_RTT_MS and SAMPLE_TTL_MS.
let bestRttMs = Infinity;
let measuredAt = 0;

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
 *
 * ── WHY THIS IS 1000 AND NOT 4000 ───────────────────────────────────────────
 *
 * The half-RTT correction assumes the trip was symmetric: out and back took the
 * same time, so the body was stamped in the middle. That assumption is sound for
 * a fast request and worthless for a slow one — a request that spent two seconds
 * queued behind a cold VPS, a waking mobile radio or another tab's upload was not
 * slow *symmetrically*, and half of its RTT is not where the stamp happened. It
 * is just a large forward number.
 *
 * At 4000 the ceiling admitted a +2000ms correction, and `quality = 'measured'`
 * then LOCKED it: SSE frames are refused below unless they disagree by more than
 * RESYNC_THRESHOLD_MS, so nothing could talk the offset back down. One unlucky
 * initial fetch bought a session where `serverNow()` ran two seconds ahead, every
 * drop read two seconds older than it was, and every reveal window on the page
 * fired two seconds early — the ticker printing your item over a still-turning
 * reel, the celebration landing mid-spin. Invisible from the outside, fixed by a
 * reload, and blamed on the reveal delay rather than on the clock under it.
 *
 * 1000 caps that at +500ms, and the best-sample rule below drives it far lower in
 * practice. Rejecting a genuinely slow-but-honest trip costs nothing: a demoted
 * sample is still taken as 'seeded', biased in the SAFE direction (late).
 */
const MAX_CREDIBLE_RTT_MS = 1000;

/**
 * How long a measured sample stays authoritative enough to refuse a worse one.
 *
 * Without this, the first good round trip of the session would keep every later
 * measurement out forever — which is the lock-in above wearing better clothes.
 * A clock does not drift meaningfully in five minutes, so inside that window the
 * quicker sample genuinely is the better one; past it, freshness wins and the
 * next `fetchActivity` (mount, tab refocus, SSE reconnect) re-measures from
 * scratch.
 */
const SAMPLE_TTL_MS = 5 * 60 * 1000;

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
        /*
         * Keep the QUICKEST sample, not the latest — the same rule NTP settles on,
         * and for the same reason: of several measurements of one offset, the one
         * that travelled least had the least room to be asymmetric, so it is the
         * one whose half-RTT correction is closest to true. Taking the latest
         * instead meant a session's accuracy was decided by whichever request
         * happened to run last, which on a mobile connection is a coin toss.
         *
         * Three things still get past a good sample, in the order they are cheap
         * to check: nothing measured yet; the stored sample has aged out; or the
         * clock has plainly stepped, which is a different fact from a slow trip
         * and must not be mistaken for one.
         */
        const stale = Date.now() - measuredAt > SAMPLE_TTL_MS;
        const stepped = Math.abs(candidate - offsetMs) > RESYNC_THRESHOLD_MS;

        if (quality !== 'measured' || roundTripMs <= bestRttMs || stale || stepped) {
            offsetMs = candidate;
            quality = 'measured';
            synced = true;
            bestRttMs = roundTripMs;
            measuredAt = Date.now();
        }
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
