import React, { useState, useEffect, useRef, useMemo } from 'react';
import { COLORS, ITEM_WIDTH, FINAL_INDEX } from '../../config/constants.js';

// ============================================
// SPEED LINE COMPONENT
// ============================================
const SpeedLine = ({ index, isVertical, color }) => {
    // Generate stable random values once on mount
    const stableRandom = useRef({
        width: 30 + Math.random() * 70,
        delay: Math.random() * 0.3,
        duration: 0.2 + Math.random() * 0.2,
    }).current;

    const style = useMemo(() => {
        const offset = (index / 12) * 100;
        const { width, delay, duration } = stableRandom;

        return isVertical ? {
            position: 'absolute',
            left: `${offset}%`,
            top: 0,
            width: '2px',
            height: `${width}%`,
            background: `linear-gradient(180deg, transparent, ${color}66, transparent)`,
            animation: `speedLineVertical ${duration}s linear ${delay}s infinite`,
            opacity: 0.6,
            pointerEvents: 'none',
        } : {
            position: 'absolute',
            top: `${offset}%`,
            left: 0,
            height: '2px',
            width: `${width}%`,
            background: `linear-gradient(90deg, transparent, ${color}66, transparent)`,
            animation: `speedLineHorizontal ${duration}s linear ${delay}s infinite`,
            opacity: 0.6,
            pointerEvents: 'none',
        };
    }, [index, isVertical, color, stableRandom]);

    return <div style={style} />;
};

// ============================================
// CENTER RIPPLE EFFECT
// ============================================
const CenterRipple = ({ color, delay, isVertical }) => (
    <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: isVertical ? '200%' : '4px',
        height: isVertical ? '4px' : '200%',
        background: color,
        transform: 'translate(-50%, -50%)',
        opacity: 0,
        animation: `centerRipple 1s ease-out ${delay}s infinite`,
        pointerEvents: 'none',
        zIndex: 8,
    }} />
);

