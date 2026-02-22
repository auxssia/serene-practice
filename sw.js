const CACHE_NAME = "serene-practice-v0.2-mobile";
const BASE_PATH = "/serene-practice/";

const STATIC_ASSETS = [
    BASE_PATH,
    BASE_PATH + "index.html",
    BASE_PATH + "style.css",
    BASE_PATH + "js/main.js"
];

// Install Event: Cache Static Assets
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("[Service Worker] Caching Static Assets for GH Pages");
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log("[Service Worker] Deleting Old Cache:", cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event
self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // Only handle requests within our base path and on our origin (avoid Supabase API)
    if (url.origin === self.location.origin && url.pathname.startsWith(BASE_PATH)) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request);
            })
        );
    }
});
