const CACHE_NAME = "supportrd-pwa-v15-20260408c"
const APP_ASSETS = [
  "/",
  "/manifest.json",
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

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
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
  // Keep the app shell network-first so PWA installs don't get stuck on stale
  // support code after a deploy.
  if (
    url.pathname.startsWith("/static/studio/") ||
    url.pathname.endsWith("/sw.js") ||
    url.pathname.endsWith("/manifest.json") ||
    url.pathname.endsWith("/static/auth.js") ||
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

