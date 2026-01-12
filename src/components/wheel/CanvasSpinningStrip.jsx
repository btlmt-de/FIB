// ============================================
// CanvasSpinningStrip.jsx
// ============================================
// Drop-in replacement for EnhancedSpinningStrip using Canvas 2D
// Renders 80 items on a single canvas for massive performance gains

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { COLORS, ITEM_WIDTH, IMAGE_BASE_URL } from '../../config/constants.js';
import { getItemImageUrl, isInsaneItem, isSpecialItem, isRareItem, isMythicItem, isEventItem, isRecursionItem } from '../../utils/helpers.js';

// ============================================
// CONSTANTS
// ============================================

const MOBILE_ITEM_WIDTH = 70;

// Rarity colors (matching your constants)
const RARITY_COLORS = {
    insane: COLORS.insane || '#FFD700',
    mythic: COLORS.aqua || '#55FFFF',
    legendary: COLORS.purple || '#AA00AA',
    rare: COLORS.red || '#FF5555',
    event: COLORS.gold || '#FFAA00',
    recursion: COLORS.recursion || '#00FF00',
    common: COLORS.gold || '#FFAA00',
};

// ============================================
// IMAGE CACHE
// ============================================

const imageCache = new Map();

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
            // Cache the failed state to prevent repeated load attempts
            imageCache.set(src, null);
            resolve(null);
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

function getItemRarityColor(item) {
    if (isInsaneItem(item)) return RARITY_COLORS.insane;
    if (isMythicItem(item)) return RARITY_COLORS.mythic;
    if (isSpecialItem(item)) return RARITY_COLORS.legendary;
    if (isRareItem(item)) return RARITY_COLORS.rare;
    if (isEventItem(item)) return RARITY_COLORS.event;
    if (isRecursionItem(item)) return RARITY_COLORS.recursion;
    return RARITY_COLORS.common;
}

function isHighRarity(item) {
    return isInsaneItem(item) || isMythicItem(item) || isSpecialItem(item) || isRareItem(item) || isEventItem(item) || isRecursionItem(item);
}

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

// ============================================
// CANVAS ITEM RENDERER - Full Detail Version
// ============================================

