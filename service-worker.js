const CACHE_NAME = 'auvasatracker-v2.7'; // Incrementar esta versión con cada cambio
const urlsToCache = [
    // Lista de URLs a cachear
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/buscador.js',
    'mapa.js',
    '/favicon.png',
    // Imágenes
    "/img/arrow-light.png",
    "/img/arrow-left-light.png",
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
    "/img/trash.png",
    "/img/trash-white.png",
    "/img/welcome-logo-2.png",
    "/img/welcome-logo.png",
    "/img/welcome-logo-white.png",
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

// Intercepta las solicitudes de red y responde con los recursos cacheados
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

// Elimina los recursos antiguos del cache y toma control de las páginas abiertas inmediatamente
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all([
                self.clients.claim(), // Toma control de las páginas abiertas inmediatamente
                ...cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                }),
            ]);
        })
    );
});
