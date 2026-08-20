const isDev = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE_URL = isDev ? 'http://localhost:3001' : '';

// ── V2 midnight blue design tokens ───────────────────────────────────────────
export const COLORS = {
    // Backgrounds
    bg:          'oklch(17% 0.025 255)',
    bgLight:     'oklch(21% 0.023 255)',
    bgLighter:   'oklch(25% 0.021 255)',
    bgHover:     'oklch(28% 0.019 255)',
    // Text
    text:        'oklch(94% 0.007 255)',
    textMid:     'oklch(74% 0.012 255)',
    textMuted:   'oklch(58% 0.012 255)',
    textDim:     'oklch(42% 0.013 255)',
    // Borders
    border:      'oklch(30% 0.019 255)',
    borderF:     'oklch(24% 0.022 255)',
    // Accent
    accent:      'oklch(76% 0.16 68)',   // amber — the primary accent throughout
    // Semantic
    green:       'oklch(64% 0.20 142)',
    red:         'oklch(62% 0.22 25)',
    yellow:      'oklch(82% 0.16 90)',
    cyan:        'oklch(68% 0.12 200)',
    blue:        'oklch(65% 0.16 255)',
    purple:      'oklch(62% 0.18 300)',
    orange:      'oklch(72% 0.18 55)',
    // Game state colours
    early:       'oklch(64% 0.20 142)',
    mid:         'oklch(76% 0.16 68)',
    late:        'oklch(62% 0.22 25)',
    nether:      'oklch(60% 0.20 15)',
    end:         'oklch(65% 0.15 290)',
    extreme:     'oklch(66% 0.20 45)',
    description: 'oklch(68% 0.12 200)',
    // Legacy aliases
    gold:        'oklch(76% 0.16 68)',
    aqua:        'oklch(68% 0.12 200)',
    insane:      'oklch(82% 0.20 90)',
    recursion:   'oklch(70% 0.22 150)',
    recursionDark:'oklch(12% 0.025 155)',
};

/**
 * Item sprites, served from our own origin.
 *
 * These are vendored out of the resource pack into `public/fib-items/` by
 * `scripts/vendor-textures.mjs` and committed, so they ship with the build.
 * The stats module moved to them first (see Stats/tokens.js); this is the rest
 * of the app following, and the wheel is the reason it mattered enough to do.
 *
 * raw.githubusercontent.com is not a CDN. It sends `cache-control: max-age=300`
 * and throttles, and the wheel preloads the *entire* pool before it will let
 * anyone spin — 1,537 sprites, fetched 20 at a time, each wave waiting on the
 * slowest member. Against a throttling origin that is a cold-start stall of
 * tens of seconds, repeated every five minutes once the max-age lapses. From
 * our own origin the same set is immutable and cacheable, and the second visit
 * costs nothing.
 *
 * Re-run `npm run vendor:textures` after adding items to the pool. The vendored
 * set is derived from the stats data layer's ITEM_POOL, which is not the same
 * list the wheel gets from `/api/items` — they happen to coincide today (all
 * 1,537 wheel textures and all 1,540 unicodeItems materials are present), but
 * nothing enforces it. A sprite that goes missing renders as barrier rather
 * than reaching for the network, so check the script's output for the warning
 * about pool items with no texture instead of relying on a runtime fallback.
 */
export const IMAGE_BASE_URL     = '/fib-items';

/**
 * The pack's custom items — cavendish, gros_michel, the antimatter set, the
 * wheel. These live in the pack's `item/` directory rather than `fib/`, so they
 * are vendored separately (see scripts/vendor-textures.mjs) and keyed by name
 * rather than by pool membership.
 */
export const CUSTOM_IMAGE_BASE_URL = '/fib-custom';

/**
 * The upstream pack. Kept for tooling and for anything that genuinely wants the
 * canonical remote URL. Not a runtime fallback for the pool — see above.
 */
