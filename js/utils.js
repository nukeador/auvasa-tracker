import { addLineNotification } from './notifications.js';
import { removeBusLine, displayScheduledBuses, updateBusList, removeStop, removeAllBusLines, addBusLine, showNearestStops, fetchBusOccupancy, displayNearestStopsResults } from './api.js';

// Declaración global de intervalId
let intervalId;

// Listado de ids de diálogos de la app
export const dialogIds = [
    'horarios-box',
    'nearestStopsResults',
    'iframe-container'
];

// Generar o recuperar el ID único del cliente
export function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function createButton(className, text, onClick) {
    const button = document.createElement('button');
    button.className = className;
    button.innerHTML = text;
    if (onClick) {
        button.addEventListener('click', onClick);
    }
    return button;
}

export function createArrowButton() {
    const button = document.createElement('button');
    button.className = 'arrow-button';
    button.textContent = '⮞';
    button.addEventListener('click', function() {
        const lineInfo = this.parentElement;
        const panel = lineInfo.querySelector('.additional-info-panel');

        // Alternar la visibilidad del panel
        panel.classList.toggle('open');

        // Cambia la imagen de fondo del botón
        if (this.style.backgroundImage.endsWith('arrow-left-light.png")')) {
            this.style.backgroundImage = "url('img/arrow-light.png')";
        } else {
            this.style.backgroundImage = "url('img/arrow-left-light.png')";
        }
    });
    return button;
}

export function showNotice(lineNumber, message = null) {
    // Crear el elemento de notificación
    const notification = document.createElement('div');
    notification.className = 'notification-popup';
    notification.textContent = `Se notificará cuando queden 3 minutos para que llegue la línea ${lineNumber}, deberá tener la app abierta`;

    // Si le pasamos argumento lo usamos como mensaje
    if (message) {
        notification.textContent = message;
    }

    // Agregar al cuerpo del documento
    document.body.appendChild(notification);

    // Mostrar la notificación
    setTimeout(() => {
        notification.classList.add('show');
    }, 100); // Pequeña demora para la transición

    // Ocultar y eliminar la notificación después de 4 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500); // Esperar a que termine la transición de desvanecimiento
    }, 2000);
}

