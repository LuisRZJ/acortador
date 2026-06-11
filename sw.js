// Goo.short - Service Worker para Soporte Offline y Caching (PWA)
const CACHE_NAME = 'gooshort-cache-v1';

// Recursos estáticos locales para precachear
const STATIC_RESOURCES = [
  '/',
  '/index.html',
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

  // 2. Estrategia de Cache First para el resto de peticiones locales del Frontend
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Si no está en caché, buscarlo en la red
      return fetch(event.request).then((networkResponse) => {
        // No cachear respuestas inválidas o externas de terceros (ej: APIs de mapas/geolocalización externas)
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Clonar la respuesta para guardarla en caché
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch((err) => {
        // En caso de que falle la red por completo (offline) y no tengamos el recurso cacheado
        console.warn('[Service Worker] Error de red y recurso no cacheado:', event.request.url, err);
        
        // Si el usuario intentaba cargar una ruta SPA, servir el index.html cacheado
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