// ============================================
// ENHANCED INDICATOR WITH HEARTBEAT
// ============================================
export const EnhancedIndicator = ({
                                      isMobile,
                                      isSlowingDown,
                                      isResult,
                                      color = COLORS.gold,
                                      isRecursion = false
                                  }) => {
    const pulseAnimation = isSlowingDown
        ? (isMobile ? 'indicatorHeartbeatMobile 0.5s ease-in-out infinite' : 'indicatorHeartbeat 0.5s ease-in-out infinite')
        : isResult
            ? 'indicatorLand 0.5s ease-out forwards'
            : 'none';

    if (isRecursion) {
        // Bracket style for recursion
        return (
            <>
                {/* Top/Left Bracket */}
                <div style={{
                    position: 'absolute',
                    ...(isMobile ? {
                        left: '-6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                    } : {
                        top: '-6px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                    }),
                    zIndex: 11,
                    filter: `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 16px ${color}88)`,
                    animation: pulseAnimation,
                }}>
                    <div style={{
                        ...(isMobile ? {
                            width: '10px',
                            height: '24px',
                            borderTop: `3px solid ${color}`,
                            borderBottom: `3px solid ${color}`,
                            borderLeft: `3px solid ${color}`,
                            borderRight: 'none',
                            borderRadius: '4px 0 0 4px',
                        } : {
                            width: '24px',
                            height: '10px',
                            borderLeft: `3px solid ${color}`,
                            borderRight: `3px solid ${color}`,
                            borderTop: `3px solid ${color}`,
                            borderBottom: 'none',
                            borderRadius: '4px 4px 0 0',
                        }),
                        background: `${color}11`,
                    }} />
                </div>

                {/* Bottom/Right Bracket */}
                <div style={{
                    position: 'absolute',
                    ...(isMobile ? {
                        right: '-6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                    } : {
                        bottom: '-6px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                    }),
                    zIndex: 11,
                    filter: `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 16px ${color}88)`,
                    animation: pulseAnimation,
                }}>
                    <div style={{
                        ...(isMobile ? {
                            width: '10px',
                            height: '24px',
                            borderTop: `3px solid ${color}`,
                            borderBottom: `3px solid ${color}`,
                            borderRight: `3px solid ${color}`,
                            borderLeft: 'none',
                            borderRadius: '0 4px 4px 0',
                        } : {
                            width: '24px',
                            height: '10px',
                            borderLeft: `3px solid ${color}`,
                            borderRight: `3px solid ${color}`,
                            borderBottom: `3px solid ${color}`,
                            borderTop: 'none',
                            borderRadius: '0 0 4px 4px',
                        }),
                        background: `${color}11`,
                    }} />
                </div>
            </>
        );
    }

    // Triangle pointer for normal spins
    return (
        <>
            {/* Top/Left Pointer */}
            <div style={{
                position: 'absolute',
                ...(isMobile ? {
                    left: '-3px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    borderTop: '10px solid transparent',
                    borderBottom: '10px solid transparent',
                    borderLeft: `14px solid ${color}`,
                } : {
                    top: '-3px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderLeft: '10px solid transparent',
                    borderRight: '10px solid transparent',
                    borderTop: `14px solid ${color}`,
                }),
                width: 0,
                height: 0,
                zIndex: 11,
                filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color}66)`,
                animation: pulseAnimation,
            }} />

            {/* Bottom/Right Pointer (mirror) */}
            <div style={{
                position: 'absolute',
                ...(isMobile ? {
                    right: '-3px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    borderTop: '10px solid transparent',
                    borderBottom: '10px solid transparent',
                    borderRight: `14px solid ${color}`,
                } : {
                    bottom: '-3px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderLeft: '10px solid transparent',
                    borderRight: '10px solid transparent',
                    borderBottom: `14px solid ${color}`,
                }),
                width: 0,
                height: 0,
                zIndex: 11,
                filter: `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color}66)`,
                animation: pulseAnimation,
            }} />
        </>
    );
};

// ============================================
// MOTION BLUR OVERLAY
// ============================================
const MotionBlurOverlay = ({ intensity, isMobile, color }) => (
    <div style={{
        position: 'absolute',
        inset: 0,
        background: isMobile
            ? `linear-gradient(180deg, 
                ${color}${Math.floor(intensity * 40).toString(16).padStart(2, '0')} 0%, 
                transparent 30%, 
                transparent 70%, 
                ${color}${Math.floor(intensity * 40).toString(16).padStart(2, '0')} 100%)`
            : `linear-gradient(90deg, 
                ${color}${Math.floor(intensity * 40).toString(16).padStart(2, '0')} 0%, 
                transparent 30%, 
                transparent 70%, 
                ${color}${Math.floor(intensity * 40).toString(16).padStart(2, '0')} 100%)`,
        filter: `blur(${intensity * 3}px)`,
        pointerEvents: 'none',
        zIndex: 4,
        transition: 'all 0.3s ease-out',
    }} />
);

// ============================================
// ENHANCED SPINNING STRIP CONTAINER
// ============================================
export const EnhancedSpinningStrip = ({
                                          children,
                                          stripRef,
                                          isMobile,
                                          isSpinning,
                                          isResult,
                                          spinProgress = 0, // 0-1, how far through the spin we are
                                          isRecursion = false,
                                          mobileStripHeight = 400,
                                          mobileStripWidth = 140,
                                          onClick,
                                      }) => {
    const [showSpeedLines, setShowSpeedLines] = useState(false);
    const [isSlowingDown, setIsSlowingDown] = useState(false);
    const [showRipples, setShowRipples] = useState(false);

    const accentColor = isRecursion ? COLORS.recursion : COLORS.gold;
    const bgColor = isRecursion ? COLORS.recursionDark : COLORS.bg;

    // Calculate motion blur intensity based on spin progress
    // High at start, fades as we slow down
    const motionIntensity = isSpinning
        ? Math.max(0, 1 - spinProgress * 1.5)
        : 0;

    // Determine if we're in the "slowing down" phase (last 30% of spin)
    useEffect(() => {
        if (isSpinning && spinProgress > 0.7) {
            setIsSlowingDown(true);
        } else {
            setIsSlowingDown(false);
        }
    }, [isSpinning, spinProgress]);

    // Show speed lines during fast spinning
    useEffect(() => {
        if (isSpinning && spinProgress < 0.6) {
            setShowSpeedLines(true);
        } else {
            setShowSpeedLines(false);
        }
    }, [isSpinning, spinProgress]);

    // Show ripples when result lands
    useEffect(() => {
        if (isResult) {
            setShowRipples(true);
            const timer = setTimeout(() => setShowRipples(false), 1500);
            return () => clearTimeout(timer);
        }
    }, [isResult]);

    return (
        <div
            onClick={onClick}
            style={{
                position: 'relative',
                height: isMobile ? `${mobileStripHeight}px` : '100px',
                width: isMobile ? `${mobileStripWidth}px` : '100%',
                overflow: 'hidden',
                borderRadius: isMobile ? '14px' : '10px',
                background: isRecursion
                    ? `linear-gradient(${isMobile ? '0deg' : '90deg'}, ${bgColor} 0%, #0a1a0a 50%, ${bgColor} 100%)`
                    : `linear-gradient(${isMobile ? '0deg' : '90deg'}, ${COLORS.bg} 0%, ${COLORS.bgLight}33 50%, ${COLORS.bg} 100%)`,
                border: `2px solid ${isRecursion ? `${accentColor}88` : isResult ? `${accentColor}66` : COLORS.border}`,
                margin: isMobile ? '0 auto' : '0',
                boxShadow: isRecursion
                    ? `0 0 30px ${accentColor}44, 0 0 60px ${accentColor}22, inset 0 0 40px ${accentColor}15`
                    : isSpinning
                        ? `0 0 20px ${accentColor}33, inset 0 0 30px ${COLORS.bg}`
                        : `inset 0 0 30px ${COLORS.bg}`,
                transition: 'box-shadow 0.3s ease-out, border-color 0.3s ease-out',
                cursor: onClick ? 'pointer' : 'default',
            }}
        >
            {/* Recursion scanlines overlay */}
            {isRecursion && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.05) 2px, rgba(0,255,0,0.05) 4px)',
                    zIndex: 6,
                    pointerEvents: 'none',
                    animation: 'matrixFlicker 0.1s infinite',
                }} />
            )}

            {/* Speed Lines */}
            {showSpeedLines && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none', overflow: 'hidden' }}>
                    {Array.from({ length: 12 }).map((_, i) => (
                        <SpeedLine
                            key={i}
                            index={i}
                            isVertical={isMobile}
                            color={accentColor}
                        />
                    ))}
                </div>
            )}

            {/* Motion Blur Overlay */}
            {motionIntensity > 0.1 && (
                <MotionBlurOverlay
                    intensity={motionIntensity}
                    isMobile={isMobile}
                    color={bgColor}
                />
            )}

            {/* Center Ripples on Result */}
            {showRipples && (
                <>
                    <CenterRipple color={`${accentColor}44`} delay={0} isVertical={!isMobile} />
                    <CenterRipple color={`${accentColor}33`} delay={0.2} isVertical={!isMobile} />
                    <CenterRipple color={`${accentColor}22`} delay={0.4} isVertical={!isMobile} />
                </>
            )}

            {/* Center Indicator Line */}
            <div style={{
                position: 'absolute',
                ...(isMobile ? {
                    left: 0,
                    right: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: '3px',
                } : {
                    top: 0,
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '3px',
                }),
                background: `linear-gradient(${isMobile ? '90deg' : '180deg'}, transparent, ${accentColor}, transparent)`,
                zIndex: 10,
                boxShadow: `0 0 12px ${accentColor}, 0 0 24px ${accentColor}88`,
                transition: 'all 0.3s ease-out',
            }} />

            {/* Enhanced Indicator Pointers */}
            <EnhancedIndicator
                isMobile={isMobile}
                isSlowingDown={isSlowingDown}
                isResult={isResult}
                color={accentColor}
                isRecursion={isRecursion}
            />

            {/* Edge Fade Gradients - Enhanced */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: isMobile
                    ? `linear-gradient(180deg, 
                        ${bgColor} 0%, 
                        ${bgColor}dd 5%,
                        transparent 18%, 
                        transparent 82%, 
                        ${bgColor}dd 95%,
                        ${bgColor} 100%)`
                    : `linear-gradient(90deg, 
                        ${bgColor} 0%, 
                        ${bgColor}dd 5%,
                        transparent 15%, 
                        transparent 85%, 
                        ${bgColor}dd 95%,
                        ${bgColor} 100%)`,
                zIndex: 5,
                pointerEvents: 'none',
            }} />

            {/* Vignette Overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.3) 100%)',
                zIndex: 4,
                pointerEvents: 'none',
                opacity: isSpinning ? 0.5 : 0.3,
                transition: 'opacity 0.3s ease-out',
            }} />

            {/* The actual strip content */}
            <div
                ref={stripRef}
                style={{
                    position: isMobile ? 'absolute' : 'relative',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: 'center',
                    willChange: 'transform, top',
                    zIndex: 2,
                }}
            >
                {children}
            </div>
        </div>
    );
};

