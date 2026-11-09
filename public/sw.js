/**
 * TAWZOON NEXUS — Progressive Web App Service Worker
 * Version: v5 — Instant Remote Updates & Clean Full-Bleed PWA Launcher Icon
 */

const CACHE_NAME = 'tawzoon-nexus-v5';

const PRECACHE_ASSETS = [
  '/',
  '/manifest.json?v=5',
  '/icon.svg?v=5',
  '/pwa-192x192.png?v=5',
  '/pwa-512x512.png?v=5',
  '/pwa-maskable-512x512.png?v=5',
  '/apple-touch-icon.png?v=5',
  '/favicon.png?v=5',
  '/favicon.ico?v=5',
  '/logo.png'
];

// Install Event — Pre-cache critical application shell
self.addEventListener('install', (event) => {
  console.log('[PWA-SW] Installing new service worker version:', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[PWA-SW] Pre-cache partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Message Event — Support manual SKIP_WAITING and update commands from UI
self.addEventListener('message', (event) => {
  if (event.data) {
    if (event.data.action === 'SKIP_WAITING' || event.data.type === 'SKIP_WAITING') {
      console.log('[PWA-SW] skipWaiting() command received from client');
      self.skipWaiting();
    }
    if (event.data.action === 'CLEAR_ALL_CACHES') {
      event.waitUntil(
        caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name))))
      );
    }
  }
});

// Activate Event — Clean up outdated caches, claim clients, and broadcast update
self.addEventListener('activate', (event) => {
  console.log('[PWA-SW] Activating new service worker:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[PWA-SW] Deleting stale cache:', name);
            return caches.delete(name);
          })
      );
    })
    .then(() => self.clients.claim())
    .then(() => {
      // Notify all open client windows that the new service worker is active
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_NAME });
        });
      });
    })
  );
});

// Fetch Event — Handle offline caching with Network-First strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests or chrome-extension URLs
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Bypass dev tooling, vite dependencies, HMR, and realtime stream
  if (
    url.pathname.includes('/node_modules/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/api/') ||
    url.searchParams.has('t') ||
    url.hostname === 'localhost' ||
    url.hostname.includes('127.0.0.1') ||
    url.hostname.includes('ais-dev') ||
    url.hostname.includes('ais-pre') ||
    url.hostname.includes('run.app')
  ) {
    return;
  }

  // API Requests: Network First, Fallback to Cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Static Assets & Navigation: Stale While Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Push Notification Event — Deliver notifications to mobile device notification bar in background
self.addEventListener('push', (event) => {
  let data = { title: 'TAWZOON NEXUS', body: 'নতুন আপডেট এসেছে' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'আপনার অ্যাপে একটি নতুন নোটিফিকেশন এসেছে',
    icon: data.icon || '/pwa-192x192.png?v=5',
    badge: data.badge || '/favicon.png?v=5',
    tag: data.tag || 'tawzoon-notification',
    data: data.data || { url: '/?portal=reseller&tab=notifications' },
    vibrate: [200, 100, 200, 100, 200],
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'TAWZOON NEXUS', options)
  );
});

// Notification Click Event — Open app or focus tab when user taps mobile notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/?portal=reseller&tab=notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
