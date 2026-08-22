// Service Worker for FIB Wheel of Fortune

// Bumped to v2 when item sprites moved from raw.githubusercontent.com to our own
// origin. The activate handler deletes every `fib-` cache that isn't the current
// one, so the rename is what evicts the old GitHub-keyed entries — without it,
// returning visitors would carry a dead cache of remote URLs around forever.
//
// v3 (2026-08-20) evicts the atlas index that this file used to pin. It is a
// one-shot: it unsticks the clients already broken, and the network-first split
// below is what stops the next rebuild from doing it again. Both were needed —
// the rename alone would have bought one good deploy.
const CACHE_NAME = 'fib-textures-v3';

// Sprites are same-origin now (/fib-items/, /fib-custom/). Keeping cache-first
// over them is still worth it: files under public/ are not content-hashed, so
// their freshness is at the mercy of whatever headers the host sends, and the
// wheel wants all ~1,500 of them present before it will let anyone spin.
const TEXTURE_URL_PATTERN = /\/fib-(items|custom)\/[^/]+\.(png|gif)$/;

// The atlas is packed from the same sprites but lives at its own URL, so it
// needs its own pattern. This one still covers BOTH halves, because
// pruneSupersededAtlas uses it to ask "is this an atlas path"; routing is what
// splits them, via ATLAS_INDEX_PATTERN below.
//
// It is the wheel's single largest request (6.4 MB), and caching the *image* is
// survivable if stale: sprites fall out of a stale index one by one, each falling
// back to its individual file (atlas.js needsOwnImage), and the dimension guard
// refuses a webp/json pair that disagree. A wheel texture change still gets
// evicted by the CACHE_NAME rename, like the sprites.
//
// That argument was originally written about both halves and it was wrong about
// the index — "survivable if stale" describes the image, whose staleness the
// guard can detect and route around. A stale *index* is what makes the pair
// disagree in the first place, and the fallback it triggers is the whole atlas,
// not one sprite. See ATLAS_INDEX_PATTERN.
// Matched against the PATHNAME, not the full URL. atlas.js requests the image
// as `/fib-atlas.webp?v=<version>` (see the version-stamp note there), and this
// pattern is `$`-anchored — so tested against `event.request.url` it matched the
// unversioned URL nobody requests and missed the versioned one everybody does.
// The single largest asset on the surface went uncached while the code here
// said it was cached.
const ATLAS_URL_PATTERN = /\/fib-atlas\.(webp|json)$/;

// The index is split back out of the cache-first path, because the two halves of
// the atlas do not have the same cache key shape and therefore cannot be given
// the same strategy.
//
// The image is requested as `/fib-atlas.webp?v=<version>`, so a rebuild produces
// a new key and the client refetches. The index is requested bare, so its key is
// the same forever — and cache-first never revalidates. A browser that stored one
// index kept serving it until CACHE_NAME changed, which happens for unrelated
// reasons and may not happen for months.
//
// What that cost, on 2026-08-20: Firefox held a pre-padding index (width
// cols*tile = 3840x3744, from before the atlas gained `pad`/`cell`) while the
// server had moved on to 4000x3900. The stale index carries a stale `version`, so
// atlas.js asked for `?v=<old>`, missed the cache — pruneSupersededAtlas had
// collected it — and got the *current* image from the network, because a query
// string does not select an old build's file. The dimension guard fired and the
// whole wheel dropped to per-item sprites. Chrome, with no such entry, was fine,
// which is what made it look like a browser bug.
//
// Note the assumption this breaks in atlas.js: "worst case both are uniformly
// old, which renders correctly". That is only reachable while the old image is
// still in this cache. The origin only ever has the current one.
//
// Network-first, not no-cache: the index must still be there offline, and the
// wheel is usable offline once the sprites are stored. It is 35 KB against the
// image's 6.4 MB, so revalidating it on every load costs approximately nothing —
// and it is the half that decides what the other half means.
const ATLAS_INDEX_PATTERN = /\/fib-atlas\.json$/;

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

        // Only cache successful responses.
        //
        // Storing is best-effort and must stay that way. `cache.put` used to be
        // fire-and-forget here; awaiting it inside this try — which is what adding
        // the prune step needed — put cache failures on the same path as fetch
        // failures, and the catch below rethrows. A QuotaExceededError is not
        // hypothetical on a 6.4 MB atlas, and the result was that a full cache
        // stopped meaning "this response is not cached" and started meaning "this
        // response does not arrive". The bytes are already in hand; nothing about
        // failing to keep a copy should deny them to the page.
        if (response.ok) {
            cacheQuietly(cache, request, response.clone());
        }

        return response;
    } catch (error) {
        console.error('[SW] Fetch failed:', error);
        throw error;
    }
}

/**
 * Network-first, falling back to the stored copy. For the atlas index only.
 *
 * The ordering is the whole point: the index is the half that says what the image
 * means, so a fresh one has to win over a stored one every time. The fallback is
 * what keeps the wheel working offline, where a stale index is still strictly
 * better than none — sprites missing from it fall back to their own files one by
 * one, and the dimension guard refuses the pair outright if it has also gone out
 * of step with the image.
 *
 * Writes go through cacheQuietly for the same reason cacheFirst does it: the
 * bytes are already in hand and a full cache must never turn into a failed load.
 */
async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        const response = await fetch(request);
        if (response.ok) {
            cacheQuietly(cache, request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await cache.match(request);
        if (cached) {
            console.warn('[SW] Atlas index offline, serving stored copy:', error);
            return cached;
        }
        throw error;
    }
}

/**
 * Store the response and prune superseded atlases, swallowing any failure.
 *
 * Deliberately not awaited by the caller: the response is returned the moment it
 * arrives and the cache catches up behind it. Errors are logged rather than
 * ignored outright, because a cache that has silently stopped accepting writes is
 * worth seeing in a console even though it must never break a page.
 */
function cacheQuietly(cache, request, response) {
    cache.put(request, response)
        .then(() => pruneSupersededAtlas(cache, request))
        .catch((error) => console.warn('[SW] Cache write skipped:', error));
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

    // The index is tested first and separately. It also matches
    // ATLAS_URL_PATTERN — that pattern still covers both halves, because
    // pruneSupersededAtlas is about "is this an atlas path" — so the order here is
    // what keeps the index off the cache-first branch. Putting it back into that
    // `if` is the bug described above, restored.
    if (ATLAS_INDEX_PATTERN.test(pathname)) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // Cache item sprites (local and remote), the atlas image, and player heads
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