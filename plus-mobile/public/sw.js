/**
 * Service Worker — يجعل نسخة الويب من تطبيق المحاسبي Plus تعمل بدون إنترنت
 * وتُضاف إلى الشاشة الرئيسية كتطبيق مستقل.
 *
 * الاستراتيجية:
 *  - التنقل (index.html): شبكة أولاً ثم كاش → يفتح فوراً بعد أول زيارة
 *  - الأصول الثابتة (أيقونات/شعار): كاش أولاً
 *  - طلبات الـ API: لا تُخزَّن هنا — طبقة الكاش/طابور المزامنة في التطبيق
 *    (src/bridge/api.ts) هي المسؤولة عن بيانات الأعمال، حتى يبقى مصدر واحد للحقيقة.
 */
const VERSION = 'plus-mobile-v1';
const SHELL = `${VERSION}-shell`;

const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // بيانات الأعمال لا تمر عبر الـ SW (يتولاها bridge/api.ts)
  if (url.pathname.startsWith('/api/')) return;

  // التنقل: شبكة أولاً ثم الكاش
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(async () => (await caches.match('./index.html')) || Response.error())
    );
    return;
  }

  // الأصول الثابتة: كاش أولاً
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(SHELL).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached || Response.error())
    )
  );
});
