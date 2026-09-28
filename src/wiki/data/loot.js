/**
 * The custom structures' loot, read from the datapack at build time.
 *
 * FIB_Worldgen ships in this repo, and its loot tables are the truth about what a
 * container holds. The Custom Content page used to carry them as hand-typed
 * percentages, which is how the Weathered Captain's Journal came to be listed at 30%
 * in shipwrecks while the datapack gives it 20%, and how the vault room's table went
 * unlisted altogether. Importing the JSON means a change to the datapack is a change
 * to the page (the Derived Atlas Rule, for loot).
 *
 * Only what the tables say is read: pools, rolls, weights, set_count, set_name and the
 * enchantment functions. What a table cannot say (how many pots a room has, how many
 * minecarts) stays in the page's words.
 */

const FILES = import.meta.glob(
    ['/FIB_Worldgen/data/fib/loot_table/*.json', '/FIB_Worldgen/data/minecraft/loot_table/chests/shipwreck_map.json'],
    { eager: true, import: 'default' },
);

/* The plugin's custom items, where a table hands one out. Their sprites live in the
   pack's item folder, vendored to /fib-custom. */
const CUSTOM = {
    'fib:items/eye_of_antimatter': { name: 'Eye of Antimatter', src: '/fib-custom/eye_of_antimatter.png' },
    'fib:items/totem_of_antimatter': { name: 'Totem of Antimatter', src: '/fib-custom/totem_of_antimatter.png' },
    'fib:items/antimatter_trial_key': { name: 'Antimatter Trial Key', src: '/fib-custom/antimatter_trial_key.png' },
    'fib:items/weathered_captains_journal': { name: "Weathered Captain's Journal", src: '/fib-custom/old_book.png' },
};
/* Custom models the pack draws differently from the vanilla item. */
const MODELS = { gros_michel: '/fib-custom/gros_michel.png', cavendish: '/fib-custom/cavendish.png', wheel: '/fib-custom/wheel.png' };

const bare = (id) => id.replace(/^minecraft:/, '');
const title = (m) => m.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

function textOf(component) {
    if (component == null) return '';
    if (typeof component === 'string') return component;
    if (Array.isArray(component)) return component.map(textOf).join('');
    return (component.text ?? '') + (component.extra ? textOf(component.extra) : '');
}

function range(v) {
    if (v == null) return null;
    if (typeof v === 'number') return { min: v, max: v };
    if (typeof v === 'object' && 'min' in v) return { min: v.min, max: v.max };
    return null;
}

export const rangeText = (r) => (!r ? '' : r.min === r.max ? String(r.min) : `${r.min} to ${r.max}`);

function readEntry(e, total) {
    const mods = e.modifier ?? e.functions ?? [];
    const kind = (m) => bare(m.type ?? m.function ?? '');
    const entry = { chance: (e.weight ?? 1) / total, weight: e.weight ?? 1, count: null, custom: null, notes: [] };
    if (bare(e.type) === 'empty') return { ...entry, empty: true, name: 'Nothing' };
    if (bare(e.type) === 'loot_table') {
        const c = CUSTOM[e.value] ?? { name: title(bare(String(e.value).split('/').pop())), src: null };
        return { ...entry, material: null, name: c.name, src: c.src };
    }
    const material = bare(e.name).toUpperCase();
    let src = null;
    for (const m of mods) {
        const k = kind(m);
        if (k === 'set_count') entry.count = range(m.count);
        if (k === 'set_name') entry.custom = textOf(m.name).trim();
        if (k === 'enchant_with_levels') entry.notes.push(`Enchanted at level ${rangeText(range(m.levels))}`);
        if (k === 'enchant_randomly') entry.notes.push('One random enchantment');
        if (k === 'set_custom_model_data') src = MODELS[(m.strings?.values ?? m.strings ?? [])[0]] ?? src;
        if (k === 'set_components') src = MODELS[m.components?.['minecraft:custom_model_data']?.strings?.[0]] ?? src;
    }
    return { ...entry, material, name: title(bare(e.name)), src };
}

function readTable(json) {
    return (json.pools ?? []).map((p) => {
        const total = p.entries.reduce((n, e) => n + (e.weight ?? 1), 0);
        return {
            rolls: range(p.rolls) ?? { min: 1, max: 1 },
            entries: p.entries.map((e) => readEntry(e, total)).sort((a, b) => b.chance - a.chance),
        };
    });
}

export const TABLES = Object.fromEntries(Object.entries(FILES).map(([path, json]) => [path.split('/').pop().replace('.json', ''), readTable(json)]));

/** A chance as the page prints it: two places, never "0.00%". */
export function pct(p) {
    const v = p * 100;
    if (v >= 10) return `${v.toFixed(1).replace(/\.0$/, '')}%`;
    if (v >= 1) return `${v.toFixed(2).replace(/0$/, '').replace(/\.0$/, '')}%`;
    return `${Number(v.toPrecision(2))}%`;
}

/** One opening of a container, rolled with the table's own weights and counts. */
export function roll(pools, rng = Math.random) {
    const out = [];
    for (const p of pools) {
        const n = p.rolls.min + Math.floor(rng() * (p.rolls.max - p.rolls.min + 1));
        const total = p.entries.reduce((s, e) => s + e.weight, 0);
        for (let i = 0; i < n; i++) {
            let r = rng() * total;
            const e = p.entries.find((x) => (r -= x.weight) < 0) ?? p.entries[p.entries.length - 1];
            if (e.empty) continue;
            const c = e.count ?? { min: 1, max: 1 };
            out.push({ ...e, amount: c.min + Math.floor(rng() * (c.max - c.min + 1)) });
        }
    }
    return out;
}
