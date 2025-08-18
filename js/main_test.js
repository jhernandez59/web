// Importamos las funciones que necesitamos de nuestros otros módulos
import { iniciarListenerSensor } from "./ui-interior.js"; // Suponiendo que tu listener está aquí
import {
  actualizarRecomendacionesUI,
  actualizarTarjeta,
} from "./ui-recomendaciones.js";

// --- INICIO DE LA APLICACIÓN ---

// Función principal que se ejecuta cuando la página está lista.
function app() {
  console.log("Aplicación de recomendaciones iniciada.");

  // Aquí es donde llamarías a tu función que inicia la escucha de Firebase.
  // Por ahora, usaremos los datos de prueba para verificar que todo funciona.

  // SIMULACIÓN DE DATOS - Reemplaza esto con tu lógica de Firebase
  const datosDePrueba = {
    sensor: {
      temperatura: 22.5,
      humedad: 65,
    },
    owm: {
      temp: 15.0,
      humidity: 85,
    },
  };

  // Llamamos a la función principal que actualiza todas las tarjetas
  actualizarRecomendacionesUI(datosDePrueba);

  // También podemos actualizar una tarjeta individualmente (ej. la de presión)
  actualizarTarjeta(
    "presion",
    "📊",
    "Presión atmosférica estable. No se esperan cambios bruscos.",
    "bueno"
  );

  // TODO: Aquí llamarías a iniciarListenerSensor() para conectar con Firebase
  // iniciarListenerSensor();
}

// Ejecutamos la aplicación cuando el DOM esté completamente cargado.
document.addEventListener("DOMContentLoaded", app);
