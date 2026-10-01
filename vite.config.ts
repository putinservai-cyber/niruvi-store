import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function resolveBase(command: 'build' | 'serve'): string {
  const isPreview = process.argv.includes('preview');

  // In interactive dev server (`vite` on port 3000), serve at `/` so the AI Studio
  // preview root URL returns 200 OK instead of a 302 redirect to `/niruvi-store/`.
  if (command === 'serve' && !isPreview) {
    return '/';
  }

  // In `vite preview`, prefer the base path baked into `dist/index.html` so both
  // `VITE_BASE=/ npm run build && npm run preview` and `VITE_BASE=/niruvi-store/` work
  // even when the container environment has a default VITE_BASE set.
  if (isPreview) {
    try {
      const distIndex = fs.readFileSync(path.resolve(process.cwd(), 'dist/index.html'), 'utf-8');
      const match = distIndex.match(/src="(\/[^"]*?)assets\//);
      if (match?.[1]) {
        return match[1];
      }
    } catch {
      // Fall back to envBase below if dist/index.html is missing
    }
  }

  const envBase = process.env.VITE_BASE || process.env.VITE_BASE_PATH || '/niruvi-store/';
  const withLeading = envBase.startsWith('/') ? envBase : `/${envBase}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

export default defineConfig(({ command }) => ({
  base: resolveBase(command),
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'niruvi-dev-subpath-compat',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url && (req.url === '/niruvi-store' || req.url.startsWith('/niruvi-store/'))) {
            req.url = req.url.slice('/niruvi-store'.length) || '/';
          }
          next();
        });
      },
    },
  ],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
}));
