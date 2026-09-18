import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { getDb, saveDb } from '../db/db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { rateLimitLogin, resetLoginAttempts } from '../middleware/rateLimit.js';

const router = Router();

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post('/login', rateLimitLogin, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid input' });
    return;
  }

  const { username, password } = parsed.data;
  const db = getDb();
  const user = db.users.find(u => u.username === username);

  if (!user) {
    res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid username or password' });
    return;
  }

  const hash = hashPassword(password, user.passwordSalt);
  if (hash !== user.passwordHash) {
    res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid username or password' });
    return;
  }

  resetLoginAttempts(req.ip || 'unknown', username);

  const token = crypto.randomBytes(32).toString('hex');
  const session = {
    token,
    userId: user.id,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    userAgent: req.headers['user-agent'] || '',
    ip: req.ip || '',
  };

  db.sessions.push(session);
  user.lastLoginAt = new Date().toISOString();
  await saveDb(db);

  res.cookie('wc_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  });
});

router.post('/logout', requireAuth, async (req: AuthRequest, res) => {
  const token = req.cookies?.['wc_session'];
  const db = getDb();
  db.sessions = db.sessions.filter(s => s.token !== token);
  await saveDb(db);

  res.clearCookie('wc_session');
  res.json({ ok: true });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

router.post('/change-password', requireAuth, async (req: AuthRequest, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid input' });
    return;
  }

  const db = getDb();
  const user = db.users.find(u => u.id === req.userId);
  if (!user) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
    return;
  }

  const hash = hashPassword(parsed.data.currentPassword, user.passwordSalt);
  if (hash !== user.passwordHash) {
    res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' });
    return;
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  user.passwordHash = hashPassword(parsed.data.newPassword, newSalt);
  user.passwordSalt = newSalt;
  user.mustChangePassword = false;
  await saveDb(db);

  res.json({ ok: true });
});

router.get('/me', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const user = db.users.find(u => u.id === req.userId);
  if (!user) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  });
});

export { router as authRoutes };
