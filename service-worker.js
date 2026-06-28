// Service Worker for QuickTag Images PWA
// Version 0.1.0

const CACHE_NAME = 'quicktag-v5';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/image-optimizer.js',
  '/js/theme.js',
  '/manifest.json',
  '/assets/logo.jpeg',
  // External dependencies
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdn.jsdelivr.net/npm/piexifjs@1.0.6/piexif.min.js',
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Geist:wght@400..700&family=Geist+Mono:wght@400..600&display=swap'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Cache installation failed:', error);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Claim all clients
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip requests to LLM API endpoints (always fetch from network)
  const url = new URL(event.request.url);
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache the fetched response for future use
          caches.open(CACHE_NAME)
            .then(cache => {
              // Only cache same-origin and CORS-enabled resources
              if (event.request.url.startsWith(self.location.origin) ||
                  event.request.url.includes('cdnjs.cloudflare.com') ||
                  event.request.url.includes('cdn.jsdelivr.net') ||
                  event.request.url.includes('fonts.googleapis.com') ||
                  event.request.url.includes('fonts.gstatic.com')) {
                cache.put(event.request, responseToCache);
              }
            });

          return response;
        });
      })
      .catch(error => {
        // Network request failed, try to serve offline page
        console.error('Fetch failed:', error);

        // Return a custom offline response for HTML requests
        if (event.request.destination === 'document') {
          return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>QuickTag Images - Offline</title>
              <style>
                body {
                  font-family: "Geist", ui-sans-serif, system-ui, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background: #0a0b0d;
                  color: #f4f4f5;
                }
                .offline-message {
                  text-align: center;
                  padding: 2rem;
                }
                h1 {
                  font-family: "Bricolage Grotesque", "Geist", ui-sans-serif, sans-serif;
                  font-weight: 600;
                  letter-spacing: -0.02em;
                  color: #ff5d2e;
                }
                p { color: #9b9da6; margin-top: 1rem; }
              </style>
            </head>
            <body>
              <div class="offline-message">
                <h1>You're Offline</h1>
                <p>QuickTag Images requires an internet connection for some features.</p>
                <p>Please check your connection and try again.</p>
              </div>
            </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
      })
  );
});

// Message event - handle updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for better performance
self.addEventListener('sync', event => {
  if (event.tag === 'sync-images') {
    event.waitUntil(syncImages());
  }
});

async function syncImages() {
  // Placeholder for future background sync functionality
  console.log('Background sync triggered');
}