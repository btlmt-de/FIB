// ============================================
// Client-side utility functions
// ============================================

import { IMAGE_BASE_URL, MYTHIC_ITEMS, INSANE_ITEMS, COLORS } from '../config/constants.js';

// Format chance as a readable percentage (strips trailing zeros)
export function formatChance(chance) {
    if (!chance || chance === 0) return '0';

    const percent = chance * 100;

    let formatted;
    if (percent >= 1) {
        formatted = percent.toFixed(1);
    } else if (percent >= 0.1) {
        formatted = percent.toFixed(2);
    } else if (percent >= 0.01) {
        // Show 3 decimals for values like 0.072%
        formatted = percent.toFixed(3);
    } else {
        // For very small percentages like 0.001%, show up to 4 decimal places
        formatted = percent.toFixed(4);
    }

    // Strip trailing zeros (0.0020 -> 0.002, 1.0 -> 1)
    return formatted.replace(/\.?0+$/, '');
}

// Format time ago string
export function formatTimeAgo(dateString) {
    if (!dateString) return 'Unknown';

    // Parse the date - SQLite returns UTC timestamps without 'Z' suffix
    // Add 'Z' if not present to ensure proper UTC parsing
    let dateStr = dateString;
    if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
        dateStr = dateStr + 'Z';
    }

    const date = new Date(dateStr);

    // Validate date
    if (isNaN(date.getTime())) return 'Unknown';

    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    // Handle negative values (future dates due to clock skew)
    if (seconds < 0) return 'Just now';

    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    try {
        return date.toLocaleDateString();
    } catch {
        return 'Unknown';
    }
}

// Get Minecraft head URL from username
export function getMinecraftHeadUrl(username) {
    return `https://mc-heads.net/avatar/${username}/64`;
}

// Get Discord avatar URL
export function getDiscordAvatarUrl(discordId, avatarHash, size = 64) {
    if (avatarHash) {
        const format = avatarHash.startsWith('a_') ? 'gif' : 'png';
        return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${format}?size=${size}`;
    }
    // Default avatar based on discriminator
    try {
        if (!discordId || !/^\d+$/.test(String(discordId))) {
            return `https://cdn.discordapp.com/embed/avatars/0.png`;
        }
        const defaultIndex = (BigInt(discordId) >> 22n) % 6n;
        return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
    } catch {
        return `https://cdn.discordapp.com/embed/avatars/0.png`;
    }
}

// Sanitize strings for display
export function sanitizeString(str) {
    if (!str) return '';
    return String(str)
        .replace(/[<>]/g, '')
        .trim()
        .slice(0, 100);
}

// Validate ID format
export function isValidId(id) {
    return typeof id === 'number' && Number.isInteger(id) && id > 0;
}

// ============================================
// Item Type Detection Functions
// ============================================

// Insane color constant - bright gold, distinct from all other rarities
export const INSANE_COLOR = '#FFD700';

export function isInsaneItem(item) {
    return item?.isInsane || item?.type === 'insane' || item?.texture?.startsWith('insane_');
}

export function isSpecialItem(item) {
    return item?.isSpecial || item?.type === 'legendary' || item?.texture?.startsWith('special_');
}

export function isRareItem(item) {
    return item?.isRare || item?.type === 'rare' || item?.texture?.startsWith('rare_');
}

export function isMythicItem(item) {
    return item?.isMythic || item?.type === 'mythic' || item?.texture?.startsWith('mythic_');
}

export function isEventItem(item) {
    return item?.isEvent || item?.type === 'event' || item?.texture?.startsWith('event_');
}

export function isRecursionItem(item) {
    return item?.isRecursion || item?.type === 'recursion' || item?.texture === 'recursion';
}

// ============================================
// Item Display Helpers
// ============================================

// Get image URL for an item (works with both full item objects and history entries)
export function getItemImageUrl(item) {
    if (!item) return `${IMAGE_BASE_URL}/barrier.png`;

    // Handle different data formats (history, collection, activity feed)
    const texture = item.texture || item.item_texture;
    const type = item.type || item.item_type || item.item_rarity;
    const username = item.username || (texture?.includes('_') ? texture.split('_').slice(1).join('_') : null);

    // Insane items have custom image URLs
    if (type === 'insane' || texture?.startsWith('insane_')) {
        if (item.imageUrl) return item.imageUrl;
        // Try to find matching insane item
        const insane = INSANE_ITEMS?.find(i => i.texture === texture);
        if (insane?.imageUrl) return insane.imageUrl;
        // Fallback for known insane items
        if (texture === 'insane_cavendish') {
            return 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/item/cavendish.png';
        }
    }

    // Mythic items have custom image URLs
    if (type === 'mythic' || texture?.startsWith('mythic_')) {
        if (item.imageUrl) return item.imageUrl;
        // Try to find matching mythic item
        const mythic = MYTHIC_ITEMS?.find(m => m.texture === texture);
        if (mythic?.imageUrl) return mythic.imageUrl;
        // Fallback for known mythics
        if (texture === 'mythic_jimbo') return '/jimbo.png';
        if (texture === 'mythic_gros_michel') {
            return 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/item/gros_michel.png';
        }
    }

    // Player heads (legendaries and rares with usernames)
    if (item.username) {
        return getMinecraftHeadUrl(item.username);
    }

    // Try to extract username from texture for special/rare/mythic items
    if ((type === 'legendary' || type === 'rare' || type === 'mythic' || texture?.startsWith('special_') || texture?.startsWith('rare_') || texture?.startsWith('mythic_')) && texture?.includes('_')) {
        const extractedUsername = texture.split('_').slice(1).join('_');
        if (extractedUsername && !['cavendish', 'jimbo', 'gros_michel'].includes(extractedUsername.toLowerCase())) {
            return getMinecraftHeadUrl(extractedUsername);
        }
    }

    // Event items use event texture
    if (type === 'event' || texture?.startsWith('event_')) {
        return '/event.png';
    }

    // Recursion items use wheel texture
    if (type === 'recursion' || texture === 'recursion') {
        return 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/item/wheel.png';
    }

    // Regular items
    if (texture) {
        return `${IMAGE_BASE_URL}/${texture}.png`;
    }

    return `${IMAGE_BASE_URL}/barrier.png`;
}

// Get color for item based on rarity
export function getItemColor(item) {
    if (isInsaneItem(item)) return INSANE_COLOR;
    if (isMythicItem(item)) return COLORS.aqua;
    if (isSpecialItem(item)) return COLORS.purple;
    if (isRareItem(item)) return COLORS.red;
    if (isRecursionItem(item)) return COLORS.recursion;
    if (isEventItem(item)) return COLORS.gold;
    return COLORS.gold;
}