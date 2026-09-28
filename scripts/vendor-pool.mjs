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
 * The same run writes the wiki's atlas (`src/wiki/data/atlas.data.js`): the pool again,
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
/*
 * The Paper version the plugin pins (run-paper boots it, production runs it), for the
 * How to Play page's "built for Paper X". That line was typed by hand and had already
 * drifted a release behind when it moved here. vendor-routes.mjs reads the same file
 * for its Minecraft data, but routes.data.js is 120 kB and a page that wants one
 * string should not pay for it, so the version is written into the atlas too.
 */
/* Where the plugin registers its commands; see checkCommands. */
const GRADLE_URL = 'https://raw.githubusercontent.com/McPlayHDnet/ForceItemBattle/main/build.gradle.kts';
const PAPER_VERSION_URL = 'https://raw.githubusercontent.com/McPlayHDnet/ForceItemBattle/main/paper-version.json';

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
const OUT_ATLAS = join(root, 'src/wiki/data/atlas.data.js');
/*
 * The round settings, for the Game Settings page: the plugin's GameSetting enum (name,
 * in-game description, config key, default, and the item its /settings menu shows)
 * joined to this repo's config.yml, which is the deployed one. The page used to keep
 * its own list, and had drifted into settings that do not exist (Nether, Player
 * Trading) and defaults that were the wrong way round.
 */
const SETTINGS_URL = `${PLUGIN_RAW}/settings/GameSetting.java`;
const OUT_SETTINGS = join(root, 'src/wiki/data/settings.data.js');

/*
 * The Commands page plays each example in chat, and /info's answer is the item's own
 * description from config.yml. Only the items its examples ask for are written out,
 * colour codes kept, so the chat shows exactly what the game prints.
 */
const OUT_INFO = join(root, 'src/wiki/data/info.data.js');

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

/*
 * One /info line as plain words: the colour and format codes out, and then any '&'
 * still glued to a word, which is a code typed wrong ("&Savanna" for "&aSavanna");
 * the game prints those literally, but the atlas is not the game's chat. An '&' with
 * space after it is a real ampersand ("River & Frozen River Shores") and stays.
 */
function cleanLine(text) {
  return text.replace(/&[0-9a-fk-or]/gi, '').replace(/&(?=\S)/g, '').trim();
}

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
    if (entry && current) { current.push(cleanLine(entry[1])); continue; }
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

/* Structures no STRUCTURE_REGIONS entry recognises, reported once per run: each
   falls back to surface, which is right for a village and wrong for a misspelt
   "Trail Chambers", so the list is the thing to read. */
const unmatchedStructures = new Set();

