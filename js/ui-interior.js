// =======================================================
// 1. IMPORTACIONES
// =======================================================
import { database } from "./firebase-init.js";

import { obtenerAmbienteExterior } from "./owm-ambiente.js";
import {
  calcularSensacionTermica,
  calcularPresionNivelDelMar,
  formatearFechaCompleta,
  descripcionPuntoRocio,
  describirProbabilidadLluvia,
  generarTendencia,
} from "./utils.js";

// En la parte superior de tu archivo, junto a otros imports de Firebase
import {
  getDatabase,
  ref,
  query,
  orderByChild,
  orderByKey,
  limitToLast,
  get,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import { actualizarTarjeta } from "./ui-recomendaciones.js";

// =======================================================
// 2. ESTADO INTERNO DEL MÓDULO (Variables "Privadas")
// =======================================================
// Estas variables solo son visibles y utilizadas dentro de este archivo.
let ultimoTimestampRecibido = 0; // Se guardará en milisegundos
const UMBRAL_DESCONEXION_MS = 16 * 60 * 1000; // 16 minutos
const ZONA_HORARIA_COLOMBIA = -5;

// =======================================================
// 3. FUNCIONES DE UTILIDAD (Helpers)
// =======================================================
// Esta función es usada por OWM, así que la exportamos.
function actualizarEstadoSensor() {
  if (ultimoTimestampRecibido === 0) {
    document.getElementById("estado_sensor").textContent = "Esperando datos...";
    return;
  }

  const timestampActual = Date.now();
  const diferenciaMs = timestampActual - ultimoTimestampRecibido;

  const estadoSpan = document.getElementById("estado_sensor");

  if (diferenciaMs < UMBRAL_DESCONEXION_MS) {
    const diferenciaSegundos = Math.floor(diferenciaMs / 1000);
    estadoSpan.textContent = `En línea (hace ${diferenciaSegundos} s) ✅`;
    estadoSpan.style.color = "green";
  } else {
    const minutosPasados = Math.floor(diferenciaMs / (60 * 1000));
    estadoSpan.textContent = `Desconectado (última vez hace ${minutosPasados} min) ❌`;
    estadoSpan.style.color = "red";
  }
}

// La función para actualizar la UI exterior ahora está separada
async function actualizarClimaExteriorUI(lat, lon) {
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
    document.getElementById("ubicacion_ext").textContent = clima.ciudad + " 🌎";
    document.getElementById("condicion_ext").textContent =
      clima.condicion + "🌤️";
    document.getElementById("sensacion_ext").textContent =
      clima.sensacion + " °C 🥵";
    document.getElementById("hum_ext").textContent = clima.humedad + " % 💧";
    document.getElementById("pres_ext").textContent = clima.presion + " hPa 📈";

    // Adicionar descipcion al punto de rocio
    const rocio = clima.rocio;
    const climaOWM = clima.condicion;
    const descripcionRocio = descripcionPuntoRocio(rocio);
    const descripcion = descripcionPuntoRocio(rocio);
    const resumenFinal = `🌤️ ${climaOWM}. ❄️ ${descripcionRocio}`;
    document.getElementById("condicion_ext").textContent = resumenFinal;

    document.getElementById("rocio_ext").textContent = `${rocio.toFixed(
      1
    )} °C ❄️`;
    //document.getElementById("rocio_desc").textContent = descripcion;

    // Actualizamos la parte del Aire AQI
    document.getElementById(
      "aqi_ext"
    ).textContent = `${calidad.aqi} (${calidad.descripcion}) 🏭`;

    // Probabilidad de Lluvia
    document.getElementById("lluvia_ext").textContent =
      (clima.probLluvia * 100).toFixed(0) + " % 🌧️";

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
    if (clima.pronostico) {
      const pron = clima.pronostico;

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

// Función para la UI del SENSOR
function actualizarSensorUI(datosSensor) {
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
      sensacionActual.toFixed(1) + " °C 🌡️";
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
    presionNivelMarAct.toFixed(1) + " hPa ⛰️";

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
    document.getElementById("firmware").textContent =
      datosSensor.version.numero || "-";
  }

  if (datosSensor.latitud && datosSensor.longitud) {
    // datos para la seccion Sensor
    document.getElementById(
      "coordenadas"
    ).textContent = `${datosSensor.latitud}, ${datosSensor.longitud}`;
  }
  // FIn Seccion Estado del Sensor
}

/**
 * Obtiene y analiza el historial de presión de las últimas horas desde Firebase.
 * @param {string} macAddress - La MAC del sensor a consultar.
 * @param {number} horas - El número de horas hacia atrás para analizar (ej. 3 o 6).
 * @returns {Promise<object>} Un objeto con la tendencia, mensaje y nivel de alerta.
 */
async function analizarTendenciaPresion(macAddress, horas = 4) {
  try {
    const db = getDatabase();
    const historialRef = ref(
      db,
      `/sensores_en_tiempo_real/${macAddress}/pressure_history`
    );

    // 1. Creamos una consulta para obtener solo los últimos 'N' registros (N = horas)
    // Usamos orderByKey() porque los Push IDs de Firebase son cronológicos.
    const consulta = query(historialRef, orderByKey(), limitToLast(horas));

    // 2. Ejecutamos la consulta una sola vez con get()
    const snapshot = await get(consulta);

    if (!snapshot.exists() || snapshot.size < 2) {
      // No hay suficientes datos para calcular una tendencia.
      console.log("Calculando tendencia de presión... (datos insuficientes)");
      return { tendencia: 0, mensaje: "Calculando...", nivel: "precaucion" };
    }

    // 3. Convertimos el objeto de Firebase en un array para poder ordenarlo y accederlo
    const datosArray = [];
    snapshot.forEach((childSnapshot) => {
      datosArray.push(childSnapshot.val());
    });

    // 4. Extraemos la primera y la última lectura del periodo
    const primeraLectura = datosArray[0];
    const ultimaLectura = datosArray[datosArray.length - 1];

    const presionAnterior = primeraLectura.pressure;
    const presionReciente = ultimaLectura.pressure;

    // Calculamos la diferencia
    const diferencia = presionReciente - presionAnterior;

    console.log(
      `Análisis de tendencia de presión (${horas}h): ${presionAnterior.toFixed(
        2
      )} hPa -> ${presionReciente.toFixed(
        2
      )} hPa. Diferencia: ${diferencia.toFixed(2)} hPa`
    );

    // 5. Usamos una función de utilidad para interpretar el resultado
    return interpretarTendenciaPresion(diferencia);
  } catch (error) {
    console.error("Error al analizar la tendencia de presión:", error);
    return {
      tendencia: 0,
      mensaje: "Error al obtener datos.",
      nivel: "peligro",
    };
  }
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

// =======================================================
// 4. FUNCIÓN PÚBLICA PRINCIPAL (Punto de Entrada)
// =======================================================

// Esta es la ÚNICA función que exportamos para que main.js la pueda llamar.
export function iniciarListenerSensor() {
  // Obtenemos los parámetros de la URL
  const params = new URLSearchParams(location.search);
  const mac = params.get("mac") || "68C63A87F36C";
  const path = `/sensores_en_tiempo_real/${mac}`;
  const sensorRef = ref(database, path);

  // Variable para controlar que el setInterval se inicie una sola vez
  let owmTimerId = null;
  let presionTimerId = null; // >>> NUEVA variable de control

  // A. Listener de Firebase (para el SENSOR)
  onValue(sensorRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // ... Aquí va toda tu lógica de onValue ...
      // Actualizas la UI, llamas a calcularSensacionTermica, etc.
      console.log("Datos recibidos:", data);

      // Simplemente llama a nuestra nueva función async
      actualizarSensorUI(data);

      // B. Lógica para el Clima Exterior (OWM)
      // La primera vez que recibimos datos (y por tanto, lat/lon),
      // iniciamos el ciclo de actualización para el clima exterior.
      if (data.latitud && data.longitud && !owmTimerId) {
        console.log(
          "🌍 Obteniendo lat/lon. Iniciando ciclo de actualización de OWM."
        );

        // 1. Llama inmediatamente la primera vez
        actualizarClimaExteriorUI(data.latitud, data.longitud);
        // 2. Y luego, establece un temporizador para que se llame periódicamente
        const INTERVALO_OWM = 15 * 60 * 1000; // 15 minutos
        owmTimerId = setInterval(() => {
          actualizarClimaExteriorUI(data.latitud, data.longitud);
        }, INTERVALO_OWM);
      }

      // >>> NUEVA LÓGICA PARA LA TENDENCIA DE PRESIÓN <<<
      // Se ejecuta solo la primera vez que recibimos datos.
      if (!presionTimerId) {
        console.log("📊 Iniciando ciclo de análisis de presión.");

        // 1. Llamamos a la función inmediatamente la primera vez
        const procesarPresion = async () => {
          const resultadoTendencia = await analizarTendenciaPresion(mac);
          // Suponiendo que tienes una función para actualizar la tarjeta
          actualizarTarjeta(
            "presion",
            resultadoTendencia.icono,
            resultadoTendencia.mensaje,
            resultadoTendencia.nivel
          );
        };
        procesarPresion();

        // 2. Y luego, establecemos un temporizador para que se llame cada hora
        const INTERVALO_PRESION = 60 * 60 * 1000; // 1 hora
        presionTimerId = setInterval(procesarPresion, INTERVALO_PRESION);
      }
    }
  });

  // --- B. Inicia el temporizador periódico ---
  // Este temporizador llamará a nuestra función interna cada 10 segundos
  // para mantener el contador de "hace X segundos" actualizado, incluso
  // si no llegan nuevos datos de Firebase.
  setInterval(actualizarEstadoSensor, 10000);
}
