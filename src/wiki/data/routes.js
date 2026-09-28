/**
 * Routes as the page draws them: "how could I get this item?"
 *
 * The data (routes.data.js) is Minecraft's own, for the server's version; this file
 * only decides how each kind of route is said and which icon stands for it. Every
 * icon is a real item sprite: the station you would use, the block you would mine,
 * the spawn egg of the mob, the workstation of the villager.
 *
 * Two routes are not Minecraft data but FIB rules, and apply to every item: you may
 * already be carrying it (it counts the moment it is assigned), and you may spend a
 * joker. The route map adds those itself.
 */

import { ROUTES, MOB_ICON, ROUTES_VERSION } from './routes.data.js';
import { ALL_POOL, itemName, whereOf } from './atlas.js';

export { ROUTES_VERSION };

const STATION = {
    smelting: ['FURNACE', 'furnace'],
    blasting: ['BLAST_FURNACE', 'blast furnace'],
    smoking: ['SMOKER', 'smoker'],
    campfire_cooking: ['CAMPFIRE', 'campfire'],
};

/** A villager profession by the workstation that gives it the job. */
const WORKSTATION = {
    armorer: ['BLAST_FURNACE', 'Armorer'],
    butcher: ['SMOKER', 'Butcher'],
    cartographer: ['CARTOGRAPHY_TABLE', 'Cartographer'],
    cleric: ['BREWING_STAND', 'Cleric'],
    farmer: ['COMPOSTER', 'Farmer'],
    fisherman: ['BARREL', 'Fisherman'],
    fletcher: ['FLETCHING_TABLE', 'Fletcher'],
    leatherworker: ['CAULDRON', 'Leatherworker'],
    librarian: ['LECTERN', 'Librarian'],
    mason: ['STONECUTTER', 'Mason'],
    shepherd: ['LOOM', 'Shepherd'],
    smith: ['SMITHING_TABLE', 'Smiths'],
    toolsmith: ['SMITHING_TABLE', 'Toolsmith'],
    weaponsmith: ['GRINDSTONE', 'Weaponsmith'],
    wandering_trader: ['WANDERING_TRADER_SPAWN_EGG', 'Wandering Trader'],
};
const LEVEL = ['', 'Novice', 'Apprentice', 'Journeyman', 'Expert', 'Master'];

/** The ways of getting something that are neither a recipe nor a drop. */
const GAMEPLAY = {
    fishing: { verb: 'Fish', icon: 'FISHING_ROD', label: 'Fishing' },
    bartering: { verb: 'Barter', icon: 'GOLD_INGOT', label: 'Piglin bartering' },
    hero: { verb: 'Earn', icon: 'BELL', label: 'Hero of the Village gift' },
    cat: { verb: 'Befriend', icon: 'CAT_SPAWN_EGG', label: "A tamed cat's morning gift" },
    sniffer: { verb: 'Dig', icon: 'SNIFFER_EGG', label: 'Sniffer digging' },
    panda: { verb: 'Wait', icon: 'PANDA_SPAWN_EGG', label: 'A sneezing baby panda' },
    armadillo: { verb: 'Collect', icon: 'ARMADILLO_SPAWN_EGG', label: 'Armadillo shedding' },
    chicken: { verb: 'Collect', icon: 'CHICKEN_SPAWN_EGG', label: 'Chickens laying' },
    turtle: { verb: 'Raise', icon: 'TURTLE_SPAWN_EGG', label: 'A baby turtle growing up' },
    trial_spawner: { verb: 'Defeat', icon: 'TRIAL_SPAWNER', label: 'Trial spawner reward' },
    ominous_spawner: { verb: 'Defeat', icon: 'TRIAL_SPAWNER', label: 'Ominous trial spawner' },
    harvest: { verb: 'Harvest', icon: null, label: 'Harvest it' },
};

/*
 * A structure by the block a player recognises it by, so three loot sources are three
 * different places rather than one chest drawn three times. Presentation only: which
 * structures hold an item is still the loot tables' answer.
 */
