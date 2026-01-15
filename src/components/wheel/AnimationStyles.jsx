import React from 'react';
import { COLORS } from '../../config/constants.js';

export const AnimationStyles = () => (
    <style>{`
        /* ============================================
           CORE ANIMATIONS (Preserved)
           ============================================ */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes wheelSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        @keyframes itemReveal {
            0% { transform: scale(0) rotate(-20deg); opacity: 0; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes floatParticle {
            0% { transform: translateY(0) scale(1); opacity: 0; }
            10% { opacity: 1; }
            100% { transform: translateY(-100px) scale(0); opacity: 0; }
        }
        @keyframes shimmerSlide {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(50%); }
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
        }
        
        /* ============================================
           RARITY GLOW ANIMATIONS (Preserved + Enhanced)
           ============================================ */
        @keyframes specialGlow {
            0%, 100% { 
                box-shadow: 0 0 15px ${COLORS.purple}88, 0 0 30px ${COLORS.purple}44;
                border-color: ${COLORS.purple};
            }
            50% { 
                box-shadow: 0 0 25px ${COLORS.purple}aa, 0 0 50px ${COLORS.gold}44;
                border-color: ${COLORS.gold};
            }
        }
        @keyframes rareGlow {
            0%, 100% { 
                box-shadow: 0 0 12px ${COLORS.red}88, 0 0 24px ${COLORS.red}44;
                border-color: ${COLORS.red};
            }
            50% { 
                box-shadow: 0 0 20px ${COLORS.red}aa, 0 0 40px ${COLORS.orange}44;
                border-color: ${COLORS.orange};
            }
        }
        @keyframes mythicGlow {
            0%, 100% { 
                box-shadow: 0 0 20px ${COLORS.aqua}aa, 0 0 40px ${COLORS.purple}44;
                border-color: ${COLORS.aqua};
            }
            33% { 
                box-shadow: 0 0 25px ${COLORS.purple}aa, 0 0 50px ${COLORS.gold}44;
                border-color: ${COLORS.purple};
            }
            66% { 
                box-shadow: 0 0 25px ${COLORS.gold}aa, 0 0 50px ${COLORS.aqua}44;
                border-color: ${COLORS.gold};
            }
        }
        @keyframes insaneGlow {
            0%, 100% { 
                box-shadow: 0 0 25px ${COLORS.insane}cc, 0 0 50px ${COLORS.insane}66, 0 0 75px #FFF5B044;
                border-color: ${COLORS.insane};
                filter: brightness(1.1);
            }
            25% { 
                box-shadow: 0 0 30px #FFF5B0dd, 0 0 60px ${COLORS.insane}77, 0 0 90px ${COLORS.insane}33;
                border-color: #FFF5B0;
                filter: brightness(1.2);
            }
            50% { 
                box-shadow: 0 0 35px ${COLORS.insane}ee, 0 0 70px #FFF5B088, 0 0 105px ${COLORS.insane}44;
                border-color: ${COLORS.insane};
                filter: brightness(1.3);
            }
            75% { 
                box-shadow: 0 0 30px #FFF5B0dd, 0 0 60px ${COLORS.insane}77, 0 0 90px #FFF5B033;
                border-color: #FFF5B0;
                filter: brightness(1.2);
            }
        }
        @keyframes insanePulse {
            0%, 100% { 
                transform: scale(1);
                box-shadow: 0 0 20px ${COLORS.insane}aa, 0 0 40px ${COLORS.insane}55;
            }
            50% { 
                transform: scale(1.02);
                box-shadow: 0 0 30px ${COLORS.insane}cc, 0 0 60px ${COLORS.insane}77;
            }
        }
        @keyframes insaneShimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
        }
        @keyframes eventGlow {
            0%, 100% { 
                box-shadow: 0 0 20px ${COLORS.red}aa, 0 0 40px ${COLORS.red}44;
                border-color: ${COLORS.red};
            }
            16% { 
                box-shadow: 0 0 20px ${COLORS.orange}aa, 0 0 40px ${COLORS.orange}44;
                border-color: ${COLORS.orange};
            }
            33% { 
                box-shadow: 0 0 20px ${COLORS.gold}aa, 0 0 40px ${COLORS.gold}44;
                border-color: ${COLORS.gold};
            }
            50% { 
                box-shadow: 0 0 20px ${COLORS.green}aa, 0 0 40px ${COLORS.green}44;
                border-color: ${COLORS.green};
            }
            66% { 
                box-shadow: 0 0 20px ${COLORS.aqua}aa, 0 0 40px ${COLORS.aqua}44;
                border-color: ${COLORS.aqua};
            }
            83% { 
                box-shadow: 0 0 20px ${COLORS.purple}aa, 0 0 40px ${COLORS.purple}44;
                border-color: ${COLORS.purple};
            }
        }
        @keyframes mythicBadge {
            0%, 100% { 
                background: linear-gradient(135deg, ${COLORS.aqua}, ${COLORS.purple}, ${COLORS.gold});
            }
            33% { 
                background: linear-gradient(135deg, ${COLORS.purple}, ${COLORS.gold}, ${COLORS.aqua});
            }
            66% { 
                background: linear-gradient(135deg, ${COLORS.gold}, ${COLORS.aqua}, ${COLORS.purple});
            }
        }
        
        /* ============================================
           UI ANIMATIONS (Preserved)
           ============================================ */
        @keyframes sparkle {
            0%, 100% { opacity: 0; transform: scale(0.5); }
            50% { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
        }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
        }
        @keyframes subtlePulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.85; }
        }
        /* ============================================
           RECURSION ANIMATIONS (Preserved)
           ============================================ */
        @keyframes recursionGlow {
            0%, 100% { 
                box-shadow: 0 0 20px ${COLORS.recursion}cc, 0 0 40px ${COLORS.recursion}66, 0 0 60px ${COLORS.recursionDark}44;
                border-color: ${COLORS.recursion};
                filter: brightness(1.1);
            }
            50% { 
                box-shadow: 0 0 30px ${COLORS.recursionDark}dd, 0 0 60px ${COLORS.recursion}77, 0 0 90px ${COLORS.recursion}33;
                border-color: ${COLORS.recursionDark};
                filter: brightness(0.9);
            }
        }
        @keyframes matrixFlicker {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.85; }
            75% { opacity: 0.95; }
            90% { opacity: 0.9; }
        }
        @keyframes recursionTextGlitch {
            0%, 100% { 
                text-shadow: 0 0 10px #00FF00, 0 0 20px #00FF00, 0 0 30px #00FF00;
                transform: translate(0);
            }
            10% { 
                text-shadow: -2px 0 #FF0000, 2px 0 #00FFFF, 0 0 10px #00FF00;
                transform: translate(2px, -1px);
            }
            20% { 
                text-shadow: 2px 0 #FF0000, -2px 0 #00FFFF, 0 0 10px #00FF00;
                transform: translate(-2px, 1px);
            }
            30% { 
                text-shadow: 0 0 10px #00FF00, 0 0 20px #00FF00, 0 0 30px #00FF00;
                transform: translate(0);
            }
        }
        /* Rarity aura glows */
        @keyframes rarityAuraPurple {
            0%, 100% { box-shadow: 0 0 15px ${COLORS.purple}66, 0 0 30px ${COLORS.purple}33; }
            50% { box-shadow: 0 0 25px ${COLORS.purple}88, 0 0 50px ${COLORS.purple}44; }
        }
        @keyframes rarityAuraGold {
            0%, 100% { box-shadow: 0 0 15px ${COLORS.gold}66, 0 0 30px ${COLORS.gold}33; }
            50% { box-shadow: 0 0 25px ${COLORS.gold}88, 0 0 50px ${COLORS.gold}44; }
        }
        @keyframes rarityAuraAqua {
            0%, 100% { box-shadow: 0 0 20px ${COLORS.aqua}77, 0 0 40px ${COLORS.purple}33; }
            50% { box-shadow: 0 0 35px ${COLORS.aqua}99, 0 0 60px ${COLORS.purple}55; }
        }
        @keyframes rarityAuraRed {
            0%, 100% { box-shadow: 0 0 12px ${COLORS.red}55, 0 0 24px ${COLORS.red}22; }
            50% { box-shadow: 0 0 20px ${COLORS.red}77, 0 0 40px ${COLORS.red}33; }
        }
        @keyframes rarityAuraInsane {
            0%, 100% { box-shadow: 0 0 25px ${COLORS.insane}88, 0 0 50px #FFF5B044; }
            50% { box-shadow: 0 0 40px ${COLORS.insane}aa, 0 0 70px #FFF5B066; }
        }

        /* ============================================
           NEW: COSMIC CASINO ANIMATIONS
           ============================================ */
        
        /* Floating cosmic particles */
        /* Slow drift for background orbs */
        /* Orbital ring rotation */
        /* Wheel idle breathing */
        /* Wheel hover pulse */
        /* Aura pulse behind wheel */
        @keyframes auraPulse {
            0%, 100% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 0.4;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.15);
                opacity: 0.7;
            }
        }
        
        /* Keyboard hint glow */
        /* Rarity tier indicator pulse */
        /* Text gradient shift */
        /* Strip item approach - items grow as they near center */
        /* Speed lines effect */
        /* Spin acceleration blur */
        /* Result shockwave */
        @keyframes resultShockwave {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 1;
                border-width: 4px;
            }
            100% {
                transform: translate(-50%, -50%) scale(3);
                opacity: 0;
                border-width: 1px;
            }
        }
        
        /* Result item materialize */
        /* Result glow burst */
        /* Letter by letter reveal */
        /* Vignette pulse */
        /* Background gradient mesh animation - respects reduced motion preference */
        @media (prefers-reduced-motion: no-preference) {
            @keyframes meshGradient {
                0%, 100% {
                    background-position: 0% 50%;
                }
                50% {
                    background-position: 100% 50%;
                }
            }
        }
        
        /* Fallback for reduced motion - static position */
        @media (prefers-reduced-motion: reduce) {
            @keyframes meshGradient {
                0%, 100% {
                    background-position: 50% 50%;
                }
            }
        }
        
        /* Star twinkle */
        /* Button hover lift */
        /* Glassmorphism shine */
        /* Counter tick animation */
        /* Ambient orb float */
        /* Tooltip slide in */
        @keyframes tooltipSlide {
            0% {
                opacity: 0;
                transform: translateX(-50%) translateY(5px);
            }
            100% {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }
        
        /* Ripple effect from center */
        /* Particle explosion */
        /* Confetti fall */
        /* Strip slowdown tension */
        /* Header text shimmer */
        /* Spin button ready pulse */
        /* Navigation button glow */
        /* Loading spinner cosmic */
        @keyframes cosmicSpin {
            0% {
                transform: rotate(0deg);
                filter: hue-rotate(0deg);
            }
            100% {
                transform: rotate(360deg);
                filter: hue-rotate(360deg);
            }
        }
        
        /* Rarity flash on win */
        /* Mobile tap feedback */
        /* Odds bar fill */
        /* Achievement unlock */
        /* ============================================
           PHASE 2: SPINNING STRIP ENHANCEMENTS
           ============================================ */
        
        /* Speed lines - horizontal */
        /* Speed lines - vertical (mobile) */
        /* Indicator heartbeat during slowdown */
        @keyframes indicatorHeartbeat {
            0%, 100% {
                transform: translateX(-50%) scale(1);
            }
            15% {
                transform: translateX(-50%) scale(1.4);
            }
            30% {
                transform: translateX(-50%) scale(1);
            }
            45% {
                transform: translateX(-50%) scale(1.25);
            }
            60% {
                transform: translateX(-50%) scale(1);
            }
        }
        
        /* Indicator heartbeat for mobile (vertical) */
        @keyframes indicatorHeartbeatMobile {
            0%, 100% {
                transform: translateY(-50%) scale(1);
            }
            15% {
                transform: translateY(-50%) scale(1.4);
            }
            30% {
                transform: translateY(-50%) scale(1);
            }
            45% {
                transform: translateY(-50%) scale(1.25);
            }
            60% {
                transform: translateY(-50%) scale(1);
            }
        }
        
        /* Strip item pulse effect */
        /* Result shockwave - enhanced */
        @keyframes resultShockwaveRing {
            0% {
                transform: translate(-50%, -50%) scale(0.5);
                opacity: 1;
                border-width: 3px;
            }
            100% {
                transform: translate(-50%, -50%) scale(2.5);
                opacity: 0;
                border-width: 1px;
            }
        }
        
        /* Item scale on approach to center */
        /* Strip container glow pulse during spin */
        /* Center line pulse */
        @keyframes centerLinePulse {
            0%, 100% {
                opacity: 1;
                box-shadow: 0 0 12px var(--line-color, ${COLORS.gold}), 
                            0 0 24px var(--line-color, ${COLORS.gold}88);
            }
            50% {
                opacity: 0.8;
                box-shadow: 0 0 20px var(--line-color, ${COLORS.gold}), 
                            0 0 40px var(--line-color, ${COLORS.gold}aa);
            }
        }
        
        /* Result item materialize with glow */
        /* Result name letter reveal */
        /* Vignette color pulse on result */
        /* ============================================
           PHASE 3: SUBTLE RESULT ENHANCEMENTS
           ============================================ */
        
        /* Subtle light sweep across item */
        /* Smooth container entrance */
        @keyframes resultContainerSmooth {
            0% {
                opacity: 0;
                transform: translateY(15px);
            }
            100% {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        /* Staggered text reveal */
        @keyframes textFadeUp {
            0% {
                opacity: 0;
                transform: translateY(8px);
            }
            100% {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        /* Background aurora effect */
        @keyframes auroraShift {
            0%, 100% {
                background-position: 0% 50%;
            }
            50% {
                background-position: 100% 50%;
            }
        }
        
        /* Floating particle with drift */
        @keyframes floatParticleDrift {
            0% {
                opacity: 0;
                transform: translateY(0) translateX(0) scale(0);
            }
            10% {
                opacity: 1;
                transform: translateY(-10px) translateX(var(--drift-x, 5px)) scale(1);
            }
            90% {
                opacity: 0.8;
                transform: translateY(-80px) translateX(var(--drift-x2, -10px)) scale(0.8);
            }
            100% {
                opacity: 0;
                transform: translateY(-100px) translateX(var(--drift-x, 5px)) scale(0.3);
            }
        }
        
        /* Gentle pulse for background glow */
        /* Item box smooth entrance */
        @keyframes itemBoxReveal {
            0% {
                opacity: 0;
                transform: scale(0.8);
            }
            60% {
                opacity: 1;
                transform: scale(1.03);
            }
            100% {
                opacity: 1;
                transform: scale(1);
            }
        }
        
        /* ============================================
           PHASE 4: PAGE LAYOUT POLISH
           ============================================ */
        
        /* Staggered section entrance */
        @keyframes sectionFadeIn {
            0% {
                opacity: 0;
                transform: translateY(20px);
            }
            100% {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        /* Header text shimmer - improved */
        @keyframes headerTextShimmer {
            0% {
                background-position: 200% center;
            }
            100% {
                background-position: -200% center;
            }
        }
        
        /* Subtle border glow for cards */
        /* Stats counter animation */
        /* Divider line draw */
        @keyframes lineDrawIn {
            0% {
                transform: scaleX(0);
                opacity: 0;
            }
            100% {
                transform: scaleX(1);
                opacity: 1;
            }
        }
        
        /* Nav button hover glow */
        /* Card border glow - spinning state */
        @keyframes borderGlowSpin {
            0% {
                background-position: 0% 50%;
            }
            100% {
                background-position: 200% 50%;
            }
        }
        
        /* Card border glow - idle state */
        @keyframes borderGlowIdle {
            0%, 100% {
                background-position: 0% 50%;
                opacity: 0.5;
            }
            50% {
                background-position: 100% 50%;
                opacity: 0.8;
            }
        }
        
        /* Card shimmer sweep - one time on spin */
        @keyframes cardShimmerOnce {
            0% {
                left: -100%;
            }
            100% {
                left: 200%;
            }
        }
        
        /* Card shimmer sweep - continuous (unused now) */
        @keyframes cardShimmer {
            0% {
                left: -100%;
            }
            100% {
                left: 200%;
            }
        }
        
        /* Glow pulse for spinning */
        @keyframes glowPulse {
            0%, 100% {
                opacity: 0.6;
                transform: translateX(-50%) scale(1);
            }
            50% {
                opacity: 1;
                transform: translateX(-50%) scale(1.1);
            }
        }
        
        /* ============================================
           ENHANCED RECURSION SPINNING ANIMATIONS
           ============================================ */
        
        /* Matrix-style screen flash on spin start */
        /* Intense green pulse during recursion spin */
        @keyframes recursionSpinPulse {
            0%, 100% {
                box-shadow: 0 0 30px ${COLORS.recursion}66, inset 0 0 50px ${COLORS.recursion}22;
                border-color: ${COLORS.recursion};
            }
            25% {
                box-shadow: 0 0 50px ${COLORS.recursion}88, inset 0 0 70px ${COLORS.recursion}33, 0 0 100px ${COLORS.recursion}44;
                border-color: ${COLORS.recursion};
            }
            50% {
                box-shadow: 0 0 40px ${COLORS.recursionDark}77, inset 0 0 60px ${COLORS.recursion}28;
                border-color: ${COLORS.recursionDark};
            }
            75% {
                box-shadow: 0 0 60px ${COLORS.recursion}99, inset 0 0 80px ${COLORS.recursion}35, 0 0 120px ${COLORS.recursion}55;
                border-color: ${COLORS.recursion};
            }
        }
        
        /* Crimson/Gold pulse during KOTW lucky spin */
        @keyframes kotwSpinPulse {
            0%, 100% {
                box-shadow: 0 0 30px #F43F5E66, 0 0 60px #F59E0B33;
            }
            25% {
                box-shadow: 0 0 50px #F43F5E88, 0 0 80px #F59E0B44, 0 0 100px #F43F5E33;
            }
            50% {
                box-shadow: 0 0 40px #F59E0B77, 0 0 70px #F43F5E44;
            }
            75% {
                box-shadow: 0 0 60px #F43F5E99, 0 0 90px #F59E0B55, 0 0 120px #F43F5E44;
            }
        }
        
        /* Matrix code particle float */
        /* Screen tear effect */
        /* Data corruption glitch */
        /* Binary data stream */
        @keyframes binaryStream {
            0% { background-position: 0% 0%; }
            100% { background-position: 0% 100%; }
        }
        
        /* Recursion result reveal - hack successful style */
        @keyframes recursionReveal {
            0% { 
                opacity: 0;
                transform: scale(0.8) translateY(20px);
                filter: blur(10px) brightness(2);
            }
            30% {
                opacity: 1;
                transform: scale(1.1) translateY(-5px);
                filter: blur(0) brightness(1.5);
            }
            50% {
                transform: scale(0.95) translateY(2px);
                filter: brightness(1);
            }
            70% {
                transform: scale(1.02) translateY(-2px);
            }
            100% { 
                opacity: 1;
                transform: scale(1) translateY(0);
                filter: blur(0) brightness(1);
            }
        }
        
        /* Intense recursion indicator glow */
        /* Cyberpunk scanline sweep */
        /* Matrix item highlight */
        /* Green aura animation for all items during recursion */
        @keyframes rarityAuraGreen {
            0%, 100% {
                box-shadow: 0 0 12px ${COLORS.recursion}66, 0 0 24px ${COLORS.recursion}33;
                border-color: ${COLORS.recursion}88;
            }
            50% {
                box-shadow: 0 0 20px ${COLORS.recursion}88, 0 0 40px ${COLORS.recursion}44;
                border-color: ${COLORS.recursion};
            }
        }
        
        /* Result container matrix effect */
        @keyframes matrixResultContainer {
            0% {
                background-position: 0% 0%;
                box-shadow: 0 0 30px ${COLORS.recursion}44, inset 0 0 50px ${COLORS.recursion}11;
            }
            50% {
                background-position: 100% 100%;
                box-shadow: 0 0 50px ${COLORS.recursion}66, inset 0 0 70px ${COLORS.recursion}22;
            }
            100% {
                background-position: 0% 0%;
                box-shadow: 0 0 30px ${COLORS.recursion}44, inset 0 0 50px ${COLORS.recursion}11;
            }
        }
        
        /* KOTW result reveal animation - crimson/gold royal theme */
        @keyframes kotwReveal {
            0% { 
                opacity: 0;
                transform: scale(0.8) translateY(20px);
                filter: blur(10px) brightness(2);
            }
            30% {
                opacity: 1;
                transform: scale(1.1) translateY(-5px);
                filter: blur(0) brightness(1.5);
            }
            50% {
                transform: scale(0.95) translateY(2px);
                filter: brightness(1);
            }
            70% {
                transform: scale(1.02) translateY(-2px);
            }
            100% { 
                opacity: 1;
                transform: scale(1) translateY(0);
                filter: blur(0) brightness(1);
            }
        }
        
        /* KOTW result container glow effect - crimson/gold */
        @keyframes kotwResultContainer {
            0% {
                background-position: 0% 0%;
                box-shadow: 0 0 30px #F43F5E44, 0 0 50px #F59E0B22, inset 0 0 40px #F43F5E11;
            }
            50% {
                background-position: 100% 100%;
                box-shadow: 0 0 50px #F43F5E66, 0 0 80px #F59E0B44, inset 0 0 60px #F43F5E22;
            }
            100% {
                background-position: 0% 0%;
                box-shadow: 0 0 30px #F43F5E44, 0 0 50px #F59E0B22, inset 0 0 40px #F43F5E11;
            }
        }
        
        /* Hex code float effect */
        @keyframes hexFloat {
            0%, 100% {
                transform: translateY(0) rotate(0deg);
                opacity: 0.4;
            }
            50% {
                transform: translateY(-15px) rotate(180deg);
                opacity: 0.8;
            }
        }

        /* KOTW Lucky Spins Badge pulse - crimson/gold royal theme */
        @keyframes kotwBadgePulse {
            0%, 100% {
                transform: scale(1);
                box-shadow: 0 4px 20px rgba(244, 63, 94, 0.25), inset 0 1px 0 rgba(248, 250, 252, 0.1);
            }
            50% {
                transform: scale(1.02);
                box-shadow: 0 4px 30px rgba(244, 63, 94, 0.4), 0 0 15px rgba(245, 158, 11, 0.25), inset 0 1px 0 rgba(248, 250, 252, 0.15);
            }
        }
    `}</style>
);