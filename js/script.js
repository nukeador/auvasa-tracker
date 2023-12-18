// Definir la URL base del API
const apiEndPoint = 'https://gtfs.auvasatracker.com';
const pushApi = 'https://push.auvasatracker.com';

var busLines = localStorage.getItem('busLines') ? JSON.parse(localStorage.getItem('busLines')) : [];

// Agregar función para consultar API
async function stopAndLineExist(stopNumber, lineNumber) {
    // Buscar la parada en busStops usando stopNumber
    const stopData = busStops.find(stop => stop.parada.numero === stopNumber);

    if (!stopData) {
        return false; // Si la parada no existe, retorna false
    }

    // Revisar si la línea proporcionada existe en alguna de las categorías de líneas para esa parada
    const allLines = [
        ...(stopData.lineas.ordinarias || []), 
        ...(stopData.lineas.poligonos || []), 
        ...(stopData.lineas.matinales || []), 
        ...(stopData.lineas.futbol || []), 
        ...(stopData.lineas.buho || []), 
        ...(stopData.lineas.universidad || [])
    ];

    const lineExists = allLines.includes(lineNumber);

    return lineExists;
}

function createButton(className, text, onClick) {
    const button = document.createElement('button');
    button.className = className;
    button.innerHTML = text;
    if (onClick) {
        button.addEventListener('click', onClick);
    }
    return button;
}

function createArrowButton() {
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

function registerNotification(title, message) {

    fetch( pushApi + '/push-notification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title,
                    message: message
                })
            }).then(response => response.json())
            .then(data => console.log(data))
            .catch(error => console.error('Error:', error));
}

function subscribeToPushNotifications() {
    navigator.serviceWorker.ready.then(registration => {
        return registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: 'BEJe_JXnnuzZlAp-jyKK7xFRddgP-SjV3-YvOjRi0VqWOxGKmf8Jq7hn8IKbfI06lNZOdGsWpvAHgqPsCFaBz6U'
        });
    }).then(subscription => {
        console.log('Suscripción a push:', subscription);
        // Enviar la suscripción al servidor intermediario
        return fetch(pushApi + '/register-subscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(subscription)
        });
    }).then(response => {
        if (response.ok) {
            console.log('Suscripción registrada en el servidor');
        } else {
            console.error('Error al registrar la suscripción en el servidor');
        }
    }).catch(error => {
        console.error('Error al suscribirse a push:', error);
    });
}

function showNotice(lineNumber) {
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

function addLineNotification(bellButton, stopNumber, lineNumber) {
    const currentNotification = JSON.parse(localStorage.getItem('busNotification'));
    if (currentNotification && currentNotification.stopNumber === stopNumber && currentNotification.lineNumber === lineNumber) {
        localStorage.removeItem('busNotification');
        bellButton.style.backgroundImage = "url('img/bell-gray.png')";
    } else {
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    subscribeToPushNotifications();
                    updateNotifications(bellButton, stopNumber, lineNumber);
                }
            });
        } else if (Notification.permission === 'granted') {
            updateNotifications(bellButton, stopNumber, lineNumber);
        } else {
            alert('Las notificaciones están desactivadas. Por favor, habilita las notificaciones en la configuración del navegador.');
        }
    }
}

function updateNotifications(bellButton, stopNumber, lineNumber) {
    // Si stopNumber y lineNumber son null, borramos del localstorage todo y salimos
    if (!stopNumber ||!lineNumber) {
        localStorage.removeItem('busNotifications');
        return;
    }
    
    let notifications = JSON.parse(localStorage.getItem('busNotifications')) || [];
    let index = notifications.findIndex(n => n.stopNumber === stopNumber && n.lineNumber === lineNumber);

    // Si no existe la creamos, si existe, la borramos
    if (index === -1) {
        if (bellButton) {
            notifications.push({ stopNumber, lineNumber });
            bellButton.style.backgroundImage = "url('img/bell-solid.png')";
            showNotice(lineNumber);
        }
    } else {
        notifications.splice(index, 1);
        if (bellButton) {
            bellButton.style.backgroundImage = "url('img/bell-gray.png')";
        }
    }
    localStorage.setItem('busNotifications', JSON.stringify(notifications));
}

function checkAndSendBusArrivalNotification(tiempoRestante, lineNumber, stopNumber, stopName) {
    if (tiempoRestante === 3) {
        let notifications = JSON.parse(localStorage.getItem('busNotifications')) || [];
        let notificationExists = notifications.some(n => n.stopNumber === stopNumber && n.lineNumber === lineNumber);

        if (notificationExists) {
            registerNotification(`Notificación de llegada`, `La línea ${lineNumber} llegará en 3 minutos a ${stopName}`);
        }

        // Borramos la notificación
        updateNotifications(null, stopNumber, lineNumber);
    }
}

function createInfoPanel(busesProximos, stopNumber, lineNumber) {
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
            // Eliminamos los segundos de la hora HH:MM:SS
            horaLlegada = horaLlegada.substring(0, horaLlegada.length - 3);

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

    infoPanel.querySelector('.actions-buttons').appendChild(bellButton);

    // Añadimos el botón de eliminar al div de actions-buttons
    const removeButton = createButton('remove-button', '&#128465;', function() {
        removeBusLine(stopNumber, lineNumber);
    });
    infoPanel.querySelector('.actions-buttons').appendChild(removeButton);

    return infoPanel;
}

