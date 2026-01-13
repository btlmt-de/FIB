import React, { useState, useEffect, useRef, memo } from 'react';
import { Crown, Sparkles, Zap, Gift } from 'lucide-react';
import { OddsInfoModal } from './OddsInfoModal.jsx';
import { EnhancedWheelIdleState } from './EnhancedWheelIdleState.jsx';
import { CanvasSpinningStrip, preloadItemImages } from './CanvasSpinningStrip.jsx';
import { CanvasResultItem } from './CanvasResultItem.jsx';
import { CanvasBonusStrip } from './CanvasBonusStrip.jsx';

import {
    COLORS, API_BASE_URL, IMAGE_BASE_URL, WHEEL_TEXTURE_URL,
    ITEM_WIDTH, STRIP_LENGTH, FINAL_INDEX,
    TEAM_MEMBERS, RARE_MEMBERS, MYTHIC_ITEMS, MYTHIC_ITEM, EVENT_ITEM, BONUS_EVENTS, INSANE_ITEMS, RECURSION_ITEM
} from '../../config/constants.js';
import {
    formatChance, getMinecraftHeadUrl,
    isInsaneItem, isSpecialItem, isRareItem, isMythicItem, isEventItem, isRecursionItem
} from '../../utils/helpers.js';
import { useWheelConfig } from '../../hooks/useWheelConfig';
import { useActivity } from '../../context/ActivityContext.jsx';
import { useSound } from '../../context/SoundContext.jsx';


