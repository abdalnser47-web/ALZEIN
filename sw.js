const cacheName = 'alzein-v1.5'; // غير الرقم مع كل تحديث
const assets = ['./', './index.html'];

self.addEventListener('install', (e) => {
    // إجبار النسخة الجديدة على التنشيط فوراً
    self.skipWaiting(); 
    e.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)));
});

self.addEventListener('activate', (e) => {
    // حذف الكاش القديم تماماً
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key)));
        })
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});
