// ============================================
// CanvasCollectionGrid.jsx
// ============================================
// High-performance Canvas-based collection grid with virtual scrolling
// Only renders visible items, dramatically reducing DOM and improving load time

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { IMAGE_BASE_URL } from '../../../config/constants.js';
import { COLORS } from '../config/constants';
import { getItemImageUrl } from '../../../utils/helpers.js';
import { getRarityColor, getRarityOnColor, sampleHolo, sampleRamp, createHoloGradient } from '../../../utils/rarityHelpers.jsx';
import { isSaverOn, useSaverMode } from '../../../config/power.js';
import { getAtlasSprite, drawItemSprite, needsOwnImage } from './atlas.js';

// ============================================
// CONSTANTS
// ============================================

const ITEM_SIZE = 72; // Base item size
const ITEM_GAP = 8;   // Gap between items
const GRID_PADDING = 16; // Padding around grid for glows/badges
const BADGE_SIZE = 14;
const COUNT_BADGE_HEIGHT = 16;

// ============================================
// COLOR HELPERS
// ============================================

function hexToRgb(hex) {
    if (!hex) return { r: 0, g: 0, b: 0 };
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}

function lerpColor(c1, c2, t) {
    const rgb1 = typeof c1 === 'string' ? hexToRgb(c1) : c1;
    const rgb2 = typeof c2 === 'string' ? hexToRgb(c2) : c2;
    return {
        r: Math.round(rgb1.r + (rgb2.r - rgb1.r) * t),
        g: Math.round(rgb1.g + (rgb2.g - rgb1.g) * t),
        b: Math.round(rgb1.b + (rgb2.b - rgb1.b) * t)
    };
}

// ============================================
// IMAGE CACHE (LRU with max size)
// ============================================

const MAX_CACHE_SIZE = 500; // Maximum cached images
const imageCache = new Map();
const inFlightPromises = new Map();

// LRU cache helper - move entry to end (most recently used)
function touchCache(src) {
    if (imageCache.has(src)) {
        const value = imageCache.get(src);
        imageCache.delete(src);
        imageCache.set(src, value);
    }
}

// Evict oldest entries if cache exceeds max size
function evictIfNeeded() {
    while (imageCache.size > MAX_CACHE_SIZE) {
        // Map iterates in insertion order, so first key is oldest
        const oldestKey = imageCache.keys().next().value;
        imageCache.delete(oldestKey);
    }
}

function loadImage(src) {
    // Return cached image if available (and mark as recently used)
    if (imageCache.has(src)) {
        touchCache(src);
        return Promise.resolve(imageCache.get(src));
    }

    // Return in-flight promise if already loading
    if (inFlightPromises.has(src)) {
        return inFlightPromises.get(src);
    }

    // Create new loading promise
    const loadPromise = new Promise((resolve) => {
        const img = new Image();
        // Note: crossOrigin not needed since we only draw, never read pixels
        img.onload = () => {
            imageCache.set(src, img);
            evictIfNeeded();
            inFlightPromises.delete(src);
            resolve(img);
        };
        img.onerror = () => {
            // Try fallback
            const fallback = new Image();
            fallback.onload = () => {
                imageCache.set(src, fallback);
                evictIfNeeded();
                inFlightPromises.delete(src);
                resolve(fallback);
            };
            fallback.onerror = () => {
                // Cache null to prevent repeated attempts
                imageCache.set(src, null);
                evictIfNeeded();
                inFlightPromises.delete(src);
                resolve(null);
            };
            fallback.src = `${IMAGE_BASE_URL}/barrier.png`;
        };
        img.src = src;
    });

    inFlightPromises.set(src, loadPromise);
    return loadPromise;
}

// ============================================
// ROUNDED RECT HELPER - Browser Compatibility
// ============================================

function drawRoundedRectPath(ctx, x, y, w, h, r) {
    // Feature detect and use native roundRect if available
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y, w, h, r);
    } else {
        // Manual path construction fallback for older browsers
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}

// ============================================
// ITEM RENDERER
// ============================================

