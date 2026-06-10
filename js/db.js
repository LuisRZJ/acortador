const DB_NAME = 'acortador_db';
const DB_VERSION = 2; // Incrementar versión a 2 para agregar objectStore de campañas
const STORE_NAME = 'links';
const CAMPAIGNS_STORE_NAME = 'campaigns';

function updateLocalTimestamp() {
  try {
    localStorage.setItem('local_db_timestamp', Date.now().toString());
  } catch (e) {
    console.warn('No se pudo actualizar la marca de tiempo local:', e);
  }
}

export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('Error al abrir IndexedDB:', event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'code' });
      }
      if (!db.objectStoreNames.contains(CAMPAIGNS_STORE_NAME)) {
        db.createObjectStore(CAMPAIGNS_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export function saveLink(link) {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(link);

      request.onsuccess = () => {
        updateLocalTimestamp();
        resolve(link);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  });
}

export function getLink(code) {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(code);

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  });
}

export function getAllLinks() {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  });
}

export function deleteLink(code) {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(code);

      request.onsuccess = () => {
        updateLocalTimestamp();
        resolve(true);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  });
}

export function incrementClicks(code, visitData) {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(code);

      getRequest.onsuccess = () => {
        const link = getRequest.result;
        if (link) {
          link.clicks = (link.clicks || 0) + 1;
          if (!link.visits) {
            link.visits = [];
          }
          if (visitData) {
            link.visits.push(visitData);
          }
          const putRequest = store.put(link);
          putRequest.onsuccess = () => {
            updateLocalTimestamp();
            resolve(link);
          };
          putRequest.onerror = (e) => reject(e.target.error);
        } else {
          reject(new Error('Enlace no encontrado'));
        }
      };

      getRequest.onerror = (e) => reject(e.target.error);
    });
  });
}

export function clearAllLinks() {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        updateLocalTimestamp();
        resolve(true);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  });
}

// --- Funciones del Almacenamiento de Campañas ---

export function saveCampaign(campaign) {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CAMPAIGNS_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CAMPAIGNS_STORE_NAME);
      const request = store.put(campaign);

      request.onsuccess = () => {
        updateLocalTimestamp();
        resolve(campaign);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  });
}

export function deleteCampaign(id) {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CAMPAIGNS_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CAMPAIGNS_STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        updateLocalTimestamp();
        resolve(true);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  });
}

export function getAllCampaigns() {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CAMPAIGNS_STORE_NAME], 'readonly');
      const store = transaction.objectStore(CAMPAIGNS_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  });
}

export function getCampaign(id) {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CAMPAIGNS_STORE_NAME], 'readonly');
      const store = transaction.objectStore(CAMPAIGNS_STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  });
}

export function clearAllCampaigns() {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CAMPAIGNS_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CAMPAIGNS_STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        updateLocalTimestamp();
        resolve(true);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  });
}

