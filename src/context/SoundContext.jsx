import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { SYNTH_SOUNDS, playSynth } from '../utils/sfxSynth.js';
import { unlockAudioBus } from '../utils/audioBus.js';
import { primeSample, playSample, stopScheduledSamples } from '../utils/sfxSamples.js';

// ============================================
// Sound Context - Manages all game audio
// ============================================

const SoundContext = createContext(null);

// Sound file paths (relative to public folder)
// All mp3. These were WAV originally - 47 MB between them, against 5 MB as mp3 at the
// same ~195 kbps the other tracks already use. Two reasons that mattered:
//
//   1. Size. spin.wav and soundtrack.wav were 15.5 MB each for 92 seconds of audio.
//   2. Cloudflare does not cache .wav by default, so every one of those megabytes was
//      served from the origin VPS on every request while the mp3s were edge cached.
//
// The .wav sources no longer ship: public/sounds is mp3 only. Anything added here gets
// the same treatment on the way in — `ffmpeg -i x.wav -codec:a libmp3lame -q:a 2 x.mp3`
// is what the existing files were encoded with (~160-190 kbps VBR), and the source wav
// stays out of public/ because Vite copies that directory verbatim into the deploy.
const SOUND_FILES = {
    spin: '/sounds/spin.mp3',
    soundtrack: '/sounds/soundtrack.mp3',
    recursionSoundtrack: '/sounds/recursion_soundtrack.mp3',
    kotwSoundtrack: '/sounds/KOTW.mp3',
    goldRushSoundtrack: '/sounds/gold.mp3',
    firstBloodSoundtrack: '/sounds/blood.mp3',
    communityGoalSoundtrack: '/sounds/community.mp3',
    /*
     * THE ARRIVAL's bed, and it is the one "soundtrack" here that does not loop.
     *
     * It is a single 23s take cut against the event's own beats — the train
     * coming in, standing, and pulling out — so looping it would be looping a
     * departure back into an approach. `startArrivalSoundtrack` sets
     * `loop = false` explicitly for that reason; see the note there.
     */
    arrivalSoundtrack: '/sounds/train/trainsfx_full.mp3',
    /*
     * One crate landing, four ways.
     *
     * Same event, four takes at four pitches, and the scene plays take `i` on
     * wagon `i` — which is the whole reason `MAX_CRATES` is four. They cover the
     * impact AND the lid, because that is how they were recorded: one gesture,
     * not two samples to line up against LID_DELAY_S.
     */
    arrivalCrate1: '/sounds/train/trainsfx_crate1.mp3',
    arrivalCrate2: '/sounds/train/trainsfx_crate2.mp3',
    arrivalCrate3: '/sounds/train/trainsfx_crate3.mp3',
    arrivalCrate4: '/sounds/train/trainsfx_crate4.mp3',
    /*
     * THE PARLOUR's bed, and the second soundtrack here that does not loop.
     *
     * 30.9s against an event that ends at T_END = 29.6s, because it is one
     * scored take cut to the room's own beats — the slots turning over, the
     * betting window, the hush at the call, and the shower after the pocket
     * lights. Looping it would loop the room emptying back into the deal.
     *
     * Unlike THE ARRIVAL's it is also SOUGHT rather than merely started. A
     * parlour is a room you can walk into halfway (rouletteTimeline.js records
     * why every beat is measured from the server's origin), and a bed that
     * always began at zero would put the deal under the reveal — so
     * `startParlourSoundtrack` takes the elapsed offset and seeks to it.
     */
    parlourSoundtrack: '/sounds/roulette.mp3',
    recursion: '/sounds/recursion.mp3',
    insane: '/sounds/sfxinsane.mp3',
    mythic: '/sounds/sfxmythic.mp3',
    legendary: '/sounds/sfxlegendary.mp3',
    exotic: '/sounds/sfxexotic.mp3',
    rare: '/sounds/sfxrare.mp3',
};

// Default volume settings
const DEFAULT_SETTINGS = {
    masterVolume: 0.5,
    musicVolume: 0.5,
    sfxVolume: 0.7,
    enabled: true,
    // Individual sound toggles
    soundtrackEnabled: true,
    recursionSoundtrackEnabled: true,
    kotwSoundtrackEnabled: true,
    goldRushSoundtrackEnabled: true,
    firstBloodSoundtrackEnabled: true,
    communityGoalSoundtrackEnabled: true,
    arrivalSoundtrackEnabled: true,
    /*
     * One switch for all four crate takes. They are four files because a row of
     * identical impacts sounds like a stutter, not because they are four
     * different sounds a player would want to hold an opinion about
     * individually — so `playArrivalCrate` reads this key rather than letting
     * playSfx's `${name}Enabled` convention put four rows in the settings panel.
     */
    arrivalCrateEnabled: true,
    parlourSoundtrackEnabled: true,
    recursionEnabled: true,
    insaneEnabled: true,
    mythicEnabled: true,
    legendaryEnabled: true,
    exoticEnabled: true,
    rareEnabled: true,
};

/*
 * Which soundtrack belongs to which global event.
 *
 * Here rather than at the call site because the caller that needs it is the
 * SELECTION WHEEL, which knows an event type four seconds before the event
 * exists and knows nothing about sound files. `primeEventSound` is the whole
 * public surface; the map never leaves this module.
 *
 * `gold_rush` is still listed. It cannot be drawn by the rotation any more, but
 * an admin can force one, and a retired event that fires silently on its first
 * play is the same bug this file is fixing.
 */
const EVENT_SOUNDTRACK = {
    arrival: 'arrivalSoundtrack',
    roulette: 'parlourSoundtrack',
    king_of_wheel: 'kotwSoundtrack',
    first_blood: 'firstBloodSoundtrack',
    community_goal: 'communityGoalSoundtrack',
    gold_rush: 'goldRushSoundtrack',
};

/*
 * The two takes that are CUT AGAINST A PICTURE, and the only ones where a late
 * start is a bug rather than a beat.
 *
 * Everything else here is a bed under an event that runs for minutes and can be
 * joined halfway: starting KING OF THE WHEEL's loop half a second late is not
 * observable by anyone. THE ARRIVAL is 23 seconds scored to an 18.6 second
 * event and THE PARLOUR is 30.9 against 29.6 — every beat in them lines up with
 * something on screen, so half a second late is half a second wrong for the
 * whole take.
 *
 * They are also, by a distance, the two smallest: 484KB and 824KB against
 * 5.6–8.7MB for the loops. That is what makes the idle warm-up below affordable
 * — see the note there.
 */
const SCORED_TAKES = ['arrivalSoundtrack', 'parlourSoundtrack'];

/*
 * The sounds that are DECODED and played on the audio clock rather than through
 * an `<audio>` element.
 *
 * The four crate takes, and only them, because they are the only sounds on this
 * site with a deadline: wagon `i`'s impact is cued against wagon `i`'s box
 * touching the paving, four of them 0.55s apart, while the arrival's 3D scene is
 * starting up. sfxSamples.js lists the four separate first-play costs an element
 * was paying there — fetch, decode, `play()` latency and `setTimeout` jitter —
 * and why a decoded buffer answers all four.
 *
 * The rarity stings stay on elements. They fire when a result lands and are
 * heard against nothing in particular, so a few tens of milliseconds is not
 * observable and an element is the simpler thing. Move a sound here because it
 * has a beat to hit, not on principle.
 */
const SAMPLED_SFX = ['arrivalCrate1', 'arrivalCrate2', 'arrivalCrate3', 'arrivalCrate4'];

/*
 * How far out of step the audio has to be before a seek is worth its own cost.
 *
 * A seek is not free: it can produce an audible gap, and on a stream that is
 * still buffering it can produce a second stall. 120ms is under the threshold
 * at which a listener pairs a sound with a picture, so correcting below it
 * would be spending a real artefact to fix one nobody can hear.
 */
const DRIFT_TOLERANCE_S = 0.12;

/**
 * Start a scored take wherever the picture already is, not at the top.
 *
 * ── WHY `elapsedAt` IS A FUNCTION AND NOT A NUMBER ───────────────────────────
 *
 * This is the whole fix. The offset used to be computed by the caller and
 * passed in, which meant it was measured BEFORE the fetch — and the fetch is
 * exactly the thing that makes a first play late. A take asked to start at 0.0
 * and handed a network round trip began at 0.0 anyway, three quarters of a
 * second after the picture it was cut against. Passing the clock instead of a
 * reading means the offset is taken at the last possible moment, so however
 * long the file took to arrive, the take joins the picture rather than trailing
 * it.
 *
 * ── TWO CHANCES TO GET IT RIGHT ──────────────────────────────────────────────
 *
 * `loadedmetadata` is the coarse one and does the real work: it fires once the
 * fetch has produced a header, so it is already on the far side of the latency,
 * and the element is not playing yet — a seek there costs nothing at all.
 *
 * `playing` is the fine one, and it exists because `loadedmetadata` is not the
 * moment sound comes out of the speaker; decoding and buffering sit between
 * them. It only acts if the drift is still over the tolerance, so on a warm
 * take — the common case, thanks to the warm-up — it does nothing.
 *
 * Setting `currentTime` on a `preload = 'none'` element that has never loaded
 * is dropped by some browsers and honoured by others, which is why neither of
 * these seeks happens before `play()` has been called. That difference shows up
 * as "the music is out of sync, but only on Safari".
 *
 * ── WHY THERE IS NO TEARDOWN ─────────────────────────────────────────────────
 *
 * Both listeners are `once`, so they remove themselves the moment they fire and
 * nothing accumulates across events. The one case that looks like a leak — a
 * take stopped before its metadata ever arrived — resolves harmlessly: the
 * pending listener fires against a paused element, seeks it, and the next
 * `start` sets `currentTime` again before playing. And if two starts are in
 * flight at once, listeners fire in registration order, so the NEWER clock is
 * the one that lands last and wins, which is the way round it has to be.
 */