function regionOf(tags, where) {
  if (tags.includes('END')) return 'end';
  if (tags.includes('NETHER')) return 'nether';
  if (where.structure) {
    const hit = STRUCTURE_REGIONS.find(([, re]) => re.test(where.structure));
    if (!hit) unmatchedStructures.add(where.structure);
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
  if (unmatchedStructures.size) {
    console.log(`Structures pinned to the surface for want of a region: ${[...unmatchedStructures].sort().join(', ')}.`);
  }
  const tags = Object.fromEntries(pool.filter((m) => tagsOf.has(m)).map((m) => [m, tagsOf.get(m)]));
  return { where, tags, described: pool.filter((m) => descriptions.has(m)).length };
}

function atlasModule({ where, tags, described }, pool, stateOf, settings, yaml, paperVersion) {
  const keys = Object.keys(where).sort();
  const stage = (s) => pool.filter((m) => stateOf.get(m) === s);
  // The backpack is Backpack rows (settings.backpackRows, which the plugin reads) times
  // nine. It used to be standard.backpackSize, which the plugin never reads, and jokers
  // came from standard.jokers the same way; the round's jokers are ROUND in tokens.js.
  const rows = Number(yaml.match(/^ {2}backpackRows:\s*(\d+)\s*$/m)?.[1] ?? 3);
  const live = { ...settings, backpackSize: rows * 9 };
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
 * POOL_SETTINGS: config.yml's pool switches (hard, extreme, end) and backpack slots.
 * PAPER_VERSION: the Paper version the plugin pins in paper-version.json.
 */

export const ATLAS_POOL_SIZE = ${pool.length};

export const POOL_SETTINGS = ${JSON.stringify(live)};

export const PAPER_VERSION = ${JSON.stringify(paperVersion)};

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
  const [javaRes, customRes, paperRes, yaml] = await Promise.all([
    fetch(JAVA_URL),
    fetch(CUSTOM_URL),
    fetch(PAPER_VERSION_URL),
    readFile(CONFIG, 'utf8'),
  ]);
  for (const [url, res] of [[JAVA_URL, javaRes], [CUSTOM_URL, customRes], [PAPER_VERSION_URL, paperRes]]) {
    if (!res.ok) {
      console.error(`Could not fetch ${url} (HTTP ${res.status}).`);
      process.exit(1);
    }
  }
  const java = await javaRes.text();
  const customJava = await customRes.text();
  const paperVersion = (await paperRes.json()).version;
  if (!paperVersion) {
    console.error(`${PAPER_VERSION_URL} carries no "version".`);
    process.exit(1);
  }
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
  await writeFile(OUT_ATLAS, atlasModule(atlas, pool, kept, settings, yaml, paperVersion));

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

  await checkCommands();
  await checkChangelog();
  await writeSettings(yaml);
  await writeInfoSamples(yaml);
}

/** The /info text, colour codes kept, of every item a Commands example asks /info about. */
async function writeInfoSamples(yaml) {
  const { COMMANDS } = await import('../src/wiki/data/commands.data.js');
  const wanted = COMMANDS.flatMap((c) => c.forms)
    .map((f) => f.example?.match(/^\/info (\w+)$/)?.[1]?.toUpperCase())
    .filter(Boolean);
  const text = yaml.replace(/\r\n/g, '\n');
  const start = text.search(/^descriptions:\s*$/m);
  const info = {};
  for (const material of wanted) {
    const block = start < 0 ? null : text.slice(start).match(new RegExp(`^ {2}${material}:\\n((?: {4}- .*\\n)+)`, 'm'));
    if (!block) {
      console.warn(`[WARNING] A Commands example asks /info about ${material}, which has no description in config.yml.`);
      continue;
    }
    info[material] = [...block[1].matchAll(/^ {4}- "(.*)"$/gm)].map((m) => m[1].replace(/\\"/g, '"'));
  }
  await writeFile(OUT_INFO, `/**
 * GENERATED by scripts/vendor-pool.mjs from this repo's config.yml. Do not edit by hand.
 *
 * INFO: what /info prints for each item a Commands example asks about, line for line,
 *   with the & colour codes the game reads.
 */

export const INFO = ${JSON.stringify(info, null, 2)};
`);
}

/* MiniMessage to plain words: the lore is written for the game's chat. */
const plain = (line) => line.replace(/<[^>]+>/g, '').trim();

async function writeSettings(rawYaml) {
  // config.yml is checked out with CRLF on Windows; the block patterns below are line-based.
  const yaml = rawYaml.replace(/\r\n/g, '\n');
  let java;
  try {
    const res = await fetch(SETTINGS_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    java = await res.text();
  } catch (e) {
    console.warn(`[WARNING] Could not read ${SETTINGS_URL} (${e.message}); src/wiki/data/settings.data.js was left as it was.`);
    return;
  }
  // NAME("Display", List.of(...) | null, "configPath", default, Material.X)
  const ENTRY = /\b([A-Z_]+)\(\s*"([^"]+)",\s*(null|List\.of\(([\s\S]*?)\)),\s*"([^"]+)",\s*([^,]+?),\s*Material\.([A-Z_]+)\s*\)/g;
  const block = yaml.match(/^settings:\n((?: {2}.*\n?)*)/m)?.[1] ?? '';
  const configured = Object.fromEntries([...block.matchAll(/^ {2}(\w+):\s*(\S+)\s*$/gm)].map((m) => [m[1], m[2]]));
  const settings = [];
  for (const m of java.matchAll(ENTRY)) {
    const [, key, name, , loreBody, path, rawDefault, material] = m;
    const loreLines = loreBody ? [...loreBody.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]) : [];
    const lore = loreLines.map(plain).filter(Boolean);
    // The same lines as the menu's tooltip prints them: MiniMessage kept, blank lines too.
    const mm = loreLines.map((l) => l.replace(/\\"/g, '"'));
    const def = rawDefault.trim() === 'true' ? true : rawDefault.trim() === 'false' ? false : Number(rawDefault.trim());
    const raw = configured[path];
    const standard = raw === undefined ? def : raw === 'true' ? true : raw === 'false' ? false : Number(raw);
    settings.push({ key, name, lore, mm, path, default: def, standard, configured: raw !== undefined, material });
  }
  if (settings.length < 10) {
    console.warn(`[WARNING] Only ${settings.length} settings parsed from GameSetting.java; its entry shape may have changed. settings.data.js was left as it was.`);
    return;
  }
  const known = new Set(settings.map((x) => x.path));
  const dead = Object.keys(configured).filter((k) => !known.has(k));
  await writeFile(OUT_SETTINGS, `/**
 * GENERATED by scripts/vendor-pool.mjs from the plugin's settings/GameSetting.java and
 * this repo's config.yml. Do not edit by hand.
 *
 * SETTINGS: every round setting in the order the plugin declares it. name and lore are
 *   the plugin's (lore is its in-game description, MiniMessage removed; mm is the same
 *   lore as the /settings menu's tooltip prints it, MiniMessage and blank lines kept); path is the
 *   key under settings: in config.yml; default is the plugin's; standard is what this
 *   repo's config.yml sets, the standard round's settings, or the default where it
 *   sets nothing (configured says which); material is the item its /settings menu shows.
 *   config.yml's standard: block is not read: the plugin writes it as a default and
 *   never reads it back. The standard round's length and jokers are ROUND in
 *   src/wiki/tokens.js.
 * DEAD_KEYS: keys under settings: in config.yml that match no setting, so the server
 *   ignores them.
 */

export const SETTINGS = [
${settings.map((x) => `  ${JSON.stringify(x)},`).join('\n')}
];

export const DEAD_KEYS = ${JSON.stringify(dead)};
`);
  console.log(`Wrote ${settings.length} round settings -> src/wiki/data/settings.data.js`);
  if (dead.length) console.warn(`[WARNING] config.yml sets ${dead.map((k) => `settings.${k}`).join(', ')}, which no setting reads; the server ignores ${dead.length === 1 ? 'it' : 'them'}.`);
}

/*
 * The Commands page's list against the plugin's. The page's words are hand-written
 * (src/wiki/data/commands.data.js) but the list is not the page's to decide: a command the
 * plugin registers must be on it, and one the plugin dropped must not be. Registration
 * lives in build.gradle.kts (commands.register, which generates plugin.yml). A warning,
 * not a failure: the page can be a release behind for a day without breaking the build.
 */
async function checkCommands() {
  try {
    const res = await fetch(GRADLE_URL);
    if (!res.ok) { console.warn(`Could not read ${GRADLE_URL} to check the Commands page (HTTP ${res.status}).`); return; }
    const registered = new Set([...(await res.text()).matchAll(/commands\.register\("([a-z0-9_]+)"\)/g)].map((m) => m[1]));
    const { COMMANDS, UNLISTED = [] } = await import('../src/wiki/data/commands.data.js');
    const listed = new Set([...COMMANDS.map((c) => c.name), ...UNLISTED]);
    const missing = [...registered].filter((n) => !listed.has(n));
    const gone = [...listed].filter((n) => !registered.has(n));
    if (missing.length) console.warn(`[WARNING] The plugin registers command(s) the Commands page does not list: /${missing.join(', /')}. Add them to src/wiki/data/commands.data.js.`);
    if (gone.length) console.warn(`[WARNING] The Commands page lists command(s) the plugin no longer registers: /${gone.join(', /')}.`);
    if (!missing.length && !gone.length) console.log(`Commands page matches the plugin's ${registered.size} registered commands.`);
  } catch (e) {
    console.warn(`Could not check the Commands page against the plugin: ${e.message}`);
  }
}

// The Changelog is hand-written (src/wiki/data/changelog.data.js), so a release can ship
// without an entry. The plugin's build.gradle.kts carries the version it builds as
// (version = "26.9.3"); when that is not the newest entry, say so. A warning, not a
// failure: the entry is words someone has to write, and a build is no place to wait.
async function checkChangelog() {
  try {
    const res = await fetch(GRADLE_URL);
    if (!res.ok) { console.warn(`Could not read ${GRADLE_URL} to check the Changelog (HTTP ${res.status}).`); return; }
    const plugin = /^version\s*=\s*"([^"]+)"/m.exec(await res.text())?.[1];
    if (!plugin) { console.warn("[WARNING] Could not find the plugin's version in build.gradle.kts to check the Changelog."); return; }
    const { CHANGELOG } = await import('../src/wiki/data/changelog.data.js');
    const newest = CHANGELOG[0]?.version;
    if (newest === plugin) console.log(`Changelog is up to date with the plugin (v${plugin}).`);
    else if (CHANGELOG.some((e) => e.version === plugin)) console.warn(`[WARNING] The plugin on main builds v${plugin}, but the Changelog's newest entry is v${newest}.`);
    else console.warn(`[WARNING] The plugin on main builds v${plugin}, which has no entry in src/wiki/data/changelog.data.js (newest there: v${newest}).`);
  } catch (e) {
    console.warn(`Could not check the Changelog against the plugin: ${e.message}`);
  }
}

main();
