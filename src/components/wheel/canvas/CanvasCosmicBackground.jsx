// ============================================
// CanvasCosmicBackground.jsx
// ============================================
// GPU-accelerated star field
// OPTIMIZED: Removed orbs entirely, stars at 15fps with capped DPR

import React, { useEffect, useRef, useMemo } from 'react';
import { COLORS } from '../../../config/constants.js';

// ============================================
// CANVAS STAR FIELD - Low FPS, Low DPR
// ============================================
export function CanvasStarField({ starCount = 50 }) {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const timeRef = useRef(0);

    // Generate star data once
    const stars = useMemo(() =>
            Array.from({ length: starCount }, () => ({
                x: Math.random(),
                y: Math.random(),
                size: Math.random() * 2 + 1,
                phase: Math.random() * Math.PI * 2,
                speed: 0.3 + Math.random() * 0.5,
                duration: 2 + Math.random() * 3,
            }))
        , [starCount]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // OPTIMIZATION: Cap DPR at 1 for background - it's subtle anyway
        const dpr = 1;

        // OPTIMIZATION: Throttle to 15fps
        let lastRenderTime = 0;
        const TARGET_FPS = 15;
        const FRAME_TIME = 1000 / TARGET_FPS;

        const resize = () => {
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        resize();
        window.addEventListener('resize', resize);

        const render = (timestamp) => {
            // Throttle to target FPS
            const elapsed = timestamp - lastRenderTime;
            if (elapsed < FRAME_TIME) {
                animationRef.current = requestAnimationFrame(render);
                return;
            }
            lastRenderTime = timestamp - (elapsed % FRAME_TIME);

            timeRef.current += FRAME_TIME / 1000;
            const time = timeRef.current;

            const width = window.innerWidth;
            const height = window.innerHeight;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, width, height);

            // Draw stars
            for (const star of stars) {
                const x = star.x * width;
                const y = star.y * height;

                const twinkle = Math.sin(time / star.duration * Math.PI * 2 + star.phase) * 0.5 + 0.5;
                const opacity = 0.2 + twinkle * 0.8;
                const scale = 0.8 + twinkle * 0.4;
                const size = star.size * scale;

                const glowRadius = size * 3;
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
                gradient.addColorStop(0, `rgba(255, 255, 255, ${0.3 * opacity})`);
                gradient.addColorStop(0.5, `rgba(255, 255, 255, ${0.15 * opacity})`);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

                ctx.beginPath();
                ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(x, y, size / 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                ctx.fill();
            }

            animationRef.current = requestAnimationFrame(render);
        };

        animationRef.current = requestAnimationFrame(render);

        return () => {
            window.removeEventListener('resize', resize);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [stars]);

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
// FULL COSMIC BACKGROUND
// OPTIMIZED: Orbs removed entirely
// ============================================
export function CanvasCosmicBackground() {
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
            {/* Base gradient (static - no animation needed) */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: `
                    radial-gradient(ellipse at 20% 20%, ${COLORS.purple}15 0%, transparent 50%),
                    radial-gradient(ellipse at 80% 80%, ${COLORS.gold}10 0%, transparent 50%),
                    radial-gradient(ellipse at 50% 50%, ${COLORS.bgLight} 0%, ${COLORS.bg} 100%)
                `,
            }} />

            {/* Animated mesh gradient overlay (CSS - efficient) */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `
                    radial-gradient(circle at 30% 30%, ${COLORS.aqua}08 0%, transparent 40%),
                    radial-gradient(circle at 70% 70%, ${COLORS.purple}08 0%, transparent 40%)
                `,
                backgroundSize: '200% 200%',
                animation: 'none',
            }} />

            {/* REMOVED: Canvas floating orbs with blur filter */}

            {/* Canvas: Star field (15fps, DPR capped at 1) */}
            <CanvasStarField starCount={50} />

            {/* Subtle noise texture overlay (static) */}
            <div style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.03,
                background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }} />

            {/* Vignette (static) */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
            }} />
        </div>
    );
}

export default CanvasCosmicBackground;