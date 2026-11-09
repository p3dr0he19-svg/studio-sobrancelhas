// Servidor estático do protótipo (sem dependências). Uso: node server.js  →  http://localhost:5173
const http = require('http'), fs = require('fs'), path = require('path');
const RAIZ = __dirname, PORTA = +process.env.PORT || 5173;
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/cliente') { res.writeHead(301, { Location: '/cliente/' }); return res.end(); }
  if (p.endsWith('/')) p += 'index.html';
  const arq = path.normalize(path.join(RAIZ, p));
  if (!arq.startsWith(RAIZ) || /[\\/](tools|server\.js)/.test(arq.slice(RAIZ.length))) { res.writeHead(403); return res.end(); }
  fs.readFile(arq, (err, dados) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Não encontrado'); }
    const h = { 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream', 'Cache-Control': 'no-cache' };
    if (p === '/sw.js') h['Service-Worker-Allowed'] = '/';
    res.writeHead(200, h); res.end(dados);
  });
}).listen(PORTA, () => console.log(`Painel da dona:  http://localhost:${PORTA}/\nApp da cliente:  http://localhost:${PORTA}/cliente`));
