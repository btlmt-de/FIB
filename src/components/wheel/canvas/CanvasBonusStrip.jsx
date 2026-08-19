// ============================================
// CanvasBonusStrip.jsx
// ============================================
// Canvas-based bonus event selection strip
// Shows Lucky Spin, Triple Spin, Triple Lucky events

import React, { useEffect, useRef, useState } from 'react';
import { BONUS_IDENTITY, BONUS_IDENTITY_FALLBACK } from '../config/constants';
import { ITEM_WIDTH, STRIP_HEIGHT } from '../../../config/constants.js';

// ============================================
// CONSTANTS
// ============================================

/**
 * The board's geometry, owned here, because the board and the animation that
 * lands it MUST agree on the pitch and nothing else can enforce that.
 *
 * They did not agree, and it was a correctness bug rather than a cosmetic one.
 * This file declared a local `ITEM_WIDTH = 160` that shadowed the shared 120,
 * while `spinBonusWheel` computed its stop from the shared one — so the reel
 * came to rest at `64 × 120 = 7680`, and the tile actually sitting under the
 * pointer was `7680 / 160 = 48`. Index 48 is a *filler* slot, and fillers are a
 * fresh `selectWeightedEvent()` roll, so the board announced a random event
 * while the server's real one executed underneath. It agreed by luck about a
 * third of the time, which is why it read as intermittent.
 *
 * The comment in `spinBonusWheel` describes fixing exactly this and fixed it the
 * wrong way round: it moved the *animation* to 120 and called 120 "the canvas's"
 * width, which it never was. The board now takes the reel's own pitch — the same
 * rule the lane takeovers landed on — and the strip length and landing index are
 * exported so WheelSpinner cannot restate them differently.
 */
export const BONUS_PITCH = ITEM_WIDTH;
export const BONUS_STRIP_LENGTH = 80;
export const BONUS_FINAL_INDEX = BONUS_STRIP_LENGTH - 16;

const STRIP_HEIGHT_MOBILE = 90;

// The event identities come from BONUS_IDENTITY in config/constants — the board,
// the stage's plaque and the band's own lamp all read that one table. They used
// to keep three private copies and all three had drifted; see the note there.

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

// ============================================
// ICON DRAWING FUNCTIONS
// ============================================

