/* ==========================================================================
   Service Worker — офлайн-поддержка PWA.
   Стратегия: cache-first для статики, network-first для навигации.
   Версия кэша увеличивается вручную при выкладке новой версии игры.
   ========================================================================== */

const CACHE_VERSION = 'so2-cache-v1';
const APP_SHELL = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './firebase-config.js',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/apple-touch-icon.png',
    './icons/favicon-32.png',
];

/* Установка: кладём ядро приложения в кэш */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

/* Активация: удаляем старые версии кэша */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k !== CACHE_VERSION)
                    .map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

/* Перехват запросов */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    // Навигация: сначала сеть, при офлайне — кэшированная копия
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
                    return res;
                })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    // Статика: cache-first с фоновым обновлением
    event.respondWith(
        caches.match(request).then((cached) => {
            const fetchPromise = fetch(request)
                .then((res) => {
                    if (res && res.ok && new URL(request.url).origin === self.location.origin) {
                        const copy = res.clone();
                        caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
                    }
                    return res;
                })
                .catch(() => cached);
            return cached || fetchPromise;
        })
    );
});