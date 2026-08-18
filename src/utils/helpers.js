// ============================================
// Client-side utility functions
// ============================================

import { IMAGE_BASE_URL, CUSTOM_IMAGE_BASE_URL, MYTHIC_ITEMS, INSANE_ITEMS, EXOTIC_ITEMS, TEAM_MEMBERS, COLORS } from '../config/constants.js';
import { getRarityColor } from './rarityHelpers.jsx';

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

/**
 * A timestamp as the wheel backend sends it, as a Date — or null if unparseable.
 *
 * SQLite returns UTC timestamps with no 'Z' suffix, and a bare "2026-08-16
 * 12:00:00" is parsed as *local* time by every browser, so every relative time on
 * the site would be wrong by the viewer's UTC offset. Suffixing it is the fix, and
 * the check has to tolerate the values that already carry a zone: a trailing 'Z',
 * a '+hh:mm', or a '-hh:mm' — the last one searched from index 10 so the date's own
 * hyphens do not count as one.
 *
 * Extracted so there is exactly one copy of that rule. It was inline in
 * formatTimeAgo, and the second caller that needed a different *wording* of the
 * same instant would otherwise have copied the parsing along with it.
 */
export function parseServerDate(dateString) {
    if (!dateString) return null;

    let dateStr = dateString;
    if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
        dateStr = dateStr + 'Z';
    }

    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
}

/**
 * How long to hold a live drop back before showing it, in ms.
 *
 * The server resolves a spin the moment the request lands and broadcasts it over
 * SSE straight away, but the client animates the reel for ~4s afterwards. So every
 * surface that renders a live drop is holding the answer to a question the reel has
 * not finished asking, and anything that renders it immediately is a spoiler: the
 * ticker was showing you your own item while your wheel was still turning.
 *
 * Measured from the drop's own `created_at` rather than from arrival, which is what
 * makes it correct for the cases that are not a simple local spin — a drop from
 * another player that reaches you late, a tab that was backgrounded, a reconnect
 * that replays recent events. An item that is already older than the reveal window
 * has no animation left to wait for and shows at once.
 *
 * This rule existed three times before it existed once: the toast had it inline,
 * the celebration has its own per-user variant, and First Blood hardcodes 5000. The
 * feed had no copy at all, which is why it was the surface that leaked.
 */
export const SPIN_REVEAL_MS = 4500;

export function spinRevealDelay(dateString, now = Date.now()) {
    const date = parseServerDate(dateString);
    if (!date) return SPIN_REVEAL_MS;

    const age = Math.max(0, now - date.getTime());
    return Math.max(0, SPIN_REVEAL_MS - age);
}

