// Panels — offline app shell
// Same pattern as the other trackers' service workers: caches only the
// same-origin shell (HTML/manifest/icons) so the app still opens with no
// signal. Everything else (Google Drive, the Worker/Airtable proxy,
// jsdelivr's archive library) always goes straight to the network and is
// never cached — comics themselves are never stored offline in v1.

const CACHE_NAME = 'panels-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only ever handle same-origin GET requests for the shell itself.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Network-first, falling back to cache only when offline, so updates are
  // picked up immediately when there's a connection.
  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
