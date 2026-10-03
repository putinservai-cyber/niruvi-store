import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT || 3000);
const DIST_DIR = path.resolve(process.cwd(), 'dist');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.ts': 'application/javascript; charset=utf-8',
  '.tsx': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function getSafeFilePath(urlPath: string): string | null {
  const cleanPath = urlPath.split('?')[0].split('#')[0];
  const decodedPath = decodeURIComponent(cleanPath);
  const normalized = path.normalize(decodedPath).replace(/^(\.\.[\/\\])+/, '');
  const target = path.join(DIST_DIR, normalized);
  if (!target.startsWith(DIST_DIR)) return null;
  return target;
}

const server = http.createServer((req, res) => {
  const method = req.method || 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  const rawUrl = req.url || '/';
  // Strip subpath prefix if hosted under /niruvi-store
  const effectiveUrl =
    rawUrl.startsWith('/niruvi-store/') ? rawUrl.slice('/niruvi-store'.length) : rawUrl === '/niruvi-store' ? '/' : rawUrl;

  const targetPath = getSafeFilePath(effectiveUrl);
  if (!targetPath) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  let fileToServe: string | null = null;

  if (fs.existsSync(targetPath)) {
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      const indexCandidate = path.join(targetPath, 'index.html');
      if (fs.existsSync(indexCandidate)) {
        fileToServe = indexCandidate;
      }
    } else {
      fileToServe = targetPath;
    }
  }

  // SPA fallback: if not a direct file or if it lacks an extension, serve root dist/index.html
  if (!fileToServe) {
    const ext = path.extname(targetPath);
    if (!ext || ext === '.html') {
      const fallbackIndex = path.join(DIST_DIR, 'index.html');
      if (fs.existsSync(fallbackIndex)) {
        fileToServe = fallbackIndex;
      }
    }
  }

  if (!fileToServe || !fs.existsSync(fileToServe)) {
    const notFoundHtml = path.join(DIST_DIR, '404.html');
    if (fs.existsSync(notFoundHtml)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(notFoundHtml).pipe(res);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  const ext = path.extname(fileToServe).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
  };

  // Cache static hashed assets aggressively, html conservatively
  if (fileToServe.includes('/assets/')) {
    headers['Cache-Control'] = 'public, max-age=31536000, immutable';
  } else if (ext === '.html') {
    headers['Cache-Control'] = 'public, max-age=0, must-revalidate';
  } else {
    headers['Cache-Control'] = 'public, max-age=86400';
  }

  res.writeHead(200, headers);
  if (method === 'HEAD') {
    res.end();
  } else {
    fs.createReadStream(fileToServe).pipe(res);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Niruvi Store] Production server running on http://0.0.0.0:${PORT}`);
});
