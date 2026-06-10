import { getAllCampaigns, saveCampaign, deleteCampaign, getAllLinks } from '../db.js';
import { escapeHTML } from '../utils/markdown.js';

export function renderCampaignsView(container, navigateTo) {
  container.innerHTML = `
    <div class="management-view-container" style="animation: fadeIn 300ms var(--md-transition-timing);">
      
      <!-- Cabecera de la vista -->
      <div class="management-header" style="margin-bottom: 24px;">
        <div>
          <h2 style="font-size: 26px; font-weight: 400; color: var(--md-sys-color-on-surface);">Campañas de enlaces</h2>
          <p style="font-size: 14px; color: var(--md-sys-color-on-surface-variant); margin-top: 4px;">
            Crea y administra etiquetas para organizar y segmentar las estadísticas de tus enlaces acortados.
          </p>
        </div>
      </div>

      <!-- Tarjeta de Creación de Campaña -->
      <div class="md-card" style="margin: 0 0 24px 0; max-width: 100%; padding: 24px;">
        <form id="create-campaign-form" style="display: flex; flex-direction: column; gap: 16px;" novalidate>
          <h3 style="font-size: 16px; font-weight: 500; margin-bottom: 4px; color: var(--md-sys-color-primary);">Nueva campaña</h3>
          
          <div style="display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap;">
            <div class="outlined-text-field" id="campaign-name-field" style="margin: 0; flex: 1; min-width: 240px;">
              <input type="text" id="campaign-name" placeholder=" " required autocomplete="off">
              <label for="campaign-name">Nombre de la campaña (ej: Campaña de Verano)</label>
              <div class="field-error-msg" id="campaign-error-msg">El nombre de la campaña no puede estar vacío.</div>
            </div>
            
            <button type="submit" class="md-btn md-btn-primary" style="height: 56px; padding: 0 24px;">
              <span class="material-symbols-outlined">add</span>
              Crear campaña
            </button>
          </div>
        </form>
      </div>

      <!-- Grilla de Campañas -->
      <div id="campaigns-grid" class="campaigns-grid">
        <div class="page-loader">
          <div class="md-spinner"></div>
        </div>
      </div>

    </div>
  `;

  const form = container.querySelector('#create-campaign-form');
  const nameInput = container.querySelector('#campaign-name');
  const fieldContainer = container.querySelector('#campaign-name-field');
  const errorMsg = container.querySelector('#campaign-error-msg');
  const grid = container.querySelector('#campaigns-grid');

  let allCampaigns = [];
  let allLinks = [];

  // Suscribirse al canal en tiempo real para recargar datos si cambian externamente
  const realtimeChannel = new BroadcastChannel('goo_short_realtime');
  realtimeChannel.onmessage = (event) => {
    const { type } = event.data;
    if (type === 'LINK_UPDATED' || type === 'LINK_CREATED' || type === 'LINK_DELETED') {
      loadDataAndRender();
    }
  };

  // Cargar datos iniciales
  loadDataAndRender();

  async function loadDataAndRender() {
    try {
      allCampaigns = await getAllCampaigns();
      allLinks = await getAllLinks();
      
      // Ordenar campañas por fecha de creación desc
      allCampaigns.sort((a, b) => b.created_at - a.created_at);
      
      renderCampaignsList();
    } catch (err) {
      console.error('Error al cargar campañas:', err);
      grid.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-outlined empty-state-icon g-red">error</span>
          <p>Ocurrió un error al cargar las campañas de la base de datos.</p>
        </div>
      `;
    }
  }

  function renderCampaignsList() {
    if (allCampaigns.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-outlined empty-state-icon">campaign</span>
          <p>No has creado ninguna campaña todavía.</p>
          <p style="font-size: 13px; color: var(--md-sys-color-on-surface-variant); margin-top: -8px;">
            Las campañas te permiten agrupar enlaces para comparar su rendimiento en los reportes.
          </p>
        </div>
      `;
      return;
    }

    grid.innerHTML = '';

    allCampaigns.forEach(campaign => {
      // Filtrar enlaces asociados a esta campaña (N a M)
      const associatedLinks = allLinks.filter(link => 
        link.campaigns && link.campaigns.includes(campaign.id)
      );
      
      const linksCount = associatedLinks.length;
      const totalClicks = associatedLinks.reduce((sum, l) => sum + (l.clicks || 0), 0);
      const creationDate = new Date(campaign.created_at).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      const card = document.createElement('div');
      card.className = 'campaign-card';
      card.innerHTML = `
        <div class="campaign-card-header">
          <div class="campaign-icon">
            <span class="material-symbols-outlined">campaign</span>
          </div>
          <h3 class="campaign-card-title" title="${escapeHTML(campaign.name)}">${escapeHTML(campaign.name)}</h3>
        </div>

        <div class="campaign-card-stats">
          <div style="display: flex; justify-content: space-between;">
            <span>Enlaces asociados:</span>
            <strong>${linksCount}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Clics acumulados:</span>
            <strong>${totalClicks}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--md-sys-color-outline); margin-top: 4px;">
            <span>Creada el:</span>
            <span>${creationDate}</span>
          </div>
        </div>

        <div class="campaign-card-actions">
          <button class="md-btn md-btn-outlined btn-view-analytics" style="height: 32px; padding: 0 12px; font-size: 12px; gap: 4px;" title="Ver rendimiento de esta campaña">
            <span class="material-symbols-outlined" style="font-size: 16px;">monitoring</span>
            Analíticas
          </button>
          
          <button class="icon-btn btn-delete-campaign" style="color: var(--md-sys-color-error); width: 32px; height: 32px;" title="Eliminar campaña">
            <span class="material-symbols-outlined" style="font-size: 20px;">delete</span>
          </button>
        </div>
      `;

      // Event listener: ver analíticas
      card.querySelector('.btn-view-analytics').addEventListener('click', () => {
        sessionStorage.setItem('filter_campaign_id', campaign.id);
        navigateTo('/analiticas');
      });

      // Event listener: eliminar campaña con validación restrictiva
      card.querySelector('.btn-delete-campaign').addEventListener('click', () => {
        if (linksCount > 0) {
          showRestrictionDialog(campaign.name, linksCount);
        } else {
          showDeleteDialog(campaign);
        }
      });

      grid.appendChild(card);
    });
  }

  // Formulario: Crear Campaña
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();

    if (!name) {
      fieldContainer.classList.add('error');
      errorMsg.textContent = 'El nombre de la campaña no puede estar vacío.';
      return;
    }

    // Validar duplicados
    const isDuplicate = allCampaigns.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (isDuplicate) {
      fieldContainer.classList.add('error');
      errorMsg.textContent = 'Ya existe una campaña con este nombre.';
      return;
    }

    fieldContainer.classList.remove('error');

    const newCampaign = {
      id: 'camp_' + Date.now().toString(),
      name: name,
      created_at: Date.now()
    };

    try {
      await saveCampaign(newCampaign);
      nameInput.value = '';
      
      // Transmitir en tiempo real
      try {
        const ch = new BroadcastChannel('goo_short_realtime');
        ch.postMessage({ type: 'LINK_CREATED', link: {} }); // Forzar refresco general
        ch.close();
      } catch(err){}

      loadDataAndRender();
      showStatusToast('Campaña creada correctamente', 'success');
    } catch (err) {
      console.error('Error al guardar campaña:', err);
      showStatusToast('Error al guardar la campaña en base de datos', 'error');
    }
  });

  nameInput.addEventListener('input', () => {
    fieldContainer.classList.remove('error');
  });

  // Modal: Restricción de Eliminación (Campaña con Enlaces)
  function showRestrictionDialog(campaignName, count) {
    const overlay = document.createElement('div');
    overlay.className = 'md-dialog-overlay';
    overlay.style.zIndex = '2000';
    overlay.innerHTML = `
      <div class="md-dialog" style="max-width: 400px;">
        <h3 class="md-dialog-title" style="display: flex; align-items: center; gap: 8px; color: var(--md-sys-color-primary);">
          <span class="material-symbols-outlined" style="font-size: 28px;">info</span>
          Campaña en uso
        </h3>
        <div class="md-dialog-content" style="color: var(--md-sys-color-on-surface-variant); font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
          La campaña <strong>"${escapeHTML(campaignName)}"</strong> no se puede eliminar porque tiene <strong>${count}</strong> enlace${count > 1 ? 's' : ''} asociado${count > 1 ? 's' : ''}.
          <br><br>
          Debes editar o eliminar los enlaces correspondientes en la pestaña de **Gestión** para desvincularlos de la campaña antes de poder borrarla.
        </div>
        <div class="md-dialog-actions" style="display: flex; justify-content: flex-end;">
          <button class="md-btn md-btn-primary" id="btn-close-restriction">Entendido</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#btn-close-restriction').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) document.body.removeChild(overlay);
    });
  }

  // Modal: Confirmación de Eliminación (Campaña Vacía)
  function showDeleteDialog(campaign) {
    const overlay = document.createElement('div');
    overlay.className = 'md-dialog-overlay';
    overlay.style.zIndex = '2000';
    overlay.innerHTML = `
      <div class="md-dialog" style="max-width: 400px;">
        <h3 class="md-dialog-title">¿Eliminar campaña?</h3>
        <div class="md-dialog-content" style="color: var(--md-sys-color-on-surface-variant); font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
          ¿Estás seguro de que deseas eliminar la campaña <strong>"${escapeHTML(campaign.name)}"</strong>? 
          <br><br>
          Esta acción no afectará a tus enlaces, solo eliminará la etiqueta de agrupación.
        </div>
        <div class="md-dialog-actions" style="display: flex; justify-content: flex-end; gap: 8px;">
          <button class="md-btn md-btn-outlined" id="btn-cancel-delete">Cancelar</button>
          <button class="md-btn md-btn-primary" style="background-color: var(--md-sys-color-error); color: white;" id="btn-confirm-delete">Eliminar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#btn-cancel-delete').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) document.body.removeChild(overlay);
    });

    overlay.querySelector('#btn-confirm-delete').addEventListener('click', async () => {
      try {
        await deleteCampaign(campaign.id);
        document.body.removeChild(overlay);
        
        // Transmitir borrado
        try {
          const ch = new BroadcastChannel('goo_short_realtime');
          ch.postMessage({ type: 'LINK_CREATED', link: {} });
          ch.close();
        } catch(err){}

        loadDataAndRender();
        showStatusToast('Campaña eliminada con éxito', 'success');
      } catch (err) {
        console.error('Error al borrar campaña:', err);
        showStatusToast('Error al eliminar la campaña', 'error');
      }
    });
  }

  // Función interna para toasts
  function showStatusToast(message, type = 'success') {
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
}
