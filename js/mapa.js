import { apiEndPoint, fetchSuppressedStops, getStopLines, getBusDestinationsForStop } from './api.js';
import { mapEvents } from './utils.js';

let myMap = L.map('busMap').setView([41.64817, -4.72974], 15);
let centerControl;
let paradaMarker;
let marcadorAutobus;

// Eventos al mapa
mapEvents();

function crearIconoBus(numeroBus) {
    return L.divIcon({
        className: 'bus-icon' + (numeroBus ? ' linea-' + numeroBus : ''),
        html: `<div>${numeroBus}</div>`,
        iconSize: [30, 30]
    });
}

let lat = null;
let lon = null;

export async function updateBusMap(tripId, lineNumber, paradaData, centerMap) {
    // Detectamos el theme para ofrecer una capa u otra de mapa
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === "dark"){
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}' + (L.Browser.retina ? '@2x.png' : '.png'), {
            attribution:'&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20,
            minZoom: 0
        }).addTo(myMap);
    } else {
        L.tileLayer('https://{s}.tile.thunderforest.com/atlas/{z}/{x}/{y}.png?apikey=a1eb584c78ab43ddafe0831ad04566ae', {
            maxZoom: 19,
            attribution: 'Maps © <a href="http://thunderforest.com/">Thunderforest</a>',
            subdomains: 'abc'
        }).addTo(myMap);
    }

    if (!paradaData || !paradaData.latitud || !paradaData.longitud) {
        console.error('Datos de la parada no disponibles o inválidos');
        return;
    }

    try {
        const response = await fetch(apiEndPoint + `/v2/busPosition/${tripId}`);
        // Si no hay datos de ubicación, los dejamos como null
        if (!response.ok) {
            console.log('Error al consultar el API de ubicación');
        }
        else {
            const data = await response.json();

            if (!data || !data.length || !data[0].latitud || !data[0].longitud) {
                // Si no hay datos simplemente centramos el mapa en la parada
                if (centerMap) {
                    myMap.panTo([paradaData.latitud, paradaData.longitud]);
                }
                document.getElementById('busMapLastUpdate').innerHTML = "Actualmente no hay datos de ubicación para esta línea";
                if (marcadorAutobus)   {
                    marcadorAutobus.remove();
                    marcadorAutobus = null;
                }
            }
            else {
                // Si tenemos datos de ubicación los guardamos y mostramos
                lat = parseFloat(data[0].latitud);
                lon = parseFloat(data[0].longitud);
                actualizarBus(lat, lon, lineNumber);
                actualizarControlCentro(myMap, lat, lon);
                actualizarUltimaActualizacion(data[0].timestamp);
                if (centerMap) {
                    myMap.panTo([lat, lon]);
                }
            }

            actualizarParada(paradaData);
            addRouteShapesToMap(tripId, lineNumber);
            addStopsToMap(tripId, lineNumber);
        }
    } catch (error) {
        console.error('Error al actualizar el mapa de buses:', error.message);
    }
}

function actualizarControlCentro(map, lat, lon) {
    if (!centerControl) {
        let CenterControl = L.Control.extend({
            options: {
                position: 'topleft' // Posición del control en el mapa
            },
            onAdd: function () {
                let container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
                container.style.backgroundColor = 'white';
                container.style.backgroundImage = "url('img/bus-location-center.png')";
                container.style.backgroundSize = "30px 30px";
                container.style.width = '30px';
                container.style.height = '30px';
                container.style.cursor = 'pointer';
                container.title = "Centrar mapa en el bus";
                return container;
            }
        });

        centerControl = new CenterControl();
        map.addControl(centerControl);
    }

    centerControl.getContainer().onclick = function () {
        map.panTo([lat, lon], {animate: true, duration: 1});
    };
}

let UbicacionUsuarioControl = L.Control.extend({
    options: {
        position: 'topleft' // Posición del control en el mapa
    },

    onAdd: function (map) {
        let container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        
        container.style.backgroundColor = 'white';
        container.style.backgroundImage = "url('img/location.svg')";
        container.style.backgroundSize = "20px 20px";
        container.style.backgroundRepeat = "no-repeat";
        container.style.backgroundPosition = "center";
        container.style.width = '30px';
        container.style.height = '30px';
        container.style.cursor = 'pointer';
        container.title = "Mostrar mi ubicación";

        container.onclick = function(){
            actualizarUbicacionUsuario(true);
        }

        return container;
    }
});

myMap.addControl(new UbicacionUsuarioControl());

function actualizarParada(paradaData) {
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
}

