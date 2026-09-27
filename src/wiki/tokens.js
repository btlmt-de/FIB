/**
 * THE EXPLORER'S ATLAS — the wiki's tokens.
 *
 * Wiki only. The wheel and the stats module run their own systems and read none of
 * this; nothing here may be imported from components/wheel or pages/Stats, and
 * nothing from theirs may be imported here. (The old wiki palette in
 * config/constants.js stays where it is because the wheel still reads it.)
 *
 * Three rules shape every value below.
 *
 *  1. THE GROUND IS DEEPSLATE. A cool near-black with almost no chroma, so that
 *     every colour on the page is light coming off something: a region, a stage, a
 *     find. A tinted ground would be a colour naming nothing.
 *
 *  2. EVERY HUE NAMES A DATUM. Regions take the light of the place (grass, water,
 *     torchlight, copper, sculk, netherrack, purpur). Stages take the light of how
 *     deep a round has gone, and the two axes deliberately rhyme: EARLY is surface
 *     daylight, MID is torchlight, LATE is Nether fire, because the pool really does
 *     push you underground and then out of the Overworld as the clock runs. Find
 *     rarity is the plugin's own chat colours from Rarity.java.
 *
 *  3. INTERACTION IS WHITE. Minecraft marks the slot under your cursor by lightening
 *     it, not by tinting it, and the wiki does the same: hover lifts, selection is the
 *     brightest ink, focus is a white ring. No brand accent competes with the data.
 *
 * All text inks were checked against `panel` (the lightest surface text sits on):
 * ink 16.9:1, ink2 10.6:1, ink3 6.0:1. Region and stage `ink` values clear 4.5:1 on
 * `panel` and on `ground`.
 */

export const ground = {
    deep:    'oklch(11.5% 0.006 255)',
    ground:  'oklch(14.5% 0.007 255)',
    panel:   'oklch(18.5% 0.008 255)',
    panelHi: 'oklch(22.5% 0.009 255)',
    // A slot is cut INTO the surface: darker than the ground it sits in.
    slot:    'oklch(11% 0.006 255)',
    line:    'oklch(27% 0.009 255)',
    lineHi:  'oklch(34% 0.010 255)',
};

export const ink = {
    ink:  'oklch(96% 0.006 95)',   // Minecraft's text white is faintly warm
    ink2: 'oklch(82% 0.008 250)',
    ink3: 'oklch(68% 0.010 250)',
    // Not a text colour. Disabled glyphs, tick marks, the shadow side of a slot.
    ink4: 'oklch(46% 0.010 250)',
};

/**
 * The seven regions of the atlas, top of the world to the far side of it.
 *
 * `y` is the vanilla generation fact the region is labelled with. `light` is the
 * colour of the place, used as environmental light and fills; `ink` is the same hue
 * lifted to read as text. `blurb` is one line a player would agree with.
 */
export const REGIONS = [
    {
        key: 'surface', name: 'The Overworld', y: 'Y 64 and up',
        light: 'oklch(72% 0.15 138)', ink: 'oklch(82% 0.14 138)',
        blurb: 'Villages, trail ruins, temples and outposts. Most of the pool starts here, under an open sky.',
    },
    {
        key: 'ocean', name: 'Oceans', y: 'Sea level, Y 63',
        light: 'oklch(62% 0.15 252)', ink: 'oklch(76% 0.11 250)',
        blurb: 'Shipwrecks, ruins and monuments. Bring a boat, a door for air, and patience.',
    },
    {
        key: 'caves', name: 'Caves', y: 'Y 0 to 60',
        light: 'oklch(78% 0.13 82)', ink: 'oklch(84% 0.12 84)',
        blurb: 'Geodes, mineshafts and strongholds, lit by whatever torches you brought.',
    },
    {
        key: 'trial', name: 'Trial Chambers', y: 'Y -40 to -20',
        light: 'oklch(70% 0.13 52)', ink: 'oklch(80% 0.11 56)',
        blurb: 'Copper and tuff corridors. Keys, vaults and the breeze\'s rods.',
    },
    {
        key: 'deepdark', name: 'The Deep Dark', y: 'Ancient cities, Y -51',
        light: 'oklch(72% 0.11 205)', ink: 'oklch(82% 0.09 200)',
        blurb: 'Sculk, shriekers and the loot of an ancient city. Sneak.',
    },
    {
        key: 'nether', name: 'The Nether', y: 'Past the portal',
        light: 'oklch(62% 0.21 30)', ink: 'oklch(74% 0.15 34)',
        blurb: 'Every item the plugin tags NETHER, plus the bastion and fortress loot /info names.',
    },
    {
        key: 'end', name: 'The End', y: 'Past the stronghold',
        light: 'oklch(70% 0.14 305)', ink: 'oklch(80% 0.10 305)',
        blurb: 'Every item the plugin tags END. The dragon, then the cities out in the void.',
    },
];

export const REGION = Object.fromEntries(REGIONS.map((r) => [r.key, r]));

/**
 * The depth gauge's marks, top of the world down and then out of it. Short forms of
 * each region's `y`: the gauge is a scale, and a scale's labels are terse.
 */
export const GAUGE = {
    surface: 'Y 64+',
    ocean: 'Y 63',
    caves: 'Y 0 to 60',
    trial: 'Y -40',
    deepdark: 'Y -51',
    nether: 'Portal',
    end: 'Stronghold',
};

