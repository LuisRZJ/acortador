import { initDB, getLink, incrementClicks } from './db.js';
import { renderGenerationView } from './components/generationView.js';
import { renderManagementView } from './components/managementView.js';
import { renderAnalyticsView } from './components/analyticsView.js';
import { renderCampaignsView } from './components/campaignsView.js';
import { renderSettingsView, checkCloudSync } from './components/settingsView.js';
import { parseMarkdown } from './utils/markdown.js';

// Elementos del DOM del layout
const appView = document.getElementById('app-router-view');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

// Configuración del Tema Oscuro/Claro
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeIcon.textContent = 'light_mode';
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    themeIcon.textContent = 'dark_mode';
  }
}

themeToggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  if (currentTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
    themeIcon.textContent = 'dark_mode';
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    themeIcon.textContent = 'light_mode';
  }
  window.dispatchEvent(new Event('theme-changed'));
});


let isCheckingSync = false;

async function checkCloudSyncBackground() {
  const password = sessionStorage.getItem('cloud_backup_password');
  const status = sessionStorage.getItem('cloud_status');

  if (!password || status === 'local_only' || isCheckingSync) {
    return;
  }

  isCheckingSync = true;
  try {
    const result = await checkCloudSync(password, true); // triggerModal = true si es outdated
    if (result.status === 'synced' || result.status === 'no_cloud_backup') {
      sessionStorage.setItem('cloud_status', 'synced');
    } else if (result.status === 'unauthorized') {
      sessionStorage.removeItem('cloud_backup_password');
      sessionStorage.removeItem('cloud_status');
    }
  } catch (err) {
    console.error('Error al comprobar sincronización en segundo plano:', err);
  } finally {
    isCheckingSync = false;
  }
}

