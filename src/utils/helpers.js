import { IMAGE_BASE_URL } from '../config/constants';

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
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    // Handle negative values (future dates due to clock skew)
    if (seconds < 0) return 'Just now';

    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
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

// Get image URL for an item
export function getItemImageUrl(item) {
    if (!item) return `${IMAGE_BASE_URL}/barrier.png`;

    // Mythic items have custom image URLs
    if (isMythicItem(item) && item.imageUrl) {
        return item.imageUrl;
    }

    // Player heads (legendaries and rares)
    if (item.username) {
        return getMinecraftHeadUrl(item.username);
    }

    // Event items use wheel texture
    if (isEventItem(item)) {
        return '/event.png';
    }

    // Regular items
    return `${IMAGE_BASE_URL}/${item.texture}.png`;
}

// Get color for item based on rarity
export function getItemColor(item, COLORS) {
    if (isMythicItem(item)) return COLORS.aqua;
    if (isSpecialItem(item)) return COLORS.purple;
    if (isRareItem(item)) return COLORS.red;
    if (isEventItem(item)) return COLORS.gold;
    return COLORS.gold;
}