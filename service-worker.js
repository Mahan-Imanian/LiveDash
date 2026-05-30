const CACHE = "livedash-cache-v6";
const BASE_URL = new URL("./", self.location);
const ASSETS = [
  BASE_URL.href,
  new URL("index.html", BASE_URL).href,
  new URL("styles.css", BASE_URL).href,
  new URL("app.js", BASE_URL).href,
  new URL("manifest.webmanifest", BASE_URL).href,
  new URL("favicon.svg", BASE_URL).href,
  new URL("icon.svg", BASE_URL).href
];
const FALLBACK_URL = new URL("index.html", BASE_URL).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k)))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req).catch(() => caches.match(FALLBACK_URL)));
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(FALLBACK_URL));
    })
  );
});
