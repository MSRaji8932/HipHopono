import { Request, Response, NextFunction } from 'express';

const attempts = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

// Reset-specific rate limit: 3 per hour
const resetAttempts = new Map<string, { count: number; resetAt: number }>();
const RESET_WINDOW_MS = 60 * 60 * 1000;
const RESET_MAX_ATTEMPTS = 3;

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

export function rateLimitReset(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const record = resetAttempts.get(ip);

  if (record && now < record.resetAt) {
    if (record.count >= RESET_MAX_ATTEMPTS) {
      const remaining = Math.ceil((record.resetAt - now) / 1000);
      res.status(429).json({
        error: 'RATE_LIMITED',
        message: `Too many reset attempts. Try again in ${remaining} seconds.`,
      });
      return;
    }
    record.count++;
  } else {
    resetAttempts.set(ip, { count: 1, resetAt: now + RESET_WINDOW_MS });
  }

  next();
}

export function resetLoginAttempts(ip: string, username: string): void {
  attempts.delete(`${ip}:${username}`);
}
