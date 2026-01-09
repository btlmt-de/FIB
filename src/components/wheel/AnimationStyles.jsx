import React from 'react';
import { COLORS } from '../../config/constants.js';

export const AnimationStyles = () => (
    <style>{`
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
        @keyframes itemBounce {
            0% { transform: scale(0); }
            50% { transform: scale(1.2); }
            75% { transform: scale(0.9); }
            100% { transform: scale(1); }
        }
        @keyframes newBadgePop {
            0% { transform: scale(0); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }
        @keyframes floatParticle {
            0% { transform: translateY(0) scale(1); opacity: 0; }
            10% { opacity: 1; }
            100% { transform: translateY(-100px) scale(0); opacity: 0; }
        }
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
        @keyframes mythicGlowSoft {
            0%, 100% { 
                box-shadow: 0 0 15px ${COLORS.aqua}44, 0 0 25px ${COLORS.purple}22;
                border-color: ${COLORS.aqua};
            }
            33% { 
                box-shadow: 0 0 18px ${COLORS.purple}44, 0 0 30px ${COLORS.gold}22;
                border-color: ${COLORS.purple};
            }
            66% { 
                box-shadow: 0 0 18px ${COLORS.gold}44, 0 0 30px ${COLORS.aqua}22;
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
        @keyframes fadeSlideDown {
            0% { opacity: 0; transform: translateY(-10px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.1); }
        }
        @keyframes sparkle {
            0%, 100% { opacity: 0; transform: scale(0.5); }
            50% { opacity: 1; transform: scale(1); }
        }
        @keyframes textReveal {
            0% { opacity: 0; transform: translateX(-20px); }
            100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes tripleSpinPulse {
            0%, 100% { 
                transform: scale(1);
                box-shadow: 0 0 30px ${COLORS.gold}66, 0 0 60px ${COLORS.orange}33;
            }
            50% { 
                transform: scale(1.05);
                box-shadow: 0 0 50px ${COLORS.orange}88, 0 0 80px ${COLORS.gold}44;
            }
        }
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
        }
        @keyframes shimmerSweep {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
        }
        @keyframes subtlePulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.85; }
        }
        @keyframes bonusEventReveal {
            0% {
                opacity: 0;
                transform: scale(0.85) translateY(-20px);
            }
            100% {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
        }
        @keyframes explosiveBurst {
            0% {
                opacity: 1;
                transform: translate(0, 0) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(var(--tx), var(--ty)) scale(0);
            }
        }
        @keyframes dramaticScale {
            0% {
                opacity: 0;
                transform: scale(0.5);
            }
            50% {
                opacity: 1;
                transform: scale(1.15);
            }
            100% {
                opacity: 1;
                transform: scale(1);
            }
        }
        @keyframes spinnerAppear {
            0% {
                opacity: 0;
                transform: scaleY(0.8);
            }
            100% {
                opacity: 1;
                transform: scaleY(1);
            }
        }
        @keyframes centerGlow {
            0%, 100% {
                box-shadow: 0 0 12px ${COLORS.gold}cc, 0 0 24px ${COLORS.gold}88, 0 0 40px ${COLORS.gold}44, inset 0 0 8px ${COLORS.gold}77;
            }
            50% {
                box-shadow: 0 0 20px ${COLORS.gold}dd, 0 0 40px ${COLORS.gold}aa, 0 0 60px ${COLORS.gold}66, inset 0 0 12px ${COLORS.gold}88;
            }
        }
        @keyframes pointerGlow {
            0%, 100% {
                filter: drop-shadow(0 0px 6px ${COLORS.gold}cc) drop-shadow(0 0 12px ${COLORS.gold}88);
            }
            50% {
                filter: drop-shadow(0 0px 8px ${COLORS.gold}dd) drop-shadow(0 0 16px ${COLORS.gold}aa);
            }
        }
        @keyframes resultSlideIn {
            0% {
                opacity: 0;
                transform: translateY(-15px) scale(0.98);
            }
            100% {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
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
        @keyframes recursionPulse {
            0%, 100% { 
                transform: scale(1);
                filter: brightness(1) hue-rotate(0deg);
            }
            25% { 
                transform: scale(1.02);
                filter: brightness(1.3) hue-rotate(5deg);
            }
            50% { 
                transform: scale(1);
                filter: brightness(0.8) hue-rotate(-5deg);
            }
            75% { 
                transform: scale(1.01);
                filter: brightness(1.2) hue-rotate(3deg);
            }
        }
        @keyframes matrixRain {
            0% { transform: translateY(-100%); opacity: 1; }
            100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes matrixGlitch {
            0%, 100% { 
                transform: translate(0);
                filter: none;
            }
            10% { 
                transform: translate(-2px, 1px);
                filter: hue-rotate(90deg);
            }
            20% { 
                transform: translate(2px, -1px);
                filter: hue-rotate(-90deg);
            }
            30% { 
                transform: translate(-1px, 2px);
                filter: saturate(2);
            }
            40% { 
                transform: translate(1px, -2px);
                filter: brightness(1.5);
            }
            50% { 
                transform: translate(-2px, -1px);
                filter: contrast(1.5);
            }
            60% { 
                transform: translate(2px, 1px);
                filter: invert(0.1);
            }
            70% { 
                transform: translate(0, 2px);
                filter: hue-rotate(180deg);
            }
            80% { 
                transform: translate(-1px, 0);
                filter: saturate(0.5);
            }
            90% { 
                transform: translate(1px, 1px);
                filter: brightness(0.8);
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
        
        /* Chromatic Aberration - RGB color split effect */
        @keyframes chromaticAberration {
            0%, 100% {
                text-shadow: 
                    0 0 10px #00FF00,
                    0 0 20px #00FF00;
                filter: none;
            }
            25% {
                text-shadow: 
                    -3px 0 rgba(255, 0, 0, 0.8),
                    3px 0 rgba(0, 255, 255, 0.8),
                    0 0 15px #00FF00;
                filter: blur(0.3px);
            }
            50% {
                text-shadow: 
                    2px 0 rgba(255, 0, 0, 0.6),
                    -2px 0 rgba(0, 255, 255, 0.6),
                    0 0 20px #00FF00;
                filter: none;
            }
            75% {
                text-shadow: 
                    -2px 1px rgba(255, 0, 0, 0.7),
                    2px -1px rgba(0, 255, 255, 0.7),
                    0 0 15px #00FF00;
                filter: blur(0.2px);
            }
        }
        
        /* Chromatic aberration for boxes/containers */
        @keyframes chromaticBox {
            0%, 100% {
                box-shadow: 
                    0 0 20px #00FF0088,
                    inset 0 0 15px #00FF0022;
            }
            20% {
                box-shadow: 
                    -3px 0 15px rgba(255, 0, 0, 0.4),
                    3px 0 15px rgba(0, 255, 255, 0.4),
                    0 0 25px #00FF0088,
                    inset 0 0 15px #00FF0022;
            }
            40% {
                box-shadow: 
                    2px 0 10px rgba(255, 0, 0, 0.3),
                    -2px 0 10px rgba(0, 255, 255, 0.3),
                    0 0 20px #00FF0088,
                    inset 0 0 15px #00FF0022;
            }
            60% {
                box-shadow: 
                    -2px 1px 12px rgba(255, 0, 0, 0.35),
                    2px -1px 12px rgba(0, 255, 255, 0.35),
                    0 0 22px #00FF0088,
                    inset 0 0 15px #00FF0022;
            }
            80% {
                box-shadow: 
                    0 0 20px #00FF0088,
                    inset 0 0 15px #00FF0022;
            }
        }
        
        /* Enhanced indicator needle pulse */
        @keyframes indicatorPulse {
            0%, 100% {
                filter: drop-shadow(0 0 8px #00FF00) drop-shadow(0 0 16px #00FF00);
                transform: translateX(-50%) scale(1);
            }
            50% {
                filter: drop-shadow(0 0 15px #00FF00) drop-shadow(0 0 30px #00FF00) drop-shadow(0 0 45px #00FF0088);
                transform: translateX(-50%) scale(1.1);
            }
        }
        
        /* Indicator pulse when landing on item */
        @keyframes indicatorLand {
            0% {
                filter: drop-shadow(0 0 20px #00FF00) drop-shadow(0 0 40px #00FF00);
                transform: translateX(-50%) scale(1.3);
            }
            50% {
                filter: drop-shadow(0 0 30px #FFFFFF) drop-shadow(0 0 60px #00FF00);
                transform: translateX(-50%) scale(1.4);
            }
            100% {
                filter: drop-shadow(0 0 10px #00FF00) drop-shadow(0 0 20px #00FF00);
                transform: translateX(-50%) scale(1);
            }
        }
        
        /* Matrix rain for banner */
        @keyframes matrixRainFast {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
        }
        
        /* Rarity aura glow for spinning items */
        @keyframes rarityAuraPurple {
            0%, 100% { 
                box-shadow: 0 0 15px ${COLORS.purple}66, 0 0 30px ${COLORS.purple}33;
            }
            50% { 
                box-shadow: 0 0 25px ${COLORS.purple}88, 0 0 50px ${COLORS.purple}44;
            }
        }
        @keyframes rarityAuraGold {
            0%, 100% { 
                box-shadow: 0 0 15px ${COLORS.gold}66, 0 0 30px ${COLORS.gold}33;
            }
            50% { 
                box-shadow: 0 0 25px ${COLORS.gold}88, 0 0 50px ${COLORS.gold}44;
            }
        }
        @keyframes rarityAuraAqua {
            0%, 100% { 
                box-shadow: 0 0 20px ${COLORS.aqua}77, 0 0 40px ${COLORS.purple}33;
            }
            50% { 
                box-shadow: 0 0 35px ${COLORS.aqua}99, 0 0 60px ${COLORS.purple}55;
            }
        }
        @keyframes rarityAuraRed {
            0%, 100% { 
                box-shadow: 0 0 12px ${COLORS.red}55, 0 0 24px ${COLORS.red}22;
            }
            50% { 
                box-shadow: 0 0 20px ${COLORS.red}77, 0 0 40px ${COLORS.red}33;
            }
        }
        @keyframes rarityAuraInsane {
            0%, 100% { 
                box-shadow: 0 0 25px ${COLORS.insane}88, 0 0 50px #FFF5B044;
            }
            50% { 
                box-shadow: 0 0 40px ${COLORS.insane}aa, 0 0 70px #FFF5B066;
            }
        }
        @keyframes rarityAuraGreen {
            0%, 100% { 
                box-shadow: 0 0 15px #00FF0066, 0 0 30px #00FF0033;
            }
            50% { 
                box-shadow: 0 0 25px #00FF0088, 0 0 50px #00FF0044;
            }
        }
        
        /* CRT flicker effect */
        @keyframes crtFlicker {
            0% { opacity: 0.97; }
            5% { opacity: 0.95; }
            10% { opacity: 0.98; }
            15% { opacity: 0.94; }
            20% { opacity: 0.98; }
            50% { opacity: 0.96; }
            80% { opacity: 0.98; }
            90% { opacity: 0.95; }
            100% { opacity: 0.97; }
        }
        
        /* Glitch slice effect */
        @keyframes glitchSlice {
            0%, 100% {
                clip-path: inset(0 0 0 0);
                transform: translate(0);
            }
            10% {
                clip-path: inset(20% 0 60% 0);
                transform: translate(-5px);
            }
            20% {
                clip-path: inset(50% 0 30% 0);
                transform: translate(5px);
            }
            30% {
                clip-path: inset(10% 0 70% 0);
                transform: translate(-3px);
            }
            40% {
                clip-path: inset(70% 0 10% 0);
                transform: translate(3px);
            }
            50% {
                clip-path: inset(0 0 0 0);
                transform: translate(0);
            }
        }
    `}</style>
);