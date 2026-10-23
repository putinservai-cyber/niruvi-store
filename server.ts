import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import worker from './src/worker';

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

const server = http.createServer(async (req, res) => {
  const method = req.method || 'GET';
  const rawUrl = req.url || '/';
  // Strip subpath prefix if hosted under /niruvi-store
  const effectiveUrl =
    rawUrl.startsWith('/niruvi-store/')
      ? rawUrl.slice('/niruvi-store'.length)
      : rawUrl === '/niruvi-store'
        ? '/'
        : rawUrl;

  // Route /api/* directly through Cloudflare Worker API & D1 handler
  if (effectiveUrl.startsWith('/api/')) {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const fullUrl = `http://127.0.0.1:${PORT}${effectiveUrl}`;
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) {
          if (v) {
            headers.set(k, Array.isArray(v) ? v.join(', ') : v);
          }
        }
        const hasBody = method !== 'GET' && method !== 'HEAD';
        const bodyBuffer = hasBody && chunks.length > 0 ? Buffer.concat(chunks) : undefined;
        const webReq = new Request(fullUrl, {
          method,
          headers,
          body: bodyBuffer,
        });

        const workerRes = await worker.fetch(webReq, {
          JWT_SECRET: process.env.JWT_SECRET || 'niruvi_dev_secret_key_2026',
          ADMIN_TOKEN: process.env.ADMIN_TOKEN || '',
          GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
        });

        const responseHeaders: Record<string, string> = {};
        workerRes.headers.forEach((v, k) => {
          responseHeaders[k] = v;
        });

        res.writeHead(workerRes.status, responseHeaders);
        const arrayBuf = await workerRes.arrayBuffer();
        res.end(Buffer.from(arrayBuf));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
    return;
  }

  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

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
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '0',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https:; frame-src 'self' https://www.youtube-nocookie.com https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self';",
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
