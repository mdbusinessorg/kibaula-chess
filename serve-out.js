const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, 'out');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.map': 'application/json',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
};
http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(ROOT, urlPath);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  let stat = null;
  try { stat = fs.statSync(file); } catch {}
  if (stat && stat.isDirectory()) {
    const idx = path.join(file, 'index.html');
    file = fs.existsSync(idx) ? idx : file + '.html';
    stat = null;
  }
  if (!fs.existsSync(file)) {
    if (fs.existsSync(file + '.html')) file = file + '.html';
    else { file = path.join(ROOT, '404.html'); if (!fs.existsSync(file)) { res.writeHead(404); return res.end('nf'); } }
  }
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(3000, () => console.log('serving out/ on http://localhost:3000'));
