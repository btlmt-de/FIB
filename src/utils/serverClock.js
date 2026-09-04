// ============================================
// Server clock — the reference every reveal delay is measured against
// ============================================
//
// The wheel's reveal delays are a subtraction between two clocks: a drop's
// `created_at`, stamped by the server, and "now", read from the browser. That is
// only a delay if the two agree, and one visitor's did not — their machine ran a
// few seconds fast, so every drop arrived already "older" than the 4.5s reveal
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
// The error term is the one-way network latency: the frame was created some
// milliseconds before it arrived, so `serverNow()` sits that far *behind* the
// true server clock. That is the direction to be wrong in — drops read as very
// slightly younger than they are, so they are held a few milliseconds longer.
// Never shorter, which is the failure that spoils a spin.
//
// Deliberately a module, not context state. The consumers are `spinRevealDelay`
// and its callers — a pure helper and a component that already receives the item
// — and threading an offset through both to correct a browser-wide fact would be
// plumbing for its own sake. A React re-render on every SSE frame would be worse.

// serverNow() - Date.now(). Zero until the first frame lands, which is the right
// default: a client that has heard nothing from the server has no evidence its
// own clock is wrong.
let offsetMs = 0;
let synced = false;

/**
 * Record the server's clock from a message that carries it.
 *
 * @param {number|string|Date} serverTime - epoch ms, an ISO string, or a Date.
 *   Anything unparseable is ignored rather than defaulting, since a bad value
 *   here would corrupt every reveal window on the page.
 */
export function noteServerTime(serverTime) {
    if (serverTime == null) return;

    const ms = typeof serverTime === 'number'
        ? serverTime
        : new Date(serverTime).getTime();

    if (!Number.isFinite(ms)) return;

    offsetMs = ms - Date.now();
    synced = true;
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
