import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { SYNTH_SOUNDS, playSynth, unlockSynth } from '../utils/sfxSynth.js';

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
    recursionEnabled: true,
    insaneEnabled: true,
    mythicEnabled: true,
    legendaryEnabled: true,
    exoticEnabled: true,
    rareEnabled: true,
};

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

        // Create SFX audio elements
        Object.keys(sfxRefs.current).forEach(key => {
            const audio = new Audio(SOUND_FILES[key]);
            audio.preload = 'auto';
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

    // Handle user interaction (required for autoplay)
    const handleUserInteraction = useCallback(() => {
        // Open the synth's AudioContext here, on a real gesture. Left to the
        // first sound that wants one it gets created inside some timer or
        // network callback instead, starts suspended, and that first sound is
        // lost — which for this feature is the whole opening of an event.
        unlockSynth();
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
    }, [settings.enabled, settings.soundtrackEnabled, settings.masterVolume, settings.musicVolume, isPlaying, isRecursionPlaying, isKotwPlaying, isGoldRushPlaying, isFirstBloodPlaying, isCommunityGoalPlaying, isArrivalPlaying]);

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
            if (isPlaying && !isKotwPlaying && !isGoldRushPlaying && !isFirstBloodPlaying && !isCommunityGoalPlaying && soundtrackRef.current && settings.enabled && settings.soundtrackEnabled) {
                const effectiveVolume = settings.masterVolume * settings.musicVolume;
                soundtrackRef.current.volume = effectiveVolume;
                soundtrackRef.current.play().catch(() => {});
            }
        }
    }, [isPlaying, isKotwPlaying, isGoldRushPlaying, isFirstBloodPlaying, isCommunityGoalPlaying, settings.masterVolume, settings.musicVolume, settings.enabled, settings.soundtrackEnabled]);

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
            if (isPlaying && !isRecursionPlaying && !isGoldRushPlaying && !isFirstBloodPlaying && !isCommunityGoalPlaying && soundtrackRef.current && settings.enabled && settings.soundtrackEnabled) {
                const effectiveVolume = settings.masterVolume * settings.musicVolume;
                soundtrackRef.current.volume = effectiveVolume;
                soundtrackRef.current.play().catch(() => {});
            }
        }
    }, [isPlaying, isRecursionPlaying, isGoldRushPlaying, isFirstBloodPlaying, isCommunityGoalPlaying, settings.masterVolume, settings.musicVolume, settings.enabled, settings.soundtrackEnabled]);

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
            if (isPlaying && !isRecursionPlaying && !isKotwPlaying && !isFirstBloodPlaying && !isCommunityGoalPlaying && soundtrackRef.current && settings.enabled && settings.soundtrackEnabled) {
                const effectiveVolume = settings.masterVolume * settings.musicVolume;
                soundtrackRef.current.volume = effectiveVolume;
                soundtrackRef.current.play().catch(() => {});
            }
        }
    }, [isPlaying, isRecursionPlaying, isKotwPlaying, isFirstBloodPlaying, isCommunityGoalPlaying, settings.masterVolume, settings.musicVolume, settings.enabled, settings.soundtrackEnabled]);

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
            if (isPlaying && !isRecursionPlaying && !isKotwPlaying && !isGoldRushPlaying && !isCommunityGoalPlaying && soundtrackRef.current && settings.enabled && settings.soundtrackEnabled) {
                const effectiveVolume = settings.masterVolume * settings.musicVolume;
                soundtrackRef.current.volume = effectiveVolume;
                soundtrackRef.current.play().catch(() => {});
            }
        }
    }, [isPlaying, isRecursionPlaying, isKotwPlaying, isGoldRushPlaying, isCommunityGoalPlaying, settings.masterVolume, settings.musicVolume, settings.enabled, settings.soundtrackEnabled]);

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
            if (isPlaying && !isRecursionPlaying && !isKotwPlaying && !isGoldRushPlaying && !isFirstBloodPlaying && soundtrackRef.current && settings.enabled && settings.soundtrackEnabled) {
                const effectiveVolume = settings.masterVolume * settings.musicVolume;
                soundtrackRef.current.volume = effectiveVolume;
                soundtrackRef.current.play().catch(() => {});
            }
        }
    }, [isPlaying, isRecursionPlaying, isKotwPlaying, isGoldRushPlaying, isFirstBloodPlaying, settings.masterVolume, settings.musicVolume, settings.enabled, settings.soundtrackEnabled]);

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
     */
    const startArrivalSoundtrack = useCallback(async () => {
        if (!arrivalSoundtrackRef.current) return;
        if (!settings.enabled || !settings.arrivalSoundtrackEnabled) return;
        if (arrivalSoundtrackRef.current.error) return;

        try {
            const effectiveVolume = settings.masterVolume * settings.musicVolume;
            arrivalSoundtrackRef.current.loop = false;
            arrivalSoundtrackRef.current.volume = effectiveVolume;
            arrivalSoundtrackRef.current.currentTime = 0;

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
            if (isPlaying && !isRecursionPlaying && !isKotwPlaying && !isGoldRushPlaying && !isFirstBloodPlaying && !isCommunityGoalPlaying && soundtrackRef.current && settings.enabled && settings.soundtrackEnabled) {
                const effectiveVolume = settings.masterVolume * settings.musicVolume;
                soundtrackRef.current.volume = effectiveVolume;
                soundtrackRef.current.play().catch(() => {});
            }
        }
    }, [isPlaying, isRecursionPlaying, isKotwPlaying, isGoldRushPlaying, isFirstBloodPlaying, isCommunityGoalPlaying, settings.masterVolume, settings.musicVolume, settings.enabled, settings.soundtrackEnabled]);

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

        let audio;
        // Set alongside the element itself rather than by re-listing the soundtrack names
        // in a second array further down. That duplication is what let the Community Goal
        // track get missed here: its preview fell through to the SFX branch and reported
        // "file not loaded". Adding a soundtrack now means adding exactly one branch.
        let isSoundtrack = true;

        if (soundName === 'soundtrack') {
            audio = soundtrackRef.current;
        } else if (soundName === 'recursionSoundtrack') {
            audio = recursionSoundtrackRef.current;
        } else if (soundName === 'kotwSoundtrack') {
            audio = kotwSoundtrackRef.current;
        } else if (soundName === 'goldRushSoundtrack') {
            audio = goldRushSoundtrackRef.current;
        } else if (soundName === 'firstBloodSoundtrack') {
            audio = firstBloodSoundtrackRef.current;
        } else if (soundName === 'communityGoalSoundtrack') {
            audio = communityGoalSoundtrackRef.current;
        } else if (soundName === 'arrivalSoundtrack') {
            audio = arrivalSoundtrackRef.current;
        } else {
            audio = sfxRefs.current[soundName];
            isSoundtrack = false;
        }

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
    }, [settings.masterVolume, settings.musicVolume, settings.sfxVolume, stopPreview, previewingSound]);

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
     */
    const playArrivalCrate = useCallback((index) => {
        if (settings.arrivalCrateEnabled === false) return;
        // Modulo so a consist longer than the takes still makes a sound rather
        // than falling silent. MAX_CRATES is 4 today and this is unreachable;
        // it is here so raising the cap degrades instead of breaking.
        const take = (Math.max(0, index | 0) % 4) + 1;
        playSfx(`arrivalCrate${take}`);
    }, [playSfx, settings.arrivalCrateEnabled]);

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
        playSfx,
        playRaritySound,
        playRecursionSound,
        playArrivalCrate,
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