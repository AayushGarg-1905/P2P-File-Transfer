const CACHE_NAME = 'relay-v1';

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/fileTransfer.js',
    '/ui.js',
    '/manifest.json',
    '/icons/icon.svg',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

// Install — cache all static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activate — delete old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch — cache first for static, network first for API/socket
self.addEventListener('fetch', event => {

    const url = new URL(event.request.url);

    // Never intercept socket.io or signaling API calls
    if (
        url.pathname.startsWith('/socket.io') ||
        url.pathname.startsWith('/turn-server-config') ||
        url.hostname === 'cdn.jsdelivr.net' ||      // ← add this
        url.hostname === 'cdnjs.cloudflare.com' ||  // ← and this
        url.hostname === 'fonts.googleapis.com' ||  // ← and this
        url.hostname === 'fonts.gstatic.com'        // ← and this
    ) {
        return;
    }

    // For navigation requests, try network first, fall back to offline page
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match('/offline.html'))
        );
        return;
    }

    // For everything else — cache first, then network
    event.respondWith(
        caches.match(event.request).then(cached => cached || fetch(event.request))
    );
});