function actualizarBus(lat, lon, lineNumber) {
    // Actualizar o crear el marcador del autobús
    const nuevoIconoBus = crearIconoBus(lineNumber);
    if (marcadorAutobus) {
        // Si ya existe, actualizamos su posición y su icono
        // Pero solo si lat y lon ha cambiado
        if (marcadorAutobus.getLatLng().lat!== lat || marcadorAutobus.getLatLng().lng!== lon) {
            marcadorAutobus.setLatLng([lat, lon]).setIcon(nuevoIconoBus);
            // Centramos la vista en la nueva ubicación
            myMap.panTo([lat, lon], {animate: true, duration: 1});
        }
    } else {
        // Si no existe, creamos uno nuevo
        marcadorAutobus = L.marker([lat, lon], {icon: nuevoIconoBus}).addTo(myMap);
    }
}

function actualizarUltimaActualizacion(timestamp) {
    // Convertimos el Unix timestamp a ms
    let timestampDate = new Date(timestamp * 1000);
    let currentDate = new Date();
    let diff = currentDate - timestampDate;
    let minutes = Math.floor(diff / 60000);
    let seconds = ((diff % 60000) / 1000).toFixed(0);
    let lastUpdate = minutes < 1 ? `${seconds}s` : `${minutes} min ${seconds}s`;
    let updateHTML = `Última ubicación <strong>aproximada</strong>. Actualizada hace ${lastUpdate}`;
    document.getElementById('busMapLastUpdate').innerHTML = updateHTML;
}

let currentShapesLayer = null;
let currentShapesTripId = null;
// Route shapes de un trip_id al mapa
async function addRouteShapesToMap(tripId, lineNumber) {
    try {
        // Si el tripId no ha cambiado, no hacemos nada
        if (tripId === currentShapesTripId) {
            return;
        }

        const shapesResponse = await fetch(apiEndPoint + `/v2/geojson/${tripId}`);
        if (!shapesResponse.ok) {
            throw new Error('Failed to fetch route shapes');
        }
        const shapesData = await shapesResponse.json();

        // Remove the existing shapes layer if it exists
        if (currentShapesLayer) {
            myMap.removeLayer(currentShapesLayer);
        }

        // Actualizar el tripId actual para las shapes
        currentShapesTripId = tripId;

        // Add the new GeoJSON to the map with a custom class
        currentShapesLayer = L.geoJSON(shapesData, {
            onEachFeature: (feature, layer) => {
                if (layer.setStyle) {
                    // Set the class name based on the line number
                    const className = `linea-${lineNumber}`;
                    layer.setStyle({
                        className: className
                    });
                }
            }
        }).addTo(myMap);
    } catch (error) {
        console.error('Error adding route shapes to the map:', error.message);
    }
}

// Preparar los datos asíncronos antes de agregar las capas al mapa
async function prepareBusLines(stopsData) {
    let busLinesPromises = stopsData.features.map(async (stop) => {
        let stopCode = stop.properties.stop_code;
        let lines = await getStopLines(stopCode);
        return { stopCode, lines };
    });

    let busLinesArray = await Promise.all(busLinesPromises);

    let busLines = {};
    busLinesArray.forEach(({ stopCode, lines }) => {
        busLines[stopCode] = lines;
    });

    return busLines;
}

let currentStopsLayer = null;
let currentTripId = null;
// Función para añadir paradas de un trip_id al mapa
async function addStopsToMap(tripId, lineNumber) {
    try {
        // Si el tripId no ha cambiado, no hagas nada
        if (tripId === currentTripId) {
            return;
        }
        const stopsResponse = await fetch(apiEndPoint + `/v2/geojson/paradas/${tripId}`);
        if (!stopsResponse.ok) {
            throw new Error('Failed to fetch stops');
        }
        const stopsData = await stopsResponse.json();

        // Remove the existing stops layer if it exists
        if (currentStopsLayer) {
            myMap.removeLayer(currentStopsLayer);
        }

        // Obtener la lista de paradas suprimidas
        const suppressedStops = await fetchSuppressedStops();

        // Actualizar el tripId actual
        currentTripId = tripId;

        // Obtener lineas activas para cada parada
        let busLines = await prepareBusLines(stopsData);

        // Add the new stops to the map
        currentStopsLayer = L.geoJSON(stopsData, {
            pointToLayer: (feature, latlng) => {

                // HTML para el listado de líneas
                let lineasHTML = '<div id="lineas-correspondencia">';
                // Iteramos por las líneas de la parada y las añadimos
                busLines[feature.properties.stop_code].forEach(lineNumber => {
                    lineasHTML += `<span class="addLineButton linea linea-${lineNumber}" data-stop-number="${feature.properties.stop_code}" data-line-number="${lineNumber}">${lineNumber}</span>`;
                });
                lineasHTML += '<p>Haga clic en una línea para añadirla a su lista</p></div>';

                let iconUrl = 'img/bus-stop.png';
                const savedTheme = localStorage.getItem('theme');

                if (savedTheme === "dark"){
                    iconUrl = 'img/bus-stop-dark.png';
                }

                let popupContent = `<strong>${feature.properties.stop_name}</strong><br>Número: ${feature.properties.stop_code} ${lineasHTML}`;

                // Verificar si la parada está suprimida
                let stopSuppressed = suppressedStops.some(stop => stop.numero === feature.properties.stop_code);
                if (stopSuppressed) {
                    iconUrl = 'img/circle-exclamation.png'; // Asumiendo que tienes un icono diferente para las paradas suprimidas
                    popupContent += '<br>🚫 Aviso: Parada actualmente suprimida';
                }

                const busStopIcon = L.icon({
                    iconUrl: iconUrl, 
                    iconSize: [12, 12], 
                    iconAnchor: [0, 0], 
                    popupAnchor: [0, -12]
                });
                return L.marker(latlng, { icon: busStopIcon }).bindPopup(popupContent);
            }
        }).addTo(myMap);
    } catch (error) {
        console.error('Error adding stops to the map:', error.message);
    }
}

