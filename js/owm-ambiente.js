// js/owm-ambiente.js
// Los datos se almacenan de forma persistente
import {
  capitalizar,
  calcularPuntoRocio,
  descripcionAQI,
  procesarPronosticoLluvia,
} from "./utils.js";
// ... resto del código ...

const apiKey = "c313eb999e2d697113ca276d4a4c4ffa";
let ultimoFetch = 0;

// Hacemos que esta función esté disponible para ser llamada desde otros archivos
export async function obtenerAmbienteExterior(lat, lon) {
  const ahora = Date.now();
  const TIEMPO_CACHE = 15 * 60 * 1000; // 15 minutos

  // --- 1. Leemos el caché desde sessionStorage ---
  const ultimoFetch = JSON.parse(sessionStorage.getItem("ultimoFetchOWM")) || 0;
  const datosCache = JSON.parse(sessionStorage.getItem("datosCacheOWM"));
  const datosAnterioresCache = JSON.parse(
    sessionStorage.getItem("datosAnterioresCacheOWM")
  );

  // --- 2. Comprobamos la validez del caché ---
  if (ahora - ultimoFetch < TIEMPO_CACHE && datosCache) {
    console.log("✅ Usando datos de ambiente cacheados desde sessionStorage.");
    return {
      datosActuales: datosCache,
      datosAnteriores: datosAnterioresCache,
    };
  }

  // --- 3. Si vamos a hacer un fetch, movemos el caché actual a "anteriores" ---
  if (datosCache) {
    console.log("📊 Moviendo caché actual a 'anteriores' en sessionStorage.");
    sessionStorage.setItem(
      "datosAnterioresCacheOWM",
      JSON.stringify(datosCache)
    );
  }

  console.log("🌤️ Obteniendo nuevos datos (OneCall + AQI + Geo)...");

  // === 1. Preparamos las NUEVAS URLs ===
  // Nota: usamos el endpoint 'onecall' y excluimos partes que no necesitamos para ahorrar datos.
  const urlOneCall = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&units=metric&lang=es&appid=${apiKey}`;
  const urlAire = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
  const urlGeo = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`;

  try {
    // === 2. Ejecutamos las peticiones EN PARALELO ===
    const [onecallRes, aireRes, geoRes] = await Promise.all([
      fetch(urlOneCall),
      fetch(urlAire),
      fetch(urlGeo),
    ]);

    // Verificamos si alguna de las respuestas falló (ej. error 404, 500)
    if (!onecallRes.ok || !aireRes.ok || !geoRes.ok) {
      throw new Error(
        `Error en API: OneCall ${onecallRes.status}, Aire ${aireRes.status}. Geo ${geoRes.status}`
      );
    }

    // === 3. Extraemos los datos JSON en paralelo ===
    const [onecallData, aireData, geoData] = await Promise.all([
      onecallRes.json(),
      aireRes.json(),
      geoRes.json(),
    ]);

    // ----> ¡AÑADE ESTA LÍNEA DE DEPURACIÓN! <----
    console.log("DATOS BRUTOS HOURLY RECIBIDOS:", onecallData.hourly);

    // === 4. Procesamos y estructuramos los datos recibidos ===

    // --- A. Procesar datos del CLIMA (ahora desde onecallData) ---
    const current = onecallData.current;

    // ¡Llamamos a nuestra nueva función helper!
    const pronosticoLluvia = procesarPronosticoLluvia(
      onecallData.hourly,
      onecallData.daily
    );

    const clima = {
      ciudad: geoData[0]?.name ?? onecallData.timezone, // OneCall da el timezone, no el nombre de ciudad
      condicion: capitalizar(current.weather?.[0]?.description ?? "-"),
      temperatura: current.temp ?? 0,
      sensacion: current.feels_like ?? 0,
      humedad: current.humidity ?? 0,
      presion: current.pressure ?? 0,
      rocio: calcularPuntoRocio(current.temp, current.humidity),
      probLluvia: onecallData.hourly[0]?.pop ?? 0, // Prob. para la hora actual
      pronostico: pronosticoLluvia, // ¡Asignamos el objeto completo!
    };

    // --- Procesar datos del AIRE (AQI) ---
    // Hacemos un chequeo de seguridad por si la respuesta de aire no trae la lista
    const itemAire = aireData.list?.[0];
    const calidad = {
      aqi: itemAire?.main?.aqi ?? 0, // Usamos optional chaining por seguridad
      descripcion: itemAire
        ? descripcionAQI(itemAire.main.aqi)
        : "No disponible",
      componentes: itemAire?.components ?? {},
    };

    // === 5. Armamos la estructura final y la guardamos en caché ===
    // Creamos el nuevo objeto de datos actuales
    const nuevosDatosActuales = {
      clima: clima,
      calidad: calidad,
      timestamp: ahora,
    };

    // --- 4. Guardamos los nuevos datos en sessionStorage ---
    console.log("💾 Guardando nuevos datos y timestamp en sessionStorage.");
    sessionStorage.setItem("ultimoFetchOWM", JSON.stringify(ahora));
    sessionStorage.setItem(
      "datosCacheOWM",
      JSON.stringify(nuevosDatosActuales)
    );

    // Leemos de nuevo los datos anteriores por si se acaban de guardar
    const datosAnterioresActualizados = JSON.parse(
      sessionStorage.getItem("datosAnterioresCacheOWM")
    );

    return {
      datosActuales: nuevosDatosActuales,
      datosAnteriores: datosAnterioresActualizados,
    };
  } catch (error) {
    console.error("❌ Error al obtener datos del ambiente exterior:", error);
    // Si algo falla (la red, una de las API, el JSON), devolvemos null
    // para que la UI sepa que no hay datos.
    return null;
  }
}
