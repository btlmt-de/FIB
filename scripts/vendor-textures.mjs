/**
 * Vendors FIB item sprites out of the resource pack into `public/fib-items/`.
 *
 * Why this exists: the stats module used to point at
 * raw.githubusercontent.com for every item sprite. That host is not a CDN — it
 * sends `cache-control: max-age=300`, so a browser revalidated every sprite on
 * the item index every five minutes, and GitHub throttles the origin. Serving
 * them from our own origin makes them immutable, cacheable assets.
 *
 * Why not copy all ~1,500: the pack is 17 MB of 128x128 PNGs, and the app can
 * only ever render items that appear in the data. Copying the reachable set
 * keeps the repo and the build small. Sprites outside the set fall back to the
 * remote URL at render time (see ITEM_TEXTURE_FALLBACK), so nothing breaks —
 * it just isn't fast, which is the right pressure to re-run this.
 *
 *   node scripts/vendor-textures.mjs          # copy the reachable set
 *   node scripts/vendor-textures.mjs --all    # copy the entire pack
 */

import { readdir, mkdir, copyFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'ForceItemBattle/assets/minecraft/textures/fib');
const OUT = join(root, 'public/fib-items');

/** The item names the app can actually reach, read from the data layer. */
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

  // Sizes are collected and summed afterwards rather than accumulated into a
  // shared counter: `total += await ...` inside a Promise.all reads `total`
  // before its own await resolves, so concurrent copies lose each other's
  // updates and the reported figure comes out an order of magnitude short.
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
}

main();
