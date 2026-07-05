// Obra OS — service worker mínimo (sin dependencias, compatible con Turbopack).
// Objetivo Fase 0: instalable + shell offline básico.
// - Navegación: network-first con fallback a /offline.html cuando no hay señal.
// - Assets estáticos (/_next/, íconos): stale-while-revalidate.
// - Cross-origin (API de Supabase): no se toca — nunca cacheamos datos.
// La cola offline de cargas de campo (IndexedDB/Dexie) es Fase 1, aparte del SW.

const CACHE = "obra-os-v1";
const PRECACHE = ["/offline.html", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // no cachear Supabase ni terceros

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }

  const cacheable =
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/icons/") ||
    PRECACHE.includes(url.pathname);

  if (cacheable) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
