// Función para fusionar de forma no destructiva la base de datos local y la de la nube
function mergeDatabases(localData, cloudData) {
  if (!cloudData || typeof cloudData !== 'object') {
    return {
      ...localData,
      timestamp: Date.now()
    };
  }

  const cloudLinks = Array.isArray(cloudData.links) ? cloudData.links : [];
  const localLinks = Array.isArray(localData.links) ? localData.links : [];

  const mergedLinksMap = new Map();

  // 1. Cargar enlaces de la nube como punto de partida
  for (const cLink of cloudLinks) {
    if (!cLink || !cLink.code) continue;
    mergedLinksMap.set(cLink.code, { ...cLink });
  }

  // 2. Fusionar con enlaces locales
  for (const lLink of localLinks) {
    if (!lLink || !lLink.code) continue;

    if (!mergedLinksMap.has(lLink.code)) {
      // Enlace nuevo creado en local
      mergedLinksMap.set(lLink.code, { ...lLink });
    } else {
      // El enlace existe en ambos lados: combinar visitas sin duplicados
      const existing = mergedLinksMap.get(lLink.code);
      const visitsMap = new Map();

      const existingVisits = Array.isArray(existing.visits) ? existing.visits : [];
      const localVisits = Array.isArray(lLink.visits) ? lLink.visits : [];

      for (const v of existingVisits) {
        if (v && v.timestamp) visitsMap.set(v.timestamp, v);
      }
      for (const v of localVisits) {
        if (v && v.timestamp) visitsMap.set(v.timestamp, v);
      }

      const mergedVisits = Array.from(visitsMap.values()).sort((a, b) => b.timestamp - a.timestamp);
      const maxClicks = Math.max(mergedVisits.length, existing.clicks || 0, lLink.clicks || 0);

      // Prevalecen los metadatos locales (URL original, configuración de redirección y campañas)
      mergedLinksMap.set(lLink.code, {
        ...existing,
        ...lLink,
        clicks: maxClicks,
        visits: mergedVisits
      });
    }
  }

  // 3. Fusionar campañas por ID único
  const cloudCampaigns = Array.isArray(cloudData.campaigns) ? cloudData.campaigns : [];
  const localCampaigns = Array.isArray(localData.campaigns) ? localData.campaigns : [];
  const campaignsMap = new Map();

  for (const c of cloudCampaigns) {
    if (c && c.id) campaignsMap.set(c.id, c);
  }
  for (const c of localCampaigns) {
    if (c && c.id) campaignsMap.set(c.id, c);
  }

  // 4. Fusionar ajustes
  const settings = {
    ...(cloudData.settings || {}),
    ...(localData.settings || {})
  };

  return {
    links: Array.from(mergedLinksMap.values()),
    campaigns: Array.from(campaignsMap.values()),
    settings,
    timestamp: Date.now()
  };
}

export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-backup-password');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Validar variables de entorno críticas en Vercel
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const passwordEnv = process.env.BACKUP_PASSWORD;
  const filePath = process.env.BACKUP_FILE_PATH || 'backup.json';

  if (!token || !repo || !passwordEnv) {
    console.error('Faltan variables de entorno críticas: GITHUB_TOKEN, GITHUB_REPO o BACKUP_PASSWORD');
    return res.status(500).json({
      error: 'Configuración incompleta en el servidor. Faltan variables de entorno en Vercel.'
    });
  }

  // 2. Validar contraseña de seguridad en las cabeceras
  const requestPassword = req.headers['x-backup-password'];
  if (!requestPassword || requestPassword !== passwordEnv) {
    return res.status(401).json({ error: 'Contraseña de seguridad incorrecta. Acceso no autorizado.' });
  }

  const githubUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;

  // Cabeceras comunes para la API de GitHub
  const headersCommon = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GooShort-Vercel-Backup-Function'
  };

  // --- MANEJO DE GET (RESTAURAR) ---
  if (req.method === 'GET') {
    try {
      const response = await fetch(githubUrl, {
        method: 'GET',
        headers: headersCommon
      });

      if (response.status === 404) {
        return res.status(404).json({ error: 'No se encontró ningún archivo de respaldo en el repositorio de GitHub.' });
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Error de GitHub API (GET): ${response.status} - ${errText}`);
      }

      const data = await response.json();
      
      // Decodificar Base64 de GitHub a UTF-8 string
      const decodedContent = Buffer.from(data.content, 'base64').toString('utf-8');
      let parsedData;
      try {
        parsedData = JSON.parse(decodedContent);
      } catch (e) {
        return res.status(500).json({ error: 'El archivo de respaldo en GitHub no tiene un formato JSON válido.' });
      }

      return res.status(200).json(parsedData);

    } catch (error) {
      console.error('Error al restaurar:', error);
      return res.status(500).json({ error: error.message || 'Error interno al consultar GitHub.' });
    }
  }

  // --- MANEJO DE POST (FUSIÓN Y RESPALDO INTELIGENTE) ---
  if (req.method === 'POST') {
    try {
      const backupData = req.body;
      if (!backupData || typeof backupData !== 'object') {
        return res.status(400).json({ error: 'El cuerpo de la petición debe contener los datos de respaldo en formato JSON.' });
      }

      // A. Consultar si el archivo ya existe en GitHub para obtener su contenido y SHA
      let currentSha = null;
      let cloudData = null;

      const getResponse = await fetch(githubUrl, {
        method: 'GET',
        headers: headersCommon
      });

      if (getResponse.ok) {
        const currentFileData = await getResponse.json();
        currentSha = currentFileData.sha;
        try {
          const decodedContent = Buffer.from(currentFileData.content, 'base64').toString('utf-8');
          cloudData = JSON.parse(decodedContent);
        } catch (e) {
          console.warn('El archivo de respaldo existente en GitHub no pudo parsearse como JSON.');
        }
      } else if (getResponse.status !== 404) {
        const errText = await getResponse.text();
        throw new Error(`Error al verificar existencia del archivo en GitHub: ${getResponse.status} - ${errText}`);
      }

      // B. Fusión inteligente bidireccional (Smart Merge)
      const mergedData = mergeDatabases(backupData, cloudData);

      // C. Codificar el nuevo contenido JSON a Base64
      const stringifiedData = JSON.stringify(mergedData, null, 2);
      const base64Content = Buffer.from(stringifiedData, 'utf-8').toString('base64');

      // D. Guardar archivo consolidado en GitHub
      const putBody = {
        message: `Sync: Sincronización y fusión inteligente - ${new Date().toLocaleString('es-ES')}`,
        content: base64Content
      };
      if (currentSha) {
        putBody.sha = currentSha;
      }

      const putResponse = await fetch(githubUrl, {
        method: 'PUT',
        headers: {
          ...headersCommon,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(putBody)
      });

      if (!putResponse.ok) {
        const errText = await putResponse.text();
        throw new Error(`Error de GitHub API (PUT): ${putResponse.status} - ${errText}`);
      }

      return res.status(200).json({
        message: 'Base de datos sincronizada y fusionada correctamente en GitHub.',
        data: mergedData
      });

    } catch (error) {
      console.error('Error al sincronizar y respaldar:', error);
      return res.status(500).json({ error: error.message || 'Error interno al escribir en GitHub.' });
    }
  }

  // Si no es GET, POST o OPTIONS
  return res.status(405).json({ error: `Método ${req.method} no permitido.` });
}
