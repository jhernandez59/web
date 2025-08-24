// Calcular punto de rocío
export function calcularPuntoRocio(tempC, humedad) {
  const a = 17.27,
    b = 237.7;
  const alpha = (a * tempC) / (b + tempC) + Math.log(humedad / 100);
  return (b * alpha) / (a - alpha);
}

export function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function descripcionAQI(aqi) {
  switch (aqi) {
    case 1:
      return "Bueno";
    case 2:
      return "Aceptable";
    case 3:
      return "Moderado";
    case 4:
      return "Malo";
    case 5:
      return "Muy malo";
    default:
      return "Desconocido";
  }
}

/*
 * Procesa los arrays de pronóstico para extraer las probabilidades de lluvia.
 * @param {Array} hourly - El array de pronóstico por hora de la API de OWM.
 * @param {Array} daily - El array de pronóstico por día de la API de OWM.
 * @returns {Object} Un objeto con las probabilidades calculadas.
 */
export function procesarPronosticoLluviaHora(hourly, daily) {
  if (!hourly || !daily || hourly.length === 0 || daily.length < 2) {
    return { tresHoras: 0, seisHoras: 0, manana: 0 };
  }

  // Extraemos las probabilidades de las primeras 6 horas (índices 0 a 5).
  // Nos aseguramos de acceder a 'h.pop' y de usar 0 si no existe.
  const pops6Horas = hourly.slice(0, 6).map((h) => h.pop || 0);

  // Imprimimos en consola para ver exactamente qué se está procesando.
  console.log(
    "Valores de 'pop' extraídos para las próximas 6 horas:",
    pops6Horas
  );

  // Calculamos los máximos.
  const pop3h = Math.max(0, ...pops6Horas.slice(0, 3));
  const pop6h = Math.max(0, ...pops6Horas);
  const popManana = daily[1]?.pop ?? 0;

  console.log(`Cálculo de probabilidad máxima: 3h=${pop3h}, 6h=${pop6h}`);

  return {
    tresHoras: pop3h,
    seisHoras: pop6h,
    manana: popManana,
  };
}

export function generarTendencia(diferencia, unidad) {
  if (diferencia === null || isNaN(diferencia)) return ""; // No mostrar nada si no hay dato

  diferencia = parseFloat(diferencia.toFixed(2)); // Redondear a 2 decimales

  let icono = "➡️";
  let claseColor = "tendencia-estable";

  if (diferencia > 0) {
    icono = "↗️";
    claseColor = "tendencia-sube";
    diferencia = "+" + diferencia; // Añadir el signo +
  } else if (diferencia < 0) {
    icono = "↘️";
    claseColor = "tendencia-baja";
  }

  return `<span class="${claseColor}">${icono} ${diferencia} ${unidad}</span>`;
}

// Estas son "privadas" para este módulo, nadie más las necesita.
export function calcularSensacionTermica(tempC, humedad) {
  //... (código sin cambios)
  if (tempC === null || humedad === null) return "-";
  const tempF = (tempC * 9) / 5 + 32;
  if (tempF < 80 || humedad < 40) return tempC;
  let hi =
    -42.379 +
    2.04901523 * tempF +
    10.14333127 * humedad -
    0.22475541 * tempF * humedad -
    0.00683783 * tempF * tempF -
    0.05481717 * humedad * humedad +
    0.00122874 * tempF * tempF * humedad +
    0.00085282 * tempF * humedad * humedad -
    0.00000199 * tempF * tempF * humedad * humedad;
  return Math.round((((hi - 32) * 5) / 9) * 10) / 10;
}

export function calcularPresionNivelDelMar(presion, altitud) {
  return presion / Math.pow(1.0 - altitud / 44330.0, 5.255);
}

export function formatearFechaCompleta(timestamp, offsetHoras = 0) {
  // Si el valor es menor a 10^12 asumimos que está en segundos
  if (timestamp < 1e12) {
    timestamp *= 1000; // Convertimos a milisegundos
  }

  // Ajuste por zona horaria (offset en horas → ms)
  const fecha = new Date(timestamp + offsetHoras * 3600 * 1000);

  const año = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getUTCDate()).padStart(2, "0");

  const hora = String(fecha.getUTCHours()).padStart(2, "0");
  const minuto = String(fecha.getUTCMinutes()).padStart(2, "0");
  const segundo = String(fecha.getUTCSeconds()).padStart(2, "0");

  return `${año}-${mes}-${dia} ${hora}:${minuto}:${segundo}`;
}

