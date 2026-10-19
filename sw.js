/* hiuhf0 — service worker: dùng offline. Ưu tiên mạng, mất mạng thì lấy bản đã lưu. */
const CACHE = 'hiuhf0-v3';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/data.js', 'js/store.js', 'js/srs.js', 'js/tts.js', 'js/app.js',
  'js/data/vocab-a0.js', 'js/data/vocab-a1-1.js', 'js/data/vocab-a1-2.js', 'js/data/vocab-a2-1.js', 'js/data/vocab-a2-2.js',
  'js/data/vocab-b1-1.js', 'js/data/vocab-b1-2.js', 'js/data/texts.js', 'js/data/texts-a0.js', 'js/data/quiz.js', 'js/data/ipa.js', 'js/data/pairs.js',
  'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
  );
});
