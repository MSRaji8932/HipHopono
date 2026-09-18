import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/db.js';

export interface AuthRequest extends Request {
  userId?: string;
  username?: string;
  role?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.['wc_session'];
  if (!token) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Not authenticated' });
    return;
  }

  const db = getDb();
  const session = db.sessions.find(s => s.token === token);
  if (!session) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid session' });
    return;
  }

  if (new Date(session.expiresAt) < new Date()) {
    db.sessions = db.sessions.filter(s => s.token !== token);
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Session expired' });
    return;
  }

  const user = db.users.find(u => u.id === session.userId);
  if (!user) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'User not found' });
    return;
  }

  req.userId = user.id;
  req.username = user.username;
  req.role = user.role;
  next();
}
