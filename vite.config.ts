import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function resolveBase(command: 'build' | 'serve'): string {
  const isPreview = process.argv.includes('preview');

  if (command === 'serve' && !isPreview) {
    return '/';
  }

  if (isPreview) {
    try {
      const distIndex = fs.readFileSync(path.resolve(process.cwd(), 'dist/index.html'), 'utf-8');
      const match = distIndex.match(/src="(\/[^"]*?)assets\//);
      if (match?.[1]) {
        return match[1];
      }
    } catch {
      // Fall back below if dist/index.html is missing
    }
  }

  const rawSiteUrl = (process.env.VITE_SITE_URL || 'https://niruvi-store.runs-on.dev').trim();
  const rawBase = (process.env.VITE_BASE || process.env.VITE_BASE_PATH || '/').trim();

  // On custom domains (e.g. niruvi-store.runs-on.dev), the site always lives at `/`.
  if (!rawSiteUrl.includes('github.io')) {
    return '/';
  }

  const effectiveBase = rawBase || '/niruvi-store/';
  const withLeading = effectiveBase.startsWith('/') ? effectiveBase : `/${effectiveBase}`;
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
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'INVALID_ANNOTATION' && warning.id?.includes('node_modules/zod')) {
          return;
        }
        warn(warning);
      },
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
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
