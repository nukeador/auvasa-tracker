import { iniciarIntervalo, showError, displayLoadingSpinner } from './utils.js';
import { removeAllBusLines, addBusLine, updateBusList, showNearestStops } from './api.js';

if (document.readyState === "loading") {  // Cargando aún no ha terminado
    document.addEventListener("DOMContentLoaded", main);
} else {  // `DOMContentLoaded` ya se ha disparado
    main();
}
function main() {
    console.log('🚍 ¡Te damos la bienvenida a AUVASA Tracker! Recuerda que puedes colaborar con el código en https://github.com/nukeador/auvasa-tracker');

    updateBusList();
    iniciarIntervalo(updateBusList);

    // Detección del theme del usuario
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
    var addButton = document.getElementById('addButton');
    var removeAllButton = document.getElementById('removeAllButton');

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

    themeToggle.addEventListener('click', () => {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        themeToggleIcon.textContent = isDarkMode ? '🌜' : '🌞';
        // Guardar la preferencia del usuario
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    });

    // Botón para encontrar las paradas más cercanas
    var nearestStopsButton = document.querySelector('#nearestStops button');
    nearestStopsButton.addEventListener('click', function() {
        if (navigator.geolocation) {
            displayLoadingSpinner();
            navigator.geolocation.getCurrentPosition(showNearestStops, showError);
        } else {
           console.log("Geolocalización no soportada por este navegador.");
        }
    });
}

let deferredPrompt;

// Código para la instalación como PWA 
window.addEventListener('beforeinstallprompt', (e) => {
    // Previene que Chrome 67 y anteriores muestren automáticamente el prompt de instalación
    e.preventDefault();
    // Guarda el evento para que pueda ser activado más tarde
    deferredPrompt = e;
    // Actualiza la interfaz para mostrar el botón de instalación
    showInstallButton();
});

function showInstallButton() {
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
