const CACHE = 'tsb-v4';
const BASE = self.location.pathname.replace('/sw.js','');

// All assets relative to SW location
const STATIC = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/manifest.json',
  BASE + '/icon.svg',
  BASE + '/icon-192.png',
  BASE + '/icon-512.png',
];

// Font URLs to cache on first load
const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async cache => {
      // Cache static assets
      for (const url of STATIC) {
        try { await cache.add(url); } catch(err) { console.log('Skip:', url); }
      }
      // Cache fonts
      for (const url of FONT_URLS) {
        try { await cache.add(new Request(url, {mode:'cors'})); } catch(err) {}
      }
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  
  // Prayer API: network first, fallback to cache
  if (url.hostname === 'api.aladhan.com') {
    e.respondWith(
      fetch(e.request).then(r => {
        const rc = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, rc));
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Google Fonts: cache first, then network
  if (url.hostname.includes('fonts.g')) {
    e.respondWith(
      caches.match(e.request).then(r => {
        if (r) return r;
        return fetch(e.request).then(res => {
          const rc = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, rc));
          return res;
        });
      })
    );
    return;
  }

  // Everything else: cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(r => {
      if (r) return r;
      return fetch(e.request).then(res => {
        if (res.status === 200 && e.request.method === 'GET') {
          const rc = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, rc));
        }
        return res;
      }).catch(() => {
        // Offline fallback: return index.html for navigation
        if (e.request.mode === 'navigate') {
          return caches.match(BASE + '/index.html');
        }
      });
    })
  );
});
