import { iniciarIntervalo, isIOS, showOverlayIfNotClosed, closeOverlay, sidebarEvents, themeEvents, addRemoveButtonsEvents, scrollTopEvents, scheduledBusesEvents, clickEvents, socialBrowserWarning } from './utils.js';
import { updateBusList } from './api.js';

if (document.readyState === "loading") {  // Cargando aún no ha terminado
    document.addEventListener("DOMContentLoaded", main);
} else {  // `DOMContentLoaded` ya se ha disparado
    main();
}
function main() {
    console.log('🚍 ¡Te damos la bienvenida a AUVASA Tracker! Recuerda que puedes colaborar con el código en https://github.com/nukeador/auvasa-tracker');

    // Actualizar y pintar lista de paradas y líneas
    updateBusList();
    iniciarIntervalo(updateBusList);

    // Ejecuta updateBusList 1 segundo después de abrir la página en iOS porque los recursos localstorage no está disponibles inmediatamente en iOS 17.4 :-( 
    if (isIOS()) {
        setTimeout(updateBusList, 1000);
    }

    // Eventos y detección de theme
    themeEvents();

    // Eventos botones añadir y quitar
    addRemoveButtonsEvents();

    // Eventos del sidebar
    sidebarEvents();

    // Eventos para volver a la parte superior
    scrollTopEvents();

    // Eventos de clic a botones
    clickEvents();

    // Eventos para dialogo horarios programados
    scheduledBusesEvents();
    
    // Al cerrar un overlay, guarda una preferencia en localStorage
    const overlays = document.getElementsByClassName('overlay');
    Array.from(overlays).forEach(overlay => {
        overlay.addEventListener('click', function() {
            closeOverlay(overlay.id);
        });
    });

    // Mostramos los overlays definidos si no se cerraron antes
    Array.from(overlays).forEach(overlay => {
        showOverlayIfNotClosed(overlay.id);
    });

    // Mostrar advertencia si el usuario está accediendo desde un webview integrado de una app de social media
    socialBrowserWarning();
}

let deferredPrompt;

// Escucha el evento 'beforeinstallprompt' para preparar la instalación de la aplicación como PWA.
// Guarda el evento para su uso posterior y muestra el botón de instalación.
window.addEventListener('beforeinstallprompt', (e) => {
    // Previene que Chrome 67 y anteriores muestren automáticamente el prompt de instalación
    e.preventDefault();
    // Guarda el evento para que pueda ser activado más tarde
    deferredPrompt = e;
    // Actualiza la interfaz para mostrar el botón de instalación
    showInstallButton();
});


function showInstallButton() {
    // Muestra el botón de instalación y maneja el evento de clic para mostrar el prompt de instalación.
    // Espera la elección del usuario y registra el resultado.
    const installButton = document.getElementById('installButton');
    installButton.style.display = 'block';

    installButton.addEventListener('click', (e) => {
        // Oculta el botón ya que no se necesita más
        installButton.style.display = 'none';
        // Muestra el prompt de instalación
        deferredPrompt.prompt();
        // Espera a que el usuario responda al prompt
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('Usuario aceptó la instalación');
                _paq.push(['trackEvent', 'installbutton', 'click', 'accepted']);
            } else {
                console.log('Usuario rechazó la instalación');
                _paq.push(['trackEvent', 'installbutton', 'click', 'rejected']);
            }
            deferredPrompt = null;
        });
    });
}
