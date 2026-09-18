import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const tokens = new Map<string, { token: string; expiresAt: number }>();

const TOKEN_TTL = 60 * 60 * 1000; // 1 hour

export function generateCsrfToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  tokens.set(sessionId, { token, expiresAt: Date.now() + TOKEN_TTL });
  return token;
}

export function validateCsrfToken(sessionId: string, token: string): boolean {
  const record = tokens.get(sessionId);
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    tokens.delete(sessionId);
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(record.token), Buffer.from(token));
}

export function csrfProtect(req: Request, res: Response, next: NextFunction): void {
  const sessionId = req.cookies?.session;
  const token = req.headers['x-csrf-token'] as string;

  if (!sessionId || !token || !validateCsrfToken(sessionId, token)) {
    res.status(403).json({ error: 'CSRF_INVALID', message: 'Invalid or missing CSRF token' });
    return;
  }

  next();
}
