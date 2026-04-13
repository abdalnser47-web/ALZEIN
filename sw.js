// sw.js - Alzein PWA v2.1.0
const CACHE_VERSION = 'alzein-v2.2.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
    '/', '/index.html', '/manifest.json',
    '/icons/icon-192.png', '/icons/icon-512.png',
    'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/browser-image-compression@2/dist/browser-image-compression.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
            .catch(err => console.log('Cache install error:', err))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => 
            Promise.all(keys
                .filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
                .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;
    
    // Cache First للثوابت
    if (STATIC_ASSETS.some(url => request.url.includes(url.split('/').pop()))) {
        event.respondWith(
            caches.match(request).then(cached => 
                cached || fetch(request).then(resp => {
                    const clone = resp.clone();
                    caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
                    return resp;
                }).catch(() => cached)
            )
        );
    } else {
        // Network First للبيانات الديناميكية مع fallback للكاش
        event.respondWith(
            fetch(request).then(resp => {
                const clone = resp.clone();
                caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
                return resp;
            }).catch(() => caches.match(request))
        );
    }
});

// دعم التحديث الفوري
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
