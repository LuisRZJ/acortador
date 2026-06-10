// Serverless Function para respaldar/restaurar en un repositorio privado de GitHub
// api/backup.js

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

  // --- MANEJO DE POST (RESPALDAR) ---
  if (req.method === 'POST') {
    try {
      const backupData = req.body;
      if (!backupData || typeof backupData !== 'object') {
        return res.status(400).json({ error: 'El cuerpo de la petición debe contener los datos de respaldo en formato JSON.' });
      }

      // A. Consultar si el archivo ya existe para obtener su SHA (evitar colisiones en actualizaciones)
      let currentSha = null;
      const getResponse = await fetch(githubUrl, {
        method: 'GET',
        headers: headersCommon
      });

      if (getResponse.ok) {
        const currentFileData = await getResponse.json();
        currentSha = currentFileData.sha;
      } else if (getResponse.status !== 404) {
        const errText = await getResponse.text();
        throw new Error(`Error al verificar existencia del archivo en GitHub: ${getResponse.status} - ${errText}`);
      }

      // B. Codificar el nuevo contenido JSON a Base64
      const stringifiedData = JSON.stringify(backupData, null, 2);
      const base64Content = Buffer.from(stringifiedData, 'utf-8').toString('base64');

      // C. Subir/Sobrescribir archivo en GitHub
      const putBody = {
        message: `Backup: Sincronización automática desde Goo.short - ${new Date().toLocaleString('es-ES')}`,
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

      return res.status(200).json({ message: 'Respaldo sincronizado en GitHub correctamente.' });

    } catch (error) {
      console.error('Error al respaldar:', error);
      return res.status(500).json({ error: error.message || 'Error interno al escribir en GitHub.' });
    }
  }

  // Si no es GET, POST o OPTIONS
  return res.status(405).json({ error: `Método ${req.method} no permitido.` });
}
