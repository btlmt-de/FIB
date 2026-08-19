// Service Worker for FIB Wheel of Fortune

// Bumped to v2 when item sprites moved from raw.githubusercontent.com to our own
// origin. The activate handler deletes every `fib-` cache that isn't the current
// one, so the rename is what evicts the old GitHub-keyed entries — without it,
// returning visitors would carry a dead cache of remote URLs around forever.
const CACHE_NAME = 'fib-textures-v2';

// Sprites are same-origin now (/fib-items/, /fib-custom/). Keeping cache-first
// over them is still worth it: files under public/ are not content-hashed, so
// their freshness is at the mercy of whatever headers the host sends, and the
// wheel wants all ~1,500 of them present before it will let anyone spin.
const TEXTURE_URL_PATTERN = /\/fib-(items|custom)\/[^/]+\.(png|gif)$/;

// The atlas is packed from the same sprites but lives at its own URL, so it
// needs its own pattern. It is the wheel's single largest request (6.4 MB),
// and caching it is survivable if stale: sprites fall out of a stale index one
// by one, each falling back to its individual file (atlas.js needsOwnImage),
// and the dimension guard refuses a webp/json pair that disagree. A wheel
// texture change still gets evicted by the CACHE_NAME rename, like the
// sprites.
// Matched against the PATHNAME, not the full URL. atlas.js requests the image
// as `/fib-atlas.webp?v=<version>` (see the version-stamp note there), and this
// pattern is `$`-anchored — so tested against `event.request.url` it matched the
// unversioned URL nobody requests and missed the versioned one everybody does.
// The single largest asset on the surface went uncached while the code here
// said it was cached.
const ATLAS_URL_PATTERN = /\/fib-atlas\.(webp|json)$/;

// The remote pack, still matched so that anything not yet vendored — and any
// client running a build from before the move — keeps its cache-first path.
const REMOTE_TEXTURE_PATTERN = /raw\.githubusercontent\.com\/btlmt-de\/FIB\/.*\/textures\/(fib|item)\/.+\.png$/;

// Player heads. mc-heads.net is what getMinecraftHeadUrl() actually returns;
// the minotar.net pattern this replaced had stopped matching anything.
const HEAD_PATTERN = /mc-heads\.net\/avatar\//;

/**
 * Drop older copies of the atlas once a new version has been stored.
 *
 * The atlas is versioned by query string, so every rebuild is a *new* cache key
 * carrying a fresh 6.4 MB. Nothing evicted them but the CACHE_NAME rename, which
 * happens for unrelated reasons and may not happen for months — so a client that
 * survived four deploys was quietly holding 25 MB of atlases it could never use
 * again. The entry just written is kept; every other entry for the same path
 * goes.
 *
 * Scoped to the atlas on purpose. The sprite and head entries are one-per-URL
 * with no version in them, and pruning by path there would evict live files.
 */
async function pruneSupersededAtlas(cache, request) {
    let path;
    try {
        path = new URL(request.url).pathname;
    } catch {
        return;
    }
    if (!ATLAS_URL_PATTERN.test(path)) return;

    const keys = await cache.keys();
    await Promise.all(keys.map(async (key) => {
        if (key.url === request.url) return;          // the copy just stored
        try {
            if (new URL(key.url).pathname === path) await cache.delete(key);
        } catch {
            // Unparseable key: leave it for the CACHE_NAME rename to collect.
        }
    }));
}

// Cache-first strategy for images
async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);

        // Only cache successful responses
        if (response.ok) {
            await cache.put(request, response.clone());
            await pruneSupersededAtlas(cache, request);
        }

        return response;
    } catch (error) {
        console.error('[SW] Fetch failed:', error);
        throw error;
    }
}

// Handle fetch events
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // The atlas is the one asset requested with a query string, so it is the one
    // that has to be matched on its path. Everything else keeps testing the full
    // URL — the remote and head patterns are cross-origin and match on host.
    let pathname = url;
    try {
        pathname = new URL(url).pathname;
    } catch {
        // Non-parseable URL: fall back to the full string, which is what every
        // other pattern here tests anyway.
    }

    // Cache item sprites (local and remote) and player heads
    if (
        TEXTURE_URL_PATTERN.test(url) ||
        ATLAS_URL_PATTERN.test(pathname) ||
        REMOTE_TEXTURE_PATTERN.test(url) ||
        HEAD_PATTERN.test(url)
    ) {
        event.respondWith(cacheFirst(event.request));
    }
});

// Install - activate immediately
self.addEventListener('install', () => {
    self.skipWaiting();
});

// Activate - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name.startsWith('fib-') && name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});