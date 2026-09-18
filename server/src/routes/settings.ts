import { Router } from 'express';
import { z } from 'zod';
import { getDb, saveDb } from '../db/db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

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

router.post('/reset', requireAuth, async (req: AuthRequest, res) => {
  const db = getDb();
  db.settings[req.userId!] = {
    providerLabel: 'OpenAI',
    modelName: 'gpt-4o',
    apiBaseUrl: 'https://api.openai.com/v1',
    apiToken: '',
    apiFormat: 'openai',
    temperature: 0.2,
    maxTokens: 8192,
    systemPrompt: `You are HipHopono, an AI coding assistant. You help users write, debug, and understand code. You can read and write files, run commands, and interact with git. Always explain what you're doing and ask for approval before making changes.`,
    autoApproveReads: true,
    autoApproveWrites: false,
    autoApproveCommands: false,
    commandTimeoutMs: 30000,
    theme: 'dark',
    customHeaders: {},
  };
  await saveDb(db);
  res.json({ ok: true });
});

export { router as settingsRoutes };
