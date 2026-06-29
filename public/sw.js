const CACHE_NAME = 'growlic-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/file.svg',
  '/globe.svg',
  '/next.svg',
  '/window.svg'
];

// Perform install warming
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Warm caching assets...');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Cleaning up stale cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Cache intercept strategy
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Bypass caching for Next.js internal assets (development chunks, HMR, hot updates)
  if (
    requestUrl.pathname.startsWith('/_next') ||
    requestUrl.pathname.includes('webpack-hmr') ||
    requestUrl.pathname.includes('hot-update')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-First for dynamic endpoints (APIs, Server Actions, Pages)
  if (
    event.request.method !== 'GET' ||
    requestUrl.pathname.startsWith('/api') ||
    requestUrl.pathname.includes('/_next/data') ||
    event.request.headers.get('accept')?.includes('text/html')
  ) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If offline, try fallback matching from cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache-First for static file extensions (CSS, JS, Fonts, Images)
  const isStaticFile = 
    requestUrl.pathname.endsWith('.js') ||
    requestUrl.pathname.endsWith('.css') ||
    requestUrl.pathname.endsWith('.woff') ||
    requestUrl.pathname.endsWith('.woff2') ||
    requestUrl.pathname.endsWith('.png') ||
    requestUrl.pathname.endsWith('.jpg') ||
    requestUrl.pathname.endsWith('.jpeg') ||
    requestUrl.pathname.endsWith('.svg') ||
    requestUrl.pathname.endsWith('.mp3') ||
    requestUrl.pathname.endsWith('.wav');

  if (isStaticFile) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          // Cache clones of successful static files
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch(() => {
          return new Response('Network error occurred.', { status: 408 });
        });
      })
    );
  }
});
