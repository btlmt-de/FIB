// ============================================
// CanvasSpinningStrip.jsx
// ============================================
// Drop-in replacement for EnhancedSpinningStrip using Canvas 2D
// Renders 80 items on a single canvas for massive performance gains

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ITEM_WIDTH, STRIP_HEIGHT, IMAGE_BASE_URL } from '../../../config/constants.js';
import { COLORS } from '../config/constants';
import { getItemImageUrl, getItemRarity, isInsaneItem, isSpecialItem, isExoticItem, isRareItem, isMythicItem, isEventItem, isRecursionItem } from '../../../utils/helpers.js';
import { sampleHolo, sampleRamp, createHoloGradient } from '../../../utils/rarityHelpers.jsx';
import { getAtlasSprite, drawItemSprite, needsOwnImage } from './atlas.js';

// ============================================
// CONSTANTS
// ============================================

const MOBILE_ITEM_WIDTH = 70;

// There used to be a local RARITY_COLORS table here — an independent copy of the
// rarity ladder that had drifted from the shared one. It is gone: drawItem reads
// tier colours from utils/rarityHelpers.jsx, and the canvas gets the animated
// tiers through sampleRamp/createHoloGradient since it cannot use the .fib-holo
// CSS class. COLORS.recursion is used directly where the recursion spin mode
// (not a rarity tier) needs it.

// ============================================
// IMAGE CACHE
// ============================================

const imageCache = new Map();
let barrierImage = null; // Shared fallback image

// Load the barrier/fallback image
function loadBarrierImage() {
    if (barrierImage) return Promise.resolve(barrierImage);
    if (typeof Image === 'undefined') return Promise.resolve(null);

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            barrierImage = img;
            resolve(img);
        };
        img.onerror = () => resolve(null);
        // Was an unrelated S3 bucket. barrier.png is vendored with the rest of the
        // pack, and a fallback that itself needs a third-party round trip is the
        // one image guaranteed to be wanted while the network is already failing.
        img.src = `${IMAGE_BASE_URL}/barrier.png`;
    });
}

function loadImage(src) {
    if (imageCache.has(src)) {
        return Promise.resolve(imageCache.get(src));
    }

    // SSR/non-browser guard - Image constructor not available
    if (typeof Image === 'undefined') {
        imageCache.set(src, null);
        return Promise.resolve(null);
    }

    return new Promise((resolve) => {
        const img = new Image();
        // Note: crossOrigin not needed since we only draw, never read pixels
        img.onload = () => {
            imageCache.set(src, img);
            resolve(img);
        };
        img.onerror = () => {
            // Load fallback barrier image instead of caching null
            loadBarrierImage().then(fallback => {
                imageCache.set(src, fallback);
                resolve(fallback);
            });
        };
        img.src = src;
    });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function hexToRgb(hex) {
    if (!hex) return { r: 255, g: 170, b: 0 };
    const cleanHex = hex.replace('#', '');
    return {
        r: parseInt(cleanHex.substr(0, 2), 16) || 0,
        g: parseInt(cleanHex.substr(2, 2), 16) || 0,
        b: parseInt(cleanHex.substr(4, 2), 16) || 0
    };
}

// getItemRarityColor and isHighRarity used to live here. Both were dead — nothing
// in this file or any other called them — and both carried their own copy of the
// tier list, so they had to be updated alongside every ladder change while
// affecting nothing on screen. drawItem computes what it needs inline from the
// predicates directly.

// ============================================
// ROUNDED RECT HELPER (browser compatibility)
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

/**
 * A stable 0..1 number from a string.
 *
 * Used to offset each slot's pulse and ember timings. It has to key off the item
 * and not the slot's x position: x changes every frame while the strip travels,
 * so a position-seeded value would make the effects swim sideways across the
 * tile they belong to.
 */
function hashUnit(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 10000) / 10000;
}

// ============================================
// CANVAS ITEM RENDERER - Full Detail Version
// ============================================

/**
 * One reel slot, drawn as a column of light.
 *
 * This replaced a boxed tile: a rounded rect of `size * 0.70` with a 2px tier
 * border, sitting in the middle of the band. That design put the tier in a 1px
 * outline around a dark box, which meant the rarity — the only thing anyone is
 * actually watching for — was the least visible property of the tile, and at
 * speed the whole strip read as a row of identical grey squares.
 *
 * Now the slot IS the tier. A vertical wash of the rarity colour fills the full
 * height of the band, weakest at the top and strongest at the floor, over a
 * bright base bar. The item sprite floats in it. Rarity stays legible while the
 * strip is moving fast, which is the whole job.
 *
 * The two animated tiers keep their identity and gain from the change: insane
 * and mythic sample their ramps at three offsets down the column, so the hues
 * travel vertically as well as cycling. Every other tier is a flat hue, so a
 * moving column is unambiguously one of the top two — a distinction that used to
 * rest on a border you had to look at directly.
 *
 * `bandHeight` is passed in because the column spans the whole band, not the
 * tile. `y` remains the tile's top edge and still positions the sprite.
 */