export const REMOTE_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/btlmt-de/FIB/main/ForceItemBattle/assets/minecraft/textures/fib';
export const WHEEL_TEXTURE_URL  = '/wheel.png';
/**
 * The desktop reel's tile pitch, and the height of the band it runs in.
 *
 * Both were smaller (80 / 100), sized when the strip was a row inside a card in
 * a centred column. That gave ~56px of item art in a 100px band — a thin ribbon
 * floating in a large empty field, with the tiles, the thing the player actually
 * watches for four seconds, the smallest element on screen.
 *
 * The two are coupled and must stay so. `drawItem` centres a square of
 * `ITEM_WIDTH * 0.70` inside the band, so a band shorter than the pitch clips the
 * art and a much taller one strands it; the ~1.4 ratio here leaves the glow room
 * to bloom without opening a gap. Everything laid over the band — pointers,
 * centre line, shockwave rings — is sized from STRIP_HEIGHT rather than
 * hardcoded, so changing this moves the whole assembly together.
 *
 * How many tiles are in shot is now a property of the monitor, not of this file.
 * The reel is a full-width row of the HUD grid, so it spans the page: about 15
 * tiles at 1920 and 11 at 1440. Two earlier attempts tried to buy that width
 * from inside a centred column and could not — the ceiling there was 8.5 tiles,
 * and dropping to 6.2 whenever the sidebars appeared.
 *
 * MOBILE_ITEM_WIDTH (70, in CanvasSpinningStrip) is deliberately not derived
 * from this: mobile runs the reel vertically, where the constraint is the phone
 * rather than the page.
 */
export const ITEM_WIDTH         = 120;
export const STRIP_HEIGHT       = 170;
export const SPIN_DURATION      = 4000;
export const STRIP_LENGTH       = 80;
export const FINAL_INDEX        = STRIP_LENGTH - 8;

// ── Special items (unchanged) ─────────────────────────────────────────────────

export const TEAM_MEMBERS = [
    { name: 'apppaa',          username: 'apppaa',          chance: 0.0001,   rarity: 'legendary' },
    { name: 'threeseconds',    username: 'threeseconds',    chance: 0.0003,   rarity: 'legendary' },
    { name: 'CH0RD',           username: 'CH0RD',           chance: 0.0004,   rarity: 'legendary' },
    { name: 'stupxd',          username: 'stupxd',          chance: 0.0005,   rarity: 'legendary' },
    { name: 'Wandering Trader',username: null,               chance: 0.00005,  rarity: 'legendary', imageUrl: '/wandering_trader.png' },
    { name: 'ChromaRGBDirt',   username: null,               chance: 0.0002,   rarity: 'legendary', imageUrl: '/chromargbdirt.gif' },
];

/**
 * EXOTIC — the tier between legendary and rare: the plugin's custom items.
 *
 * Item-shaped, not member-shaped. Every other special tier below is a list of
 * people (a username resolves to a player head); exotic is the one tier made of
 * objects, so it follows INSANE_ITEMS/MYTHIC_ITEMS instead and carries an
 * explicit imageUrl into the vendored pack textures.
 *
 * These are all eight entries of the plugin's CustomMaterials enum. Six of them
 * were already spinning as ordinary commons under their vanilla Minecraft names —
 * the Wheel of Fortune arriving as "Nether Star" — because the wheel's common
 * pool is the raw Minecraft item registry and knows nothing about the plugin.
 * The backend excludes those six materials from the pool now.
 *
 * The last two share their material with a genuine force item: a plain BRUSH is a
 * real EARLY pool item and a plain TOTEM_OF_UNDYING a LATE one, so both keep
 * their vanilla names and stay common, and these two ride alongside them under
 * synthetic textures. That is why they were never in the wheel at all.
 *
 * This list mirrors SEED_SPECIAL_ITEMS in the wheel-backend and is used only for
 * the strip's visual filler and the offline collection-book fallback; the live
 * roster and the real odds come from `/api/items`. Textures must match the
 * backend's exactly or the collection book files a pull under a texture it has no
 * entry for.
 */
