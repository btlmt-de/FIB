// ============================================
// CanvasCollectionGrid.jsx
// ============================================
// High-performance Canvas-based collection grid with virtual scrolling
// Only renders visible items, dramatically reducing DOM and improving load time

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { IMAGE_BASE_URL } from '../../../config/constants.js';
import { COLORS } from '../config/constants';
import { getItemImageUrl } from '../../../utils/helpers.js';
import { getRarityColor, getRarityInk, getRarityOnColor, getRarityStops, sampleHolo, sampleRamp, createHoloGradient } from '../../../utils/rarityHelpers.jsx';
import { isSaverOn, useSaverMode } from '../../../config/power.js';
import { getAtlasSprite, drawItemSprite, needsOwnImage } from './atlas.js';

// ============================================
// CONSTANTS
// ============================================

// The platform's geometry lives with the renderer that draws against it — see
// TARGET_CELL / ITEM_GAP / GRID_PADDING below. Keeping it here as well is how the
// wheel earned "the constant that outlived its geometry" five times in one
// session: a second file restating a pitch is a second file that can disagree
// about it.

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
// THE PLATFORM — one mounted item
// ============================================
//
// A cell is an object mounted in a case, and its tier is the rim of light around
// the mount.
//
// ── WHY THIS IS NOT THE REEL'S GRAMMAR, AFTER TRYING IT ──────────────────────
//
// The first version of this board drew the cell exactly as the band draws a
// slot: a wash rising from a floor line, a base bar as the emitter, a filament,
// bottom-weighted seams, no light at all on a common. It is the same rule —
// DESIGN.md §8's "rarity is light, never a container" — and on the reel it is
// unarguable. Here it was wrong, and the owner called it on sight.
//
// The reason is that the two surfaces do different things with an item. **The
// reel moves items past a single focal slot; the platform holds them still and
// on display.** A shaft of light reads as "this one is arriving" — it is
// directional, it has a floor and a ceiling, and it earns its meaning from
// travel. Take the travel away and stand fifteen of them in a row and the light
// has nothing to be about: what you get is a floor-lit strip where the part with
// the item in it is the dimmest part of the cell. That was already the known
// weakness in the band ("the empty middle") and the band survives it because
// each slot is on screen for a moment. A case does not have moments.
//
// A display case mounts its objects in a rim. So the tier is a rim here: a lit
// border around the mount, animated on the tiers whose identity is motion, with
// a bloom that says the object inside is worth the frame. It is a container, and
// on this surface that is the correct answer — the ladder still climbs, and it
// climbs in the one dimension a static grid can actually read at a glance.
//
// ── WHAT IS KEPT FROM THE FIRST BUILD ────────────────────────────────────────
//
// Two things, because they were never what was wrong:
//
//   · **A collected common gets no colour.** The original book gave every held
//     common a gold rim, which is most of why 1,559 items shouted at one volume.
//     A common gets a quiet rail-light rim that says "held" and nothing more.
//   · **A missing item is a recess**, cut darker than the platform, holding its
//     tier's hue at low alpha so the silhouette of what is still out there reads
//     as what it is.
//
// And the ladder is still the shared one in rarityHelpers.jsx. Not one tier hue
// is spelled here.

const ITEM_GAP = 8;      // Room for a rim and its bloom to breathe.
const GRID_PADDING = 14; // So the first row's bloom is not clipped by the mount.
const TARGET_CELL = 88;  // Cell pitch target; the real pitch fills the platform.
const BADGE_SIZE = 15;

function rgbaOf(colour, alpha) {
    const c = typeof colour === 'string' ? hexToRgb(colour) : colour;
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
}

/**
 * The tier's live rim, as {stroke, bloom, drift}.
 *
 * `stroke` is what the border is painted with and may be a gradient; `bloom` is
 * a flat colour, because canvas `shadowColor` cannot take one. `drift` is how
 * much the tier moves, 0 for the tiers that hold still.
 *
 * The two animated tiers keep the rule DESIGN.md §8 states twice: **paint an
 * animated tier with the whole gradient, never a single sampled point.** Insane's
 * ramp passes through magenta, aqua and gold — which are exotic, mythic and
 * legendary — so a border taking one colour off it spends two thirds of every
 * cycle impersonating the tiers below it. That bug shipped once here already and
 * the comment recording it is why this function returns a stroke and a bloom
 * separately rather than one colour.
 */
