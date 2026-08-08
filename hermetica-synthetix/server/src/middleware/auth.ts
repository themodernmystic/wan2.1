import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import type { CurrentUser } from '../rls.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      currentUser?: CurrentUser;
    }
  }
}

/** Populates req.currentUser from the Bearer token if present. Never rejects. */
export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    req.currentUser = null;
    return next();
  }
  const payload = verifyToken(token);
  if (!payload) {
    req.currentUser = null;
    return next();
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  req.currentUser = user ? { id: user.id, email: user.email, role: user.role || 'user' } : null;
  next();
}

/** Route guard: 401s if no valid authenticated user. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.currentUser) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
