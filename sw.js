// service worker
// archivo sw.js
const CACHE_NAME = "sensor-app-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/detalles.html",
  "/styles/recomendaciones.css",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  // Agrega aquí todos los archivos que quieras que funcionen offline
];

// Instala el Service Worker y guarda los archivos en caché
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
});

// Intercepta las peticiones y responde desde el caché si es posible
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Si el recurso está en caché, lo devuelve. Si no, lo busca en la red.
      return response || fetch(event.request);
    })
  );
});
