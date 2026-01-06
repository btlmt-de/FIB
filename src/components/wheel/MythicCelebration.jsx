// ============================================
// Global Mythic Celebration Component
// ============================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { COLORS } from '../../config/constants.js';
import { getDiscordAvatarUrl, getItemImageUrl } from '../../utils/helpers.js';
import { useActivity } from '../../context/ActivityContext';
import { Sparkles, Star, Zap, Crown } from 'lucide-react';

// Configuration
const CELEBRATION_DELAY = 5000;
const CELEBRATION_DURATION = 15000;
const CONFETTI_COUNT = 500;

// Confetti particle component
function ConfettiParticle({ delay, color, left, size, duration }) {
    const rotation = Math.random() * 360;
    const drift = (Math.random() - 0.5) * 200;

    return (
        <div style={{
            position: 'absolute',
            left: `${left}%`,
            top: '-20px',
            width: `${size}px`,
            height: `${size}px`,
            background: color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animation: `confettiFall ${duration}s ease-in forwards`,
            animationDelay: `${delay}s`,
            transform: `rotate(${rotation}deg)`,
            opacity: 0,
            '--drift': `${drift}px`
        }} />
    );
}

export function MythicCelebration({ currentUserId }) {
    const { newItems, serverTime } = useActivity();
    const [celebration, setCelebration] = useState(null);
    const [confetti, setConfetti] = useState([]);
    const [showFlash, setShowFlash] = useState(false);
    const [pulseBackground, setPulseBackground] = useState(false);
    const [shakeScreen, setShakeScreen] = useState(false);
    const processedMythicsRef = useRef(new Set());
    const pendingCelebrationsRef = useRef([]);

    // Check for new mythic pulls
    useEffect(() => {
        if (!newItems || newItems.length === 0) return;

        // Find mythic pulls (item drops, not achievements)
        const mythicPulls = newItems.filter(item =>
            item.item_rarity === 'mythic' &&
            item.event_type !== 'achievement_unlock' &&
            !processedMythicsRef.current.has(item.id)
        );

        if (mythicPulls.length > 0) {
            const mythic = mythicPulls[0];
            processedMythicsRef.current.add(mythic.id);

            // Clean up old processed IDs
            if (processedMythicsRef.current.size > 50) {
                const arr = Array.from(processedMythicsRef.current);
                processedMythicsRef.current = new Set(arr.slice(-25));
            }

            // Calculate delay based on when the activity was created
            // We want to show the celebration AFTER the wheel animation finishes
            let delay = CELEBRATION_DELAY;

            if (serverTime && mythic.created_at) {
                let createdAtStr = mythic.created_at;
                if (!createdAtStr.includes('Z') && !createdAtStr.includes('+')) {
                    createdAtStr = createdAtStr.replace(' ', 'T') + 'Z';
                }
                const createdAt = new Date(createdAtStr).getTime();
                const age = serverTime - createdAt;
                // Reduce delay by how old the activity already is, but keep minimum 2s
                delay = Math.max(2000, CELEBRATION_DELAY - age);
            }

            // Schedule the celebration
            const timeoutId = setTimeout(() => {
                triggerCelebration(mythic);
            }, delay);

            pendingCelebrationsRef.current.push(timeoutId);
        }
    }, [newItems, serverTime]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            pendingCelebrationsRef.current.forEach(id => clearTimeout(id));
        };
    }, []);

    const triggerCelebration = useCallback((mythic) => {
        // Set celebration data
        setCelebration({
            username: mythic.custom_username || 'Someone',
            itemName: mythic.item_name,
            itemTexture: mythic.item_texture,
            discordId: mythic.discord_id,
            discordAvatar: mythic.discord_avatar,
            isCurrentUser: mythic.user_id === currentUserId
        });

        // Trigger multiple screen flashes for impact
        const flashSequence = [0, 200, 400, 700, 1000];
        flashSequence.forEach(delay => {
            setTimeout(() => {
                setShowFlash(true);
                setTimeout(() => setShowFlash(false), 120);
            }, delay);
        });

        // Enable pulsing background
        setPulseBackground(true);

        // Enable screen shake (multiple waves)
        setShakeScreen(true);
        setTimeout(() => setShakeScreen(false), 1500);
        setTimeout(() => {
            setShakeScreen(true);
            setTimeout(() => setShakeScreen(false), 800);
        }, 3000);

        // Generate LOTS of confetti in waves
        const colors = [COLORS.aqua, COLORS.purple, COLORS.gold, COLORS.green, '#fff', '#ff69b4', '#00ffff', '#ff4444'];

        // Wave 1 - immediate burst
        const wave1 = [];
        for (let i = 0; i < CONFETTI_COUNT; i++) {
            wave1.push({
                id: `w1-${i}`,
                color: colors[Math.floor(Math.random() * colors.length)],
                left: Math.random() * 100,
                delay: Math.random() * 0.5,
                size: 6 + Math.random() * 12,
                duration: 3 + Math.random() * 2
            });
        }
        setConfetti(wave1);

        // Wave 2 - second burst
        setTimeout(() => {
            const wave2 = [];
            for (let i = 0; i < CONFETTI_COUNT; i++) {
                wave2.push({
                    id: `w2-${i}`,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    left: Math.random() * 100,
                    delay: Math.random() * 0.5,
                    size: 6 + Math.random() * 12,
                    duration: 3 + Math.random() * 2
                });
            }
            setConfetti(prev => [...prev, ...wave2]);
        }, 2000);

        // Wave 3 - third burst
        setTimeout(() => {
            const wave3 = [];
            for (let i = 0; i < CONFETTI_COUNT; i++) {
                wave3.push({
                    id: `w3-${i}`,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    left: Math.random() * 100,
                    delay: Math.random() * 0.5,
                    size: 6 + Math.random() * 12,
                    duration: 3 + Math.random() * 2
                });
            }
            setConfetti(prev => [...prev, ...wave3]);
        }, 4000);

        // Wave 4 - final burst
        setTimeout(() => {
            const wave4 = [];
            for (let i = 0; i < CONFETTI_COUNT; i++) {
                wave4.push({
                    id: `w4-${i}`,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    left: Math.random() * 100,
                    delay: Math.random() * 0.5,
                    size: 6 + Math.random() * 12,
                    duration: 3 + Math.random() * 2
                });
            }
            setConfetti(prev => [...prev, ...wave4]);
        }, 6000);

        // Clear celebration after duration
        setTimeout(() => {
            setCelebration(null);
            setConfetti([]);
            setPulseBackground(false);
        }, CELEBRATION_DURATION);
    }, [currentUserId]);

    if (!celebration && confetti.length === 0 && !pulseBackground) return null;

    return (
        <>
            <style>{`
                @keyframes confettiFall {
                    0% {
                        opacity: 1;
                        transform: translateY(0) translateX(0) rotate(0deg) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translateY(100vh) translateX(var(--drift)) rotate(1080deg) scale(0.5);
                    }
                }
                @keyframes screenFlash {
                    0% { opacity: 0.8; }
                    100% { opacity: 0; }
                }
                @keyframes celebrationSlideIn {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, -200px) scale(0.3) rotate(-15deg);
                    }
                    60% {
                        transform: translate(-50%, 30px) scale(1.15) rotate(3deg);
                    }
                    80% {
                        transform: translate(-50%, -10px) scale(0.95) rotate(-1deg);
                    }
                    100% {
                        opacity: 1;
                        transform: translate(-50%, 0) scale(1) rotate(0deg);
                    }
                }
                @keyframes celebrationPulse {
                    0%, 100% {
                        box-shadow: 0 0 80px ${COLORS.aqua}aa, 0 0 150px ${COLORS.purple}88, 0 0 220px ${COLORS.gold}66;
                        transform: scale(1);
                    }
                    50% {
                        box-shadow: 0 0 120px ${COLORS.aqua}cc, 0 0 200px ${COLORS.purple}aa, 0 0 300px ${COLORS.gold}88;
                        transform: scale(1.03);
                    }
                }
                @keyframes mythicItemFloat {
                    0%, 100% { transform: translateY(0) rotate(-10deg) scale(1); }
                    25% { transform: translateY(-20px) rotate(10deg) scale(1.15); }
                    50% { transform: translateY(-8px) rotate(-6deg) scale(1.08); }
                    75% { transform: translateY(-25px) rotate(8deg) scale(1.12); }
                }
                @keyframes textGlow {
                    0%, 100% { 
                        text-shadow: 0 0 40px ${COLORS.aqua}cc, 0 0 80px ${COLORS.purple}88, 0 0 120px ${COLORS.gold}66;
                        transform: scale(1);
                    }
                    50% { 
                        text-shadow: 0 0 60px ${COLORS.aqua}ff, 0 0 100px ${COLORS.purple}aa, 0 0 150px ${COLORS.gold}88;
                        transform: scale(1.08);
                    }
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
                @keyframes backgroundPulse {
                    0%, 100% { 
                        background: radial-gradient(ellipse at center, ${COLORS.aqua}22 0%, ${COLORS.purple}15 30%, transparent 70%);
                    }
                    33% { 
                        background: radial-gradient(ellipse at center, ${COLORS.purple}22 0%, ${COLORS.gold}15 30%, transparent 70%);
                    }
                    66% { 
                        background: radial-gradient(ellipse at center, ${COLORS.gold}22 0%, ${COLORS.aqua}15 30%, transparent 70%);
                    }
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
                @keyframes crownBounce {
                    0%, 100% { transform: translateY(0) rotate(-5deg); }
                    50% { transform: translateY(-8px) rotate(5deg); }
                }
            `}</style>

            {/* Pulsing background overlay */}
            {pulseBackground && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    animation: 'backgroundPulse 1.5s ease-in-out infinite',
                    pointerEvents: 'none',
                    zIndex: 9996
                }} />
            )}

            {/* Screen flash */}
            {showFlash && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: `linear-gradient(135deg, ${COLORS.aqua}aa, ${COLORS.purple}aa, ${COLORS.gold}aa)`,
                    animation: 'screenFlash 0.12s ease-out forwards',
                    pointerEvents: 'none',
                    zIndex: 9998
                }} />
            )}

            {/* Confetti */}
            <div style={{
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 9997,
                overflow: 'hidden'
            }}>
                {confetti.map(p => (
                    <ConfettiParticle
                        key={p.id}
                        color={p.color}
                        left={p.left}
                        delay={p.delay}
                        size={p.size}
                        duration={p.duration}
                    />
                ))}
            </div>

            {/* Celebration banner */}
            {celebration && (
                <div style={{
                    position: 'fixed',
                    top: '40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 9999,
                    animation: `celebrationSlideIn 1s cubic-bezier(0.34, 1.56, 0.64, 1)${shakeScreen ? ', screenShake 0.6s ease-out' : ''}`
                }}>
                    {/* Crown on top */}
                    <div style={{
                        position: 'absolute',
                        top: '-35px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        animation: 'crownBounce 1s ease-in-out infinite'
                    }}>
                        <Crown size={50} color={COLORS.gold} fill={COLORS.gold} style={{
                            filter: `drop-shadow(0 0 15px ${COLORS.gold})`
                        }} />
                    </div>

                    {/* Glowing border wrapper */}
                    <div style={{
                        padding: '5px',
                        borderRadius: '28px',
                        background: `linear-gradient(90deg, ${COLORS.aqua}, ${COLORS.purple}, ${COLORS.gold}, ${COLORS.green}, ${COLORS.purple}, ${COLORS.aqua})`,
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
                            {/* Animated stars in background */}
                            {[...Array(12)].map((_, i) => (
                                <Star
                                    key={i}
                                    size={10 + Math.random() * 12}
                                    color={[COLORS.aqua, COLORS.purple, COLORS.gold][i % 3]}
                                    fill={[COLORS.aqua, COLORS.purple, COLORS.gold][i % 3]}
                                    style={{
                                        position: 'absolute',
                                        left: `${5 + Math.random() * 90}%`,
                                        top: `${5 + Math.random() * 90}%`,
                                        opacity: 0.4,
                                        animation: `sparkle ${0.8 + Math.random() * 0.8}s ease-in-out infinite`,
                                        animationDelay: `${Math.random() * 2}s`
                                    }}
                                />
                            ))}

                            {/* Mythic item image */}
                            <div style={{
                                position: 'relative',
                                width: '110px',
                                height: '110px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: `linear-gradient(135deg, ${COLORS.aqua}55, ${COLORS.purple}55, ${COLORS.gold}55)`,
                                borderRadius: '20px',
                                border: `4px solid ${COLORS.aqua}aa`,
                                animation: 'mythicItemFloat 1.5s ease-in-out infinite',
                                boxShadow: `0 0 40px ${COLORS.aqua}88, 0 0 80px ${COLORS.purple}66, inset 0 0 30px ${COLORS.gold}33`
                            }}>
                                <img
                                    src={getItemImageUrl({ texture: celebration.itemTexture, type: 'mythic' })}
                                    alt={celebration.itemName}
                                    style={{
                                        width: '80px',
                                        height: '80px',
                                        objectFit: 'contain',
                                        filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.7))'
                                    }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                                {/* Sparkles around the item */}
                                <Sparkles
                                    size={28}
                                    color={COLORS.gold}
                                    style={{
                                        position: 'absolute',
                                        top: '-14px',
                                        right: '-14px',
                                        animation: 'bounceIn 0.6s ease-out, sparkle 0.8s ease-in-out infinite',
                                        filter: `drop-shadow(0 0 8px ${COLORS.gold})`
                                    }}
                                />
                                <Zap
                                    size={24}
                                    color={COLORS.aqua}
                                    fill={COLORS.aqua}
                                    style={{
                                        position: 'absolute',
                                        bottom: '-10px',
                                        left: '-10px',
                                        animation: 'bounceIn 0.6s ease-out 0.2s, sparkle 1s ease-in-out infinite',
                                        filter: `drop-shadow(0 0 8px ${COLORS.aqua})`
                                    }}
                                />
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                                <div style={{
                                    fontSize: '18px',
                                    color: COLORS.aqua,
                                    fontWeight: '900',
                                    textTransform: 'uppercase',
                                    letterSpacing: '4px',
                                    marginBottom: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    animation: 'textGlow 0.8s ease-in-out infinite'
                                }}>
                                    <Sparkles size={20} />
                                    <span>MYTHIC PULL!</span>
                                    <Sparkles size={20} />
                                </div>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    marginBottom: '12px'
                                }}>
                                    <img
                                        src={getDiscordAvatarUrl(celebration.discordId, celebration.discordAvatar)}
                                        alt=""
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            border: `3px solid ${COLORS.aqua}`,
                                            boxShadow: `0 0 20px ${COLORS.aqua}88`
                                        }}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
                                        }}
                                    />
                                    <span style={{
                                        fontSize: '24px',
                                        fontWeight: '700',
                                        color: COLORS.text
                                    }}>
                                        {celebration.username}
                                    </span>
                                    <span style={{
                                        fontSize: '20px',
                                        color: COLORS.textMuted
                                    }}>
                                        found
                                    </span>
                                </div>

                                <div style={{
                                    fontSize: '32px',
                                    fontWeight: '900',
                                    background: `linear-gradient(135deg, ${COLORS.aqua}, ${COLORS.purple}, ${COLORS.gold}, ${COLORS.aqua})`,
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