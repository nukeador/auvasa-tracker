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
    const button = createButton('arrow-button', '⮞', function() {
        // Encuentra el botón de eliminar correspondiente
        const removeButton = this.parentElement.querySelector('.remove-button');
    
        // Muestra u oculta el botón de eliminar
        if (window.getComputedStyle(removeButton).display === 'none') {
            removeButton.style.display = 'block';
            setTimeout(function() {
                removeButton.style.transform = 'translateX(0)';
                removeButton.style.opacity = '1';
            }, 200);
        } else {
            removeButton.style.transform = 'translateX(100%)';
            removeButton.style.opacity = '0';
            setTimeout(function() {
                removeButton.style.display = 'none';
            }, 300); // Debe coincidir con la duración de la transición
        }

        // Cambia la imagen de fondo del botón
        if (window.getComputedStyle(this).backgroundImage.endsWith('arrow-light.png")')) {
            this.style.backgroundImage = "url('img/arrow-left-light.png')";
        } else {
            this.style.backgroundImage = "url('img/arrow-light.png')";
        }
    });
    return button;
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

                // Limpiar el contenido del input lineNumber
                document.getElementById('lineNumber').value = '';
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

        // Limpiar el contenido del input stopNumber
        document.getElementById('stopNumber').value = '';
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
        }

        // Añadimos los horarios programados despues de busList cuando hagamos clic
        // en el botón .mostrar-horarios
        mostrarHorarios.addEventListener('click', function() {
            horariosBox.innerHTML = horariosElement.innerHTML;
            horariosBox.style.display = 'block';
            // Paramos las actualizaciones para que no se cierre el cuadro
            clearInterval(intervalId);

            // Agrega un controlador de eventos de clic a alerts-close
            horariosBox.querySelector('.horarios-close').addEventListener('click', function() {
                this.parentNode.style.display = 'none';
                // Reanudamos y ejecutamos las actualizaciones
                intervalId = setInterval(updateBusList, 30000);
                updateBusList();
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

async function fetchAllBusAlerts() {
    return fetch('https://api.auvasatracker.com/alertas/')
        .then(response => response.json()) // Parse la respuesta a JSON
        .catch(error => console.error('Error:', error));
}

function filterBusAlerts(alerts, busLine) {
    // Filtra las alertas para la línea de autobús específica
    return alerts.filter(alert => alert.ruta.linea === busLine);
}

async function fetchBusTimeRT(stopNumber, lineNumber) {
    var apiRTUrl = 'https://gtfs.auvasatracker.com/realtime/' + stopNumber;
    const response = await fetch(apiRTUrl);
    const data = await response.json();

    let busesLinea = [];

    if (data.buses && data.buses.length > 0) {
        busesLinea = data.buses.filter(bus => bus.linea === lineNumber);
    }

    return busesLinea;
}

async function fetchScheduledBuses(stopNumber) {
    try {
        const url = `https://gtfs.auvasatracker.com/parada/${stopNumber}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error al recuperar la información sobre los buses:', error);
        return null;
    }
}

async function displayScheduledBuses(stopNumber) {
    if (fetchScheduledBuses(stopNumber)) {
        let horariosElement = document.createElement('div');
        horariosElement.className = 'horarios';
        horariosElement.id = 'horarios-' + stopNumber;
        horariosBuses = await fetchScheduledBuses(stopNumber);
        horariosElement.innerHTML += '<h2>' + horariosBuses.parada.nombre + '</h2><p>Horarios programados para hoy</p>';
        horariosBuses.buses.forEach(bus => {
            horariosElement.innerHTML += '<div class="linea-' + bus.linea + '"><h3>' + bus.linea + '</h3><p class="destino">' + bus.destino + '</p>';
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
    var apiUrl = 'https://gtfs.auvasatracker.com/parada/' + stopNumber + '/' + lineNumber;

    try {
        // Datos en tiempo real (array de buses)
        let busesRT = await fetchBusTimeRT(stopNumber, lineNumber);

        // Datos programados
        const response = await fetch(apiUrl);
        const scheduledData = await response.json();
        let destino = "";
        if (scheduledData.buses && scheduledData.buses[0] && scheduledData.buses[0].destino) {
            destino = scheduledData.buses[0].destino;
        }
        // Cortamos destino a máximo 22 caracteres
        if (destino.length > 25) {
            destino = destino.substring(0, 22) + "...";
        }

        // Combinar datos
        const combinedData = combineBusData(busesRT, scheduledData);

        // Filtrar y encontrar el bus más cercano para la línea específica
        let busesLinea = combinedData[lineNumber];
        if (busesLinea) {

        // Recuperamos si hay alertas para esa linea
        const busLineAlerts = filterBusAlerts(allAlerts, lineNumber);
        let alertHTML = '';
        let alertIcon = '';
        if (busLineAlerts.length > 0) {
            alertHTML = `<div class="alert-box"><h2>Avisos para la línea ${lineNumber}</h2><ul>`;
            busLineAlerts.forEach(alert => {
                alertHTML += `<li>${alert.descripcion}"</li>`;
            });
            alertHTML += '</ul><p class="notice">Nota: Las actualizaciones de tiempos están pausadas hasta que cierre esta ventana</p><button class="alerts-close">Cerrar</button></div>';
            alertIcon = '⚠️';
        }

        const busMasCercano = elegirBusMasCercano(busesLinea);

        if (busMasCercano) {
            let horaLlegada;
            let tiempoRestante;
            let diferencia;

            // Si hay datos en tiempo real, usarlos, de lo contrario, usar los programados
            if (busMasCercano.realTime) {
                horaLlegada = busMasCercano.realTime.llegada;
                //tiempoRestante = busMasCercano.realTime.tiempoRestante;
                // Calculamos el tiempo en el cliente porque el api puede tener cacheado este cálculo
                tiempoRestante = Math.round((new Date(`${new Date().toISOString().split('T')[0]}T${busMasCercano.realTime.llegada}`) - new Date()) / 60000);
                // Comparamos la hora de llegada programada con la hora de llegada en tiempo real
                diferencia = Math.round((new Date(`${new Date().toISOString().split('T')[0]}T${busMasCercano.realTime.llegada}`) - new Date(`${new Date().toISOString().split('T')[0]}T${busMasCercano.scheduled.llegada}`)) / 60000);
                lineItem.classList.remove('programado');
                lineItem.classList.add('realtime');
            } else {
                horaLlegada = busMasCercano.scheduled.llegada;
                // Calculamos el tiempo restante a partir de la hora de llegada programada en busMasCercano.scheduled.llegada
                tiempoRestante = Math.round((new Date(`${new Date().toISOString().split('T')[0]}T${busMasCercano.scheduled.llegada}`) - new Date()) / 60000);

                let ahora = new Date();
                let horaLlegadaProgramada = new Date(`1970-01-01T${busMasCercano.scheduled.llegada}Z`);

                // El bus está programado para el día siguiente
                if (horaLlegadaProgramada.getUTCHours() < ahora.getUTCHours() ||
                    (horaLlegadaProgramada.getUTCHours() === ahora.getUTCHours() && horaLlegadaProgramada.getUTCMinutes() < ahora.getUTCMinutes())) {
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
                diferencia = `Adelanto ${diferencia * -1} min.`;
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

            // Actualizar el HTML con los datos del bus más cercano
            lineItem.innerHTML = '<div class="linea"><h3>' + lineNumber + '<a class="alert-icon">' + alertIcon + '</a></h3><p class="destino">' + destino + '</p><p class="hora-programada">' + '<span class="hora">' + horaLlegadaProgramada + '</span> <span class="diferencia">' + diferencia + '</span></p></div> <div class="hora-tiempo"><div class="tiempo">' + tiempoRestante + ' <p>min.</div><div class="horaLlegada">' + horaLlegada + '</div></div>' + alertHTML;

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
                            intervalId = setInterval(updateBusList, 30000);
                            updateBusList();
                        });
                }
            });
            } else {
                lineItem.innerHTML = '<div class="linea"><h3>' + lineNumber + '</h3></div> <div class="tiempo">Sin info</div>';;
            }
        } else {
                lineItem.innerHTML = '<div class="linea"><h3>' + lineNumber + '</h3></div> <div class="tiempo">Sin info</div>';
        }
            // Crea y agrega botones cada vez que se actualiza la información.

            // Crear el botón de eliminar
            const removeButton = createButton('remove-button', '&#128465;', function() {
                removeBusLine(stopNumber, lineNumber);
            });
            lineItem.appendChild(removeButton);

            // Crear el botón de flecha
            const arrowButton = createArrowButton();
            lineItem.appendChild(arrowButton);
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

