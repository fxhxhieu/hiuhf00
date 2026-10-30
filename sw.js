/* hiuhf0 — service worker: dùng offline. Ưu tiên mạng; mất mạng hoặc mạng quá chậm (4 giây) thì lấy bản đã lưu.
 * Mỗi lần tải đều hỏi lại máy chủ (cache: 'no-cache', thường chỉ tốn một phản hồi 304) vì GitHub Pages cho phép
 * trình duyệt giữ tệp 10 phút, nếu không thì bản mới lên web mà người dùng vẫn thấy bản cũ.
 * Khi sửa tệp nào, nhớ đổi số phiên bản ở đây và ở thẻ meta app-version trong index.html. */
const CACHE = 'hiuhf0-v9';
const NET_TIMEOUT = 4000;
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/data.js', 'js/store.js', 'js/srs.js', 'js/tts.js', 'js/mascot.js', 'js/fx.js', 'js/share.js', 'js/writing.js', 'js/stickers.js', 'js/journal.js', 'js/games.js', 'js/verbs.js', 'js/drills.js', 'js/app.js',
  'fonts/nunito-latin.woff2', 'fonts/nunito-vietnamese.woff2',
  'js/data/vocab-a0.js', 'js/data/vocab-a1-1.js', 'js/data/vocab-a1-2.js', 'js/data/vocab-a2-1.js', 'js/data/vocab-a2-2.js',
  'js/data/vocab-b1-1.js', 'js/data/vocab-b1-2.js', 'js/data/vocab-a2-3.js', 'js/data/vocab-b1-3.js', 'js/data/vocab-exam.js', 'js/data/vocab-extra.js', 'js/data/topics-map.js', 'js/data/emoji.js', 'js/data/texts.js', 'js/data/texts-a0.js', 'js/data/quiz.js', 'js/data/texts-situations.js', 'js/data/extras.js', 'js/data/irregular.js', 'js/data/ipa.js', 'js/data/pairs.js', 'js/data/journal-topics.js',
  'icons/avatar-64.png', 'icons/icon-192.png', 'icons/icon-512.png'
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
  e.respondWith(new Promise((resolve) => {
    // Mạng chậm: nếu đã có bản lưu thì dùng luôn, bản mới vẫn được tải ngầm cho lần sau
    const timer = setTimeout(() => caches.match(req).then((r) => { if (r) resolve(r); }), NET_TIMEOUT);
    fetch(req, { cache: 'no-cache' }).then((res) => {
      clearTimeout(timer);
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      resolve(res);
    }).catch(() => {
      clearTimeout(timer);
      caches.match(req).then((r) => resolve(r || caches.match('index.html')));
    });
  }));
});
