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
        
        /* ============================================
           UI ANIMATIONS (Preserved)
           ============================================ */
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
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
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
        @keyframes recursionPulse {
            0%, 100% { 
                transform: translate(-50%, -60%) scale(1);
                opacity: 0.6;
            }
            50% { 
                transform: translate(-50%, -60%) scale(1.2);
                opacity: 0.9;
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
        @keyframes chromaticAberration {
            0%, 100% {
                text-shadow: 0 0 10px #00FF00, 0 0 20px #00FF00;
                filter: none;
            }
            25% {
                text-shadow: -3px 0 rgba(255, 0, 0, 0.8), 3px 0 rgba(0, 255, 255, 0.8), 0 0 15px #00FF00;
                filter: blur(0.3px);
            }
            50% {
                text-shadow: 2px 0 rgba(255, 0, 0, 0.6), -2px 0 rgba(0, 255, 255, 0.6), 0 0 20px #00FF00;
                filter: none;
            }
            75% {
                text-shadow: -2px 1px rgba(255, 0, 0, 0.7), 2px -1px rgba(0, 255, 255, 0.7), 0 0 15px #00FF00;
                filter: blur(0.2px);
            }
        }
        @keyframes chromaticBox {
            0%, 100% {
                box-shadow: 0 0 20px #00FF0088, inset 0 0 15px #00FF0022;
            }
            20% {
                box-shadow: -3px 0 15px rgba(255, 0, 0, 0.4), 3px 0 15px rgba(0, 255, 255, 0.4), 0 0 25px #00FF0088, inset 0 0 15px #00FF0022;
            }
            40% {
                box-shadow: 2px 0 10px rgba(255, 0, 0, 0.3), -2px 0 10px rgba(0, 255, 255, 0.3), 0 0 20px #00FF0088, inset 0 0 15px #00FF0022;
            }
            60% {
                box-shadow: -2px 1px 12px rgba(255, 0, 0, 0.35), 2px -1px 12px rgba(0, 255, 255, 0.35), 0 0 22px #00FF0088, inset 0 0 15px #00FF0022;
            }
            80% {
                box-shadow: 0 0 20px #00FF0088, inset 0 0 15px #00FF0022;
            }
        }
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
        @keyframes matrixRainFast {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
        }
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
        @keyframes rarityAuraGreen {
            0%, 100% { box-shadow: 0 0 15px #00FF0066, 0 0 30px #00FF0033; }
            50% { box-shadow: 0 0 25px #00FF0088, 0 0 50px #00FF0044; }
        }


        /* ============================================
           NEW: COSMIC CASINO ANIMATIONS
           ============================================ */
        
        /* Floating cosmic particles */
        @keyframes cosmicFloat {
            0%, 100% {
                transform: translateY(0) translateX(0) scale(1);
                opacity: 0.3;
            }
            25% {
                transform: translateY(-20px) translateX(10px) scale(1.1);
                opacity: 0.6;
            }
            50% {
                transform: translateY(-10px) translateX(-5px) scale(0.9);
                opacity: 0.4;
            }
            75% {
                transform: translateY(-30px) translateX(15px) scale(1.05);
                opacity: 0.5;
            }
        }
        
        /* Slow drift for background orbs */
        @keyframes cosmicDrift {
            0% {
                transform: translate(0, 0) rotate(0deg);
            }
            33% {
                transform: translate(30px, -20px) rotate(120deg);
            }
            66% {
                transform: translate(-20px, 10px) rotate(240deg);
            }
            100% {
                transform: translate(0, 0) rotate(360deg);
            }
        }
        
        /* Orbital ring rotation */
        @keyframes orbitalSpin {
            from { transform: translate(-50%, -50%) rotateX(70deg) rotateZ(0deg); }
            to { transform: translate(-50%, -50%) rotateX(70deg) rotateZ(360deg); }
        }
        
        @keyframes orbitalSpinReverse {
            from { transform: translate(-50%, -50%) rotateX(70deg) rotateZ(360deg); }
            to { transform: translate(-50%, -50%) rotateX(70deg) rotateZ(0deg); }
        }
        
        @keyframes orbitalSpinTilted {
            from { transform: translate(-50%, -50%) rotateX(60deg) rotateY(20deg) rotateZ(0deg); }
            to { transform: translate(-50%, -50%) rotateX(60deg) rotateY(20deg) rotateZ(360deg); }
        }
        
        /* Wheel idle breathing */
        @keyframes wheelBreathing {
            0%, 100% {
                transform: scale(1);
                filter: drop-shadow(0 8px 24px rgba(255, 170, 0, 0.3));
            }
            50% {
                transform: scale(1.02);
                filter: drop-shadow(0 12px 32px rgba(255, 170, 0, 0.45));
            }
        }
        
        /* Wheel hover pulse */
        @keyframes wheelHoverPulse {
            0%, 100% {
                transform: scale(1.05) translateY(-4px);
                filter: drop-shadow(0 16px 40px rgba(255, 170, 0, 0.5));
            }
            50% {
                transform: scale(1.07) translateY(-6px);
                filter: drop-shadow(0 20px 48px rgba(255, 170, 0, 0.6));
            }
        }
        
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
        @keyframes keyGlow {
            0%, 100% {
                box-shadow: 0 0 0 0 rgba(255, 170, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3);
            }
            50% {
                box-shadow: 0 0 20px 4px rgba(255, 170, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.3);
            }
        }
        
        /* Rarity tier indicator pulse */
        @keyframes rarityIndicatorPulse {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.1); opacity: 1; }
        }
        
        /* Text gradient shift */
        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        
        /* Strip item approach - items grow as they near center */
        @keyframes itemApproach {
            0% { transform: scale(0.85); opacity: 0.6; }
            50% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(0.85); opacity: 0.6; }
        }
        
        /* Speed lines effect */
        @keyframes speedLine {
            0% {
                transform: translateX(100%) scaleX(0);
                opacity: 0;
            }
            10% {
                opacity: 1;
            }
            100% {
                transform: translateX(-100%) scaleX(1);
                opacity: 0;
            }
        }
        
        /* Spin acceleration blur */
        @keyframes motionBlur {
            0% { filter: blur(0px); }
            50% { filter: blur(2px); }
            100% { filter: blur(0px); }
        }
        
        /* Center indicator heartbeat at slowdown */
        @keyframes indicatorHeartbeat {
            0%, 100% {
                transform: translateX(-50%) scale(1);
                filter: drop-shadow(0 0 8px ${COLORS.gold}cc);
            }
            15% {
                transform: translateX(-50%) scale(1.3);
                filter: drop-shadow(0 0 20px ${COLORS.gold}ff);
            }
            30% {
                transform: translateX(-50%) scale(1);
                filter: drop-shadow(0 0 8px ${COLORS.gold}cc);
            }
        }
        
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
        @keyframes itemMaterialize {
            0% {
                transform: scale(0) rotate(-180deg);
                opacity: 0;
                filter: blur(20px) brightness(3);
            }
            50% {
                transform: scale(1.2) rotate(10deg);
                opacity: 1;
                filter: blur(0px) brightness(1.5);
            }
            75% {
                transform: scale(0.95) rotate(-5deg);
                filter: brightness(1.2);
            }
            100% {
                transform: scale(1) rotate(0deg);
                opacity: 1;
                filter: blur(0px) brightness(1);
            }
        }
        
        /* Result glow burst */
        @keyframes glowBurst {
            0% {
                box-shadow: 0 0 0 0 var(--glow-color, ${COLORS.gold}), 0 0 0 0 var(--glow-color, ${COLORS.gold});
            }
            50% {
                box-shadow: 0 0 40px 10px var(--glow-color, ${COLORS.gold}), 0 0 80px 20px var(--glow-color, ${COLORS.gold}44);
            }
            100% {
                box-shadow: 0 0 20px 5px var(--glow-color, ${COLORS.gold}88), 0 0 40px 10px var(--glow-color, ${COLORS.gold}22);
            }
        }
        
        /* Letter by letter reveal */
        @keyframes letterReveal {
            0% {
                opacity: 0;
                transform: translateY(20px) rotateX(-90deg);
            }
            100% {
                opacity: 1;
                transform: translateY(0) rotateX(0deg);
            }
        }
        
        /* Vignette pulse */
        @keyframes vignettePulse {
            0%, 100% {
                opacity: 0;
            }
            50% {
                opacity: 1;
            }
        }
        
        /* Background gradient mesh animation */
        @keyframes meshGradient {
            0%, 100% {
                background-position: 0% 50%;
            }
            50% {
                background-position: 100% 50%;
            }
        }
        
        /* Star twinkle */
        @keyframes starTwinkle {
            0%, 100% {
                opacity: 0.2;
                transform: scale(0.8);
            }
            50% {
                opacity: 1;
                transform: scale(1.2);
            }
        }
        
        /* Button hover lift */
        @keyframes buttonLift {
            0% {
                transform: translateY(0);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            100% {
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            }
        }
        
        /* Glassmorphism shine */
        @keyframes glassShine {
            0% {
                background-position: -200% 0;
            }
            100% {
                background-position: 200% 0;
            }
        }
        
        /* Counter tick animation */
        @keyframes counterTick {
            0% {
                transform: translateY(0);
            }
            50% {
                transform: translateY(-100%);
            }
            50.01% {
                transform: translateY(100%);
            }
            100% {
                transform: translateY(0);
            }
        }
        
        /* Ambient orb float */
        @keyframes ambientFloat {
            0%, 100% {
                transform: translate(0, 0);
                opacity: 0.3;
            }
            25% {
                transform: translate(50px, -30px);
                opacity: 0.5;
            }
            50% {
                transform: translate(20px, -60px);
                opacity: 0.4;
            }
            75% {
                transform: translate(-30px, -20px);
                opacity: 0.35;
            }
        }
        
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
        @keyframes centerRipple {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 0.8;
            }
            100% {
                transform: translate(-50%, -50%) scale(2);
                opacity: 0;
            }
        }
        
        /* Particle explosion */
        @keyframes particleExplode {
            0% {
                transform: translate(0, 0) scale(1);
                opacity: 1;
            }
            100% {
                transform: translate(var(--px, 0), var(--py, 0)) scale(0);
                opacity: 0;
            }
        }
        
        /* Confetti fall */
        @keyframes confettiFall {
            0% {
                transform: translateY(-100%) rotate(0deg);
                opacity: 1;
            }
            100% {
                transform: translateY(100vh) rotate(720deg);
                opacity: 0;
            }
        }
        
        /* Strip slowdown tension */
        @keyframes stripTension {
            0%, 40% {
                filter: blur(0);
            }
            50% {
                filter: blur(1px);
            }
            60%, 100% {
                filter: blur(0);
            }
        }
        
        /* Header text shimmer */
        @keyframes headerShimmer {
            0% {
                background-position: -100% 0;
            }
            100% {
                background-position: 200% 0;
            }
        }
        
        /* Spin button ready pulse */
        @keyframes spinReady {
            0%, 100% {
                box-shadow: 0 0 0 0 rgba(255, 170, 0, 0.4);
            }
            50% {
                box-shadow: 0 0 0 15px rgba(255, 170, 0, 0);
            }
        }
        
        /* Navigation button glow */
        @keyframes navGlow {
            0%, 100% {
                background: rgba(255, 255, 255, 0.03);
            }
            50% {
                background: rgba(255, 255, 255, 0.08);
            }
        }
        
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
        @keyframes rarityFlash {
            0%, 100% {
                filter: brightness(1);
            }
            50% {
                filter: brightness(1.5);
            }
        }
        
        /* Mobile tap feedback */
        @keyframes tapFeedback {
            0% {
                transform: scale(1);
            }
            50% {
                transform: scale(0.95);
            }
            100% {
                transform: scale(1);
            }
        }
        
        /* Odds bar fill */
        @keyframes barFill {
            from {
                transform: scaleX(0);
            }
            to {
                transform: scaleX(1);
            }
        }
        
        /* Achievement unlock */
        @keyframes achievementUnlock {
            0% {
                transform: translateY(100px) scale(0.5);
                opacity: 0;
            }
            50% {
                transform: translateY(-10px) scale(1.05);
                opacity: 1;
            }
            100% {
                transform: translateY(0) scale(1);
                opacity: 1;
            }
        }
        
        /* ============================================
           PHASE 2: SPINNING STRIP ENHANCEMENTS
           ============================================ */
        
        /* Speed lines - horizontal */
        @keyframes speedLineHorizontal {
            0% {
                transform: translateX(100%);
                opacity: 0;
            }
            10% {
                opacity: 0.8;
            }
            90% {
                opacity: 0.6;
            }
            100% {
                transform: translateX(-200%);
                opacity: 0;
            }
        }
        
        /* Speed lines - vertical (mobile) */
        @keyframes speedLineVertical {
            0% {
                transform: translateY(100%);
                opacity: 0;
            }
            10% {
                opacity: 0.8;
            }
            90% {
                opacity: 0.6;
            }
            100% {
                transform: translateY(-200%);
                opacity: 0;
            }
        }
        
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
        @keyframes itemApproachScale {
            0% { transform: scale(0.85); }
            50% { transform: scale(1.05); }
            100% { transform: scale(0.85); }
        }
        
        /* Strip container glow pulse during spin */
        @keyframes stripGlowPulse {
            0%, 100% {
                box-shadow: 0 0 20px var(--glow-color, ${COLORS.gold}33), 
                            inset 0 0 30px rgba(0,0,0,0.5);
            }
            50% {
                box-shadow: 0 0 40px var(--glow-color, ${COLORS.gold}55), 
                            inset 0 0 40px rgba(0,0,0,0.3);
            }
        }
        
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
        @keyframes resultMaterialize {
            0% {
                transform: scale(0.3) rotate(-10deg);
                opacity: 0;
                filter: blur(10px) brightness(2);
            }
            50% {
                transform: scale(1.15) rotate(3deg);
                opacity: 1;
                filter: blur(0) brightness(1.3);
            }
            75% {
                transform: scale(0.95) rotate(-1deg);
                filter: brightness(1.1);
            }
            100% {
                transform: scale(1) rotate(0deg);
                opacity: 1;
                filter: blur(0) brightness(1);
            }
        }
        
        /* Result name letter reveal */
        @keyframes letterPopIn {
            0% {
                opacity: 0;
                transform: translateY(20px) scale(0.5);
            }
            60% {
                transform: translateY(-5px) scale(1.1);
            }
            100% {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        /* Vignette color pulse on result */
        @keyframes vignettePulseColor {
            0% {
                box-shadow: inset 0 0 100px 20px var(--vignette-color, transparent);
            }
            50% {
                box-shadow: inset 0 0 150px 40px var(--vignette-color, transparent);
            }
            100% {
                box-shadow: inset 0 0 80px 10px transparent;
            }
        }
        
        /* ============================================
           PHASE 3: SUBTLE RESULT ENHANCEMENTS
           ============================================ */
        
        /* Subtle light sweep across item */
        @keyframes subtleShineSweep {
            0% {
                transform: translateX(-100%) skewX(-15deg);
                opacity: 0;
            }
            10% {
                opacity: 1;
            }
            90% {
                opacity: 1;
            }
            100% {
                transform: translateX(200%) skewX(-15deg);
                opacity: 0;
            }
        }
        
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
        @keyframes bgGlowPulse {
            0%, 100% {
                opacity: 0.4;
                transform: scale(1);
            }
            50% {
                opacity: 0.7;
                transform: scale(1.05);
            }
        }
        
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
        @keyframes cardBorderGlow {
            0%, 100% {
                border-color: rgba(255, 255, 255, 0.06);
            }
            50% {
                border-color: rgba(255, 255, 255, 0.12);
            }
        }
        
        /* Stats counter animation */
        @keyframes statPop {
            0% {
                transform: scale(0.8);
                opacity: 0;
            }
            60% {
                transform: scale(1.1);
            }
            100% {
                transform: scale(1);
                opacity: 1;
            }
        }
        
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
        @keyframes navButtonGlow {
            0%, 100% {
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            50% {
                box-shadow: 0 4px 16px rgba(255, 170, 0, 0.15);
            }
        }
        
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
        @keyframes recursionFlash {
            0% { opacity: 0; }
            5% { opacity: 0.8; }
            10% { opacity: 0.2; }
            15% { opacity: 0.6; }
            25% { opacity: 0; }
            100% { opacity: 0; }
        }
        
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
        
        /* Matrix code particle float */
        @keyframes matrixParticleFloat {
            0% { 
                transform: translateY(100%) scale(0.5);
                opacity: 0;
            }
            10% { 
                opacity: 1;
            }
            90% { 
                opacity: 0.6;
            }
            100% { 
                transform: translateY(-100vh) scale(1);
                opacity: 0;
            }
        }
        
        /* Screen tear effect */
        @keyframes screenTear {
            0%, 100% { 
                clip-path: inset(0 0 0 0);
            }
            20% { 
                clip-path: inset(10% 0 85% 0);
            }
            21% { 
                clip-path: inset(0 0 0 0);
            }
            40% { 
                clip-path: inset(60% 0 30% 0);
            }
            41% { 
                clip-path: inset(0 0 0 0);
            }
            60% { 
                clip-path: inset(25% 0 65% 0);
            }
            61% { 
                clip-path: inset(0 0 0 0);
            }
            80% { 
                clip-path: inset(80% 0 10% 0);
            }
            81% { 
                clip-path: inset(0 0 0 0);
            }
        }
        
        /* Data corruption glitch */
        @keyframes dataCorruption {
            0%, 100% { 
                transform: translate(0, 0) skewX(0deg);
                filter: hue-rotate(0deg);
            }
            5% { 
                transform: translate(-5px, 2px) skewX(-2deg);
                filter: hue-rotate(10deg);
            }
            10% { 
                transform: translate(5px, -2px) skewX(2deg);
                filter: hue-rotate(-10deg);
            }
            15% { 
                transform: translate(-3px, 0) skewX(-1deg);
                filter: hue-rotate(5deg);
            }
            20% { 
                transform: translate(0, 0) skewX(0deg);
                filter: hue-rotate(0deg);
            }
        }
        
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
        @keyframes recursionIndicatorIntense {
            0%, 100% {
                filter: drop-shadow(0 0 15px ${COLORS.recursion}) drop-shadow(0 0 30px ${COLORS.recursion});
                transform: scale(1);
            }
            50% {
                filter: drop-shadow(0 0 25px ${COLORS.recursion}) drop-shadow(0 0 50px ${COLORS.recursion}) drop-shadow(0 0 75px ${COLORS.recursion}88);
                transform: scale(1.15);
            }
        }
        
        /* Cyberpunk scanline sweep */
        @keyframes cyberpunkScan {
            0% { 
                transform: translateY(-100%);
                opacity: 0;
            }
            10% {
                opacity: 1;
            }
            90% {
                opacity: 1;
            }
            100% { 
                transform: translateY(200%);
                opacity: 0;
            }
        }
        
        /* Matrix item highlight */
        @keyframes matrixItemHighlight {
            0%, 100% {
                box-shadow: 0 0 15px ${COLORS.recursion}88, inset 0 0 10px ${COLORS.recursion}22;
                border-color: ${COLORS.recursion}aa;
            }
            50% {
                box-shadow: 0 0 25px ${COLORS.recursion}cc, 0 0 50px ${COLORS.recursion}66, inset 0 0 20px ${COLORS.recursion}33;
                border-color: ${COLORS.recursion};
            }
        }
        
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
    `}</style>
);