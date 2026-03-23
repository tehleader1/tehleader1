const CACHE_NAME = "supportrd-pwa-v4"
const APP_ASSETS = [
  "/",
  "/manifest.json",
  "/static/style.v20260320h.css?v=20260323g",
  "/static/app.v20260320h.js?v=20260323g",
  "/static/auth.js",
  "/static/icons/app-192.png",
  "/static/icons/app-512.png"
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return
  const url = new URL(event.request.url)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy))
          return res
        })
        .catch(() => caches.match("/") || caches.match(event.request))
    )
    return
  }
  // Always fetch latest Studio assets to avoid stale "In the Booth" UI.
  if (
    url.pathname.startsWith("/static/studio/") ||
    url.pathname.endsWith("/static/app.v20260320h.js") ||
    url.pathname.endsWith("/static/style.v20260320h.css")
  ) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)))
    return
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request)
        .then((res) => {
          if (!res || res.status !== 200) return res
          const copy = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
          return res
        })
        .catch(() => caches.match("/"))
    })
  )
})
