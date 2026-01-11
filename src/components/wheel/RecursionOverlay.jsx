// ============================================
// Recursion Banner Component - ENHANCED
// ============================================
// Displays a top banner when RECURSION event is active
// Features: Matrix code rain, glitch effects, progress bar
// Shows for entire event duration for all users

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { COLORS, WHEEL_TEXTURE_URL } from '../../config/constants.js';
import { getDiscordAvatarUrl } from '../../utils/helpers.js';
import { useActivity } from '../../context/ActivityContext.jsx';
import { useSound } from '../../context/SoundContext.jsx';
import { Zap, Sparkles, X, Terminal, Cpu } from 'lucide-react';

// Matrix characters for code rain
const MATRIX_CHARS = 'ァアィイゥウェエォオカガキギクグケゲコゴサザシジスズセゼソゾタダチヂッツヅテデトドナニヌネノハバパヒビピフブプヘベペホボポマミムメモャヤュユョヨラリルレロワヲンヴ0123456789ABCDEF';

// Matrix Code Rain Column Component
function MatrixColumn({ index, height, speed, hasSpins }) {
    const chars = useMemo(() => {
        const length = Math.floor(Math.random() * 15) + 8;
        return Array.from({ length }, () =>
            MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
        );
    }, []);

    const delay = useMemo(() => Math.random() * 5, []);
    const opacity = hasSpins ? (0.3 + Math.random() * 0.4) : 0.15;

    return (
        <div style={{
            position: 'absolute',
            left: `${index * 20}px`,
            top: '-100%',
            display: 'flex',
            flexDirection: 'column',
            animation: `matrixFall ${speed}s linear ${delay}s infinite`,
            opacity,
            pointerEvents: 'none',
        }}>
            {chars.map((char, i) => (
                <span key={i} style={{
                    color: i === 0 ? '#fff' : COLORS.recursion,
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    textShadow: i === 0
                        ? `0 0 10px #fff, 0 0 20px ${COLORS.recursion}`
                        : `0 0 5px ${COLORS.recursion}`,
                    opacity: i === 0 ? 1 : Math.max(0.1, 1 - (i * 0.08)),
                    lineHeight: '18px',
                }}>
                    {char}
                </span>
            ))}
        </div>
    );
}