function drawItem(ctx, item, x, y, size, isWinning, isSpinning, showRecursionEffects, images, time, isMobileDevice, isLuckySpin = false, goldRushBoostedRarity = null, isKotwLucky = false, bandHeight = 0) {
    if (!item) return;

    const isInsane = isInsaneItem(item);
    const isSpecial = isSpecialItem(item);
    const isMythic = isMythicItem(item);
    const isExotic = isExoticItem(item);
    const isRare = isRareItem(item);
    const isEvent = isEventItem(item);
    const isRecursionType = isRecursionItem(item);

    const itemRarity = isRecursionType ? null : getItemRarity(item);
    const isGoldRushBoosted = goldRushBoostedRarity && itemRarity === goldRushBoostedRarity;

    // On a lucky spin commons take the spin's own colour rather than grey, so the
    // whole strip reads as "this one is different" before it even lands.
    const isLuckyCommon = isLuckySpin && !isInsane && !isMythic && !isSpecial && !isExotic && !isRare && !isEvent && !isRecursionType;
    const isSpecialType = isInsane || isMythic || isSpecial || isExotic || isRare || isEvent || isRecursionType || isLuckyCommon;

    const KOTW_CRIMSON = '#F43F5E';
    const KOTW_GOLD = '#F59E0B';

    const H = bandHeight || size;
    const phase = (time % 3.2) / 3.2;

    // ── The column's colour ──────────────────────────────────────────────────
    // Three samples down the column. For the animated tiers those are three
    // points on the ramp, so the hue shifts vertically and drifts over time; for
    // everything else all three are the same flat colour and the column is a
    // single hue fading upward.
    let stops;
    if (isRecursionType) {
        const c = hexToRgb(COLORS.recursion);
        stops = [c, c, c];
    } else if (isInsane && !isGoldRushBoosted) {
        stops = [sampleRamp(COLORS.insaneHolo, phase),
                 sampleRamp(COLORS.insaneHolo, phase + 0.16),
                 sampleRamp(COLORS.insaneHolo, phase + 0.32)];
    } else if (isMythic) {
        stops = [sampleRamp(COLORS.mythicCycle, phase),
                 sampleRamp(COLORS.mythicCycle, phase + 0.16),
                 sampleRamp(COLORS.mythicCycle, phase + 0.32)];
    } else {
        let flat;
        if (isGoldRushBoosted) flat = '#FFD700';
        else if (isEvent) flat = COLORS.gold;
        else if (isSpecial) flat = COLORS.insane;           // legendary
        else if (isExotic) flat = COLORS.purple;
        else if (isRare) flat = COLORS.red;
        else if (isLuckyCommon) flat = isKotwLucky ? KOTW_CRIMSON : COLORS.green;
        else if (isKotwLucky) flat = KOTW_GOLD;
        else if (showRecursionEffects) flat = COLORS.recursion;
        else flat = '#6E7391';                              // common — a cool grey
        const c = hexToRgb(flat);
        stops = [c, c, c];
    }
    const rgb = (c, a) => `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`;

    ctx.save();

    // The winner breathes. Scaled about the column's centre so the whole shaft
    // swells rather than just the sprite.
    if (isWinning) {
        const pulse = 1 + Math.sin(time * 5) * 0.03;
        ctx.translate(x + size / 2, H / 2);
        ctx.scale(1, pulse);
        ctx.translate(-(x + size / 2), -H / 2);
    }

    // Each column is inset so the slots do not touch.
    //
    // The boxed tiles this replaced had dark gaps between them, so the strip read
    // as a row of separate objects. Columns drawn edge to edge across their full
    // slot width lose that: the washes meet, and the band becomes one continuous
    // ribbon spanning the screen rather than a sequence of things you could count.
    // A few pixels of unlit space between slots is what puts the rhythm back —
    // the band is exactly as wide as it was, it just breathes again.
    const gap = Math.max(2.5, size * 0.045);
    const colX = x + gap;
    const colW = size - gap * 2;

    // Commons are quiet so the rare ones carry; the top tiers run close to
    // saturated at the floor. The winning column is lifted whatever its tier.
    const weight = isInsane ? 1 : isMythic ? 0.92 : isSpecialType ? 0.8 : 0.42;
    const lift = isWinning ? 1.35 : 1;

    // How much of the treatment below a tier earns. Commons sit at 0 and stay
    // completely inert — that is the point of the ladder, and a strip where every
    // slot shimmers says nothing about any of them.
    const energy = isInsane ? 1
        : isMythic ? 0.88
            : isSpecial ? 0.74            // legendary
                : isEvent || isRecursionType ? 0.7
                    : isExotic ? 0.62
                        : isRare ? 0.48
                            : isLuckyCommon || isGoldRushBoosted ? 0.4
                                : 0;

    // A slow breath on the glow. Offset per item so neighbouring rare slots are
    // not in lockstep, which would read as one wide pulsing block rather than
    // several separate valuable things.
    const seed = hashUnit(item.texture || item.item_name || item.name || String(item.id ?? 0));
    const breathe = 1 + Math.sin(time * 2.1 + seed * Math.PI * 2) * 0.16 * energy;

    // ── The wash ─────────────────────────────────────────────────────────────
    const glow = weight * lift * breathe;
    const wash = ctx.createLinearGradient(0, 0, 0, H);
    wash.addColorStop(0, rgb(stops[0], 0));
    wash.addColorStop(0.35, rgb(stops[1], 0.06 * glow));
    wash.addColorStop(0.72, rgb(stops[1], 0.20 * glow));
    wash.addColorStop(1, rgb(stops[2], 0.52 * glow));
    ctx.fillStyle = wash;
    ctx.fillRect(colX, 0, colW, H);

    // A matching wash hanging from the ceiling, much weaker. Without it the
    // column reads as sitting inside a box; with it the light belongs to the
    // whole slot.
    const crown = ctx.createLinearGradient(0, 0, 0, H * 0.42);
    crown.addColorStop(0, rgb(stops[0], 0.16 * glow));
    crown.addColorStop(1, rgb(stops[0], 0));
    ctx.fillStyle = crown;
    ctx.fillRect(colX, 0, colW, H * 0.42);

    // ── The base bar ─────────────────────────────────────────────────────────
    // The floor of the column, and the one element that is fully saturated. This
    // is what actually registers when the strip is moving too fast for anything
    // else to.
    const barH = isSpecialType ? 4 : 3;
    ctx.shadowColor = rgb(stops[2], 0.9);
    ctx.shadowBlur = (isInsane ? 22 : isSpecialType ? 16 : 7) * breathe;
    ctx.fillStyle = rgb(stops[2], isWinning ? 1 : 0.92);
    ctx.fillRect(colX, H - barH, colW, barH);
    ctx.shadowBlur = 0;

    // ── Everything below is what makes a rare slot feel rare ─────────────────
    //
    // Colour alone was not carrying it. The boxed design this replaced had a
    // pulsing, glowing border on special tiers, and losing that made the columns
    // correct but inert — you could see a slot was exotic, you did not feel it.
    // The wash gives a tier its identity; this gives it energy, and all of it is
    // scaled by `energy` so a common stays completely still and only the top of
    // the ladder gets the full treatment.

    // Shaft walls. Two vertical edges turn a soft wash into a beam with a defined
    // form. Brightest at the floor, gone by the halfway mark, so they read as the
    // column's own light rather than as a border drawn around a box — which is
    // exactly the thing this design set out to get rid of.
    if (energy > 0.35) {
        const wall = ctx.createLinearGradient(0, H, 0, H * 0.35);
        wall.addColorStop(0, rgb(stops[2], 0.55 * energy * breathe));
        wall.addColorStop(1, rgb(stops[1], 0));
        ctx.fillStyle = wall;
        ctx.fillRect(colX, H * 0.35, 1.5, H * 0.65);
        ctx.fillRect(colX + colW - 1.5, H * 0.35, 1.5, H * 0.65);
    }

    // Floor flare. A hot spot where the column meets the base bar, so the light
    // looks like it is being emitted from the floor rather than painted on it.
    if (energy > 0.3) {
        const flare = ctx.createRadialGradient(
            x + size / 2, H, 0,
            x + size / 2, H, size * 0.75,
        );
        flare.addColorStop(0, rgb(stops[2], 0.5 * energy * breathe));
        flare.addColorStop(1, rgb(stops[2], 0));
        ctx.fillStyle = flare;
        ctx.fillRect(colX, H * 0.4, colW, H * 0.6);
    }

    // Embers. A few motes climbing the shaft, fading as they rise.
    //
    // Seeded off the item rather than off `x`, which matters: `x` changes every
    // frame as the strip travels, so a position-seeded mote would swim sideways
    // across the tile it belongs to. Seeded off the item, each slot's embers stay
    // that slot's for the whole spin.
    if (energy >= 0.6) {
        const count = isInsane ? 5 : isMythic ? 4 : 3;
        for (let i = 0; i < count; i++) {
            const s = (seed + i * 0.37) % 1;
            // Different speeds per mote so they never form a rising rank.
            const climb = (time * (0.16 + s * 0.12) + s) % 1;
            const my = H - climb * H * 0.85;
            const mx = x + size * (0.18 + s * 0.64);
            // Fade in off the floor, out at the top; nothing pops into existence.
            const fade = Math.sin(climb * Math.PI);
            const r = (isInsane ? 1.9 : 1.5) * (0.6 + s * 0.7);
            ctx.beginPath();
            ctx.arc(mx, my, r, 0, Math.PI * 2);
            ctx.fillStyle = rgb(stops[1], 0.75 * fade * energy);
            ctx.fill();
        }
    }

    // The winner gets the whole shaft lit: full-height walls at full strength and
    // a crown of light at the top. This is the payoff frame, so it is the one
    // place the restraint above is dropped.
    if (isWinning) {
        const rim = ctx.createLinearGradient(0, H, 0, 0);
        rim.addColorStop(0, rgb(stops[2], 0.95));
        rim.addColorStop(0.55, rgb(stops[1], 0.5));
        rim.addColorStop(1, rgb(stops[0], 0.12));
        ctx.fillStyle = rim;
        ctx.fillRect(colX, 0, 2, H);
        ctx.fillRect(colX + colW - 2, 0, 2, H);

        const crownFlare = ctx.createLinearGradient(0, 0, 0, H * 0.3);
        crownFlare.addColorStop(0, rgb(stops[0], 0.4 * breathe));
        crownFlare.addColorStop(1, rgb(stops[0], 0));
        ctx.fillStyle = crownFlare;
        ctx.fillRect(colX, 0, colW, H * 0.3);
    }

    // ── The sprite ───────────────────────────────────────────────────────────
    const imgSrc = getItemImageUrl(item);
    const img = images.get(imgSrc);
    // The atlas covers the item pool, which is almost every cell in the strip.
    // `img` only has to exist for the stragglers it does not pack — player heads,
    // event and recursion art, the custom items.
    const atlasSprite = getAtlasSprite(item);

    if (img || atlasSprite) {
        let imgScale = 0.62;
        if (item.username) imgScale = 0.52;          // player heads read small
        else if (isEvent) imgScale = 0.7;
        else if (isRecursionType) imgScale = 0.66;
        else if (isSpecialType) imgScale = 0.66;

        const imgSize = size * imgScale;
        const imgX = x + (size - imgSize) / 2;
        // Seated slightly above centre. The base bar and its glow pull the eye
        // down, so a geometrically centred sprite optically reads as low.
        const imgY = (H - imgSize) / 2 - H * 0.04;

        // A pool of the tier's light under the item, so it sits in the column
        // rather than floating in front of it.
        const pool = ctx.createRadialGradient(
            x + size / 2, imgY + imgSize * 0.9, 0,
            x + size / 2, imgY + imgSize * 0.9, imgSize * 0.85,
        );
        pool.addColorStop(0, rgb(stops[1], 0.32 * glow));
        pool.addColorStop(1, rgb(stops[1], 0));
        ctx.fillStyle = pool;
        ctx.fillRect(colX, imgY - imgSize * 0.2, colW, imgSize * 1.9);

        const useSmooth = isInsane || isSpecial || isRare || isMythic || item.username || isEvent || isRecursionType;
        ctx.imageSmoothingEnabled = useSmooth;
        ctx.imageSmoothingQuality = useSmooth ? 'high' : 'low';

        if (isSpecialType || isGoldRushBoosted) {
            // shadowColor takes a colour and never a gradient, so the animated
            // tiers bloom in whatever hue they are currently passing through.
            ctx.shadowColor = rgb(stops[1], 1);
            ctx.shadowBlur = isInsane ? 16 : isMythic ? 13 : 9;
        }

        drawItemSprite(ctx, item, img, imgX, imgY, imgSize);

        ctx.shadowBlur = 0;
        ctx.imageSmoothingEnabled = true;
    }

    ctx.restore();
}

