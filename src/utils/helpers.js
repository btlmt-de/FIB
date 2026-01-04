import { IMAGE_BASE_URL } from '../config/constants';

/**
 * Convert a fractional probability into a percentage string.
 * @param {number} chance - Fractional probability between 0 and 1.
 * @returns {string} Percentage value as a string with up to 6 decimal places (insignificant trailing zeros removed); `'0'` for falsy input.
 */
export function formatChance(chance) {
    if (!chance) return '0';
    const percent = chance * 100;
    return parseFloat(percent.toFixed(6)).toString();
}

/**
 * Build a Minecraft helm avatar URL for the given username.
 * @param {string} username - The Minecraft username to use in the URL.
 * @returns {string} The URL to the 64px helm image for the specified username.
 */
export function getMinecraftHeadUrl(username) {
    return `https://minotar.net/helm/${username}/64`;
}

/**
 * Format an ISO-like date string into a concise, human-friendly relative time.
 *
 * The function treats input without an explicit timezone as UTC, returns
 * "Unknown" for falsy input, and clamps future or very recent times to "Just now".
 *
 * @param {string} dateString - The date/time string to format; may be empty or omit a timezone.
 * @returns {string} `Unknown` for falsy input; `Just now` for future times or <10s; `Ns ago` for seconds (<60s); `Nm ago` for minutes (<3600s); `Nh ago` for hours (<86400s); `Nd ago` for days (<604800s); otherwise the locale-formatted date (date.toLocaleDateString()).
 */
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

/**
 * Determine whether an item should be treated as a special item.
 *
 * @param {Object} item - The item to evaluate. Expected properties: `isSpecial` (boolean), `type` (string), `texture` (string).
 * @returns {boolean} `true` if `item.isSpecial` is truthy, `item.type` equals `'legendary'`, or `item.texture` begins with `'special_'`, `false` otherwise.
 */
export function isSpecialItem(item) {
    return item?.isSpecial || item?.type === 'legendary' || item?.texture?.startsWith('special_');
}

/**
 * Determine whether an item is considered rare.
 *
 * @param {Object} item - Item object to evaluate; may be undefined.
 * @returns {boolean} `true` if the item is marked rare, has type `'rare'`, or its texture name begins with `'rare_'`, `false` otherwise.
 */
export function isRareItem(item) {
    return item?.isRare || item?.type === 'rare' || item?.texture?.startsWith('rare_');
}

/**
 * Determine whether an item is classified as mythic.
 * @param {Object} item - The item object to check; may include `isMythic`, `type`, and `texture` properties.
 * @returns {boolean} `true` if the item is mythic (via `isMythic`, `type === 'mythic'`, texture equals `'mythic_cavendish'`, or texture starts with `'mythic_'`), `false` otherwise.
 */
export function isMythicItem(item) {
    return item?.isMythic || item?.type === 'mythic' || item?.texture === 'mythic_cavendish' || item?.texture?.startsWith('mythic_');
}

/**
 * Determine whether an item is classified as an event item.
 * @param {Object} item - The item to check; may include `isEvent`, `type`, or `texture` properties.
 * @returns {boolean} `true` if the item is an event item, `false` otherwise.
 */
export function isEventItem(item) {
    return item?.isEvent || item?.type === 'event' || item?.texture?.startsWith('event_');
}

/**
 * Resolve the most appropriate image URL for the provided item.
 *
 * @param {Object} item - Item object with optional properties used to determine the image.
 * @param {string} [item.imageUrl] - Custom image URL used for certain mythic items.
 * @param {string} [item.username] - Minecraft username; when present a player head URL is returned.
 * @param {string} [item.texture] - Texture name used to build a default image URL.
 * @returns {string} The final image URL: a barrier placeholder for a missing item, a mythic custom URL if present, a Minecraft head URL when `username` is set, `/event.png` for event items, or `${IMAGE_BASE_URL}/{texture}.png` for regular items.
 */
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

/**
 * Selects a display color for an item based on its rarity tier.
 * @param {Object} item - The item whose rarity/texture properties determine the color; may be falsy.
 * @param {Object} COLORS - Color palette with expected keys `aqua`, `purple`, `red`, and `gold`.
 * @returns {string} The chosen color from the `COLORS` palette (`COLORS.aqua`, `COLORS.purple`, `COLORS.red`, or `COLORS.gold`).
 */
export function getItemColor(item, COLORS) {
    if (isMythicItem(item)) return COLORS.aqua;
    if (isSpecialItem(item)) return COLORS.purple;
    if (isRareItem(item)) return COLORS.red;
    if (isEventItem(item)) return COLORS.gold;
    return COLORS.gold;
}