// Format time ago string
export function formatTimeAgo(dateString) {
    const date = parseServerDate(dateString);
    if (!date) return 'Unknown';

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

// Parse an activity_feed timestamp to epoch ms.
// SQLite hands these back as "YYYY-MM-DD HH:MM:SS" with no zone marker, which Safari
// refuses outright and other engines read as local time. Normalise to UTC first.
// Returns 0 for anything unparseable so callers can sort without guarding every entry.
export function parseActivityDate(createdAt) {
    if (!createdAt) return 0;
    const hasZone = createdAt.includes('Z') || createdAt.includes('+');
    const time = new Date(hasZone ? createdAt : createdAt.replace(' ', 'T') + 'Z').getTime();
    return Number.isFinite(time) ? time : 0;
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

// Insane color constant.
//
// This was "bright gold, distinct from all other rarities" and is neither any
// more: #FFD700 now belongs to LEGENDARY, and insane has no flat colour at all —
// it renders as the iridescent slick (see .fib-holo in index.css). What remains
// here is the platinum fallback for the handful of places that can only take one
// hex. Prefer getRarityColor('insane') / getRarityStops('insane') from
// utils/rarityHelpers.jsx; this export is kept only so existing importers do not
// silently pick up legendary's gold.
export const INSANE_COLOR = '#F2ECFF';

export function isInsaneItem(item) {
    return item?.isInsane || item?.type === 'insane' || item?.texture?.startsWith('insane_');
}

export function isSpecialItem(item) {
    return item?.isSpecial || item?.type === 'legendary' || item?.texture?.startsWith('special_');
}

// Exotic sits between legendary and rare. Note the prefix is `exotic_`, matching
// the tier name — `special_` means legendary here for historical reasons and that
// mismatch is not worth repeating.
export function isExoticItem(item) {
    return item?.isExotic || item?.type === 'exotic' || item?.texture?.startsWith('exotic_');
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

    // Exotic items are the plugin's custom items, drawn from the vendored pack
    // textures in public/fib-custom. Checked before everything else because their
    // textures are whole names rather than `<tier>_<username>`, and the username
    // split above would otherwise hand "wheel_of_fortune" to the player-head
    // branch further down and render a Minecraft head for a nether star.
    if (type === 'exotic' || texture?.startsWith('exotic_')) {
        if (item.imageUrl) return item.imageUrl;
        // The API's own spelling. A spin result arrives camelCased because spin.js
        // maps it, but a row straight off /api/items keeps the column name
        // `image_url` — and the backend is the authoritative roster, so an exotic
        // item it knows about and EXOTIC_ITEMS does not would have fallen all the
        // way through to the barrier despite carrying a perfectly good URL.
        if (item.image_url) return item.image_url;
        const exotic = EXOTIC_ITEMS?.find(e => e.texture === texture);
        if (exotic?.imageUrl) return exotic.imageUrl;
        return `${IMAGE_BASE_URL}/barrier.png`;
    }

    // Insane items have custom image URLs
    if (type === 'insane' || texture?.startsWith('insane_')) {
        if (item.imageUrl) return item.imageUrl;
        // Try to find matching insane item
        const insane = INSANE_ITEMS?.find(i => i.texture === texture);
        if (insane?.imageUrl) return insane.imageUrl;
        // Fallback for known insane items
        if (texture === 'insane_cavendish') {
            return `${CUSTOM_IMAGE_BASE_URL}/cavendish.png`;
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
            return `${CUSTOM_IMAGE_BASE_URL}/gros_michel.png`;
        }
    }

    // Check TEAM_MEMBERS for items with custom imageUrls (like ChromaRGBDirt, Wandering Trader)
    if (type === 'legendary' || texture?.startsWith('special_')) {
        const memberName = item.name || (texture?.includes('_') ? texture.split('_').slice(1).join('_') : null);
        if (memberName) {
            const member = TEAM_MEMBERS?.find(m =>
                m.name?.toLowerCase() === memberName.toLowerCase() ||
                (m.username && m.username.toLowerCase() === memberName.toLowerCase())
            );
            if (member?.imageUrl) return member.imageUrl;
        }
    }

    // Direct texture checks for special items with local images
    // These items don't have usernames and use custom images in /public
    // Check all possible texture name variations
    if (texture === 'wandering_trader' || texture === 'special_wandering_trader' || texture === 'legendary_wandering_trader') {
        return '/wandering_trader.png';
    }
    if (texture === 'chromargbdirt' || texture === 'special_chromargbdirt' || texture === 'legendary_chromargbdirt') {
        return '/chromargbdirt.gif';
    }
    if (texture === 'jimbo' || texture === 'mythic_jimbo') {
        return '/jimbo.png';
    }
    if (texture === 'recursion' || texture === 'wheel') {
        return `${CUSTOM_IMAGE_BASE_URL}/wheel.png`;
    }

    // Check if item has image_url field from database (overrides default construction)
    if (item.image_url) {
        return item.image_url;
    }

    // Player heads (legendaries and rares with usernames)
    if (item.username) {
        return getMinecraftHeadUrl(item.username);
    }

    // Try to extract username from texture for special/rare/mythic items
    if ((type === 'legendary' || type === 'rare' || type === 'mythic' || texture?.startsWith('special_') || texture?.startsWith('rare_') || texture?.startsWith('mythic_')) && texture?.includes('_')) {
        const extractedUsername = texture.split('_').slice(1).join('_');
        if (extractedUsername && !['cavendish', 'jimbo', 'gros_michel'].includes(extractedUsername.toLowerCase())) {
            // Check if this is a TEAM_MEMBER with no username (uses custom imageUrl instead of player head)
            const member = TEAM_MEMBERS?.find(m =>
                m.name?.toLowerCase() === extractedUsername.toLowerCase() && m.username === null
            );
            if (member?.imageUrl) return member.imageUrl;

            return getMinecraftHeadUrl(extractedUsername);
        }
    }

    // Event items use event texture
    if (type === 'event' || texture?.startsWith('event_')) {
        return '/event.png';
    }

    // Recursion items use wheel texture
    if (type === 'recursion' || texture === 'recursion') {
        return `${CUSTOM_IMAGE_BASE_URL}/wheel.png`;
    }

    // Regular items
    if (texture) {
        return `${IMAGE_BASE_URL}/${texture}.png`;
    }

    return `${IMAGE_BASE_URL}/barrier.png`;
}

/**
 * The rarity key for an item, resolved from the predicates above.
 *
 * Order matters and is rarest-first: an item can satisfy more than one predicate
 * (a legendary team member also carries `type` on some payloads), and the first
 * match wins so a pull is never demoted. `recursion` is not a rarity tier — it is
 * a lucky-spin mode — so it is not returned here; ask isRecursionItem directly.
 *
 * @param {object} item
 * @returns {string} a key of RARITY in utils/rarityHelpers.jsx
 */
export function getItemRarity(item) {
    if (isInsaneItem(item)) return 'insane';
    if (isMythicItem(item)) return 'mythic';
    if (isSpecialItem(item)) return 'legendary';
    if (isExoticItem(item)) return 'exotic';
    if (isRareItem(item)) return 'rare';
    if (isEventItem(item)) return 'event';
    return 'common';
}

// Get color for item based on rarity.
//
// This used to carry its own copy of the rarity→colour table. It now delegates,
// so the ladder is defined once. Recursion keeps its special case because it is
// a spin mode rather than a tier and has no entry in RARITY.
export function getItemColor(item) {
    if (isRecursionItem(item)) return COLORS.recursion;
    return getRarityColor(getItemRarity(item));
}