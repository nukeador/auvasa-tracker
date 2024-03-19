const CACHE_NAME = 'auvasatracker-v4.6.9';
const urlsToCache = [
    // Lista de URLs a cachear
    '/favicon.png',
    // Imágenes
    "/img/arrow-light.png",
    "/img/arrow-left-light.png",
    "/img/arrow-up.png",
    "/img/bus-black.png",
    "/img/bus-gray.png",
    "/img/bus-white.png",
    "/img/ios-share.svg",
    "/img/location-gray.png",
    "/img/location-white.png",
    "/img/logo-dark.png",
    "/img/map-dark.png",
    "/img/map.png",
    "/img/trash-gray.png",
    "/img/trash-light-gray.png",
    "/img/trash.png",
    "/img/trash-white.png",
    "/img/welcome-logo-2.png",
    "/img/welcome-logo.png",
    "/img/welcome-logo-white.png",
    "img/share.png",
];

// Instalación del Service Worker y precarga de los recursos
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache abierto');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting()) // Fuerza al Service Worker a activarse
    );
});

// Estrategia "Network First"
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).then(networkResponse => {
            return caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
            });
        }).catch(() => {
            return caches.match(event.request);
        })
    );
});

// Elimina los recursos antiguos del cache
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all([
                self.clients.claim(), // Toma control de las páginas abiertas inmediatamente
                ...cacheNames.filter(cacheName => cacheName !== CACHE_NAME)
                            .map(cacheName => caches.delete(cacheName)),
            ]);
        })
    );
});

self.addEventListener('push', event => {
    console.log('Received a push message', event);

    const data = event.data.json();
    console.log('Push data: ', data);

    const title = data.title || 'Nueva Notificación';
    const options = {
        body: data.message,
        icon: '/favicon.png',
        badge: '/favicon.png'
    };

    event.waitUntil(self.registration.showNotification(title, options));
});