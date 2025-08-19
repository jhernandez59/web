// ARCHIVO: main-recomendaciones.js
import {
  iniciarControladorDeDatos, // Inicia el sistema que recibe datos del sensor y de OWM.
  analizarTendenciaPresion,
} from "./data-controller.js";

import {
  actualizarRecomendacionesUI,
  actualizarTarjetaPresion,
} from "./ui-recomendaciones.js";

// Necesitamos una variable para guardar los datos del sensor y de OWM
let datosSensorActuales = null;
let datosOwmActuales = null;

function appRecomendaciones() {
  console.log("App de recomendaciones iniciada.");

  // Creamos el objeto de callbacks para esta página
  const callbacks = {
    onSensorData: (datosSensor) => {
      // >>> LÍNEA DE DEPURACIÓN <<<
      console.log(
        "%cSENSOR DATA RECIBIDO EN MAIN:",
        "color: blue; font-weight: bold;",
        datosSensor
      );

      datosSensorActuales = datosSensor;
      // Si ya tenemos los datos de OWM, actualizamos todo
      if (datosOwmActuales) {
        // >>> LÍNEA DE DEPURACIÓN <<<
        console.log(
          "Llamando a actualizarRecomendacionesUI (desde onSensorData)"
        );

        actualizarRecomendacionesUI({
          sensor: datosSensorActuales.actual,
          owm: datosOwmActuales.datosActuales.clima,
        });
      }
    },
    onOwmData: (datosAmbiente) => {
      datosOwmActuales = datosAmbiente;
      // >>> LÍNEA DE DEPURACIÓN <<<
      console.log(
        "%cOWM DATA RECIBIDO EN MAIN:",
        "color: green; font-weight: bold;",
        datosAmbiente
      );

      // Si ya tenemos los datos del sensor, actualizamos todo
      if (datosSensorActuales) {
        // >>> LÍNEA DE DEPURACIÓN <<<
        console.log("Llamando a actualizarRecomendacionesUI (desde onOwmData)");

        actualizarRecomendacionesUI({
          sensor: datosSensorActuales.actual,
          owm: datosOwmActuales.datosActuales.clima, // Pasamos el objeto 'clima' completo
        });
      }
    },
  };

  iniciarControladorDeDatos(callbacks);

  // Lógica específica para la tendencia de presión
  const params = new URLSearchParams(location.search);
  const mac = params.get("mac") || "68C63A87F36C";

  const procesarPresion = async () => {
    const resultado = await analizarTendenciaPresion(mac);
    actualizarTarjetaPresion(resultado); // Llamamos a la nueva función de UI
  };

  procesarPresion(); // La primera vez
  setInterval(procesarPresion, 60 * 60 * 1000); // Luego cada hora
}

document.addEventListener("DOMContentLoaded", appRecomendaciones);