function joinTake(audio, elapsedAt) {
    // A caller with no clock to offer gets the old behaviour — start at the top
    // — rather than an exception. The looping beds never pass one.
    if (typeof elapsedAt !== 'function') return;

    let corrected = false;

    const seek = () => {
        const want = Math.max(0, Number(elapsedAt()) || 0);
        // A take shorter than the offset asked for should sit silent at its end
        // rather than throw, and must never wrap back round to the opening.
        const target = Number.isFinite(audio.duration)
            ? Math.min(want, Math.max(0, audio.duration - 0.05))
            : want;
        if (Math.abs(audio.currentTime - target) < DRIFT_TOLERANCE_S) return;
        try {
            audio.currentTime = target;
        } catch (e) {
            // The element refused the seek. Playing from wherever it is beats
            // not playing, and the `playing` pass gets another go.
        }
    };

    const onMetadata = () => seek();
    const onPlaying = () => {
        if (corrected) return;
        corrected = true;
        seek();
    };

    if (audio.readyState >= 1) seek();
    else audio.addEventListener('loadedmetadata', onMetadata, { once: true });
    audio.addEventListener('playing', onPlaying, { once: true });
}

// Load settings from localStorage
function loadSettings() {
    try {
        const saved = localStorage.getItem('fib-sound-settings');
        if (saved) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.warn('Failed to load sound settings:', e);
    }
    return DEFAULT_SETTINGS;
}

// Save settings to localStorage
function saveSettings(settings) {
    try {
        localStorage.setItem('fib-sound-settings', JSON.stringify(settings));
    } catch (e) {
        console.warn('Failed to save sound settings:', e);
    }
}