// ============================================
// MOTION BLUR RENDERER
// ============================================

function drawMotionBlur(ctx, width, height, isVertical, color, intensity) {
    if (intensity < 0.1) return;

    const rgb = hexToRgb(color);
    const blurAlpha = Math.floor(intensity * 40);

    ctx.save();

    if (isVertical) {
        // Top and bottom blur
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${blurAlpha / 255})`);
        gradient.addColorStop(0.3, 'transparent');
        gradient.addColorStop(0.7, 'transparent');
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${blurAlpha / 255})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    } else {
        // Left and right blur
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${blurAlpha / 255})`);
        gradient.addColorStop(0.3, 'transparent');
        gradient.addColorStop(0.7, 'transparent');
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${blurAlpha / 255})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
}

// ============================================
// EDGE FADE RENDERER
// ============================================

function drawEdgeFade(ctx, width, height, isVertical, color) {
    const rgb = hexToRgb(color);

    ctx.save();

    if (isVertical) {
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
        gradient.addColorStop(0.05, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.87)`);
        gradient.addColorStop(0.18, 'transparent');
        gradient.addColorStop(0.82, 'transparent');
        gradient.addColorStop(0.95, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.87)`);
        gradient.addColorStop(1, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    } else {
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
        gradient.addColorStop(0.05, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.87)`);
        gradient.addColorStop(0.15, 'transparent');
        gradient.addColorStop(0.85, 'transparent');
        gradient.addColorStop(0.95, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.87)`);
        gradient.addColorStop(1, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
}

// ============================================
// VIGNETTE RENDERER
// ============================================

function drawVignette(ctx, width, height, intensity) {
    ctx.save();

    const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.7
    );
    gradient.addColorStop(0.4, 'transparent');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${0.3 * intensity})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
}

