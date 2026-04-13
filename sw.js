const cacheName = 'alzein-v1.8'; // ارفع الرقم دائماً عند التعديل
const assets = [
  './',
  './index.html'
];

// 1. التثبيت الإجباري
self.addEventListener('install', (e) => {
    // السطر التالي هو السر: يجبر النسخة الجديدة على التنشيط فوراً
    self.skipWaiting(); 
    e.waitUntil(
        caches.open(cacheName).then((cache) => {
            return cache.addAll(assets);
        })
    );
});

// 2. تنظيف الكاش القديم
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== cacheName).map((key) => caches.delete(key))
            );
        })
    );
    // إجبار المتصفح على السيطرة الفورية
    return self.clients.claim(); 
});

// 3. جلب الملفات
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => {
            return res || fetch(e.request);
        })
    );
});
