// Importamos la función principal de nuestro módulo de UI
import { iniciarListenerSensor } from "./ui-interior.js";

// Importamos las funciones que necesitamos de nuestros otros módulos
import {
  actualizarRecomendacionesUI,
  actualizarTarjeta,
} from "./ui-recomendaciones.js";

// ¡Y la ejecutamos!
// Esto da inicio a toda la aplicación.
iniciarListenerSensor();
