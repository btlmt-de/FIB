// ============================================
// CanvasBonusStrip.jsx
// ============================================
// Canvas-based bonus event selection strip
// Shows Lucky Spin, Triple Spin, Triple Lucky events

import React, { useEffect, useRef, useState } from 'react';
import { COLORS } from '../../config/constants.js';

// ============================================
// CONSTANTS
// ============================================

const ITEM_WIDTH = 160;
const STRIP_HEIGHT = 110;
const STRIP_HEIGHT_MOBILE = 90;

// Event colors
const EVENT_COLORS = {
    lucky_spin: COLORS.green,
    triple_spin: COLORS.orange,
    triple_lucky_spin: COLORS.gold,
};

// ============================================
// HELPERS
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

const lerp = (a, b, t) => a + (b - a) * t;

// ============================================
// ICON DRAWING FUNCTIONS
// ============================================

// Draw a lightning bolt (Zap) for Lucky Spin
function drawZapIcon(ctx, x, y, size, color) {
    const rgb = hexToRgb(color);
    ctx.save();
    ctx.translate(x, y);

    // Glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;

    ctx.fillStyle = color;
    ctx.beginPath();
    // Lightning bolt shape
    const s = size / 24; // Scale factor
    ctx.moveTo(13 * s, 2 * s);
    ctx.lineTo(3 * s, 14 * s);
    ctx.lineTo(12 * s, 14 * s);
    ctx.lineTo(11 * s, 22 * s);
    ctx.lineTo(21 * s, 10 * s);
    ctx.lineTo(12 * s, 10 * s);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

// Draw stacked layers for Triple Spin
function drawLayersIcon(ctx, x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);

    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const s = size / 24;

    // Bottom layer
    ctx.beginPath();
    ctx.moveTo(12 * s, 20 * s);
    ctx.lineTo(2 * s, 14 * s);
    ctx.lineTo(12 * s, 8 * s);
    ctx.lineTo(22 * s, 14 * s);
    ctx.closePath();
    ctx.stroke();

    // Middle layer
    ctx.beginPath();
    ctx.moveTo(2 * s, 10 * s);
    ctx.lineTo(12 * s, 16 * s);
    ctx.lineTo(22 * s, 10 * s);
    ctx.stroke();

    // Top layer
    ctx.beginPath();
    ctx.moveTo(2 * s, 6 * s);
    ctx.lineTo(12 * s, 12 * s);
    ctx.lineTo(22 * s, 6 * s);
    ctx.lineTo(12 * s, 0 * s);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
}

// Draw a crown for Triple Lucky
function drawCrownIcon(ctx, x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);

    ctx.shadowColor = color;
    ctx.shadowBlur = 15;

    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const s = size / 24;

    // Crown shape
    ctx.beginPath();
    ctx.moveTo(2 * s, 17 * s);
    ctx.lineTo(2 * s, 7 * s);
    ctx.lineTo(7 * s, 12 * s);
    ctx.lineTo(12 * s, 4 * s);
    ctx.lineTo(17 * s, 12 * s);
    ctx.lineTo(22 * s, 7 * s);
    ctx.lineTo(22 * s, 17 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bottom band
    ctx.fillRect(2 * s, 18 * s, 20 * s, 3 * s);

    ctx.restore();
}

// ============================================
// MAIN EVENT SLOT RENDERER
// ============================================

