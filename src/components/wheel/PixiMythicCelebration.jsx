// ============================================
// PixiMythicCelebration.jsx
// ============================================
// Drop-in replacement for MythicCelebration using GPU-accelerated Canvas
// Maintains identical visual appearance - no PixiJS, just Canvas 2D

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { COLORS } from '../../config/constants.js';
import { getDiscordAvatarUrl, getItemImageUrl, getMinecraftHeadUrl } from '../../utils/helpers.js';
import { useActivity } from '../../context/ActivityContext';
import { useSound } from '../../context/SoundContext.jsx';
import { Sparkles, Star, Crown, Diamond } from 'lucide-react';

// Configuration - must match original
const CELEBRATION_DELAY = 4500;
const CELEBRATION_DURATION = 12000;
const CONFETTI_COUNT = 500;

// Color schemes for each rarity - exact match
const RARITY_THEMES = {
    insane: {
        primary: COLORS.insane,
        secondary: COLORS.gold,
        accent: '#FFF5B0',
        confettiColors: [COLORS.insane, COLORS.gold, '#FFF5B0', '#FFE55C', '#FFCC00'],
        icon: Crown,
        label: 'INSANE PULL!'
    },
    mythic: {
        primary: COLORS.aqua,
        secondary: '#00DDFF',
        accent: '#88FFFF',
        confettiColors: [COLORS.aqua, '#00DDFF', '#88FFFF', '#00BBDD', COLORS.purple],
        icon: Sparkles,
        label: 'MYTHIC PULL!'
    }
};

// Convert hex string to RGB for Canvas
function hexToRgb(hex) {
    if (!hex) return { r: 255, g: 255, b: 255 };
    const cleanHex = hex.replace('#', '');
    return {
        r: parseInt(cleanHex.substr(0, 2), 16),
        g: parseInt(cleanHex.substr(2, 2), 16),
        b: parseInt(cleanHex.substr(4, 2), 16)
    };
}

// ============================================
// GPU CONFETTI PARTICLE
// ============================================

class ConfettiParticle {
    constructor(screenWidth, color) {
        this.reset(screenWidth, color, true);
    }

    reset(screenWidth, color, initial = false) {
        this.x = Math.random() * screenWidth;
        this.y = initial ? -20 - Math.random() * 100 : -20;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = 2 + Math.random() * 4;
        this.gravity = 0.15 + Math.random() * 0.1;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        this.scale = 0.5 + Math.random() * 0.5;
        this.alpha = 1;
        this.size = 6 + Math.random() * 10;
        this.shape = Math.random() > 0.5 ? 'circle' : 'square';
        this.color = color;
        this.delay = initial ? Math.random() * 2 : 0;
        this.spawned = !initial;
        this.life = 1;
        this.decay = 0.001 + Math.random() * 0.001;
    }

    update(delta, screenHeight, time) {
        if (!this.spawned) {
            if (time > this.delay) {
                this.spawned = true;
            }
            return true;
        }

        this.vy += this.gravity * delta;
        this.x += this.vx * delta;
        this.y += this.vy * delta;
        this.rotation += this.rotationSpeed * delta;
        this.life -= this.decay * delta;
        this.alpha = Math.max(0, this.life);

        return this.y < screenHeight + 50 && this.life > 0;
    }

    draw(ctx) {
        if (!this.spawned || this.alpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);

        const rgb = hexToRgb(this.color);
        ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

        if (this.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        }

        ctx.restore();
    }
}

// ============================================
// CANVAS-BASED CONFETTI SYSTEM
// ============================================

