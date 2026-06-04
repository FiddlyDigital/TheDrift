/* Loops — service worker.
   Network-first for our own app code (so updates are never stale), cache-first
   only for stable cross-origin assets (CDN libraries, fonts). Cache is the
   offline fallback. */
const CACHE = "loops-v17";
const SHELL = [
  "./",
  "./Loops.html",
  "./styles.css?v=17",
  "./engine.js?v=17",
  "./app.jsx?v=17",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function cachePut(req, res) {
  if (res && (res.status === 200 || res.type === "opaque")) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;

  if (sameOrigin) {
    // network-first: always try the live file, fall back to cache when offline
    e.respondWith(
      fetch(req)
        .then((res) => cachePut(req, res))
        .catch(() => caches.match(req).then((hit) => hit || caches.match("./Loops.html")))
    );
  } else {
    // cross-origin (unpkg, fonts): cache-first — these are versioned/stable
    e.respondWith(
      caches.match(req).then((hit) =>
        hit || fetch(req).then((res) => cachePut(req, res)).catch(() => hit)
      )
    );
  }
});
