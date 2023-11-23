var busLines = localStorage.getItem('busLines') ? JSON.parse(localStorage.getItem('busLines')) : [];

// Agregar función para consultar API
async function stopAndLineExist(stopNumber, lineNumber) {
    const response = await fetch(`https://api-auvasa.vercel.app/${stopNumber}/${lineNumber}`);
    return response.ok;
}

async function addBusLine() {
    const stopNumber = document.getElementById('stopNumber').value;
    const lineNumber = document.getElementById('lineNumber').value;

    console.log(stopNumber, lineNumber);

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
            }
        }
    }
}

function saveBusLines() {
    localStorage.setItem('busLines', JSON.stringify(busLines));
}

async function updateBusList() {
    var stops = groupByStops(busLines);

    for (var stopId in stops) {
        let stopElement = document.getElementById(stopId);

        if (!stopElement) {
            // Crear el stopElement si no existe
            stopElement = document.createElement('div');
            stopElement.id = stopId;
            stopElement.className = 'stop-block';
            
            stopElement.innerHTML = '<h2>🚏 '+ stopId + '</h2>';

            document.getElementById('busList').appendChild(stopElement);
        }

        const stopName = await getStopName(stopId);
        if (stopName) {
            let updatedName = stopName + ' (' + stopId + ')';
            updateStopName(stopElement, updatedName);
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

function updateStopName(stopElement, newName) {
    // Actualiza el nombre de la parada en el DOM
    var nameElement = stopElement.querySelector('h2');
    if (nameElement) {
        nameElement.textContent = '🚏 ' + newName;
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

// Función para obtener el nombre de la parada del API
async function getStopName(stopId) {

    // FIXME: Añadir un cache de al menos 1h para evitar consultar el nombre cada 30s

    try {
        const response = await fetch(`https://api-auvasa.vercel.app/${stopId}/`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.parada.nombre;
    } catch (error) {
        console.error('Error al obtener datos de la API:', error);
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
    busLines = busLines.filter(function(line) {
        return !(line.stopNumber === stopNumber && line.lineNumber === lineNumber);
    });
    saveBusLines();
    updateBusList();
}

function removeAllBusLines() {
    // Mostrar un cuadro de diálogo de confirmación
    if (confirm("¿Seguro que quieres borrar todas las líneas y paradas en seguimiento?")) {
        busLines = [];
        saveBusLines();
        updateBusList();
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


window.onload = function() {
    // Cargamos la lista de paradas para buscador.js
    loadBusStops();
    
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