const STRUCTURE_FACE = {
    'Abandoned Camp': 'CAMPFIRE',
    'Ancient City': 'SCULK_SHRIEKER',
    'Bastion Remnant': 'POLISHED_BLACKSTONE_BRICKS',
    'Buried Treasure': 'FILLED_MAP',
    'Desert Pyramid': 'CHISELED_SANDSTONE',
    'Desert Well': 'SANDSTONE',
    Dungeon: 'SPAWNER',
    'End City': 'PURPUR_BLOCK',
    Igloo: 'SNOW_BLOCK',
    'Jungle Temple': 'MOSSY_COBBLESTONE',
    Mineshaft: 'RAIL',
    'Nether Fortress': 'NETHER_BRICKS',
    'Ocean Ruins': 'PRISMARINE',
    'Pillager Outpost': 'CROSSBOW',
    'Ruined Portal': 'CRYING_OBSIDIAN',
    Shipwreck: 'OAK_BOAT',
    Stronghold: 'END_PORTAL_FRAME',
    'Trail Ruins': 'SUSPICIOUS_GRAVEL',
    'Trial Chambers': 'TRIAL_SPAWNER',
    'Trial Chambers vault': 'VAULT',
    Village: 'BELL',
    'Woodland Mansion': 'DARK_OAK_PLANKS',
};
const faceOf = (structure, fallback) => STRUCTURE_FACE[structure] ?? fallback;

const titleMob = (id) => id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const mobSource = (id) => ({ m: MOB_ICON[id] ?? null, label: titleMob(id) });

const chain = (list) => list.map(([m, n, extra]) => ({
    m,
    n,
    // A tag is shown by one member and named for the group; "+1" means one alternative.
    label: extra && !extra.startsWith('+') ? `any ${extra.replace(/_/g, ' ')}` : itemName(m),
    alt: extra.startsWith?.('+') ? Number(extra.slice(1)) : 0,
}));

/**
 * Every data route for one item, in the order a player would think of them: make it,
 * cook it, mine it, kill for it, loot it, trade for it, then the unusual ones.
 */
export function routesFor(material) {
    const r = ROUTES[material];
    if (!r) return [];
    const out = [];
    const info = whereOf(material);

    if (r.craft) out.push({ kind: 'craft', verb: 'Craft', station: ['CRAFTING_TABLE', 'crafting table'], chain: chain(r.craft), yields: r.craftN ?? 1 });
    if (r.smelt) out.push({ kind: 'smelt', verb: 'Smelt', station: STATION[r.smeltAt] ?? STATION.smelting, chain: chain(r.smelt) });
    else if (r.cook) out.push({ kind: 'smelt', verb: 'Cook', station: STATION[r.cookAt] ?? STATION.smoking, chain: chain(r.cook) });
    if (r.cut) out.push({ kind: 'cut', verb: 'Cut', station: ['STONECUTTER', 'stonecutter'], chain: chain(r.cut), yields: r.cutN ?? 1 });
    if (r.smith) out.push({ kind: 'smith', verb: 'Upgrade', station: ['SMITHING_TABLE', 'smithing table'], chain: chain(r.smith) });

    if (r.mine) out.push({ kind: 'mine', verb: 'Mine', sources: r.mine.map((m) => ({ m, label: itemName(m) })) });
    // Its own block. Where it generates is the world's answer, not a structure's: /info
    // naming a structure (ancient debris: "Bastion") says where it can ALSO turn up,
    // which the loot route already carries, so only biomes are used here.
    if (r.self) {
        // `short` is what the route board prints under the face; the biome list is the
        // item's own tooltip, and the full label stays the screen reader's sentence.
        out.push({ kind: 'self', verb: 'Find', sources: [{ m: material, short: 'In the world', label: info?.biomes ? `in ${info.biomes}, and break it` : 'where it generates, and break it' }] });
    }
    if (r.mob) out.push({ kind: 'mob', verb: 'Hunt', sources: r.mob.map(mobSource) });
    if (r.chest) {
        out.push({
            kind: 'loot', verb: 'Loot', via: ['CHEST', 'Chest'],
            sources: r.chest.map((s) => ({
                m: faceOf(s, 'CHEST'),
                label: s,
                // config.yml's /info carries the odds for the structure it names.
                odds: info?.structure && info?.chance && s.toLowerCase().startsWith(info.structure.toLowerCase()) ? info.chance : null,
            })),
        });
    }
    if (r.brush) out.push({ kind: 'brush', verb: 'Brush', via: ['BRUSH', 'Brush'], sources: r.brush.map((s) => ({ m: faceOf(s, 'BRUSH'), label: s })) });
    if (r.trade) {
        out.push({
            kind: 'trade', verb: 'Trade', via: ['EMERALD', 'Emeralds'],
            sources: r.trade.map(([p, lvl]) => {
                const [m, label] = WORKSTATION[p] ?? ['EMERALD', titleMob(p)];
                return { m, label: lvl ? `${label}, ${LEVEL[lvl] ?? `level ${lvl}`}` : label };
            }),
        });
    }
    for (const g of r.gameplay ?? []) {
        const def = GAMEPLAY[g];
        if (def) out.push({ kind: `play-${g}`, verb: def.verb, sources: [{ m: def.icon ?? material, label: def.label }] });
    }
    if (r.shear) out.push({ kind: 'shear', verb: 'Shear', sources: r.shear.map((id) => ({ m: 'SHEARS', label: titleMob(id), mob: mobSource(id) })) });
    if (r.creeper) out.push({ kind: 'creeper', verb: 'Blow up', sources: [{ m: 'CREEPER_SPAWN_EGG', label: `a ${titleMob(r.creeper[0])} with a charged creeper` }] });
    return out;
}

