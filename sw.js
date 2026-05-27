const CACHE = 'tasabeeh-inf-v1';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icons/icon.svg',
  'https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Network first for prayer API, cache first for everything else
  if (url.hostname === 'api.aladhan.com') {
    e.respondWith(fetch(e.request).then(r => { const rc = r.clone(); caches.open(CACHE).then(c => c.put(e.request, rc)); return r; }).catch(() => caches.match(e.request)));
  } else {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { if (res.status === 200) { const rc = res.clone(); caches.open(CACHE).then(c => c.put(e.request, rc)); } return res; })));
  }
});
