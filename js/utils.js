import { addLineNotification } from './notifications.js';
import { removeBusLine, displayScheduledBuses, updateBusList, removeStop } from './api.js';

// Declaración global de intervalId
let intervalId;

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

export function showNotice(lineNumber) {
    // Crear el elemento de notificación
    const notification = document.createElement('div');
    notification.className = 'notification-popup';
    notification.textContent = `Se te notificará cuando queden 3 minutos para que llegue la línea ${lineNumber}`;

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
    }, 3000);
}

export function createInfoPanel(busesProximos, stopNumber, lineNumber) {
    let infoPanel = document.createElement('div');
    infoPanel.className = 'additional-info-panel';

    // Creamos la flecha de menú
    const arrowButton = document.createElement('button');
    arrowButton.className = 'arrow-button';
    arrowButton.textContent = '⮞';
    infoPanel.appendChild(arrowButton);

    let innerHTML = '<div class="proximos-buses"><ul>';

    // Añadimos cada autobús
    busesProximos.forEach(bus => {
        let horaLlegada;
        let llegadaClass;

        if (bus.realTime && bus.realTime.llegada) {
            horaLlegada = bus.realTime.llegada;
            llegadaClass = 'realtime';
        } else {
            horaLlegada = bus.scheduled.llegada;
            llegadaClass = 'programado';
        }

        // Verificamos que horaLlegada no sea null o vacío
        if (horaLlegada) {
            // Verificamos si horaLlegada tiene el formato "HH:MM:SS"
            if (horaLlegada.includes(":") && horaLlegada.split(":").length === 3) {
                // Eliminamos los segundos de la hora HH:MM:SS
                horaLlegada = horaLlegada.substring(0, horaLlegada.lastIndexOf(":"));
            }

            innerHTML += '<li><span class="' + llegadaClass + '">' + horaLlegada + '</span></li>';
        }
    });

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

    if (!isOS) {
        infoPanel.querySelector('.actions-buttons').appendChild(bellButton);
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

export function createStopElement(stopId, busList) {
    let welcomeBox = document.getElementById('welcome-box');
    welcomeBox.style.display = 'none';
    
    let stopElement = document.createElement('div');
    stopElement.id = stopId;
    stopElement.className = 'stop-block';
    stopElement.innerHTML = '<h2>'+ stopId + '</h2>';

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

export function setupMostrarHorariosEventListener(mostrarHorarios, stopId, horariosBox) {
    mostrarHorarios.addEventListener('click', async function() {
        let horariosElement = await displayScheduledBuses(stopId);
        horariosBox.innerHTML = horariosElement.innerHTML;
        horariosBox.style.display = 'block';
        clearInterval(intervalId);

        let closeButtons = horariosBox.querySelectorAll('.horarios-close');
        closeButtons.forEach(function(button) {
            button.addEventListener('click', function() {
                this.parentNode.style.display = 'none';
                iniciarIntervalo(updateBusList);
                updateBusList();
            });
        });
    });
}

export function createMostrarHorariosButton(stopId, stopElement) {
    let mostrarHorarios = document.createElement('button');
    mostrarHorarios.classList.add('mostrar-horarios');
    mostrarHorarios.id = 'mostrar-horarios-' + stopId;
    mostrarHorarios.innerHTML = 'Mostrar todos los horarios';
    stopElement.appendChild(mostrarHorarios);
    return mostrarHorarios;
}

export function createRemoveStopButton(stopId, stopElement) {
    
    // Solo lo creamos si no existe
    let borrarParada = stopElement.querySelector('.remove-stop');
    if(!borrarParada) {
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
            message = "Usuario negó la solicitud de geolocalización.";
            break;
        case error.POSITION_UNAVAILABLE:
            message = "Información de ubicación no disponible.";
            break;
        case error.TIMEOUT:
            message = "La solicitud para obtener la ubicación del usuario expiró.";
            break;
        default:
            message = "Un error desconocido ocurrió.";
            break;
    }
    document.getElementById('nearestStopsResults').innerHTML = message;

    hideLoadingSpinner();
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
                listItem.textContent = alert.descripcion;
                alertsList.appendChild(listItem);
            }
        });
        alertsBox.style.display = 'block';
        // Ocultamos el banner de tips para no saturar la pantalla con avisos
        if (tipsBanner) {
            tipsBanner.style.display = 'none';
        }
    } else {
        alertsBox.style.display = 'none';
        // Volvemos a mostrar el banner de tips
        if (tipsBanner) {
            tipsBanner.style.display = 'block';
        }
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