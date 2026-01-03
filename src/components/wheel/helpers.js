import { IMAGE_BASE_URL } from './constants';

export function formatChance(chance) {
    if (!chance) return '0';
    const percent = chance * 100;
    return parseFloat(percent.toFixed(6)).toString();
}

export function getMinecraftHeadUrl(username) {
    return `https://minotar.net/helm/${username}/64`;
}

export function formatTimeAgo(dateString) {
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(dateString).toLocaleDateString();
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
        return 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/item/wheel.png';
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