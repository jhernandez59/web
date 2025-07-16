// =======================================================
// 1. IMPORTACIONES
// =======================================================
import { database } from "./firebase-init.js";
import {
  ref,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
// import { obtenerClimaExterior } from "./owm-client.js";
import { obtenerAmbienteExterior } from "./owm-ambiente.js";

// =======================================================
// 2. ESTADO INTERNO DEL MÓDULO (Variables "Privadas")
// =======================================================
// Estas variables solo son visibles y utilizadas dentro de este archivo.
let ultimoTimestampRecibido = 0; // Se guardará en milisegundos
const UMBRAL_DESCONEXION_MS = 16 * 60 * 1000; // 16 minutos

// =======================================================
// 3. FUNCIONES DE UTILIDAD (Helpers)
// =======================================================
// Esta función es usada por OWM, así que la exportamos.
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
function calcularSensacionTermica(tempC, humedad) {
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
function calcularPresionNivelDelMar(presion, altitud) {
  return presion / Math.pow(1.0 - altitud / 44330.0, 5.255);
}

function formatearFechaCompleta(timestamp, offsetHoras = 0) {
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

function descripcionPuntoRocio(rocioC) {
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
 * Función INTERNA para actualizar el estado del sensor (en línea/desconectado).
 * No necesita ser exportada porque solo se usa aquí.
 */
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

// Creamos una nueva función ASÍNCRONA para manejar la lógica de la UI
async function actualizarUI(datosSensor) {
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
  const zonaColombia = -5; //

  const fechaHora = formatearFechaCompleta(ts, zonaColombia);
  document.getElementById("ultimo_reporte").textContent = fechaHora;

  // Fin variables clima interior

  //--------------------------------
  // --- Seccion Estado del Sensor
  // Incluye la presion absoluta
  if (typeof datosSensor.actual.presion === "number") {
    document.getElementById("pres").textContent =
      datosSensor.actual.presion.toFixed(1) + " hPa 🌬️";

    if (datosSensor.estado) {
      document.getElementById("ip").textContent = datosSensor.estado.ip || "-";
      document.getElementById("rssi").textContent =
        datosSensor.estado.rssi + " dBm 📶";
      document.getElementById("firmware").textContent =
        datosSensor.version.numero || "-";
    }
  }
  // FIn Seccion Estado del Sensor

  // ---- 2. Obtiene y muestra los datos del clima exterior ----
  if (datosSensor.latitud && datosSensor.longitud) {
    // datos para la seccion Sensor
    document.getElementById(
      "coordenadas"
    ).textContent = `${datosSensor.latitud}, ${datosSensor.longitud}`;

    console.log("Pidiendo datos del clima Exterior...");

    // ¡AQUÍ ESTÁ LA MAGIA!
    // Usamos 'await' para esperar a que la promesa se resuelva.
    /*
    const datosAmbiente = await obtenerClimaExterior(
      datosSensor.latitud,
      datosSensor.longitud
    );
    */
    const datosAmbiente = await obtenerAmbienteExterior(
      datosSensor.latitud,
      datosSensor.longitud
    );

    //-----------------------------------------------------------------
    // A partir de aquí, 'datosClima' es el objeto real, no la promesa.
    if (datosAmbiente) {
      const { clima, calidad } = datosAmbiente.datosActuales;

      const datosAnteriores = datosAmbiente.datosAnteriores;
      // const { climaAnt, calidadAnt } = datosAmbiente.datosAnteriores;

      console.log("Datos del clima recibidos, actualizando UI:", clima);

      // Ahora actualizamos la UI exterior con los datos recibidos
      document.getElementById("temp_ext").textContent =
        clima.temperatura.toFixed(1) + " °C 🌡️";
      document.getElementById("ubicacion_ext").textContent =
        clima.ciudad + " 🌎";
      document.getElementById("condicion_ext").textContent =
        clima.condicion + "🌤️";
      document.getElementById("sensacion_ext").textContent =
        clima.sensacion + " °C 🥵";
      document.getElementById("hum_ext").textContent = clima.humedad + " % 💧";
      document.getElementById("pres_ext").textContent =
        clima.presion + " hPa 📈";

      // Adicionar descipcion al punto de rocio
      const rocio = clima.rocio;
      const descripcion = descripcionPuntoRocio(rocio);
      document.getElementById("rocio_ext").textContent = `${rocio.toFixed(
        1
      )} °C ❄️`;
      document.getElementById("rocio_desc").textContent = descripcion;

      // Actualizamos la parte del Aire AQI
      document.getElementById(
        "aqi_ext"
      ).textContent = `${calidad.aqi} (${calidad.descripcion}) 🏭`;

      // Probabilidad de Lluvia
      document.getElementById("lluvia_ext").textContent =
        (clima.probLluvia * 100).toFixed(0) + " % 🌧️";

      // fecha y hora ultimo reporte OWM
      const tsOWM = datosAmbiente.datosActuales.timestamp; // Un timestamp de Firebase (en segundos)

      const fechaHoraOWM = formatearFechaCompleta(tsOWM, zonaColombia);
      document.getElementById("ultimo_reporte_ext").textContent = fechaHoraOWM;

      // ... actualiza el resto de la UI exterior ...
    } else {
      console.log("No se pudieron obtener datos del clima.");
    }

    // --- Calcula y muestra las tendencias si hay datos anteriores para comparar ---//
    if (datosAmbiente.datosAnteriores) {
      console.log("Datos anteriores encontrados, calculando tendencias...");

      // Ahora que sabemos que existe, podemos desestructurarlo de forma segura.
      const datosAnteriores = datosAmbiente.datosAnteriores;

      // Calcula las diferencias
      const tempDif = clima.temperatura - datosAnteriores.clima.temperatura;
      const rocioDif = clima.rocio - datosAnteriores.clima.rocio;
      const presDif = clima.presion - datosAnteriores.clima.presion;

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
      // Esto se ejecutará la primera vez que se cargue la página.
      console.log(
        "No hay datos anteriores para calcular tendencias. Se mostrarán en la próxima actualización."
      );
      // Opcional: limpiar las tendencias viejas si las hubiera
      document.getElementById("temp_ext_trend").innerHTML = "";
      document.getElementById("rocio_ext_trend").innerHTML = "";
      document.getElementById("pres_ext_trend").innerHTML = "";
    }
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

  // --- A. Inicia el listener de Firebase ---
  onValue(sensorRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // ... Aquí va toda tu lógica de onValue ...
      // Actualizas la UI, llamas a calcularSensacionTermica, etc.
      console.log("Datos recibidos:", data);

      // Simplemente llama a nuestra nueva función async
      actualizarUI(data);
    }
  });

  // --- B. Inicia el temporizador periódico ---
  // Este temporizador llamará a nuestra función interna cada 10 segundos
  // para mantener el contador de "hace X segundos" actualizado, incluso
  // si no llegan nuevos datos de Firebase.
  setInterval(actualizarEstadoSensor, 10000);
}
