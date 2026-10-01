# Niruvi Store

<div align="center">

![Niruvi Store Logo](public/niruvi-icon.png)

**The Decentralized, Free, Open-Source Linux Application Marketplace for AppImages**

[![Validate Catalog](https://github.com/putinservai-cyber/niruvi-store/actions/workflows/validate.yml/badge.svg)](https://github.com/putinservai-cyber/niruvi-store/actions/workflows/validate.yml)
[![GitHub Pages](https://github.com/putinservai-cyber/niruvi-store/actions/workflows/deploy.yml/badge.svg)](https://niruvi-store.runs-on.dev)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![AppImage Support](https://img.shields.io/badge/AppImage-Ready-5851DB.svg)](https://appimage.org/)

[**Live Web Store (`niruvi-store.runs-on.dev`)**](https://niruvi-store.runs-on.dev) • [**Niruvi Desktop Manager**](https://github.com/putinservai-cyber/niruvi) • [**Submit Application**](CONTRIBUTING.md) • [**Support on Ko-fi**](https://ko-fi.com/putinservai)

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

**The production Niruvi Store site is the static GitHub Pages build only (`npm run build:static`).** The static catalog (`catalog/apps/*.json`) compiled into the Vite bundle is the single source of truth requiring **$0 operational budget**:

```text
GitHub Repository (putinservai-cyber/niruvi-store)
 ├── React 18 + TypeScript + Tailwind CSS (Static Vite SPA)
 ├── JSON Application Catalog (catalog/apps/*.json — Single Source of Truth)
 ├── Automated Catalog Validator & Feed Generator (scripts/*)
 ├── Vitest Schema & Security Rules Test Suite (tests/*)
 ├── GitHub Actions CI (Gitleaks, Rules Check, Lint, Vitest, Static Build)
 ├── GitHub Pages (Continuous Deployment of dist/ to Live Web Store)
 ├── Upstream GitHub Releases (Direct HTTPS binary downloads)
 └── experimental/ (Optional Express/Cloudflare Worker prototypes — NOT part of the production build)
```

> **Note on `experimental/`**: Files inside `experimental/` (`server.ts`, `worker.ts`, `wrangler.json`, `supabase/`, and DB helper scripts) are experimental prototypes and are **not part of the production build**. If experimenting with Cloudflare Workers & D1 (`experimental/wrangler.json`), provision secrets via `wrangler secret put JWT_SECRET` and create the D1 database via `wrangler d1 create niruvi_store_d1`, replacing the `00000000-0000-0000-0000-000000000000` placeholder in `experimental/wrangler.json`.

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
- **GitHub Pages + `runs-on.dev` Custom Domain**: Configured with `base: '/'` in `vite.config.ts`, `public/CNAME` (`niruvi-store.runs-on.dev`), `public/robots.txt`, `public/sitemap.xml`, hash-based deep linking (`#/app/<id>`), shareable URL query filters (`?q=...&category=...`), and `public/404.html` redirect support so deep links never 404 on refresh.

To report security vulnerabilities, see [SECURITY.md](SECURITY.md).

---

## ☕ Support the Project

Niruvi is an independent, community-driven project created and maintained by a single developer. If you find Niruvi Store valuable, you can support hosting, maintenance, and development:

- ☕ **Ko-fi**: [ko-fi.com/putinservai](https://ko-fi.com/putinservai)
- 💳 **Direct Sponsorship**: In-app supporter passes and licensing

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**. See the [LICENSE](LICENSE) file for details.
