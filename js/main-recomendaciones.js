import {
  iniciarControladorDeDatos,
  analizarTendenciaPresion,
} from "./data-controller.js";

import {
  actualizarRecomendacionesUI,
  actualizarTarjetaPresion,
} from "./ui-recomendaciones.js";

function appRecomendaciones() {
  console.log("App de recomendaciones iniciada.");

  // Creamos el objeto de callbacks para esta página
  const callbacks = {
    onSensorData: (datosSensor) => {
      // Cuando lleguen datos del sensor, los pasamos a la UI de recomendaciones
      // Necesitamos combinarlo con los datos de OWM si los tenemos.
      // Por ahora, lo dejamos simple.
      const datosFormateados = {
        sensor: datosSensor.actual,
        owm: null, // OWM se manejaría por separado
      };
      actualizarRecomendacionesUI(datosFormateados);
    },
    onOwmData: (datosOwm) => {
      // Podríamos actualizar las recomendaciones que dependen de OWM aquí
    },
    // No necesitamos onEstadoUpdate en esta página, así que no lo definimos.
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
