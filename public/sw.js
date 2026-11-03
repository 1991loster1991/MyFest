const CACHE_NAME = "mauifest-door-v2";
const STATIC_PREFIX = "/_next/static/";
const ASSETS = ["/manifest.webmanifest", "/favicon.ico", "/mauifest-logo.jpg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith("mauifest-door-") && key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  const cacheable = request.mode === "navigate" && url.pathname === "/puerta"
    || url.pathname.startsWith(STATIC_PREFIX)
    || ASSETS.includes(url.pathname);
  if (!cacheable) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
        return response;
      }
      const cached = await caches.match(request);
      return cached || response;
    } catch {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === "navigate" && url.pathname === "/puerta") {
        const doorPage = await cache.match("/puerta");
        if (doorPage) return doorPage;
      }
      return new Response("Sin conexión. Abrí MauiFest Puerta mientras tenías conexión para preparar el acceso offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  })());
});