// ============================================
// CENTER INDICATOR RENDERER
// ============================================

function drawCenterIndicator(ctx, width, height, isVertical, color, isSlowingDown, isResult, time) {
    const rgb = hexToRgb(color);

    ctx.save();

    // Pulse scale for slowing down
    const pulseScale = isSlowingDown ? 1 + Math.sin(time * 10) * 0.15 : 1;

    // Center line
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    if (isVertical) {
        // Horizontal line for mobile
        const cy = height / 2;
        ctx.beginPath();
        const lineGradient = ctx.createLinearGradient(0, cy, width, cy);
        lineGradient.addColorStop(0, 'transparent');
        lineGradient.addColorStop(0.5, color);
        lineGradient.addColorStop(1, 'transparent');
        ctx.strokeStyle = lineGradient;
        ctx.moveTo(0, cy);
        ctx.lineTo(width, cy);
        ctx.stroke();
    } else {
        // Vertical line for desktop
        const cx = width / 2;
        ctx.beginPath();
        const lineGradient = ctx.createLinearGradient(cx, 0, cx, height);
        lineGradient.addColorStop(0, 'transparent');
        lineGradient.addColorStop(0.5, color);
        lineGradient.addColorStop(1, 'transparent');
        ctx.strokeStyle = lineGradient;
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, height);
        ctx.stroke();
    }

    ctx.shadowBlur = 0;

    // Triangle pointers
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    const pointerSize = 14 * pulseScale;

    if (isVertical) {
        // Left pointer
        ctx.beginPath();
        ctx.moveTo(-3, height / 2);
        ctx.lineTo(-3 - pointerSize, height / 2 - 10);
        ctx.lineTo(-3 - pointerSize, height / 2 + 10);
        ctx.closePath();
        ctx.fill();

        // Right pointer
        ctx.beginPath();
        ctx.moveTo(width + 3, height / 2);
        ctx.lineTo(width + 3 + pointerSize, height / 2 - 10);
        ctx.lineTo(width + 3 + pointerSize, height / 2 + 10);
        ctx.closePath();
        ctx.fill();
    } else {
        // Top pointer
        ctx.beginPath();
        ctx.moveTo(width / 2, -3);
        ctx.lineTo(width / 2 - 10, -3 - pointerSize);
        ctx.lineTo(width / 2 + 10, -3 - pointerSize);
        ctx.closePath();
        ctx.fill();

        // Bottom pointer
        ctx.beginPath();
        ctx.moveTo(width / 2, height + 3);
        ctx.lineTo(width / 2 - 10, height + 3 + pointerSize);
        ctx.lineTo(width / 2 + 10, height + 3 + pointerSize);
        ctx.closePath();
        ctx.fill();
    }

    ctx.restore();
}

