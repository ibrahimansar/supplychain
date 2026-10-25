// Service Worker for Push Notifications and Offline Support
//
// Rewritten to fix four defects in the previous version:
//
//  1. It precached '/static/js/main.js' and '/static/css/main.css'. CRA emits
//     content-hashed filenames, so those URLs 404 — and cache.addAll() is
//     atomic, so one miss rejected the whole install and the worker never
//     installed at all. Precaching is now best-effort, per URL.
//  2. The fetch handler cached EVERY successful response with no URL filter,
//     including authenticated /api/ responses. That put one user's private data
//     in a cache the next user of the same browser profile could be served
//     from. API traffic is now never touched.
//  3. It cached responses without checking status, so a 404 or 500 became a
//     cached answer that was replayed whenever the network failed.
//  4. cache.put() throws on non-GET requests, producing an unhandled rejection
//     on every POST/PUT/DELETE. Only GETs are handled now.
//
// CACHE_VERSION must be bumped whenever the caching rules change, so the
// activate handler can evict what the previous rules stored.
const CACHE_VERSION = 'v2';
const CACHE_NAME = `nasablink-${CACHE_VERSION}`;

// Only things that genuinely exist at a stable URL. Hashed build assets are
// cached on demand by the fetch handler instead of being listed here.
const PRECACHE_URLS = ['/', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Per-URL so one failure cannot abort the install, unlike addAll().
      Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {
            /* best effort — a missing precache entry must not break install */
          }),
        ),
      ),
    ).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Content-hashed build output: the URL changes whenever the bytes do. */
const isImmutableAsset = (url) => url.pathname.startsWith('/static/');

/** Authenticated, user-specific, and frequently changing — never cache. */
const isApiRequest = (url) => url.pathname.startsWith('/api/');

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Leave everything we should not be caching entirely alone, so it behaves
  // exactly as it would without a service worker.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApiRequest(url)) return;

  // Hashed assets can never go stale, so serve from cache when present. This
  // also means a missing chunk fails fast and visibly instead of being masked.
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        });
      }),
    );
    return;
  }

  // Everything else (navigations, manifest, icons): network first so a deploy
  // is picked up immediately, with the cache as an offline fallback.
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache real successes. Caching a 404/500 turns a transient
        // failure into a persistent one.
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Offline on a route we have never seen: fall back to the app shell so
        // client-side routing can still render something.
        if (request.mode === 'navigate') {
          const shell = await caches.match('/');
          if (shell) return shell;
        }
        return Response.error();
      }),
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || 'NasabLink';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/logo.png',
    badge: '/favicon.png',
    tag: data.tag || 'default',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      timestamp: Date.now()
    },
    actions: data.actions || [
      {
        action: 'open',
        title: 'View',
        icon: '/favicon.png'
      },
      {
        action: 'close',
        title: 'Dismiss',
        icon: '/favicon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (let client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if not already open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync (for offline actions)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tree-updates') {
    event.waitUntil(syncTreeUpdates());
  }
});

async function syncTreeUpdates() {
  // Get pending updates from IndexedDB and sync with server
  // Implementation depends on your offline storage strategy
  console.log('Syncing tree updates...');
}

// Periodic background sync (for fetching updates)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'fetch-tree-updates') {
    event.waitUntil(fetchTreeUpdates());
  }
});

async function fetchTreeUpdates() {
  // Fetch latest tree updates in background
  console.log('Fetching tree updates in background...');
}
