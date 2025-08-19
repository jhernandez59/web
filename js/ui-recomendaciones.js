// =======================================================
// ARCHIVO: ui-recomendaciones.js
// RESPONSABILIDAD: Actualizar el DOM de recomendaciones.html
// =======================================================

/**
 * Actualiza una tarjeta específica con un mensaje, icono y nivel de alerta.
 * Esta es una función "pública" que podemos reutilizar.
 * @param {string} id - El ID base de la tarjeta (ej. "confort", "presion").
 * @param {string} icono - El emoji o icono a mostrar.
 * @param {string} mensaje - El texto de la recomendación.
 * @param {string} nivel - "bueno", "precaucion" o "peligro".
 */
export function actualizarTarjeta(id, icono, mensaje, nivel) {
  const card = document.getElementById(`card-${id}`);
  if (!card) return; // Salida segura si la tarjeta no existe

  document.getElementById(`icon-${id}`).textContent = icono;
  document.getElementById(`msg-${id}`).textContent = mensaje;

  card.className = "card"; // Resetea clases
  card.classList.add(`alerta-${nivel}`); // Añade la clase de color
}

/**
 * Actualiza los enlaces de las tarjetas para que apunten a la página de detalles
 * con la MAC address correcta.
 * @param {string} macAddress - La MAC del sensor actual.
 */
export function actualizarEnlacesTarjetas(macAddress) {
  const ids = ["confort", "moho", "choque", "presion"];
  ids.forEach((id) => {
    const link = document.getElementById(`link-${id}`);
    if (link) {
      // Construimos el enlace con el parámetro de la MAC
      link.href = `detalles.html?mac=${macAddress}`;
    }
  });
}

// --- LÓGICA DE EVALUACIÓN ---
// Estas funciones son "privadas" del módulo. No necesitan ser exportadas.

function evaluarConfortTermico(temp, humedad) {
  const sensacionTermica = calcularSensacionTermica(temp, humedad);
  if (sensacionTermica > 32) {
    actualizarTarjeta(
      "confort",
      "🥵",
      `¡Mucho calor! Sensación térmica de ${sensacionTermica.toFixed(
        1
      )}°C. Considera usar aire acondicionado.`,
      "peligro"
    );
  } else if (sensacionTermica > 27) {
    actualizarTarjeta(
      "confort",
      "😅",
      `Ambiente caluroso. Sensación térmica de ${sensacionTermica.toFixed(
        1
      )}°C. Mantente hidratado.`,
      "precaucion"
    );
  } else if (temp < 18) {
    actualizarTarjeta(
      "confort",
      "🥶",
      "El ambiente está frío. Considera encender la calefacción.",
      "precaucion"
    );
  } else {
    actualizarTarjeta(
      "confort",
      "😊",
      "El confort térmico es ideal. ¡Disfruta!",
      "bueno"
    );
  }
}

function evaluarRiesgoMoho(humedadInt, humedadExt) {
  if (humedadInt > 70) {
    actualizarTarjeta(
      "moho",
      "⚠️",
      `Humedad interior muy alta (${humedadInt}%)! Riesgo de moho. Ventila urgentemente si el aire exterior es más seco.`,
      "peligro"
    );
  } else if (humedadInt > 60) {
    actualizarTarjeta(
      "moho",
      "💧",
      `Humedad interior elevada (${humedadInt}%). Es un buen momento para ventilar.`,
      "precaucion"
    );
  } else if (humedadExt && humedadInt > humedadExt + 5) {
    actualizarTarjeta(
      "moho",
      "💨",
      "El aire exterior está más seco. ¡Perfecto para abrir las ventanas y renovar el aire!",
      "bueno"
    );
  } else {
    actualizarTarjeta(
      "moho",
      "👍",
      `Niveles de humedad controlados (${humedadInt}%).`,
      "bueno"
    );
  }
}

function evaluarDiferenciaTermica(tempInt, tempExt) {
  // >>> LÍNEAS DE DEPURACIÓN <<<
  console.log(
    `Evaluando Diferencia Térmica: Interior=${tempInt}, Exterior=${tempExt}`
  );

  if (!tempExt && tempExt !== 0) {
    // Comprobamos si tempExt es null, undefined, etc. pero permitimos 0
    console.warn(
      "No hay datos de temperatura exterior. No se puede actualizar la tarjeta de Choque Térmico."
    );
    return;
  }
  // >>> FIN LINEAS DEPURACION

  const diferencia = Math.abs(tempInt - tempExt);
  if (diferencia > 10) {
    actualizarTarjeta(
      "choque",
      "🧥",
      `¡Cuidado! Hay ${diferencia.toFixed(
        1
      )}°C de diferencia con el exterior. Abrígate bien al salir.`,
      "peligro"
    );
  } else if (diferencia > 5) {
    actualizarTarjeta(
      "choque",
      "🧣",
      `Diferencia notable de ${diferencia.toFixed(
        1
      )}°C con el exterior. Tenlo en cuenta.`,
      "precaucion"
    );
  } else {
    actualizarTarjeta(
      "choque",
      "✅",
      "La temperatura es similar a la del exterior.",
      "bueno"
    );
  }
}

// --- FUNCIÓN PRINCIPAL DEL MÓDULO ---

/**
 * Función principal que recibe los datos y actualiza toda la UI de recomendaciones.
 * @param {object} datos - Objeto con datos del sensor y de OWM.
 */
export function actualizarRecomendacionesUI(datos) {
  // datos.sensor contiene los datos locales (tempInterior, humedadInterior)
  // datos.owm contiene los datos externos (tempExterior, humedadExterior)
  if (datos.sensor) {
    evaluarConfortTermico(datos.sensor.temperatura, datos.sensor.humedad);
    evaluarRiesgoMoho(
      datos.sensor.humedad,
      datos.owm ? datos.owm.humidity : null
    );

    const tempExterior = datos.owm ? datos.owm.temperatura : null;
    evaluarDiferenciaTermica(datos.sensor.temperatura, tempExterior);
  }
}

// ¡Esta función es nueva aquí! Recibe el resultado del análisis y actualiza la tarjeta.
export function actualizarTarjetaPresion(resultadoTendencia) {
  if (!resultadoTendencia) return;

  // Asumimos que interpretarTendenciaPresion ya ha añadido el icono.
  const icono = resultadoTendencia.icono || "📊";

  actualizarTarjeta(
    "presion",
    icono,
    resultadoTendencia.mensaje,
    resultadoTendencia.nivel
  );
}

// --- FUNCIONES DE UTILIDAD ---
// Estas también son "privadas" del módulo.

function calcularSensacionTermica(temperatura, humedad) {
  if (temperatura < 27) return temperatura;
  let heatIndex =
    -8.78469475556 +
    1.61139411 * temperatura +
    2.33854883889 * humedad -
    0.14611605 * temperatura * humedad -
    0.012308094 * Math.pow(temperatura, 2) -
    0.0164248277778 * Math.pow(humedad, 2) +
    0.002211732 * Math.pow(temperatura, 2) * humedad +
    0.00072546 * temperatura * Math.pow(humedad, 2) -
    0.000003582 * Math.pow(temperatura, 2) * Math.pow(humedad, 2);
  return heatIndex;
}
