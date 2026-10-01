# Contributing to Niruvi Store

Thank you for your interest in contributing to **Niruvi Store**! Niruvi Store is a 100% free, open-source Linux software store focused on clean AppImage distribution, verified checksums, and decentralized metadata.

---

## Table of Contents

1. [How to Add an Application](#how-to-add-an-application)
2. [Application JSON Schema](#application-json-schema)
3. [Local Development & Validation](#local-development--validation)
4. [Submitting a Pull Request](#submitting-a-pull-request)
5. [Reporting Bugs & Feature Requests](#reporting-bugs--feature-requests)
6. [Code of Conduct](#code-of-conduct)

---

## How to Add an Application

Adding a new application to Niruvi Store is fully automated and does **not** require editing any TypeScript or React code.

### Step 1: Fork & Clone the Repository

```bash
git clone https://github.com/your-username/niruvi-store.git
cd niruvi-store
git checkout -b add-my-app
```

### Step 2: Create a Metadata JSON File

Create a new file in `catalog/apps/<app-id>.json` (use lowercase alphanumeric slug with hyphens).

Example: `catalog/apps/my-app.json`

```json
{
  "id": "my-app",
  "name": "My App",
  "tagline": "A short one-line description of the app",
  "description": "A comprehensive description of what your Linux application does...",
  "version": "1.0.0",
  "releaseDate": "2025-01-01",
  "category": "Utilities",
  "developer": "Developer or Team Name",
  "license": "GPL-3.0",
  "licenseCategory": "Open Source",
  "homepage": "https://example.org",
  "repository": "https://github.com/example/my-app",
  "icon": "/icons/my-app.png",
  "iconSlug": "my-app",
  "brandColor": "#3B82F6",
  "size": "65.4 MB",
  "architectures": [
    "x86_64"
  ],
  "formats": [
    "AppImage"
  ],
  "download": {
    "x86_64": "https://github.com/example/my-app/releases/download/v1.0.0/my-app-x86_64.AppImage"
  },
  "sha256": "4b2e84c4e7fae29f8f4a13d80cb5f19001a1db6c1e345cb5774a38a9a202bc51",
  "keywords": [
    "utility",
    "tools",
    "linux"
  ],
  "features": [
    "Key capability 1",
    "Key capability 2"
  ],
  "requirements": "Linux 64-bit desktop environment"
}
```

### Step 3: (Optional) Add an Icon

Place a PNG or SVG icon inside `public/icons/<app-id>.png`.

### Step 4: Run the Validator

```bash
npm install
npm run validate:catalog
```

The validator checks:
- ✅ Strict JSON syntax
- ✅ All required fields present
- ✅ No duplicate IDs
- ✅ Valid category (must exist in `catalog/categories.json`)
- ✅ Valid architectures (`x86_64`, `aarch64`, `armhf`)
- ✅ Working HTTP/HTTPS download URLs for all declared architectures
- ✅ Valid 64-character SHA-256 hexadecimal checksum

### Step 5: Build and Test Locally

```bash
npm run generate:catalog
npm run dev
```

Open `http://localhost:3000` to preview your application card and detail modal.

---

## Application JSON Schema

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | Unique lowercase identifier (matches filename `<id>.json`) |
| `name` | `string` | **Yes** | Display name of the application |
| `tagline` | `string` | No | Concise summary shown in search cards |
| `description` | `string` | **Yes** | Full description of features and purpose |
| `version` | `string` | **Yes** | Current stable release version |
| `category` | `string` | **Yes** | One of the allowed categories in `catalog/categories.json` |
| `developer` | `string` | **Yes** | Author, organization, or maintainer name |
| `license` | `string` | **Yes** | SPDX license identifier (e.g. `MIT`, `GPL-3.0`, `Apache-2.0`) |
| `homepage` | `string` | No | Official project website URL |
| `repository` | `string` | No | Source code repository URL (GitHub, GitLab, etc.) |
| `architectures` | `string[]` | **Yes** | Array of supported architectures (`x86_64`, `aarch64`, `armhf`) |
| `formats` | `string[]` | **Yes** | Must include `"AppImage"` |
| `download` | `object` | **Yes** | Map of architecture to official GitHub Release or direct download URL |
| `sha256` | `string` | No | 64-character hex checksum for integrity verification |
| `keywords` | `string[]` | No | Search tags and keywords |

---

## Submitting a Pull Request

1. Commit your changes:
   ```bash
   git commit -m "feat(catalog): add <app-name> to catalog"
   ```
2. Push to your fork:
   ```bash
   git push origin add-my-app
   ```
3. Open a **Pull Request** targeting the `main` branch.
4. GitHub Actions will automatically run the validator and build checks on your PR.

---

## License & Attribution

By contributing to Niruvi Store, you agree that your contributions will be licensed under the project's **GPL-3.0 License**.
