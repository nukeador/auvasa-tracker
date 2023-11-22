// Variable para almacenar los datos de las paradas
let busStops = [];

// Función para cargar el JSON
function loadBusStops() {
    fetch('paradas.json')
        .then(response => response.json())
        .then(data => {
            busStops = data; // Almacenamos los datos en la variable
        })
        .catch(error => {
            console.error('Error al cargar el archivo JSON:', error);
        });
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

    // Ignora los clics que se originen en el searchBox o en el searchButton
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

    fetch(`https://api-auvasa.vercel.app/${stopNumber}`)
        .then(response => response.json())
        .then(data => {
            displayLineSuggestions(data.buses);
        })
        .catch(error => console.error('Error al cargar datos de la API:', error));
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