async function addBusLine(stopNumber, lineNumber) {

    // Buscar la parada en busStops usando stopNumber
    const stopData = busStops.find(stop => stop.parada.numero === stopNumber);

    // Si se ha proporcionado solo la parada
    if (!stopNumber && lineNumber) {
        // Crear div para el mensaje 
        const errorMessage = document.createElement('div');
        errorMessage.textContent = 'Error: Debe especificar una parada';
        errorMessage.classList.add('error');
        document.body.appendChild(errorMessage);
    
        // Mostrar y ocultar mensaje
        errorMessage.classList.add('show');
        setTimeout(() => {
            errorMessage.classList.remove('show');
        }, 3000); // ocultar después de 3 segundos
        return;
    }

    // Si no hay parada o datos de la parada
    if (!stopData) {
        // Crear div para el mensaje 
        const errorMessage = document.createElement('div');
        errorMessage.textContent = 'Error: Parada no encontrada o vacía';
        errorMessage.classList.add('error');
        document.body.appendChild(errorMessage);

        // Mostrar y ocultar mensaje
        errorMessage.classList.add('show');
        setTimeout(() => {
            errorMessage.classList.remove('show');
        }, 3000); // ocultar después de 3 segundos
        return;
    }

    // Si se ha proporcionado tanto la parada como la línea
    if (stopNumber && lineNumber) {
        const existsInApi = await stopAndLineExist(stopNumber, lineNumber);
        
        // Crear div para el mensaje 
        const errorMessage = document.createElement('div');
        errorMessage.textContent = 'Error: Actualmente no hay información para esa línea en esa parada';
        errorMessage.classList.add('error');
        document.body.appendChild(errorMessage);

        // Mostrar y ocultar el mensaje
        if (!existsInApi) {
        errorMessage.classList.add('show');
        setTimeout(() => {
            errorMessage.classList.remove('show');
        }, 3000); // ocultar después de 3 segundos
        return;
        }
    
        if (stopNumber && lineNumber) {
            var exists = busLines.some(function(line) {
                return line.stopNumber === stopNumber && line.lineNumber === lineNumber;
            });
            if (!exists) {
                busLines.push({ stopNumber: stopNumber, lineNumber: lineNumber });
                saveBusLines();
                updateBusList();

                // Crear div para el mensaje 
                const sucessMessage = document.createElement('div');
                sucessMessage.textContent = 'Línea añadida con éxito';
                sucessMessage.classList.add('success');
                document.body.appendChild(sucessMessage);

                // Mostrar y ocultar mensaje
                sucessMessage.classList.add('show');
                setTimeout(() => {
                    sucessMessage.classList.remove('show');
                }, 3000); // ocultar después de 3 segundos

                // Limpiar el contenido del input lineNumber
                document.getElementById('lineNumber').value = '';

                // Limpiamos sugerencias de lineas
                document.getElementById('lineSuggestions').innerHTML = '';
            }
        }
    }
    // Si solo se ha proporcionado la parada, añadir todas las líneas de esa parada
    else if (stopNumber && !lineNumber) {
        const allLines = [
            ...(stopData.lineas.ordinarias || []), 
            ...(stopData.lineas.poligonos || []), 
            ...(stopData.lineas.matinales || []), 
            ...(stopData.lineas.futbol || []), 
            ...(stopData.lineas.buho || []), 
            ...(stopData.lineas.universidad || [])
        ];

        allLines.forEach(line => {
            var exists = busLines.some(busLine => busLine.stopNumber === stopNumber && busLine.lineNumber === line);
            if (!exists) {
                busLines.push({ stopNumber: stopNumber, lineNumber: line });
            }
        });

        saveBusLines();
        updateBusList();

        // Crear div para el mensaje 
        const sucessMessage = document.createElement('div');
        sucessMessage.textContent = 'Todas las líneas de la parada añadidas';
        sucessMessage.classList.add('success');
        document.body.appendChild(sucessMessage);

        // Mostrar y ocultar mensaje
        sucessMessage.classList.add('show');
        setTimeout(() => {
            sucessMessage.classList.remove('show');
        }, 3000); // ocultar después de 3 segundos

        // Limpiar el contenido del input stopNumber
        document.getElementById('stopNumber').value = '';

        // Limpiamos sugerencias de lineas
        document.getElementById('lineSuggestions').innerHTML = '';
    }
}

function saveBusLines() {
    localStorage.setItem('busLines', JSON.stringify(busLines));
}

