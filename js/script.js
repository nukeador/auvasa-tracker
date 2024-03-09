import { iniciarIntervalo, showError, displayLoadingSpinner, hideLoadingSpinner, toogleSidebar, isIOS, showIframe, showOverlayIfNotClosed } from './utils.js';
import { removeAllBusLines, addBusLine, updateBusList, showNearestStops, displayScheduledBuses } from './api.js';

if (document.readyState === "loading") {  // Cargando aún no ha terminado
    document.addEventListener("DOMContentLoaded", main);
} else {  // `DOMContentLoaded` ya se ha disparado
    main();
}
function main() {
    console.log('🚍 ¡Te damos la bienvenida a AUVASA Tracker! Recuerda que puedes colaborar con el código en https://github.com/nukeador/auvasa-tracker');

    updateBusList();
    iniciarIntervalo(updateBusList);

    // Ejecuta updateBusList 1 segundo después de abrir la página en iOS porque los recursos localstorage no está disponibles inmediatamente en iOS 17.4 :-( 
    if (isIOS()) {
        setTimeout(updateBusList, 1000);
    }

    // Determina el tema del usuario basándose en la preferencia guardada en localStorage
    // o en la preferencia del sistema operativo.
    const themeToggle = document.getElementById('theme-toggle');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
        document.body.classList.toggle('dark-mode', savedTheme === 'dark');
        themeToggleIcon.textContent = savedTheme === 'dark' ? '🌜' : '🌞';
    }
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark-mode');
        themeToggleIcon.textContent = '🌜';
    }

    // Acciones para botones añadir y quitar
    const addButton = document.getElementById('addButton');
    const removeAllButton = document.getElementById('removeAllButton');

    if (removeAllButton) {
        removeAllButton.addEventListener('click', removeAllBusLines);
    }

    if (addButton) {
        let isClickAllowed = true; // Variable para controlar si se permite el clic
    
        addButton.addEventListener('click', async function() {
            if (isClickAllowed) { // Verifica si se permite el clic
                isClickAllowed = false; // Deshabilita nuevos clics
    
                const stopNumber = document.getElementById('stopNumber').value;
                const lineNumber = document.getElementById('lineNumber').value;
                await addBusLine(stopNumber, lineNumber);
    
                setTimeout(() => {
                    isClickAllowed = true; // Habilita nuevamente los clics
                }, 1000);
            }
        });
    }    

    // Si hacemos click fuera del sidebar, la cerramos
    document.addEventListener('click', function(event) {
        if (sidebar.classList.contains('sidebar-open') && !sidebar.contains(event.target) && event.target !== menuButton) {
            toogleSidebar();
        }
    });

    // Evento para abrir el panel lateral al hacer clic en el botón del menú
    document.getElementById('menuButton').addEventListener('click', function() {
        toogleSidebar();
    });

    // Al hacer clic en el header hacemos scroll arriba
    const headerTitle = document.getElementById('title');
    if (headerTitle) {
        headerTitle.addEventListener('click', function() {
            const headerHeight = document.querySelector('header').offsetHeight;
            window.scrollTo({ top: -headerHeight, behavior: 'smooth' });
        });
    }

    // Enlace de volver arriba
    const scrollTopLink = document.getElementById('scrollTop');
    if (scrollTopLink) {
        scrollTopLink.addEventListener('click', function() {
            event.preventDefault();
            const headerHeight = document.querySelector('header').offsetHeight;
            window.scrollTo({ top: -headerHeight, behavior: 'smooth' });
            toogleSidebar();
        });
    }

    // Switch del modo claro/oscuro
    themeToggle.addEventListener('click', () => {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        themeToggleIcon.textContent = isDarkMode ? '🌜' : '🌞';
        // Guardar la preferencia del usuario
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    });

    // Solicita la geolocalización del usuario para encontrar las paradas más cercanas.
    // Muestra un spinner de carga mientras se obtiene la posición.
    const nearestStopsButton = document.querySelector('#nearestStops button');
    nearestStopsButton.addEventListener('click', function() {
        if (navigator.geolocation) {
            displayLoadingSpinner();
            navigator.geolocation.getCurrentPosition(showNearestStops, showError);
            toogleSidebar();
        } else {
           console.log("Geolocalización no soportada por este navegador.");
        }
    });

    // Banner con tips
    const tipsBanner = document.getElementById('tips-banner');
    if (tipsBanner) {
        // Guardamos cada vez que se hace click en un enlace dentro de un parrafo hijo
        tipsBanner.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                // Mostramos el id del padre del enlace
                console.log('Click en ' + e.target.parentElement.id);
                _paq.push(['trackEvent', 'tips-banner', 'click', e.target.parentElement.id]);
            }
        });
    }

    // Eventos en el diálogo de mostrar horarios programados
    let horariosBox = document.getElementById('horarios-box');
    let closeButtons = horariosBox.querySelectorAll('.horarios-close');
    // Eventos al hacer click en cambiar fecha
    horariosBox.addEventListener('change', async function(event) {
        if (event.target.matches("#stopDateInput")) {
            displayLoadingSpinner();
            const selectedDate = document.getElementById("stopDateInput").value;
            let stopNumber = horariosBox.getAttribute("data-stopnumber");
            horariosBox = document.getElementById('horarios-box');
            let newHorariosElement = await displayScheduledBuses(stopNumber, selectedDate);
            horariosBox.innerHTML = newHorariosElement.innerHTML;
            hideLoadingSpinner();
        }
    });
    // Manejo del botón de cerrar en horarios
    horariosBox.addEventListener('click', async function(event) {
        if (event.target.matches(".horarios-close")) {
            closeButtons = horariosBox.querySelectorAll('.horarios-close');
            closeButtons.forEach(button => {
                button.parentNode.style.display = 'none';
            });
            
            iniciarIntervalo(updateBusList);
            updateBusList();
        }
    });

    // Iframes de rutas y paradas
    const routesButton = document.getElementById('routesButton');
    routesButton.addEventListener('click', function() {
        displayLoadingSpinner();
        showIframe('https://rutas.auvasatracker.com');
        toogleSidebar();
    });
    
    /* FIXME: La app react no puede enlazarse a una pantalla concreta
    const viewLinesButton = document.getElementById('viewLinesButton');
    viewLinesButton.addEventListener('click', function() {
        displayLoadingSpinner();
        showIframe('https://rutas.auvasatracker.com/#/route');
        toogleSidebar();
    });
    */

    // Al cerrar el overlay, guarda una preferencia en localStorage
    overlay.addEventListener('click', function() {
        overlay.style.display = 'none';
        // Guarda la preferencia en localStorage
        localStorage.setItem('overlayClosed', 'true');
    });

    // Mostramos el overlay a todo el mundo
    showOverlayIfNotClosed();
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
