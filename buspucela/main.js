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
            // Crear el botón después de que todas las paradas hayan sido importadas
            createViewButton();
        };
        reader.readAsText(file);
    });

    document.querySelector('.custom-file-upload').addEventListener('click', function() {
        document.getElementById('fileInput').click();
    });

    document.getElementById('fileInput').addEventListener('change', function(event) {
        const fileName = event.target.files[0].name;
        document.getElementById('fileLabel').textContent = fileName;
    });

    function createViewButton() {
        const importBlock = document.getElementById('import-block');
        const link = document.createElement('a');
        link.textContent = 'Completado: Clic aquí para ver paradas importadas';
        link.href = '/';
        link.id = 'import-complete';
        importBlock.appendChild(link);
    }
}
