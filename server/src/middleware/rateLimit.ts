import { Request, Response, NextFunction } from 'express';

const attempts = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function rateLimitLogin(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const username = (req.body as Record<string, string>)?.username || 'unknown';
  const key = `${ip}:${username}`;

  const now = Date.now();
  const record = attempts.get(key);

  if (record && now < record.resetAt) {
    if (record.count >= MAX_ATTEMPTS) {
      const remaining = Math.ceil((record.resetAt - now) / 1000);
      res.status(429).json({
        error: 'RATE_LIMITED',
        message: `Too many login attempts. Try again in ${remaining} seconds.`,
      });
      return;
    }
    record.count++;
  } else {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  }

  next();
}

export function resetLoginAttempts(ip: string, username: string): void {
  attempts.delete(`${ip}:${username}`);
}