function drawEventSlot(ctx, event, x, y, width, height, isSelected, time, isMobile) {
    if (!event) return;

    const isLucky = event.id === 'lucky_spin';
    const isTriple = event.id === 'triple_spin';
    const isTripleLucky = event.id === 'triple_lucky_spin';
    const eventColor = EVENT_COLORS[event.id] || COLORS.orange;
    const rgb = hexToRgb(eventColor);

    ctx.save();

    // ============================================
    // 1. BACKGROUND GRADIENT
    // ============================================
    const bgGradient = ctx.createLinearGradient(x, y, x, y + height);

    if (isTripleLucky) {
        bgGradient.addColorStop(0, `${COLORS.gold}25`);
        bgGradient.addColorStop(0.5, `${COLORS.green}18`);
        bgGradient.addColorStop(1, `${COLORS.gold}22`);
    } else if (isLucky) {
        bgGradient.addColorStop(0, `${COLORS.green}22`);
        bgGradient.addColorStop(0.5, `${COLORS.aqua}12`);
        bgGradient.addColorStop(1, `${COLORS.green}18`);
    } else {
        bgGradient.addColorStop(0, `${COLORS.orange}22`);
        bgGradient.addColorStop(0.5, `${COLORS.red}12`);
        bgGradient.addColorStop(1, `${COLORS.orange}18`);
    }

    ctx.fillStyle = bgGradient;
    ctx.fillRect(x, y, width, height);

    // ============================================
    // 2. SELECTED HIGHLIGHT
    // ============================================
    if (isSelected) {
        const pulse = Math.sin(time * Math.PI * 2) * 0.5 + 0.5;

        // Outer glow
        ctx.shadowColor = eventColor;
        ctx.shadowBlur = 20 + pulse * 10;
        ctx.strokeStyle = eventColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x + 6, y + 6, width - 12, height - 12, 8);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Inner glow fill
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.15 + pulse * 0.1})`;
        ctx.fill();
    }

    // ============================================
    // 3. SEPARATOR LINE
    // ============================================
    const sepGradient = ctx.createLinearGradient(x + width, y, x + width, y + height);
    sepGradient.addColorStop(0, 'transparent');
    sepGradient.addColorStop(0.5, `${COLORS.gold}80`);
    sepGradient.addColorStop(1, 'transparent');

    ctx.strokeStyle = sepGradient;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + width, y + height * 0.1);
    ctx.lineTo(x + width, y + height * 0.9);
    ctx.stroke();

    // ============================================
    // 4. ICON
    // ============================================
    const iconSize = isMobile ? 36 : 44;
    const iconX = x + (width - iconSize) / 2;
    const iconY = y + (height - iconSize) / 2 - (isMobile ? 10 : 14);

    // Icon background circle
    const circleRadius = iconSize / 2 + 4;
    const circleX = x + width / 2;
    const circleY = iconY + iconSize / 2;

    // Pulsing glow for icon
    const iconPulse = Math.sin(time * Math.PI * 1.5) * 0.3 + 0.7;

    ctx.beginPath();
    ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.2 * iconPulse})`;
    ctx.fill();

    // Draw the appropriate icon
    if (isLucky) {
        drawZapIcon(ctx, iconX, iconY, iconSize, eventColor);
    } else if (isTriple) {
        drawLayersIcon(ctx, iconX, iconY, iconSize, eventColor);
    } else if (isTripleLucky) {
        drawCrownIcon(ctx, iconX, iconY, iconSize, eventColor);
    }

    // ============================================
    // 5. LABEL TEXT
    // ============================================
    const labelY = y + height - (isMobile ? 18 : 22);
    const fontSize = isMobile ? 10 : 12;

    ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Text shadow/glow
    ctx.shadowColor = eventColor;
    ctx.shadowBlur = 6;
    ctx.fillStyle = eventColor;

    let label = '';
    if (isLucky) label = 'LUCKY SPIN';
    else if (isTriple) label = '5x SPIN';
    else if (isTripleLucky) label = 'TRIPLE LUCKY';

    ctx.fillText(label, x + width / 2, labelY);
    ctx.shadowBlur = 0;

    ctx.restore();
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CanvasBonusStrip({
                                     events = [],
                                     offsetRef = null, // Ref object for offset (avoids re-renders during animation)
                                     offset: offsetProp = 0, // Fallback value when not using ref
                                     isMobile = false,
                                     isSpinning = false,
                                     isResult = false,
                                     finalIndex = 35,
                                 }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const animationRef = useRef(null);
    const timeRef = useRef(0);
    const [containerWidth, setContainerWidth] = useState(800);

    // Refs for props that change during animation
    // Note: offset is read from offsetRef if provided, otherwise from offsetProp
    const propsRef = useRef({ isSpinning, isResult, finalIndex });
    propsRef.current = { isSpinning, isResult, finalIndex };

    // Helper to get current offset - reads from ref if provided, otherwise uses prop value
    const getOffset = () => offsetRef ? offsetRef.current : offsetProp;

    const height = isMobile ? STRIP_HEIGHT_MOBILE : STRIP_HEIGHT;
    const width = containerWidth;

    // Measure container width
    useEffect(() => {
        if (!containerRef.current) return;

        const updateWidth = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                if (rect && rect.width > 0) {
                    setContainerWidth(rect.width);
                }
            }
        };

        const resizeObserver = new ResizeObserver(updateWidth);
        resizeObserver.observe(containerRef.current);
        updateWidth();

        return () => resizeObserver.disconnect();
    }, []);

    // Main render loop - only animate when spinning or showing result
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || events.length === 0) return;

        const ctx = canvas.getContext('2d');
        let dpr = window.devicePixelRatio || 1;
        let lastTime = performance.now();

        // Set canvas size with DPR
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);

        const render = (timestamp) => {
            const { isSpinning, isResult, finalIndex } = propsRef.current;
            const offset = getOffset();

            // Use real delta time for frame-rate independent animation
            const dt = (timestamp - lastTime) / 1000;
            lastTime = timestamp;

            // Only increment time when animating (spinning or showing result with pulse)
            if (isSpinning || isResult) {
                timeRef.current += dt;
            }
            const time = timeRef.current;

            // Clear
            ctx.clearRect(0, 0, width, height);

            // Background
            const bgGradient = ctx.createLinearGradient(0, 0, width, 0);
            bgGradient.addColorStop(0, '#12100c');
            bgGradient.addColorStop(0.5, '#1a1610');
            bgGradient.addColorStop(1, '#12100c');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, width, height);

            // Draw events
            const centerX = width / 2 - ITEM_WIDTH / 2;

            events.forEach((event, idx) => {
                const eventX = centerX + idx * ITEM_WIDTH - offset;

                // Only draw visible events
                if (eventX > -ITEM_WIDTH && eventX < width + ITEM_WIDTH) {
                    const isSelected = isResult && idx === finalIndex;
                    drawEventSlot(ctx, event, eventX, 0, ITEM_WIDTH, height, isSelected, time, isMobile);
                }
            });

            // Only continue animation loop if spinning or showing result
            // Otherwise render once and stop to save CPU
            if (isSpinning || isResult) {
                animationRef.current = requestAnimationFrame(render);
            } else {
                animationRef.current = null;
            }
        };

        // Initial render
        animationRef.current = requestAnimationFrame(render);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
        };
    }, [events, width, height, isMobile]);

    // Re-trigger render when spinning/result state changes from idle
    useEffect(() => {
        if ((isSpinning || isResult) && !animationRef.current) {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            let lastTime = performance.now();

            const render = (timestamp) => {
                const { isSpinning: spinning, isResult: result, finalIndex } = propsRef.current;
                const offset = getOffset();
                const dt = (timestamp - lastTime) / 1000;
                lastTime = timestamp;

                if (spinning || result) {
                    timeRef.current += dt;
                }
                const time = timeRef.current;

                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                ctx.clearRect(0, 0, width, height);

                const bgGradient = ctx.createLinearGradient(0, 0, width, 0);
                bgGradient.addColorStop(0, '#12100c');
                bgGradient.addColorStop(0.5, '#1a1610');
                bgGradient.addColorStop(1, '#12100c');
                ctx.fillStyle = bgGradient;
                ctx.fillRect(0, 0, width, height);

                const centerX = width / 2 - ITEM_WIDTH / 2;
                events.forEach((event, idx) => {
                    const eventX = centerX + idx * ITEM_WIDTH - offset;
                    if (eventX > -ITEM_WIDTH && eventX < width + ITEM_WIDTH) {
                        const isSelected = result && idx === finalIndex;
                        drawEventSlot(ctx, event, eventX, 0, ITEM_WIDTH, height, isSelected, time, isMobile);
                    }
                });

                if (spinning || result) {
                    animationRef.current = requestAnimationFrame(render);
                } else {
                    animationRef.current = null;
                }
            };
            animationRef.current = requestAnimationFrame(render);
        }
    }, [isSpinning, isResult, events, width, height, isMobile]);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                width: '100%',
                height: `${height}px`,
                overflow: 'hidden',
                zIndex: 6,
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

export default CanvasBonusStrip;