// ============================================
// ENHANCED STRIP ITEM WRAPPER
// For items that scale based on proximity to center
// ============================================
export const EnhancedStripItem = ({
                                      children,
                                      index,
                                      totalItems,
                                      currentOffset,
                                      itemWidth,
                                      isMobile,
                                      isRecursion,
                                      borderColor = COLORS.border,
                                  }) => {
    // Calculate this item's distance from center
    // This creates the "items grow as they approach center" effect
    const finalIndex = totalItems - 8;
    const distanceFromFinal = Math.abs(index - finalIndex);
    const proximityScale = Math.max(0.85, 1 - (distanceFromFinal * 0.02));

    return (
        <div style={{
            width: `${itemWidth}px`,
            height: `${itemWidth}px`,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${proximityScale})`,
            transition: 'transform 0.1s ease-out',
            ...(isMobile
                ? { borderBottom: `1px solid ${isRecursion ? COLORS.recursion + '33' : borderColor + '33'}` }
                : { borderRight: `1px solid ${isRecursion ? COLORS.recursion + '33' : borderColor + '33'}` }),
        }}>
            {children}
        </div>
    );
};

// ============================================
// ADDITIONAL ANIMATION KEYFRAMES
// Add these to AnimationStyles.jsx
// ============================================
export const SpinningStripAnimations = () => (
    <style>{`
        @keyframes speedLineHorizontal {
            0% {
                transform: translateX(100vw);
                opacity: 0;
            }
            10% {
                opacity: 0.8;
            }
            90% {
                opacity: 0.8;
            }
            100% {
                transform: translateX(-100%);
                opacity: 0;
            }
        }
        
        @keyframes speedLineVertical {
            0% {
                transform: translateY(100vh);
                opacity: 0;
            }
            10% {
                opacity: 0.8;
            }
            90% {
                opacity: 0.8;
            }
            100% {
                transform: translateY(-100%);
                opacity: 0;
            }
        }
        
        @keyframes indicatorHeartbeat {
            0%, 100% {
                transform: translateX(-50%) scale(1);
                filter: drop-shadow(0 0 8px currentColor);
            }
            25% {
                transform: translateX(-50%) scale(1.3);
                filter: drop-shadow(0 0 16px currentColor) drop-shadow(0 0 32px currentColor);
            }
            50% {
                transform: translateX(-50%) scale(1);
                filter: drop-shadow(0 0 8px currentColor);
            }
            75% {
                transform: translateX(-50%) scale(1.2);
                filter: drop-shadow(0 0 12px currentColor) drop-shadow(0 0 24px currentColor);
            }
        }
        
        @keyframes indicatorHeartbeatMobile {
            0%, 100% {
                transform: translateY(-50%) scale(1);
                filter: drop-shadow(0 0 8px currentColor);
            }
            25% {
                transform: translateY(-50%) scale(1.3);
                filter: drop-shadow(0 0 16px currentColor) drop-shadow(0 0 32px currentColor);
            }
            50% {
                transform: translateY(-50%) scale(1);
                filter: drop-shadow(0 0 8px currentColor);
            }
            75% {
                transform: translateY(-50%) scale(1.2);
                filter: drop-shadow(0 0 12px currentColor) drop-shadow(0 0 24px currentColor);
            }
        }
        
        @keyframes stripItemPulse {
            0%, 100% {
                box-shadow: 0 0 0 0 transparent;
            }
            50% {
                box-shadow: 0 0 20px 5px var(--pulse-color, ${COLORS.gold}44);
            }
        }
    `}</style>
);