# Security Policy & Architecture Guidelines

## 1. Core Threat Model & Security Principles

1. **Private Source Code is Not a Security Boundary**
   - We assume attackers can inspect or infer backend behavior. 
   - Payment processing, authentication, file uploads, and role authorization must remain completely secure even if the repository source code becomes public.
   - Code secrecy is never a substitute for rigorous server-side authorization checks.

2. **No Security through Obscurity**
   - API endpoints follow standard REST conventions (`/api/...`).
   - Admin and privileged routes are never "hidden" or "obfuscated" to achieve security. Instead, they are fortified using:
     - Cryptographically signed session tokens (JWT & Firebase Auth).
     - Strict server-side Role-Based Access Control (`requireRole(['ADMIN'])`).
     - Strong input schema validation via Zod on all request bodies and parameters.
     - Rate-limiting and audit logging on administrative actions.

3. **SQL Injection Prevention via Parameterization**
   - All database interactions use Drizzle ORM's parameterized statements and prepared queries.
   - Relational schemas are openly defined (`src/db/schema.ts`). Protection against SQL injection relies entirely on parameterized query execution and strict type casting—not on concealing database table structures.

4. **Frontend Transparency & Key Segregation**
   - Any code delivered to a client browser can be inspected via developer tools.
   - Private secrets, database credentials, JWT signing keys, and payment secret keys are **strictly restricted to the server environment** and accessed via `process.env`.
   - Only publishable, client-safe configuration keys prefixed with `VITE_` are bundled into the frontend.

5. **Payment Processing & Signed Webhooks**
   - Payment integrations use hosted payment flows to avoid handling or storing sensitive cardholder data.
   - Digital entitlements, developer verification badges, or paid AppImage downloads are granted **only after server-side confirmation** of a cryptographically signed webhook.

6. **Repository & Commit Signing Integrity**
   - Never commit SSH or GPG private keys to any git repository.
   - Commit signing keys must be configured securely in developer machine keyrings and GitHub account settings without committing secret key files.

---

## 2. Public vs. Private Architecture Split

To maintain security hygiene across development and deployment, we adhere to the following architecture separation:

### Public Repository / Client Layer
- React / Vite SPA frontend (`src/components/`, `src/App.tsx`, `index.html`)
- Public TypeScript types and client-side utility functions
- Public documentation, OpenAPI specs, and user guides
- Zero private secrets or sensitive user records

### Private Backend / Cloud Execution Layer
- Payment processing, checkout session creation, and signed webhook listeners
- Authentication credentials, password hashing (bcrypt), and JWT session issuance
- Cloud SQL database connections, migrations, and schema management
- Private cloud storage, AppImage binary hash verification, and signed download URLs
- Environment credentials securely managed through Cloud Secret Manager or container environment variables

---

## 3. Reporting a Vulnerability

If you discover a security vulnerability within Niruvi Store or its protocol bridge:

- **Do NOT** open a public GitHub issue.
- Please report vulnerabilities directly via email to: **security@niruvi.store**
- Include detailed steps to reproduce, affected endpoints, and proof of concept.
- We acknowledge reports within 48 hours and coordinate responsible disclosure timelines.
