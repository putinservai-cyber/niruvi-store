import fs from 'fs';
import path from 'path';
import { formatAppVersion, hasKnownVersion } from '../src/utils/catalogSchema';

const rawEnvSiteUrl = (
  process.env.VITE_SITE_URL || 'https://niruvi-store.runs-on.dev'
).trim();
const httpsSiteOrigin = rawEnvSiteUrl
  .replace(/^http:\/\//i, 'https://')
  .replace(/^(?!https:\/\/)/i, 'https://')
  .replace(/\/+$/, '');
const isCustomDomain = !httpsSiteOrigin.includes('github.io');

const rawBase = isCustomDomain
  ? '/'
  : (
      process.env.VITE_BASE ||
      process.env.VITE_BASE_PATH ||
      '/niruvi-store/'
    ).trim();
const normalizedBaseLeading = rawBase.startsWith('/') ? rawBase : `/${rawBase}`;
const BASE_PATH = normalizedBaseLeading.endsWith('/')
  ? normalizedBaseLeading
  : `${normalizedBaseLeading}/`;
const baseNoTrailing = BASE_PATH.replace(/\/+$/, '');

const SITE_ORIGIN =
  baseNoTrailing && httpsSiteOrigin.endsWith(baseNoTrailing)
    ? httpsSiteOrigin.slice(0, -baseNoTrailing.length)
    : httpsSiteOrigin;

/**
 * Full public root URL combining VITE_SITE_URL + VITE_BASE (without trailing slash),
 * e.g. 'https://putinservai-cyber.github.io/niruvi-store' or 'https://niruvi-store.runs-on.dev'.
 */
const SITE_URL = `${SITE_ORIGIN}${baseNoTrailing}`;
const OG_IMAGE_URL = `${SITE_URL}/og-image.png`;

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildCanonicalUrl(canonicalPath: string): string {
  if (!canonicalPath || canonicalPath === '/') {
    return `${SITE_URL}/`;
  }
  const clean = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;
  return `${SITE_URL}${clean.replace(/\/+$/, '')}`;
}

function replaceHeadMetadata(
  html: string,
  meta: {
    title: string;
    description: string;
    canonicalPath: string;
    jsonLd?: Record<string, unknown>;
    inlineCss?: string;
  }
): string {
  const canonicalUrl = buildCanonicalUrl(meta.canonicalPath);
  const rootUrl = buildCanonicalUrl('/');
  const safeTitle = escapeHtml(meta.title);
  const safeDesc = escapeHtml(meta.description);

  let updated = html
    .replace(/<link\s+rel="stylesheet"\s+crossorigin\s+/gi, '<link rel="stylesheet" ')
    .replace(/href="\.\/favicon\.ico"/g, `href="${BASE_PATH}favicon.ico"`)
    .replace(/href="\.\/favicon\.png"/g, `href="${BASE_PATH}favicon.png"`)
    .replace(/href="\.\/apple-touch-icon\.png"/g, `href="${BASE_PATH}apple-touch-icon.png"`)
    .replace(/href="\.\/manifest\.json"/g, `href="${BASE_PATH}manifest.json"`)
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`)
    .replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${canonicalUrl}" />`
    )
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${safeDesc}" />`
    )
    .replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:url" content="${canonicalUrl}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${safeTitle}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${safeDesc}" />`
    )
    .replace(
      /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:image" content="${OG_IMAGE_URL}" />`
    )
    .replace(
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:title" content="${safeTitle}" />`
    )
    .replace(
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:description" content="${safeDesc}" />`
    )
    .replace(
      /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:image" content="${OG_IMAGE_URL}" />`
    )
    .replace(
      /(<script[^>]*id="base-webapplication-jsonld"[^>]*>[\s\S]*?"url":\s*)"[^"]*"/i,
      `$1"${rootUrl}"`
    );

  if (meta.jsonLd) {
    const jsonLdTag = `<script id="dynamic-software-jsonld" type="application/ld+json">${JSON.stringify(
      meta.jsonLd
    )}</script>`;
    updated = updated.replace('</head>', `    ${jsonLdTag}\n  </head>`);
  }

  return updated;
}

