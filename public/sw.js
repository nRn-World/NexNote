const CACHE_NAME = 'nexnote-v2';
// Only cache small static assets — never HTML documents (can interfere with OAuth redirects)
// Never cache the large video file
const STATIC_ASSETS = [
  './favicon.png',
  './logoandtextWhite2.png',
];

// Install — cache static assets (skip on failure)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => {})
    )
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first for HTML, cache first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Never intercept non-GET requests or OAuth-related paths
  if (request.method !== 'GET') return;
  if (url.pathname.includes('/__/auth/')) return;
  if (url.pathname.includes('oauth')) return;

  // For HTML documents, always go to network (fresh index.html on OAuth redirect)
  if (request.destination === 'document') {
    return fetch(request).catch(() => {
      return caches.match('./index.html');
    });
  }

  // For static assets, try cache first then network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Only cache small, successful GET responses for static assets
        if (
          request.method === 'GET' &&
          response.ok &&
          response.size < 5 * 1024 * 1024 && // under 5MB
          !request.url.includes('.mp4') &&
          !request.url.includes('.html')
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