function WheelSpinnerComponent({ allItems, collection, onSpinComplete, user, dynamicItems }) {
    // Get spin duration from server config
    const { spinDuration } = useWheelConfig();

    // Get recursion status from ActivityContext - no separate polling!
    const { recursionStatus, updateRecursionStatus } = useActivity();

    // Get sound functions
    const { startSoundtrack, stopSoundtrack, playRaritySound, playRecursionSound, isPlaying: isMusicPlaying } = useSound();

    const [state, setState] = useState('idle');
    const [strip, setStrip] = useState([]);
    const [result, setResult] = useState(null);
    const [isNewItem, setIsNewItem] = useState(false);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 600 : false);
    const [showOddsInfo, setShowOddsInfo] = useState(false);
    const [spinProgress, setSpinProgress] = useState(0); // 0-1 for Phase 2 effects
    const [imagesPreloaded, setImagesPreloaded] = useState(false); // Track if images are ready
    const [preloadProgress, setPreloadProgress] = useState(0); // 0-100 percentage
    // Use ref for canvas offset to avoid re-renders during animation
    const canvasOffsetRef = useRef(0);
    const animationRef = useRef(null);
    // Track last spin progress to avoid redundant setState calls
    const lastSpinProgressRef = useRef(-1);

    // Mobile-specific dimensions - taller strip with more items visible
    const MOBILE_STRIP_HEIGHT = 260;
    const MOBILE_STRIP_WIDTH = 140;
    const MOBILE_ITEM_WIDTH = 70;
    const MOBILE_CARD_WIDTH = 300;  // Wider card to fit result text

    // Use refs for animation offsets to avoid re-renders during animation
    const stripRef = useRef(null);
    const offsetRef = useRef(0);

    // Triple spin state
    const [tripleStrips, setTripleStrips] = useState([[], [], [], [], []]);
    const [tripleResults, setTripleResults] = useState([null, null, null, null, null]);
    const [tripleNewItems, setTripleNewItems] = useState([false, false, false, false, false]);
    // Use refs for triple offsets to avoid re-renders during animation
    const tripleAnimationRefs = useRef([null, null, null, null, null]);
    const tripleStripRefs = useRef([null, null, null, null, null]);
    const tripleOffsetRefs = useRef([0, 0, 0, 0, 0]);

    // Bonus wheel state - using horizontal strip like main wheel
    const [bonusStrip, setBonusStrip] = useState([]);
    const bonusOffsetRef = useRef(0); // Use ref instead of state
    const [selectedEvent, setSelectedEvent] = useState(null);
    const bonusWheelRef = useRef(null);

    // Lucky spin state
    const [luckyResult, setLuckyResult] = useState(null);
    const [isLuckyNew, setIsLuckyNew] = useState(false);

    // Recursion active state - derived from ActivityContext
    const recursionActive = recursionStatus?.active || false;
    const recursionSpinsRemaining = recursionStatus?.userSpinsRemaining ?? 0;

    // Track if the CURRENT RESULT was from a recursion lucky spin
    // This persists during result display even after user runs out of spins
    const [resultWasRecursionSpin, setResultWasRecursionSpin] = useState(false);

    // Track if the CURRENT spin animation is a recursion lucky spin
    // This prevents visual effects from changing mid-animation when spinsRemaining updates
    const currentSpinIsRecursionRef = useRef(false);

    // Pending spin flag for instant respin
    const pendingSpinRef = useRef(false);

    // Ref to hold current spin function for keyboard events
    const spinRef = useRef(null);

    // Ref to hold current respin function for keyboard events
    const respinRef = useRef(null);

    // Animation cancellation flag to prevent stale updates
    const animationCancelledRef = useRef(false);

    // AbortController for cancelling in-flight API requests
    const abortControllerRef = useRef(null);

    // Error state for server unavailability
    const [error, setError] = useState(null);

    // Client-side cooldown tracking (mirrors server's 3s cooldown)
    const lastSpinTimeRef = useRef(0);
    const SPIN_COOLDOWN = 3000; // 3 seconds - must match server

    function canSpin() {
        const now = Date.now();
        if (now - lastSpinTimeRef.current < SPIN_COOLDOWN) {
            setError("Don't spin too fast!");
            return false;
        }
        return true;
    }

    function markSpinTime() {
        lastSpinTimeRef.current = Date.now();
    }

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 600);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Preload ALL item images on mount so they're ready for first spin
    useEffect(() => {
        if (allItems.length === 0) return;

        let isMounted = true;
        setImagesPreloaded(false);
        setPreloadProgress(0);

        preloadItemImages(allItems, (loaded, total) => {
            if (isMounted) {
                setPreloadProgress(Math.round((loaded / total) * 100));
            }
        }).then(() => {
            if (isMounted) {
                setImagesPreloaded(true);
            }
        }).catch((err) => {
            console.error('Failed to preload images:', err);
            // Set ready state anyway so user can spin (images will load on demand)
            if (isMounted) {
                setImagesPreloaded(true);
                setPreloadProgress(100);
            }
        });

        return () => {
            isMounted = false;
        };
    }, [allItems]);

    // Spacebar to spin/respin
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Only trigger on spacebar, and not when typing in an input
            if (e.code === 'Space' &&
                !e.target.closest('input, textarea, [contenteditable]')) {

                // Check if we can spin
                if (!user || allItems.length === 0) return;

                e.preventDefault();

                // If in result state, use respin for instant re-spin
                if (state === 'result' || state === 'tripleResult' || state === 'luckyResult' || state === 'tripleLuckyResult' || state === 'recursion') {
                    respinRef.current?.();
                } else if (state === 'idle') {
                    spinRef.current?.();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state, user, allItems.length]);

    useEffect(() => {
        return () => {
            animationCancelledRef.current = true;
            if (abortControllerRef.current) abortControllerRef.current.abort();
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (bonusWheelRef.current) cancelAnimationFrame(bonusWheelRef.current);
            tripleAnimationRefs.current.forEach(ref => { if (ref) cancelAnimationFrame(ref); });
        };
    }, []);

    // Handle pending spin after state becomes idle
    // Note: spin is intentionally omitted from deps as it's not memoized
    // and the ref-based pendingSpinRef pattern handles stale closure issues
    useEffect(() => {
        if (state === 'idle' && pendingSpinRef.current) {
            pendingSpinRef.current = false;
            spin();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state]);

    function getItemImageUrl(item) {
        if (!item) return `${IMAGE_BASE_URL}/barrier.png`;
        // Check both camelCase and snake_case since API returns snake_case
        if (item.imageUrl) return item.imageUrl;
        if (item.image_url) return item.image_url;
        if (isEventItem(item)) return EVENT_ITEM.imageUrl;
        if (isRecursionItem(item)) return RECURSION_ITEM.imageUrl;
        if (isInsaneItem(item) && !item.username) {
            const insane = INSANE_ITEMS.find(i => i.texture === item.texture);
            if (insane) return insane.imageUrl;
        }
        if (isMythicItem(item) && !item.username) {
            // Find matching mythic item by texture
            const mythic = MYTHIC_ITEMS.find(m => m.texture === item.texture);
            if (mythic) return mythic.imageUrl;
            return MYTHIC_ITEM.imageUrl; // Fallback to first mythic
        }
        if (item.username) return getMinecraftHeadUrl(item.username);
        return `${IMAGE_BASE_URL}/${item.texture}.png`;
    }

    // Fisher-Yates shuffle helper
    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    function buildStrip(finalItem, length = STRIP_LENGTH) {
        const newStrip = [];
        const finalIndex = length - 8; // Position 72 for length 80

        // Shuffle all item pools for better visual randomness
        const shuffledItems = shuffleArray([...allItems]);
        const shuffledInsane = shuffleArray([...INSANE_ITEMS]);
        const shuffledMythic = shuffleArray([...MYTHIC_ITEMS]);
        const shuffledRare = shuffleArray([...RARE_MEMBERS]);
        const shuffledLegendary = shuffleArray([...TEAM_MEMBERS]);

        // Use indices to iterate through shuffled arrays (guarantees distribution)
        let itemIndex = 0;
        let insaneIndex = 0;
        let mythicIndex = 0;
        let rareIndex = 0;
        let legendaryIndex = 0;

        for (let i = 0; i < length; i++) {
            if (i === finalIndex) {
                newStrip.push(finalItem);
            } else {
                const roll = Math.random();
                let newItem = null;

                // Visual flair - show special items in the strip animation
                if (roll < 0.001 && shuffledInsane.length > 0) {
                    // 0.1% chance for insane
                    const insane = shuffledInsane[insaneIndex % shuffledInsane.length];
                    insaneIndex++;
                    newItem = { ...insane, isInsane: true };
                } else if (roll < 0.003 && shuffledMythic.length > 0) {
                    // 0.2% chance for mythic (0.1% to 0.3%)
                    const mythic = shuffledMythic[mythicIndex % shuffledMythic.length];
                    mythicIndex++;
                    newItem = { ...mythic, isMythic: true };
                } else if (roll < 0.033 && shuffledRare.length > 0) {
                    // 3% chance for rare
                    const rare = shuffledRare[rareIndex % shuffledRare.length];
                    rareIndex++;
                    newItem = { ...rare, isRare: true, texture: `rare_${rare.username}` };
                } else if (roll < 0.053 && shuffledLegendary.length > 0) {
                    // 2% chance for legendary
                    const member = shuffledLegendary[legendaryIndex % shuffledLegendary.length];
                    legendaryIndex++;
                    newItem = {
                        ...member,
                        isSpecial: true,
                        texture: member.username ? `special_${member.username}` : member.name.toLowerCase().replace(/\s+/g, '_')
                    };
                } else if (shuffledItems.length > 0) {
                    // Regular items - iterate through shuffled pool for maximum variety
                    newItem = shuffledItems[itemIndex % shuffledItems.length];
                    itemIndex++;
                }

                // ALWAYS push an item - fallback to first available item if needed
                if (newItem) {
                    newStrip.push(newItem);
                } else if (shuffledItems.length > 0) {
                    // Fallback: use a regular item
                    newStrip.push(shuffledItems[itemIndex % shuffledItems.length]);
                    itemIndex++;
                } else {
                    // Ultimate fallback: use the finalItem (shouldn't happen in practice)
                    newStrip.push(finalItem);
                }
            }
        }
        return newStrip;
    }

    // Instant respin - no delays
    function respin() {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        tripleAnimationRefs.current.forEach(ref => { if (ref) cancelAnimationFrame(ref); });

        // Reset states
        setResult(null);
        setIsNewItem(false);
        setTripleResults([null, null, null, null, null]);
        setTripleNewItems([false, false, false, false, false]);

        // Directly perform spin (bypass idle check)
        performSpin();
    }

    // Keep refs updated for keyboard handler
    respinRef.current = respin;

    // Helper to update spin progress only when value changes
    const updateSpinProgress = (value) => {
        if (lastSpinProgressRef.current !== value) {
            lastSpinProgressRef.current = value;
            setSpinProgress(value);
        }
    };

    // Core spin logic - extracted so respin can call it directly
    async function performSpin() {
        if (!user || allItems.length === 0) return;

        // Client-side cooldown check (prevents animation flash)
        if (!canSpin()) return;

        // Reset cancellation flag for new spin
        animationCancelledRef.current = false;

        // Track if this spin will use a recursion lucky spin (before API call)
        // This ensures visual effects stay consistent during the animation
        currentSpinIsRecursionRef.current = recursionActive && recursionSpinsRemaining > 0;

        try {
            setState('spinning');
            updateSpinProgress(0); // Reset progress for Phase 2 effects

            // Start soundtrack when spinning begins
            if (!isMusicPlaying) {
                startSoundtrack();
            }

            // IMMEDIATELY build a placeholder strip and start animation
            // This makes the wheel feel instant - no waiting for API
            const placeholderItem = allItems[Math.floor(Math.random() * allItems.length)];
            const placeholderStrip = buildStrip(placeholderItem);
            setStrip(placeholderStrip);
            offsetRef.current = 0;
            canvasOffsetRef.current = 0;

            // Pre-calculate animation parameters (use larger items on mobile)
            const itemWidth = isMobile ? MOBILE_ITEM_WIDTH : ITEM_WIDTH;
            const targetOffset = FINAL_INDEX * itemWidth;
            let offsetVariance;
            const edgeRoll = Math.random();
            if (edgeRoll < 0.15) {
                offsetVariance = -25 - Math.random() * 12;
            } else if (edgeRoll < 0.30) {
                offsetVariance = 25 + Math.random() * 12;
            } else {
                offsetVariance = (Math.random() - 0.5) * 30;
            }
            const finalOffset = targetOffset + offsetVariance;

            // Start animation IMMEDIATELY (before API returns)
            let startTime = null;
            let spinResult = null;
            let finalItem = placeholderItem;

            // Create abort controller for this request with timeout
            const controller = new AbortController();
            abortControllerRef.current = controller;
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

            // Make API call in parallel with animation
            const apiCall = (async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/spin`, {
                        method: 'POST',
                        credentials: 'include',
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    // Check if cancelled during fetch
                    if (animationCancelledRef.current) return null;

                    spinResult = await res.json();

                    // Handle rate limit / cooldown
                    if (res.status === 429 || spinResult.cooldown) {
                        setError("Don't spin too fast!");
                        animationCancelledRef.current = true;
                        if (animationRef.current) cancelAnimationFrame(animationRef.current);
                        setStrip([]);
                        setResult(null);
                        setIsNewItem(false);
                        setState('idle');
                        return null;
                    }

                    if (!res.ok || !spinResult.result) {
                        throw new Error(spinResult.error || 'Spin failed');
                    }

                    // Track if this specific spin was a recursion lucky spin
                    // This persists in the result view even after user runs out of spins
                    setResultWasRecursionSpin(spinResult.isRecursionSpin || false);

                    // Update recursion state in ActivityContext from spin result
                    if (spinResult.recursionStatus) {
                        updateRecursionStatus(spinResult.recursionStatus);
                    }

                    // Mark spin time only after successful response
                    markSpinTime();

                    finalItem = {
                        ...spinResult.result,
                        isSpecial: spinResult.result.type === 'legendary',
                        isRare: spinResult.result.type === 'rare',
                        isMythic: spinResult.result.type === 'mythic',
                        isEvent: spinResult.result.type === 'event',
                        isRecursion: spinResult.result.type === 'recursion'
                    };

                    // Check again before updating state
                    if (animationCancelledRef.current) return null;

                    // Update only the final item in the strip at FINAL_INDEX (position 72)
                    // This prevents visible items from randomly changing during the animation
                    setStrip(prevStrip => {
                        const newStrip = [...prevStrip];
                        // Use constant FINAL_INDEX to ensure consistency with animation target
                        if (FINAL_INDEX >= 0 && FINAL_INDEX < newStrip.length) {
                            newStrip[FINAL_INDEX] = finalItem;
                        }
                        return newStrip;
                    });
                    setResult(finalItem);
                    setIsNewItem(spinResult.isNew);

                    return spinResult;
                } catch (err) {
                    clearTimeout(timeoutId);
                    // Re-throw unless aborted (which is intentional)
                    if (err.name === 'AbortError') {
                        return null; // Silently ignore abort
                    }
                    throw err;
                }
            })();

            const animate = (timestamp) => {
                // Bail out if animation was cancelled (e.g., cooldown, unmount)
                if (animationCancelledRef.current) return;

                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / spinDuration, 1);
                const eased = 1 - Math.pow(1 - progress, 4);
                offsetRef.current = eased * finalOffset;

                // Update spin progress for Phase 2 visual effects (throttled updates)
                // Only update at key thresholds to avoid excessive re-renders
                if (progress < 0.1) updateSpinProgress(0);
                else if (progress >= 0.5 && progress < 0.55) updateSpinProgress(0.5);
                else if (progress >= 0.7 && progress < 0.75) updateSpinProgress(0.7);
                else if (progress >= 0.9) updateSpinProgress(0.95);

                // Canvas strip reads directly from canvasOffsetRef - no setState needed!
                canvasOffsetRef.current = offsetRef.current;

                if (progress < 1 && !animationCancelledRef.current) {
                    animationRef.current = requestAnimationFrame(animate);
                } else if (!animationCancelledRef.current) {
                    // Animation complete - wait for API if needed, then finish
                    apiCall.then((result) => {
                        // Check for cancellation before updating state
                        if (animationCancelledRef.current) return;

                        // If result is null (e.g., abort), reset to idle
                        if (result === null) {
                            setState('idle');
                            return;
                        }

                        if (result.isRecursion) {
                            // RECURSION triggered! Show special result state
                            setState('recursion');
                            playRecursionSound();
                            if (onSpinComplete) onSpinComplete(result);
                        } else if (result.isEvent) {
                            setState('event');
                            setTimeout(() => spinBonusWheel(), 1500);
                        } else {
                            setState('result');
                            setSpinProgress(1); // Animation complete
                            // Play sound based on item rarity
                            if (result.result?.type) {
                                playRaritySound(result.result.type);
                            }
                            if (onSpinComplete) onSpinComplete(result);
                        }
                    }).catch((err) => {
                        // Check for cancellation before updating state
                        if (animationCancelledRef.current) return;

                        console.error('Spin failed:', err);
                        if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
                            setError('Server unavailable. Please try again later.');
                        } else {
                            setError(err.message || 'Spin failed. Please try again.');
                        }
                        // Clear stale spin state
                        setStrip([]);
                        setResult(null);
                        setIsNewItem(false);
                        setState('idle');
                    });
                }
            };
            animationRef.current = requestAnimationFrame(animate);
        } catch (err) {
            console.error('Spin failed:', err);
            if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
                setError('Server unavailable. Please try again later.');
            } else {
                setError(err.message || 'Spin failed. Please try again.');
            }
            // Clear stale spin state
            setStrip([]);
            setResult(null);
            setIsNewItem(false);
            setState('idle');
        }
    }

    async function spin() {
        if (state !== 'idle' || !user) return;
        if (allItems.length === 0) return;
        setError(null); // Clear any previous error
        performSpin();
    }

    // Keep spinRef updated for keyboard handler
    spinRef.current = spin;

    // Helper function to select a weighted random event
    function selectWeightedEvent() {
        const totalWeight = BONUS_EVENTS.reduce((sum, e) => sum + (e.weight || 1), 0);
        let roll = Math.random() * totalWeight;

        for (const event of BONUS_EVENTS) {
            roll -= (event.weight || 1);
            if (roll <= 0) return event;
        }
        return BONUS_EVENTS[0]; // Fallback
    }

    // Spin the bonus wheel to select which event - using horizontal strip
    function spinBonusWheel() {
        setState('bonusWheel');

        // Pick weighted random event
        const event = selectWeightedEvent();
        setSelectedEvent(event);

        // Build a strip of events (repeat them to fill the strip)
        const BONUS_STRIP_LENGTH = 40;
        const BONUS_ITEM_WIDTH = 160;
        const BONUS_FINAL_INDEX = BONUS_STRIP_LENGTH - 5;
        const newStrip = [];
        for (let i = 0; i < BONUS_STRIP_LENGTH; i++) {
            if (i === BONUS_FINAL_INDEX) {
                newStrip.push(event);
            } else {
                // Random event for filler (also weighted for visual consistency)
                newStrip.push(selectWeightedEvent());
            }
        }
        setBonusStrip(newStrip);
        bonusOffsetRef.current = 0;

        // Animate the strip
        const targetOffset = BONUS_FINAL_INDEX * BONUS_ITEM_WIDTH;
        const finalOffset = targetOffset + (Math.random() - 0.5) * 20;
        let startTime = null;
        const duration = 3500;

        const animateStrip = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out quartic for nice deceleration
            const eased = 1 - Math.pow(1 - progress, 4);
            bonusOffsetRef.current = eased * finalOffset;

            if (progress < 1) {
                bonusWheelRef.current = requestAnimationFrame(animateStrip);
            } else {
                // Show result briefly then execute
                setState('bonusResult');
                setTimeout(() => executeSelectedEvent(event), 1500);
            }
        };
        bonusWheelRef.current = requestAnimationFrame(animateStrip);
    }

    // Execute the selected bonus event
    async function executeSelectedEvent(event) {
        if (event.id === 'triple_spin') {
            triggerTripleSpin();
        } else if (event.id === 'lucky_spin') {
            triggerLuckySpin();
        } else if (event.id === 'triple_lucky_spin') {
            triggerTripleLuckySpin();
        }
    }

    // Lucky spin - equal probability for all items (bonus event reward - no cooldown)
    async function triggerLuckySpin() {
        setState('luckySpinning');
        animationCancelledRef.current = false;

        try {
            const res = await fetch(`${API_BASE_URL}/api/spin/lucky`, {
                method: 'POST',
                credentials: 'include'
            });
            const spinResult = await res.json();

            // Check for errors (no cooldown check - this is a bonus reward)
            if (!res.ok || !spinResult.result) {
                setError(spinResult.error || 'Spin failed. Please wait a moment and try again.');
                setState('idle');
                return;
            }

            const finalItem = {
                ...spinResult.result,
                isSpecial: spinResult.result.type === 'legendary',
                isRare: spinResult.result.type === 'rare',
                isMythic: spinResult.result.type === 'mythic',
                isLucky: true
            };

            // Build strip and animate
            const newStrip = buildStrip(finalItem);
            setStrip(newStrip);
            setLuckyResult(finalItem);
            setIsLuckyNew(spinResult.isNew);
            offsetRef.current = 0;
            canvasOffsetRef.current = 0;

            const itemWidth = isMobile ? MOBILE_ITEM_WIDTH : ITEM_WIDTH;
            const targetOffset = FINAL_INDEX * itemWidth;
            // Add "edge" tension - sometimes land very close to adjacent items
            let offsetVariance;
            const edgeRoll = Math.random();
            if (edgeRoll < 0.15) {
                offsetVariance = -25 - Math.random() * 12;
            } else if (edgeRoll < 0.30) {
                offsetVariance = 25 + Math.random() * 12;
            } else {
                offsetVariance = (Math.random() - 0.5) * 30;
            }
            const finalOffset = targetOffset + offsetVariance;
            let startTime = null;

            const animate = (timestamp) => {
                // Bail out if animation was cancelled
                if (animationCancelledRef.current) return;

                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / spinDuration, 1);
                const eased = 1 - Math.pow(1 - progress, 4);
                offsetRef.current = eased * finalOffset;

                // Canvas strip reads directly from canvasOffsetRef - no setState needed!
                canvasOffsetRef.current = offsetRef.current;

                if (progress < 1 && !animationCancelledRef.current) {
                    animationRef.current = requestAnimationFrame(animate);
                } else if (!animationCancelledRef.current) {
                    setState('luckyResult');
                    // Play sound for lucky result
                    if (finalItem?.type) {
                        playRaritySound(finalItem.type);
                    }
                    if (onSpinComplete) onSpinComplete(spinResult);
                }
            };
            animationRef.current = requestAnimationFrame(animate);
        } catch (error) {
            console.error('Lucky spin failed:', error);
            setState('idle');
        }
    }

    async function triggerTripleSpin() {
        setState('tripleSpinning');
        let tripleSpinTracked = false; // Track if we've reported this triple spin

        try {
            // Helper to get a valid (non-event) spin result
            async function getValidSpin() {
                let attempts = 0;
                while (attempts < 5) {
                    const bodyData = { bonus: true };
                    // On first successful spin, mark it as triple spin trigger
                    if (!tripleSpinTracked) {
                        bodyData.eventType = 'triple_spin';
                        bodyData.isFirstSpin = true;
                    }

                    const res = await fetch(`${API_BASE_URL}/api/spin`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(bodyData)
                    });
                    const result = await res.json();

                    // Handle rate limit / cooldown - throw to abort triple spin
                    if (res.status === 429 || result.cooldown) {
                        throw new Error('COOLDOWN');
                    }

                    // Check for other errors
                    if (!res.ok || !result.result) {
                        throw new Error(result.error || 'Spin failed');
                    }

                    if (!result.isEvent) {
                        tripleSpinTracked = true; // Mark as tracked after successful non-event spin
                        return result;
                    }
                    attempts++;
                }
                // Fallback: return a random regular item (shouldn't happen often)
                const regularItem = allItems[Math.floor(Math.random() * allItems.length)];
                return {
                    result: { ...regularItem, type: 'regular' },
                    isNew: !collection[regularItem.texture],
                    isEvent: false
                };
            }

            // Get 5 valid spins (retrying if we hit events)
            const results = await Promise.all([getValidSpin(), getValidSpin(), getValidSpin(), getValidSpin(), getValidSpin()]);

            const newStrips = [];
            const newResults = [];
            const newItems = [];

            for (let i = 0; i < 5; i++) {
                const spinResult = results[i];
                const finalItem = {
                    ...spinResult.result,
                    isSpecial: spinResult.result.type === 'legendary',
                    isRare: spinResult.result.type === 'rare',
                    isMythic: spinResult.result.type === 'mythic'
                };
                newStrips.push(buildStrip(finalItem));
                newResults.push(finalItem);
                newItems.push(spinResult.isNew);
            }

            setTripleStrips(newStrips);
            setTripleResults(newResults);
            setTripleNewItems(newItems);
            tripleOffsetRefs.current = [0, 0, 0, 0, 0];

            // Staggered animation start
            const delays = [0, 200, 400, 600, 800];
            const completedCount = { current: 0 };
            // Use responsive item width for animation - must match the display (58 for 5x spin on mobile)
            const tripleItemWidth = isMobile ? 58 : ITEM_WIDTH;
            const STRIP_HEIGHT_MOBILE = 200;

            delays.forEach((delay, rowIndex) => {
                setTimeout(() => {
                    const targetOffset = FINAL_INDEX * tripleItemWidth;
                    // Add "edge" tension - sometimes land very close to adjacent items
                    let offsetVariance;
                    const edgeRoll = Math.random();
                    if (edgeRoll < 0.15) {
                        offsetVariance = -25 - Math.random() * 12;
                    } else if (edgeRoll < 0.30) {
                        offsetVariance = 25 + Math.random() * 12;
                    } else {
                        offsetVariance = (Math.random() - 0.5) * 30;
                    }
                    const finalOffset = targetOffset + offsetVariance;
                    let startTime = null;

                    const animate = (timestamp) => {
                        if (!startTime) startTime = timestamp;
                        const elapsed = timestamp - startTime;
                        const progress = Math.min(elapsed / spinDuration, 1);
                        const eased = 1 - Math.pow(1 - progress, 4);

                        // Canvas strips read directly from tripleOffsetRefs - no setState needed!
                        tripleOffsetRefs.current[rowIndex] = eased * finalOffset;

                        if (progress < 1) {
                            tripleAnimationRefs.current[rowIndex] = requestAnimationFrame(animate);
                        } else {
                            completedCount.current++;
                            if (completedCount.current === 5) {
                                setState('tripleResult');
                                // Play sound for best rarity among all 5 results
                                const rarityPriority = ['insane', 'mythic', 'legendary', 'rare'];
                                const bestRarity = results.reduce((best, r) => {
                                    const type = r?.result?.type;
                                    const bestIndex = rarityPriority.indexOf(best);
                                    const typeIndex = rarityPriority.indexOf(type);
                                    if (typeIndex !== -1 && (bestIndex === -1 || typeIndex < bestIndex)) {
                                        return type;
                                    }
                                    return best;
                                }, null);
                                if (bestRarity) playRaritySound(bestRarity);
                                results.forEach(r => { if (onSpinComplete) onSpinComplete(r); });
                            }
                        }
                    };
                    tripleAnimationRefs.current[rowIndex] = requestAnimationFrame(animate);
                }, delay);
            });
        } catch (error) {
            // Show error message on cooldown, log other failures
            if (error.message === 'COOLDOWN') {
                setError("Don't spin too fast!");
            } else {
                console.error('Triple spin failed:', error);
            }
            setState('idle');
        }
    }

    // Triple Lucky Spin - 3 lucky spins with equal probability for all items
    async function triggerTripleLuckySpin() {
        setState('tripleLuckySpinning');
        let tripleLuckySpinTracked = false; // Track if we've reported this triple lucky spin

        try {
            // Helper to get a lucky spin result
            async function getLuckySpin() {
                const bodyData = { bonus: true };
                // On first successful spin, mark it as triple lucky spin trigger
                if (!tripleLuckySpinTracked) {
                    bodyData.eventType = 'triple_lucky_spin';
                    bodyData.isFirstSpin = true;
                }

                const res = await fetch(`${API_BASE_URL}/api/spin/lucky`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(bodyData)
                });
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Lucky spin failed');
                }

                // Mark as tracked after first successful spin
                if (!tripleLuckySpinTracked) {
                    tripleLuckySpinTracked = true;
                }

                return data;
            }

            // Get all 3 lucky spin results
            const results = await Promise.all([getLuckySpin(), getLuckySpin(), getLuckySpin()]);

            // Build strips for each result
            const strips = results.map(r => {
                const finalItem = {
                    ...r.result,
                    isSpecial: r.result.type === 'legendary',
                    isRare: r.result.type === 'rare',
                    isMythic: r.result.type === 'mythic',
                    isLucky: true
                };
                return buildStrip(finalItem);
            });

            setTripleStrips(strips);
            setTripleResults(results.map(r => ({
                ...r.result,
                isSpecial: r.result.type === 'legendary',
                isRare: r.result.type === 'rare',
                isMythic: r.result.type === 'mythic',
                isLucky: true
            })));
            setTripleNewItems(results.map(r => r.isNew));
            tripleOffsetRefs.current = [0, 0, 0];

            // Animate all three strips with staggered starts
            const completedCount = { current: 0 };
            const delays = [0, 200, 400];
            // Use responsive item width for animation - must match the display (90 for triple lucky desktop, 70 for mobile)
            const tripleItemWidth = isMobile ? 70 : 90;
            const STRIP_HEIGHT_MOBILE = 200; // Must match rendering

            strips.forEach((_, rowIndex) => {
                const delay = delays[rowIndex];

                setTimeout(() => {
                    const targetOffset = FINAL_INDEX * tripleItemWidth;
                    const edgeRoll = Math.random();
                    let offsetVariance;
                    if (edgeRoll < 0.15) {
                        offsetVariance = -25 - Math.random() * 12;
                    } else if (edgeRoll < 0.30) {
                        offsetVariance = 25 + Math.random() * 12;
                    } else {
                        offsetVariance = (Math.random() - 0.5) * 30;
                    }
                    const finalOffset = targetOffset + offsetVariance;
                    let startTime = null;

                    const animate = (timestamp) => {
                        if (!startTime) startTime = timestamp;
                        const elapsed = timestamp - startTime;
                        const progress = Math.min(elapsed / spinDuration, 1);
                        const eased = 1 - Math.pow(1 - progress, 4);

                        // Canvas strips read directly from tripleOffsetRefs - no setState needed!
                        tripleOffsetRefs.current[rowIndex] = eased * finalOffset;

                        if (progress < 1) {
                            tripleAnimationRefs.current[rowIndex] = requestAnimationFrame(animate);
                        } else {
                            completedCount.current++;
                            if (completedCount.current === 3) {
                                setState('tripleLuckyResult');
                                // Play sound for best rarity among all 3 results
                                const rarityPriority = ['insane', 'mythic', 'legendary', 'rare'];
                                const bestRarity = results.reduce((best, r) => {
                                    const type = r?.result?.type;
                                    const bestIndex = rarityPriority.indexOf(best);
                                    const typeIndex = rarityPriority.indexOf(type);
                                    if (typeIndex !== -1 && (bestIndex === -1 || typeIndex < bestIndex)) {
                                        return type;
                                    }
                                    return best;
                                }, null);
                                if (bestRarity) playRaritySound(bestRarity);
                                results.forEach(r => { if (onSpinComplete) onSpinComplete(r); });
                            }
                        }
                    };
                    tripleAnimationRefs.current[rowIndex] = requestAnimationFrame(animate);
                }, delay);
            });
        } catch (error) {
            console.error('Triple lucky spin failed:', error);
            setState('idle');
        }
    }

    const reset = () => {
        setState('idle');
        setResult(null);
        offsetRef.current = 0;
        canvasOffsetRef.current = 0;
        setStrip([]);
        setIsNewItem(false);
        setTripleStrips([[], [], [], [], []]);
        tripleOffsetRefs.current = [0, 0, 0, 0, 0];
        setTripleResults([null, null, null, null, null]);
        setTripleNewItems([false, false, false, false, false]);
        setSelectedEvent(null);
        setBonusStrip([]);
        bonusOffsetRef.current = 0;
        setLuckyResult(null);
        setIsLuckyNew(false);
    };

    const isDisabled = !user || allItems.length === 0;
    // totalItemCount includes both regular items and dynamic items (team members, special items)
    const totalItemCount = allItems.length + (dynamicItems?.length || 0);

    // Render item box with proper styling matching old_wheel.jsx
    const renderItemBox = (item, idx, isWinning, size = 52, disableAnimation = false) => {
        if (!item) return null;
        const isInsane = isInsaneItem(item);
        const isSpecial = isSpecialItem(item);
        const isMythic = isMythicItem(item);
        const isRare = isRareItem(item);
        const isEvent = isEventItem(item);
        const isRecursion = isRecursionItem(item);

        // Enable glow animations for special items even during spinning (looks better)
        // disableAnimation only affects regular items for performance
        const isSpecialType = isInsane || isMythic || isSpecial || isRare || isEvent || isRecursion;
        const shouldAnimate = isSpecialType || (!disableAnimation && (isWinning || state === 'result' || state === 'tripleResult' || state === 'luckyResult' || state === 'tripleLuckyResult'));

        // During recursion spin, ALL items get a green aura while spinning
        // Use the ref to check if THIS spin is a recursion spin (not the live state)
        const isSpinning = state === 'spinning' || state === 'tripleSpinning' || state === 'tripleLuckySpinning';
        const spinIsRecursion = currentSpinIsRecursionRef.current;
        // Disable rarity aura on mobile during spinning for better performance
        const showRarityAura = !isMobile && isSpinning && (isSpecialType || spinIsRecursion);

        // Get rarity-specific aura animation
        const getRarityAura = () => {
            if (spinIsRecursion && !isSpecialType) return 'rarityAuraGreen 1s ease-in-out infinite';
            if (isInsane) return 'rarityAuraInsane 0.8s ease-in-out infinite';
            if (isMythic) return 'rarityAuraAqua 1s ease-in-out infinite';
            if (isSpecial) return 'rarityAuraPurple 1.2s ease-in-out infinite';
            if (isRare) return 'rarityAuraRed 1.2s ease-in-out infinite';
            if (isEvent) return 'rarityAuraGold 1s ease-in-out infinite';
            if (isRecursion) return 'rarityAuraGreen 0.8s ease-in-out infinite';
            return 'none';
        };

        return (
            <div style={{
                position: 'relative',
            }}>
                {/* Rarity aura glow behind item during spin */}
                {showRarityAura && (
                    <div style={{
                        position: 'absolute',
                        top: '-4px',
                        left: '-4px',
                        right: '-4px',
                        bottom: '-4px',
                        borderRadius: '10px',
                        animation: getRarityAura(),
                        pointerEvents: 'none',
                        zIndex: 0,
                    }} />
                )}
                <div style={{
                    position: 'relative',
                    zIndex: 1,
                    width: `${size}px`, height: `${size}px`,
                    background: isRecursion
                        ? `linear-gradient(135deg, ${COLORS.recursion}55, ${COLORS.recursionDark}55, ${COLORS.recursion}55)`
                        : isEvent
                            ? `linear-gradient(135deg, ${COLORS.red}33, ${COLORS.orange}33, ${COLORS.gold}33, ${COLORS.green}33, ${COLORS.aqua}33, ${COLORS.purple}33)`
                            : isInsane
                                ? `linear-gradient(135deg, ${COLORS.insane}55, #FFF5B0 44, ${COLORS.insane}55)`
                                : isMythic
                                    ? `linear-gradient(135deg, ${COLORS.aqua}44, ${COLORS.purple}44, ${COLORS.gold}44)`
                                    : isSpecial
                                        ? `linear-gradient(135deg, ${COLORS.purple}44, ${COLORS.gold}44)`
                                        : isRare
                                            ? `linear-gradient(135deg, ${COLORS.red}44, ${COLORS.orange}44)`
                                            : (isSpinning && spinIsRecursion)
                                                ? `${COLORS.recursionDark}`
                                                : COLORS.bgLight,
                    borderRadius: '6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${
                        isRecursion ? COLORS.recursion
                            : isEvent ? COLORS.gold
                                : isWinning ? (state === 'luckyResult' || state === 'tripleLuckyResult' ? COLORS.green : COLORS.gold)
                                    : isInsane ? COLORS.insane
                                        : isMythic ? COLORS.aqua
                                            : isSpecial ? COLORS.purple
                                                : isRare ? COLORS.red
                                                    : (isSpinning && spinIsRecursion) ? `${COLORS.recursion}44`
                                                        : COLORS.border
                    }`,
                    // Simplify box shadows on mobile during spinning for better performance
                    boxShadow: (isMobile && isSpinning && !isWinning) ? 'none' : (shouldAnimate ? (
                        isRecursion
                            ? `0 0 20px ${COLORS.recursion}cc, 0 0 40px ${COLORS.recursion}66, 0 0 60px ${COLORS.recursionDark}44`
                            : isEvent
                                ? `0 0 15px ${COLORS.gold}88, 0 0 30px ${COLORS.purple}44`
                                : isInsane
                                    ? `0 0 25px ${COLORS.insane}cc, 0 0 50px ${COLORS.insane}66, 0 0 75px #FFF5B044`
                                    : isMythic
                                        ? `0 0 20px ${COLORS.aqua}aa, 0 0 40px ${COLORS.purple}44`
                                        : isSpecial
                                            ? `0 0 15px ${COLORS.purple}88, 0 0 30px ${COLORS.purple}44`
                                            : isRare
                                                ? `0 0 12px ${COLORS.red}88, 0 0 24px ${COLORS.red}44`
                                                : isWinning
                                                    ? (state === 'luckyResult' || state === 'tripleLuckyResult'
                                                        ? `0 0 20px ${COLORS.green}66`
                                                        : `0 0 20px ${COLORS.gold}66`)
                                                    : 'none'
                    ) : 'none'),
                    // Disable glow animations on mobile during spinning for performance
                    animation: (isMobile && isSpinning) ? 'none' : (shouldAnimate ? (
                        isRecursion ? 'recursionGlow 0.5s ease-in-out infinite'
                            : isEvent ? 'eventGlow 1.5s ease-in-out infinite'
                                : isInsane ? 'insaneGlow 0.8s ease-in-out infinite'
                                    : isMythic ? 'mythicGlow 1s ease-in-out infinite'
                                        : isSpecial ? 'specialGlow 1.5s ease-in-out infinite'
                                            : isRare ? 'rareGlow 1.5s ease-in-out infinite'
                                                : 'none'
                    ) : 'none')
                }}>
                    <img
                        src={getItemImageUrl(item)}
                        alt={item.name}
                        loading="lazy"
                        style={{
                            width: isEvent ? `${size * 1.1}px` : isRecursion ? `${size * 0.9}px` : `${size * 0.77}px`,
                            height: isEvent ? `${size * 1.1}px` : isRecursion ? `${size * 0.9}px` : `${size * 0.77}px`,
                            imageRendering: (isInsane || isSpecial || isRare || item.username || isEvent || isRecursion) ? 'auto' : 'pixelated',
                            borderRadius: (isInsane || isSpecial || isRare || item.username) ? '4px' : '0',
                            filter: isRecursion ? `drop-shadow(0 0 10px ${COLORS.recursion})` : 'none',
                        }}
                        onError={(e) => { e.target.onerror = null; e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }}
                    />
                </div>
            </div>
        );
    };

    // Compute recursion effects flag - must be before any early returns
    const showSpinRecursionEffects = state === 'spinning' ? currentSpinIsRecursionRef.current : (recursionActive && recursionSpinsRemaining > 0);


    // Idle state - show clickable wheel with enhanced cosmic visuals
    if (state === 'idle') {
        return (
            <div style={{ position: 'relative' }}>
                <EnhancedWheelIdleState
                    user={user}
                    allItems={allItems}
                    totalItemCount={totalItemCount}
                    recursionActive={recursionActive}
                    recursionSpinsRemaining={recursionSpinsRemaining}
                    error={error}
                    onSpin={spin}
                    onShowOddsInfo={() => setShowOddsInfo(true)}
                    isMobile={isMobile}
                    isLoading={!imagesPreloaded}
                    loadingProgress={preloadProgress}
                />

                {/* Odds Info Modal */}
                {showOddsInfo && (
                    <OddsInfoModal
                        onClose={() => setShowOddsInfo(false)}
                        dynamicItems={dynamicItems}
                        allItems={allItems}
                        isMobile={isMobile}
                    />
                )}
            </div>
        );
    }

    return (
        <div style={{
            width: '100%',
            boxSizing: 'border-box',
            minHeight: isMobile ? '320px' : '440px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: isMobile ? '8px 12px' : '16px 20px',
            position: 'relative',
        }}>
            {/* Odds Info Modal */}
            {showOddsInfo && (
                <OddsInfoModal
                    onClose={() => setShowOddsInfo(false)}
                    dynamicItems={dynamicItems}
                    allItems={allItems}
                    isMobile={isMobile}
                />
            )}

            {/* Unified Card Container - holds header, strip, and result */}
            {state !== 'event' && state !== 'bonusWheel' && state !== 'bonusResult' && state !== 'luckySpinning' && state !== 'luckyResult' && state !== 'tripleSpinning' && state !== 'tripleResult' && state !== 'tripleLuckySpinning' && state !== 'tripleLuckyResult' && (
                <div style={{
                    width: '100%',
                    maxWidth: isMobile ? `${MOBILE_CARD_WIDTH}px` : '100%',
                    position: 'relative',
                }}>
                    {/* Outer glow ring - animated - ENHANCED for recursion */}
                    <div style={{
                        position: 'absolute',
                        inset: showSpinRecursionEffects && state === 'spinning' ? '-4px' : '-2px',
                        borderRadius: '22px',
                        backgroundImage: showSpinRecursionEffects
                            ? `linear-gradient(135deg, ${COLORS.recursion}70 0%, ${COLORS.recursionDark}40 25%, transparent 40%, transparent 60%, ${COLORS.recursionDark}40 75%, ${COLORS.recursion}70 100%)`
                            : state === 'spinning'
                                ? `linear-gradient(135deg, ${COLORS.gold}40 0%, transparent 40%, transparent 60%, ${COLORS.gold}40 100%)`
                                : `linear-gradient(135deg, ${COLORS.gold}25 0%, transparent 40%, transparent 60%, ${COLORS.gold}25 100%)`,
                        backgroundSize: '200% 200%',
                        animation: showSpinRecursionEffects && state === 'spinning'
                            ? 'borderGlowSpin 1.5s linear infinite'
                            : state === 'spinning'
                                ? 'borderGlowSpin 3s linear infinite'
                                : 'borderGlowIdle 8s ease-in-out infinite',
                        opacity: state === 'spinning' ? 1 : 0.8,
                        zIndex: 0,
                        transition: 'inset 0.3s ease',
                    }} />

                    {/* Additional pulsing glow for recursion */}
                    {showSpinRecursionEffects && state === 'spinning' && (
                        <div style={{
                            position: 'absolute',
                            inset: '-8px',
                            borderRadius: '26px',
                            boxShadow: `0 0 40px ${COLORS.recursion}44, 0 0 80px ${COLORS.recursion}22`,
                            animation: 'recursionSpinPulse 1s ease-in-out infinite',
                            zIndex: -1,
                            pointerEvents: 'none',
                        }} />
                    )}

                    {/* Main card */}
                    <div style={{
                        position: 'relative',
                        background: showSpinRecursionEffects
                            ? `linear-gradient(180deg, rgba(10,25,10,0.95) 0%, rgba(5,18,5,0.98) 100%)`
                            : `linear-gradient(180deg, rgba(28,28,32,0.92) 0%, rgba(22,22,26,0.95) 100%)`,
                        borderRadius: '20px',
                        border: showSpinRecursionEffects
                            ? `2px solid ${COLORS.recursion}50`
                            : `1px solid rgba(255,255,255,0.1)`,
                        boxShadow: showSpinRecursionEffects
                            ? `0 8px 40px rgba(0,0,0,0.6), 0 0 100px ${COLORS.recursion}20, inset 0 0 60px ${COLORS.recursion}08, inset 0 1px 0 ${COLORS.recursion}40`
                            : `0 8px 40px rgba(0,0,0,0.5), 0 0 60px ${COLORS.gold}08, inset 0 1px 0 rgba(255,255,255,0.08)`,
                        overflow: 'hidden',
                        zIndex: 1,
                        animation: showSpinRecursionEffects && state === 'spinning' ? 'matrixFlicker 0.5s infinite' : 'none',
                    }}>
                        {/* Matrix scanlines overlay for recursion */}
                        {showSpinRecursionEffects && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px)',
                                pointerEvents: 'none',
                                zIndex: 20,
                            }} />
                        )}

                        {/* Data stream effect for recursion spinning */}
                        {showSpinRecursionEffects && state === 'spinning' && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundImage: `linear-gradient(180deg, ${COLORS.recursion}08 0%, transparent 20%, transparent 80%, ${COLORS.recursion}08 100%)`,
                                backgroundSize: '100% 200%',
                                animation: 'binaryStream 1s linear infinite',
                                pointerEvents: 'none',
                                zIndex: 19,
                            }} />
                        )}

                        {/* Shimmer sweep effect - only on spin */}
                        {state === 'spinning' && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: '-100%',
                                width: '50%',
                                height: '100%',
                                backgroundImage: `linear-gradient(90deg, transparent, ${showSpinRecursionEffects ? COLORS.recursion : COLORS.gold}15, transparent)`,
                                transform: 'skewX(-20deg)',
                                animation: 'cardShimmerOnce 0.8s ease-out forwards',
                                pointerEvents: 'none',
                                zIndex: 10,
                            }} />
                        )}

                        {/* Top edge highlight */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: '5%',
                            right: '5%',
                            height: '1px',
                            background: showSpinRecursionEffects
                                ? `linear-gradient(90deg, transparent, ${COLORS.recursion}60 50%, transparent)`
                                : `linear-gradient(90deg, transparent, ${COLORS.gold}40 50%, transparent)`,
                            zIndex: 5,
                        }} />

                        {/* Corner accents */}
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            width: '20px',
                            height: '20px',
                            borderTop: `2px solid ${showSpinRecursionEffects ? COLORS.recursion : COLORS.gold}60`,
                            borderLeft: `2px solid ${showSpinRecursionEffects ? COLORS.recursion : COLORS.gold}60`,
                            borderRadius: '6px 0 0 0',
                            zIndex: 5,
                        }} />
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            width: '20px',
                            height: '20px',
                            borderTop: `2px solid ${showSpinRecursionEffects ? COLORS.recursion : COLORS.gold}60`,
                            borderRight: `2px solid ${showSpinRecursionEffects ? COLORS.recursion : COLORS.gold}60`,
                            borderRadius: '0 6px 0 0',
                            zIndex: 5,
                        }} />
                        <div style={{
                            position: 'absolute',
                            bottom: '10px',
                            left: '10px',
                            width: '20px',
                            height: '20px',
                            borderBottom: `2px solid ${showSpinRecursionEffects ? COLORS.recursion : COLORS.gold}60`,
                            borderLeft: `2px solid ${showSpinRecursionEffects ? COLORS.recursion : COLORS.gold}60`,
                            borderRadius: '0 0 0 6px',
                            zIndex: 5,
                        }} />
                        <div style={{
                            position: 'absolute',
                            bottom: '10px',
                            right: '10px',
                            width: '20px',
                            height: '20px',
                            borderBottom: `2px solid ${showSpinRecursionEffects ? COLORS.recursion : COLORS.gold}60`,
                            borderRight: `2px solid ${showSpinRecursionEffects ? COLORS.recursion : COLORS.gold}60`,
                            borderRadius: '0 0 6px 0',
                            zIndex: 5,
                        }} />

                        {/* Ambient glow from top - only during spinning */}
                        {state === 'spinning' && (
                            <div style={{
                                position: 'absolute',
                                top: '-30%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '80%',
                                height: '150px',
                                background: showSpinRecursionEffects
                                    ? `radial-gradient(ellipse, ${COLORS.recursion}28 0%, transparent 70%)`
                                    : `radial-gradient(ellipse, ${COLORS.gold}25 0%, transparent 70%)`,
                                pointerEvents: 'none',
                                animation: 'glowPulse 1.5s ease-in-out infinite',
                            }} />
                        )}

                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 20px',
                            borderBottom: showSpinRecursionEffects
                                ? `1px solid ${COLORS.recursion}30`
                                : '1px solid rgba(255,255,255,0.08)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <img
                                    src={WHEEL_TEXTURE_URL}
                                    alt="Wheel"
                                    style={{
                                        width: '32px', height: 'auto', imageRendering: 'pixelated',
                                        animation: (state === 'spinning' || state === 'tripleSpinning' || state === 'tripleLuckySpinning') ? 'wheelSpin 0.5s linear infinite' : 'none',
                                        filter: showSpinRecursionEffects ? `drop-shadow(0 0 8px ${COLORS.recursion})` : 'none',
                                    }}
                                />
                                <span style={{
                                    color: state === 'recursion' ? COLORS.recursion : state === 'event' || state === 'bonusWheel' || state === 'bonusResult' ? COLORS.orange : (state === 'luckySpinning' || state === 'luckyResult' || state === 'tripleLuckySpinning' || state === 'tripleLuckyResult') ? COLORS.green : showSpinRecursionEffects ? COLORS.recursion : COLORS.gold,
                                    fontSize: '18px',
                                    fontWeight: '600',
                                    textShadow: showSpinRecursionEffects ? `0 0 10px ${COLORS.recursion}` : 'none',
                                }}>
                                {state === 'spinning' ? (showSpinRecursionEffects ? 'Lucky Spinning...' : 'Spinning...') :
                                    state === 'recursion' ? 'RECURSION!' :
                                        state === 'event' ? 'BONUS EVENT!' :
                                            state === 'bonusWheel' ? 'Spinning Bonus Wheel...' :
                                                state === 'bonusResult' ? 'Event Selected!' :
                                                    state === 'tripleSpinning' ? '5x Spinning...' :
                                                        state === 'tripleResult' ? '5x Win!' :
                                                            state === 'luckySpinning' ? 'Lucky Spinning...' :
                                                                state === 'luckyResult' ? 'Lucky Win!' :
                                                                    state === 'tripleLuckySpinning' ? 'Triple Lucky Spinning...' :
                                                                        state === 'tripleLuckyResult' ? 'Triple Lucky Win!' :
                                                                            'Gamba!'}
                            </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {/* Info button */}
                                <button
                                    onClick={() => setShowOddsInfo(true)}
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        background: 'transparent',
                                        border: `1px solid ${COLORS.border}`,
                                        color: COLORS.textMuted,
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.aqua; e.currentTarget.style.color = COLORS.aqua; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}
                                    title="How drop rates work"
                                >
                                    ?
                                </button>

                                {(state === 'result' || state === 'tripleResult' || state === 'luckyResult' || state === 'tripleLuckyResult' || state === 'recursion') && (
                                    <button onClick={respin} style={{
                                        padding: '8px 16px', background: 'transparent',
                                        border: `1px solid ${COLORS.border}`, borderRadius: '6px',
                                        color: COLORS.textMuted, fontSize: '13px', cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.gold; e.currentTarget.style.color = COLORS.text; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}
                                    >Try Again</button>
                                )}
                            </div>
                        </div>

                        {/* Strip Container */}
                        <div style={{ padding: isMobile ? '12px' : '20px' }}>
                            <div
                                onClick={() => {
                                    if (!isMobile || !user || allItems.length === 0) return;
                                    if (state === 'result' || state === 'recursion' || state === 'luckyResult' || state === 'tripleResult' || state === 'tripleLuckyResult') {
                                        respinRef.current?.();
                                    } else if (state === 'idle') {
                                        spinRef.current?.();
                                    }
                                }}
                                style={{
                                    position: 'relative',
                                    height: isMobile ? `${MOBILE_STRIP_HEIGHT}px` : '100px',
                                    width: isMobile ? `${MOBILE_STRIP_WIDTH}px` : '100%',
                                    overflow: 'hidden',
                                    borderRadius: '10px',
                                    background: showSpinRecursionEffects
                                        ? `linear-gradient(${isMobile ? '0deg' : '90deg'}, #0a150a 0%, #0f1a0f 50%, #0a150a 100%)`
                                        : `linear-gradient(${isMobile ? '0deg' : '90deg'}, #14141a 0%, #1a1a22 50%, #14141a 100%)`,
                                    border: showSpinRecursionEffects
                                        ? `1px solid ${COLORS.recursion}40`
                                        : state === 'result'
                                            ? `1px solid ${COLORS.gold}30`
                                            : '1px solid rgba(255,255,255,0.06)',
                                    margin: isMobile ? '0 auto' : '0',
                                    boxShadow: showSpinRecursionEffects
                                        ? `inset 0 0 40px ${COLORS.recursion}15, inset 0 2px 8px rgba(0,0,0,0.4)`
                                        : state === 'spinning'
                                            ? `inset 0 0 30px rgba(0,0,0,0.4), inset 0 0 50px ${COLORS.gold}06`
                                            : `inset 0 0 25px rgba(0,0,0,0.3)`,
                                    cursor: isMobile && (state === 'idle' || state === 'result' || state === 'recursion') ? 'pointer' : 'default',
                                }}>

                                {/* Recursion scanlines overlay */}
                                {showSpinRecursionEffects && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0, left: 0, right: 0, bottom: 0,
                                        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.05) 2px, rgba(0,255,0,0.05) 4px)',
                                        zIndex: 6,
                                        pointerEvents: 'none',
                                        animation: 'matrixFlicker 0.1s infinite',
                                    }} />
                                )}

                                {/* Center Indicator Line - Enhanced with pulse */}
                                <div style={{
                                    position: 'absolute',
                                    ...(isMobile ? {
                                        left: 0, right: 0, top: '50%', transform: 'translateY(-50%)',
                                        height: '3px'
                                    } : {
                                        top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)',
                                        width: '3px'
                                    }),
                                    backgroundImage: `linear-gradient(${isMobile ? '90deg' : '180deg'}, transparent, ${showSpinRecursionEffects ? COLORS.recursion : COLORS.gold}, transparent)`,
                                    zIndex: 10,
                                    boxShadow: showSpinRecursionEffects
                                        ? `0 0 12px ${COLORS.recursion}, 0 0 24px ${COLORS.recursion}88`
                                        : `0 0 12px ${COLORS.gold}, 0 0 24px ${COLORS.gold}88`,
                                    animation: state === 'spinning' && spinProgress > 0.7 ? 'centerLinePulse 0.3s ease-in-out infinite' : 'none',
                                    transition: 'all 0.3s ease-out',
                                }} />

                                {/* Pointer - Enhanced with heartbeat during slowdown */}
                                {showSpinRecursionEffects ? (
                                    <>
                                        {/* Top Bracket for recursion */}
                                        <div style={{
                                            position: 'absolute',
                                            ...(isMobile ? {
                                                left: '-6px', top: '50%', transform: 'translateY(-50%)',
                                            } : {
                                                top: '-6px', left: '50%', transform: 'translateX(-50%)',
                                            }),
                                            zIndex: 11,
                                            filter: `drop-shadow(0 0 8px ${COLORS.recursion}) drop-shadow(0 0 16px ${COLORS.recursion}88)`,
                                            animation: state === 'spinning' && spinProgress > 0.7
                                                ? (isMobile ? 'indicatorHeartbeatMobile 0.4s ease-in-out infinite' : 'indicatorHeartbeat 0.4s ease-in-out infinite')
                                                : 'none',
                                        }}>
                                            <div style={{
                                                ...(isMobile ? {
                                                    width: '10px',
                                                    height: '24px',
                                                    borderTop: `3px solid ${COLORS.recursion}`,
                                                    borderBottom: `3px solid ${COLORS.recursion}`,
                                                    borderLeft: `3px solid ${COLORS.recursion}`,
                                                    borderRight: 'none',
                                                    borderRadius: '4px 0 0 4px',
                                                } : {
                                                    width: '24px',
                                                    height: '10px',
                                                    borderLeft: `3px solid ${COLORS.recursion}`,
                                                    borderRight: `3px solid ${COLORS.recursion}`,
                                                    borderTop: `3px solid ${COLORS.recursion}`,
                                                    borderBottom: 'none',
                                                    borderRadius: '4px 4px 0 0',
                                                }),
                                                background: `${COLORS.recursion}11`,
                                            }} />
                                        </div>
                                        {/* Bottom Bracket for recursion */}
                                        <div style={{
                                            position: 'absolute',
                                            ...(isMobile ? {
                                                right: '-6px', top: '50%', transform: 'translateY(-50%)',
                                            } : {
                                                bottom: '-6px', left: '50%', transform: 'translateX(-50%)',
                                            }),
                                            zIndex: 11,
                                            filter: `drop-shadow(0 0 8px ${COLORS.recursion}) drop-shadow(0 0 16px ${COLORS.recursion}88)`,
                                            animation: state === 'spinning' && spinProgress > 0.7
                                                ? (isMobile ? 'indicatorHeartbeatMobile 0.4s ease-in-out infinite' : 'indicatorHeartbeat 0.4s ease-in-out infinite')
                                                : 'none',
                                        }}>
                                            <div style={{
                                                ...(isMobile ? {
                                                    width: '10px',
                                                    height: '24px',
                                                    borderTop: `3px solid ${COLORS.recursion}`,
                                                    borderBottom: `3px solid ${COLORS.recursion}`,
                                                    borderRight: `3px solid ${COLORS.recursion}`,
                                                    borderLeft: 'none',
                                                    borderRadius: '0 4px 4px 0',
                                                } : {
                                                    width: '24px',
                                                    height: '10px',
                                                    borderLeft: `3px solid ${COLORS.recursion}`,
                                                    borderRight: `3px solid ${COLORS.recursion}`,
                                                    borderBottom: `3px solid ${COLORS.recursion}`,
                                                    borderTop: 'none',
                                                    borderRadius: '0 0 4px 4px',
                                                }),
                                                background: `${COLORS.recursion}11`,
                                            }} />
                                        </div>
                                    </>
                                ) : (
                                    /* Normal triangle pointers for regular spins - with heartbeat */
                                    <>
                                        <div style={{
                                            position: 'absolute',
                                            ...(isMobile ? {
                                                left: '-3px', top: '50%', transform: 'translateY(-50%)',
                                                borderTop: '10px solid transparent', borderBottom: '10px solid transparent',
                                                borderLeft: `14px solid ${COLORS.gold}`
                                            } : {
                                                top: '-3px', left: '50%', transform: 'translateX(-50%)',
                                                borderLeft: '10px solid transparent', borderRight: '10px solid transparent',
                                                borderTop: `14px solid ${COLORS.gold}`
                                            }),
                                            width: 0, height: 0,
                                            zIndex: 11,
                                            filter: `drop-shadow(0 0 6px ${COLORS.gold}) drop-shadow(0 0 12px ${COLORS.gold}66)`,
                                            animation: state === 'spinning' && spinProgress > 0.7
                                                ? (isMobile ? 'indicatorHeartbeatMobile 0.4s ease-in-out infinite' : 'indicatorHeartbeat 0.4s ease-in-out infinite')
                                                : 'none',
                                        }} />
                                        <div style={{
                                            position: 'absolute',
                                            ...(isMobile ? {
                                                right: '-3px', top: '50%', transform: 'translateY(-50%)',
                                                borderTop: '10px solid transparent', borderBottom: '10px solid transparent',
                                                borderRight: `14px solid ${COLORS.gold}`
                                            } : {
                                                bottom: '-3px', left: '50%', transform: 'translateX(-50%)',
                                                borderLeft: '10px solid transparent', borderRight: '10px solid transparent',
                                                borderBottom: `14px solid ${COLORS.gold}`
                                            }),
                                            width: 0, height: 0,
                                            zIndex: 11,
                                            filter: `drop-shadow(0 0 6px ${COLORS.gold}) drop-shadow(0 0 12px ${COLORS.gold}66)`,
                                            animation: state === 'spinning' && spinProgress > 0.7
                                                ? (isMobile ? 'indicatorHeartbeatMobile 0.4s ease-in-out infinite' : 'indicatorHeartbeat 0.4s ease-in-out infinite')
                                                : 'none',
                                        }} />
                                    </>
                                )}

                                {/* Edge fade gradients - Enhanced */}
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                    background: isMobile
                                        ? `linear-gradient(180deg, ${showSpinRecursionEffects ? COLORS.recursionDark : COLORS.bg} 0%, ${showSpinRecursionEffects ? COLORS.recursionDark : COLORS.bg}dd 5%, transparent 18%, transparent 82%, ${showSpinRecursionEffects ? COLORS.recursionDark : COLORS.bg}dd 95%, ${showSpinRecursionEffects ? COLORS.recursionDark : COLORS.bg} 100%)`
                                        : `linear-gradient(90deg, ${showSpinRecursionEffects ? COLORS.recursionDark : COLORS.bg} 0%, ${showSpinRecursionEffects ? COLORS.recursionDark : COLORS.bg}dd 5%, transparent 15%, transparent 85%, ${showSpinRecursionEffects ? COLORS.recursionDark : COLORS.bg}dd 95%, ${showSpinRecursionEffects ? COLORS.recursionDark : COLORS.bg} 100%)`,
                                    zIndex: 5, pointerEvents: 'none'
                                }} />

                                {/* Vignette overlay */}
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.3) 100%)',
                                    zIndex: 4, pointerEvents: 'none',
                                    opacity: state === 'spinning' ? 0.5 : 0.3,
                                    transition: 'opacity 0.3s ease-out',
                                }} />

                                {/* Result Shockwave Effect */}
                                {state === 'result' && (
                                    <>
                                        <div style={{
                                            position: 'absolute',
                                            top: '50%', left: '50%',
                                            width: isMobile ? '100px' : '60px',
                                            height: isMobile ? '100px' : '60px',
                                            border: `2px solid ${showSpinRecursionEffects ? COLORS.recursion : COLORS.gold}`,
                                            borderRadius: '50%',
                                            animation: 'resultShockwaveRing 0.6s ease-out forwards',
                                            pointerEvents: 'none',
                                            zIndex: 8,
                                        }} />
                                        <div style={{
                                            position: 'absolute',
                                            top: '50%', left: '50%',
                                            width: isMobile ? '100px' : '60px',
                                            height: isMobile ? '100px' : '60px',
                                            border: `2px solid ${showSpinRecursionEffects ? COLORS.recursion : COLORS.gold}66`,
                                            borderRadius: '50%',
                                            animation: 'resultShockwaveRing 0.6s ease-out 0.1s forwards',
                                            pointerEvents: 'none',
                                            zIndex: 8,
                                        }} />
                                    </>
                                )}

                                {/* Item Strip */}
                                <CanvasSpinningStrip
                                    items={strip}
                                    offsetRef={canvasOffsetRef}
                                    isMobile={isMobile}
                                    isSpinning={state === 'spinning'}
                                    isResult={state === 'result' || state === 'event'}
                                    spinProgress={spinProgress}
                                    isRecursion={showSpinRecursionEffects}
                                    stripWidth={isMobile ? MOBILE_STRIP_WIDTH : undefined}
                                    stripHeight={isMobile ? MOBILE_STRIP_HEIGHT : 100}
                                    finalIndex={FINAL_INDEX}
                                />
                            </div>
                        </div>

                        {/* Result Display - Inside unified container */}
                        {state === 'result' && result && (
                            <div style={{
                                padding: isMobile ? '16px 12px' : '24px 20px',
                                borderTop: resultWasRecursionSpin
                                    ? `2px solid ${COLORS.recursion}50`
                                    : `1px solid rgba(255,255,255,0.08)`,
                                background: resultWasRecursionSpin
                                    ? `radial-gradient(ellipse at 50% 0%, ${COLORS.recursion}22 0%, transparent 50%), linear-gradient(180deg, rgba(0,20,0,0.3) 0%, transparent 100%)`
                                    : isInsaneItem(result)
                                        ? `radial-gradient(ellipse at 50% 0%, ${COLORS.insane}20 0%, transparent 60%)`
                                        : isMythicItem(result)
                                            ? `radial-gradient(ellipse at 50% 0%, ${COLORS.aqua}15 0%, transparent 60%)`
                                            : isSpecialItem(result)
                                                ? `radial-gradient(ellipse at 50% 0%, ${COLORS.purple}18 0%, transparent 60%)`
                                                : isRareItem(result)
                                                    ? `radial-gradient(ellipse at 50% 0%, ${COLORS.red}15 0%, transparent 60%)`
                                                    : `radial-gradient(ellipse at 50% 0%, ${COLORS.gold}10 0%, transparent 60%)`,
                                textAlign: 'center',
                                position: 'relative',
                                overflow: 'hidden',
                                animation: resultWasRecursionSpin
                                    ? 'recursionReveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                    : 'resultContainerSmooth 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                            }}>

                                {/* Animated background aurora - subtle moving gradient */}
                                <div style={{
                                    position: 'absolute',
                                    inset: 0,
                                    backgroundImage: resultWasRecursionSpin
                                        ? `linear-gradient(135deg, ${COLORS.recursion}0c 0%, transparent 30%, ${COLORS.recursion}08 50%, transparent 70%, ${COLORS.recursion}06 100%)`
                                        : isInsaneItem(result)
                                            ? `linear-gradient(135deg, ${COLORS.insane}0a 0%, transparent 30%, #FFF5B008 50%, transparent 70%, ${COLORS.insane}06 100%)`
                                            : isMythicItem(result)
                                                ? `linear-gradient(135deg, ${COLORS.aqua}08 0%, transparent 40%, ${COLORS.purple}06 60%, transparent 100%)`
                                                : isSpecialItem(result)
                                                    ? `linear-gradient(135deg, ${COLORS.purple}08 0%, transparent 50%, ${COLORS.gold}05 100%)`
                                                    : isRareItem(result)
                                                        ? `linear-gradient(135deg, ${COLORS.red}08 0%, transparent 50%, ${COLORS.orange}05 100%)`
                                                        : `linear-gradient(135deg, ${COLORS.gold}05 0%, transparent 50%, ${COLORS.gold}03 100%)`,
                                    backgroundSize: '200% 200%',
                                    animation: resultWasRecursionSpin ? 'matrixResultContainer 3s ease-in-out infinite' : (isInsaneItem(result) || isMythicItem(result)) ? 'auroraShift 4s ease-in-out infinite' : 'none',
                                    pointerEvents: 'none',
                                    zIndex: 0,
                                }} />

                                {/* Recursion scanlines overlay - enhanced */}
                                {resultWasRecursionSpin && (
                                    <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.04) 2px, rgba(0,255,0,0.04) 4px)',
                                        pointerEvents: 'none',
                                        zIndex: 1,
                                    }} />
                                )}

                                {/* Matrix hex code decoration for recursion */}
                                {resultWasRecursionSpin && (
                                    <>
                                        <div style={{
                                            position: 'absolute',
                                            top: '8px',
                                            left: '8px',
                                            fontFamily: 'monospace',
                                            fontSize: '9px',
                                            color: COLORS.recursion,
                                            opacity: 0.4,
                                            animation: 'hexFloat 3s ease-in-out infinite',
                                        }}>
                                            0x{Math.random().toString(16).substr(2, 4).toUpperCase()}
                                        </div>
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '8px',
                                            left: '8px',
                                            fontFamily: 'monospace',
                                            fontSize: '9px',
                                            color: COLORS.recursion,
                                            opacity: 0.4,
                                            animation: 'hexFloat 3s ease-in-out infinite 1s',
                                        }}>
                                            0x{Math.random().toString(16).substr(2, 4).toUpperCase()}
                                        </div>
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '8px',
                                            right: '8px',
                                            fontFamily: 'monospace',
                                            fontSize: '9px',
                                            color: COLORS.recursion,
                                            opacity: 0.4,
                                            animation: 'hexFloat 3s ease-in-out infinite 2s',
                                        }}>
                                            0x{Math.random().toString(16).substr(2, 4).toUpperCase()}
                                        </div>
                                    </>
                                )}

                                {/* Recursion Lucky Spin badge - enhanced */}
                                {resultWasRecursionSpin && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        right: '10px',
                                        backgroundImage: `linear-gradient(135deg, ${COLORS.recursion} 0%, ${COLORS.recursionDark} 100%)`,
                                        color: '#000',
                                        fontSize: '11px',
                                        fontWeight: '900',
                                        padding: '5px 12px',
                                        borderRadius: '4px',
                                        fontFamily: 'monospace',
                                        boxShadow: `0 0 15px ${COLORS.recursion}88, 0 2px 8px rgba(0,0,0,0.3)`,
                                        zIndex: 10,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        animation: 'textFadeUp 0.4s ease-out 0.3s both',
                                        letterSpacing: '1px',
                                    }}>
                                        <Zap size={12} /> LUCKY SPIN
                                    </div>
                                )}

                                {/* Enhanced floating particles with drift */}
                                {[...Array(resultWasRecursionSpin ? 24 : isInsaneItem(result) ? 35 : isMythicItem(result) ? 25 : isSpecialItem(result) ? 18 : isRareItem(result) ? 15 : 10)].map((_, i) => {
                                    const driftX = (Math.random() - 0.5) * 30;
                                    const driftX2 = (Math.random() - 0.5) * 40;
                                    const size = resultWasRecursionSpin ? (4 + Math.random() * 5) : isInsaneItem(result) ? (6 + Math.random() * 6) : isMythicItem(result) ? (5 + Math.random() * 5) : (4 + Math.random() * 4);
                                    return (
                                        <div key={i} style={{
                                            position: 'absolute',
                                            width: `${size}px`,
                                            height: `${size}px`,
                                            background: resultWasRecursionSpin
                                                ? COLORS.recursion
                                                : isInsaneItem(result)
                                                    ? (i % 4 === 0 ? COLORS.insane : i % 4 === 1 ? '#FFF5B0' : i % 4 === 2 ? '#FFEC8B' : '#FFE135')
                                                    : isMythicItem(result)
                                                        ? (i % 3 === 0 ? COLORS.aqua : i % 3 === 1 ? COLORS.purple : COLORS.gold)
                                                        : isSpecialItem(result) ? (i % 2 === 0 ? COLORS.purple : COLORS.gold)
                                                            : isRareItem(result) ? (i % 2 === 0 ? COLORS.red : COLORS.orange)
                                                                : COLORS.gold,
                                            borderRadius: '50%',
                                            left: `${5 + Math.random() * 90}%`,
                                            bottom: '10%',
                                            opacity: 0,
                                            '--drift-x': `${driftX}px`,
                                            '--drift-x2': `${driftX2}px`,
                                            animation: `floatParticleDrift ${isInsaneItem(result) ? '1.8s' : isMythicItem(result) ? '2.2s' : '2.8s'} ease-out ${i * 0.12}s infinite`,
                                            boxShadow: `0 0 ${size}px ${
                                                isInsaneItem(result) ? COLORS.insane
                                                    : isMythicItem(result) ? COLORS.aqua
                                                        : isSpecialItem(result) ? COLORS.purple
                                                            : isRareItem(result) ? COLORS.red
                                                                : COLORS.gold
                                            }`,
                                            zIndex: 1,
                                        }} />
                                    );
                                })}

                                {/* Extra shimmer overlay for insane */}
                                {isInsaneItem(result) && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 0, left: 0, right: 0, bottom: 0,
                                        backgroundImage: `linear-gradient(90deg, transparent 0%, ${COLORS.insane}15 50%, transparent 100%)`,
                                        backgroundSize: '200% 100%',
                                        animation: 'insaneShimmer 2s ease-in-out infinite',
                                        pointerEvents: 'none',
                                        zIndex: 1,
                                    }} />
                                )}

                                {/* Badge Header - staggered timing */}
                                <div style={{
                                    color: COLORS.textMuted, fontSize: isMobile ? '10px' : '11px', textTransform: 'uppercase',
                                    letterSpacing: isMobile ? '1px' : '3px', marginBottom: isMobile ? '12px' : '20px', position: 'relative', zIndex: 2,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? '6px' : '10px',
                                    flexWrap: 'wrap',
                                }}>
                        <span style={{ animation: 'textFadeUp 0.4s ease-out 0.1s both' }}>
                            {isInsaneItem(result) ? (
                                <span style={{
                                    backgroundImage: `linear-gradient(135deg, ${COLORS.insane}, #FFF5B0, ${COLORS.insane})`,
                                    backgroundSize: '200% 200%',
                                    color: '#1a1a1a', fontSize: '10px', fontWeight: '800', padding: '5px 14px',
                                    borderRadius: '4px', animation: 'textFadeUp 0.4s ease-out 0.1s both, mythicBadge 1.5s ease-in-out 0.5s infinite',
                                    textShadow: '0 0 10px rgba(255,255,255,0.5)',
                                    boxShadow: `0 0 20px ${COLORS.insane}88`,
                                    display: 'inline-flex', alignItems: 'center', gap: '6px'
                                }}><Crown size={12} /> INSANE <Crown size={12} /></span>
                            ) : isMythicItem(result) ? (
                                <span style={{
                                    backgroundImage: `linear-gradient(135deg, ${COLORS.aqua}, ${COLORS.purple}, ${COLORS.gold})`,
                                    backgroundSize: '200% 200%',
                                    color: '#fff', fontSize: '9px', fontWeight: '700', padding: '4px 12px',
                                    borderRadius: '4px', animation: 'textFadeUp 0.4s ease-out 0.1s both, mythicBadge 2s ease-in-out 0.5s infinite',
                                    textShadow: '0 0 10px rgba(0,0,0,0.5)'
                                }}>MYTHIC</span>
                            ) : isSpecialItem(result) ? (
                                <span style={{
                                    backgroundImage: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.gold})`,
                                    color: '#fff', fontSize: '9px', fontWeight: '700', padding: '3px 10px',
                                    borderRadius: '4px', animation: 'textFadeUp 0.4s ease-out 0.1s both'
                                }}>LEGENDARY</span>
                            ) : isRareItem(result) ? (
                                <span style={{
                                    backgroundImage: `linear-gradient(135deg, ${COLORS.red}, ${COLORS.orange})`,
                                    color: '#fff', fontSize: '9px', fontWeight: '700', padding: '3px 10px',
                                    borderRadius: '4px', animation: 'textFadeUp 0.4s ease-out 0.1s both'
                                }}>RARE</span>
                            ) : isNewItem ? (
                                <span style={{
                                    background: COLORS.green, color: COLORS.bg, fontSize: '9px', fontWeight: '700',
                                    padding: '3px 8px', borderRadius: '4px',
                                    animation: 'textFadeUp 0.4s ease-out 0.1s both'
                                }}>NEW</span>
                            ) : null}
                        </span>
                                    <span style={{ animation: 'textFadeUp 0.4s ease-out 0.2s both' }}>
                            You received
                        </span>
                                </div>

                                {/* Item Display */}
                                <div style={{
                                    display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                                    alignItems: 'center', justifyContent: 'center', gap: isMobile ? '10px' : '24px',
                                    position: 'relative', zIndex: 2
                                }}>
                                    {/* Item container with Canvas-based glow */}
                                    <div style={{
                                        position: 'relative',
                                        animation: 'itemBoxReveal 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.15s both',
                                        width: '80px',
                                        height: '80px',
                                    }}>
                                        <CanvasResultItem
                                            item={result}
                                            size={80}
                                            isRecursionSpin={resultWasRecursionSpin}
                                            showAnimation={true}
                                        />
                                    </div>

                                    {/* Name and drop rate - staggered fade */}
                                    <div style={{
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: isMobile ? 'center' : 'flex-start', gap: '4px',
                                        textAlign: isMobile ? 'center' : 'left',
                                        maxWidth: isMobile ? '100%' : 'auto',
                                    }}>
                            <span style={{
                                color: isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : COLORS.gold,
                                fontSize: isMobile ? '18px' : '24px', fontWeight: '600',
                                textShadow: `0 0 20px ${isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : COLORS.gold}44`,
                                animation: 'textFadeUp 0.4s ease-out 0.3s both',
                                wordBreak: 'break-word',
                            }}>
                                {result.name}
                            </span>

                                        {(isInsaneItem(result) || isMythicItem(result) || isSpecialItem(result) || isRareItem(result)) && result.chance ? (
                                            <span style={{
                                                fontSize: isMobile ? '12px' : '14px',
                                                color: isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : COLORS.red,
                                                fontWeight: '700',
                                                background: `${isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : COLORS.red}25`,
                                                padding: isMobile ? '3px 8px' : '4px 12px',
                                                borderRadius: '6px',
                                                marginTop: isMobile ? '4px' : '6px',
                                                textShadow: `0 0 10px ${isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : COLORS.red}88`,
                                                boxShadow: `0 0 15px ${isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : COLORS.red}33, inset 0 0 10px ${isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : COLORS.red}15`,
                                                border: `1px solid ${isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : COLORS.red}44`,
                                                animation: 'textFadeUp 0.4s ease-out 0.45s both',
                                            }}>
                                    {resultWasRecursionSpin && result.equalChance
                                        ? `${formatChance(result.equalChance)}% (equal chance)`
                                        : `${formatChance(result.chance)}% drop rate`
                                    }
                                </span>
                                        ) : resultWasRecursionSpin && result.equalChance ? (
                                            <span style={{
                                                fontSize: '11px',
                                                color: COLORS.recursion,
                                                fontWeight: '600',
                                                background: `${COLORS.recursion}22`,
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                marginTop: '4px',
                                                animation: 'textFadeUp 0.4s ease-out 0.45s both',
                                            }}>
                                    {formatChance(result.equalChance)}% (equal chance)
                                </span>
                                        ) : !isNewItem && collection[result.texture] > 1 && (
                                            <span style={{
                                                fontSize: '12px',
                                                color: COLORS.textMuted,
                                                fontWeight: '500',
                                                animation: 'textFadeUp 0.4s ease-out 0.45s both',
                                            }}>
                                    x{collection[result.texture]} in collection
                                </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* EVENT Display - Enhanced cosmic card announcement */}
            {state === 'event' && (
                <div style={{
                    width: '100%',
                    maxWidth: isMobile ? `${MOBILE_CARD_WIDTH}px` : '100%',
                    position: 'relative',
                }}>
                    {/* Outer glow ring - gold with pulse */}
                    <div style={{
                        position: 'absolute',
                        inset: '-3px',
                        borderRadius: '24px',
                        backgroundImage: `linear-gradient(135deg, ${COLORS.gold}70 0%, ${COLORS.orange}50 25%, transparent 40%, transparent 60%, ${COLORS.orange}50 75%, ${COLORS.gold}70 100%)`,
                        backgroundSize: '200% 200%',
                        animation: 'borderGlowSpin 2s linear infinite',
                        zIndex: 0,
                    }} />

                    {/* Main card */}
                    <div style={{
                        position: 'relative',
                        background: `linear-gradient(180deg, rgba(35,30,22,0.98) 0%, rgba(25,22,18,0.99) 100%)`,
                        borderRadius: '22px',
                        border: `1px solid ${COLORS.gold}50`,
                        boxShadow: `0 10px 50px rgba(0,0,0,0.6), 0 0 100px ${COLORS.gold}30, inset 0 1px 0 ${COLORS.gold}40`,
                        overflow: 'hidden',
                        zIndex: 1,
                    }}>
                        {/* Animated background shimmer */}
                        <div style={{
                            position: 'absolute',
                            top: 0, left: '-100%', right: '-100%', bottom: 0,
                            backgroundImage: `linear-gradient(90deg, transparent 0%, ${COLORS.gold}12 50%, transparent 100%)`,
                            animation: 'shimmerSlide 2s ease-in-out infinite',
                            zIndex: 0,
                            pointerEvents: 'none',
                        }} />

                        {/* Top edge highlight */}
                        <div style={{
                            position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px',
                            backgroundImage: `linear-gradient(90deg, transparent, ${COLORS.gold}70 50%, transparent)`,
                            zIndex: 5,
                        }} />

                        {/* Corner accents */}
                        <div style={{ position: 'absolute', top: '12px', left: '12px', width: '28px', height: '28px', borderTop: `2px solid ${COLORS.gold}80`, borderLeft: `2px solid ${COLORS.gold}80`, borderRadius: '8px 0 0 0', zIndex: 5 }} />
                        <div style={{ position: 'absolute', top: '12px', right: '12px', width: '28px', height: '28px', borderTop: `2px solid ${COLORS.gold}80`, borderRight: `2px solid ${COLORS.gold}80`, borderRadius: '0 8px 0 0', zIndex: 5 }} />
                        <div style={{ position: 'absolute', bottom: '12px', left: '12px', width: '28px', height: '28px', borderBottom: `2px solid ${COLORS.gold}80`, borderLeft: `2px solid ${COLORS.gold}80`, borderRadius: '0 0 0 8px', zIndex: 5 }} />
                        <div style={{ position: 'absolute', bottom: '12px', right: '12px', width: '28px', height: '28px', borderBottom: `2px solid ${COLORS.gold}80`, borderRight: `2px solid ${COLORS.gold}80`, borderRadius: '0 0 8px 0', zIndex: 5 }} />

                        {/* Content */}
                        <div style={{
                            position: 'relative',
                            zIndex: 1,
                            padding: isMobile ? '32px 24px' : '40px 32px',
                            textAlign: 'center',
                        }}>
                            {/* Gift icons with pulse */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '16px',
                                marginBottom: '16px',
                            }}>
                                <Gift size={isMobile ? 28 : 36} style={{
                                    color: COLORS.gold,
                                    filter: `drop-shadow(0 0 15px ${COLORS.gold})`,
                                    animation: 'pulse 1s ease-in-out infinite',
                                }} />
                                <div style={{
                                    fontSize: isMobile ? '28px' : '36px',
                                    fontWeight: '800',
                                    color: COLORS.gold,
                                    letterSpacing: '3px',
                                    textTransform: 'uppercase',
                                    textShadow: `0 0 30px ${COLORS.gold}, 0 0 60px ${COLORS.gold}88, 0 2px 4px rgba(0,0,0,0.5)`,
                                }}>
                                    BONUS EVENT!
                                </div>
                                <Gift size={isMobile ? 28 : 36} style={{
                                    color: COLORS.gold,
                                    filter: `drop-shadow(0 0 15px ${COLORS.gold})`,
                                    animation: 'pulse 1s ease-in-out infinite',
                                }} />
                            </div>

                            {/* Subtext with pulse */}
                            <div style={{
                                color: COLORS.textMuted,
                                fontSize: isMobile ? '14px' : '16px',
                                animation: 'pulse 1.5s ease-in-out infinite',
                            }}>
                                Spinning to determine your reward...
                            </div>

                            {/* Floating particles */}
                            {[...Array(12)].map((_, i) => (
                                <div key={i} style={{
                                    position: 'absolute',
                                    width: '5px',
                                    height: '5px',
                                    background: i % 3 === 0 ? COLORS.gold : i % 3 === 1 ? COLORS.orange : COLORS.aqua,
                                    borderRadius: '50%',
                                    left: `${5 + Math.random() * 90}%`,
                                    bottom: '10%',
                                    opacity: 0,
                                    animation: `floatParticle 2.5s ease-out ${i * 0.15}s infinite`,
                                    boxShadow: `0 0 8px ${i % 3 === 0 ? COLORS.gold : i % 3 === 1 ? COLORS.orange : COLORS.aqua}`
                                }} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* RECURSION Display - Wheel within the wheel! */}
            {state === 'recursion' && (
                <div style={{
                    width: '100%',
                    maxWidth: isMobile ? `${MOBILE_CARD_WIDTH}px` : '100%',
                    position: 'relative',
                }}>
                    {/* Outer glow ring - matrix green */}
                    <div style={{
                        position: 'absolute',
                        inset: '-2px',
                        borderRadius: '22px',
                        backgroundImage: `linear-gradient(135deg, ${COLORS.recursion}60 0%, transparent 40%, transparent 60%, ${COLORS.recursion}60 100%)`,
                        backgroundSize: '200% 200%',
                        animation: 'borderGlowSpin 2s linear infinite',
                        zIndex: 0,
                    }} />

                    {/* Main card */}
                    <div style={{
                        position: 'relative',
                        background: `linear-gradient(180deg, rgba(10,25,10,0.95) 0%, rgba(5,15,5,0.98) 100%)`,
                        borderRadius: '20px',
                        border: `2px solid ${COLORS.recursion}50`,
                        boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 80px ${COLORS.recursion}25, inset 0 1px 0 ${COLORS.recursion}30`,
                        overflow: 'hidden',
                        zIndex: 1,
                    }}>
                        {/* Matrix scanlines */}
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px)',
                            pointerEvents: 'none',
                            zIndex: 2,
                        }} />

                        {/* Glowing inner border */}
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            boxShadow: `inset 0 0 40px ${COLORS.recursion}20, inset 0 0 80px ${COLORS.recursion}10`,
                            pointerEvents: 'none',
                            zIndex: 1,
                        }} />

                        {/* Corner accents */}
                        <div style={{ position: 'absolute', top: '10px', left: '10px', width: '20px', height: '20px', borderTop: `2px solid ${COLORS.recursion}70`, borderLeft: `2px solid ${COLORS.recursion}70`, borderRadius: '6px 0 0 0', zIndex: 5 }} />
                        <div style={{ position: 'absolute', top: '10px', right: '10px', width: '20px', height: '20px', borderTop: `2px solid ${COLORS.recursion}70`, borderRight: `2px solid ${COLORS.recursion}70`, borderRadius: '0 6px 0 0', zIndex: 5 }} />
                        <div style={{ position: 'absolute', bottom: '10px', left: '10px', width: '20px', height: '20px', borderBottom: `2px solid ${COLORS.recursion}70`, borderLeft: `2px solid ${COLORS.recursion}70`, borderRadius: '0 0 0 6px', zIndex: 5 }} />
                        <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '20px', height: '20px', borderBottom: `2px solid ${COLORS.recursion}70`, borderRight: `2px solid ${COLORS.recursion}70`, borderRadius: '0 0 6px 0', zIndex: 5 }} />

                        {/* Content */}
                        <div style={{
                            position: 'relative',
                            zIndex: 3,
                            padding: isMobile ? '28px 20px' : '36px 28px',
                            textAlign: 'center',
                        }}>
                            {/* Headline with glitch effect */}
                            <div style={{
                                fontSize: isMobile ? '32px' : '42px',
                                fontWeight: '900',
                                color: COLORS.recursion,
                                marginBottom: '16px',
                                letterSpacing: '10px',
                                textShadow: `0 0 20px ${COLORS.recursion}, 0 0 40px ${COLORS.recursion}, 0 0 60px ${COLORS.recursion}88`,
                                fontFamily: 'monospace',
                                animation: 'recursionTextGlitch 0.5s ease-in-out infinite'
                            }}>
                                RECURSION
                            </div>

                            {/* Wheel icon */}
                            <div style={{
                                width: isMobile ? '70px' : '90px',
                                height: isMobile ? '70px' : '90px',
                                margin: '0 auto 16px',
                                animation: 'wheelSpin 2s linear infinite',
                                filter: `drop-shadow(0 0 20px ${COLORS.recursion})`
                            }}>
                                <img
                                    src={WHEEL_TEXTURE_URL}
                                    alt="Wheel"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        imageRendering: 'pixelated',
                                    }}
                                />
                            </div>

                            {/* Subtext */}
                            <div style={{
                                color: COLORS.recursion,
                                fontSize: isMobile ? '15px' : '17px',
                                fontFamily: 'monospace',
                                textShadow: `0 0 10px ${COLORS.recursion}88`,
                                marginBottom: '8px',
                            }}>
                                You hit the wheel in the wheel!
                            </div>

                            {/* Info */}
                            <div style={{
                                color: `${COLORS.recursion}99`,
                                fontSize: isMobile ? '12px' : '14px',
                                fontFamily: 'monospace',
                            }}>
                                Global lucky spin event triggered for ALL users!
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bonus Wheel - horizontal strip spinner to select event */}
            {(state === 'bonusWheel' || state === 'bonusResult') && (
                <div style={{
                    width: '100%',
                    maxWidth: isMobile ? `${MOBILE_CARD_WIDTH}px` : '100%',
                    position: 'relative',
                }}>
                    {/* Outer glow ring - gold with pulse */}
                    <div style={{
                        position: 'absolute',
                        inset: '-3px',
                        borderRadius: '24px',
                        backgroundImage: `linear-gradient(135deg, ${COLORS.gold}60 0%, ${COLORS.orange}40 25%, transparent 40%, transparent 60%, ${COLORS.orange}40 75%, ${COLORS.gold}60 100%)`,
                        backgroundSize: '200% 200%',
                        animation: state === 'bonusWheel' ? 'borderGlowSpin 2s linear infinite' : 'borderGlowIdle 6s ease-in-out infinite',
                        zIndex: 0,
                    }} />

                    {/* Main card */}
                    <div style={{
                        position: 'relative',
                        background: `linear-gradient(180deg, rgba(35,30,22,0.98) 0%, rgba(25,22,18,0.99) 100%)`,
                        borderRadius: '22px',
                        border: `1px solid ${COLORS.gold}40`,
                        boxShadow: `0 10px 50px rgba(0,0,0,0.6), 0 0 80px ${COLORS.gold}20, inset 0 1px 0 ${COLORS.gold}30`,
                        overflow: 'hidden',
                        zIndex: 1,
                    }}>
                        {/* Animated background shimmer */}
                        {state === 'bonusWheel' && (
                            <div style={{
                                position: 'absolute',
                                top: 0, left: '-100%', right: '-100%', bottom: 0,
                                backgroundImage: `linear-gradient(90deg, transparent 0%, ${COLORS.gold}08 50%, transparent 100%)`,
                                animation: 'shimmerSlide 2s ease-in-out infinite',
                                zIndex: 0,
                                pointerEvents: 'none',
                            }} />
                        )}

                        {/* Top edge highlight */}
                        <div style={{
                            position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px',
                            backgroundImage: `linear-gradient(90deg, transparent, ${COLORS.gold}60 50%, transparent)`,
                            zIndex: 5,
                        }} />

                        {/* Corner accents */}
                        <div style={{ position: 'absolute', top: '10px', left: '10px', width: '24px', height: '24px', borderTop: `2px solid ${COLORS.gold}70`, borderLeft: `2px solid ${COLORS.gold}70`, borderRadius: '8px 0 0 0', zIndex: 5 }} />
                        <div style={{ position: 'absolute', top: '10px', right: '10px', width: '24px', height: '24px', borderTop: `2px solid ${COLORS.gold}70`, borderRight: `2px solid ${COLORS.gold}70`, borderRadius: '0 8px 0 0', zIndex: 5 }} />
                        <div style={{ position: 'absolute', bottom: '10px', left: '10px', width: '24px', height: '24px', borderBottom: `2px solid ${COLORS.gold}70`, borderLeft: `2px solid ${COLORS.gold}70`, borderRadius: '0 0 0 8px', zIndex: 5 }} />
                        <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '24px', height: '24px', borderBottom: `2px solid ${COLORS.gold}70`, borderRight: `2px solid ${COLORS.gold}70`, borderRadius: '0 0 8px 0', zIndex: 5 }} />

                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: isMobile ? '20px 16px' : '24px 20px',
                            borderBottom: `1px solid rgba(255,255,255,0.1)`,
                            backgroundImage: `linear-gradient(180deg, ${COLORS.gold}08 0%, transparent 100%)`,
                            position: 'relative',
                            zIndex: 1,
                        }}>
                            {/* Bonus badge */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '8px',
                            }}>
                                <Gift size={isMobile ? 24 : 28} style={{
                                    color: COLORS.gold,
                                    filter: `drop-shadow(0 0 10px ${COLORS.gold})`,
                                    animation: state === 'bonusWheel' ? 'pulse 1s ease-in-out infinite' : 'none',
                                }} />
                                <span style={{
                                    color: COLORS.gold,
                                    fontSize: isMobile ? '22px' : '26px',
                                    fontWeight: '700',
                                    textShadow: `0 0 20px ${COLORS.gold}88, 0 2px 4px rgba(0,0,0,0.5)`,
                                    letterSpacing: '2px',
                                    textTransform: 'uppercase',
                                }}>
                                    Bonus Event
                                </span>
                                <Gift size={isMobile ? 24 : 28} style={{
                                    color: COLORS.gold,
                                    filter: `drop-shadow(0 0 10px ${COLORS.gold})`,
                                    animation: state === 'bonusWheel' ? 'pulse 1s ease-in-out infinite' : 'none',
                                }} />
                            </div>
                            <span style={{
                                color: state === 'bonusResult' ? COLORS.green : COLORS.textMuted,
                                fontSize: '13px',
                                fontWeight: '500',
                                animation: state === 'bonusWheel' ? 'pulse 1.5s ease-in-out infinite' : 'none',
                            }}>
                                {state === 'bonusWheel' ? 'Selecting your bonus...' : 'âœ¨ Bonus selected!'}
                            </span>
                        </div>

                        {/* Strip Container */}
                        <div style={{ padding: isMobile ? '20px 16px' : '24px 20px', position: 'relative', zIndex: 1 }}>
                            {/* Horizontal Strip Spinner */}
                            <div style={{
                                position: 'relative',
                                height: isMobile ? '90px' : '110px',
                                width: '100%',
                                overflow: 'hidden',
                                borderRadius: '12px',
                                background: `linear-gradient(90deg, #12100c 0%, #1a1610 50%, #12100c 100%)`,
                                border: state === 'bonusResult' ? `2px solid ${COLORS.gold}50` : `1px solid ${COLORS.gold}35`,
                                boxShadow: state === 'bonusResult'
                                    ? `0 0 30px ${COLORS.gold}30, inset 0 0 40px rgba(0,0,0,0.5)`
                                    : `inset 0 0 40px rgba(0,0,0,0.5)`,
                            }}>
                                {/* Center Indicator - enhanced */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '4px',
                                    background: COLORS.gold,
                                    zIndex: 10,
                                    boxShadow: `0 0 15px ${COLORS.gold}, 0 0 30px ${COLORS.gold}88`,
                                }} />
                                {/* Top pointer - larger */}
                                <div style={{
                                    position: 'absolute',
                                    top: '-3px', left: '50%', transform: 'translateX(-50%)',
                                    width: 0, height: 0,
                                    borderLeft: '10px solid transparent',
                                    borderRight: '10px solid transparent',
                                    borderTop: `16px solid ${COLORS.gold}`,
                                    zIndex: 11,
                                    filter: `drop-shadow(0 0 8px ${COLORS.gold})`,
                                }} />
                                {/* Bottom pointer - larger */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: '-3px', left: '50%', transform: 'translateX(-50%)',
                                    width: 0, height: 0,
                                    borderLeft: '10px solid transparent',
                                    borderRight: '10px solid transparent',
                                    borderBottom: `16px solid ${COLORS.gold}`,
                                    zIndex: 11,
                                    filter: `drop-shadow(0 0 8px ${COLORS.gold})`,
                                }} />

                                {/* Gradient overlay */}
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                    background: `linear-gradient(90deg, #12100c 0%, transparent 20%, transparent 80%, #12100c 100%)`,
                                    zIndex: 7, pointerEvents: 'none'
                                }} />

                                {/* Event Strip */}
                                <CanvasBonusStrip
                                    events={bonusStrip}
                                    offsetRef={bonusOffsetRef}
                                    isMobile={isMobile}
                                    isSpinning={state === 'bonusWheel'}
                                    isResult={state === 'bonusResult'}
                                    finalIndex={bonusStrip.length - 5}
                                />
                            </div>
                        </div>

                        {/* Result display - enhanced */}
                        {state === 'bonusResult' && selectedEvent && (
                            <div style={{
                                padding: isMobile ? '24px 20px' : '28px 24px',
                                borderTop: `1px solid rgba(255,255,255,0.1)`,
                                background: selectedEvent.id === 'triple_lucky_spin'
                                    ? `radial-gradient(ellipse at 50% 0%, ${COLORS.gold}20 0%, transparent 70%)`
                                    : selectedEvent.id === 'lucky_spin'
                                        ? `radial-gradient(ellipse at 50% 0%, ${COLORS.green}18 0%, transparent 70%)`
                                        : `radial-gradient(ellipse at 50% 0%, ${COLORS.orange}18 0%, transparent 70%)`,
                                textAlign: 'center',
                                position: 'relative',
                                overflow: 'hidden',
                            }}>
                                {/* Floating particles */}
                                {[...Array(10)].map((_, i) => {
                                    const particleColor = selectedEvent.id === 'triple_lucky_spin' ? COLORS.gold
                                        : selectedEvent.id === 'lucky_spin' ? COLORS.green : COLORS.orange;
                                    return (
                                        <div key={i} style={{
                                            position: 'absolute',
                                            width: '4px',
                                            height: '4px',
                                            background: i % 2 === 0 ? particleColor : COLORS.gold,
                                            borderRadius: '50%',
                                            left: `${5 + Math.random() * 90}%`,
                                            bottom: '0',
                                            opacity: 0,
                                            animation: `floatParticle 2.5s ease-out ${i * 0.2}s infinite`,
                                            boxShadow: `0 0 6px ${i % 2 === 0 ? particleColor : COLORS.gold}`
                                        }} />
                                    );
                                })}

                                {/* Icon */}
                                <div style={{
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '16px',
                                    background: selectedEvent.id === 'triple_lucky_spin'
                                        ? `linear-gradient(135deg, ${COLORS.gold}30, ${COLORS.green}20)`
                                        : selectedEvent.id === 'lucky_spin'
                                            ? `${COLORS.green}20`
                                            : `${COLORS.orange}20`,
                                    border: `2px solid ${selectedEvent.id === 'triple_lucky_spin' ? COLORS.gold : selectedEvent.id === 'lucky_spin' ? COLORS.green : COLORS.orange}50`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 16px',
                                    boxShadow: `0 0 25px ${selectedEvent.id === 'triple_lucky_spin' ? COLORS.gold : selectedEvent.id === 'lucky_spin' ? COLORS.green : COLORS.orange}30`,
                                    animation: 'itemReveal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    position: 'relative',
                                    zIndex: 1,
                                }}>
                                    {selectedEvent.id === 'triple_lucky_spin' ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Sparkles size={22} style={{ color: COLORS.gold }} />
                                            <Zap size={22} style={{ color: COLORS.green }} />
                                        </div>
                                    ) : selectedEvent.id === 'lucky_spin' ? (
                                        <Zap size={32} style={{ color: COLORS.green, filter: `drop-shadow(0 0 8px ${COLORS.green})` }} />
                                    ) : (
                                        <Sparkles size={32} style={{ color: COLORS.orange, filter: `drop-shadow(0 0 8px ${COLORS.orange})` }} />
                                    )}
                                </div>

                                <div style={{
                                    fontSize: isMobile ? '22px' : '26px',
                                    fontWeight: '700',
                                    color: selectedEvent.id === 'triple_lucky_spin' ? COLORS.gold : selectedEvent.id === 'lucky_spin' ? COLORS.green : COLORS.orange,
                                    textShadow: `0 0 25px ${selectedEvent.id === 'triple_lucky_spin' ? COLORS.gold : selectedEvent.id === 'lucky_spin' ? COLORS.green : COLORS.orange}88`,
                                    marginBottom: '10px',
                                    position: 'relative',
                                    zIndex: 1,
                                }}>
                                    {selectedEvent.name}!
                                </div>
                                <div style={{
                                    fontSize: '14px',
                                    color: COLORS.text,
                                    opacity: 0.9,
                                    position: 'relative',
                                    zIndex: 1,
                                }}>
                                    {selectedEvent.description}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/*Lucky Spin Display */}
            {(state === 'luckySpinning' || state === 'luckyResult') && (
                <div style={{
                    width: '100%',
                    maxWidth: isMobile ? `${MOBILE_CARD_WIDTH}px` : '100%',
                    position: 'relative',
                }}>
                    {/* Outer glow ring - green */}
                    <div style={{
                        position: 'absolute',
                        inset: '-2px',
                        borderRadius: '22px',
                        backgroundImage: `linear-gradient(135deg, ${COLORS.green}50 0%, transparent 40%, transparent 60%, ${COLORS.green}50 100%)`,
                        backgroundSize: '200% 200%',
                        animation: state === 'luckySpinning' ? 'borderGlowSpin 3s linear infinite' : 'borderGlowIdle 8s ease-in-out infinite',
                        zIndex: 0,
                    }} />

                    {/* Main card */}
                    <div style={{
                        position: 'relative',
                        background: `linear-gradient(180deg, rgba(18,28,22,0.95) 0%, rgba(14,22,18,0.98) 100%)`,
                        borderRadius: '20px',
                        border: `1px solid ${COLORS.green}30`,
                        boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 60px ${COLORS.green}15, inset 0 1px 0 ${COLORS.green}20`,
                        overflow: 'hidden',
                        zIndex: 1,
                    }}>
                        {/* Top edge highlight */}
                        <div style={{
                            position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px',
                            backgroundImage: `linear-gradient(90deg, transparent, ${COLORS.green}50 50%, transparent)`,
                            zIndex: 5,
                        }} />

                        {/* Corner accents */}
                        <div style={{ position: 'absolute', top: '10px', left: '10px', width: '20px', height: '20px', borderTop: `2px solid ${COLORS.green}60`, borderLeft: `2px solid ${COLORS.green}60`, borderRadius: '6px 0 0 0', zIndex: 5 }} />
                        <div style={{ position: 'absolute', top: '10px', right: '10px', width: '20px', height: '20px', borderTop: `2px solid ${COLORS.green}60`, borderRight: `2px solid ${COLORS.green}60`, borderRadius: '0 6px 0 0', zIndex: 5 }} />
                        <div style={{ position: 'absolute', bottom: '10px', left: '10px', width: '20px', height: '20px', borderBottom: `2px solid ${COLORS.green}60`, borderLeft: `2px solid ${COLORS.green}60`, borderRadius: '0 0 0 6px', zIndex: 5 }} />
                        <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '20px', height: '20px', borderBottom: `2px solid ${COLORS.green}60`, borderRight: `2px solid ${COLORS.green}60`, borderRadius: '0 0 6px 0', zIndex: 5 }} />

                        {/* Header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '16px 20px',
                            borderBottom: `1px solid rgba(255,255,255,0.08)`,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Zap size={24} style={{ color: COLORS.green, filter: `drop-shadow(0 0 8px ${COLORS.green})` }} />
                                <span style={{
                                    color: COLORS.green,
                                    fontSize: '18px',
                                    fontWeight: '600',
                                    textShadow: `0 0 10px ${COLORS.green}66`,
                                }}>
                                    {state === 'luckyResult' ? 'Lucky Win!' : 'Lucky Spin'}
                                </span>
                            </div>
                        </div>

                        {/* Strip Container */}
                        <div style={{ padding: isMobile ? '12px' : '20px' }}>
                            <div
                                onClick={() => {
                                    if (!isMobile || !user || allItems.length === 0) return;
                                    if (state === 'luckyResult') {
                                        respinRef.current?.();
                                    }
                                }}
                                style={{
                                    position: 'relative',
                                    height: isMobile ? `${MOBILE_STRIP_HEIGHT}px` : '100px',
                                    width: isMobile ? `${MOBILE_STRIP_WIDTH}px` : '100%',
                                    overflow: 'hidden',
                                    borderRadius: '10px',
                                    background: `linear-gradient(${isMobile ? '0deg' : '90deg'}, #0a150a 0%, #0f1a0f 50%, #0a150a 100%)`,
                                    border: state === 'luckyResult' ? `2px solid ${COLORS.green}60` : `1px solid ${COLORS.green}40`,
                                    boxShadow: state === 'luckyResult'
                                        ? `0 0 30px ${COLORS.green}40, 0 0 60px ${COLORS.green}20, inset 0 0 30px rgba(0,0,0,0.4)`
                                        : `0 0 20px ${COLORS.green}25, inset 0 0 30px rgba(0,0,0,0.4)`,
                                    margin: isMobile ? '0 auto' : '0',
                                    cursor: isMobile && state === 'luckyResult' ? 'pointer' : 'default',
                                }}>
                                {/* Center indicator - enhanced glow */}
                                <div style={{
                                    position: 'absolute',
                                    ...(isMobile ? {
                                        left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', height: '3px',
                                    } : {
                                        top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '3px',
                                    }),
                                    background: COLORS.green,
                                    zIndex: 10,
                                    boxShadow: `0 0 10px ${COLORS.green}, 0 0 20px ${COLORS.green}66`,
                                }} />
                                <div style={{
                                    position: 'absolute',
                                    ...(isMobile ? {
                                        left: '-2px', top: '50%', transform: 'translateY(-50%)',
                                        width: 0, height: 0,
                                        borderTop: '8px solid transparent', borderBottom: '8px solid transparent',
                                        borderLeft: `12px solid ${COLORS.green}`
                                    } : {
                                        top: '-2px', left: '50%', transform: 'translateX(-50%)',
                                        width: 0, height: 0,
                                        borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
                                        borderTop: `12px solid ${COLORS.green}`
                                    }),
                                    zIndex: 11,
                                    filter: `drop-shadow(0 0 6px ${COLORS.green})`
                                }} />
                                {/* Bottom/Right pointer */}
                                <div style={{
                                    position: 'absolute',
                                    ...(isMobile ? {
                                        right: '-2px', top: '50%', transform: 'translateY(-50%)',
                                        width: 0, height: 0,
                                        borderTop: '8px solid transparent', borderBottom: '8px solid transparent',
                                        borderRight: `12px solid ${COLORS.green}`
                                    } : {
                                        bottom: '-2px', left: '50%', transform: 'translateX(-50%)',
                                        width: 0, height: 0,
                                        borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
                                        borderBottom: `12px solid ${COLORS.green}`
                                    }),
                                    zIndex: 11,
                                    filter: `drop-shadow(0 0 6px ${COLORS.green})`
                                }} />

                                {/* Gradient overlay */}
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                    background: isMobile
                                        ? `linear-gradient(180deg, #0a150a 0%, transparent 20%, transparent 80%, #0a150a 100%)`
                                        : `linear-gradient(90deg, #0a150a 0%, transparent 15%, transparent 85%, #0a150a 100%)`,
                                    zIndex: 5, pointerEvents: 'none'
                                }} />

                                {/* Item Strip */}
                                <CanvasSpinningStrip
                                    items={strip}
                                    offsetRef={canvasOffsetRef}
                                    isMobile={isMobile}
                                    isSpinning={state === 'luckySpinning'}
                                    isResult={state === 'luckyResult'}
                                    spinProgress={spinProgress}
                                    isRecursion={false}
                                    stripWidth={isMobile ? MOBILE_STRIP_WIDTH : undefined}
                                    stripHeight={isMobile ? MOBILE_STRIP_HEIGHT : 100}
                                    finalIndex={FINAL_INDEX}
                                    accentColor={COLORS.green}
                                    isLuckySpin={true}
                                />
                            </div>
                        </div>

                        {/* Result Section - inside the card */}
                        {state === 'luckyResult' && luckyResult && (
                            <div style={{
                                padding: isMobile ? '24px 16px' : '28px 24px',
                                borderTop: `1px solid rgba(255,255,255,0.08)`,
                                background: `radial-gradient(ellipse at 50% 0%, ${COLORS.green}18 0%, transparent 50%), radial-gradient(ellipse at 20% 100%, ${COLORS.aqua}08 0%, transparent 40%), radial-gradient(ellipse at 80% 100%, ${COLORS.gold}08 0%, transparent 40%)`,
                                textAlign: 'center',
                                position: 'relative',
                                overflow: 'hidden',
                            }}>
                                {/* Animated border glow */}
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '2px',
                                    backgroundImage: `linear-gradient(90deg, transparent, ${COLORS.green}, transparent)`,
                                    animation: 'shimmer 2s ease-in-out infinite',
                                }} />

                                {/* Corner sparkles */}
                                <div style={{
                                    position: 'absolute',
                                    top: '10px',
                                    left: '10px',
                                    color: COLORS.green,
                                    opacity: 0.6,
                                    animation: 'pulse 2s ease-in-out infinite',
                                }}>
                                    <Sparkles size={16} />
                                </div>
                                <div style={{
                                    position: 'absolute',
                                    top: '10px',
                                    right: '10px',
                                    color: COLORS.green,
                                    opacity: 0.6,
                                    animation: 'pulse 2s ease-in-out infinite 0.5s',
                                }}>
                                    <Sparkles size={16} />
                                </div>

                                {/* Floating particles - enhanced spread */}
                                {[...Array(14)].map((_, i) => (
                                    <div key={i} style={{
                                        position: 'absolute',
                                        width: i % 4 === 0 ? '6px' : '4px',
                                        height: i % 4 === 0 ? '6px' : '4px',
                                        background: i % 3 === 0 ? COLORS.green : i % 3 === 1 ? COLORS.aqua : COLORS.gold,
                                        borderRadius: '50%',
                                        left: `${5 + (i * 7) % 90}%`,
                                        bottom: '0',
                                        opacity: 0,
                                        animation: `floatParticle ${2.5 + (i % 3) * 0.5}s ease-out ${i * 0.15}s infinite`,
                                        boxShadow: `0 0 ${i % 4 === 0 ? '10px' : '6px'} ${i % 3 === 0 ? COLORS.green : i % 3 === 1 ? COLORS.aqua : COLORS.gold}`
                                    }} />
                                ))}

                                {/* Result header */}
                                <div style={{
                                    marginBottom: '16px',
                                    position: 'relative',
                                    zIndex: 1,
                                }}>
                                    <span style={{
                                        color: COLORS.green,
                                        fontSize: isMobile ? '14px' : '16px',
                                        fontWeight: '700',
                                        letterSpacing: '2px',
                                        textTransform: 'uppercase',
                                        textShadow: `0 0 20px ${COLORS.green}60`,
                                        animation: 'pulse 2s ease-in-out infinite',
                                    }}>
                                        ✦ Lucky Win ✦
                                    </span>
                                </div>

                                {/* Equal chance badge - prominent */}
                                {luckyResult.equalChance && (
                                    <div style={{ marginBottom: '16px', position: 'relative', zIndex: 1 }}>
                                        <span style={{
                                            backgroundImage: `linear-gradient(135deg, ${COLORS.green}25, ${COLORS.aqua}15)`,
                                            color: COLORS.green,
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            padding: '8px 18px',
                                            borderRadius: '20px',
                                            border: `1px solid ${COLORS.green}50`,
                                            boxShadow: `0 0 15px ${COLORS.green}20`,
                                        }}>
                                            {formatChance(luckyResult.equalChance)}% equal chance
                                        </span>
                                    </div>
                                )}

                                {/* Item Display */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '16px',
                                    position: 'relative',
                                    zIndex: 1,
                                }}>
                                    {(() => {
                                        const isMythic = isMythicItem(luckyResult);
                                        const isSpecial = isSpecialItem(luckyResult);
                                        const isRare = isRareItem(luckyResult);
                                        const isInsane = isInsaneItem(luckyResult);
                                        const itemColor = isInsane ? COLORS.insane : isMythic ? COLORS.aqua : isSpecial ? COLORS.purple : isRare ? COLORS.red : COLORS.green;
                                        const rarityLabel = isInsane ? 'INSANE' : isMythic ? 'MYTHIC' : isSpecial ? 'LEGENDARY' : isRare ? 'RARE' : null;
                                        const isHighRarity = isInsane || isMythic || isSpecial || isRare;

                                        return (
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: isMobile ? '20px' : '28px',
                                                backgroundImage: `linear-gradient(145deg, ${itemColor}12, transparent 60%)`,
                                                borderRadius: '20px',
                                                border: `1px solid ${itemColor}30`,
                                                position: 'relative',
                                                animation: 'itemReveal 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                                minWidth: isMobile ? '200px' : '260px',
                                            }}>
                                                {/* Rarity badge */}
                                                {rarityLabel && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '-12px',
                                                        left: '50%',
                                                        transform: 'translateX(-50%)',
                                                        backgroundImage: `linear-gradient(135deg, ${itemColor}, ${itemColor}cc)`,
                                                        color: itemColor === COLORS.insane ? '#1a1a1a' : '#fff',
                                                        fontSize: '10px',
                                                        fontWeight: '800',
                                                        padding: '4px 14px',
                                                        borderRadius: '10px',
                                                        letterSpacing: '1.5px',
                                                        boxShadow: `0 0 20px ${itemColor}50, 0 2px 8px rgba(0,0,0,0.3)`,
                                                        animation: isInsane || isMythic ? 'pulse 1.5s ease-in-out infinite' : 'none',
                                                        zIndex: 3,
                                                    }}>
                                                        {rarityLabel}
                                                    </div>
                                                )}

                                                {/* Item image container with Canvas glow */}
                                                <div style={{
                                                    position: 'relative',
                                                    width: isMobile ? '90px' : '110px',
                                                    height: isMobile ? '90px' : '110px',
                                                }}>
                                                    <CanvasResultItem
                                                        item={luckyResult}
                                                        size={isMobile ? 90 : 110}
                                                        isRecursionSpin={false}
                                                        isLuckySpin={true}
                                                        showAnimation={true}
                                                    />
                                                </div>

                                                {/* Item name */}
                                                <span style={{
                                                    color: itemColor,
                                                    fontSize: isMobile ? '20px' : '24px',
                                                    fontWeight: '700',
                                                    textShadow: `0 0 20px ${itemColor}50`,
                                                    textAlign: 'center',
                                                }}>
                                                    {luckyResult.name}
                                                </span>

                                                {/* NEW badge */}
                                                {isLuckyNew && (
                                                    <span style={{
                                                        backgroundImage: `linear-gradient(135deg, ${COLORS.green}, ${COLORS.aqua})`,
                                                        color: COLORS.bg,
                                                        fontSize: '11px',
                                                        fontWeight: '800',
                                                        padding: '5px 16px',
                                                        borderRadius: '8px',
                                                        boxShadow: `0 0 15px ${COLORS.green}50`,
                                                        animation: 'pulse 1.5s ease-in-out infinite',
                                                        letterSpacing: '1px',
                                                    }}>★ NEW TO COLLECTION ★</span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Triple Spin Display (also used for Triple Lucky Spin) */}
            {(state === 'tripleSpinning' || state === 'tripleResult' || state === 'tripleLuckySpinning' || state === 'tripleLuckyResult') && (() => {
                const isTripleLucky = state === 'tripleLuckySpinning' || state === 'tripleLuckyResult';
                const accentColor = isTripleLucky ? COLORS.green : COLORS.gold;

                return (
                    <div style={{
                        width: '100%',
                        maxWidth: isMobile ? '100%' : '100%',
                        position: 'relative',
                    }}>
                        {/* Outer glow ring */}
                        <div style={{
                            position: 'absolute',
                            inset: '-2px',
                            borderRadius: '22px',
                            backgroundImage: `linear-gradient(135deg, ${accentColor}50 0%, transparent 40%, transparent 60%, ${accentColor}50 100%)`,
                            backgroundSize: '200% 200%',
                            animation: (state === 'tripleSpinning' || state === 'tripleLuckySpinning') ? 'borderGlowSpin 3s linear infinite' : 'borderGlowIdle 8s ease-in-out infinite',
                            zIndex: 0,
                        }} />

                        {/* Main card */}
                        <div style={{
                            position: 'relative',
                            background: isTripleLucky
                                ? `linear-gradient(180deg, rgba(18,28,22,0.95) 0%, rgba(14,22,18,0.98) 100%)`
                                : `linear-gradient(180deg, rgba(28,28,24,0.95) 0%, rgba(22,22,18,0.98) 100%)`,
                            borderRadius: '20px',
                            border: `1px solid ${accentColor}30`,
                            boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 60px ${accentColor}15, inset 0 1px 0 ${accentColor}20`,
                            overflow: 'hidden',
                            zIndex: 1,
                        }}>
                            {/* Top edge highlight */}
                            <div style={{
                                position: 'absolute', top: 0, left: '5%', right: '5%', height: '1px',
                                backgroundImage: `linear-gradient(90deg, transparent, ${accentColor}50 50%, transparent)`,
                                zIndex: 5,
                            }} />

                            {/* Corner accents */}
                            <div style={{ position: 'absolute', top: '10px', left: '10px', width: '20px', height: '20px', borderTop: `2px solid ${accentColor}60`, borderLeft: `2px solid ${accentColor}60`, borderRadius: '6px 0 0 0', zIndex: 5 }} />
                            <div style={{ position: 'absolute', top: '10px', right: '10px', width: '20px', height: '20px', borderTop: `2px solid ${accentColor}60`, borderRight: `2px solid ${accentColor}60`, borderRadius: '0 6px 0 0', zIndex: 5 }} />
                            <div style={{ position: 'absolute', bottom: '10px', left: '10px', width: '20px', height: '20px', borderBottom: `2px solid ${accentColor}60`, borderLeft: `2px solid ${accentColor}60`, borderRadius: '0 0 0 6px', zIndex: 5 }} />
                            <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '20px', height: '20px', borderBottom: `2px solid ${accentColor}60`, borderRight: `2px solid ${accentColor}60`, borderRadius: '0 0 6px 0', zIndex: 5 }} />

                            {/* Header */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: '16px 20px',
                                borderBottom: `1px solid rgba(255,255,255,0.08)`,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {isTripleLucky ? (
                                        <>
                                            <Zap size={24} style={{ color: COLORS.green, filter: `drop-shadow(0 0 8px ${COLORS.green})` }} />
                                            <span style={{
                                                color: COLORS.green,
                                                fontSize: '18px',
                                                fontWeight: '600',
                                                textShadow: `0 0 10px ${COLORS.green}66`,
                                            }}>
                                                Triple Lucky Spin
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={24} style={{ color: COLORS.gold, filter: `drop-shadow(0 0 8px ${COLORS.gold})` }} />
                                            <span style={{
                                                color: COLORS.gold,
                                                fontSize: '18px',
                                                fontWeight: '600',
                                                textShadow: `0 0 10px ${COLORS.gold}66`,
                                            }}>
                                                5x Spin
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Strips Container */}
                            <div
                                onClick={() => {
                                    if (!isMobile || !user || allItems.length === 0) return;
                                    if (state === 'tripleResult' || state === 'tripleLuckyResult') {
                                        respinRef.current?.();
                                    }
                                }}
                                style={{
                                    padding: isMobile ? '12px 8px' : '20px',
                                    cursor: isMobile && (state === 'tripleResult' || state === 'tripleLuckyResult') ? 'pointer' : 'default',
                                }}
                            >
                                {(() => {
                                    const stripCount = isTripleLucky ? 3 : 5;
                                    const stripIndices = [...Array(stripCount).keys()];
                                    return isMobile ? (
                                        /* Mobile: vertical strips side by side */
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}>
                                            {stripIndices.map(rowIndex => {
                                                const TRIPLE_ITEM_WIDTH_MOBILE = isTripleLucky ? 70 : 58;
                                                const STRIP_HEIGHT_MOBILE = 200;
                                                const isResultState = state === 'tripleResult' || state === 'tripleLuckyResult';
                                                return (
                                                    <div key={rowIndex} style={{
                                                        position: 'relative',
                                                        height: `${STRIP_HEIGHT_MOBILE}px`,
                                                        width: `${TRIPLE_ITEM_WIDTH_MOBILE}px`,
                                                        overflow: 'hidden',
                                                        borderRadius: '8px',
                                                        background: isTripleLucky
                                                            ? `linear-gradient(180deg, #0a150a 0%, #0f1a0f 50%, #0a150a 100%)`
                                                            : `linear-gradient(180deg, #14120f 0%, #1a1814 50%, #14120f 100%)`,
                                                        border: isResultState ? `2px solid ${accentColor}50` : `1px solid ${accentColor}30`,
                                                        boxShadow: isResultState
                                                            ? `0 0 20px ${accentColor}35, inset 0 0 20px rgba(0,0,0,0.3)`
                                                            : `inset 0 0 20px rgba(0,0,0,0.3)`
                                                    }}>
                                                        {/* Center Indicator - horizontal line */}
                                                        <div style={{
                                                            position: 'absolute',
                                                            left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', height: '2px',
                                                            background: accentColor,
                                                            zIndex: 10,
                                                            boxShadow: `0 0 12px ${accentColor}, 0 0 24px ${accentColor}88`
                                                        }} />
                                                        {/* Left pointer */}
                                                        <div style={{
                                                            position: 'absolute',
                                                            left: '-1px', top: '50%', transform: 'translateY(-50%)',
                                                            width: 0, height: 0,
                                                            borderTop: '5px solid transparent', borderBottom: '5px solid transparent',
                                                            borderLeft: `8px solid ${accentColor}`,
                                                            zIndex: 11, filter: `drop-shadow(0 0 6px ${accentColor})`
                                                        }} />
                                                        {/* Right pointer */}
                                                        <div style={{
                                                            position: 'absolute',
                                                            right: '-1px', top: '50%', transform: 'translateY(-50%)',
                                                            width: 0, height: 0,
                                                            borderTop: '5px solid transparent', borderBottom: '5px solid transparent',
                                                            borderRight: `8px solid ${accentColor}`,
                                                            zIndex: 11, filter: `drop-shadow(0 0 6px ${accentColor})`
                                                        }} />
                                                        {/* Edge fade gradients */}
                                                        <div style={{
                                                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                                            background: isTripleLucky
                                                                ? `linear-gradient(180deg, #0a150a 0%, transparent 20%, transparent 80%, #0a150a 100%)`
                                                                : `linear-gradient(180deg, #14120f 0%, transparent 20%, transparent 80%, #14120f 100%)`,
                                                            zIndex: 5, pointerEvents: 'none'
                                                        }} />
                                                        {/* Item Strip */}
                                                        <CanvasSpinningStrip
                                                            items={tripleStrips[rowIndex] || []}
                                                            offsetRef={{ get current() { return tripleOffsetRefs.current[rowIndex] || 0; } }}
                                                            isMobile={true}
                                                            isSpinning={state === 'tripleSpinning' || state === 'tripleLuckySpinning'}
                                                            isResult={state === 'tripleResult' || state === 'tripleLuckyResult'}
                                                            spinProgress={0}
                                                            isRecursion={false}
                                                            stripWidth={TRIPLE_ITEM_WIDTH_MOBILE}
                                                            stripHeight={STRIP_HEIGHT_MOBILE}
                                                            finalIndex={FINAL_INDEX}
                                                            accentColor={isTripleLucky ? COLORS.green : COLORS.gold}
                                                            itemWidthOverride={TRIPLE_ITEM_WIDTH_MOBILE}
                                                            isLuckySpin={isTripleLucky}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        /* Desktop: horizontal strips stacked */
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px'
                                        }}>
                                            {stripIndices.map(rowIndex => {
                                                const TRIPLE_ITEM_WIDTH = isTripleLucky ? 90 : 80;
                                                const isResultState = state === 'tripleResult' || state === 'tripleLuckyResult';
                                                return (
                                                    <div key={rowIndex} style={{
                                                        position: 'relative',
                                                        height: `${TRIPLE_ITEM_WIDTH}px`,
                                                        width: '100%',
                                                        overflow: 'hidden',
                                                        borderRadius: '8px',
                                                        background: isTripleLucky
                                                            ? `linear-gradient(90deg, #0a150a 0%, #0f1a0f 50%, #0a150a 100%)`
                                                            : `linear-gradient(90deg, #14120f 0%, #1a1814 50%, #14120f 100%)`,
                                                        border: isResultState ? `2px solid ${accentColor}50` : `1px solid ${accentColor}30`,
                                                        boxShadow: isResultState
                                                            ? `0 0 20px ${accentColor}35, inset 0 0 20px rgba(0,0,0,0.3)`
                                                            : `inset 0 0 20px rgba(0,0,0,0.3)`
                                                    }}>
                                                        {/* Center Indicator */}
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '2px',
                                                            background: accentColor,
                                                            zIndex: 10,
                                                            boxShadow: `0 0 12px ${accentColor}, 0 0 24px ${accentColor}88`
                                                        }} />
                                                        {/* Top pointer */}
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '-1px', left: '50%', transform: 'translateX(-50%)',
                                                            width: 0, height: 0,
                                                            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                                                            borderTop: `8px solid ${accentColor}`,
                                                            zIndex: 11, filter: `drop-shadow(0 0 6px ${accentColor})`
                                                        }} />
                                                        {/* Bottom pointer */}
                                                        <div style={{
                                                            position: 'absolute',
                                                            bottom: '-1px', left: '50%', transform: 'translateX(-50%)',
                                                            width: 0, height: 0,
                                                            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                                                            borderBottom: `8px solid ${accentColor}`,
                                                            zIndex: 11, filter: `drop-shadow(0 0 6px ${accentColor})`
                                                        }} />
                                                        {/* Edge fade gradients */}
                                                        <div style={{
                                                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                                            background: isTripleLucky
                                                                ? `linear-gradient(90deg, #0a150a 0%, transparent 15%, transparent 85%, #0a150a 100%)`
                                                                : `linear-gradient(90deg, #14120f 0%, transparent 15%, transparent 85%, #14120f 100%)`,
                                                            zIndex: 5, pointerEvents: 'none'
                                                        }} />
                                                        {/* Item Strip */}
                                                        <CanvasSpinningStrip
                                                            items={tripleStrips[rowIndex] || []}
                                                            offsetRef={{ get current() { return tripleOffsetRefs.current[rowIndex] || 0; } }}
                                                            isMobile={false}
                                                            isSpinning={state === 'tripleSpinning' || state === 'tripleLuckySpinning'}
                                                            isResult={state === 'tripleResult' || state === 'tripleLuckyResult'}
                                                            spinProgress={0}
                                                            isRecursion={false}
                                                            stripHeight={TRIPLE_ITEM_WIDTH}
                                                            finalIndex={FINAL_INDEX}
                                                            accentColor={isTripleLucky ? COLORS.green : COLORS.gold}
                                                            itemWidthOverride={TRIPLE_ITEM_WIDTH}
                                                            isLuckySpin={isTripleLucky}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Result Section */}
                            {(state === 'tripleResult' || state === 'tripleLuckyResult') && tripleResults.some(r => r) && (
                                <div style={{
                                    padding: isMobile ? '24px 16px' : '28px 24px',
                                    borderTop: `1px solid rgba(255,255,255,0.08)`,
                                    background: `radial-gradient(ellipse at 50% 0%, ${accentColor}18 0%, transparent 50%), radial-gradient(ellipse at 20% 100%, ${COLORS.aqua}08 0%, transparent 40%), radial-gradient(ellipse at 80% 100%, ${COLORS.purple}08 0%, transparent 40%)`,
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}>
                                    {/* Animated border glow */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '2px',
                                        backgroundImage: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                                        animation: 'shimmer 2s ease-in-out infinite',
                                    }} />

                                    {/* Corner sparkles */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        left: '10px',
                                        color: accentColor,
                                        opacity: 0.6,
                                        animation: 'pulse 2s ease-in-out infinite',
                                    }}>
                                        <Sparkles size={16} />
                                    </div>
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        right: '10px',
                                        color: accentColor,
                                        opacity: 0.6,
                                        animation: 'pulse 2s ease-in-out infinite 0.5s',
                                    }}>
                                        <Sparkles size={16} />
                                    </div>

                                    {/* Floating particles - enhanced spread */}
                                    {[...Array(16)].map((_, i) => (
                                        <div key={i} style={{
                                            position: 'absolute',
                                            width: i % 4 === 0 ? '6px' : '4px',
                                            height: i % 4 === 0 ? '6px' : '4px',
                                            background: i % 3 === 0 ? accentColor : i % 3 === 1 ? COLORS.aqua : COLORS.purple,
                                            borderRadius: '50%',
                                            left: `${3 + (i * 6) % 94}%`,
                                            bottom: '0',
                                            opacity: 0,
                                            animation: `floatParticle ${2.5 + (i % 3) * 0.5}s ease-out ${i * 0.12}s infinite`,
                                            boxShadow: `0 0 ${i % 4 === 0 ? '10px' : '6px'} ${i % 3 === 0 ? accentColor : i % 3 === 1 ? COLORS.aqua : COLORS.purple}`
                                        }} />
                                    ))}

                                    {/* Result header */}
                                    <div style={{
                                        textAlign: 'center',
                                        marginBottom: '16px',
                                        position: 'relative',
                                        zIndex: 1,
                                    }}>
                                        <span style={{
                                            color: accentColor,
                                            fontSize: isMobile ? '14px' : '16px',
                                            fontWeight: '700',
                                            letterSpacing: '2px',
                                            textTransform: 'uppercase',
                                            textShadow: `0 0 20px ${accentColor}60`,
                                            animation: 'pulse 2s ease-in-out infinite',
                                        }}>
                                            {isTripleLucky ? '✦ Triple Lucky Results ✦' : '✦ 5x Spin Results ✦'}
                                        </span>
                                    </div>

                                    {/* Equal chance badge for triple lucky */}
                                    {isTripleLucky && tripleResults[0]?.equalChance && (
                                        <div style={{
                                            textAlign: 'center',
                                            marginBottom: '16px',
                                            position: 'relative',
                                            zIndex: 1,
                                        }}>
                                            <span style={{
                                                backgroundImage: `linear-gradient(135deg, ${COLORS.green}25, ${COLORS.aqua}15)`,
                                                color: COLORS.green,
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                padding: '8px 18px',
                                                borderRadius: '20px',
                                                border: `1px solid ${COLORS.green}50`,
                                                boxShadow: `0 0 15px ${COLORS.green}20`,
                                            }}>
                                                {formatChance(tripleResults[0].equalChance)}% equal chance per item
                                            </span>
                                        </div>
                                    )}

                                    {/* Results grid */}
                                    <div style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        justifyContent: 'center',
                                        gap: isMobile ? '10px' : '14px',
                                        position: 'relative',
                                        zIndex: 1,
                                    }}>
                                        {tripleResults.map((item, originalIdx) => {
                                            if (!item) return null;
                                            const isMythic = isMythicItem(item);
                                            const isSpecial = isSpecialItem(item);
                                            const isRare = isRareItem(item);
                                            const isInsane = isInsaneItem(item);
                                            const itemColor = isInsane ? COLORS.insane
                                                : isMythic ? COLORS.aqua
                                                    : isSpecial ? COLORS.purple
                                                        : isRare ? COLORS.red
                                                            : isTripleLucky ? COLORS.green : COLORS.gold;
                                            const isHighRarity = isInsane || isMythic || isSpecial || isRare;
                                            const rarityLabel = isInsane ? 'INSANE' : isMythic ? 'MYTHIC' : isSpecial ? 'LEGENDARY' : isRare ? 'RARE' : null;
                                            const showChance = !isTripleLucky && isHighRarity;
                                            return (
                                                <div key={originalIdx} style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: isMobile ? '14px 12px' : '18px 16px',
                                                    paddingTop: rarityLabel ? (isMobile ? '20px' : '24px') : (isMobile ? '14px' : '18px'),
                                                    backgroundImage: `linear-gradient(145deg, ${itemColor}18, ${itemColor}05)`,
                                                    borderRadius: '16px',
                                                    border: `1px solid ${itemColor}45`,
                                                    minWidth: isMobile ? '90px' : '120px',
                                                    flex: isMobile ? '1 1 80px' : '0 0 auto',
                                                    animation: `itemReveal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${originalIdx * 0.08}s both`,
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    boxShadow: isHighRarity ? `0 0 25px ${itemColor}25` : `0 4px 12px rgba(0,0,0,0.2)`,
                                                }}>
                                                    {/* Rarity badge */}
                                                    {rarityLabel && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '-1px',
                                                            left: '50%',
                                                            transform: 'translateX(-50%)',
                                                            backgroundImage: `linear-gradient(135deg, ${itemColor}, ${itemColor}cc)`,
                                                            color: itemColor === COLORS.insane ? '#1a1a1a' : '#fff',
                                                            fontSize: isMobile ? '8px' : '9px',
                                                            fontWeight: '800',
                                                            padding: '3px 10px',
                                                            borderRadius: '0 0 8px 8px',
                                                            letterSpacing: '1px',
                                                            boxShadow: `0 2px 10px ${itemColor}50`,
                                                            zIndex: 3,
                                                        }}>
                                                            {rarityLabel}
                                                        </div>
                                                    )}

                                                    {/* Shimmer overlay for rare items */}
                                                    {isHighRarity && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            inset: 0,
                                                            backgroundImage: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
                                                            backgroundSize: '200% 100%',
                                                            animation: `shimmer 2.5s ease-in-out ${originalIdx * 0.15}s infinite`,
                                                            pointerEvents: 'none',
                                                        }} />
                                                    )}

                                                    {/* Item image container with Canvas glow */}
                                                    <div style={{
                                                        position: 'relative',
                                                        width: isMobile ? '56px' : '70px',
                                                        height: isMobile ? '56px' : '70px',
                                                        zIndex: 1,
                                                    }}>
                                                        <CanvasResultItem
                                                            item={item}
                                                            size={isMobile ? 56 : 70}
                                                            isRecursionSpin={false}
                                                            isLuckySpin={isTripleLucky}
                                                            showAnimation={true}
                                                        />
                                                    </div>

                                                    {/* Item name */}
                                                    <span style={{
                                                        color: itemColor,
                                                        fontSize: isMobile ? '11px' : '13px',
                                                        fontWeight: '700',
                                                        textAlign: 'center',
                                                        maxWidth: isMobile ? '80px' : '105px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        position: 'relative',
                                                        zIndex: 1,
                                                        textShadow: isHighRarity ? `0 0 12px ${itemColor}50` : 'none',
                                                    }}>
                                                        {item.name}
                                                    </span>

                                                    {/* Drop chance for rare items in 5x spin */}
                                                    {showChance && item.chance && (
                                                        <span style={{
                                                            fontSize: isMobile ? '9px' : '10px',
                                                            color: '#fff',
                                                            fontWeight: '700',
                                                            backgroundImage: `linear-gradient(135deg, ${itemColor}cc, ${itemColor}99)`,
                                                            padding: '3px 10px',
                                                            borderRadius: '8px',
                                                            boxShadow: `0 0 12px ${itemColor}40`,
                                                            position: 'relative',
                                                            zIndex: 1,
                                                        }}>
                                                            {formatChance(item.chance)}%
                                                        </span>
                                                    )}

                                                    {/* NEW badge */}
                                                    {tripleNewItems[originalIdx] && (
                                                        <span style={{
                                                            backgroundImage: `linear-gradient(135deg, ${COLORS.green}, ${COLORS.aqua})`,
                                                            color: COLORS.bg,
                                                            fontSize: '9px',
                                                            fontWeight: '800',
                                                            padding: '4px 12px',
                                                            borderRadius: '8px',
                                                            boxShadow: `0 0 15px ${COLORS.green}50`,
                                                            animation: 'pulse 1.5s ease-in-out infinite',
                                                            letterSpacing: '0.5px',
                                                            position: 'relative',
                                                            zIndex: 1,
                                                        }}>★ NEW</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

        </div>
    );
}

// Memoize to prevent unnecessary re-renders
// Animation uses direct DOM manipulation so collection changes won't cause stutter
export const WheelSpinner = memo(WheelSpinnerComponent, (prevProps, nextProps) => {
    // Return true if props are equal (skip re-render)
    // Return false if props are different (re-render)
    return (
        prevProps.user?.id === nextProps.user?.id &&
        prevProps.allItems === nextProps.allItems &&
        prevProps.dynamicItems === nextProps.dynamicItems &&
        prevProps.onSpinComplete === nextProps.onSpinComplete &&
        prevProps.collection === nextProps.collection
    );
});