function drawItem(ctx, item, x, y, size, isWinning, isSpinning, showRecursionEffects, images, time, isMobileDevice, isLuckySpin = false) {
    if (!item) return;

    const isInsane = isInsaneItem(item);
    const isSpecial = isSpecialItem(item);
    const isMythic = isMythicItem(item);
    const isRare = isRareItem(item);
    const isEvent = isEventItem(item);
    const isRecursionType = isRecursionItem(item);

    // For lucky spins, common items should use green styling
    const isLuckyCommon = isLuckySpin && !isInsane && !isMythic && !isSpecial && !isRare && !isEvent && !isRecursionType;

    const isSpecialType = isInsane || isMythic || isSpecial || isRare || isEvent || isRecursionType || isLuckyCommon;

    // Box dimensions - smaller box = more room for glow
    const boxRatio = isMobileDevice ? 0.82 : 0.70;
    const boxSize = size * boxRatio;
    const boxX = x + (size - boxSize) / 2;
    const boxY = y + (size - boxSize) / 2;
    const centerX = boxX + boxSize / 2;
    const centerY = boxY + boxSize / 2;
    const radius = 6;

    // Smooth interpolation helpers
    const lerp = (a, b, t) => a + (b - a) * t;
    const lerpColor = (c1, c2, t) => {
        const rgb1 = hexToRgb(c1);
        const rgb2 = hexToRgb(c2);
        return {
            r: Math.round(lerp(rgb1.r, rgb2.r, t)),
            g: Math.round(lerp(rgb1.g, rgb2.g, t)),
            b: Math.round(lerp(rgb1.b, rgb2.b, t))
        };
    };

    ctx.save();

    // Local variable for animated border color (avoids mutating ctx)
    let animatedBorderColor = null;

    // ============================================
    // WINNING ITEM PULSE - subtle scale animation
    // ============================================
    if (isWinning) {
        const pulse = 1 + Math.sin(time * 5) * 0.025; // 2.5% gentle pulse
        ctx.translate(centerX, centerY);
        ctx.scale(pulse, pulse);
        ctx.translate(-centerX, -centerY);
    }

    // ============================================
    // 1. ANIMATED GLOW (drawn as radial gradients BEHIND the box)
    // This runs ALWAYS for special items, not just during spin
    // ============================================
    if (isSpecialType && !isMobileDevice) {
        const glowSize = boxSize * 1.8; // Glow extends well beyond box
        const glowX = centerX - glowSize / 2;
        const glowY = centerY - glowSize / 2;

        // Get animated color and intensity
        let glowColor1, glowColor2, intensity;

        if (isInsane) {
            // 1.2s cycle - gold pulses to bright white/cream
            const phase = (time % 1.2) / 1.2;
            const pulse = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
            intensity = 0.7 + pulse * 0.3;

            // Gold -> Bright cream/white -> Gold
            glowColor1 = lerpColor(COLORS.insane, '#FFFEF0', pulse);
            glowColor2 = hexToRgb(COLORS.insane);

        } else if (isMythic) {
            // 1.5s cycle through aqua -> purple -> gold (magical prismatic)
            const phase = (time % 1.5) / 1.5;
            intensity = 0.6 + Math.sin(phase * Math.PI * 2) * 0.2 + 0.2;

            if (phase < 0.33) {
                glowColor1 = lerpColor(COLORS.aqua, COLORS.purple, phase / 0.33);
                glowColor2 = lerpColor(COLORS.purple, COLORS.gold, phase / 0.33);
            } else if (phase < 0.66) {
                glowColor1 = lerpColor(COLORS.purple, COLORS.gold, (phase - 0.33) / 0.33);
                glowColor2 = lerpColor(COLORS.gold, COLORS.aqua, (phase - 0.33) / 0.33);
            } else {
                glowColor1 = lerpColor(COLORS.gold, COLORS.aqua, (phase - 0.66) / 0.34);
                glowColor2 = lerpColor(COLORS.aqua, COLORS.purple, (phase - 0.66) / 0.34);
            }

        } else if (isSpecial) {
            // 2.25s cycle - purple pulses to bright magenta/pink
            const phase = (time % 2.25) / 2.25;
            const pulse = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
            intensity = 0.5 + pulse * 0.35;

            // Purple -> Bright magenta -> Purple
            glowColor1 = lerpColor(COLORS.purple, '#FF44FF', pulse);
            glowColor2 = hexToRgb(COLORS.purple);

        } else if (isRare) {
            // 2.25s cycle - red pulses to bright coral/pink
            const phase = (time % 2.25) / 2.25;
            const pulse = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
            intensity = 0.5 + pulse * 0.35;

            // Red -> Bright coral/salmon -> Red
            glowColor1 = lerpColor(COLORS.red, '#FF7777', pulse);
            glowColor2 = hexToRgb(COLORS.red);

        } else if (isRecursionType) {
            // 0.75s pulse - green pulses to bright lime (matrix energy)
            const phase = (time % 0.75) / 0.75;
            const pulse = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
            intensity = 0.7 + pulse * 0.3;

            // Green -> Bright lime -> Green
            glowColor1 = lerpColor(COLORS.recursion, '#88FF88', pulse);
            glowColor2 = hexToRgb(COLORS.recursion);

        } else if (isEvent) {
            // 2.25s cycle - gold pulses to bright yellow
            const phase = (time % 2.25) / 2.25;
            const pulse = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
            intensity = 0.5 + pulse * 0.3;

            // Gold -> Bright yellow -> Gold
            glowColor1 = lerpColor(COLORS.gold, '#FFFF66', pulse);
            glowColor2 = hexToRgb(COLORS.gold);
        } else if (isLuckyCommon) {
            // 2.25s cycle - green pulses for lucky spin common items
            const phase = (time % 2.25) / 2.25;
            const pulse = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5;
            intensity = 0.5 + pulse * 0.3;

            // Green -> Bright lime -> Green
            glowColor1 = lerpColor(COLORS.green, '#88FF88', pulse);
            glowColor2 = hexToRgb(COLORS.green);
        }

        // Draw multiple glow layers using radial gradients
        // Layer 1: Outer soft glow
        const gradient1 = ctx.createRadialGradient(centerX, centerY, boxSize * 0.2, centerX, centerY, glowSize * 0.7);
        gradient1.addColorStop(0, `rgba(${glowColor1.r}, ${glowColor1.g}, ${glowColor1.b}, ${intensity * 0.65})`);
        gradient1.addColorStop(0.4, `rgba(${glowColor1.r}, ${glowColor1.g}, ${glowColor1.b}, ${intensity * 0.35})`);
        gradient1.addColorStop(0.7, `rgba(${glowColor1.r}, ${glowColor1.g}, ${glowColor1.b}, ${intensity * 0.12})`);
        gradient1.addColorStop(1, `rgba(${glowColor1.r}, ${glowColor1.g}, ${glowColor1.b}, 0)`);

        ctx.fillStyle = gradient1;
        ctx.fillRect(glowX, glowY, glowSize, glowSize);

        // Layer 2: Inner bright glow
        const gradient2 = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, boxSize * 0.8);
        gradient2.addColorStop(0, `rgba(${glowColor1.r}, ${glowColor1.g}, ${glowColor1.b}, ${intensity * 0.7})`);
        gradient2.addColorStop(0.3, `rgba(${glowColor1.r}, ${glowColor1.g}, ${glowColor1.b}, ${intensity * 0.45})`);
        gradient2.addColorStop(0.6, `rgba(${glowColor2.r}, ${glowColor2.g}, ${glowColor2.b}, ${intensity * 0.25})`);
        gradient2.addColorStop(1, `rgba(${glowColor2.r}, ${glowColor2.g}, ${glowColor2.b}, 0)`);

        ctx.fillStyle = gradient2;
        ctx.fillRect(boxX - 15, boxY - 15, boxSize + 30, boxSize + 30);

        // Store border color in local variable (not on ctx to maintain reentrability)
        animatedBorderColor = `rgb(${glowColor1.r}, ${glowColor1.g}, ${glowColor1.b})`;
    }

    // ============================================
    // 2. BACKGROUND (semi-transparent, SMALLER to show glow)
    // ============================================
    ctx.beginPath();
    drawRoundedRectPath(ctx, boxX, boxY, boxSize, boxSize, radius);

    // Dark background so glow shows through
    if (isSpecialType) {
        // Darker, more transparent background for special items
        const bgAlpha = 0.85;
        // Use green-tinted background for lucky spin common items
        if (isLuckyCommon) {
            ctx.fillStyle = `rgba(10, 21, 10, ${bgAlpha})`;
        } else {
            ctx.fillStyle = showRecursionEffects
                ? `rgba(10, 21, 10, ${bgAlpha})`
                : `rgba(20, 20, 26, ${bgAlpha})`;
        }
    } else if (showRecursionEffects) {
        ctx.fillStyle = COLORS.recursionDark || '#0a150a';
    } else {
        ctx.fillStyle = COLORS.bgLight || '#252542';
    }
    ctx.fill();

    // ============================================
    // 3. INNER GRADIENT (subtle color tint)
    // ============================================
    if (isSpecialType) {
        ctx.beginPath();
        drawRoundedRectPath(ctx, boxX + 2, boxY + 2, boxSize - 4, boxSize - 4, radius - 1);

        const innerGradient = ctx.createLinearGradient(boxX, boxY, boxX + boxSize, boxY + boxSize);

        if (isRecursionType) {
            innerGradient.addColorStop(0, `${COLORS.recursion}22`);
            innerGradient.addColorStop(1, `${COLORS.recursion}11`);
        } else if (isEvent) {
            innerGradient.addColorStop(0, `${COLORS.gold}20`);
            innerGradient.addColorStop(1, `${COLORS.gold}10`);
        } else if (isInsane) {
            innerGradient.addColorStop(0, `${COLORS.insane}22`);
            innerGradient.addColorStop(1, `${COLORS.insane}11`);
        } else if (isMythic) {
            innerGradient.addColorStop(0, `${COLORS.aqua}18`);
            innerGradient.addColorStop(0.5, `${COLORS.purple}18`);
            innerGradient.addColorStop(1, `${COLORS.gold}18`);
        } else if (isSpecial) {
            // Pure purple gradient
            innerGradient.addColorStop(0, `${COLORS.purple}20`);
            innerGradient.addColorStop(1, `${COLORS.purple}10`);
        } else if (isRare) {
            // Pure red gradient
            innerGradient.addColorStop(0, `${COLORS.red}20`);
            innerGradient.addColorStop(1, `${COLORS.red}10`);
        } else if (isLuckyCommon) {
            // Green gradient for lucky spin common items
            innerGradient.addColorStop(0, `${COLORS.green}20`);
            innerGradient.addColorStop(1, `${COLORS.green}10`);
        }

        ctx.fillStyle = innerGradient;
        ctx.fill();
    }

    // ============================================
    // 4. BORDER (animated color for special items)
    // ============================================
    let borderColor = animatedBorderColor || COLORS.border;
    if (!isSpecialType) {
        if (isWinning) {
            borderColor = COLORS.gold;
        } else if (showRecursionEffects) {
            borderColor = `${COLORS.recursion}66`;
        } else {
            borderColor = COLORS.border;
        }
    }

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    drawRoundedRectPath(ctx, boxX, boxY, boxSize, boxSize, radius);
    ctx.stroke();

    // Add glow to border for special items
    if (isSpecialType && !isMobileDevice) {
        ctx.shadowColor = borderColor;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // ============================================
    // 5. ITEM IMAGE (centered with padding)
    // ============================================
    const imgSrc = getItemImageUrl(item);
    const img = images.get(imgSrc);

    if (img) {
        // Image scale - smaller = more visible padding/glow
        let imgScale = 0.65; // Default: 65% of box
        if (isEvent) imgScale = 0.90;
        else if (isRecursionType) imgScale = 0.72;
        else if (isInsane || isMythic) imgScale = 0.68;
        else if (isSpecial || isRare) imgScale = 0.68;

        const imgSize = boxSize * imgScale;
        const imgX = boxX + (boxSize - imgSize) / 2;
        const imgY = boxY + (boxSize - imgSize) / 2;

        // Pixelated for regular Minecraft items
        const useSmooth = isInsane || isSpecial || isRare || isMythic || item.username || isEvent || isRecursionType;
        ctx.imageSmoothingEnabled = useSmooth;
        ctx.imageSmoothingQuality = useSmooth ? 'high' : 'low';

        // Drop shadow for special items
        if (isRecursionType) {
            ctx.shadowColor = COLORS.recursion;
            ctx.shadowBlur = 12;
        } else if (isSpecialType) {
            ctx.shadowColor = animatedBorderColor || borderColor;
            ctx.shadowBlur = 6;
        }

        ctx.drawImage(img, imgX, imgY, imgSize, imgSize);

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
                                        accentColor = null, // Optional override for accent color (e.g., green for Lucky Spin)
                                        itemWidthOverride = null, // Optional override for item width (e.g., 90 for Triple Lucky desktop)
                                        isLuckySpin = false, // For Lucky Spin / Triple Lucky - common items use green
                                    }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const animationRef = useRef(null);
    const imagesRef = useRef(new Map());
    const timeRef = useRef(0);
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const [containerWidth, setContainerWidth] = useState(stripWidth || (isMobile ? 140 : 800));

    // Refs for props that change during animation (so render loop always has current values)
    // Note: offset is read from offsetRef if provided, otherwise from offsetProp
    const propsRef = useRef({ isSpinning, isResult, spinProgress, isRecursion, finalIndex, accentColor, isLuckySpin });
    propsRef.current = { isSpinning, isResult, spinProgress, isRecursion, finalIndex, accentColor, isLuckySpin };

    // Helper to get current offset - reads from ref if provided, otherwise uses prop value
    const getOffset = () => offsetRef ? offsetRef.current : offsetProp;

    const itemWidth = itemWidthOverride || (isMobile ? MOBILE_ITEM_WIDTH : ITEM_WIDTH);
    const width = stripWidth || containerWidth;
    const height = stripHeight || (isMobile ? 260 : 100);

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

        // Set canvas size with DPR
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);

        const render = (timestamp) => {
            // Use actual delta time for frame-rate independence
            const dt = (timestamp - lastTimestamp) / 1000;
            lastTimestamp = timestamp;
            timeRef.current += dt;
            const time = timeRef.current;

            // Get current prop values from ref (so animation has latest values)
            // Note: offset comes from offsetRef or offsetProp, not propsRef
            const { isSpinning, isResult, spinProgress, isRecursion, finalIndex, accentColor: accentOverride, isLuckySpin } = propsRef.current;
            const offset = getOffset();
            const motionIntensity = isSpinning ? Math.max(0, 1 - spinProgress * 1.5) : 0;
            const accentColor = accentOverride || (isRecursion ? COLORS.recursion : COLORS.gold);
            const bgColor = accentOverride ? '#0a150a' : (isRecursion ? COLORS.recursionDark : COLORS.bg);

            // Pre-compute hexToRgb once per frame instead of per-item
            const accentRgb = hexToRgb(accentColor);

            // Clear
            ctx.clearRect(0, 0, width, height);

            // Background
            if (isRecursion || accentOverride) {
                // Green/custom themed background
                const bgGradient = ctx.createLinearGradient(
                    isMobile ? 0 : 0,
                    isMobile ? 0 : 0,
                    isMobile ? 0 : width,
                    isMobile ? height : 0
                );
                bgGradient.addColorStop(0, bgColor);
                bgGradient.addColorStop(0.5, accentOverride ? '#0f1a0f' : '#0a1a0a');
                bgGradient.addColorStop(1, bgColor);
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

            // Recursion scanlines
            if (isRecursion) {
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
                        drawItem(ctx, item, itemCenterX, itemY, itemWidth, isWinning, isSpinning, isRecursion, imagesRef.current, time, isMobile, isLuckySpin);

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
                        drawItem(ctx, item, itemX, itemCenterY, itemWidth, isWinning, isSpinning, isRecursion, imagesRef.current, time, isMobile, isLuckySpin);

                        // Separator line - use accentColor
                        ctx.strokeStyle = `${accentColor}33`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(itemX + itemWidth, 0);
                        ctx.lineTo(itemX + itemWidth, height);
                        ctx.stroke();
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

export default CanvasSpinningStrip;