export async function createInfoPanel(busesProximos, stopNumber, lineNumber) {
    let infoPanel = document.createElement('div');
    infoPanel.className = 'additional-info-panel';

    // Creamos la flecha de menú
    const arrowButton = document.createElement('button');
    arrowButton.className = 'arrow-button';
    arrowButton.textContent = '⮞';
    infoPanel.appendChild(arrowButton);

    let innerHTML = '<div class="proximos-buses"><ul>';

    // Añadimos cada autobús
    if (busesProximos?.length > 0){
        // Usamos for...of para poder hacer llamadas async
        for (const bus of busesProximos) {
            let horaLlegada;
            let llegadaClass;

            let ocupacion;
            let ocupacionClass = null;
            let ocupacionDescription = 'Sin datos de ocupación';
            let tripId;

            if (bus.realTime && bus.realTime.fechaHoraLlegada) {
                horaLlegada = new Date(bus.realTime.fechaHoraLlegada).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
                llegadaClass = 'realtime';
                tripId = bus.realTime.tripId;
                ocupacion = await fetchBusOccupancy(tripId);
            } else if (bus.scheduled && bus.scheduled.fechaHoraLlegada) {
                horaLlegada = new Date(bus.scheduled.fechaHoraLlegada).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
                llegadaClass = 'programado';
                tripId = bus.scheduled.tripId;
                ocupacion = await fetchBusOccupancy(tripId);
            }

            // Si no es null asignamos la clase
            if (ocupacion) {
                const occupancyStatusMapping = {
                    'empty': 'Todos los asientos están libres',
                    'many': 'Hay bastantes asientos libres',
                    'few': 'Hay pocos asientos libres',
                    'standing': 'No hay asientos, solo de pie',
                    'crushed': 'No hay casi hueco libre',
                    'full': 'Bus lleno, no hay sitios',
                    'not': 'Bus lleno, no admite más personas',
                  };
                ocupacionDescription = occupancyStatusMapping[ocupacion];
                ocupacionClass = ocupacion;
            }

            // Verificamos que horaLlegada no sea null o vacío
            if (horaLlegada) {
                innerHTML += '<li data-trip-id="'+ tripId + '"><span class="' + llegadaClass + '">' + horaLlegada + '</span><span class="ocupacion ' + ocupacionClass + '" title="' + ocupacionDescription + '">' + ocupacionDescription + '</span></li>';
            }
        }
    }

    innerHTML += '</ul></div><div class="actions-buttons"></div>';

    // Añadimos el HTML a infoPanel
    infoPanel.insertAdjacentHTML('beforeend', innerHTML);

    // Añadimos infoPanel al DOM
    document.body.appendChild(infoPanel);

    // Añadimos el manejador de eventos a arrowButton
    arrowButton.addEventListener('click', togglePanel);
    arrowButton.addEventListener('touchstart', function(event) {
        event.preventDefault(); // Esto evita el comportamiento predeterminado del navegador, que podría incluir el desplazamiento de la página
        togglePanel.call(this); // Usamos call para asegurarnos de que 'this' se refiere al arrowButton dentro de togglePanel
    });

    function togglePanel() {
        const panel = this.parentElement;

        // Alternar la visibilidad del panel
        panel.classList.toggle('open');

        // Cambia la imagen de fondo del botón
        if (this.style.backgroundImage.endsWith('arrow-left-light.png")')) {
            this.style.backgroundImage = "url('img/arrow-light.png')";
        } else {
            this.style.backgroundImage = "url('img/arrow-left-light.png')";
        }
    }

    // Revisar si ya existe una notificación para esta parada y línea
    let notifications = JSON.parse(localStorage.getItem('busNotifications')) || [];
    let isNotificationSet = notifications.some(n => n.stopNumber === stopNumber && n.lineNumber === lineNumber);

    const bellButton = createButton('bell-button', '&#128276;', function() {
        addLineNotification(this, stopNumber, lineNumber);
    });

    bellButton.style.backgroundImage = isNotificationSet ? "url('img/bell-solid.png')" : "url('img/bell-gray.png')";
    // No añadimos la campana en iOS porque no es compatible con las notificaciones
    const isOS = navigator.userAgent.match(/(iPad|iPhone|iPod)/g)? true : false;

    // FIXME: Desactivamos notificaciones para todos hasta que haya una solución completa que
    // funcione con la app cerrada
    // https://github.com/nukeador/auvasa-tracker/issues/1#issuecomment-1867671323
    if (!isOS) {
        // Descomentar la siguiente línea para activar notificaciones en Android
        // infoPanel.querySelector('.actions-buttons').appendChild(bellButton);
    }

    // Añadimos el botón de eliminar al div de actions-buttons
    const removeButton = createButton('remove-button', '&#128465;', function() {
        removeBusLine(stopNumber, lineNumber);
    });
    infoPanel.querySelector('.actions-buttons').appendChild(removeButton);

    return infoPanel;
}

export function updateStopName(stopElement, newName, stopGeo) {
    // Actualiza el nombre de la parada en el DOM
    const nameElement = stopElement.querySelector('h2');
    if (nameElement) {
        nameElement.innerHTML = newName + ' <a class="mapIcon" title="Cómo llegar" href="https://www.qwant.com/maps/routes/?mode=walking&destination=latlon%253A' + stopGeo.y + ':' + stopGeo.x +'#map=19.00/' + stopGeo.y + '/' + stopGeo.x + '" target="_blank">Mapa</a>';
    }
}

// Guarda o elimina las paradas fijas y actualiza su posición
async function toggleFixedStop(event) {
    const stopId = event.target.id.split('-')[2]; // Obtiene el stopId del id del icono
    let fixedStops = localStorage.getItem('fixedStops') ? JSON.parse(localStorage.getItem('fixedStops')) : [];

    const busList = document.getElementById("busList");
    const stopElement = document.getElementById(stopId);

    if (fixedStops.includes(stopId)) {
        // Si la parada ya está en fixedStops, la quitamos
        fixedStops = fixedStops.filter(stop => stop !== stopId);
        showSuccessPopUp("Parada desfijada");
        stopElement.parentNode.removeChild(stopElement);

        await updateBusList();
        // Delay para que de tiempo a recrear el elemento
        setTimeout(async () => {
            const newStopElement = document.getElementById(`pin-icon-${stopId}`);
            newStopElement.classList.remove('fixed'); // Actualiza el icono
            await updateBusList(); // Volvemos a actualizar
        }, 2000);
    } else {
        // Si la parada no está en fixedStops, la añadimos
        fixedStops.push(stopId);
        event.target.classList.add('fixed'); // Actualiza el icono
        showSuccessPopUp("Parada fijada en la parte superior");
        // Verifica si el elemento de parada ya está al principio del contenedor de paradas
        const firstChild = busList.firstChild;
        if (firstChild && firstChild.id !== stopId) {
            // Mueve el elemento de parada al principio del contenedor de paradas
            busList.insertBefore(stopElement, busList.firstChild);
        }
        // Actualiza la lista de paradas para reflejar el cambio
        await updateBusList();

        // Delay para que de tiempo a mover el elemento
        setTimeout(async () => {
            // Hacemos scroll al elemento
            scrollToElement(stopElement);
            await updateBusList(); // Volvemos a actualizar
        }, 700);
    }

    // Guarda la nueva lista de paradas fijas en localStorage
    localStorage.setItem('fixedStops', JSON.stringify(fixedStops));
}

