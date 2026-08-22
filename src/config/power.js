import { useEffect, useState } from 'react';

/**
 * Saver mode — the one place the site answers "how hard may I work right now?".
 *
 * ── THE COMPLAINT, AND WHAT WAS ACTUALLY CAUSING IT ──────────────────────────
 *
 * Players reported the site draining a phone battery fast enough to notice
 * mid-session. It was not one thing, and it was not the spin. Measured by what
 * runs when nobody is touching the page:
 *
 *   the dormant reel      a canvas rAF loop, 30fps on a phone, forever, drawing
 *                         ~7 sprite columns with per-slot breath and embers
 *   the drift that feeds  a second rAF loop in WheelSpinner writing the offset
 *   the star field        a third rAF loop, 15fps, full viewport
 *   .fib-holo             a CSS gradient sweep per insane tile, forever
 *   five event banners    setInterval at 100ms, each re-rendering React
 *   chat + presence       fetch every 30s, heartbeat every 60s, tab hidden or not
 *   the SSE stream        an open connection, and — the real one — a reconnect
 *                         loop that retried every 1000ms with no backoff and no
 *                         visibility check, so a flaky proxy meant one request
 *                         per second forever, in a backgrounded tab
 *
 * The spin itself is ~5 seconds of work the player asked for, once per press.
 * It was never the problem and it is not what saver mode takes away.
 *
 * ── WHAT SAVER MODE IS ───────────────────────────────────────────────────────
 *
 * One boolean, stored per device, honoured everywhere. It removes *ambient*
 * cost — anything that keeps costing while the page sits still — and leaves the
 * page's identity, its content, and every user-initiated moment intact. A phone
 * in saver mode should be doing almost nothing between taps.
 *
 * It is deliberately NOT a separate "lite site". A second rendering path would
 * drift from the first the way this codebase's three copies of "is this mobile"
 * drifted (see config/breakpoints.js, which is this module's model). Saver mode
 * is a flag that existing code reads, in the two forms below, and nothing else.
 *
 * ── THE TWO QUESTIONS, AND WHY THEY ARE NOT ONE ──────────────────────────────
 *
 *   prefersCalm()   "should this move?"   saver OR prefers-reduced-motion
 *   isSaverOn()     "may this cost?"      saver only
 *
 * Saver implies calm, so every surface that already honours reduced motion — and
 * fifteen files here do — gets saver behaviour by changing one call. The reverse
 * is not true and must not become true. `prefers-reduced-motion` is a vestibular
 * accommodation: it stops the reel *breathing* but deliberately keeps the loop
 * warm and the travel intact, because a frozen reel would delete the feature
 * rather than calm it. Saver mode is a power budget: it parks the loop dead.
 * Treating one as the other either strands a motion-sensitive reader with a hot
 * CPU or hands a saver user a still image where the spin used to be.
 */

const STORAGE_KEY = 'fib:saver';

/** Whether the first-run offer has been answered, either way. */
const OFFER_KEY = 'fib:saver-offered';

/**
 * How much longer a poll waits in saver mode. Applied by `useHeartbeat`, which
 * also refuses to run at all while the tab is hidden — the multiplier is the
 * small half of the saving, the visibility gate is the large half.
 */
const SAVER_POLL_FACTOR = 4;

// ── State ────────────────────────────────────────────────────────────────────
//
// Module-level rather than context, and read through a function rather than
// handed out as a value, because the hottest consumer is a canvas render loop
// that reads it every frame from inside a `useEffect` that never re-subscribes.
// A context value would be a stale closure there. Subscribers get told through
// the listener set below, which is what the hooks are built on.

const listeners = new Set();

function readStored() {
    if (typeof window === 'undefined') return false;
    try {
        return window.localStorage.getItem(STORAGE_KEY) === 'on';
    } catch {
        // Private mode, or storage disabled. Saver mode is a preference, not a
        // guarantee — losing it is fine, throwing on every read is not.
        return false;
    }
}

let saverOn = readStored();

/**
 * Paint the flag onto <html> before React mounts.
 *
 * This runs at import time, from the entry chunk, and that placement is
 * load-bearing: setting it inside an effect would let one frame of the full
 * animated surface paint first, which on the phones this feature exists for is
 * both the visible flash and the most expensive frame of the session.
 */
function applyAttribute() {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (saverOn) root.setAttribute('data-saver', 'on');
    else root.removeAttribute('data-saver');
}

applyAttribute();

/** Is saver mode on? Safe to call every frame. */
export function isSaverOn() {
    return saverOn;
}

/**
 * Should motion be suppressed? Saver mode or an explicit reduced-motion
 * preference. Read live rather than cached, for the same reason the old
 * `prefersReducedMotion` helpers in the canvas files were: both inputs can
 * change while the page is open, and the render loop is already asking per
 * frame.
 */
