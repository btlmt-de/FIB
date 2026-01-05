import { IMAGE_BASE_URL, MYTHIC_ITEMS } from '../config/constants';

export function formatChance(chance) {
    if (!chance) return '0';
    const percent = chance * 100;
    return parseFloat(percent.toFixed(6)).toString();
}

export function getMinecraftHeadUrl(username) {
    return `https://minotar.net/helm/${username}/64`;
}

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

// Helper to get Discord avatar URL
export function getDiscordAvatarUrl(discordId, avatarHash, size = 64) {
    if (avatarHash) {
        const format = avatarHash.startsWith('a_') ? 'gif' : 'png';
        return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${format}?size=${size}`;
    }
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

// Item type detection helpers
export function isSpecialItem(item) {
    return item?.isSpecial || item?.type === 'legendary' || item?.texture?.startsWith('special_');
}

export function isRareItem(item) {
    return item?.isRare || item?.type === 'rare' || item?.texture?.startsWith('rare_');
}

export function isMythicItem(item) {
    return item?.isMythic || item?.type === 'mythic' || item?.texture === 'mythic_cavendish' || item?.texture?.startsWith('mythic_');
}

export function isEventItem(item) {
    return item?.isEvent || item?.type === 'event' || item?.texture?.startsWith('event_');
}

// Get image URL for an item (works with both full item objects and history entries)
export function getItemImageUrl(item) {
    if (!item) return `${IMAGE_BASE_URL}/barrier.png`;

    // Handle different data formats (history, collection, activity feed)
    const texture = item.texture || item.item_texture;
    const type = item.type || item.item_type || item.item_rarity;
    const username = item.username || (texture?.includes('_') ? texture.split('_').slice(1).join('_') : null);

    // Mythic items have custom image URLs
    if (type === 'mythic' || texture?.startsWith('mythic_')) {
        if (item.imageUrl) return item.imageUrl;
        // Try to find matching mythic item
        const mythic = MYTHIC_ITEMS?.find(m => m.texture === texture);
        if (mythic?.imageUrl) return mythic.imageUrl;
        // Fallback for known mythics
        if (texture === 'mythic_cavendish') {
            return 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/item/cavendish.png';
        }
        if (texture === 'mythic_jimbo') return '/jimbo.png';
    }

    // Player heads (legendaries and rares with usernames)
    if (item.username) {
        return getMinecraftHeadUrl(item.username);
    }

    // Try to extract username from texture for special/rare items
    if ((type === 'legendary' || type === 'rare' || texture?.startsWith('special_') || texture?.startsWith('rare_')) && texture?.includes('_')) {
        const extractedUsername = texture.split('_').slice(1).join('_');
        if (extractedUsername) return getMinecraftHeadUrl(extractedUsername);
    }

    // Event items use event texture
    if (type === 'event' || texture?.startsWith('event_')) {
        return '/event.png';
    }

    // Regular items
    if (texture) {
        return `${IMAGE_BASE_URL}/${texture}.png`;
    }

    return `${IMAGE_BASE_URL}/barrier.png`;
}

// Get color for item based on rarity
export function getItemColor(item, COLORS) {
    if (isMythicItem(item)) return COLORS.aqua;
    if (isSpecialItem(item)) return COLORS.purple;
    if (isRareItem(item)) return COLORS.red;
    if (isEventItem(item)) return COLORS.gold;
    return COLORS.gold;
}