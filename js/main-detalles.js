// js/main-detalles.js

import { iniciarControladorDeDatos } from "./data-controller.js";
import {
  actualizarSensorUI,
  actualizarClimaExteriorUI,
  actualizarEstadoUI,
} from "./ui-index.js";

export function appDetalles(mac) {
  console.log(`App de detalles iniciada para el sensor: ${mac}`);

  // Creamos el objeto de callbacks con las funciones de UI de esta página
  const callbacks = {
    onSensorData: actualizarSensorUI,
    onOwmData: actualizarClimaExteriorUI,
    onEstadoUpdate: actualizarEstadoUI,
  };

  // Iniciamos el controlador de datos y le pasamos nuestros callbacks
  iniciarControladorDeDatos(mac, callbacks);
}
