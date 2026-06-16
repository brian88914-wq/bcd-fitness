const CACHE = 'bcd-fitness-v4'
const ASSETS = ['/bcd-fitness/', '/bcd-fitness/index.html']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  // 不攔截外部 API 請求
  if (e.request.url.includes('api.anthropic.com')) return;
  if (e.request.url.includes('cdnjs.cloudflare.com')) return;
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  )
})
