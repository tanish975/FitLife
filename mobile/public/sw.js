const CACHE_NAME = 'fitlife-fitness-v6';
const CORE = ['./', './index.html', './icon.svg', './icon-192.png', './icon-512.png', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE);
    // Precache production Vite assets on the first visit so the installed app opens offline.
    try {
      const html = await (await fetch('./index.html')).text();
      const paths = [...html.matchAll(/(?:src|href)="(\.\/?assets\/[^"?#]+)"/g)].map(match => match[1]);
      await Promise.all(paths.map(path => cache.add(path).catch(() => {})));
    } catch (_) { /* Core remains available; assets can be cached on request. */ }
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith('fitlife-') && name !== CACHE_NAME) await caches.delete(name);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch (_) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      // Same-origin, fingerprinted app assets are identical for all Origins.
      // Vite sends `Vary: Origin`; precaching with cache.add may omit the Origin
      // request header that module/script tags later send. Ignore Vary only for
      // known static shell files, never for arbitrary future API responses.
      if (/\/(?:assets\/[^/]+\.(?:js|css)|icon(?:-192|-512)?\.(?:png|svg)|manifest\.webmanifest)$/.test(url.pathname)) {
        const staticCache = await caches.open(CACHE_NAME);
        const staticAsset = await staticCache.match(event.request, { ignoreVary: true });
        if (staticAsset) return staticAsset;
      }
      if (event.request.mode === 'navigate') return (await caches.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