function tierRim(ctx, type, x, size, time) {
    switch (type) {
        case 'insane': {
            const phase = (time % 2.4) / 2.4;
            const s = sampleHolo(phase);
            return {
                stroke: createHoloGradient(ctx, x, size, phase),
                bloom: `rgb(${s.r}, ${s.g}, ${s.b})`,
                drift: 0.18 + Math.sin(phase * Math.PI * 4) * 0.06,
                blur: 20,
            };
        }
        case 'mythic': {
            const s = sampleRamp(COLORS.mythicCycle, (time % 1.5) / 1.5);
            const flat = `rgb(${s.r}, ${s.g}, ${s.b})`;
            return { stroke: flat, bloom: flat, drift: 0.14 + Math.sin((time % 2) / 2 * Math.PI * 2) * 0.06, blur: 18 };
        }
        case 'legendary': {
            // Steady gold, and deliberately so: motion belongs to the tiers above
            // it. Legendary took insane's colour when the ladder was rebuilt, not
            // insane's pulse.
            const flat = getRarityColor('legendary');
            return { stroke: flat, bloom: flat, drift: 0.17, blur: 15 };
        }
        case 'exotic':
        case 'rare':
        case 'event': {
            const flat = getRarityColor(type);
            const pulse = Math.sin((time % 2.5) / 2.5 * Math.PI * 2) * 0.5 + 0.5;
            return { stroke: flat, bloom: flat, drift: 0.10 + pulse * 0.07, blur: 13 };
        }
        default:
            return null;
    }
}

/** The tier's mark, drawn rather than typed. */
function drawTierGlyph(ctx, type, cx, cy, r) {
    ctx.beginPath();
    switch (type) {
        case 'insane': { // a crown
            ctx.moveTo(cx - r, cy + r * 0.55);
            ctx.lineTo(cx - r * 1.05, cy - r * 0.75);
            ctx.lineTo(cx - r * 0.42, cy - r * 0.05);
            ctx.lineTo(cx, cy - r * 0.95);
            ctx.lineTo(cx + r * 0.42, cy - r * 0.05);
            ctx.lineTo(cx + r * 1.05, cy - r * 0.75);
            ctx.lineTo(cx + r, cy + r * 0.55);
            ctx.closePath();
            break;
        }
        case 'mythic': { // a four-point sparkle
            ctx.moveTo(cx, cy - r);
            ctx.quadraticCurveTo(cx + r * 0.18, cy - r * 0.18, cx + r, cy);
            ctx.quadraticCurveTo(cx + r * 0.18, cy + r * 0.18, cx, cy + r);
            ctx.quadraticCurveTo(cx - r * 0.18, cy + r * 0.18, cx - r, cy);
            ctx.quadraticCurveTo(cx - r * 0.18, cy - r * 0.18, cx, cy - r);
            break;
        }
        case 'legendary': { // a five-point star
            for (let i = 0; i < 10; i++) {
                const rad = i % 2 === 0 ? r : r * 0.45;
                const a = -Math.PI / 2 + (i * Math.PI) / 5;
                const px = cx + Math.cos(a) * rad;
                const py = cy + Math.sin(a) * rad;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            break;
        }
        case 'exotic': { // a cut gem
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx + r * 0.92, cy - r * 0.2);
            ctx.lineTo(cx, cy + r);
            ctx.lineTo(cx - r * 0.92, cy - r * 0.2);
            ctx.closePath();
            break;
        }
        default: { // a rhombus
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx + r * 0.78, cy);
            ctx.lineTo(cx, cy + r);
            ctx.lineTo(cx - r * 0.78, cy);
            ctx.closePath();
        }
    }
    ctx.fill();
}

