// Goo.short - Service Worker para Soporte Offline y Caching (PWA)
const CACHE_NAME = 'gooshort-cache-v1';

// Recursos estáticos locales para precachear
const STATIC_RESOURCES = [
  '/',
  '/css/estilos.css',
  '/js/app.js',
  '/js/db.js',
  '/js/utils/markdown.js',
  '/js/components/generationView.js',
  '/js/components/managementView.js',
  '/js/components/analyticsView.js',
  '/js/components/campaignsView.js',
  '/js/components/settingsView.js',
  '/manifest.json',
  '/icon.svg'
];

// Evento de Instalación: Precacheado de recursos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Precachando recursos estáticos locales');
      return cache.addAll(STATIC_RESOURCES);
    }).then(() => {
      // Forzar al Service Worker en espera a convertirse en el activo
      return self.skipWaiting();
    })
  );
});

// Evento de Activación: Limpieza de cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Eliminando caché obsoleta:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Tomar el control inmediato de todas las pestañas abiertas bajo este scope
      return self.clients.claim();
    })
  );
});

// Evento de Intercepción (Fetch): Estrategia de Caching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Evitar cachear llamadas de la API de Vercel/GitHub (/api/*)
  // Las llamadas al servidor de backup o redirección deben ir directamente por red
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. Estrategia Network First (Red Primero) para el resto de peticiones locales del Frontend
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Si la red responde correctamente y es un recurso del propio origen (frontend local), actualizar la caché
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch((err) => {
        console.log('[Service Worker] Error de red. Intentando recuperar de la caché:', event.request.url);
        
        // Si falla la red (offline), buscar el recurso en la caché
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // Si no está en la caché y es una petición de navegación (recargas de la SPA offline), servir la raíz
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          
          // Si no hay respuesta en caché, propagar el error de red
          throw err;
        });
      })
  );
});
