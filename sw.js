const CACHE_NAME = 'zm-zw-transfers-v2';
const APP_SHELL = [
  './whatsapp-button.js',
  './install-prompt.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}) // never let a caching hiccup block install
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// IMPORTANT: never intercept the page's own navigation request (loading index.html itself).
// iOS Safari can hang on service-worker-intercepted navigations, and the live exchange
// rate needs a fresh network call every time anyway - so just let the browser load it normally.
self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.mode === 'navigate' || req.destination === 'document') {
    return; // let the browser handle the page load itself, untouched
  }

  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return; // let cross-origin requests (rate API, flag images, CDN scripts) pass through untouched
  }

  // Static assets only: try cache first for speed, fall back to network, and refresh the cache.
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