let userLocationMarker;

function actualizarUbicacionUsuario(mapCenter) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => mostrarUbicacionUsuario(position, mapCenter), mostrarErrorUbicacion, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        });
    } else {
        console.error('Geolocalización no soportada por este navegador.');
    }
}

function mostrarUbicacionUsuario(position, mapCenter) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;

    // Si ya existe un marcador de ubicación del usuario, actualiza su posición
    if (userLocationMarker) {
        userLocationMarker.setLatLng([lat, lon]);
    } else {
        // Si no, crea un nuevo marcador
        userLocationMarker = L.marker([lat, lon], {
            icon: L.divIcon({
                className: 'user-location-icon',
                html: '<div class="location-icon"></div>',
                iconSize: [15, 15]
            })
        }).addTo(myMap);
    }

    // Dibuja un círculo alrededor de la ubicación del usuario
    L.circle([lat, lon], {
        color: '#FFF',
        fillColor: '#1da1f2',
        fillOpacity: 0.7,
        radius: 50
    }).addTo(myMap);

    if (mapCenter) {
        // Centramos el mapa en la ubicación
        myMap.panTo([lat, lon], {animate: true, duration: 1});
    }
}

function mostrarErrorUbicacion(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            console.error("Usuario negó la solicitud de geolocalización.");
            break;
        case error.POSITION_UNAVAILABLE:
            console.error("Información de ubicación no disponible.");
            break;
        case error.TIMEOUT:
            console.error("La solicitud para obtener la ubicación del usuario expiró.");
            break;
        case error.UNKNOWN_ERROR:
            console.error("Un error desconocido ocurrió.");
            break;
    }
}

// Función auxiliar para preparar datos de paradas a GeoJSON
function prepararDatosParadas(paradas) {

    return {
        type: "FeatureCollection",
        features: paradas.map(parada => {
            // Generar el HTML para el listado de líneas
            let lineasHTML = '<div id="lineas-correspondencia">';
            parada.lineas.ordinarias.sort((a, b) => {
                // Comprueba si 'a' y 'b' contienen una letra
                const aHasLetter = /[a-zA-Z]/.test(a);
                const bHasLetter = /[a-zA-Z]/.test(b);
            
                // Si ambos contienen una letra, los ordena alfabéticamente
                if (aHasLetter && bHasLetter) {
                    return a.localeCompare(b);
                }
                // Si solo 'a' contiene una letra, lo coloca después
                if (aHasLetter) {
                    return 1;
                }
                // Si solo 'b' contiene una letra, lo coloca después
                if (bHasLetter) {
                    return -1;
                }
                // Si ninguno contiene una letra, los ordena numéricamente
                return parseInt(a, 10) - parseInt(b, 10);
            }).forEach(linea => {
                lineasHTML += `<span class="addLineButton linea linea-${linea}" data-stop-number="${parada.parada.numero}" data-line-number="${linea}">${linea}</span>`;
            });
            lineasHTML += '<p>Haga clic en una línea para añadirla a su lista</p></div>';

            return {
                type: "Feature",
                properties: {
                    nombre: parada.parada.nombre,
                    numero: parada.parada.numero,
                    lineasHTML: lineasHTML,
                    lineas: parada.lineas.ordinarias,
                },
                geometry: {
                    type: "Point",
                    coordinates: [parada.ubicacion.x, parada.ubicacion.y]
                }
            };
        })
    };
}

