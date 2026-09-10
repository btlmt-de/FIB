/*
 * ══════════════════════════════════════════════════════════════════════════
 * The Web Audio bus
 * ══════════════════════════════════════════════════════════════════════════
 *
 * One AudioContext for the whole site, and one compressor everything goes
 * through. It lived inside `sfxSynth.js` until the arrival's crates needed it
 * too, and two clients is the second-use test.
 *
 * ── THE COMPRESSOR IS NOT POLISH ─────────────────────────────────────────────
 *
 * THE PARLOUR's wheel passes about sixteen frets a second at full speed and
 * ticks on every one. Sixteen overlapping transients into a bare destination
 * clip audibly; through a compressor they become a clatter that gets denser
 * rather than louder, which is also what a real wheel does. Anything else that
 * plays here inherits that for free, which is the argument for one bus rather
 * than a context per feature.
 *
 * ── TWO INPUTS, AND WHY THEY ARE NOT ONE ─────────────────────────────────────
 *
 * `master` is the synth's, and `playSynth` sets its gain per call — the
 * synthesised voices have no gain of their own, so the bus carries their
 * volume. That makes it useless to anyone else: a sample connected to `master`
 * would come out at whatever volume the last tick happened to set.
 *
 * So samples connect to `bus` directly and bring their own gain node. Same
 * compressor, same context, independent levels. Whichever you connect to, the
 * signal ends up in the same place.
 *
 * ── IT IS LAZY, AND MAY NEVER OPEN ───────────────────────────────────────────
 *
 * Browsers refuse to start audio without a user gesture, so the context is
 * created on first use rather than at import, and `resume()` is attempted every
 * time in case a tab switch suspended it. If any of that fails, callers get
 * null and are expected to fall silent — a page that throws because it could
 * not click is worse than a quiet page.
 *
 * A context created before any gesture starts SUSPENDED, and that is fine and
 * deliberate: `decodeAudioData` works on a suspended context, which is what
 * lets samples be decoded during idle time and be ready the instant the first
 * gesture resumes it.
 */

let ctx = null;
let master = null;
let bus = null;

/**
 * The shared context and its two input nodes, or null where audio is
 * unavailable.
 *
 * @returns {{ctx: AudioContext, master: GainNode, bus: AudioNode}|null}
 */
export function audioBus() {
    if (typeof window === 'undefined') return null;

    if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try {
            ctx = new AC();
        } catch {
            return null;
        }

        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.knee.value = 24;
        comp.ratio.value = 6;
        comp.attack.value = 0.003;
        comp.release.value = 0.12;
        comp.connect(ctx.destination);
        bus = comp;

        master = ctx.createGain();
        master.gain.value = 1;
        master.connect(bus);
    }

    if (ctx.state === 'suspended') {
        // Fire and forget: if the gesture has not happened yet this rejects and
        // whatever wanted a sound is simply lost, which is the correct outcome.
        ctx.resume().catch(() => {});
    }

    return { ctx, master, bus };
}

/** Whether the bus is open and actually running — i.e. will play now. */
export function busIsRunning() {
    return !!ctx && ctx.state === 'running';
}

/**
 * Nudge the context awake from a real user gesture.
 *
 * Called from SoundContext's interaction listener. Without it the first sound
 * of a session is usually lost: the context would otherwise be created inside
 * whatever non-gesture callback happened to want a sound first, and start
 * suspended.
 *
 * It also opens the audio DEVICE, which is the other half of why the first
 * sound of a session used to be late even when its file was already in the
 * cache.
 */
export function unlockAudioBus() {
    audioBus();
}
