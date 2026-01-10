import React, { useState, useEffect, useRef, memo } from 'react';
import {
    Crown, Sparkles, Star, Diamond, ChevronDown, ChevronUp, Zap, X,
    Calculator, BarChart3, Info, AlertTriangle, Scale,
    Gift, Shuffle, Repeat, Layers, Database, Server
} from 'lucide-react';
import { OddsInfoModal } from './OddsInfoModal.jsx';
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
    const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
    const [showOddsInfo, setShowOddsInfo] = useState(false);
    const animationRef = useRef(null);

    // Mobile-specific dimensions - taller strip with more items visible
    const MOBILE_STRIP_HEIGHT = 400;
    const MOBILE_STRIP_WIDTH = 140;
    const MOBILE_ITEM_WIDTH = 90;

    // Use refs for animation offsets to avoid re-renders during animation
    const stripRef = useRef(null);
    const offsetRef = useRef(0);

    // Triple spin state
    const [tripleStrips, setTripleStrips] = useState([[], [], [], [], []]);
    const [tripleResults, setTripleResults] = useState([null, null, null, null, null]);
    const [tripleNewItems, setTripleNewItems] = useState([false, false, false, false, false]);
    const tripleAnimationRefs = useRef([null, null, null, null, null]);
    const tripleStripRefs = useRef([null, null, null, null, null]);
    const tripleOffsetRefs = useRef([0, 0, 0, 0, 0]);

    // Bonus wheel state - using horizontal strip like main wheel
    const [bonusStrip, setBonusStrip] = useState([]);
    const [bonusOffset, setBonusOffset] = useState(0);
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
                if (state === 'result' || state === 'tripleResult' || state === 'luckyResult' || state === 'tripleLuckyResult') {
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
        const finalIndex = length - 8;

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

                if (newItem) {
                    newStrip.push(newItem);
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

                    // Update only the final item in the strip, preserving all other items
                    // This prevents visible items from randomly changing during the animation
                    setStrip(prevStrip => {
                        const newStrip = [...prevStrip];
                        const finalIndex = newStrip.length - 8;
                        if (finalIndex >= 0 && finalIndex < newStrip.length) {
                            newStrip[finalIndex] = finalItem;
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

                // Direct DOM manipulation - no React re-render
                if (stripRef.current) {
                    if (isMobile) {
                        stripRef.current.style.top = `${(MOBILE_STRIP_HEIGHT / 2) - (MOBILE_ITEM_WIDTH / 2) - offsetRef.current}px`;
                    } else {
                        stripRef.current.style.transform = `translateX(calc(50% - ${offsetRef.current}px - ${ITEM_WIDTH / 2}px))`;
                    }
                }

                if (progress < 1 && !animationCancelledRef.current) {
                    animationRef.current = requestAnimationFrame(animate);
                } else if (!animationCancelledRef.current) {
                    // Animation complete - wait for API if needed, then finish
                    apiCall.then((result) => {
                        // Check for cancellation before updating state
                        if (animationCancelledRef.current || result === null) return;
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
        const BONUS_ITEM_WIDTH = 140;
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
        setBonusOffset(0);

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
            setBonusOffset(eased * finalOffset);

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

                // Direct DOM manipulation for smooth animation
                if (stripRef.current) {
                    if (isMobile) {
                        stripRef.current.style.top = `${(MOBILE_STRIP_HEIGHT / 2) - (MOBILE_ITEM_WIDTH / 2) - offsetRef.current}px`;
                    } else {
                        stripRef.current.style.transform = `translateX(calc(50% - ${offsetRef.current}px - ${ITEM_WIDTH / 2}px))`;
                    }
                }

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

                        tripleOffsetRefs.current[rowIndex] = eased * finalOffset;

                        // Direct DOM manipulation - no React re-render
                        if (tripleStripRefs.current[rowIndex]) {
                            if (isMobile) {
                                // Mobile uses top positioning with transform for smooth animation
                                tripleStripRefs.current[rowIndex].style.transform =
                                    `translateY(-${tripleOffsetRefs.current[rowIndex]}px)`;
                            } else {
                                tripleStripRefs.current[rowIndex].style.transform =
                                    `translateX(calc(50% - ${tripleOffsetRefs.current[rowIndex]}px - ${tripleItemWidth / 2}px))`;
                            }
                        }

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
            // Use responsive item width for animation - must match the display
            const tripleItemWidth = isMobile ? 70 : ITEM_WIDTH;
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
                        tripleOffsetRefs.current[rowIndex] = eased * finalOffset;

                        const stripEl = tripleStripRefs.current[rowIndex];
                        if (stripEl) {
                            if (isMobile) {
                                // Use transform for smoother animation, matching the initial position
                                stripEl.style.transform = `translateY(-${tripleOffsetRefs.current[rowIndex]}px)`;
                            } else {
                                stripEl.style.transform = `translateX(calc(50% - ${tripleOffsetRefs.current[rowIndex]}px - ${tripleItemWidth / 2}px))`;
                            }
                        }

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
        setStrip([]);
        setIsNewItem(false);
        setTripleStrips([[], [], [], [], []]);
        tripleOffsetRefs.current = [0, 0, 0, 0, 0];
        setTripleResults([null, null, null, null, null]);
        setTripleNewItems([false, false, false, false, false]);
        setSelectedEvent(null);
        setBonusStrip([]);
        setBonusOffset(0);
        setLuckyResult(null);
        setIsLuckyNew(false);
    };

    const isDisabled = !user || allItems.length === 0;
    // Calculate total item count - use dynamicItems if available (from API), otherwise use fallback constants
    const hasApiData = dynamicItems && dynamicItems.length > 0;
    const totalItemCount = hasApiData
        ? allItems.length + dynamicItems.length
        : allItems.length + TEAM_MEMBERS.length + RARE_MEMBERS.length + 1; // +1 for mythic

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
        const showRarityAura = isSpinning && (isSpecialType || spinIsRecursion);

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
                                : isWinning ? COLORS.gold
                                    : isInsane ? COLORS.insane
                                        : isMythic ? COLORS.aqua
                                            : isSpecial ? COLORS.purple
                                                : isRare ? COLORS.red
                                                    : (isSpinning && spinIsRecursion) ? `${COLORS.recursion}44`
                                                        : COLORS.border
                    }`,
                    boxShadow: shouldAnimate ? (
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
                                                    ? `0 0 20px ${COLORS.gold}66`
                                                    : 'none'
                    ) : 'none',
                    animation: shouldAnimate ? (
                        isRecursion ? 'recursionGlow 0.5s ease-in-out infinite'
                            : isEvent ? 'eventGlow 1.5s ease-in-out infinite'
                                : isInsane ? 'insaneGlow 0.8s ease-in-out infinite'
                                    : isMythic ? 'mythicGlow 1s ease-in-out infinite'
                                        : isSpecial ? 'specialGlow 1.5s ease-in-out infinite'
                                            : isRare ? 'rareGlow 1.5s ease-in-out infinite'
                                                : 'none'
                    ) : 'none'
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


    // Idle state - show clickable wheel
    if (state === 'idle') {
        // Show green effects only if user has recursion spins remaining
        const showRecursionEffects = recursionActive && recursionSpinsRemaining > 0;

        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                position: 'relative',
                minHeight: '320px', // Prevent layout shift when transitioning to spin state
                justifyContent: 'center',
            }}>
                {/* Recursion glow effect behind wheel */}
                {showRecursionEffects && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -60%)',
                        width: '220px',
                        height: '220px',
                        background: `radial-gradient(circle, ${COLORS.recursion}33 0%, transparent 70%)`,
                        borderRadius: '50%',
                        animation: 'recursionPulse 2s ease-in-out infinite',
                        pointerEvents: 'none',
                    }} />
                )}
                <button
                    onClick={spin}
                    disabled={isDisabled}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        transition: 'transform 0.3s, filter 0.3s',
                        filter: showRecursionEffects
                            ? `drop-shadow(0 0 20px ${COLORS.recursion}) drop-shadow(0 0 40px ${COLORS.recursion}66)`
                            : 'drop-shadow(0 8px 24px rgba(255, 170, 0, 0.3))',
                        opacity: isDisabled ? 0.5 : 1,
                        animation: showRecursionEffects ? 'matrixGlitch 3s ease-in-out infinite' : 'none',
                    }}
                    onMouseEnter={e => {
                        if (!isDisabled) {
                            e.currentTarget.style.transform = 'scale(1.05) translateY(-4px)';
                            e.currentTarget.style.filter = showRecursionEffects
                                ? `drop-shadow(0 0 30px ${COLORS.recursion}) drop-shadow(0 0 60px ${COLORS.recursion}88)`
                                : 'drop-shadow(0 12px 32px rgba(255, 170, 0, 0.5))';
                        }
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'scale(1) translateY(0)';
                        e.currentTarget.style.filter = showRecursionEffects
                            ? `drop-shadow(0 0 20px ${COLORS.recursion}) drop-shadow(0 0 40px ${COLORS.recursion}66)`
                            : 'drop-shadow(0 8px 24px rgba(255, 170, 0, 0.3))';
                    }}
                >
                    <img
                        src={WHEEL_TEXTURE_URL}
                        alt="Spin the wheel"
                        style={{ width: '180px', height: 'auto', imageRendering: 'pixelated' }}
                    />
                </button>

                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        color: (recursionActive && recursionSpinsRemaining > 0) ? COLORS.recursion : COLORS.gold,
                        fontSize: '16px',
                        fontWeight: '600',
                        marginBottom: '4px',
                        textShadow: (recursionActive && recursionSpinsRemaining > 0) ? `0 0 10px ${COLORS.recursion}` : 'none',
                    }}>
                        {!user ? 'Login to spin!' : allItems.length === 0 ? 'Loading items...' : (recursionActive && recursionSpinsRemaining > 0) ? `⚡ ${recursionSpinsRemaining} LUCKY SPIN${recursionSpinsRemaining !== 1 ? 'S' : ''}! ⚡` : 'Click to spin!'}
                    </div>
                    <div style={{ color: COLORS.textMuted, fontSize: '12px' }}>
                        {(recursionActive && recursionSpinsRemaining > 0)
                            ? <span style={{ color: COLORS.recursion }}>Equal chance for ALL items!</span>
                            : allItems.length > 0 && `Win one of ${totalItemCount} items!`
                        }
                    </div>
                    {error && (
                        <div style={{
                            marginTop: '12px',
                            padding: '10px 16px',
                            background: `${COLORS.red}22`,
                            border: `1px solid ${COLORS.red}44`,
                            borderRadius: '8px',
                            color: COLORS.red,
                            fontSize: '13px',
                            fontWeight: '500'
                        }}>
                            Warning: {error}
                        </div>
                    )}

                    {/* Info button */}
                    <button
                        onClick={() => setShowOddsInfo(true)}
                        style={{
                            marginTop: '12px',
                            padding: '6px 14px',
                            borderRadius: '16px',
                            background: 'transparent',
                            border: `1px solid ${COLORS.border}`,
                            color: COLORS.textMuted,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.aqua; e.currentTarget.style.color = COLORS.aqua; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}
                    >
                        <span style={{ fontSize: '13px' }}>?</span> How odds work
                    </button>
                </div>

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

    // Spinning or Result state - RESTORED beautiful animation
    // Use ref for visual effects during spin to prevent mid-animation changes
    const showSpinRecursionEffects = state === 'spinning' ? currentSpinIsRecursionRef.current : (recursionActive && recursionSpinsRemaining > 0);

    return (
        <div style={{
            background: showSpinRecursionEffects ? `linear-gradient(135deg, ${COLORS.recursionDark} 0%, #0a1a0a 50%, ${COLORS.recursionDark} 100%)` : COLORS.bgLight,
            borderRadius: '16px',
            padding: '24px',
            border: showSpinRecursionEffects ? `2px solid ${COLORS.recursion}66` : `1px solid ${COLORS.border}`,
            width: '100%',
            boxSizing: 'border-box',
            boxShadow: showSpinRecursionEffects ? `0 0 30px ${COLORS.recursion}22, inset 0 0 60px ${COLORS.recursion}11` : 'none',
            transition: 'all 0.5s ease-out',
            minHeight: '320px', // Match idle state to prevent layout shift
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

            {/* Header with spinning wheel icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
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
                        {state === 'spinning' ? (showSpinRecursionEffects ? '⚡ Lucky Spinning...' : 'Spinning...') :
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

            {/* Spinner Container - RESTORED with all visual effects */}
            {/* Hidden during bonus wheel, lucky spin, and triple spin (they have their own displays) */}
            {state !== 'bonusWheel' && state !== 'bonusResult' && state !== 'luckySpinning' && state !== 'luckyResult' && state !== 'tripleSpinning' && state !== 'tripleResult' && state !== 'tripleLuckySpinning' && state !== 'tripleLuckyResult' && (
                <div
                    onClick={() => {
                        if (!isMobile || !user || allItems.length === 0) return;
                        if (state === 'result') {
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
                        borderRadius: isMobile ? '12px' : '8px',
                        background: showSpinRecursionEffects ? COLORS.recursionDark : COLORS.bg,
                        border: showSpinRecursionEffects ? `2px solid ${COLORS.recursion}` : `1px solid ${COLORS.border}`,
                        margin: isMobile ? '0 auto' : '0',
                        boxShadow: showSpinRecursionEffects ? `0 0 20px ${COLORS.recursion}66, 0 0 40px ${COLORS.recursion}33, inset 0 0 30px ${COLORS.recursion}22` : 'none',
                        transition: 'all 0.3s ease-out',
                        cursor: isMobile && (state === 'idle' || state === 'result') ? 'pointer' : 'default',
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

                    {/* Center Indicator Line */}
                    <div style={{
                        position: 'absolute',
                        ...(isMobile ? {
                            left: 0, right: 0, top: '50%', transform: 'translateY(-50%)',
                            height: showSpinRecursionEffects ? '3px' : '3px'
                        } : {
                            top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)',
                            width: showSpinRecursionEffects ? '3px' : '3px'
                        }),
                        background: showSpinRecursionEffects ? COLORS.recursion : COLORS.gold,
                        zIndex: 10,
                        boxShadow: showSpinRecursionEffects
                            ? `0 0 10px ${COLORS.recursion}, 0 0 20px ${COLORS.recursion}88`
                            : `0 0 16px ${COLORS.gold}88`,
                        transition: 'all 0.3s ease-out',
                    }} />

                    {/* Pointer - Normal triangle for regular, bracket for recursion */}
                    {showSpinRecursionEffects ? (
                        <>
                            {/* Top Bracket for recursion */}
                            <div style={{
                                position: 'absolute',
                                ...(isMobile ? {
                                    left: '-4px', top: '50%', transform: 'translateY(-50%)',
                                } : {
                                    top: '-4px', left: '50%', transform: 'translateX(-50%)',
                                }),
                                zIndex: 11,
                                filter: `drop-shadow(0 0 6px ${COLORS.recursion}) drop-shadow(0 0 12px ${COLORS.recursion}88)`,
                            }}>
                                <div style={{
                                    ...(isMobile ? {
                                        width: '8px',
                                        height: '18px',
                                        borderTop: `2px solid ${COLORS.recursion}`,
                                        borderBottom: `2px solid ${COLORS.recursion}`,
                                        borderLeft: `2px solid ${COLORS.recursion}`,
                                        borderRight: 'none',
                                        borderRadius: '3px 0 0 3px',
                                    } : {
                                        width: '18px',
                                        height: '8px',
                                        borderLeft: `2px solid ${COLORS.recursion}`,
                                        borderRight: `2px solid ${COLORS.recursion}`,
                                        borderTop: `2px solid ${COLORS.recursion}`,
                                        borderBottom: 'none',
                                        borderRadius: '3px 3px 0 0',
                                    }),
                                }} />
                            </div>
                            {/* Bottom Bracket for recursion */}
                            <div style={{
                                position: 'absolute',
                                ...(isMobile ? {
                                    right: '-4px', top: '50%', transform: 'translateY(-50%)',
                                } : {
                                    bottom: '-4px', left: '50%', transform: 'translateX(-50%)',
                                }),
                                zIndex: 11,
                                filter: `drop-shadow(0 0 6px ${COLORS.recursion}) drop-shadow(0 0 12px ${COLORS.recursion}88)`,
                            }}>
                                <div style={{
                                    ...(isMobile ? {
                                        width: '8px',
                                        height: '18px',
                                        borderTop: `2px solid ${COLORS.recursion}`,
                                        borderBottom: `2px solid ${COLORS.recursion}`,
                                        borderRight: `2px solid ${COLORS.recursion}`,
                                        borderLeft: 'none',
                                        borderRadius: '0 3px 3px 0',
                                    } : {
                                        width: '18px',
                                        height: '8px',
                                        borderLeft: `2px solid ${COLORS.recursion}`,
                                        borderRight: `2px solid ${COLORS.recursion}`,
                                        borderBottom: `2px solid ${COLORS.recursion}`,
                                        borderTop: 'none',
                                        borderRadius: '0 0 3px 3px',
                                    }),
                                }} />
                            </div>
                        </>
                    ) : (
                        /* Normal triangle pointer for regular spins */
                        <div style={{
                            position: 'absolute',
                            ...(isMobile ? {
                                left: '-2px', top: '50%', transform: 'translateY(-50%)',
                                width: 0, height: 0,
                                borderTop: '8px solid transparent', borderBottom: '8px solid transparent',
                                borderLeft: `12px solid ${COLORS.gold}`
                            } : {
                                top: '-2px', left: '50%', transform: 'translateX(-50%)',
                                width: 0, height: 0,
                                borderLeft: '8px solid transparent', borderRight: '8px solid transparent',
                                borderTop: `12px solid ${COLORS.gold}`
                            }),
                            zIndex: 11,
                            filter: `drop-shadow(0 2px 4px ${COLORS.gold}66)`,
                        }} />
                    )}

                    {/* Edge fade gradients */}
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: isMobile
                            ? `linear-gradient(180deg, ${showSpinRecursionEffects ? COLORS.recursionDark : COLORS.bg} 0%, transparent 20%, transparent 80%, ${showSpinRecursionEffects ? COLORS.recursionDark : COLORS.bg} 100%)`
                            : `linear-gradient(90deg, ${showSpinRecursionEffects ? COLORS.recursionDark : COLORS.bg} 0%, transparent 15%, transparent 85%, ${showSpinRecursionEffects ? COLORS.recursionDark : COLORS.bg} 100%)`,
                        zIndex: 5, pointerEvents: 'none'
                    }} />

                    {/* Item Strip */}
                    <div
                        ref={stripRef}
                        style={{
                            position: isMobile ? 'absolute' : 'relative',
                            display: 'flex',
                            flexDirection: isMobile ? 'column' : 'row',
                            alignItems: 'center',
                            willChange: 'transform, top',
                            ...(isMobile ? {
                                left: '50%', marginLeft: `-${MOBILE_ITEM_WIDTH / 2}px`,
                                top: `${(MOBILE_STRIP_HEIGHT / 2) - (MOBILE_ITEM_WIDTH / 2)}px`
                            } : {
                                height: '100%',
                                transform: `translateX(calc(50% - ${ITEM_WIDTH / 2}px))`
                            })
                        }}
                    >
                        {strip.map((item, idx) => {
                            const isWinningItem = idx === FINAL_INDEX && (state === 'result' || state === 'event');
                            const isSpinning = state === 'spinning';
                            const stripItemWidth = isMobile ? MOBILE_ITEM_WIDTH : ITEM_WIDTH;
                            return (
                                <div key={idx} style={{
                                    width: `${stripItemWidth}px`, height: `${stripItemWidth}px`, flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    ...(isMobile
                                        ? { borderBottom: `1px solid ${showSpinRecursionEffects ? COLORS.recursion + '33' : COLORS.border + '33'}` }
                                        : { borderRight: `1px solid ${showSpinRecursionEffects ? COLORS.recursion + '33' : COLORS.border + '33'}` })
                                }}>
                                    {renderItemBox(item, idx, isWinningItem, isMobile ? 60 : 52, isSpinning)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Result Display - EXACT COPY FROM old_wheel.jsx */}
            {state === 'result' && result && (
                <div style={{
                    marginTop: '24px',
                    padding: '32px 24px',
                    background: resultWasRecursionSpin
                        ? `radial-gradient(ellipse at center, ${COLORS.recursion}20 0%, ${COLORS.recursionDark}40 40%, ${COLORS.bg} 70%)`
                        : isInsaneItem(result)
                            ? `radial-gradient(ellipse at center, ${COLORS.insane}25 0%, #FFF5B015 30%, ${COLORS.bg} 70%)`
                            : isMythicItem(result)
                                ? `radial-gradient(ellipse at center, ${COLORS.aqua}15 0%, ${COLORS.purple}10 50%, ${COLORS.bg} 70%)`
                                : isSpecialItem(result)
                                    ? `radial-gradient(ellipse at center, ${COLORS.purple}22 0%, ${COLORS.bg} 70%)`
                                    : isRareItem(result)
                                        ? `radial-gradient(ellipse at center, ${COLORS.red}18 0%, ${COLORS.bg} 70%)`
                                        : `radial-gradient(ellipse at center, ${COLORS.bgLighter} 0%, ${COLORS.bg} 70%)`,
                    borderRadius: '12px',
                    border: resultWasRecursionSpin
                        ? `2px solid ${COLORS.recursion}88`
                        : `1px solid ${isInsaneItem(result) ? COLORS.insane + '88' : isMythicItem(result) ? COLORS.aqua + '66' : isSpecialItem(result) ? COLORS.purple + '66' : isRareItem(result) ? COLORS.red + '66' : COLORS.gold + '44'}`,
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    animation: isInsaneItem(result) ? 'insanePulse 1.5s ease-in-out infinite, resultSlideIn 0.4s ease-out' : 'resultSlideIn 0.4s ease-out',
                    boxShadow: resultWasRecursionSpin ? `0 0 25px ${COLORS.recursion}44, 0 0 50px ${COLORS.recursion}22, inset 0 0 30px ${COLORS.recursion}11` : 'none',
                }}>
                    {/* Recursion scanlines overlay */}
                    {resultWasRecursionSpin && (
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px)',
                            pointerEvents: 'none',
                            zIndex: 0,
                        }} />
                    )}

                    {/* Recursion Lucky Spin badge */}
                    {resultWasRecursionSpin && (
                        <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: `linear-gradient(135deg, ${COLORS.recursion}dd 0%, ${COLORS.recursion}99 100%)`,
                            color: '#000',
                            fontSize: '10px',
                            fontWeight: '800',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                            boxShadow: `0 0 10px ${COLORS.recursion}66`,
                            zIndex: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}>
                            <Zap size={10} /> LUCKY
                        </div>
                    )}

                    {/* Floating particles - MORE for insane, GREEN for recursion */}
                    {[...Array(resultWasRecursionSpin ? 16 : isInsaneItem(result) ? 30 : isMythicItem(result) ? 20 : 12)].map((_, i) => (
                        <div key={i} style={{
                            position: 'absolute',
                            width: isInsaneItem(result) ? '10px' : isMythicItem(result) ? '8px' : '6px',
                            height: isInsaneItem(result) ? '10px' : isMythicItem(result) ? '8px' : '6px',
                            background: resultWasRecursionSpin
                                ? COLORS.recursion
                                : isInsaneItem(result)
                                    ? (i % 4 === 0 ? COLORS.insane : i % 4 === 1 ? '#FFF5B0' : i % 4 === 2 ? '#FFEC8B' : '#FFE135')
                                    : isMythicItem(result)
                                        ? (i % 3 === 0 ? COLORS.aqua : i % 3 === 1 ? COLORS.purple : COLORS.gold)
                                        : isSpecialItem(result) ? COLORS.purple
                                            : isRareItem(result) ? COLORS.red
                                                : COLORS.gold,
                            borderRadius: '50%',
                            left: `${5 + Math.random() * 90}%`,
                            top: '85%',
                            opacity: 0,
                            animation: `floatParticle ${isInsaneItem(result) ? '1.2s' : isMythicItem(result) ? '1.5s' : '2s'} ease-out ${i * 0.08}s infinite`,
                            boxShadow: `0 0 ${isInsaneItem(result) ? '10px' : '6px'} ${isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : COLORS.gold}`
                        }} />
                    ))}

                    {/* Extra shimmer overlay for insane */}
                    {isInsaneItem(result) && (
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            background: `linear-gradient(90deg, transparent 0%, ${COLORS.insane}15 50%, transparent 100%)`,
                            backgroundSize: '200% 100%',
                            animation: 'insaneShimmer 2s ease-in-out infinite',
                            pointerEvents: 'none'
                        }} />
                    )}

                    {/* Badge Header */}
                    <div style={{
                        color: COLORS.textMuted, fontSize: '11px', textTransform: 'uppercase',
                        letterSpacing: '3px', marginBottom: '20px', position: 'relative', zIndex: 1,
                        animation: 'fadeSlideDown 0.3s ease-out',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                    }}>
                        {isInsaneItem(result) ? (
                            <span style={{
                                background: `linear-gradient(135deg, ${COLORS.insane}, #FFF5B0, ${COLORS.insane})`,
                                backgroundSize: '200% 200%',
                                color: '#1a1a1a', fontSize: '10px', fontWeight: '800', padding: '5px 14px',
                                borderRadius: '4px', animation: 'mythicBadge 1.5s ease-in-out infinite',
                                textShadow: '0 0 10px rgba(255,255,255,0.5)',
                                boxShadow: `0 0 20px ${COLORS.insane}88`,
                                display: 'inline-flex', alignItems: 'center', gap: '6px'
                            }}><Crown size={12} /> INSANE <Crown size={12} /></span>
                        ) : isMythicItem(result) ? (
                            <span style={{
                                background: `linear-gradient(135deg, ${COLORS.aqua}, ${COLORS.purple}, ${COLORS.gold})`,
                                backgroundSize: '200% 200%',
                                color: '#fff', fontSize: '9px', fontWeight: '700', padding: '4px 12px',
                                borderRadius: '4px', animation: 'mythicBadge 2s ease-in-out infinite',
                                textShadow: '0 0 10px rgba(0,0,0,0.5)'
                            }}>MYTHIC</span>
                        ) : isSpecialItem(result) ? (
                            <span style={{
                                background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.gold})`,
                                color: '#fff', fontSize: '9px', fontWeight: '700', padding: '3px 10px',
                                borderRadius: '4px', animation: 'newBadgePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both'
                            }}>LEGENDARY</span>
                        ) : isRareItem(result) ? (
                            <span style={{
                                background: `linear-gradient(135deg, ${COLORS.red}, ${COLORS.orange})`,
                                color: '#fff', fontSize: '9px', fontWeight: '700', padding: '3px 10px',
                                borderRadius: '4px', animation: 'newBadgePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both'
                            }}>RARE</span>
                        ) : isNewItem && (
                            <span style={{
                                background: COLORS.green, color: COLORS.bg, fontSize: '9px', fontWeight: '700',
                                padding: '3px 8px', borderRadius: '4px',
                                animation: 'newBadgePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both'
                            }}>NEW</span>
                        )}
                        You received
                    </div>

                    {/* Item Display */}
                    <div style={{
                        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                        alignItems: 'center', justifyContent: 'center', gap: isMobile ? '16px' : '24px',
                        position: 'relative', zIndex: 1
                    }}>
                        {/* Item container with glow */}
                        <div style={{ position: 'relative', animation: 'itemReveal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                            {/* Pulsing glow ring */}
                            <div style={{
                                position: 'absolute', top: '-10px', left: '-10px', right: '-10px', bottom: '-10px',
                                borderRadius: '16px',
                                background: isInsaneItem(result)
                                    ? `radial-gradient(circle, ${COLORS.insane}55 0%, #FFF5B033 50%, transparent 70%)`
                                    : isMythicItem(result)
                                        ? `radial-gradient(circle, ${COLORS.aqua}44 0%, ${COLORS.purple}22 50%, transparent 70%)`
                                        : `radial-gradient(circle, ${isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : COLORS.gold}33 0%, transparent 70%)`,
                                animation: isInsaneItem(result) ? 'insanePulse 1s ease-in-out infinite' : 'pulseGlow 1.5s ease-in-out infinite'
                            }} />

                            <div style={{
                                width: '80px', height: '80px',
                                background: isInsaneItem(result)
                                    ? `linear-gradient(135deg, ${COLORS.insane}44, #FFF5B044, ${COLORS.insane}44)`
                                    : isMythicItem(result)
                                        ? `linear-gradient(135deg, ${COLORS.aqua}33, ${COLORS.purple}33, ${COLORS.gold}33)`
                                        : isSpecialItem(result)
                                            ? `linear-gradient(135deg, ${COLORS.purple}33, ${COLORS.gold}33)`
                                            : isRareItem(result)
                                                ? `linear-gradient(135deg, ${COLORS.red}33, ${COLORS.orange}33)`
                                                : COLORS.bgLight,
                                borderRadius: '12px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: `3px solid ${isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : COLORS.gold}`,
                                boxShadow: isInsaneItem(result)
                                    ? `0 0 40px ${COLORS.insane}88, 0 0 80px ${COLORS.insane}55, 0 0 120px #FFF5B033`
                                    : isMythicItem(result)
                                        ? `0 0 30px ${COLORS.aqua}66, 0 0 60px ${COLORS.purple}44, 0 0 90px ${COLORS.gold}22`
                                        : isSpecialItem(result)
                                            ? `0 0 30px ${COLORS.purple}66, 0 0 60px ${COLORS.purple}33, 0 0 90px ${COLORS.gold}22`
                                            : isRareItem(result)
                                                ? `0 0 30px ${COLORS.red}66, 0 0 60px ${COLORS.red}33, 0 0 90px ${COLORS.orange}22`
                                                : `0 0 30px ${COLORS.gold}44, 0 0 60px ${COLORS.gold}22, inset 0 0 20px ${COLORS.gold}11`,
                                position: 'relative',
                                animation: isInsaneItem(result) ? 'insaneGlow 0.8s ease-in-out infinite' : isMythicItem(result) ? 'mythicGlow 1s ease-in-out infinite' : isSpecialItem(result) ? 'specialGlow 1.5s ease-in-out infinite' : isRareItem(result) ? 'rareGlow 1.5s ease-in-out infinite' : 'none'
                            }}>
                                <img
                                    src={getItemImageUrl(result)}
                                    alt={result.name}
                                    style={{
                                        width: '56px', height: '56px',
                                        imageRendering: (isInsaneItem(result) || isSpecialItem(result) || isRareItem(result) || result.username) ? 'auto' : 'pixelated',
                                        borderRadius: (isInsaneItem(result) || isSpecialItem(result) || isRareItem(result) || result.username) ? '6px' : '0',
                                        animation: 'itemBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                        filter: `drop-shadow(0 0 8px ${isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : 'rgba(255, 170, 0, 0.5)'})`
                                    }}
                                    onError={(e) => { e.target.onerror = null; e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }}
                                />
                            </div>

                            {/* Sparkle effects - MORE for insane */}
                            {[...Array(isInsaneItem(result) ? 12 : isMythicItem(result) ? 8 : 4)].map((_, i) => (
                                <div key={i} style={{
                                    position: 'absolute', width: '8px', height: '8px',
                                    top: ['0%', '10%', '80%', '70%', '20%', '60%', '40%', '90%', '15%', '75%', '30%', '85%'][i],
                                    left: ['10%', '85%', '5%', '90%', '0%', '95%', '100%', '50%', '92%', '8%', '98%', '2%'][i],
                                    animation: `sparkle ${isInsaneItem(result) ? '0.8s' : '1s'} ease-in-out ${i * 0.1}s infinite`
                                }}>
                                    <div style={{
                                        width: '100%', height: '2px',
                                        background: isInsaneItem(result)
                                            ? (i % 4 === 0 ? COLORS.insane : i % 4 === 1 ? '#FFF5B0' : i % 4 === 2 ? '#FFEC8B' : '#FFE135')
                                            : isMythicItem(result)
                                                ? (i % 3 === 0 ? COLORS.aqua : i % 3 === 1 ? COLORS.purple : COLORS.gold)
                                                : isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : COLORS.gold,
                                        position: 'absolute', top: '50%', left: '0', transform: 'translateY(-50%)',
                                        borderRadius: '1px',
                                        boxShadow: `0 0 4px ${isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : COLORS.gold}`
                                    }} />
                                    <div style={{
                                        width: '2px', height: '100%',
                                        background: isInsaneItem(result)
                                            ? (i % 4 === 0 ? COLORS.insane : i % 4 === 1 ? '#FFF5B0' : i % 4 === 2 ? '#FFEC8B' : '#FFE135')
                                            : isMythicItem(result)
                                                ? (i % 3 === 0 ? COLORS.aqua : i % 3 === 1 ? COLORS.purple : COLORS.gold)
                                                : isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : COLORS.gold,
                                        position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)',
                                        borderRadius: '1px',
                                        boxShadow: `0 0 4px ${isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : COLORS.gold}`
                                    }} />
                                </div>
                            ))}
                        </div>

                        {/* Name and drop rate */}
                        <div style={{
                            display: 'flex', flexDirection: 'column',
                            alignItems: isMobile ? 'center' : 'flex-start', gap: '4px',
                            animation: 'textReveal 0.4s ease-out 0.1s both',
                            textAlign: isMobile ? 'center' : 'left'
                        }}>
                            <span style={{
                                color: isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : COLORS.gold,
                                fontSize: '24px', fontWeight: '600',
                                textShadow: `0 0 20px ${isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : COLORS.gold}44`
                            }}>
                                {result.name}
                            </span>

                            {(isInsaneItem(result) || isMythicItem(result) || isSpecialItem(result) || isRareItem(result)) && result.chance ? (
                                <span style={{
                                    fontSize: '14px',
                                    color: isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : COLORS.red,
                                    fontWeight: '700',
                                    background: `${isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : COLORS.red}25`,
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    marginTop: '6px',
                                    textShadow: `0 0 10px ${isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : COLORS.red}88`,
                                    boxShadow: `0 0 15px ${isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : COLORS.red}33, inset 0 0 10px ${isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : COLORS.red}15`,
                                    border: `1px solid ${isInsaneItem(result) ? COLORS.insane : isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : COLORS.red}44`
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
                                    marginTop: '4px'
                                }}>
                                    {formatChance(result.equalChance)}% (equal chance)
                                </span>
                            ) : !isNewItem && collection[result.texture] > 1 && (
                                <span style={{ fontSize: '12px', color: COLORS.textMuted, fontWeight: '500' }}>
                                    x{collection[result.texture]} in collection
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* EVENT Display - Clean bonus event announcement */}
            {state === 'event' && (
                <div style={{
                    marginTop: isMobile ? '16px' : '24px',
                    padding: isMobile ? '24px' : '32px',
                    background: COLORS.bgLight,
                    borderRadius: '12px',
                    border: `2px solid ${COLORS.gold}`,
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Subtle gradient overlay */}
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: `linear-gradient(135deg, ${COLORS.gold}08 0%, transparent 50%, ${COLORS.orange}08 100%)`,
                        pointerEvents: 'none'
                    }} />

                    {/* Content */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        {/* Headline */}
                        <div style={{
                            fontSize: isMobile ? '22px' : '28px',
                            fontWeight: '700',
                            color: COLORS.gold,
                            marginBottom: '8px',
                            letterSpacing: '1px'
                        }}>
                            BONUS EVENT!
                        </div>

                        {/* Subtext */}
                        <div style={{
                            color: COLORS.textMuted,
                            fontSize: isMobile ? '13px' : '14px'
                        }}>
                            Spinning to determine your reward...
                        </div>
                    </div>
                </div>
            )}

            {/* RECURSION Display - Wheel within the wheel! */}
            {state === 'recursion' && (
                <div style={{
                    marginTop: isMobile ? '16px' : '24px',
                    padding: isMobile ? '24px' : '32px',
                    background: `linear-gradient(135deg, ${COLORS.recursionDark} 0%, ${COLORS.bg} 50%, ${COLORS.recursionDark} 100%)`,
                    borderRadius: '12px',
                    border: `3px solid ${COLORS.recursion}`,
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    animation: 'recursionPulse 1s ease-in-out infinite'
                }}>
                    {/* Matrix-style scanlines */}
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.05) 2px, rgba(0,255,0,0.05) 4px)',
                        pointerEvents: 'none'
                    }} />

                    {/* Glowing border effect */}
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        boxShadow: `inset 0 0 30px ${COLORS.recursion}44, inset 0 0 60px ${COLORS.recursion}22`,
                        pointerEvents: 'none'
                    }} />

                    {/* Content */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        {/* Headline with glitch effect */}
                        <div style={{
                            fontSize: isMobile ? '28px' : '36px',
                            fontWeight: '900',
                            color: COLORS.recursion,
                            marginBottom: '12px',
                            letterSpacing: '8px',
                            textShadow: `0 0 20px ${COLORS.recursion}, 0 0 40px ${COLORS.recursion}`,
                            fontFamily: 'monospace',
                            animation: 'recursionTextGlitch 0.5s ease-in-out infinite'
                        }}>
                            RECURSION
                        </div>

                        {/* Wheel icon */}
                        <div style={{
                            width: isMobile ? '60px' : '80px',
                            height: isMobile ? '60px' : '80px',
                            margin: '0 auto 12px',
                            animation: 'wheelSpin 2s linear infinite',
                            filter: `drop-shadow(0 0 15px ${COLORS.recursion})`
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
                            fontSize: isMobile ? '14px' : '16px',
                            fontFamily: 'monospace',
                            textShadow: `0 0 10px ${COLORS.recursion}88`
                        }}>
                            You hit the wheel in the wheel!
                        </div>

                        {/* Info */}
                        <div style={{
                            color: '#00FF0088',
                            fontSize: isMobile ? '12px' : '13px',
                            marginTop: '8px',
                            fontFamily: 'monospace'
                        }}>
                            Global lucky spin event triggered for ALL users!
                        </div>
                    </div>
                </div>
            )}

            {/* Bonus Wheel - horizontal strip spinner to select event */}
            {(state === 'bonusWheel' || state === 'bonusResult') && (
                <div style={{
                    marginTop: isMobile ? '20px' : '28px',
                    textAlign: 'center',
                    animation: 'fadeIn 0.4s ease-out'
                }}>
                    {/* Spinner header */}
                    {state === 'bonusWheel' && (
                        <div style={{
                            marginBottom: isMobile ? '12px' : '16px',
                            animation: 'fadeSlideDown 0.4s ease-out'
                        }}>
                            <div style={{
                                color: COLORS.gold,
                                fontSize: isMobile ? '13px' : '14px',
                                fontWeight: '600',
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                textShadow: `0 0 10px ${COLORS.gold}66`
                            }}>Selecting Your Bonus...</div>
                        </div>
                    )}

                    {/* Horizontal Strip Spinner */}
                    <div style={{
                        position: 'relative',
                        height: isMobile ? '72px' : '88px',
                        width: '100%',
                        maxWidth: isMobile ? '100%' : '450px',
                        margin: '0 auto',
                        overflow: 'hidden',
                        borderRadius: isMobile ? '12px' : '14px',
                        background: `linear-gradient(180deg, ${COLORS.bgLight} 0%, ${COLORS.bg}aa 50%, ${COLORS.bgLight} 100%)`,
                        border: `2px solid ${COLORS.gold}77`,
                        boxShadow: `0 0 ${isMobile ? '24px' : '40px'} ${COLORS.gold}44, inset 0 1px 0 ${COLORS.gold}33, inset 0 -3px 8px rgba(0,0,0,0.5)`,
                        animation: 'spinnerAppear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                        {/* Center Indicator - glowing energy beam */}
                        <div style={{
                            position: 'absolute',
                            top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '3px',
                            background: `linear-gradient(180deg, ${COLORS.gold}00 0%, ${COLORS.gold}77 15%, ${COLORS.gold}aa 50%, ${COLORS.gold}77 85%, ${COLORS.gold}00 100%)`,
                            zIndex: 10,
                            boxShadow: `0 0 12px ${COLORS.gold}cc, 0 0 24px ${COLORS.gold}88, 0 0 40px ${COLORS.gold}44, inset 0 0 8px ${COLORS.gold}77`,
                            animation: 'centerGlow 1.5s ease-in-out infinite'
                        }} />
                        {/* Top pointer - enhanced */}
                        <div style={{
                            position: 'absolute',
                            top: `-${isMobile ? '4px' : '6px'}`, left: '50%', transform: 'translateX(-50%)',
                            width: 0, height: 0,
                            borderLeft: `${isMobile ? '8' : '10'}px solid transparent`,
                            borderRight: `${isMobile ? '8' : '10'}px solid transparent`,
                            borderTop: `${isMobile ? '12' : '14'}px solid ${COLORS.gold}`,
                            zIndex: 11,
                            filter: `drop-shadow(0 -2px 6px ${COLORS.gold}cc) drop-shadow(0 0 12px ${COLORS.gold}88)`,
                            animation: 'pointerGlow 1s ease-in-out infinite'
                        }} />
                        {/* Bottom pointer - enhanced */}
                        <div style={{
                            position: 'absolute',
                            bottom: `-${isMobile ? '4px' : '6px'}`, left: '50%', transform: 'translateX(-50%)',
                            width: 0, height: 0,
                            borderLeft: `${isMobile ? '8' : '10'}px solid transparent`,
                            borderRight: `${isMobile ? '8' : '10'}px solid transparent`,
                            borderBottom: `${isMobile ? '12' : '14'}px solid ${COLORS.gold}`,
                            zIndex: 11,
                            filter: `drop-shadow(0 2px 6px ${COLORS.gold}cc) drop-shadow(0 0 12px ${COLORS.gold}88)`,
                            animation: 'pointerGlow 1s ease-in-out infinite'
                        }} />

                        {/* Gradient overlay - enhanced */}
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            background: `linear-gradient(90deg, ${COLORS.bg} 0%, transparent ${isMobile ? '12%' : '18%'}, transparent ${isMobile ? '88%' : '82%'}, ${COLORS.bg} 100%)`,
                            zIndex: 5, pointerEvents: 'none'
                        }} />

                        {/* Event Strip */}
                        <div style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            height: '100%',
                            transform: `translateX(calc(50% - ${bonusOffset}px - 70px))`
                        }}>
                            {bonusStrip.map((event, idx) => {
                                const isLucky = event.id === 'lucky_spin';
                                const isTriple = event.id === 'triple_spin';
                                const isTripleLucky = event.id === 'triple_lucky_spin';
                                const isLuckyType = isLucky || isTripleLucky;

                                return (
                                    <div key={idx} style={{
                                        width: '140px', height: '100%', flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        position: 'relative',
                                        background: isTripleLucky
                                            ? `linear-gradient(180deg, ${COLORS.gold}20 0%, ${COLORS.green}12 50%, ${COLORS.gold}18 100%)`
                                            : isLucky
                                                ? `linear-gradient(180deg, ${COLORS.green}15 0%, ${COLORS.aqua}08 50%, ${COLORS.green}12 100%)`
                                                : `linear-gradient(180deg, ${COLORS.orange}18 0%, ${COLORS.red}08 50%, ${COLORS.orange}15 100%)`
                                    }}>
                                        {/* Energy seam divider between items */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '15%', bottom: '15%', right: 0,
                                            width: '1px',
                                            background: `linear-gradient(180deg, transparent 0%, ${COLORS.gold}44 30%, ${COLORS.gold}66 50%, ${COLORS.gold}44 70%, transparent 100%)`,
                                            boxShadow: `0 0 4px ${COLORS.gold}33`
                                        }} />

                                        {/* Event badge with enhanced hierarchy */}
                                        <div style={{
                                            padding: isMobile
                                                ? (isLuckyType ? '8px 14px' : '7px 12px')
                                                : (isLuckyType ? '10px 18px' : '9px 16px'),
                                            background: isTripleLucky
                                                ? `linear-gradient(135deg, ${COLORS.gold}ee 0%, ${COLORS.green}bb 100%)`
                                                : isLucky
                                                    ? `linear-gradient(135deg, ${COLORS.green}dd 0%, ${COLORS.aqua}aa 100%)`
                                                    : `linear-gradient(135deg, ${COLORS.orange}dd 0%, ${COLORS.red}aa 100%)`,
                                            borderRadius: isLuckyType ? (isMobile ? '8px' : '10px') : (isMobile ? '8px' : '10px'),
                                            boxShadow: isTripleLucky
                                                ? `0 4px 12px ${COLORS.gold}88, 0 0 24px ${COLORS.green}66, inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -2px 4px rgba(0,0,0,0.3)`
                                                : isLucky
                                                    ? `0 4px 12px ${COLORS.green}77, 0 0 24px ${COLORS.green}55, inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.3)`
                                                    : `0 4px 12px ${COLORS.orange}66, 0 0 24px ${COLORS.orange}44, inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.3)`,
                                            border: isTripleLucky
                                                ? `1.5px solid ${COLORS.gold}aa`
                                                : isLucky
                                                    ? `1.5px solid ${COLORS.aqua}99`
                                                    : `1.5px solid ${COLORS.red}77`,
                                            transform: 'scale(1)',
                                            transition: 'all 0.3s ease',
                                            position: 'relative'
                                        }}>
                                            {/* Badge glow effect */}
                                            <div style={{
                                                position: 'absolute',
                                                top: '-8px', left: '-8px', right: '-8px', bottom: '-8px',
                                                background: isTripleLucky
                                                    ? `radial-gradient(circle, ${COLORS.gold}55 0%, transparent 70%)`
                                                    : isLucky
                                                        ? `radial-gradient(circle, ${COLORS.green}44 0%, transparent 70%)`
                                                        : `radial-gradient(circle, ${COLORS.orange}33 0%, transparent 70%)`,
                                                borderRadius: isLuckyType ? (isMobile ? '10px' : '12px') : (isMobile ? '10px' : '12px'),
                                                zIndex: -1,
                                                animation: 'subtlePulse 2s ease-in-out infinite'
                                            }} />
                                            <span style={{
                                                color: '#fff',
                                                fontSize: isMobile ? '11px' : '13px',
                                                fontWeight: '700',
                                                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                                whiteSpace: 'nowrap',
                                                letterSpacing: '0.5px',
                                                textTransform: 'uppercase'
                                            }}>
                                                {isTripleLucky ? 'TRIPLE LUCKY' : isLucky ? 'LUCKY SPIN' : isTriple ? '5X SPIN' : event.name}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Result text */}
                    {state === 'bonusResult' && selectedEvent && (
                        <div style={{ marginTop: isMobile ? '12px' : '16px', animation: 'itemReveal 0.3s ease-out' }}>
                            <span style={{
                                fontSize: isMobile ? '16px' : '18px',
                                fontWeight: '700',
                                color: selectedEvent.color,
                                textShadow: `0 0 15px ${selectedEvent.color}66`
                            }}>{selectedEvent.name}</span>
                            <span style={{ color: COLORS.textMuted, fontSize: isMobile ? '12px' : '13px', marginLeft: '8px' }}>{selectedEvent.description}</span>
                        </div>
                    )}
                </div>
            )}

            {/*Lucky Spin Display */}
            {(state === 'luckySpinning' || state === 'luckyResult') && (
                <div style={{ marginTop: isMobile ? '20px' : '28px', animation: 'fadeIn 0.4s ease-out' }}>
                    {/* Lucky badge - enhanced */}
                    <div style={{
                        textAlign: 'center',
                        marginBottom: isMobile ? '14px' : '18px',
                        padding: isMobile ? '10px 18px' : '12px 24px',
                        background: `linear-gradient(135deg, ${COLORS.green}33 0%, ${COLORS.aqua}22 100%)`,
                        borderRadius: isMobile ? '10px' : '12px',
                        border: `1.5px solid ${COLORS.green}66`,
                        boxShadow: `0 0 20px ${COLORS.green}44, inset 0 1px 0 ${COLORS.green}33`,
                        animation: 'bonusEventReveal 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                        <span style={{
                            color: COLORS.green,
                            fontSize: isMobile ? '13px' : '14px',
                            fontWeight: '800',
                            letterSpacing: '1.5px',
                            textTransform: 'uppercase',
                            textShadow: `0 0 12px ${COLORS.green}66`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}>
                           {state === 'luckyResult' ? 'Lucky Win!' : 'Lucky Spin'}
                        </span>
                        <div style={{
                            marginTop: '6px',
                            color: COLORS.textMuted,
                            fontSize: '11px',
                            fontWeight: '500',
                            letterSpacing: '0.5px'
                        }}>{state === 'luckyResult' ? 'You received' : 'Equal chance for all items'}</div>
                    </div>

                    {/* Reuse main spinner strip */}
                    <div style={{
                        position: 'relative',
                        height: isMobile ? `${MOBILE_STRIP_HEIGHT}px` : '100px',
                        width: isMobile ? `${MOBILE_STRIP_WIDTH}px` : '100%',
                        overflow: 'hidden',
                        borderRadius: '12px',
                        background: COLORS.bg,
                        border: `2px solid ${COLORS.green}`,
                        boxShadow: `0 0 20px ${COLORS.green}44`,
                        margin: isMobile ? '0 auto' : '0'
                    }}>
                        {/* Center indicator */}
                        <div style={{
                            position: 'absolute',
                            ...(isMobile ? {
                                left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', height: '3px',
                            } : {
                                top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '3px',
                            }),
                            background: COLORS.green, zIndex: 10, boxShadow: `0 0 12px ${COLORS.green}88`
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
                            zIndex: 11, filter: `drop-shadow(0 0 6px ${COLORS.green})`
                        }} />

                        {/* Gradient overlay */}
                        <div style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            background: isMobile
                                ? `linear-gradient(180deg, ${COLORS.bg} 0%, transparent 20%, transparent 80%, ${COLORS.bg} 100%)`
                                : `linear-gradient(90deg, ${COLORS.bg} 0%, transparent 15%, transparent 85%, ${COLORS.bg} 100%)`,
                            zIndex: 5, pointerEvents: 'none'
                        }} />

                        {/* Item Strip */}
                        <div
                            ref={stripRef}
                            style={{
                                position: isMobile ? 'absolute' : 'relative',
                                display: 'flex',
                                flexDirection: isMobile ? 'column' : 'row',
                                alignItems: 'center',
                                willChange: 'transform',
                                ...(isMobile ? {
                                    left: '50%', marginLeft: `-${MOBILE_ITEM_WIDTH / 2}px`,
                                    top: `${(MOBILE_STRIP_HEIGHT / 2) - (MOBILE_ITEM_WIDTH / 2)}px`
                                } : {
                                    height: '100%',
                                    transform: `translateX(calc(50% - ${ITEM_WIDTH / 2}px))`
                                })
                            }}>
                            {strip.map((item, idx) => {
                                const stripItemWidth = isMobile ? MOBILE_ITEM_WIDTH : ITEM_WIDTH;
                                return (
                                    <div key={idx} style={{
                                        width: `${stripItemWidth}px`, height: `${stripItemWidth}px`, flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        ...(isMobile
                                            ? { borderBottom: `1px solid ${COLORS.border}33` }
                                            : { borderRight: `1px solid ${COLORS.border}33` })
                                    }}>
                                        {renderItemBox(item, idx, false, isMobile ? 60 : 52)}
                                    </div>
                                )})}
                        </div>
                    </div>
                </div>
            )}

            {/*Lucky Spin Result */}
            {state === 'luckyResult' && luckyResult && (
                <div style={{
                    marginTop: isMobile ? '12px' : '16px',
                    padding: isMobile ? '24px 20px' : '32px 28px',
                    background: `radial-gradient(ellipse 120% 200% at 50% 0%, ${COLORS.green}25 0%, ${COLORS.aqua}08 30%, ${COLORS.bgLight} 70%, ${COLORS.bgLight} 100%)`,
                    borderRadius: '16px',
                    border: `2px solid ${COLORS.green}77`,
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: `0 0 40px ${COLORS.green}55, 0 0 80px ${COLORS.green}22, inset 0 1px 0 ${COLORS.green}44`
                }}>
                    {/* Floating particles - enhanced */}
                    {[...Array(16)].map((_, i) => (
                        <div key={i} style={{
                            position: 'absolute',
                            width: isMobile ? '5px' : '6px', height: isMobile ? '5px' : '6px',
                            background: i % 3 === 0 ? COLORS.green : i % 3 === 1 ? COLORS.aqua : COLORS.gold,
                            borderRadius: '50%',
                            left: `${5 + Math.random() * 90}%`,
                            top: '85%',
                            opacity: 0,
                            animation: `floatParticle 2.5s ease-out ${i * 0.12}s infinite`,
                            boxShadow: `0 0 8px ${i % 3 === 0 ? COLORS.green : i % 3 === 1 ? COLORS.aqua : COLORS.gold}`
                        }} />
                    ))}

                    {/* Lucky badge - enhanced */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? '8px' : '12px',
                        marginBottom: isMobile ? '16px' : '20px', animation: 'fadeSlideDown 0.4s ease-out',
                        flexWrap: 'wrap'
                    }}>
                        <span style={{
                            background: `linear-gradient(135deg, ${COLORS.green}dd 0%, ${COLORS.aqua}aa 100%)`,
                            color: '#fff', fontSize: isMobile ? '10px' : '11px', fontWeight: '800',
                            padding: isMobile ? '5px 12px' : '6px 14px',
                            borderRadius: isMobile ? '6px' : '8px',
                            boxShadow: `0 4px 12px ${COLORS.green}55, inset 0 1px 0 rgba(255,255,255,0.25)`,
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase'
                        }}>Lucky Spin</span>
                        {isMythicItem(luckyResult) ? (
                            <span style={{
                                background: `linear-gradient(135deg, ${COLORS.aqua}dd, ${COLORS.purple}aa, ${COLORS.gold}88)`,
                                color: '#fff', fontSize: isMobile ? '10px' : '11px', fontWeight: '800',
                                padding: isMobile ? '5px 12px' : '6px 14px',
                                borderRadius: isMobile ? '6px' : '8px',
                                boxShadow: `0 4px 12px ${COLORS.aqua}55, inset 0 1px 0 rgba(255,255,255,0.25)`,
                                animation: 'mythicBadge 2s ease-in-out infinite',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase'
                            }}>Mythic</span>
                        ) : isSpecialItem(luckyResult) ? (
                            <span style={{
                                background: `linear-gradient(135deg, ${COLORS.purple}dd, ${COLORS.gold}aa)`,
                                color: '#fff', fontSize: isMobile ? '10px' : '11px', fontWeight: '800',
                                padding: isMobile ? '5px 12px' : '6px 14px',
                                borderRadius: isMobile ? '6px' : '8px',
                                boxShadow: `0 4px 12px ${COLORS.purple}55, inset 0 1px 0 rgba(255,255,255,0.25)`,
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase'
                            }}>Legendary</span>
                        ) : isRareItem(luckyResult) ? (
                            <span style={{
                                background: `linear-gradient(135deg, ${COLORS.red}dd, ${COLORS.orange}aa)`,
                                color: '#fff', fontSize: isMobile ? '10px' : '11px', fontWeight: '800',
                                padding: isMobile ? '5px 12px' : '6px 14px',
                                borderRadius: isMobile ? '6px' : '8px',
                                boxShadow: `0 4px 12px ${COLORS.red}55, inset 0 1px 0 rgba(255,255,255,0.25)`,
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase'
                            }}>Rare</span>
                        ) : isLuckyNew && (
                            <span style={{
                                background: `linear-gradient(135deg, ${COLORS.green}dd, ${COLORS.aqua}aa)`,
                                color: COLORS.bg, fontSize: isMobile ? '10px' : '11px', fontWeight: '800',
                                padding: isMobile ? '5px 12px' : '6px 14px', borderRadius: isMobile ? '6px' : '8px',
                                boxShadow: `0 4px 12px ${COLORS.green}55, inset 0 1px 0 rgba(255,255,255,0.25)`,
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase'
                            }}>NEW</span>
                        )}
                        <span style={{
                            color: COLORS.textMuted,
                            fontSize: isMobile ? '12px' : '13px',
                            fontWeight: '500',
                            letterSpacing: '0.3px'
                        }}>You received</span>
                    </div>

                    {/* Item Display */}
                    <div style={{
                        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
                        alignItems: 'center', justifyContent: 'center', gap: isMobile ? '16px' : '24px',
                        position: 'relative', zIndex: 1
                    }}>
                        <div style={{ position: 'relative', animation: 'itemReveal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                            <div style={{
                                position: 'absolute', top: '-10px', left: '-10px', right: '-10px', bottom: '-10px',
                                borderRadius: '16px',
                                background: `radial-gradient(circle, ${COLORS.green}33 0%, transparent 70%)`,
                                animation: 'pulseGlow 1.5s ease-in-out infinite'
                            }} />
                            <div style={{
                                width: '80px', height: '80px',
                                background: isMythicItem(luckyResult)
                                    ? `linear-gradient(135deg, ${COLORS.aqua}33, ${COLORS.purple}33, ${COLORS.gold}33)`
                                    : isSpecialItem(luckyResult)
                                        ? `linear-gradient(135deg, ${COLORS.purple}33, ${COLORS.gold}33)`
                                        : isRareItem(luckyResult)
                                            ? `linear-gradient(135deg, ${COLORS.red}33, ${COLORS.orange}33)`
                                            : COLORS.bgLight,
                                borderRadius: '12px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: `3px solid ${COLORS.green}`,
                                boxShadow: `0 0 30px ${COLORS.green}66`,
                                position: 'relative'
                            }}>
                                <img
                                    src={getItemImageUrl(luckyResult)}
                                    alt={luckyResult.name}
                                    style={{
                                        width: '56px', height: '56px',
                                        imageRendering: (isSpecialItem(luckyResult) || isRareItem(luckyResult) || luckyResult.username) ? 'auto' : 'pixelated',
                                        borderRadius: (isSpecialItem(luckyResult) || isRareItem(luckyResult) || luckyResult.username) ? '6px' : '0',
                                        animation: 'itemBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                        filter: `drop-shadow(0 0 8px ${COLORS.green}88)`
                                    }}
                                    onError={(e) => { e.target.onerror = null; e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }}
                                />
                            </div>
                        </div>

                        <div style={{
                            display: 'flex', flexDirection: 'column',
                            alignItems: isMobile ? 'center' : 'flex-start', gap: '4px',
                            animation: 'textReveal 0.4s ease-out 0.1s both',
                            textAlign: isMobile ? 'center' : 'left'
                        }}>
                            <span style={{
                                color: isMythicItem(luckyResult) ? COLORS.aqua : isSpecialItem(luckyResult) ? COLORS.purple : isRareItem(luckyResult) ? COLORS.red : COLORS.green,
                                fontSize: '24px', fontWeight: '600',
                                textShadow: `0 0 20px ${COLORS.green}44`
                            }}>
                                {luckyResult.name}
                            </span>
                            {luckyResult.equalChance && (
                                <span style={{
                                    fontSize: '11px',
                                    color: COLORS.green,
                                    fontWeight: '600',
                                    background: `${COLORS.green}22`,
                                    padding: '2px 8px', borderRadius: '4px', marginTop: '4px'
                                }}>
                                    {formatChance(luckyResult.equalChance)}% (equal chance)
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Triple Spin Display (also used for Triple Lucky Spin) */}
            {(state === 'tripleSpinning' || state === 'tripleResult' || state === 'tripleLuckySpinning' || state === 'tripleLuckyResult') && (
                <div style={{ marginTop: isMobile ? '16px' : '24px' }}>
                    {/* Triple Lucky Spin Header Badge - show what it does */}
                    {(state === 'tripleLuckySpinning' || state === 'tripleLuckyResult') && (
                        <div style={{
                            textAlign: 'center',
                            marginBottom: isMobile ? '14px' : '18px',
                            padding: isMobile ? '10px 18px' : '12px 24px',
                            background: `linear-gradient(135deg, ${COLORS.green}33 0%, ${COLORS.aqua}22 100%)`,
                            borderRadius: isMobile ? '10px' : '12px',
                            border: `1.5px solid ${COLORS.green}66`,
                            boxShadow: `0 0 20px ${COLORS.green}44, inset 0 1px 0 ${COLORS.green}33`,
                            animation: 'bonusEventReveal 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }}>
                            <span style={{
                                color: COLORS.green,
                                fontSize: isMobile ? '13px' : '14px',
                                fontWeight: '800',
                                letterSpacing: '1.5px',
                                textTransform: 'uppercase',
                                textShadow: `0 0 12px ${COLORS.green}66`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}>
                               Triple Lucky Spin
                            </span>
                            <div style={{
                                marginTop: '6px',
                                color: COLORS.textMuted,
                                fontSize: '11px',
                                fontWeight: '500',
                                letterSpacing: '0.5px'
                            }}>3x spins with equal chance for all items</div>
                        </div>
                    )}
                    {/* Spinning rows - show during both spinning and result to prevent reset flash */}
                    {(state === 'tripleSpinning' || state === 'tripleResult' || state === 'tripleLuckySpinning' || state === 'tripleLuckyResult') && (() => {
                        const isTripleLucky = state === 'tripleLuckySpinning' || state === 'tripleLuckyResult';
                        const accentColor = isTripleLucky ? COLORS.green : COLORS.gold;
                        const stripCount = isTripleLucky ? 3 : 5; // 3 for Triple Lucky, 5 for 5x Spin
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
                                    return (
                                        <div key={rowIndex} style={{
                                            position: 'relative',
                                            height: `${STRIP_HEIGHT_MOBILE}px`,
                                            width: `${TRIPLE_ITEM_WIDTH_MOBILE}px`,
                                            overflow: 'hidden',
                                            borderRadius: '8px',
                                            background: COLORS.bg,
                                            border: `2px solid ${accentColor}`,
                                            boxShadow: `0 0 12px ${accentColor}33`
                                        }}>
                                            {/* Center Indicator - horizontal line */}
                                            <div style={{
                                                position: 'absolute',
                                                left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', height: '2px',
                                                background: accentColor, zIndex: 10, boxShadow: `0 0 10px ${accentColor}88`
                                            }} />
                                            {/* Left pointer */}
                                            <div style={{
                                                position: 'absolute',
                                                left: '-1px', top: '50%', transform: 'translateY(-50%)',
                                                width: 0, height: 0,
                                                borderTop: '5px solid transparent', borderBottom: '5px solid transparent',
                                                borderLeft: `8px solid ${accentColor}`,
                                                zIndex: 11, filter: `drop-shadow(0 0 3px ${accentColor})`
                                            }} />
                                            {/* Right pointer */}
                                            <div style={{
                                                position: 'absolute',
                                                right: '-1px', top: '50%', transform: 'translateY(-50%)',
                                                width: 0, height: 0,
                                                borderTop: '5px solid transparent', borderBottom: '5px solid transparent',
                                                borderRight: `8px solid ${accentColor}`,
                                                zIndex: 11, filter: `drop-shadow(0 0 3px ${accentColor})`
                                            }} />
                                            {/* Edge fade gradients */}
                                            <div style={{
                                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                                background: `linear-gradient(180deg, ${COLORS.bg} 0%, transparent 20%, transparent 80%, ${COLORS.bg} 100%)`,
                                                zIndex: 5, pointerEvents: 'none'
                                            }} />
                                            {/* Item Strip - vertical */}
                                            <div
                                                ref={el => tripleStripRefs.current[rowIndex] = el}
                                                style={{
                                                    position: 'absolute',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    left: '50%',
                                                    marginLeft: `-${TRIPLE_ITEM_WIDTH_MOBILE / 2}px`,
                                                    top: `${(STRIP_HEIGHT_MOBILE / 2) - (TRIPLE_ITEM_WIDTH_MOBILE / 2)}px`,
                                                    willChange: 'transform'
                                                }}
                                            >
                                                {(tripleStrips[rowIndex] || []).map((item, idx) => {
                                                    const isWinning = idx === FINAL_INDEX && (state === 'tripleResult' || state === 'tripleLuckyResult');
                                                    return (
                                                        <div key={idx} style={{
                                                            width: `${TRIPLE_ITEM_WIDTH_MOBILE}px`,
                                                            height: `${TRIPLE_ITEM_WIDTH_MOBILE}px`,
                                                            flexShrink: 0,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            borderBottom: `1px solid ${COLORS.border}33`
                                                        }}>
                                                            {renderItemBox(item, idx, isWinning, isTripleLucky ? 44 : 38)}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* Desktop: horizontal strips stacked */
                            stripIndices.map(rowIndex => {
                                const TRIPLE_ITEM_WIDTH = 80;
                                const stripHeight = isTripleLucky ? 100 : 80; // Smaller for 5 strips
                                return (
                                    <div key={rowIndex} style={{ marginBottom: rowIndex < stripCount - 1 ? '8px' : '0' }}>
                                        <div style={{
                                            position: 'relative',
                                            height: `${stripHeight}px`,
                                            width: '100%',
                                            overflow: 'hidden',
                                            borderRadius: '8px',
                                            background: COLORS.bg,
                                            border: `2px solid ${accentColor}`,
                                            boxShadow: `0 0 20px ${accentColor}44`
                                        }}>
                                            <div style={{
                                                position: 'absolute',
                                                top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '3px',
                                                background: accentColor, zIndex: 10, boxShadow: `0 0 12px ${accentColor}88`
                                            }} />
                                            <div style={{
                                                position: 'absolute',
                                                top: '-2px', left: '50%', transform: 'translateX(-50%)',
                                                width: 0, height: 0,
                                                borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
                                                borderTop: `10px solid ${accentColor}`,
                                                zIndex: 11, filter: `drop-shadow(0 0 4px ${accentColor})`
                                            }} />
                                            {/* Edge fade */}
                                            <div style={{
                                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                                background: `linear-gradient(90deg, ${COLORS.bg} 0%, transparent 15%, transparent 85%, ${COLORS.bg} 100%)`,
                                                zIndex: 5, pointerEvents: 'none'
                                            }} />
                                            <div
                                                ref={el => tripleStripRefs.current[rowIndex] = el}
                                                style={{
                                                    position: 'relative',
                                                    display: 'flex',
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    height: '100%',
                                                    transform: `translateX(calc(50% - ${TRIPLE_ITEM_WIDTH / 2}px))`,
                                                    willChange: 'transform'
                                                }}
                                            >
                                                {(tripleStrips[rowIndex] || []).map((item, idx) => {
                                                    const isWinning = idx === FINAL_INDEX && (state === 'tripleResult' || state === 'tripleLuckyResult');
                                                    return (
                                                        <div key={idx} style={{
                                                            width: `${TRIPLE_ITEM_WIDTH}px`, height: `${TRIPLE_ITEM_WIDTH}px`, flexShrink: 0,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            borderRight: `1px solid ${COLORS.border}33`
                                                        }}>
                                                            {renderItemBox(item, idx, isWinning, isTripleLucky ? 52 : 48)}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        );
                    })()}

                    {/* Results display */}
                    {(state === 'tripleResult' || state === 'tripleLuckyResult') && (() => {
                        const isTripleLucky = state === 'tripleLuckyResult';
                        const itemCount = isTripleLucky ? 3 : 5;
                        return (
                            <div style={{
                                padding: isMobile ? '24px 16px' : '32px 28px',
                                background: state === 'tripleLuckyResult'
                                    ? `radial-gradient(ellipse 120% 200% at 50% 0%, ${COLORS.green}25 0%, ${COLORS.aqua}08 30%, ${COLORS.bgLight} 70%, ${COLORS.bgLight} 100%)`
                                    : `radial-gradient(ellipse 120% 200% at 50% 0%, ${COLORS.gold}28 0%, ${COLORS.orange}12 30%, ${COLORS.bgLight} 70%, ${COLORS.bgLight} 100%)`,
                                borderRadius: '16px',
                                border: `2px solid ${state === 'tripleLuckyResult' ? COLORS.green : COLORS.gold}77`,
                                textAlign: 'center',
                                position: 'relative',
                                overflow: 'hidden',
                                boxShadow: state === 'tripleLuckyResult'
                                    ? `0 0 40px ${COLORS.green}55, 0 0 80px ${COLORS.green}22, inset 0 1px 0 ${COLORS.green}44`
                                    : `0 0 40px ${COLORS.gold}55, 0 0 80px ${COLORS.orange}22, inset 0 1px 0 ${COLORS.gold}44`
                            }}>
                                {/* Floating particles - enhanced */}
                                {[...Array(isMobile ? 12 : 18)].map((_, i) => (
                                    <div key={i} style={{
                                        position: 'absolute',
                                        width: isMobile ? '5px' : '7px',
                                        height: isMobile ? '5px' : '7px',
                                        background: state === 'tripleLuckyResult'
                                            ? (i % 3 === 0 ? COLORS.green : i % 3 === 1 ? COLORS.aqua : COLORS.gold)
                                            : (i % 3 === 0 ? COLORS.gold : i % 3 === 1 ? COLORS.orange : COLORS.purple),
                                        borderRadius: '50%',
                                        left: `${3 + Math.random() * 94}%`,
                                        top: '88%',
                                        opacity: 0,
                                        animation: `floatParticle 2.5s ease-out ${i * 0.1}s infinite`,
                                        boxShadow: state === 'tripleLuckyResult'
                                            ? `0 0 10px ${i % 3 === 0 ? COLORS.green : i % 3 === 1 ? COLORS.aqua : COLORS.gold}`
                                            : `0 0 10px ${i % 3 === 0 ? COLORS.gold : i % 3 === 1 ? COLORS.orange : COLORS.purple}`
                                    }} />
                                ))}

                                {/* Header - enhanced */}
                                <div style={{
                                    marginBottom: isMobile ? '18px' : '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: isMobile ? '10px' : '14px',
                                    position: 'relative',
                                    zIndex: 1,
                                    animation: 'fadeSlideDown 0.4s ease-out',
                                    flexWrap: 'wrap'
                                }}>
                                <span style={{
                                    background: state === 'tripleLuckyResult'
                                        ? `linear-gradient(135deg, ${COLORS.gold}ee 0%, ${COLORS.green}cc 100%)`
                                        : `linear-gradient(135deg, ${COLORS.gold}dd 0%, ${COLORS.orange}aa 100%)`,
                                    color: COLORS.bg, fontSize: isMobile ? '11px' : '12px', fontWeight: '800',
                                    padding: isMobile ? '6px 14px' : '8px 16px',
                                    borderRadius: isMobile ? '8px' : '10px',
                                    boxShadow: state === 'tripleLuckyResult'
                                        ? `0 4px 16px ${COLORS.gold}77, inset 0 1px 0 rgba(255,255,255,0.3)`
                                        : `0 4px 16px ${COLORS.gold}66, inset 0 1px 0 rgba(255,255,255,0.3)`,
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>

                                    {state === 'tripleLuckyResult' ? 'Triple Lucky Win' : '5x Win'}

                                </span>
                                    <span style={{
                                        color: COLORS.textMuted,
                                        fontSize: isMobile ? '12px' : '14px',
                                        fontWeight: '500',
                                        letterSpacing: '0.3px'
                                    }}>You received</span>
                                </div>

                                {/* Items - horizontal row on both mobile and desktop */}
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'flex-start',
                                    justifyContent: 'center',
                                    gap: isMobile ? (isTripleLucky ? '12px' : '6px') : (isTripleLucky ? '40px' : '24px'),
                                    position: 'relative',
                                    zIndex: 1,
                                    flexWrap: isMobile && !isTripleLucky ? 'wrap' : 'nowrap',
                                    maxWidth: isMobile && !isTripleLucky ? '320px' : 'none',
                                    margin: '0 auto'
                                }}>
                                    {tripleResults.slice(0, itemCount).map((item, idx) => {
                                        if (!item) return null;
                                        const isMythic = isMythicItem(item);
                                        const isSpecial = isSpecialItem(item);
                                        const isRare = isRareItem(item);
                                        const itemColor = isMythic ? COLORS.aqua : isSpecial ? COLORS.purple : isRare ? COLORS.red : COLORS.gold;
                                        const itemSize = isMobile ? (isTripleLucky ? 60 : 48) : (isTripleLucky ? 80 : 70);
                                        const imgSize = isMobile ? (isTripleLucky ? 42 : 32) : (isTripleLucky ? 56 : 48);

                                        return (
                                            <div key={idx} style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                width: isMobile ? (isTripleLucky ? '90px' : '58px') : (isTripleLucky ? '120px' : '100px'),
                                                animation: `itemReveal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.1}s both`
                                            }}>
                                                {/* Item box with glow */}
                                                <div style={{ position: 'relative', marginBottom: isMobile ? '8px' : '12px' }}>
                                                    {(isMythic || isSpecial || isRare) && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: isMobile ? '-6px' : '-8px',
                                                            left: isMobile ? '-6px' : '-8px',
                                                            right: isMobile ? '-6px' : '-8px',
                                                            bottom: isMobile ? '-6px' : '-8px',
                                                            borderRadius: isMobile ? '12px' : '14px',
                                                            background: isMythic
                                                                ? `radial-gradient(circle, ${COLORS.aqua}44 0%, ${COLORS.purple}22 50%, transparent 70%)`
                                                                : isSpecial ? `radial-gradient(circle, ${COLORS.purple}33 0%, transparent 70%)`
                                                                    : `radial-gradient(circle, ${COLORS.red}33 0%, transparent 70%)`,
                                                            animation: 'pulseGlow 1.5s ease-in-out infinite'
                                                        }} />
                                                    )}
                                                    <div style={{
                                                        width: `${itemSize}px`, height: `${itemSize}px`, position: 'relative',
                                                        background: isMythic
                                                            ? `linear-gradient(135deg, ${COLORS.aqua}33, ${COLORS.purple}33, ${COLORS.gold}33)`
                                                            : isSpecial
                                                                ? `linear-gradient(135deg, ${COLORS.purple}33, ${COLORS.gold}33)`
                                                                : isRare
                                                                    ? `linear-gradient(135deg, ${COLORS.red}33, ${COLORS.orange}33)`
                                                                    : COLORS.bgLight,
                                                        borderRadius: isMobile ? '8px' : '10px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        border: `${isMobile ? '2px' : '3px'} solid ${itemColor}`,
                                                        boxShadow: isMythic
                                                            ? `0 0 ${isMobile ? '15px' : '25px'} ${COLORS.aqua}66, 0 0 ${isMobile ? '30px' : '50px'} ${COLORS.purple}44`
                                                            : isSpecial
                                                                ? `0 0 ${isMobile ? '15px' : '25px'} ${COLORS.purple}66`
                                                                : isRare
                                                                    ? `0 0 ${isMobile ? '15px' : '25px'} ${COLORS.red}66`
                                                                    : `0 0 ${isMobile ? '15px' : '25px'} ${COLORS.gold}44`,
                                                        animation: isMythic ? 'mythicGlow 1s ease-in-out infinite' : isSpecial ? 'specialGlow 1.5s ease-in-out infinite' : isRare ? 'rareGlow 1.5s ease-in-out infinite' : 'none'
                                                    }}>
                                                        <img
                                                            src={getItemImageUrl(item)}
                                                            alt={item.name}
                                                            style={{
                                                                width: `${imgSize}px`, height: `${imgSize}px`,
                                                                imageRendering: (item.username || isSpecial || isRare) ? 'auto' : 'pixelated',
                                                                borderRadius: (item.username || isSpecial || isRare) ? (isMobile ? '4px' : '6px') : '0',
                                                                animation: 'itemBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                                                filter: `drop-shadow(0 0 6px ${itemColor}88)`
                                                            }}
                                                            onError={(e) => { e.target.onerror = null; e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Item name */}
                                                <span style={{
                                                    color: itemColor,
                                                    fontSize: isMobile ? (isTripleLucky ? '11px' : '9px') : '14px',
                                                    fontWeight: '600',
                                                    textAlign: 'center',
                                                    lineHeight: '1.2',
                                                    maxWidth: '100%',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: isMobile && !isTripleLucky ? 1 : 2,
                                                    WebkitBoxOrient: 'vertical'
                                                }}>
                                                {item.name}
                                            </span>

                                                {/* NEW badge */}
                                                {tripleNewItems[idx] && (
                                                    <span style={{
                                                        marginTop: isMobile ? '2px' : '4px',
                                                        background: COLORS.green,
                                                        color: COLORS.bg,
                                                        fontSize: isMobile ? '7px' : '9px',
                                                        fontWeight: '700',
                                                        padding: isMobile ? '1px 4px' : '2px 8px',
                                                        borderRadius: '3px'
                                                    }}>NEW</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

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