// Enrutador de la Aplicación SPA
async function router() {
  const path = window.location.pathname;

  // 1. Manejo de redirecciones de enlaces cortos
  // Si la ruta no es raíz, no es '/gestion', no es '/analiticas', no es '/ajustes', y no tiene extensión de archivo
  if (path !== '/' && path !== '/gestion' && path !== '/analiticas' && path !== '/campanas' && path !== '/ajustes' && !path.includes('.')) {
    // Activar modo redirección (ocultar barras de navegación para visitantes externos)
    document.body.classList.add('redirect-mode');
    
    // Detectar y aplicar el tema preferido del dispositivo del usuario (ignora localStorage de la app)
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', systemPrefersDark ? 'dark' : 'light');

    const code = path.substring(1); // Remover la primera barra "/"
    try {
      // Buscar el código en la base de datos local
      let link = await getLink(code);
      let fromCloud = false;

      if (!link) {
        // Fallback en la nube: buscar en el servidor
        try {
          const cloudRes = await fetch(`/api/redirect?code=${code}`);
          if (cloudRes.ok) {
            link = await cloudRes.json();
            fromCloud = true;
          }
        } catch (e) {
          console.warn('Error al realizar el fallback en la nube:', e);
        }
      }

      if (link) {
        // Recuperar configuraciones globales
        const globalMsg = localStorage.getItem('global_redirect_msg') || 'Redirigiendo a tu destino...';
        const globalDelay = parseInt(localStorage.getItem('global_redirect_delay')) || 0;
        const globalType = localStorage.getItem('global_redirect_type') || 'auto';

        // Resolver valores específicos de redirección (Prioridad: Enlace > Global)
        const redirectMsg = (link.redirect_msg !== undefined && link.redirect_msg !== null && link.redirect_msg !== '')
          ? link.redirect_msg 
          : globalMsg;

        const redirectDelay = (link.redirect_delay !== undefined && link.redirect_delay !== null && link.redirect_delay !== '')
          ? parseInt(link.redirect_delay)
          : globalDelay;

        const redirectType = link.redirect_type || globalType;

        // Formatear mensaje con soporte de Markdown simplificado
        const formattedMsg = parseMarkdown(redirectMsg);

        // Mostrar estructura base de la pantalla de redirección
        appView.innerHTML = `
          <div class="redirect-container">
            <div class="redirect-card">
              <!-- Mensaje Markdown -->
              <p style="font-size: 16px; font-weight: 400; color: var(--md-sys-color-on-surface); max-width: 100%; line-height: 1.6; margin: 0; word-break: break-word;">
                ${formattedMsg}
              </p>
              
              <!-- Contenedor del control interactivo -->
              <div id="redirect-control-area" style="width: 100%; display: flex; flex-direction: column; align-items: center; gap: 16px; min-height: 56px;">
                <div class="md-spinner" id="redirect-loader" style="width: 36px; height: 36px;"></div>
              </div>
            </div>
          </div>
        `;

        // Recopilar datos de visita e incrementar clics localmente SOLO si no proviene de la nube
        if (!fromCloud) {
          const visitData = await collectVisitData();
          await incrementClicks(code, visitData);
          
          try {
            const channel = new BroadcastChannel('goo_short_realtime');
            channel.postMessage({ type: 'VISIT_ADDED', code: code, visitData: visitData });
            channel.close();
          } catch (e) {
            console.warn('Error al transmitir en tiempo real:', e);
          }
        }

        const controlArea = appView.querySelector('#redirect-control-area');
        
        if (redirectType === 'auto') {
          // A. REDIRECCIÓN AUTOMÁTICA
          if (redirectDelay > 0) {
            let remaining = redirectDelay;
            const counterText = document.createElement('p');
            counterText.style.fontSize = '13px';
            counterText.style.color = 'var(--md-sys-color-outline)';
            counterText.style.margin = '0';
            counterText.textContent = `Redirigiendo en ${remaining} segundos...`;
            controlArea.appendChild(counterText);
            
            const timer = setInterval(() => {
              remaining--;
              if (remaining <= 0) {
                clearInterval(timer);
              } else {
                counterText.textContent = `Redirigiendo en ${remaining} segundos...`;
              }
            }, 1000);
          }
          
          setTimeout(() => {
            window.location.replace(link.original_url);
          }, redirectDelay * 1000);
          
        } else if (redirectType === 'button') {
          // B. CONFIRMACIÓN POR BOTÓN
          controlArea.innerHTML = `
            <button class="md-btn md-btn-primary redirect-btn-confirm" id="btn-confirm-redirect" disabled>
              Espera...
            </button>
          `;
          const btn = controlArea.querySelector('#btn-confirm-redirect');
          
          if (redirectDelay > 0) {
            let remaining = redirectDelay;
            btn.textContent = `Espera ${remaining}s...`;
            
            const timer = setInterval(() => {
              remaining--;
              if (remaining <= 0) {
                clearInterval(timer);
                btn.disabled = false;
                btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px;">launch</span> Continuar';
              } else {
                btn.textContent = `Espera ${remaining}s...`;
              }
            }, 1000);
          } else {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px;">launch</span> Continuar';
          }
          
          btn.addEventListener('click', () => {
            btn.disabled = true;
            btn.innerHTML = `<span class="md-spinner" style="width: 20px; height: 20px; border-width: 2px;"></span> Redirigiendo...`;
            window.location.replace(link.original_url);
          });
          
        } else if (redirectType === 'swipe') {
          // C. CONFIRMACIÓN POR DESLIZAMIENTO (SWIPE)
          controlArea.innerHTML = `
            <div class="swipe-track" id="swipe-track">
              <div class="swipe-handle disabled" id="swipe-handle" style="left: 4px;">
                <span class="material-symbols-outlined">double_arrow</span>
              </div>
              <span class="swipe-text" id="swipe-text">Espera...</span>
            </div>
          `;
          const track = controlArea.querySelector('#swipe-track');
          const handle = controlArea.querySelector('#swipe-handle');
          const text = controlArea.querySelector('#swipe-text');
          
          if (redirectDelay > 0) {
            let remaining = redirectDelay;
            text.textContent = `Espera ${remaining}s...`;
            
            const timer = setInterval(() => {
              remaining--;
              if (remaining <= 0) {
                clearInterval(timer);
                handle.classList.remove('disabled');
                text.textContent = 'Desliza para continuar';
                text.classList.add('glow');
                initSwipeRedirect(track, handle, text, link.original_url);
              } else {
                text.textContent = `Espera ${remaining}s...`;
              }
            }, 1000);
          } else {
            handle.classList.remove('disabled');
            text.textContent = 'Desliza para continuar';
            text.classList.add('glow');
            initSwipeRedirect(track, handle, text, link.original_url);
          }
        }
        return;
      } else {
        // Enlace no encontrado (Error 404)
        render404View(code);
        return;
      }
    } catch (err) {
      console.error('Error al procesar la redirección:', err);
      render404View(code);
      return;
    }
  }

  // 2. Enrutamiento normal de la SPA (Creación o Gestión)
  document.body.classList.remove('redirect-mode');
  initTheme(); // Restaurar el tema del usuario administrador

  // Comprobar sincronización en segundo plano si hay contraseña
  checkCloudSyncBackground();

  updateNavUI(path);

  if (path === '/' || path === '/index.html') {
    renderGenerationView(appView);
  } else if (path === '/gestion') {
    renderManagementView(appView, navigateTo);
  } else if (path === '/analiticas') {
    renderAnalyticsView(appView);
  } else if (path === '/campanas') {
    renderCampaignsView(appView, navigateTo);
  } else if (path === '/ajustes') {
    renderSettingsView(appView);
  } else {
    render404View();
  }
}