export function prefersCalm() {
    if (saverOn) return true;
    return typeof window !== 'undefined'
        && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Turn saver mode on or off and tell everything that is listening. */
export function setSaverMode(on) {
    const next = Boolean(on);
    if (next === saverOn) return;
    saverOn = next;
    try {
        window.localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off');
    } catch { /* see readStored */ }
    applyAttribute();
    for (const fn of listeners) fn(next);
}

export function toggleSaverMode() {
    setSaverMode(!saverOn);
    return saverOn;
}

function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

// ── Hooks ────────────────────────────────────────────────────────────────────

/** Re-renders the caller when saver mode changes. */
export function useSaverMode() {
    const [on, setOn] = useState(saverOn);
    useEffect(() => subscribe(setOn), []);
    return on;
}

/**
 * Saver mode or reduced motion, as reactive state — for components that branch
 * in render (mount a still card instead of a celebration) rather than in a loop.
 */
export function useCalm() {
    const read = () => prefersCalm();
    const [calm, setCalm] = useState(read);

    useEffect(() => {
        const update = () => setCalm(read());
        const unsubscribe = subscribe(update);
        const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
        mq?.addEventListener('change', update);
        update();
        return () => {
            unsubscribe();
            mq?.removeEventListener('change', update);
        };
    }, []);

    return calm;
}

/**
 * The interval every recurring fetch on this site should be using.
 *
 * Two behaviours, neither of which the hand-rolled `setInterval`s it replaces
 * had:
 *
 *   1. **Nothing fires while the tab is hidden.** A phone with the browser in
 *      the background was still fetching presence every 30 seconds. Chrome
 *      throttles background timers but does not stop them, and each wake still
 *      lights the radio. The interval is torn down on hide and a single catch-up
 *      call runs on show, so the data is fresh the moment it is looked at and
 *      costs nothing while it is not.
 *   2. **Saver mode stretches it**, via `pollMs`, by SAVER_POLL_FACTOR. Applied
 *      by the caller rather than in here, because whether a given poll should be
 *      stretched is a question about what it is for — ActivityTicker's clock is
 *      wrong if it is stretched; NotificationCenter's SSE backstop is not.
 *
 * A plain function rather than a hook, and deliberately: every one of these
 * timers already lives inside an effect that owns listeners and refs it shares
 * state with, and hoisting it into a hook would mean lifting that closure too.
 *
 * It returns its stop function rather than an interval id, so a caller cannot
 * clear the timer and leave the visibility listener behind — which is the exact
 * leak the id-returning version invited.
 */
export function pollMs(baseMs) {
    return saverOn ? baseMs * SAVER_POLL_FACTOR : baseMs;
}

export function visibleInterval(fn, ms) {
    let id = null;
    const stop = () => { if (id !== null) { clearInterval(id); id = null; } };
    const start = () => { stop(); id = setInterval(fn, ms); };

    const onVisibility = () => {
        if (document.hidden) {
            stop();
        } else {
            fn();
            start();
        }
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
        stop();
        document.removeEventListener('visibilitychange', onVisibility);
    };
}

/**
 * The cadence a countdown redraws at.
 *
 * The five event banners each ran a 100ms interval while pending, every tick
 * setting React state and re-rendering a banner full of gradients and shadows —
 * ten full renders a second, per banner, to move a number that changes ten times
 * slower than that. 100ms buys a smooth tenths display on a countdown to an
 * event start, which is worth it on a laptop and is not worth it on a phone the
 * player is trying to keep alive. In saver mode a countdown ticks once a second
 * like every other clock.
 */
export function countdownTick(fine = 100) {
    return saverOn ? 1000 : fine;
}

/**
 * A countdown's timer, at whatever cadence is currently right.
 *
 * A plain `setInterval(fn, countdownTick())` reads the cadence once and keeps it
 * for the life of the banner, so toggling saver mode mid-countdown would change
 * nothing until the next event — and the effects these live in are keyed on the
 * event's timestamps, which is precisely what does not change while a countdown
 * runs. Rescheduling a `setTimeout` each tick re-reads it every time instead,
 * which costs one timer object per tick and removes the whole question of
 * dependency arrays from four separate banner components.
 *
 * It is also visibility-gated, because a countdown to an event start is a thing
 * you watch, and there is nothing to watch in a hidden tab. `fn` runs once on
 * the way back so the number is right before the banner is looked at, not one
 * tick later.
 *
 * Returns its stop function, for the same reason `visibleInterval` does.
 */
export function countdownInterval(fn) {
    let timer = null;
    let stopped = false;

    const tick = () => {
        fn();
        if (!stopped && !document.hidden) timer = setTimeout(tick, countdownTick());
    };

    const onVisibility = () => {
        clearTimeout(timer);
        timer = null;
        if (!stopped && !document.hidden) tick();
    };

    if (!document.hidden) timer = setTimeout(tick, countdownTick());
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
        stopped = true;
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', onVisibility);
    };
}

// ── The offer ────────────────────────────────────────────────────────────────

/**
 * Whether to propose saver mode, once, on a device that looks like it is
 * struggling. Offered, never imposed: the site does not know how the player
 * feels about the trade, and a surface that quietly removes its own spectacle is
 * a surface the player thinks is broken.
 *
 * The signals are weak on purpose. `deviceMemory` and `hardwareConcurrency` are
 * coarse and absent on iOS entirely; the Battery API is gone from Safari and
 * Firefox. None of them is worth acting on alone, all of them are fine for
 * deciding whether to *ask*, and the answer is remembered either way so nobody
 * is asked twice.
 */
export async function shouldOfferSaver() {
    if (typeof window === 'undefined') return false;
    if (saverOn) return false;

    try {
        if (window.localStorage.getItem(OFFER_KEY)) return false;
    } catch {
        // No storage means no memory of having asked, and a prompt that returns
        // every session is worse than never asking.
        return false;
    }

    // Someone who has already asked the OS for less motion has answered a
    // related question and does not need this one.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;

    const lowEnd = (navigator.deviceMemory !== undefined && navigator.deviceMemory <= 4)
        || (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4);

    if (lowEnd) return true;

    if (typeof navigator.getBattery === 'function') {
        try {
            const battery = await navigator.getBattery();
            if (!battery.charging && battery.level <= 0.2) return true;
        } catch { /* Permissions-Policy may block it; not worth reporting */ }
    }

    return false;
}

/** Record that the offer was answered, whichever way it went. */
export function markSaverOffered() {
    try {
        window.localStorage.setItem(OFFER_KEY, '1');
    } catch { /* see readStored */ }
}