export const EXOTIC_ITEMS = [
    { name: 'Wheel of Fortune', texture: 'exotic_wheel_of_fortune', chance: 0.00055, type: 'exotic',
        imageUrl: `${CUSTOM_IMAGE_BASE_URL}/wheel.png` },
    { name: 'Eye of Antimatter', texture: 'exotic_eye_of_antimatter', chance: 0.00055, type: 'exotic',
        imageUrl: `${CUSTOM_IMAGE_BASE_URL}/eye_of_antimatter.png` },
    // The three locators are animated in the pack — their /fib-custom textures are
    // vertical sprite strips (8, 26 and 10 frames) with a .mcmeta sidecar, and an
    // <img> or a canvas drawImage of one renders a single very tall picture rather
    // than an animation. IMAGE_BASE_URL has the same three already vendored as
    // static single-frame renders, keyed by MATERIAL name, which is what the stats
    // item index draws. Point at those. See scripts/vendor-textures.mjs.
    { name: 'Antimatter Locator', texture: 'exotic_antimatter_locator', chance: 0.00055, type: 'exotic',
        imageUrl: `${IMAGE_BASE_URL}/knowledge_book.png` },
    { name: 'Trial Locator', texture: 'exotic_trial_locator', chance: 0.00055, type: 'exotic',
        imageUrl: `${IMAGE_BASE_URL}/wither_rose.png` },
    { name: 'Sulfur Locator', texture: 'exotic_sulfur_locator', chance: 0.00055, type: 'exotic',
        imageUrl: `${IMAGE_BASE_URL}/music_disc_chirp.png` },
    // A TORCHFLOWER wearing the pack's old_book model, hence the texture name.
    { name: "Weathered Captain's Journal", texture: 'exotic_weathered_captains_journal', chance: 0.00055, type: 'exotic',
        imageUrl: `${CUSTOM_IMAGE_BASE_URL}/old_book.png` },
    { name: 'Totem of Antimatter', texture: 'exotic_totem_of_antimatter', chance: 0.00055, type: 'exotic',
        imageUrl: `${CUSTOM_IMAGE_BASE_URL}/totem_of_antimatter.png` },
    // The plugin's own name for it. "Trail Ruins" is the structure this locator
    // finds, not what the item is called.
    { name: 'Kiln-Fired Brush', texture: 'exotic_kiln_fired_brush', chance: 0.00055, type: 'exotic',
        imageUrl: `${CUSTOM_IMAGE_BASE_URL}/kiln_fired_brush.png` },
];

export const RARE_MEMBERS = [
    { name: 'shabana02',    username: 'shabana02',    chance: 0.0007,  rarity: 'rare' },
    { name: 'McPlayHD',     username: 'McPlayHD',     chance: 0.00067, rarity: 'rare' },
    { name: 'Owen1212055',  username: 'Owen1212055',  chance: 0.0006,  rarity: 'rare' },
    { name: '170yt',        username: '170yt',        chance: 0.00069, rarity: 'rare' },
    { name: 'BastiGHG',     username: 'BastiGHG',     chance: 0.0006,  rarity: 'rare' },
    { name: 'LennraZ',      username: 'LennraZ',      chance: 0.00072, rarity: 'rare' },
    { name: 'NubPanda',     username: 'NubPanda',     chance: 0.0007,  rarity: 'rare' },
    { name: 'Johnlongears', username: 'Johnlongears', chance: 0.00068, rarity: 'rare' },
    { name: 'steez',        username: 'steez',        chance: 0.00062, rarity: 'rare' },
    { name: 'lacios',       username: 'lacios',       chance: 0.00065, rarity: 'rare' },
];

export const INSANE_ITEMS = [
    { name: 'Cavendish', texture: 'insane_cavendish', chance: 0.000001, type: 'insane',
        imageUrl: `${CUSTOM_IMAGE_BASE_URL}/cavendish.png` },
];
export const INSANE_ITEM = INSANE_ITEMS[0];

export const MYTHIC_ITEMS = [
    { name: 'Jimbo',        texture: 'mythic_jimbo',        chance: 0.00002, type: 'mythic', imageUrl: '/jimbo.png' },
    { name: 'eltobito',     texture: 'mythic_eltobito',     chance: 0.00003, type: 'mythic', username: 'eltobito' },
    { name: 'Gros Michel',  texture: 'mythic_gros_michel',  chance: 0.00004, type: 'mythic',
        imageUrl: `${CUSTOM_IMAGE_BASE_URL}/gros_michel.png` },
];
export const MYTHIC_ITEM = MYTHIC_ITEMS[0];

export const EVENT_ITEM = {
    name: 'BONUS EVENT', texture: 'event_bonus', chance: 0.9, type: 'event', imageUrl: '/event.png',
};

export const RECURSION_ITEM = {
    name: 'RECURSION', texture: 'recursion', chance: 0.0025, type: 'recursion', imageUrl: WHEEL_TEXTURE_URL,
};

export const BONUS_EVENTS = [
    { id: 'triple_spin',        name: '5x Spin',             description: '5 bonus spins!',           color: COLORS.orange, weight: 40 },
    { id: 'lucky_spin',         name: 'Lucky Spin',          description: 'Equal chance for all items!', color: COLORS.green, weight: 40 },
    { id: 'triple_lucky_spin',  name: 'Triple Lucky Spin',   description: '3 lucky spins!',            color: COLORS.gold,  weight: 20 },
];