function drawItem(ctx, item, x, y, size, isCollected, count, images, time, isHovered, isFocused) {
    const type = item.type || 'common';
    const isSpecial = type !== 'common';
    const tierColor = getRarityColor(type);
    const rim = isSpecial && isCollected ? tierRim(ctx, type, x, size, time) : null;

    ctx.save();

    // Hovering lifts the object in its mount. A small translate, because on a
    // case the thing that moves is the object and not the light.
    if (isHovered && isCollected) ctx.translate(0, -3);

    // ── 1. The bloom ─────────────────────────────────────────────────────────
    // Behind the mount, so the rim's own glow reads as light escaping the case
    // rather than as a halo pasted over the deck.
    if (rim) {
        const spread = size * 1.25;
        const g = ctx.createRadialGradient(
            x + size / 2, y + size / 2, size * 0.34,
            x + size / 2, y + size / 2, spread * 0.55,
        );
        g.addColorStop(0, rgbaOf(rim.bloom, rim.drift));
        g.addColorStop(0.6, rgbaOf(rim.bloom, rim.drift * 0.3));
        g.addColorStop(1, rgbaOf(rim.bloom, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x - (spread - size) / 2, y - (spread - size) / 2, spread, spread);
    }

    // ── 2. The mount ─────────────────────────────────────────────────────────
    // Square, like everything else on this board. The rim is the frame; a radius
    // on top of it would be a second one.
    if (isCollected) {
        if (isSpecial) {
            const fill = ctx.createLinearGradient(x, y, x + size, y + size);
            const stops = getRarityStops(type);
            if (stops && stops.length >= 3) {
                // An animated tier fills with its whole ramp for the same reason
                // its border strokes with it — one sampled point is another
                // tier's colour two thirds of the time.
                fill.addColorStop(0, `${stops[0]}24`);
                fill.addColorStop(0.5, `${stops[1]}1A`);
                fill.addColorStop(1, `${stops[2]}22`);
            } else {
                fill.addColorStop(0, `${tierColor}24`);
                fill.addColorStop(1, `${tierColor}16`);
            }
            ctx.fillStyle = fill;
        } else {
            ctx.fillStyle = 'rgba(206,214,236,0.045)';
        }
    } else {
        // Missing: a recess cut deeper than the platform.
        ctx.fillStyle = 'rgba(0,0,0,0.34)';
    }
    ctx.fillRect(x, y, size, size);

    // ── 3. The rim ───────────────────────────────────────────────────────────
    ctx.lineWidth = 2;
    if (rim) {
        // Three passes: two blurred for the bloom, one crisp on top. The stroke
        // is `rim.stroke` every time — which is the full gradient on insane —
        // while only shadowColor takes the flat sample, because it cannot take
        // anything else. Stroking the sample instead is what made an earlier
        // gradient border silently do nothing.
        ctx.strokeStyle = rim.stroke;
        ctx.shadowColor = rim.bloom;
        ctx.shadowBlur = rim.blur;
        ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
        ctx.shadowBlur = rim.blur * 0.6;
        ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
        ctx.shadowBlur = 0;
        ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
    } else {
        ctx.shadowBlur = 0;
        // A held common says "held" and nothing about rarity — the original book
        // gave it a gold rim, and gold means legendary one row up.
        ctx.strokeStyle = isCollected
            ? 'rgba(206,214,236,0.20)'
            : (isSpecial ? `${tierColor}44` : 'rgba(206,214,236,0.07)');
        ctx.lineWidth = isCollected ? 1 : 2;
        ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
        ctx.lineWidth = 2;
    }

    // ── 4. The object ────────────────────────────────────────────────────────
    const imgSrc = getItemImageUrl(item);
    const img = images.get(imgSrc);
    const imgSize = Math.round(size * 0.62);
    const imgX = x + (size - imgSize) / 2;
    const imgY = y + (size - imgSize) / 2;

    if (img || getAtlasSprite(item)) {
        ctx.save();
        if (!isCollected) {
            ctx.globalAlpha = 0.18;
            if ('filter' in ctx) ctx.filter = 'grayscale(100%)';
        }
        // Every sprite here is a downscale (the atlas tile is 96px), and
        // nearest-neighbour downscaling drops different source pixels frame to
        // frame. Unconditional, for the same reason it is in the band.
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        drawItemSprite(ctx, item, img, imgX, imgY, imgSize);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        ctx.restore();
    } else if (isCollected) {
        ctx.fillStyle = 'rgba(206,214,236,0.05)';
        ctx.fillRect(imgX, imgY, imgSize, imgSize);
    }

    // ── 5. The tier's mark ───────────────────────────────────────────────────
    // Vector paths, not unicode stand-ins. The original set these with ♕ ✦ ★ ❖ ◆
    // in whatever the platform's default sans happened to be, which is a
    // different glyph on every OS and none of them the shape the DOM draws one
    // panel over — the same tier is a Lucide Crown in the register and was a
    // Windows dingbat here.
    if (isSpecial) {
        const bx = x + size - BADGE_SIZE / 2 - 1;
        const by = y + BADGE_SIZE / 2 + 1;

        ctx.beginPath();
        ctx.arc(bx, by, BADGE_SIZE / 2, 0, Math.PI * 2);
        ctx.fillStyle = isCollected ? (rim ? rim.bloom : tierColor) : 'rgba(10,13,24,0.92)';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = isCollected ? 'rgba(0,0,0,0.35)' : `${tierColor}55`;
        ctx.stroke();

        ctx.fillStyle = isCollected ? getRarityOnColor(type) : `${tierColor}99`;
        drawTierGlyph(ctx, type, bx, by, BADGE_SIZE * 0.29);
    }

    // ── 6. The count ─────────────────────────────────────────────────────────
    if (count > 1) {
        ctx.font = "700 11px 'Barlow Condensed', system-ui, sans-serif";
        ctx.textAlign = 'right';
        ctx.textBaseline = 'alphabetic';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 3;
        ctx.fillStyle = isSpecial
            ? rgbaOf(hexToRgb(getRarityInk(type)), 0.98)
            : 'rgba(206,214,236,0.48)';
        ctx.fillText(`${count}`, x + size - 5, y + size - 5);
        ctx.shadowBlur = 0;
    }

    // ── 7. Focus ─────────────────────────────────────────────────────────────
    // The keyboard's caret, in station amber — the reader's cursor, not a claim
    // about the item, so it never borrows a tier's colour. Drawn outside the rim
    // so a tier's own border stays readable underneath it.
    if (isFocused) {
        ctx.strokeStyle = '#FFAA00';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 2, y - 2, size + 4, size + 4);
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
                                         onItemFocus,
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
    // The keyboard's position on the platform. A ref because the render loop
    // reads it every frame and a state write per arrow key would tear down the
    // RAF effect; the scroller is the focusable element, so React never needs to
    // re-render for the caret to move.
    const focusedIndexRef = useRef(-1);
    const scrollerRef = useRef(null);

    // State for values that need to trigger re-renders (layout calculation)
    const [containerWidth, setContainerWidth] = useState(400);
    const [scrollTop, setScrollTop] = useState(0);

    // Calculate grid layout (needs state for useMemo)
    const layout = useMemo(() => {
        // The pitch still divides the platform exactly — no ragged column of
        // dead deck on the right — but a cell is now a pitch with a gap in it,
        // because a rim and its bloom need somewhere to be. `cellSize` is the
        // pitch; `tileSize` is the mount drawn inside it.
        const availableWidth = Math.max(TARGET_CELL, containerWidth - GRID_PADDING * 2);
        const cols = Math.max(1, Math.round(availableWidth / TARGET_CELL));
        const cellSize = availableWidth / cols;
        const tileSize = cellSize - ITEM_GAP;
        const rows = Math.ceil(items.length / cols);
        const totalHeight = rows * cellSize + GRID_PADDING * 2;
        return { cols, rows, cellSize, tileSize, totalHeight };
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
            const height = containerHeight;

            // Clear (use identity transform for clearing, then restore scale)
            const dpr = window.devicePixelRatio || 1;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Calculate visible range (account for padding)
            const { cols, cellSize, tileSize, rows } = currentLayout;
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
                    const x = GRID_PADDING + col * cellSize + ITEM_GAP / 2;
                    const y = GRID_PADDING + row * cellSize + ITEM_GAP / 2 - currentScrollTop;
                    const count = currentCollection[item.texture] || 0;
                    const isCollected = count > 0;
                    const isHovered = idx === currentHoveredIndex;
                    const isFocused = idx === focusedIndexRef.current;

                    drawItem(ctx, item, x, y, tileSize, isCollected, count, imagesRef.current, time, isHovered, isFocused);
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

    // Published to the ref in an effect, not in the render body. Writing a ref
    // during render is a purity violation React can and does punish — under
    // StrictMode or a re-render that never commits, the ref would carry a
    // callback from a render that was thrown away. The cleanup only clears the
    // slot if it still holds *this* callback, so a fast re-render cannot have
    // its successor's value wiped by its predecessor's teardown.
    useEffect(() => {
        requestDrawRef.current = requestDraw;
        return () => {
            if (requestDrawRef.current === requestDraw) requestDrawRef.current = null;
        };
    }, [requestDraw]);

    // A pull lands, a filter changes, or the player leaves saver mode: all three
    // are reasons the board no longer matches what is on the canvas.
    useEffect(() => { requestDraw(); }, [items, collection, saverMode, requestDraw]);

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

    /*
     * Everything that changes what the reader is pointing at goes through here.
     *
     * `onItemFocus` fires only when the index actually changes, so sweeping the
     * pointer across the platform costs one parent render per cell crossed
     * rather than one per mousemove event — and the RAF loop still reads the
     * hover from a ref, so the canvas itself never re-mounts.
     *
     * It is also the one place saver mode has to ask for a frame on hover. The
     * early return above is exactly the right gate for that: a parked loop needs
     * waking when the lift moves to a different cell, and never when the pointer
     * merely travelled a few pixels inside the one it was already on.
     */
    const announce = useCallback((idx) => {
        if (idx === hoveredIndexRef.current) return;
        hoveredIndexRef.current = idx;
        requestDraw();
        if (!onItemFocus) return;
        const item = idx >= 0 ? itemsRef.current[idx] : null;
        onItemFocus(item
            ? { name: item.name, type: item.type || 'common', held: collectionRef.current[item.texture] || 0 }
            : null);
    }, [onItemFocus, requestDraw]);

    // The last place the pointer was, in client coords. Scrolling the wheel does
    // not fire a mousemove, so without this the lift stayed on whichever cell
    // *used* to be under a stationary cursor and the readout named the wrong item.
    const pointerRef = useRef(null);

    const handleMouseMove = useCallback((e) => {
        pointerRef.current = { x: e.clientX, y: e.clientY };
        const rect = e.currentTarget.getBoundingClientRect();
        announce(getItemIndexAtPoint(e.clientX, e.clientY, rect));
    }, [getItemIndexAtPoint, announce]);

    const handleMouseLeave = useCallback(() => {
        pointerRef.current = null;
        announce(-1);
    }, [announce]);

    // Handle scroll - update both ref (for RAF) and state (for image loading effect)
    const handleScroll = useCallback((e) => {
        const newScrollTop = e.target.scrollTop;
        scrollTopRef.current = newScrollTop;
        setScrollTop(newScrollTop);

        // Unconditionally, and before the hover check: the board itself moved,
        // so a parked canvas is now showing the wrong rows whether or not the
        // item under the pointer changed. `announce` wakes the loop for a lift
        // that moved; this wakes it for the scroll.
        requestDraw();

        // The cells moved under a pointer that did not, so whatever was hovered
        // a frame ago is now a different item. Skip if keyboard owns the platform.
        const pt = pointerRef.current;
        if (pt && focusedIndexRef.current < 0) {
            announce(getItemIndexAtPoint(pt.x, pt.y, e.target.getBoundingClientRect()));
        }
    }, [announce, getItemIndexAtPoint, requestDraw]);

    /**
     * Arrow-key navigation across the platform.
     *
     * The grid was a canvas under a scroll container and nothing else: no tab
     * stop, no caret, no way to open an item without a pointer. 1,559 items is
     * exactly the case where that matters, and a canvas cannot inherit
     * roving-tabindex from anywhere — the caret has to be drawn, so it is (see
     * drawItem's focus block).
     *
     * One tab stop for the whole platform, which is the same contract the
     * segmented controls upstairs have. Home and End go to the ends because a
     * board this long is unusable without them.
     */
    const handleKeyDown = useCallback((e) => {
        const items = itemsRef.current;
        if (items.length === 0) return;

        const { cols, cellSize } = layoutRef.current;
        const current = focusedIndexRef.current;
        let next = current;

        switch (e.key) {
            case 'ArrowRight': next = current < 0 ? 0 : Math.min(current + 1, items.length - 1); break;
            case 'ArrowLeft': next = current < 0 ? 0 : Math.max(current - 1, 0); break;
            case 'ArrowDown': next = current < 0 ? 0 : Math.min(current + cols, items.length - 1); break;
            case 'ArrowUp': next = current < 0 ? 0 : Math.max(current - cols, 0); break;
            case 'Home': next = 0; break;
            case 'End': next = items.length - 1; break;
            case 'Enter':
            case ' ':
                if (current >= 0 && onItemClick) { e.preventDefault(); onItemClick(items[current]); }
                return;
            default: return;
        }

        e.preventDefault();
        focusedIndexRef.current = next;
        // The caret is drawn by the render loop, so moving it needs a frame of
        // its own. `announce` cannot be relied on here: arrowing onto the cell
        // the pointer already happens to be hovering takes its early return, and
        // the caret would move without anything repainting it.
        requestDraw();
        announce(next);

        // Keep the caret on screen. Measured against the scroller's own height
        // rather than a declared one: the platform flexes with the board.
        const scroller = scrollerRef.current;
        if (scroller) {
            const top = GRID_PADDING + Math.floor(next / cols) * cellSize;
            const view = scroller.clientHeight;
            if (top < scroller.scrollTop) scroller.scrollTop = top;
            else if (top + cellSize > scroller.scrollTop + view) scroller.scrollTop = top + cellSize - view;
        }
    }, [onItemClick, announce, requestDraw]);

    /*
     * Tap to open, but not after a fling.
     *
     * The scroller handles click over a 1,559-cell touch grid, and a flick that
     * happens to end on a cell is a scroll, not a choice — the browser fires the
     * click anyway. Both the finger and the surface have to have stayed put:
     * eight pixels of movement, or any scrolling between press and release,
     * means the gesture was a scroll.
     */
    const pressRef = useRef(null);

    const handlePointerDown = useCallback((e) => {
        pressRef.current = { x: e.clientX, y: e.clientY, scroll: scrollTopRef.current };
    }, []);

    const handleClick = useCallback((e) => {
        if (!onItemClick) return;

        const press = pressRef.current;
        pressRef.current = null;
        if (press) {
            const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y);
            if (moved > 8 || Math.abs(scrollTopRef.current - press.scroll) > 2) return;
        }

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
            {/* Item count for aria-describedby */}
            <div id="fib-collection-count" className="fib-sr-only">
                {items.length} items
            </div>

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
                ref={scrollerRef}
                onScroll={handleScroll}
                onClick={handleClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onKeyDown={handleKeyDown}
                onPointerDown={handlePointerDown}
                // Tabbing in put the UA ring on the scroller and left the platform
                // with no caret at all, so the first arrow key appeared to do
                // nothing. Focus lands on the first cell.
                onFocus={() => {
                    if (focusedIndexRef.current < 0 && itemsRef.current.length > 0) {
                        focusedIndexRef.current = 0;
                        announce(0);
                    }
                }}
                onBlur={() => {
                    focusedIndexRef.current = -1;
                    // Re-announce stationary pointer or clear if none.
                    const pt = pointerRef.current;
                    if (pt && scrollerRef.current) {
                        announce(getItemIndexAtPoint(pt.x, pt.y, scrollerRef.current.getBoundingClientRect()));
                    } else {
                        announce(-1);
                    }
                }}
                tabIndex={0}
                aria-label="Collection items"
                aria-describedby="fib-collection-count"
                className="fib-board-scroll fib-platform-scroll"
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

            {/*
             * A fallback only. The board upstairs answers an empty platform with
             * its own message and a way out of the filters, because the reason a
             * platform is empty lives with the controls that emptied it, not with
             * the grid. This covers the case where the grid is mounted with
             * nothing at all.
             */}
            {items.length === 0 && (
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Barlow Condensed', system-ui, sans-serif",
                    fontSize: '13px', fontWeight: 700, letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'rgba(206,214,236,0.34)',
                    zIndex: 2,
                }}>
                    No items on this board
                </div>
            )}
        </div>
    );
}

export default CanvasCollectionGrid;