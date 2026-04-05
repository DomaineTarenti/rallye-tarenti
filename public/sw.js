const CACHE_VERSION = 'v3';
const CACHE = `rallye-tarenti-${CACHE_VERSION}`;
const PRECACHE = ['/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Ne jamais cacher les appels API
  if (url.pathname.startsWith('/api/')) return;

  // Assets Next.js avec hash dans le nom → cache-first (safe à cacher)
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Pages HTML et autres ressources → network-first (toujours à jour)
  // avec fallback cache si offline
  if (e.request.method === 'GET') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok && e.request.method === 'GET') {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(e.request).then((cached) => {
            if (cached) return cached;
            // Fallback JSON pour les requêtes qui attendent du JSON
            if (e.request.headers.get('accept')?.includes('application/json')) {
              return new Response(
                JSON.stringify({ data: null, error: 'Hors ligne' }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
              );
            }
            return new Response('Hors ligne', { status: 503 });
          })
        )
    );
  }
});
