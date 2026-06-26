// ═══ Service Worker — 预缓存 + 离线可用 ═══

const CACHE_NAME = 'task-splitter-v1';

const PRECACHE_URLS = [
  '/task-splitter/',
  '/task-splitter/index.html',
  '/task-splitter/css/style.css',
  '/task-splitter/js/app.js',
  '/task-splitter/js/api.js',
  '/task-splitter/js/settings.js',
  '/task-splitter/manifest.json',
  '/task-splitter/assets/icons/icon-192.svg',
  '/task-splitter/assets/icons/icon-512.svg',
];

// ─── 安装：预缓存 ───
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ─── 激活：清理旧缓存 ───
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── 拦截：同源静态资源 → 缓存优先 ───
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源 GET 请求
  if (url.origin !== self.location.origin || request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      // 缓存优先，没命中则请求网络并缓存
      return cached || fetch(request).then((response) => {
        const cache = caches.open(CACHE_NAME);
        cache.then((c) => c.put(request, response.clone()));
        return response;
      });
    })
  );
});
