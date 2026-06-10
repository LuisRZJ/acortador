import { setupMarkdownToolbar, escapeHTML } from '../utils/markdown.js';
import { getAllLinks, saveLink, clearAllLinks, getAllCampaigns, clearAllCampaigns, saveCampaign } from '../db.js';

export function renderSettingsView(container) {
  // Cargar valores de localStorage o usar predeterminados
  const currentMsg = localStorage.getItem('global_redirect_msg') || 'Redirigiendo a tu destino...';
  const currentDelay = localStorage.getItem('global_redirect_delay') || '0';
  const currentType = localStorage.getItem('global_redirect_type') || 'auto';

  container.innerHTML = `
    <div class="settings-view-container" style="max-width: 600px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 24px; animation: fadeIn 300ms var(--md-transition-timing);">
      
      <!-- Cabecera de Ajustes -->
      <div class="settings-header">
        <h2 style="font-size: 26px; font-weight: 400; color: var(--md-sys-color-on-surface);">Configuración del sistema</h2>
        <p style="font-size: 14px; color: var(--md-sys-color-on-surface-variant); margin-top: 4px;">
          Configura los valores predeterminados para el proceso de redirección de tus enlaces acortados.
        </p>
      </div>

      <!-- Tarjeta 1: Ajustes de Redirección Predeterminados -->
      <div class="md-card" style="margin: 0; max-width: 100%;">
        <form id="settings-form" style="display: flex; flex-direction: column; gap: 24px;">
          
          <!-- Mensaje Global con Toolbar -->
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 13px; font-weight: 500; color: var(--md-sys-color-primary); padding-left: 4px;">Mensaje de redirección predeterminado</label>
            <div class="markdown-editor-container">
              <div class="textarea-toolbar" id="settings-toolbar">
                <button type="button" class="toolbar-btn" data-type="bold" title="Negrita (Ctrl+B)">
                  <span class="material-symbols-outlined">format_bold</span>
                </button>
                <button type="button" class="toolbar-btn" data-type="italic" title="Cursiva (Ctrl+I)">
                  <span class="material-symbols-outlined">format_italic</span>
                </button>
                <button type="button" class="toolbar-btn" data-type="link" title="Enlace (Ctrl+K)">
                  <span class="material-symbols-outlined">link</span>
                </button>
              </div>
              <textarea id="global-redirect-msg" style="width: 100%; height: 110px; padding: 16px; border: 1px solid var(--md-sys-color-outline); border-radius: 8px; background: transparent; color: var(--md-sys-color-on-surface); font-family: var(--font-primary); font-size: 16px; outline: none; resize: none; transition: border-color var(--md-transition-duration);" placeholder="Ej: Redirigiendo a tu destino..." required>${escapeHTML(currentMsg)}</textarea>
            </div>
          </div>

          <!-- Tipo de Redirección -->
          <div class="outlined-select-field">
            <select id="global-redirect-type">
              <option value="auto" ${currentType === 'auto' ? 'selected' : ''}>Automática</option>
              <option value="button" ${currentType === 'button' ? 'selected' : ''}>Botón de confirmación</option>
              <option value="swipe" ${currentType === 'swipe' ? 'selected' : ''}>Deslizar para confirmar</option>
            </select>
            <label for="global-redirect-type">Tipo de redirección predeterminado</label>
          </div>

          <!-- Tiempo de Espera Global -->
          <div class="outlined-text-field" style="margin: 0;" id="delay-field-container">
            <input type="number" id="global-redirect-delay" value="${currentDelay}" min="0" max="30" placeholder=" " required style="width: 100%; height: 56px; padding: 16px; border: 1px solid var(--md-sys-color-outline); border-radius: 8px; background: transparent; color: var(--md-sys-color-on-surface); font-family: var(--font-primary); font-size: 16px; outline: none;">
            <label for="global-redirect-delay" id="delay-label" style="position: absolute; left: 16px; top: -10px; font-size: 12px; font-weight: 500; color: var(--md-sys-color-primary); background-color: var(--md-sys-color-surface-container); padding: 0 4px; border-radius: 4px;">Tiempo de espera predeterminado (segundos)</label>
            <div class="field-error-msg" id="delay-error-msg" style="margin-top: 4px;">El valor debe estar entre 0 y 30 segundos.</div>
          </div>

          <!-- Acciones del Formulario -->
          <div style="display: flex; justify-content: flex-end; align-items: center; gap: 16px;">
            <span id="save-status-msg" style="font-size: 13px; color: var(--md-sys-color-success); opacity: 0; transition: opacity var(--md-transition-duration); font-weight: 500; display: flex; align-items: center; gap: 4px;">
              <span class="material-symbols-outlined" style="font-size: 18px;">check_circle</span>
              Ajustes guardados correctamente
            </span>
            <button type="submit" class="md-btn md-btn-primary" id="btn-save-settings">
              <span class="material-symbols-outlined" id="save-btn-icon">save</span>
              <span id="save-btn-text">Guardar cambios</span>
            </button>
          </div>

        </form>
      </div>

      <!-- Tarjeta 2: Almacenamiento y Diagnóstico del Sistema -->
      <div class="md-card" style="margin: 0; max-width: 100%;">
        <h3 style="font-size: 18px; font-weight: 500; color: var(--md-sys-color-on-surface); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
          <span class="material-symbols-outlined g-blue" style="font-size: 24px;">database</span>
          Almacenamiento del sistema
        </h3>
        <p style="font-size: 13px; color: var(--md-sys-color-on-surface-variant); line-height: 1.5; margin-bottom: 16px;">
          La plataforma almacena tus enlaces acortados y estadísticas de clics de forma 100% local en tu navegador usando **IndexedDB**, garantizando total privacidad.
        </p>

        <!-- Desglose de Almacenamiento (IndexedDB vs LocalStorage) -->
        <div class="storage-sub-cards-container">
          
          <!-- Sub-tarjeta 1: IndexedDB -->
          <div class="storage-sub-card">
            <div class="storage-sub-card-header">
              <div class="storage-sub-card-icon">
                <span class="material-symbols-outlined" style="font-size: 20px;">database</span>
              </div>
              <h4 class="storage-sub-card-title">IndexedDB (Base de datos)</h4>
              <span class="storage-sub-card-total" id="idb-total-size">0 B</span>
            </div>
            <div class="storage-sub-card-list">
              <div class="storage-sub-card-row">
                <span class="storage-sub-card-row-label">
                  <span class="material-symbols-outlined" style="font-size: 16px; color: var(--md-sys-color-primary);">link</span>
                  Enlaces creados
                </span>
                <span class="storage-sub-card-row-value">
                  <strong id="idb-links-count">0</strong> 
                  <span class="storage-badge-key" id="idb-links-size">0 B</span>
                </span>
              </div>
              <div class="storage-sub-card-row">
                <span class="storage-sub-card-row-label">
                  <span class="material-symbols-outlined" style="font-size: 16px; color: var(--md-sys-color-primary);">campaign</span>
                  Campañas activas
                </span>
                <span class="storage-sub-card-row-value">
                  <strong id="idb-campaigns-count">0</strong> 
                  <span class="storage-badge-key" id="idb-campaigns-size">0 B</span>
                </span>
              </div>
              <div class="storage-sub-card-row">
                <span class="storage-sub-card-row-label">
                  <span class="material-symbols-outlined" style="font-size: 16px; color: var(--md-sys-color-primary);">ads_click</span>
                  Historial de visitas
                </span>
                <span class="storage-sub-card-row-value">
                  <strong id="idb-visits-count">0</strong> 
                  <span class="storage-badge-key" id="idb-visits-size">0 B</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Sub-tarjeta 2: LocalStorage -->
          <div class="storage-sub-card">
            <div class="storage-sub-card-header">
              <div class="storage-sub-card-icon" style="background-color: var(--md-sys-color-secondary-container); color: var(--md-sys-color-secondary);">
                <span class="material-symbols-outlined" style="font-size: 20px;">settings_applications</span>
              </div>
              <h4 class="storage-sub-card-title">LocalStorage (Preferencias)</h4>
              <span class="storage-sub-card-total" id="ls-total-size" style="background-color: rgba(102, 90, 111, 0.1); color: var(--md-sys-color-secondary);">0 B</span>
            </div>
            <div class="storage-sub-card-list">
              <div class="storage-sub-card-row">
                <span class="storage-sub-card-row-label">
                  <span class="material-symbols-outlined" style="font-size: 16px; color: var(--md-sys-color-secondary);">tune</span>
                  Ajustes globales
                </span>
                <span class="storage-sub-card-row-value">
                  <strong id="ls-config-count">0</strong> 
                  <span class="storage-badge-key" id="ls-config-size">0 B</span>
                </span>
              </div>
              <div class="storage-sub-card-row">
                <span class="storage-sub-card-row-label">
                  <span class="material-symbols-outlined" style="font-size: 16px; color: var(--md-sys-color-secondary);">palette</span>
                  Preferencia de tema
                </span>
                <span class="storage-sub-card-row-value">
                  <strong id="ls-theme-count">0</strong> 
                  <span class="storage-badge-key" id="ls-theme-size">0 B</span>
                </span>
              </div>
            </div>
          </div>

        </div>

        <!-- Indicador de Cuota del Navegador -->
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div class="storage-info-row" style="font-weight: 500; color: var(--md-sys-color-on-surface);">
            <span>Uso de la cuota del navegador</span>
            <span id="storage-percentage-text">0%</span>
          </div>
          <div class="md-linear-progress">
            <div class="md-linear-progress-bar" id="storage-progress-bar"></div>
          </div>
          <div class="storage-info-row">
            <span id="storage-usage-detail">Calculando cuota...</span>
            <span>Estimado nativo</span>
          </div>
        </div>

        <!-- Botones de Acción -->
        <div class="storage-actions-wrapper">
          <button class="md-btn md-btn-outlined" id="btn-export-backup" type="button" title="Descargar todos los enlaces y visitas en un archivo JSON">
            <span class="material-symbols-outlined" style="font-size: 20px;">download</span>
            Exportar copia
          </button>
          
          <label class="md-btn md-btn-outlined" id="lbl-import-backup" style="margin: 0; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;" title="Cargar enlaces desde un archivo JSON previamente exportado">
            <span class="material-symbols-outlined" style="font-size: 20px; margin-right: 8px;">upload</span>
            Importar datos
            <input type="file" id="input-import-backup" accept=".json" style="display: none;">
          </label>
          
          <button class="md-btn md-btn-primary" id="btn-reset-db" type="button" style="background-color: var(--md-sys-color-error); color: white;" title="Borrar de forma permanente todos los datos del sistema">
            <span class="material-symbols-outlined" style="font-size: 20px;">delete_forever</span>
            Restablecer sistema
          </button>
        </div>
      </div>

      <!-- Tarjeta 3: Copia de Seguridad en la Nube (GitHub) -->
      <div class="md-card" style="margin: 0; max-width: 100%;">
        <h3 style="font-size: 18px; font-weight: 500; color: var(--md-sys-color-on-surface); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
          <span class="material-symbols-outlined g-blue" style="font-size: 24px;">cloud_sync</span>
          Copia de seguridad en la nube (GitHub)
        </h3>
        <p style="font-size: 13px; color: var(--md-sys-color-on-surface-variant); line-height: 1.5; margin-bottom: 16px;">
          Respalda o recupera tus enlaces acortados, visitas y campañas en un repositorio privado de GitHub utilizando la API de Vercel.
        </p>

        <!-- Formulario de Seguridad de Backup -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div id="cloud-sync-status-badge" style="font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px; padding-left: 4px; transition: all 0.3s;"></div>
          <div class="outlined-text-field" style="margin: 0;" id="backup-password-field">
            <input type="password" id="cloud-backup-password" placeholder=" " required style="width: 100%; height: 56px; padding: 16px; border: 1px solid var(--md-sys-color-outline); border-radius: 8px; background: transparent; color: var(--md-sys-color-on-surface); font-family: var(--font-primary); font-size: 16px; outline: none;">
            <label for="cloud-backup-password">Contraseña de seguridad</label>
            <div class="field-error-msg" id="backup-password-error-msg" style="margin-top: 4px;">Ingresa la contraseña para sincronizar.</div>
          </div>

          <!-- Botones de Acción de GitHub -->
          <div class="storage-actions-wrapper" style="margin-top: 0;">
            <button class="md-btn md-btn-outlined" id="btn-cloud-backup" type="button" title="Subir todos tus datos actuales al repositorio privado de GitHub">
              <span class="material-symbols-outlined" style="font-size: 20px;">cloud_upload</span>
              Sincronizar en GitHub
            </button>
            
            <button class="md-btn md-btn-outlined" id="btn-cloud-restore" type="button" title="Descargar y restaurar tus datos guardados desde el repositorio privado de GitHub">
              <span class="material-symbols-outlined" style="font-size: 20px;">cloud_download</span>
              Restaurar desde GitHub
            </button>
          </div>
        </div>
      </div>

    </div>
  `;

  // --- Elementos del DOM ---
  const form = container.querySelector('#settings-form');
  const msgInput = container.querySelector('#global-redirect-msg');
  const delayInput = container.querySelector('#global-redirect-delay');
  const saveBtn = container.querySelector('#btn-save-settings');
  const saveBtnIcon = container.querySelector('#save-btn-icon');
  const saveBtnText = container.querySelector('#save-btn-text');
  const saveStatusMsg = container.querySelector('#save-status-msg');
  const delayErrorMsg = container.querySelector('#delay-error-msg');
  const delayFieldContainer = container.querySelector('#delay-field-container');

  const settingsToolbar = container.querySelector('#settings-toolbar');
  setupMarkdownToolbar(settingsToolbar, msgInput);

  const typeSelect = container.querySelector('#global-redirect-type');
  const delayLabel = container.querySelector('#delay-label');

  // Lógica del selector de tipo de redirección
  function updateDelayLabel() {
    if (typeSelect.value === 'auto') {
      delayLabel.textContent = 'Tiempo de espera predeterminado (segundos)';
    } else {
      delayLabel.textContent = 'Tiempo de bloqueo predeterminado (segundos)';
    }
  }

  typeSelect.addEventListener('change', updateDelayLabel);
  updateDelayLabel();

  // Estilos focus/blur
  delayInput.addEventListener('focus', () => {
    const label = delayInput.nextElementSibling;
    label.style.color = 'var(--md-sys-color-primary)';
    delayInput.style.borderColor = 'var(--md-sys-color-primary)';
    delayInput.style.borderWidth = '2px';
  });
  delayInput.addEventListener('blur', () => {
    const label = delayInput.nextElementSibling;
    label.style.color = 'var(--md-sys-color-on-surface-variant)';
    delayInput.style.borderColor = 'var(--md-sys-color-outline)';
    delayInput.style.borderWidth = '1px';
  });

  msgInput.addEventListener('focus', () => {
    msgInput.style.borderColor = 'var(--md-sys-color-primary)';
    msgInput.style.borderWidth = '2px';
  });
  msgInput.addEventListener('blur', () => {
    msgInput.style.borderColor = 'var(--md-sys-color-outline)';
    msgInput.style.borderWidth = '1px';
  });

  // Guardar Ajustes de Redirección
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const delayVal = parseInt(delayInput.value);
    
    if (isNaN(delayVal) || delayVal < 0 || delayVal > 30) {
      delayFieldContainer.classList.add('error');
      delayErrorMsg.style.display = 'block';
      return;
    }

    delayFieldContainer.classList.remove('error');
    delayErrorMsg.style.display = 'none';

    localStorage.setItem('global_redirect_msg', msgInput.value.trim());
    localStorage.setItem('global_redirect_delay', delayVal.toString());
    localStorage.setItem('global_redirect_type', typeSelect.value);

    // Feedback visual premium
    saveBtn.disabled = true;
    saveBtn.style.backgroundColor = 'var(--md-sys-color-success)';
    saveBtn.style.color = 'white';
    saveBtnIcon.textContent = 'done';
    saveBtnText.textContent = 'Guardado';
    saveStatusMsg.style.opacity = '1';

    setTimeout(() => {
      saveBtn.disabled = false;
      saveBtn.style.backgroundColor = '';
      saveBtn.style.color = '';
      saveBtnIcon.textContent = 'save';
      saveBtnText.textContent = 'Guardar cambios';
      saveStatusMsg.style.opacity = '0';
    }, 2000);
  });

  // --- Lógica avanzada de Almacenamiento y Diagnóstico ---
  
  // Elementos de la tarjeta de almacenamiento
  const btnExport = container.querySelector('#btn-export-backup');
  const inputImport = container.querySelector('#input-import-backup');
  const btnReset = container.querySelector('#btn-reset-db');

  // Utilidad interna para formatear bytes
  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  async function updateStorageStats() {
    try {
      // 1. Obtener datos de IndexedDB
      const links = await getAllLinks();
      const campaigns = await getAllCampaigns();
      
      const linksCount = links.length;
      const campaignsCount = campaigns.length;
      
      // Separar enlaces puros de las visitas embebidas
      const linksOnly = links.map(l => {
        const { visits, ...rest } = l;
        return rest;
      });
      const allVisits = links.reduce((sum, l) => sum.concat(l.visits || []), []);
      const visitsCount = allVisits.length;

      // Calcular pesos aproximados mediante serialización JSON
      const linksBlobSize = new Blob([JSON.stringify(linksOnly)]).size;
      const campaignsBlobSize = new Blob([JSON.stringify(campaigns)]).size;
      const visitsBlobSize = new Blob([JSON.stringify(allVisits)]).size;
      const idbTotalBlobSize = linksBlobSize + campaignsBlobSize + visitsBlobSize;

      // 2. Obtener datos de LocalStorage
      const configKeys = ['global_redirect_msg', 'global_redirect_delay', 'global_redirect_type'];
      let configCount = 0;
      let configSize = 0;
      configKeys.forEach(k => {
        const val = localStorage.getItem(k);
        if (val !== null) {
          configCount++;
          configSize += k.length + val.length;
        }
      });

      let themeCount = 0;
      let themeSize = 0;
      const themeVal = localStorage.getItem('theme');
      if (themeVal !== null) {
        themeCount++;
        themeSize += 'theme'.length + themeVal.length;
      }
      const lsTotalSize = configSize + themeSize;

      // 3. Renderizar métricas en el DOM
      // IDB
      container.querySelector('#idb-links-count').textContent = linksCount;
      container.querySelector('#idb-links-size').textContent = formatBytes(linksBlobSize);
      container.querySelector('#idb-campaigns-count').textContent = campaignsCount;
      container.querySelector('#idb-campaigns-size').textContent = formatBytes(campaignsBlobSize);
      container.querySelector('#idb-visits-count').textContent = visitsCount;
      container.querySelector('#idb-visits-size').textContent = formatBytes(visitsBlobSize);
      container.querySelector('#idb-total-size').textContent = formatBytes(idbTotalBlobSize);

      // LocalStorage
      container.querySelector('#ls-config-count').textContent = `${configCount}/3`;
      container.querySelector('#ls-config-size').textContent = formatBytes(configSize);
      container.querySelector('#ls-theme-count').textContent = `${themeCount}/1`;
      container.querySelector('#ls-theme-size').textContent = formatBytes(themeSize);
      container.querySelector('#ls-total-size').textContent = formatBytes(lsTotalSize);

      // 4. API de cuota global del navegador
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usageBytes = estimate.usage || 0;
        const quotaBytes = estimate.quota || 1;

        const quotaMB = Math.round(quotaBytes / (1024 * 1024));

        const percent = ((usageBytes / quotaBytes) * 100).toFixed(4);
        const displayPercent = percent < 0.01 && usageBytes > 0 ? '< 0.01%' : `${parseFloat(percent).toFixed(2)}%`;

        container.querySelector('#storage-percentage-text').textContent = displayPercent;
        container.querySelector('#storage-usage-detail').textContent = `${formatBytes(usageBytes)} de ${quotaMB} MB usados (Cuota global estimada)`;
        
        const progressBar = container.querySelector('#storage-progress-bar');
        progressBar.style.width = usageBytes > 0 ? `${Math.max(0.8, (usageBytes / quotaBytes) * 100)}%` : '0%';
      } else {
        container.querySelector('#storage-usage-detail').textContent = 'Información de cuota no disponible en este navegador';
      }
    } catch (err) {
      console.error('Error al actualizar estadísticas de almacenamiento:', err);
    }
  }

  // Carga inicial
  updateStorageStats();

  // Exportar Copia de Seguridad JSON Local
  btnExport.addEventListener('click', async () => {
    try {
      const links = await getAllLinks();
      const campaigns = await getAllCampaigns();
      const settings = {
        global_redirect_msg: localStorage.getItem('global_redirect_msg') || '',
        global_redirect_delay: localStorage.getItem('global_redirect_delay') || '0',
        global_redirect_type: localStorage.getItem('global_redirect_type') || 'auto',
        theme: localStorage.getItem('theme') || 'light'
      };

      const backupData = {
        links,
        campaigns,
        settings,
        timestamp: Date.now()
      };

      const dataStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `backup_gooshort_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showStatusToast('Copia de seguridad exportada con éxito', 'success');
    } catch (err) {
      console.error('Error al exportar datos:', err);
      showStatusToast('Error al exportar los datos del sistema', 'error');
    }
  });

  // Importar Copia de Seguridad JSON Local
  inputImport.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importedJson = JSON.parse(e.target.result);
        
        let linksArray = [];
        let campaignsArray = [];
        let settingsObj = null;

        // Comprobar si es el nuevo formato de Objeto o el antiguo de Array (retrocompatibilidad)
        if (Array.isArray(importedJson)) {
          linksArray = importedJson;
        } else if (importedJson && typeof importedJson === 'object') {
          linksArray = Array.isArray(importedJson.links) ? importedJson.links : [];
          campaignsArray = Array.isArray(importedJson.campaigns) ? importedJson.campaigns : [];
          settingsObj = importedJson.settings;
        } else {
          throw new Error('El archivo no es un respaldo válido de Goo.short.');
        }

        // 1. Importar Campañas primero (para mantener la coherencia referencial en los enlaces)
        let importedCampaignsCount = 0;
        for (const camp of campaignsArray) {
          if (camp && typeof camp === 'object' && camp.id && camp.name) {
            await saveCampaign({
              id: String(camp.id),
              name: String(camp.name),
              created_at: Number(camp.created_at) || Date.now()
            });
            importedCampaignsCount++;
          }
        }

        // 2. Importar Enlaces
        let importedLinksCount = 0;
        for (const item of linksArray) {
          if (item && typeof item === 'object' && item.code && item.original_url) {
            const cleanedItem = {
              code: String(item.code),
              original_url: String(item.original_url),
              created_at: Number(item.created_at) || Date.now(),
              clicks: Number(item.clicks) || 0,
              visits: Array.isArray(item.visits) ? item.visits : [],
              campaigns: Array.isArray(item.campaigns) ? item.campaigns.map(String) : [],
              redirect_msg: item.redirect_msg !== undefined ? String(item.redirect_msg) : undefined,
              redirect_delay: item.redirect_delay !== undefined ? Number(item.redirect_delay) : undefined,
              redirect_type: item.redirect_type !== undefined ? String(item.redirect_type) : undefined
            };
            await saveLink(cleanedItem);
            importedLinksCount++;
          }
        }

        // 3. Importar Preferencias en LocalStorage (si existen en el archivo)
        if (settingsObj && typeof settingsObj === 'object') {
          if (settingsObj.global_redirect_msg !== undefined) localStorage.setItem('global_redirect_msg', settingsObj.global_redirect_msg);
          if (settingsObj.global_redirect_delay !== undefined) localStorage.setItem('global_redirect_delay', settingsObj.global_redirect_delay);
          if (settingsObj.global_redirect_type !== undefined) localStorage.setItem('global_redirect_type', settingsObj.global_redirect_type);
          if (settingsObj.theme !== undefined) localStorage.setItem('theme', settingsObj.theme);

          // Forzar la restauración del tema si cambió
          try {
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            const themeIcon = document.getElementById('theme-icon');
            if (themeIcon) {
              themeIcon.textContent = savedTheme === 'dark' ? 'light_mode' : 'dark_mode';
            }
          } catch (e) {}
        }

        // Transmitir refresco en caliente a las grillas
        try {
          const ch = new BroadcastChannel('goo_short_realtime');
          ch.postMessage({ type: 'LINK_CREATED', link: {} });
          ch.close();
        } catch(err){}

        let successMsg = `¡Sincronizado! Se cargaron ${importedLinksCount} enlaces`;
        if (importedCampaignsCount > 0) {
          successMsg += ` y ${importedCampaignsCount} campañas`;
        }
        showStatusToast(successMsg, 'success');
        updateStorageStats();

        // Recargar para refrescar la interfaz local con las nuevas configuraciones importadas
        setTimeout(() => {
          window.location.reload();
        }, 1500);

      } catch (err) {
        console.error('Error al importar:', err);
        showStatusToast(err.message || 'Formato JSON inválido o estructura no soportada', 'error');
      } finally {
        event.target.value = ''; // Limpiar input
      }
    };
    reader.readAsText(file);
  });

  // Restablecer Base de Datos (Modal de Confirmación)
  btnReset.addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'md-dialog-overlay';
    overlay.style.zIndex = '2000';
    overlay.innerHTML = `
      <div class="md-dialog" style="max-width: 440px;">
        <h3 class="md-dialog-title" style="color: var(--md-sys-color-error); display: flex; align-items: center; gap: 8px;">
          <span class="material-symbols-outlined" style="font-size: 28px;">warning</span>
          ¿Restablecer sistema?
        </h3>
        <div class="md-dialog-content" style="color: var(--md-sys-color-on-surface-variant); font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
          Esta acción eliminará de forma permanente **todos tus enlaces acortados** y sus estadísticas de tráfico de la base de datos local IndexedDB, así como tus configuraciones globales de Ajustes.
          <br><br>
          <strong>¡Esta acción es irreversible!</strong> Te sugerimos exportar una copia de seguridad antes de proceder.
        </div>
        <div class="md-dialog-actions" style="display: flex; justify-content: flex-end; gap: 8px;">
          <button class="md-btn md-btn-outlined" id="btn-cancel-reset">Cancelar</button>
          <button class="md-btn md-btn-primary" style="background-color: var(--md-sys-color-error); color: white;" id="btn-confirm-reset">Restablecer todo</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#btn-cancel-reset').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) document.body.removeChild(overlay);
    });

    overlay.querySelector('#btn-confirm-reset').addEventListener('click', async () => {
      try {
        await clearAllLinks();
        await clearAllCampaigns();
        
        // Conservar solo el tema visual actual para no estropear la vista del usuario
        const currentTheme = localStorage.getItem('theme');
        localStorage.clear();
        if (currentTheme) {
          localStorage.setItem('theme', currentTheme);
        }

        // Transmitir borrado
        try {
          const ch = new BroadcastChannel('goo_short_realtime');
          ch.postMessage({ type: 'LINK_DELETED', code: '*' });
          ch.close();
        } catch(err){}

        document.body.removeChild(overlay);
        
        // Redirigir limpiamente a la raíz
        window.location.href = '/';
      } catch (err) {
        console.error('Error al restablecer base de datos:', err);
        showStatusToast('Error al restablecer la base de datos', 'error');
      }
    });
  });

  // --- LÓGICA DE COPIA DE SEGURIDAD EN LA NUBE (GITHUB) ---
  const backupPassInput = container.querySelector('#cloud-backup-password');
  const btnCloudBackup = container.querySelector('#btn-cloud-backup');
  const btnCloudRestore = container.querySelector('#btn-cloud-restore');
  const backupPasswordErrorMsg = container.querySelector('#backup-password-error-msg');
  const backupPasswordField = container.querySelector('#backup-password-field');
  const badge = container.querySelector('#cloud-sync-status-badge');

  async function updateSyncBadge() {
    if (!badge) return;
    const password = backupPassInput.value.trim();
    const status = sessionStorage.getItem('cloud_status');

    if (!password) {
      badge.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 18px; color: var(--md-sys-color-outline);">cloud_queue</span>
        <span style="color: var(--md-sys-color-on-surface-variant); font-size: 13px;">Ingresa tu contraseña para conectar con GitHub</span>
      `;
      return;
    }

    if (status === 'local_only') {
      badge.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 18px; color: var(--md-sys-color-error);">cloud_off</span>
        <span style="color: var(--md-sys-color-error); font-size: 13px; font-weight: 500;">Modo Local (Datos de la nube más recientes)</span>
      `;
      return;
    }

    if (status === 'synced') {
      badge.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 18px; color: var(--md-sys-color-success);">cloud_done</span>
        <span style="color: var(--md-sys-color-success); font-size: 13px; font-weight: 500;">Sincronizado y al día con la nube</span>
      `;
      return;
    }

    badge.innerHTML = `
      <span class="material-symbols-outlined" style="font-size: 18px; color: var(--md-sys-color-primary);">cloud_queue</span>
      <span style="color: var(--md-sys-color-primary); font-size: 13px;">Presiona Enter para verificar estado...</span>
    `;
  }

  async function triggerVerification(password) {
    if (!password) return;
    if (badge) {
      badge.innerHTML = `
        <span class="md-spinner" style="width: 16px; height: 16px; border-width: 2px;"></span>
        <span style="color: var(--md-sys-color-primary); font-size: 13px; margin-left: 6px;">Comprobando base de datos en la nube...</span>
      `;
    }
    const result = await checkCloudSync(password, true);
    if (result.status === 'synced' || result.status === 'no_cloud_backup') {
      sessionStorage.setItem('cloud_status', 'synced');
      sessionStorage.setItem('cloud_backup_password', password);
    } else if (result.status === 'unauthorized') {
      showStatusToast('Contraseña de seguridad incorrecta.', 'error');
      sessionStorage.removeItem('cloud_backup_password');
      sessionStorage.removeItem('cloud_status');
    } else if (result.status === 'error') {
      showStatusToast('Error al conectar con la nube: ' + result.error, 'error');
    }
    updateSyncBadge();
  }

  // Escuchar evento de cambio de estado de sincronización (por si se pulsa "Continuar en local")
  window.addEventListener('cloud-sync-status-changed', (e) => {
    updateSyncBadge();
  });

  // Cargar contraseña guardada de la sesión si existe
  if (backupPassInput) {
    backupPassInput.value = sessionStorage.getItem('cloud_backup_password') || '';
    
    // Estilos de focus/blur
    backupPassInput.addEventListener('focus', () => {
      backupPassInput.nextElementSibling.style.color = 'var(--md-sys-color-primary)';
      backupPassInput.style.borderColor = 'var(--md-sys-color-primary)';
      backupPassInput.style.borderWidth = '2px';
    });
    backupPassInput.addEventListener('blur', () => {
      backupPassInput.nextElementSibling.style.color = 'var(--md-sys-color-on-surface-variant)';
      backupPassInput.style.borderColor = 'var(--md-sys-color-outline)';
      backupPassInput.style.borderWidth = '1px';
      
      const password = backupPassInput.value.trim();
      const savedPassword = sessionStorage.getItem('cloud_backup_password');
      const status = sessionStorage.getItem('cloud_status');
      
      if (password && password !== savedPassword && status !== 'local_only') {
        triggerVerification(password);
      }
    });
    backupPassInput.addEventListener('input', () => {
      backupPasswordField.classList.remove('error');
      backupPasswordErrorMsg.style.display = 'none';
    });

    backupPassInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerVerification(backupPassInput.value.trim());
      }
    });
  }

  // Comprobación inicial al cargar la vista
  if (backupPassInput && backupPassInput.value.trim()) {
    const status = sessionStorage.getItem('cloud_status');
    if (status !== 'local_only') {
      triggerVerification(backupPassInput.value.trim());
    } else {
      updateSyncBadge();
    }
  } else {
    updateSyncBadge();
  }

  // A. RESPALDAR DATOS EN GITHUB
  if (btnCloudBackup) {
    btnCloudBackup.addEventListener('click', async () => {
      const status = sessionStorage.getItem('cloud_status');
      if (status === 'local_only') {
        showStatusToast('No se puede sincronizar: los datos de la nube son más recientes. Restaura primero.', 'error');
        return;
      }

      const password = backupPassInput.value.trim();
      if (!password) {
        backupPasswordField.classList.add('error');
        backupPasswordErrorMsg.textContent = 'Por favor, ingresa tu contraseña de seguridad.';
        backupPasswordErrorMsg.style.display = 'block';
        return;
      }

      btnCloudBackup.disabled = true;
      const originalText = btnCloudBackup.innerHTML;
      btnCloudBackup.innerHTML = `<span class="md-spinner" style="width: 18px; height: 18px; border-width: 2px;"></span> Sincronizando...`;

      try {
        const links = await getAllLinks();
        const campaigns = await getAllCampaigns();
        const settings = {
          global_redirect_msg: localStorage.getItem('global_redirect_msg') || '',
          global_redirect_delay: localStorage.getItem('global_redirect_delay') || '0',
          global_redirect_type: localStorage.getItem('global_redirect_type') || 'auto',
          theme: localStorage.getItem('theme') || 'light'
        };

        const backupPayload = {
          links,
          campaigns,
          settings,
          timestamp: Date.now()
        };

        const response = await fetch('/api/backup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-backup-password': password
          },
          body: JSON.stringify(backupPayload)
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Ocurrió un error al sincronizar con GitHub.');
        }

        // Al subir exitosamente, la base de datos local y la nube quedan sincronizadas
        // Actualizamos local_db_timestamp para reflejar que estamos al día
        const now = Date.now();
        localStorage.setItem('local_db_timestamp', now.toString());
        sessionStorage.setItem('cloud_backup_password', password);
        sessionStorage.setItem('cloud_status', 'synced');
        
        showStatusToast('¡Copia de seguridad en GitHub sincronizada!', 'success');
        updateSyncBadge();
        updateStorageStats();

      } catch (err) {
        console.error(err);
        showStatusToast(err.message, 'error');
      } finally {
        btnCloudBackup.disabled = false;
        btnCloudBackup.innerHTML = originalText;
      }
    });
  }

  // B. RESTAURAR DATOS DESDE GITHUB (MANUAL)
  if (btnCloudRestore) {
    btnCloudRestore.addEventListener('click', async () => {
      const password = backupPassInput.value.trim();
      if (!password) {
        backupPasswordField.classList.add('error');
        backupPasswordErrorMsg.textContent = 'Por favor, ingresa tu contraseña de seguridad.';
        backupPasswordErrorMsg.style.display = 'block';
        return;
      }

      // Diálogo MD3 de confirmación
      const overlay = document.createElement('div');
      overlay.className = 'md-dialog-overlay';
      overlay.style.zIndex = '2000';
      overlay.innerHTML = `
        <div class="md-dialog" style="max-width: 440px;">
          <h3 class="md-dialog-title" style="color: var(--md-sys-color-primary); display: flex; align-items: center; gap: 8px;">
            <span class="material-symbols-outlined" style="font-size: 28px;">cloud_download</span>
            ¿Restaurar desde GitHub?
          </h3>
          <div class="md-dialog-content" style="color: var(--md-sys-color-on-surface-variant); font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
            Esta acción descargará la copia de seguridad de GitHub y **sobrescribirá de forma permanente todos tus enlaces, visitas, campañas y ajustes** en este navegador.
            <br><br>
            <strong>¡Esta acción es irreversible!</strong> ¿Deseas continuar con la restauración?
          </div>
          <div class="md-dialog-actions" style="display: flex; justify-content: flex-end; gap: 8px;">
            <button class="md-btn md-btn-outlined" id="btn-cancel-cloud-restore">Cancelar</button>
            <button class="md-btn md-btn-primary" id="btn-confirm-cloud-restore">Restaurar todo</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay.querySelector('#btn-cancel-cloud-restore').addEventListener('click', () => {
        document.body.removeChild(overlay);
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) document.body.removeChild(overlay);
      });

      overlay.querySelector('#btn-confirm-cloud-restore').addEventListener('click', async () => {
        document.body.removeChild(overlay);

        btnCloudRestore.disabled = true;
        const originalText = btnCloudRestore.innerHTML;
        btnCloudRestore.innerHTML = `<span class="md-spinner" style="width: 18px; height: 18px; border-width: 2px;"></span> Descargando...`;

        try {
          const response = await fetch('/api/backup', {
            method: 'GET',
            headers: {
              'x-backup-password': password
            }
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Ocurrió un error al descargar el respaldo.');
          }

          // Limpiar IndexedDB de enlaces y campañas
          await clearAllLinks();
          await clearAllCampaigns();

          // Restaurar enlaces
          let linksCount = 0;
          if (Array.isArray(result.links)) {
            for (const link of result.links) {
              await saveLink(link);
              linksCount++;
            }
          }

          // Restaurar campañas
          let campaignsCount = 0;
          if (Array.isArray(result.campaigns)) {
            for (const camp of result.campaigns) {
              await saveCampaign(camp);
              campaignsCount++;
            }
          }

          // Restaurar LocalStorage
          if (result.settings && typeof result.settings === 'object') {
            const s = result.settings;
            if (s.global_redirect_msg !== undefined) localStorage.setItem('global_redirect_msg', s.global_redirect_msg);
            if (s.global_redirect_delay !== undefined) localStorage.setItem('global_redirect_delay', s.global_redirect_delay);
            if (s.global_redirect_type !== undefined) localStorage.setItem('global_redirect_type', s.global_redirect_type);
            if (s.theme !== undefined) localStorage.setItem('theme', s.theme);
          }

          // Actualizar el timestamp local con el timestamp de la nube
          const cloudTimestamp = result.timestamp || 0;
          localStorage.setItem('local_db_timestamp', cloudTimestamp.toString());
          sessionStorage.setItem('cloud_backup_password', password);
          sessionStorage.setItem('cloud_status', 'synced');

          // Emitir refresco en caliente
          try {
            const ch = new BroadcastChannel('goo_short_realtime');
            ch.postMessage({ type: 'LINK_CREATED', link: {} });
            ch.close();
          } catch (e) {}

          // Forzar tema
          try {
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            const themeIcon = document.getElementById('theme-icon');
            if (themeIcon) {
              themeIcon.textContent = savedTheme === 'dark' ? 'light_mode' : 'dark_mode';
            }
          } catch (e) {}

          showStatusToast(`¡Datos restaurados! (${linksCount} enlaces, ${campaignsCount} campañas)`, 'success');
          
          setTimeout(() => {
            window.location.reload();
          }, 1500);

        } catch (err) {
          console.error(err);
          showStatusToast(err.message, 'error');
        } finally {
          btnCloudRestore.disabled = false;
          btnCloudRestore.innerHTML = originalText;
        }
      });
    });
  }
}

