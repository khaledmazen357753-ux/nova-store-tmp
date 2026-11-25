/**
 * Service Worker — يجعل التطبيق يفتح ويعمل بدون إنترنت.
 *
 * الاستراتيجية:
 *   • مستندات التنقل (index.html) → شبكة أولاً، ثم كاش
 *     (حتى يستلم المستخدم أي تحديث، ويعمل بلا شبكة بعدها)
 *   • أصول البناء (JS/CSS/wasm) → كاش أولاً لأن أسماءها تحمل بصمة
 *     محتوى، فلا تتعارض أبداً بين الإصدارات
 *   • الخطوط → كاش أولاً مع تحديث خلفي
 *   • أي طلب /api → لا يُعترض إطلاقاً
 *     (البيانات تُحسب محلياً؛ لا نريد كاش لردود API أبداً)
 *
 * مهم: ملف الـ wasm الخاص بـ SQLite مخزّن مسبقاً، وهو ما يجعل محرك
 * الحسابات قادراً على العمل من أول فتحة بلا شبكة.
 */

const VERSION = 'plus-erp-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

/** أصول أساسية تُخزَّن مسبقاً عند التثبيت */
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/sql-wasm/sql-wasm.wasm',
  '/plus-logo.jpeg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // لا نفشل التثبيت إن تعذّر أصل واحد
      await Promise.allSettled(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' }))));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isAsset(url) {
  return /\.(js|css|wasm|png|jpe?g|svg|woff2?|ttf|ico)$/i.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // لا نتدخل في طلبات الـ API أبداً
  if (url.pathname.startsWith('/api')) return;

  // طلبات نطاقات أخرى (الخطوط) → كاش أولاً
  if (url.origin !== self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res && res.ok) void cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })()
    );
    return;
  }

  // مستند التنقل → شبكة أولاً
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(SHELL_CACHE);
          void cache.put('/index.html', fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          return (await cache.match('/index.html')) || (await cache.match('/')) || Response.error();
        }
      })()
    );
    return;
  }

  // الأصول → كاش أولاً
  if (isAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const res = await fetch(request);
        if (res && res.ok) void cache.put(request, res.clone());
        return res;
      })()
    );
  }
});

/** يسمح للصفحة بإجبار تفعيل إصدار جديد فوراً */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') void self.skipWaiting();
});
