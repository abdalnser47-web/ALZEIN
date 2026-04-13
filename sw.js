// sw.js - Alzein PWA v2.1.1
const CACHE_VERSION = 'alzein-v2.1.1'; // ✅ تم رفع الإصدار لضمان تخطي الكاش القديم
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
    '/', '/index.html', '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/browser-image-compression@2/dist/browser-image-compression.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); // تفعيل فوري للإصدار الجديد
    event.waitUntil(
        caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS)).catch(()=>{})
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE).map(k => caches.delete(k))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request).then(resp => {
            const clone = resp.clone();
            caches.open(event.request.url.includes('api') ? DYNAMIC_CACHE : STATIC_CACHE)
                .then(cache => cache.put(event.request, clone)).catch(()=>{});
            return resp;
        }).catch(() => cached))
    );
});

self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
