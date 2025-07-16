// script.js
// 1. Importaciones (sin cambios)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 2. Configuración de Firebase (sin cambios)
const firebaseConfig = {
  apiKey: "AIzaSyCtXrGlTEXBzQdbYTFSE0vOEJKmYj1AAf4",
  authDomain: "esp8266-sensor-8d08f.firebaseapp.com",
  databaseURL: "https://esp8266-sensor-8d08f-default-rtdb.firebaseio.com",
  projectId: "esp8266-sensor-8d08f",
  storageBucket: "esp8266-sensor-8d08f.firebasestorage.app",
  messagingSenderId: "760893441338",
  appId: "1:760893441338:web:c2522c7eff4b97b50a3c03",
};

// 3. Inicialización y configuración (sin cambios)
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const params = new URLSearchParams(location.search);
const mac = params.get("mac") || "68C63A87F36C";
const path = `/sensores_en_tiempo_real/${mac}`;

// Funciones de utilidad (sin cambios)
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

function calcularPresionNivelDelMar(presionAbsoluta, altitudMetros) {
  return presionAbsoluta / Math.pow(1.0 - altitudMetros / 44330.0, 5.255);
}

function generarTendencia(diferencia, unidad) {
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

// Lógica de estado del sensor
let ultimoTimestampRecibido = 0; // Se guardará en milisegundos
const UMBRAL_DESCONEXION_MS = 16 * 60 * 1000; // 16 minutos

function actualizarEstadoSensor() {
  if (ultimoTimestampRecibido === 0) {
    document.getElementById("estado_sensor").textContent = "Esperando datos...";
    return;
  }

  // --> CORRECCIÓN: Trabajamos todo en milisegundos para ser consistentes.
  const timestampActual = Date.now();
  const diferenciaMs = timestampActual - ultimoTimestampRecibido;
  const diferenciaSegundos = Math.floor(diferenciaMs / 1000);

  const estadoSpan = document.getElementById("estado_sensor");

  if (diferenciaMs < UMBRAL_DESCONEXION_MS) {
    estadoSpan.textContent = `En línea (hace ${diferenciaSegundos} s) ✅`;
    estadoSpan.style.color = "green";
  } else {
    const minutosPasados = Math.floor(diferenciaSegundos / 60);
    estadoSpan.textContent = `Desconectado (última vez hace ${minutosPasados} min) ❌`;
    estadoSpan.style.color = "red";
  }
}

// Referencia a Firebase
const sensorRef = ref(database, path);
let unsubscribe;

// Listener principal de Firebase
unsubscribe = onValue(
  sensorRef,
  (snapshot) => {
    const data = snapshot.val();
    if (data) {
      console.log("Datos recibidos:", data);

      document.getElementById("nombre").textContent =
        data.nombre || "Sin nombre";

      // temperartura interior
      document.getElementById("temp").textContent =
        typeof data.actual.temperatura === "number"
          ? data.actual.temperatura.toFixed(1) + " °C 🌡️"
          : "-";
      document.getElementById("temp_trend").innerHTML = generarTendencia(
        data.diferencia.temperatura,
        "en 15 min"
      );

      // Calculo de la sensacion termica
      let sensacionActual = null;
      if (
        typeof data.actual.temperatura === "number" &&
        typeof data.actual.humedad === "number"
      ) {
        sensacionActual = calcularSensacionTermica(
          data.actual.temperatura,
          data.actual.humedad
        );
        document.getElementById("sensacion").textContent =
          sensacionActual.toFixed(1) + " °C 🌡️";
      }

      // Calculo de la diferencia sensacion termica
      let sensacionAnterior = null;
      if (
        typeof data.anterior.temperatura === "number" &&
        typeof data.anterior.humedad === "number"
      ) {
        sensacionAnterior = calcularSensacionTermica(
          data.anterior.temperatura,
          data.anterior.humedad
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

      // humedad interior
      document.getElementById("hum").textContent =
        typeof data.actual.humedad === "number"
          ? data.actual.humedad.toFixed(1) + " % 💧"
          : "-";
      document.getElementById("hum_trend").innerHTML = generarTendencia(
        data.diferencia.humedad,
        "en 15 min"
      );

      // --> Calculo de la presion a nivel del mar
      const altitud = data.altura || 1490; // La Abadia Google Earth por ejemplo Bogotá
      const presionNivelMarAct = calcularPresionNivelDelMar(
        data.actual.presion,
        altitud
      );
      document.getElementById("pres_nivel_mar").textContent =
        presionNivelMarAct.toFixed(1) + " hPa ⛰️";

      // Tendencia presion a nivel del mar
      const presionNivelMarAnt = calcularPresionNivelDelMar(
        data.anterior.presion,
        altitud
      );

      const presionNivelMarDif = presionNivelMarAct - presionNivelMarAnt;
      document.getElementById("pres_nivel_mar_trend").innerHTML =
        generarTendencia(presionNivelMarDif, "en 15 min");

      // --- Seccion Estado
      // Incluye la presion absoluuta
      if (typeof data.actual.presion === "number") {
        document.getElementById("pres").textContent =
          data.actual.presion.toFixed(1) + " hPa 🌬️";

        if (data.estado) {
          document.getElementById("ip").textContent = data.estado.ip || "-";
          document.getElementById("rssi").textContent =
            data.estado.rssi + " dBm 📶";
          document.getElementById("firmware").textContent =
            data.version.numero || "-";
        }

        // --> CORRECCIÓN: Guardamos el timestamp en milisegundos tal como viene de Firebase
        if (data.ultimo_reporte) {
          ultimoTimestampRecibido = data.ultimo_reporte;
        }

        actualizarEstadoSensor();

        if (data.latitud && data.longitud) {
          document.getElementById(
            "coordenadas"
          ).textContent = `${data.latitud}, ${data.longitud}`;
          obtenerClimaExterior(data.latitud, data.longitud);
        }
      } else {
        // (código de "sensor no encontrado" sin cambios)
        console.warn("Sensor no encontrado o sin datos.");
      }
    }
  },
  (error) => {
    console.error("Error al leer los datos de Firebase:", error);
    document.getElementById("nombre").textContent = "Error de conexión";
  }
);

// Limpieza y temporizadores
window.addEventListener("pagehide", () => {
  if (unsubscribe) {
    console.log("Cancelando la escucha de Firebase...");
    unsubscribe();
  }
});

setInterval(actualizarEstadoSensor, 10000);

// Lógica de OpenWeatherMap
const apiKey = "c313eb999e2d697113ca276d4a4c4ffa";
let ultimoClimaTimestamp = 0; // --> MEJORA: Variable para "cachear" la llamada a la API

function obtenerClimaExterior(lat, lon) {
  const ahora = Date.now();
  // --> MEJORA: Solo llama a la API si han pasado más de 30 minutos
  if (ahora - ultimoClimaTimestamp < 1800000) {
    // 30 minutos en milisegundos
    console.log("Usando datos de clima cacheados.");
    return;
  }

  console.log("Obteniendo nuevos datos de clima exterior...");
  ultimoClimaTimestamp = ahora; // Actualiza el timestamp de la última llamada

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=es&appid=${apiKey}`;
  fetch(url)
    .then((response) => response.json())
    .then((clima) => {
      document.getElementById("temp_ext").textContent =
        clima.main.temp.toFixed(1) + " °C 🌡️";
      document.getElementById("hum_ext").textContent =
        clima.main.humidity + " % 💧";
      document.getElementById("pres_ext").textContent =
        clima.main.pressure + " hPa 🌬️";
      document.getElementById("ubicacion_ext").textContent = clima.name + " 🌎";
    })
    .catch((error) => {
      console.error("Error al consultar OpenWeatherMap:", error);
    });

  // 2. Comprueba si tenemos datos anteriores para comparar
  if (datosClimaAnterior) {
    console.log("Calculando tendencias del clima exterior...");

    // Calcula diferencias
    const tempDif = clima.main.temp - datosClimaAnterior.main.temp;
    const humDif = clima.main.humidity - datosClimaAnterior.main.humidity;
    const presDif = clima.main.pressure - datosClimaAnterior.main.pressure;

    // Muestra las tendencias usando tu función
    const intervaloMinutos = 15; // O el que hayas puesto en el if de arriba
    document.getElementById("temp_ext_trend").innerHTML = generarTendencia(
      tempDif,
      `en ${intervaloMinutos} min`
    );
    document.getElementById("hum_ext_trend").innerHTML = generarTendencia(
      humDif,
      `en ${intervaloMinutos} min`
    );
    document.getElementById("pres_ext_trend").innerHTML = generarTendencia(
      presDif,
      `en ${intervaloMinutos} min`
    );
  }
}
