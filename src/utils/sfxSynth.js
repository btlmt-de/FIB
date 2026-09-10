/*
 * ══════════════════════════════════════════════════════════════════════════
 * Synthesised SFX
 * ══════════════════════════════════════════════════════════════════════════
 *
 * A handful of short sounds built out of oscillators and filtered noise rather
 * than shipped as files. Everything here is a few hundred bytes of code against
 * the ~26 MB of mp3 already in `public/sounds`, and `SoundContext`'s header
 * explains at length why that number is worth caring about — .wav to mp3 saved
 * 42 MB and the Cloudflare cache miss on every one of them.
 *
 * ── WHY SYNTHESISED, AND NOT A SAMPLE PACK ───────────────────────────────────
 *
 * Mostly for one sound. THE PARLOUR's wheel ticks as each fret passes the pin,
 * and that tick has to SLOW WITH THE WHEEL — it is the whole sound of a
 * roulette, and a loop cannot do it because it would drift out of phase with
 * the thing on screen within a second. `CanvasRouletteStrip` already knows the
 * ring's speed exactly (it differentiates the offset, which is a closed-form
 * function of `t`), so a tick fired once per pocket crossing is locked to the
 * picture by construction. Nothing sampled gets that for free.
 *
 * The rest follow because they may as well: a chip is a click and a thud, a
 * bell is two partials, and none of them wants a licence, a download or a byte
 * of cache.
 *
 * ── THE CONTEXT LIVES NEXT DOOR ──────────────────────────────────────────────
 *
 * It used to be declared here, together with the compressor every voice goes
 * through. It moved to `audioBus.js` when THE ARRIVAL's crates needed the same
 * context — two clients is the second-use test — and the reasoning for the
 * compressor, and for the context being lazy, moved with it.
 *
 * `master` is still this module's own input: the voices below carry no gain of
 * their own, so `playSynth` sets the bus's gain per call. That is exactly why
 * samples connect somewhere else; see audioBus.js.
 */

import { audioBus } from './audioBus.js';

let master = null;
let noiseBuffer = null;

/** The context, with `master` refreshed from the bus. Null where unavailable. */
function audio() {
    const b = audioBus();
    if (!b) return null;
    master = b.master;
    return b.ctx;
}

/** One second of white noise, made once and re-used by every noisy voice. */
function noise(c) {
    if (!noiseBuffer) {
        noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    return src;
}

/** A gain node carrying one percussive envelope, connected to the master. */
function envelope(c, at, peak, attack, decay) {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
    g.connect(master);
    return g;
}

function tone(c, at, freq, peak, attack, decay, type = 'sine') {
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    const g = envelope(c, at, peak, attack, decay);
    osc.connect(g);
    osc.start(at);
    osc.stop(at + attack + decay + 0.02);
    return osc;
}

function noiseHit(c, at, { freq, q = 1, peak = 0.4, attack = 0.001, decay = 0.04, type = 'bandpass' }) {
    const src = noise(c);
    const filter = c.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, at);
    filter.Q.value = q;
    const g = envelope(c, at, peak, attack, decay);
    src.connect(filter);
    filter.connect(g);
    src.start(at);
    src.stop(at + attack + decay + 0.02);
}

/* ── the voices ─────────────────────────────────────────────────────────────
 *
 * Each takes the context and a start time so a voice can schedule several
 * events without drifting — `ctx.currentTime` read twice in one function is
 * two different numbers.
 */
