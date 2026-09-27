/**
 * Vendors the FIB item pool into `src/pages/Stats/itemPool.js`.
 *
 * The stats collection book shows the WHOLE pool — found items lit, missing
 * ones dimmed — so it needs the complete list of items the game can ask for.
 * No endpoint returns it: `/items` is only the rarity snapshot of items that
 * have already come up in matches, and `/collection/{player}` carries the pool
 * SIZE (totalItems) but not its names.
 *
 * The authoritative source is the plugin itself: every
 * `register(Material.X, State.Y, ...)` call in ItemDifficultiesManager.java is
 * a pool item, minus the tag classes the live config disables. The deployed
 * config (config.yml, repo root) has `extreme: false`, which removes exactly
 * the 50 EXTREME-tagged items: 1,367 registered - 50 = the 1,317 the service
 * reports as totalItems. The same filter is applied here from the same file,
 * so a config change re-filters on the next run.
 *
 * This runs on `prebuild`, so a production build always vendors a fresh pool.
 * It was manual for a long time and drifted badly: thirteen items (the trail
 * ruins set and TORCHFLOWER_SEEDS) were missing and seven more had a stale
 * phase, which the stats pages render as "Unassigned" or the wrong colour with
 * nothing to signal the snapshot is old. The cost of wiring it in is that a
 * build now needs GitHub reachable — the fetch failure below is fatal on
 * purpose, because a build that quietly falls back to the old snapshot is the
 * exact failure this is meant to end.
 *
 * `npm run dev` does NOT trigger prebuild, so run it by hand after a pool change
 * if you want the dev server to see it:
 *
 *   npm run vendor:pool
 *
 * The same run writes the wiki's atlas (`src/wiki/atlas.data.js`): the pool again,
 * with its tags, and where config.yml's /info lines say each item is found. See the
 * atlas block below main()'s helpers.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const PLUGIN_RAW =
  'https://raw.githubusercontent.com/McPlayHDnet/ForceItemBattle/main/src/main/java/forceitembattle';

/* The same URL the item-pools page parses at runtime. */
const JAVA_URL = `${PLUGIN_RAW}/manager/ItemDifficultiesManager.java`;
/* Custom items — see CUSTOM below. */
const CUSTOM_URL = `${PLUGIN_RAW}/model/CustomMaterials.java`;

const CONFIG = join(root, 'config.yml');
const OUT = join(root, 'src/pages/Stats/itemPool.js');
/*
 * The custom names ship in their own module rather than alongside the pool, because
 * Gameplay.jsx needs them and Gameplay is in the main bundle while itemPool.js belongs
 * to the lazily-loaded Stats chunk. Importing one name out of itemPool.js does NOT
 * tree-shake the 1,300-entry arrays out — the Stats chunk still uses them, so Rollup
 * keeps the module whole and hoists it into the shared parent, which measured as
 * +31 kB (+8.6 kB gzipped) on first paint for everyone who never opens Stats.
 */
const OUT_CUSTOM = join(root, 'src/config/customItems.js');
const TEXTURES = join(root, 'public/fib-items');
/*
 * The wiki's atlas: where each pool item lives. Its own module for the same reason
 * customItems.js is one — the wiki must not pull the Stats chunk's 1,300-entry arrays
 * into its first paint — and because it answers a question itemPool.js does not: not
 * WHEN an item can come up, but WHERE the world keeps it.
 */
const OUT_ATLAS = join(root, 'src/wiki/atlas.data.js');

const REGISTER = /register\(Material\.(\w+),\s*State\.(\w+)((?:,\s*ItemTag\.\w+)*)\)/g;

/*
 * Enum constants in CustomMaterials.java, whose first three arguments are always
 * on one line: NAME(Material.X, "id", "Display Name", …
 */
