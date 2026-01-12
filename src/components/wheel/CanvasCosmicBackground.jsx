// ============================================
// CanvasCosmicBackground.jsx
// ============================================
// GPU-accelerated star field and floating orbs
// Uses Canvas instead of 50+ DOM elements for better performance

import React, { useEffect, useRef, useMemo } from 'react';
import { COLORS } from '../../config/constants.js';

// ============================================
// CANVAS STAR FIELD
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
                speed: 0.3 + Math.random() * 0.5, // Twinkle speed
                duration: 2 + Math.random() * 3, // Match original duration range
            }))
        , [starCount]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        const resize = () => {
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
        };

        resize();
        window.addEventListener('resize', resize);

        const render = () => {
            timeRef.current += 0.016;
            const time = timeRef.current;
            const width = window.innerWidth;
            const height = window.innerHeight;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, width, height);

            // Draw stars
            for (const star of stars) {
                const x = star.x * width;
                const y = star.y * height;

                // Twinkle effect matching original CSS animation
                // Original: opacity 0.2-1, scale 0.8-1.2
                const twinkle = Math.sin(time / star.duration * Math.PI * 2 + star.phase) * 0.5 + 0.5;
                const opacity = 0.2 + twinkle * 0.8;
                const scale = 0.8 + twinkle * 0.4;
                const size = star.size * scale;

                // Draw glow first (like boxShadow)
                // Original: boxShadow: 0 0 ${size*2}px ${size}px rgba(255,255,255,0.3)
                const glowRadius = size * 3;
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
                gradient.addColorStop(0, `rgba(255, 255, 255, ${0.3 * opacity})`);
                gradient.addColorStop(0.5, `rgba(255, 255, 255, ${0.15 * opacity})`);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

                ctx.beginPath();
                ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                // Draw crisp star center (solid white circle)
                ctx.beginPath();
                ctx.arc(x, y, size / 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                ctx.fill();
            }

            animationRef.current = requestAnimationFrame(render);
        };

        render();

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
// FULL COSMIC BACKGROUND (Canvas version)
// ============================================
export function CanvasCosmicBackground() {
    const orbs = useMemo(() => [
        { color: COLORS.gold, size: 300, x: 0.1, y: 0.2, phase: 0 },
        { color: COLORS.purple, size: 250, x: 0.8, y: 0.6, phase: 2 },
        { color: COLORS.aqua, size: 200, x: 0.6, y: 0.1, phase: 4 },
        { color: COLORS.orange, size: 180, x: 0.2, y: 0.7, phase: 1 },
    ], []);

    const orbCanvasRef = useRef(null);
    const orbAnimationRef = useRef(null);
    const orbTimeRef = useRef(0);

    // Animated orbs on separate canvas
    useEffect(() => {
        const canvas = orbCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;

        const resize = () => {
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
        };

        resize();
        window.addEventListener('resize', resize);

        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 0, g: 0, b: 0 };
        };

        const render = () => {
            orbTimeRef.current += 0.016;
            const time = orbTimeRef.current;
            const width = window.innerWidth;
            const height = window.innerHeight;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, width, height);

            // Apply blur via filter
            ctx.filter = 'blur(40px)';

            for (const orb of orbs) {
                // Floating animation
                const floatX = Math.sin(time * 0.1 + orb.phase) * 50;
                const floatY = Math.cos(time * 0.08 + orb.phase) * 30;
                const opacity = 0.3 + Math.sin(time * 0.15 + orb.phase) * 0.2;

                const x = orb.x * width + floatX;
                const y = orb.y * height + floatY;
                const rgb = hexToRgb(orb.color);

                const gradient = ctx.createRadialGradient(x, y, 0, x, y, orb.size);
                gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.4})`);
                gradient.addColorStop(0.4, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity * 0.1})`);
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

                ctx.beginPath();
                ctx.arc(x, y, orb.size, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();
            }

            ctx.filter = 'none';

            orbAnimationRef.current = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', resize);
            if (orbAnimationRef.current) {
                cancelAnimationFrame(orbAnimationRef.current);
            }
        };
    }, [orbs]);

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
                animation: 'meshGradient 20s ease infinite',
            }} />

            {/* Canvas: Floating orbs */}
            <canvas
                ref={orbCanvasRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                }}
            />

            {/* Canvas: Star field */}
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