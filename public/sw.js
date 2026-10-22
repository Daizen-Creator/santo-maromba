const CACHE_NAME = 'santo-maromba-shell-v1';
const CORE_FILES = ['./', './manifest.webmanifest', './pwa-icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_FILES);
    const appShell = await fetch('./');
    if (!appShell.ok) throw new Error('Não foi possível preparar a tela inicial offline.');
    await cache.put('./', appShell.clone());
    const markup = await appShell.text();
    const compiledAssets = [...markup.matchAll(/(?:src|href)="(\.\/[^\"]+\.(?:js|css))"/g)].map(match => match[1]);
    if (compiledAssets.length) await cache.addAll(compiledAssets);
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('santo-maromba-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) void caches.open(CACHE_NAME).then(cache => cache.put('./', response.clone()));
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('./')) || Response.error())
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok && response.type === 'basic') {
          void caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        }
        return response;
      });
    })
  );
});
