
// Este es el Service Worker de la web app

const CACHE_NAME = 'webapp-cache-v1';
const urlsToCache = [
    'https://auvasatracker.com/',
    'https://auvasatracker.com/index.html',
    'https://auvasatracker.com/style.css',
    'https://auvasatracker.com/script.js',
    'https://auvasatracker.com/buscador.js',
    'https://auvasatracker.com/favicon.png',
    'https://auvasatracker.com/img/logo.png',
    'https://auvasatracker.com/img/welcome-logo.png',
    'https://auvasatracker.com/img/welcome-logo-white.png',
];

// Instalación del Service Worker y precarga de los recursos
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache abierto');
                return cache.addAll(urlsToCache);
            })
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
