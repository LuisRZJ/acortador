import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const server = http.createServer(async (req, res) => {
  // Emulación de helpers de entorno serverless (Vercel)
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
    return res;
  };

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:' + PORT}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // Manejo de endpoints API locales (/api/backup, /api/redirect)
  if (pathname.startsWith('/api/')) {
    req.query = Object.fromEntries(parsedUrl.searchParams.entries());

    if (req.method === 'POST') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }
      try {
        req.body = body ? JSON.parse(body) : {};
      } catch (e) {
        req.body = body;
      }
    }

    try {
      if (pathname === '/api/backup') {
        const backupModule = await import('./api/backup.js?t=' + Date.now());
        return await backupModule.default(req, res);
      }
      if (pathname === '/api/redirect') {
        const redirectModule = await import('./api/redirect.js?t=' + Date.now());
        return await redirectModule.default(req, res);
      }
      return res.status(404).json({ error: 'Endpoint API no encontrado.' });
    } catch (err) {
      console.error('Error al ejecutar API local:', err);
      return res.status(500).json({ error: err.message || 'Error interno en la API local' });
    }
  }

  // Manejo de archivos estáticos y SPA Fallback
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    } else {
      // Fallback SPA (rutas SPA internas como /gestion, /analiticas, /campanas, /ajustes o códigos cortos /:code)
      const indexPath = path.join(__dirname, 'index.html');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexPath).pipe(res);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Vista previa activa en: http://localhost:${PORT}`);
});
