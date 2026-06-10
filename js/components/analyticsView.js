import { getAllLinks, getAllCampaigns } from '../db.js';

export function renderAnalyticsView(container) {
  container.innerHTML = `
    <div class="analytics-view-container">
      
      <!-- Analytics Header with Time Controls -->
      <!-- Analytics Header with Time Controls -->
      <div class="analytics-view-header">
        <h2>Analíticas globales</h2>
        
        <div class="time-controls" style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
          <!-- Filtro por Campaña -->
          <div class="campaign-filter-wrapper" style="margin: 0; min-width: 180px; height: 40px; position: relative; display: flex; align-items: center;">
            <select id="filter-campaign" style="width: 100%; height: 40px; padding: 8px 36px 8px 12px; font-family: var(--font-primary); font-size: 13px; border: 1px solid var(--md-sys-color-outline); border-radius: 100px; background: transparent; color: var(--md-sys-color-on-surface); outline: none; cursor: pointer; appearance: none; -webkit-appearance: none;">
              <option value="">Todas las campañas</option>
            </select>
            <label for="filter-campaign" style="position: absolute; left: 12px; top: -10px; font-family: var(--font-primary); font-size: 11px; font-weight: 500; color: var(--md-sys-color-primary); background-color: var(--md-sys-color-surface); padding: 0 4px; border-radius: 4px; pointer-events: none; z-index: 10;">Filtrar por campaña</label>
            <span class="material-symbols-outlined" style="position: absolute; right: 12px; top: 8px; pointer-events: none; font-size: 24px; color: var(--md-sys-color-on-surface-variant);">arrow_drop_down</span>
          </div>

          <!-- Period Selector (Week / Month) -->
          <div class="period-selector">
            <button class="period-btn active" id="btn-period-week">Semanal</button>
            <button class="period-btn" id="btn-period-month">Mensual</button>
          </div>
          
          <!-- Navigation (Prev / Next) -->
          <div class="navigation-controls">
            <button class="nav-arrow-btn" id="btn-prev-period" title="Periodo anterior">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <span class="date-range-display" id="date-range-display">Cargando...</span>
            <button class="nav-arrow-btn" id="btn-next-period" title="Periodo siguiente">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      <!-- KPIs Summary Card -->
      <div class="analytics-kpis-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
        <div class="kpi-card">
          <div id="kpi-clicks-badge" class="kpi-badge"></div>
          <div class="kpi-icon-container">
            <span class="material-symbols-outlined">ads_click</span>
          </div>
          <div class="kpi-data">
            <span class="kpi-value" id="global-kpi-clicks">-</span>
            <span class="kpi-label">Clics en el periodo</span>
          </div>
        </div>

        <div class="kpi-card">
          <div id="kpi-links-badge" class="kpi-badge"></div>
          <div class="kpi-icon-container" style="background-color: var(--md-sys-color-secondary-container); color: var(--md-sys-color-secondary);">
            <span class="material-symbols-outlined">link</span>
          </div>
          <div class="kpi-data">
            <span class="kpi-value" id="global-kpi-links">-</span>
            <span class="kpi-label">Enlaces creados</span>
          </div>
        </div>

        <div class="kpi-card">
          <div id="kpi-avg-badge" class="kpi-badge"></div>
          <div class="kpi-icon-container" style="background-color: var(--md-sys-color-success-container); color: var(--md-sys-color-success);">
            <span class="material-symbols-outlined">analytics</span>
          </div>
          <div class="kpi-data">
            <span class="kpi-value" id="global-kpi-avg">-</span>
            <span class="kpi-label">Promedio de clics</span>
          </div>
        </div>

        <div class="kpi-card">
          <div id="kpi-active24-badge" class="kpi-badge"></div>
          <div class="kpi-icon-container" style="background-color: #ffdad6; color: #ba1a1a;">
            <span class="material-symbols-outlined">bolt</span>
          </div>
          <div class="kpi-data">
            <span class="kpi-value" id="global-kpi-active24">-</span>
            <span class="kpi-label">Clics últimas 24h</span>
          </div>
        </div>
      </div>

      <!-- Charts Dashboard Grid -->
      <div class="charts-dashboard-grid">
        
        <!-- 1. AreaChart: Tendencia de Clics -->
        <div class="chart-card-full">
          <div class="chart-card-title">
            <span class="material-symbols-outlined g-blue">timeline</span>
            Tendencia de clics en el periodo
          </div>
          <div class="chart-wrapper" id="chart-trend">
            <div class="md-spinner"></div>
          </div>
        </div>

        <!-- 2. GeoChart: Distribución Geográfica -->
        <div class="chart-card-full">
          <div class="chart-card-title">
            <span class="material-symbols-outlined g-red">public</span>
            Geografía de las visitas (Mapa interactivo)
          </div>
          <div class="chart-wrapper" id="chart-map" style="min-height: 350px;">
            <div class="md-spinner"></div>
          </div>
        </div>

        <!-- 3. BarChart: Top 5 Enlaces -->
        <div class="chart-card-half">
          <div class="chart-card-title">
            <span class="material-symbols-outlined g-green">leaderboard</span>
            Enlaces más visitados (Top 5)
          </div>
          <div class="chart-wrapper" id="chart-links">
            <div class="md-spinner"></div>
          </div>
        </div>

        <!-- 4. PieChart: Procedencia de tráfico -->
        <div class="chart-card-half">
          <div class="chart-card-title">
            <span class="material-symbols-outlined g-blue">traffic</span>
            Orígenes de tráfico (Referentes)
          </div>
          <div class="chart-wrapper" id="chart-referrers">
            <div class="md-spinner"></div>
          </div>
        </div>

        <!-- 5. PieChart: Navegadores -->
        <div class="chart-card-half">
          <div class="chart-card-title">
            <span class="material-symbols-outlined g-yellow">explore</span>
            Navegadores
          </div>
          <div class="chart-wrapper" id="chart-browsers">
            <div class="md-spinner"></div>
          </div>
        </div>

        <!-- 6. PieChart: Sistemas Operativos -->
        <div class="chart-card-half">
          <div class="chart-card-title">
            <span class="material-symbols-outlined g-red">devices</span>
            Sistemas operativos
          </div>
          <div class="chart-wrapper" id="chart-os">
            <div class="md-spinner"></div>
          </div>
        </div>

      </div>

    </div>
  `;

  // --- Elementos del DOM ---
  const dateRangeDisplay = container.querySelector('#date-range-display');
  const btnPeriodWeek = container.querySelector('#btn-period-week');
  const btnPeriodMonth = container.querySelector('#btn-period-month');
  const btnPrevPeriod = container.querySelector('#btn-prev-period');
  const btnNextPeriod = container.querySelector('#btn-next-period');

  const globalKpiClicks = container.querySelector('#global-kpi-clicks');
  const globalKpiLinks = container.querySelector('#global-kpi-links');
  const globalKpiAvg = container.querySelector('#global-kpi-avg');
  const globalKpiActive24 = container.querySelector('#global-kpi-active24');

  const kpiClicksBadge = container.querySelector('#kpi-clicks-badge');
  const kpiLinksBadge = container.querySelector('#kpi-links-badge');
  const kpiAvgBadge = container.querySelector('#kpi-avg-badge');
  const kpiActive24Badge = container.querySelector('#kpi-active24-badge');

  // --- Estado de la navegación temporal ---
  let currentPeriod = 'semana'; // 'semana' o 'mes'
  let periodOffset = 0; // 0 = actual, -1 = anterior, etc.
  let allLinks = [];

  // --- Lógica del canal BroadcastChannel ---
  const channel = new BroadcastChannel('goo_short_realtime');
  channel.onmessage = () => {
    // Si hay clics o cambios en otras pestañas, recargar datos y redibujar
    fetchDataAndDraw();
  };

  // --- Asegurar carga de Google Charts Loader ---
  if (window.google && window.google.charts) {
    // Inicializar Google Charts paquetes
    window.google.charts.load('current', {
      packages: ['corechart', 'geochart', 'bar'],
      language: 'es'
    });
    window.google.charts.setOnLoadCallback(fetchDataAndDraw);
  } else {
    // Fallback: mostrar error si la librería falla al cargarse
    container.innerHTML = `
      <div class="error-view-container">
        <span class="material-symbols-outlined g-red" style="font-size: 64px;">wifi_off</span>
        <h2 class="error-title" style="margin-top: 16px;">Error de conexión</h2>
        <p class="error-description">
          No se pudo cargar la biblioteca de visualizaciones de Google Charts. 
          Asegúrate de estar conectado a internet.
        </p>
      </div>
    `;
    return;
  }

  // --- Controladores de eventos del Selector Temporal ---
  btnPeriodWeek.addEventListener('click', () => {
    if (currentPeriod === 'semana') return;
    currentPeriod = 'semana';
    periodOffset = 0;
    btnPeriodWeek.classList.add('active');
    btnPeriodMonth.classList.remove('active');
    fetchDataAndDraw();
  });

  btnPeriodMonth.addEventListener('click', () => {
    if (currentPeriod === 'mes') return;
    currentPeriod = 'mes';
    periodOffset = 0;
    btnPeriodMonth.classList.add('active');
    btnPeriodWeek.classList.remove('active');
    fetchDataAndDraw();
  });

  btnPrevPeriod.addEventListener('click', () => {
    periodOffset--;
    fetchDataAndDraw();
  });

  btnNextPeriod.addEventListener('click', () => {
    if (btnNextPeriod.disabled) return;
    periodOffset++;
    fetchDataAndDraw();
  });

  // Escuchar redimensionamiento de pantalla y cambio de tema para redibujar
  const handleResize = () => drawCharts();
  const handleThemeChange = () => drawCharts();

  window.addEventListener('resize', handleResize);
  window.addEventListener('theme-changed', handleThemeChange);

  // --- Carga de Datos y Redibujado de Gráficos ---

  async function loadCampaignsFilter() {
    try {
      const campaigns = await getAllCampaigns();
      const filterSelect = container.querySelector('#filter-campaign');
      if (filterSelect) {
        const currentVal = filterSelect.value;
        filterSelect.innerHTML = '<option value="">Todas las campañas</option>';
        campaigns.sort((a, b) => a.name.localeCompare(b.name));
        campaigns.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = c.name;
          filterSelect.appendChild(opt);
        });

        // Revisar si hay una campaña pre-seleccionada en sessionStorage (viene de CampaignsView)
        const preselectedCampId = sessionStorage.getItem('filter_campaign_id');
        if (preselectedCampId) {
          filterSelect.value = preselectedCampId;
          sessionStorage.removeItem('filter_campaign_id');
        } else {
          // Conservar valor actual si no hay una redirección dirigida
          filterSelect.value = currentVal;
        }
      }
    } catch (err) {
      console.error('Error al cargar campañas en filtro de analíticas:', err);
    }
  }

  const filterSelect = container.querySelector('#filter-campaign');
  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      drawCharts();
    });
  }

  async function fetchDataAndDraw() {
    try {
      await loadCampaignsFilter();
      allLinks = await getAllLinks();
      drawCharts();
    } catch (err) {
      console.error('Error al cargar enlaces para estadísticas:', err);
    }
  }

  function drawCharts() {
    // Si no estamos en la pestaña activa de Analíticas, salir para evitar errores
    if (!document.getElementById('chart-trend')) return;

    // 1. Calcular rango de fechas y controlar disponibilidad de navegación futura
    const { start, end } = getPeriodRange();
    const { start: nextStart } = getPeriodRange(periodOffset + 1);
    btnNextPeriod.disabled = nextStart.getTime() > Date.now();

    // Actualizar visor de rango de fechas en el header
    const formatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
    dateRangeDisplay.textContent = `${start.toLocaleDateString('es-ES', formatOptions)} - ${end.toLocaleDateString('es-ES', formatOptions)}`;

    const filterCampaignEl = container.querySelector('#filter-campaign');
    const selectedCampaignId = filterCampaignEl ? filterCampaignEl.value : '';

    // Filtrar enlaces en base a la campaña seleccionada
    const filteredLinks = selectedCampaignId
      ? allLinks.filter(link => link.campaigns && link.campaigns.includes(selectedCampaignId))
      : allLinks;

    // 2. Unificar visitas de todos los enlaces filtrados
    let totalVisits = [];
    filteredLinks.forEach(link => {
      if (link.visits) {
        // Enlazar cada visita con su código corto de origen
        link.visits.forEach(v => {
          totalVisits.push({ ...v, code: link.code });
        });
      }
    });

    // 3. Procesar KPIs y Tendencias Comparativas
    const nowMs = Date.now();
    const periodVisits = totalVisits.filter(v => v.timestamp >= start.getTime() && v.timestamp <= end.getTime());
    const totalClicksInPeriod = periodVisits.length;

    // Calcular el rango del periodo anterior equivalente para la comparación del badge
    const { start: startPast, end: endPast } = getPeriodRange(periodOffset - 1);

    const pastPeriodVisits = totalVisits.filter(v => v.timestamp >= startPast.getTime() && v.timestamp <= endPast.getTime());
    const totalClicksInPastPeriod = pastPeriodVisits.length;

    // A. KPIs de Clics
    globalKpiClicks.textContent = totalClicksInPeriod;
    renderBadge(kpiClicksBadge, totalClicksInPeriod, totalClicksInPastPeriod);

    // B. KPIs de Enlaces creados
    const totalLinksCreatedNow = filteredLinks.length;
    const linksCreatedInPeriod = filteredLinks.filter(l => l.created_at >= start.getTime() && l.created_at <= end.getTime()).length;
    const linksCreatedInPastPeriod = filteredLinks.filter(l => l.created_at >= startPast.getTime() && l.created_at <= endPast.getTime()).length;

    globalKpiLinks.textContent = totalLinksCreatedNow;
    renderBadge(kpiLinksBadge, linksCreatedInPeriod, linksCreatedInPastPeriod);

    // C. KPIs de Promedio de clics
    const avgClicksCurrent = totalLinksCreatedNow > 0 ? parseFloat((totalClicksInPeriod / totalLinksCreatedNow).toFixed(1)) : 0;
    const avgClicksPast = totalLinksCreatedNow > 0 ? parseFloat((totalClicksInPastPeriod / totalLinksCreatedNow).toFixed(1)) : 0;

    globalKpiAvg.textContent = avgClicksCurrent;
    renderBadge(kpiAvgBadge, avgClicksCurrent, avgClicksPast);

    // D. KPIs de Clics últimas 24h
    const activeClicks24h = totalVisits.filter(v => nowMs - v.timestamp < 24 * 60 * 60 * 1000).length;
    const activeClicks24hPast = totalVisits.filter(v => (nowMs - v.timestamp >= 24 * 60 * 60 * 1000) && (nowMs - v.timestamp < 48 * 60 * 60 * 1000)).length;

    globalKpiActive24.textContent = activeClicks24h;
    renderBadge(kpiActive24Badge, activeClicks24h, activeClicks24hPast);

    // Si no hay clics, mostrar mensaje en los contenedores y abortar gráficos
    if (totalVisits.length === 0) {
      const wrappers = container.querySelectorAll('.chart-wrapper');
      wrappers.forEach(w => {
        w.innerHTML = `<p style="font-size: 13px; color: var(--md-sys-color-outline); font-style: italic;">No hay clics registrados para graficar</p>`;
      });
      return;
    }

    // 4. Filtrar visitas del periodo activo
    // (Ya filtrado arriba para el cálculo del KPI)

    // 5. Configurar esquema de colores en base al tema
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#e3e3e3' : '#1f1f1f';
    const gridLineColor = isDark ? '#44474f' : '#e1e2ec';
    const chartAreaColor = isDark ? '#1e1f20' : '#f0f4f9';

    // Opciones estéticas Material Design
    const commonOptions = {
      backgroundColor: 'transparent',
      legend: { textStyle: { color: textColor, fontName: 'Outfit' } },
      titleTextStyle: { color: textColor, fontName: 'Outfit', fontSize: 14, bold: true },
      chartArea: { width: '85%', height: '70%' },
      animation: { startup: true, duration: 600, easing: 'out' }
    };

    // --- GRÁFICO 1: Tendencia de Clics (AreaChart) ---
    renderTrendChart(periodVisits, start, end, textColor, gridLineColor, commonOptions);

    // --- GRÁFICO 2: Geografía (GeoChart) ---
    renderGeoChart(totalVisits, isDark, commonOptions);

    // --- GRÁFICO 3: Top 5 Enlaces (BarChart) ---
    renderTopLinksChart(filteredLinks, textColor, gridLineColor, commonOptions);

    // --- GRÁFICO 4: Referentes (PieChart) ---
    renderDistributionChart(totalVisits, 'referrer', 'chart-referrers', commonOptions);

    // --- GRÁFICO 5: Navegadores (PieChart) ---
    renderDistributionChart(totalVisits, 'browser', 'chart-browsers', commonOptions);

    // --- GRÁFICO 6: Sistemas Operativos (PieChart) ---
    renderDistributionChart(totalVisits, 'os', 'chart-os', commonOptions);
  }

  // --- Funciones de Renderizado de Google Charts individuales ---

  function renderTrendChart(visits, start, end, textColor, gridColor, options) {
    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn('string', 'Fecha');
    dataTable.addColumn('number', 'Visitas');

    // Agrupar visitas por día
    const counts = {};
    visits.forEach(v => {
      const key = new Date(v.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      counts[key] = (counts[key] || 0) + 1;
    });

    // Generar secuencia completa de fechas del periodo
    const datesList = [];
    const iterator = new Date(start.getTime());
    while (iterator <= end) {
      const key = iterator.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      const label = currentPeriod === 'semana'
        ? iterator.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit' })
        : iterator.toLocaleDateString('es-ES', { day: '2-digit' });
      datesList.push({ key, label });
      iterator.setDate(iterator.getDate() + 1);
    }

    const rows = datesList.map(d => [d.label, counts[d.key] || 0]);
    dataTable.addRows(rows);

    const trendOptions = {
      ...options,
      hAxis: { textStyle: { color: textColor, fontName: 'Outfit', fontSize: 11 } },
      vAxis: {
        textStyle: { color: textColor, fontName: 'Outfit', fontSize: 11 },
        gridlines: { color: gridColor },
        baselineColor: gridColor,
        viewWindow: { min: 0 }
      },
      colors: ['#1a73e8'], // Azul Google
      chartArea: { width: '90%', height: '75%' }
    };

    const chart = new google.visualization.AreaChart(document.getElementById('chart-trend'));
    chart.draw(dataTable, trendOptions);
  }

  function renderGeoChart(visits, isDark, options) {
    // Agrupar por país
    const countryCounts = {};
    visits.forEach(v => {
      const country = v.country || 'Desconocido';
      if (country !== 'Desconocido') {
        countryCounts[country] = (countryCounts[country] || 0) + 1;
      }
    });

    const data = [['País', 'Visitas']];
    Object.entries(countryCounts).forEach(([c, val]) => {
      data.push([c, val]);
    });

    const geoTable = google.visualization.arrayToDataTable(data);
    const geoOptions = {
      backgroundColor: 'transparent',
      datalessRegionColor: isDark ? '#2a2b2d' : '#f0f4f9', // Color de países sin clics
      colorAxis: { colors: ['#c2e7ff', '#1a73e8'] }, // Gradiente azul Google
      keepAspectRatio: true,
      legend: { textStyle: { color: options.legend.textStyle.color } }
    };

    const chart = new google.visualization.GeoChart(document.getElementById('chart-map'));
    chart.draw(geoTable, geoOptions);
  }

  function renderTopLinksChart(links, textColor, gridColor, options) {
    // Ordenar y tomar los top 5
    const sorted = [...links]
      .map(l => ({ code: `/${l.code}`, clicks: l.clicks || 0 }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    const dataTable = new google.visualization.DataTable();
    dataTable.addColumn('string', 'Enlace');
    dataTable.addColumn('number', 'Clics');
    dataTable.addRows(sorted.map(s => [s.code, s.clicks]));

    const barOptions = {
      ...options,
      hAxis: {
        textStyle: { color: textColor, fontName: 'Outfit', fontSize: 11 },
        gridlines: { color: gridColor },
        baselineColor: gridColor,
        viewWindow: { min: 0 }
      },
      vAxis: { textStyle: { color: textColor, fontName: 'Outfit', fontSize: 11 } },
      colors: ['#34a853'], // Verde Google
      chartArea: { width: '80%', height: '80%' }
    };

    const chart = new google.visualization.BarChart(document.getElementById('chart-links'));
    chart.draw(dataTable, barOptions);
  }

  function renderDistributionChart(visits, key, elementId, options) {
    const frequencies = {};
    visits.forEach(v => {
      const val = v[key] || 'Desconocido';
      frequencies[val] = (frequencies[val] || 0) + 1;
    });

    const data = [[key, 'Clics']];
    Object.entries(frequencies).forEach(([name, count]) => {
      data.push([name, count]);
    });

    const dataTable = google.visualization.arrayToDataTable(data);
    const pieOptions = {
      ...options,
      pieHole: 0.45, // Transforma el pastel en una rosca (donut chart) muy moderna
      chartArea: { width: '90%', height: '80%' },
      colors: ['#1a73e8', '#ea4335', '#34a853', '#fbbc05', '#a8c7fa', '#7fcfff'] // Paleta de colores Google
    };

    const chart = new google.visualization.PieChart(document.getElementById(elementId));
    chart.draw(dataTable, pieOptions);
  }

  // --- Lógica del Rango del Período ---

  function getPeriodRange(offset = periodOffset) {
    const start = new Date();
    const end = new Date();
    
    if (currentPeriod === 'semana') {
      // Obtener el Lunes de la semana seleccionada
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1) + (offset * 7);
      
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      // Obtener el inicio y fin del mes seleccionado
      start.setMonth(start.getMonth() + offset);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      
      end.setMonth(start.getMonth() + 1);
      end.setDate(0); // Último día del mes anterior
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  }

  // --- Desmontaje del Componente (Limpieza de listeners) ---
  // Reemplazamos la navegación para limpiar eventos y evitar acumulaciones
  const observer = new MutationObserver(() => {
    if (!document.getElementById('chart-trend')) {
      // La pestaña se desmontó, remover los event listeners globales
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('theme-changed', handleThemeChange);
      channel.close();
      observer.disconnect();
    }
  });
  observer.observe(container, { childList: true });
}

// Dibuja un badge de comparación de métricas vs periodo pasado
function renderBadge(element, actual, past) {
  if (!element) return;
  
  let diff = actual - past;
  let percent = 0;
  
  if (past > 0) {
    percent = Math.round((diff / past) * 100);
  } else if (actual > 0) {
    percent = 100; // Incremento del 100% si el periodo pasado fue 0 y el actual tiene datos
  }

  // Limpiar clases previas
  element.className = 'kpi-badge';
  
  let trendIcon = '';
  let trendText = '';

  if (diff > 0) {
    element.classList.add('up');
    trendIcon = 'trending_up';
    trendText = `+${percent}%`;
  } else if (diff < 0) {
    element.classList.add('down');
    trendIcon = 'trending_down';
    trendText = `${percent}%`; // percent ya será negativo
  } else {
    element.classList.add('neutral');
    trendIcon = 'trending_flat';
    trendText = '0%';
  }

  element.innerHTML = `
    <span class="material-symbols-outlined">${trendIcon}</span>
    <span>${trendText}</span>
  `;
}

// Escapar caracteres HTML para XSS
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
