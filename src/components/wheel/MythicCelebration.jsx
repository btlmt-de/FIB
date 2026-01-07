// ============================================
// Global Insane Item Celebration Component
// ============================================
// Shows a full-page celebration when ANY user pulls an INSANE item
// Delays celebration to sync with wheel animation finishing

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { COLORS } from '../../config/constants.js';
import { getDiscordAvatarUrl, getItemImageUrl } from '../../utils/helpers.js';
import { useActivity } from '../../context/ActivityContext';
import { Sparkles, Star, Crown } from 'lucide-react';

// Configuration
const CELEBRATION_DELAY = 7000;
const CELEBRATION_DURATION = 12000;
const CONFETTI_COUNT = 300;
const INSANE_COLOR = '#FFD700';

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
    const processedInsaneRef = useRef(new Set());
    const pendingCelebrationsRef = useRef([]);

    useEffect(() => {
        if (!newItems || newItems.length === 0) return;

        // Debug logging
        console.log('[MythicCelebration] New items received:', newItems.length);
        newItems.forEach(item => {
            console.log('[MythicCelebration] Item:', {
                id: item.id,
                rarity: item.item_rarity,
                type: item.event_type,
                name: item.item_name
            });
        });

        const insanePulls = newItems.filter(item =>
            item.item_rarity === 'insane' &&
            item.event_type !== 'achievement_unlock' &&
            !processedInsaneRef.current.has(item.id)
        );

        console.log('[MythicCelebration] Insane pulls found:', insanePulls.length);

        if (insanePulls.length > 0) {
            const insane = insanePulls[0];
            console.log('[MythicCelebration] Processing insane item:', insane);
            processedInsaneRef.current.add(insane.id);

            if (processedInsaneRef.current.size > 50) {
                const arr = Array.from(processedInsaneRef.current);
                processedInsaneRef.current = new Set(arr.slice(-25));
            }

            let delay = CELEBRATION_DELAY;

            if (serverTime && insane.created_at) {
                let createdAtStr = insane.created_at;
                if (!createdAtStr.includes('Z') && !createdAtStr.includes('+')) {
                    createdAtStr = createdAtStr.replace(' ', 'T') + 'Z';
                }
                const createdAt = new Date(createdAtStr).getTime();
                const age = serverTime - createdAt;
                delay = Math.max(2000, CELEBRATION_DELAY - age);
            }

            const timeoutId = setTimeout(() => {
                triggerCelebration(insane);
            }, delay);

            pendingCelebrationsRef.current.push(timeoutId);
        }
    }, [newItems, serverTime]);

    useEffect(() => {
        return () => {
            pendingCelebrationsRef.current.forEach(id => clearTimeout(id));
        };
    }, []);

    const triggerCelebration = useCallback((insane) => {
        setCelebration({
            username: insane.custom_username || 'Someone',
            itemName: insane.item_name,
            itemTexture: insane.item_texture,
            discordId: insane.discord_id,
            discordAvatar: insane.discord_avatar,
            isCurrentUser: insane.user_id === currentUserId
        });

        const flashSequence = [0, 200, 400, 700, 1000];
        flashSequence.forEach(d => {
            setTimeout(() => {
                setShowFlash(true);
                setTimeout(() => setShowFlash(false), 120);
            }, d);
        });

        setPulseBackground(true);
        setShakeScreen(true);
        setTimeout(() => setShakeScreen(false), 1500);
        setTimeout(() => {
            setShakeScreen(true);
            setTimeout(() => setShakeScreen(false), 800);
        }, 3000);

        const colors = [INSANE_COLOR, COLORS.gold, '#fff', '#FFF5B0', '#FFEC8B', '#FFE135', '#FFD700'];

        const createWave = (id) => {
            const wave = [];
            for (let i = 0; i < CONFETTI_COUNT; i++) {
                wave.push({
                    id: `${id}-${i}`,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    left: Math.random() * 100,
                    delay: Math.random() * 0.5,
                    size: 6 + Math.random() * 12,
                    duration: 3 + Math.random() * 2
                });
            }
            return wave;
        };

        setConfetti(createWave('w1'));
        setTimeout(() => setConfetti(prev => [...prev, ...createWave('w2')]), 2000);
        setTimeout(() => setConfetti(prev => [...prev, ...createWave('w3')]), 4000);
        setTimeout(() => setConfetti(prev => [...prev, ...createWave('w4')]), 6000);

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
                @keyframes celebrationPulseInsane {
                    0%, 100% { box-shadow: 0 0 80px ${INSANE_COLOR}aa, 0 0 150px ${COLORS.gold}88, 0 0 220px #FFF5B066; transform: scale(1); }
                    50% { box-shadow: 0 0 120px ${INSANE_COLOR}cc, 0 0 200px ${COLORS.gold}aa, 0 0 300px #FFF5B088; transform: scale(1.03); }
                }
                @keyframes insaneItemFloat {
                    0%, 100% { transform: translateY(0) rotate(-10deg) scale(1); }
                    25% { transform: translateY(-20px) rotate(10deg) scale(1.15); }
                    50% { transform: translateY(-8px) rotate(-6deg) scale(1.08); }
                    75% { transform: translateY(-25px) rotate(8deg) scale(1.12); }
                }
                @keyframes textGlowInsane {
                    0%, 100% { text-shadow: 0 0 40px ${INSANE_COLOR}cc, 0 0 80px ${COLORS.gold}88, 0 0 120px #FFF5B066; transform: scale(1); }
                    50% { text-shadow: 0 0 60px ${INSANE_COLOR}ff, 0 0 100px ${COLORS.gold}aa, 0 0 150px #FFF5B088; transform: scale(1.08); }
                }
                @keyframes borderRotateInsane {
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
                @keyframes backgroundPulseInsane {
                    0%, 100% { background: radial-gradient(ellipse at center, ${INSANE_COLOR}22 0%, ${COLORS.gold}15 30%, transparent 70%); }
                    33% { background: radial-gradient(ellipse at center, ${COLORS.gold}22 0%, #FFF5B015 30%, transparent 70%); }
                    66% { background: radial-gradient(ellipse at center, #FFF5B022 0%, ${INSANE_COLOR}15 30%, transparent 70%); }
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

            {pulseBackground && (
                <div style={{ position: 'fixed', inset: 0, animation: 'backgroundPulseInsane 1.5s ease-in-out infinite', pointerEvents: 'none', zIndex: 9996 }} />
            )}

            {showFlash && (
                <div style={{ position: 'fixed', inset: 0, background: `linear-gradient(135deg, ${INSANE_COLOR}aa, ${COLORS.gold}aa, #FFF5B0aa)`, animation: 'screenFlash 0.12s ease-out forwards', pointerEvents: 'none', zIndex: 9998 }} />
            )}

            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9997, overflow: 'hidden' }}>
                {confetti.map(p => <ConfettiParticle key={p.id} color={p.color} left={p.left} delay={p.delay} size={p.size} duration={p.duration} />)}
            </div>

            {celebration && (
                <div style={{ position: 'fixed', top: '40px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, animation: `celebrationSlideIn 1s cubic-bezier(0.34, 1.56, 0.64, 1)${shakeScreen ? ', screenShake 0.6s ease-out' : ''}` }}>
                    <div style={{ position: 'absolute', top: '-35px', left: '50%', transform: 'translateX(-50%)', animation: 'crownBounce 1s ease-in-out infinite' }}>
                        <Crown size={50} color={COLORS.gold} fill={COLORS.gold} style={{ filter: `drop-shadow(0 0 15px ${COLORS.gold})` }} />
                    </div>

                    <div style={{ padding: '5px', borderRadius: '28px', background: `linear-gradient(90deg, ${INSANE_COLOR}, ${COLORS.gold}, #FFF5B0, ${INSANE_COLOR}, ${COLORS.gold})`, backgroundSize: '400% 100%', animation: 'borderRotateInsane 1.5s linear infinite, celebrationPulseInsane 0.8s ease-in-out infinite' }}>
                        <div style={{ background: `linear-gradient(135deg, ${COLORS.bg} 0%, ${COLORS.bgLight} 50%, ${COLORS.bg} 100%)`, borderRadius: '24px', padding: '32px 48px', display: 'flex', alignItems: 'center', gap: '28px', minWidth: '550px', position: 'relative', overflow: 'hidden' }}>
                            {[...Array(12)].map((_, i) => (
                                i % 2 === 0 ? (
                                    <Star key={i} size={10 + Math.random() * 12} color={[INSANE_COLOR, '#FFF5B0', COLORS.gold][i % 3]} fill={[INSANE_COLOR, '#FFF5B0', COLORS.gold][i % 3]} style={{ position: 'absolute', left: `${5 + Math.random() * 90}%`, top: `${5 + Math.random() * 90}%`, opacity: 0.4, animation: `sparkle ${0.8 + Math.random() * 0.8}s ease-in-out infinite`, animationDelay: `${Math.random() * 2}s` }} />
                                ) : (
                                    <Crown key={i} size={10 + Math.random() * 12} color={[INSANE_COLOR, '#FFF5B0', COLORS.gold][i % 3]} style={{ position: 'absolute', left: `${5 + Math.random() * 90}%`, top: `${5 + Math.random() * 90}%`, opacity: 0.3, animation: `sparkle ${0.8 + Math.random() * 0.8}s ease-in-out infinite`, animationDelay: `${Math.random() * 2}s` }} />
                                )
                            ))}

                            <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${INSANE_COLOR}55, #FFF5B055, ${INSANE_COLOR}55)`, borderRadius: '20px', border: `4px solid ${INSANE_COLOR}aa`, animation: 'insaneItemFloat 1.5s ease-in-out infinite', boxShadow: `0 0 40px ${INSANE_COLOR}88, 0 0 80px ${INSANE_COLOR}66, inset 0 0 30px #FFF5B033` }}>
                                <img src={getItemImageUrl({ texture: celebration.itemTexture, type: 'insane' })} alt={celebration.itemName} style={{ width: '80px', height: '80px', objectFit: 'contain', filter: 'drop-shadow(0 0 15px rgba(255,255,255,0.7))' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                <Sparkles size={28} color={INSANE_COLOR} style={{ position: 'absolute', top: '-14px', right: '-14px', animation: 'bounceIn 0.6s ease-out, sparkle 0.8s ease-in-out infinite', filter: `drop-shadow(0 0 8px ${INSANE_COLOR})` }} />
                                <Crown size={24} color={INSANE_COLOR} style={{ position: 'absolute', bottom: '-10px', left: '-10px', animation: 'bounceIn 0.6s ease-out 0.2s, sparkle 1s ease-in-out infinite', filter: `drop-shadow(0 0 8px ${INSANE_COLOR})` }} />
                            </div>

                            <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                                <div style={{ fontSize: '18px', color: INSANE_COLOR, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '4px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '12px', animation: 'textGlowInsane 0.8s ease-in-out infinite' }}>
                                    <Crown size={20} />
                                    <span>INSANE PULL!</span>
                                    <Crown size={20} />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                                    <img src={getDiscordAvatarUrl(celebration.discordId, celebration.discordAvatar)} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', border: `3px solid ${INSANE_COLOR}`, boxShadow: `0 0 20px ${INSANE_COLOR}88` }} onError={(e) => { e.target.onerror = null; e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; }} />
                                    <span style={{ fontSize: '24px', fontWeight: '700', color: COLORS.text }}>{celebration.username}</span>
                                    <span style={{ fontSize: '20px', color: COLORS.textMuted }}>found</span>
                                </div>

                                <div style={{ fontSize: '32px', fontWeight: '900', background: `linear-gradient(135deg, ${INSANE_COLOR}, ${COLORS.gold}, #FFF5B0, ${INSANE_COLOR})`, backgroundSize: '300% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'borderRotateInsane 2s linear infinite, textGlowInsane 0.8s ease-in-out infinite', letterSpacing: '2px' }}>
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