function combineBusData(busesRT, scheduledData) {
    let combined = {};

    // Procesar los datos programados
    scheduledData.buses.forEach(bus => {
        const linea = bus.linea;
        if (!combined[linea]) {
            combined[linea] = {};
        }

        bus.horarios.forEach(schedule => {
            if (!combined[linea][schedule.trip_id]) {
                combined[linea][schedule.trip_id] = { scheduled: null, realTime: null };
            }
            combined[linea][schedule.trip_id].scheduled = {
                llegada: schedule.llegada
                // tiempoRestante eliminado ya que no está disponible en los datos programados
            };
        });
    });

    // Procesar los datos en tiempo real
    busesRT.forEach(bus => {
        const linea = bus.linea;
        if (!combined[linea]) {
            combined[linea] = {};
        }

        if (!combined[linea][bus.trip_id]) {
            combined[linea][bus.trip_id] = { scheduled: null, realTime: null };
        }
        combined[linea][bus.trip_id].realTime = {
            llegada: bus.llegada,
            tiempoRestante: bus.tiempoRestante
        };
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
            horaLlegada = new Date(`${fechaHoy}T${bus.realTime.llegada}`);
            // Si el bus ya llegó, añadirlo al conjunto de buses adelantados
            if (horaLlegada - hoy < 0) {
                busesAdelantados.add(tripId);
            }
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
        addButton.addEventListener('click', addBusLine);
    }

    // Recuperamos todas las alertas vigentes
    allAlerts = await fetchAllBusAlerts();

    updateBusList();
}

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
                _paq.push(['trackEvent', 'installbutton', 'click', 'accepted']);
            } else {
                console.log('Usuario rechazó la instalación');
                _paq.push(['trackEvent', 'installbutton', 'click', 'rejected']);
            }
            deferredPrompt = null;
        });
    });
}
