// main.js
import { addBusLine } from '../js/api.js';

if (document.readyState === "loading") {  // Cargando aún no ha terminado
    document.addEventListener("DOMContentLoaded", main);
} else {  // `DOMContentLoaded` ya se ha disparado
    main();
}
function main() {

    console.log("hola");

    document.getElementById('uploadForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];
        if (!file) {
            alert('Por favor, selecciona un archivo.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const content = e.target.result;
            const stops = content.split('\n').filter(stop => stop.trim() !== '');
            for (const stop of stops) {
                try {
                    await addBusLine(stop);
                } catch (error) {
                    console.error(`Error al añadir la parada ${stop}:`, error);
                }
            }
        };
        reader.readAsText(file);
    });
}