function closeMobileDrawer() {
  const navRail = document.getElementById('navigation-rail');
  const overlay = document.getElementById('drawer-overlay');
  if (navRail && overlay) {
    navRail.classList.remove('open');
    overlay.classList.remove('active');
  }
}

// Función para navegar sin recargar la página
function navigateTo(path) {
  closeMobileDrawer();
  window.history.pushState(null, '', path);
  router();
}

// Actualiza los estados de active en los botones de navegación (Rail)
function updateNavUI(path) {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    const itemPath = item.getAttribute('data-path');
    // Normalizar la comparación para considerar "/" e "/index.html" iguales
    const isActive = (itemPath === '/' && (path === '/' || path === '/index.html')) || itemPath === path;
    
    if (isActive) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

// Interceptar clics en los enlaces de navegación locales
function setupNavigationListeners() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const path = item.getAttribute('data-path');
      navigateTo(path);
    });
  });
}

// Vista de Error 404 integrada
function render404View(code = '') {
  updateNavUI('/404'); // Desactivar cualquier botón de nav seleccionado
  
  appView.innerHTML = `
    <div class="error-view-container">
      <div class="error-code g-blue">404</div>
      <h2 class="error-title">Enlace no encontrado</h2>
      <p class="error-description">
        ${code 
          ? `El enlace corto con el código <strong>/${escapeHTML(code)}</strong> no está registrado en el almacenamiento IndexedDB de este navegador.` 
          : 'La página que estás buscando no existe o se ha movido.'}
      </p>
      <button class="md-btn md-btn-primary" id="btn-back-home">
        <span class="material-symbols-outlined">home</span>
        Ir al creador de enlaces
      </button>
    </div>
  `;

  appView.querySelector('#btn-back-home').addEventListener('click', () => {
    navigateTo('/');
  });
}

// Escapar caracteres HTML para evitar XSS en la vista 404
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Recopila datos de visitas del usuario
async function collectVisitData() {
  const { browser, os } = parseUserAgent();
  
  // Obtener geolocalización IP en paralelo con un timeout de 350ms
  const geoData = await getIPAndLocation();
  
  let referrer = 'Directo';
  if (document.referrer) {
    try {
      const refUrl = new URL(document.referrer);
      referrer = refUrl.hostname || 'Referente Externo';
    } catch (e) {
      referrer = 'Referente Externo';
    }
  }

  return {
    timestamp: Date.now(),
    referrer: referrer,
    os: os,
    browser: browser,
    language: navigator.language || 'Desconocido',
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    ...geoData
  };
}

// Analizador de User Agent ligero para extraer SO y Navegador
function parseUserAgent() {
  const ua = navigator.userAgent;
  let browser = 'Desconocido';
  let os = 'Desconocido';

  // Navegador
  if (ua.includes('Firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('SamsungBrowser')) {
    browser = 'Samsung';
  } else if (ua.includes('Opera') || ua.includes('OPR')) {
    browser = 'Opera';
  } else if (ua.includes('Edge') || ua.includes('Edg')) {
    browser = 'Edge';
  } else if (ua.includes('Chrome')) {
    browser = 'Chrome';
  } else if (ua.includes('Safari')) {
    browser = 'Safari';
  }

  // SO
  if (ua.includes('Windows')) {
    os = 'Windows';
  } else if (ua.includes('Macintosh') || ua.includes('Mac OS X')) {
    os = 'macOS';
  } else if (ua.includes('Android')) {
    os = 'Android';
  } else if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) {
    os = 'iOS';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  }

  return { browser, os };
}

// Obtiene IP y localización aproximada con Promise.race para asegurar velocidad
async function getIPAndLocation() {
  const controller = new AbortController();
  const signal = controller.signal;

  const fetchPromise = fetch('https://freeipapi.com/api/json', { signal })
    .then(res => {
      if (!res.ok) throw new Error('Error en API IP');
      return res.json();
    })
    .then(data => ({
      ip: data.ipAddress || 'Desconocida',
      country: data.countryName || 'Desconocido',
      city: data.cityName || 'Desconocido'
    }));

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      controller.abort(); // Cancelar el fetch en red
      reject(new Error('Timeout de geolocalización'));
    }, 350); // Timeout estricto de 350ms para no retrasar la redirección
  });

  try {
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (err) {
    console.warn('Geolocalización omitida o fallida:', err.message);
    return {
      ip: 'Desconocida',
      country: 'Desconocido',
      city: 'Desconocido'
    };
  }
}