async function updateBusList() {
    var stops = groupByStops(busLines);

    // Si hay paradas añadidas mostramos boton borrar todas
    if (busLines.length > 0) {
        removeAllButton = document.getElementById('removeAllButton');
        removeAllButton.style.display = 'flex';
    }

    let horariosBox = document.getElementById('horarios-box');

    for (var stopId in stops) {
        let stopElement = document.getElementById(stopId);

        if (!stopElement) {
            // Borramos el mensaje de bienvenida
            welcomeBox = document.getElementById('welcome-box');
            welcomeBox.style.display = 'none';
            
            // Crear el stopElement si no existe
            stopElement = document.createElement('div');
            stopElement.id = stopId;
            stopElement.className = 'stop-block';
            
            stopElement.innerHTML = '<h2>'+ stopId + '</h2>';

            document.getElementById('busList').appendChild(stopElement);
        }

        const stopName = await getStopName(stopId);
        const stopGeo = await getStopGeo(stopId);

        if (stopName) {
            let updatedName = stopName + ' <span class="stopId">(' + stopId + ')</span>';
            updateStopName(stopElement, updatedName, stopGeo);
        }

        stops[stopId].forEach((line, index) => {
            const busId = stopId + '-' + line.lineNumber;
            let busElement = document.getElementById(busId);

            if (!busElement) {
                // Crear un nuevo elemento si no existe
                busElement = document.createElement('div');
                busElement.className = 'line-info ' + 'linea-' + line.lineNumber;
                busElement.id = busId;

                // Elementos pares tienen una clase especial
                if (index % 2 === 0) {
                    busElement.classList.add('highlight');
                }

                // Place holder inicial
                busElement.innerHTML = '<div class="linea"><h3>' + line.lineNumber + '</h3></div> <div class="tiempo">...</div>';
                
                // Crear el botón de eliminar
                const removeButton = createButton('remove-button', '&#128465;', function() {
                    removeBusLine(line.stopNumber, line.lineNumber);
                });
                busElement.appendChild(removeButton);
                // Crear el botón de flecha
                const arrowButton = createArrowButton();
                busElement.appendChild(arrowButton);

                // Añadir el nuevo elemento al bloque de la parada
                stopElement.appendChild(busElement);
            }

            // Actualizar el tiempo del autobús
            fetchBusTime(line.stopNumber, line.lineNumber, busElement);
        });

        // AÑadimos boton para ver todos los horarios si no está ya creado
        let mostrarHorarios = document.querySelector('#mostrar-horarios-' + stopId);
        let horariosElement = await displayScheduledBuses(stopId);

        if (!mostrarHorarios) {
            mostrarHorarios = document.createElement('button');
            mostrarHorarios.classList.add('mostrar-horarios');
            mostrarHorarios.id = 'mostrar-horarios-' + stopId;
            mostrarHorarios.innerHTML = 'Mostrar todos los horarios';
            stopElement.appendChild(mostrarHorarios);
        } else {
            // Si ya está creado, lo eliminamos y lo volvemos a crear para que quede al final
            mostrarHorarios.remove();
            mostrarHorarios = document.createElement('button');
            mostrarHorarios.classList.add('mostrar-horarios');
            mostrarHorarios.id = 'mostrar-horarios-' + stopId;
            mostrarHorarios.innerHTML = 'Mostrar todos los horarios';
            stopElement.appendChild(mostrarHorarios);
        }

        // Añadimos los horarios programados despues de busList cuando hagamos clic
        // en el botón .mostrar-horarios
        mostrarHorarios.addEventListener('click', function() {
            horariosBox.innerHTML = horariosElement.innerHTML;
            horariosBox.style.display = 'block';
            // Paramos las actualizaciones para que no se cierre el cuadro
            clearInterval(intervalId);

            // Agrega un controlador de eventos de clic a alerts-close
            let closeButtons = horariosBox.querySelectorAll('.horarios-close');
            closeButtons.forEach(function(button) {
                // Click event
                button.addEventListener('click', function() {
                    this.parentNode.style.display = 'none';
                    // Reanudamos y ejecutamos las actualizaciones
                    iniciarIntervalo(updateBusList);
                    updateBusList();
                });
            });
        });
    }

    // Eliminar elementos obsoletos del DOM
    removeObsoleteElements(stops);

    // Actualiza la hora de últimos cambios
    updateLastUpdatedTime();
}

function updateStopName(stopElement, newName, stopGeo) {
    // Actualiza el nombre de la parada en el DOM
    var nameElement = stopElement.querySelector('h2');
    if (nameElement) {
        nameElement.innerHTML = newName + ' <a class="mapIcon" title="Cómo llegar" href="https://www.qwant.com/maps/routes/?mode=walking&destination=latlon%253A' + stopGeo.y + ':' + stopGeo.x +'#map=19.00/' + stopGeo.y + '/' + stopGeo.x + '" target="_blank">Mapa</a>';
    }
}

function groupByStops(busLines) {
    return busLines.reduce(function(acc, line) {
        if (!acc[line.stopNumber]) {
            acc[line.stopNumber] = [];
        }
        acc[line.stopNumber].push(line);
        return acc;
    }, {});
}

// Función para obtener el nombre de la parada del JSON
async function getStopName(stopId) {
    try {
        // Buscar la parada por su número
        const stop = busStops.find(stop => stop.parada.numero === stopId);

        if (!stop) {
            throw new Error(`No se encontró la parada con el ID: ${stopId}`);
        }

        return stop.parada.nombre;
    } catch (error) {
        console.error('Error al obtener datos del JSON:', error);
        return null;
    }
}

// Función para obtener la ubicación de la parada del JSON
async function getStopGeo(stopId) {
    try {
        // Buscar la parada por su número
        const stop = busStops.find(stop => stop.parada.numero === stopId);

        if (!stop) {
            throw new Error(`No se encontró la parada con el ID: ${stopId}`);
        }

        return stop.ubicacion;
    } catch (error) {
        console.error('Error al obtener datos del JSON:', error);
        return null;
    }
}

