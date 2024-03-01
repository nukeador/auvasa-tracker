import { getCachedData, setCacheData, updateStopName, createArrowButton, createButton, createInfoPanel, removeObsoleteElements, updateLastUpdatedTime, iniciarIntervalo, calculateDistance, hideLoadingSpinner, createStopElement, createBusElement, setupMostrarHorariosEventListener, createMostrarHorariosButton } from './utils.js';
import { checkAndSendBusArrivalNotification, updateNotifications } from './notifications.js';
import { updateBusMap } from './mapa.js';

// Definir la URL base del API
export const apiEndPoint = 'https://gtfs.auvasatracker.com';

// Recuperamos todas las alertas vigentes
const allAlerts = await fetchAllBusAlerts();
let busStops = [];

export let intervalId;

// Cache para los destinos de lineas
const stopsDestinationsCache = {
    data: {}, // Almacenará los datos de las paradas
    lastUpdated: 0, // Marca de tiempo de la última actualización
    cacheDuration: 24 * 60 * 60 * 1000 // 24 horas de cache de destinos 
};

// Agregar función para consultar API
export async function stopAndLineExist(stopNumber, lineNumber) {
    // Buscar la parada en busStops usando stopNumber
    const busStops = await loadBusStops();
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

export function groupByStops(busLines) {
    return busLines.reduce(function(acc, line) {
        if (!acc[line.stopNumber]) {
            acc[line.stopNumber] = [];
        }
        acc[line.stopNumber].push(line);
        return acc;
    }, {});
}

// Función para obtener el nombre de la parada del JSON
export async function getStopName(stopId) {
    try {
        // Buscar la parada por su número
        const busStops = await loadBusStops();
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
export async function getStopGeo(stopId) {
    try {
        // Buscar la parada por su número
        const busStops = await loadBusStops();
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

export async function fetchAllBusAlerts() {
    try {
        const response = await fetch(apiEndPoint + '/alertas/');

        if (!response.ok) {
            // Si la respuesta no es exitosa, devuelve un array vacío
            return [];
        }

        const data = await response.text(); // Obtiene la respuesta como texto

        try {
            // Intenta parsear el texto a JSON
            return JSON.parse(data);
        } catch (error) {
            // Si el parseo falla (por ejemplo, si está vacío o no es JSON válido), devuelve un array vacío
            console.log('Error al recuperar alertas:', error);
            return [];
        }
    } catch (error) {
        console.error('Error al recuperar alertas:', error);
        return []; // Retorna un array vacío en caso de error
    }
}

export function filterBusAlerts(alerts, busLine) {
    // Verifica si alerts es array y no está vacío
    if (!Array.isArray(alerts) || alerts.length === 0) {
        return [];
    }

    // Filtra las alertas para la línea de autobús específica
    // TODO: Añadir también las alertas globales que tienen gtfsRouteId null
    return alerts.filter(alert => alert.ruta && alert.ruta.linea === busLine);
}


export async function fetchScheduledBuses(stopNumber) {
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
export async function getBusDestinationsForStop(stopNumber) {
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

export async function displayScheduledBuses(stopNumber) {
    if (fetchScheduledBuses(stopNumber)) {
        let horariosElement = document.createElement('div');
        horariosElement.className = 'horarios';
        horariosElement.id = 'horarios-' + stopNumber;
        let horariosBuses = await fetchScheduledBuses(stopNumber);
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

export async function addBusLine(stopNumber, lineNumber) {

    let busLines = localStorage.getItem('busLines') ? JSON.parse(localStorage.getItem('busLines')) : [];

    // Buscar la parada en busStops usando stopNumber
    const busStops = await loadBusStops();
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
            const exists = busLines.some(function(line) {
                return line.stopNumber === stopNumber && line.lineNumber === lineNumber;
            });
            if (!exists) {
                busLines.push({ stopNumber: stopNumber, lineNumber: lineNumber });
                saveBusLines(busLines);
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
            const exists = busLines.some(busLine => busLine.stopNumber === stopNumber && busLine.lineNumber === line);
            if (!exists) {
                busLines.push({ stopNumber: stopNumber, lineNumber: line });
            }
        });

        saveBusLines(busLines);
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

export function saveBusLines(busLines) {
    localStorage.setItem('busLines', JSON.stringify(busLines));
}

// Función principal que crea y actualiza la lista de paradas y líneas
export async function updateBusList() {
    // Recuperamos las paradas y líneas añadidas
    let busLines = localStorage.getItem('busLines') ? JSON.parse(localStorage.getItem('busLines')) : [];
    const stops = groupByStops(busLines);

    // No mostramos el botón de borrar todas si no hay lineas añadidas
    let removeAllButton = document.getElementById('removeAllButton');
    removeAllButton.style.display = busLines.length > 0 ? 'flex' : 'none';

    let horariosBox = document.getElementById('horarios-box');
    let busList = document.getElementById('busList');

    for (let stopId in stops) {
        let stopElement = document.getElementById(stopId);
        // Solo creamos las paradas que no estaban creadas previamente
        if (!stopElement) {
            stopElement = createStopElement(stopId, busList);
        }

        const stopName = await getStopName(stopId);
        const stopGeo = await getStopGeo(stopId);
        // Actualizamos el nombre de la parada si ha cambiado
        if (stopName) {
            let updatedName = stopName + ' <span class="stopId">(' + stopId + ')</span>';
            if (!stopElement.querySelector('.stopId') || stopElement.querySelector('.stopId').textContent !== '(' + stopId + ')') {
                updateStopName(stopElement, updatedName, stopGeo);
            }
        }


        stops[stopId].forEach((line, index) => {
            const busId = stopId + '-' + line.lineNumber;
            let busElement = document.getElementById(busId);
            // Solo creamos las líneas que no estaban creadas previamente
            if (!busElement) {
                busElement = createBusElement(busId, line, index, stopElement);
            }
            // Llamar a fetchBusTime independientemente de si el busElement es nuevo o ya existía
            fetchBusTime(line.stopNumber, line.lineNumber, busElement);
        });

        // Botón para motrar horarios al final
        let mostrarHorarios = stopElement.querySelector('.mostrar-horarios');
        // Para asegurarnos que queda al final al añadir una linea lo borramos y lo volvemos a colocar
        if (mostrarHorarios) {
            mostrarHorarios.remove();
        }
        mostrarHorarios = createMostrarHorariosButton(stopId, stopElement);
        setupMostrarHorariosEventListener(mostrarHorarios, stopId, horariosBox);
    }

    removeObsoleteElements(stops);
    updateLastUpdatedTime();
}
// Función principal que actualiza los datos de una línea
export async function fetchBusTime(stopNumber, lineNumber, lineItem) {
    // URL del API con estáticos y tiempo real
    const apiUrl = apiEndPoint + '/v2/parada/' + stopNumber + '/' + lineNumber;

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

        // Recuperamos el destino para esa línea
        let destino = "";
        if (scheduledData.lineas && scheduledData.lineas[0] && scheduledData.lineas[0].destino) {
            destino = scheduledData.lineas[0].destino;
        }
        // Cortamos destino a máximo 22 caracteres
        if (destino.length > 25) {
            destino = destino.substring(0, 22) + "...";
        }

        // Agrupar los datos por trip_id para una mejor búsqueda
        const combinedData = combineBusData(scheduledData);
        let busesLinea = combinedData[lineNumber];

        // Si no hay datos para esa línea, no hacemos nada
        if (busesLinea) {
        // Filtrar y encontrar el bus más cercano para la línea específica
        const busMasCercano = elegirBusMasCercano(busesLinea);
        // Obtener los próximos 3 buses
        busesProximos = getNextBuses(busMasCercano, busesLinea, 3);

        if (busMasCercano) {
            let horaLlegada;
            let tiempoRestante;
            let diferencia;
            let ubicacionLat;
            let ubicacionLon;
            let velocidad;

            
            let tripId = busMasCercano.trip_id;

            // Si hay datos en tiempo real, usarlos, de lo contrario, usar los programados
            if (busMasCercano.realTime) {
                horaLlegada = busMasCercano.realTime.llegada;
                ubicacionLat = busMasCercano.realTime.latitud;
                ubicacionLon = busMasCercano.realTime.longitud;
                velocidad = busMasCercano.realTime.velocidad;
                // tiempoRestante = busMasCercano.realTime.tiempoRestante;
                // Calculamos el tiempo en el cliente porque el api puede tener cacheado este cálculo
                // Si el busMasCercano.realTime.llegada es menor de 60 segundos, mostramos 0 minutos
                if (Math.floor((new Date(`${new Date().toISOString().split('T')[0]}T${busMasCercano.realTime.llegada}`) - new Date()) / 60000) < 1) {
                    tiempoRestante = 0;
                } else {
                    tiempoRestante = Math.floor((new Date(`${new Date().toISOString().split('T')[0]}T${busMasCercano.realTime.llegada}`) - new Date()) / 60000);
                }
                // Comparamos la hora de llegada programada con la hora de llegada en tiempo real sin mirar los segundos
                // Check por si en scheduled no hay datos o es null
                if (busMasCercano.scheduled) {
                    let realTimeArrival = new Date(`${new Date().toISOString().split('T')[0]}T${busMasCercano.realTime.llegada}`);
                    let scheduledArrival = new Date(`${new Date().toISOString().split('T')[0]}T${busMasCercano.scheduled.llegada}`);
                    realTimeArrival.setSeconds(0);
                    scheduledArrival.setSeconds(0);

                    diferencia = Math.ceil((realTimeArrival - scheduledArrival) / 60000);
                } else {
                    diferencia = 0;
                }

                lineItem.classList.remove('programado');
                lineItem.classList.add('realtime');
            } else {
                // Si no hay datos en tiempo real calculamos el tiempo restante a partir de la hora de llegada programada
                horaLlegada = busMasCercano.scheduled.llegada;
                // Si el busMasCercano.scheduled.llegada es menor de 60 segundos, mostramos 0 minutos
                if (Math.round((new Date(`${new Date().toISOString().split('T')[0]}T${busMasCercano.scheduled.llegada}`) - new Date()) / 60000) < 1) {
                    tiempoRestante = 0;
                } else {
                    tiempoRestante = Math.floor((new Date(`${new Date().toISOString().split('T')[0]}T${busMasCercano.scheduled.llegada}`) - new Date()) / 60000);
                }

                let ahora = new Date();
                let horaLlegadaProgramada = new Date(`1970-01-01T${busMasCercano.scheduled.llegada}Z`);

                // Fix al tiempo restante si el bus está programado para el día siguiente
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

            let horaLlegadaProgramada;
            if (busMasCercano.scheduled) {
                horaLlegadaProgramada = busMasCercano.scheduled.llegada.split(':');
                horaLlegadaProgramada = horaLlegadaProgramada[0] + ':' + horaLlegadaProgramada[1];
            } else {
                horaLlegadaProgramada = busMasCercano.realTime.llegada.split(':');
                horaLlegadaProgramada = horaLlegadaProgramada[0] + ':' + horaLlegadaProgramada[1];
            }

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

            // TODO: Solo actualizar los datos que hayan cambiado desde la anterior actualización cambiado el texto de dentro de los elementos placeholder creados por createBusElement()
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

            // Comprobamos si hay que mandar notificaciones
            checkAndSendBusArrivalNotification(tiempoRestante, lineNumber, stopNumber, scheduledData.parada[0].parada);

            } else {
                // Si no hay bus más cercano
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
            // Agregar también aquí el botón de eliminar
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
export function combineBusData(scheduledData) {
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

        bus.realtime.forEach(realtime => {
            if (!combined[linea][realtime.trip_id]) {
                combined[linea][realtime.trip_id] = { scheduled: null, realTime: null };
            }

            combined[linea][realtime.trip_id].realTime = {
                llegada: realtime.llegada,
                latitud: realtime.latitud ? realtime.latitud.toString() : undefined,
                longitud: realtime.longitud ? realtime.longitud.toString() : undefined,
                velocidad: realtime.velocidad ? realtime.velocidad.toString() : undefined
                //tiempoRestante: realtime.tiempoRestante
            };
        });

    });
    return combined;
}

export function elegirBusMasCercano(buses) {

    if (!buses) return null;

    let tripIdMasCercanoHoy = null;
    let busMasCercanoHoy = null;
    let diferenciaMinima = Infinity;
    let busesAdelantados = new Set();
    let tripIdPrimerBusSiguienteDia = null;
    let primerBusSiguienteDia = null;

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

export function getNextBuses(busMasCercano, busesLinea, numBuses) {
    // Convertir busesLinea a un array
    const busesArray = Object.values(busesLinea);

    const getArrivalTime = (bus) => {
        // Primero intentar usar bus.realTime.llegada
        if (bus.realTime && bus.realTime.llegada) {
            return bus.realTime.llegada;
        }
        // Si no está disponible, intentar usar bus.scheduled.llegada, verificando primero que bus.scheduled no sea null
        if (bus.scheduled && bus.scheduled.llegada) {
            return bus.scheduled.llegada;
        }
        return null; // Devolver null si ninguna de las dos está disponible
    };

    // Ordenar el array por hora de llegada
    busesArray.sort((a, b) => {
        return new Date('1970/01/01 ' + getArrivalTime(a)) - new Date('1970/01/01 ' + getArrivalTime(b));
    });

    // Encontrar el índice de busMasCercano en el array
    // Verificar si hay busMasCercano y si busMasCercano.scheduled es null antes de buscar su índice
    // Hay veces que los datos en realTime traen tripID que no existen en los progamados, por eso este check
    let indexBusMasCercano;
    if (busMasCercano && busMasCercano.scheduled) {
        indexBusMasCercano = busesArray.findIndex(bus => bus.scheduled && bus.scheduled.tripId === busMasCercano.scheduled.tripId);
    } else {
        return [];
    }

    // Seleccionar los 'numBuses' buses siguientes
    const nextBuses = busesArray.slice(indexBusMasCercano + 1, indexBusMasCercano + 1 + numBuses);

    // Devolver los datos de los buses seleccionados
    return nextBuses;
}
export function removeBusLine(stopNumber, lineNumber) {
   
    let avisoBorrado = '¿Seguro que quieres borrar la línea ' + lineNumber + ' de la parada ' + stopNumber + '?';

    let busLines = localStorage.getItem('busLines') ? JSON.parse(localStorage.getItem('busLines')) : [];

    if (confirm(avisoBorrado)) {
        busLines = busLines.filter(function(line) {
            return !(line.stopNumber === stopNumber && line.lineNumber === lineNumber);
        });

        saveBusLines(busLines);
        updateBusList();
        updateNotifications(null, stopNumber, lineNumber);
    } else {
        // El usuario eligió no eliminar las líneas de autobús
        console.log("Eliminación cancelada.");
    }
}

export function removeAllBusLines() {
    // Mostrar un cuadro de diálogo de confirmación
    if (confirm("¿Seguro que quieres borrar todas las líneas y paradas en seguimiento?")) {
        let busLines = [];
        saveBusLines(busLines);
        updateBusList();

        // Borramos todas las notifiaciones
        updateNotifications(null, null, null);

        // Volvemos a mostrar el welcome-box
        let welcomeBox = document.getElementById('welcome-box');
        welcomeBox.style.display = 'block';

        // Ocultamos el boton removeallbutton
        let removeAllButton = document.getElementById('removeAllButton');
        removeAllButton.style.display = 'none';
        let horariosBox = document.getElementById('horarios-box');
        horariosBox.innerHTML = '';
    } else {
        // El usuario eligió no eliminar las líneas de autobús
        console.log("Eliminación cancelada.");
    }
}

// Función para cargar el JSON
export async function loadBusStops() {
    const cacheKey = 'busStops';
    const cachedData = getCachedData(cacheKey);

    // Si hay datos en caché, usarlos
    if (cachedData) {
        busStops = cachedData;
        return busStops;
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
        return busStops;
    } catch (error) {
        console.error('Error al recuperar y cachear los datos de paradas:', error);
        return null;
    }
}

// Función para mostrar las paradas más cercanas
export async function showNearestStops(position) {
    const userLocation = { x: position.coords.longitude, y: position.coords.latitude };
    const busStops = await loadBusStops();
    let sortedStops = busStops.map(stop => {
        let distance = calculateDistance(userLocation, stop.ubicacion);
        return { ...stop, distance: distance };
    }).sort((a, b) => a.distance - b.distance).slice(0, 10);

    displayNearestStopsResults(sortedStops, userLocation);
}

// Función para mostrar los resultados de las paradas más cercanas
export async function displayNearestStopsResults(stops, userLocation) {
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
    resultsDiv.addEventListener('click', async function (event) {
        if (event.target.matches('#close-nearest-stops')) {
            resultsDiv.style.display = 'none';
        } else if (event.target.matches('.addStopButton')) {
            let stopNumber = event.target.getAttribute('data-stop-number');
            await addBusLine(stopNumber);
            resultsDiv.style.display = 'none';
        } else if (event.target.matches('.addLineButton')) {
            let stopNumber = event.target.getAttribute('data-stop-number');
            let lineNumber = event.target.getAttribute('data-line-number');
            await addBusLine(stopNumber, lineNumber);
            resultsDiv.style.display = 'none';
        }
    });

    hideLoadingSpinner();
}
