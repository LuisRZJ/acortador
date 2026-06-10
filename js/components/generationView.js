import { saveLink, getLink, getAllCampaigns } from '../db.js';
import { setupMarkdownToolbar, escapeHTML } from '../utils/markdown.js';

export function renderGenerationView(container) {
  container.innerHTML = `
    <div class="generate-view-container">
      <div class="view-title-container">
        <h2>Acorta tus enlaces</h2>
        <p>Introduce un enlace largo para obtener una versión corta y fácil de compartir con estilo Google</p>
      </div>

      <div class="md-card">
        <form id="shorten-form" novalidate>
          <!-- URL Input -->
          <div class="outlined-text-field" id="url-field-container">
            <input type="url" id="long-url" placeholder=" " required autocomplete="off">
            <label for="long-url">Enlace largo (URL)</label>
            <div class="field-error-msg" id="url-error">Por favor, introduce una URL válida (ej: https://google.com).</div>
          </div>

          <!-- Checkbox Personalizar -->
          <label class="custom-alias-checkbox-container">
            <input type="checkbox" id="enable-custom-alias">
            <span>Personalizar enlace corto (alias)</span>
          </label>

          <!-- Alias Input (Oculto por defecto) -->
          <div class="alias-input-wrapper" id="alias-input-wrapper">
            <div class="outlined-text-field" id="alias-field-container">
              <input type="text" id="custom-alias" placeholder=" " autocomplete="off" pattern="[a-zA-Z0-9_-]+">
              <label for="custom-alias">Alias personalizado (ej: mi-enlace)</label>
              <div class="field-error-msg" id="alias-error">El alias solo puede contener letras, números, guiones (-) y guiones bajos (_).</div>
            </div>
          </div>

          <!-- Selector de Campañas (Multiselección) -->
          <div class="md-multiselect-field" id="campaigns-multiselect-container" style="margin-top: 10px; margin-bottom: 16px;">
            <div class="multiselect-trigger" id="campaigns-trigger" tabindex="0">
              <span class="multiselect-trigger-label">Asociar a Campañas</span>
              <span class="multiselect-trigger-text" id="campaigns-trigger-text">Sin campañas seleccionadas</span>
              <span class="material-symbols-outlined" style="font-size: 20px; color: var(--md-sys-color-on-surface-variant);">arrow_drop_down</span>
            </div>
            <div class="multiselect-dropdown-menu" id="campaigns-dropdown-menu"></div>
            <div class="multiselect-chips-preview" id="campaigns-chips-preview"></div>
          </div>

          <!-- Redirección Avanzada -->
          <label class="custom-alias-checkbox-container" style="margin-top: 8px;">
            <input type="checkbox" id="enable-custom-redirect">
            <span>Personalizar pantalla de redirección</span>
          </label>

          <!-- Controles de Redirección (Ocultos por defecto) -->
          <div class="advanced-settings-wrapper" id="redirect-input-wrapper">
            <!-- Mensaje Personalizado con Toolbar -->
            <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 10px; margin-bottom: 16px;">
              <label style="font-size: 12px; font-weight: 500; color: var(--md-sys-color-primary); padding-left: 4px;">Mensaje de redirección personalizado</label>
              <div class="markdown-editor-container">
                <div class="textarea-toolbar" id="generation-toolbar">
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
                <textarea id="redirect-msg" style="width: 100%; height: 80px; padding: 12px; border: 1px solid var(--md-sys-color-outline); border-radius: 8px; background: transparent; color: var(--md-sys-color-on-surface); font-family: var(--font-primary); font-size: 14px; outline: none; resize: none; transition: border-color var(--md-transition-duration);" placeholder="Ej: Redirigiendo a mi sitio web..."></textarea>
              </div>
            </div>
            
            <div class="outlined-text-field" id="redirect-delay-container" style="margin-top: 10px; margin-bottom: 16px;">
              <input type="number" id="redirect-delay" min="0" max="30" value="0" placeholder=" " style="width: 100%; height: 56px; padding: 16px; border: 1px solid var(--md-sys-color-outline); border-radius: 8px; background: transparent; color: var(--md-sys-color-on-surface); font-family: var(--font-primary); font-size: 16px; outline: none;">
              <label for="redirect-delay" id="redirect-delay-label">Tiempo de espera (segundos)</label>
              <div class="field-error-msg" id="redirect-delay-error">El valor debe estar entre 0 y 30 segundos.</div>
            </div>

            <!-- Tipo de Redirección -->
            <div class="outlined-select-field" style="margin-top: 10px; margin-bottom: 16px;">
              <select id="redirect-type">
                <option value="auto">Automática</option>
                <option value="button">Botón de confirmación</option>
                <option value="swipe">Deslizar para confirmar</option>
              </select>
              <label for="redirect-type">Tipo de redirección</label>
            </div>
          </div>

          <!-- Action Button -->
          <div class="generate-btn-container">
            <button type="submit" class="md-btn md-btn-primary" id="submit-btn">
              <span class="material-symbols-outlined">bolt</span>
              Acortar enlace
            </button>
          </div>
        </form>

        <!-- Result Section (Oculta por defecto) -->
        <div id="result-section" style="display: none;">
          <div class="generated-result-card">
            <div class="result-header">
              <span class="material-symbols-outlined">check_circle</span>
              ¡Enlace acortado con éxito!
            </div>
            
            <div class="result-url-box">
              <div class="shortened-url-text" id="shortened-url"></div>
              <button class="icon-btn" id="copy-btn" title="Copiar enlace">
                <span class="material-symbols-outlined">content_copy</span>
              </button>
            </div>

            <div class="result-actions">
              <div class="qr-section" style="display: flex; flex-direction: column; align-items: center;">
                <div class="qr-canvas-container" style="background-color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; width: 138px; height: 138px;">
                  <img id="qr-image" alt="Código QR" width="130" height="130" style="display: block;">
                </div>
                <span id="qr-preview-url" style="font-size: 11px; font-weight: 600; color: var(--md-sys-color-primary); margin-top: 4px; word-break: break-all; max-width: 140px; text-align: center;"></span>
                <button class="md-btn md-btn-outlined" id="download-qr-btn" style="height: 32px; padding: 0 12px; font-size: 12px; margin-top: 6px; border-radius: 8px; gap: 4px; border-color: var(--md-sys-color-primary);">
                  <span class="material-symbols-outlined" style="font-size: 16px;">download</span>
                  Descargar
                </button>
              </div>

              <button class="md-btn md-btn-outlined" id="reset-btn">
                <span class="material-symbols-outlined">restart_alt</span>
                Acortar otro
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  // --- Elementos del DOM ---
  const form = container.querySelector('#shorten-form');
  const longUrlInput = container.querySelector('#long-url');
  const enableAliasCheckbox = container.querySelector('#enable-custom-alias');
  const aliasInputWrapper = container.querySelector('#alias-input-wrapper');
  const customAliasInput = container.querySelector('#custom-alias');
  const urlFieldContainer = container.querySelector('#url-field-container');
  const aliasFieldContainer = container.querySelector('#alias-field-container');
  const urlError = container.querySelector('#url-error');
  const aliasError = container.querySelector('#alias-error');
  const submitBtn = container.querySelector('#submit-btn');

  const resultSection = container.querySelector('#result-section');
  const shortenedUrlText = container.querySelector('#shortened-url');
  const copyBtn = container.querySelector('#copy-btn');
  const qrImg = container.querySelector('#qr-image');
  const qrPreviewUrlText = container.querySelector('#qr-preview-url');
  const downloadQrBtn = container.querySelector('#download-qr-btn');
  const resetBtn = container.querySelector('#reset-btn');

  // --- Lógica del formulario ---

  // Mostrar / Ocultar campo de alias personalizado
  enableAliasCheckbox.addEventListener('change', () => {
    if (enableAliasCheckbox.checked) {
      aliasInputWrapper.classList.add('show');
      customAliasInput.setAttribute('required', 'true');
    } else {
      aliasInputWrapper.classList.remove('show');
      customAliasInput.removeAttribute('required');
      customAliasInput.value = '';
      aliasFieldContainer.classList.remove('error');
    }
  });

  // Mostrar / Ocultar controles de redirección personalizada
  const enableRedirectCheckbox = container.querySelector('#enable-custom-redirect');
  const redirectInputWrapper = container.querySelector('#redirect-input-wrapper');
  const redirectMsgInput = container.querySelector('#redirect-msg');
  const redirectDelayInput = container.querySelector('#redirect-delay');
  const redirectDelayContainer = container.querySelector('#redirect-delay-container');

  enableRedirectCheckbox.addEventListener('change', () => {
    if (enableRedirectCheckbox.checked) {
      redirectInputWrapper.classList.add('show');
    } else {
      redirectInputWrapper.classList.remove('show');
      redirectMsgInput.value = '';
      redirectDelayInput.value = '0';
      redirectTypeSelect.value = 'auto';
      updateRedirectDelayLabel();
      redirectDelayContainer.classList.remove('error');
    }
  });

  const generationToolbar = container.querySelector('#generation-toolbar');
  setupMarkdownToolbar(generationToolbar, redirectMsgInput);

  const redirectTypeSelect = container.querySelector('#redirect-type');
  const redirectDelayLabel = container.querySelector('#redirect-delay-label');

  function updateRedirectDelayLabel() {
    if (redirectTypeSelect.value === 'auto') {
      redirectDelayLabel.textContent = 'Tiempo de espera (segundos)';
    } else {
      redirectDelayLabel.textContent = 'Tiempo de bloqueo (segundos)';
    }
  }

  redirectTypeSelect.addEventListener('change', updateRedirectDelayLabel);

  // Estilos dinámicos para el textarea
  redirectMsgInput.addEventListener('focus', () => {
    redirectMsgInput.style.borderColor = 'var(--md-sys-color-primary)';
    redirectMsgInput.style.borderWidth = '2px';
  });
  redirectMsgInput.addEventListener('blur', () => {
    redirectMsgInput.style.borderColor = 'var(--md-sys-color-outline)';
    redirectMsgInput.style.borderWidth = '1px';
  });

  redirectDelayInput.addEventListener('input', () => {
    redirectDelayContainer.classList.remove('error');
  });

  // Validar URL al escribir / salir
  longUrlInput.addEventListener('input', () => {
    urlFieldContainer.classList.remove('error');
  });

  customAliasInput.addEventListener('input', () => {
    aliasFieldContainer.classList.remove('error');
  });

  // Envío del formulario
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let isValid = true;
    const longUrl = longUrlInput.value.trim();
    const useCustomAlias = enableAliasCheckbox.checked;
    const customAlias = customAliasInput.value.trim();

    // 1. Validar URL
    if (!longUrl) {
      urlFieldContainer.classList.add('error');
      urlError.textContent = 'Por favor, introduce un enlace largo.';
      isValid = false;
    } else {
      try {
        new URL(longUrl); // Validador de URL nativo del navegador
      } catch (err) {
        urlFieldContainer.classList.add('error');
        urlError.textContent = 'El formato del enlace no es válido. Asegúrate de incluir http:// o https://';
        isValid = false;
      }
    }

    // 2. Validar Alias si está habilitado
    if (useCustomAlias) {
      if (!customAlias) {
        aliasFieldContainer.classList.add('error');
        aliasError.textContent = 'Por favor, introduce un alias para el enlace.';
        isValid = false;
      } else if (!/^[a-zA-Z0-9_-]+$/.test(customAlias)) {
        aliasFieldContainer.classList.add('error');
        aliasError.textContent = 'El alias solo puede contener letras, números, guiones (-) y guiones bajos (_).';
        isValid = false;
      } else {
        // Validar si ya existe el alias en DB
        try {
          const existing = await getLink(customAlias);
          if (existing) {
            aliasFieldContainer.classList.add('error');
            aliasError.textContent = 'Este alias ya está en uso. Elige uno diferente.';
            isValid = false;
          }
        } catch (err) {
          console.error(err);
        }
      }
    }

    // 3. Validar redirección personalizada
    const useCustomRedirect = enableRedirectCheckbox.checked;
    const redirectMsg = redirectMsgInput.value.trim();
    const redirectDelayVal = parseInt(redirectDelayInput.value);
    const redirectTypeVal = redirectTypeSelect.value;

    if (useCustomRedirect) {
      if (isNaN(redirectDelayVal) || redirectDelayVal < 0 || redirectDelayVal > 30) {
        redirectDelayContainer.classList.add('error');
        isValid = false;
      }
    }

    if (!isValid) return;

    // Deshabilitar botón durante el procesamiento
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="md-spinner" style="width: 20px; height: 20px; border-width: 2px;"></span> Procesando...`;

    try {
      let code;
      if (useCustomAlias) {
        code = customAlias;
      } else {
        code = await getUniqueCode();
      }

      // Guardar el objeto en IndexedDB
      const linkObj = {
        code: code,
        original_url: longUrl,
        clicks: 0,
        created_at: Date.now(),
        campaigns: selectedCampaigns, // Guardar las campañas asociadas
        ...(useCustomRedirect ? {
          redirect_msg: redirectMsg,
          redirect_delay: redirectDelayVal,
          redirect_type: redirectTypeVal
        } : {})
      };

      await saveLink(linkObj);

      // Transmitir evento de creación en tiempo real
      try {
        const channel = new BroadcastChannel('goo_short_realtime');
        channel.postMessage({ type: 'LINK_CREATED', link: linkObj });
        channel.close();
      } catch (e) {
        console.warn('Error al transmitir LINK_CREATED:', e);
      }

      // Mostrar resultados
      const shortUrl = `${window.location.origin}/${code}`;
      shortenedUrlText.textContent = shortUrl;
      shortenedUrlText.href = shortUrl;

      // Mostrar el texto del enlace acortado en la previsualización (sin el protocolo para que sea legible)
      qrPreviewUrlText.textContent = shortUrl.replace(/^https?:\/\//, '');

      // Generar código QR usando la API estable de QRServer (con el color azul de Google #1a73e8)
      // Solicitamos tamaño 300x300 para que la descarga sea en alta definición, pero se escala en el HTML
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shortUrl)}&color=1a73e8`;
      qrImg.src = qrUrl;

      // Configurar descarga del QR pasándole la URL de destino
      downloadQrBtn.onclick = async () => {
        downloadQrBtn.disabled = true;
        const iconSpan = downloadQrBtn.querySelector('.material-symbols-outlined');
        iconSpan.textContent = 'hourglass_empty';
        
        await downloadQRWithText(qrUrl, shortUrl, `qr-${code}.png`);
        
        iconSpan.textContent = 'download';
        downloadQrBtn.disabled = false;
      };

      // Animación para mostrar resultados
      form.style.display = 'none';
      resultSection.style.display = 'block';

    } catch (err) {
      console.error('Error al crear el enlace:', err);
      urlFieldContainer.classList.add('error');
      urlError.textContent = 'Ocurrió un error al guardar el enlace. Inténtalo de nuevo.';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <span class="material-symbols-outlined">bolt</span>
        Acortar enlace
      `;
    }
  });

  // Copiar al portapapeles
  copyBtn.addEventListener('click', () => {
    const textToCopy = shortenedUrlText.textContent;
    navigator.clipboard.writeText(textToCopy).then(() => {
      const iconSpan = copyBtn.querySelector('.material-symbols-outlined');
      iconSpan.textContent = 'done';
      copyBtn.classList.add('g-green');
      
      setTimeout(() => {
        iconSpan.textContent = 'content_copy';
        copyBtn.classList.remove('g-green');
      }, 2000);
    }).catch(err => {
      console.error('Error al copiar:', err);
    });
  });

  // Resetear formulario
  resetBtn.addEventListener('click', () => {
    form.reset();
    urlFieldContainer.classList.remove('error');
    aliasFieldContainer.classList.remove('error');
    aliasInputWrapper.classList.remove('show');
    redirectInputWrapper.classList.remove('show');
    redirectDelayContainer.classList.remove('error');
    
    // Limpiar selección de campañas
    selectedCampaigns = [];
    if (campaignsDropdown) {
      campaignsDropdown.querySelectorAll('input[type="checkbox"]').forEach(chk => chk.checked = false);
    }
    updateCampaignsSelectionUI();

    form.style.display = 'block';
    resultSection.style.display = 'none';
  });

  // --- Lógica del Selector de Campañas ---
  const campaignsTrigger = container.querySelector('#campaigns-trigger');
  const campaignsDropdown = container.querySelector('#campaigns-dropdown-menu');
  const campaignsTriggerText = container.querySelector('#campaigns-trigger-text');
  const campaignsChipsPreview = container.querySelector('#campaigns-chips-preview');
  
  let selectedCampaigns = [];
  let availableCampaigns = [];

  async function initCampaignsSelector() {
    try {
      availableCampaigns = await getAllCampaigns();
      renderCampaignsDropdown();
    } catch(err) {
      console.error('Error al inicializar selector de campañas:', err);
    }
  }

  function renderCampaignsDropdown() {
    if (availableCampaigns.length === 0) {
      campaignsDropdown.innerHTML = `
        <div style="padding: 10px; font-size: 13px; color: var(--md-sys-color-outline); text-align: center; font-style: italic;">
          No hay campañas creadas. <a href="/campanas" id="go-create-camp-link" style="color: var(--md-sys-color-primary); text-decoration: underline;">Crear una</a>
        </div>
      `;
      const goLink = campaignsDropdown.querySelector('#go-create-camp-link');
      if (goLink) {
        goLink.addEventListener('click', (e) => {
          e.preventDefault();
          window.history.pushState(null, '', '/campanas');
          window.dispatchEvent(new Event('popstate'));
        });
      }
      return;
    }

    campaignsDropdown.innerHTML = availableCampaigns.map(camp => `
      <div class="multiselect-option" data-id="${camp.id}">
        <input type="checkbox" id="chk-camp-${camp.id}" value="${camp.id}">
        <label for="chk-camp-${camp.id}" style="cursor: pointer; flex: 1;">${escapeHTML(camp.name)}</label>
      </div>
    `).join('');

    campaignsDropdown.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      chk.addEventListener('change', () => {
        const id = chk.value;
        if (chk.checked) {
          if (!selectedCampaigns.includes(id)) selectedCampaigns.push(id);
        } else {
          selectedCampaigns = selectedCampaigns.filter(cid => cid !== id);
        }
        updateCampaignsSelectionUI();
      });
    });

    campaignsDropdown.querySelectorAll('.multiselect-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return;
        const chk = opt.querySelector('input[type="checkbox"]');
        chk.checked = !chk.checked;
        chk.dispatchEvent(new Event('change'));
      });
    });
  }

  function updateCampaignsSelectionUI() {
    if (selectedCampaigns.length === 0) {
      campaignsTriggerText.textContent = 'Sin campañas seleccionadas';
      campaignsTriggerText.style.color = 'var(--md-sys-color-on-surface-variant)';
    } else {
      const names = selectedCampaigns.map(id => {
        const camp = availableCampaigns.find(c => c.id === id);
        return camp ? camp.name : '';
      }).filter(Boolean);
      campaignsTriggerText.textContent = names.join(', ');
      campaignsTriggerText.style.color = 'var(--md-sys-color-on-surface)';
    }

    campaignsChipsPreview.innerHTML = selectedCampaigns.map(id => {
      const camp = availableCampaigns.find(c => c.id === id);
      if (!camp) return '';
      return `
        <div class="chip-item" style="background-color: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); border: 1px solid rgba(11, 87, 208, 0.1);">
          <span>${escapeHTML(camp.name)}</span>
          <span class="material-symbols-outlined btn-remove-chip" data-id="${camp.id}" style="font-size: 16px; cursor: pointer; margin-left: 4px; user-select: none;">close</span>
        </div>
      `;
    }).join('');

    campaignsChipsPreview.querySelectorAll('.btn-remove-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        selectedCampaigns = selectedCampaigns.filter(cid => cid !== id);
        const chk = campaignsDropdown.querySelector(`#chk-camp-${id}`);
        if (chk) chk.checked = false;
        updateCampaignsSelectionUI();
      });
    });
  }

  campaignsTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    campaignsTrigger.classList.toggle('active');
    campaignsDropdown.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!campaignsTrigger.contains(e.target) && !campaignsDropdown.contains(e.target)) {
      campaignsTrigger.classList.remove('active');
      campaignsDropdown.classList.remove('show');
    }
  });

  initCampaignsSelector();
}

