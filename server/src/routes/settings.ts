import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { getDb, saveDb } from '../db/db.js';
import { createEmptyDatabase } from '../db/schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { rateLimitReset } from '../middleware/rateLimit.js';
import { csrfProtect } from '../middleware/csrf.js';
import { env } from '../env.js';

const router = Router();

const settingsSchema = z.object({
  providerLabel: z.string().optional(),
  modelName: z.string().optional(),
  apiBaseUrl: z.string().optional(),
  apiToken: z.string().nullable().optional(),
  apiFormat: z.enum(['openai', 'anthropic', 'other']).optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().min(1).max(1000000).optional(),
  systemPrompt: z.string().optional(),
  autoApproveReads: z.boolean().optional(),
  autoApproveWrites: z.boolean().optional(),
  autoApproveCommands: z.boolean().optional(),
  commandTimeoutMs: z.number().min(1000).max(300000).optional(),
  theme: z.enum(['dark', 'light']).optional(),
  customHeaders: z.record(z.string()).optional(),
});

router.get('/', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const settings = db.settings[req.userId!];

  if (!settings) {
    res.json({
      providerLabel: '',
      modelName: '',
      apiBaseUrl: '',
      apiTokenSet: false,
      apiTokenPreview: '',
      apiFormat: 'openai',
      temperature: 0.2,
      maxTokens: 8192,
      systemPrompt: '',
      autoApproveReads: true,
      autoApproveWrites: false,
      autoApproveCommands: false,
      commandTimeoutMs: 30000,
      theme: 'dark',
      customHeaders: {},
    });
    return;
  }

  const { apiToken, ...rest } = settings;
  res.json({
    ...rest,
    apiTokenSet: apiToken.length > 0,
    apiTokenPreview: apiToken ? `sk-...${apiToken.slice(-4)}` : '',
    customHeaders: rest.customHeaders || {},
  });
});

router.put('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid settings data' });
    return;
  }

  const db = getDb();
  if (!db.settings[req.userId!]) {
    db.settings[req.userId!] = {
      providerLabel: '',
      modelName: '',
      apiBaseUrl: '',
      apiToken: '',
      apiFormat: 'openai',
      temperature: 0.2,
      maxTokens: 8192,
      systemPrompt: '',
      autoApproveReads: true,
      autoApproveWrites: false,
      autoApproveCommands: false,
      commandTimeoutMs: 30000,
      theme: 'dark',
      customHeaders: {},
    };
  }

  const current = db.settings[req.userId!];
  const updates = parsed.data;

  if (updates.apiToken !== undefined) {
    current.apiToken = updates.apiToken ?? '';
  }

    for (const [key, value] of Object.entries(updates)) {
    if (key === 'apiToken') continue;
    if (value !== undefined) {
      (current as unknown as Record<string, unknown>)[key] = value;
    }
  }

  await saveDb(db);
  res.json({ ok: true });
});

router.post('/test-connection', requireAuth, async (req: AuthRequest, res) => {
  const db = getDb();
  const settings = db.settings[req.userId!];

  if (!settings || !settings.apiToken) {
    res.status(400).json({ error: 'NO_API_TOKEN', message: 'No API token configured' });
    return;
  }

  try {
    let testUrl = settings.apiBaseUrl.replace(/\/+$/, '');
    let testBody: Record<string, unknown>;
    const customHeaders = settings.customHeaders || {};
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (settings.apiFormat === 'anthropic') {
      if (!testUrl.endsWith('/messages')) {
        testUrl += '/messages';
      }
      testBody = {
        model: settings.modelName,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      };
      headers['x-api-key'] = settings.apiToken;
      headers['anthropic-version'] = '2023-06-01';
      delete headers['Authorization'];
    } else {
      if (!testUrl.endsWith('/chat/completions')) {
        if (!testUrl.endsWith('/v1')) {
          testUrl += '/v1';
        }
        testUrl += '/chat/completions';
      }

      // Support query parameter auth
      if (customHeaders['X-Auth-As-Query'] === 'true') {
        const separator = testUrl.includes('?') ? '&' : '?';
        testUrl += `${separator}api_key=${encodeURIComponent(settings.apiToken)}`;
        delete headers['X-Auth-As-Query'];
      } else {
        headers['Authorization'] = `Bearer ${settings.apiToken}`;
        delete headers['X-Auth-As-Query'];
      }

      testBody = {
        model: settings.modelName,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      };
    }

    const response = await fetch(testUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(testBody),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.json({ ok: false, error: `${response.status}: ${errorText.slice(0, 500)}` });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, error: (err as Error).message });
  }
});

router.post('/reset', requireAuth, rateLimitReset, csrfProtect, async (req: AuthRequest, res) => {
  // Check if reset is allowed
  if (env.ALLOW_RESET !== 'true') {
    res.status(403).json({ error: 'RESET_DISABLED', message: 'Factory reset is disabled. Set ALLOW_RESET=true in .env to enable.' });
    return;
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const newPassword = Array.from(crypto.randomBytes(16), b => chars[b % chars.length]).join('');
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.scryptSync(newPassword, salt, 64).toString('hex');

  const db = createEmptyDatabase();
  const userId = crypto.randomUUID();
  db.users.push({
    id: userId,
    username: 'admin',
    passwordHash,
    passwordSalt: salt,
    role: 'admin',
    mustChangePassword: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  });

  await saveDb(db);

  // Export credentials to text file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const credsContent = [
    '╔══════════════════════════════════════════╗',
    '║       HipHopono - Reset Credentials      ║',
    '╠══════════════════════════════════════════╣',
    `║  Date: ${new Date().toLocaleString().padEnd(31)}║`,
    '╠══════════════════════════════════════════╣',
    `║  Username: admin                         ║`,
    `║  Password: ${newPassword.padEnd(29)}║`,
    '╠══════════════════════════════════════════╣',
    '║  (Forced to change password on login)    ║',
    '╚══════════════════════════════════════════╝',
  ].join('\n');

  const credsPath = path.join(env.DATA_DIR_ABS, `RESET_CREDENTIALS_${timestamp}.txt`);
  await fs.writeFile(credsPath, credsContent, 'utf-8');

  // Clear session cookie
  res.clearCookie('session');

  // Log to terminal
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║       FACTORY RESET COMPLETE             ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Username: admin                         ║`);
  console.log(`║  Password: ${newPassword.padEnd(29)}║`);
  console.log(`║  File: ${credsPath.split(/[\\/]/).pop()!.padEnd(33)}║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  res.json({ ok: true, username: 'admin', password: newPassword });
});

export { router as settingsRoutes };