export function createStopElement(stopId, busList) {
    let welcomeBox = document.getElementById('welcome-box');
    welcomeBox.style.display = 'none';
    
    let stopElement = document.createElement('div');
    stopElement.id = stopId;
    stopElement.className = 'stop-block';
    stopElement.innerHTML = '<h2>'+ stopId + '</h2>';

    // Agrega el icono de fijar parada
    let pinIcon = document.createElement('i');
    pinIcon.className = 'pin-icon';
    pinIcon.id = 'pin-icon-' + stopId;
    pinIcon.title = 'Fijar parada';

    // Verifica si la parada está en fixedStops y establece la clase del icono en consecuencia
    let fixedStops = localStorage.getItem('fixedStops') ? JSON.parse(localStorage.getItem('fixedStops')) : [];
    if (fixedStops.includes(stopId)) {
        pinIcon.classList.add('fixed'); // Agrega la clase 'fixed' si la parada está en fixedStops
        pinIcon.title = 'Desfijar parada';
    }

    pinIcon.addEventListener('click', toggleFixedStop);
    stopElement.appendChild(pinIcon);

    busList.appendChild(stopElement);
    return stopElement;
}

export function createBusElement(busId, line, index, stopElement) {
    let busElement = document.createElement('div');
    busElement.className = 'line-info linea-' + line.lineNumber;
    busElement.id = busId;

    if (index % 2 === 0) {
        busElement.classList.add('highlight');
    }

    // Evitamos mostrar undefined mietras carga el DOM
    let lineNumber = "";
    if (line.linenumber) {
        lineNumber = line.linenumber;
    }

    // Elemento con placeholders HTML
    busElement.innerHTML = '<div class="linea" data-trip-id=""><h3>' + lineNumber + '<a class="alert-icon"></a></h3><p class="destino"></p><p class="hora-programada"><span class="hora"></span> <span class="diferencia"></span></p></div><div class="hora-tiempo"><div class="tiempo"><p>min.</div><a class="showMapIcon" title="Ver linea en el mapa">Mapa</a></a><div class="horaLlegada"></div></div>';
    
    const removeButton = createButton('remove-button', '&#128465;', function() {
        removeBusLine(line.stopNumber, line.lineNumber);
    });
    busElement.appendChild(removeButton);
    const arrowButton = createArrowButton();
    busElement.appendChild(arrowButton);

    stopElement.appendChild(busElement);
    return busElement;
}

export function createMostrarHorarios(stopId, stopElement, horariosBox) {
    let mostrarHorarios = document.createElement('button');
    mostrarHorarios.classList.add('mostrar-horarios');
    mostrarHorarios.id = 'mostrar-horarios-' + stopId;
    mostrarHorarios.innerHTML = 'Mostrar todos los horarios';
    stopElement.appendChild(mostrarHorarios);
    
    mostrarHorarios.addEventListener('click', async function() {
        displayLoadingSpinner();
        let horariosElement = await displayScheduledBuses(stopId);
        horariosBox.setAttribute('data-stopNumber', stopId);
        horariosBox.innerHTML = horariosElement.innerHTML;
        horariosBox.style.display = 'block';
        horariosBox.scrollTo(0, 0);
        // URL para horarios
        const dialogState = {
            dialogType: 'scheduledTimes',
            stopNumber: stopId
        };
        history.pushState(dialogState, `Horarios para la parada ${dialogState.stopNumber}`, `#/horarios/${dialogState.stopNumber}`);

        hideLoadingSpinner();
        clearInterval(intervalId);
    });
}