const CUSTOM = /^ {4}([A-Z][A-Z0-9_]*)\(Material\.(\w+),\s*"([^"]+)",\s*"((?:[^"\\]|\\.)*)"/gm;

/*
 * The plugin's own SHARES_MATERIAL_WITH_POOL_ITEM set — the custom items that must
 * NOT answer for their bare material. BRUSH is an EARLY force item found by crafting
 * a plain one, and TOTEM_OF_UNDYING is a LATE/EXTREME force item, so both keep their
 * vanilla names; CustomMaterials.nameOf() excludes them for exactly this reason and
 * reading the set means a change there does not need a change here.
 */
const SHARES_MATERIAL = /SHARES_MATERIAL_WITH_POOL_ITEM\s*=\s*\n?\s*Set\.of\(([^)]*)\)/;

/** The two-space-indented booleans under `settings:` in config.yml. */
function readSettings(yaml) {
  const get = (key, fallback) => {
    const m = yaml.match(new RegExp(`^  ${key}:\\s*(true|false)\\s*$`, 'm'));
    return m ? m[1] === 'true' : fallback;
  };
  return {
    hard: get('hard', false),
    extreme: get('extreme', false),
    /* Never written to config.yml: the live pool (1,317) includes the 34
       END-tagged items, so enabled is the proven default. */
    end: get('end', true),
  };
}

/** The same exclusions ItemDifficultiesManager.filterDisabledItems applies. */
function poolFilter(settings) {
  return (tags) => {
    if (!settings.hard && (tags.includes('NETHER') || tags.includes('EXTREME'))) return false;
    if (settings.hard && !settings.extreme && tags.includes('EXTREME')) return false;
    if (!settings.end && tags.includes('END')) return false;
    return true;
  };
}

/* ── The atlas ──────────────────────────────────────────────────────────────
 *
 * config.yml's `descriptions:` block is what /info prints in game, written by the
 * team per item. About 150 of those name the structure an item comes from
 * ("Structure: Ancient City") or list the loot tables that drop it with their odds
 * ("Woodland Mansion - 28.3%"), and about 150 name biomes. With the plugin's own
 * NETHER / END tags that is enough to say where most interesting items live without
 * a second, hand-kept list — which is the only way the wiki is allowed to say it.
 */

/** Material -> the /info lines, colour codes stripped. */
function readDescriptions(yaml) {
  const out = new Map();
  const start = yaml.search(/^descriptions:\s*$/m);
  if (start < 0) return out;
  let current = null;
  for (const line of yaml.slice(start).split(/\r?\n/).slice(1)) {
    const key = line.match(/^ {2}([A-Z0-9_]+):\s*$/);
    if (key) { current = []; out.set(key[1], current); continue; }
    const entry = line.match(/^ {4}- "(.*)"\s*$/);
    if (entry && current) { current.push(entry[1].replace(/&[0-9a-fk-or]/gi, '').trim()); continue; }
    if (/^\S/.test(line)) break; // the next top-level key ends the block
  }
  return out;
}

/** The structure, its loot odds and the biomes one item's /info lines name. */
function parseWhere(lines) {
  let structure = null;
  let chance = null;
  let biomes = null;
  const loot = [];
  let inLoot = false;
  for (const l of lines) {
    const s = l.match(/^Structures?:\s*(.+)$/);
    if (s && !structure) {
      structure = s[1].split(',')[0].replace(/\(.*?\)/g, '').trim();
      inLoot = false;
      continue;
    }
    if (/^Structure - (Chest )?Loot Table:/.test(l)) { inLoot = true; continue; }
    const b = l.match(/^Biomes?:\s*(.+)$/);
    if (b && !biomes) { biomes = b[1].trim(); inLoot = false; continue; }
    const row = inLoot && l.match(/^(.+?) - ([\d.]+%)/);
    if (row) { loot.push({ name: row[1].trim(), chance: row[2] }); continue; }
    inLoot = false;
  }
  if (!structure && loot.length) {
    // The likeliest source is the one a player would go to.
    const best = loot.reduce((a, b) => (parseFloat(b.chance) > parseFloat(a.chance) ? b : a));
    structure = best.name;
    chance = best.chance;
  }
  return { structure, chance, biomes };
}

/*
 * Region by first match. Tags outrank structures because they are the plugin's own
 * word: an END-tagged item is an End item wherever /info says it was found. A
 * structure is read by its FIRST name, so "Snowy Plains Village, Ancient City" pins to
 * the village — the easier of the two, and the one the team listed first.
 */
const STRUCTURE_REGIONS = [
  ['end', /End City|End Ship/i],
  ['deepdark', /Ancient City/i],
  ['trial', /Trial Chamber/i],
  ['ocean', /Ocean|Shipwreck|Monument|Buried Treasure/i],
  ['nether', /Bastion|Fortress|Nether/i],
  ['caves', /Geode|Mineshaft|Stronghold/i],
];

function regionOf(tags, where) {
  if (tags.includes('END')) return 'end';
  if (tags.includes('NETHER')) return 'nether';
  if (where.structure) {
    const hit = STRUCTURE_REGIONS.find(([, re]) => re.test(where.structure));
    return hit ? hit[0] : 'surface';
  }
  if (where.biomes) return /ocean/i.test(where.biomes) ? 'ocean' : 'surface';
  return null;
}

function buildAtlas(pool, tagsOf, descriptions) {
  const where = {};
  for (const material of pool) {
    const tags = tagsOf.get(material) ?? [];
    const w = parseWhere(descriptions.get(material) ?? []);
    const region = regionOf(tags, w);
    if (region) where[material] = [region, w.structure, w.chance, w.biomes];
  }
  const tags = Object.fromEntries(pool.filter((m) => tagsOf.has(m)).map((m) => [m, tagsOf.get(m)]));
  return { where, tags, described: pool.filter((m) => descriptions.has(m)).length };
}

function atlasModule({ where, tags, described }, pool, stateOf, settings, yaml) {
  const keys = Object.keys(where).sort();
  const stage = (s) => pool.filter((m) => stateOf.get(m) === s);
  const number = (key) => Number(yaml.match(new RegExp(`^  ${key}:\\s*(\\d+)\\s*$`, 'm'))?.[1] ?? NaN);
  const live = { ...settings, jokers: number('jokers'), backpackSize: number('backpackSize') };
  return `/**
 * GENERATED by scripts/vendor-pool.mjs — do not edit by hand.
 *
 * Where the pool's items live, for the wiki's atlas. ${keys.length} of the ${pool.length} pool items are
 * pinned to a region; ${described} carry an /info description in config.yml.
 *
 * ITEM_WHERE: MATERIAL -> [region, structure, loot chance, biomes], each null when
 *   /info does not say. Regions: surface, ocean, caves, trial, deepdark, nether, end.
 *   Tags decide first (END, NETHER, from the plugin), then the first structure /info
 *   names, then its biomes. An item /info says nothing about is simply absent.
 * ITEM_TAGS: MATERIAL -> the plugin's ItemTag names, pool items that have any.
 * POOL_BY_STAGE: the whole pool, grouped by the round stage each item unlocks in.
 * POOL_SETTINGS: the deployed config.yml values the pool and the round are built from.
 */

export const ATLAS_POOL_SIZE = ${pool.length};

export const POOL_SETTINGS = ${JSON.stringify(live)};

export const POOL_BY_STAGE = {
${['EARLY', 'MID', 'LATE'].map((s) => `  ${s}: ${JSON.stringify(stage(s))},`).join('\n')}
};

export const ITEM_WHERE = {
${keys.map((k) => `  ${k}: ${JSON.stringify(where[k])},`).join('\n')}
};

export const ITEM_TAGS = {
${Object.keys(tags).sort().map((k) => `  ${k}: ${JSON.stringify(tags[k])},`).join('\n')}
};
`;
}

async function main() {
  const [javaRes, customRes, yaml] = await Promise.all([
    fetch(JAVA_URL),
    fetch(CUSTOM_URL),
    readFile(CONFIG, 'utf8'),
  ]);
  for (const [url, res] of [[JAVA_URL, javaRes], [CUSTOM_URL, customRes]]) {
    if (!res.ok) {
      console.error(`Could not fetch ${url} (HTTP ${res.status}).`);
      process.exit(1);
    }
  }
  const java = await javaRes.text();
  const customJava = await customRes.text();
  const settings = readSettings(yaml);
  const keep = poolFilter(settings);

  const registered = [];
  const kept = new Map(); // material -> State (EARLY/MID/LATE, the match phase it unlocks in)
  const tagsOf = new Map(); // material -> ItemTag names, kept items only
  for (const m of java.matchAll(REGISTER)) {
    const material = m[1];
    const state = m[2];
    const tags = (m[3].match(/ItemTag\.(\w+)/g) ?? []).map((t) => t.slice(8));
    registered.push(material);
    if (keep(tags)) {
      kept.set(material, state);
      if (tags.length) tagsOf.set(material, tags);
    }
  }
  if (registered.length === 0) {
    console.error('Parsed zero register() calls — the manager source format has changed.');
    process.exit(1);
  }
  const pool = [...kept.keys()].sort();

  /*
   * Custom items, keyed by the material they ride on. Six of them own their material
   * outright — nobody is sent to find a knowledge book or a nether star as such — so
   * the plugin's nameOf() answers with the custom name and the site has to agree, or
   * the item index calls the Wheel of Fortune a "Nether Star".
   */
  const shared = new Set(
    (customJava.match(SHARES_MATERIAL)?.[1] ?? '').split(',').map((s) => s.trim()).filter(Boolean),
  );
  const customNames = new Map();
  for (const m of customJava.matchAll(CUSTOM)) {
    const [, constant, material, , itemName] = m;
    if (!shared.has(constant)) customNames.set(material, itemName);
  }
  if (customNames.size === 0) {
    console.error('Parsed zero CustomMaterials entries — the enum source format has changed.');
    process.exit(1);
  }
  if (shared.size === 0) {
    console.error('Parsed an empty SHARES_MATERIAL_WITH_POOL_ITEM — refusing to rename pool items.');
    process.exit(1);
  }
  const customKeys = [...customNames.keys()].sort();

  const header = `/**
 * GENERATED by scripts/vendor-pool.mjs — do not edit by hand.
 *
 * The full FIB item pool: every item the game can ask for, parsed from the
 * register() calls in the plugin's ItemDifficultiesManager.java with the live
 * config.yml exclusions applied (hard: ${settings.hard}, extreme: ${settings.extreme}, end: ${settings.end}
 * -> ${registered.length} registered, ${pool.length} in the pool). Regenerated on every
 * \`npm run build\` via prebuild; \`npm run dev\` does not, so re-run
 *   npm run vendor:pool
 * by hand when the pool or the config changes under the dev server.
 *
 * Names are bare Material enums (ACACIA_BOAT). Endpoint itemNames arrive
 * namespaced and lowercase (minecraft:acacia_boat); join the two with
 * itemKey(), which strips the namespace and case-folds.
 *
 * ITEM_STATE carries each item's match phase (EARLY/MID/LATE — when in a
 * match it can start coming up), straight from the same register() calls.
 *
 * Custom item names live in src/config/customItems.js, written by the same script.
 */
`;

  const body =
    `export const ITEM_POOL = [\n${pool.map((n) => `  '${n}',`).join('\n')}\n];\n\n` +
    `export const ITEM_STATE = {\n${pool.map((n) => `  ${n}: '${kept.get(n)}',`).join('\n')}\n};\n`;
  await writeFile(OUT, header + '\n' + body);

  const customFile = `/**
 * GENERATED by scripts/vendor-pool.mjs — do not edit by hand.
 *
 * The display name a material answers to when one of the plugin's custom items owns it
 * (${customKeys.length} of them), mirroring CustomMaterials.nameOf(). NETHER_STAR is the Wheel of
 * Fortune, KNOWLEDGE_BOOK the Antimatter Locator, and so on: these materials are never
 * handed out as themselves, so calling them by their vanilla name is simply wrong.
 *
 * Materials in the plugin's SHARES_MATERIAL_WITH_POOL_ITEM set are deliberately absent —
 * BRUSH is a real EARLY force item that merely shares its material with the Kiln-Fired
 * Brush, and TOTEM_OF_UNDYING with the Totem of Antimatter, so both keep vanilla names.
 *
 * Keys are bare Material enums; look up with an upper-cased key.
 */

export const CUSTOM_ITEM_NAMES = {
${customKeys.map((n) => `  ${n}: ${JSON.stringify(customNames.get(n))},`).join('\n')}
};
`;
  await writeFile(OUT_CUSTOM, customFile);

  const atlas = buildAtlas(pool, tagsOf, readDescriptions(yaml));
  await writeFile(OUT_ATLAS, atlasModule(atlas, pool, kept, settings, yaml));

  /* Texture coverage, so a pool addition that outruns vendor-textures is loud
     here rather than a slow remote fallback in the browser. */
  let textures = [];
  try {
    textures = await readdir(TEXTURES);
  } catch { /* no vendored set yet; vendor-textures will create it */ }
  const have = new Set(textures.filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)));
  const untextured = pool.filter((n) => !have.has(n.toLowerCase()));

  const phases = pool.reduce((acc, n) => {
    const s = kept.get(n);
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    `Wrote ${pool.length} pool items -> src/pages/Stats/itemPool.js ` +
    `(${registered.length} registered, settings hard=${settings.hard} extreme=${settings.extreme} end=${settings.end}; ` +
    `phases ${Object.entries(phases).map(([s, n]) => `${s} ${n}`).join('/')}; ` +
    `${customKeys.length} custom names, ${shared.size} shared-material exclusions)`,
  );
  if (untextured.length) {
    console.warn(
      `${untextured.length} pool item(s) have no vendored texture — re-run npm run vendor:textures: ` +
      untextured.join(', '),
    );
  }
}

main();