// ============================================
// SCANLINES FOR RECURSION
// ============================================

function drawScanlines(ctx, width, height, time) {
    ctx.save();

    const flickerAlpha = 0.03 + Math.sin(time * 50) * 0.02;
    ctx.fillStyle = `rgba(0, 255, 0, ${flickerAlpha})`;

    for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y + 2, width, 2);
    }

    ctx.restore();
}

// ============================================
// CENTER RIPPLE EFFECT
// ============================================

function drawCenterRipples(ctx, width, height, isVertical, color, time) {
    ctx.save();

    const rgb = hexToRgb(color);
    const rippleCount = 3;

    for (let i = 0; i < rippleCount; i++) {
        const progress = ((time * 2 + i * 0.3) % 1);
        const alpha = (1 - progress) * 0.3;
        const scale = 1 + progress * 2;

        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        ctx.lineWidth = 4 - progress * 2;

        if (isVertical) {
            const cy = height / 2;
            const rippleWidth = width * scale;
            ctx.beginPath();
            ctx.moveTo((width - rippleWidth) / 2, cy);
            ctx.lineTo((width + rippleWidth) / 2, cy);
            ctx.stroke();
        } else {
            const cx = width / 2;
            const rippleHeight = height * scale;
            ctx.beginPath();
            ctx.moveTo(cx, (height - rippleHeight) / 2);
            ctx.lineTo(cx, (height + rippleHeight) / 2);
            ctx.stroke();
        }
    }

    ctx.restore();
}

// ============================================
// MAIN CANVAS STRIP COMPONENT
// ============================================

