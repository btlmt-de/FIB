/**
 * Packs the vendored item sprites into a single atlas for the wheel's canvas.
 *
 * Why this exists: the wheel used to fetch every sprite in the pool — ~1,500
 * files — before it would let anyone spin, because a strip draws items at random
 * and any one that had not arrived rendered as a barrier. That bought the "no
 * missing textures" guarantee at the price of a cold start measured in tens of
 * seconds, and moving the files between hosts only changed who absorbed it.
 *
 * An atlas buys the same guarantee for one request. One image means every sprite
 * becomes available at the same instant, so a half-loaded strip is not a state
 * that can exist, and the spin button can gate on a single load again.
 *
 * On the numbers, measured rather than assumed:
 *
 *   today, individual files   1,537 requests   13.1 MB
 *   atlas 128px PNG                1 request   15.8 MB   <- bigger than today
 *   atlas 128px WebP lossless      1 request    9.7 MB   25.6 MP
 *   atlas  96px WebP lossless      1 request    6.4 MB   14.4 MP  <- chosen
 *
 * Two things drove those choices. PNG is the wrong container: each individual
 * sprite optimises its own palette, while one big atlas is forced to 32-bit
 * RGBA, so a full-resolution PNG atlas is *larger* than the files it replaces.
 * WebP lossless gets that back without touching a pixel.
 *
 * And TILE is 96, not the pack's native 128, to stay under ~16.7 MP. Mobile
 * Safari subsamples decoded images past roughly that area, which would quietly
 * undo the resolution we were paying to keep. 96 costs a 1.17x upscale on the
 * result item at DPR 2 (it draws 56 CSS px, so 112 device px) and is still a
 * slight downscale in the strip, which draws ~46 CSS px. Note the sprites are
 * genuine 128x128 art — an earlier version of this comment claimed they were 8x
 * upscales of 16x16 originals, which is wrong and would have justified a much
 * smaller tile. Only nether_star has any block structure.
 *
 * This does NOT replace public/fib-items/. Only canvas call sites can use an
 * atlas (drawImage takes a source rect); every <img> in the activity feed,
 * collection book, profile and wiki pages still wants individual files. Both are
 * generated from the same source, so they cannot disagree about what a sprite
 * looks like. A browser that cannot decode WebP simply fails to load the atlas
 * and falls back to those files, which is the same path the unpacked sprites
 * already take.
 *
 *   node scripts/vendor-atlas.mjs               # TILE=96, WebP lossless
 *   node scripts/vendor-atlas.mjs --tile 128    # native resolution, 25.6 MP
 */

import { readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'public/fib-items');
const OUT_IMAGE = join(root, 'public/fib-atlas.webp');
const OUT_JSON = join(root, 'public/fib-atlas.json');

/** Past roughly this area mobile Safari subsamples decoded images. */
const MAX_MEGAPIXELS = 16.7;

const tileArg = process.argv.indexOf('--tile');
const TILE = tileArg === -1 ? 96 : Number(process.argv[tileArg + 1]);

if (!Number.isInteger(TILE) || TILE < 8 || TILE > 128) {
  console.error(`--tile must be an integer between 8 and 128, got ${TILE}`);
  process.exit(1);
}

const bytes = (n) =>
  n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`;

async function main() {
  let files;
  try {
    files = (await readdir(SRC)).filter((f) => f.endsWith('.png')).sort();
  } catch {
    console.error(
      `No vendored sprites at ${SRC}.\n` +
      'Run `npm run vendor:textures` first — the atlas is packed from that output, ' +
      'not from the resource pack, so the two can never disagree.',
    );
    process.exit(1);
  }

  if (files.length === 0) {
    console.error(`${SRC} has no PNGs to pack.`);
    process.exit(1);
  }

  // Square-ish, row-major. Sorted by filename so the layout is deterministic:
  // regenerating without adding items must produce a byte-identical atlas, or
  // every deploy churns a 5 MB binary in git for no reason.
  const cols = Math.ceil(Math.sqrt(files.length));
  const rows = Math.ceil(files.length / cols);
  const width = cols * TILE;
  const height = rows * TILE;

  // Composed by blitting raw RGBA rather than through sharp's composite(): 1,500
  // composite operations in one pipeline is far slower and much heavier on
  // memory than writing the pixels ourselves, and this way the nearest-neighbour
  // resize is the only resampling that happens to the art.
  const atlas = Buffer.alloc(width * height * 4);
  const sprites = {};

  for (const [i, file] of files.entries()) {
    const name = file.slice(0, -4);
    const { data } = await sharp(join(SRC, file))
      // `nearest` is not optional. Any smooth kernel turns pixel art into mush,
      // and these are 8x upscales, so a blurred downscale is very visible.
      .resize(TILE, TILE, { kernel: 'nearest', fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const col = i % cols;
    const row = Math.floor(i / cols);
    for (let y = 0; y < TILE; y++) {
      data.copy(
        atlas,
        ((row * TILE + y) * width + col * TILE) * 4,
        y * TILE * 4,
        (y + 1) * TILE * 4,
      );
    }

    // Keyed by name, holding the flat index. The index is meaningless without
    // `cols`, which is why both live in this one file — a JSON that disagreed
    // with the PNG about the grid would not break one sprite, it would shift
    // every sprite after the insertion point.
    sprites[name] = i;
  }

  await mkdir(dirname(OUT_IMAGE), { recursive: true });
  await sharp(atlas, { raw: { width, height, channels: 4 } })
    // Lossless, not quality-90. The lossy encoder is roughly half the size, but
    // these are hard-edged sprites on transparency, which is precisely what
    // WebP's lossy mode rings around.
    .webp({ lossless: true, effort: 6 })
    .toFile(OUT_IMAGE);

  const meta = { tile: TILE, cols, rows, width, height, count: files.length, sprites };
  await writeFile(OUT_JSON, JSON.stringify(meta));

  const { size } = await stat(OUT_IMAGE);
  const jsonSize = Buffer.byteLength(JSON.stringify(meta));
  const megapixels = (width * height) / 1e6;

  console.log(
    `Packed ${files.length} sprites at ${TILE}px into ${cols}x${rows} ` +
    `(${width}x${height}, ${megapixels.toFixed(1)} MP) -> public/fib-atlas.webp ` +
    `(${bytes(size)}) + fib-atlas.json (${bytes(jsonSize)})`,
  );

  if (megapixels > MAX_MEGAPIXELS) {
    console.warn(
      `\nWARNING: ${megapixels.toFixed(1)} MP exceeds the ~${MAX_MEGAPIXELS} MP ` +
      'point where mobile Safari starts subsampling decoded images. It will not ' +
      'break — drawImage coordinates stay valid because the logical size is ' +
      'unchanged — but sprites will be softer on iOS than the tile size implies, ' +
      'which defeats the reason for raising it. Prefer --tile 96.',
    );
  }
}

main();
