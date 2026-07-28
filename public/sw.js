// AI Reseller Pro service worker: caches the app shell for offline load and
// serves cached inventory reads when the network is unavailable. Mutations
// (POST/PATCH/DELETE) are NOT handled here — those are queued client-side
// via IndexedDB (see src/lib/offline.ts) and replayed when back online.
//
// Deliberately network-first, not cache-first: every protected page depends
// on an auth cookie the service worker can't see ahead of time. Precaching
// them (or serving cache before network) risks permanently caching a
// pre-login redirect-to-/login response and replaying it forever, even
// after the user signs in. The cache is purely a fallback for when the
// network fetch actually fails (i.e. genuinely offline).

const CACHE_NAME = "resellai-shell-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never intercept mutations

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isApi = url.pathname.startsWith("/api/");
  const isNavigation = request.mode === "navigate";
  if (!isApi && !isNavigation) return; // let the browser's own HTTP cache handle static assets

  event.respondWith(
    fetch(request)
      .then((res) => {
        // Never cache redirects (e.g. the auth gate bouncing to /login) or
        // error responses — only genuinely good, same-destination content.
        if (res.ok && !res.redirected) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});
