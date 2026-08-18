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
const ATLAS_URL_PATTERN = /\/fib-atlas\.(webp|json)$/;

// The remote pack, still matched so that anything not yet vendored — and any
// client running a build from before the move — keeps its cache-first path.
const REMOTE_TEXTURE_PATTERN = /raw\.githubusercontent\.com\/btlmt-de\/FIB\/.*\/textures\/(fib|item)\/.+\.png$/;

// Player heads. mc-heads.net is what getMinecraftHeadUrl() actually returns;
// the minotar.net pattern this replaced had stopped matching anything.
const HEAD_PATTERN = /mc-heads\.net\/avatar\//;

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
            cache.put(request, response.clone());
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

    // Cache item sprites (local and remote) and player heads
    if (
        TEXTURE_URL_PATTERN.test(url) ||
        ATLAS_URL_PATTERN.test(url) ||
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