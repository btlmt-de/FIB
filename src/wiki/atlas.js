/**
 * Reading the atlas. Every question the wiki asks about an item goes through here,
 * so there is one answer to "what is this called", "when can it come up" and
 * "where does it live", and all three come from generated data.
 */

import { ITEM_WHERE, ITEM_TAGS, POOL_BY_STAGE, ATLAS_POOL_SIZE, POOL_SETTINGS } from './atlas.data.js';
import { CUSTOM_ITEM_NAMES } from '../config/customItems.js';
import { REGIONS } from './tokens.js';

export { ATLAS_POOL_SIZE, POOL_SETTINGS, POOL_BY_STAGE };

const STAGE_OF = new Map();
for (const [stage, items] of Object.entries(POOL_BY_STAGE)) {
    for (const m of items) STAGE_OF.set(m, stage);
}

/** A few materials whose mechanical title-case reads wrong. */
const NAME_FIX = {
    TNT: 'TNT',
    TNT_MINECART: 'Minecart with TNT',
    DISC_FRAGMENT_5: 'Disc Fragment 5',
};

const SMALL = new Set(['of', 'the', 'and', 'on', 'a', 'with', 'in']);

export function itemName(material) {
    if (CUSTOM_ITEM_NAMES[material]) return CUSTOM_ITEM_NAMES[material];
    if (NAME_FIX[material]) return NAME_FIX[material];
    return material
        .toLowerCase()
        .split('_')
        .map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
        .join(' ');
}

export const itemSrc = (material) => `/fib-items/${material.toLowerCase()}.png`;

export const stageOf = (material) => STAGE_OF.get(material) ?? null;
export const tagsOf = (material) => ITEM_TAGS[material] ?? [];

/** { region, structure, chance, biomes } or null when /info says nothing. */
export function whereOf(material) {
    const w = ITEM_WHERE[material];
    if (!w) return null;
    const [region, structure, chance, biomes] = w;
    return { region, structure, chance, biomes };
}

/*
 * Every pinned item of one region, dealt round-robin across the places /info names
 * (Trail Ruins, Village, Desert Pyramid, ... and "no structure, just biomes") so the
 * first rows show the region's range. Sorted hardest-first, the Overworld opened on
 * two dozen near-identical pottery sherds, because Trail Ruins alone owns a dozen
 * of them. Within a place the harder stage still leads.
 */
const STAGE_RANK = { LATE: 0, MID: 1, EARLY: 2 };
const BY_REGION = new Map(REGIONS.map((r) => [r.key, []]));
for (const [material, [region]] of Object.entries(ITEM_WHERE)) {
    BY_REGION.get(region)?.push(material);
}
const hardestFirst = (a, b) =>
    (STAGE_RANK[stageOf(a)] ?? 3) - (STAGE_RANK[stageOf(b)] ?? 3) || a.localeCompare(b);
for (const [key, list] of BY_REGION) {
    const byPlace = new Map();
    for (const m of list) {
        const place = ITEM_WHERE[m][1] ?? '';
        if (!byPlace.has(place)) byPlace.set(place, []);
        byPlace.get(place).push(m);
    }
    const piles = [...byPlace.values()].map((p) => p.sort(hardestFirst)).sort((a, b) => b.length - a.length);
    const dealt = [];
    for (let i = 0; dealt.length < list.length; i++) {
        for (const pile of piles) if (i < pile.length) dealt.push(pile[i]);
    }
    BY_REGION.set(key, dealt);
}
export const regionItems = (key) => BY_REGION.get(key) ?? [];

/** How many items the atlas pins. Each material lives in exactly one region. */
export const PINNED_COUNT = Object.keys(ITEM_WHERE).length;

/*
 * Families: one sprite shape in twenty colourways. Laid out one per slot they drown
 * a region (Trail Ruins alone owns a dozen sherds), so a region shows each family
 * ONCE, as a stack with a count, the way the game shows a stack in an inventory.
 */
const FAMILIES = [
    { key: 'sherds', name: 'Pottery Sherds', test: (m) => m.endsWith('_POTTERY_SHERD') },
    { key: 'trims', name: 'Armor Trim Templates', test: (m) => m.endsWith('_ARMOR_TRIM_SMITHING_TEMPLATE') },
];
const familyOf = (m) => FAMILIES.find((f) => f.test(m)) ?? null;

/**
 * A region as slots: plain materials as { material }, and each family folded into
 * its first member as { material, family, members }.
 */
export function regionSlots(key) {
    const out = [];
    const seen = new Map();
    for (const m of regionItems(key)) {
        const fam = familyOf(m);
        if (!fam) { out.push({ material: m }); continue; }
        if (seen.has(fam.key)) { seen.get(fam.key).members.push(m); continue; }
        const slot = { material: m, family: fam.name, members: [m] };
        seen.set(fam.key, slot);
        out.push(slot);
    }
    return out;
}

/**
 * Items worth drawing on the home page: pinned to a named structure, so the draw
 * always lands on something /info can say something specific about. Families sit
 * out: a draw that keeps landing on a sherd shows one sprite, not the pool.
 */
export const DRAWABLE = Object.keys(ITEM_WHERE).filter((m) => ITEM_WHERE[m][1] && !familyOf(m));

/** Any pool item, for the riffle's wrong answers. */
export const ALL_POOL = [...POOL_BY_STAGE.EARLY, ...POOL_BY_STAGE.MID, ...POOL_BY_STAGE.LATE];

export function pick(list, rng = Math.random) {
    return list[Math.floor(rng() * list.length)];
}
