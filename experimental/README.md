# Experimental Backend & Worker Prototypes

> **⚠️ IMPORTANT: Not Part of the Production Build**
>
> The files in `experimental/` are **not** used in the production Niruvi Store deployment.
> The single source of truth for the production site is the **static GitHub Pages build** (`npm run build:static`), powered by `catalog/apps/*.json` and `scripts/generate-catalog.ts`.

## Contents

- `server.ts` — Optional Express + Drizzle ORM (PostgreSQL) backend prototype.
- `worker.ts` — Optional Cloudflare Worker edge authentication prototype.
- `wrangler.json` — Cloudflare Worker & D1 configuration template.
- `supabase/` — Experimental SQL schema definitions.
- `check-user.ts`, `check-users.ts`, `force-seed-admin.ts` — Local database inspection and seed utilities.

## Configuring Cloudflare Worker & D1 (`wrangler.json`)

1. **Provision `JWT_SECRET` (Never commit secrets to `wrangler.json`)**:
   ```bash
   npx wrangler secret put JWT_SECRET --config experimental/wrangler.json
   ```
2. **Create the Cloudflare D1 Database**:
   ```bash
   npx wrangler d1 create niruvi_store_d1
   ```
   Copy the returned UUID (format `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) and replace the placeholder `"00000000-0000-0000-0000-000000000000"` in `experimental/wrangler.json` under `d1_databases[0].database_id`.
3. **Create the Cloudflare KV Namespace**:
   ```bash
   npx wrangler kv namespace create NIRUVI_AUTH_KV
   ```
   Replace the placeholder `id` in `experimental/wrangler.json` under `kv_namespaces[0].id`.
