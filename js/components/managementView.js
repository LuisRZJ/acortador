import { getAllLinks, deleteLink, saveLink, getAllCampaigns } from '../db.js';
import { setupMarkdownToolbar, escapeHTML } from '../utils/markdown.js';

export function renderManagementView(container, navigateTo) {
  container.innerHTML = `
    <div class="management-view-container">
      <div class="management-header">
        <h2>Enlaces creados</h2>
        <div class="search-bar-container">
          <span class="material-symbols-outlined search-icon">search</span>
          <input type="text" id="search-links" class="search-input" placeholder="Buscar enlaces..." autocomplete="off">
        </div>
      </div>

      <!-- Links Grid -->
      <div id="links-grid" class="links-grid">
        <div class="page-loader">
          <div class="md-spinner"></div>
        </div>
      </div>
    </div>
  `;

  const linksGrid = container.querySelector('#links-grid');
  const searchInput = container.querySelector('#search-links');
  
  let allLinks = [];
  let allCampaigns = []; // Guardar campañas disponibles

  // Variables para rastrear el modal de analíticas activo y poder actualizarlo en tiempo real
  let activeAnalyticsCode = null;
  let updateActiveAnalyticsUI = null;

  // Suscribirse al canal de comunicación en tiempo real de la SPA
  const realtimeChannel = new BroadcastChannel('goo_short_realtime');
  
  realtimeChannel.onmessage = (event) => {
    const { type, code, visitData, link } = event.data;

    // 1. Registro de una nueva visita (clic) en caliente
    if (type === 'VISIT_ADDED') {
      const localLink = allLinks.find(l => l.code === code);
      if (localLink) {
        localLink.clicks = (localLink.clicks || 0) + 1;
        if (!localLink.visits) localLink.visits = [];
        localLink.visits.push(visitData);

        // Actualizar tarjeta en la grilla sin re-renderizar todo
        const card = linksGrid.querySelector(`.link-card[data-code="${code}"]`);
        if (card) {
          const clicksEl = card.querySelector('.link-clicks-count');
          if (clicksEl) clicksEl.textContent = localLink.clicks;

          // Animación de destello suave (pulso de actualización)
          card.classList.remove('updated-pulse');
          void card.offsetWidth; // Forzar reflow
          card.classList.add('updated-pulse');
        }

        // Si el modal de analíticas de este link está abierto, actualizarlo en caliente
        if (activeAnalyticsCode === code && typeof updateActiveAnalyticsUI === 'function') {
          updateActiveAnalyticsUI(localLink);
        }
      }
    }

    // 2. Nuevo enlace creado desde otra pestaña
    if (type === 'LINK_CREATED') {
      // Verificar si ya existe en nuestra lista para evitar duplicados
      if (!allLinks.some(l => l.code === link.code)) {
        allLinks.unshift(link);
        filterAndRenderLinks(searchInput.value.trim());
      }
    }

    // 3. Enlace eliminado desde otra pestaña
    if (type === 'LINK_DELETED') {
      allLinks = allLinks.filter(l => l.code !== code);
      filterAndRenderLinks(searchInput.value.trim());

      // Si teníamos abierto el análisis del link borrado, cerrar el modal
      if (activeAnalyticsCode === code) {
        const modal = document.querySelector('.md-dialog-overlay');
        if (modal) document.body.removeChild(modal);
        activeAnalyticsCode = null;
        updateActiveAnalyticsUI = null;
      }
    }

    // 4. Enlace modificado (edición de destino) desde otra pestaña
    if (type === 'LINK_UPDATED') {
      const index = allLinks.findIndex(l => l.code === link.code);
      if (index !== -1) {
        allLinks[index] = link;
        filterAndRenderLinks(searchInput.value.trim());
      }
    }
  };

  // Cargar enlaces al iniciar la vista
  loadAndRenderLinks();

  // Filtrado de la lista al escribir en el buscador principal
  searchInput.addEventListener('input', () => {
    filterAndRenderLinks(searchInput.value.trim());
  });

  async function loadAndRenderLinks() {
    try {
      allCampaigns = await getAllCampaigns();
      allLinks = await getAllLinks();
      allLinks.sort((a, b) => b.created_at - a.created_at);
      filterAndRenderLinks(searchInput.value.trim());
    } catch (err) {
      console.error('Error al cargar enlaces:', err);
      linksGrid.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-outlined empty-state-icon g-red">error</span>
          <p>Ocurrió un error al cargar tus enlaces locales de IndexedDB.</p>
        </div>
      `;
    }
  }

  function filterAndRenderLinks(query = '') {
    const filtered = allLinks.filter(link => {
      const searchStr = `${link.code} ${link.original_url}`.toLowerCase();
      return searchStr.includes(query.toLowerCase());
    });

    if (filtered.length === 0) {
      if (query) {
        linksGrid.innerHTML = `
          <div class="empty-state">
            <span class="material-symbols-outlined empty-state-icon">search_off</span>
            <p>No se encontraron enlaces que coincidan con "${query}"</p>
          </div>
        `;
      } else {
        linksGrid.innerHTML = `
          <div class="empty-state">
            <span class="material-symbols-outlined empty-state-icon">link_off</span>
            <p>No tienes ningún enlace acortado todavía</p>
            <button class="md-btn md-btn-primary" id="btn-go-create" style="margin-top: 8px;">
              <span class="material-symbols-outlined">add</span>
              Crear mi primer enlace
            </button>
          </div>
        `;
        const goCreateBtn = linksGrid.querySelector('#btn-go-create');
        if (goCreateBtn) {
          goCreateBtn.addEventListener('click', () => navigateTo('/'));
        }
      }
      return;
    }

    linksGrid.innerHTML = '';

    filtered.forEach(link => {
      const card = document.createElement('div');
      card.className = 'link-card';
      card.setAttribute('data-code', link.code); // Atributo clave para actualización in-situ
      
      const shortUrl = `${window.location.origin}/${link.code}`;
      const creationDate = new Date(link.created_at).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      // Obtener chips de campañas asociadas
      const linkCampaigns = link.campaigns || [];
      const chipsHTML = linkCampaigns.map(campId => {
        const camp = allCampaigns.find(c => c.id === campId);
        if (!camp) return '';
        return `<span class="campaign-chip"><span class="material-symbols-outlined" style="font-size: 12px; margin-right: 4px;">sell</span>${escapeHTML(camp.name)}</span>`;
      }).filter(Boolean).join('');

      card.innerHTML = `
        <div class="link-card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
          <div class="link-card-titles" style="flex: 1; min-width: 0;">
            <a href="${shortUrl}" target="_blank" class="link-short-url" title="Abrir enlace acortado">/${link.code}</a>
            <div class="link-long-url" title="${escapeHTML(link.original_url)}">${escapeHTML(link.original_url)}</div>
            <div class="campaign-chips-container">${chipsHTML}</div>
          </div>
          <div class="link-creation-date" style="font-size: 11px; color: var(--md-sys-color-outline); white-space: nowrap; margin-top: 4px; display: flex; align-items: center; gap: 4px; opacity: 0.8;" title="Fecha de creación">
            <span class="material-symbols-outlined" style="font-size: 14px;">calendar_today</span>
            <span>${creationDate}</span>
          </div>
        </div>

        <div class="link-card-stats">
          <div class="stat-item" title="Número total de visitas">
            <span class="material-symbols-outlined g-blue">bar_chart</span>
            <strong><span class="link-clicks-count">${link.clicks || 0}</span></strong> clics
          </div>
        </div>

        <div class="link-card-actions">
          <button class="icon-btn btn-stats" title="Ver estadísticas detalladas">
            <span class="material-symbols-outlined">query_stats</span>
          </button>
          <button class="icon-btn btn-copy" title="Copiar enlace acortado">
            <span class="material-symbols-outlined">content_copy</span>
          </button>
          <button class="icon-btn btn-edit" title="Editar enlace de destino">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button class="icon-btn btn-delete" style="color: var(--md-sys-color-error);" title="Eliminar enlace">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      `;

      // --- Event Listeners de las acciones de la tarjeta ---
      
      // Copiar
      const copyBtn = card.querySelector('.btn-copy');
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(shortUrl).then(() => {
          const iconSpan = copyBtn.querySelector('.material-symbols-outlined');
          iconSpan.textContent = 'done';
          copyBtn.classList.add('g-green');
          
          setTimeout(() => {
            iconSpan.textContent = 'content_copy';
            copyBtn.classList.remove('g-green');
          }, 1500);
        });
      });

      // Estadísticas
      card.querySelector('.btn-stats').addEventListener('click', () => {
        showAnalyticsDialog(link);
      });

      // Editar
      card.querySelector('.btn-edit').addEventListener('click', () => {
        showEditDialog(link);
      });

      // Eliminar
      card.querySelector('.btn-delete').addEventListener('click', () => {
        showDeleteDialog(link.code);
      });

      linksGrid.appendChild(card);
    });
  }

  // --- Modales / Diálogos Material Design ---

  // Diálogo de Confirmación de Borrado
  function showDeleteDialog(code) {
    const overlay = document.createElement('div');
    overlay.className = 'md-dialog-overlay';
    overlay.innerHTML = `
      <div class="md-dialog">
        <h3 class="md-dialog-title">¿Eliminar enlace corto?</h3>
        <div class="md-dialog-content">
          Se eliminará de forma permanente el enlace corto <strong>/${code}</strong> de tu almacenamiento local IndexedDB. 
          Los redireccionamientos para este código dejarán de funcionar.
        </div>
        <div class="md-dialog-actions">
          <button class="md-btn md-btn-outlined" id="cancel-delete-btn">Cancelar</button>
          <button class="md-btn md-btn-primary" style="background-color: var(--md-sys-color-error); color: white;" id="confirm-delete-btn">Eliminar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#cancel-delete-btn').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) document.body.removeChild(overlay);
    });

    overlay.querySelector('#confirm-delete-btn').addEventListener('click', async () => {
      try {
        await deleteLink(code);
        
        // Transmitir eliminación en tiempo real
        try {
          const ch = new BroadcastChannel('goo_short_realtime');
          ch.postMessage({ type: 'LINK_DELETED', code: code });
          ch.close();
        } catch(e){}

        document.body.removeChild(overlay);
        loadAndRenderLinks();
      } catch (err) {
        console.error('Error al borrar:', err);
      }
    });
  }

  // Diálogo de Edición de URL Destino
  function showEditDialog(link) {
    const overlay = document.createElement('div');
    overlay.className = 'md-dialog-overlay';
    overlay.innerHTML = `
      <div class="md-dialog">
        <h3 class="md-dialog-title">Editar enlace de destino</h3>
        <div class="md-dialog-content" style="max-height: 70vh; overflow-y: auto; padding-right: 4px;">
          Modifica el enlace largo de redirección para el código corto <strong>/${link.code}</strong>:
          
          <div class="outlined-text-field" id="edit-field-container" style="margin-top: 20px; margin-bottom: 20px;">
            <input type="url" id="edit-long-url" value="${escapeHTML(link.original_url)}" placeholder=" " required autocomplete="off">
            <label for="edit-long-url">Nuevo enlace largo (URL)</label>
            <div class="field-error-msg" id="edit-url-error" style="margin-top: 4px;">Por favor, introduce una URL válida.</div>
          </div>

          <!-- Selector de Campañas (Multiselección) en Edición -->
          <div class="md-multiselect-field" id="edit-campaigns-multiselect-container" style="margin-top: 10px; margin-bottom: 20px;">
            <div class="multiselect-trigger" id="edit-campaigns-trigger" tabindex="0">
              <span class="multiselect-trigger-label">Asociar a Campañas</span>
              <span class="multiselect-trigger-text" id="edit-campaigns-trigger-text">Sin campañas seleccionadas</span>
              <span class="material-symbols-outlined" style="font-size: 20px; color: var(--md-sys-color-on-surface-variant);">arrow_drop_down</span>
            </div>
            <div class="multiselect-dropdown-menu" id="edit-campaigns-dropdown-menu"></div>
            <div class="multiselect-chips-preview" id="edit-campaigns-chips-preview"></div>
          </div>

          <label class="custom-alias-checkbox-container" style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; user-select: none;">
            <input type="checkbox" id="edit-enable-redirect" ${link.redirect_msg !== undefined || link.redirect_delay !== undefined ? 'checked' : ''}>
            <span>Personalizar pantalla de redirección</span>
          </label>

          <div class="advanced-settings-wrapper ${link.redirect_msg !== undefined || link.redirect_delay !== undefined ? 'show' : ''}" id="edit-redirect-wrapper">
            <!-- Mensaje Personalizado con Toolbar -->
            <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 10px; margin-bottom: 20px;">
              <label style="font-size: 12px; font-weight: 500; color: var(--md-sys-color-primary); padding-left: 4px;">Mensaje de redirección personalizado</label>
              <div class="markdown-editor-container">
                <div class="textarea-toolbar" id="edit-toolbar">
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
                <textarea id="edit-redirect-msg" style="width: 100%; height: 80px; padding: 12px; border: 1px solid var(--md-sys-color-outline); border-radius: 8px; background: transparent; color: var(--md-sys-color-on-surface); font-family: var(--font-primary); font-size: 14px; outline: none; resize: none; transition: border-color var(--md-transition-duration);" placeholder="Ej: Redirigiendo a mi sitio web...">${escapeHTML(link.redirect_msg || '')}</textarea>
              </div>
            </div>
            
            <div class="outlined-text-field" id="edit-redirect-delay-container" style="margin-top: 10px; margin-bottom: 20px;">
              <input type="number" id="edit-redirect-delay" min="0" max="30" value="${link.redirect_delay !== undefined ? link.redirect_delay : 0}" placeholder=" " style="width: 100%; height: 56px; padding: 16px; border: 1px solid var(--md-sys-color-outline); border-radius: 8px; background: transparent; color: var(--md-sys-color-on-surface); font-family: var(--font-primary); font-size: 16px; outline: none;">
              <label for="edit-redirect-delay" id="edit-redirect-delay-label">Tiempo de espera (segundos)</label>
              <div class="field-error-msg" id="edit-redirect-delay-error">El valor debe estar entre 0 y 30 segundos.</div>
            </div>

            <!-- Tipo de Redirección -->
            <div class="outlined-select-field" style="margin-top: 10px; margin-bottom: 20px;">
              <select id="edit-redirect-type">
                <option value="auto" ${link.redirect_type === 'auto' || !link.redirect_type ? 'selected' : ''}>Automática</option>
                <option value="button" ${link.redirect_type === 'button' ? 'selected' : ''}>Botón de confirmación</option>
                <option value="swipe" ${link.redirect_type === 'swipe' ? 'selected' : ''}>Deslizar para confirmar</option>
              </select>
              <label for="edit-redirect-type">Tipo de redirección</label>
            </div>
          </div>
        </div>
        <div class="md-dialog-actions">
          <button class="md-btn md-btn-outlined" id="cancel-edit-btn">Cancelar</button>
          <button class="md-btn md-btn-primary" id="confirm-edit-btn">Guardar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('#edit-long-url');
    const fieldContainer = overlay.querySelector('#edit-field-container');
    const errorMsg = overlay.querySelector('#edit-url-error');

    // Lógica de Campañas en Edición
    const editTrigger = overlay.querySelector('#edit-campaigns-trigger');
    const editDropdown = overlay.querySelector('#edit-campaigns-dropdown-menu');
    const editTriggerText = overlay.querySelector('#edit-campaigns-trigger-text');
    const editChipsPreview = overlay.querySelector('#edit-campaigns-chips-preview');

    let editSelectedCampaigns = [...(link.campaigns || [])];

    function renderEditCampaignsDropdown() {
      if (allCampaigns.length === 0) {
        editDropdown.innerHTML = `
          <div style="padding: 10px; font-size: 13px; color: var(--md-sys-color-outline); text-align: center; font-style: italic;">
            No hay campañas creadas. <a href="/campanas" id="edit-go-create-camp" style="color: var(--md-sys-color-primary); text-decoration: underline;">Crear una</a>
          </div>
        `;
        editDropdown.querySelector('#edit-go-create-camp').addEventListener('click', (e) => {
          e.preventDefault();
          document.body.removeChild(overlay);
          navigateTo('/campanas');
        });
        return;
      }

      editDropdown.innerHTML = allCampaigns.map(camp => {
        const isChecked = editSelectedCampaigns.includes(camp.id);
        return `
          <div class="multiselect-option" data-id="${camp.id}">
            <input type="checkbox" id="edit-chk-camp-${camp.id}" value="${camp.id}" ${isChecked ? 'checked' : ''}>
            <label for="edit-chk-camp-${camp.id}" style="cursor: pointer; flex: 1;">${escapeHTML(camp.name)}</label>
          </div>
        `;
      }).join('');

      editDropdown.querySelectorAll('input[type="checkbox"]').forEach(chk => {
        chk.addEventListener('change', () => {
          const id = chk.value;
          if (chk.checked) {
            if (!editSelectedCampaigns.includes(id)) editSelectedCampaigns.push(id);
          } else {
            editSelectedCampaigns = editSelectedCampaigns.filter(cid => cid !== id);
          }
          updateEditCampaignsUI();
        });
      });

      editDropdown.querySelectorAll('.multiselect-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return;
          const chk = opt.querySelector('input[type="checkbox"]');
          chk.checked = !chk.checked;
          chk.dispatchEvent(new Event('change'));
        });
      });
    }

    function updateEditCampaignsUI() {
      if (editSelectedCampaigns.length === 0) {
        editTriggerText.textContent = 'Sin campañas seleccionadas';
        editTriggerText.style.color = 'var(--md-sys-color-on-surface-variant)';
      } else {
        const names = editSelectedCampaigns.map(id => {
          const camp = allCampaigns.find(c => c.id === id);
          return camp ? camp.name : '';
        }).filter(Boolean);
        editTriggerText.textContent = names.join(', ');
        editTriggerText.style.color = 'var(--md-sys-color-on-surface)';
      }

      editChipsPreview.innerHTML = editSelectedCampaigns.map(id => {
        const camp = allCampaigns.find(c => c.id === id);
        if (!camp) return '';
        return `
          <div class="chip-item" style="background-color: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); border: 1px solid rgba(11, 87, 208, 0.1);">
            <span>${escapeHTML(camp.name)}</span>
            <span class="material-symbols-outlined btn-edit-remove-chip" data-id="${camp.id}" style="font-size: 16px; cursor: pointer; margin-left: 4px; user-select: none;">close</span>
          </div>
        `;
      }).join('');

      editChipsPreview.querySelectorAll('.btn-edit-remove-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          editSelectedCampaigns = editSelectedCampaigns.filter(cid => cid !== id);
          const chk = editDropdown.querySelector(`#edit-chk-camp-${id}`);
          if (chk) chk.checked = false;
          updateEditCampaignsUI();
        });
      });
    }

    editTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      editTrigger.classList.toggle('active');
      editDropdown.classList.toggle('show');
    });

    // Cerrar al hacer clic en el overlay o en cualquier parte si no es el trigger ni el dropdown
    overlay.addEventListener('click', (e) => {
      if (!editTrigger.contains(e.target) && !editDropdown.contains(e.target)) {
        editTrigger.classList.remove('active');
        editDropdown.classList.remove('show');
      }
    });

    renderEditCampaignsDropdown();
    updateEditCampaignsUI();

    const enableRedirectCheckbox = overlay.querySelector('#edit-enable-redirect');
    const redirectWrapper = overlay.querySelector('#edit-redirect-wrapper');
    const redirectMsgTextarea = overlay.querySelector('#edit-redirect-msg');
    const redirectDelayInput = overlay.querySelector('#edit-redirect-delay');
    const redirectDelayContainer = overlay.querySelector('#edit-redirect-delay-container');

    enableRedirectCheckbox.addEventListener('change', () => {
      if (enableRedirectCheckbox.checked) {
        redirectWrapper.classList.add('show');
      } else {
        redirectWrapper.classList.remove('show');
        redirectMsgTextarea.value = '';
        redirectDelayInput.value = '0';
        editRedirectTypeSelect.value = 'auto';
        updateEditRedirectDelayLabel();
        redirectDelayContainer.classList.remove('error');
      }
    });

    const editToolbar = overlay.querySelector('#edit-toolbar');
    setupMarkdownToolbar(editToolbar, redirectMsgTextarea);

    const editRedirectTypeSelect = overlay.querySelector('#edit-redirect-type');
    const editRedirectDelayLabel = overlay.querySelector('#edit-redirect-delay-label');

    function updateEditRedirectDelayLabel() {
      if (editRedirectTypeSelect.value === 'auto') {
        editRedirectDelayLabel.textContent = 'Tiempo de espera (segundos)';
      } else {
        editRedirectDelayLabel.textContent = 'Tiempo de bloqueo (segundos)';
      }
    }

    editRedirectTypeSelect.addEventListener('change', updateEditRedirectDelayLabel);
    updateEditRedirectDelayLabel();

    redirectMsgTextarea.addEventListener('focus', () => {
      redirectMsgTextarea.style.borderColor = 'var(--md-sys-color-primary)';
      redirectMsgTextarea.style.borderWidth = '2px';
    });
    redirectMsgTextarea.addEventListener('blur', () => {
      redirectMsgTextarea.style.borderColor = 'var(--md-sys-color-outline)';
      redirectMsgTextarea.style.borderWidth = '1px';
    });

    redirectDelayInput.addEventListener('input', () => {
      redirectDelayContainer.classList.remove('error');
    });

    input.addEventListener('input', () => {
      fieldContainer.classList.remove('error');
    });

    overlay.querySelector('#cancel-edit-btn').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) document.body.removeChild(overlay);
    });

    overlay.querySelector('#confirm-edit-btn').addEventListener('click', async () => {
      const newUrl = input.value.trim();
      const enableRedirect = enableRedirectCheckbox.checked;
      const redirectMsg = redirectMsgTextarea.value.trim();
      const redirectDelayVal = parseInt(redirectDelayInput.value);
      const redirectTypeVal = editRedirectTypeSelect.value;
      let isValid = true;

      // 1. Validar URL
      if (!newUrl) {
        fieldContainer.classList.add('error');
        errorMsg.textContent = 'El enlace de destino no puede estar vacío.';
        isValid = false;
      } else {
        try {
          new URL(newUrl);
        } catch (err) {
          fieldContainer.classList.add('error');
          errorMsg.textContent = 'El formato del enlace no es válido (ej: https://ejemplo.com).';
          isValid = false;
        }
      }

      // 2. Validar redirección
      if (enableRedirect) {
        if (isNaN(redirectDelayVal) || redirectDelayVal < 0 || redirectDelayVal > 30) {
          redirectDelayContainer.classList.add('error');
          isValid = false;
        }
      }

      if (!isValid) return;

      try {
        const updatedLink = {
          ...link,
          original_url: newUrl,
          campaigns: editSelectedCampaigns
        };

        if (enableRedirect) {
          updatedLink.redirect_msg = redirectMsg;
          updatedLink.redirect_delay = redirectDelayVal;
          updatedLink.redirect_type = redirectTypeVal;
        } else {
          delete updatedLink.redirect_msg;
          delete updatedLink.redirect_delay;
          delete updatedLink.redirect_type;
        }

        await saveLink(updatedLink);

        // Transmitir edición en tiempo real
        try {
          const ch = new BroadcastChannel('goo_short_realtime');
          ch.postMessage({ type: 'LINK_UPDATED', link: updatedLink });
          ch.close();
        } catch(e){}

        document.body.removeChild(overlay);
        loadAndRenderLinks();
      } catch (err) {
        console.error('Error al editar:', err);
      }
    });
  }

  // --- Modal de Estadísticas Avanzadas con Buscador e Historial Paginado ---
  function showAnalyticsDialog(link) {
    activeAnalyticsCode = link.code;

    const overlay = document.createElement('div');
    overlay.className = 'md-dialog-overlay';
    overlay.innerHTML = `
      <div class="md-dialog analytics-modal">
        
        <!-- Modal Header -->
        <div class="analytics-modal-header">
          <button class="icon-btn" id="close-analytics-btn" title="Volver al listado" style="color: var(--md-sys-color-primary);">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h3>Estadísticas de tráfico</h3>
            <span style="font-size: 13px; color: var(--md-sys-color-outline); word-break: break-all;">/${link.code}</span>
          </div>
        </div>

        <!-- Modal Content (Scrollable) -->
        <div class="analytics-modal-content">
          
          <!-- KPIs Grid -->
          <div class="analytics-kpis-grid">
            <div class="kpi-card">
              <div class="kpi-icon-container">
                <span class="material-symbols-outlined">bar_chart</span>
              </div>
              <div class="kpi-data">
                <span class="kpi-value" id="kpi-total-clicks">-</span>
                <span class="kpi-label">Clics totales</span>
              </div>
            </div>
            
            <div class="kpi-card">
              <div class="kpi-icon-container" style="background-color: var(--md-sys-color-secondary-container); color: var(--md-sys-color-secondary);">
                <span class="material-symbols-outlined">schedule</span>
              </div>
              <div class="kpi-data">
                <span class="kpi-value" id="kpi-last-24h">-</span>
                <span class="kpi-label">Últimas 24 horas</span>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-icon-container" style="background-color: var(--md-sys-color-success-container); color: var(--md-sys-color-success);">
                <span class="material-symbols-outlined">person</span>
              </div>
              <div class="kpi-data">
                <span class="kpi-value" id="kpi-unique-visitors">-</span>
                <span class="kpi-label">Visitantes únicos</span>
              </div>
            </div>
          </div>

          <!-- Analytics Distributions Grid -->
          <div class="analytics-sections-grid">
            
            <!-- Países y Geografía -->
            <div class="analytics-section-card" id="card-countries">
              <div class="analytics-section-title">
                <span class="material-symbols-outlined g-blue">public</span>
                Ubicación geográfica (Top 5)
              </div>
              <div class="section-bars-content"></div>
            </div>

            <!-- Fuentes de Referencia -->
            <div class="analytics-section-card" id="card-referrers">
              <div class="analytics-section-title">
                <span class="material-symbols-outlined g-green">explore</span>
                Procedencia / Referente (Top 5)
              </div>
              <div class="section-bars-content"></div>
            </div>

            <!-- Navegadores -->
            <div class="analytics-section-card" id="card-browsers">
              <div class="analytics-section-title">
                <span class="material-symbols-outlined g-yellow">language</span>
                Navegadores (Top 5)
              </div>
              <div class="section-bars-content"></div>
            </div>

            <!-- Sistemas Operativos -->
            <div class="analytics-section-card" id="card-os">
              <div class="analytics-section-title">
                <span class="material-symbols-outlined g-red">devices</span>
                Sistemas operativos (Top 5)
              </div>
              <div class="section-bars-content"></div>
            </div>

          </div>

          <!-- Historial de Clics Paginado e Internamente Filtrable -->
          <div class="analytics-section-card" style="gap: 12px;">
            
            <!-- Historial Header con Buscador Incorporado -->
            <div class="history-search-container">
              <div class="analytics-section-title" style="border-bottom: none; padding-bottom: 0;">
                <span class="material-symbols-outlined">history</span>
                Historial de visitas
              </div>
              <div class="history-search-box">
                <span class="material-symbols-outlined search-icon">search</span>
                <input type="text" id="search-history" class="history-search-input" placeholder="Filtrar visitas..." autocomplete="off">
              </div>
            </div>

            <!-- Tabla de Historial -->
            <div class="history-table-container">
              <table class="history-table">
                <thead>
                  <tr>
                    <th>Fecha / Hora</th>
                    <th>IP</th>
                    <th>Ubicación</th>
                    <th>Procedencia</th>
                    <th>Dispositivo</th>
                  </tr>
                </thead>
                <tbody id="history-table-body"></tbody>
              </table>
            </div>

            <!-- Botón Ver Más -->
            <div class="load-more-container" id="load-more-wrapper">
              <button class="md-btn md-btn-outlined load-more-btn" id="load-more-btn">
                Ver más
              </button>
            </div>

          </div>

        </div>

      </div>
    `;

    document.body.appendChild(overlay);

    // Capturar referencias internas del modal
    const kpiTotalClicks = overlay.querySelector('#kpi-total-clicks');
    const kpiLast24h = overlay.querySelector('#kpi-last-24h');
    const kpiUniqueVisitors = overlay.querySelector('#kpi-unique-visitors');
    const searchHistoryInput = overlay.querySelector('#search-history');
    const historyTableBody = overlay.querySelector('#history-table-body');
    const loadMoreWrapper = overlay.querySelector('#load-more-wrapper');
    const loadMoreBtn = overlay.querySelector('#load-more-btn');

    // Variables de control de paginación e histórico
    let currentLinkObj = link;
    let visibleCount = 10;
    let historySearchQuery = '';

    // Función para actualizar toda la lógica de datos y DOM
    function updateMetricsDOM(linkData) {
      currentLinkObj = linkData;
      const visits = linkData.visits || [];
      const totalClicks = visits.length;

      // 1. KPIs
      const nowMs = Date.now();
      const last24hCount = visits.filter(v => nowMs - v.timestamp < 24 * 60 * 60 * 1000).length;
      const uniqueIps = new Set(visits.map(v => v.ip).filter(ip => ip !== 'Desconocida'));
      const uniqueCount = uniqueIps.size + visits.filter(v => v.ip === 'Desconocida').length;

      kpiTotalClicks.textContent = totalClicks;
      kpiLast24h.textContent = last24hCount;
      kpiUniqueVisitors.textContent = uniqueCount;

      // 2. Gráficos de Barras de Distribución
      const countries = getFrequencies(visits, 'country');
      const referrers = getFrequencies(visits, 'referrer');
      const browsers = getFrequencies(visits, 'browser');
      const osList = getFrequencies(visits, 'os');

      renderBarsContent(overlay.querySelector('#card-countries .section-bars-content'), countries, totalClicks);
      renderBarsContent(overlay.querySelector('#card-referrers .section-bars-content'), referrers, totalClicks);
      renderBarsContent(overlay.querySelector('#card-browsers .section-bars-content'), browsers, totalClicks);
      renderBarsContent(overlay.querySelector('#card-os .section-bars-content'), osList, totalClicks);

      // Animar barras al cambiar datos
      setTimeout(() => {
        overlay.querySelectorAll('.metric-bar-fill').forEach(bar => {
          const width = bar.getAttribute('data-width');
          bar.style.width = `${width}%`;
        });
      }, 50);

      // 3. Renderizar la tabla de historial
      renderHistoryTable();
    }

    // Dibuja la lista de barras de progreso
    function renderBarsContent(targetContainer, freqData, total) {
      if (freqData.length === 0) {
        targetContainer.innerHTML = `<p style="font-size: 13px; color: var(--md-sys-color-outline); font-style: italic;">Sin datos registrados aún</p>`;
        return;
      }
      targetContainer.innerHTML = `
        <div class="metrics-list">
          ${freqData.slice(0, 5).map(item => {
            const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return `
              <div class="metric-row">
                <div class="metric-info">
                  <span class="metric-name" title="${escapeHTML(item.name)}">${escapeHTML(item.name)}</span>
                  <span class="metric-percentage">${percentage}% (${item.value})</span>
                </div>
                <div class="metric-bar-container">
                  <div class="metric-bar-fill" data-width="${percentage}"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    // Renderiza la tabla de visitas filtrada y paginada
    function renderHistoryTable() {
      const visits = currentLinkObj.visits || [];
      const query = historySearchQuery.toLowerCase().trim();

      // 1. Filtrar registros por coincidencia
      const filtered = [...visits].reverse().filter(v => {
        const dateStr = new Date(v.timestamp).toLocaleString('es-ES', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        }).toLowerCase();
        
        const location = `${v.city}, ${v.country}`.toLowerCase();
        const device = `${v.browser} (${v.os})`.toLowerCase();

        return (
          v.ip.toLowerCase().includes(query) ||
          location.includes(query) ||
          device.includes(query) ||
          v.referrer.toLowerCase().includes(query) ||
          dateStr.includes(query)
        );
      });

      // 2. Tomar subconjunto visible
      const visibleList = filtered.slice(0, visibleCount);

      // 3. Dibujar filas
      if (visibleList.length === 0) {
        historyTableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; color: var(--md-sys-color-outline); font-style: italic; padding: 24px 0;">
              ${query ? 'No se encontraron visitas que coincidan con la búsqueda' : 'No se registran visitas aún'}
            </td>
          </tr>
        `;
        loadMoreWrapper.style.display = 'none';
        return;
      }

      historyTableBody.innerHTML = visibleList.map(v => {
        const dateStr = new Date(v.timestamp).toLocaleString('es-ES', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
        const location = v.country !== 'Desconocido' ? `${escapeHTML(v.city)}, ${escapeHTML(v.country)}` : 'Desconocida';
        const device = `${escapeHTML(v.browser)} (${escapeHTML(v.os)})`;
        return `
          <tr>
            <td>${dateStr}</td>
            <td title="${escapeHTML(v.ip)}">${escapeHTML(v.ip)}</td>
            <td title="${location}">${location}</td>
            <td title="${escapeHTML(v.referrer)}">${escapeHTML(v.referrer)}</td>
            <td title="${device}">${device}</td>
          </tr>
        `;
      }).join('');

      // 4. Controlar visibilidad y conteo del botón "Ver más"
      const remainingCount = filtered.length - visibleCount;
      if (remainingCount > 0) {
        loadMoreWrapper.style.display = 'flex';
        loadMoreBtn.innerHTML = `
          <span class="material-symbols-outlined" style="font-size: 16px;">expand_more</span>
          Cargar más visitas (${remainingCount} restantes)
        `;
      } else {
        loadMoreWrapper.style.display = 'none';
      }
    }

    // --- Vinculación de Eventos del Modal ---

    // Cambios en el buscador del historial
    searchHistoryInput.addEventListener('input', (e) => {
      historySearchQuery = e.target.value;
      visibleCount = 10; // Reiniciar paginación al buscar
      renderHistoryTable();
    });

    // Clic en el botón "Ver más"
    loadMoreBtn.addEventListener('click', () => {
      visibleCount += 10;
      renderHistoryTable();
    });

    // Cerrar
    const closeBtn = overlay.querySelector('#close-analytics-btn');
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
      activeAnalyticsCode = null;
      updateActiveAnalyticsUI = null;
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
        activeAnalyticsCode = null;
        updateActiveAnalyticsUI = null;
      }
    });

    // Registrar la función de actualización en caliente en el closure global
    updateActiveAnalyticsUI = (updatedLink) => {
      updateMetricsDOM(updatedLink);
    };

    // Inicializar visualización de datos en el modal
    updateMetricsDOM(link);
  }

  // Helper de cálculo de frecuencias
  function getFrequencies(arr, key) {
    const counts = {};
    arr.forEach(item => {
      const val = item[key] || 'Desconocido';
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }
}

