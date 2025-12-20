// Import version constant
importScripts('./version.js');

const CACHE_NAME = `scramble-v${VERSION}`;
const BASE_URL = '/scramble/';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service worker installing with version:', VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('Opened cache:', CACHE_NAME);

        // Fetch the asset manifest from index.html
        const indexResponse = await fetch(BASE_URL + 'index.html');
        const indexText = await indexResponse.text();

        // Extract asset URLs from index.html
        const assetRegex = /(?:href|src)=["']([^"']+)["']/g;
        const assets = new Set([
          BASE_URL,
          BASE_URL + 'index.html',
          BASE_URL + 'favicon.svg',
          BASE_URL + 'icon-192.svg',
          BASE_URL + 'icon-512.svg',
          BASE_URL + 'dict.txt',
          BASE_URL + 'manifest.json',
          BASE_URL + 'version.js'
        ]);

        // Find all assets in index.html
        let match;
        while ((match = assetRegex.exec(indexText)) !== null) {
          const url = match[1];
          // Only cache local assets (not external resources like Google Fonts)
          if (url.startsWith('/scramble/') || url.startsWith('assets/')) {
            if (url.startsWith('assets/')) {
              assets.add(BASE_URL + url);
            } else {
              assets.add(url);
            }
          }
        }

        console.log('Caching assets:', Array.from(assets));
        return cache.addAll(Array.from(assets));
      })
      .catch(error => {
        console.error('Cache installation failed:', error);
      })
  );
  // Don't skip waiting automatically - wait for user confirmation
});

// Listen for skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Received SKIP_WAITING message');
    self.skipWaiting();
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      console.log('New service worker activated and taking control');
      return self.clients.claim();
    })
  );
});

// Fetch event - network first for index.html, cache first for everything else
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network first for index.html to ensure latest version
  if (url.pathname.endsWith('index.html') || url.pathname === BASE_URL || url.pathname === BASE_URL.slice(0, -1)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Update cache with new version
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache first for all other assets (faster loading)
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses or non-GET requests
          if (!response || response.status !== 200 || event.request.method !== 'GET') {
            return response;
          }

          // Don't cache cross-origin requests (like Google Fonts)
          if (!url.origin.includes(self.location.origin.replace('http://', '').replace('https://', ''))) {
            return response;
          }

          // Clone and cache the response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
      })
  );
});
