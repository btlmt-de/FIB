// ============================================
// Global Mythic & Insane Celebration Component
// ============================================
// Shows a full-page celebration when ANY user pulls a MYTHIC or INSANE item
// Delays celebration to sync with wheel animation finishing

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { COLORS } from '../../config/constants.js';
import { getDiscordAvatarUrl, getItemImageUrl, getMinecraftHeadUrl } from '../../utils/helpers.js';
import { useActivity } from '../../context/ActivityContext';
import { Sparkles, Star, Crown, Diamond } from 'lucide-react';

// Configuration
const CELEBRATION_DELAY = 5000;
const CELEBRATION_DURATION = 12000;
const CONFETTI_COUNT = 300;

// Color schemes for each rarity
const RARITY_THEMES = {
    insane: {
        primary: COLORS.insane,      // Gold #FFD700
        secondary: COLORS.gold,       // #FFAA00
        accent: '#FFF5B0',            // Light gold
        confettiColors: [COLORS.insane, COLORS.gold, '#FFF5B0', '#FFE55C', '#FFCC00'],
        icon: Crown,
        label: 'INSANE PULL!'
    },
    mythic: {
        primary: COLORS.aqua,         // Aqua #55FFFF
        secondary: '#00DDFF',         // Cyan
        accent: '#88FFFF',            // Light aqua
        confettiColors: [COLORS.aqua, '#00DDFF', '#88FFFF', '#00BBDD', COLORS.purple],
        icon: Sparkles,
        label: 'MYTHIC PULL!'
    }
};

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
    const processedItemsRef = useRef(new Set());
    const pendingCelebrationsRef = useRef([]);

    useEffect(() => {
        if (!newItems || newItems.length === 0) return;

        // Find both insane AND mythic pulls
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

            let delay = CELEBRATION_DELAY;

            if (serverTime && specialItem.created_at) {
                let createdAtStr = specialItem.created_at;
                if (!createdAtStr.includes('Z') && !createdAtStr.includes('+')) {
                    createdAtStr = createdAtStr.replace(' ', 'T') + 'Z';
                }
                const createdAt = new Date(createdAtStr).getTime();
                const age = serverTime - createdAt;
                delay = Math.max(2000, CELEBRATION_DELAY - age);
            }

            const timeoutId = setTimeout(() => {
                triggerCelebration(specialItem);
            }, delay);

            pendingCelebrationsRef.current.push(timeoutId);
        }
    }, [newItems, serverTime]);

    useEffect(() => {
        return () => {
            pendingCelebrationsRef.current.forEach(id => clearTimeout(id));
            pendingCelebrationsRef.current = [];
        };
    }, []);

    const triggerCelebration = useCallback((item) => {
        const rarity = item.item_rarity;
        const theme = RARITY_THEMES[rarity] || RARITY_THEMES.mythic;

        // Helper to track timeouts for cleanup
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
            isCurrentUser: item.user_id === currentUserId,
            rarity: rarity,
            theme: theme,
            // For mythic items with username (like eltobito), we need the head URL
            itemUsername: item.item_username
        });

        const flashSequence = [0, 200, 400, 700, 1000];
        flashSequence.forEach(d => {
            trackTimeout(() => {
                setShowFlash(true);
                trackTimeout(() => setShowFlash(false), 120);
            }, d);
        });

        setPulseBackground(true);
        setShakeScreen(true);
        trackTimeout(() => setShakeScreen(false), 800);

        const newConfetti = [];
        for (let i = 0; i < CONFETTI_COUNT; i++) {
            newConfetti.push({
                id: i,
                color: theme.confettiColors[Math.floor(Math.random() * theme.confettiColors.length)],
                left: Math.random() * 100,
                delay: Math.random() * 2,
                size: 6 + Math.random() * 10,
                duration: 2.5 + Math.random() * 2
            });
        }
        setConfetti(newConfetti);

        trackTimeout(() => {
            setCelebration(null);
            setPulseBackground(false);
        }, CELEBRATION_DURATION);

        trackTimeout(() => setConfetti([]), CELEBRATION_DURATION + 3000);
    }, [currentUserId]);

    if (!celebration && confetti.length === 0 && !pulseBackground) return null;

    // Get theme colors for dynamic CSS
    const theme = celebration?.theme || RARITY_THEMES.mythic;
    const rarity = celebration?.rarity || 'mythic';
    const isInsane = rarity === 'insane';
    const IconComponent = theme.icon;

    // Get item image URL - handle mythic items with usernames
    const getItemImage = () => {
        if (!celebration) return '';

        // If the mythic item has a username, use the Minecraft head
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
            <style>{`
                @keyframes confettiFall {
                    0% { opacity: 1; transform: translateY(0) translateX(0) rotate(0deg) scale(1); }
                    100% { opacity: 0; transform: translateY(100vh) translateX(var(--drift)) rotate(1080deg) scale(0.5); }
                }
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
                @keyframes backgroundPulse {
                    0%, 100% { background: radial-gradient(ellipse at center, ${theme.primary}22 0%, ${theme.secondary}15 30%, transparent 70%); }
                    33% { background: radial-gradient(ellipse at center, ${theme.secondary}22 0%, ${theme.accent}15 30%, transparent 70%); }
                    66% { background: radial-gradient(ellipse at center, ${theme.accent}22 0%, ${theme.primary}15 30%, transparent 70%); }
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

            {pulseBackground && (
                <div style={{ position: 'fixed', inset: 0, animation: 'backgroundPulse 1.5s ease-in-out infinite', pointerEvents: 'none', zIndex: 9996 }} />
            )}

            {showFlash && (
                <div style={{ position: 'fixed', inset: 0, background: `linear-gradient(135deg, ${theme.primary}aa, ${theme.secondary}aa, ${theme.accent}aa)`, animation: 'screenFlash 0.12s ease-out forwards', pointerEvents: 'none', zIndex: 9998 }} />
            )}

            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9997, overflow: 'hidden' }}>
                {confetti.map(p => <ConfettiParticle key={p.id} color={p.color} left={p.left} delay={p.delay} size={p.size} duration={p.duration} />)}
            </div>

            {celebration && (
                <div style={{ position: 'fixed', top: '40px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, animation: `celebrationSlideIn 1s cubic-bezier(0.34, 1.56, 0.64, 1)${shakeScreen ? ', screenShake 0.6s ease-out' : ''}` }}>
                    {/* Top icon - different based on rarity */}
                    <div style={{ position: 'absolute', top: '-35px', left: '50%', transform: 'translateX(-50%)', animation: 'iconBounce 1s ease-in-out infinite' }}>
                        {isInsane ? (
                            <Crown size={50} color={theme.primary} fill={theme.primary} style={{ filter: `drop-shadow(0 0 15px ${theme.primary})` }} />
                        ) : (
                            <Sparkles size={50} color={theme.primary} style={{ filter: `drop-shadow(0 0 15px ${theme.primary})` }} />
                        )}
                    </div>

                    <div style={{ padding: '5px', borderRadius: '28px', background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary}, ${theme.accent}, ${theme.primary}, ${theme.secondary})`, backgroundSize: '400% 100%', animation: 'borderRotate 1.5s linear infinite, celebrationPulse 0.8s ease-in-out infinite' }}>
                        <div style={{ background: `linear-gradient(135deg, ${COLORS.bg} 0%, ${COLORS.bgLight} 50%, ${COLORS.bg} 100%)`, borderRadius: '24px', padding: '32px 48px', display: 'flex', alignItems: 'center', gap: '28px', minWidth: '550px', position: 'relative', overflow: 'hidden' }}>
                            {/* Sparkle decorations */}
                            {[...Array(12)].map((_, i) => {
                                const icons = isInsane ? [Crown, Star, Crown] : [Sparkles, Diamond, Sparkles];
                                const colors = [theme.primary, theme.accent, theme.secondary];
                                const Icon = icons[i % 3];
                                return (
                                    <Icon
                                        key={i}
                                        size={10 + Math.random() * 12}
                                        color={colors[i % 3]}
                                        fill={i % 2 === 0 ? colors[i % 3] : 'none'}
                                        style={{
                                            position: 'absolute',
                                            left: `${5 + Math.random() * 90}%`,
                                            top: `${5 + Math.random() * 90}%`,
                                            opacity: 0.4,
                                            animation: `sparkle ${0.8 + Math.random() * 0.8}s ease-in-out infinite`,
                                            animationDelay: `${Math.random() * 2}s`
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
                                background: `linear-gradient(135deg, ${theme.primary}55, ${theme.accent}55, ${theme.primary}55)`,
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
                                    background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary}, ${theme.accent}, ${theme.primary})`,
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