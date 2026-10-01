import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'niruvi-linux-appimage-store-secret-2026';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  avatarUrl?: string | null;
  firebaseUid?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function signJwtToken(payload: { id: string; email: string; role: string; username: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1].trim();
  } else if (req.cookies && req.cookies.niruvi_auth_token) {
    token = req.cookies.niruvi_auth_token;
  }

  if (!token) return next();

  // Verify JWT token
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email?: string; username?: string; role?: string };
    const userList = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
    if (userList.length > 0) {
      const u = userList[0];
      req.user = {
        id: u.id,
        email: u.email,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
        avatarUrl: u.avatarUrl,
        firebaseUid: u.firebaseUid,
      };
    } else {
      // Allow decoded payload user if fallback
      req.user = {
        id: decoded.id,
        email: decoded.email || 'user@niruvi.store',
        username: decoded.username || 'user',
        displayName: decoded.username || 'User',
        role: decoded.role || 'USER',
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
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
}
