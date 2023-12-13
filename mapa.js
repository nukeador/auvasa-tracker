let myMap = L.map('busMap').setView([41.64817, -4.72974], 16);
let centerControl;
let paradaMarker;
let marcadorAutobus;

function crearIconoBus(numeroBus) {
    return L.divIcon({
        className: 'bus-icon' + (numeroBus ? ' linea-' + numeroBus : ''),
        html: '<div>' + numeroBus + '</div>',
        iconSize: [40, 40]
    });
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

async function updateBusMap(tripId, lineNumber, paradaData, centerMap) {
    if (!paradaData || !paradaData.latitud || !paradaData.longitud) {
        console.error('Datos de la parada no disponibles o inválidos');
        return;
    }

    try {
        const response = await fetch(apiEndPoint + `/v2/busPosition/${tripId}`);
        if (!response.ok) {
            throw new Error('Falló la respuesta de la API');
        }
        const data = await response.json();

        if (!data || !data.length || !data[0].latitud || !data[0].longitud) {
            throw new Error('Datos de la API inválidos o incompletos');
        }

        const lat = parseFloat(data[0].latitud);
        const lon = parseFloat(data[0].longitud);

        if (isNaN(lat) || isNaN(lon)) {
            throw new Error('Datos de ubicación inválidos');
        }

        actualizarControlCentro(myMap, lat, lon);
        actualizarMarcadores(paradaData, lat, lon, lineNumber);
        actualizarUltimaActualizacion(data[0].timestamp);

        if (centerMap) {
            myMap.panTo([lat, lon]);
        }

    } catch (error) {
        console.error('Error al actualizar el mapa de buses:', error.message);
    }
}

function actualizarControlCentro(map, lat, lon) {
    if (!centerControl) {
        var CenterControl = L.Control.extend({
            onAdd: function () {
                var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
                container.style.backgroundColor = 'white'; 
                container.style.backgroundImage = "url('img/bus-black.png')";
                container.style.backgroundSize = "30px 30px";
                container.style.width = '30px';
                container.style.height = '30px';
                container.style.cursor = 'pointer';
                return container;
            }
        });

        centerControl = new CenterControl();
        map.addControl(centerControl);
    }

    centerControl.getContainer().onclick = function () {
        map.panTo([lat, lon]);
    };
}

function actualizarMarcadores(paradaData, lat, lon, lineNumber) {
    // Actualizar o crear el marcador de la parada
    if (paradaMarker) {
        // Si ya existe, actualizamos su posición y su popup
        paradaMarker.setLatLng([paradaData.latitud, paradaData.longitud]);
        paradaMarker.getPopup().setContent(paradaData.nombre);
    } else {
        // Si no existe, creamos uno nuevo
        paradaMarker = L.marker([paradaData.latitud, paradaData.longitud], {
            title: paradaData.nombre
        }).addTo(myMap).bindPopup(paradaData.nombre);
    }

    // Actualizar o crear el marcador del autobús
    const nuevoIconoBus = crearIconoBus(lineNumber);
    if (marcadorAutobus) {
        // Si ya existe, actualizamos su posición y su icono
        marcadorAutobus.setLatLng([lat, lon]).setIcon(nuevoIconoBus);
    } else {
        // Si no existe, creamos uno nuevo
        marcadorAutobus = L.marker([lat, lon], {icon: nuevoIconoBus}).addTo(myMap);
    }
}

function actualizarUltimaActualizacion(timestamp) {
    let timestampDate = new Date(timestamp);
    let currentDate = new Date();
    let diff = currentDate - timestampDate;
    let minutes = Math.floor(diff / 60000);
    let seconds = ((diff % 60000) / 1000).toFixed(0);
    let lastUpdate = minutes < 1 ? `${seconds}s` : `${minutes} min ${seconds}s`;
    document.getElementById('busMapLastUpdate').textContent = lastUpdate;
}
