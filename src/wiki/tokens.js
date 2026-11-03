/*
 * Wiki only: nothing here may be imported from components/wheel or pages/Stats, or the reverse.
 * The rules behind these values are in DESIGN.md.
 */

export const ground = {
    deep:    'oklch(11.5% 0.006 255)',
    ground:  'oklch(14.5% 0.007 255)',
    panel:   'oklch(18.5% 0.008 255)',
    panelHi: 'oklch(22.5% 0.009 255)',
    slot:    'oklch(11% 0.006 255)',
    line:    'oklch(27% 0.009 255)',
    lineHi:  'oklch(34% 0.010 255)',
};

export const ink = {
    ink:  'oklch(96% 0.006 95)',   // Minecraft's text white is faintly warm
    ink2: 'oklch(82% 0.008 250)',
    ink3: 'oklch(68% 0.010 250)',
    ink4: 'oklch(46% 0.010 250)',
};

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

export const GAUGE = {
    surface: 'Y 64+',
    ocean: 'Y 63',
    caves: 'Y 0 to 60',
    trial: 'Y -40',
    deepdark: 'Y -51',
    nether: 'Portal',
    end: 'Stronghold',
};

/* Not config.yml's standard: block (written by the plugin, never read back): the round the game is balanced around. */
export const ROUND = { minutes: 60, jokers: 7 };

export const BEATS = ['Draw', 'Think', 'Route', 'Obtain', 'Score', 'Next'];

/* Mirrors the plugin's UnlockSchedule.forRound, rounded half up. */
export const FIXED_UNLOCKS_FROM = 50;
export function unlockMinutes(len) {
    const pct = len < FIXED_UNLOCKS_FROM ? { MID: 11.11, LATE: 28.88 } : { MID: (5 / len) * 100, LATE: (15 / len) * 100 };
    const at = (p) => Math.round((len * 60 * (p / 100)) / 60);
    return { EARLY: 0, MID: at(pct.MID), LATE: at(pct.LATE) };
}

const STANDARD_UNLOCKS = unlockMinutes(ROUND.minutes);

/* `minute` is for the standard ROUND; below FIXED_UNLOCKS_FROM it is a share of the round instead. */
export const STAGES = {
    EARLY: { key: 'EARLY', label: 'Early', minute: STANDARD_UNLOCKS.EARLY, light: 'oklch(72% 0.15 138)', ink: 'oklch(82% 0.14 138)' },
    MID:   { key: 'MID',   label: 'Mid',   minute: STANDARD_UNLOCKS.MID,   light: 'oklch(78% 0.13 82)',  ink: 'oklch(84% 0.12 84)' },
    LATE:  { key: 'LATE',  label: 'Late',  minute: STANDARD_UNLOCKS.LATE,  light: 'oklch(62% 0.21 30)',  ink: 'oklch(74% 0.15 34)' },
};

export const TAGS = {
    NETHER:  { label: 'Nether',  ink: 'oklch(74% 0.15 34)' },
    END:     { label: 'End',     ink: 'oklch(80% 0.10 305)' },
    EXTREME: { label: 'Extreme', ink: 'oklch(84% 0.14 95)' },
};

/* Rarity.java's chat colours, lifted to read on this ground; lightness climbs with the tier so it survives greyscale. */
export const FIND_RARITY = [
    { key: 'RARE',          label: 'Rare',          when: 'Any back-to-back',            ink: 'oklch(70% 0.15 272)' },
    { key: 'EPIC',          label: 'Epic',          when: '5% or less',                  ink: 'oklch(72% 0.19 322)' },
    { key: 'LEGENDARY',     label: 'Legendary',     when: '1% or less',                  ink: 'oklch(81% 0.16 75)' },
    { key: 'RNGESUS',       label: 'RNGesus',       when: '0.1% or less',                ink: 'oklch(78% 0.16 345)', from: 'oklch(64% 0.23 345)', to: 'oklch(56% 0.13 330)' },
    { key: 'EXTRAORDINARY', label: 'Extraordinary', when: 'The same item twice running', ink: 'oklch(86% 0.20 140)', from: 'oklch(88% 0.23 135)', to: 'oklch(76% 0.14 225)' },
];

/* model/TraderKind's colours, which are also their glow in the world. */
export const TRADER = {
    WANDERING: { name: 'Wandering Trader', ink: '#55FF55' },
    SPECIAL:   { name: 'Special Trader',   ink: '#FF55FF' },
};

export const TOOLTIP = {
    bg: 'oklch(10% 0.03 320 / 0.96)',
    edgeTop: 'oklch(42% 0.26 283)',
    edgeBottom: 'oklch(26% 0.16 285)',
};

/* TimerManager.itemLabel draws a gradient; the wiki uses its middle as one ink and never paints a word in a gradient. */
export const BOSSBAR = 'oklch(79.3% 0.194 143)';

export const HUD = {
    clock: 'oklch(84.6% 0.155 80)',
    text: 'oklch(100% 0 0)',
    ping: 'oklch(87% 0.27 142)',
    skyHigh: 'oklch(62% 0.1 235)',
    skyLow: 'oklch(58% 0.07 220)',
};

/* Darkened until the game's white text clears AA (about 4.9:1 at the low end). */
export const STAGE_SKY = {
    high: 'oklch(36% 0.085 258)',
    low: 'oklch(55% 0.085 242)',
};

/* Vanilla smoke is a random grey from black to 0.3; a mid grey vanished against the furnace stone. */
export const PARTICLE = {
    flame: 'oklch(76% 0.16 62)',
    flameCore: 'oklch(94% 0.08 95)',
    smoke: 'oklch(30% 0.004 255)',
};

export const font = {
    // 'FIB Figures' covers digits only: Handjet's dotted zero reads as an 8 at small sizes.
    display: "'FIB Figures', 'Handjet', 'Atkinson Hyperlegible Next', system-ui, sans-serif",
    text: "'Atkinson Hyperlegible Next', system-ui, -apple-system, 'Segoe UI', sans-serif",
    typed: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};

export const ease = 'cubic-bezier(0.2, 0.7, 0.2, 1)';

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
    v['--wk-hud-clock'] = HUD.clock;
    v['--wk-hud-text'] = HUD.text;
    v['--wk-hud-ping'] = HUD.ping;
    v['--wk-hud-sky-high'] = HUD.skyHigh;
    v['--wk-hud-sky-low'] = HUD.skyLow;
    v['--wk-stage-sky-high'] = STAGE_SKY.high;
    v['--wk-stage-sky-low'] = STAGE_SKY.low;
    v['--wk-flame'] = PARTICLE.flame;
    v['--wk-flame-core'] = PARTICLE.flameCore;
    v['--wk-smoke'] = PARTICLE.smoke;
    v['--wk-font-display'] = font.display;
    v['--wk-font-text'] = font.text;
    v['--wk-font-typed'] = font.typed;
    v['--wk-ease'] = ease;
    return v;
}

function kebab(s) {
    return s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/(\d+)/g, '-$1');
}
