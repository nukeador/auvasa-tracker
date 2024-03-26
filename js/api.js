import { getCachedData, setCacheData, updateStopName, createInfoPanel, removeObsoleteElements, updateLastUpdatedTime, iniciarIntervalo, calculateDistance, hideLoadingSpinner, createStopElement, createBusElement, createMostrarHorarios, displayGlobalAlertsBanner, toogleSidebar, scrollToElement, createRemoveStopButton, getYesterdayDate, getFutureDate, showErrorPopUp, showSuccessPopUp } from './utils.js';
import { checkAndSendBusArrivalNotification, updateNotifications } from './notifications.js';
import { updateBusMap } from './mapa.js';

// Definir la URL base del API, no incluir la / al final
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

// Comprobación de si lineas y paradas existen en los datos del API
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

// Agrupar conjunto de paradas por su número de parada
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

// Función para obtener las líneas de una parada
export async function getStopLines(stopId) {
    try {
        // Buscar la parada por su número
        const busStops = await loadBusStops();
        const stop = busStops.find(stop => stop.parada.numero === stopId);

        if (!stop) {
            throw new Error(`No se encontró la parada con el ID: ${stopId}`);
        }

        // Extraer las líneas de la parada
        const lines = stop.lineas.ordinarias;

        return lines;
    } catch (error) {
        console.error('Error al obtener datos del JSON:', error);
        return null;
    }
}

// Obtener todas los avisos y alertas
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

// Filtrar y mostrar solo las alertas de una línea en concreto
export function filterBusAlerts(alerts, busLine) {
    // Verifica si alerts es array y no está vacío
    if (!Array.isArray(alerts) || alerts.length === 0) {
        return [];
    }

    // Filtra las alertas para la línea de autobús específica
    return alerts.filter(alert => {
        // Si la alerta es global (no tiene ni parada ni línea especificada) la incluimos. Nota: Desactivado de momento porque ya mostramos un banner con esto.
        // if (alert.ruta.parada === null && alert.ruta.linea === null) {
        //    return true;
        // }
        // Si la alerta es para una línea específica, la incluimos si coincide con busLine
        // o si no tiene parada especificada
        return alert.ruta.linea === busLine;
    });
}

// Filtrar y mostrar las alertas de una parada específica
// TODO: Añadir la llamada cuando mostrarmos el nombre de las paradas
export function filterAlertsByStop(alerts, stopNumber) {
    // Verifica si alerts es array y no está vacío
    if (!Array.isArray(alerts) || alerts.length === 0) {
        return [];
    }

    // Filtra las alertas para la parada específica
    return alerts.filter(alert => {
        // Si la alerta es global (no tiene ni parada ni línea especificada) la incluimos
        if (alert.ruta.parada === null && alert.ruta.linea === null) {
            return true;
        }
        // Si la alerta es para una parada específica, la incluimos si coincide con stopNumber
        return alert.ruta.parada === stopNumber;
    });
}

