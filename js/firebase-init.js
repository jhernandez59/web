// 1. Importaciones de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 2. Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCtXrGlTEXBzQdbYTFSE0vOEJKmYj1AAf4",
  authDomain: "esp8266-sensor-8d08f.firebaseapp.com",
  databaseURL: "https://esp8266-sensor-8d08f-default-rtdb.firebaseio.com",
  projectId: "esp8266-sensor-8d08f",
  storageBucket: "esp8266-sensor-8d08f.firebasestorage.app",
  messagingSenderId: "760893441338",
  appId: "1:760893441338:web:c2522c7eff4b97b50a3c03",
};

// 3. Inicialización
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// 4. Exportación
// Hacemos que la variable 'database' esté disponible para otros módulos.
export { database };
