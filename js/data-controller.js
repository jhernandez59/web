// =======================================================
// ARCHIVO: data-controller.js
// RESPONSABILIDAD: Gestionar la obtención de datos de Firebase.
// NO DEBE TOCAR EL DOM.
// =======================================================

// =======================================================
// 1. IMPORTACIONES
// =======================================================
import { database } from "./firebase-init.js";

import {
  getDatabase,
  ref,
  query,
  orderByKey,
  limitToLast,
  limitToFirst,
  get,
  onValue,
  remove,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/*
import {
  getDatabase,
  ref,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
*/

import { obtenerAmbienteExterior } from "./owm-ambiente.js";
import { interpretarTendenciaPresion } from "./utils.js";

// =======================================================
// 2. ESTADO INTERNO DEL MÓDULO (Variables "Privadas")
// =======================================================
// Estas variables solo son visibles y utilizadas dentro de este archivo.
// let ultimoTimestampRecibido = 0; // Se guardará en milisegundos
const UMBRAL_DESCONEXION_MS = 30 * 60 * 1000; // 30 minutos
const ZONA_HORARIA_COLOMBIA = -5;

// =======================================================
// 3. FUNCIONES DE LÓGICA DE DATOS
// =======================================================

/**
 * Obtiene y analiza el historial de presión de las últimas horas desde Firebase.
 * @param {string} macAddress - La MAC del sensor a consultar.
 * @param {number} horas - El número de horas hacia atrás para analizar (ej. 3 o 6).
 * @returns {Promise<object>} Un objeto con la tendencia, mensaje y nivel de alerta.
 */
export async function analizarTendenciaPresion(macAddress, horas = 4) {
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

// =======================================================
// 4. FUNCIÓN PÚBLICA PRINCIPAL (Punto de Entrada)
// =======================================================
/**
 * Inicia los listeners de datos y llama a los callbacks de UI correspondientes.
 * @param {object} callbacks - Un objeto que contiene las funciones de callback.
 * @param {function} callbacks.onSensorData - Se llama cuando llegan nuevos datos del sensor.
 * @param {function} callbacks.onOwmData - Se llama cuando llegan nuevos datos de OWM.
 * @param {function} callbacks.onEstadoUpdate - Se llama para actualizar el estado "en línea/desconectado".
 */
export function iniciarControladorDeDatos(mac, callbacks) {
  // const params = new URLSearchParams(location.search);
  // const mac = params.get("mac") || "68C63A87F36C";
  let ultimoTimestampRecibido = 0; // Se guardará en milisegundos
  const path = `/sensores_en_tiempo_real/${mac}`;
  const sensorRef = ref(database, path); // Apunta a /sensores_en_tiempo_real/{mac} en Realtime Database.

  let owmTimerId = null;

  // A. Listener de Firebase (para el SENSOR)
  onValue(sensorRef, async (snapshot) => {
    const data = snapshot.val();
    if (data) {
      console.log("Datos del sensor recibidos:", data);
      ultimoTimestampRecibido = data.actual.timestamp; // Actualizamos el timestamp para el estado

      // >> LLAMADA AL CALLBACK DE SENSOR CON LOS DATOS <<
      // Si el callback existe, le pasamos los datos.
      if (callbacks.onSensorData) {
        callbacks.onSensorData(data);
      }

      // B. Lógica para el Clima Exterior (OWM)
      if (data.latitud && data.longitud && !owmTimerId) {
        console.log("🌍 Iniciando ciclo de actualización de OWM.");

        const actactualizarYNotificarOwm = async () => {
          const datosAmbiente = await obtenerAmbienteExterior(
            data.latitud,
            data.longitud
          );

          // >> LLAMADA AL CALLBACK DE OWM <<
          // Notificamos a la UI sobre los nuevos datos de OWM
          if (datosAmbiente && callbacks.onOwmData) {
            callbacks.onOwmData(datosAmbiente);
          }
        };

        actactualizarYNotificarOwm(); // La primera vez
        const INTERVALO_OWM = 15 * 60 * 1000;
        owmTimerId = setInterval(actactualizarYNotificarOwm, INTERVALO_OWM);
      }
    }
  });

  // C. Temporizador para el estado del sensor
  if (callbacks.onEstadoUpdate) {
    setInterval(() => {
      // Calculamos el estado y lo pasamos al callback
      const ahora = Date.now();
      const desconectado =
        ahora - ultimoTimestampRecibido > UMBRAL_DESCONEXION_MS;
      const diferenciaMs = ahora - ultimoTimestampRecibido;
      callbacks.onEstadoUpdate({
        desconectado,
        diferenciaMs,
        ultimoTimestampRecibido,
      });
    }, 5000); // Se actualiza cada 5 segundos
  }
}

/**
 * Revisa el historial de presión y borra los registros más antiguos si se excede el límite.
 * Esta función es "agnóstica" a la UI, solo gestiona los datos.
 * @param {string} mac - La dirección MAC del sensor a podar.
 * @param {number} limite - El número máximo de registros a conservar.
 */
export async function podarHistorialPresion(mac, limite = 100) {
  const db = getDatabase();
  const historialRef = ref(
    db,
    `/sensores_en_tiempo_real/${mac}/pressure_history`
  );

  try {
    // 1. Primero, obtenemos una "foto" (snapshot) del historial completo para saber cuántos registros hay.
    const snapshotCompleto = await get(historialRef);

    if (!snapshotCompleto.exists()) {
      console.log("No hay historial para podar.");
      return;
    }

    const totalRegistros = snapshotCompleto.size; // Usamos .size, no .numChildren()

    if (totalRegistros <= limite) {
      console.log(
        `✅ Historial dentro del límite (${totalRegistros}/${limite}). No se necesita podar.`
      );
      return;
    }

    // 2. Calculamos cuántos registros necesitamos borrar.
    const cantidadABorrar = totalRegistros - limite;
    console.warn(
      `Se deben borrar ${cantidadABorrar} registros antiguos para cumplir el límite.`
    );

    // 3. ¡LA MAGIA! Creamos una consulta para obtener una referencia a los N registros MÁS ANTIGUOS.
    // - orderByKey() ordena por la clave de push (que es cronológica).
    // - limitToFirst(N) nos da solo los primeros N resultados de esa lista ordenada.
    const consultaParaBorrar = query(
      historialRef,
      orderByKey(),
      limitToFirst(cantidadABorrar)
    );

    // 4. Obtenemos el snapshot de los registros que vamos a borrar.
    const snapshotABorrar = await get(consultaParaBorrar);

    if (snapshotABorrar.exists()) {
      // 5. Iteramos sobre los registros a borrar y creamos una promesa de borrado para cada uno.
      const promesasDeBorrado = [];
      snapshotABorrar.forEach((childSnapshot) => {
        console.log(
          ` -> Preparando para borrar el registro con clave: ${childSnapshot.key}`
        );
        // La función remove() de v9 toma la referencia del hijo directamente.
        promesasDeBorrado.push(remove(childSnapshot.ref));
      });

      // 6. Ejecutamos todas las operaciones de borrado en paralelo.
      await Promise.all(promesasDeBorrado);
      console.log(
        `✅ Se han borrado ${cantidadABorrar} registros antiguos exitosamente.`
      );
    }
  } catch (error) {
    console.error("❌ Error al podar historial de presión:", error);
  }
}