// Obtener el listado de paradas suprimidas
export async function fetchSuppressedStops() {
    try {
        const response = await fetch(apiEndPoint + '/paradas/suprimidas');

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

// Consultamos en el api los horarios programados
// Podemos perdirselos de sólo una parada
// O podemos especificar también línea y fecha
export async function fetchScheduledBuses(stopNumber, lineNumber, date) {
    
    const baseCacheKey = `busSchedule_${stopNumber}`;
    let cacheKey = lineNumber ? `${baseCacheKey}_${lineNumber}` : baseCacheKey;
    cacheKey += date ? `_${date}` : '';

    const cachedData = getCachedData(cacheKey);

    // Comprueba si los datos en caché son válidos
    if (cachedData) {
        return cachedData;
    }

    // Si no hay datos en caché o están desactualizados, realiza una llamada a la API
    try {
        let url = apiEndPoint + `/v2/parada/${stopNumber}`;
        if (lineNumber) {
            url += `/${lineNumber}`;
        }
        if (date) {
            url += `/${date}`;
        }
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
                if (linea.horarios) {
                    linea.horarios.forEach(horario => {
                        if (horario.destino) {
                            if (!destinations[linea.linea]) {
                                destinations[linea.linea] = new Set();
                            }
                            destinations[linea.linea].add(horario.destino);
                        }
                    });
                }
            });
        }

        // Convertir los conjuntos de destinos en arrays y contar los destinos únicos
        for (let line in destinations) {
            destinations[line] = Array.from(destinations[line]);
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

// Genera el HTML en base a una consulta a los horarios programados de una parada
export async function displayScheduledBuses(stopNumber, date) {
    let horariosElement = document.createElement('div');
    horariosElement.className = 'horarios';
    horariosElement.id = 'horarios-' + stopNumber;

    let horariosBuses;
    let groupedHorarios = {};
    // Si se proporciona una fecha, obtener todas las líneas de la parada y consultar los horarios para cada una
    if (date) {
        const busStops = await loadBusStops();
        const stopData = busStops.find(stop => stop.parada.numero === stopNumber);
        const allLines = [
            ...(stopData.lineas.ordinarias || []), 
            ...(stopData.lineas.poligonos || []), 
            ...(stopData.lineas.matinales || []), 
            ...(stopData.lineas.futbol || []), 
            ...(stopData.lineas.buho || []), 
            ...(stopData.lineas.universidad || [])
        ];

        for (const lineNumber of allLines) {
            // Limpiamos el formato de date input HTML a YYYYMMDD
            const [year, month, day] = date.split('-');
            const cleanDate = `${year}${month}${day}`;

            const busHorarios = await fetchScheduledBuses(stopNumber, lineNumber, cleanDate);
            if (busHorarios && busHorarios.lineas) {
                busHorarios.lineas.forEach(bus => {
                    bus.horarios.forEach(horario => {
                        const key = `${bus.linea}-${horario.destino}`;
                        if (!groupedHorarios[key]) {
                            groupedHorarios[key] = {
                                linea: bus.linea,
                                destino: horario.destino,
                                horarios: []
                            };
                        }
                        groupedHorarios[key].horarios.push(horario);
                    });
                    
                    // Si no hay horarios para esta línea, al menos se crea una entrada con un array vacío
                    if (bus.horarios.length === 0 && !groupedHorarios[`${bus.linea}-${bus.destino}`]) {
                        groupedHorarios[`${bus.linea}-${bus.destino}`] = {
                            linea: bus.linea,
                            destino: bus.destino,
                            horarios: []
                        };
                    }
                });
            }
        }
        horariosBuses = { parada: [ { parada: stopData.parada.nombre } ] }; // Asumiendo que queremos mostrar el nombre de la parada
    } else {
        // Si no se proporciona una fecha, simplemente obtener los horarios de la parada sin especificar una línea
        horariosBuses = await fetchScheduledBuses(stopNumber);
        if (horariosBuses && horariosBuses.lineas) {
            horariosBuses.lineas.forEach(bus => {
                bus.horarios.forEach(horario => {
                    const key = `${bus.linea}-${horario.destino}`;
                    if (!groupedHorarios[key]) {
                        groupedHorarios[key] = {
                            linea: bus.linea,
                            destino: horario.destino,
                            horarios: []
                        };
                    }
                    groupedHorarios[key].horarios.push(horario);
                });
            });
        }
    }

    // La fecha es por defecto hoy a menos que le hayamos pasado alguna
    date = date || new Date().toISOString().split('T')[0];

    // Crear el campo de entrada de fecha y el botón para cambiar la fecha
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.id = 'stopDateInput';
    dateInput.setAttribute('value', date);
    dateInput.dispatchEvent(new Event('change'));
    
    if (horariosBuses && horariosBuses.parada && horariosBuses.parada[0]) {
        horariosElement.innerHTML += '<button class="horarios-close">X</button><h2>' + horariosBuses.parada[0].parada + '</h2><p>Horarios programados de <strong>llegada a esta parada.</strong></p>';
        horariosElement.appendChild(dateInput);
        horariosElement.innerHTML += '<p id="stopDateExplanation">Modifique para ver otros días</p>';
    } else {
        horariosElement.innerHTML += '<button class="horarios-close">X</button><h2>Parada ' + stopNumber + '</h2><p>Horarios programados de <strong>llegada a esta parada.</strong></p>';
        horariosElement.appendChild(dateInput);
        horariosElement.innerHTML += '<p id="stopDateExplanation">Modifique para ver otros días</p>';
    }

    // Ordenar líneas, primer numéricas
    let orderedHorarios = Object.values(groupedHorarios).sort((a, b) => {
        // Convertir los números de línea a enteros para la comparación
        const aNumber = parseInt(a.linea, 10);
        const bNumber = parseInt(b.linea, 10);

        // Si ambos son números, compararlos numéricamente
        if (!isNaN(aNumber) && !isNaN(bNumber)) {
            return aNumber - bNumber;
        }
        // Si solo uno es un número, el número va primero
        if (!isNaN(aNumber)) {
            return -1;
        }
        if (!isNaN(bNumber)) {
            return 1;
        }
        // Si ambos son letras, compararlos alfabéticamente
        return a.linea.localeCompare(b.linea);
    })

    // Mostramos las líneas disponibles en la cabecera a modo de índice
    Object.values(orderedHorarios).forEach (linea => {
        horariosElement.innerHTML += `<a href="#linea-${linea.linea}"><span class="indice-linea linea-${linea.linea}">${linea.linea}</span></a>`;
    });
    
    // Mostrar los horarios agrupados
    orderedHorarios.forEach(group => {
        horariosElement.innerHTML += '<div id="linea-' + group.linea + '" class="linea-' + group.linea + '"><h3 class="addLineButton" data-stop-number="' + stopNumber + '" data-line-number="' + group.linea + '">' + group.linea + '</h3><p class="destino">' + group.destino + '</p>';
        if (group.horarios.length === 0) {
            horariosElement.innerHTML += '<p class="hora">No hay horarios programados para esta fecha</p>';
        } else {
            group.horarios.forEach(horario => {
                // Eliminamos los segundos de la hora de llegada
                let timeParts = horario.llegada.split(':'); 
                // Si las horas son 24:00 o más, fix visual
                if (timeParts[0] > 23) {
                    timeParts[0] = timeParts[0] - 24;
                }
                let timeHHMM = `${timeParts[0]}:${timeParts[1]}`;
                horariosElement.innerHTML += '<span class="hora">' + timeHHMM + '</span> ';
            });
        }
        horariosElement.innerHTML += '</div>';
    });
    
    // Agregar líneas sin horarios
    if (horariosBuses && horariosBuses.lineas) {
        horariosBuses.lineas.forEach(bus => {
            if (!groupedHorarios[`${bus.linea}-${bus.destino}`]) {
                horariosElement.innerHTML += '<div class="linea-' + bus.linea + '"><h3 class="addLineButton" data-stop-number="' + stopNumber + '" data-line-number="' + bus.linea + '">' + bus.linea + '</h3><p class="destino">' + bus.destino + '</p><p class="hora">No hay horarios programados para esta fecha</p></div>';
            }
        });
    }
    
    horariosElement.innerHTML += '<p class="notice">Nota: Las actualizaciones de tiempos están pausadas hasta que cierre esta ventana</p>';

    return horariosElement;
}

export async function addBusLine(stopNumber, lineNumber, confirm = false) {

    let busLines = localStorage.getItem('busLines') ? JSON.parse(localStorage.getItem('busLines')) : [];

    // Buscar la parada en busStops usando stopNumber
    const busStops = await loadBusStops();
    const stopData = busStops.find(stop => stop.parada.numero === stopNumber);

    // Si se ha proporcionado solo la línea
    if (!stopNumber && lineNumber) {
        showErrorPopUp('Debe especificar una parada para esta línea');
        return;
    }

    // Si no hay parada o datos de la parada
    if (!stopData) {
        showErrorPopUp('Error: Parada no encontrada o vacía');
        return;
    }

    // Si se ha proporcionado tanto la parada como la línea
    if (stopNumber && lineNumber) {
        
        // Si se ha llamado a la función con confirm, preguntamos antes de añadir
        if (confirm) {
            if (!window.confirm(`¿Desea añadir la línea ${lineNumber} de la parada ${stopNumber} a su lista?`)) {
                // Si el usuario cancela, no seguimos
                return;
            }
        }

        const existsInApi = await stopAndLineExist(stopNumber, lineNumber);

        // Si no existe la combinación linea + parada mostrar error
        if (!existsInApi) {
            showErrorPopUp('Error: Actualmente no hay información para esa línea en esa parada');
            return;
        }
    
        if (stopNumber && lineNumber) {
            const exists = busLines.some(function(line) {
                return line.stopNumber === stopNumber && line.lineNumber === lineNumber;
            });
            // Si no la tenemos ya guardada, la guardamos y creamos
            if (!exists) {
                busLines.push({ stopNumber: stopNumber, lineNumber: lineNumber });
                saveBusLines(busLines);
                updateBusList();

                const elementId = `${stopNumber}-${lineNumber}`;
                showSuccessPopUp('Línea añadida al final de tu lista', elementId);
            } else {
                // Si ya la teniamos añadida avisamos.
                const elementId = `${stopNumber}-${lineNumber}`;
                showSuccessPopUp('Ya tienes esa línea añadida', elementId);
            }

            // Limpiar el contenido del input lineNumber
            document.getElementById('lineNumber').value = '';

            // Limpiamos sugerencias de lineas
            document.getElementById('lineSuggestions').innerHTML = '';
        }
    }
    // Si solo se ha proporcionado la parada, añadir todas las líneas de esa parada tras confirmación
    else if (stopNumber && !lineNumber) {
        if (window.confirm(`Esto añadirá la parada ${stopNumber} con TODAS sus líneas. Para añadir una sola línea cancele y rellénela en el formulario`)) {
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

            showSuccessPopUp('Todas las líneas de la parada añadidas');

            // Limpiar el contenido del input stopNumber
            document.getElementById('stopNumber').value = '';

            // Limpiamos sugerencias de lineas
            document.getElementById('lineSuggestions').innerHTML = '';

            // Hacer scroll suave a la parada cuando el elemento se haya creado
            const stopElement = document.getElementById(stopNumber);
            if (stopElement) {
                scrollToElement(stopElement);
            } else {
                // Si el elemento no existe, crear un MutationObserver para observar cambios en el contenedor de paradas
                const observer = new MutationObserver((mutationsList, observer) => {
                    // Buscar el elemento en cada mutación
                    const stopElement = document.getElementById(stopNumber);
                    if (stopElement) {
                        // Si el elemento existe, hacer scroll y desconectar el observador
                        scrollToElement(stopElement);
                        observer.disconnect(); // Detener la observación una vez que se haya encontrado el elemento
                    }
                });

                // Seleccionar el contenedor que contiene las paradas
                const paradasContainer = document.getElementById('busList');
                if (paradasContainer) {
                    // Configurar el observador para observar cambios en los hijos del contenedor
                    observer.observe(paradasContainer, { childList: true });
                }
            } 
        } else {
            // El usuario no aceptó, por lo que no hacemos nada
            console.log("El usuario no desea añadir todas las líneas de la parada.");
        }
    }
}

export function saveBusLines(busLines) {
    localStorage.setItem('busLines', JSON.stringify(busLines));
}

// Función principal que crea y actualiza la lista de paradas y líneas
export async function updateBusList() {
    // Recuperamos las paradas y líneas guardadas previamente en Localstorage
    let busLines = localStorage.getItem('busLines') ? JSON.parse(localStorage.getItem('busLines')) : [];
    const stops = groupByStops(busLines);

    // No mostramos el botón de borrar todas si no hay lineas añadidas
    let removeAllButton = document.getElementById('removeAllButton');
    removeAllButton.style.display = busLines.length > 0 ? 'flex' : 'none';

    // Verificar si hay alertas globales y mostrar el banner si es necesario
    const globalAlerts = filterBusAlerts(allAlerts, null);
    displayGlobalAlertsBanner(globalAlerts);

    // Obtener la lista de paradas suprimidas
    const suppressedStops = await fetchSuppressedStops();

    let horariosBox = document.getElementById('horarios-box');
    let busList = document.getElementById('busList');
    
    // Elementos para listar las paradas en el sidebar
    const sidebarStops = document.getElementById('sidebar-stops');
    // Limpiamos contenido por defecto por si hemos borrado las paradas
    sidebarStops.innerHTML = '';
    let stopsListHTML = '';

    // Obtén la lista de paradas "Fijas" del almacenamiento local
    let fixedStops = localStorage.getItem('fixedStops') ? JSON.parse(localStorage.getItem('fixedStops')) : [];

    // Ordena las paradas en función de si son "Fijas" o no
    let sortedStops = Object.keys(stops).sort((a, b) => {
        const aIsFixed = fixedStops.includes(a);
        const bIsFixed = fixedStops.includes(b);
    
        if (aIsFixed && !bIsFixed) {
            return -1; // a debe ir primero
        } else if (!aIsFixed && bIsFixed) {
            return 1; // b debe ir primero
        } else {
            // Si ambos son "Fijas" o no "Fijas", ordenar alfabéticamente
            return a.localeCompare(b);
        }
    });
    
    // Crea un nuevo array con los objetos ordenados
    let sortedStopsArray = [];
    sortedStops.forEach(key => {
        sortedStopsArray.push({ stopId: key, lines: stops[key] });
    });

    // Creamos las paradas una a una
    (async () => {
        for (let stop of sortedStopsArray) {
        let stopId = stop.stopId;

        let stopElement = document.getElementById(stopId);
        // Solo creamos las paradas que no estaban creadas previamente
        // A menos que no hayan pasado recreateStops
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

        // Comprobar si la parada está suprimida
        const stopSuppressed = suppressedStops.some(stop => stop.numero === stopId);
        if (stopSuppressed) {
            // Solo añadimos información si no la tenía antes
            if (!stopElement.classList.contains('suprimida')) {
                stopElement.classList.add('suprimida');
                let suppressedStopAlert = document.createElement('div');
                suppressedStopAlert.className = 'suppressedStopAlert';
                suppressedStopAlert.innerHTML = "Parada actualmente suprimida, consulte las alertas de las líneas para más información";
                
                // Seleccionar el elemento h2 dentro de stopElement
                const h2Element = stopElement.querySelector('h2');
                if (h2Element) {
                    // Insertar suppressedStopAlert justo después del h2Element
                    h2Element.insertAdjacentElement('afterend', suppressedStopAlert);
                } else {
                    // Si no hay un elemento h2, añadirlo al final de stopElement como antes
                    stopElement.appendChild(suppressedStopAlert);
                }
            }
        }

        // Actualizamos el listado en el sidebar
        stopsListHTML += `<li><a class="sidebar-stop-link" data-stopid="${stopId}" href="#${stopId}">${stopName}</a></li>`;
        sidebarStops.innerHTML = '<h2>Tus paradas</h2><ul>' + stopsListHTML + '</ul><p class="sidebar-footer">fijará una parada arriba en la lista</p>';
        // Agregar event listener a los enlaces del sidebar
        const stopLinks = sidebarStops.querySelectorAll('.sidebar-stop-link');
        stopLinks.forEach(link => {
            link.addEventListener('click', function(event) {
                event.preventDefault(); // Prevenir el comportamiento predeterminado del enlace
                toogleSidebar(); // Cerrar el sidebar
                const linkStopId = link.getAttribute('data-stopid');
                const stopElement = document.getElementById(linkStopId);
                if (stopElement) {
                    scrollToElement(stopElement);
                }
            });
        });

        // Creamos todas las líneas añadidas en esa parada, mostrando primero las numéricas y luego las que tienen una letra
        stops[stopId].sort((a, b) => {
            const aNumber = parseInt(a.lineNumber, 10);
            const bNumber = parseInt(b.lineNumber, 10);
            const aIsNumber = !isNaN(aNumber);
            const bIsNumber = !isNaN(bNumber);

            if (aIsNumber && bIsNumber) {
                // Si ambos son números, compararlos numéricamente
                return aNumber - bNumber;
            } else if (aIsNumber && !bIsNumber) {
                // Si a es un número y b no, a va primero
                return -1;
            } else if (!aIsNumber && bIsNumber) {
                // Si a no es un número y b sí, b va primero
                return 1;
            } else {
                // Si ambos no son números, compararlos alfabéticamente
                return a.lineNumber.localeCompare(b.lineNumber);
            }
        }).forEach((line, index) => {
            const busId = stopId + '-' + line.lineNumber;
            let busElement = document.getElementById(busId);
            // Solo creamos las líneas que no estaban creadas previamente
            if (!busElement) {
                busElement = createBusElement(busId, line, index, stopElement);
            }
            // Llamar a fetchBusTime independientemente de si el busElement es nuevo o ya existía
            fetchBusTime(line.stopNumber, line.lineNumber, busElement);
        });


        createRemoveStopButton(stopId, stopElement);

        // Botón para motrar horarios al final
        let mostrarHorarios = stopElement.querySelector('.mostrar-horarios');
        // Para asegurarnos que queda al final al añadir una linea lo borramos y lo volvemos a colocar
        if (mostrarHorarios) {
            mostrarHorarios.remove();
        }
        mostrarHorarios = createMostrarHorarios(stopId, stopElement, horariosBox);

    }})().catch(error => {
        console.error('Error processing stops:', error);
    });

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

        // Agrupar los datos por trip_id para una mejor búsqueda
        const combinedData = combineBusData(scheduledData);
        let busesLinea = combinedData[lineNumber];

        // Si no hay datos para esa línea, no hacemos nada
        if (busesLinea) {
        // Filtrar y encontrar el bus más cercano para la línea específica
        const busMasCercano = await elegirBusMasCercano(busesLinea, stopNumber, lineNumber);
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

                // Separar la hora de llegada en horas, minutos y segundos
                let [hora, minuto, segundo] = horaLlegada.split(":").map(Number);

                // Crear una copia de la fecha actual para evitar modificar la original
                let fechaActual = new Date();

                // Ajuste para manejar buses que llegan en la madrugada del día siguiente
                if (hora >= 24) {
                    // Si la hora es mayor o igual a 24, sumamos un día a la fecha actual
                    fechaActual.setDate(fechaActual.getDate() + 1);
                    hora -= 24; // Ajustamos la hora para que esté en el rango de 0 a 23
                }

                // Crear un objeto Date con la hora y minuto ajustados
                horaLlegada = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate(), hora, minuto, segundo);

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
                // Asumiendo que busMasCercano.scheduled.llegada ya está definido y tiene un valor válido
                horaLlegada = busMasCercano.scheduled.llegada;

                // Separar la hora de llegada en horas, minutos y segundos
                let [hora, minuto, segundo] = horaLlegada.split(":").map(Number);

                // Crear una copia de la fecha actual para evitar modificar la original
                let fechaActual = new Date();

                // Ajuste para manejar buses que llegan en la madrugada del día siguiente
                if (hora >= 24) {
                    // Si la hora es mayor o igual a 24, sumamos un día a la fecha actual
                    fechaActual.setDate(fechaActual.getDate() + 1);
                    hora -= 24; // Ajustamos la hora para que esté en el rango de 0 a 23
                }

                // Crear un objeto Date con la hora y minuto ajustados
                horaLlegada = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate(), hora, minuto, segundo);
 
                  // Si el horaLlegada es menor de 60 segundos, mostramos 0 minutos
                if (Math.round((horaLlegada - new Date()) / 60000) < 1) {
                    tiempoRestante = 0;
                } else {
                    tiempoRestante = Math.floor((horaLlegada - new Date()) / 60000);
                }

                // Si busMasCercano tiene futureDate, significa que el bus es de un día próximo
                if (busMasCercano.futureDate) {
                    // Usar busMasCercano.scheduled.llegada como la hora y busMasCercano.futureDate como la fecha
                    let scheduledArrivalTime = busMasCercano.scheduled.llegada;
                    let scheduledArrivalDate = busMasCercano.futureDate;
                
                    // Crear un objeto Date con la fecha y hora programadas
                    // Asegurarse de que scheduledArrivalDate esté en el formato correcto (AAAA-MM-DD)
                    let formattedDate = scheduledArrivalDate.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
                    // Si la hora es 24:00 o superior, le sumamos un día a la fecha y restamos 24 a la hora
                    if (busMasCercano.scheduled.llegada.split(":")[0] > 23) {
                        let newDay = parseInt(formattedDate.split("-")[2]) + 1
                        formattedDate = `${formattedDate.split("-")[0]}-${formattedDate.split("-")[1]}-${newDay}`;
                        let newHour = parseInt(scheduledArrivalTime.split(":")[0]) -24;  
                        // Añadimos un 0 al inicio para que 24 sea 00
                        scheduledArrivalTime = `0${newHour}:${scheduledArrivalTime.split(":")[1]}`;
                    }

                    let scheduledArrival = new Date(`${formattedDate}T${scheduledArrivalTime}`);

                    // Obtener el nombre del día de la semana
                    const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                    var dayOfWeek = daysOfWeek[scheduledArrival.getDay()];
                
                    // Calcular el tiempo restante en minutos
                    let now = new Date();
                    let timeRemaining = Math.round((scheduledArrival - now) / 60000);
                
                    // Si el tiempo restante es mayor de 24 horas, lo mostramos en días y horas
                    if (timeRemaining > 1440) { // 1440 minutos equivalen a 24 horas
                        let days = Math.floor(timeRemaining / 1440);
                        let hours = Math.floor((timeRemaining % 1440) / 60);
                        let minutes = Math.floor((timeRemaining % 1440) / 120);
                        tiempoRestante = `${days}d <p> ${hours}h`;
                    } else if (timeRemaining > 59) {
                        let hours = Math.floor(timeRemaining / 60);
                        let minutes = timeRemaining % 60;
                        tiempoRestante = `${hours}h <p>${minutes} min`;
                    } else {
                        tiempoRestante = `${timeRemaining} <p>min`;
                    }
                }

                lineItem.classList.remove('realtime');
                lineItem.classList.add('programado');
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

            // Recuperamos el destino desde los datos del trip_id, buses con la misma línea pueden tener destinos diferentes.
            let destino = "";
            if (busMasCercano.scheduled.destino) {
                destino = busMasCercano.scheduled.destino;
            }
            // Cortamos destino a máximo 22 caracteres
            if (destino.length > 25) {
                destino = destino.substring(0, 22) + "...";
            }

            let horaLlegadaProgramada;
            if (busMasCercano.scheduled) {
                horaLlegadaProgramada = busMasCercano.scheduled.llegada.split(':');
                // Fix a las horas 24:00 a 27:00
                if (horaLlegadaProgramada[0] > 23) {horaLlegadaProgramada[0] = horaLlegadaProgramada[0] - 24}
                horaLlegadaProgramada = horaLlegadaProgramada[0] + ':' + horaLlegadaProgramada[1];
                } else {
                    horaLlegadaProgramada = busMasCercano.realTime.llegada.split(':');
                    // Fix a las horas 24:00 a 27:00
                if (horaLlegadaProgramada[0] > 23) {horaLlegadaProgramada[0] = horaLlegadaProgramada[0] - 24}
                    horaLlegadaProgramada = horaLlegadaProgramada[0] + ':' + horaLlegadaProgramada[1];
            }

            // Formato tiempo restante a mostrar
            let tiempoRestanteHTML;
            // Si el bus próximo es para un día diferente mostramos el día de la semana
            if (busMasCercano.futureDate) {
                tiempoRestanteHTML = tiempoRestante;
                horaLlegada = dayOfWeek;
            } else if (tiempoRestante > 59 ) {
                // Si el tiempo restante es mayor de 59 minutos, lo mostramos en horas y minutos
                let horas = Math.floor(tiempoRestante / 60);
                let minutos = tiempoRestante % 60;
                tiempoRestanteHTML = `${horas}h <p>${minutos} min`;
                horaLlegada = horaLlegada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            } else {
                tiempoRestanteHTML = tiempoRestante + ' <p>min';
                // Pasamos la fecha y hora completa de llegada a hora HH:MM
                horaLlegada = horaLlegada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            }

            // TODO: Solo actualizar los datos que hayan cambiado desde la anterior actualización cambiado el texto de dentro de los elementos placeholder creados por createBusElement()
            // Actualizar el HTML con los datos del bus más cercano
            lineItem.innerHTML = '<div class="linea" data-trip-id="' + tripId + '"><h3>' + lineNumber + '<a class="alert-icon">' + alertIcon + '</a></h3><p class="destino">' + destino + '</p><p class="hora-programada">' + '<span class="hora">' + horaLlegadaProgramada + '</span> <span class="diferencia">' + diferencia + '</span></p></div><div class="hora-tiempo"><div class="tiempo">' + tiempoRestanteHTML + '</div>' + mapElement + '<div class="horaLlegada">' + horaLlegada + '</div></div>' + alertHTML;

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
                let destino = "";
                if (scheduledData.lineas && scheduledData.lineas[0] && scheduledData.lineas[0].destino) {
                    destino = scheduledData.lineas[0].destino;
                }
                lineItem.innerHTML = '<div class="linea"><h3>' + lineNumber + '<a class="alert-icon">' + alertIcon + '</a> </h3><p class="destino">' + destino + '</p></div> <div class="tiempo sin-servicio">Sin servicio próximo</div>';
            }
        } else {
                let destino = "";
                if (scheduledData.lineas && scheduledData.lineas[0] && scheduledData.lineas[0].destino) {
                    destino = scheduledData.lineas[0].destino;
                }
                lineItem.innerHTML = '<div class="linea"><h3>' + lineNumber  + '<a class="alert-icon">' + alertIcon + '</a></h3><p class="destino">' + destino + '</p></div> <div class="tiempo sin-servicio">Sin servicio próximo</div>';
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

                    scrollToElement(this.parentElement.parentElement);
                });
            }
            
            // Creamos el panel informativo desplegable
            const infoPanel = createInfoPanel(busesProximos, stopNumber, lineNumber);
            lineItem.appendChild(infoPanel);

        } catch (error) {
            console.error('Error en fetchBusTime:', error);
            lineItem.innerHTML = '<div class="linea"><h3>' + lineNumber + '</h3></div> <div class="tiempo sin-servicio">Sin datos en este momento</div>';
            const infoPanel = createInfoPanel(busesProximos, stopNumber, lineNumber);
            lineItem.appendChild(infoPanel);
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
                tripId: schedule.trip_id ? schedule.trip_id.toString() : undefined,
                destino: schedule.destino
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

// Lógica principal para determinar de un conjunto de buses ordenados por tripID, cual es el bus siguiente o más cercano
export async function elegirBusMasCercano(buses, stopNumber, lineNumber) {

    if (!buses) return null;

    let tripIdMasCercanoHoy = null;
    let busMasCercanoHoy = null;
    let diferenciaMinima = Infinity;
    let busesAdelantados = new Set();

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
                let [hora, minuto, segundo] = bus.realTime.llegada.split(":").map(Number);
                // Crear una copia de la fecha actual para evitar modificar la original
                let fechaActual = new Date(hoy.getTime());
                // Ajuste para manejar buses que llegan en la madrugada del día siguiente
                if (hora >= 24) {
                    // Si la hora es mayor o igual a 24, sumamos un día a la fecha actual
                    fechaActual.setDate(fechaActual.getDate() + 1);
                    hora -= 24; // Ajustamos la hora para que esté en el rango de 0 a 23
                }
                horaLlegada = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate(), hora, minuto, segundo);
            } else if (bus.scheduled && bus.scheduled.llegada) {
                let [hora, minuto, segundo] = bus.scheduled.llegada.split(":").map(Number);
                // Crear una copia de la fecha actual para evitar modificar la original
                let fechaActual = new Date(hoy.getTime());
                // Ajuste para manejar buses que llegan en la madrugada del día siguiente
                if (hora >= 24) {
                    // Si la hora es mayor o igual a 24, sumamos un día a la fecha actual
                    fechaActual.setDate(fechaActual.getDate() + 1);
                    hora -= 24; // Ajustamos la hora para que esté en el rango de 0 a 23
                }
                horaLlegada = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate(), hora, minuto, segundo);
            }

            if (horaLlegada) {
                let diferencia = horaLlegada - hoy;
                // Ajuste para manejar buses que llegan en la madrugada del día siguiente
                if (diferencia > 0 && diferencia < diferenciaMinima) {
                    diferenciaMinima = diferencia;
                    tripIdMasCercanoHoy = tripId;
                    busMasCercanoHoy = bus;
                }
            }
        }
    });

    // Si no se encontró un bus para hoy, buscar en los días siguientes
    // Excepto si estamos entre las 12 de la noche y las 5 de la mañana, que buscaremos en los datos del día anterior
    // Los buses nocturnos aparecen en los datos del día anterior con horas 24, 25, 26, 27...
    if (diferenciaMinima === Infinity) {
        
        const yesterdayDate = getYesterdayDate();
        // Obtener la hora actual
        const now = new Date();
        const currentHour = now.getHours();

        // Verificar si la hora actual está entre las 0:00 y las 5:00
        if (currentHour >= 0 && currentHour < 5) {
            // Consultar los buses nocturnos programados del día anterior, se consideran nocturnos si llegan antes de las 5:00
            const scheduledBusesYesterday = await fetchScheduledBuses(stopNumber, lineNumber, yesterdayDate);
            if (scheduledBusesYesterday && scheduledBusesYesterday.lineas) {
                // Filtrar los buses que tienen una hora de llegada de 24:00 o superior
                const busesArray = scheduledBusesYesterday.lineas.flatMap(linea => {
                    return linea.horarios.filter(horario => {
                        const [hours, minutes, seconds] = horario.llegada.split(':').map(Number);
                        return hours > 23;
                    }).map(horario => {
                        return {
                            ...linea,
                            horarios: [horario]
                        };
                    });
                }).sort((a, b) => {
                    const arrivalA = a.horarios[0].llegada ? new Date(`1970-01-02T${a.horarios[0].llegada}`) : Infinity;
                    const arrivalB = b.horarios[0].llegada ? new Date(`1970-01-02T${b.horarios[0].llegada}`) : Infinity;
                    return arrivalA - arrivalB;
                });

                // Devolver el primer bus de la lista ordenada
                const primerBusAnterior = busesArray[0];
                if (primerBusAnterior && primerBusAnterior.horarios && primerBusAnterior.horarios[0]) {
                    let busdata = { 
                        trip_id: primerBusAnterior.horarios[0].trip_id, 
                        destination: primerBusAnterior.horarios[0].destino,
                        scheduled: primerBusAnterior.horarios[0], 
                        pastDate: yesterdayDate,
                        realTime: primerBusAnterior.realTime
                    }
                    return busdata;
                }
            }
        }

        // Si no hay buses nocturnos disponibles en el día anterior, buscar en los próximos días
        const maxDaysToLookAhead = 10; // Límite de días a buscar
        for (let i = 1; i <= maxDaysToLookAhead; i++) {
            const futureDate = getFutureDate(i);

            // Realizar una llamada a la API para obtener los buses programados de i días en el futuro
            const scheduledBusesFuture = await fetchScheduledBuses(stopNumber, lineNumber, futureDate);
            if (scheduledBusesFuture && scheduledBusesFuture.lineas) {
                // Ordenar los buses por hora de llegada
                const busesArray = Object.values(scheduledBusesFuture.lineas).sort((a, b) => {
                    const arrivalA = a.scheduled && a.horarios.llegada ? new Date(`1970-01-02T${a.horarios.llegada}`) : Infinity;
                    const arrivalB = b.scheduled && b.horarios.llegada ? new Date(`1970-01-02T${b.horarios.llegada}`) : Infinity;
                    return arrivalA - arrivalB;
                });

                // Devolver el primer bus de la lista ordenada
                const primerBusSiguienteDia = busesArray[0];
                if (primerBusSiguienteDia && primerBusSiguienteDia.horarios && primerBusSiguienteDia.horarios[0] && primerBusSiguienteDia.horarios[0].trip_id) {
                    let busdata = { 
                        trip_id: primerBusSiguienteDia.horarios[0].trip_id, 
                        destination: primerBusSiguienteDia.horarios[0].destino,
                        scheduled: primerBusSiguienteDia.horarios[0], 
                        futureDate: futureDate,
                        realTime: null
                    }
                    return busdata;
                }
            }
        }

        // Si no hay buses disponibles en los próximos días, devolver null
        return null;
    }

    // Si hay buses disponibles para hoy, devolver el más cercano
    if (tripIdMasCercanoHoy && busMasCercanoHoy && busMasCercanoHoy.scheduled) {
        return { 
            trip_id: tripIdMasCercanoHoy, 
            destination: busMasCercanoHoy.scheduled.destino,
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
    let fixedStops = localStorage.getItem('fixedStops') ? JSON.parse(localStorage.getItem('fixedStops')) : [];

    if (confirm(avisoBorrado)) {
        busLines = busLines.filter(function(line) {
            return !(line.stopNumber === stopNumber && line.lineNumber === lineNumber);
        });

        // Comprobar si quedan líneas para esa parada
        const remainingLinesForStop = busLines.filter(line => line.stopNumber === stopNumber);
        if (remainingLinesForStop.length === 0) {
            // Si no quedan líneas para esa parada, la borramos de paradas fijas
            fixedStops = fixedStops.filter(stop => stop !== stopNumber);
            localStorage.setItem('fixedStops', JSON.stringify(fixedStops));
        }

        // Si no quedan paradas, mostramos el mensaje de bienvenida de nuevo
        if (busLines.length === 0) {
            // Volvemos a mostrar el welcome-box
            let welcomeBox = document.getElementById('welcome-box');
            welcomeBox.style.display = 'block';

            // Ocultamos el boton removeallbutton
            let removeAllButton = document.getElementById('removeAllButton');
            removeAllButton.style.display = 'none';
            let horariosBox = document.getElementById('horarios-box');
            horariosBox.innerHTML = '';
        }

        saveBusLines(busLines);
        updateBusList();
        updateNotifications(null, stopNumber, lineNumber);
    } else {
        // El usuario eligió no eliminar las líneas de autobús
        console.log("Eliminación cancelada.");
    }
}

export function removeStop(stopId) {
    let avisoBorrado = '¿Seguro que quieres quitar la parada ' + stopId + ' y todas sus líneas?';

    let busLines = localStorage.getItem('busLines') ? JSON.parse(localStorage.getItem('busLines')) : [];
    let fixedStops = localStorage.getItem('fixedStops') ? JSON.parse(localStorage.getItem('fixedStops')) : [];

    if (confirm(avisoBorrado)) {
        busLines = busLines.filter(function(line) {
            return line.stopNumber !== stopId;
        });

        // Eliminar la parada de paradas fijadas si está allí
        fixedStops = fixedStops.filter(stop => stop !== stopId);
        localStorage.setItem('fixedStops', JSON.stringify(fixedStops));

        // Si no quedan paradas, mostramos el mensaje de bienvenida de nuevo
        if (busLines.length === 0) {
            // Volvemos a mostrar el welcome-box
            let welcomeBox = document.getElementById('welcome-box');
            welcomeBox.style.display = 'block';

            // Ocultamos el boton removeallbutton
            let removeAllButton = document.getElementById('removeAllButton');
            removeAllButton.style.display = 'none';
            let horariosBox = document.getElementById('horarios-box');
            horariosBox.innerHTML = '';
        }

        saveBusLines(busLines);
        updateBusList();
        updateNotifications(null, stopNumber, null);
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
        // Borramos todas las paradas fijadas
        let fixedStops = [];
        localStorage.setItem('fixedStops', JSON.stringify(fixedStops));

        // Volvemos a mostrar el welcome-box
        let welcomeBox = document.getElementById('welcome-box');
        welcomeBox.style.display = 'block';

        // Ocultamos el boton removeallbutton
        let removeAllButton = document.getElementById('removeAllButton');
        removeAllButton.style.display = 'none';
        let horariosBox = document.getElementById('horarios-box');
        horariosBox.innerHTML = '';
        
        // Hacemos scroll arriba
        const headerTitle = document.getElementById('title');
        if (headerTitle) {
            const headerHeight = document.querySelector('header').offsetHeight;
            window.scrollTo({ top: -headerHeight, behavior: 'smooth' });
        }

        showSuccessPopUp('Borradas todas las paradas');
    } else {
        // El usuario eligió no eliminar las líneas de autobús
        console.log("Eliminación cancelada.");
    }
}

// Función para guardar un JSON con todas las paradas
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
    resultsDiv.innerHTML = '<button id="close-nearest-stops">X</button>';

    // Añadir otros elementos estáticos al resultsDiv
    resultsDiv.innerHTML += '<h3>Paradas cercanas</h3><p>Estas son las paradas más cercanas a tu ubicación.</p><p><strong>Pulsa sobre la linea para añadirla</strong> o sobre el botón <strong>+</strong> para añadir todas las líneas de la parada.</p>';

    for (let stop of stops) {
        // Obtener destino para todas las líneas de la parada
        let lineasDestinos = await getBusDestinationsForStop(stop.parada.numero);

        // Procesar cada línea y su destino
        let lineasHTML = stop.lineas.ordinarias.map(linea => {
            let destino = lineasDestinos[linea] || '';
            return `<span class="addLineButton linea-${linea}" data-stop-number="${stop.parada.numero}" data-line-number="${linea}">${linea} - ${destino}</span>`;
        }).join(" ");

        // Crear y añadir el div para cada parada
        let stopDiv = document.createElement('div');
        stopDiv.classList.add('stopResult');

        stopDiv.innerHTML = '<button class="addStopButton" data-stop-number="' + stop.parada.numero + '">+</button><h4>' + stop.parada.nombre + ' (' + stop.parada.numero + ')</h4><ul><li>' +
            lineasHTML + '</li><li>Distancia: ' +
            stop.distance + 'm</li></ul><a class="mapIcon" title="Cómo llegar" href="https://www.qwant.com/maps/routes/?mode=walking&amp;destination=latlon%3A' + stop.ubicacion.y + ':' + stop.ubicacion.x + '&amp;origin=latlon%3A' + userLocation.y + '%3A' + userLocation.x + '#map=19.00/' + stop.ubicacion.x + '/' + stop.ubicacion.x + '" target="_blank">Mapa</a>';

        resultsDiv.appendChild(stopDiv);
        // Restablecer el scroll arriba
        resultsDiv.scrollTo(0, 0);
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