export function createRemoveStopButton(stopId, stopElement) {
    
    let borrarParada = stopElement.querySelector('.remove-stop');
    
    // Si ya existe el elemento lo borraros y recreamos para que se posicione al final
    if(borrarParada) {
        borrarParada.remove();
    }
        
    let removeStopButton = document.createElement('button');
    removeStopButton.classList.add('remove-stop');
    removeStopButton.id = 'remove-stop-' + stopId;
    removeStopButton.innerHTML = 'Quitar parada';
    stopElement.appendChild(removeStopButton);
    removeStopButton.addEventListener('click', function() {
        removeStop(stopId);
    });
    return removeStopButton;
}

export function removeObsoleteElements(stops) {
    // Obtener todos los elementos de parada del DOM
    const allStopElements = document.querySelectorAll('.stop-block');

    allStopElements.forEach(stopElement => {
        const stopId = stopElement.id;

        // Si la parada no existe en los datos actuales, eliminarla del DOM
        if (!stops[stopId]) {
            stopElement.remove();
        } else {
            // Para cada parada existente, verificar las líneas de autobús
            const lineElements = stopElement.querySelectorAll('.line-info');
            lineElements.forEach(lineElement => {
                const lineId = lineElement.id.split('-')[1]; // Obtiene el número de línea del ID

                // Verificar si la línea existe en los datos actuales de la parada
                const lineExists = stops[stopId].some(line => line.lineNumber.toString() === lineId);

                // Si la línea no existe en los datos actuales, eliminarla del DOM
                if (!lineExists) {
                    lineElement.remove();
                }
            });
        }
    });
}

export function getCachedData(cacheKey) {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) {
        return null;
    }

    const { data, timestamp } = JSON.parse(cached);
    // Tiempo de expiración en milisegundos
    const expTime = 1 * 60 * 60 * 1000; // 1 hora

    // Verifica si los datos del caché tienen menos del tiempo de expiración
    if (new Date() - new Date(timestamp) < expTime) {
        return data;
    }

    // Si los datos del caché son antiguos, limpia el caché
    localStorage.removeItem(cacheKey);
    return null;
}

