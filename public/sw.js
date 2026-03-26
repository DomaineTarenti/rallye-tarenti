const CACHE_NAME = "quest-v2";

// Install — skip waiting to activate immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Activate — delete all old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== "GET") return;

  // Skip Chrome extensions and non-http
  if (!url.protocol.startsWith("http")) return;

  // Cache-first for static assets (images, fonts, JS/CSS chunks)
  if (
    request.destination === "image" ||
    request.destination === "font" ||
    url.pathname.match(/\/_next\/static\//) ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif|ico|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Network-first for everything else (pages, API, etc.)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && !url.pathname.startsWith("/api/")) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) =>
          cached || new Response("Offline", { status: 503 })
        )
      )
  );
});
