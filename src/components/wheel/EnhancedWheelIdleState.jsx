import React, { useState, useMemo } from 'react';
import { Sparkles, Info, Zap, Crown, Star, Diamond } from 'lucide-react';
import { COLORS, WHEEL_TEXTURE_URL } from '../../config/constants.js';

// ============================================
// ORBITAL RING COMPONENT
// ============================================
const OrbitalRing = ({ size, duration, reverse = false, delay = 0, color, opacity = 0.3 }) => (
    <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: size,
        height: size,
        border: `1px solid ${color}`,
        borderRadius: '50%',
        opacity,
        animation: `${reverse ? 'orbitalSpinReverse' : 'orbitalSpin'} ${duration}s linear infinite`,
        animationDelay: `${delay}s`,
        pointerEvents: 'none',
    }} />
);

// ============================================
// FLOATING PARTICLE
// ============================================
const FloatingParticle = ({ index, color, isRecursion }) => {
    const style = useMemo(() => {
        const angle = (index / 8) * Math.PI * 2;
        const radius = 80 + Math.random() * 40;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const size = 2 + Math.random() * 4;
        const duration = 3 + Math.random() * 2;
        const delay = Math.random() * 3;

        return {
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: size,
            height: size,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 ${size * 2}px ${color}`,
            transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
            animation: `cosmicFloat ${duration}s ease-in-out infinite`,
            animationDelay: `${delay}s`,
            pointerEvents: 'none',
        };
    }, [index, color]);

    return <div style={style} />;
};

// ============================================
// RARITY INDICATOR WITH ICON
// ============================================
const RarityIndicator = ({ color, label, icon: Icon, delay }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        animation: `fadeIn 0.5s ease-out ${delay}s both`,
    }}>
        <Icon
            size={12}
            color={color}
            style={{
                filter: `drop-shadow(0 0 4px ${color})`,
            }}
        />
        <span style={{
            fontSize: '10px',
            color: color,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: '500',
        }}>{label}</span>
    </div>
);

// ============================================
// KEYBOARD HINT
// ============================================
const KeyboardHint = () => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginTop: '8px',
        opacity: 0.6,
    }}>
        <div style={{
            padding: '4px 10px',
            background: COLORS.bgLighter,
            borderRadius: '6px',
            border: `1px solid ${COLORS.border}`,
            fontSize: '11px',
            fontWeight: '600',
            fontFamily: 'monospace',
            color: COLORS.textMuted,
            animation: 'keyGlow 2s ease-in-out infinite',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        }}>
            SPACE
        </div>
        <span style={{ fontSize: '11px', color: COLORS.textMuted }}>to spin</span>
    </div>
);

// ============================================
// ENHANCED WHEEL IDLE STATE
// ============================================
export function EnhancedWheelIdleState({
                                           user,
                                           allItems,
                                           totalItemCount,
                                           recursionActive,
                                           recursionSpinsRemaining,
                                           error,
                                           onSpin,
                                           onShowOddsInfo,
                                           isMobile,
                                       }) {
    const [isHovered, setIsHovered] = useState(false);
    const isDisabled = !user || allItems.length === 0;
    const showRecursionEffects = recursionActive && recursionSpinsRemaining > 0;

    // Particle colors based on state
    const particleColor = showRecursionEffects ? COLORS.recursion : COLORS.gold;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: isMobile ? '12px' : '20px',
            position: 'relative',
            minHeight: isMobile ? '320px' : '440px',
            justifyContent: 'center',
            padding: isMobile ? '8px 12px' : '16px 20px',
        }}>
            {/* Wheel Container with Effects */}
            <div style={{
                position: 'relative',
                width: isMobile ? '180px' : '240px',
                height: isMobile ? '180px' : '240px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                {/* Background Aura */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: showRecursionEffects ? (isMobile ? '200px' : '280px') : (isMobile ? '190px' : '260px'),
                    height: showRecursionEffects ? (isMobile ? '200px' : '280px') : (isMobile ? '190px' : '260px'),
                    background: showRecursionEffects
                        ? `radial-gradient(circle, ${COLORS.recursion}40 0%, ${COLORS.recursion}15 40%, transparent 70%)`
                        : `radial-gradient(circle, ${COLORS.gold}25 0%, ${COLORS.orange}10 40%, transparent 70%)`,
                    borderRadius: '50%',
                    animation: 'auraPulse 3s ease-in-out infinite',
                    pointerEvents: 'none',
                    filter: 'blur(20px)',
                }} />

                {/* Secondary Aura Ring */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: isMobile ? '150px' : '200px',
                    height: isMobile ? '150px' : '200px',
                    background: showRecursionEffects
                        ? `radial-gradient(circle, transparent 60%, ${COLORS.recursion}15 80%, transparent 100%)`
                        : `radial-gradient(circle, transparent 60%, ${COLORS.gold}10 80%, transparent 100%)`,
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    animation: 'auraPulse 2s ease-in-out infinite reverse',
                    pointerEvents: 'none',
                }} />

                {/* Orbital Rings */}
                {!isMobile && (
                    <>
                        <OrbitalRing
                            size="220px"
                            duration={12}
                            color={showRecursionEffects ? COLORS.recursion : COLORS.gold}
                            opacity={0.2}
                        />
                        <OrbitalRing
                            size="260px"
                            duration={18}
                            reverse
                            delay={2}
                            color={showRecursionEffects ? COLORS.recursion : COLORS.purple}
                            opacity={0.15}
                        />
                        <OrbitalRing
                            size="300px"
                            duration={24}
                            delay={4}
                            color={showRecursionEffects ? COLORS.recursion : COLORS.aqua}
                            opacity={0.1}
                        />
                    </>
                )}

                {/* Floating Particles */}
                {!isMobile && Array.from({ length: 8 }).map((_, i) => (
                    <FloatingParticle
                        key={i}
                        index={i}
                        color={particleColor}
                        isRecursion={showRecursionEffects}
                    />
                ))}

                {/* The Wheel Button */}
                <button
                    onClick={onSpin}
                    disabled={isDisabled}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        position: 'relative',
                        zIndex: 2,
                        opacity: isDisabled ? 0.5 : 1,
                        transform: isHovered && !isDisabled ? 'scale(1.08)' : 'scale(1)',
                        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        filter: showRecursionEffects
                            ? `drop-shadow(0 0 25px ${COLORS.recursion}) drop-shadow(0 0 50px ${COLORS.recursion}66)`
                            : isHovered
                                ? `drop-shadow(0 0 30px ${COLORS.gold}88) drop-shadow(0 0 60px ${COLORS.gold}44)`
                                : `drop-shadow(0 0 20px ${COLORS.gold}66) drop-shadow(0 0 40px ${COLORS.gold}33)`,
                        animation: showRecursionEffects
                            ? 'matrixGlitch 3s ease-in-out infinite'
                            : isDisabled
                                ? 'none'
                                : 'wheelBreathing 4s ease-in-out infinite',
                    }}
                >
                    <img
                        src={WHEEL_TEXTURE_URL}
                        alt="Spin the wheel"
                        style={{
                            width: isMobile ? '140px' : '180px',
                            height: 'auto',
                            imageRendering: 'pixelated',
                        }}
                    />

                    {/* Hover Glow Ring */}
                    {isHovered && !isDisabled && (
                        <div style={{
                            position: 'absolute',
                            inset: '-20px',
                            borderRadius: '50%',
                            border: `2px solid ${showRecursionEffects ? COLORS.recursion : COLORS.gold}44`,
                            animation: 'spinReady 1.5s ease-out infinite',
                            pointerEvents: 'none',
                        }} />
                    )}
                </button>
            </div>

            {/* Text Content */}
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                {/* Main CTA Text */}
                <div style={{
                    color: showRecursionEffects ? COLORS.recursion : COLORS.gold,
                    fontSize: isMobile ? '15px' : '18px',
                    fontWeight: '700',
                    marginBottom: isMobile ? '4px' : '8px',
                    textShadow: showRecursionEffects
                        ? `0 0 20px ${COLORS.recursion}`
                        : `0 0 20px ${COLORS.gold}44`,
                    letterSpacing: showRecursionEffects ? '2px' : '0.5px',
                    animation: showRecursionEffects ? 'recursionTextGlitch 2s ease-in-out infinite' : 'none',
                }}>
                    {!user ? 'Login to spin!'
                        : allItems.length === 0 ? 'Loading items...'
                            : showRecursionEffects
                                ? `⚡ ${recursionSpinsRemaining} LUCKY SPIN${recursionSpinsRemaining !== 1 ? 'S' : ''}! ⚡`
                                : isMobile ? 'Tap to spin!' : 'Click to spin!'}
                </div>

                {/* Subtitle */}
                <div style={{
                    color: COLORS.textMuted,
                    fontSize: isMobile ? '11px' : '13px',
                    marginBottom: isMobile ? '8px' : '12px',
                }}>
                    {showRecursionEffects ? (
                        <span style={{
                            color: COLORS.recursion,
                            fontWeight: '500',
                        }}>
                            Equal chance for ALL items!
                        </span>
                    ) : allItems.length > 0 && (
                        <span>Win one of <strong style={{ color: COLORS.text }}>{totalItemCount}</strong> items!</span>
                    )}
                </div>

                {/* Rarity Indicators */}
                {!showRecursionEffects && allItems.length > 0 && !isMobile && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '16px',
                        marginBottom: '12px',
                    }}>
                        <RarityIndicator color={COLORS.insane} label="Insane" icon={Crown} delay={0} />
                        <RarityIndicator color={COLORS.aqua} label="Mythic" icon={Sparkles} delay={0.1} />
                        <RarityIndicator color={COLORS.purple} label="Legendary" icon={Star} delay={0.2} />
                        <RarityIndicator color={COLORS.red} label="Rare" icon={Diamond} delay={0.3} />
                    </div>
                )}

                {/* Keyboard Hint - Desktop Only */}
                {!isMobile && user && allItems.length > 0 && <KeyboardHint />}

                {/* Error Display */}
                {error && (
                    <div style={{
                        marginTop: '16px',
                        padding: '12px 20px',
                        background: `linear-gradient(135deg, ${COLORS.red}22 0%, ${COLORS.red}11 100%)`,
                        border: `1px solid ${COLORS.red}44`,
                        borderRadius: '10px',
                        color: COLORS.red,
                        fontSize: '13px',
                        fontWeight: '500',
                        animation: 'slideUp 0.3s ease-out',
                    }}>
                        âš ï¸ {error}
                    </div>
                )}

                {/* Odds Info Button */}
                <button
                    onClick={onShowOddsInfo}
                    style={{
                        marginTop: isMobile ? '8px' : '16px',
                        padding: isMobile ? '8px 16px' : '10px 20px',
                        borderRadius: '20px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${COLORS.border}`,
                        color: COLORS.textMuted,
                        fontSize: isMobile ? '11px' : '12px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        backdropFilter: 'blur(8px)',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.borderColor = COLORS.aqua;
                        e.currentTarget.style.color = COLORS.aqua;
                        e.currentTarget.style.background = `${COLORS.aqua}11`;
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.borderColor = COLORS.border;
                        e.currentTarget.style.color = COLORS.textMuted;
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <Info size={isMobile ? 12 : 14} />
                    How odds work
                </button>
            </div>
        </div>
    );
}