export function setCacheData(cacheKey, data) {
    const cacheEntry = JSON.stringify({
        data: data,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem(cacheKey, cacheEntry);
}

export function updateLastUpdatedTime() {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString(); // Formatea la hora como prefieras
    document.getElementById('last-update').textContent = 'Última actualización: ' + formattedTime;
}

// Función para mostrar el spinner de carga
export function displayLoadingSpinner() {
    let spinnerOverlay = document.getElementById('spinnerOverlay');
    spinnerOverlay.style.display = 'flex';
}

// Función para ocultar el spinner de carga
export function hideLoadingSpinner() {
    let spinnerOverlay = document.getElementById('spinnerOverlay');
    spinnerOverlay.style.display = 'none';
}

// Función para calcular la distancia entre dos puntos
export function calculateDistance(loc1, loc2) {
    const rad = function(x) { return x * Math.PI / 180; };
    const R = 6378137; // Radio de la Tierra en metros
    const dLat = rad(loc2.y - loc1.y);
    const dLong = rad(loc2.x - loc1.x);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(rad(loc1.y)) * Math.cos(rad(loc2.y)) *
        Math.sin(dLong / 2) * Math.sin(dLong / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance.toFixed(2); // Devuelve la distancia en metros
}    

export function showError(error) {
    let message;
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message = "Debe permitir acceso a la ubicación, verifique los permisos de esta web/app.";
            showErrorPopUp(message);
            break;
        case error.POSITION_UNAVAILABLE:
            message = "Información de ubicación no disponible.";
            showErrorPopUp(message);
            break;
        case error.TIMEOUT:
            message = "El tiempo de espera para obtener la ubicación expiró.";
            showErrorPopUp(message);
            break;
        default:
            message = "Un error desconocido ocurrió al recuperar la ubicación.";
            showErrorPopUp(message);
            break;
    }
    document.getElementById('nearestStopsResults').innerHTML = message;

    hideLoadingSpinner();
}    

export function showErrorPopUp(message) {
    // Crear div para el mensaje 
    const errorMessage = document.createElement('div');
    errorMessage.textContent = message;
    errorMessage.classList.add('error');
    document.body.appendChild(errorMessage);

    // Mostrar y ocultar mensaje
    errorMessage.classList.add('show');
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 3000); // ocultar después de 3 segundos
}

export function showSuccessPopUp(message, elementId = null) {
    // Crear div para el mensaje 
    const successMessage = document.createElement('div');
    successMessage.textContent = message;
    successMessage.classList.add('success');

    // Si le hemos pasado un elemento al que enlazar mostramos enlace
    if (elementId) {
        successMessage.innerHTML = `${message} <p><a href="#">Clic para ver</a></p>`;

        successMessage.addEventListener('click', function() {
            event.preventDefault;
            const elementToScroll = document.getElementById(elementId);
            scrollToElement(elementToScroll);
            successMessage.classList.remove('show');
            // Quitamos posibles diálogos que estén encima
            const horariosBox = document.getElementById("horarios-box");
            horariosBox.style.display = "none";
            const nearestStopsBox = document.getElementById("nearestStopsResults");
            nearestStopsBox.style.display = "none";
        });
    }

    document.body.appendChild(successMessage);
    // Mostrar y ocultar mensaje
    successMessage.classList.add('show');
    setTimeout(() => {
        successMessage.classList.remove('show');
    }, 3000); // ocultar después de 3 segundos
}

export function iniciarIntervalo(updateBusList) {
    // Hacemos coincidir el intervalo con el inicio de cada minuto
    let ahora = new Date();
    // Calcula cuántos segundos han pasado desde el inicio del minuto actual
    let segundos = ahora.getSeconds();
    // Calcula cuánto tiempo queda hasta el próximo intervalo de 30 segundos
    let tiempoHastaProximoIntervalo = segundos < 30 ? 30 - segundos : 60 - segundos;

    // Establece un temporizador para iniciar el intervalo
    setTimeout(function() {
        // Inicia el intervalo
        intervalId = setInterval(updateBusList, 30000);
    }, tiempoHastaProximoIntervalo * 1000);
}

export function displayGlobalAlertsBanner(alerts) {
    let alertsBox = document.getElementById('globalAlertsBox');
    let tipsBanner = document.getElementById('tips-banner');
    if (!alertsBox) {
        alertsBox = document.createElement('div');
        alertsBox.id = 'globalAlertsBox';
        alertsBox.className = 'global-alerts-box';
        alertsBox.innerHTML = '<ul></ul>';
        document.body.insertBefore(alertsBox, document.getElementById('busList'));
    }

    const alertsList = alertsBox.querySelector('ul');
    alertsList.innerHTML = '';

    // Si hay alertas globales, las mostramos en un bloque
    if (alerts && alerts.length > 0) {
        alerts.forEach(alert => {
            if (alert.ruta.parada === null && alert.ruta.linea === null) {
                const listItem = document.createElement('li');
                const textContainer = document.createElement('div');
                textContainer.className = 'alert-text-container';
                textContainer.innerHTML = '<span class="global-alert-title">' + alert.resumen + '</span>: ' + alert.descripcion;

                const readMoreButton = document.createElement('button');
                readMoreButton.className = 'read-more-button';
                readMoreButton.textContent = 'Leer más';
                readMoreButton.addEventListener('click', function() {
                    textContainer.classList.add('expanded');
                    textContainer.classList.remove('has-more');
                });

                textContainer.appendChild(readMoreButton);
                listItem.appendChild(textContainer);
                alertsList.appendChild(listItem);

                // Esperar a que el navegador haya renderizado el contenido
                setTimeout(function() {
                    // Calcular la altura del contenido
                    const contentHeight = textContainer.scrollHeight;

                    // Si el contenido es más alto que el contenedor, mostrar el botón "Leer más"
                    if (contentHeight > 20) {
                        textContainer.classList.add('has-more');
                    }
                }, 50);
            }
        });
        alertsBox.style.display = 'block';
        // Ocultamos el banner de tips para no saturar la pantalla con avisos
        /*if (tipsBanner) {
            tipsBanner.style.display = 'none';
        }*/
    } else {
        alertsBox.style.display = 'none';
        // Volvemos a mostrar el banner de tips
        /*if (tipsBanner) {
            tipsBanner.style.display = 'block';
        }*/
    }
}

// Función para abrir el panel lateral
export function toogleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const menuButton = document.getElementById('menuButton');

    // Alterna la clase para abrir o cerrar el sidebar
    sidebar.classList.toggle('sidebar-open'); 
    menuButton.classList.toggle('menu-button-open');

    // Cambia el icono según el estado del sidebar
    menuButton.innerHTML = sidebar.classList.contains('sidebar-open') ? '✖' : '☰';
}

