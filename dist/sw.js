const VERSION = "b7630a20adb25efa";
const FILES = ["assets/first-station-DUE39FzQ.jpg","assets/station-6-BvLR0cgg.jpg","assets/station-7-CWPSc8um.jpg","assets/station-3-DFdlq-MH.jpg","assets/station-4-Bk9WmqsH.jpg","assets/station-9-RVZA4H-b.jpg","assets/station-10-DS1AoK9f.jpg","assets/station-8-C7l317Il.jpg","assets/station-12-BuhcjK1j.jpg","assets/station-11-Cxu4U5LC.jpg","assets/station-13-zwaatYB2.jpg","assets/station-5-DFKmF_0H.jpg","assets/station-14-DFfaeQWQ.jpg","assets/second-station-Dr_gJsGC.jpg","assets/index-DgFkwgqI.css","assets/index-iiIvrKwb.js","index.html","manifest.webmanifest","church-steeple-32.png","church-steeple-16.png","church-logo-180.png","church-logo-192.png","church-logo-512.png","stained-glass.jpg","gal-hiam-book.png","thungetna-rosary.png"];
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