export function CanvasSpinningStrip({
                                        items = [],
                                        offsetRef = null, // Ref object for offset (avoids re-renders during animation)
                                        offset: offsetProp = 0, // Fallback value when not using ref
                                        isMobile = false,
                                        isSpinning = false,
                                        isResult = false,
                                        spinProgress = 0,
                                        isRecursion = false,
                                        stripWidth,
                                        stripHeight,
                                        finalIndex = 72,
                                        onClick,
                                        accentColor = null, // Optional override for accent color (e.g., gold for KOTW Lucky Spin)
                                        themeType = null, // 'recursion' or 'kotw' - determines background colors
                                        itemWidthOverride = null, // Optional override for item width (e.g., 90 for Triple Lucky desktop)
                                        isLuckySpin = false, // For Lucky Spin / Triple Lucky - common items use green
                                        goldRushBoostedRarity = null, // Rarity being boosted during Gold Rush event
                                    }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const animationRef = useRef(null);
    const imagesRef = useRef(new Map());
    const timeRef = useRef(0);
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const [containerWidth, setContainerWidth] = useState(stripWidth || (isMobile ? 140 : 1600));

    // Refs for props that change during animation (so render loop always has current values)
    // Note: offset is read from offsetRef if provided, otherwise from offsetProp
    const propsRef = useRef({ isSpinning, isResult, spinProgress, isRecursion, finalIndex, accentColor, themeType, isLuckySpin, goldRushBoostedRarity });
    propsRef.current = { isSpinning, isResult, spinProgress, isRecursion, finalIndex, accentColor, themeType, isLuckySpin, goldRushBoostedRarity };

    // Helper to get current offset - reads from ref if provided, otherwise uses prop value
    const getOffset = () => offsetRef ? offsetRef.current : offsetProp;

    const itemWidth = itemWidthOverride || (isMobile ? MOBILE_ITEM_WIDTH : ITEM_WIDTH);
    const width = stripWidth || containerWidth;
    const height = stripHeight || (isMobile ? 260 : STRIP_HEIGHT);

    // Measure container width on mount and resize
    useEffect(() => {
        if (!containerRef.current || isMobile) return;

        const updateWidth = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                if (rect && rect.width > 0) {
                    setContainerWidth(rect.width);
                }
            }
        };

        // Use ResizeObserver if available, fall back to window resize
        let resizeObserver = null;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(updateWidth);
            resizeObserver.observe(containerRef.current);
        } else {
            // Fallback for older browsers
            window.addEventListener('resize', updateWidth);
        }

        updateWidth();

        return () => {
            if (resizeObserver) {
                resizeObserver.disconnect();
            } else {
                window.removeEventListener('resize', updateWidth);
            }
        };
    }, [isMobile]);

    // Pre-load all item images - use cache immediately, load missing incrementally
    useEffect(() => {
        if (items.length === 0) return;

        let cancelled = false;

        // Immediately populate from cache for instant display
        items.forEach(item => {
            const src = getItemImageUrl(item);
            const cached = imageCache.get(src);
            if (cached) {
                imagesRef.current.set(src, cached);
            }
        });

        const loadAllImages = async () => {
            const imagePromises = items.map(item => {
                const src = getItemImageUrl(item);
                // Skip if already in our map (from cache above)
                if (imagesRef.current.has(src)) {
                    return Promise.resolve();
                }
                return loadImage(src).then(img => {
                    // Add incrementally as each image loads
                    if (!cancelled && img) {
                        imagesRef.current.set(src, img);
                    }
                });
            });

            await Promise.all(imagePromises);

            if (!cancelled) {
                setImagesLoaded(true);
            }
        };

        loadAllImages();

        return () => {
            cancelled = true;
        };
    }, [items]);

    // Main render loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.warn('CanvasSpinningStrip: Could not get 2d context');
            return;
        }

        const dpr = window.devicePixelRatio || 1;
        let lastTimestamp = performance.now();
        let frameCount = 0;

        // Set canvas size with DPR
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);

        const render = (timestamp) => {
            // Mobile throttling: 30fps when idle, 60fps when spinning
            const { isSpinning: isCurrentlySpinning } = propsRef.current;
            frameCount++;
            if (isMobile && !isCurrentlySpinning && frameCount % 2 !== 0) {
                // Skip every other frame on mobile when not spinning
                animationRef.current = requestAnimationFrame(render);
                return;
            }

            // Use actual delta time for frame-rate independence
            const dt = (timestamp - lastTimestamp) / 1000;
            lastTimestamp = timestamp;
            timeRef.current += dt;
            const time = timeRef.current;

            // Get current prop values from ref (so animation has latest values)
            // Note: offset comes from offsetRef or offsetProp, not propsRef
            const { isSpinning, isResult, spinProgress, isRecursion, finalIndex, accentColor: accentOverride, themeType, isLuckySpin, goldRushBoostedRarity } = propsRef.current;

            const offset = getOffset();
            const motionIntensity = isSpinning ? Math.max(0, 1 - spinProgress * 1.5) : 0;

            // Determine theme colors based on themeType or isRecursion
            const isKotwTheme = themeType === 'kotw';
            const isRecursionTheme = isRecursion || themeType === 'recursion';

            // KOTW: Slate background (#1E293B), Crimson/Gold accents
            // Recursion: Dark green background, Matrix green accents
            const KOTW_SLATE = '#1E293B';
            const KOTW_SLATE_DARK = '#0F172A';
            const KOTW_GOLD = '#F59E0B';

            const accentColor = accentOverride || (isRecursionTheme ? COLORS.recursion : COLORS.gold);
            const bgColor = isKotwTheme ? KOTW_SLATE_DARK : (isRecursionTheme ? COLORS.recursionDark : COLORS.bg);

            // Pre-compute hexToRgb once per frame instead of per-item
            const accentRgb = hexToRgb(accentColor);

            // Clear
            ctx.clearRect(0, 0, width, height);

            // Background
            if (isRecursionTheme || isKotwTheme) {
                // Themed background
                const bgGradient = ctx.createLinearGradient(
                    isMobile ? 0 : 0,
                    isMobile ? 0 : 0,
                    isMobile ? 0 : width,
                    isMobile ? height : 0
                );
                if (isKotwTheme) {
                    // KOTW: Slate gradient
                    bgGradient.addColorStop(0, KOTW_SLATE_DARK);
                    bgGradient.addColorStop(0.5, KOTW_SLATE);
                    bgGradient.addColorStop(1, KOTW_SLATE_DARK);
                } else {
                    // Recursion: Green gradient
                    bgGradient.addColorStop(0, bgColor);
                    bgGradient.addColorStop(0.5, '#0a1a0a');
                    bgGradient.addColorStop(1, bgColor);
                }
                ctx.fillStyle = bgGradient;
            } else {
                const bgGradient = ctx.createLinearGradient(
                    isMobile ? 0 : 0,
                    isMobile ? 0 : 0,
                    isMobile ? 0 : width,
                    isMobile ? height : 0
                );
                bgGradient.addColorStop(0, COLORS.bg);
                bgGradient.addColorStop(0.5, `${COLORS.bgLight}33`);
                bgGradient.addColorStop(1, COLORS.bg);
                ctx.fillStyle = bgGradient;
            }
            ctx.fillRect(0, 0, width, height);

            // Recursion scanlines (only for matrix theme, not KOTW)
            if (isRecursionTheme && !isKotwTheme) {
                drawScanlines(ctx, width, height, time);
            }

            // Draw items
            ctx.save();

            if (isMobile) {
                // Vertical strip - items stacked vertically
                const stripCenterY = height / 2 - itemWidth / 2;
                const itemCenterX = (width - itemWidth) / 2; // Center item horizontally in strip

                items.forEach((item, idx) => {
                    const itemY = stripCenterY + idx * itemWidth - offset;

                    // Only draw visible items
                    if (itemY > -itemWidth && itemY < height + itemWidth) {
                        const isWinning = idx === finalIndex && isResult;
                        drawItem(ctx, item, itemCenterX, itemY, itemWidth, isWinning, isSpinning, isRecursionTheme && !isKotwTheme, imagesRef.current, time, isMobile, isLuckySpin, goldRushBoostedRarity, isKotwTheme, isMobile ? itemWidth : height);

                        // Separator line - use accentColor
                        ctx.strokeStyle = `${accentColor}33`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(0, itemY + itemWidth);
                        ctx.lineTo(width, itemY + itemWidth);
                        ctx.stroke();
                    }
                });
            } else {
                // Horizontal strip - items side by side
                const stripCenterX = width / 2 - itemWidth / 2;
                const itemCenterY = (height - itemWidth) / 2; // Center item vertically in strip

                items.forEach((item, idx) => {
                    const itemX = stripCenterX + idx * itemWidth - offset;

                    // Only draw visible items
                    if (itemX > -itemWidth && itemX < width + itemWidth) {
                        const isWinning = idx === finalIndex && isResult;
                        drawItem(ctx, item, itemX, itemCenterY, itemWidth, isWinning, isSpinning, isRecursionTheme && !isKotwTheme, imagesRef.current, time, isMobile, isLuckySpin, goldRushBoostedRarity, isKotwTheme, isMobile ? itemWidth : height);

                        // The slot seam that used to be drawn here is gone.
                        //
                        // It began as a full-height rule between every pair of
                        // tiles, was cut back to a short tick at the floor when
                        // the columns arrived, and is now unnecessary entirely:
                        // the columns are inset, so the unlit gap between them IS
                        // the seam. A line down the middle of that gap only put
                        // back the grid the inset exists to replace.
                    }
                });
            }

            ctx.restore();

            // Motion blur (rendered at z-index 4 equivalent)
            if (motionIntensity > 0.1) {
                drawMotionBlur(ctx, width, height, isMobile, bgColor, motionIntensity);
            }

            // ========== EDGE VIGNETTE - soft dark gradient at edges ==========
            if (isMobile) {
                // Vertical vignette for mobile
                const topVignette = ctx.createLinearGradient(0, 0, 0, height * 0.15);
                topVignette.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
                topVignette.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = topVignette;
                ctx.fillRect(0, 0, width, height * 0.15);

                const bottomVignette = ctx.createLinearGradient(0, height * 0.85, 0, height);
                bottomVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
                bottomVignette.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
                ctx.fillStyle = bottomVignette;
                ctx.fillRect(0, height * 0.85, width, height * 0.15);
            } else {
                // Horizontal vignette for desktop
                const leftVignette = ctx.createLinearGradient(0, 0, width * 0.12, 0);
                leftVignette.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
                leftVignette.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = leftVignette;
                ctx.fillRect(0, 0, width * 0.12, height);

                const rightVignette = ctx.createLinearGradient(width * 0.88, 0, width, 0);
                rightVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
                rightVignette.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
                ctx.fillStyle = rightVignette;
                ctx.fillRect(width * 0.88, 0, width * 0.12, height);
            }

            // ========== CENTER LINE GLOW PULSE ==========
            const centerPulse = isSpinning
                ? 0.6 + Math.sin(time * 8) * 0.4  // Fast pulse during spin
                : 0.3 + Math.sin(time * 2) * 0.15; // Gentle pulse when idle
            const centerGlowAlpha = isSpinning ? 0.5 + centerPulse * 0.3 : 0.2;

            if (isMobile) {
                // Horizontal center line for mobile (vertical strip)
                const centerY = height / 2;
                const lineGlow = ctx.createLinearGradient(0, centerY - 20, 0, centerY + 20);
                lineGlow.addColorStop(0, 'rgba(0, 0, 0, 0)');
                lineGlow.addColorStop(0.4, `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${centerGlowAlpha * 0.3})`);
                lineGlow.addColorStop(0.5, `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${centerGlowAlpha})`);
                lineGlow.addColorStop(0.6, `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${centerGlowAlpha * 0.3})`);
                lineGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = lineGlow;
                ctx.fillRect(0, centerY - 20, width, 40);
            } else {
                // Vertical center line for desktop (horizontal strip)
                const centerX = width / 2;
                const lineGlow = ctx.createLinearGradient(centerX - 25, 0, centerX + 25, 0);
                lineGlow.addColorStop(0, 'rgba(0, 0, 0, 0)');
                lineGlow.addColorStop(0.4, `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${centerGlowAlpha * 0.3})`);
                lineGlow.addColorStop(0.5, `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${centerGlowAlpha})`);
                lineGlow.addColorStop(0.6, `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${centerGlowAlpha * 0.3})`);
                lineGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = lineGlow;
                ctx.fillRect(centerX - 25, 0, 50, height);
            }

            animationRef.current = requestAnimationFrame(render);
        };

        animationRef.current = requestAnimationFrame(render);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
        // Only restart animation when canvas size or items change, not on every prop change
    }, [items, width, height, imagesLoaded]);

    // Keyboard handler for accessibility
    const handleKeyDown = useCallback((e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick(e);
        }
    }, [onClick]);

    return (
        <div
            ref={containerRef}
            onClick={onClick}
            onKeyDown={onClick ? handleKeyDown : undefined}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            style={{
                position: isMobile ? 'relative' : 'absolute',
                width: isMobile ? `${width}px` : '100%',
                height: `${height}px`,
                borderRadius: isMobile ? '14px' : '10px',
                overflow: 'hidden',
                zIndex: 2, // Same z-index as original strip div
                cursor: onClick ? 'pointer' : 'default',
                margin: isMobile ? '0 auto' : '0',
                left: isMobile ? undefined : 0,
                top: isMobile ? undefined : 0,
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                }}
            />
        </div>
    );
}