/**
 * The round's three stages (ItemDifficultiesManager's State). `at` is the share of
 * the round's time after which the stage's items can come up, from the plugin.
 */
export const STAGES = {
    EARLY: { key: 'EARLY', label: 'Early', at: 0,  light: 'oklch(72% 0.15 138)', ink: 'oklch(82% 0.14 138)' },
    MID:   { key: 'MID',   label: 'Mid',   at: 11, light: 'oklch(78% 0.13 82)',  ink: 'oklch(84% 0.12 84)' },
    LATE:  { key: 'LATE',  label: 'Late',  at: 29, light: 'oklch(62% 0.21 30)',  ink: 'oklch(74% 0.15 34)' },
};

/** The plugin's ItemTags, as words in their own light. */
export const TAGS = {
    NETHER:  { label: 'Nether',  ink: 'oklch(74% 0.15 34)' },
    END:     { label: 'End',     ink: 'oklch(80% 0.10 305)' },
    EXTREME: { label: 'Extreme', ink: 'oklch(84% 0.14 95)' },
};

/**
 * Back-to-back find rarity, from Rarity.java. When the item you are handed is
 * already in your inventory it counts on the spot, and the game grades how unlikely
 * that was. The hues are the plugin's chat colours (<blue>, <dark_purple>, <gold>,
 * the two gradients) lifted until they read on this ground; the lightness climbs
 * with the tier so the ladder survives greyscale.
 */
export const FIND_RARITY = [
    { key: 'RARE',          label: 'Rare',          when: 'Any back-to-back',            ink: 'oklch(70% 0.15 272)' },
    { key: 'EPIC',          label: 'Epic',          when: '5% or less',                  ink: 'oklch(72% 0.19 322)' },
    { key: 'LEGENDARY',     label: 'Legendary',     when: '1% or less',                  ink: 'oklch(81% 0.16 75)' },
    { key: 'RNGESUS',       label: 'RNGesus',       when: '0.1% or less',                ink: 'oklch(78% 0.16 345)', from: 'oklch(64% 0.23 345)', to: 'oklch(56% 0.13 330)' },
    { key: 'EXTRAORDINARY', label: 'Extraordinary', when: 'The same item twice running', ink: 'oklch(86% 0.20 140)', from: 'oklch(88% 0.23 135)', to: 'oklch(76% 0.14 225)' },
];

/** The Minecraft tooltip frame: a violet gradient edge on a near-black plum. */
export const TOOLTIP = {
    bg: 'oklch(10% 0.03 320 / 0.96)',
    edgeTop: 'oklch(42% 0.26 283)',
    edgeBottom: 'oklch(26% 0.16 285)',
};

/**
 * The plugin's bossbar, where a player reads the item they are hunting
 * (TimerManager.itemLabel: <gradient:#6eee87:#5fc52e><b>, then the item's icon out
 * of the resource pack). The game draws that name on a gradient; the wiki gives it
 * the gradient's middle as one ink, as it does for the RNGesus and Extraordinary
 * words, so a word is never painted in a gradient here. Used by How to Play's
 * drawing of the bossbar only.
 */
export const BOSSBAR = 'oklch(79.3% 0.194 143)';

export const font = {
    // Headings, figures, item names at display size, rarity words. Never body text.
    // 'FIB Figures' covers the digits only (see wiki.css): Handjet's dotted zero
    // reads as an 8 at small sizes, and these numbers are facts.
    display: "'FIB Figures', 'Handjet', 'Atkinson Hyperlegible Next', system-ui, sans-serif",
    // Designed for legibility first, which is the job: read on a phone, mid-round.
    text: "'Atkinson Hyperlegible Next', system-ui, -apple-system, 'Segoe UI', sans-serif",
    // Only for a string you are meant to type: /info, /forceitem.
    typed: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};

export const ease = 'cubic-bezier(0.2, 0.7, 0.2, 1)';

/**
 * The tokens as custom properties, set inline on the wiki's root element. The
 * stylesheets (wiki.css, home.css) read only these, so a value lives in this file
 * and nowhere else.
 */
export function cssVars() {
    const v = {};
    for (const [k, val] of Object.entries(ground)) v[`--wk-${kebab(k)}`] = val;
    for (const [k, val] of Object.entries(ink)) v[`--wk-${kebab(k)}`] = val;
    for (const r of REGIONS) {
        v[`--wk-r-${r.key}`] = r.light;
        v[`--wk-r-${r.key}-ink`] = r.ink;
    }
    for (const s of Object.values(STAGES)) {
        v[`--wk-s-${s.key.toLowerCase()}`] = s.light;
        v[`--wk-s-${s.key.toLowerCase()}-ink`] = s.ink;
    }
    for (const [k, t] of Object.entries(TAGS)) v[`--wk-t-${k.toLowerCase()}`] = t.ink;
    for (const f of FIND_RARITY) v[`--wk-f-${f.key.toLowerCase()}`] = f.ink;
    v['--wk-tip-bg'] = TOOLTIP.bg;
    v['--wk-tip-top'] = TOOLTIP.edgeTop;
    v['--wk-tip-bottom'] = TOOLTIP.edgeBottom;
    v['--wk-bossbar'] = BOSSBAR;
    v['--wk-font-display'] = font.display;
    v['--wk-font-text'] = font.text;
    v['--wk-font-typed'] = font.typed;
    v['--wk-ease'] = ease;
    return v;
}

function kebab(s) {
    return s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/(\d+)/g, '-$1');
}
