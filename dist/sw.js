const VERSION = "976a2cdd1229ecb4";
const FILES = ["assets/index-BmPuZqMf.css","assets/index-CR1Swy9A.js","index.html","manifest.webmanifest","labu.svg","labu-180.png","labu-192.png","labu-512.png","stained-glass.jpg","gal-hiam-book.png"];
const cachePrefix = 'zomi-catholic-';
const cacheName = cachePrefix + VERSION;
const scope = self.registration.scope;
const indexUrl = new URL('index.html', scope).href;
const assetUrls = new Set(FILES.map((file) => new URL(file, scope).href));

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll([...assetUrls].map((url) => new Request(url, { cache: 'reload' })));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(cachePrefix) && name !== cacheName)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const pageUrl = url.origin + url.pathname;
  const isAppPage = request.mode === 'navigate' && (pageUrl === scope || pageUrl === indexUrl);
  if (!isAppPage && !assetUrls.has(url.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    return await cache.match(isAppPage ? indexUrl : request) ?? fetch(request);
  })());
});