const VOICES = {
    /**
     * A fret passing the pin. `speed` is the ring's travel in px/s, and both the
     * brightness and the level ride on it: a wheel barely turning gives a dull
     * distant knock, a wheel at full pelt gives a bright hard click. That is the
     * one property this sound has to have — it is the reason it is synthesised.
     */
    parlour_tick(c, at, { speed = 0 } = {}) {
        const drive = Math.max(0, Math.min(1, speed / 3000));
        /*
         * Level rises and then eases back, rather than climbing with speed.
         *
         * Measured over a real spin the ring crosses about 39 frets in the
         * first second after release, 15 in the next, 3 in the one after that.
         * At the top of that the individual ticks are no longer individual, and
         * pinning them at full level turns the release into a buzz. Loudest
         * where you can still count them, easing off into the rattle — which is
         * also what a ball does. The brightness keeps climbing throughout, so
         * fast still reads as fast.
         */
        noiseHit(c, at, {
            freq: 1500 + drive * 2600,
            q: 1.6 + drive * 1.4,
            peak: 0.05 + 0.30 * drive * (1 - 0.55 * drive),
            attack: 0.0008,
            decay: 0.018 + (1 - drive) * 0.02,
        });
    },

    /** A chip going down on felt: a soft click over a small dull thud. */
    parlour_chip(c, at) {
        noiseHit(c, at, { freq: 1250, q: 1.1, peak: 0.30, attack: 0.001, decay: 0.035 });
        tone(c, at, 190, 0.22, 0.002, 0.075);
        tone(c, at + 0.012, 320, 0.10, 0.002, 0.05, 'triangle');
    },

    /** "No more bets." A firm double knock on the rim. */
    parlour_call(c, at) {
        for (const off of [0, 0.11]) {
            noiseHit(c, at + off, { freq: 700, q: 0.9, peak: 0.26, attack: 0.001, decay: 0.05 });
            tone(c, at + off, 132, 0.30, 0.003, 0.10);
        }
    },

    /**
     * The winning pocket lighting. A brass bell — three partials at slightly
     * inharmonic ratios, the upper ones decaying first, which is the difference
     * between a bell and an organ.
     */
    parlour_reveal(c, at) {
        tone(c, at, 784, 0.30, 0.004, 1.30);
        tone(c, at, 1568, 0.16, 0.003, 0.70);
        tone(c, at, 2163, 0.09, 0.003, 0.34);
        noiseHit(c, at, { freq: 5200, q: 0.8, peak: 0.10, attack: 0.001, decay: 0.05 });
    },

    /**
     * An event beginning. A short rising swell with a noise riser under it —
     * deliberately not a fanfare, because four different events share it and it
     * has to sit under each of their own banners rather than announce itself.
     */
    event_start(c, at) {
        const osc = c.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(330, at);
        osc.frequency.exponentialRampToValueAtTime(660, at + 0.34);
        const g = envelope(c, at, 0.26, 0.06, 0.34);
        osc.connect(g);
        osc.start(at);
        osc.stop(at + 0.45);

        const src = noise(c);
        const filter = c.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(900, at);
        filter.frequency.exponentialRampToValueAtTime(4200, at + 0.32);
        filter.Q.value = 1.2;
        const ng = envelope(c, at, 0.13, 0.10, 0.26);
        src.connect(filter);
        filter.connect(ng);
        src.start(at);
        src.stop(at + 0.42);
    },

    /** Somebody won. A three-note rise, bright and over quickly. */
    event_win(c, at) {
        const notes = [784, 988, 1319];
        notes.forEach((f, i) => {
            const when = at + i * 0.085;
            tone(c, when, f, 0.26, 0.004, 0.24, 'triangle');
            tone(c, when, f * 2, 0.09, 0.004, 0.16);
        });
        tone(c, at + notes.length * 0.085, 1568, 0.20, 0.005, 0.85);
    },
};

/** The names this module can play. Used by SoundContext to route unknown keys. */
export const SYNTH_SOUNDS = Object.keys(VOICES);

/**
 * Play one synthesised sound.
 *
 * @param {string} name   one of SYNTH_SOUNDS
 * @param {number} volume 0..1, already multiplied out of the user's settings
 * @param {object} [opts] passed to the voice (the tick reads `speed`)
 * @returns {boolean} whether anything was scheduled
 */
export function playSynth(name, volume = 1, opts) {
    const voice = VOICES[name];
    if (!voice || volume <= 0) return false;

    const c = audio();
    if (!c) return false;

    try {
        master.gain.value = Math.max(0, Math.min(1, volume));
        voice(c, c.currentTime + 0.001, opts);
        return true;
    } catch {
        return false;
    }
}
