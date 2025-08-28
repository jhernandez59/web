// =======================================================
// ARCHIVO: ui-index.js
// RESPONSABILIDAD: Actualizar el DOM de index.html
// =======================================================
const ZONA_HORARIA_COLOMBIA = -5;

import { obtenerAmbienteExterior } from "./owm-ambiente.js";

import {
  generarTendencia,
  calcularSensacionTermica /* ...otras utils... */,
  calcularPresionNivelDelMar,
  formatearFechaCompleta,
  descripcionPuntoRocio,
  describirProbabilidadLluvia,
  procesarPronosticoLluvia,
  procesarPronosticoLluviaHora,
} from "./utils.js";

// Función para la UI del SENSOR
export function actualizarSensorUI(datosSensor) {
  // ---- 1. Actualiza la UI del sensor (código que ya tienes) ----
  document.getElementById("nombre").textContent =
    datosSensor.nombre || "Sin nombre";
  // ... actualiza temp, humedad, presión del sensor, etc. ...
  // temperartura interior
  document.getElementById("temp").textContent =
    typeof datosSensor.actual.temperatura === "number"
      ? datosSensor.actual.temperatura.toFixed(1) + " °C 🌡️"
      : "-";
  document.getElementById("temp_trend").innerHTML = generarTendencia(
    datosSensor.diferencia.temperatura,
    "en 15 min"
  );

  // Calculo de la sensacion termica
  // 1. Calcula la sensacion termica actual
  let sensacionActual = null;
  if (
    typeof datosSensor.actual.temperatura === "number" &&
    typeof datosSensor.actual.humedad === "number"
  ) {
    sensacionActual = calcularSensacionTermica(
      datosSensor.actual.temperatura,
      datosSensor.actual.humedad
    );
    document.getElementById("sensacion").textContent =
      sensacionActual.toFixed(1) + " °C 😅";
  }

  // 2. Calculo de la diferencia de sensacion termica
  let sensacionAnterior = null;
  if (
    typeof datosSensor.anterior.temperatura === "number" &&
    typeof datosSensor.anterior.humedad === "number"
  ) {
    sensacionAnterior = calcularSensacionTermica(
      datosSensor.anterior.temperatura,
      datosSensor.anterior.humedad
    );
  }

  if (
    typeof sensacionActual === "number" &&
    typeof sensacionAnterior === "number"
  ) {
    const sensacionDif = sensacionActual - sensacionAnterior;
    document.getElementById("sensacion_trend").innerHTML = generarTendencia(
      sensacionDif,
      "en 15 min"
    );
  }

  // Calculo de la humedad
  document.getElementById("hum").textContent =
    typeof datosSensor.actual.humedad === "number"
      ? datosSensor.actual.humedad.toFixed(1) + " % 💧"
      : "-";
  document.getElementById("hum_trend").innerHTML = generarTendencia(
    datosSensor.diferencia.humedad,
    "en 15 min"
  );

  // --> Calculo de la presion actual a nivel del mar
  const altitud = datosSensor.altura || 1490; // La Abadia Google Earth por ejemplo Bogotá
  const presionNivelMarAct = calcularPresionNivelDelMar(
    datosSensor.actual.presion,
    altitud
  );
  document.getElementById("pres_nivel_mar").textContent =
    presionNivelMarAct.toFixed(1) + " hPa 🏔️";

  // --> Calculo de la presion anterior a nivel del mar
  // misma altura
  const presionNivelMarAnt = calcularPresionNivelDelMar(
    datosSensor.anterior.presion,
    altitud
  );

  // diferencia de presion
  const presionNivelMarDif = presionNivelMarAct - presionNivelMarAnt;
  document.getElementById("pres_nivel_mar_trend").innerHTML = generarTendencia(
    presionNivelMarDif,
    "en 15 min"
  );

  // fecha y hora ultimo reporte
  const ts = datosSensor.actual.timestamp; // Un timestamp de Firebase (en segundos)

  const fechaHora = formatearFechaCompleta(ts, ZONA_HORARIA_COLOMBIA);
  document.getElementById("ultimo_reporte").textContent = fechaHora;

  // Fin variables clima interior

  // --------------------------------
  // --- Seccion Estado del Sensor
  // --------------------------------
  // Incluye la presion absoluta
  if (typeof datosSensor.actual.presion === "number") {
    document.getElementById("pres").textContent =
      datosSensor.actual.presion.toFixed(1) + " hPa 🌬️";
  }

  if (datosSensor.estado) {
    document.getElementById("ip").textContent = datosSensor.estado.ip || "-";
    document.getElementById("rssi").textContent =
      datosSensor.estado.rssi + " dBm 📶";
    document.getElementById(
      "firmware"
    ).textContent = `${datosSensor.version.numero} - ${datosSensor.version.clave} 🎁`;
    // datosSensor.version.numero || "-";
  }

  if (datosSensor.latitud && datosSensor.longitud) {
    // datos para la seccion Sensor
    document.getElementById(
      "coordenadas"
    ).textContent = `${datosSensor.latitud}, ${datosSensor.longitud}`;
  }
  // FIn Seccion Estado del Sensor
}

