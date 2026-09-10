/*
 * ══════════════════════════════════════════════════════════════════════════
 * Sampled SFX — recordings played on the audio clock
 * ══════════════════════════════════════════════════════════════════════════
 *
 * For a short recording that has to land ON something. Everything else on this
 * site plays through an `<audio>` element, and that is the right tool right up
 * until the moment a sound has a deadline.
 *
 * ── WHAT WAS WRONG WITH THE ELEMENT ──────────────────────────────────────────
 *
 * THE ARRIVAL's crates were the case that forced this: four impacts, cued
 * 0.55s apart against boxes landing on a platform, and on the FIRST arrival of
 * a session every one of them was late. On the second they were perfect —
 * which is the signature of a cost paid once, and there turned out to be four
 * of them stacked up:
 *
 *   1. **The fetch.** `preload = 'auto'` is a hint, not an instruction. A
 *      browser opening a page with fourteen media elements on it defers most of
 *      them, so the first `play()` was still fetching.
 *   2. **The decode.** Even once fetched, an element decodes on demand.
 *   3. **`play()` is not immediate.** It returns a promise and schedules
 *      through the media pipeline; tens of milliseconds is normal and it is not
 *      bounded.
 *   4. **`setTimeout` is not a clock.** The crates were cued by four timers
 *      while the arrival's 3D scene was starting up — the one moment on this
 *      site where the main thread is guaranteed to be busy — and a timer that
 *      fires late fires late.
 *
 * A decoded `AudioBuffer` started on `ctx.currentTime + delay` answers all
 * four. The fetch and the decode happen once, up front, during idle time; the
 * start is sample-accurate; and the schedule is kept by the audio thread, so it
 * is immune to whatever the main thread is doing when the moment arrives.
 *
 * ── WHY NOT MOVE EVERY SFX HERE ──────────────────────────────────────────────
 *
 * Because only some of them have a deadline. The rarity stings fire when a
 * result lands and are heard against nothing in particular, so "a few tens of
 * milliseconds after the picture" is not observable and an element is simpler.
 * The module is written for names in general rather than for crates, so moving
 * another sound onto it later is a call to `primeSample` — but do it because a
 * sound has a beat to hit, not on principle.
 *
 * ── EVERY PATH FAILS SILENT ──────────────────────────────────────────────────
 *
 * No Web Audio, a suspended context, a 404, a corrupt file: `playSample`
 * returns false and the caller falls back to the element it already has. A
 * sound that cannot be scheduled precisely is still better played imprecisely
 * than not played at all — the fallback is the point of the boolean.
 */

import { audioBus, busIsRunning } from './audioBus.js';

/** name -> decoded AudioBuffer. The finished article. */
const buffers = new Map();
/** name -> in-flight promise, so two primes are one fetch. */
const pending = new Map();
/**
 * Sources scheduled but not yet finished.
 *
 * The cost of handing a cue sheet to the audio thread: it keeps that sheet even
 * if the thing being scored leaves the screen. An arrival unmounted early — a
 * second event, a navigation, a closed tab — has to be able to take its
 * remaining impacts back, and clearing a timer no longer does that.
 */
const scheduled = new Set();
/** Names that failed, so a broken file is not re-fetched on every arrival. */
const failed = new Set();

/**
 * Fetch and decode one sound, once.
 *
 * Safe to call as often as you like — the second call for a name is a no-op
 * whether the first has finished, is still running, or failed. Returns a
 * promise resolving to whether the sample is now playable, but nothing needs to
 * await it: the whole design is that priming happens long before playing.
 */
export function primeSample(name, url) {
    if (!name || !url) return Promise.resolve(false);
    if (buffers.has(name)) return Promise.resolve(true);
    if (failed.has(name)) return Promise.resolve(false);
    if (pending.has(name)) return pending.get(name);

    const b = audioBus();
    if (!b) return Promise.resolve(false);

    const work = (async () => {
        try {
            const res = await fetch(url, { credentials: 'omit' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const bytes = await res.arrayBuffer();
            // The callback form as well as the promise, because Safari only
            // grew the promise-returning overload late and this is exactly the
            // kind of sound that would silently never play on an older one.
            const buffer = await new Promise((resolve, reject) => {
                const out = b.ctx.decodeAudioData(bytes, resolve, reject);
                if (out && typeof out.then === 'function') out.then(resolve, reject);
            });
            buffers.set(name, buffer);
            return true;
        } catch (e) {
            // Marked failed rather than left pending: a missing file should cost
            // one request per session, and the element fallback still covers it.
            failed.add(name);
            console.warn(`[Sound] Could not prepare ${name} for precise playback:`, e?.message || e);
            return false;
        } finally {
            pending.delete(name);
        }
    })();

    pending.set(name, work);
    return work;
}

/** Whether this sound can be played on the audio clock right now. */
export function hasSample(name) {
    return buffers.has(name) && busIsRunning();
}

/**
 * Play a decoded sample, optionally at a delay measured on the AUDIO clock.
 *
 * `delay` is the whole reason this exists. Scheduling four impacts in one call
 * — `start(now + 0)`, `start(now + 0.55)`, and so on — hands the cue sheet to
 * the audio thread, which keeps it regardless of what the main thread is doing.
 * Four `setTimeout`s cannot promise that, and during THE ARRIVAL's opening they
 * demonstrably did not.
 *
 * @returns {boolean} true if it was scheduled; false means fall back.
 */
export function playSample(name, { delay = 0, volume = 1 } = {}) {
    const buffer = buffers.get(name);
    if (!buffer || volume <= 0) return false;

    const b = audioBus();
    // A suspended context accepts `start()` and then holds the clock, so the
    // sound would arrive whenever the player next touched the page rather than
    // on its beat. Refusing here sends the caller to the element, which is
    // subject to the same autoplay rules but at least fails visibly.
    if (!b || b.ctx.state !== 'running') return false;

    try {
        const src = b.ctx.createBufferSource();
        src.buffer = buffer;

        // Its own gain, connected to the bus rather than to the synth's master
        // — see audioBus.js for why those are two different inputs.
        const gain = b.ctx.createGain();
        gain.gain.value = Math.max(0, Math.min(1, volume));

        src.connect(gain);
        gain.connect(b.bus);
        src.start(b.ctx.currentTime + Math.max(0, delay));

        scheduled.add(src);
        src.onended = () => scheduled.delete(src);
        return true;
    } catch {
        // A node that will not build or connect. Fall back to the element.
        return false;
    }
}

/** Cancel everything scheduled and not yet finished. */
export function stopScheduledSamples() {
    for (const src of scheduled) {
        try {
            src.stop();
        } catch {
            // Already stopped or already finished. Nothing to do.
        }
    }
    scheduled.clear();
}