// Función helper para descargar el QR convirtiéndolo a blob local y agregando texto legible debajo
async function downloadQRWithText(qrImageUrl, shortUrl, filename) {
  try {
    // 1. Cargar la imagen del QR
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Clave para evitar problemas de CORS al manipular en canvas
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = qrImageUrl;
    });

    // 2. Crear un canvas en memoria
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 360; // 300px del QR + 60px para el texto y espaciado
    
    const ctx = canvas.getContext('2d');
    
    // 3. Rellenar el fondo de blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 4. Dibujar la imagen del código QR
    ctx.drawImage(img, 0, 0, 300, 300);
    
    // 5. Agregar el texto del enlace acortado
    ctx.fillStyle = '#1a73e8'; // Azul Google
    ctx.font = "bold 15px 'Outfit', 'Roboto', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Quitar el protocolo (http:// o https://) para que sea un texto de enlace limpio y legible
    const displayUrl = shortUrl.replace(/^https?:\/\//, '');
    ctx.fillText(displayUrl, 150, 330);
    
    // 6. Generar el Blob y forzar descarga
    canvas.toBlob((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 'image/png');

  } catch (err) {
    console.error('Error al componer el QR con texto:', err);
    // Fallback simple: descargar solo el QR sin el texto
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      window.open(qrImageUrl, '_blank');
    }
  }
}

// Generadores de códigos cortos auxiliares
function generateRandomCode(length = 5) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function getUniqueCode() {
  let code = generateRandomCode();
  let exists = await getLink(code);
  while (exists) {
    code = generateRandomCode();
    exists = await getLink(code);
  }
  return code;
}
