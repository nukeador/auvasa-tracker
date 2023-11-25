var busLines = localStorage.getItem('busLines') ? JSON.parse(localStorage.getItem('busLines')) : [];

// Agregar función para consultar API
async function stopAndLineExist(stopNumber, lineNumber) {
    // Buscar la parada en busStops usando stopNumber
    const stopData = busStops.find(stop => stop.parada.numero === stopNumber);

    if (!stopData) {
        return false; // Si la parada no existe, retorna false
    }

    // Revisar si la línea proporcionada existe en alguna de las categorías de líneas para esa parada
    const lineExists = 
        stopData.lineas.ordinarias.includes(lineNumber) || 
        stopData.lineas.poligonos.includes(lineNumber) ||
        stopData.lineas.matinales.includes(lineNumber) ||
        stopData.lineas.futbol.includes(lineNumber) ||
        stopData.lineas.buho.includes(lineNumber) ||
        stopData.lineas.universidad.includes(lineNumber);

    return lineExists;
}

async function addBusLine() {
    const stopNumber = document.getElementById('stopNumber').value;
    const lineNumber = document.getElementById('lineNumber').value;

    console.log(stopNumber, lineNumber);

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
            }
        }
    }
    // Si solo se ha proporcionado la parada, añadir todas las líneas de esa parada
    else if (stopNumber && !lineNumber) {
        const allLines = [...stopData.lineas.ordinarias, ...stopData.lineas.poligonos, ...stopData.lineas.matinales, ...stopData.lineas.futbol, ...stopData.lineas.buho, ...stopData.lineas.universidad];

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
            
            stopElement.innerHTML = '<h2>🚏 '+ stopId + '</h2>';

            document.getElementById('busList').appendChild(stopElement);
        }

        const stopName = await getStopName(stopId);
        const stopGeo = await getStopGeo(stopId);

        if (stopName) {
            let updatedName = stopName + ' (' + stopId + ')';
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
                
                // Añadir el botón de eliminar
                const removeButton = document.createElement('button');
                removeButton.innerHTML = '&#128465;';
                removeButton.className = 'remove-button';
                removeButton.addEventListener('click', function() {
                    removeBusLine(line.stopNumber, line.lineNumber);
                });
                busElement.appendChild(removeButton);

                // Añadir el nuevo elemento al bloque de la parada
                stopElement.appendChild(busElement);
            }

            // Actualizar el tiempo del autobús
            fetchBusTime(line.stopNumber, line.lineNumber, busElement);
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
        nameElement.innerHTML = ' <a id="mapIcon" title="Ver en el mapa" href="https://www.qwant.com/maps/routes/?mode=walking&destination=latlon%253A' + stopGeo.y + ':' + stopGeo.x +'#map=19.00/' + stopGeo.y + '/' + stopGeo.x + '" target="_blank">Mapa</a>' + newName;
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


function fetchBusTime(stopNumber, lineNumber, lineItem) {
    var apiUrl = 'https://api-auvasa.vercel.app/' + stopNumber + '/' + lineNumber;

    fetch(apiUrl)
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.buses && data.buses.length > 0) {
                var paradaInfo = data.parada;
                var busInfo = data.buses[0];
                
                let horaLlegada = "";

                // Si el tiempo no es exacto añadimos un + al inicio del tiempo
                if (!busInfo.esExacto) {
                    busInfo.tiempoRestante = '+' + busInfo.tiempoRestante;
                }
                // Si es exacto calculamos la hora aproximada de llegada
                else {
                    let horaActual = new Date(); // Representa el momento actual
                    let minutosAdicionales = busInfo.tiempoRestante; // Tiempo restante hasta la llegada del bus, en minutos

                    // Añade los minutos adicionales a la hora actual
                    horaActual.setMinutes(horaActual.getMinutes() + minutosAdicionales);

                    // Extrae las horas y minutos actualizados
                    let horasEstimadasLlegada = horaActual.getHours();
                    let minutosEstimadosLlegada = horaActual.getMinutes();

                    // Formatea los minutos para asegurar dos dígitos
                    minutosEstimadosLlegada = minutosEstimadosLlegada < 10 ? '0' + minutosEstimadosLlegada : minutosEstimadosLlegada;

                    // Construye la cadena de tiempo de llegada estimada
                    horaLlegada = '~ ' + horasEstimadasLlegada + ":" + minutosEstimadosLlegada;
                }

                lineItem.innerHTML = '<div class="linea"><h3>' + lineNumber + '</h3><p class="destino">→ ' + busInfo.destino + '</p></div> <div class="tiempo">' + busInfo.tiempoRestante + ' <p>min.</p><p class="horaLlegada">' + horaLlegada + '</p></div>';
            } else {
                lineItem.innerHTML = '<div class="linea"><h3>' + lineNumber + '</h3></div> <div class="tiempo">Sin info</div>';;
            }
            // Crea y agrega el botón de eliminación cada vez que se actualiza la información.
            var removeButton = document.createElement('button');
            removeButton.innerHTML = '&#128465;';
            removeButton.className = 'remove-button';
            removeButton.onclick = function() {
                removeBusLine(stopNumber, lineNumber);
            };
            lineItem.appendChild(removeButton);
        })
        .catch(function(error) {
            lineItem.innerHTML = '<div class="linea"><h3>' + lineNumber + '</h3></div> <div class="tiempo">Error</div>';
            // Asegúrate de agregar también aquí el botón de eliminar
            var removeButton = document.createElement('button');
            removeButton.innerHTML = '&#128465;';
            removeButton.className = 'remove-button';
            removeButton.onclick = function() {
                removeBusLine(stopNumber, lineNumber);
            };
            lineItem.appendChild(removeButton);
        });
}

function removeBusLine(stopNumber, lineNumber) {
   
    let avisoBorrado = '¿Seguro que quieres borrar la línea ' + lineNumber + ' de la parada ' + stopNumber + '?';

    if (confirm(avisoBorrado)) {
        busLines = busLines.filter(function(line) {
            return !(line.stopNumber === stopNumber && line.lineNumber === lineNumber);
        });

        saveBusLines();
        updateBusList();
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

        // Volvemos a mostrar el welcome-box
        welcomeBox = document.getElementById('welcome-box');
        welcomeBox.style.display = 'block';

        // Ocultamos el boton removeallbutton
        removeAllButton = document.getElementById('removeallbutton');
        removeAllButton.style.display = 'none';
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
        addButton.addEventListener('click', addBusLine);
    }
    updateBusList();
}

// Tiempo de actualización, por defecto 30s
setInterval(updateBusList, 30000);

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
            } else {
                console.log('Usuario rechazó la instalación');
            }
            deferredPrompt = null;
        });
    });
}
