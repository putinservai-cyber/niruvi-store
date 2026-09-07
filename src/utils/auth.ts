import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin';
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
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // unauthenticated request
  }

  const token = authHeader.split('Bearer ')[1].trim();
  if (!token) return next();

  // Try verifying as JWT first
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
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
      return next();
    }
  } catch {
    // Not a local JWT or expired, try Firebase Auth token
  }

  // Try verifying with Firebase Admin
  try {
    const decodedFirebase = await adminAuth.verifyIdToken(token);
    let userList = await db.select().from(users).where(eq(users.firebaseUid, decodedFirebase.uid)).limit(1);

    if (userList.length === 0 && decodedFirebase.email) {
      userList = await db.select().from(users).where(eq(users.email, decodedFirebase.email)).limit(1);
    }

    if (userList.length > 0) {
      const u = userList[0];
      if (!u.firebaseUid) {
        await db.update(users).set({ firebaseUid: decodedFirebase.uid }).where(eq(users.id, u.id));
      }
      req.user = {
        id: u.id,
        email: u.email,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
        avatarUrl: u.avatarUrl,
        firebaseUid: decodedFirebase.uid,
      };
    } else {
      // Auto-provision user from Firebase Auth credentials
      const newId = `usr_${decodedFirebase.uid.slice(0, 12)}`;
      const baseUsername = (decodedFirebase.email?.split('@')[0] || `user_${Date.now()}`).replace(/[^a-zA-Z0-9_]/g, '_');
      const newUser = {
        id: newId,
        email: decodedFirebase.email || `${decodedFirebase.uid}@firebase.oauth`,
        username: baseUsername,
        displayName: decodedFirebase.name || baseUsername,
        avatarUrl: decodedFirebase.picture || null,
        role: 'USER',
        emailVerified: Boolean(decodedFirebase.email_verified),
        firebaseUid: decodedFirebase.uid,
      };
      await db.insert(users).values(newUser).onConflictDoNothing();
      req.user = {
        id: newId,
        email: newUser.email,
        username: newUser.username,
        displayName: newUser.displayName,
        role: newUser.role,
        avatarUrl: newUser.avatarUrl,
        firebaseUid: newUser.firebaseUid,
      };
    }
    return next();
  } catch (fbError) {
    console.warn('Firebase token verification notice:', fbError);
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