function injectRootContent(html: string, innerHtml: string): string {
  return html.replace(
    /<div id="root">[\s\S]*?<\/div>\s*<noscript>/i,
    `<div id="root">${innerHtml}</div>\n    <noscript>`
  );
}

function runPrerender() {
  const distDir = path.join(process.cwd(), 'dist');
  const indexHtmlPath = path.join(distDir, 'index.html');
  const catalogPath = path.join(process.cwd(), 'src', 'data', 'generated-catalog.json');

  if (!fs.existsSync(indexHtmlPath)) {
    console.error('❌ dist/index.html not found. Run `vite build` before prerendering.');
    process.exit(1);
  }

  let baseTemplate = fs.readFileSync(indexHtmlPath, 'utf-8');
  const assetsDir = path.join(distDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const cssFile = fs.readdirSync(assetsDir).find((f) => f.endsWith('.css'));
    if (cssFile) {
      const compiledCss = fs.readFileSync(path.join(assetsDir, cssFile), 'utf-8');
      if (compiledCss && !baseTemplate.includes('id="tailwind-compiled-css"')) {
        baseTemplate = baseTemplate.replace(
          '</head>',
          `    <style id="tailwind-compiled-css">${compiledCss}</style>\n  </head>`
        );
      }
    }
  }
  const apps: any[] = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

  // Update dist/404.html canonical URL if present
  const dist404Path = path.join(distDir, '404.html');
  if (fs.existsSync(dist404Path)) {
    const raw404 = fs.readFileSync(dist404Path, 'utf-8');
    const updated404 = raw404.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${buildCanonicalUrl('/404')}" />`
    );
    fs.writeFileSync(dist404Path, updated404, 'utf-8');
  }

  // 1. Pre-render Homepage (dist/index.html) with all catalog cards
  const cardsHtml = apps
    .map((app) => {
      const isCommunity = app.source === 'community' || app.sourceType === 'Community';
      const communityBadge = isCommunity
        ? `<span class="text-amber-300 text-xs font-mono">Community submitted</span>`
        : '';
      const verifiedBadge = app.publisher?.verified
        ? `<span class="text-emerald-400 text-xs font-mono">SHA-256 Verified</span>`
        : app.checksumStatus === 'provided' && app.sha256
          ? `<span class="text-sky-300 text-xs font-mono">Checksum: Provided</span>`
          : `<span class="text-amber-400 text-xs font-mono">Checksum: Unverified</span>`;
      return `<article class="flex flex-col gap-3 min-w-0 bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5">
        <div class="flex items-center justify-between gap-2 min-w-0">
          <h2 class="font-bold text-base text-white truncate">
            <a href="${BASE_PATH}app/${encodeURIComponent(app.id)}">${escapeHtml(app.name)}</a>
          </h2>
          <div class="flex items-center gap-2">${communityBadge}${verifiedBadge}</div>
        </div>
        <p class="w-full text-xs text-neutral-300 line-clamp-2 leading-relaxed">${escapeHtml(app.tagline || app.description)}</p>
        <dl class="text-xs text-neutral-300 space-y-1 font-mono">
          <div><dt class="inline text-neutral-400">Version:</dt> <dd class="inline">${escapeHtml(formatAppVersion(app.version))}</dd></div>
          <div><dt class="inline text-neutral-400">Size:</dt> <dd class="inline">${escapeHtml(app.size)}</dd></div>
          <div><dt class="inline text-neutral-400">Architecture:</dt> <dd class="inline">${escapeHtml((app.architectures || []).join(', '))}</dd></div>
          <div><dt class="inline text-neutral-400">License:</dt> <dd class="inline">${escapeHtml(app.license)}</dd></div>
          <div><dt class="inline text-neutral-400">SHA-256:</dt> <dd class="inline break-all">${escapeHtml(app.sha256)}</dd></div>
        </dl>
        <div class="flex items-center gap-3 text-xs">
          <a href="${BASE_PATH}app/${encodeURIComponent(app.id)}" class="underline text-sky-400">View Details &amp; Verify</a>
          <a href="${escapeHtml(app.downloadUrl)}" rel="noopener noreferrer" class="underline text-emerald-400">Direct HTTPS Download</a>
        </div>
      </article>`;
    })
    .join('\n');

  const homeInnerHtml = `
    <header class="border-b border-neutral-800 bg-[#0a0a0c] px-6 py-4">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <a href="${BASE_PATH}" class="font-bold text-lg text-white">Niruvi Store</a>
        <nav aria-label="Primary store navigation" class="flex items-center gap-4 text-xs text-neutral-300">
          <a href="${BASE_PATH}">Store Browse</a>
          <a href="${BASE_PATH}verifier">SHA-256 Verifier</a>
          <a href="${BASE_PATH}submit">Submit AppImage</a>
          <a href="${BASE_PATH}donate">Donate</a>
          <a href="${BASE_PATH}privacy">Privacy Policy</a>
          <a href="${BASE_PATH}terms">Terms</a>
        </nav>
      </div>
    </header>
    <main id="main-content" class="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-white">Linux AppImage Software Directory</h1>
        <p class="text-sm text-neutral-300 mt-1">
          Portable Linux desktop packages with SHA-256 checksums and one-click niruvi:// desktop installation.
        </p>
      </div>
      <section aria-label="Application catalog" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        ${cardsHtml}
      </section>
    </main>`;

  const homeHtml = injectRootContent(
    replaceHeadMetadata(baseTemplate, {
      title: 'Niruvi Store — Verified Linux AppImage Marketplace',
      description:
        'Discover standalone Linux AppImage packages with cryptographic SHA-256 verification, upstream source transparency, and one-click niruvi:// desktop installation.',
      canonicalPath: '/',
    }),
    homeInnerHtml
  );
  fs.writeFileSync(indexHtmlPath, homeHtml, 'utf-8');

  // 2. Pre-render Individual App Detail Pages: dist/app/<id>/index.html
  for (const app of apps) {
    const appPath = `/app/${encodeURIComponent(app.id)}`;
    const formattedVer = formatAppVersion(app.version);
    const verSuffix = hasKnownVersion(app.version) ? ` ${formattedVer}` : '';
    const appTitle = `${app.name}${verSuffix} — Download Linux AppImage | Niruvi Store`;
    const appDesc = `Download ${app.name}${verSuffix} (${app.size}, ${(app.architectures || []).join(', ')}) standalone Linux AppImage with SHA-256 checksum (${String(app.sha256).slice(0, 12)}…) on Niruvi Store.`;
    const fileVer = hasKnownVersion(app.version) ? `-${String(app.version).replace(/^v/i, '')}` : '';
    const fileName = `${app.id}${fileVer}-${(app.architectures && app.architectures[0]) || 'x86_64'}.AppImage`;
    const niruviUri = `niruvi://install?id=${encodeURIComponent(app.id)}&name=${encodeURIComponent(app.name)}&version=${encodeURIComponent(app.version)}&url=${encodeURIComponent(app.downloadUrl)}&sha256=${encodeURIComponent(app.sha256)}`;

    const softwareJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: app.name,
      softwareVersion: formattedVer,
      description: app.description,
      applicationCategory: app.category,
      operatingSystem: 'Linux',
      fileSize: app.size,
      downloadUrl: app.downloadUrl,
      url: buildCanonicalUrl(appPath),
      license: app.license,
      author: {
        '@type': 'Organization',
        name: app.publisher?.name || 'Linux Publisher',
        ...(app.publisher?.website ? { url: app.publisher.website } : {}),
      },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    };

    const appInnerHtml = `
      <header class="border-b border-neutral-800 bg-[#0a0a0c] px-6 py-4">
        <div class="max-w-5xl mx-auto flex items-center justify-between">
          <a href="${BASE_PATH}" class="font-bold text-lg text-white">← Back to Niruvi Store</a>
          <span class="text-xs font-mono text-neutral-300">${escapeHtml(app.category)}</span>
        </div>
      </header>
      <main id="main-content" class="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <article class="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 class="text-2xl font-bold text-white">${escapeHtml(app.name)} <span class="text-sm font-mono text-neutral-300">${escapeHtml(formattedVer)}</span></h1>
              <p class="text-sm text-neutral-300 mt-1">${escapeHtml(app.tagline)}</p>
            </div>
            <div class="flex items-center gap-2">
              ${
                app.source === 'community' || app.sourceType === 'Community'
                  ? '<span class="text-xs font-mono text-amber-300">Community submitted</span>'
                  : ''
              }
              ${
                app.publisher?.verified
                  ? '<span class="text-xs font-mono text-emerald-400">SHA-256 Verified</span>'
                  : app.checksumStatus === 'provided' && app.sha256
                    ? '<span class="text-xs font-mono text-sky-300">Checksum: Provided</span>'
                    : '<span class="text-xs font-mono text-amber-400">Checksum: Unverified</span>'
              }
            </div>
          </div>
          <p class="text-sm text-neutral-200 leading-relaxed">${escapeHtml(app.description)}</p>
          <dl class="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
            <div><dt class="text-neutral-400">Developer</dt><dd class="text-white font-semibold">${escapeHtml(app.publisher?.name || '')}</dd></div>
            <div><dt class="text-neutral-400">Version</dt><dd class="text-white font-mono">${escapeHtml(formattedVer)}</dd></div>
            <div><dt class="text-neutral-400">Size</dt><dd class="text-white font-mono">${escapeHtml(app.size)}</dd></div>
            <div><dt class="text-neutral-400">Architecture</dt><dd class="text-white font-mono">${escapeHtml((app.architectures || []).join(', '))}</dd></div>
            <div><dt class="text-neutral-400">License</dt><dd class="text-white">${escapeHtml(app.license)}</dd></div>
            <div><dt class="text-neutral-400">Source URL</dt><dd><a href="${escapeHtml(app.sourceUrl || app.homepageUrl || '')}" rel="noopener noreferrer" class="text-sky-400 underline">${escapeHtml(app.sourceUrl || app.homepageUrl || 'Upstream')}</a></dd></div>
          </dl>
          <section class="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
            <h2 class="font-bold text-white text-sm">Install or Download Standalone AppImage</h2>
            <div class="flex flex-wrap gap-3 pt-1">
              <a href="${escapeHtml(niruviUri)}" class="px-4 py-2 rounded-xl bg-white text-black font-semibold">Install with Niruvi (niruvi://)</a>
              <a href="${escapeHtml(app.downloadUrl)}" rel="noopener noreferrer" class="px-4 py-2 rounded-xl bg-neutral-800 text-white border border-neutral-700 font-semibold">Direct HTTPS Download (${escapeHtml(app.size)})</a>
            </div>
            <p class="text-neutral-300 pt-2">Manual Linux installation &amp; SHA-256 verification fallback (if Niruvi desktop client is not installed):</p>
            <pre class="p-3 bg-black rounded border border-neutral-800 font-mono text-emerald-400 overflow-x-auto">echo "${escapeHtml(app.sha256)}  ${escapeHtml(fileName)}" | sha256sum --check
chmod +x ./${escapeHtml(fileName)}
./${escapeHtml(fileName)}</pre>
          </section>
        </article>
      </main>`;

    const appPageHtml = injectRootContent(
      replaceHeadMetadata(baseTemplate, {
        title: appTitle,
        description: appDesc,
        canonicalPath: appPath,
        jsonLd: softwareJsonLd,
      }),
      appInnerHtml
    );

    const outAppDir = path.join(distDir, 'app', app.id);
    fs.mkdirSync(outAppDir, { recursive: true });
    fs.writeFileSync(path.join(outAppDir, 'index.html'), appPageHtml, 'utf-8');
  }

  // 3. Pre-render top-level static routes (/verifier, /submit, /donate, /library, /privacy, /terms, /cookies, /refunds)
  const staticPages = [
    {
      slug: 'verifier',
      title: 'SHA-256 Checksum Verifier — Niruvi Store',
      description:
        'Verify Linux AppImage files in your browser using WebCrypto SHA-256 checksum comparison.',
      heading: 'In-Browser Cryptographic SHA-256 AppImage Verifier',
    },
    {
      slug: 'submit',
      title: 'Submit an AppImage Package — Niruvi Store',
      description:
        'Submit a new open-source Linux AppImage package with SHA-256 metadata to Niruvi Store.',
      heading: 'Submit or Test a Linux AppImage Package',
    },
    {
      slug: 'donate',
      title: 'Support & Donate — Niruvi Store',
      description:
        'Support open-source Linux AppImage indexing, SHA-256 verification, and niruvi:// desktop launcher development.',
      heading: 'Support & Donate to Niruvi Store',
    },
    {
      slug: 'library',
      title: 'My Installed & Bookmarked AppImages — Niruvi Store',
      description: 'Manage your bookmarked and installed Linux AppImage packages.',
      heading: 'My Linux AppImage Library',
    },
    {
      slug: 'privacy',
      title: 'Privacy Policy — Niruvi Store',
      description: 'Niruvi Store privacy policy and zero-telemetry data handling summary.',
      heading: 'Privacy Policy — We Do Not Sell Your Personal Data',
    },
    {
      slug: 'terms',
      title: 'Terms & Conditions — Niruvi Store',
      description: 'Terms and conditions for using the Niruvi Linux AppImage directory.',
      heading: 'Terms & Conditions',
    },
    {
      slug: 'cookies',
      title: 'Cookie & Local Storage Policy — Niruvi Store',
      description: 'Details on local browser storage and consent choices on Niruvi Store.',
      heading: 'Cookie & Browser Local Storage Policy',
    },
    {
      slug: 'refunds',
      title: 'Refund & Supporter Policy — Niruvi Store',
      description: 'Voluntary open-source supporter contributions and refund policy.',
      heading: 'Refund & Supporter Contribution Policy',
    },
    {
      slug: 'admin',
      title: 'Admin Governance — Niruvi Store',
      description: 'Platform governance and catalog verification console for Niruvi Store.',
      heading: 'Platform Governance & Catalog Verification Console',
    },
    {
      slug: 'security',
      title: 'Security Platform — Niruvi Store',
      description: 'Cryptographic SHA-256 verification and AppImage security architecture.',
      heading: 'Niruvi Store Security & Verification Architecture',
    },
  ];

  for (const sp of staticPages) {
    const routeDir = path.join(distDir, sp.slug);
    fs.mkdirSync(routeDir, { recursive: true });
    const inner = `
      <main id="main-content" class="max-w-4xl mx-auto px-6 py-10 space-y-4">
        <a href="${BASE_PATH}" class="text-xs text-sky-400 underline">← Return to Niruvi Store</a>
        <h1 class="text-2xl font-bold text-white">${escapeHtml(sp.heading)}</h1>
        <p class="text-sm text-neutral-300">${escapeHtml(sp.description)}</p>
      </main>`;
    const pageHtml = injectRootContent(
      replaceHeadMetadata(baseTemplate, {
        title: sp.title,
        description: sp.description,
        canonicalPath: `/${sp.slug}`,
      }),
      inner
    );
    fs.writeFileSync(path.join(routeDir, 'index.html'), pageHtml, 'utf-8');
  }

  // Mirror `dist/assets` and root static files into `dist/niruvi-store/` so that
  // requests to `/niruvi-store/assets/index-*.css` or `/niruvi-store/assets/index-*.js`
  // on root-hosted deployments (`/` on runs-on.dev or AI Studio Shared App) always serve
  // the real compiled Tailwind CSS and JS bundles instead of an empty SPA fallback.
  const subpathDir = path.join(distDir, 'niruvi-store');
  const distAssetsDir = path.join(distDir, 'assets');
  if (fs.existsSync(distAssetsDir)) {
    fs.cpSync(distAssetsDir, path.join(subpathDir, 'assets'), { recursive: true });
    for (const staticFile of [
      'index.html',
      'favicon.ico',
      'favicon.png',
      'apple-touch-icon.png',
      'og-image.png',
      'manifest.json',
      'catalog.min.json',
      'catalog.json',
    ]) {
      const srcFile = path.join(distDir, staticFile);
      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, path.join(subpathDir, staticFile));
      }
    }
  }

  console.log(
    `✅ Pre-rendered dist/index.html, ${apps.length} dist/app/<id>/index.html pages, and ${staticPages.length} route pages (SITE_URL=${SITE_URL}, BASE_PATH=${BASE_PATH})!`
  );
}

runPrerender();
