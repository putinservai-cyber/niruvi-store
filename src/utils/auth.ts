import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  plan?: 'free' | 'supporter' | 'pro_developer' | 'team';
  isPro?: boolean;
  avatarUrl?: string | null;
  firebaseUid?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function signJwtToken(payload: {
  id: string;
  email: string;
  role: string;
  username: string;
}): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function setAuthSessionCookie(res: Response, token: string): void {
  res.setHeader(
    'Set-Cookie',
    `niruvi_auth_token=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`
  );
}

export function clearAuthSessionCookie(res: Response): void {
  res.setHeader(
    'Set-Cookie',
    'niruvi_auth_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  );
}

/**
 * Authenticates the session cookie (or Bearer token) and re-checks the user's
 * authoritative role and plan from the database on EVERY request.
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  let token = '';

  if (req.cookies && req.cookies.niruvi_auth_token) {
    token = String(req.cookies.niruvi_auth_token).trim();
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7).trim();
  }

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email?: string;
      username?: string;
      role?: string;
    };
    if (!decoded || typeof decoded.id !== 'string') {
      return next();
    }

    const userList = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
    if (userList.length > 0) {
      const u = userList[0];
      const isProRole = u.role === 'DEVELOPER' || u.role === 'ADMIN';
      req.user = {
        id: u.id,
        email: u.email,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
        plan: isProRole ? 'pro_developer' : 'free',
        isPro: isProRole,
        avatarUrl: u.avatarUrl,
        firebaseUid: u.firebaseUid,
      };
    }
    return next();
  } catch {
    return next();
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export function requireRole(allowedRoles: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    // Always re-verify role from database on every role-gated request
    try {
      const fresh = await db.select().from(users).where(eq(users.id, req.user.id)).limit(1);
      if (fresh.length === 0 || !allowedRoles.includes(fresh[0].role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
      }
      req.user.role = fresh[0].role;
      next();
    } catch {
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
