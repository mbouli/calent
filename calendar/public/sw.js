// Minimal, safe service worker for Calent's PWA.
// - Enables installability (has a fetch handler).
// - Network-first for same-origin page navigations, with an offline cache
//   fallback so the installed app still opens without a connection.
// - Everything else (Supabase API, auth, static chunks, cross-origin) is left
//   to the browser untouched — so data stays fresh and auth never breaks.

const CACHE = 'calent-shell-v1'
const SHELL = ['/u', '/login']

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {})
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  // Only handle same-origin top-level navigations.
  if (request.method !== 'GET' || request.mode !== 'navigate') return
  if (new URL(request.url).origin !== self.location.origin) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
        return response
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/u')))
  )
})