// Devuelve la posición de un elemento
export function getElementPosition(element) {
    let yPosition = 0;
    while (element) {
        yPosition += (element.offsetTop - element.scrollTop + element.clientTop);
        element = element.offsetParent;
    }
    return yPosition;
}

// Scroll de la página para ir a un elemento
export function scrollToElement(element) {
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const elementPosition = getElementPosition(element);
        setTimeout(function() {
            // Calcular la nueva posición de scroll para evitar el header
            const newScrollPosition = elementPosition - 60;
            // Hacer scroll suave a la nueva posición
            window.scrollTo({ top: newScrollPosition, behavior: 'smooth' });
        }, 100);
    }
}

// Mostramos una URL ocupando toda la pantalla (menos el header) en un iframe
export function showIframe (url) {
    const iframeContainer = document.getElementById('iframe-container');
    iframeContainer.innerHTML = ''; 
    // Crear el iframe y agregarlo al contenedor
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.allow = "geolocation";
    iframe.onload = function() {
        // Ocultar el spinner de carga una vez que el iframe haya cargado
        hideLoadingSpinner();
    };
    iframeContainer.appendChild(iframe);
    
    // Mostrar el contenedor
    iframeContainer.style.display = 'block';
    
    // Agregar un botón de cierre
    const closeButton = document.createElement('button');
    closeButton.classList.add('closeRoutesButton');
    closeButton.textContent = 'X';
    closeButton.addEventListener('click', function() {
        // Ocultar el contenedor y eliminar el iframe
        iframeContainer.style.display = 'none';
        iframeContainer.innerHTML = ''; // Limpiar el contenedor
        // Regresamos al home
        const dialogState = {
            dialogType: 'home'
        };
        history.replaceState(dialogState, document.title, '#/');
    });
    iframeContainer.appendChild(closeButton);
}

// Función para cerrar un overlay y guardar la preferencia del usuario
export function closeOverlay(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (overlay) {
        overlay.style.display = 'none';
        // Guarda la preferencia en localStorage
        localStorage.setItem(`overlayClosed_${overlayId}`, 'true');
    }
}

// Función para mostrar un overlay si no ha sido cerrado por el usuario y si el usuario tiene paradas y líneas añadidas
export function showOverlayIfNotClosed(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (overlay) {
        // Verifica si el overlay ya ha sido cerrado
        const overlayClosed = localStorage.getItem(`overlayClosed_${overlayId}`);
        // Verifica si el usuario no tiene paradas ni líneas añadidas
        const busLines = localStorage.getItem('busLines');
        const hasBusLines = busLines && JSON.parse(busLines).length > 0;

        if (!overlayClosed && hasBusLines) {
            // Si el overlay no ha sido cerrado y el usuario no tiene paradas ni líneas añadidas, muéstralo
            overlay.style.display = 'block';
        }
    }
}

// Funciones varias para eventos en elementos

// Detección y cambio de de theme claro/oscuro
export function themeEvents() {
    // Determina el tema del usuario basándose en la preferencia guardada en localStorage
    // o en la preferencia del sistema operativo.
    const themeToggle = document.getElementById('theme-toggle');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');
    let savedTheme = localStorage.getItem('theme');

    if (!savedTheme) {
        // Si no hay un tema guardado en localStorage, establece el tema basado en la preferencia del sistema operativo.
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            savedTheme = 'dark';
        } else {
            savedTheme = 'light';
        }
        // Guarda la preferencia del sistema operativo en localStorage.
        localStorage.setItem('theme', savedTheme);
    }

    document.body.classList.toggle('dark-mode', savedTheme === 'dark');
    themeToggleIcon.textContent = savedTheme === 'dark' ? '🌜' : '🌞';

    // Switch del modo claro/oscuro
    themeToggle.addEventListener('click', () => {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        themeToggleIcon.textContent = isDarkMode ? '🌜' : '🌞';
        // Guardar la preferencia del usuario
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    });
}

// Acciones para botones añadir y quitar
export function addRemoveButtonsEvents() {
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
}

