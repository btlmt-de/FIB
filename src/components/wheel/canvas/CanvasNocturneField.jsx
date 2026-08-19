// ============================================
// CanvasNocturneField.jsx
// ============================================
// The page field behind the spin surface.
//
// This used to be CanvasCosmicBackground — a purple-and-gold "cosmic casino"
// wash with a twinkling star field, the old surface's identity. THE NOCTURNE
// replaced that world and left this behind: the band's ground is the blue-hour
// ramp (#0d1322 → #0a0d18 → #05060a) while the page around it kept glowing
// purple and gold — two tiers' colours, spent as a page wash, on a field that
// was supposed to be the night city around the viaduct. It read as empty
// because its material disagreed with the world above it.
//
// The field is now the night air the deck sits in, light-first and barely
// there (owner-ratified 2026-08-19, "wet night / light-first", sub-4% alpha):
//   - sky light from above: the blue hour's own cool cobalt, pooling at the
//     top of the viewport and dying before the band;
//   - street haze under the deck: station amber on the wet street, pooled
//     just below the band's centre line, the same light as the band's own
//     curb pool;
//   - darkness at the bottom: the platform falls away below the stage.
// The grain is SURFACE_NOISE, the same material as the plinths.
//
// The stars stayed, dimmed to evening: a city sky at blue hour has stars just
// appearing. They are ambient by the Ambient-Off Rule and freeze under
// reduced motion (they draw once, statically, instead of twinkling).

import React, { useEffect, useRef } from 'react';
import { COLORS, SURFACE_NOISE } from '../config/constants';

// ============================================
// CANVAS STAR FIELD - Low FPS, Low DPR
// ============================================
export function CanvasStarField({ starCount = 40 }) {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const timeRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Generate the stars once, here, where impurity is allowed — a
        // render-phase `Math.random` is a component that redraws differently
        // on every re-render (react-hooks/purity).
        const stars = Array.from({ length: starCount }, () => ({
            x: Math.random(),
            y: Math.random(),
            size: Math.random() * 1.8 + 0.8,
            phase: Math.random() * Math.PI * 2,
            speed: 0.3 + Math.random() * 0.5,
            duration: 2 + Math.random() * 3,
        }));

        // OPTIMIZATION: Cap DPR at 1 for background - it's subtle anyway
        const dpr = 1;

        // OPTIMIZATION: Throttle to 15fps
        let lastRenderTime = 0;
        const TARGET_FPS = 15;
        const FRAME_TIME = 1000 / TARGET_FPS;

        // The Ambient-Off Rule: the stars twinkle (ambient) and freeze under
        // reduced motion — a static sky, drawn once at a fixed phase, not a
        // sky that keeps pulsing for somebody who asked the page to stop.
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const resize = () => {
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        // Resize redraws too: under reduced motion the canvas holds one static
        // sky, and a resize that clears the canvas without repainting it would
        // leave the sky blank until the next rAF tick — which, under reduced
        // motion, never comes.
        const onResize = () => {
            resize();
            if (reduceMotion) drawStars(0);
        };
        resize();
        window.addEventListener('resize', onResize);

        const drawStars = (time) => {
            const width = window.innerWidth;
            const height = window.innerHeight;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, width, height);

            // Evening stars: dimmer than the old cosmic field's, and cooler.
            // They are the first stars of blue hour, not a night sky at
            // midnight — the band's cobalt ramp is still lighter than them.
            for (const star of stars) {
                const x = star.x * width;
                const y = star.y * height;

                const twinkle = reduceMotion
                    ? 0.5
                    : Math.sin(time / star.duration * Math.PI * 2 + star.phase) * 0.5 + 0.5;
                const opacity = 0.12 + twinkle * 0.45;
                const scale = 0.8 + twinkle * 0.3;
                const size = star.size * scale;

                const glowRadius = size * 3;
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
                gradient.addColorStop(0, `rgba(210, 222, 244, ${0.16 * opacity})`);
                gradient.addColorStop(0.5, `rgba(210, 222, 244, ${0.08 * opacity})`);
                gradient.addColorStop(1, 'rgba(210, 222, 244, 0)');

                ctx.beginPath();
                ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(x, y, size / 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(210, 222, 244, ${opacity})`;
                ctx.fill();
            }
        };

        // Reduced motion: draw the sky once and stop. There is no rAF loop to
        // keep warm, and nothing to cancel on unmount but the listener (the
        // onResize handler above redraws on resize).
        if (reduceMotion) {
            drawStars(0);
            return () => {
                window.removeEventListener('resize', onResize);
            };
        }

        const render = (timestamp) => {
            // Throttle to target FPS
            const elapsed = timestamp - lastRenderTime;
            if (elapsed < FRAME_TIME) {
                animationRef.current = requestAnimationFrame(render);
                return;
            }
            lastRenderTime = timestamp - (elapsed % FRAME_TIME);

            timeRef.current += FRAME_TIME / 1000;
            drawStars(timeRef.current);

            animationRef.current = requestAnimationFrame(render);
        };

        animationRef.current = requestAnimationFrame(render);

        return () => {
            window.removeEventListener('resize', onResize);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [starCount]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
            }}
        />
    );
}

// ============================================
// THE NOCTURNE FIELD
// ============================================
export function CanvasNocturneField() {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 0
        }}>
            {/* The night air — light, not paint (owner-ratified 2026-08-19).
                Sky-light from above, station amber pooling under the deck,
                darkness at the platform. Every stop is ~4% or less: the field
                is felt, never looked at, and the reel stays the brightest
                thing on the surface. */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: `
                    radial-gradient(90% 45% at 50% -5%, rgba(148,168,212,0.06) 0%, transparent 60%),
                    radial-gradient(55% 26% at 50% 52%, rgba(255,183,94,0.045) 0%, transparent 70%),
                    linear-gradient(180deg, ${COLORS.bg} 0%, ${COLORS.bg} 55%, rgba(0,0,0,0.25) 100%)
                `,
            }} />

            {/* Canvas: star field (15fps, DPR capped at 1, frozen under
                reduced motion) */}
            <CanvasStarField starCount={40} />

            {/* The material grain, shared with the plinths (SURFACE_NOISE).
                Static by definition — motion freezes, material never does. */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: SURFACE_NOISE,
            }} />

            {/* Vignette (static) — the deck's light dies into the field at
                the edges, the same fade the band's own hairlines use. */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
            }} />
        </div>
    );
}

export default CanvasNocturneField;