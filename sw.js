// 📄 sw.js - Alzein PWA Service Worker v1.2.0
const CACHE_VERSION = 'alzein-v2.0.6';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://apis.google.com/js/api.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => 
            Promise.all(keys
                .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // استثناءات لـ Google APIs
    if(event.request.url.includes('googleapis.com') || event.request.url.includes('gstatic.com')) {
        event.respondWith(fetch(event.request));
        return;
    }
    
    event.respondWith(
        caches.match(event.request).then(async (res) => {
            if(res) return res;
            try {
                const fetchRes = await fetch(event.request);
                if(event.request.method === 'GET' && event.request.url.startsWith('http')) {
                    const cache = await caches.open(DYNAMIC_CACHE);
                    cache.put(event.request, fetchRes.clone());
                }
                return fetchRes;
            } catch {
                if(event.request.mode === 'navigate') return caches.match('/index.html');
                return new Response('Offline', { status: 503 });
            }
        })
    );
});

// ✅ دعم التحديث الفوري
self.addEventListener('message', (event) => {
    if(event.data === 'SKIP_WAITING') self.skipWaiting();
});

// ✅ Background Sync للنسخ الاحتياطي (مستقبلي)
self.addEventListener('sync', (event) => {
    if(event.tag === 'alzein-backup') {
        event.waitUntil(
            // هنا كود الرفع الفعلي لـ Google Drive
            console.log('Background backup triggered')
        );
    }
});
