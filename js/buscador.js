import { loadBusStops } from './api.js';

document.getElementById('stopNumber').addEventListener('input', async function() {
    const inputText = this.value;
    const matchingStops = await searchByStopNumber(inputText);

    // Limpia resultados previos
    const resultsContainer = document.getElementById('autocompleteResults');
    resultsContainer.innerHTML = '';

    // Si no hay texto, no genera resultados
    if (inputText.trim() === '') {
        return;
    }

    resultsContainer.style.display = 'block';

    // Crea y muestra los resultados
    matchingStops.forEach(function(stop) {
        let resultElement = document.createElement('div');
        resultElement.innerHTML = `<span class="numParada">${stop.parada.numero}</span> ${stop.parada.nombre}`;
        resultElement.classList.add('autocomplete-result');
        resultElement.addEventListener('click', function() {
            document.getElementById('stopNumber').value = stop.parada.numero;
            resultsContainer.innerHTML = ''; // Limpia los resultados después de seleccionar
        });
        resultsContainer.appendChild(resultElement);
    });
});

// Función para buscar paradas por nombre o número
async function searchByStopNumber(name) {
    // Normaliza y elimina los acentos del nombre buscado
    const normalizedSearchName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const busStops = await loadBusStops();

    // Devuelve todas las paradas que coincidan con el nombre buscado o el número de parada, ignorando acentos
    return busStops.filter(stop => {
        const normalizedStopName = stop.parada.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const normalizedStopNumber = stop.parada.numero.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return normalizedStopName.includes(normalizedSearchName) || normalizedStopNumber.includes(normalizedSearchName);
    });
}

// Evento de enfoque para el campo stopNumber
document.getElementById('stopNumber').addEventListener('focus', function() {
    const inputText = this.value;
    const resultsContainer = document.getElementById('autocompleteResults');

    // Solo muestra el cuadro de autocompletado si hay texto en el campo
    if (inputText.trim() !== '') {
        resultsContainer.style.display = 'block';
    }
});

// Cerrar el cuadro de búsqueda si se hace clic fuera de él
window.addEventListener('click', function(event) {
    const searchBox = document.getElementById('autocompleteResults');
    const stopNumberInput = document.getElementById('stopNumber');

    // Ignora los clics que se originen en los elementos
    if (event.target !== searchBox && 
        !searchBox.contains(event.target) &&
        event.target !== stopNumberInput) {
            searchBox.style.display = 'none';
    }
});

let timeoutId;
// Sugerencias de lineas si hemos introducido parada
document.getElementById('lineNumber').addEventListener('focus', async function() {
    // Cancela cualquier timeout previo
    clearTimeout(timeoutId);

    const lineNumber = this.value;
    const stopNumber = document.getElementById('stopNumber').value;

    // Verifica si lineNumber ya está rellenado o si stopNumber no es alfanumérico
    if (!(/^[a-zA-Z0-9]+$/.test(stopNumber))) {
        return; // No muestra sugerencias si stopNumber no es alfanumérico
    }

    // Encuentra la parada en busStops usando stopNumber
    const busStops = await loadBusStops();
    const stopData = busStops.find(stop => stop.parada.numero === stopNumber);

    if (stopData) {
        const lineSuggestions = [
            ...(stopData.lineas.ordinarias || []), 
            ...(stopData.lineas.poligonos || []), 
            ...(stopData.lineas.matinales || []), 
            ...(stopData.lineas.futbol || []), 
            ...(stopData.lineas.buho || []), 
            ...(stopData.lineas.universidad || [])
        ].map(line => ({ linea: line })); // Convierte cada línea en un objeto

        displayLineSuggestions(lineSuggestions);
    } else {
        console.error('Error: Parada no encontrada en los datos locales');
    }
});

// Si el input de línea pierde el foco, borramos las sugerencias
document.getElementById('lineNumber').addEventListener('blur', function() {
    // Establece un timeout para esperar a ver si el usuario hace clic en #lineSuggestions
    timeoutId = setTimeout(() => {
        const lineSuggestions = document.getElementById('lineSuggestions');
        lineSuggestions.innerHTML = ''; // Vacía el contenido de #lineSuggestions
    }, 200);
});

// Cancela el timeout si el usuario hace clic en #lineSuggestions
document.getElementById('lineSuggestions').addEventListener('mousedown', function() {
    clearTimeout(timeoutId);
});

function displayLineSuggestions(buses) {
    let resultsContainer = document.getElementById('lineSuggestions');
    const lineNumber = document.getElementById('lineNumber');

    resultsContainer.innerHTML = '';

    // Ordenar las sugerencias de líneas primero numéricamente y luego alfabéticamente
    buses.sort((a, b) => {
        const aNumber = parseInt(a.linea, 10);
        const bNumber = parseInt(b.linea, 10);
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
            return a.linea.localeCompare(b.linea);
        }
    });

    buses.forEach(function(bus) {
        let resultElement = document.createElement('div');

        let lineElement = document.createElement('span');
        lineElement.classList.add('linea', `linea-${ bus.linea}`);
        lineElement.textContent = bus.linea;

        resultElement.classList.add('line-suggestion');
        resultElement.appendChild(lineElement);

        resultElement.addEventListener('click', function() {
            lineNumber.value = bus.linea;
            resultsContainer.innerHTML = ''; // Limpia los resultados después de seleccionar
        });
        resultsContainer.appendChild(resultElement);
    });
}