export function RecursionOverlay() {
    const { recursionStatus, updateRecursionStatus } = useActivity();
    const { playRecursionSound, startRecursionSoundtrack, stopRecursionSoundtrack } = useSound();

    const [remainingTime, setRemainingTime] = useState(0);
    const [initialTime, setInitialTime] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 600 : false);
    const hasPlayedSoundRef = useRef(false);
    const wasActiveRef = useRef(false);
    const recursionStatusRef = useRef(recursionStatus);
    const stopRecursionSoundtrackRef = useRef(stopRecursionSoundtrack);

    const timerIntervalRef = useRef(null);

    // Generate matrix columns
    const matrixColumns = useMemo(() => {
        const count = Math.ceil((typeof window !== 'undefined' ? window.innerWidth : 1200) / 20);
        return Array.from({ length: count }, (_, i) => ({
            index: i,
            speed: 3 + Math.random() * 4,
        }));
    }, []);

    // Keep refs in sync with latest values
    useEffect(() => {
        recursionStatusRef.current = recursionStatus;
    }, [recursionStatus]);

    useEffect(() => {
        stopRecursionSoundtrackRef.current = stopRecursionSoundtrack;
    }, [stopRecursionSoundtrack]);

    // Handle resize for mobile detection
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleResize = () => setIsMobile(window.innerWidth < 600);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Handle soundtrack start/stop based on active state only
    useEffect(() => {
        if (!recursionStatus) return;

        const isActive = recursionStatus.active;

        if (isActive && !wasActiveRef.current) {
            // Recursion just started
            setIsVisible(true);

            // Store initial time for progress bar
            if (recursionStatus.remainingTime) {
                setInitialTime(recursionStatus.remainingTime);
            }

            if (!hasPlayedSoundRef.current) {
                playRecursionSound();
                startRecursionSoundtrack();
                hasPlayedSoundRef.current = true;
            }
            wasActiveRef.current = true;
        } else if (!isActive && wasActiveRef.current) {
            // Recursion just ended
            setIsVisible(false);
            hasPlayedSoundRef.current = false;
            wasActiveRef.current = false;
            stopRecursionSoundtrack();
        }
    }, [recursionStatus?.active, playRecursionSound, startRecursionSoundtrack, stopRecursionSoundtrack]);

    // Cleanup soundtrack on unmount only
    useEffect(() => {
        return () => {
            stopRecursionSoundtrackRef.current?.();
        };
    }, []);

    // Separate effect for remainingTime updates
    useEffect(() => {
        if (recursionStatus?.active && recursionStatus?.remainingTime !== undefined) {
            setRemainingTime(recursionStatus.remainingTime);
            if (initialTime === 0) {
                setInitialTime(recursionStatus.remainingTime);
            }
        }
    }, [recursionStatus?.active, recursionStatus?.remainingTime, initialTime]);

    // Local countdown timer
    useEffect(() => {
        if (isVisible && recursionStatus?.active) {
            timerIntervalRef.current = setInterval(() => {
                setRemainingTime(prev => {
                    const newTime = Math.max(0, prev - 1);
                    if (newTime === 0) {
                        setIsVisible(false);
                        const currentStatus = recursionStatusRef.current;
                        updateRecursionStatus({
                            ...currentStatus,
                            active: false,
                            remainingTime: 0,
                            userSpinsRemaining: 0
                        });
                    }
                    return newTime;
                });
            }, 1000);
        }
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [isVisible, recursionStatus?.active, updateRecursionStatus]);

    // Hide completely when not visible
    if (!isVisible) return null;

    const userSpinsRemaining = recursionStatus?.userSpinsRemaining ?? 0;
    const triggeredBy = recursionStatus?.triggeredBy;
    const hasSpins = userSpinsRemaining > 0;
    const isLowTime = remainingTime <= 30;
    const isCriticalTime = remainingTime <= 10;

    // Calculate progress
    const progressPercent = initialTime > 0 ? (remainingTime / initialTime) * 100 : 100;

    // Color scheme based on state
    const activeColor = hasSpins ? COLORS.recursion : '#666666';
    const activeDark = hasSpins ? COLORS.recursionDark : '#1a1a1a';
    const glowColor = hasSpins ? COLORS.recursion : '#444444';
    const urgencyColor = isCriticalTime ? '#ff4444' : isLowTime ? '#ffaa00' : activeColor;

    return (
        <>
            {/* Enhanced CSS Animations */}
            <style>{`
                @keyframes matrixFall {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(calc(100vh + 100%)); }
                }
                
                @keyframes systemBreach {
                    0% { 
                        clip-path: inset(0 100% 0 0);
                        opacity: 0;
                    }
                    20% {
                        clip-path: inset(0 80% 0 0);
                        opacity: 1;
                    }
                    40% {
                        clip-path: inset(0 60% 0 0);
                    }
                    60% {
                        clip-path: inset(0 40% 0 0);
                    }
                    80% {
                        clip-path: inset(0 20% 0 0);
                    }
                    100% {
                        clip-path: inset(0 0 0 0);
                    }
                }
                
                @keyframes glitchReveal {
                    0% { transform: translateX(-100%) skewX(-20deg); opacity: 0; }
                    30% { transform: translateX(10%) skewX(10deg); opacity: 1; }
                    50% { transform: translateX(-5%) skewX(-5deg); }
                    70% { transform: translateX(2%) skewX(2deg); }
                    100% { transform: translateX(0) skewX(0deg); }
                }
                
                @keyframes bannerGlitch {
                    0%, 85% { 
                        clip-path: inset(0 0 0 0);
                        transform: translate(0) skewX(0deg);
                    }
                    86% { 
                        clip-path: inset(20% 0 40% 0);
                        transform: translate(-8px, 0) skewX(-2deg);
                    }
                    88% { 
                        clip-path: inset(60% 0 10% 0);
                        transform: translate(8px, 0) skewX(2deg);
                    }
                    90% { 
                        clip-path: inset(5% 0 80% 0);
                        transform: translate(-5px, 0) skewX(-1deg);
                    }
                    92% { 
                        clip-path: inset(70% 0 15% 0);
                        transform: translate(5px, 0) skewX(1deg);
                    }
                    94% { 
                        clip-path: inset(0 0 0 0);
                        transform: translate(0) skewX(0deg);
                    }
                }
                
                @keyframes textGlitch {
                    0%, 80% { 
                        text-shadow: 0 0 15px ${activeColor}, 0 0 30px ${activeColor}88;
                        transform: translate(0) skewX(0deg);
                    }
                    81% { 
                        text-shadow: -5px 0 #ff0000, 5px 0 #00ffff, 0 0 15px ${activeColor};
                        transform: translate(4px, -2px) skewX(5deg);
                    }
                    82% { 
                        text-shadow: 5px 0 #ff0000, -5px 0 #00ffff, 0 0 15px ${activeColor};
                        transform: translate(-4px, 2px) skewX(-5deg);
                    }
                    83% { 
                        text-shadow: -3px 0 #ff0000, 3px 0 #00ffff, 0 0 15px ${activeColor};
                        transform: translate(2px, -1px) skewX(2deg);
                    }
                    84% { 
                        text-shadow: 0 0 15px ${activeColor}, 0 0 30px ${activeColor}88;
                        transform: translate(0) skewX(0deg);
                    }
                }
                
                @keyframes dataStream {
                    0% { background-position: 0% 0%; }
                    100% { background-position: 200% 0%; }
                }
                
                @keyframes progressPulse {
                    0%, 100% { opacity: 1; box-shadow: 0 0 10px ${activeColor}; }
                    50% { opacity: 0.7; box-shadow: 0 0 20px ${activeColor}, 0 0 30px ${activeColor}; }
                }
                
                @keyframes criticalPulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(1.02); }
                }
                
                @keyframes scanline {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(400%); }
                }
                
                @keyframes flicker {
                    0%, 100% { opacity: 1; }
                    92% { opacity: 1; }
                    93% { opacity: 0.6; }
                    94% { opacity: 1; }
                    95% { opacity: 0.8; }
                    96% { opacity: 1; }
                    97% { opacity: 0.7; }
                    98% { opacity: 1; }
                }
                
                @keyframes rgbSplit {
                    0%, 85% { text-shadow: 0 0 15px ${activeColor}; }
                    86% { text-shadow: -3px -1px 0 #ff0000, 3px 1px 0 #00ffff, 0 0 15px ${activeColor}; }
                    88% { text-shadow: 3px 1px 0 #ff0000, -3px -1px 0 #00ffff, 0 0 15px ${activeColor}; }
                    90% { text-shadow: 0 0 15px ${activeColor}; }
                }
                
                @keyframes borderGlitch {
                    0%, 90% { box-shadow: 0 4px 30px ${glowColor}44, inset 0 0 60px ${glowColor}11; }
                    91% { box-shadow: -5px 4px 30px #ff000044, 5px 4px 30px #00ffff44, inset 0 0 60px ${glowColor}22; }
                    93% { box-shadow: 5px 4px 30px #ff000044, -5px 4px 30px #00ffff44, inset 0 0 60px ${glowColor}22; }
                    95% { box-shadow: 0 4px 30px ${glowColor}44, inset 0 0 60px ${glowColor}11; }
                }
                
                @keyframes iconPulse {
                    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px ${glowColor}); }
                    50% { transform: scale(1.15); filter: drop-shadow(0 0 10px ${glowColor}) drop-shadow(0 0 20px ${glowColor}); }
                }
                
                @keyframes wheelSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @keyframes hexFloat {
                    0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
                    50% { transform: translateY(-10px) rotate(180deg); opacity: 0.6; }
                }
            `}</style>

            {/* Matrix Code Rain Background - Full Screen */}
            {hasSpins && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                    zIndex: 9997,
                    opacity: 0.6,
                }}>
                    {matrixColumns.map((col) => (
                        <MatrixColumn
                            key={col.index}
                            index={col.index}
                            speed={col.speed}
                            hasSpins={hasSpins}
                        />
                    ))}
                </div>
            )}

            {/* CRT Scanline Overlay */}
            {hasSpins && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.02) 2px, rgba(0,255,0,0.02) 4px)',
                    pointerEvents: 'none',
                    zIndex: 9998,
                    opacity: isVisible ? 1 : 0,
                    transition: 'opacity 0.5s ease-out',
                }} />
            )}

            {/* Edge Glow Effect */}
            {hasSpins && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    boxShadow: `inset 0 0 100px ${COLORS.recursion}22, inset 0 0 200px ${COLORS.recursion}11`,
                    pointerEvents: 'none',
                    zIndex: 9998,
                    opacity: isVisible ? 1 : 0,
                    transition: 'opacity 0.5s ease-out',
                }} />
            )}

            {/* Top Banner */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
                transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>
                {/* Progress Bar - Top Edge */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: `${activeDark}`,
                    zIndex: 10,
                }}>
                    <div style={{
                        height: '100%',
                        width: `${progressPercent}%`,
                        background: isCriticalTime
                            ? `linear-gradient(90deg, #ff4444, #ff6666)`
                            : isLowTime
                                ? `linear-gradient(90deg, #ffaa00, ${COLORS.recursion})`
                                : `linear-gradient(90deg, ${COLORS.recursion}, ${COLORS.recursion}cc)`,
                        boxShadow: `0 0 10px ${urgencyColor}, 0 0 20px ${urgencyColor}66`,
                        transition: 'width 1s linear, background 0.5s ease',
                        animation: isCriticalTime ? 'progressPulse 0.5s infinite' : isLowTime ? 'progressPulse 1s infinite' : 'none',
                    }} />
                </div>

                {/* Main Banner Content */}
                <div style={{
                    background: `linear-gradient(180deg, ${activeDark} 0%, rgba(0,${hasSpins ? '20' : '10'},0,0.98) 50%, ${activeDark} 100%)`,
                    padding: isMobile ? '12px 12px 14px 12px' : '18px 32px 20px 32px',
                    borderBottom: `2px solid ${activeColor}`,
                    overflow: 'hidden',
                    animation: hasSpins ? 'flicker 2s infinite, borderGlitch 3s infinite' : 'none',
                    position: 'relative',
                }}>
                    {/* Data Stream Background */}
                    {hasSpins && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            backgroundImage: `linear-gradient(90deg, transparent 0%, ${COLORS.recursion}08 25%, transparent 50%, ${COLORS.recursion}08 75%, transparent 100%)`,
                            backgroundSize: '200% 100%',
                            animation: 'dataStream 3s linear infinite',
                            pointerEvents: 'none',
                        }} />
                    )}

                    {/* Animated scanline */}
                    {hasSpins && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: isMobile ? '6px' : '10px',
                            background: `linear-gradient(180deg, transparent, ${COLORS.recursion}88, ${COLORS.recursion}33, transparent)`,
                            animation: 'scanline 1.2s linear infinite',
                            pointerEvents: 'none',
                        }} />
                    )}

                    {/* Glitch overlay */}
                    {hasSpins && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: `repeating-linear-gradient(0deg, transparent 0px, transparent 2px, ${COLORS.recursion}06 2px, ${COLORS.recursion}06 4px)`,
                            pointerEvents: 'none',
                        }} />
                    )}

                    {/* Bottom glow line */}
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: activeColor,
                        boxShadow: `0 0 15px ${glowColor}, 0 0 30px ${glowColor}, 0 0 45px ${glowColor}`,
                        transition: 'background 0.5s ease-out',
                    }} />

                    {/* Content */}
                    <div style={{
                        position: 'relative',
                        zIndex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: isMobile ? '8px' : '20px',
                        animation: hasSpins ? 'bannerGlitch 5s infinite' : 'none',
                        flexWrap: 'nowrap',
                    }}>
                        {/* Terminal Icon - Desktop only */}
                        {!isMobile && (
                            <Terminal
                                size={28}
                                color={activeColor}
                                style={{
                                    filter: `drop-shadow(0 0 10px ${glowColor})`,
                                    animation: hasSpins ? 'iconPulse 1.5s ease-in-out infinite' : 'none',
                                }}
                            />
                        )}

                        {/* RECURSION text with glitch effect */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <span style={{
                                color: activeColor,
                                fontSize: isMobile ? '18px' : '28px',
                                fontWeight: '900',
                                fontFamily: 'monospace',
                                letterSpacing: isMobile ? '3px' : '6px',
                                animation: hasSpins ? 'textGlitch 2.5s infinite' : 'none',
                                textShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}88`,
                                transition: 'color 0.5s ease-out',
                            }}>
                                {isMobile ? 'RECURSION' : '[ RECURSION ]'}
                            </span>
                        </div>

                        {/* Divider */}
                        {!isMobile && (
                            <div style={{
                                width: '2px',
                                height: '32px',
                                background: `linear-gradient(180deg, transparent, ${activeColor}, transparent)`,
                                boxShadow: `0 0 8px ${glowColor}`,
                            }} />
                        )}

                        {/* Triggered by user */}
                        {triggeredBy && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: isMobile ? '6px' : '10px',
                                padding: isMobile ? '4px 10px' : '8px 16px',
                                background: `linear-gradient(135deg, ${activeColor}22, ${activeColor}11)`,
                                borderRadius: '8px',
                                border: `1px solid ${activeColor}55`,
                                position: 'relative',
                                overflow: 'hidden',
                            }}>
                                {/* Shimmer effect */}
                                {hasSpins && (
                                    <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                                        backgroundSize: '200% 100%',
                                        animation: 'dataStream 2s linear infinite',
                                    }} />
                                )}
                                {!isMobile && (
                                    <span style={{
                                        color: `${activeColor}aa`,
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        transition: 'color 0.5s ease-out',
                                    }}>
                                        Triggered by
                                    </span>
                                )}
                                <img
                                    src={getDiscordAvatarUrl(triggeredBy.discordId, triggeredBy.discordAvatar)}
                                    alt=""
                                    style={{
                                        width: isMobile ? '22px' : '28px',
                                        height: isMobile ? '22px' : '28px',
                                        borderRadius: '50%',
                                        border: `2px solid ${activeColor}88`,
                                        filter: hasSpins ? 'none' : 'grayscale(100%)',
                                    }}
                                />
                                <span style={{
                                    color: activeColor,
                                    fontWeight: '700',
                                    fontSize: isMobile ? '12px' : '15px',
                                    fontFamily: 'monospace',
                                    maxWidth: isMobile ? '60px' : 'none',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {triggeredBy.username}
                                </span>
                            </div>
                        )}

                        {/* Divider */}
                        {!isMobile && (
                            <div style={{
                                width: '2px',
                                height: '32px',
                                background: `linear-gradient(180deg, transparent, ${activeColor}, transparent)`,
                                boxShadow: `0 0 8px ${glowColor}`,
                            }} />
                        )}

                        {/* Lucky Spins Counter */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: isMobile ? '6px' : '12px',
                            padding: isMobile ? '6px 10px' : '8px 18px',
                            background: hasSpins
                                ? `linear-gradient(135deg, ${activeColor}33, ${activeColor}22)`
                                : `${activeColor}22`,
                            borderRadius: '8px',
                            border: `2px solid ${activeColor}88`,
                            animation: hasSpins && userSpinsRemaining <= 3 ? 'criticalPulse 0.5s infinite' : 'none',
                        }}>
                            {hasSpins ? (
                                <Sparkles
                                    size={isMobile ? 16 : 22}
                                    color={activeColor}
                                    style={{
                                        filter: `drop-shadow(0 0 8px ${glowColor})`,
                                        animation: 'iconPulse 1s ease-in-out infinite',
                                    }}
                                />
                            ) : (
                                <X size={isMobile ? 16 : 22} color={activeColor} />
                            )}
                            <span style={{
                                color: activeColor,
                                fontSize: isMobile ? '18px' : '24px',
                                fontWeight: '900',
                                fontFamily: 'monospace',
                                animation: hasSpins ? 'rgbSplit 3s infinite' : 'none',
                                minWidth: '24px',
                                textAlign: 'center',
                            }}>
                                {userSpinsRemaining}
                            </span>
                            {!isMobile && (
                                <span style={{
                                    color: activeColor,
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    opacity: 0.9,
                                }}>
                                    Lucky {userSpinsRemaining === 1 ? 'Spin' : 'Spins'}
                                </span>
                            )}
                        </div>

                        {/* Timer */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: isMobile ? '6px' : '10px',
                            padding: isMobile ? '6px 10px' : '8px 16px',
                            background: isCriticalTime
                                ? 'rgba(255,68,68,0.2)'
                                : isLowTime
                                    ? 'rgba(255,170,0,0.15)'
                                    : `${activeColor}22`,
                            borderRadius: '8px',
                            border: `1px solid ${urgencyColor}66`,
                            animation: isCriticalTime ? 'criticalPulse 0.3s infinite' : 'none',
                        }}>
                            <Cpu size={isMobile ? 14 : 18} color={urgencyColor} style={{ opacity: 0.8 }} />
                            <span style={{
                                color: urgencyColor,
                                fontSize: isMobile ? '16px' : '22px',
                                fontWeight: '900',
                                fontFamily: 'monospace',
                                textShadow: isCriticalTime ? `0 0 10px ${urgencyColor}` : 'none',
                            }}>
                                {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
                            </span>
                        </div>

                        {/* Status - Desktop only */}
                        {!isMobile && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 16px',
                                background: `${activeColor}15`,
                                borderRadius: '8px',
                                border: `1px solid ${activeColor}44`,
                            }}>
                                <Zap
                                    size={20}
                                    color={activeColor}
                                    style={{
                                        filter: hasSpins ? `drop-shadow(0 0 8px ${glowColor})` : 'none',
                                        animation: hasSpins ? 'iconPulse 1.5s ease-in-out infinite' : 'none',
                                    }}
                                />
                                <span style={{
                                    color: activeColor,
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    textTransform: 'uppercase',
                                    letterSpacing: '2px',
                                    fontFamily: 'monospace',
                                }}>
                                    {hasSpins ? 'SYSTEM ACTIVE' : 'DEPLETED'}
                                </span>
                                <Zap
                                    size={20}
                                    color={activeColor}
                                    style={{
                                        filter: hasSpins ? `drop-shadow(0 0 8px ${glowColor})` : 'none',
                                        animation: hasSpins ? 'iconPulse 1.5s ease-in-out infinite 0.5s' : 'none',
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}