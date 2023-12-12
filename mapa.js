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

async function updateBusMap(tripId, lineNumber) {
    // Limpiamos de marcadores previos
    myMap.eachLayer(function(layer) {
        if (layer instanceof L.Marker) {
            myMap.removeLayer(layer);
        }
    });
    
    const response = await fetch(`https://gtfs.auvasatracker.com/v2/busPosition/${tripId}`);
    const data = await response.json();
    const lat = data[0].latitud ? data[0].latitud.toString() : undefined;
    const lon = data[0].longitud ? data[0].longitud.toString() : undefined;

    let marcadorAutobus = L.marker([lat, lon], {
        icon: crearIconoBus(lineNumber)
    }).addTo(myMap);

    myMap.setView([lat, lon], 16);
}