// Mapa para paradas cercanas
export async function mapaParadasCercanas(paradas, ubicacionUsuarioX, ubicacionUsuarioY) {
    // Check if the map container already has a map instance
    if (window.myMapParadasCercanas) {
        // Remove the existing map instance
        window.myMapParadasCercanas.remove();
    }

    // Create a new map instance
    window.myMapParadasCercanas = L.map('mapaParadasCercanas').setView([ubicacionUsuarioY, ubicacionUsuarioX], 15);

    let iconUrl = 'img/bus-stop.png';
    const suppressedStops = await fetchSuppressedStops();

    // Detectamos el theme para ofrecer una capa u otra de mapa
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === "dark"){
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}' + (L.Browser.retina ? '@2x.png' : '.png'), {
            attribution:'&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20,
            minZoom: 0
        }).addTo(window.myMapParadasCercanas);
        iconUrl = 'img/bus-stop-dark.png';
    } else {
        L.tileLayer('https://{s}.tile.thunderforest.com/atlas/{z}/{x}/{y}.png?apikey=a1eb584c78ab43ddafe0831ad04566ae', {
            maxZoom: 19,
            attribution: 'Maps © <a href="http://thunderforest.com/">Thunderforest</a>',
            subdomains: 'abc'
        }).addTo(window.myMapParadasCercanas);
    }

    const geoJSONData = prepararDatosParadas(paradas);

    L.geoJSON(geoJSONData, {
        pointToLayer: function (feature, latlng) {
            // Crear el icono para la parada
            const iconoParada = L.icon({
                iconUrl: 'img/bus-stop.png',
                iconSize: [12, 12],
                iconAnchor: [0, 0],
                popupAnchor: [0, -12]
            });
    
            // Crear el marcador con el icono y el popup personalizado
            const marker = L.marker(latlng, { icon: iconoParada })
            .bindPopup(`<strong>${feature.properties.nombre}</strong> (${feature.properties.numero}) ${feature.properties.lineasHTML}`);

           // Agregar un evento de clic al marcador
            marker.on('click', async function(e) {
                // Obtener destino para todas las líneas de la parada
                let lineasDestinos = await getBusDestinationsForStop(feature.properties.numero);

                // Generar el HTML para el listado de líneas
                let lineasHTML = '<div id="lineas-correspondencia">';
                feature.properties.lineas.forEach(linea => {
                    let destino = lineasDestinos[linea] || '';
                    lineasHTML += `
                        <div>
                            <span class="addLineButton linea linea-${linea}" data-stop-number="${feature.properties.numero}" data-line-number="${linea}">${linea}</span><span class="addLineButton destino linea-${linea}" data-stop-number="${feature.properties.numero}" data-line-number="${linea}">${destino}</span>
                        </div>
                    `;
                });
                lineasHTML += '<p>Haga clic en una línea para añadirla a su lista</p></div>';

                // Verificar si la parada está suprimida
                const stopSuppressed = suppressedStops.some(stop => stop.numero === feature.properties.numero);

                // Si la parada está suprimida, añadir texto adicional al popup
                if (stopSuppressed) {
                    marker.setPopupContent(`<strong>${feature.properties.nombre}</strong> (${feature.properties.numero}) ${lineasHTML}<p>🚫 Aviso: Parada actualmente suprimida</p>`);
                } else {
                    marker.setPopupContent(`<strong>${feature.properties.nombre}</strong> (${feature.properties.numero}) ${lineasHTML}`);
                }

                // Mostrar el popup
                marker.openPopup();
            });

            return marker;
        }
    }).addTo(window.myMapParadasCercanas);

    const lat = ubicacionUsuarioY;
    const lon = ubicacionUsuarioX;

    // Si ya existe un marcador de ubicación del usuario, actualiza su posición
    if (userLocationMarker) {
        userLocationMarker.setLatLng([lat, lon]);
    } else {
        // Si no, crea un nuevo marcador
        userLocationMarker = L.marker([lat, lon], {
            icon: L.divIcon({
                className: 'user-location-icon',
                html: '<div class="location-icon"></div>',
                iconSize: [15, 15]
            })
        }).addTo(window.myMapParadasCercanas);
    }

    // Dibuja un círculo alrededor de la ubicación del usuario
    L.circle([lat, lon], {
        color: '#FFF',
        fillColor: '#1da1f2',
        fillOpacity: 0.7,
        radius: 50
    }).addTo(window.myMapParadasCercanas);
}