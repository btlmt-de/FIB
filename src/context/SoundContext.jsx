import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

// ============================================
// Sound Context - Manages all game audio
// ============================================

const SoundContext = createContext(null);

// Sound file paths (relative to public folder)
const SOUND_FILES = {
    spin: '/sounds/spin.wav',
    soundtrack: '/sounds/soundtrack.wav',
    recursionSoundtrack: '/sounds/recursion_soundtrack.wav',
    kotwSoundtrack: '/sounds/KOTW.mp3',
    goldRushSoundtrack: '/sounds/gold.mp3',
    firstBloodSoundtrack: '/sounds/blood.mp3',
    recursion: '/sounds/recursion.wav',
    insane: '/sounds/sfxinsane.wav',
    mythic: '/sounds/sfxmythic.wav',
    legendary: '/sounds/sfxlegendary.wav',
    rare: '/sounds/sfxrare.wav',
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
    recursionEnabled: true,
    insaneEnabled: true,
    mythicEnabled: true,
    legendaryEnabled: true,
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
    const [isFirstBloodPlaying, setIsFirstBloodPlaying] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [previewingSound, setPreviewingSound] = useState(null); // Track which sound is previewing

    // Audio refs
    const spinRef = useRef(null);
    const soundtrackRef = useRef(null);
    const recursionSoundtrackRef = useRef(null);
    const kotwSoundtrackRef = useRef(null);
    const goldRushSoundtrackRef = useRef(null);
    const firstBloodSoundtrackRef = useRef(null);
    const sfxRefs = useRef({
        recursion: null,
        insane: null,
        mythic: null,
        legendary: null,
        rare: null,
    });

    // For SFX preview
    const previewingRef = useRef(null);
    const previewTimeoutRef = useRef(null);

    // Track if audio is loaded
    const [audioLoaded, setAudioLoaded] = useState(false);

    // Initialize audio elements
    useEffect(() => {
        // Create spin intro audio element (plays once before soundtrack loops)
        const spin = new Audio(SOUND_FILES.spin);
        spin.loop = false;
        spin.preload = 'auto';
        spin.onerror = () => console.warn('[Sound] Spin file not found - add spin.wav to /public/sounds/');
        spinRef.current = spin;

        // Create main soundtrack audio element (loops after spin)
        const soundtrack = new Audio(SOUND_FILES.soundtrack);
        soundtrack.loop = true;
        soundtrack.preload = 'auto';
        soundtrack.onerror = () => console.warn('[Sound] Soundtrack file not found - add soundtrack.wav to /public/sounds/');
        soundtrackRef.current = soundtrack;

        // Create recursion soundtrack audio element
        const recursionSoundtrack = new Audio(SOUND_FILES.recursionSoundtrack);
        recursionSoundtrack.loop = true;
        recursionSoundtrack.preload = 'auto';
        recursionSoundtrack.onerror = () => console.warn('[Sound] Recursion soundtrack file not found - add recursion_soundtrack.wav to /public/sounds/');
        recursionSoundtrackRef.current = recursionSoundtrack;

        // Create KOTW soundtrack audio element
        const kotwSoundtrack = new Audio(SOUND_FILES.kotwSoundtrack);
        kotwSoundtrack.loop = true;
        kotwSoundtrack.preload = 'auto';
        kotwSoundtrack.onerror = () => console.warn('[Sound] KOTW soundtrack file not found - add KOTW.mp3 to /public/sounds/');
        kotwSoundtrackRef.current = kotwSoundtrack;

        // Create Gold Rush soundtrack audio element
        const goldRushSoundtrack = new Audio(SOUND_FILES.goldRushSoundtrack);
        goldRushSoundtrack.loop = true;
        goldRushSoundtrack.preload = 'auto';
        goldRushSoundtrack.onerror = () => console.warn('[Sound] Gold Rush soundtrack file not found - add gold.mp3 to /public/sounds/');
        goldRushSoundtrackRef.current = goldRushSoundtrack;

        // Create First Blood soundtrack audio element
        const firstBloodSoundtrack = new Audio(SOUND_FILES.firstBloodSoundtrack);
        firstBloodSoundtrack.loop = true;
        firstBloodSoundtrack.preload = 'auto';
        firstBloodSoundtrack.onerror = () => console.warn('[Sound] First Blood soundtrack file not found - add blood.mp3 to /public/sounds/');
        firstBloodSoundtrackRef.current = firstBloodSoundtrack;

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
            if (firstBloodSoundtrackRef.current) {
                firstBloodSoundtrackRef.current.pause();
                firstBloodSoundtrackRef.current = null;
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
    }, [settings.enabled, settings.soundtrackEnabled, settings.masterVolume, settings.musicVolume, isPlaying, isRecursionPlaying, isKotwPlaying, isGoldRushPlaying, isFirstBloodPlaying]);

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
            if (isPlaying && !isKotwPlaying && !isGoldRushPlaying && !isFirstBloodPlaying && soundtrackRef.current && settings.enabled && settings.soundtrackEnabled) {
                const effectiveVolume = settings.masterVolume * settings.musicVolume;
                soundtrackRef.current.volume = effectiveVolume;
                soundtrackRef.current.play().catch(() => {});
            }
        }
    }, [isPlaying, isKotwPlaying, isGoldRushPlaying, isFirstBloodPlaying, settings.masterVolume, settings.musicVolume, settings.enabled, settings.soundtrackEnabled]);

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
            if (isPlaying && !isRecursionPlaying && !isGoldRushPlaying && !isFirstBloodPlaying && soundtrackRef.current && settings.enabled && settings.soundtrackEnabled) {
                const effectiveVolume = settings.masterVolume * settings.musicVolume;
                soundtrackRef.current.volume = effectiveVolume;
                soundtrackRef.current.play().catch(() => {});
            }
        }
    }, [isPlaying, isRecursionPlaying, isGoldRushPlaying, isFirstBloodPlaying, settings.masterVolume, settings.musicVolume, settings.enabled, settings.soundtrackEnabled]);

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
            if (isPlaying && !isRecursionPlaying && !isKotwPlaying && !isFirstBloodPlaying && soundtrackRef.current && settings.enabled && settings.soundtrackEnabled) {
                const effectiveVolume = settings.masterVolume * settings.musicVolume;
                soundtrackRef.current.volume = effectiveVolume;
                soundtrackRef.current.play().catch(() => {});
            }
        }
    }, [isPlaying, isRecursionPlaying, isKotwPlaying, isFirstBloodPlaying, settings.masterVolume, settings.musicVolume, settings.enabled, settings.soundtrackEnabled]);

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
            if (isPlaying && !isRecursionPlaying && !isKotwPlaying && !isGoldRushPlaying && soundtrackRef.current && settings.enabled && settings.soundtrackEnabled) {
                const effectiveVolume = settings.masterVolume * settings.musicVolume;
                soundtrackRef.current.volume = effectiveVolume;
                soundtrackRef.current.play().catch(() => {});
            }
        }
    }, [isPlaying, isRecursionPlaying, isKotwPlaying, isGoldRushPlaying, settings.masterVolume, settings.musicVolume, settings.enabled, settings.soundtrackEnabled]);

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
        } else {
            audio = sfxRefs.current[soundName];
        }

        if (!audio || audio.error) {
            console.warn(`[Sound] Cannot preview ${soundName} - file not loaded`);
            return;
        }

        try {
            // Use appropriate volume
            const effectiveVolume = ['soundtrack', 'recursionSoundtrack', 'kotwSoundtrack', 'goldRushSoundtrack', 'firstBloodSoundtrack'].includes(soundName)
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
    const playSfx = useCallback((soundName) => {
        if (!settings.enabled) return;

        // Check individual sound toggle
        const toggleKey = `${soundName}Enabled`;
        if (settings[toggleKey] === false) return;

        const audio = sfxRefs.current[soundName];
        if (!audio || audio.error) return;

        // Calculate effective volume
        const effectiveVolume = settings.masterVolume * settings.sfxVolume;
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
        playSfx,
        playRaritySound,
        playRecursionSound,
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