// Draw a lightning bolt (Zap) for Lucky Spin
function drawZapIcon(ctx, x, y, size, color) {
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
    const identity = BONUS_IDENTITY[event.id] || BONUS_IDENTITY_FALLBACK;
    const eventColor = identity.color;
    const iconColor = identity.iconColor;
    const rgb = hexToRgb(eventColor);

    ctx.save();

    // ============================================
    // 1. THE TILE'S LIGHT — a wash standing on the floor, not a slab
    // ============================================
    //
    // This is the reel's density lesson, applied to the board a pass late.
    //
    // What was here filled the tile edge to edge, top to bottom, and was lit at
    // BOTH ends — the strongest stops at 0 and 1 with the weakest at 0.5. That
    // is the Inert-Common Rule's failure exactly: closing the gradient at both
    // ends makes a shape tinted along every edge, which is a rectangle no matter
    // what the middle does. Sixteen of them abutting across a 1920 band meant the
    // deck ground the board is supposed to sit on was never visible anywhere, and
    // the board read as a strip of coloured plates rather than as signs standing
    // on the platform.
    //
    // **Density is area × saturation, and only the area had to give.** The wash
    // now occupies the bottom ~68% and the top third is clean deck; the peak is
    // *higher* than it was (0.20 at the floor against the old 0.13), because a
    // tier reads as bright when something in it is blown out, not when a large
    // area is moderately lit. Desaturating it instead would have produced the
    // "dull and washed out" complaint the reel already collected once.
    //
    // **One hue per event, and it is the event's own.** The old gradient had
    // three separate disagreements with the identity it was drawing: the 5x tile
    // washed ORANGE under a gold icon (the comment on EVENT_COLORS describes
    // fixing precisely this and only fixed the icon), triple-lucky washed
    // gold-dominant for a mode that executes green, and lucky carried an aqua
    // mid-stop that belongs to no event at all. A second hue inside a tile costs
    // density and buys nothing — the identity is carried by the icon and the
    // label, which are small, saturated and blown out. That is where a tile's
    // colour budget should go.
    const wash = ctx.createLinearGradient(x, y + height * 0.32, x, y + height);
    wash.addColorStop(0, `${eventColor}00`);
    wash.addColorStop(0.62, `${eventColor}14`);
    wash.addColorStop(1, `${eventColor}33`);
    ctx.fillStyle = wash;
    ctx.fillRect(x, y + height * 0.32, width, height * 0.68);

    // ============================================
    // 2. SELECTED HIGHLIGHT
    // ============================================
    if (isSelected) {
        const pulse = Math.sin(time * Math.PI * 2) * 0.5 + 0.5;

        // The winner treatment, in the reel's language rather than a framed box:
        // a wash, a hairline, and the bar with defined ends. The old rounded
        // outline read as a card highlight on a board that no longer has cards.
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.10 + pulse * 0.07})`;
        ctx.fillRect(x, y, width, height);

        ctx.strokeStyle = eventColor;
        ctx.lineWidth = 1;
        ctx.shadowColor = eventColor;
        ctx.shadowBlur = 10;
        ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
        ctx.shadowBlur = 0;

        ctx.fillStyle = eventColor;
        ctx.fillRect(x + 6, y + height - 3, width - 12, 2);
    }

    // ============================================
    // 3. SEPARATOR LINE
    // ============================================
    // A hairline, in the deck's rail register — the old gold gradient seam was
    // the card language's tick. The separators divide the destination signs
    // without framing them.
    const sepGradient = ctx.createLinearGradient(x + width, y, x + width, y + height);
    sepGradient.addColorStop(0, 'transparent');
    sepGradient.addColorStop(0.5, 'rgba(190,198,220,0.08)');
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

    // The disc behind the icon is the tile's core: small, saturated, and the one
    // place the wash gave its area budget to. It takes the icon's colour, so the
    // crown sits in gold light on a green tile.
    const iconRgb = hexToRgb(iconColor);
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${iconRgb.r}, ${iconRgb.g}, ${iconRgb.b}, ${0.22 * iconPulse})`;
    ctx.fill();

    // Draw the appropriate icon
    if (isLucky) {
        drawZapIcon(ctx, iconX, iconY, iconSize, iconColor);
    } else if (isTriple) {
        drawLayersIcon(ctx, iconX, iconY, iconSize, iconColor);
    } else if (isTripleLucky) {
        drawCrownIcon(ctx, iconX, iconY, iconSize, iconColor);
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

/**
 * One frame of the board, and there is exactly one of these on purpose.
 *
 * There used to be two copies of this loop — the main effect and the one that
 * restarts it when the spin state flips — and they had already drifted: the
 * takeover redesign moved the board onto the deck's blue-hour ground
 * (#0d1322 -> #0a0d18 -> #05060a) in the first copy and left the second one
 * painting the old warm card fill (#12100c / #1a1610), the exact palette that
 * pass deleted. Whichever loop happened to own the frame decided which world
 * the player saw. The restart effect now calls this too, so there is one
 * answer.
 */
function drawBoard(ctx, { width, height, events, offset, isResult, finalIndex, time, isMobile }) {
    ctx.clearRect(0, 0, width, height);

    // The deck's own ground, blue hour sinking to the curb (THE NOCTURNE), with
    // the board's vignette fading the edges the way the reel's machined edges
    // do. The old warm fill was the card language's ground and sat on top of the
    // band's tint like a plate.
    const deckGradient = ctx.createLinearGradient(0, 0, 0, height);
    deckGradient.addColorStop(0, '#0d1322');
    deckGradient.addColorStop(0.45, '#0a0d18');
    deckGradient.addColorStop(1, '#05060a');
    ctx.fillStyle = deckGradient;
    ctx.fillRect(0, 0, width, height);

    const edgeFade = ctx.createLinearGradient(0, 0, width, 0);
    edgeFade.addColorStop(0, 'rgba(5,6,10,0.85)');
    edgeFade.addColorStop(0.14, 'rgba(5,6,10,0)');
    edgeFade.addColorStop(0.86, 'rgba(5,6,10,0)');
    edgeFade.addColorStop(1, 'rgba(5,6,10,0.85)');
    ctx.fillStyle = edgeFade;
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2 - BONUS_PITCH / 2;
    events.forEach((event, idx) => {
        const eventX = centerX + idx * BONUS_PITCH - offset;
        if (eventX > -BONUS_PITCH && eventX < width + BONUS_PITCH) {
            drawEventSlot(ctx, event, eventX, 0, BONUS_PITCH, height, isResult && idx === finalIndex, time, isMobile);
        }
    });
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
    useEffect(() => {
        propsRef.current = { isSpinning, isResult, finalIndex };
    });

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

            drawBoard(ctx, { width, height, events, offset, isResult, finalIndex, time, isMobile });

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
                drawBoard(ctx, { width, height, events, offset, isResult: result, finalIndex, time, isMobile });

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