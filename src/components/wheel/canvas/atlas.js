// ============================================
// atlas.js — one image, every item sprite
// ============================================
//
// The wheel's canvas draws item sprites out of a single packed atlas rather than
// out of ~1,500 individual files. See scripts/vendor-atlas.mjs for how it is
// built and why.
//
// The property that matters here is atomicity. Previously a strip drew items
// picked at random from the pool, and any sprite that had not arrived yet
// rendered as a barrier — so the wheel blocked on preloading the entire pool to
// avoid it, which is what made arriving on the page slow. With an atlas there is
// no half-loaded state to design around: either the one image is ready and every
// sprite is available, or it is not ready and we fall back per item.
//
// Not everything lives in the atlas, and that is deliberate. It packs the item
// pool only — the sprites vendored under /fib-items/. Player heads, Discord
// avatars, the custom /fib-custom/ items, and the one-off /event.png and
// /wheel.png are all still fetched individually, because they are few, they are
// not all same-origin, and some of them change independently of the pack.

import { getItemImageUrl } from '../../../utils/helpers.js';

// WebP, not PNG: at this size a lossless WebP atlas is 6.4 MB against 10.1 MB as
// PNG, for identical pixels. A browser too old to decode it fails loadAtlas() and
// falls back to individual sprites, so the format costs nothing in reach.
//
// Exported so App.jsx can preload the pair as soon as /wheel is requested —
// 6.4 MB that only starts downloading after the lazy chunk mounts is 6.4 MB
// the cold start did not need.
export const ATLAS_IMAGE = '/fib-atlas.webp';
export const ATLAS_JSON = '/fib-atlas.json';

/** Only /fib-items/<name>.png is packed; everything else resolves per item. */
const POOL_SPRITE = /^\/fib-items\/([^/]+)\.png$/;

let atlasImage = null;
let atlasMeta = null;
let loadPromise = null;

/**
 * Loads the atlas once per page. Concurrent callers share the same promise, and
 * a failure is remembered rather than retried on every frame — if the atlas is
 * unavailable the per-item path still works, just without the guarantee.
 *
 * Resolves to true when the atlas is usable. Never rejects: callers are render
 * paths, and a rejected promise there would mean a broken wheel rather than a
 * slower one.
 */
export function loadAtlas() {
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
        if (typeof Image === 'undefined' || typeof fetch === 'undefined') return false;

        try {
            // The JSON is fetched first and the image only after it parses. They
            // are a matched pair — the index is meaningless without the grid the
            // PNG was laid out on — so there is no point holding a decoded 5 MB
            // bitmap we cannot address.
            const res = await fetch(ATLAS_JSON);
            if (!res.ok) throw new Error(`atlas index HTTP ${res.status}`);
            const meta = await res.json();

            if (!meta?.sprites || !meta.tile || !meta.cols) {
                throw new Error('atlas index is missing tile/cols/sprites');
            }

            const img = await new Promise((resolve, reject) => {
                const el = new Image();
                el.onload = () => resolve(el);
                el.onerror = () => reject(new Error('atlas image failed to load'));
                el.src = ATLAS_IMAGE;
            });

            // A JSON that disagrees with the PNG about the grid does not break one
            // sprite, it shifts every sprite after the insertion point — which
            // looks like a rendering bug rather than a stale asset. Cheaper to
            // refuse the atlas outright and let the per-item path cover it.
            if (img.naturalWidth !== meta.width || img.naturalHeight !== meta.height) {
                throw new Error(
                    `atlas is ${img.naturalWidth}x${img.naturalHeight} but its index ` +
                    `describes ${meta.width}x${meta.height} — regenerate with ` +
                    '`npm run vendor:atlas`',
                );
            }

            atlasImage = img;
            atlasMeta = meta;
            return true;
        } catch (err) {
            console.error('[atlas] falling back to per-item sprites:', err);
            return false;
        }
    })();

    return loadPromise;
}

/** True once the atlas is loaded and addressable. */
export function isAtlasReady() {
    return atlasImage !== null && atlasMeta !== null;
}

/**
 * Where to find an item in the atlas, or null if it is not packed.
 *
 * Returns the arguments a canvas needs for the 9-argument drawImage: the shared
 * image plus the source rect. Callers that get null fall back to loading the
 * item's own URL.
 */
export function getAtlasSprite(item) {
    if (!isAtlasReady() || !item) return null;

    const match = POOL_SPRITE.exec(getItemImageUrl(item));
    if (!match) return null;

    const index = atlasMeta.sprites[match[1]];
    if (index === undefined) return null;

    // The grid pitch is the *cell*, not the tile: each sprite sits inside a
    // gutter of extruded edge pixels so that smoothed sampling cannot reach its
    // neighbour. See PAD in scripts/vendor-atlas.mjs for why that gutter exists.
    //
    // Both keys default for an atlas packed before the gutter did, which keeps a
    // stale public/fib-atlas.webp rendering correctly rather than shifting every
    // sprite by two pixels — the failure mode this file already refuses to allow
    // for the grid dimensions.
    const { tile, cols } = atlasMeta;
    const pad = atlasMeta.pad ?? 0;
    const cell = atlasMeta.cell ?? tile;
    return {
        image: atlasImage,
        sx: (index % cols) * cell + pad,
        sy: Math.floor(index / cols) * cell + pad,
        size: tile,
    };
}

/**
 * Whether this item still needs its own image fetched.
 *
 * Deliberately answerable before the atlas has loaded, which is when the preload
 * paths need it: the decision is made from the item's URL shape, not from the
 * index. Anything resolving to /fib-items/ is the pool and will be packed;
 * everything else — heads, avatars, custom items, event art — is not.
 *
 * Once the index is loaded it is consulted too, so an item that is in the pool
 * but somehow missing from the atlas still gets fetched individually rather than
 * silently rendering nothing.
 */
export function needsOwnImage(item) {
    if (!item) return false;

    const match = POOL_SPRITE.exec(getItemImageUrl(item));
    if (!match) return true;

    return atlasMeta ? atlasMeta.sprites[match[1]] === undefined : false;
}

/**
 * drawImage against the atlas when possible, against a per-item image otherwise.
 *
 * Centralised so the three canvas renderers cannot drift on the argument order —
 * the 9-argument form takes source rect before destination rect, and getting
 * that backwards silently draws the wrong crop rather than throwing.
 *
 * Returns true if something was drawn.
 */
export function drawItemSprite(ctx, item, fallbackImage, dx, dy, dSize) {
    const sprite = getAtlasSprite(item);

    if (sprite) {
        ctx.drawImage(
            sprite.image,
            sprite.sx, sprite.sy, sprite.size, sprite.size,
            dx, dy, dSize, dSize,
        );
        return true;
    }

    if (fallbackImage) {
        ctx.drawImage(fallbackImage, dx, dy, dSize, dSize);
        return true;
    }

    return false;
}
