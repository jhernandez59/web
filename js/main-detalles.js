import { iniciarControladorDeDatos } from "./data-controller.js";
import {
  actualizarSensorUI,
  actualizarClimaExteriorUI,
  actualizarEstadoUI,
} from "./ui-index.js";

function appDetalles() {
  console.log("App de la página principal iniciada.");

  // Creamos el objeto de callbacks con las funciones de UI de esta página
  const callbacks = {
    onSensorData: actualizarSensorUI,
    onOwmData: actualizarClimaExteriorUI,
    onEstadoUpdate: actualizarEstadoUI,
  };

  // Iniciamos el controlador de datos y le pasamos nuestros callbacks
  iniciarControladorDeDatos(callbacks);
}

document.addEventListener("DOMContentLoaded", appDetalles);
