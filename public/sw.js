// Masjidul Ihsaan PWA Service Worker
const CACHE_NAME = 'masjid-pwa-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icon.png',
  '/adaptive-icon.png',
  '/favicon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Individual asset failure should not break worker installation
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle same-origin requests
  if (url.origin === location.origin) {
    // For navigation requests (HTML pages), try network first, then cache
    if (event.request.mode === 'navigate') {
      event.respondWith(
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(async () => {
            const cachedResponse = await caches.match(event.request);
            if (cachedResponse) return cachedResponse;
            const rootMatch = await caches.match('/');
            if (rootMatch) return rootMatch;
            return new Response('Offline: Prayer times loaded from cache', {
              headers: { 'Content-Type': 'text/plain' },
            });
          })
      );
      return;
    }

    // For static chunks and assets, stale-while-revalidate
    if (
      url.pathname.startsWith('/_next/static/') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.woff2')
    ) {
      event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseClone);
                });
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        })
      );
      return;
    }
  }

  // Fallback default network fetch
  event.respondWith(
    fetch(event.request).catch(async () => {
      return (await caches.match(event.request)) || Response.error();
    })
  );
});

