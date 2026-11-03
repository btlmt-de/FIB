/*
 * Copies only reachable sprites into public/fib-items (the pack is 17 MB); others fall back to GitHub at render time.
 *   node scripts/vendor-textures.mjs          # the reachable set
 *   node scripts/vendor-textures.mjs --all    # the whole pack
 */

import { readdir, mkdir, copyFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'ForceItemBattle/assets/minecraft/textures/fib');
const OUT = join(root, 'public/fib-items');

/*
 * No .mcmeta: knowledge_book, sulfur_locator and trial_locator are animated strips a browser draws as one tall image.
 * The wheel's locator art uses the static renders in public/fib-items instead, which exist only while KNOWLEDGE_BOOK,
 * MUSIC_DISC_CHIRP and WITHER_ROSE stay in the plugin's pool.
 */
const CUSTOM_SRC = join(root, 'ForceItemBattle/assets/minecraft/textures/item');
const CUSTOM_OUT = join(root, 'public/fib-custom');

async function reachableKeys() {
  const { ITEM_POOL, itemKey } = await import('../src/pages/Stats/data.js');
  return new Set(ITEM_POOL.map(itemKey));
}

const bytes = (n) =>
  n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`;

async function main() {
  const all = process.argv.includes('--all');

  let available;
  try {
    available = await readdir(SRC);
  } catch {
    console.error(
      `No resource pack at ${SRC}.\n` +
      'The stats module will fall back to the remote texture host, which is slow but works.',
    );
    process.exit(1);
  }

  const wanted = all ? null : await reachableKeys();
  const files = available.filter(
    (f) => f.endsWith('.png') && (all || wanted.has(f.slice(0, -4))),
  );

  await mkdir(OUT, { recursive: true });

  // Summed afterwards: `total += await` inside Promise.all loses concurrent updates.
  const sizes = await Promise.all(
    files.map(async (f) => {
      await copyFile(join(SRC, f), join(OUT, f));
      return (await stat(join(SRC, f))).size;
    }),
  );
  const total = sizes.reduce((a, b) => a + b, 0);

  const missing = all
    ? []
    : [...wanted].filter((k) => !available.includes(`${k}.png`));

  console.log(`Vendored ${files.length} sprites (${bytes(total)}) -> public/fib-items/`);
  if (missing.length) {
    console.warn(
      `${missing.length} item(s) in the pool have no texture in the pack and will ` +
      `fall back to the remote host: ${missing.join(', ')}`,
    );
  }

  await copyCustom();
}

async function copyCustom() {
  let available;
  try {
    available = await readdir(CUSTOM_SRC);
  } catch {
    console.warn(`No custom textures at ${CUSTOM_SRC}; skipping public/fib-custom/.`);
    return;
  }

  const files = available.filter((f) => f.endsWith('.png'));
  await mkdir(CUSTOM_OUT, { recursive: true });

  const sizes = await Promise.all(
    files.map(async (f) => {
      await copyFile(join(CUSTOM_SRC, f), join(CUSTOM_OUT, f));
      return (await stat(join(CUSTOM_SRC, f))).size;
    }),
  );

  console.log(
    `Vendored ${files.length} custom textures ` +
    `(${bytes(sizes.reduce((a, b) => a + b, 0))}) -> public/fib-custom/`,
  );
}

main();
