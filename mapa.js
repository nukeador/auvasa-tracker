var myMap = L.map('busMap').setView([41.64817, -4.72974], 16);

function crearIconoBus(numeroBus) {
    var iconoBus = L.divIcon({
        className: 'bus-icon' + (numeroBus ? ' linea-' + numeroBus : ''),
        html: '<div>' + numeroBus + '</div>',
        iconSize: [40, 40]
    });
    return iconoBus;
}

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(myMap);

L.tileLayer('https://{s}.tile.thunderforest.com/atlas/{z}/{x}/{y}.png?apikey=a1eb584c78ab43ddafe0831ad04566ae', {
    maxZoom: 19,
    attribution: 'Maps © Thunderforest',
    subdomains: 'abc'
}).addTo(myMap);

// Mantener una referencia al control
let centerControl;
let paradaMarker;

async function updateBusMap(tripId, lineNumber, paradaData, centerMap) {

    if (!paradaData || !paradaData.latitud || !paradaData.longitud) {
        console.error('Datos de la parada no disponibles o inválidos');
        return; // Detener la ejecución si los datos no son válidos
    }

    // Limpiamos de marcadores previos
    myMap.eachLayer(function(layer) {
        if (layer instanceof L.Marker) {
                myMap.removeLayer(layer); 
        }
    });

    // Obtener los datos de la API
    const response = await fetch(`https://gtfs.auvasatracker.com/v2/busPosition/${tripId}`);
    const data = await response.json();

    const lat = data[0].latitud ? data[0].latitud.toString() : undefined;
    const lon = data[0].longitud ? data[0].longitud.toString() : undefined;

    // Crear un botón de control personalizado
    var CenterControl = L.Control.extend({
        onAdd: function (map) {
            var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');

            container.style.backgroundColor = 'white'; 
            container.style.backgroundImage = "url('img/bus-black.png')";
            container.style.backgroundSize = "30px 30px";
            container.style.width = '30px';
            container.style.height = '30px';
            container.style.cursor = 'pointer';

            container.onclick = function () {
                map.panTo([lat, lon]);
            }

            return container;
        },
    });

    // Si el control ya existe, eliminarlo
    if (centerControl) {
        myMap.removeControl(centerControl);
    }

    // Crear un nuevo control y añadirlo al mapa
    centerControl = new CenterControl();
    myMap.addControl(centerControl);

    paradaMarker = L.marker([paradaData.latitud, paradaData.longitud])
    .addTo(myMap)
    .bindPopup(paradaData.nombre);

    // Crear un objeto Date a partir del timestamp
    let timestampDate = new Date(data[0].timestamp);

    // Crear un objeto Date para la hora actual
    let currentDate = new Date();

    // Calcular la diferencia en milisegundos
    let diff = currentDate - timestampDate;

    // Convertir la diferencia en minutos y segundos
    let minutes = Math.floor(diff / 60000); // 1 minuto = 60000 milisegundos
    let seconds = ((diff % 60000) / 1000).toFixed(0);

    // Verificar si los minutos son menos de 1
    let lastUpdate;
    if (minutes < 1) {
        lastUpdate = `${seconds}s`;
    } else {
        lastUpdate = `${minutes} min ${seconds}s`;
    }

    document.getElementById('busMapLastUpdate').textContent = lastUpdate;

    let marcadorAutobus = L.marker([lat, lon], {
        icon: crearIconoBus(lineNumber)
    }).addTo(myMap);

    if (centerMap) {
        myMap.panTo([lat, lon]);
        isMapCentered = true;
    }
}