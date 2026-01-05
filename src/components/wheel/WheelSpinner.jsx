import React, { useState, useEffect, useRef, memo } from 'react';
import {
    COLORS, API_BASE_URL, IMAGE_BASE_URL, WHEEL_TEXTURE_URL,
    ITEM_WIDTH, SPIN_DURATION, STRIP_LENGTH, FINAL_INDEX,
    TEAM_MEMBERS, RARE_MEMBERS, MYTHIC_ITEMS, MYTHIC_ITEM, EVENT_ITEM, BONUS_EVENTS
} from '../../config/constants.js';
import {
    formatChance, getMinecraftHeadUrl,
    isSpecialItem, isRareItem, isMythicItem, isEventItem
} from '../../utils/helpers.js';


function WheelSpinnerComponent({ allItems, collection, onSpinComplete, user, dynamicItems }) {
    const [state, setState] = useState('idle');
    const [strip, setStrip] = useState([]);
    const [result, setResult] = useState(null);
    const [isNewItem, setIsNewItem] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
    const animationRef = useRef(null);

    // Use refs for animation offsets to avoid re-renders during animation
    const stripRef = useRef(null);
    const offsetRef = useRef(0);

    // Triple spin state
    const [tripleStrips, setTripleStrips] = useState([[], [], []]);
    const [tripleResults, setTripleResults] = useState([null, null, null]);
    const [tripleNewItems, setTripleNewItems] = useState([false, false, false]);
    const tripleAnimationRefs = useRef([null, null, null]);
    const tripleStripRefs = useRef([null, null, null]);
    const tripleOffsetRefs = useRef([0, 0, 0]);

    // Bonus wheel state - using horizontal strip like main wheel
    const [bonusStrip, setBonusStrip] = useState([]);
    const [bonusOffset, setBonusOffset] = useState(0);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const bonusWheelRef = useRef(null);

    // Lucky spin state
    const [luckyResult, setLuckyResult] = useState(null);
    const [isLuckyNew, setIsLuckyNew] = useState(false);

    // Pending spin flag for instant respin
    const pendingSpinRef = useRef(false);

    // Error state for server unavailability
    const [error, setError] = useState(null);

    // Client-side cooldown tracking (mirrors server's 5s cooldown)
    const lastSpinTimeRef = useRef(0);
    const SPIN_COOLDOWN = 5000; // 5 seconds - must match server

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

    useEffect(() => {
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            tripleAnimationRefs.current.forEach(ref => { if (ref) cancelAnimationFrame(ref); });
        };
    }, []);

    // Handle pending spin after state becomes idle
    useEffect(() => {
        if (state === 'idle' && pendingSpinRef.current) {
            pendingSpinRef.current = false;
            spin();
        }
    }, [state]);

    function getItemImageUrl(item) {
        if (!item) return `${IMAGE_BASE_URL}/barrier.png`;
        if (item.imageUrl) return item.imageUrl;
        if (isEventItem(item)) return EVENT_ITEM.imageUrl;
        if (isMythicItem(item) && !item.username) {
            // Find matching mythic item by texture
            const mythic = MYTHIC_ITEMS.find(m => m.texture === item.texture);
            if (mythic) return mythic.imageUrl;
            return MYTHIC_ITEM.imageUrl; // Fallback to first mythic
        }
        if (item.username) return getMinecraftHeadUrl(item.username);
        return `${IMAGE_BASE_URL}/${item.texture}.png`;
    }

    function buildStrip(finalItem, length = STRIP_LENGTH) {
        const newStrip = [];
        const finalIndex = length - 8;
        for (let i = 0; i < length; i++) {
            if (i === finalIndex) {
                newStrip.push(finalItem);
            } else {
                const roll = Math.random();
                // Match old_wheel.jsx behavior exactly - 2% chance for special item visual flair
                if (roll < 0.02 && TEAM_MEMBERS.length > 0) {
                    const member = TEAM_MEMBERS[Math.floor(Math.random() * TEAM_MEMBERS.length)];
                    newStrip.push({ ...member, isSpecial: true, texture: `special_${member.username}` });
                } else if (allItems.length > 0) {
                    newStrip.push(allItems[Math.floor(Math.random() * allItems.length)]);
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
        setTripleResults([null, null, null]);
        setTripleNewItems([false, false, false]);

        // Directly perform spin (bypass idle check)
        performSpin();
    }

    // Core spin logic - extracted so respin can call it directly
    async function performSpin() {
        if (!user || allItems.length === 0) return;

        // Client-side cooldown check (prevents animation flash)
        if (!canSpin()) return;

        try {
            setState('spinning');
            markSpinTime(); // Mark spin time immediately

            const res = await fetch(`${API_BASE_URL}/api/spin`, { method: 'POST', credentials: 'include' });
            const spinResult = await res.json();

            // Handle rate limit / cooldown - show error message
            if (res.status === 429 || spinResult.cooldown) {
                setError("Don't spin too fast!");
                setState('idle');
                return;
            }

            if (!res.ok || !spinResult.result) {
                throw new Error(spinResult.error || 'Spin failed');
            }

            const finalItem = {
                ...spinResult.result,
                isSpecial: spinResult.result.type === 'legendary',
                isRare: spinResult.result.type === 'rare',
                isMythic: spinResult.result.type === 'mythic',
                isEvent: spinResult.result.type === 'event'
            };

            const newStrip = buildStrip(finalItem);
            setStrip(newStrip);
            setResult(finalItem);
            setIsNewItem(spinResult.isNew);
            offsetRef.current = 0;

            const targetOffset = FINAL_INDEX * ITEM_WIDTH;
            const finalOffset = targetOffset + (Math.random() - 0.5) * 30;
            let startTime = null;

            const animate = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / SPIN_DURATION, 1);
                const eased = 1 - Math.pow(1 - progress, 4);
                offsetRef.current = eased * finalOffset;

                // Direct DOM manipulation - no React re-render
                if (stripRef.current) {
                    if (isMobile) {
                        stripRef.current.style.top = `${(280 / 2) - (ITEM_WIDTH / 2) - offsetRef.current}px`;
                    } else {
                        stripRef.current.style.transform = `translateX(calc(50% - ${offsetRef.current}px - ${ITEM_WIDTH / 2}px))`;
                    }
                }

                if (progress < 1) {
                    animationRef.current = requestAnimationFrame(animate);
                } else {
                    if (spinResult.isEvent) {
                        setState('event');
                        setTimeout(() => spinBonusWheel(), 1500);
                    } else {
                        setState('result');
                        if (onSpinComplete) onSpinComplete(spinResult);
                    }
                }
            };
            animationRef.current = requestAnimationFrame(animate);
        } catch (err) {
            console.error('Spin failed:', err);
            // Check if it's a network error (server offline)
            if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
                setError('Server unavailable. Please try again later.');
            } else {
                setError(err.message || 'Spin failed. Please try again.');
            }
            setState('idle');
        }
    }

    async function spin() {
        if (state !== 'idle' || !user) return;
        if (allItems.length === 0) return;
        setError(null); // Clear any previous error
        performSpin();
    }

    // Spin the bonus wheel to select which event - using horizontal strip
    function spinBonusWheel() {
        setState('bonusWheel');

        // Pick random event
        const randomIndex = Math.floor(Math.random() * BONUS_EVENTS.length);
        const event = BONUS_EVENTS[randomIndex];
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
                // Random event for filler
                newStrip.push(BONUS_EVENTS[Math.floor(Math.random() * BONUS_EVENTS.length)]);
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
        }
    }

    // Lucky spin - equal probability for all items (bonus event reward - no cooldown)
    async function triggerLuckySpin() {
        setState('luckySpinning');

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

            const targetOffset = FINAL_INDEX * ITEM_WIDTH;
            const finalOffset = targetOffset + (Math.random() - 0.5) * 30;
            let startTime = null;

            const animate = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / SPIN_DURATION, 1);
                const eased = 1 - Math.pow(1 - progress, 4);
                offsetRef.current = eased * finalOffset;

                // Direct DOM manipulation for smooth animation
                if (stripRef.current) {
                    if (isMobile) {
                        stripRef.current.style.top = `${(280 / 2) - (ITEM_WIDTH / 2) - offsetRef.current}px`;
                    } else {
                        stripRef.current.style.transform = `translateX(calc(50% - ${offsetRef.current}px - ${ITEM_WIDTH / 2}px))`;
                    }
                }

                if (progress < 1) {
                    animationRef.current = requestAnimationFrame(animate);
                } else {
                    setState('luckyResult');
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

        try {
            // Helper to get a valid (non-event) spin result
            async function getValidSpin() {
                let attempts = 0;
                while (attempts < 5) {
                    const res = await fetch(`${API_BASE_URL}/api/spin`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bonus: true })
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

            // Get 3 valid spins (retrying if we hit events)
            const results = await Promise.all([getValidSpin(), getValidSpin(), getValidSpin()]);

            const newStrips = [];
            const newResults = [];
            const newItems = [];

            for (let i = 0; i < 3; i++) {
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
            tripleOffsetRefs.current = [0, 0, 0];

            // Staggered animation start
            const delays = [0, 300, 600];
            const completedCount = { current: 0 };
            // Use responsive item width for animation - must match the display
            const tripleItemWidth = isMobile ? 70 : ITEM_WIDTH;
            const STRIP_HEIGHT_MOBILE = 200;

            delays.forEach((delay, rowIndex) => {
                setTimeout(() => {
                    const targetOffset = FINAL_INDEX * tripleItemWidth;
                    const finalOffset = targetOffset + (Math.random() - 0.5) * 30;
                    let startTime = null;

                    const animate = (timestamp) => {
                        if (!startTime) startTime = timestamp;
                        const elapsed = timestamp - startTime;
                        const progress = Math.min(elapsed / SPIN_DURATION, 1);
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
                            if (completedCount.current === 3) {
                                setState('tripleResult');
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

    const reset = () => {
        setState('idle');
        setResult(null);
        offsetRef.current = 0;
        setStrip([]);
        setIsNewItem(false);
        setTripleStrips([[], [], []]);
        tripleOffsetRefs.current = [0, 0, 0];
        setTripleResults([null, null, null]);
        setTripleNewItems([false, false, false]);
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
        const isSpecial = isSpecialItem(item);
        const isMythic = isMythicItem(item);
        const isRare = isRareItem(item);
        const isEvent = isEventItem(item);

        // Enable glow animations for special items even during spinning (looks better)
        // disableAnimation only affects regular items for performance
        const isSpecialType = isMythic || isSpecial || isRare || isEvent;
        const shouldAnimate = isSpecialType || (!disableAnimation && (isWinning || state === 'result' || state === 'tripleResult' || state === 'luckyResult'));

        return (
            <div style={{
                width: `${size}px`, height: `${size}px`,
                background: isEvent
                    ? `linear-gradient(135deg, ${COLORS.red}33, ${COLORS.orange}33, ${COLORS.gold}33, ${COLORS.green}33, ${COLORS.aqua}33, ${COLORS.purple}33)`
                    : isMythic
                        ? `linear-gradient(135deg, ${COLORS.aqua}44, ${COLORS.purple}44, ${COLORS.gold}44)`
                        : isSpecial
                            ? `linear-gradient(135deg, ${COLORS.purple}44, ${COLORS.gold}44)`
                            : isRare
                                ? `linear-gradient(135deg, ${COLORS.red}44, ${COLORS.orange}44)`
                                : COLORS.bgLight,
                borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${
                    isEvent ? COLORS.gold
                        : isWinning ? COLORS.gold
                            : isMythic ? COLORS.aqua
                                : isSpecial ? COLORS.purple
                                    : isRare ? COLORS.red
                                        : COLORS.border
                }`,
                boxShadow: shouldAnimate ? (
                    isEvent
                        ? `0 0 15px ${COLORS.gold}88, 0 0 30px ${COLORS.purple}44`
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
                    isEvent ? 'eventGlow 1.5s ease-in-out infinite'
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
                        width: isEvent ? `${size * 1.1}px` : `${size * 0.77}px`,
                        height: isEvent ? `${size * 1.1}px` : `${size * 0.77}px`,
                        imageRendering: (isSpecial || isRare || item.username || isEvent) ? 'auto' : 'pixelated',
                        borderRadius: (isSpecial || isRare || item.username) ? '4px' : '0'
                    }}
                    onError={(e) => { e.target.onerror = null; e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }}
                />
            </div>
        );
    };

    // Idle state - show clickable wheel
    if (state === 'idle') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <button
                    onClick={spin}
                    disabled={isDisabled}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        transition: 'transform 0.3s, filter 0.3s',
                        filter: 'drop-shadow(0 8px 24px rgba(255, 170, 0, 0.3))',
                        opacity: isDisabled ? 0.5 : 1
                    }}
                    onMouseEnter={e => {
                        if (!isDisabled) {
                            e.currentTarget.style.transform = 'scale(1.05) translateY(-4px)';
                            e.currentTarget.style.filter = 'drop-shadow(0 12px 32px rgba(255, 170, 0, 0.5))';
                        }
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'scale(1) translateY(0)';
                        e.currentTarget.style.filter = 'drop-shadow(0 8px 24px rgba(255, 170, 0, 0.3))';
                    }}
                >
                    <img
                        src={WHEEL_TEXTURE_URL}
                        alt="Spin the wheel"
                        style={{ width: '180px', height: 'auto', imageRendering: 'pixelated' }}
                    />
                </button>

                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: COLORS.gold, fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                        {!user ? 'Login to spin!' : allItems.length === 0 ? 'Loading items...' : 'Click to spin!'}
                    </div>
                    <div style={{ color: COLORS.textMuted, fontSize: '12px' }}>
                        {allItems.length > 0 && `Win one of ${totalItemCount} items!`}
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
                </div>
            </div>
        );
    }

    // Spinning or Result state - RESTORED beautiful animation
    return (
        <div style={{ background: COLORS.bgLight, borderRadius: '16px', padding: '24px', border: `1px solid ${COLORS.border}`, width: '100%', boxSizing: 'border-box' }}>
            {/* Header with spinning wheel icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                        src={WHEEL_TEXTURE_URL}
                        alt="Wheel"
                        style={{
                            width: '32px', height: 'auto', imageRendering: 'pixelated',
                            animation: (state === 'spinning' || state === 'tripleSpinning') ? 'wheelSpin 0.5s linear infinite' : 'none'
                        }}
                    />
                    <span style={{ color: state === 'event' || state === 'bonusWheel' || state === 'bonusResult' ? COLORS.orange : state === 'luckySpinning' || state === 'luckyResult' ? COLORS.green : COLORS.gold, fontSize: '18px', fontWeight: '600' }}>
                        {state === 'spinning' ? 'Spinning...' :
                            state === 'event' ? 'BONUS EVENT!' :
                                state === 'bonusWheel' ? 'Spinning Bonus Wheel...' :
                                    state === 'bonusResult' ? 'Event Selected!' :
                                        state === 'tripleSpinning' ? 'Triple Spinning...' :
                                            state === 'tripleResult' ? 'Triple Win!' :
                                                state === 'luckySpinning' ? 'Lucky Spinning...' :
                                                    state === 'luckyResult' ? 'Lucky Win!' :
                                                        'Gamba!'}
                    </span>
                </div>

                {(state === 'result' || state === 'tripleResult' || state === 'luckyResult') && (
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

            {/* Spinner Container - RESTORED with all visual effects */}
            {/* Hidden during bonus wheel, lucky spin, and triple spin (they have their own displays) */}
            {state !== 'bonusWheel' && state !== 'bonusResult' && state !== 'luckySpinning' && state !== 'luckyResult' && state !== 'tripleSpinning' && state !== 'tripleResult' && (
                <div style={{
                    position: 'relative',
                    height: isMobile ? '280px' : '100px',
                    width: isMobile ? '100px' : '100%',
                    overflow: 'hidden',
                    borderRadius: '8px',
                    background: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    margin: isMobile ? '0 auto' : '0'
                }}>
                    {/* Center Indicator Line */}
                    <div style={{
                        position: 'absolute',
                        ...(isMobile ? {
                            left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', height: '3px'
                        } : {
                            top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '3px'
                        }),
                        background: COLORS.gold,
                        zIndex: 10,
                        boxShadow: `0 0 16px ${COLORS.gold}88`
                    }} />

                    {/* Pointer */}
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
                        filter: `drop-shadow(0 2px 4px ${COLORS.gold}66)`
                    }} />

                    {/* Edge fade gradients */}
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
                            willChange: 'transform, top',
                            ...(isMobile ? {
                                left: '50%', marginLeft: `-${ITEM_WIDTH / 2}px`,
                                top: `${(280 / 2) - (ITEM_WIDTH / 2)}px`
                            } : {
                                height: '100%',
                                transform: `translateX(calc(50% - ${ITEM_WIDTH / 2}px))`
                            })
                        }}
                    >
                        {strip.map((item, idx) => {
                            const isWinningItem = idx === FINAL_INDEX && (state === 'result' || state === 'event');
                            const isSpinning = state === 'spinning';
                            return (
                                <div key={idx} style={{
                                    width: `${ITEM_WIDTH}px`, height: `${ITEM_WIDTH}px`, flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    ...(isMobile
                                        ? { borderBottom: `1px solid ${COLORS.border}33` }
                                        : { borderRight: `1px solid ${COLORS.border}33` })
                                }}>
                                    {renderItemBox(item, idx, isWinningItem, 52, isSpinning)}
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
                    background: isMythicItem(result)
                        ? `radial-gradient(ellipse at center, ${COLORS.aqua}15 0%, ${COLORS.purple}10 50%, ${COLORS.bg} 70%)`
                        : isSpecialItem(result)
                            ? `radial-gradient(ellipse at center, ${COLORS.purple}22 0%, ${COLORS.bg} 70%)`
                            : isRareItem(result)
                                ? `radial-gradient(ellipse at center, ${COLORS.red}18 0%, ${COLORS.bg} 70%)`
                                : `radial-gradient(ellipse at center, ${COLORS.bgLighter} 0%, ${COLORS.bg} 70%)`,
                    borderRadius: '12px',
                    border: `1px solid ${isMythicItem(result) ? COLORS.aqua + '66' : isSpecialItem(result) ? COLORS.purple + '66' : isRareItem(result) ? COLORS.red + '66' : COLORS.gold + '44'}`,
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Floating particles */}
                    {[...Array(isMythicItem(result) ? 20 : 12)].map((_, i) => (
                        <div key={i} style={{
                            position: 'absolute',
                            width: isMythicItem(result) ? '8px' : '6px',
                            height: isMythicItem(result) ? '8px' : '6px',
                            background: isMythicItem(result)
                                ? (i % 3 === 0 ? COLORS.aqua : i % 3 === 1 ? COLORS.purple : COLORS.gold)
                                : isSpecialItem(result) ? COLORS.purple
                                    : isRareItem(result) ? COLORS.red
                                        : COLORS.gold,
                            borderRadius: '50%',
                            left: `${10 + Math.random() * 80}%`,
                            top: '80%',
                            opacity: 0,
                            animation: `floatParticle ${isMythicItem(result) ? '1.5s' : '2s'} ease-out ${i * 0.1}s infinite`,
                            boxShadow: `0 0 6px ${isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : COLORS.gold}`
                        }} />
                    ))}

                    {/* Badge Header */}
                    <div style={{
                        color: COLORS.textMuted, fontSize: '11px', textTransform: 'uppercase',
                        letterSpacing: '3px', marginBottom: '20px', position: 'relative', zIndex: 1,
                        animation: 'fadeSlideDown 0.3s ease-out',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                    }}>
                        {isMythicItem(result) ? (
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
                                background: isMythicItem(result)
                                    ? `radial-gradient(circle, ${COLORS.aqua}44 0%, ${COLORS.purple}22 50%, transparent 70%)`
                                    : `radial-gradient(circle, ${isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : COLORS.gold}33 0%, transparent 70%)`,
                                animation: 'pulseGlow 1.5s ease-in-out infinite'
                            }} />

                            <div style={{
                                width: '80px', height: '80px',
                                background: isMythicItem(result)
                                    ? `linear-gradient(135deg, ${COLORS.aqua}33, ${COLORS.purple}33, ${COLORS.gold}33)`
                                    : isSpecialItem(result)
                                        ? `linear-gradient(135deg, ${COLORS.purple}33, ${COLORS.gold}33)`
                                        : isRareItem(result)
                                            ? `linear-gradient(135deg, ${COLORS.red}33, ${COLORS.orange}33)`
                                            : COLORS.bgLight,
                                borderRadius: '12px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: `3px solid ${isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : COLORS.gold}`,
                                boxShadow: isMythicItem(result)
                                    ? `0 0 30px ${COLORS.aqua}66, 0 0 60px ${COLORS.purple}44, 0 0 90px ${COLORS.gold}22`
                                    : isSpecialItem(result)
                                        ? `0 0 30px ${COLORS.purple}66, 0 0 60px ${COLORS.purple}33, 0 0 90px ${COLORS.gold}22`
                                        : isRareItem(result)
                                            ? `0 0 30px ${COLORS.red}66, 0 0 60px ${COLORS.red}33, 0 0 90px ${COLORS.orange}22`
                                            : `0 0 30px ${COLORS.gold}44, 0 0 60px ${COLORS.gold}22, inset 0 0 20px ${COLORS.gold}11`,
                                position: 'relative',
                                animation: isMythicItem(result) ? 'mythicGlow 1s ease-in-out infinite' : isSpecialItem(result) ? 'specialGlow 1.5s ease-in-out infinite' : isRareItem(result) ? 'rareGlow 1.5s ease-in-out infinite' : 'none'
                            }}>
                                <img
                                    src={getItemImageUrl(result)}
                                    alt={result.name}
                                    style={{
                                        width: '56px', height: '56px',
                                        imageRendering: (isSpecialItem(result) || isRareItem(result) || result.username) ? 'auto' : 'pixelated',
                                        borderRadius: (isSpecialItem(result) || isRareItem(result) || result.username) ? '6px' : '0',
                                        animation: 'itemBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                        filter: `drop-shadow(0 0 8px ${isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : 'rgba(255, 170, 0, 0.5)'})`
                                    }}
                                    onError={(e) => { e.target.onerror = null; e.target.src = `${IMAGE_BASE_URL}/barrier.png`; }}
                                />
                            </div>

                            {/* Sparkle effects */}
                            {[...Array(isMythicItem(result) ? 8 : 4)].map((_, i) => (
                                <div key={i} style={{
                                    position: 'absolute', width: '8px', height: '8px',
                                    top: ['0%', '10%', '80%', '70%', '20%', '60%', '40%', '90%'][i],
                                    left: ['10%', '85%', '5%', '90%', '0%', '95%', '100%', '50%'][i],
                                    animation: `sparkle 1s ease-in-out ${i * 0.15}s infinite`
                                }}>
                                    <div style={{
                                        width: '100%', height: '2px',
                                        background: isMythicItem(result)
                                            ? (i % 3 === 0 ? COLORS.aqua : i % 3 === 1 ? COLORS.purple : COLORS.gold)
                                            : isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : COLORS.gold,
                                        position: 'absolute', top: '50%', left: '0', transform: 'translateY(-50%)',
                                        borderRadius: '1px',
                                        boxShadow: `0 0 4px ${isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : COLORS.gold}`
                                    }} />
                                    <div style={{
                                        width: '2px', height: '100%',
                                        background: isMythicItem(result)
                                            ? (i % 3 === 0 ? COLORS.aqua : i % 3 === 1 ? COLORS.purple : COLORS.gold)
                                            : isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : COLORS.gold,
                                        position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)',
                                        borderRadius: '1px',
                                        boxShadow: `0 0 4px ${isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : COLORS.gold}`
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
                                color: isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : COLORS.gold,
                                fontSize: '24px', fontWeight: '600',
                                textShadow: `0 0 20px ${isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : isRareItem(result) ? COLORS.red : COLORS.gold}44`
                            }}>
                                {result.name}
                            </span>

                            {(isMythicItem(result) || isSpecialItem(result) || isRareItem(result)) && result.chance ? (
                                <span style={{
                                    fontSize: '11px',
                                    color: isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : COLORS.red,
                                    fontWeight: '600',
                                    background: `${isMythicItem(result) ? COLORS.aqua : isSpecialItem(result) ? COLORS.purple : COLORS.red}22`,
                                    padding: '2px 8px', borderRadius: '4px', marginTop: '4px'
                                }}>
                                    {formatChance(result.chance)}% drop rate
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

                                return (
                                    <div key={idx} style={{
                                        width: '140px', height: '100%', flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        position: 'relative',
                                        background: isLucky
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
                                                ? (isLucky ? '8px 14px' : '7px 12px')
                                                : (isLucky ? '10px 18px' : '9px 16px'),
                                            background: isLucky
                                                ? `linear-gradient(135deg, ${COLORS.green}dd 0%, ${COLORS.aqua}aa 100%)`
                                                : `linear-gradient(135deg, ${COLORS.orange}dd 0%, ${COLORS.red}aa 100%)`,
                                            borderRadius: isLucky ? (isMobile ? '8px' : '10px') : (isMobile ? '8px' : '10px'),
                                            boxShadow: isLucky
                                                ? `0 4px 12px ${COLORS.green}77, 0 0 24px ${COLORS.green}55, inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.3)`
                                                : `0 4px 12px ${COLORS.orange}66, 0 0 24px ${COLORS.orange}44, inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.3)`,
                                            border: isLucky
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
                                                background: isLucky
                                                    ? `radial-gradient(circle, ${COLORS.green}44 0%, transparent 70%)`
                                                    : `radial-gradient(circle, ${COLORS.orange}33 0%, transparent 70%)`,
                                                borderRadius: isLucky ? (isMobile ? '10px' : '12px') : (isMobile ? '10px' : '12px'),
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
                                                {isLucky ? 'LUCKY SPIN' : 'TRIPLE SPIN'}
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
            {state === 'luckySpinning' && (
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
                           Lucky Spin
                        </span>
                        <div style={{
                            marginTop: '6px',
                            color: COLORS.textMuted,
                            fontSize: '11px',
                            fontWeight: '500',
                            letterSpacing: '0.5px'
                        }}>Equal chance for all items</div>
                    </div>

                    {/* Reuse main spinner strip */}
                    <div style={{
                        position: 'relative',
                        height: isMobile ? '280px' : '100px',
                        width: isMobile ? '100px' : '100%',
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
                                    left: '50%', marginLeft: `-${ITEM_WIDTH / 2}px`,
                                    top: `${(280 / 2) - (ITEM_WIDTH / 2)}px`
                                } : {
                                    height: '100%',
                                    transform: `translateX(calc(50% - ${ITEM_WIDTH / 2}px))`
                                })
                            }}>
                            {strip.map((item, idx) => (
                                <div key={idx} style={{
                                    width: `${ITEM_WIDTH}px`, height: `${ITEM_WIDTH}px`, flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    ...(isMobile
                                        ? { borderBottom: `1px solid ${COLORS.border}33` }
                                        : { borderRight: `1px solid ${COLORS.border}33` })
                                }}>
                                    {renderItemBox(item, idx, false, 52)}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/*Lucky Spin Result */}
            {state === 'luckyResult' && luckyResult && (
                <div style={{
                    marginTop: isMobile ? '20px' : '28px',
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

            {/* Triple Spin Display */}
            {(state === 'tripleSpinning' || state === 'tripleResult') && (
                <div style={{ marginTop: isMobile ? '16px' : '24px' }}>
                    {/* Spinning rows - show during both spinning and result to prevent reset flash */}
                    {(state === 'tripleSpinning' || state === 'tripleResult') && (
                        isMobile ? (
                            /* Mobile: 3 vertical strips side by side */
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                gap: '8px'
                            }}>
                                {[0, 1, 2].map(rowIndex => {
                                    const TRIPLE_ITEM_WIDTH_MOBILE = 70;
                                    const STRIP_HEIGHT_MOBILE = 200;
                                    return (
                                        <div key={rowIndex} style={{
                                            position: 'relative',
                                            height: `${STRIP_HEIGHT_MOBILE}px`,
                                            width: `${TRIPLE_ITEM_WIDTH_MOBILE}px`,
                                            overflow: 'hidden',
                                            borderRadius: '8px',
                                            background: COLORS.bg,
                                            border: `1px solid ${rowIndex === 1 ? COLORS.gold : COLORS.border}`,
                                            boxShadow: rowIndex === 1 ? `0 0 15px ${COLORS.gold}33` : 'none'
                                        }}>
                                            {/* Center Indicator - horizontal line */}
                                            <div style={{
                                                position: 'absolute',
                                                left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', height: '2px',
                                                background: COLORS.gold, zIndex: 10, boxShadow: `0 0 10px ${COLORS.gold}88`
                                            }} />
                                            {/* Left pointer */}
                                            <div style={{
                                                position: 'absolute',
                                                left: '-1px', top: '50%', transform: 'translateY(-50%)',
                                                width: 0, height: 0,
                                                borderTop: '5px solid transparent', borderBottom: '5px solid transparent',
                                                borderLeft: `8px solid ${COLORS.gold}`,
                                                zIndex: 11, filter: `drop-shadow(0 0 3px ${COLORS.gold})`
                                            }} />
                                            {/* Right pointer */}
                                            <div style={{
                                                position: 'absolute',
                                                right: '-1px', top: '50%', transform: 'translateY(-50%)',
                                                width: 0, height: 0,
                                                borderTop: '5px solid transparent', borderBottom: '5px solid transparent',
                                                borderRight: `8px solid ${COLORS.gold}`,
                                                zIndex: 11, filter: `drop-shadow(0 0 3px ${COLORS.gold})`
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
                                                {tripleStrips[rowIndex].map((item, idx) => (
                                                    <div key={idx} style={{
                                                        width: `${TRIPLE_ITEM_WIDTH_MOBILE}px`,
                                                        height: `${TRIPLE_ITEM_WIDTH_MOBILE}px`,
                                                        flexShrink: 0,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        borderBottom: `1px solid ${COLORS.border}33`
                                                    }}>
                                                        {renderItemBox(item, idx, false, 44)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* Desktop: 3 horizontal strips stacked */
                            [0, 1, 2].map(rowIndex => {
                                const TRIPLE_ITEM_WIDTH = 80;
                                return (
                                    <div key={rowIndex} style={{ marginBottom: rowIndex < 2 ? '12px' : '0' }}>
                                        <div style={{
                                            position: 'relative',
                                            height: '100px',
                                            width: '100%',
                                            overflow: 'hidden',
                                            borderRadius: '8px',
                                            background: COLORS.bg,
                                            border: `1px solid ${COLORS.border}`
                                        }}>
                                            <div style={{
                                                position: 'absolute',
                                                top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '3px',
                                                background: COLORS.gold, zIndex: 10, boxShadow: `0 0 12px ${COLORS.gold}88`
                                            }} />
                                            <div style={{
                                                position: 'absolute',
                                                top: '-2px', left: '50%', transform: 'translateX(-50%)',
                                                width: 0, height: 0,
                                                borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
                                                borderTop: `10px solid ${COLORS.gold}`,
                                                zIndex: 11, filter: `drop-shadow(0 0 4px ${COLORS.gold})`
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
                                                {tripleStrips[rowIndex].map((item, idx) => (
                                                    <div key={idx} style={{
                                                        width: `${TRIPLE_ITEM_WIDTH}px`, height: `${TRIPLE_ITEM_WIDTH}px`, flexShrink: 0,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        borderRight: `1px solid ${COLORS.border}33`
                                                    }}>
                                                        {renderItemBox(item, idx, false, 52)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )
                    )}

                    {/* Results display - 3 items */}
                    {state === 'tripleResult' && (
                        <div style={{
                            padding: isMobile ? '24px 16px' : '32px 28px',
                            background: `radial-gradient(ellipse 120% 200% at 50% 0%, ${COLORS.gold}28 0%, ${COLORS.orange}12 30%, ${COLORS.bgLight} 70%, ${COLORS.bgLight} 100%)`,
                            borderRadius: '16px',
                            border: `2px solid ${COLORS.gold}77`,
                            textAlign: 'center',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: `0 0 40px ${COLORS.gold}55, 0 0 80px ${COLORS.orange}22, inset 0 1px 0 ${COLORS.gold}44`
                        }}>
                            {/* Floating particles - enhanced */}
                            {[...Array(isMobile ? 12 : 18)].map((_, i) => (
                                <div key={i} style={{
                                    position: 'absolute',
                                    width: isMobile ? '5px' : '7px',
                                    height: isMobile ? '5px' : '7px',
                                    background: i % 3 === 0 ? COLORS.gold : i % 3 === 1 ? COLORS.orange : COLORS.purple,
                                    borderRadius: '50%',
                                    left: `${3 + Math.random() * 94}%`,
                                    top: '88%',
                                    opacity: 0,
                                    animation: `floatParticle 2.5s ease-out ${i * 0.1}s infinite`,
                                    boxShadow: `0 0 10px ${i % 3 === 0 ? COLORS.gold : i % 3 === 1 ? COLORS.orange : COLORS.purple}`
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
                                    background: `linear-gradient(135deg, ${COLORS.gold}dd 0%, ${COLORS.orange}aa 100%)`,
                                    color: COLORS.bg, fontSize: isMobile ? '11px' : '12px', fontWeight: '800',
                                    padding: isMobile ? '6px 14px' : '8px 16px',
                                    borderRadius: isMobile ? '8px' : '10px',
                                    boxShadow: `0 4px 16px ${COLORS.gold}66, inset 0 1px 0 rgba(255,255,255,0.3)`,
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>

                                    Triple Win

                                </span>
                                <span style={{
                                    color: COLORS.textMuted,
                                    fontSize: isMobile ? '12px' : '14px',
                                    fontWeight: '500',
                                    letterSpacing: '0.3px'
                                }}>You received</span>
                            </div>

                            {/* 3 Items - horizontal row on both mobile and desktop */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'flex-start',
                                justifyContent: 'center',
                                gap: isMobile ? '12px' : '40px',
                                position: 'relative',
                                zIndex: 1,
                                flexWrap: isMobile ? 'nowrap' : 'nowrap'
                            }}>
                                {tripleResults.map((item, idx) => {
                                    if (!item) return null;
                                    const isMythic = isMythicItem(item);
                                    const isSpecial = isSpecialItem(item);
                                    const isRare = isRareItem(item);
                                    const itemColor = isMythic ? COLORS.aqua : isSpecial ? COLORS.purple : isRare ? COLORS.red : COLORS.gold;
                                    const itemSize = isMobile ? 60 : 80;
                                    const imgSize = isMobile ? 42 : 56;

                                    return (
                                        <div key={idx} style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            width: isMobile ? '90px' : '120px',
                                            animation: `itemReveal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${idx * 0.15}s both`
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
                                                fontSize: isMobile ? '11px' : '14px',
                                                fontWeight: '600',
                                                textAlign: 'center',
                                                lineHeight: '1.2',
                                                maxWidth: '100%',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical'
                                            }}>
                                                {item.name}
                                            </span>

                                            {/* NEW badge */}
                                            {tripleNewItems[idx] && (
                                                <span style={{
                                                    marginTop: '4px',
                                                    background: COLORS.green,
                                                    color: COLORS.bg,
                                                    fontSize: isMobile ? '8px' : '9px',
                                                    fontWeight: '700',
                                                    padding: isMobile ? '2px 6px' : '2px 8px',
                                                    borderRadius: '3px'
                                                }}>NEW</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
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