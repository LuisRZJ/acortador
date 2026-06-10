// Helper para escapar caracteres de HTML y prevenir XSS
export function escapeHTML(str) {
  if (!str) return '';
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

// Parsea un subset simplificado de Markdown (negritas, cursivas y enlaces seguros)
export function parseMarkdown(text) {
  if (!text) return '';
  
  // 1. Escapar HTML crudo contra ataques XSS
  let html = escapeHTML(text);
  
  // 2. Procesar enlaces [texto](url)
  // Permite solo enlaces absolutos seguros (http o https) para evitar inyecciones javascript:
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (match, label, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--md-sys-color-primary); text-decoration: underline; font-weight: 500;">${label}</a>`;
  });
  
  // 3. Procesar negritas (**texto** o __texto__)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // 4. Procesar cursivas (*texto* o _texto_)
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  // 5. Procesar saltos de línea
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

// Muestra un modal de diálogo personalizado de Material Design 3 para ingresar la URL de un enlace
function showLinkPromptModal() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'md-dialog-overlay';
    overlay.style.zIndex = '2000'; // Asegurar que quede por encima de otros modales activos

    overlay.innerHTML = `
      <div class="md-dialog" style="max-width: 400px; padding: 24px; border-radius: 28px;">
        <h3 class="md-dialog-title" style="font-size: 20px; margin-bottom: 12px; font-weight: 500;">Insertar enlace</h3>
        <div class="md-dialog-content" style="margin-bottom: 20px; color: var(--md-sys-color-on-surface-variant); font-size: 14px;">
          Introduce la dirección web para el enlace:
          <div class="outlined-text-field" id="prompt-url-field-container" style="margin-top: 16px; margin-bottom: 0;">
            <input type="url" id="prompt-link-url" value="https://" placeholder=" " required autocomplete="off">
            <label for="prompt-link-url">URL del enlace</label>
            <div class="field-error-msg" id="prompt-url-error" style="margin-top: 4px;">Por favor, introduce una URL válida.</div>
          </div>
        </div>
        <div class="md-dialog-actions" style="display: flex; justify-content: flex-end; gap: 8px;">
          <button class="md-btn md-btn-outlined" id="prompt-cancel-btn" style="height: 36px; padding: 0 16px; font-size: 13px;">Cancelar</button>
          <button class="md-btn md-btn-primary" id="prompt-insert-btn" style="height: 36px; padding: 0 16px; font-size: 13px;">Insertar</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('#prompt-link-url');
    const insertBtn = overlay.querySelector('#prompt-insert-btn');
    const cancelBtn = overlay.querySelector('#prompt-cancel-btn');
    const fieldContainer = overlay.querySelector('#prompt-url-field-container');

    // Enfocar input y posicionar cursor al final de "https://"
    input.focus();
    input.setSelectionRange(8, 8);

    function handleInsert() {
      let url = input.value.trim();
      let isValid = true;

      if (!url || url === 'https://' || url === 'http://') {
        fieldContainer.classList.add('error');
        isValid = false;
      } else {
        // Añadir esquema si falta
        if (!/^https?:\/\//i.test(url)) {
          url = 'https://' + url;
        }

        try {
          new URL(url);
        } catch (e) {
          fieldContainer.classList.add('error');
          isValid = false;
        }
      }

      if (isValid) {
        cleanup();
        resolve(url);
      }
    }

    function handleCancel() {
      cleanup();
      resolve(null);
    }

    function cleanup() {
      document.body.removeChild(overlay);
      window.removeEventListener('keydown', onGlobalKeyDown);
    }

    function onGlobalKeyDown(e) {
      if (e.key === 'Escape') {
        handleCancel();
      }
    }

    insertBtn.addEventListener('click', handleInsert);
    cancelBtn.addEventListener('click', handleCancel);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) handleCancel();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleInsert();
      }
    });

    input.addEventListener('input', () => {
      fieldContainer.classList.remove('error');
    });

    window.addEventListener('keydown', onGlobalKeyDown);
  });
}

// Inserta formato markdown en la posición del cursor de un textarea
export async function insertMarkdownFormat(textarea, type) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.substring(start, end);
  
  let replacement = '';
  let cursorOffset = 0;
  
  if (type === 'bold') {
    replacement = `**${selected || 'texto'}**`;
    cursorOffset = selected ? 0 : 2; // Colocar cursor dentro de las negritas
  } else if (type === 'italic') {
    replacement = `*${selected || 'texto'}*`;
    cursorOffset = selected ? 0 : 1; // Colocar cursor dentro de la cursiva
  } else if (type === 'link') {
    const url = await showLinkPromptModal();
    if (url === null) {
      textarea.focus();
      return; // Cancelado
    }
    replacement = `[${selected || 'enlace'}](${url})`;
  }
  
  textarea.value = text.substring(0, start) + replacement + text.substring(end);
  textarea.focus();
  
  // Colocar selección en el texto formateado
  const newCursorPos = start + replacement.length - cursorOffset;
  textarea.setSelectionRange(newCursorPos, newCursorPos);
  
  // Disparar evento de input para actualizaciones reactivas
  textarea.dispatchEvent(new Event('input'));
}

// Configura los eventos de la barra de herramientas y atajos de teclado
export function setupMarkdownToolbar(toolbarContainer, textarea) {
  if (!toolbarContainer || !textarea) return;

  // 1. Escuchar clics en los botones de la barra
  toolbarContainer.addEventListener('click', async (e) => {
    const btn = e.target.closest('.toolbar-btn');
    if (!btn) return;
    
    e.preventDefault();
    const type = btn.getAttribute('data-type');
    await insertMarkdownFormat(textarea, type);
  });

  // 2. Escuchar atajos de teclado (Ctrl + B, Ctrl + I, Ctrl + K)
  textarea.addEventListener('keydown', async (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        await insertMarkdownFormat(textarea, 'bold');
      } else if (key === 'i') {
        e.preventDefault();
        await insertMarkdownFormat(textarea, 'italic');
      } else if (key === 'k') {
        e.preventDefault();
        await insertMarkdownFormat(textarea, 'link');
      }
    }
  });
}