function removeObsoleteElements(stops) {
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

async function fetchAllBusAlerts() {
    return fetch( apiEndPoint + '/alertas/')
        .then(response => response.json()) // Parse la respuesta a JSON
        .catch(error => console.error('Error:', error));
}

function filterBusAlerts(alerts, busLine) {
    // Filtra las alertas para la línea de autobús específica
    return alerts.filter(alert => alert.ruta.linea === busLine);
}

async function fetchScheduledBuses(stopNumber) {
    const cacheKey = 'busSchedule_' + stopNumber;
    const cachedData = getCachedData(cacheKey);

    // Comprueba si los datos en caché son válidos
    if (cachedData) {
        return cachedData;
    }

    // Si no hay datos en caché o están desactualizados, realiza una llamada a la API
    try {
        const url = apiEndPoint + `/v2/parada/${stopNumber}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Almacena los nuevos datos en el caché
        setCacheData(cacheKey, data);
        return data;
    } catch (error) {
        console.error('Error al recuperar y cachear la información sobre los buses:', error);
        return null;
    }
}

// Cache para los destinos de lineas
const stopsDestinationsCache = {
    data: {}, // Almacenará los datos de las paradas
    lastUpdated: 0, // Marca de tiempo de la última actualización
    cacheDuration: 24 * 60 * 60 * 1000 // 24 horas de cache de destinos 
};

async function getBusDestinationsForStop(stopNumber) {
    const currentTime = Date.now();

    // Verificar si los datos están en caché y aún son válidos
    if (stopsDestinationsCache.data[stopNumber] && (currentTime - stopsDestinationsCache.lastUpdated < stopsDestinationsCache.cacheDuration)) {
        return stopsDestinationsCache.data[stopNumber];
    }

    const apiUrl = apiEndPoint + `/v2/parada/${stopNumber}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        let destinations = {};
        if (data.lineas) {
            data.lineas.forEach(linea => {
                if (linea.destino) {
                    destinations[linea.linea] = linea.destino;
                }
            });
        }

        // Actualizar la caché
        stopsDestinationsCache.data[stopNumber] = destinations;
        stopsDestinationsCache.lastUpdated = currentTime;

        return destinations;
    } catch (error) {
        console.error("Error al obtener destinos para la parada", stopNumber, ":", error);
        return {};
    }
}

function getCachedData(cacheKey) {
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

function setCacheData(cacheKey, data) {
    const cacheEntry = JSON.stringify({
        data: data,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem(cacheKey, cacheEntry);
}

async function displayScheduledBuses(stopNumber) {
    if (fetchScheduledBuses(stopNumber)) {
        let horariosElement = document.createElement('div');
        horariosElement.className = 'horarios';
        horariosElement.id = 'horarios-' + stopNumber;
        horariosBuses = await fetchScheduledBuses(stopNumber);
        horariosElement.innerHTML += '<button class="horarios-close">Cerrar</button><h2>' + horariosBuses.parada[0].parada + '</h2><p>Horarios programados de <strong>llegada a esta parada</strong> hoy</p>';
        horariosBuses.lineas.forEach(bus => {
            horariosElement.innerHTML += '<div class="linea-' + bus.linea + '"><h3>' + bus.linea + '</h3><p class="destino">' + bus.destino + '</p>';
            // Si no hay horarios mostramos mensaje
            if (bus.horarios.length === 0) {
                horariosElement.innerHTML += '<p class="hora">No hay horarios programados para hoy</p>';
            }

            bus.horarios.forEach(horario => {
                // Eliminamos los segundos de la hora de llegada
                let timeParts = horario.llegada.split(':'); 
                let timeHHMM = `${timeParts[0]}:${timeParts[1]}`;
                horariosElement.innerHTML += '<span class="hora">' + timeHHMM + '</span> ';
            });
        });
        horariosElement.innerHTML += '</div><p class="notice">Nota: Las actualizaciones de tiempos están pausadas hasta que cierre esta ventana</p><button class="horarios-close">Cerrar</button></div>';
        return horariosElement;
    }
}

async function fetchBusTime(stopNumber, lineNumber, lineItem) {
    // URL del API con estáticos y tiempo real
    var apiUrl = apiEndPoint + '/v2/parada/' + stopNumber + '/' + lineNumber;

    // Recuperamos si hay alertas para esa linea
    const busLineAlerts = filterBusAlerts(allAlerts, lineNumber);
    let alertHTML = '';
    let alertIcon = '';
    if (busLineAlerts.length > 0) {
        alertHTML = `<div class="alert-box"><h2>Avisos para la línea ${lineNumber}</h2><ul>`;
        busLineAlerts.forEach(alert => {
            alertHTML += `<li>${alert.descripcion}</li>`;
        });
        alertHTML += '</ul><p class="notice">Nota: Las actualizaciones de tiempos están pausadas hasta que cierre esta ventana</p><button class="alerts-close">Cerrar</button></div>';
        alertIcon = '⚠️';
    }

    let busesProximos;

    try {
        const response = await fetch(apiUrl);
        const scheduledData = await response.json();

        let destino = "";
        if (scheduledData.lineas && scheduledData.lineas[0] && scheduledData.lineas[0].destino) {
            destino = scheduledData.lineas[0].destino;
        }
        // Cortamos destino a máximo 22 caracteres
        if (destino.length > 25) {
            destino = destino.substring(0, 22) + "...";
        }

        // Combinar datos
        const combinedData = combineBusData(scheduledData);

        // Filtrar y encontrar el bus más cercano para la línea específica
        let busesLinea = combinedData[lineNumber];
        if (busesLinea) {

        const busMasCercano = elegirBusMasCercano(busesLinea);
        busesProximos = getNextBuses(busMasCercano, busesLinea, 3);

        if (busMasCercano) {
            let horaLlegada;
            let tiempoRestante;
            let diferencia;
            let ubicacionLat;
            let ubicacionLon;
            let velocidad;

            let tripId = busMasCercano.scheduled.tripId;

            // Si hay datos en tiempo real, usarlos, de lo contrario, usar los programados
            if (busMasCercano.realTime) {
                horaLlegada = busMasCercano.realTime.llegada;
                ubicacionLat = busMasCercano.realTime.latitud;
                ubicacionLon = busMasCercano.realTime.longitud;
                velocidad = busMasCercano.realTime.velocidad;
                //tiempoRestante = busMasCercano.realTime.tiempoRestante;
                // Calculamos el tiempo en el cliente porque el api puede tener cacheado este cálculo
                // Si el busMasCercano.realTime.llegada es menor de 60 segundos, mostramos 0 minutos
                if (Math.floor((new Date(`${new Date().toISOString().split('T')[0]}T${busMasCercano.realTime.llegada}`) - new Date()) / 60000) < 1) {
                    tiempoRestante = 0;
                } else {
                    tiempoRestante = Math.floor((new Date(`${new Date().toISOString().split('T')[0]}T${busMasCercano.realTime.llegada}`) - new Date()) / 60000);
                }
                // Comparamos la hora de llegada programada con la hora de llegada en tiempo real
                let realTimeArrival = new Date(`${new Date().toISOString().split('T')[0]}T${busMasCercano.realTime.llegada}`);
                let scheduledArrival = new Date(`${new Date().toISOString().split('T')[0]}T${busMasCercano.scheduled.llegada}`);

                realTimeArrival.setSeconds(0);
                scheduledArrival.setSeconds(0);

                diferencia = Math.ceil((realTimeArrival - scheduledArrival) / 60000);

                lineItem.classList.remove('programado');
                lineItem.classList.add('realtime');
            } else {
                horaLlegada = busMasCercano.scheduled.llegada;
                // Calculamos el tiempo restante a partir de la hora de llegada programada en busMasCercano.scheduled.llegada
                // Si el busMasCercano.scheduled.llegada es menor de 60 segundos, mostramos 0 minutos
                if (Math.round((new Date(`${new Date().toISOString().split('T')[0]}T${busMasCercano.scheduled.llegada}`) - new Date()) / 60000) < 1) {
                    tiempoRestante = 0;
                } else {
                    tiempoRestante = Math.floor((new Date(`${new Date().toISOString().split('T')[0]}T${busMasCercano.scheduled.llegada}`) - new Date()) / 60000);
                }

                let ahora = new Date();
                let horaLlegadaProgramada = new Date(`1970-01-01T${busMasCercano.scheduled.llegada}Z`);

                // El bus está programado para el día siguiente
                if (horaLlegadaProgramada.getUTCHours() < ahora.getUTCHours() ||
                    (horaLlegadaProgramada.getUTCHours() === ahora.getUTCHours() && horaLlegadaProgramada.getUTCMinutes() < ahora.getUTCMinutes())) {
                        tiempoRestante = Math.round((new Date(`${new Date().toISOString().split('T')[0]}T${busMasCercano.scheduled.llegada}`) - new Date()) / 60000);
                        tiempoRestante = 1440 + tiempoRestante; // Sumamos 24 horas (en minutos) al tiempoRestante negativo
                        let horas = Math.floor(tiempoRestante / 60);
                        let minutos = tiempoRestante % 60;
                        tiempoRestante = `${horas}h ${minutos}`;
                }

                lineItem.classList.remove('realtime');
                lineItem.classList.add('programado');
            }

            // Pasamos la horas de llegada a formato HH:MM
            horaLlegada = horaLlegada.split(':');
            horaLlegada = horaLlegada[0] + ':' + horaLlegada[1];

            horaLlegadaProgramada = busMasCercano.scheduled.llegada.split(':');
            horaLlegadaProgramada = horaLlegadaProgramada[0] + ':' + horaLlegadaProgramada[1];

            // Calculos de retrasos/adelantos
            if (diferencia > 0) {
                diferencia = `Retraso ${diferencia} min.`;
                lineItem.classList.remove('adelantado');
                lineItem.classList.add('retrasado');
            }
            else if (diferencia < 0) {
                diferencia = `Adelanto ${Math.abs(diferencia)} min.`;
                lineItem.classList.add('adelantado');
                lineItem.classList.remove('retrasado');
            }
            else if (diferencia == 0) {
                diferencia = " - en hora";
                lineItem.classList.remove('adelantado');
                lineItem.classList.remove('retrasado');
            }
            else {
                diferencia = "- programado";
                lineItem.classList.remove('adelantado');
                lineItem.classList.remove('retrasado');
            }

            let mapElementClass = "showMapIcon";
            // Si no tenemos datos de ubicación añadimos una clase
            if (!ubicacionLat && !ubicacionLon) {
                mapElementClass += " noLocationData";
            }
            
            let mapElement = '<a class="' + mapElementClass + '" title="Ver linea en el mapa">Mapa</a>';

            // Actualizar el HTML con los datos del bus más cercano
            lineItem.innerHTML = '<div class="linea" data-trip-id="' + tripId + '"><h3>' + lineNumber + '<a class="alert-icon">' + alertIcon + '</a></h3><p class="destino">' + destino + '</p><p class="hora-programada">' + '<span class="hora">' + horaLlegadaProgramada + '</span> <span class="diferencia">' + diferencia + '</span></p></div><div class="hora-tiempo"><div class="tiempo">' + tiempoRestante + ' <p>min.</div>' + mapElement + '<div class="horaLlegada">' + horaLlegada + '</div></div>' + alertHTML;

            // Guarda si el elemento tenía la clase 'highlight'
            let hadHighlight = lineItem.classList.contains('highlight');

            // Elimina la clase 'highlight' temporalmente si la tenía
            if (hadHighlight) {
                lineItem.classList.remove('highlight');
            }

            // Aplica la clase 'highlight-update'
            lineItem.classList.add('highlight-update');

            // Espera 1 segundo, luego elimina 'highlight-update' y restaura 'highlight' si es necesario
            setTimeout(function() {
                    lineItem.classList.remove('highlight-update');
                    if (hadHighlight) {
                        lineItem.classList.add('highlight');
                    }
            }, 500);

            // Comprobamos si hay que mandar notifiaciones
            checkAndSendBusArrivalNotification(tiempoRestante, lineNumber, stopNumber, scheduledData.parada[0].parada);

            } else {
                lineItem.innerHTML = '<div class="linea"><h3>' + lineNumber + '<a class="alert-icon">' + alertIcon + '</a> </h3></div> <div class="tiempo sin-servicio">Sin servicio hoy</div>';
            }
        } else {
                lineItem.innerHTML = '<div class="linea"><h3>' + lineNumber  + '<a class="alert-icon">' + alertIcon + '</a></h3></div> <div class="tiempo sin-servicio">Sin servicio hoy</div>';
        }
            // Cuadro de alertas
            lineItem.innerHTML += alertHTML;

            // Agrega un controlador de eventos de clic a alert-icon
            lineItem.querySelector('.alert-icon').addEventListener('click', function() {
                const alertBox = this.parentNode.parentNode.parentNode.querySelector('.alert-box');
                if (alertBox) {
                        alertBox.style.display = 'flex';
                        // Paramos las actualizaciones para que no se cierre el cuadro
                        clearInterval(intervalId);

                        // Agrega un controlador de eventos de clic a alerts-close
                        alertBox.querySelector('.alerts-close').addEventListener('click', function() {
                            this.parentNode.style.display = 'none';
                            // Reanudamos y ejecutamos las actualizaciones
                            iniciarIntervalo(updateBusList);
                            updateBusList();
                        });
                }
            });

            // Agrega un controlador de eventos de clic mostrar el mapa si hay datos
            let intervalMap;
            let showMapIcon = lineItem.querySelector('.showMapIcon');
            if (showMapIcon) {
                showMapIcon.addEventListener('click', function(event) {
                    const mapBox = document.querySelector('#mapContainer');
                    // Obtenemos el tripId del elemento hermano llamado .linea
                    const brotherElement = this.parentElement.previousElementSibling;
                    const tripId = brotherElement.getAttribute('data-trip-id');
                

                    if (mapBox) {
                        let paradaData = {
                            latitud: scheduledData.parada[0].latitud,
                            longitud: scheduledData.parada[0].longitud,
                            nombre: scheduledData.parada[0].parada,
                        };

                        mapBox.classList.add('show');
                        updateBusMap(tripId, lineNumber, paradaData, true);

                        // Si intervalMap ya está definido, limpiar el intervalo existente
                        if (intervalMap) {
                            clearInterval(intervalMap);
                        }

                        intervalMap = setInterval(() => updateBusMap(tripId, lineNumber, paradaData, false), 5000);
                
                        // Agrega un controlador de eventos de clic a alerts-close
                        mapBox.querySelector('.map-close').addEventListener('click', function() {
                            mapBox.classList.remove('show');
                            if (intervalMap) {
                                // Paramos las actualizaciones
                                clearInterval(intervalMap);
                            }
                        });
                
                        event.stopPropagation();
                    }

                    this.parentElement.parentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            }
            
            // Creamos el panel informativo desplegable
            const infoPanel = createInfoPanel(busesProximos, stopNumber, lineNumber);
            lineItem.appendChild(infoPanel);

        } catch (error) {
            console.error('Error en fetchBusTime:', error);
            lineItem.innerHTML = '<div class="linea"><h3>' + lineNumber + '</h3></div> <div class="tiempo">Error</div>';
            // Asegúrate de agregar también aquí el botón de eliminar
            // Crear el botón de eliminar
            const removeButton = createButton('remove-button', '&#128465;', function() {
                removeBusLine(stopNumber, lineNumber);
            });
            lineItem.appendChild(removeButton);
            // Crear el botón de flecha
            const arrowButton = createArrowButton();
            lineItem.appendChild(arrowButton);
        };
}

// Combina los datos programados y en tiempo real agrupados por trip_id
function combineBusData(scheduledData) {
    let combined = {};

    // Procesar los datos programados
    scheduledData.lineas.forEach(bus => {
        const linea = bus.linea;
        if (!combined[linea]) {
            combined[linea] = {};
        }

        bus.horarios.forEach(schedule => {
            if (!combined[linea][schedule.trip_id]) {
                combined[linea][schedule.trip_id] = { scheduled: null, realTime: null };
            }
            combined[linea][schedule.trip_id].scheduled = {
                llegada: schedule.llegada,
                tripId: schedule.trip_id ? schedule.trip_id.toString() : undefined
            };
        });

        bus.realtime.forEach(schedule => {
            if (!combined[linea][schedule.trip_id]) {
                combined[linea][schedule.trip_id] = { scheduled: null, realTime: null };
            }

            combined[linea][schedule.trip_id].realTime = {
                llegada: schedule.llegada,
                latitud: schedule.latitud ? schedule.latitud.toString() : undefined,
                longitud: schedule.longitud ? schedule.longitud.toString() : undefined,
                velocidad: schedule.velocidad ? schedule.velocidad.toString() : undefined
                //tiempoRestante: schedule.tiempoRestante
            };
        });

    });
    return combined;
}

function elegirBusMasCercano(buses) {

    if (!buses) return null;

    let tripIdMasCercanoHoy = null;
    let busMasCercanoHoy = null;
    let diferenciaMinima = Infinity;
    let busesAdelantados = new Set();
    let tripIdPrimerBusSiguienteDia = null;

    const hoy = new Date();
    const fechaHoy = hoy.toISOString().split('T')[0]; // Fecha de hoy en formato YYYY-MM-DD

    Object.entries(buses).forEach(([tripId, bus]) => {
        let horaLlegada = null;

        if (bus.realTime && bus.realTime.llegada) {
            let [hora, minuto, segundo] = bus.realTime.llegada.split(":").map(Number);
            horaLlegada = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), hora, minuto, segundo);
            // Si el bus ya llegó, añadirlo al conjunto de buses adelantados y saltar al siguiente bus
            if (horaLlegada - hoy < 0) {
                busesAdelantados.add(tripId);
                return;
            }
        }

        // Saltar al siguiente bus si este bus está en el conjunto de buses adelantados
        if (busesAdelantados.has(tripId)) {
            return;
        }
        // Continuar solo si el bus no está en el conjunto de buses adelantados
        if (!busesAdelantados.has(tripId)) {
            // Para evitar conflictos con buses retrasados que llegan después del
            // siguiente bus programado, selecionamos como bus siguiente siempre el
            // tenga la hora en tiempo real más cercana, si no, el programado
            if (bus.realTime && bus.realTime.llegada) {
                horaLlegada = new Date(`${fechaHoy}T${bus.realTime.llegada}`);
            } else if (bus.scheduled && bus.scheduled.llegada) {
                horaLlegada = new Date(`${fechaHoy}T${bus.scheduled.llegada}`);
            }

            if (horaLlegada) {
                let diferencia = horaLlegada - hoy;
                if (diferencia > 0 && diferencia < diferenciaMinima) {
                    diferenciaMinima = diferencia;
                    tripIdMasCercanoHoy = tripId;
                    busMasCercanoHoy = bus;
                }
            }
        }
    });

    // Si no se encontró un bus para hoy, seleccionar el primero de la mañana del día siguiente
    if (diferenciaMinima === Infinity) {
        let horaMinima = new Date('1970-01-02T23:59:59');
        Object.entries(buses).forEach(([tripId, bus]) => {
            if (bus.scheduled && bus.scheduled.llegada) {
                let horaLlegadaSiguienteDia = new Date(`1970-01-02T${bus.scheduled.llegada}`);
                if (horaLlegadaSiguienteDia < horaMinima) {
                    horaMinima = horaLlegadaSiguienteDia;
                    tripIdPrimerBusSiguienteDia = tripId;
                    primerBusSiguienteDia = bus;
                }
            }
        });
    }

    if (tripIdPrimerBusSiguienteDia && primerBusSiguienteDia) {
        return { 
            trip_id: tripIdPrimerBusSiguienteDia, 
            scheduled: primerBusSiguienteDia.scheduled, 
            realTime: primerBusSiguienteDia.realTime 
        };
    }

    // Si hay buses disponibles para hoy, devolver el más cercano
    if (tripIdMasCercanoHoy && busMasCercanoHoy) {
        return { 
            trip_id: tripIdMasCercanoHoy, 
            scheduled: busMasCercanoHoy.scheduled, 
            realTime: busMasCercanoHoy.realTime 
        };
    }

    // Si no se encontró ningún bus, devolver null
    return null;
}

function getNextBuses(busMasCercano, busesLinea, numBuses) {
    // Convertir busesLinea a un array
    const busesArray = Object.values(busesLinea);

    // Función auxiliar para obtener la hora de llegada
    const getArrivalTime = (bus) => {
        return bus.realTime && bus.realTime.llegada ? bus.realTime.llegada : bus.scheduled.llegada;
    };

    // Ordenar el array por hora de llegada
    busesArray.sort((a, b) => {
        return new Date('1970/01/01 ' + getArrivalTime(a)) - new Date('1970/01/01 ' + getArrivalTime(b));
    });

    // Encontrar el índice de busMasCercano en el array
    const indexBusMasCercano = busesArray.findIndex(bus => bus.scheduled.tripId === busMasCercano.scheduled.tripId);

    // Seleccionar los 'numBuses' buses siguientes
    const nextBuses = busesArray.slice(indexBusMasCercano + 1, indexBusMasCercano + 1 + numBuses);

    // Devolver los datos de los buses seleccionados
    return nextBuses;
}

function removeBusLine(stopNumber, lineNumber) {
   
    let avisoBorrado = '¿Seguro que quieres borrar la línea ' + lineNumber + ' de la parada ' + stopNumber + '?';

    if (confirm(avisoBorrado)) {
        busLines = busLines.filter(function(line) {
            return !(line.stopNumber === stopNumber && line.lineNumber === lineNumber);
        });

        saveBusLines();
        updateBusList();
        updateNotifications(null, stopNumber, lineNumber);
    } else {
        // El usuario eligió no eliminar las líneas de autobús
        console.log("Eliminación cancelada.");
    }
}

function removeAllBusLines() {
    // Mostrar un cuadro de diálogo de confirmación
    if (confirm("¿Seguro que quieres borrar todas las líneas y paradas en seguimiento?")) {
        busLines = [];
        saveBusLines();
        updateBusList();

        // Borramos todas las notifiaciones
        updateNotifications(null, null, null);

        // Volvemos a mostrar el welcome-box
        welcomeBox = document.getElementById('welcome-box');
        welcomeBox.style.display = 'block';

        // Ocultamos el boton removeallbutton
        removeAllButton = document.getElementById('removeAllButton');
        removeAllButton.style.display = 'none';
        let horariosBox = document.getElementById('horarios-box');
        horariosBox.innerHTML = '';
    } else {
        // El usuario eligió no eliminar las líneas de autobús
        console.log("Eliminación cancelada.");
    }
}

function updateLastUpdatedTime() {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString(); // Formatea la hora como prefieras
    document.getElementById('last-update').textContent = 'Última actualización: ' + formattedTime;
}

// Variable para almacenar los datos de las paradas
let busStops = [];

// Función para cargar el JSON
async function loadBusStops() {
    const cacheKey = 'busStops';
    const cachedData = getCachedData(cacheKey);

    // Si hay datos en caché, usarlos
    if (cachedData) {
        busStops = cachedData;
    }

    // Si no hay datos en caché o están desactualizados, realiza una llamada al API
    try {
        const url = apiEndPoint + '/v2/paradas/';
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        busStops = data;

        // Guardar datos nuevos en el cache
        setCacheData(cacheKey, data);
    } catch (error) {
        console.error('Error al recuperar y cachear los datos de paradas:', error);
        return null;
    }
}

// Función para mostrar el spinner de carga
function displayLoadingSpinner() {
    let spinnerOverlay = document.getElementById('spinnerOverlay');
    spinnerOverlay.style.display = 'flex';
}

// Función para ocultar el spinner de carga
function hideLoadingSpinner() {
    let spinnerOverlay = document.getElementById('spinnerOverlay');
    spinnerOverlay.style.display = 'none';
}

// Función para mostrar las paradas más cercanas
function showNearestStops(position) {
    const userLocation = { x: position.coords.longitude, y: position.coords.latitude };
    let sortedStops = busStops.map(stop => {
        let distance = calculateDistance(userLocation, stop.ubicacion);
        return { ...stop, distance: distance };
    }).sort((a, b) => a.distance - b.distance).slice(0, 10);

    displayNearestStopsResults(sortedStops, userLocation);
}

// Función para mostrar los resultados de las paradas más cercanas
async function displayNearestStopsResults(stops, userLocation) {
    let resultsDiv = document.getElementById('nearestStopsResults');
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = '<button id="close-nearest-stops">Cerrar</button>';

    // Añadir otros elementos estáticos al resultsDiv
    resultsDiv.innerHTML += '<h3>Paradas cercanas</h3><p>Estas son las paradas más cercanas a tu ubicación.</p><p><strong>Pulsa sobre la linea para añadirla</strong> o sobre el botón <strong>+</strong> para añadir todas las líneas de la parada.</p>';

    for (let stop of stops) {
        // Obtener destino para todas las líneas de la parada
        let lineasDestinos = await getBusDestinationsForStop(stop.parada.numero);

        // Procesar cada línea y su destino
        let lineasHTML = stop.lineas.ordinarias.map(linea => {
            let destino = lineasDestinos[linea] || 'Destino desconocido';
            return `<span class="addLineButton linea-${linea}" data-stop-number="${stop.parada.numero}" data-line-number="${linea}">${linea} - ${destino}</span>`;
        }).join(" ");

        // Crear y añadir el div para cada parada
        let stopDiv = document.createElement('div');
        stopDiv.classList.add('stopResult');

        stopDiv.innerHTML = '<button class="addStopButton" data-stop-number="' + stop.parada.numero + '">+</button><h4>' + stop.parada.nombre + ' (' + stop.parada.numero + ')</h4><ul><li>' +
            lineasHTML + '</li><li>Distancia: ' +
            stop.distance + 'm</li></ul><a class="mapIcon" title="Cómo llegar" href="https://www.qwant.com/maps/routes/?mode=walking&amp;destination=latlon%3A' + stop.ubicacion.y + ':' + stop.ubicacion.x + '&amp;origin=latlon%3A' + userLocation.y + '%3A' + userLocation.x + '#map=19.00/' + stop.ubicacion.x + '/' + stop.ubicacion.x + '" target="_blank">Mapa</a>';

        resultsDiv.appendChild(stopDiv);
    }

    // Manejar los eventos de clic usando delegación de eventos
    resultsDiv.addEventListener('click', function (event) {
        if (event.target.matches('#close-nearest-stops')) {
            resultsDiv.style.display = 'none';
        } else if (event.target.matches('.addStopButton')) {
            let stopNumber = event.target.getAttribute('data-stop-number');
            addBusLine(stopNumber);
            resultsDiv.style.display = 'none';
        } else if (event.target.matches('.addLineButton')) {
            let stopNumber = event.target.getAttribute('data-stop-number');
            let lineNumber = event.target.getAttribute('data-line-number');
            addBusLine(stopNumber, lineNumber);
            resultsDiv.style.display = 'none';
        }
    });

    hideLoadingSpinner();
}

// Función para calcular la distancia entre dos puntos
function calculateDistance(loc1, loc2) {
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

function showError(error) {
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

let allAlerts = [];

// Declaración global de intervalId
let intervalId;

window.onload = async function() {

    // Al cargar la página, comprobar el theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.classList.toggle('dark-mode', savedTheme === 'dark');
        themeToggleIcon.textContent = savedTheme === 'dark' ? '🌜' : '🌞';
    }

    // Cargamos la lista de paradas para buscador.js
    await loadBusStops();

    // Acciones para botones añadir y quitar
    var addButton = document.getElementById('addButton');
    var removeAllButton = document.getElementById('removeAllButton');

    if (removeAllButton) {
        removeAllButton.addEventListener('click', removeAllBusLines);
    }

    if (addButton) {
        addButton.addEventListener('click', function() {
            const stopNumber = document.getElementById('stopNumber').value;
            const lineNumber = document.getElementById('lineNumber').value;
            addBusLine(stopNumber, lineNumber);
        });
    }

    // Recuperamos todas las alertas vigentes
    allAlerts = await fetchAllBusAlerts();

    updateBusList();
}

function iniciarIntervalo(updateBusList) {
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

iniciarIntervalo(updateBusList);

// Dark mode
const themeToggle = document.getElementById('theme-toggle');
const themeToggleIcon = document.getElementById('theme-toggle-icon');

themeToggle.addEventListener('click', () => {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    themeToggleIcon.textContent = isDarkMode ? '🌜' : '🌞';
    // Guardar la preferencia del usuario
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
});

document.addEventListener('DOMContentLoaded', () => {
    // Detección del theme del usuario
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark-mode');
        themeToggleIcon.textContent = '🌜';
    }

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
});

// Código para la instalación como PWA 
let deferredPrompt;

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