// La función para actualizar la UI exterior ahora está separada
export async function actualizarClimaExteriorUI(lat, lon) {
  console.log("🔄 Intentando actualizar UI del clima exterior...");

  const datosAmbiente = await obtenerAmbienteExterior(lat, lon);

  if (datosAmbiente && datosAmbiente.datosActuales) {
    const { clima, calidad } = datosAmbiente.datosActuales;
    const datosAnteriores = datosAmbiente.datosAnteriores;

    // --- Actualiza UI con datos actuales ---
    console.log("✅ UI Exterior: Actualizando con nuevos datos.", clima);
    // ... (todo tu código document.getElementById para temp_ext, etc.) ...

    // Ahora actualizamos la UI exterior con los datos recibidos
    document.getElementById("temp_ext").textContent =
      clima.temperatura.toFixed(1) + " °C 🌡️";

    document.getElementById("sensacion_ext").textContent =
      clima.sensacion + " °C 😅";
    document.getElementById("hum_ext").textContent = clima.humedad + " % 💧";
    document.getElementById("pres_ext").textContent = clima.presion + " hPa 🏔️";

    // Adicionar descipcion al punto de rocio
    const rocio = clima.rocio;
    document.getElementById("rocio_ext").textContent = `${rocio.toFixed(
      1
    )} °C 💦`;

    // *** Ubicacion y Descripcion
    const climaOWM = clima.condicion;
    const descripcionRocio = descripcionPuntoRocio(rocio);
    document.getElementById("ubicacion_ext").textContent =
      clima.ciudad + " 🌎" + " - ";
    document.getElementById(
      "condicion_ext"
    ).textContent = `${clima.descripcion} 🌤️`;

    document.getElementById(
      "descripcion_ext"
    ).textContent = `${descripcionRocio} ✅`;

    /*
    document.getElementById(
      "descripcion_ext"
    ).textContent = `${descripcionRocio}`;

    "rocio_ext_trend" o "descripcion_ext"
    const resumenFinal = `🌤️ ${climaOWM}. ❄️ ${descripcionRocio}`;
    

    //document.getElementById("rocio_desc").textContent = descripcion;
*/

    // Actualizamos la parte del Aire AQI
    document.getElementById(
      "aqi_ext"
    ).textContent = `${calidad.aqi} (${calidad.descripcion})`;

    // Probabilidad de Lluvia
    document.getElementById("lluvia_ext").textContent =
      (clima.probLluvia * 100).toFixed(0) + " % 🌧️";

    //>>>>
    document.getElementById("pop_1h_desc").textContent = clima.pronosticoLluvia;
    //describirProbabilidadLluvia(clima.pronosticoLluviaTexto);

    // fecha y hora ultimo reporte OWM
    const tsOWM = datosAmbiente.datosActuales.timestamp; // Un timestamp de Firebase (en segundos)

    const fechaHoraOWM = formatearFechaCompleta(tsOWM, ZONA_HORARIA_COLOMBIA);
    document.getElementById("ultimo_reporte_ext").textContent = fechaHoraOWM;

    // Fin Datos clima exterior

    // --- Actualiza tendencias si hay datos anteriores ---
    if (datosAnteriores && datosAnteriores.clima) {
      console.log("📊 UI Exterior: Calculando tendencias.");
      const climaAnterior = datosAnteriores.clima;
      // ... (tu código para calcular y mostrar las 3 tendencias) ...
      // Calcula las diferencias
      const tempDif = clima.temperatura - climaAnterior.temperatura;
      const rocioDif = clima.rocio - climaAnterior.rocio;
      const presDif = clima.presion - climaAnterior.presion;

      // 1. Tendencia de Temperatura
      document.getElementById("temp_ext_trend").innerHTML = generarTendencia(
        tempDif,
        "en 15 min"
      );

      // 2. Tendencia del Punto de Rocío
      document.getElementById("rocio_ext_trend").innerHTML = generarTendencia(
        rocioDif,
        "en 15 min"
      );

      // 3. Tendencia de Presión
      document.getElementById("pres_ext_trend").innerHTML = generarTendencia(
        presDif,
        "en 15 min"
      );
    } else {
      console.log("ℹ️ UI Exterior: Sin datos anteriores para tendencias.");
      // ... (limpia los spans de tendencia) ...
      // Opcional: limpiar las tendencias viejas si las hubiera
      document.getElementById("temp_ext_trend").innerHTML = "";
      document.getElementById("rocio_ext_trend").innerHTML = "";
      document.getElementById("pres_ext_trend").innerHTML = "";
    }

    // --- NUEVO: Actualizar la UI del Pronóstico ---
    if (clima.pronosticoLluviaHora) {
      const pron = clima.pronosticoLluviaHora;

      // Pronóstico 3 horas
      document.getElementById("pop_3h_porc").textContent =
        (pron.tresHoras * 100).toFixed(0) + " %";
      document.getElementById("pop_3h_desc").textContent =
        describirProbabilidadLluvia(pron.tresHoras);

      // Pronóstico 6 horas
      document.getElementById("pop_6h_porc").textContent =
        (pron.seisHoras * 100).toFixed(0) + " %";
      document.getElementById("pop_6h_desc").textContent =
        describirProbabilidadLluvia(pron.seisHoras);

      // Pronóstico Mañana
      document.getElementById("pop_manana_porc").textContent =
        (pron.manana * 100).toFixed(0) + " %";
      document.getElementById("pop_manana_desc").textContent =
        describirProbabilidadLluvia(pron.manana);
    }
  } else {
    console.error("❌ UI Exterior: No se recibieron datos válidos de OWM.");
  }
}