// Eventos del sidebar
export function sidebarEvents() {

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

    // Detección de swipe right para cerrar
    let touchStartX = 0;
    let touchEndX = 0;
    let swipeDetected = false;

    // Controlador para el evento touchstart
    document.getElementById('sidebar').addEventListener('touchstart', function(event) {
        touchStartX = event.changedTouches[0].screenX;
        swipeDetected = false; // Reinicia el indicador de deslizamiento
    }, false);

    // Controlador para el evento touchmove
    document.getElementById('sidebar').addEventListener('touchmove', function(event) {
        touchEndX = event.changedTouches[0].screenX;
        // Verifica si el usuario ha deslizado de izquierda a derecha
        if (touchEndX > touchStartX) {
            swipeDetected = true; // Marca que se ha detectado un deslizamiento
        }
    }, false);

    // Controlador para el evento touchend
    document.getElementById('sidebar').addEventListener('touchend', function(event) {
        // Si se detectó un deslizamiento de izquierda a derecha, verifica la distancia
        if (swipeDetected) {
            // Calcula la distancia del deslizamiento
            const swipeDistance = touchEndX - touchStartX;
            // Define un umbral mínimo para considerar el deslizamiento como válido
            const swipeThreshold = 100;

            // Si la distancia del deslizamiento es mayor que el umbral, ejecuta toogleSidebar
            if (swipeDistance > swipeThreshold) {
                toogleSidebar();
            }
        }
    }, false);

    // Función para ajustar el margin-top del sidebar basado en la posición de desplazamiento
    function adjustSidebarMargin() {
        const sidebar = document.getElementById('sidebar');
        if (window.scrollY === 0) {
            // Si la página está arriba del todo, aplica un margin-top de 50px
            sidebar.style.marginTop = '50px';
        } else {
            // Si la página no está arriba del todo, aplica un margin-top de 60px
            sidebar.style.marginTop = '60px';
        }
    }

    // Agrega el evento scroll al objeto window para ajustar el margin-top del sidebar
    window.addEventListener('scroll', adjustSidebarMargin);

    // Asegura que el margin-top inicial sea correcto cuando la página se carga
    adjustSidebarMargin();
}

// Eventos en el diálogo de mostrar horarios programados
export function scheduledBusesEvents() {
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
            
            // Regresamos al home
            const dialogState = {
                dialogType: 'home'
            };
            history.replaceState(dialogState, document.title, '#/');
            iniciarIntervalo(updateBusList);
            updateBusList();
        }
        // Verifica si el evento se originó en un elemento addLineButton y añadimos la línea a la lista
        if (event.target.classList.contains('addLineButton')) {
            let stopNumber = event.target.getAttribute('data-stop-number');
            let lineNumber = event.target.getAttribute('data-line-number');
            await addBusLine(stopNumber, lineNumber, true);
        }
    });
}

// Eventos que hacen scroll al arriba de la página
export function scrollTopEvents() {
    // Al hacer clic en el header hacemos scroll arriba
    const headerTitle = document.getElementById('title');
    if (headerTitle) {
        headerTitle.addEventListener('click', function() {
            const headerHeight = document.querySelector('header').offsetHeight;
            window.scrollTo({ top: -headerHeight, behavior: 'smooth' });
            // Regresamos al home
            const dialogState = {
                dialogType: 'home'
            };
            history.replaceState(dialogState, document.title, '#/');
            closeAllDialogs(dialogIds);
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
            // Regresamos al home
            const dialogState = {
                dialogType: 'home'
            };
            history.replaceState(dialogState, document.title, '#/');
            closeAllDialogs(dialogIds);
        });
    }
}

