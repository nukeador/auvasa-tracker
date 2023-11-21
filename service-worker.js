
// Este es el Service Worker de la web app

const CACHE_NAME = 'webapp-cache-v1';
const urlsToCache = [
    'https://nukeador.github.io/auvasa-tracker/',
    'https://nukeador.github.io/auvasa-tracker/index.html',
    'https://nukeador.github.io/auvasa-tracker/style.css',
    'https://nukeador.github.io/auvasa-tracker/script.js',
    'https://nukeador.github.io/auvasa-tracker/favicon.png',
    'https://nukeador.github.io/auvasa-tracker/img/logo.png',
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
