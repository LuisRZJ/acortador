// Endpoint de redirección pública y fallback en la nube
// api/redirect.js

const countries = {
  'AR': 'Argentina', 'BO': 'Bolivia', 'BR': 'Brasil', 'CL': 'Chile', 'CO': 'Colombia',
  'CR': 'Costa Rica', 'CU': 'Cuba', 'DO': 'República Dominicana', 'EC': 'Ecuador',
  'SV': 'El Salvador', 'ES': 'España', 'GT': 'Guatemala', 'HN': 'Honduras',
  'MX': 'México', 'NI': 'Nicaragua', 'PA': 'Panamá', 'PY': 'Paraguay', 'PE': 'Perú',
  'PR': 'Puerto Rico', 'UY': 'Uruguay', 'VE': 'Venezuela', 'US': 'Estados Unidos'
};

function parseUA(ua) {
  if (!ua) return { browser: 'Desconocido', os: 'Desconocido' };
  
  let os = 'Otro';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua) && !/like mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Otro';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/firefox|iceweasel|fxios/i.test(ua)) browser = 'Firefox';
  else if (/chrome|crios|crmodo/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome|crios|crmodo|edg/i.test(ua)) browser = 'Safari';
  else if (/opr|opera/i.test(ua)) browser = 'Opera';

  return { browser, os };
}

function parseReferrer(ref) {
  if (!ref) return 'Directo';
  try {
    const url = new URL(ref);
    // Retornar hostname sin subdominios si es posible
    return url.hostname || 'Directo';
  } catch (e) {
    return 'Directo';
  }
}

export default async function handler(req, res) {
  // CORS habilitado para visitas de cualquier origen
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: `Método ${req.method} no permitido.` });
  }

  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Falta el parámetro "code" en la consulta.' });
  }

  // 1. Validar variables de entorno críticas en Vercel
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const filePath = process.env.BACKUP_FILE_PATH || 'backup.json';

  if (!token || !repo) {
    console.error('Faltan GITHUB_TOKEN o GITHUB_REPO en las variables de entorno de Vercel.');
    return res.status(500).json({
      error: 'Configuración de base de datos incompleta en el servidor.'
    });
  }

  const githubUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const headersCommon = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GooShort-Vercel-Redirect-Function'
  };

  try {
    // 2. Consultar el respaldo desde GitHub
    const getResponse = await fetch(githubUrl, {
      method: 'GET',
      headers: headersCommon
    });

    if (getResponse.status === 404) {
      return res.status(404).json({ error: 'No se encontró el archivo de respaldo en GitHub.' });
    }

    if (!getResponse.ok) {
      const errText = await getResponse.text();
      throw new Error(`GitHub API (GET) falló: ${getResponse.status} - ${errText}`);
    }

    const currentFileData = await getResponse.json();
    const currentSha = currentFileData.sha;

    // Decodificar JSON de respaldo
    const decodedContent = Buffer.from(currentFileData.content, 'base64').toString('utf-8');
    const backupJson = JSON.parse(decodedContent);

    if (!backupJson || typeof backupJson !== 'object' || !Array.isArray(backupJson.links)) {
      return res.status(500).json({ error: 'La copia de seguridad no posee una estructura de base de datos válida.' });
    }

    // 3. Buscar el enlace
    const linkIndex = backupJson.links.findIndex(l => l.code === code);
    if (linkIndex === -1) {
      return res.status(404).json({ error: `El enlace corto /${code} no existe en la base de datos.` });
    }

    const link = backupJson.links[linkIndex];

    // 4. Registrar la visita en caliente
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    const { browser, os } = parseUA(ua);
    const countryCode = req.headers['x-vercel-ip-country'] || 'Desconocido';
    const country = countries[countryCode.toUpperCase()] || countryCode;
    const referrer = parseReferrer(req.headers['referer']);

    const newVisit = {
      timestamp: Date.now(),
      browser,
      os,
      country,
      referrer,
      ip: ip.split(',')[0].trim()
    };

    // Actualizar enlace en el JSON de base de datos
    link.clicks = (link.clicks || 0) + 1;
    if (!Array.isArray(link.visits)) {
      link.visits = [];
    }
    link.visits.push(newVisit);

    // 5. Guardar la base de datos actualizada en GitHub (petición PUT)
    const stringifiedData = JSON.stringify(backupJson, null, 2);
    const base64Content = Buffer.from(stringifiedData, 'utf-8').toString('base64');

    const putBody = {
      message: `Analytics: Clic registrado en enlace /${code} desde la nube [${newVisit.os}/${newVisit.browser}]`,
      content: base64Content,
      sha: currentSha
    };

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
      // Omitimos fallar del todo para redirigir al visitante aun si el guardado de analíticas falla por un conflicto menor de concurrencia
      console.error(`Conflicto al actualizar las analíticas en GitHub: ${putResponse.status} - ${errText}`);
    }

    // 6. Responder solo los datos requeridos para la redirección (protegiendo el resto de analíticas de terceros)
    return res.status(200).json({
      code: link.code,
      original_url: link.original_url,
      redirect_msg: link.redirect_msg,
      redirect_delay: link.redirect_delay,
      redirect_type: link.redirect_type
    });

  } catch (error) {
    console.error('Error al resolver la redirección en la nube:', error);
    return res.status(500).json({ error: error.message || 'Error interno al procesar la redirección.' });
  }
}
