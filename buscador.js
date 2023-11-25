// Variable para almacenar los datos de las paradas
let busStops = [];

// Función para cargar el JSON
async function loadBusStops() {
    try {
        const response = await fetch('paradas.json');
        const data = await response.json();
        busStops = data; // Almacenamos los datos en la variable
    } catch (error) {
        console.error('Error al cargar el archivo JSON:', error);
    }
}

// Llamamos a la función al cargar la página
// Esto se llamará desde el script.js principal
// window.onload = loadBusStops;

document.getElementById('stopNumber').addEventListener('input', function() {
    var inputText = this.value;
    var matchingStops = searchByStopNumber(inputText);

    // Limpia resultados previos
    var resultsContainer = document.getElementById('autocompleteResults');
    resultsContainer.innerHTML = '';

    // Si no hay texto, no genera resultados
    if (inputText.trim() === '') {
        return;
    }

    resultsContainer.style.display = 'block';

    // Crea y muestra los resultados
    matchingStops.forEach(function(stop) {
        var resultElement = document.createElement('div');
        resultElement.textContent = stop.parada.nombre + ' (Nº ' + stop.parada.numero + ')';
        resultElement.classList.add('autocomplete-result');
        resultElement.addEventListener('click', function() {
            document.getElementById('stopNumber').value = stop.parada.numero;
            resultsContainer.innerHTML = ''; // Limpia los resultados después de seleccionar
        });
        resultsContainer.appendChild(resultElement);
    });
});

// Función para buscar paradas por nombre
function searchByStopNumber(name) {
    // Normaliza y elimina los acentos del nombre buscado
    var normalizedSearchName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    // Devuelve todas las paradas que coincidan con el nombre buscado, ignorando acentos
    return busStops.filter(stop => {
        var normalizedStopName = stop.parada.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return normalizedStopName.includes(normalizedSearchName);
    });
}

// Evento de enfoque para el campo stopNumber
document.getElementById('stopNumber').addEventListener('focus', function() {
    var inputText = this.value;
    var resultsContainer = document.getElementById('autocompleteResults');

    // Solo muestra el cuadro de autocompletado si hay texto en el campo
    if (inputText.trim() !== '') {
        resultsContainer.style.display = 'block';
    }
});

// Cerrar el cuadro de búsqueda si se hace clic fuera de él
window.addEventListener('click', function(event) {
    var searchBox = document.getElementById('autocompleteResults');
    var searchButton = document.getElementById('stopNumber');

    // Ignora los clics que se originen en los elementos
    if (event.target !== searchBox && 
        !searchBox.contains(event.target) &&
        event.target !== searchButton) {
        searchBox.style.display = 'none';
    }
});

// Sugerencias de lineas si hemos introducido parada
document.getElementById('lineNumber').addEventListener('focus', function() {
    var lineNumber = this.value;
    var stopNumber = document.getElementById('stopNumber').value;

    // Verifica si lineNumber ya está rellenado o si stopNumber no es numérico
    if (lineNumber.trim() !== '' || !(/^\d+$/.test(stopNumber))) {
        return; // No muestra sugerencias si lineNumber ya tiene un valor o stopNumber no es numérico
    }

    // Encuentra la parada en busStops usando stopNumber
    const stopData = busStops.find(stop => stop.parada.numero === stopNumber);

    if (stopData) {
        const lineSuggestions = [...stopData.lineas.ordinarias, ...stopData.lineas.poligonos, ...stopData.lineas.matinales, ...stopData.lineas.futbol, ...stopData.lineas.buho, ...stopData.lineas.universidad]
    .map(line => ({ linea: line })); // Convierte cada línea en un objeto


        displayLineSuggestions(lineSuggestions);
    } else {
        console.error('Error: Parada no encontrada en los datos locales');
    }
});

function displayLineSuggestions(buses) {
    var resultsContainer = document.getElementById('lineSuggestions');

    const lineNumber = document.getElementById('lineNumber');
    const suggestions = document.getElementById('lineSuggestions');

    resultsContainer.innerHTML = '';

    buses.forEach(function(bus) {
        var resultElement = document.createElement('div');
        resultElement.textContent = 'Línea ' + bus.linea;
        resultElement.classList.add('line-suggestion');
        resultElement.addEventListener('click', function() {
            document.getElementById('lineNumber').value = bus.linea;
            resultsContainer.innerHTML = ''; // Limpia los resultados después de seleccionar
        });
        resultsContainer.appendChild(resultElement);
    });
}