/** The routes the map actually shows: the first few, in the order above. */
export const MAX_SHOWN = 5;
export const shownRoutes = (material) => routesFor(material).slice(0, MAX_SHOWN);

/** Whether any shown source carries /info odds, so the page only credits /info when it used it. */
export const showsOdds = (material) => shownRoutes(material).some((r) => r.sources?.slice(0, 3).some((s) => s.odds));

/*
 * "8 gold ingots", not "8 gold ingot". Minecraft's own names are mass nouns about as
 * often as not (8 wheat, 4 string, 3 gunpowder, 8 cobblestone), so this pluralises
 * only the count nouns it knows and leaves everything else as the game says it.
 */
const COUNTABLE = /\b(ingot|nugget|stick|log|pearl|rod|eye|bone|feather|shell|shard|scrap|fragment|crystal|bottle|bucket|egg|apple|carrot|potato|seed|brick|slab|block|ball|bowl|arrow|book|button|rail|torch|sign|emerald|diamond|star|tear|head|skull|chain|plate|pane|tile|door|bed|boat|wart|berry|cookie|melon slice|pickaxe|sword|axe|shovel|hoe|disc|flower|mushroom|sapling|leaf|pod|template|sherd|key|core|horn|scute|spike|lantern)$/i;
export function countLabel(n, label) {
    // A tag names a group: "6 planks (any kind)", not "6 any planks".
    if (label.startsWith('any ')) return `${n > 1 ? `${n} ` : ''}${label.slice(4)} (any kind)`;
    if (n <= 1) return label;
    if (!COUNTABLE.test(label)) return `${n} ${label}`;
    const plural = label
        .replace(/leaf$/i, 'leaves')
        .replace(/(berry)$/i, 'berries')
        .replace(/(torch)$/i, 'torches')
        .replace(/(potato)$/i, 'potatoes')
        .replace(/([^s])$/i, '$1s');
    return `${n} ${plural}`;
}

/* ── What the page deals ──────────────────────────────────────────────────────
 * Families (twenty sherds, eighteen trim templates) are one problem in twenty
 * colourways; dealing them shows one sprite. An item needs at least two distinct
 * data routes to be worth dealing on a page whose point is that there is a choice.
 */
const FAMILY = /_(POTTERY_SHERD|ARMOR_TRIM_SMITHING_TEMPLATE)$/;
export const DEALABLE = ALL_POOL.filter((m) => !FAMILY.test(m) && routesFor(m).length >= 2);

export const dealableFrom = (stageItems) => stageItems.filter((m) => !FAMILY.test(m) && routesFor(m).length >= 2);
