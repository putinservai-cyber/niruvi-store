# Niruvi Store

<div align="center">

![Niruvi Store Logo](public/niruvi-icon.png)

**The Decentralized, Free, Open-Source Linux Application Marketplace for AppImages**

[![Validate Catalog](https://github.com/putinservai-cyber/niruvi-store/actions/workflows/validate.yml/badge.svg)](https://github.com/putinservai-cyber/niruvi-store/actions/workflows/validate.yml)
[![Deploy](https://github.com/putinservai-cyber/niruvi-store/actions/workflows/deploy.yml/badge.svg)](https://niruvi-store.putinservai.workers.dev)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![AppImage Support](https://img.shields.io/badge/AppImage-Ready-5851DB.svg)](https://appimage.org/)

[**Live Web Store (`niruvi-store.putinservai.workers.dev`)**](https://niruvi-store.putinservai.workers.dev) • [**Niruvi Desktop Manager**](https://github.com/putinservai-cyber/niruvi) • [**Submit Application**](CONTRIBUTING.md) • [**Support on Ko-fi**](https://ko-fi.com/putinservai)

</div>

---

## 🌟 What is Niruvi Store?

**Niruvi Store** is a 100% free, community-governed open-source Linux software store designed specifically for the **AppImage** packaging ecosystem.

Traditional Linux package managers require root privileges, complex PPA repositories, or heavy background runtimes. Niruvi Store empowers users to discover, verify, and run self-contained Linux applications with zero friction, zero telemetry, and zero cost.

### Core Pillars

- 🐧 **AppImage-First**: Purpose-built for standalone Linux binaries that run without installation across any modern distribution (Ubuntu, Debian, Fedora, Arch, openSUSE, Alpine).
- 🛡️ **Cryptographic Verification**: Native SHA-256 checksum tracking with in-browser hash verification tools to protect users against binary tampering.
- ⚡ **Zero-Cost $0 Infrastructure**: Hosted entirely on **GitHub Pages**, with downloads served directly from upstream **GitHub Releases** and metadata stored in human-readable JSON files.
- 🔗 **Niruvi Protocol Integration**: Directly triggers one-click downloads and sandbox management via `niruvi://install?...` protocol in the companion [Niruvi](https://github.com/putinservai-cyber/niruvi) desktop manager.
- 🤝 **Decentralized Contributions**: Adding a new application requires only a single JSON file in `catalog/apps/<name>.json`—no database access, no backend approval servers, no proprietary gatekeepers.

---

## 🏗️ Architecture

Niruvi Store runs seamlessly both as a **Cloudflare Worker with D1, KV, and Cron Triggers** (`src/worker.ts` + `wrangler.json`) and as a **pre-rendered static build** (`npm run build`):

```text
GitHub Repository (putinservai-cyber/niruvi-store)
 ├── React 18 + TypeScript + Tailwind v4 CSS (Vite SPA + Pre-rendered Static Routes)
 ├── Curated SHA-256 Verified Catalog (catalog/apps/*.json + public/catalog.json)
 ├── AppImageHub + GitHub Releases Data Pipeline (src/utils/appimagehub.ts)
 ├── Cloudflare Worker API + Scheduled Cron Handler (src/worker.ts & wrangler.json)
 ├── Cloudflare D1 SQL Schema Migrations (migrations/0001_catalog_pipeline.sql)
 ├── Automated Pre-rendering & Sitemap Generator (scripts/generate-catalog.ts, scripts/prerender-static.ts)
 └── Vitest Unit, Accessibility (axe-core), & Pipeline Test Suite (tests/*)
```

### Automated AppImageHub + GitHub Releases Pipeline (`src/utils/appimagehub.ts` & `src/worker.ts`)
1. **AppImageHub Feed Ingestion**: Fetches `https://appimage.github.io/feed.json` (version 1; 2,500+ Linux AppImages) and normalizes each package into Niruvi's schema (`id`, `name`, `description`, `categories`, `icon`, `screenshots`, `license`, `homepage`, `github_repo`), mapping desktop categories into 8 simplified categories (`Internet`, `Games`, `Graphics`, `Audio/Video`, `Office`, `Development`, `System/Utilities`, `Education`).
2. **GitHub Releases Enrichment**: For GitHub-hosted repositories, queries `https://api.github.com/repos/{owner}/{repo}/releases` using `env.GITHUB_TOKEN` (with KV caching and rate-limit guards) to extract `.AppImage` assets per architecture (`x86_64`, `aarch64`, `armhf`), file sizes, publication dates, release notes, and multi-version history.
3. **Strict SHA-256 Verification**: Checks native GitHub release asset digests (`sha256:...`), published `.sha256` / `SHA256SUMS` release assets, or computes SHA-256 via Web Crypto (`crypto.subtle.digest('SHA-256', ...)`). An application is marked **Verified** **only** when a real 64-character hex SHA-256 digest is confirmed.
4. **Cloudflare D1 + Cron Trigger (`0 */6 * * *`)**: The Worker's `scheduled()` handler runs every 6 hours, idempotently upserting packages into D1 (`catalog_apps`, `catalog_releases`) and logging per-app errors to `catalog_sync_logs` without stopping the batch.

---

## ☁️ Deploying with Cloudflare Wrangler (Workers + D1 + KV + Secrets)

```bash
# 1. Create the D1 database and apply schema migration
npx wrangler d1 create niruvi-store-db
npx wrangler d1 execute niruvi-store-db --remote --file=./migrations/0001_catalog_pipeline.sql

# 2. Provision Worker secrets (never commit secrets to git)
npx wrangler secret put JWT_SECRET
npx wrangler secret put GITHUB_TOKEN

# 3. Build static assets + pre-rendered app pages and deploy Worker
npm run build
npx wrangler deploy
```

To test the scheduled Cron Trigger locally with Wrangler:
```bash
npx wrangler dev --test-scheduled
curl "http://localhost:8787/__scheduled?cron=0+*/6+*+*+*"
```

---

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 18+ or 20+
- npm (or bun / pnpm)

### Setup & Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/putinservai-cyber/niruvi-store.git
cd niruvi-store

# 2. Install dependencies
npm install

# 3. Validate and build the static application catalog
npm run build:catalog

# 4. Run tests and linter
npm test
npm run lint

# 5. Start local development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 🛠️ Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts the local development server on port 3000 |
| `npm run validate:catalog` | Validates all `catalog/apps/*.json` schemas, URLs, checksums, and architectures |
| `npm run validate:rules` | Validates `firestore.rules` syntax and service declaration |
| `npm run generate:catalog` | Compiles JSON catalog entries into static TypeScript data bundles and `feed.json` |
| `npm run build:catalog` | Runs both catalog validation and generation |
| `npm run build:static` | Produces the production-ready static GitHub Pages site in `dist/` |
| `npm run lint` | Runs ESLint and TypeScript type checking (`tsc --noEmit`) |
| `npm run lint:fix` | Runs ESLint `--fix` and Prettier formatting across the repository |
| `npm test` | Runs the Vitest test suite (including schema validation for every `catalog/apps/*.json` file) |

---

## 📦 How to Submit an Application

Contributing an application is automated and does not require modifying frontend components!

1. Fork this repository.
2. Create a new file in `catalog/apps/<your-app-id>.json`:
   ```json
   {
     "id": "example-tool",
     "name": "Example Tool",
     "tagline": "Modern developer utility for Linux",
     "description": "Full description of your Linux tool...",
     "version": "1.0.0",
     "category": "Utilities",
     "developer": "Your Name / Organization",
     "license": "GPL-3.0",
     "homepage": "https://example.org",
     "repository": "https://github.com/example/example-tool",
     "architectures": ["x86_64"],
     "formats": ["AppImage"],
     "download": {
       "x86_64": "https://github.com/example/example-tool/releases/download/v1.0.0/example-tool.AppImage"
     },
     "sha256": "4b2e84c4e7fae29f8f4a13d80cb5f19001a1db6c1e345cb5774a38a9a202bc51",
     "keywords": ["developer", "utility", "tools"]
   }
   ```
3. Run `npm run validate:catalog` and `npm test` to ensure all fields pass validation.
4. Open a Pull Request. Once merged, GitHub Actions automatically deploys the updated catalog to the live store.

For complete guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 🔒 Security, Accessibility & Privacy Architecture

Every downloadable AppImage on Niruvi Store includes:
- **Strict Protocol & URL Validation**: Only `https://` download URLs and validated `niruvi://install` links are rendered (`src/utils/catalogSchema.ts`). All catalog text is sanitized and never injected as raw HTML.
- **Content-Security-Policy (CSP)**: Enforced via `<meta http-equiv="Content-Security-Policy">` in `index.html`, with `rel="noopener noreferrer"` on all external links and click-to-load consent placeholders (`src/components/ThirdPartyEmbed.tsx`) for third-party embeds.
- **WCAG 2.2 AA Accessibility**: Built with semantic landmarks (`header`, `nav`, `main`, `footer`), a "Skip to main content" link, `44×44px` minimum touch targets, `prefers-reduced-motion` support, high-contrast tokens (`tailwind.config.js`), and automated `eslint-plugin-jsx-a11y` + `axe-core` tests.
- **Privacy & Legal Transparency**: Includes plain-English routes for **Privacy Policy** (`#/privacy`), **Terms & Conditions** (`#/terms`), **Cookie Policy** (`#/cookies`), and **Refund Policy** (`#/refunds`), plus an accessible, equal-weight Cookie & Browser Storage Consent banner (`src/components/CookieConsent.tsx`).
- **Cloudflare Workers + Static Pre-Rendering**: Configured with `SITE_URL` (`https://niruvi-store.putinservai.workers.dev`), pre-rendered HTML for all catalog and legal routes (`scripts/prerender-static.ts`), `public/robots.txt`, `public/sitemap.xml`, `SoftwareApplication` JSON-LD schemas, shareable URL query filters (`?q=...&category=...`), and `public/404.html` 404 page handling.

To report security vulnerabilities, see [SECURITY.md](SECURITY.md).

---

## ☕ Support the Project

Niruvi is an independent, community-driven project created and maintained by a single developer. If you find Niruvi Store valuable, you can support hosting, maintenance, and development:

- ☕ **Ko-fi**: [ko-fi.com/putinservai](https://ko-fi.com/putinservai)
- 💳 **Direct Sponsorship**: In-app supporter passes and licensing

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**. See the [LICENSE](LICENSE) file for details.
