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
    `}</style>
);