// ============================================
// WRAPPER TO MATCH EnhancedSpinningStrip API
// ============================================

export function CanvasSpinningStripWrapper({
                                               children, // Items to render (we'll extract data from them)
                                               stripRef,
                                               isMobile,
                                               isSpinning,
                                               isResult,
                                               spinProgress = 0,
                                               isRecursion = false,
                                               mobileStripHeight = 260,
                                               mobileStripWidth = 140,
                                               onClick,
                                               items = [], // Pass items directly
                                               offset = 0, // Current scroll offset
                                           }) {
    return (
        <CanvasSpinningStrip
            items={items}
            offset={offset}
            isMobile={isMobile}
            isSpinning={isSpinning}
            isResult={isResult}
            spinProgress={spinProgress}
            isRecursion={isRecursion}
            stripWidth={isMobile ? mobileStripWidth : undefined}
            stripHeight={isMobile ? mobileStripHeight : 100}
            onClick={onClick}
        />
    );
}

// Export preload function for use by parent components
export async function preloadItemImages(items, onProgress) {
    const batchSize = 20;
    let loaded = 0;

    // Pool sprites come from the atlas, so fetching them individually would undo
    // the entire point of packing one. What is left is the handful of things the
    // atlas does not cover: player heads, event and recursion art, custom items.
    items = items.filter(needsOwnImage);

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        await Promise.all(batch.map(item => {
            const src = getItemImageUrl(item);
            return loadImage(src).then(() => {
                loaded++;
                if (onProgress) onProgress(loaded, items.length);
            });
        }));
    }
}

