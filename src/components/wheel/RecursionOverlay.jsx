// ============================================
// Recursion Banner Component
// ============================================
// Displays a top banner when RECURSION event is active
// Shows for entire event duration for all users
// Changes state when user runs out of lucky spins

import React, { useState, useEffect, useRef } from 'react';
import { COLORS, WHEEL_TEXTURE_URL } from '../../config/constants.js';
import { getDiscordAvatarUrl } from '../../utils/helpers.js';
import { useActivity } from '../../context/ActivityContext.jsx';
import { useSound } from '../../context/SoundContext.jsx';
import { Zap, Sparkles, X } from 'lucide-react';

export function RecursionOverlay({ currentUserId }) {
    const { recursionStatus, updateRecursionStatus } = useActivity();
    const { playRecursionSound, startRecursionSoundtrack, stopRecursionSoundtrack } = useSound();

    const [remainingTime, setRemainingTime] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 600 : false);
    const hasPlayedSoundRef = useRef(false);
    const wasActiveRef = useRef(false);
    const recursionStatusRef = useRef(recursionStatus);

    const timerIntervalRef = useRef(null);

    // Keep ref in sync with latest recursionStatus
    useEffect(() => {
        recursionStatusRef.current = recursionStatus;
    }, [recursionStatus]);

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

            if (!hasPlayedSoundRef.current) {
                playRecursionSound(); // Play the SFX
                startRecursionSoundtrack(); // Start the looping soundtrack
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
        // No cleanup here - unmount cleanup handled by separate effect
    }, [recursionStatus?.active, playRecursionSound, startRecursionSoundtrack, stopRecursionSoundtrack]);

    // Cleanup soundtrack on unmount only
    useEffect(() => {
        return () => {
            stopRecursionSoundtrack();
        };
    }, [stopRecursionSoundtrack]);

    // Separate effect for remainingTime updates (lightweight, no cleanup side effects)
    useEffect(() => {
        if (recursionStatus?.active && recursionStatus?.remainingTime !== undefined) {
            setRemainingTime(recursionStatus.remainingTime);
        }
    }, [recursionStatus?.active, recursionStatus?.remainingTime]);

    // Local countdown timer
    useEffect(() => {
        if (isVisible && recursionStatus?.active) {
            timerIntervalRef.current = setInterval(() => {
                setRemainingTime(prev => {
                    const newTime = Math.max(0, prev - 1);
                    if (newTime === 0) {
                        setIsVisible(false);
                        // Update the global recursion status so WheelSpinner knows event ended
                        // Use ref to get latest status and avoid stale closure
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

    // Hide completely when not visible (timer expired or event ended)
    if (!isVisible) return null;

    const userSpinsRemaining = recursionStatus?.userSpinsRemaining ?? 0;
    const triggeredBy = recursionStatus?.triggeredBy;
    const hasSpins = userSpinsRemaining > 0;

    // Color scheme based on whether user has spins
    const activeColor = hasSpins ? COLORS.recursion : '#666666';
    const activeDark = hasSpins ? COLORS.recursionDark : '#1a1a1a';
    const glowColor = hasSpins ? COLORS.recursion : '#444444';

    return (
        <>
            {/* Glitch/Warp CSS Animations - MORE INTENSE */}
            <style>{`
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
                    95% { 
                        text-shadow: 0 0 15px ${activeColor}, 0 0 30px ${activeColor}88;
                        transform: translate(0) skewX(0deg);
                    }
                    96% { 
                        text-shadow: 4px 0 #ff0000, -4px 0 #00ffff, 0 0 15px ${activeColor};
                        transform: translate(-3px, 1px) skewX(-3deg);
                    }
                    97% { 
                        text-shadow: -4px 0 #ff0000, 4px 0 #00ffff, 0 0 15px ${activeColor};
                        transform: translate(3px, -1px) skewX(3deg);
                    }
                    98% { 
                        text-shadow: 0 0 15px ${activeColor}, 0 0 30px ${activeColor}88;
                        transform: translate(0) skewX(0deg);
                    }
                }
                
                @keyframes hardGlitch {
                    0%, 90% {
                        opacity: 1;
                        transform: translate(0) scale(1);
                        filter: hue-rotate(0deg) saturate(1);
                    }
                    91% {
                        opacity: 0.8;
                        transform: translate(-10px, 2px) scale(1.02);
                        filter: hue-rotate(30deg) saturate(1.5);
                    }
                    92% {
                        opacity: 1;
                        transform: translate(10px, -2px) scale(0.98);
                        filter: hue-rotate(-30deg) saturate(1.5);
                    }
                    93% {
                        opacity: 0.9;
                        transform: translate(-5px, 0) scale(1.01);
                        filter: hue-rotate(15deg) saturate(1.2);
                    }
                    94% {
                        opacity: 1;
                        transform: translate(0) scale(1);
                        filter: hue-rotate(0deg) saturate(1);
                    }
                }
                
                @keyframes scanline {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(300%); }
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
                    0%, 85% {
                        text-shadow: 0 0 15px ${activeColor};
                    }
                    86% {
                        text-shadow: -3px -1px 0 #ff0000, 3px 1px 0 #00ffff, 0 0 15px ${activeColor};
                    }
                    88% {
                        text-shadow: 3px 1px 0 #ff0000, -3px -1px 0 #00ffff, 0 0 15px ${activeColor};
                    }
                    90% {
                        text-shadow: 0 0 15px ${activeColor};
                    }
                }
                
                @keyframes borderGlitch {
                    0%, 90% {
                        box-shadow: 0 4px 30px ${glowColor}44, inset 0 0 60px ${glowColor}11;
                    }
                    91% {
                        box-shadow: -5px 4px 30px #ff000044, 5px 4px 30px #00ffff44, inset 0 0 60px ${glowColor}22;
                    }
                    93% {
                        box-shadow: 5px 4px 30px #ff000044, -5px 4px 30px #00ffff44, inset 0 0 60px ${glowColor}22;
                    }
                    95% {
                        box-shadow: 0 4px 30px ${glowColor}44, inset 0 0 60px ${glowColor}11;
                    }
                }
                
                @keyframes iconPulse {
                    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px ${glowColor}); }
                    50% { transform: scale(1.15); filter: drop-shadow(0 0 10px ${glowColor}) drop-shadow(0 0 20px ${glowColor}); }
                }
                
                @keyframes wheelSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>

            {/* Subtle CRT Scanline Overlay - only when has spins */}
            {hasSpins && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px)',
                    pointerEvents: 'none',
                    zIndex: 9998,
                    opacity: isVisible ? 1 : 0,
                    transition: 'opacity 0.5s ease-out',
                }} />
            )}

            {/* Top Banner with Glitch Effects */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
                transition: 'transform 0.4s ease-out, background 0.5s ease-out, border-color 0.5s ease-out',
                background: `linear-gradient(180deg, ${activeDark} 0%, rgba(0,${hasSpins ? '20' : '10'},0,0.98) 50%, ${activeDark} 100%)`,
                padding: isMobile ? '10px 12px 12px 12px' : '16px 32px 18px 32px',
                borderBottom: `2px solid ${activeColor}`,
                overflow: 'hidden',
                animation: hasSpins ? 'flicker 2s infinite, borderGlitch 3s infinite' : 'none',
            }}>
                {/* Animated scanline moving through banner */}
                {hasSpins && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: isMobile ? '4px' : '8px',
                        background: `linear-gradient(180deg, transparent, ${COLORS.recursion}66, ${COLORS.recursion}22, transparent)`,
                        animation: 'scanline 1.5s linear infinite',
                        pointerEvents: 'none',
                    }} />
                )}

                {/* Glitch overlay layers */}
                {hasSpins && (
                    <>
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: `repeating-linear-gradient(0deg, transparent 0px, transparent 2px, ${COLORS.recursion}08 2px, ${COLORS.recursion}08 4px)`,
                            pointerEvents: 'none',
                            animation: 'hardGlitch 4s infinite',
                        }} />
                    </>
                )}

                {/* Bottom glow line */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: activeColor,
                    boxShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor}, 0 0 30px ${glowColor}`,
                    transition: 'background 0.5s ease-out, box-shadow 0.5s ease-out',
                }} />

                {/* Content */}
                <div style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isMobile ? '10px' : '20px',
                    animation: hasSpins ? 'bannerGlitch 5s infinite' : 'none',
                    flexWrap: isMobile ? 'nowrap' : 'nowrap',
                }}>
                    {/* Spinning Wheel Icon - hide on mobile */}
                    {!isMobile && (
                        <img
                            src={WHEEL_TEXTURE_URL}
                            alt="Wheel"
                            style={{
                                width: '40px',
                                height: 'auto',
                                imageRendering: 'pixelated',
                                animation: hasSpins ? 'wheelSpin 2s linear infinite' : 'none',
                                filter: `drop-shadow(0 0 12px ${glowColor}) drop-shadow(0 0 20px ${glowColor})`,
                                opacity: hasSpins ? 1 : 0.5,
                                transition: 'filter 0.5s ease-out, opacity 0.5s ease-out',
                            }}
                        />
                    )}

                    {/* RECURSION text with glitch effect */}
                    <span style={{
                        color: activeColor,
                        fontSize: isMobile ? '16px' : '26px',
                        fontWeight: '900',
                        fontFamily: 'monospace',
                        letterSpacing: isMobile ? '2px' : '4px',
                        animation: hasSpins ? 'textGlitch 2.5s infinite' : 'none',
                        textShadow: `0 0 15px ${glowColor}, 0 0 30px ${glowColor}88`,
                        transition: 'color 0.5s ease-out',
                    }}>
                        RECURSION
                    </span>

                    {/* Divider - hide on mobile */}
                    {!isMobile && (
                        <div style={{
                            width: '2px',
                            height: '28px',
                            background: activeColor,
                            boxShadow: `0 0 8px ${glowColor}`,
                            opacity: 0.8,
                            transition: 'background 0.5s ease-out',
                        }} />
                    )}

                    {/* Triggered by user - simplified on mobile */}
                    {triggeredBy && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: isMobile ? '6px' : '10px',
                            padding: isMobile ? '4px 8px' : '6px 16px',
                            background: `${activeColor}22`,
                            borderRadius: '6px',
                            border: `1px solid ${activeColor}66`,
                            transition: 'background 0.5s ease-out, border-color 0.5s ease-out',
                        }}>
                            {!isMobile && (
                                <span style={{
                                    color: `${activeColor}aa`,
                                    fontSize: '14px',
                                    transition: 'color 0.5s ease-out',
                                }}>
                                    Triggered by
                                </span>
                            )}
                            <img
                                src={getDiscordAvatarUrl(triggeredBy.discordId, triggeredBy.discordAvatar)}
                                alt=""
                                style={{
                                    width: isMobile ? '20px' : '26px',
                                    height: isMobile ? '20px' : '26px',
                                    borderRadius: '50%',
                                    border: `2px solid ${activeColor}88`,
                                    filter: hasSpins ? 'none' : 'grayscale(100%)',
                                    transition: 'border-color 0.5s ease-out, filter 0.5s ease-out',
                                }}
                            />
                            <span style={{
                                color: activeColor,
                                fontWeight: '700',
                                fontSize: isMobile ? '12px' : '16px',
                                transition: 'color 0.5s ease-out',
                                maxWidth: isMobile ? '60px' : 'none',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}>
                                {triggeredBy.username}
                            </span>
                        </div>
                    )}

                    {/* Divider - hide on mobile */}
                    {!isMobile && (
                        <div style={{
                            width: '2px',
                            height: '28px',
                            background: activeColor,
                            boxShadow: `0 0 8px ${glowColor}`,
                            opacity: 0.8,
                            transition: 'background 0.5s ease-out',
                        }} />
                    )}

                    {/* Lucky Spins remaining - CLEAR LABEL */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '6px' : '10px',
                        padding: isMobile ? '4px 8px' : '6px 16px',
                        background: hasSpins ? `${activeColor}33` : `${activeColor}22`,
                        borderRadius: '6px',
                        border: `2px solid ${activeColor}88`,
                        transition: 'background 0.5s ease-out, border-color 0.5s ease-out',
                    }}>
                        {hasSpins ? (
                            <Sparkles
                                size={isMobile ? 14 : 20}
                                color={activeColor}
                                style={{
                                    filter: `drop-shadow(0 0 6px ${glowColor})`,
                                    animation: 'iconPulse 1s ease-in-out infinite',
                                }}
                            />
                        ) : (
                            <X size={isMobile ? 14 : 20} color={activeColor} />
                        )}
                        <span style={{
                            color: activeColor,
                            fontSize: isMobile ? '14px' : '18px',
                            fontWeight: '800',
                            fontFamily: 'monospace',
                            transition: 'color 0.5s ease-out',
                            animation: hasSpins ? 'rgbSplit 3s infinite' : 'none',
                        }}>
                            {userSpinsRemaining}
                        </span>
                        {!isMobile && (
                            <span style={{
                                color: activeColor,
                                fontSize: '14px',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                transition: 'color 0.5s ease-out',
                            }}>
                                Lucky {userSpinsRemaining === 1 ? 'Spin' : 'Spins'}
                            </span>
                        )}
                    </div>

                    {/* Divider - hide on mobile */}
                    {!isMobile && (
                        <div style={{
                            width: '2px',
                            height: '28px',
                            background: activeColor,
                            boxShadow: `0 0 8px ${glowColor}`,
                            opacity: 0.8,
                            transition: 'background 0.5s ease-out',
                        }} />
                    )}

                    {/* Event Timer */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '4px' : '8px',
                        padding: isMobile ? '4px 8px' : '6px 14px',
                        background: `${activeColor}22`,
                        borderRadius: '6px',
                        border: `1px solid ${activeColor}66`,
                        transition: 'background 0.5s ease-out, border-color 0.5s ease-out',
                    }}>
                        <span style={{
                            color: activeColor,
                            fontSize: isMobile ? '12px' : '18px',
                            fontWeight: '800',
                            fontFamily: 'monospace',
                            transition: 'color 0.5s ease-out',
                        }}>
                            {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
                        </span>
                    </div>

                    {/* Status message - hide on mobile */}
                    {!isMobile && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <Zap
                                size={20}
                                color={activeColor}
                                style={{
                                    filter: hasSpins ? `drop-shadow(0 0 6px ${glowColor})` : 'none',
                                    transition: 'filter 0.5s ease-out',
                                    animation: hasSpins ? 'iconPulse 1.5s ease-in-out infinite' : 'none',
                                }}
                            />
                            <span style={{
                                color: activeColor,
                                fontSize: '16px',
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                                textShadow: hasSpins ? `0 0 10px ${glowColor}88` : 'none',
                                transition: 'color 0.5s ease-out, text-shadow 0.5s ease-out',
                            }}>
                            {hasSpins ? 'All Spins = Lucky' : 'Spins Depleted'}
                        </span>
                            <Zap
                                size={20}
                                color={activeColor}
                                style={{
                                    filter: hasSpins ? `drop-shadow(0 0 6px ${glowColor})` : 'none',
                                    transition: 'filter 0.5s ease-out',
                                    animation: hasSpins ? 'iconPulse 1.5s ease-in-out infinite' : 'none',
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}