// --- FUNCIONES CENTRALIZADAS DE SINCRONIZACIÓN ---

export async function checkCloudSync(password, triggerModal = true) {
  if (!password) return { status: 'no_password' };
  
  try {
    const response = await fetch('/api/backup', {
      method: 'GET',
      headers: {
        'x-backup-password': password
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { status: 'unauthorized' };
      }
      if (response.status === 404) {
        return { status: 'no_cloud_backup' };
      }
      throw new Error('Error al conectar con la nube.');
    }

    const cloudData = await response.json();
    const cloudTimestamp = cloudData.timestamp || 0;
    const localTimestamp = parseInt(localStorage.getItem('local_db_timestamp') || '0');

    if (cloudTimestamp > localTimestamp) {
      if (triggerModal) {
        showSyncConflictModal(cloudTimestamp, localTimestamp, password, cloudData);
      }
      return { status: 'outdated', cloudTimestamp, localTimestamp, cloudData };
    }

    return { status: 'synced', cloudTimestamp, localTimestamp };
  } catch (err) {
    console.error('Error al verificar sincronización:', err);
    return { status: 'error', error: err.message };
  }
}

export function showSyncConflictModal(cloudTimestamp, localTimestamp, password, cloudData) {
  const existingModal = document.getElementById('sync-conflict-dialog-overlay');
  if (existingModal) {
    existingModal.remove();
  }

  const overlay = document.createElement('div');
  overlay.className = 'md-dialog-overlay';
  overlay.id = 'sync-conflict-dialog-overlay';
  overlay.style.zIndex = '4000';
  
  const cloudDate = new Date(cloudTimestamp).toLocaleString('es-ES');
  const localDate = localTimestamp > 0 
    ? new Date(localTimestamp).toLocaleString('es-ES') 
    : 'Sin datos locales / Versión anterior';

  overlay.innerHTML = `
    <div class="md-dialog" style="max-width: 480px; animation: scaleUp 300ms var(--md-transition-timing);">
      <h3 class="md-dialog-title" style="color: var(--md-sys-color-primary); display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <span class="material-symbols-outlined" style="font-size: 28px;">cloud_sync</span>
        Conflicto de sincronización
      </h3>
      <div class="md-dialog-content" style="color: var(--md-sys-color-on-surface-variant); font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
        Se ha detectado que la base de datos respaldada en la nube (GitHub) es más reciente que tus datos locales en este navegador.
        <div style="margin-top: 16px; padding: 12px; border-radius: 8px; background-color: var(--md-sys-color-surface-variant); display: flex; flex-direction: column; gap: 6px;">
          <div><strong>Nube (más reciente):</strong> ${cloudDate}</div>
          <div><strong>Local:</strong> ${localDate}</div>
        </div>
        <br>
        <strong>¿Qué deseas hacer?</strong>
        <p style="margin: 8px 0; font-size: 13px;">
          <strong>Restaurar desde la nube:</strong> Sobrescribe los datos de tu navegador con el respaldo más nuevo.
          <br>
          <strong>Continuar en local:</strong> Opera localmente y deshabilita la subida a la nube durante esta sesión para proteger el respaldo.
        </p>
      </div>
      <div class="md-dialog-actions" style="display: flex; justify-content: flex-end; gap: 12px;">
        <button class="md-btn md-btn-outlined" id="btn-sync-continue-local" style="border-color: var(--md-sys-color-outline);">
          Continuar en local
        </button>
        <button class="md-btn md-btn-primary" id="btn-sync-restore-cloud">
          Restaurar desde la nube
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#btn-sync-continue-local').addEventListener('click', () => {
    document.body.removeChild(overlay);
    sessionStorage.setItem('cloud_status', 'local_only');
    sessionStorage.removeItem('cloud_backup_password');
    
    const passwordInput = document.getElementById('cloud-backup-password');
    if (passwordInput) {
      passwordInput.value = '';
    }
    
    showStatusToast('Operando en modo local. Sincronización en la nube desactivada.', 'error');
    window.dispatchEvent(new CustomEvent('cloud-sync-status-changed', { detail: 'local_only' }));
  });

  overlay.querySelector('#btn-sync-restore-cloud').addEventListener('click', async () => {
    const btnRestore = overlay.querySelector('#btn-sync-restore-cloud');
    const btnLocal = overlay.querySelector('#btn-sync-continue-local');
    btnRestore.disabled = true;
    btnLocal.disabled = true;
    const originalText = btnRestore.innerHTML;
    btnRestore.innerHTML = `<span class="md-spinner" style="width: 18px; height: 18px; border-width: 2px; border-color: white;"></span> Restaurando...`;

    try {
      const { clearAllLinks, clearAllCampaigns, saveLink, saveCampaign } = await import('../db.js');

      await clearAllLinks();
      await clearAllCampaigns();

      let linksCount = 0;
      if (Array.isArray(cloudData.links)) {
        for (const link of cloudData.links) {
          await saveLink(link);
          linksCount++;
        }
      }

      let campaignsCount = 0;
      if (Array.isArray(cloudData.campaigns)) {
        for (const camp of cloudData.campaigns) {
          await saveCampaign(camp);
          campaignsCount++;
        }
      }

      if (cloudData.settings && typeof cloudData.settings === 'object') {
        const s = cloudData.settings;
        if (s.global_redirect_msg !== undefined) localStorage.setItem('global_redirect_msg', s.global_redirect_msg);
        if (s.global_redirect_delay !== undefined) localStorage.setItem('global_redirect_delay', s.global_redirect_delay);
        if (s.global_redirect_type !== undefined) localStorage.setItem('global_redirect_type', s.global_redirect_type);
        if (s.theme !== undefined) localStorage.setItem('theme', s.theme);
      }

      localStorage.setItem('local_db_timestamp', cloudTimestamp.toString());
      sessionStorage.setItem('cloud_backup_password', password);
      sessionStorage.setItem('cloud_status', 'synced');

      try {
        const ch = new BroadcastChannel('goo_short_realtime');
        ch.postMessage({ type: 'LINK_CREATED', link: {} });
        ch.close();
      } catch (e) {}

      try {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
          themeIcon.textContent = savedTheme === 'dark' ? 'light_mode' : 'dark_mode';
        }
      } catch (e) {}

      document.body.removeChild(overlay);
      showStatusToast(`¡Datos restaurados! (${linksCount} enlaces, ${campaignsCount} campañas)`, 'success');
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err) {
      console.error(err);
      btnRestore.disabled = false;
      btnLocal.disabled = false;
      btnRestore.innerHTML = originalText;
      showStatusToast('Error al restaurar los datos: ' + err.message, 'error');
    }
  });
}

// Función global para notificaciones flotantes premium (Toasts)
export function showStatusToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.style.position = 'fixed';
  toast.style.bottom = '24px';
  toast.style.right = '24px';
  toast.style.padding = '12px 24px';
  toast.style.borderRadius = '100px';
  toast.style.backgroundColor = type === 'success' ? 'var(--md-sys-color-success-container)' : 'var(--md-sys-color-error-container)';
  toast.style.color = type === 'success' ? 'var(--md-sys-color-success)' : 'var(--md-sys-color-error)';
  toast.style.boxShadow = 'var(--md-elevation-2)';
  toast.style.fontSize = '14px';
  toast.style.fontWeight = '500';
  toast.style.zIndex = '3000';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '8px';
  toast.style.animation = 'slideUp 300ms var(--md-transition-timing)';
  
  const icon = type === 'success' ? 'check_circle' : 'error';
  toast.innerHTML = `
    <span class="material-symbols-outlined" style="font-size: 20px;">${icon}</span>
    <span>${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity = '0';
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
}
