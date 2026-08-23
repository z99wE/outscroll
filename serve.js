const http = require('http');
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'frontend', 'dist');
const API_BACKEND = 'http://localhost:3456';
const PORT = 5175;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  // Proxy /api/* requests to backend
  if (req.url.startsWith('/api/')) {
    const proxyUrl = new URL(req.url, API_BACKEND);
    const proxyReq = http.request(proxyUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        host: proxyUrl.host,
      },
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (e) => {
      console.error('Proxy error:', e.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Backend unavailable' }));
    });
    req.pipe(proxyReq);
    return;
  }

  // Serve static files
  let filePath = path.join(distDir, req.url === '/' ? 'index.html' : req.url);
  if (!fs.existsSync(filePath)) filePath = path.join(distDir, 'index.html');
  const ext = path.extname(filePath);
  const mime = mimeTypes[ext] || 'application/octet-stream';
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`OutScroll serving on http://localhost:${PORT} (proxying /api to ${API_BACKEND})`);
});
