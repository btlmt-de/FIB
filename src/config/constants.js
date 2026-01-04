const isDev = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE_URL = isDev
    ? 'http://localhost:3001'
    : '';

// Consistent color scheme matching the FIB website
export const COLORS = {
    bg: '#1a1a2e',
    bgLight: '#252542',
    bgLighter: '#2d2d4a',
    text: '#e0e0e0',
    textMuted: '#888',
    border: '#3d3d5c',
    accent: '#5865F2',
    gold: '#FFAA00',
    aqua: '#55FFFF',
    green: '#55FF55',
    purple: '#AA00AA',
    red: '#FF5555',
    orange: '#FF8800'
};

export const IMAGE_BASE_URL = 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/fib';
export const WHEEL_TEXTURE_URL = 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/item/wheel.png';

// Wheel animation constants
export const ITEM_WIDTH = 80;
export const SPIN_DURATION = 7000;
export const STRIP_LENGTH = 80;
export const FINAL_INDEX = STRIP_LENGTH - 8;

// Special Items Configuration (fallbacks, actual data comes from API)
export const TEAM_MEMBERS = [
    { name: 'eltobito', username: 'eltobito', chance: 0.00001, rarity: 'legendary' },
    { name: 'apppaa', username: 'apppaa', chance: 0.0001, rarity: 'legendary' },
    { name: 'threeseconds', username: 'threeseconds', chance: 0.0003, rarity: 'legendary' },
    { name: 'CH0RD', username: 'CH0RD', chance: 0.0004, rarity: 'legendary' },
    { name: 'stupxd', username: 'stupxd', chance: 0.0005, rarity: 'legendary' },
];

export const RARE_MEMBERS = [
    { name: 'shabana02', username: 'shabana02', chance: 0.0007, rarity: 'rare' },
    { name: 'McPlayHD', username: 'McPlayHD', chance: 0.00067, rarity: 'rare' },
    { name: 'Owen1212055', username: 'Owen1212055', chance: 0.0006, rarity: 'rare' },
    { name: '170yt', username: '170yt', chance: 0.00069, rarity: 'rare' },
    { name: 'BastiGHG', username: 'BastiGHG', chance: 0.0006, rarity: 'rare' },
    { name: 'LennraZ', username: 'LennraZ', chance: 0.00072, rarity: 'rare' },
    { name: 'NubPanda', username: 'NubPanda', chance: 0.0007, rarity: 'rare' },
    { name: 'Johnlongears', username: 'Johnlongears', chance: 0.00068, rarity: 'rare' },
    { name: 'steez', username: 'steez', chance: 0.00062, rarity: 'rare' },
];

// Mythic items - extremely rare
export const MYTHIC_ITEMS = [
    {
        name: 'Cavendish',
        texture: 'mythic_cavendish',
        chance: 0.000001, // 0.0001%
        type: 'mythic',
        imageUrl: 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/item/cavendish.png'
    },
    {
        name: 'Jimbo',
        texture: 'mythic_jimbo',
        chance: 0.000005, // 0.0005%
        type: 'mythic',
        imageUrl: '/jimbo.png'
    }
];

// Legacy single mythic export for backwards compatibility
export const MYTHIC_ITEM = MYTHIC_ITEMS[0];

export const EVENT_ITEM = {
    name: 'BONUS EVENT',
    texture: 'event_bonus',
    chance: 0.9,
    type: 'event',
    imageUrl: '/event.png' // From public folder
};

// Available bonus events
export const BONUS_EVENTS = [
    { id: 'triple_spin', name: 'Triple Spin', description: '3 bonus spins!', color: COLORS.orange },
    { id: 'lucky_spin', name: 'Lucky Spin', description: 'Equal chance for all items!', color: COLORS.green },
];