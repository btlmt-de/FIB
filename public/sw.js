// Service Worker for FIB Wheel of Fortune
// Caches texture images as you play - no upfront download

const CACHE_NAME = 'fib-textures-v1';
const TEXTURE_URL_PATTERN = /raw\.githubusercontent\.com\/btlmt-de\/FIB\/.*\/textures\/fib\/.+\.png$/;
const MINOTAR_PATTERN = /minotar\.net/;

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

    // Cache texture images from GitHub and Minotar avatars
    if (TEXTURE_URL_PATTERN.test(url) || MINOTAR_PATTERN.test(url)) {
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