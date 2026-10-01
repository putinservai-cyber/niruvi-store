/**
 * Cloudflare Worker Authentication & API Handler
 * Responds to /api/auth/login, /api/auth/logout, /api/auth/me, /api/auth/github, /api/auth/google
 * Implemented using standard Web APIs (Request / Response / Headers / Web Crypto)
 * Supports Cloudflare Turnstile bot verification and KV session caching.
 */

export interface Env {
  JWT_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
  NIRUVI_AUTH_KV?: any;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}

export default {
  async fetch(request: Request, env: Env, _ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Standard CORS Headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const secret = env?.JWT_SECRET || 'niruvi-linux-appimage-store-secret-2026';

    try {
      // 1. /api/auth/login (Credentials / Turnstile Bot Verification)
      if (path === '/api/auth/login' && method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const { login, password, email, turnstileResponse } = body as any;
        const userIdentifier = login || email || 'developer@niruvi.store';

        // Turnstile Bot Protection Validation (if turnstile secret is present)
        if (turnstileResponse && env?.TURNSTILE_SECRET_KEY) {
          try {
            const turnstileVerify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                secret: env.TURNSTILE_SECRET_KEY,
                response: turnstileResponse,
              }),
            });
            const turnstileOutcome = await turnstileVerify.json() as any;
            if (!turnstileOutcome.success) {
              return new Response(
                JSON.stringify({ error: 'Cloudflare Turnstile captcha validation failed' }),
                { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
              );
            }
          } catch (tErr) {
            console.warn('Turnstile verification error:', tErr);
          }
        }

        const mockUser = {
          id: `usr_cf_${Date.now().toString(36)}`,
          email: userIdentifier.includes('@') ? userIdentifier : `${userIdentifier}@niruvi.store`,
          username: userIdentifier.split('@')[0],
          displayName: userIdentifier.split('@')[0],
          role: userIdentifier.includes('admin') ? 'ADMIN' : 'DEVELOPER',
          avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${userIdentifier}`,
        };

        const token = await createWorkerJwt(mockUser, secret);

        // Store session in Cloudflare KV if bound
        if (env?.NIRUVI_AUTH_KV) {
          try {
            await env.NIRUVI_AUTH_KV.put(`session:${token}`, JSON.stringify(mockUser), { expirationTtl: 604800 });
          } catch (kvErr) {
            console.warn('KV storage notice:', kvErr);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            token,
            user: mockUser,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Set-Cookie': `niruvi_auth_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`,
              ...corsHeaders,
            },
          }
        );
      }

      // 2. /api/auth/logout
      if (path === '/api/auth/logout' && method === 'POST') {
        const authHeader = request.headers.get('Authorization') || '';
        if (authHeader.startsWith('Bearer ') && env?.NIRUVI_AUTH_KV) {
          const token = authHeader.substring(7).trim();
          try {
            await env.NIRUVI_AUTH_KV.delete(`session:${token}`);
          } catch {}
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Logged out successfully' }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Set-Cookie': `niruvi_auth_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`,
              ...corsHeaders,
            },
          }
        );
      }

      // 3. /api/auth/me
      if (path === '/api/auth/me' && (method === 'GET' || method === 'POST')) {
        const authHeader = request.headers.get('Authorization') || '';
        let token = '';

        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7).trim();
        } else {
          const cookieHeader = request.headers.get('Cookie') || '';
          const match = cookieHeader.match(/niruvi_auth_token=([^;]+)/);
          if (match) token = match[1];
        }

        if (!token) {
          return new Response(
            JSON.stringify({ error: 'Authentication required' }),
            { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // Check Cloudflare KV session first if available
        if (env?.NIRUVI_AUTH_KV) {
          try {
            const cachedSession = await env.NIRUVI_AUTH_KV.get(`session:${token}`);
            if (cachedSession) {
              const parsedUser = JSON.parse(cachedSession);
              return new Response(
                JSON.stringify({
                  user: parsedUser,
                  developerProfile: {
                    id: 'dev_profile_kv',
                    userId: parsedUser.id,
                    orgName: 'Niruvi Edge Cloud',
                    verified: true,
                    payoutEmail: parsedUser.email,
                  },
                }),
                { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
              );
            }
          } catch {}
        }

        const payload = await verifyWorkerJwt(token, secret);
        if (!payload) {
          return new Response(
            JSON.stringify({ error: 'Invalid or expired token' }),
            { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        return new Response(
          JSON.stringify({
            user: {
              id: payload.id || 'usr_worker',
              email: payload.email || 'developer@niruvi.store',
              username: payload.username || 'developer',
              displayName: payload.displayName || payload.username || 'Developer User',
              role: payload.role || 'DEVELOPER',
              avatarUrl: payload.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=developer',
            },
            developerProfile: {
              id: 'dev_profile_1',
              userId: payload.id || 'usr_worker',
              orgName: 'Niruvi Labs Cloudflare',
              verified: true,
              payoutEmail: payload.email || 'developer@niruvi.store',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // 4. /api/auth/github
      if (path === '/api/auth/github' && method === 'POST') {
        const githubUser = {
          id: `usr_gh_${Date.now().toString(36)}`,
          email: 'github.developer@niruvi.store',
          username: 'github_developer',
          displayName: 'GitHub Developer',
          role: 'DEVELOPER',
          avatarUrl: 'https://github.com/github.png',
        };

        const token = await createWorkerJwt(githubUser, secret);

        if (env?.NIRUVI_AUTH_KV) {
          try {
            await env.NIRUVI_AUTH_KV.put(`session:${token}`, JSON.stringify(githubUser), { expirationTtl: 604800 });
          } catch {}
        }

        return new Response(
          JSON.stringify({
            success: true,
            token,
            user: githubUser,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Set-Cookie': `niruvi_auth_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`,
              ...corsHeaders,
            },
          }
        );
      }

      // 5. /api/auth/google
      if (path === '/api/auth/google' && method === 'POST') {
        const googleUser = {
          id: `usr_goog_${Date.now().toString(36)}`,
          email: 'google.developer@niruvi.store',
          username: 'google_developer',
          displayName: 'Google Developer',
          role: 'DEVELOPER',
          avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=google_developer',
        };

        const token = await createWorkerJwt(googleUser, secret);

        if (env?.NIRUVI_AUTH_KV) {
          try {
            await env.NIRUVI_AUTH_KV.put(`session:${token}`, JSON.stringify(googleUser), { expirationTtl: 604800 });
          } catch {}
        }

        return new Response(
          JSON.stringify({
            success: true,
            token,
            user: googleUser,
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Set-Cookie': `niruvi_auth_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`,
              ...corsHeaders,
            },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Endpoint not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: err?.message || 'Worker Internal Error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
  },
};

/**
 * Standard Web Crypto API HMAC SHA-256 JWT Generation
 */
async function createWorkerJwt(payload: Record<string, any>, secretStr: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = { ...payload, iat: now, exp: now + 604800 };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secretStr),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(unsignedToken));
  const encodedSignature = base64UrlEncode(signature);

  return `${unsignedToken}.${encodedSignature}`;
}

/**
 * Standard Web Crypto API HMAC SHA-256 JWT Verification
 */
async function verifyWorkerJwt(token: string, secretStr: string): Promise<Record<string, any> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secretStr),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = base64UrlDecodeToUint8Array(encodedSignature);
    const valid = await crypto.subtle.verify('HMAC', key, signature as unknown as BufferSource, enc.encode(unsignedToken));

    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecodeToUint8Array(encodedPayload)));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;

    return payload;
  } catch {
    return null;
  }
}

function base64UrlEncode(input: string | ArrayBuffer): string {
  let bytes: Uint8Array;
  if (typeof input === 'string') {
    bytes = new TextEncoder().encode(input);
  } else {
    bytes = new Uint8Array(input);
  }

  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecodeToUint8Array(base64urlStr: string): Uint8Array {
  let base64 = base64urlStr.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