// Eventos varios de clic a botones y elementos
export function clickEvents() {

    // Solicita la geolocalización del usuario para encontrar las paradas más cercanas.
    // Muestra un spinner de carga mientras se obtiene la posición.
    const nearestStopsButton = document.querySelector('#nearestStops button');
    nearestStopsButton.addEventListener('click', function() {
        if (navigator.geolocation) {
            displayLoadingSpinner();
            closeAllDialogs(dialogIds);
            navigator.geolocation.getCurrentPosition(showNearestStops, showError, { maximumAge: 6000, timeout: 15000 });
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

    // Iframes de rutas y paradas
    const routesButton = document.getElementById('routesButton');
    routesButton.addEventListener('click', function() {
        displayLoadingSpinner();
        closeAllDialogs(dialogIds);
        showIframe('https://rutas.auvasatracker.com');
        // URL para rutas
        const dialogState = {
            dialogType: 'planRoute'
        };
        history.pushState(dialogState, `Planificar ruta`, `#/rutas/`);
        toogleSidebar();
    });
    
    const viewLinesButton = document.getElementById('viewLinesButton');
    viewLinesButton.addEventListener('click', function() {
        displayLoadingSpinner();
        closeAllDialogs(dialogIds);
        showIframe('https://rutas.auvasatracker.com/#/route');
        // URL para visor de líneas
        const dialogState = {
            dialogType: 'showLines'
        };
        history.pushState(dialogState, `Planificar ruta`, `#/lineas/`);
        toogleSidebar();
    });

    // Tooltips para iconos de ocupación
    document.querySelector('#busList').addEventListener('click', function(event) {
        // Verifica si el evento se originó en un elemento .ocupacion
        const ocupacionElement = event.target.closest('.ocupacion');
        if (ocupacionElement) {
            // Crea el tooltip
            showNotice('', ocupacionElement.textContent);
        }
    });

}

export function socialBrowserWarning() {
    // Aviso si se accede desde el navegador de instagram
    // Check if the referrer is from Instagram
    if (document.referrer.includes('instagram.com')) {
        const tipsBannerElement = document.getElementById('tips-banner');
        const instagramWarning = document.createElement('p');
        instagramWarning.id = 'instagram-warning';
        instagramWarning.innerHTML = '<strong>Si accedes desde Instagram</strong><br />Pulsa el menú superior derecho de Instagram y selecciona "Abrir en (Chrome/Safari/Firefox)" para poder usar esta web correctamente';
        tipsBannerElement.insertBefore(instagramWarning, tipsBannerElement.firstChild);
    }
}

// Eventos a controlar en elementos del mapa
export function mapEvents() {

    // Mediante delegación de eventos controlamos lo que pasa dentro de busMap
    document.addEventListener('DOMContentLoaded', function() {
        // Selecciona el elemento padre, que en este caso es #busMap
        const parentElement = document.getElementById('busMap');

        // Agrega el eventListener al elemento padre
        parentElement.addEventListener('click', async function(event) {
            // Verifica si el evento se originó en un elemento addLineButton y añadimos la línea a la lista
            if (event.target.classList.contains('addLineButton')) {
                let stopNumber = event.target.getAttribute('data-stop-number');
                let lineNumber = event.target.getAttribute('data-line-number');
                await addBusLine(stopNumber, lineNumber, true);
            }
        });
    });
}

// Obtener el día anterior
export function getYesterdayDate() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    return `${year}${month}${day}`; // Formato YYYYMMDD
}

// Obtener la fecha de i días en el futuro
export function getFutureDate(days) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const year = futureDate.getFullYear();
    const month = String(futureDate.getMonth() + 1).padStart(2, '0');
    const day = String(futureDate.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// De un objeto fecha completo, devuelve fecha en formato YYYYMMDD
export function getFormattedDate(fecha) {
    var año = fecha.getFullYear().toString();
    var mes = (fecha.getMonth() + 1).toString();
    var día = fecha.getDate().toString();

    // Asegurarse de que el mes y el día tengan dos dígitos
    mes = mes.length == 1 ? '0' + mes : mes;
    día = día.length == 1 ? '0' + día : día;

    var fechaFormateada = año + mes + día;
    return fechaFormateada;
}

// Función para ocultar elementos
export function closeAllDialogs(ids) {
    ids.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
        }
    });
}

// Manejo de estado de URLs y acciones en cada ruta
export function routersEvents() {
    window.addEventListener('popstate', async function(event) {
        // Verifica si hay un estado guardado
        if (window.location.hash === '') {
            // Aquí puedes verificar el estado guardado para determinar qué diálogo abrir
            if (event.state.dialogType === 'scheduledTimes') {
                const stopNumber = event.state.stopNumber;
                if (stopNumber) {  await displayScheduledBuses(stopNumber); }
            } else if (event.state.dialogType === 'nearbyStops') {
                if (navigator.geolocation) {
                    displayLoadingSpinner();
                    navigator.geolocation.getCurrentPosition(showNearestStops, showError, { maximumAge: 6000, timeout: 15000 });
                    toogleSidebar();
                } else {
                   console.log("Geolocalización no soportada por este navegador.");
                }
            } else if (event.state.dialogType === 'home') {
                closeAllDialogs(dialogIds);
            }
        } else {
            // Si no hay estado guardado, asume que el usuario quiere volver a la página principal
            // Lógica para cerrar cualquier diálogo abierto y mostrar la página principal
            // Regresamos al home
            const dialogState = {
                dialogType: 'home'
            };
            history.replaceState(dialogState, document.title, '#/');
            closeAllDialogs(dialogIds);
        }
    });
}