if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
                navigator.serviceWorker.register('/service-worker.js').then(function(registration) {
                    // Registro exitoso
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                }, function(err) {
                    // Registro fallido
                    console.log('ServiceWorker registration failed: ', err);
                });
            });
        }