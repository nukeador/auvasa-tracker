var busLines = localStorage.getItem('busLines') ? JSON.parse(localStorage.getItem('busLines')) : [];

// Agregar función para consultar API
async function stopAndLineExist(stopNumber, lineNumber) {
    const response = await fetch(`https://api-auvasa.vercel.app/${stopNumber}/${lineNumber}`);
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
        stopBlock.innerHTML = '<h2>🚏 ' + stop + '</h2>';
        listElement.appendChild(stopBlock);

        stops[stop].forEach(function(line, index) {
            var lineItem = document.createElement('div');
            lineItem.className = 'line-info';
            
            // Elementos pares tienen un clase especial
            if (index % 2 === 0) {
                lineItem.classList.add('highlight');
            }

            lineItem.innerHTML = '<div class="linea"><h3>' + line.lineNumber + '</h3></div> <div class="tiempo">...</div> ';
            
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
    var apiUrl = 'https://api-auvasa.vercel.app/' + stopNumber + '/' + lineNumber;

    fetch(apiUrl)
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.buses && data.buses.length > 0) {
                var paradaInfo = data.parada;
                var busInfo = data.buses[0];
                lineItem.innerHTML = '<div class="linea"><h3>' + lineNumber + '</h3><p class="destino">→ ' + busInfo.destino + '</p></div> <div class="tiempo">' + busInfo.tiempoRestante + ' <p>min.</p></div>';
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


window.onload = function() {
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
