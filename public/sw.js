const CACHE = 'dutchit-v1'

// Assets to cache on install (app shell)
const PRECACHE = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  // Delete old caches
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // Only handle same-origin GETs
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Supabase API calls — always network only, never cache
  if (url.hostname.includes('supabase.co')) return

  // Next.js API routes — network only
  if (url.pathname.startsWith('/api/')) return

  // Navigation requests (HTML pages) — network first, fall back to cache
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(request, clone))
          return res
        })
        .catch(() => caches.match(request).then((cached) => cached ?? caches.match('/dashboard')))
    )
    return
  }

  // Static assets (_next/static) — cache first
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((res) => {
          caches.open(CACHE).then((c) => c.put(request, res.clone()))
          return res
        })
      })
    )
    return
  }
})