function CanvasConfetti({ active, colors, count }) {
    const canvasRef = useRef(null);
    const particlesRef = useRef([]);
    const animationRef = useRef(null);
    const timeRef = useRef(0);
    const initializedRef = useRef(false);
    const lastColorsRef = useRef(null);

    useEffect(() => {
        // Check if colors changed - need to reinitialize particles
        const colorsChanged = lastColorsRef.current && colors !== lastColorsRef.current;
        lastColorsRef.current = colors;

        if (active && (!initializedRef.current || colorsChanged)) {
            // Clear old particles first
            particlesRef.current = [];

            initializedRef.current = true;
            const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 800;

            particlesRef.current = Array.from({ length: count }, (_, i) => {
                const color = colors[i % colors.length];
                return new ConfettiParticle(screenWidth, color);
            });
            timeRef.current = 0;
        } else if (!active) {
            initializedRef.current = false;
            particlesRef.current = [];
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        }
    }, [active, count, colors]);

    useEffect(() => {
        if (!active || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let lastTime = performance.now();

        const animate = (currentTime) => {
            const delta = (currentTime - lastTime) / 16.67; // Normalize to ~60fps
            lastTime = currentTime;
            timeRef.current += delta * 0.016;

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update and draw particles
            const screenHeight = window.innerHeight;
            particlesRef.current.forEach(p => {
                p.update(delta, screenHeight, timeRef.current);
                p.draw(ctx);
            });

            // Remove dead particles
            particlesRef.current = particlesRef.current.filter(p => p.life > 0);

            if (particlesRef.current.length > 0 || active) {
                animationRef.current = requestAnimationFrame(animate);
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [active]);

    // Handle resize with debounce for performance
    useEffect(() => {
        let resizeTimeout;

        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (canvasRef.current) {
                    canvasRef.current.width = window.innerWidth;
                    canvasRef.current.height = window.innerHeight;
                }
            }, 100); // 100ms debounce
        };

        // Initial size
        if (canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
        }

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(resizeTimeout);
        };
    }, []);

    if (!active && particlesRef.current.length === 0) return null;

    return (
        <canvas
            ref={canvasRef}
            width={window.innerWidth}
            height={window.innerHeight}
            style={{
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 9997,
            }}
        />
    );
}

// ============================================
// CANVAS-BASED BACKGROUND PULSE
// ============================================

