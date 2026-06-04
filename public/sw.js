/* The Drift — service worker.
   Network-first for same-origin assets so updates are never stale.
   Cache-first only for stable cross-origin assets (fonts, CDN).
   Cache is the offline fallback. */
const CACHE = "thedrift-v1";

self.addEventListener("install", (e) => {
  // Pre-cache the shell: just the root HTML. Vite hashes all other assets
  // so they cache themselves on first fetch via the fetch handler below.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.add("./"))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  // Drop any caches from previous versions
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function cachePut(req, res) {
  if (res && (res.status === 200 || res.type === "opaque")) {
    caches.open(CACHE).then((c) => c.put(req, res.clone())).catch(() => {});
  }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    // Network-first: always try live, fall back to cache when offline.
    // Vite's hashed assets are safe to cache indefinitely once fetched.
    e.respondWith(
      fetch(req)
        .then((res) => cachePut(req, res))
        .catch(() => caches.match(req).then((hit) => hit || caches.match("./")))
    );
  } else {
    // Cross-origin (fonts): cache-first — stable and versioned upstream.
    e.respondWith(
      caches.match(req).then((hit) =>
        hit || fetch(req).then((res) => cachePut(req, res)).catch(() => undefined)
      )
    );
  }
});