function drawItem(ctx, item, x, y, size, isCollected, count, images, time, isHovered) {
    const isInsane = item.type === 'insane';
    const isMythic = item.type === 'mythic';
    const isLegendary = item.type === 'legendary';
    const isExotic = item.type === 'exotic';
    const isRare = item.type === 'rare';
    const isSpecialType = isInsane || isMythic || isLegendary || isExotic || isRare;

    // Rarity colour comes from the shared ladder (utils/rarityHelpers.jsx); the
    // local ternary this replaced was one of the copies that had to be kept in
    // sync by hand. Note `item.type` is the persisted tier string, so an unknown
    // value falls through to common rather than throwing.
    const rarityColor = getRarityColor(item.type);

    const radius = 10;

    ctx.save();

    // Apply hover transform
    if (isHovered && isCollected) {
        ctx.translate(0, -4);
    }

    // ============================================
    // 1. SUBTLE BACKGROUND GLOW (reduced - border is the star)
    // ============================================
    if (isSpecialType && isCollected) {
        const glowSize = size * 1.2;
        const glowX = x - (glowSize - size) / 2;
        const glowY = y - (glowSize - size) / 2;

        let glowColor;
        let intensity;

        if (isInsane) {
            // Travels the oil-slick ramp rather than pulsing between two colours.
            const phase = (time % 2.4) / 2.4;
            intensity = 0.18 + Math.sin(phase * Math.PI * 4) * 0.06;
            glowColor = sampleHolo(phase);
        } else if (isMythic) {
            const phase = (time % 2) / 2;
            intensity = 0.12 + Math.sin(phase * Math.PI * 2) * 0.08; // Reduced
            glowColor = sampleRamp(COLORS.mythicCycle, phase);
        } else if (isLegendary) {
            // Steady gold — see the note in CanvasSpinningStrip. Legendary took
            // insane's colour, not insane's pulse; motion belongs to the tier
            // above it now.
            intensity = 0.17;
            glowColor = hexToRgb(COLORS.insane);
        } else if (isExotic) {
            const phase = (time % 2.5) / 2.5;
            const pulse = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
            intensity = 0.1 + pulse * 0.08; // Reduced
            glowColor = lerpColor(COLORS.purple, '#FF44FF', pulse);
        } else if (isRare) {
            const phase = (time % 2.5) / 2.5;
            const pulse = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
            intensity = 0.08 + pulse * 0.06; // Reduced
            glowColor = lerpColor(COLORS.red, '#FF7777', pulse);
        }

        if (glowColor) {
            const gradient = ctx.createRadialGradient(
                x + size/2, y + size/2, size * 0.35,
                x + size/2, y + size/2, glowSize * 0.55
            );
            gradient.addColorStop(0, `rgba(${glowColor.r}, ${glowColor.g}, ${glowColor.b}, ${intensity})`);
            gradient.addColorStop(0.6, `rgba(${glowColor.r}, ${glowColor.g}, ${glowColor.b}, ${intensity * 0.3})`);
            gradient.addColorStop(1, `rgba(${glowColor.r}, ${glowColor.g}, ${glowColor.b}, 0)`);

            ctx.fillStyle = gradient;
            ctx.fillRect(glowX, glowY, glowSize, glowSize);
        }
    }

    // ============================================
    // 2. BACKGROUND (subtle - let the border shine)
    // ============================================
    ctx.beginPath();
    drawRoundedRectPath(ctx, x, y, size, size, radius);

    if (isCollected) {
        // Create subtle gradient background
        const bgGradient = ctx.createLinearGradient(x, y, x + size, y + size);
        if (isInsane) {
            // All three slick hues at once, so a collected insane tile is
            // recognisable in a grid even when it is not the one being hovered.
            bgGradient.addColorStop(0, `${COLORS.insaneHolo[0]}22`);
            bgGradient.addColorStop(0.5, `${COLORS.insaneHolo[1]}1A`);
            bgGradient.addColorStop(1, `${COLORS.insaneHolo[2]}22`);
        } else if (isMythic) {
            bgGradient.addColorStop(0, `${COLORS.mythicCycle[0]}22`);
            bgGradient.addColorStop(0.5, `${COLORS.mythicCycle[1]}18`);
            bgGradient.addColorStop(1, `${COLORS.mythicCycle[2]}18`);
        } else if (isLegendary) {
            // One hue, two alphas — a plain gold wash rather than the gold->amber
            // blend it used to carry.
            bgGradient.addColorStop(0, `${COLORS.insane}22`);
            bgGradient.addColorStop(1, `${COLORS.insane}18`);
        } else if (isExotic) {
            bgGradient.addColorStop(0, `${COLORS.purple}22`);
            bgGradient.addColorStop(1, `${COLORS.red}18`);
        } else if (isRare) {
            bgGradient.addColorStop(0, `${COLORS.red}22`);
            bgGradient.addColorStop(1, `${COLORS.orange}18`);
        } else {
            bgGradient.addColorStop(0, COLORS.bgLight);
            bgGradient.addColorStop(1, COLORS.bgLight);
        }
        ctx.fillStyle = bgGradient;
    } else {
        ctx.fillStyle = COLORS.bg;
    }
    ctx.fill();

    // ============================================
    // 3. ANIMATED BORDER (the star of the show!)
    // ============================================
    ctx.beginPath();
    drawRoundedRectPath(ctx, x, y, size, size, radius);

    let borderColor;
    let animatedBorderColor = null;

    if (isSpecialType && isCollected) {
        // Animated border colors for special items
        if (isInsane) {
            // The border is a gradient, not a sampled colour.
            //
            // Sampling one point off the ramp per frame was the first attempt and
            // it is actively wrong: the ramp passes through magenta, aqua and gold,
            // which are exactly exotic, mythic and legendary. A tile that cycles
            // through the other tiers' colours reads as those tiers, one at a time
            // — caught in review with an insane tile sitting aqua next to a real
            // mythic and looking identical to it. Stroking the whole ramp keeps all
            // three hues present at once, which no other tier can imitate.
            //
            // animatedBorderColor stays a flat colour because shadowColor cannot
            // take a gradient; it feeds the bloom only.
            const bc = sampleHolo((time % 2.4) / 2.4);
            animatedBorderColor = `rgb(${bc.r}, ${bc.g}, ${bc.b})`;
            borderColor = createHoloGradient(ctx, x, size, (time % 2.4) / 2.4);
        } else if (isMythic) {
            const bc = sampleRamp(COLORS.mythicCycle, (time % 1.5) / 1.5);
            animatedBorderColor = `rgb(${bc.r}, ${bc.g}, ${bc.b})`;
            borderColor = animatedBorderColor;
        } else if (isLegendary) {
            // Flat gold, no cycle. animatedBorderColor is still set because it is
            // what gates the multi-pass glow strokes below — legendary keeps its
            // bloom, it just no longer breathes.
            animatedBorderColor = COLORS.insane;
            borderColor = animatedBorderColor;
        } else if (isExotic) {
            const phase = (time % 2) / 2;
            const pulse = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
            const bc = lerpColor(COLORS.purple, '#FF44FF', pulse);
            animatedBorderColor = `rgb(${bc.r}, ${bc.g}, ${bc.b})`;
            borderColor = animatedBorderColor;
        } else if (isRare) {
            const phase = (time % 2) / 2;
            const pulse = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
            const bc = lerpColor(COLORS.red, '#FF7777', pulse);
            animatedBorderColor = `rgb(${bc.r}, ${bc.g}, ${bc.b})`;
            borderColor = animatedBorderColor;
        }
    } else {
        // Static border colours. Uncollected tiles keep the tier's colour at 44
        // alpha, so the silhouette of what is still missing reads as its rarity.
        if (isSpecialType) {
            borderColor = isCollected ? rarityColor : `${rarityColor}44`;
        } else {
            borderColor = isCollected ? `${COLORS.gold}66` : COLORS.border;
        }
    }

    // Draw glowing border for collected special items (multiple passes for glow effect)
    if (isSpecialType && isCollected && animatedBorderColor) {
        // shadowColor needs a flat colour (it cannot take a gradient), so the bloom
        // uses the sampled point while the stroke itself uses borderColor — which
        // is the full slick for insane and the same sampled colour for every other
        // tier. Stroking animatedBorderColor here instead is what made the earlier
        // gradient border silently do nothing.
        ctx.shadowColor = animatedBorderColor;
        ctx.shadowBlur = isInsane ? 20 : isMythic ? 18 : 14;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Middle glow layer
        ctx.shadowBlur = isInsane ? 12 : isMythic ? 10 : 8;
        ctx.stroke();

        // Inner crisp border
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2;
        ctx.stroke();
    } else {
        // Regular border
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // ============================================
    // 4. ITEM IMAGE
    // ============================================
    const imgSrc = getItemImageUrl(item);
    const img = images.get(imgSrc);

    const imgScale = 0.7;
    const imgSize = size * imgScale;
    const imgX = x + (size - imgSize) / 2;
    const imgY = y + (size - imgSize) / 2;

    if (img || getAtlasSprite(item)) {
        ctx.save();

        // Apply grayscale and opacity for uncollected
        if (!isCollected) {
            ctx.globalAlpha = 0.2;
            // Feature detect ctx.filter (not supported in Safari)
            if ('filter' in ctx) {
                ctx.filter = 'grayscale(100%)';
            }
            // Safari fallback: globalAlpha alone provides visual distinction
        }

        // Pixelated for Minecraft items, smooth for player heads
        const useSmooth = item.username || isInsane || isMythic;
        ctx.imageSmoothingEnabled = useSmooth;
        ctx.imageSmoothingQuality = useSmooth ? 'high' : 'low';

        drawItemSprite(ctx, item, img, imgX, imgY, imgSize);

        // Reset filter and alpha (restore handles this, but be explicit)
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        ctx.restore();
    } else {
        // Placeholder while loading
        ctx.fillStyle = `${rarityColor}22`;
        ctx.fillRect(imgX, imgY, imgSize, imgSize);
    }

    // ============================================
    // 5. RARITY BADGE (top-right)
    // ============================================
    if (isSpecialType) {
        const badgeX = x + size - BADGE_SIZE/2 - 2;
        const badgeY = y - BADGE_SIZE/2 + 2;

        ctx.beginPath();
        ctx.arc(badgeX, badgeY + BADGE_SIZE/2, BADGE_SIZE/2, 0, Math.PI * 2);

        if (isCollected) {
            // The corner badge follows the tier's own palette. Every branch here
            // was still on the pre-rebuild colours: insane gold, mythic running
            // through purple and gold, legendary purple->gold, and exotic falling
            // through to rare's red because it had no branch at all.
            const badgeGradient = ctx.createLinearGradient(badgeX - 7, badgeY, badgeX + 7, badgeY + 14);
            if (isInsane) {
                badgeGradient.addColorStop(0, COLORS.insaneHolo[0]);
                badgeGradient.addColorStop(0.5, COLORS.insaneHolo[1]);
                badgeGradient.addColorStop(1, COLORS.insaneHolo[2]);
            } else if (isMythic) {
                badgeGradient.addColorStop(0, COLORS.mythicCycle[0]);
                badgeGradient.addColorStop(0.5, COLORS.mythicCycle[1]);
                badgeGradient.addColorStop(1, COLORS.mythicCycle[2]);
            } else if (isLegendary) {
                badgeGradient.addColorStop(0, COLORS.insane);
                badgeGradient.addColorStop(1, COLORS.insane);
            } else if (isExotic) {
                badgeGradient.addColorStop(0, COLORS.purple);
                badgeGradient.addColorStop(1, COLORS.red);
            } else {
                badgeGradient.addColorStop(0, COLORS.red);
                badgeGradient.addColorStop(1, COLORS.red);
            }
            ctx.fillStyle = badgeGradient;
        } else {
            ctx.fillStyle = COLORS.bgLighter || '#3a3a5a';
        }
        ctx.fill();

        ctx.strokeStyle = isCollected ? rarityColor : COLORS.border;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Badge icon (simplified). Canvas cannot draw the Lucide glyphs the DOM
        // uses, so these are the nearest unicode stand-ins — exotic gets a gem
        // rather than falling through to rare's diamond, which is what the old
        // chain did the moment the tier existed.
        //
        // Foreground comes from the shared ladder — see getRarityOnColor. White on
        // mythic's #55FFFF is 1.2:1.
        ctx.fillStyle = isCollected ? getRarityOnColor(item.type) : COLORS.textMuted;
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const iconChar = isInsane ? '♕' : isMythic ? '✦' : isLegendary ? '★' : isExotic ? '❖' : '◆';
        ctx.fillText(iconChar, badgeX, badgeY + BADGE_SIZE/2);
    }

    // ============================================
    // 6. COUNT BADGE (bottom-right)
    // ============================================
    if (count > 1) {
        const countText = `x${count}`;
        ctx.font = 'bold 10px sans-serif';
        const textWidth = ctx.measureText(countText).width;
        const badgeWidth = Math.max(textWidth + 10, 18);
        const badgeX = x + size - badgeWidth - 2;
        const badgeY = y + size - COUNT_BADGE_HEIGHT - 2;

        ctx.beginPath();
        drawRoundedRectPath(ctx, badgeX, badgeY, badgeWidth, COUNT_BADGE_HEIGHT, 4);
        ctx.fillStyle = rarityColor;
        ctx.fill();

        // The count sits on rarityColor, so it takes the same on-fill foreground.
        ctx.fillStyle = getRarityOnColor(item.type);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(countText, badgeX + badgeWidth/2, badgeY + COUNT_BADGE_HEIGHT/2);
    } else if (isCollected && !isSpecialType) {
        // Check mark for common collected items
        const checkX = x + size - 14;
        const checkY = y + size - 14;
        ctx.fillStyle = COLORS.green;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', checkX, checkY);
    }

    ctx.restore();
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CanvasCollectionGrid({
                                         items = [],
                                         collection = {},
                                         onItemClick,
                                         containerHeight = 400,
                                     }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const animationRef = useRef(null);
    const imagesRef = useRef(new Map());
    const timeRef = useRef(0);

    // Use refs for fast-changing values to avoid RAF effect teardown
    const scrollTopRef = useRef(0);
    const containerWidthRef = useRef(400);
    const hoveredIndexRef = useRef(-1);

    // State for values that need to trigger re-renders (layout calculation)
    const [containerWidth, setContainerWidth] = useState(400);
    const [scrollTop, setScrollTop] = useState(0);

    // Calculate grid layout (needs state for useMemo)
    const layout = useMemo(() => {
        const cellSize = ITEM_SIZE + ITEM_GAP;
        // Account for padding on both sides
        const availableWidth = containerWidth - (GRID_PADDING * 2);
        const cols = Math.max(1, Math.floor((availableWidth + ITEM_GAP) / cellSize));
        const rows = Math.ceil(items.length / cols);
        // Add padding to total height
        const totalHeight = rows * cellSize + (GRID_PADDING * 2);
        return { cols, rows, cellSize, totalHeight };
    }, [containerWidth, items.length]);

    // Keep layout ref in sync for RAF
    const layoutRef = useRef(layout);
    useEffect(() => {
        layoutRef.current = layout;
    }, [layout]);

    // Load visible images
    useEffect(() => {
        if (items.length === 0) return;

        const { cols, cellSize } = layout;
        const adjustedScrollTop = Math.max(0, scrollTop - GRID_PADDING);
        const startRow = Math.floor(adjustedScrollTop / cellSize);
        const visibleRows = Math.ceil(containerHeight / cellSize) + 2;
        const endRow = Math.min(startRow + visibleRows, layout.rows);

        const visibleItems = [];
        for (let row = startRow; row < endRow; row++) {
            for (let col = 0; col < cols; col++) {
                const idx = row * cols + col;
                if (idx < items.length) {
                    visibleItems.push(items[idx]);
                }
            }
        }

        // Load images for visible items. Pool sprites come from the atlas, so
        // this is now only the heads and custom art — which is also why the LRU
        // cache below stopped mattering much: the thing that used to evict it was
        // scrolling through a thousand item sprites.
        Promise.all(visibleItems.filter(needsOwnImage).map(item => {
            const src = getItemImageUrl(item);
            return loadImage(src).then(img => {
                if (img) imagesRef.current.set(src, img);
            });
        })).then(() => {
            // A sprite arriving after the loop parked is the one case where the
            // canvas is stale and no interaction is coming to fix it: outside
            // saver mode the next frame picks it up on its own, and in saver
            // mode there is no next frame until something asks.
            requestDrawRef.current?.();
        }).catch(err => {
            console.warn('Failed to preload some collection images:', err);
        });
    }, [items, layout, scrollTop, containerHeight]);

    // Measure container with ResizeObserver feature check
    useEffect(() => {
        if (!containerRef.current) return;

        const updateWidth = (width) => {
            containerWidthRef.current = width;
            setContainerWidth(width);
        };

        // Feature detect ResizeObserver
        if (typeof ResizeObserver !== 'undefined') {
            const observer = new ResizeObserver(entries => {
                for (const entry of entries) {
                    updateWidth(entry.contentRect.width);
                }
            });

            observer.observe(containerRef.current);
            return () => observer.disconnect();
        } else {
            // Fallback to window resize
            const handleResize = () => {
                if (containerRef.current) {
                    updateWidth(containerRef.current.getBoundingClientRect().width);
                }
            };
            handleResize();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    // Canvas sizing effect - only runs when dimensions change
    const lastSizeRef = useRef({ width: 0, height: 0, dpr: 1 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const width = containerWidth;
        const height = containerHeight;

        // Only resize if dimensions actually changed
        if (lastSizeRef.current.width !== width ||
            lastSizeRef.current.height !== height ||
            lastSizeRef.current.dpr !== dpr) {

            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            const ctx = canvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            lastSizeRef.current = { width, height, dpr };
        }
    }, [containerWidth, containerHeight]);

    // Keep items and collection refs in sync for RAF
    const itemsRef = useRef(items);
    const collectionRef = useRef(collection);
    // Saver mode's park-and-wake pair — see the loop below and requestDraw.
    const parkedRef = useRef(false);
    const renderRef = useRef(null);
    const saverMode = useSaverMode();
    // `requestDraw` is declared after the sprite preloader that has to call it,
    // and hoisting it above would put a callback between two effects that read
    // as one block. The ref is the seam.
    const requestDrawRef = useRef(null);
    useEffect(() => {
        itemsRef.current = items;
    }, [items]);
    useEffect(() => {
        collectionRef.current = collection;
    }, [collection]);

    // Animation loop - reads from refs for stable effect
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let lastTime = performance.now();
        let frameCount = 0;
        const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 600;

        const render = (timestamp) => {
            // Mobile throttling: 30fps to save battery
            frameCount++;
            if (isMobileDevice && frameCount % 2 !== 0) {
                animationRef.current = requestAnimationFrame(render);
                return;
            }

            // ── Saver mode draws on demand ───────────────────────────────────
            //
            // The board is a still picture that happens to redraw sixty times a
            // second. Everything that makes it change — a scroll, a hover, a new
            // item arriving — is an event, and events can ask for a frame. Only
            // the insane tiles' hue drift is genuinely per-frame, and in saver
            // mode that is the thing being switched off anyway.
            //
            // So: draw this frame, then stop, and let `requestDraw` below wake
            // the loop when something actually moves. A parked grid on the
            // collection page is a phone doing nothing while the player reads.
            if (parkedRef.current) {
                animationRef.current = null;
                return;
            }
            const shouldPark = isSaverOn();

            // Use real delta time
            const dt = (timestamp - lastTime) / 1000;
            lastTime = timestamp;
            timeRef.current += dt;
            const time = timeRef.current;

            // Read from refs for latest values
            const currentItems = itemsRef.current;
            const currentCollection = collectionRef.current;
            const currentLayout = layoutRef.current;
            const currentScrollTop = scrollTopRef.current;
            const currentHoveredIndex = hoveredIndexRef.current;
            const width = containerWidthRef.current;
            const height = containerHeight;

            // Clear (use identity transform for clearing, then restore scale)
            const dpr = window.devicePixelRatio || 1;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Calculate visible range (account for padding)
            const { cols, cellSize, rows } = currentLayout;
            const adjustedScrollTop = Math.max(0, currentScrollTop - GRID_PADDING);
            const startRow = Math.floor(adjustedScrollTop / cellSize);
            const visibleRows = Math.ceil(height / cellSize) + 2;
            const endRow = Math.min(startRow + visibleRows, rows);

            // Draw visible items
            for (let row = startRow; row < endRow; row++) {
                for (let col = 0; col < cols; col++) {
                    const idx = row * cols + col;
                    if (idx >= currentItems.length) continue;

                    const item = currentItems[idx];
                    // Add padding offset to positions
                    const x = GRID_PADDING + col * cellSize;
                    const y = GRID_PADDING + row * cellSize - currentScrollTop;
                    const count = currentCollection[item.texture] || 0;
                    const isCollected = count > 0;
                    const isHovered = idx === currentHoveredIndex;

                    drawItem(ctx, item, x, y, ITEM_SIZE, isCollected, count, imagesRef.current, time, isHovered);
                }
            }

            if (shouldPark) {
                parkedRef.current = true;
                animationRef.current = null;
                return;
            }

            animationRef.current = requestAnimationFrame(render);
        };

        renderRef.current = render;
        parkedRef.current = false;
        animationRef.current = requestAnimationFrame(render);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
        };
    }, [containerHeight]); // Stable deps - containerHeight is a prop

    /**
     * Ask for a frame.
     *
     * Cheap and idempotent by design — the interaction handlers call it on every
     * scroll event and every pointer move, and outside saver mode it is a single
     * `if` that does nothing because the loop was never parked.
     */
    const requestDraw = useCallback(() => {
        if (!parkedRef.current || !renderRef.current) return;
        parkedRef.current = false;
        animationRef.current = requestAnimationFrame(renderRef.current);
    }, []);
    requestDrawRef.current = requestDraw;

    // A pull lands, a filter changes, or the player leaves saver mode: all three
    // are reasons the board no longer matches what is on the canvas.
    useEffect(() => { requestDraw(); }, [items, collection, saverMode, requestDraw]);

    // Handle scroll - update both ref (for RAF) and state (for image loading effect)
    const handleScroll = useCallback((e) => {
        const newScrollTop = e.target.scrollTop;
        scrollTopRef.current = newScrollTop;
        setScrollTop(newScrollTop);
        requestDraw();
    }, [requestDraw]);

    // Helper to get item index at a point (shared by mouse move and click)
    const getItemIndexAtPoint = useCallback((clientX, clientY, rect) => {
        const x = clientX - rect.left - GRID_PADDING;
        const y = clientY - rect.top;

        const { cols, cellSize } = layoutRef.current;
        const col = Math.floor(x / cellSize);
        const row = Math.floor((y + scrollTopRef.current - GRID_PADDING) / cellSize);
        const idx = row * cols + col;

        if (idx >= 0 && idx < itemsRef.current.length && col >= 0 && col < cols && row >= 0) {
            return idx;
        }
        return -1;
    }, []); // Stable - reads from refs

    // Handle mouse move for hover - only update ref (no state needed)
    const handleMouseMove = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const idx = getItemIndexAtPoint(e.clientX, e.clientY, rect);
        if (idx === hoveredIndexRef.current) return;
        hoveredIndexRef.current = idx;
        requestDraw();
    }, [getItemIndexAtPoint, requestDraw]);

    // Handle mouse leave
    const handleMouseLeave = useCallback(() => {
        hoveredIndexRef.current = -1;
        requestDraw();
    }, [requestDraw]);

    // Handle click
    const handleClick = useCallback((e) => {
        if (!onItemClick) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const idx = getItemIndexAtPoint(e.clientX, e.clientY, rect);

        if (idx >= 0) {
            onItemClick(itemsRef.current[idx]);
        }
    }, [getItemIndexAtPoint, onItemClick]);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                width: '100%',
                height: `${containerHeight}px`,
                overflow: 'hidden',
            }}
        >
            {/* Canvas layer - underneath, no pointer events */}
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    pointerEvents: 'none',
                }}
            />

            {/* Scrollable container - on top, handles all interactions */}
            <div
                onScroll={handleScroll}
                onClick={handleClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    cursor: 'pointer',
                    zIndex: 1,
                }}
            >
                {/* Spacer for scroll height */}
                <div style={{ height: `${layout.totalHeight}px`, pointerEvents: 'none' }} />
            </div>

            {/* Empty state */}
            {items.length === 0 && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: COLORS.textMuted,
                    zIndex: 2,
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
                    <div>No items found</div>
                </div>
            )}
        </div>
    );
}

export default CanvasCollectionGrid;