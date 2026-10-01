/**
 * EXPERIMENTAL — Re-exports the hardened Cloudflare Worker implementation from ../src/worker.ts
 * Provision JWT_SECRET before deploying: `wrangler secret put JWT_SECRET`
 */
export {
  default,
  type Env,
  type D1Database,
  type KVNamespace,
  type WorkerUserRecord,
  buildSecurityHeaders,
  buildSessionCookie,
  buildClearSessionCookie,
  verifyFirebaseIdToken,
  createWorkerJwt,
  verifyWorkerJwt,
} from '../src/worker';