function setupMobileDrawerListeners() {
  const menuToggle = document.getElementById('menu-toggle');
  const navRail = document.getElementById('navigation-rail');
  const overlay = document.getElementById('drawer-overlay');

  if (menuToggle && navRail && overlay) {
    // Abrir menú
    menuToggle.addEventListener('click', () => {
      navRail.classList.add('open');
      overlay.classList.add('active');
    });

    // Cerrar menú al presionar overlay
    overlay.addEventListener('click', () => {
      navRail.classList.remove('open');
      overlay.classList.remove('active');
    });
  }
}

// Inicialización de la Aplicación
async function init() {
  initTheme();
  
  try {
    // Inicializar IndexedDB
    await initDB();
    console.log('IndexedDB de Goo.short inicializada correctamente');
  } catch (err) {
    console.error('Error al inicializar la base de datos local:', err);
  }

  setupNavigationListeners();
  setupMobileDrawerListeners();
  
  // Escuchar cuando el usuario navega hacia atrás/adelante en el historial
  window.addEventListener('popstate', router);

  // Registrar el Service Worker de la PWA
  registerServiceWorker();

  // Ejecutar el enrutador para cargar la página actual
  router();
}

// Arrancar la app al cargar el DOM
document.addEventListener('DOMContentLoaded', init);

// Registra el Service Worker y maneja notificaciones de actualización
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('Service Worker registrado con éxito en el scope:', registration.scope);
        
        // Comprobar si hay actualizaciones de la app
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker == null) return;
          
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // Hay contenido nuevo disponible, notificar al usuario
                showUpdateNotification();
              } else {
                console.log('El contenido se ha precacheado para usarse offline.');
              }
            }
          });
        });
      }).catch((err) => {
        console.error('Error al registrar el Service Worker:', err);
      });
    });
  }
}

// Muestra una notificación flotante cuando hay una versión nueva lista
function showUpdateNotification() {
  import('./components/settingsView.js').then(({ showStatusToast }) => {
    showStatusToast('Nueva versión de la app disponible. Actualizando...', 'success');
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }).catch(() => {
    console.log('Nueva versión de la app disponible. Actualizando...');
    window.location.reload();
  });
}

// Inicializa y gestiona la lógica táctil/ratón del deslizador Swipe para confirmar
function initSwipeRedirect(track, handle, text, destinationUrl) {
  let isDragging = false;
  let startX = 0;

  function getMaxOffset() {
    return track.offsetWidth - handle.offsetWidth - 8; // Margen de 4px a cada lado
  }

  function onStart(e) {
    if (handle.classList.contains('disabled') || handle.classList.contains('success')) return;
    isDragging = true;
    const clientX = e.pageX || (e.touches && e.touches[0].pageX);
    startX = clientX - handle.offsetLeft;
    handle.style.transition = 'none';
    handle.style.cursor = 'grabbing';
  }

  function onMove(e) {
    if (!isDragging) return;
    const clientX = e.pageX || (e.touches && e.touches[0].pageX);
    let offset = clientX - startX;
    const maxOffset = getMaxOffset();
    
    if (offset < 4) offset = 4;
    if (offset > maxOffset) offset = maxOffset;

    handle.style.left = `${offset}px`;

    // Opacidad decreciente del texto de fondo a medida que se desliza
    const progress = (offset - 4) / (maxOffset - 4);
    text.style.opacity = (1 - progress * 1.5).toString();
  }

  function onEnd() {
    if (!isDragging) return;
    isDragging = false;
    handle.style.cursor = 'grab';
    const maxOffset = getMaxOffset();
    
    if (handle.offsetLeft >= maxOffset - 6) {
      // Exito: deslizamiento completado
      handle.style.left = `${maxOffset}px`;
      handle.classList.add('success');
      track.classList.add('success');
      handle.innerHTML = '<span class="material-symbols-outlined" style="font-size: 20px;">done</span>';
      text.style.opacity = '1';
      text.textContent = '¡Confirmado!';
      
      // Bloquear interacción
      handle.style.cursor = 'default';
      
      setTimeout(() => {
        window.location.replace(destinationUrl);
      }, 400);
    } else {
      // Rebotar al inicio
      handle.style.transition = 'left 0.3s cubic-bezier(0.2, 0, 0, 1)';
      handle.style.left = '4px';
      text.style.transition = 'opacity 0.3s';
      text.style.opacity = '1';
    }
  }

  // Eventos de Escritorio (Ratón)
  handle.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);

  // Eventos Móviles (Pantalla táctil)
  handle.addEventListener('touchstart', onStart, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('touchend', onEnd, { passive: true });
}