export function descripcionPuntoRocio(rocioC) {
  if (rocioC < 10) {
    return "Aire seco y confortable. Se siente muy agradable.";
  } else if (rocioC < 15) {
    return "Aire confortable. Ideal para la mayoría.";
  } else if (rocioC < 18) {
    return "Se empieza a notar la humedad. Un poco pegajoso.";
  } else if (rocioC < 21) {
    return "Aire húmedo e incómodo. El sudor no se evapora fácilmente.";
  } else if (rocioC < 24) {
    return "Muy húmedo y opresivo. Bastante incómodo.";
  } else {
    return "Extremadamente húmedo. Como estar en una sauna.";
  }
}

/**
 * Convierte una probabilidad numérica (0.0 a 1.0) en una descripción textual.
 * @param {number} pop - La probabilidad de precipitación.
 * @returns {string} Una descripción amigable.
 */
export function describirProbabilidadLluvia(pop) {
  const porcentaje = pop * 100;
  if (porcentaje <= 10) return "🌞 Muy poco probable";
  if (porcentaje <= 30) return "🌤️ Poco probable";
  if (porcentaje <= 60) return "🌦️ Probable";
  if (porcentaje <= 80) return "🌧️ Muy probable";
  return "⛈️ Casi seguro";
}

/**
 * Convierte un valor de cambio de presión en un mensaje y nivel de alerta.
 * @param {number} diferencia - La diferencia de presión en hPa en las últimas horas.
 * @returns {object} Un objeto con el mensaje y el nivel de alerta.
 */
export function interpretarTendenciaPresion(diferencia) {
  // Estos umbrales son un buen punto de partida. Puedes ajustarlos según tu clima local.
  // Un cambio de >1.5 hPa en 3-4 horas es bastante significativo.
  if (diferencia < -1.5) {
    return {
      tendencia: diferencia,
      mensaje:
        "La presión está bajando rápidamente. Alta probabilidad de lluvia o mal tiempo. ¡Cierra las ventanas!",
      nivel: "peligro",
      icono: "🌧️",
    };
  } else if (diferencia < -0.5) {
    return {
      tendencia: diferencia,
      mensaje:
        "La presión tiende a bajar. Posibilidad de que el tiempo empeore.",
      nivel: "precaucion",
      icono: "🌦️",
    };
  } else if (diferencia > 1.5) {
    return {
      tendencia: diferencia,
      mensaje:
        "La presión está subiendo. El tiempo tiende a mejorar y estabilizarse.",
      nivel: "bueno",
      icono: "☀️",
    };
  } else {
    return {
      tendencia: diferencia,
      mensaje:
        "Presión atmosférica estable. No se esperan cambios bruscos de tiempo.",
      nivel: "bueno",
      icono: "🌤️",
    };
  }
}

/**
 * Procesa los datos de pronóstico de lluvia para generar un texto descriptivo.
 * Prioriza los datos por minuto para mayor precisión.
 *
 * @param {Array} minutely - El array de pronóstico por minuto de la API de OWM (para los próximos 60 min).
 * @param {Array} hourly - El array de pronóstico por hora, como respaldo.
 * @returns {string} Un texto descriptivo sobre la lluvia.
 */
export function procesarPronosticoLluvia(minutely, hourly) {
  // --- Caso 1: Tenemos datos por minuto (la mejor fuente) ---
  if (minutely && minutely.length > 0) {
    // Buscamos el primer minuto donde la precipitación sea mayor a 0.
    const primerMinutoConLluvia = minutely.find(
      (minuto) => minuto.precipitation > 0
    );

    if (!primerMinutoConLluvia) {
      return "No se espera precipitación en la próxima hora";
    }

    // Calculamos cuántos minutos faltan para que empiece a llover.
    const ahora = Date.now() / 1000; // Tiempo actual en segundos
    const minutosParaLlover = Math.round(
      (primerMinutoConLluvia.dt - ahora) / 60
    );

    if (minutosParaLlover <= 1) {
      // Ya está lloviendo o empieza en este instante
      const intensidad = primerMinutoConLluvia.precipitation;
      if (intensidad < 2.5) return "Llovizna o lluvia ligera en curso";
      if (intensidad < 7.6) return "Lluvia moderada en curso";
      return "Lluvia intensa en curso";
    } else {
      return `Precipitación comenzando en aprox. ${minutosParaLlover} min.`;
    }
  }

  // --- Caso 2: No hay datos por minuto, usamos el pronóstico por hora como respaldo ---
  if (hourly && hourly.length > 0) {
    const popPrimeraHora = hourly[0].pop; // Probabilidad en la primera hora
    if (popPrimeraHora > 0.3) {
      // Umbral del 30% para considerarlo relevante
      return `Prob. de lluvia: ${Math.round(popPrimeraHora * 100)} %`;
    } else {
      return "Baja probabilidad de lluvia próximamente";
    }
  }

  // --- Caso 3: No tenemos ningún dato ---
  return "Pronóstico de lluvia no disponible";
}
