// Increment this version EVERY TIME you update the app's files
// The browser will detect the change, delete old cache, and re-download fresh files
// WITHOUT touching localStorage (your transaction data is safe!)
const CACHE_VERSION = 'mymoney-v10.1';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './icon.svg',
    './manifest.json',
    './budget.html',
    './budget.css',
    './budget.js'
];

// Install: cache all fresh assets
self.addEventListener('install', event => {
    self.skipWaiting(); // Activate new SW immediately, don't wait
    event.waitUntil(
        caches.open(CACHE_VERSION).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Activate: clear ALL old cache versions (only deletes app cache, not localStorage!)
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_VERSION) // Delete any old version
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim()) // Take control of all open tabs immediately
    );
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', event => {
    // Only handle GET requests for our own assets
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then(networkResponse => {
                // Cache new resources on the fly
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_VERSION).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            });
        })
    );
});
