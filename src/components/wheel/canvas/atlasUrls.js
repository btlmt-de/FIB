// ============================================
// atlasUrls.js — where the atlas lives, and nothing else
// ============================================
//
// Two strings, no imports. That is the whole point of the file.
//
// These used to live in atlas.js, which App.jsx imported so it could preload the
// index on the /wheel route. App.jsx is the entry chunk — it is on the critical
// path of every route, including the wiki — and importing a constant from
// atlas.js drags atlas.js in, which drags utils/helpers.js in, to read two
// string literals that depend on neither.
//
// A leaf module with no dependencies can be imported from the entry without
// pulling the wheel's canvas layer along behind it. atlas.js imports these too,
// so there is still exactly one definition.
//
// WebP, not PNG: at this size a lossless WebP atlas is 6.4 MB against 10.1 MB as
// PNG, for identical pixels. A browser too old to decode it fails loadAtlas()
// and falls back to individual sprites, so the format costs nothing in reach.
//
// Note that ATLAS_IMAGE is NOT the URL the image is actually requested from —
// loadAtlas() appends the index's own `?v=<version>` stamp. Anything matching or
// preloading the image has to account for that; see the note in App.jsx about
// the preload this cost us, and ATLAS_URL_PATTERN in public/sw.js.
export const ATLAS_IMAGE = '/fib-atlas.webp';
export const ATLAS_JSON = '/fib-atlas.json';
