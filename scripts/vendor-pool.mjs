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
  for (const m of java.matchAll(REGISTER)) {
    const material = m[1];
    const state = m[2];
    const tags = (m[3].match(/ItemTag\.(\w+)/g) ?? []).map((t) => t.slice(8));
    registered.push(material);
    if (keep(tags)) kept.set(material, state);
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
