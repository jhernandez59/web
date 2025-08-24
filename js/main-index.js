// ARCHIVO: main-recomendaciones.js
import {
  iniciarControladorDeDatos, // Inicia el sistema que recibe datos del sensor y de OWM.
  analizarTendenciaPresion,
  podarHistorialPresion,
} from "./data-controller.js";

import {
  actualizarRecomendacionesUI,
  actualizarTarjetaPresion,
  actualizarEnlacesTarjetas,
} from "./ui-recomendaciones.js";

import { FRONTEND_VERSION } from "./config.js"; // <-- Importamos la versión

// Necesitamos una variable para guardar los datos del sensor y de OWM
let datosSensorActuales = null;
let datosOwmActuales = null;

function appIndex() {
  console.log("App de la página principal (Recomendaciones) iniciada.");

  const params = new URLSearchParams(location.search);
  const mac = params.get("mac") || "68C63A87F36C";

  actualizarEnlacesTarjetas(mac);

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
      /*
      // --------------------------------------------------
      // --- INICIO DEL BLOQUE DE DEPURACIÓN PARA VERSIÓN ---
      // --------------------------------------------------

      // PASO 1: Imprimimos el objeto 'version' completo en cuanto llega.
      // Usamos %c para darle un estilo y que sea fácil de encontrar en la consola.
      console.log(
        "%c[Depuración Footer] Datos de versión recibidos:",
        "color: purple; font-weight: bold;",
        datosSensor.version
      );

      // Verificamos que los datos y el número de versión existan
      if (datosSensor.version && datosSensor.version.numero) {
        const numeroVersion = datosSensor.version.numero;
        const versionElement = document.getElementById("app-version");

        // PASO 2: Verificamos si encontramos el elemento en el HTML y qué vamos a escribir.
        if (versionElement) {
          console.log(
            `[Depuración Footer] Elemento #app-version encontrado. Escribiendo valor: "${numeroVersion}"`
          );
          versionElement.textContent = numeroVersion;
        } else {
          // Este mensaje aparecerá si el span con id="app-version" no existe en el HTML.
          console.error(
            '[Depuración Footer] ¡ERROR! No se encontró el elemento con id="app-version" en el HTML.'
          );
        }
      } else {
        // Este mensaje aparecerá si el objeto 'version' o 'version.numero' no vienen en los datos de Firebase.
        console.warn(
          '[Depuración Footer] No se encontró la propiedad "version.numero" en los datos recibidos de Firebase.'
        );
      }

      // --- FIN DEL BLOQUE DE DEPURACIÓN ---
*/
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
  //const params = new URLSearchParams(location.search);
  //const mac = params.get("mac") || "68C63A87F36C";

  const procesarPresion = async () => {
    const resultado = await analizarTendenciaPresion(mac);
    actualizarTarjetaPresion(resultado); // Llamamos a la nueva función de UI
  };

  procesarPresion(); // La primera vez
  setInterval(procesarPresion, 60 * 60 * 1000); // Luego cada hora

  // 🧹 Poda automática al entrar a la app
  // Ejecutamos la tarea de mantenimiento una vez al cargar la página.
  // Usamos un pequeño retraso (setTimeout) para no interferir con la carga inicial de datos.
  setTimeout(() => {
    podarHistorialPresion(mac, 20); // Conservará los últimos 100 registros
  }, 5000); // Espera 5 segundos después de que la página cargue

  // Actualizamos el footer con la versión del FRONTEND
  const versionElement = document.getElementById("app-version");
  if (versionElement) {
    versionElement.textContent = FRONTEND_VERSION;
  }
}

document.addEventListener("DOMContentLoaded", appIndex);