function CanvasBackgroundPulse({ active, colors }) {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const timeRef = useRef(0);

    useEffect(() => {
        if (!active || !canvasRef.current) {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const animate = () => {
            timeRef.current += 0.02;

            const width = canvas.width;
            const height = canvas.height;
            const colorIndex = Math.floor(timeRef.current / 2) % colors.length;
            const alpha = (Math.sin(timeRef.current) + 1) / 2 * 0.15;

            ctx.clearRect(0, 0, width, height);

            // Radial gradient
            const cx = width / 2;
            const cy = height / 2;
            const maxRadius = Math.max(width, height) * 0.7;

            const rgb = hexToRgb(colors[colorIndex]);
            const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
            gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`);
            gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [active, colors]);

    // Handle resize with debounce for performance
    useEffect(() => {
        let resizeTimeout;

        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (canvasRef.current) {
                    canvasRef.current.width = window.innerWidth;
                    canvasRef.current.height = window.innerHeight;
                }
            }, 100); // 100ms debounce
        };

        // Initial size
        if (canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
        }

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(resizeTimeout);
        };
    }, []);

    if (!active) return null;

    return (
        <canvas
            ref={canvasRef}
            width={window.innerWidth}
            height={window.innerHeight}
            style={{
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 9996,
            }}
        />
    );
}

// ============================================
// MAIN COMPONENT - DROP-IN REPLACEMENT
// ============================================

export function PixiMythicCelebration({ currentUserId }) {
    const { newItems, serverTime } = useActivity();
    const { playRaritySound } = useSound();
    const [celebration, setCelebration] = useState(null);
    const [showFlash, setShowFlash] = useState(false);
    const [pulseBackground, setPulseBackground] = useState(false);
    const [confettiActive, setConfettiActive] = useState(false);
    const [shakeScreen, setShakeScreen] = useState(false);
    const processedItemsRef = useRef(new Set());
    const pendingCelebrationsRef = useRef([]);

    // Memoize sparkle positions to prevent teleporting on re-renders
    // Only regenerate when celebration item changes
    const sparkleSpecs = useMemo(() => {
        return Array.from({ length: 12 }, (_, i) => ({
            size: 10 + Math.random() * 12,
            left: 5 + Math.random() * 90,
            top: 5 + Math.random() * 90,
            animationDuration: 0.8 + Math.random() * 0.8,
            animationDelay: Math.random() * 2,
            iconIndex: i % 3,
            fillIndex: i % 2,
        }));
    }, [celebration?.itemTexture, celebration?.itemName]);

    const triggerCelebration = useCallback((item) => {
        // Clear any pending timeouts from previous celebrations
        pendingCelebrationsRef.current.forEach(id => clearTimeout(id));
        pendingCelebrationsRef.current = [];

        const rarity = item.item_rarity;
        const theme = RARITY_THEMES[rarity] || RARITY_THEMES.mythic;
        const isCurrentUser = currentUserId != null && item.user_id === currentUserId;

        if (!isCurrentUser) {
            playRaritySound(rarity);
        }

        const trackTimeout = (callback, delay) => {
            const id = setTimeout(callback, delay);
            pendingCelebrationsRef.current.push(id);
            return id;
        };

        setCelebration({
            username: item.custom_username || 'Someone',
            itemName: item.item_name,
            itemTexture: item.item_texture || item.texture,
            discordId: item.discord_id,
            discordAvatar: item.discord_avatar,
            isCurrentUser,
            rarity: rarity,
            theme: theme,
            itemUsername: item.item_username
        });

        // Flash sequence
        const flashSequence = [0, 200, 400, 700, 1000];
        flashSequence.forEach(d => {
            trackTimeout(() => {
                setShowFlash(true);
                trackTimeout(() => setShowFlash(false), 120);
            }, d);
        });

        // Background pulse
        setPulseBackground(true);

        // Confetti
        setConfettiActive(true);

        // Screen shake
        setShakeScreen(true);
        trackTimeout(() => setShakeScreen(false), 800);

        // End celebration
        trackTimeout(() => {
            setCelebration(null);
            setPulseBackground(false);
        }, CELEBRATION_DURATION);

        trackTimeout(() => setConfettiActive(false), CELEBRATION_DURATION + 3000);
    }, [currentUserId, playRaritySound]);

    useEffect(() => {
        return () => {
            pendingCelebrationsRef.current.forEach(id => clearTimeout(id));
            pendingCelebrationsRef.current = [];
        };
    }, []);

    useEffect(() => {
        if (!newItems || newItems.length === 0) return;

        const specialPulls = newItems.filter(item =>
            (item.item_rarity === 'insane' || item.item_rarity === 'mythic') &&
            item.event_type !== 'achievement_unlock' &&
            !processedItemsRef.current.has(item.id)
        );

        if (specialPulls.length > 0) {
            const specialItem = specialPulls[0];
            processedItemsRef.current.add(specialItem.id);

            if (processedItemsRef.current.size > 50) {
                const arr = Array.from(processedItemsRef.current);
                processedItemsRef.current = new Set(arr.slice(-25));
            }

            const isCurrentUser = currentUserId != null && specialItem.user_id === currentUserId;
            let delay = CELEBRATION_DELAY;

            let createdAtStr = specialItem.created_at;
            if (createdAtStr && !createdAtStr.includes('Z') && !createdAtStr.includes('+')) {
                createdAtStr = createdAtStr.replace(' ', 'T') + 'Z';
            }
            const createdAt = createdAtStr ? new Date(createdAtStr).getTime() : null;

            if (isCurrentUser) {
                if (createdAt) {
                    const age = Date.now() - createdAt;
                    delay = Math.max(0, CELEBRATION_DELAY - age);
                } else {
                    delay = 500;
                }
            } else {
                if (serverTime && createdAt) {
                    const age = serverTime - createdAt;
                    if (age >= 0) {
                        delay = Math.max(2000, CELEBRATION_DELAY - age);
                    }
                }
            }

            const timeoutId = setTimeout(() => {
                triggerCelebration(specialItem);
            }, delay);

            pendingCelebrationsRef.current.push(timeoutId);
        }
    }, [newItems, serverTime, triggerCelebration, currentUserId]);

    if (!celebration && !confettiActive && !pulseBackground) return null;

    const theme = celebration?.theme || RARITY_THEMES.mythic;
    const rarity = celebration?.rarity || 'mythic';
    const isInsane = rarity === 'insane';
    const IconComponent = theme.icon;

    const getItemImage = () => {
        if (!celebration) return '';
        if (celebration.itemUsername) {
            return getMinecraftHeadUrl(celebration.itemUsername);
        }
        return getItemImageUrl({
            texture: celebration.itemTexture,
            type: rarity
        });
    };

    return (
        <>
            {/* Original CSS animations */}
            <style>{`
                @keyframes screenFlash {
                    0% { opacity: 0.8; }
                    100% { opacity: 0; }
                }
                @keyframes celebrationSlideIn {
                    0% { opacity: 0; transform: translate(-50%, -200px) scale(0.3) rotate(-15deg); }
                    60% { transform: translate(-50%, 30px) scale(1.15) rotate(3deg); }
                    80% { transform: translate(-50%, -10px) scale(0.95) rotate(-1deg); }
                    100% { opacity: 1; transform: translate(-50%, 0) scale(1) rotate(0deg); }
                }
                @keyframes celebrationPulse {
                    0%, 100% { box-shadow: 0 0 80px ${theme.primary}aa, 0 0 150px ${theme.secondary}88, 0 0 220px ${theme.accent}66; transform: scale(1); }
                    50% { box-shadow: 0 0 120px ${theme.primary}cc, 0 0 200px ${theme.secondary}aa, 0 0 300px ${theme.accent}88; transform: scale(1.03); }
                }
                @keyframes itemFloat {
                    0%, 100% { transform: translateY(0) rotate(-10deg) scale(1); }
                    25% { transform: translateY(-20px) rotate(10deg) scale(1.15); }
                    50% { transform: translateY(-8px) rotate(-6deg) scale(1.08); }
                    75% { transform: translateY(-25px) rotate(8deg) scale(1.12); }
                }
                @keyframes textGlow {
                    0%, 100% { text-shadow: 0 0 40px ${theme.primary}cc, 0 0 80px ${theme.secondary}88, 0 0 120px ${theme.accent}66; transform: scale(1); }
                    50% { text-shadow: 0 0 60px ${theme.primary}ff, 0 0 100px ${theme.secondary}aa, 0 0 150px ${theme.accent}88; transform: scale(1.08); }
                }
                @keyframes borderRotate {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 400% 50%; }
                }
                @keyframes screenShake {
                    0%, 100% { transform: translate(-50%, 0) rotate(0deg); }
                    10% { transform: translate(calc(-50% + 12px), 8px) rotate(1.5deg); }
                    20% { transform: translate(calc(-50% - 12px), -8px) rotate(-1.5deg); }
                    30% { transform: translate(calc(-50% + 10px), 6px) rotate(1deg); }
                    40% { transform: translate(calc(-50% - 10px), -6px) rotate(-1deg); }
                    50% { transform: translate(calc(-50% + 6px), 4px) rotate(0.5deg); }
                    60% { transform: translate(calc(-50% - 6px), -4px) rotate(-0.5deg); }
                    70% { transform: translate(calc(-50% + 4px), 2px) rotate(0.3deg); }
                    80% { transform: translate(calc(-50% - 4px), -2px) rotate(-0.3deg); }
                    90% { transform: translate(calc(-50% + 2px), 1px) rotate(0.1deg); }
                }
                @keyframes sparkle {
                    0%, 100% { opacity: 0.3; transform: scale(0.8) rotate(0deg); }
                    50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
                }
                @keyframes bounceIn {
                    0% { transform: scale(0) rotate(-45deg); }
                    50% { transform: scale(1.4) rotate(10deg); }
                    70% { transform: scale(0.9) rotate(-5deg); }
                    100% { transform: scale(1) rotate(0deg); }
                }
                @keyframes iconBounce {
                    0%, 100% { transform: translateY(0) rotate(-5deg); }
                    50% { transform: translateY(-8px) rotate(5deg); }
                }
            `}</style>

            {/* Canvas-based GPU effects */}
            <CanvasBackgroundPulse
                active={pulseBackground}
                colors={theme.confettiColors}
            />

            {/* Screen Flash */}
            {showFlash && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundImage: `linear-gradient(135deg, ${theme.primary}aa, ${theme.secondary}aa, ${theme.accent}aa)`,
                    animation: 'screenFlash 0.12s ease-out forwards',
                    pointerEvents: 'none',
                    zIndex: 9998,
                }} />
            )}

            {/* Canvas Confetti */}
            <CanvasConfetti
                active={confettiActive}
                colors={theme.confettiColors}
                count={CONFETTI_COUNT}
            />

            {/* DOM Celebration Card - keeps exact original look */}
            {celebration && (
                <div style={{
                    position: 'fixed',
                    top: '40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 9999,
                    animation: `celebrationSlideIn 1s cubic-bezier(0.34, 1.56, 0.64, 1)${shakeScreen ? ', screenShake 0.6s ease-out' : ''}`
                }}>
                    <div style={{ position: 'absolute', top: '-35px', left: '50%', transform: 'translateX(-50%)', animation: 'iconBounce 1s ease-in-out infinite' }}>
                        {isInsane ? (
                            <Crown size={50} color={theme.primary} fill={theme.primary} style={{ filter: `drop-shadow(0 0 15px ${theme.primary})` }} />
                        ) : (
                            <Sparkles size={50} color={theme.primary} style={{ filter: `drop-shadow(0 0 15px ${theme.primary})` }} />
                        )}
                    </div>

                    <div style={{
                        padding: '5px',
                        borderRadius: '28px',
                        backgroundImage: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary}, ${theme.accent}, ${theme.primary}, ${theme.secondary})`,
                        backgroundSize: '400% 100%',
                        animation: 'borderRotate 1.5s linear infinite, celebrationPulse 0.8s ease-in-out infinite'
                    }}>
                        <div style={{
                            background: `linear-gradient(135deg, ${COLORS.bg} 0%, ${COLORS.bgLight} 50%, ${COLORS.bg} 100%)`,
                            borderRadius: '24px',
                            padding: '32px 48px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '28px',
                            minWidth: '550px',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {/* Sparkle decorations */}
                            {sparkleSpecs.map((spec, i) => {
                                const icons = isInsane ? [Crown, Star, Crown] : [Sparkles, Diamond, Sparkles];
                                const colorsArr = [theme.primary, theme.accent, theme.secondary];
                                const Icon = icons[spec.iconIndex];
                                return (
                                    <Icon
                                        key={i}
                                        size={spec.size}
                                        color={colorsArr[spec.iconIndex]}
                                        fill={spec.fillIndex === 0 ? colorsArr[spec.iconIndex] : 'none'}
                                        style={{
                                            position: 'absolute',
                                            left: `${spec.left}%`,
                                            top: `${spec.top}%`,
                                            opacity: 0.4,
                                            animation: `sparkle ${spec.animationDuration}s ease-in-out infinite`,
                                            animationDelay: `${spec.animationDelay}s`
                                        }}
                                    />
                                );
                            })}

                            {/* Item image container */}
                            <div style={{
                                position: 'relative',
                                width: '110px',
                                height: '110px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundImage: `linear-gradient(135deg, ${theme.primary}55, ${theme.accent}55, ${theme.primary}55)`,
                                borderRadius: '20px',
                                border: `4px solid ${theme.primary}aa`,
                                animation: 'itemFloat 1.5s ease-in-out infinite',
                                boxShadow: `0 0 40px ${theme.primary}88, 0 0 80px ${theme.primary}66, inset 0 0 30px ${theme.accent}33`
                            }}>
                                <img
                                    src={getItemImage()}
                                    alt={celebration.itemName}
                                    style={{
                                        width: '80px',
                                        height: '80px',
                                        objectFit: 'contain',
                                        filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.7))'
                                    }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                <IconComponent
                                    size={28}
                                    color={theme.primary}
                                    style={{
                                        position: 'absolute',
                                        top: '-14px',
                                        right: '-14px',
                                        animation: 'bounceIn 0.6s ease-out, sparkle 0.8s ease-in-out infinite',
                                        filter: `drop-shadow(0 0 8px ${theme.primary})`
                                    }}
                                />
                                {isInsane ? (
                                    <Crown
                                        size={24}
                                        color={theme.primary}
                                        style={{
                                            position: 'absolute',
                                            bottom: '-10px',
                                            left: '-10px',
                                            animation: 'bounceIn 0.6s ease-out 0.2s, sparkle 1s ease-in-out infinite',
                                            filter: `drop-shadow(0 0 8px ${theme.primary})`
                                        }}
                                    />
                                ) : (
                                    <Diamond
                                        size={24}
                                        color={theme.primary}
                                        style={{
                                            position: 'absolute',
                                            bottom: '-10px',
                                            left: '-10px',
                                            animation: 'bounceIn 0.6s ease-out 0.2s, sparkle 1s ease-in-out infinite',
                                            filter: `drop-shadow(0 0 8px ${theme.primary})`
                                        }}
                                    />
                                )}
                            </div>

                            {/* Text content */}
                            <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                                <div style={{
                                    fontSize: '18px',
                                    color: theme.primary,
                                    fontWeight: '900',
                                    textTransform: 'uppercase',
                                    letterSpacing: '4px',
                                    marginBottom: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    animation: 'textGlow 0.8s ease-in-out infinite'
                                }}>
                                    <IconComponent size={20} />
                                    <span>{theme.label}</span>
                                    <IconComponent size={20} />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                                    <img
                                        src={getDiscordAvatarUrl(celebration.discordId, celebration.discordAvatar)}
                                        alt=""
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            border: `3px solid ${theme.primary}`,
                                            boxShadow: `0 0 20px ${theme.primary}88`
                                        }}
                                        onError={(e) => { e.target.onerror = null; e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; }}
                                    />
                                    <span style={{ fontSize: '24px', fontWeight: '700', color: COLORS.text }}>{celebration.username}</span>
                                    <span style={{ fontSize: '20px', color: COLORS.textMuted }}>found</span>
                                </div>

                                <div style={{
                                    fontSize: '32px',
                                    fontWeight: '900',
                                    backgroundImage: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary}, ${theme.accent}, ${theme.primary})`,
                                    backgroundSize: '300% 100%',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    animation: 'borderRotate 2s linear infinite, textGlow 0.8s ease-in-out infinite',
                                    letterSpacing: '2px'
                                }}>
                                    {celebration.itemName}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default PixiMythicCelebration;