export function SoundProvider({ children }) {
    const [settings, setSettings] = useState(loadSettings);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isRecursionPlaying, setIsRecursionPlaying] = useState(false);
    const [isKotwPlaying, setIsKotwPlaying] = useState(false);
    const [isGoldRushPlaying, setIsGoldRushPlaying] = useState(false);
    const [isCommunityGoalPlaying, setIsCommunityGoalPlaying] = useState(false);
    const [isFirstBloodPlaying, setIsFirstBloodPlaying] = useState(false);
    const [isArrivalPlaying, setIsArrivalPlaying] = useState(false);
    const [isParlourPlaying, setIsParlourPlaying] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [previewingSound, setPreviewingSound] = useState(null); // Track which sound is previewing

    // Audio refs
    const spinRef = useRef(null);
    const soundtrackRef = useRef(null);
    const recursionSoundtrackRef = useRef(null);
    const kotwSoundtrackRef = useRef(null);
    const goldRushSoundtrackRef = useRef(null);
    const firstBloodSoundtrackRef = useRef(null);
    const communityGoalSoundtrackRef = useRef(null);
    const arrivalSoundtrackRef = useRef(null);
    const parlourSoundtrackRef = useRef(null);
    const sfxRefs = useRef({
        arrivalCrate1: null,
        arrivalCrate2: null,
        arrivalCrate3: null,
        arrivalCrate4: null,
        recursion: null,
        insane: null,
        mythic: null,
        legendary: null,
        exotic: null,
        rare: null,
    });

    // For SFX preview
    const previewingRef = useRef(null);
    const previewTimeoutRef = useRef(null);

    // Track if audio is loaded
    const [audioLoaded, setAudioLoaded] = useState(false);

    // Initialize audio elements
    //
    // Every soundtrack below is created with preload='none' on purpose. These files add
    // up to ~66 MB, and 'auto' had the browser fetch all of them the moment the page
    // mounted - which saturates the six-connection-per-origin budget and leaves
    // wheel.png, the sprite atlas and the API calls queueing behind tens of megabytes of
    // music nobody has asked to hear yet. Observed effect: wheel.png taking 90 seconds.
    //
    // 'none' means the file is fetched when play() is first called, and browsers stream
    // audio progressively, so playback still starts promptly. The trade is that the very
    // first spin's music may begin a beat late on a slow connection - far cheaper than
    // making every visitor wait on the whole library before the wheel appears.
    //
    // The SFX below keep 'auto': together they are ~5 MB and they have to fire the
    // instant a result lands, where a late sound would be obvious.
    //
    // The bigger win still on the table is the format. spin.wav and soundtrack.wav are
    // 15.5 MB each as uncompressed WAV; as mp3 they would be a tenth of that.
    useEffect(() => {
        // Create spin intro audio element (plays once before soundtrack loops)
        const spin = new Audio(SOUND_FILES.spin);
        spin.loop = false;
        spin.preload = 'none';
        spin.onerror = () => console.warn('[Sound] Spin file not found - add spin.mp3 to /public/sounds/');
        spinRef.current = spin;

        // Create main soundtrack audio element (loops after spin)
        const soundtrack = new Audio(SOUND_FILES.soundtrack);
        soundtrack.loop = true;
        soundtrack.preload = 'none';
        soundtrack.onerror = () => console.warn('[Sound] Soundtrack file not found - add soundtrack.mp3 to /public/sounds/');
        soundtrackRef.current = soundtrack;

        // Create recursion soundtrack audio element
        const recursionSoundtrack = new Audio(SOUND_FILES.recursionSoundtrack);
        recursionSoundtrack.loop = true;
        recursionSoundtrack.preload = 'none';
        recursionSoundtrack.onerror = () => console.warn('[Sound] Recursion soundtrack file not found - add recursion_soundtrack.mp3 to /public/sounds/');
        recursionSoundtrackRef.current = recursionSoundtrack;

        // Create KOTW soundtrack audio element
        const kotwSoundtrack = new Audio(SOUND_FILES.kotwSoundtrack);
        kotwSoundtrack.loop = true;
        kotwSoundtrack.preload = 'none';
        kotwSoundtrack.onerror = () => console.warn('[Sound] KOTW soundtrack file not found - add KOTW.mp3 to /public/sounds/');
        kotwSoundtrackRef.current = kotwSoundtrack;

        // Create Gold Rush soundtrack audio element
        const goldRushSoundtrack = new Audio(SOUND_FILES.goldRushSoundtrack);
        goldRushSoundtrack.loop = true;
        goldRushSoundtrack.preload = 'none';
        goldRushSoundtrack.onerror = () => console.warn('[Sound] Gold Rush soundtrack file not found - add gold.mp3 to /public/sounds/');
        goldRushSoundtrackRef.current = goldRushSoundtrack;

        // Create First Blood soundtrack audio element
        const firstBloodSoundtrack = new Audio(SOUND_FILES.firstBloodSoundtrack);
        firstBloodSoundtrack.loop = true;
        firstBloodSoundtrack.preload = 'none';
        firstBloodSoundtrack.onerror = () => console.warn('[Sound] First Blood soundtrack file not found - add blood.mp3 to /public/sounds/');
        firstBloodSoundtrackRef.current = firstBloodSoundtrack;

        // Create Community Goal soundtrack audio element
        const communityGoalSoundtrack = new Audio(SOUND_FILES.communityGoalSoundtrack);
        communityGoalSoundtrack.loop = true;
        communityGoalSoundtrack.preload = 'none';
        communityGoalSoundtrack.onerror = () => console.warn('[Sound] Community Goal soundtrack file not found - add community.mp3 to /public/sounds/');
        communityGoalSoundtrackRef.current = communityGoalSoundtrack;

        // Create Arrival audio element
        //
        // `loop = false`, unlike every other track above: it is 23 seconds cut
        // against an 18.6 second event that has a beginning and an end. Set here
        // AND in startArrivalSoundtrack, because previewSound turns looping on
        // for whatever it is previewing and only turns it back off for things it
        // classifies as SFX. Rather than teach that classifier about a
        // non-looping soundtrack, the start path simply asserts what it needs.
        const arrivalSoundtrack = new Audio(SOUND_FILES.arrivalSoundtrack);
        arrivalSoundtrack.loop = false;
        arrivalSoundtrack.preload = 'none';
        arrivalSoundtrack.onerror = () => console.warn('[Sound] Arrival soundtrack file not found - add train/trainsfx_full.mp3 to /public/sounds/');
        arrivalSoundtrackRef.current = arrivalSoundtrack;

        // Create Parlour audio element
        //
        // `loop = false` for the arrival's reason, restated here because the
        // two are the only non-looping tracks in this file: it is a finished
        // take, not a bed that can run under an open-ended event. Set here AND
        // in startParlourSoundtrack, because previewSound turns looping on for
        // whatever it is previewing and only turns it back off for things it
        // classifies as SFX.
        const parlourSoundtrack = new Audio(SOUND_FILES.parlourSoundtrack);
        parlourSoundtrack.loop = false;
        parlourSoundtrack.preload = 'none';
        parlourSoundtrack.onerror = () => console.warn('[Sound] Parlour soundtrack file not found - add roulette.mp3 to /public/sounds/');
        parlourSoundtrackRef.current = parlourSoundtrack;

        // Create SFX audio elements
        //
        // 'auto' for everything except the four crate takes, which are fetched
        // and decoded by sfxSamples.js instead. Leaving those on 'auto' would
        // pull the same four files down twice — once as an element and once as
        // an ArrayBuffer — for a path that now only runs if Web Audio is
        // unavailable or the settings panel previews one.
        Object.keys(sfxRefs.current).forEach(key => {
            const audio = new Audio(SOUND_FILES[key]);
            audio.preload = SAMPLED_SFX.includes(key) ? 'none' : 'auto';
            audio.onerror = () => console.warn(`[Sound] ${key} file not found - add ${SOUND_FILES[key].split('/').pop()} to /public/sounds/`);
            sfxRefs.current[key] = audio;
        });

        setAudioLoaded(true);

        // Cleanup
        return () => {
            if (spinRef.current) {
                spinRef.current.pause();
                spinRef.current = null;
            }
            if (soundtrackRef.current) {
                soundtrackRef.current.pause();
                soundtrackRef.current = null;
            }
            if (recursionSoundtrackRef.current) {
                recursionSoundtrackRef.current.pause();
                recursionSoundtrackRef.current = null;
            }
            if (kotwSoundtrackRef.current) {
                kotwSoundtrackRef.current.pause();
                kotwSoundtrackRef.current = null;
            }
            if (goldRushSoundtrackRef.current) {
                goldRushSoundtrackRef.current.pause();
                goldRushSoundtrackRef.current = null;
            }
            if (communityGoalSoundtrackRef.current) {
                communityGoalSoundtrackRef.current.pause();
                communityGoalSoundtrackRef.current = null;
            }
            if (firstBloodSoundtrackRef.current) {
                firstBloodSoundtrackRef.current.pause();
                firstBloodSoundtrackRef.current = null;
            }
            if (arrivalSoundtrackRef.current) {
                arrivalSoundtrackRef.current.pause();
                arrivalSoundtrackRef.current = null;
            }
            if (parlourSoundtrackRef.current) {
                parlourSoundtrackRef.current.pause();
                parlourSoundtrackRef.current = null;
            }
            Object.keys(sfxRefs.current).forEach(key => {
                if (sfxRefs.current[key]) {
                    sfxRefs.current[key].pause();
                    sfxRefs.current[key] = null;
                }
            });
        };
    }, []);

    // Update spin and soundtrack volume when settings change (real-time)
    useEffect(() => {
        const effectiveVolume = settings.enabled && settings.soundtrackEnabled
            ? settings.masterVolume * settings.musicVolume
            : 0;

        if (spinRef.current) {
            spinRef.current.volume = effectiveVolume;
        }
        if (soundtrackRef.current) {
            soundtrackRef.current.volume = effectiveVolume;
        }
    }, [settings.masterVolume, settings.musicVolume, settings.enabled, settings.soundtrackEnabled]);

    // Update recursion soundtrack volume when settings change (real-time)
    useEffect(() => {
        if (recursionSoundtrackRef.current) {
            const effectiveVolume = settings.enabled && settings.recursionSoundtrackEnabled
                ? settings.masterVolume * settings.musicVolume
                : 0;
            recursionSoundtrackRef.current.volume = effectiveVolume;
        }
    }, [settings.masterVolume, settings.musicVolume, settings.enabled, settings.recursionSoundtrackEnabled]);

    // Update KOTW soundtrack volume when settings change (real-time)
    useEffect(() => {
        if (kotwSoundtrackRef.current) {
            const effectiveVolume = settings.enabled && settings.kotwSoundtrackEnabled
                ? settings.masterVolume * settings.musicVolume
                : 0;
            kotwSoundtrackRef.current.volume = effectiveVolume;
        }
    }, [settings.masterVolume, settings.musicVolume, settings.enabled, settings.kotwSoundtrackEnabled]);

    // Update Gold Rush soundtrack volume when settings change (real-time)
    useEffect(() => {
        if (goldRushSoundtrackRef.current) {
            const effectiveVolume = settings.enabled && settings.goldRushSoundtrackEnabled
                ? settings.masterVolume * settings.musicVolume
                : 0;
            goldRushSoundtrackRef.current.volume = effectiveVolume;
        }
    }, [settings.masterVolume, settings.musicVolume, settings.enabled, settings.goldRushSoundtrackEnabled]);

    // Update First Blood soundtrack volume when settings change (real-time)
    useEffect(() => {
        if (firstBloodSoundtrackRef.current) {
            const effectiveVolume = settings.enabled && settings.firstBloodSoundtrackEnabled
                ? settings.masterVolume * settings.musicVolume
                : 0;
            firstBloodSoundtrackRef.current.volume = effectiveVolume;
        }
    }, [settings.masterVolume, settings.musicVolume, settings.enabled, settings.firstBloodSoundtrackEnabled]);

    // Update Community Goal soundtrack volume when settings change (real-time)
    useEffect(() => {
        if (communityGoalSoundtrackRef.current) {
            const effectiveVolume = settings.enabled && settings.communityGoalSoundtrackEnabled
                ? settings.masterVolume * settings.musicVolume
                : 0;
            communityGoalSoundtrackRef.current.volume = effectiveVolume;
        }
    }, [settings.masterVolume, settings.musicVolume, settings.enabled, settings.communityGoalSoundtrackEnabled]);

    // Update Arrival soundtrack volume when settings change (real-time)
    useEffect(() => {
        if (arrivalSoundtrackRef.current) {
            const effectiveVolume = settings.enabled && settings.arrivalSoundtrackEnabled
                ? settings.masterVolume * settings.musicVolume
                : 0;
            arrivalSoundtrackRef.current.volume = effectiveVolume;
        }
    }, [settings.masterVolume, settings.musicVolume, settings.enabled, settings.arrivalSoundtrackEnabled]);

    // Update Parlour soundtrack volume when settings change (real-time)
    useEffect(() => {
        if (parlourSoundtrackRef.current) {
            const effectiveVolume = settings.enabled && settings.parlourSoundtrackEnabled
                ? settings.masterVolume * settings.musicVolume
                : 0;
            parlourSoundtrackRef.current.volume = effectiveVolume;
        }
    }, [settings.masterVolume, settings.musicVolume, settings.enabled, settings.parlourSoundtrackEnabled]);

    // Update SFX volumes in real-time (for any currently playing sounds including preview)
    useEffect(() => {
        const effectiveVolume = settings.enabled
            ? settings.masterVolume * settings.sfxVolume
            : 0;

        // Update any playing SFX
        Object.values(sfxRefs.current).forEach(audio => {
            if (audio && !audio.paused) {
                audio.volume = effectiveVolume;
            }
        });

        // Also update preview if it's an SFX (not soundtrack)
        if (previewingRef.current && !previewingRef.current.paused) {
            previewingRef.current.volume = Math.max(0.1, effectiveVolume);
        }
    }, [settings.masterVolume, settings.sfxVolume, settings.enabled]);

    // Save settings when they change
    useEffect(() => {
        saveSettings(settings);
    }, [settings]);

    /*
     * One name to one element, in one place.
     *
     * `previewSound` used to own this as an if/else chain and its own comment
     * explains why that mattered — a track missing from the chain fell through
     * to the SFX branch and reported "file not loaded", which is how the
     * Community Goal's preview was broken for a build. There are three callers
     * now (preview, prime and the warm-up), so the chain is a function and
     * adding a track means one branch rather than three.
     *
     * `isSoundtrack` rides along because preview needs it to pick which volume
     * slider applies, and it is decided beside the element rather than by a
     * second list of names further down.
     */
    const audioFor = useCallback((name) => {
        switch (name) {
            case 'spin': return { audio: spinRef.current, isSoundtrack: true };
            case 'soundtrack': return { audio: soundtrackRef.current, isSoundtrack: true };
            case 'recursionSoundtrack': return { audio: recursionSoundtrackRef.current, isSoundtrack: true };
            case 'kotwSoundtrack': return { audio: kotwSoundtrackRef.current, isSoundtrack: true };
            case 'goldRushSoundtrack': return { audio: goldRushSoundtrackRef.current, isSoundtrack: true };
            case 'firstBloodSoundtrack': return { audio: firstBloodSoundtrackRef.current, isSoundtrack: true };
            case 'communityGoalSoundtrack': return { audio: communityGoalSoundtrackRef.current, isSoundtrack: true };
            case 'arrivalSoundtrack': return { audio: arrivalSoundtrackRef.current, isSoundtrack: true };
            case 'parlourSoundtrack': return { audio: parlourSoundtrackRef.current, isSoundtrack: true };
            default: return { audio: sfxRefs.current[name] || null, isSoundtrack: false };
        }
    }, []);

    /** Files already told to fetch, so a second ask costs nothing. */
    const primedRef = useRef(new Set());

    /**
     * Start fetching a track before anything wants to hear it.
     *
     * ── THE HALF OF THE FIX THAT IS NOT A SEEK ───────────────────────────────
     *
     * `joinTake` keeps a late take in step with its picture, but it does it by
     * skipping the part that was missed — correct, and still a loss. The better
     * outcome is for the take not to be late, and every global event announces
     * itself before it exists: the selection wheel spins for four seconds and
     * the three timed events then take a further five. Four seconds is ample for
     * a 484KB train or an 824KB roulette, so the common case becomes a file that
     * is already in the cache when `play()` is called.
     *
     * Idempotent by name, because the point is one fetch. The browser's own
     * cache would mostly cover a repeat, but "mostly" is how you end up with a
     * second request racing the playback you were trying to protect.
     *
     * It respects the per-track toggle: a player who has turned an event's music
     * off should not spend their bandwidth on it.
     */
    const primeSound = useCallback((name) => {
        if (!name || !settings.enabled) return;
        if (settings[`${name}Enabled`] === false) return;
        if (primedRef.current.has(name)) return;

        const { audio } = audioFor(name);
        if (!audio || audio.error) return;

        primedRef.current.add(name);
        audio.preload = 'auto';
        try {
            audio.load();
        } catch (e) {
            // A refused load leaves the element exactly as it was — play() will
            // still fetch, just late, which is the behaviour this replaces.
        }
    }, [settings, audioFor]);

    /**
     * Fetch and decode the crate impacts, once.
     *
     * Separate from `primeSound` because it is a different mechanism, not a
     * different file: these end up as AudioBuffers rather than as loaded
     * elements. It honours the same toggle — a player who has turned the crates
     * off should not spend bandwidth on them — and `primeSample` is idempotent,
     * so calling it from both the warm-up and the selection wheel costs one
     * fetch.
     */
    const primeSampledSfx = useCallback(() => {
        if (!settings.enabled) return;
        if (settings.arrivalCrateEnabled === false) return;
        SAMPLED_SFX.forEach(name => primeSample(name, SOUND_FILES[name]));
    }, [settings.enabled, settings.arrivalCrateEnabled]);

    /** Prime whichever track a global event is about to want. */
    const primeEventSound = useCallback((eventType) => {
        primeSound(EVENT_SOUNDTRACK[eventType]);
        // The arrival is the one event whose SFX have a deadline as well as its
        // bed, so the four seconds of warning are spent on both.
        if (eventType === 'arrival') primeSampledSfx();
    }, [primeSound, primeSampledSfx]);

    /*
     * The two scored takes, fetched once the page has nothing better to do.
     *
     * ── WHY THIS IS NOT THE `preload = 'auto'` THAT WAS REMOVED ───────────────
     *
     * The init effect's note records what happened last time every track was
     * eager: ~66MB fetched the moment the page mounted, the six-connection
     * budget saturated, and wheel.png measured at ninety seconds because the
     * sprite atlas and the API calls were queueing behind music nobody had asked
     * to hear. Nothing about that is wrong and none of it is undone here.
     *
     * What is different is the size and the timing. This fetches 1.3MB, not
     * 66 — the scored takes are the two smallest files in the set, which is not
     * a coincidence, they are short — and it does it from `requestIdleCallback`,
     * so it starts after the page has finished the work a player is waiting on
     * rather than in competition with it. The loops stay lazy: they are the big
     * ones and a late start in a five-minute bed is inaudible.
     *
     * It buys the case the announcement cannot: an admin forcing an arrival or a
     * parlour skips the selection wheel entirely, so those two arrive with no
     * warning at all.
     *
     * Skipped on a metered or slow connection, where 1.3MB of music the player
     * may never hear is a worse trade than a take that has to catch up.
     */
    /*
     * Read through a ref so the warm-up below depends on `audioLoaded` alone.
     *
     * `primeSound` closes over `settings` and is therefore rebuilt whenever any
     * setting changes — and a volume slider being dragged would otherwise
     * cancel the pending idle callback and schedule a fresh one with a fresh
     * eight-second timeout on every frame of the drag, which is a warm-up that
     * never happens on the one gesture most likely to precede wanting to hear
     * something. Same device, and the same hazard, as `soundRef` in
     * ArrivalTheatre.
     */
    const primeSoundRef = useRef(primeSound);
    const primeSampledSfxRef = useRef(null);
    useEffect(() => { primeSoundRef.current = primeSound; });
    useEffect(() => { primeSampledSfxRef.current = primeSampledSfx; });

    useEffect(() => {
        if (!audioLoaded) return undefined;
        if (typeof window === 'undefined') return undefined;

        const link = navigator.connection;
        if (link?.saveData) return undefined;
        if (link?.effectiveType && /(^|-)2g$/.test(link.effectiveType)) return undefined;

        const warm = () => {
            SCORED_TAKES.forEach(name => primeSoundRef.current?.(name));
            // 480KB across the four, and the reason they are in the idle pass
            // as well as on the announcement: an admin-forced arrival skips the
            // selection wheel, and a crate that misses its box is the bug this
            // whole path exists to fix.
            primeSampledSfxRef.current?.();
        };

        // A timeout as well as the idle callback, and not only as a polyfill:
        // a tab that never goes idle never fires one, and this should still have
        // happened by the time the first event lands.
        const idle = window.requestIdleCallback?.(warm, { timeout: 8000 });
        const timer = window.requestIdleCallback ? null : window.setTimeout(warm, 4000);

        return () => {
            if (idle != null) window.cancelIdleCallback?.(idle);
            if (timer != null) window.clearTimeout(timer);
        };
    }, [audioLoaded]);

    // Handle user interaction (required for autoplay)
    const handleUserInteraction = useCallback(() => {
        // Open the synth's AudioContext here, on a real gesture. Left to the
        // first sound that wants one it gets created inside some timer or
        // network callback instead, starts suspended, and that first sound is
        // lost — which for this feature is the whole opening of an event.
        unlockAudioBus();
        if (!hasInteracted) {
            setHasInteracted(true);
        }
    }, [hasInteracted]);

    // Listen for user interaction
    useEffect(() => {
        const events = ['click', 'keydown', 'touchstart'];
        const handler = () => handleUserInteraction();

        events.forEach(event => window.addEventListener(event, handler, { once: true }));

        return () => {
            events.forEach(event => window.removeEventListener(event, handler));
        };
    }, [handleUserInteraction]);

    // Start playing music - plays spin.wav first, then loops soundtrack.wav
    const startSoundtrack = useCallback(async () => {
        if (!settings.enabled || !settings.soundtrackEnabled) return;

        // If already playing or event soundtrack is active, don't start
        if (isPlaying) return;
        if (isRecursionPlaying) return;
        if (isKotwPlaying) return;
        if (isGoldRushPlaying) return;
        if (isFirstBloodPlaying) return;
        if (isCommunityGoalPlaying) return;
        // Belt and braces: WheelSpinner already refuses to spin while an arrival
        // is on screen, so in practice nothing reaches here during one.
        if (isArrivalPlaying) return;
        // Same reasoning for the parlour: WheelSpinner hands the whole band to
        // the table for its half-minute, so nothing should be starting a spin
        // bed underneath it. A spin already in flight when the table opened is
        // the one case that reaches here.
        if (isParlourPlaying) return;

        const effectiveVolume = settings.masterVolume * settings.musicVolume;

        // Try to play spin.wav first
        if (spinRef.current && !spinRef.current.error) {
            try {
                spinRef.current.volume = effectiveVolume;
                spinRef.current.currentTime = 0;

                // When spin.wav ends, start the looping soundtrack (unless event soundtrack started)
                spinRef.current.onended = () => {
                    // Check if recursion started during spin.wav - if so, don't start soundtrack
                    if (recursionSoundtrackRef.current && !recursionSoundtrackRef.current.paused) {
                        return;
                    }
                    // Check if KOTW started during spin.wav - if so, don't start soundtrack
                    if (kotwSoundtrackRef.current && !kotwSoundtrackRef.current.paused) {
                        return;
                    }
                    // Check if Gold Rush started during spin.wav - if so, don't start soundtrack
                    if (goldRushSoundtrackRef.current && !goldRushSoundtrackRef.current.paused) {
                        return;
                    }
                    // Check if First Blood started during spin.wav - if so, don't start soundtrack
                    if (firstBloodSoundtrackRef.current && !firstBloodSoundtrackRef.current.paused) {
                        return;
                    }
                    // Check if Community Goal started during spin.wav - if so, don't start soundtrack
                    if (communityGoalSoundtrackRef.current && !communityGoalSoundtrackRef.current.paused) {
                        return;
                    }
                    // Check if an arrival started during spin.wav - if so, don't start soundtrack
                    if (arrivalSoundtrackRef.current && !arrivalSoundtrackRef.current.paused) {
                        return;
                    }
                    // Check if a parlour opened during spin.wav - if so, don't start soundtrack
                    if (parlourSoundtrackRef.current && !parlourSoundtrackRef.current.paused) {
                        return;
                    }
                    if (soundtrackRef.current && !soundtrackRef.current.error) {
                        soundtrackRef.current.volume = effectiveVolume;
                        soundtrackRef.current.currentTime = 0;
                        soundtrackRef.current.play().catch(() => {});
                    }
                };

                await spinRef.current.play();
                setIsPlaying(true);
                setHasInteracted(true);
            } catch (e) {
                // If spin.wav fails, try to play soundtrack directly
                if (soundtrackRef.current && !soundtrackRef.current.error) {
                    try {
                        soundtrackRef.current.volume = effectiveVolume;
                        soundtrackRef.current.currentTime = 0;
                        await soundtrackRef.current.play();
                        setIsPlaying(true);
                        setHasInteracted(true);
                    } catch (e2) {
                        // Silently fail
                    }
                }
            }
        } else if (soundtrackRef.current && !soundtrackRef.current.error) {
            // No spin.wav, just play soundtrack
            try {
                soundtrackRef.current.volume = effectiveVolume;
                soundtrackRef.current.currentTime = 0;
                await soundtrackRef.current.play();
                setIsPlaying(true);
                setHasInteracted(true);
            } catch (e) {
                // Silently fail
            }
        }
    }, [settings.enabled, settings.soundtrackEnabled, settings.masterVolume, settings.musicVolume, isPlaying, isRecursionPlaying, isKotwPlaying, isGoldRushPlaying, isFirstBloodPlaying, isCommunityGoalPlaying, isArrivalPlaying, isParlourPlaying]);

    // Stop soundtrack (stops both spin and soundtrack)
    const stopSoundtrack = useCallback(() => {
        if (spinRef.current) {
            spinRef.current.pause();
            spinRef.current.currentTime = 0;
            spinRef.current.onended = null; // Remove the callback
        }
        if (soundtrackRef.current) {
            soundtrackRef.current.pause();
            soundtrackRef.current.currentTime = 0;
        }
        setIsPlaying(false);
    }, []);

    // Toggle soundtrack - simplified
    const toggleSoundtrack = useCallback(async () => {
        if (isPlaying) {
            stopSoundtrack();
        } else {
            await startSoundtrack();
        }
    }, [isPlaying, startSoundtrack, stopSoundtrack]);

    // Start recursion soundtrack
    const startRecursionSoundtrack = useCallback(async () => {
        if (!recursionSoundtrackRef.current) return;
        if (!settings.enabled || !settings.recursionSoundtrackEnabled) return;
        if (recursionSoundtrackRef.current.error) return;

        // Don't restart if already playing
        if (isRecursionPlaying) return;

        try {
            const effectiveVolume = settings.masterVolume * settings.musicVolume;
            recursionSoundtrackRef.current.volume = effectiveVolume;
            recursionSoundtrackRef.current.currentTime = 0;

            // Stop spin.wav if playing and clear its callback
            if (spinRef.current) {
                spinRef.current.pause();
                spinRef.current.onended = null;
            }

            // Pause main soundtrack if playing (don't reset position so we can resume)
            if (soundtrackRef.current && !soundtrackRef.current.paused) {
                soundtrackRef.current.pause();
            }

            // Stop KOTW soundtrack if playing
            if (kotwSoundtrackRef.current && !kotwSoundtrackRef.current.paused) {
                kotwSoundtrackRef.current.pause();
                kotwSoundtrackRef.current.currentTime = 0;
                setIsKotwPlaying(false);
            }

            // Stop Gold Rush soundtrack if playing
            if (goldRushSoundtrackRef.current && !goldRushSoundtrackRef.current.paused) {
                goldRushSoundtrackRef.current.pause();
                goldRushSoundtrackRef.current.currentTime = 0;
                setIsGoldRushPlaying(false);
            }

            // Stop First Blood soundtrack if playing
            if (firstBloodSoundtrackRef.current && !firstBloodSoundtrackRef.current.paused) {
                firstBloodSoundtrackRef.current.pause();
                firstBloodSoundtrackRef.current.currentTime = 0;
                setIsFirstBloodPlaying(false);
            }

            // Stop Community Goal soundtrack if playing
            if (communityGoalSoundtrackRef.current && !communityGoalSoundtrackRef.current.paused) {
                communityGoalSoundtrackRef.current.pause();
                communityGoalSoundtrackRef.current.currentTime = 0;
                setIsCommunityGoalPlaying(false);
            }

            // An arrival takes the screen; if one is playing, it takes the sound too
            if (arrivalSoundtrackRef.current && !arrivalSoundtrackRef.current.paused) {
                arrivalSoundtrackRef.current.pause();
                arrivalSoundtrackRef.current.currentTime = 0;
                setIsArrivalPlaying(false);
            }

            // Stop Parlour soundtrack if playing
            if (parlourSoundtrackRef.current && !parlourSoundtrackRef.current.paused) {
                parlourSoundtrackRef.current.pause();
                parlourSoundtrackRef.current.currentTime = 0;
                setIsParlourPlaying(false);
            }
            await recursionSoundtrackRef.current.play();
            setIsRecursionPlaying(true);
            setHasInteracted(true);
        } catch (e) {
            // Silently fail
        }
    }, [settings.enabled, settings.recursionSoundtrackEnabled, settings.masterVolume, settings.musicVolume, isRecursionPlaying]);

    // Stop recursion soundtrack
    const stopRecursionSoundtrack = useCallback(() => {
        if (recursionSoundtrackRef.current) {
            recursionSoundtrackRef.current.pause();
            recursionSoundtrackRef.current.currentTime = 0;
            setIsRecursionPlaying(false);

            // Resume main soundtrack if it was playing before recursion (and no other event soundtrack is active)
            if (isPlaying && !isKotwPlaying && !isGoldRushPlaying && !isFirstBloodPlaying && !isCommunityGoalPlaying && !isParlourPlaying && soundtrackRef.current && settings.enabled && settings.soundtrackEnabled) {
                const effectiveVolume = settings.masterVolume * settings.musicVolume;
                soundtrackRef.current.volume = effectiveVolume;
                soundtrackRef.current.play().catch(() => {});
            }
        }
    }, [isPlaying, isKotwPlaying, isGoldRushPlaying, isFirstBloodPlaying, isCommunityGoalPlaying, isParlourPlaying, settings.masterVolume, settings.musicVolume, settings.enabled, settings.soundtrackEnabled]);

    // Start KOTW soundtrack
    const startKotwSoundtrack = useCallback(async () => {
        if (!kotwSoundtrackRef.current) return;
        if (!settings.enabled || !settings.kotwSoundtrackEnabled) return;
        if (kotwSoundtrackRef.current.error) return;

        // Don't restart if already playing
        if (isKotwPlaying) return;

        try {
            const effectiveVolume = settings.masterVolume * settings.musicVolume;
            kotwSoundtrackRef.current.volume = effectiveVolume;
            kotwSoundtrackRef.current.currentTime = 0;

            // Stop spin.wav if playing and clear its callback
            if (spinRef.current) {
                spinRef.current.pause();
                spinRef.current.onended = null;
            }

            // Pause main soundtrack if playing (don't reset position so we can resume)
            if (soundtrackRef.current && !soundtrackRef.current.paused) {
                soundtrackRef.current.pause();
            }

            // Stop recursion soundtrack if playing
            if (recursionSoundtrackRef.current && !recursionSoundtrackRef.current.paused) {
                recursionSoundtrackRef.current.pause();
                recursionSoundtrackRef.current.currentTime = 0;
                setIsRecursionPlaying(false);
            }

            // Stop Gold Rush soundtrack if playing
            if (goldRushSoundtrackRef.current && !goldRushSoundtrackRef.current.paused) {
                goldRushSoundtrackRef.current.pause();
                goldRushSoundtrackRef.current.currentTime = 0;
                setIsGoldRushPlaying(false);
            }

            // Stop First Blood soundtrack if playing
            if (firstBloodSoundtrackRef.current && !firstBloodSoundtrackRef.current.paused) {
                firstBloodSoundtrackRef.current.pause();
                firstBloodSoundtrackRef.current.currentTime = 0;
                setIsFirstBloodPlaying(false);
            }

            // Stop Community Goal soundtrack if playing
            if (communityGoalSoundtrackRef.current && !communityGoalSoundtrackRef.current.paused) {
                communityGoalSoundtrackRef.current.pause();
                communityGoalSoundtrackRef.current.currentTime = 0;
                setIsCommunityGoalPlaying(false);
            }

            // An arrival takes the screen; if one is playing, it takes the sound too
            if (arrivalSoundtrackRef.current && !arrivalSoundtrackRef.current.paused) {
                arrivalSoundtrackRef.current.pause();
                arrivalSoundtrackRef.current.currentTime = 0;
                setIsArrivalPlaying(false);
            }

            // Stop Parlour soundtrack if playing
            if (parlourSoundtrackRef.current && !parlourSoundtrackRef.current.paused) {
                parlourSoundtrackRef.current.pause();
                parlourSoundtrackRef.current.currentTime = 0;
                setIsParlourPlaying(false);
            }
            await kotwSoundtrackRef.current.play();
            setIsKotwPlaying(true);
            setHasInteracted(true);
        } catch (e) {
            // Silently fail
        }
    }, [settings.enabled, settings.kotwSoundtrackEnabled, settings.masterVolume, settings.musicVolume, isKotwPlaying]);

    // Stop KOTW soundtrack
    const stopKotwSoundtrack = useCallback(() => {
        if (kotwSoundtrackRef.current) {
            kotwSoundtrackRef.current.pause();
            kotwSoundtrackRef.current.currentTime = 0;
            setIsKotwPlaying(false);

            // Resume main soundtrack if it was playing before KOTW (and no other event soundtrack is active)
            if (isPlaying && !isRecursionPlaying && !isGoldRushPlaying && !isFirstBloodPlaying && !isCommunityGoalPlaying && !isParlourPlaying && soundtrackRef.current && settings.enabled && settings.soundtrackEnabled) {
                const effectiveVolume = settings.masterVolume * settings.musicVolume;
                soundtrackRef.current.volume = effectiveVolume;
                soundtrackRef.current.play().catch(() => {});
            }
        }
    }, [isPlaying, isRecursionPlaying, isGoldRushPlaying, isFirstBloodPlaying, isCommunityGoalPlaying, isParlourPlaying, settings.masterVolume, settings.musicVolume, settings.enabled, settings.soundtrackEnabled]);

    // Start Gold Rush soundtrack
    const startGoldRushSoundtrack = useCallback(async () => {
        if (!goldRushSoundtrackRef.current) return;
        if (!settings.enabled || !settings.goldRushSoundtrackEnabled) return;
        if (goldRushSoundtrackRef.current.error) return;

        // Don't restart if already playing
        if (isGoldRushPlaying) return;

        try {
            const effectiveVolume = settings.masterVolume * settings.musicVolume;
            goldRushSoundtrackRef.current.volume = effectiveVolume;
            goldRushSoundtrackRef.current.currentTime = 0;

            // Stop spin.wav if playing and clear its callback
            if (spinRef.current) {
                spinRef.current.pause();
                spinRef.current.onended = null;
            }

            // Pause main soundtrack if playing (don't reset position so we can resume)
            if (soundtrackRef.current && !soundtrackRef.current.paused) {
                soundtrackRef.current.pause();
            }

            // Stop recursion soundtrack if playing
            if (recursionSoundtrackRef.current && !recursionSoundtrackRef.current.paused) {
                recursionSoundtrackRef.current.pause();
                recursionSoundtrackRef.current.currentTime = 0;
                setIsRecursionPlaying(false);
            }

            // Stop KOTW soundtrack if playing
            if (kotwSoundtrackRef.current && !kotwSoundtrackRef.current.paused) {
                kotwSoundtrackRef.current.pause();
                kotwSoundtrackRef.current.currentTime = 0;
                setIsKotwPlaying(false);
            }

            // Stop First Blood soundtrack if playing
            if (firstBloodSoundtrackRef.current && !firstBloodSoundtrackRef.current.paused) {
                firstBloodSoundtrackRef.current.pause();
                firstBloodSoundtrackRef.current.currentTime = 0;
                setIsFirstBloodPlaying(false);
            }

            // Stop Community Goal soundtrack if playing
            if (communityGoalSoundtrackRef.current && !communityGoalSoundtrackRef.current.paused) {
                communityGoalSoundtrackRef.current.pause();
                communityGoalSoundtrackRef.current.currentTime = 0;
                setIsCommunityGoalPlaying(false);
            }

            // An arrival takes the screen; if one is playing, it takes the sound too
            if (arrivalSoundtrackRef.current && !arrivalSoundtrackRef.current.paused) {
                arrivalSoundtrackRef.current.pause();
                arrivalSoundtrackRef.current.currentTime = 0;
                setIsArrivalPlaying(false);
            }

            // Stop Parlour soundtrack if playing
            if (parlourSoundtrackRef.current && !parlourSoundtrackRef.current.paused) {
                parlourSoundtrackRef.current.pause();
                parlourSoundtrackRef.current.currentTime = 0;
                setIsParlourPlaying(false);
            }
            await goldRushSoundtrackRef.current.play();
            setIsGoldRushPlaying(true);
            setHasInteracted(true);
        } catch (e) {
            // Silently fail
        }
    }, [settings.enabled, settings.goldRushSoundtrackEnabled, settings.masterVolume, settings.musicVolume, isGoldRushPlaying]);

    // Stop Gold Rush soundtrack
    const stopGoldRushSoundtrack = useCallback(() => {
        if (goldRushSoundtrackRef.current) {
            goldRushSoundtrackRef.current.pause();
            goldRushSoundtrackRef.current.currentTime = 0;
            setIsGoldRushPlaying(false);

            // Resume main soundtrack if it was playing before Gold Rush (and no other event soundtrack is active)
            if (isPlaying && !isRecursionPlaying && !isKotwPlaying && !isFirstBloodPlaying && !isCommunityGoalPlaying && !isParlourPlaying && soundtrackRef.current && settings.enabled && settings.soundtrackEnabled) {
                const effectiveVolume = settings.masterVolume * settings.musicVolume;
                soundtrackRef.current.volume = effectiveVolume;
                soundtrackRef.current.play().catch(() => {});
            }
        }
    }, [isPlaying, isRecursionPlaying, isKotwPlaying, isFirstBloodPlaying, isCommunityGoalPlaying, isParlourPlaying, settings.masterVolume, settings.musicVolume, settings.enabled, settings.soundtrackEnabled]);

    // Start First Blood soundtrack
    const startFirstBloodSoundtrack = useCallback(async () => {
        if (!firstBloodSoundtrackRef.current) return;
        if (!settings.enabled || !settings.firstBloodSoundtrackEnabled) return;
        if (firstBloodSoundtrackRef.current.error) return;

        // Don't restart if already playing
        if (isFirstBloodPlaying) return;

        try {
            const effectiveVolume = settings.masterVolume * settings.musicVolume;
            firstBloodSoundtrackRef.current.volume = effectiveVolume;
            firstBloodSoundtrackRef.current.currentTime = 0;

            // Stop spin.wav if playing and clear its callback
            if (spinRef.current) {
                spinRef.current.pause();
                spinRef.current.onended = null;
            }

            // Pause main soundtrack if playing (don't reset position so we can resume)
            if (soundtrackRef.current && !soundtrackRef.current.paused) {
                soundtrackRef.current.pause();
            }

            // Stop recursion soundtrack if playing
            if (recursionSoundtrackRef.current && !recursionSoundtrackRef.current.paused) {
                recursionSoundtrackRef.current.pause();
                recursionSoundtrackRef.current.currentTime = 0;
                setIsRecursionPlaying(false);
            }

            // Stop KOTW soundtrack if playing
            if (kotwSoundtrackRef.current && !kotwSoundtrackRef.current.paused) {
                kotwSoundtrackRef.current.pause();
                kotwSoundtrackRef.current.currentTime = 0;
                setIsKotwPlaying(false);
            }

            // Stop Gold Rush soundtrack if playing
            if (goldRushSoundtrackRef.current && !goldRushSoundtrackRef.current.paused) {
                goldRushSoundtrackRef.current.pause();
                goldRushSoundtrackRef.current.currentTime = 0;
                setIsGoldRushPlaying(false);
            }

            // Stop Community Goal soundtrack if playing
            if (communityGoalSoundtrackRef.current && !communityGoalSoundtrackRef.current.paused) {
                communityGoalSoundtrackRef.current.pause();
                communityGoalSoundtrackRef.current.currentTime = 0;
                setIsCommunityGoalPlaying(false);
            }

            // An arrival takes the screen; if one is playing, it takes the sound too
            if (arrivalSoundtrackRef.current && !arrivalSoundtrackRef.current.paused) {
                arrivalSoundtrackRef.current.pause();
                arrivalSoundtrackRef.current.currentTime = 0;
                setIsArrivalPlaying(false);
            }

            // Stop Parlour soundtrack if playing
            if (parlourSoundtrackRef.current && !parlourSoundtrackRef.current.paused) {
                parlourSoundtrackRef.current.pause();
                parlourSoundtrackRef.current.currentTime = 0;
                setIsParlourPlaying(false);
            }
            await firstBloodSoundtrackRef.current.play();
            setIsFirstBloodPlaying(true);
            setHasInteracted(true);
        } catch (e) {
            // Silently fail
        }
    }, [settings.enabled, settings.firstBloodSoundtrackEnabled, settings.masterVolume, settings.musicVolume, isFirstBloodPlaying]);

    // Stop First Blood soundtrack
    const stopFirstBloodSoundtrack = useCallback(() => {
        if (firstBloodSoundtrackRef.current) {
            firstBloodSoundtrackRef.current.pause();
            firstBloodSoundtrackRef.current.currentTime = 0;
            setIsFirstBloodPlaying(false);

            // Resume main soundtrack if it was playing before First Blood (and no other event soundtrack is active)
            if (isPlaying && !isRecursionPlaying && !isKotwPlaying && !isGoldRushPlaying && !isCommunityGoalPlaying && !isParlourPlaying && soundtrackRef.current && settings.enabled && settings.soundtrackEnabled) {
                const effectiveVolume = settings.masterVolume * settings.musicVolume;
                soundtrackRef.current.volume = effectiveVolume;
                soundtrackRef.current.play().catch(() => {});
            }
        }
    }, [isPlaying, isRecursionPlaying, isKotwPlaying, isGoldRushPlaying, isCommunityGoalPlaying, isParlourPlaying, settings.masterVolume, settings.musicVolume, settings.enabled, settings.soundtrackEnabled]);

    // Start Community Goal soundtrack
    const startCommunityGoalSoundtrack = useCallback(async () => {
        if (!communityGoalSoundtrackRef.current) return;
        if (!settings.enabled || !settings.communityGoalSoundtrackEnabled) return;
        if (communityGoalSoundtrackRef.current.error) return;

        // Don't restart if already playing
        if (isCommunityGoalPlaying) return;

        try {
            const effectiveVolume = settings.masterVolume * settings.musicVolume;
            communityGoalSoundtrackRef.current.volume = effectiveVolume;
            communityGoalSoundtrackRef.current.currentTime = 0;

            // Stop spin.wav if playing and clear its callback
            if (spinRef.current) {
                spinRef.current.pause();
                spinRef.current.onended = null;
            }

            // Pause main soundtrack if playing (don't reset position so we can resume)
            if (soundtrackRef.current && !soundtrackRef.current.paused) {
                soundtrackRef.current.pause();
            }

            // Stop recursion soundtrack if playing
            if (recursionSoundtrackRef.current && !recursionSoundtrackRef.current.paused) {
                recursionSoundtrackRef.current.pause();
                recursionSoundtrackRef.current.currentTime = 0;
                setIsRecursionPlaying(false);
            }

            // Stop KOTW soundtrack if playing
            if (kotwSoundtrackRef.current && !kotwSoundtrackRef.current.paused) {
                kotwSoundtrackRef.current.pause();
                kotwSoundtrackRef.current.currentTime = 0;
                setIsKotwPlaying(false);
            }

            // Stop Gold Rush soundtrack if playing
            if (goldRushSoundtrackRef.current && !goldRushSoundtrackRef.current.paused) {
                goldRushSoundtrackRef.current.pause();
                goldRushSoundtrackRef.current.currentTime = 0;
                setIsGoldRushPlaying(false);
            }

            // Stop First Blood soundtrack if playing
            if (firstBloodSoundtrackRef.current && !firstBloodSoundtrackRef.current.paused) {
                firstBloodSoundtrackRef.current.pause();
                firstBloodSoundtrackRef.current.currentTime = 0;
                setIsFirstBloodPlaying(false);
            }

            // An arrival takes the screen; if one is playing, it takes the sound too
            if (arrivalSoundtrackRef.current && !arrivalSoundtrackRef.current.paused) {
                arrivalSoundtrackRef.current.pause();
                arrivalSoundtrackRef.current.currentTime = 0;
                setIsArrivalPlaying(false);
            }

            // Stop Parlour soundtrack if playing
            if (parlourSoundtrackRef.current && !parlourSoundtrackRef.current.paused) {
                parlourSoundtrackRef.current.pause();
                parlourSoundtrackRef.current.currentTime = 0;
                setIsParlourPlaying(false);
            }
            await communityGoalSoundtrackRef.current.play();
            setIsCommunityGoalPlaying(true);
            setHasInteracted(true);
        } catch (e) {
            // Silently fail
        }
    }, [settings.enabled, settings.communityGoalSoundtrackEnabled, settings.masterVolume, settings.musicVolume, isCommunityGoalPlaying]);

    // Stop Community Goal soundtrack
    const stopCommunityGoalSoundtrack = useCallback(() => {
        if (communityGoalSoundtrackRef.current) {
            communityGoalSoundtrackRef.current.pause();
            communityGoalSoundtrackRef.current.currentTime = 0;
            setIsCommunityGoalPlaying(false);

            // Resume main soundtrack if it was playing before (and no other event soundtrack is active)
            if (isPlaying && !isRecursionPlaying && !isKotwPlaying && !isGoldRushPlaying && !isFirstBloodPlaying && !isParlourPlaying && soundtrackRef.current && settings.enabled && settings.soundtrackEnabled) {
                const effectiveVolume = settings.masterVolume * settings.musicVolume;
                soundtrackRef.current.volume = effectiveVolume;
                soundtrackRef.current.play().catch(() => {});
            }
        }
    }, [isPlaying, isRecursionPlaying, isKotwPlaying, isGoldRushPlaying, isFirstBloodPlaying, isParlourPlaying, settings.masterVolume, settings.musicVolume, settings.enabled, settings.soundtrackEnabled]);

    /*
     * ── THE ARRIVAL ──────────────────────────────────────────────────────────
     *
     * Same shape as the five above, with two differences that are the event's
     * own and not oversights:
     *
     *   It does not loop. See the note where the element is created.
     *
     *   It is a HARD take. The others are beds under an event that runs for
     *   minutes and can be joined halfway; this one is eighteen seconds of
     *   scored picture, so `startArrivalSoundtrack` is called on the frame the
     *   theatre mounts and the whole point is that the first chuff lands with
     *   the first blade of the shutter. `isArrivalPlaying` therefore does NOT
     *   guard against a restart the way `isFirstBloodPlaying` does — a second
     *   arrival gets a fresh mount and must get a fresh take from zero.
     *
     *   It takes `elapsedAt` — the theatre's own clock, as a function — for the
     *   reason `joinTake` gives at length: the first play of a session has to
     *   fetch, and a take that starts at zero after a fetch is a take that is
     *   late by however long the fetch took. Passing the clock instead of a
     *   number means the offset is read on the far side of the latency. On a
     *   warm take, which the warm-up makes the common case, it reads ~0 and
     *   nothing is skipped.
     */
    const startArrivalSoundtrack = useCallback(async (elapsedAt) => {
        if (!arrivalSoundtrackRef.current) return;
        if (!settings.enabled || !settings.arrivalSoundtrackEnabled) return;
        if (arrivalSoundtrackRef.current.error) return;

        try {
            const effectiveVolume = settings.masterVolume * settings.musicVolume;
            arrivalSoundtrackRef.current.loop = false;
            arrivalSoundtrackRef.current.volume = effectiveVolume;
            arrivalSoundtrackRef.current.currentTime = 0;
            joinTake(arrivalSoundtrackRef.current, elapsedAt);

            // Stop the spin intro if playing and clear its callback
            if (spinRef.current) {
                spinRef.current.pause();
                spinRef.current.onended = null;
            }

            // Pause main soundtrack if playing (don't reset position so we can resume)
            if (soundtrackRef.current && !soundtrackRef.current.paused) {
                soundtrackRef.current.pause();
            }

            // Stop recursion soundtrack if playing
            if (recursionSoundtrackRef.current && !recursionSoundtrackRef.current.paused) {
                recursionSoundtrackRef.current.pause();
                recursionSoundtrackRef.current.currentTime = 0;
                setIsRecursionPlaying(false);
            }

            // Stop KOTW soundtrack if playing
            if (kotwSoundtrackRef.current && !kotwSoundtrackRef.current.paused) {
                kotwSoundtrackRef.current.pause();
                kotwSoundtrackRef.current.currentTime = 0;
                setIsKotwPlaying(false);
            }

            // Stop Gold Rush soundtrack if playing
            if (goldRushSoundtrackRef.current && !goldRushSoundtrackRef.current.paused) {
                goldRushSoundtrackRef.current.pause();
                goldRushSoundtrackRef.current.currentTime = 0;
                setIsGoldRushPlaying(false);
            }

            // Stop First Blood soundtrack if playing
            if (firstBloodSoundtrackRef.current && !firstBloodSoundtrackRef.current.paused) {
                firstBloodSoundtrackRef.current.pause();
                firstBloodSoundtrackRef.current.currentTime = 0;
                setIsFirstBloodPlaying(false);
            }

            // Stop Community Goal soundtrack if playing
            if (communityGoalSoundtrackRef.current && !communityGoalSoundtrackRef.current.paused) {
                communityGoalSoundtrackRef.current.pause();
                communityGoalSoundtrackRef.current.currentTime = 0;
                setIsCommunityGoalPlaying(false);
            }

            // Stop Parlour soundtrack if playing
            if (parlourSoundtrackRef.current && !parlourSoundtrackRef.current.paused) {
                parlourSoundtrackRef.current.pause();
                parlourSoundtrackRef.current.currentTime = 0;
                setIsParlourPlaying(false);
            }

            await arrivalSoundtrackRef.current.play();
            setIsArrivalPlaying(true);
            setHasInteracted(true);
        } catch (e) {
            // Silently fail
        }
    }, [settings.enabled, settings.arrivalSoundtrackEnabled, settings.masterVolume, settings.musicVolume]);

    // Stop Arrival soundtrack
    const stopArrivalSoundtrack = useCallback(() => {
        if (arrivalSoundtrackRef.current) {
            arrivalSoundtrackRef.current.pause();
            arrivalSoundtrackRef.current.currentTime = 0;
            setIsArrivalPlaying(false);

            // Resume main soundtrack if it was playing before (and no other event soundtrack is active)
            if (isPlaying && !isRecursionPlaying && !isKotwPlaying && !isGoldRushPlaying && !isFirstBloodPlaying && !isCommunityGoalPlaying && !isParlourPlaying && soundtrackRef.current && settings.enabled && settings.soundtrackEnabled) {
                const effectiveVolume = settings.masterVolume * settings.musicVolume;
                soundtrackRef.current.volume = effectiveVolume;
                soundtrackRef.current.play().catch(() => {});
            }
        }
    }, [isPlaying, isRecursionPlaying, isKotwPlaying, isGoldRushPlaying, isFirstBloodPlaying, isCommunityGoalPlaying, isParlourPlaying, settings.masterVolume, settings.musicVolume, settings.enabled, settings.soundtrackEnabled]);

    /*
     * ── THE PARLOUR ──────────────────────────────────────────────────────────
     *
     * The arrival's shape, with the one difference the room makes.
     *
     * It does not loop, for the arrival's reason: it is a scored take against
     * an event that has a beginning and an end, not a bed under something
     * open-ended.
     *
     * It is SOUGHT. THE ARRIVAL is a portal that opens on the frame you are
     * shown it, so its take always starts at zero; a parlour is the room you
     * are already standing in, and `rouletteTimeline.js` is explicit that a
     * player can load the page halfway through one and must get the table they
     * walked in on rather than a replay of the deal. `fromSeconds` is that
     * offset — the same `(serverNow() - openedAt) / 1000` every other part of
     * the event is measured with — so the bed joins where the room is.
     *
     * `elapsedAt` is a FUNCTION, and `joinTake` explains why at length: it is
     * read on the far side of the fetch rather than before it, so a cold first
     * play joins the room where the room actually is. This used to take a
     * number, which meant the offset was measured before the file had even been
     * asked for — correct for a late join, and a fetch late by exactly the
     * amount it was supposed to correct.
     *
     * Like the arrival, `isParlourPlaying` does NOT guard against a restart:
     * a second table is a fresh mount and must get a fresh take.
     */
    const startParlourSoundtrack = useCallback(async (elapsedAt) => {
        if (!parlourSoundtrackRef.current) return;
        if (!settings.enabled || !settings.parlourSoundtrackEnabled) return;
        if (parlourSoundtrackRef.current.error) return;

        try {
            const audio = parlourSoundtrackRef.current;
            const effectiveVolume = settings.masterVolume * settings.musicVolume;
            audio.loop = false;
            audio.volume = effectiveVolume;

            joinTake(audio, elapsedAt);

            // Stop the spin intro if playing and clear its callback
            if (spinRef.current) {
                spinRef.current.pause();
                spinRef.current.onended = null;
            }

            // Pause main soundtrack if playing (don't reset position so we can resume)
            if (soundtrackRef.current && !soundtrackRef.current.paused) {
                soundtrackRef.current.pause();
            }

            // Stop recursion soundtrack if playing
            if (recursionSoundtrackRef.current && !recursionSoundtrackRef.current.paused) {
                recursionSoundtrackRef.current.pause();
                recursionSoundtrackRef.current.currentTime = 0;
                setIsRecursionPlaying(false);
            }

            // Stop KOTW soundtrack if playing
            if (kotwSoundtrackRef.current && !kotwSoundtrackRef.current.paused) {
                kotwSoundtrackRef.current.pause();
                kotwSoundtrackRef.current.currentTime = 0;
                setIsKotwPlaying(false);
            }

            // Stop Gold Rush soundtrack if playing
            if (goldRushSoundtrackRef.current && !goldRushSoundtrackRef.current.paused) {
                goldRushSoundtrackRef.current.pause();
                goldRushSoundtrackRef.current.currentTime = 0;
                setIsGoldRushPlaying(false);
            }

            // Stop First Blood soundtrack if playing
            if (firstBloodSoundtrackRef.current && !firstBloodSoundtrackRef.current.paused) {
                firstBloodSoundtrackRef.current.pause();
                firstBloodSoundtrackRef.current.currentTime = 0;
                setIsFirstBloodPlaying(false);
            }

            // Stop Community Goal soundtrack if playing
            if (communityGoalSoundtrackRef.current && !communityGoalSoundtrackRef.current.paused) {
                communityGoalSoundtrackRef.current.pause();
                communityGoalSoundtrackRef.current.currentTime = 0;
                setIsCommunityGoalPlaying(false);
            }

            // Stop Arrival soundtrack if playing
            if (arrivalSoundtrackRef.current && !arrivalSoundtrackRef.current.paused) {
                arrivalSoundtrackRef.current.pause();
                arrivalSoundtrackRef.current.currentTime = 0;
                setIsArrivalPlaying(false);
            }

            await audio.play();
            setIsParlourPlaying(true);
            setHasInteracted(true);
        } catch (e) {
            // Silently fail
        }
    }, [settings.enabled, settings.parlourSoundtrackEnabled, settings.masterVolume, settings.musicVolume]);

    // Stop Parlour soundtrack
    const stopParlourSoundtrack = useCallback(() => {
        if (parlourSoundtrackRef.current) {
            parlourSoundtrackRef.current.pause();
            parlourSoundtrackRef.current.currentTime = 0;
            setIsParlourPlaying(false);

            // Resume main soundtrack if it was playing before (and no other event soundtrack is active)
            if (isPlaying && !isRecursionPlaying && !isKotwPlaying && !isGoldRushPlaying && !isFirstBloodPlaying && !isCommunityGoalPlaying && !isArrivalPlaying && soundtrackRef.current && settings.enabled && settings.soundtrackEnabled) {
                const effectiveVolume = settings.masterVolume * settings.musicVolume;
                soundtrackRef.current.volume = effectiveVolume;
                soundtrackRef.current.play().catch(() => {});
            }
        }
    }, [isPlaying, isRecursionPlaying, isKotwPlaying, isGoldRushPlaying, isFirstBloodPlaying, isCommunityGoalPlaying, isArrivalPlaying, settings.masterVolume, settings.musicVolume, settings.enabled, settings.soundtrackEnabled]);

    // Stop any currently previewing sound
    const stopPreview = useCallback(() => {
        // Clear any pending timeout
        if (previewTimeoutRef.current) {
            clearTimeout(previewTimeoutRef.current);
            previewTimeoutRef.current = null;
        }

        if (previewingRef.current) {
            previewingRef.current.pause();
            previewingRef.current.currentTime = 0;

            // Only disable loop for SFX - soundtracks should keep looping
            const isSoundtrack = previewingRef.current === soundtrackRef.current ||
                previewingRef.current === recursionSoundtrackRef.current ||
                previewingRef.current === kotwSoundtrackRef.current ||
                previewingRef.current === goldRushSoundtrackRef.current ||
                previewingRef.current === firstBloodSoundtrackRef.current;
            if (!isSoundtrack) {
                previewingRef.current.loop = false;
            }

            previewingRef.current = null;
        }
        setPreviewingSound(null);
    }, []);

    // Preview a specific sound (for settings panel)
    // Click once to play (loops until stopped), click again to stop
    const previewSound = useCallback(async (soundName) => {
        // If already previewing this sound, stop it (toggle off)
        if (previewingSound === soundName) {
            stopPreview();
            return;
        }

        // Stop any current preview first
        stopPreview();

        // The chain this used to carry now lives in `audioFor`, which three
        // callers share. The reason it was written beside the element rather
        // than as a second list of names is unchanged and is recorded there.
        const { audio, isSoundtrack } = audioFor(soundName);

        if (!audio || audio.error) {
            console.warn(`[Sound] Cannot preview ${soundName} - file not loaded`);
            return;
        }

        try {
            // Music tracks follow the music slider, everything else the SFX slider
            const effectiveVolume = isSoundtrack
                ? settings.masterVolume * settings.musicVolume
                : settings.masterVolume * settings.sfxVolume;

            audio.volume = Math.max(0.1, effectiveVolume); // Minimum 10% for preview
            audio.currentTime = 0;

            // Enable looping for preview so user can adjust volume, click again to stop
            audio.loop = true;
            previewingRef.current = audio;

            await audio.play();
            setHasInteracted(true);
            setPreviewingSound(soundName);

            // Auto-stop after 30 seconds as a safety measure
            previewTimeoutRef.current = setTimeout(() => {
                if (previewingRef.current === audio) {
                    stopPreview();
                }
            }, 30000);

        } catch (e) {
            // Silently fail
            setPreviewingSound(null);
        }
    }, [settings.masterVolume, settings.musicVolume, settings.sfxVolume, stopPreview, previewingSound, audioFor]);

    // Play a sound effect
    /**
     * Play one effect by name.
     *
     * A name with no file behind it falls through to `sfxSynth`, which is how
     * the events get their stings without another 26 MB of mp3 — and how four
     * call sites that had been silent since they were written started making a
     * sound. `event_start` (CommunityGoalBanner, FirstBloodBanner,
     * EventSelectionWheel, GoldRushBanner) and `event_win` (FirstBloodBanner)
     * were never in SOUND_FILES and no such file was ever in public/sounds, so
     * every one of them hit the `!audio` guard below and returned silently. A
     * missing sound is meant to be silent; a sound nobody ever added is a
     * different thing, and it looked identical from here.
     *
     * `opts` is only read by the synthesised voices — the parlour's tick takes
     * the ring's speed so it can brighten and harden with it.
     */
    const playSfx = useCallback((soundName, opts) => {
        if (!settings.enabled) return;

        // Check individual sound toggle
        const toggleKey = `${soundName}Enabled`;
        if (settings[toggleKey] === false) return;

        // Calculate effective volume
        const effectiveVolume = settings.masterVolume * settings.sfxVolume;

        const audio = sfxRefs.current[soundName];
        if (!audio || audio.error) {
            if (SYNTH_SOUNDS.includes(soundName)) playSynth(soundName, effectiveVolume, opts);
            return;
        }

        audio.volume = effectiveVolume;

        // Reset and play
        audio.currentTime = 0;
        audio.play().catch(() => {
            // Silently fail
        });
    }, [settings]);

    // Play sound based on item rarity
    const playRaritySound = useCallback((rarity) => {
        if (!settings.enabled) return;

        switch (rarity) {
            case 'insane':
                playSfx('insane');
                break;
            case 'mythic':
                playSfx('mythic');
                break;
            case 'legendary':
                playSfx('legendary');
                break;
            case 'exotic':
                playSfx('exotic');
                break;
            case 'rare':
                playSfx('rare');
                break;
            default:
                // No sound for common items
                break;
        }
    }, [playSfx, settings.enabled]);

    // Play recursion sound
    const playRecursionSound = useCallback(() => {
        playSfx('recursion');
    }, [playSfx]);

    /**
     * One crate landing on the platform, by wagon index.
     *
     * Wagon `i` gets take `i`, always — not a random pick. The takes are four
     * pitches of the same impact, and the point of them is that four crates
     * coming down 0.55s apart do not sound like one crate stuttering; a random
     * pick would draw the same take twice about as often as not and give back
     * exactly the artefact the four files exist to remove.
     *
     * Wrapped rather than called as `playSfx('arrivalCrate1')` at the call site
     * so the four share one settings key. See `arrivalCrateEnabled`.
     *
     * ── `atSeconds`, AND WHY THE CALLER NO LONGER OWNS A TIMER ────────────────
     *
     * `atSeconds` is how far from NOW the impact belongs, and handing it over
     * rather than sleeping on it is the whole fix for the crates being late on
     * the first arrival of a session. Given a decoded sample this becomes
     * `start(currentTime + atSeconds)` — a cue kept by the audio thread, which
     * does not care that the arrival's 3D scene is compiling shaders at that
     * exact moment. Four `setTimeout`s did care, and it showed.
     *
     * The return value is the caller's instruction, not a courtesy: TRUE means
     * the impact is on the audio clock and there is nothing more to do; FALSE
     * means nothing has been scheduled and the caller should fall back to its
     * own timer. That happens where Web Audio is unavailable, where the context
     * has not been unlocked by a gesture yet, and — the common one — on an
     * arrival that lands before the decode has finished.
     */
    const playArrivalCrate = useCallback((index, atSeconds = 0) => {
        if (!settings.enabled) return false;
        if (settings.arrivalCrateEnabled === false) return false;

        // Modulo so a consist longer than the takes still makes a sound rather
        // than falling silent. MAX_CRATES is 4 today and this is unreachable;
        // it is here so raising the cap degrades instead of breaking.
        const take = (Math.max(0, index | 0) % 4) + 1;
        const name = `arrivalCrate${take}`;
        const effectiveVolume = settings.masterVolume * settings.sfxVolume;

        if (playSample(name, { delay: Math.max(0, atSeconds), volume: effectiveVolume })) {
            return true;
        }

        // The element, which cannot be scheduled — so an impact with a delay on
        // it is refused here and left to the caller's timer rather than fired
        // early, which would be worse than late.
        if (atSeconds > 0) return false;
        playSfx(name);
        return true;
    }, [playSfx, settings]);

    /**
     * Take back any impact that has been scheduled and not yet played.
     *
     * The cost of handing the cue sheet to the audio thread: it keeps it even
     * after the arrival leaves the screen. Clearing a timer used to be enough;
     * an arrival cut short by a second event, a navigation or a closed theatre
     * now has to say so.
     */
    const stopArrivalCrates = useCallback(() => {
        stopScheduledSamples();
    }, []);

    // Update a setting
    const updateSetting = useCallback((key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    }, []);

    // Toggle master enabled
    const toggleEnabled = useCallback(() => {
        setSettings(prev => {
            const newEnabled = !prev.enabled;
            // If disabling, stop all sounds
            if (!newEnabled) {
                if (spinRef.current) {
                    spinRef.current.pause();
                    spinRef.current.onended = null;
                }
                if (soundtrackRef.current) {
                    soundtrackRef.current.pause();
                    setIsPlaying(false);
                }
                if (recursionSoundtrackRef.current) {
                    recursionSoundtrackRef.current.pause();
                    setIsRecursionPlaying(false);
                }
                if (kotwSoundtrackRef.current) {
                    kotwSoundtrackRef.current.pause();
                    setIsKotwPlaying(false);
                }
                if (goldRushSoundtrackRef.current) {
                    goldRushSoundtrackRef.current.pause();
                    setIsGoldRushPlaying(false);
                }
                if (firstBloodSoundtrackRef.current) {
                    firstBloodSoundtrackRef.current.pause();
                    setIsFirstBloodPlaying(false);
                }
                if (arrivalSoundtrackRef.current) {
                    arrivalSoundtrackRef.current.pause();
                    setIsArrivalPlaying(false);
                }
                if (parlourSoundtrackRef.current) {
                    parlourSoundtrackRef.current.pause();
                    setIsParlourPlaying(false);
                }
                stopPreview();
            }
            return { ...prev, enabled: newEnabled };
        });
    }, [stopPreview]);

    // Reset to defaults
    const resetToDefaults = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
    }, []);

    const value = {
        settings,
        updateSetting,
        toggleEnabled,
        resetToDefaults,
        isPlaying,
        isRecursionPlaying,
        isKotwPlaying,
        isGoldRushPlaying,
        isFirstBloodPlaying,
        isCommunityGoalPlaying,
        isArrivalPlaying,
        isParlourPlaying,
        hasInteracted,
        audioLoaded,
        startSoundtrack,
        stopSoundtrack,
        toggleSoundtrack,
        startRecursionSoundtrack,
        stopRecursionSoundtrack,
        startKotwSoundtrack,
        stopKotwSoundtrack,
        startGoldRushSoundtrack,
        stopGoldRushSoundtrack,
        startFirstBloodSoundtrack,
        stopFirstBloodSoundtrack,
        startCommunityGoalSoundtrack,
        stopCommunityGoalSoundtrack,
        startArrivalSoundtrack,
        stopArrivalSoundtrack,
        startParlourSoundtrack,
        stopParlourSoundtrack,
        primeSound,
        primeEventSound,
        playSfx,
        playRaritySound,
        playRecursionSound,
        playArrivalCrate,
        stopArrivalCrates,
        previewSound,
        stopPreview,
        previewingSound,
    };

    return (
        <SoundContext.Provider value={value}>
            {children}
        </SoundContext.Provider>
    );
}

export function useSound() {
    const context = useContext(SoundContext);
    if (!context) {
        throw new Error('useSound must be used within a SoundProvider');
    }
    return context;
}

export default SoundContext;