/**
 * Fills the cache in the background. Nothing waits on this.
 *
 * The wheel used to await preloadItemImages() over the whole pool before it
 * would enable the spin button — ~1,500 files to render a strip of 80. Measured
 * cold that was 9.4s from our own origin and 2.2s from GitHub, and the gap is
 * why the pool download is now split in two: a small awaited set that the first
 * frame genuinely needs, and this, which is allowed to trickle.
 *
 * Concurrency is deliberately lower than preloadItemImages' batch of 20. This
 * runs while someone is already spinning, and the images that spin is waiting on
 * are queued behind it on the same connection pool — a wide background sweep
 * makes the thing the user is actually looking at slower.
 *
 * Resolves when the sweep finishes; callers are free to ignore it. Rejections
 * cannot escape (loadImage resolves to the barrier on error), so there is no
 * unhandled-rejection path here.
 */
export function warmImageCache(items, { concurrency = 6 } = {}) {
    const queue = items
        .filter(needsOwnImage)
        .map(getItemImageUrl)
        .filter(src => !imageCache.has(src));

    let cursor = 0;
    const worker = async () => {
        while (cursor < queue.length) {
            await loadImage(queue[cursor++]);
        }
    };

    return Promise.all(
        Array.from({ length: Math.min(concurrency, queue.length) }, worker),
    );
}

export default CanvasSpinningStrip;