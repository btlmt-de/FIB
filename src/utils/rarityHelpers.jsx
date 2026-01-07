// ============================================
// Rarity Helpers - Shared utility for rarity-related functions
// ============================================

import React from 'react';
import { Sparkles, Star, Diamond, Circle, Zap, Crown } from 'lucide-react';
import { COLORS } from '../config/constants';

/**
 * Get the color associated with a rarity level
 * @param {string} rarity - The rarity type (insane, mythic, legendary, rare, event, or default)
 * @returns {string} The color code for the rarity
 */
export function getRarityColor(rarity) {
    switch (rarity) {
        case 'insane': return COLORS.insane;
        case 'mythic': return COLORS.aqua;
        case 'legendary': return COLORS.purple;
        case 'rare': return COLORS.red;
        case 'event': return COLORS.orange;
        default: return COLORS.gold;
    }
}

/**
 * Get a Lucide React icon component for a rarity level
 * @param {string} rarity - The rarity type
 * @param {number} size - Icon size in pixels (default 14)
 * @param {boolean} colored - Whether to apply rarity color (default true)
 * @returns {React.ReactElement|null} The icon component or null
 */
export function getRarityIcon(rarity, size = 14, colored = true) {
    const color = colored ? getRarityColor(rarity) : undefined;

    switch (rarity) {
        case 'insane': return <Crown size={size} color={color} />;
        case 'mythic': return <Sparkles size={size} color={color} />;
        case 'legendary': return <Star size={size} color={color} />;
        case 'rare': return <Diamond size={size} color={color} />;
        case 'event': return <Zap size={size} color={color} />;
        default: return null;
    }
}

/**
 * Get rarity badge info (label, color, and icon)
 * @param {string} rarity - The rarity type
 * @param {number} iconSize - Icon size in pixels (default 10)
 * @returns {{ label: string, color: string, icon: React.ReactElement }}
 */
export function getRarityBadge(rarity, iconSize = 10) {
    const color = getRarityColor(rarity);

    switch (rarity) {
        case 'insane':
            return { label: 'Insane', color, icon: <Crown size={iconSize} /> };
        case 'mythic':
            return { label: 'Mythic', color, icon: <Sparkles size={iconSize} /> };
        case 'legendary':
            return { label: 'Legendary', color, icon: <Star size={iconSize} /> };
        case 'rare':
            return { label: 'Rare', color, icon: <Diamond size={iconSize} /> };
        case 'event':
            return { label: 'Event', color, icon: <Zap size={iconSize} /> };
        default:
            return { label: 'Common', color: COLORS.gold, icon: <Circle size={iconSize} /> };
    }
}

/**
 * Get Lucide icon component for rarity (for text-only contexts like AdminPanel)
 * Returns the same icon as getRarityIcon but without color applied
 * @param {string} rarity - The rarity type
 * @param {number} size - Icon size in pixels (default 14)
 * @returns {React.ReactElement|null} The icon component
 */
export function getRarityEmoji(rarity, size = 14) {
    // Using Lucide icons instead of unicode emojis for consistency
    switch (rarity) {
        case 'insane': return <Crown size={size} />;
        case 'mythic': return <Sparkles size={size} />;
        case 'legendary': return <Star size={size} />;
        case 'rare': return <Diamond size={size} />;
        case 'event': return <Zap size={size} />;
        default: return <Circle size={size} />;
    }
}

/**
 * Get CSS gradient for rarity backgrounds
 * @param {string} rarity - The rarity type
 * @param {number} opacity - Opacity value 0-1 (default 0.1)
 * @returns {string} CSS gradient string
 */
export function getRarityGradient(rarity, opacity = 0.1) {
    const color = getRarityColor(rarity);
    const alphaHex = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return `linear-gradient(135deg, ${color}${alphaHex} 0%, transparent 100%)`;
}

/**
 * Get rarity order for sorting (lower = rarer)
 * @param {string} rarity - The rarity type
 * @returns {number} Sort order value
 */
export function getRarityOrder(rarity) {
    switch (rarity) {
        case 'insane': return 0;
        case 'mythic': return 1;
        case 'legendary': return 2;
        case 'rare': return 3;
        case 'event': return 4;
        default: return 99;
    }
}