// Función para la UI del estado
export function actualizarEstadoUI({ desconectado, diferenciaMs }) {
  const estadoSpan = document.getElementById("estado_sensor");
  if (!estadoSpan) return;

  if (!desconectado) {
    const diferenciaSegundos = Math.floor(diferenciaMs / 1000);
    estadoSpan.textContent = `En línea (hace ${diferenciaSegundos} s) ✅`;
    estadoSpan.style.color = "green";
  } else {
    const minutosPasados = Math.floor(diferenciaMs / (60 * 1000));
    estadoSpan.textContent = `Desconectado (última vez hace ${minutosPasados} min) ❌`;
    estadoSpan.style.color = "red";
  }
}

/**
 * Actualiza todos los elementos de la UI específicos de la página principal (index.html).
 * @param {object} data - Los datos completos del sensor desde Firebase.
 */
export function actualizarIndexUI(data) {
  if (!data || !data.actual) return;

  // Actualizamos los elementos que SÍ existen en index.html
  document.getElementById("nombre-sensor").textContent =
    data.nombre || "Sensor";
  document.getElementById("temperatura").textContent =
    data.actual.temperatura.toFixed(1) + " °C";
  document.getElementById("humedad").textContent =
    data.actual.humedad.toFixed(1) + " %";
  document.getElementById("presion").textContent =
    data.actual.presion.toFixed(1) + " hPa";
  // ...y cualquier otro elemento específico de la página principal...

  // Guardamos el timestamp para el contador
  ultimoTimestamp = data.actual.timestamp;
  actualizarEstadoSensor(); // Llamamos una vez para actualizar el contador inmediatamente
}

/**
 * Actualiza el contador "hace X segundos" en la página principal.
 */
export function actualizarEstadoSensor() {
  if (ultimoTimestamp === 0) return;

  const ahora = Date.now();
  const diferenciaMs = ahora - ultimoTimestamp;
  const segundos = Math.round(diferenciaMs / 1000);

  const elementoTiempo = document.getElementById("hace-tiempo");
  if (elementoTiempo) {
    if (segundos < 120) {
      elementoTiempo.textContent = `hace ${segundos} segundos`;
    } else {
      elementoTiempo.textContent = `hace ${Math.round(segundos / 60)} minutos`;
    }
  }
}
