// ============================================
// Achievement Icon Whitelist
// ============================================
// Instead of importing all 1000+ lucide-react icons with `import * as LucideIcons`,
// we explicitly import only the icons used by achievements.
// This reduces bundle size by ~150-200KB.
//
// NOTE: If an icon doesn't exist in your lucide-react version,
// the AchievementIcon component will fall back to Award.

import {
    // Beginner/General
    Disc3,
    CircleDot,
    HelpCircle,

    // Collection
    Gem,
    Sparkles,
    Crown,
    Package,
    Archive,
    Trophy,
    Eclipse,
    Sparkle,

    // Spins
    RefreshCw,
    Zap,
    Orbit,
    Flame,
    Infinity,
    Star,
    Mountain,
    Code,
    Dice5,
    Frown,
    Skull,
    Ghost,

    // Events
    Gift,
    PartyPopper,
    Target,
    Rocket,
    Layers3,
    Clover,

    // Duplicates
    Layers,
    Castle,
    Copy,
    Files,        // Fallback for FolderCopy which doesn't exist
    Database,
    HardDrive,
    CopyPlus,
    House,

    // Special/Hidden
    RotateCcw,
    RefreshCcw,
    Coins,
    Moon,
    Sunrise,
    HeartCrack,

    // Fallback
    Award
} from 'lucide-react';

// Explicit mapping of icon names to components
// Only icons actually used in achievements are included
// FolderCopy doesn't exist in lucide-react, so we map it to Files
export const ACHIEVEMENT_ICON_MAP = {
    // Beginner/General
    Disc3,
    CircleDot,
    HelpCircle,

    // Collection
    Gem,
    Sparkles,
    Crown,
    Package,
    Archive,
    Trophy,
    Eclipse,
    Sparkle,

    // Spins
    RefreshCw,
    Zap,
    Orbit,
    Flame,
    Infinity,
    Star,
    Mountain,
    Code,
    Dice5,
    Frown,
    Skull,
    Ghost,

    // Events
    Gift,
    PartyPopper,
    Target,
    Rocket,
    Layers3,
    Clover,

    // Duplicates
    Layers,
    Castle,
    Copy,
    FolderCopy: Files,  // FolderCopy doesn't exist, use Files as substitute
    Database,
    HardDrive,
    CopyPlus,
    House,

    // Special/Hidden
    RotateCcw,
    RefreshCcw,
    Coins,
    Moon,
    Sunrise,
    HeartCrack,

    // Fallback
    Award
};

// Default fallback icon
export const DEFAULT_ACHIEVEMENT_ICON = Award;

/**
 * Get an achievement icon component by name
 * @param {string} name - The icon name (e.g., 'Trophy', 'Star')
 * @returns {React.ComponentType} The icon component or fallback
 */
export function getAchievementIcon(name) {
    return ACHIEVEMENT_ICON_MAP[name] || DEFAULT_ACHIEVEMENT_ICON;
}

/**
 * AchievementIcon component - renders an icon by name from the whitelist
 * Use this instead of dynamically accessing LucideIcons[name]
 */
export function AchievementIcon({ name, size = 16, color, style = {} }) {
    const IconComponent = ACHIEVEMENT_ICON_MAP[name] || DEFAULT_ACHIEVEMENT_ICON;
    return <IconComponent size={size} color={color} style={style} />;
}