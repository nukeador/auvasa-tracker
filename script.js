var busLines = localStorage.getItem('busLines') ? JSON.parse(localStorage.getItem('busLines')) : [];

// Agregar función para consultar API
async function stopAndLineExist(stopNumber, lineNumber) {
    const response = await fetch(`http://api-auvasa.vercel.app/${stopNumber}/${lineNumber}`);
    return response.ok;
}

async function addBusLine() {
    const stopNumber = document.getElementById('stopNumber').value;
    const lineNumber = document.getElementById('lineNumber').value;

    if (stopNumber && lineNumber) {
        
        const existsInApi = await stopAndLineExist(stopNumber, lineNumber);

        // Crear div para el mensaje 
        const errorMessage = document.createElement('div');
        errorMessage.textContent = 'Error: Esa línea no existe para esa parada';
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

function updateBusList() {
    var listElement = document.getElementById('busList');
    listElement.innerHTML = '';

    var stops = groupByStops(busLines);

    for (var stop in stops) {
        var stopBlock = document.createElement('div');
        stopBlock.className = 'stop-block';
        stopBlock.innerHTML = '<h3>Parada ' + stop + '</h3>';
        listElement.appendChild(stopBlock);

        stops[stop].forEach(function(line) {
            var lineItem = document.createElement('div');
            lineItem.className = 'line-info';
            lineItem.innerHTML = 'Línea ' + line.lineNumber + ': cargando...';

            var removeButton = document.createElement('button');
            removeButton.innerHTML = '&#128465;';
            removeButton.className = 'remove-button';
            removeButton.addEventListener('click', function() {
                removeBusLine(line.stopNumber, line.lineNumber);
            });
            lineItem.appendChild(removeButton);

            stopBlock.appendChild(lineItem);

            fetchBusTime(line.stopNumber, line.lineNumber, lineItem);
        });
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

function fetchBusTime(stopNumber, lineNumber, lineItem) {
    var apiUrl = 'http://api-auvasa.vercel.app/' + stopNumber + '/' + lineNumber;

    fetch(apiUrl)
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data && data.length > 0) {
                var busInfo = data[0];
                lineItem.innerHTML = 'Línea ' + lineNumber + ' (' + busInfo.destino + '): ' + busInfo.tiempoRestante + ' minutos';
            } else {
                lineItem.innerHTML = 'Información no disponible';
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
            lineItem.innerHTML = 'Error al obtener datos para la parada ' + stopNumber + ', línea ' + lineNumber;
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
    busLines = [];
    saveBusLines();
    updateBusList();
}

window.onload = function() {
    var addButton = document.getElementById('addButton');
    var removeAllButton = document.getElementById('removeAllButton');
    var removeAllButton = document.getElementById('removeAllButton');
    if (removeAllButton) {
        removeAllButton.addEventListener('click', removeAllBusLines);
    }
    if (addButton) {
        addButton.addEventListener('click', addBusLine);
    }
    updateBusList();
}

setInterval(updateBusList, 30000);
