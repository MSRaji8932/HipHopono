import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { getDb, saveDb } from '../db/db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { runAgentLoop, approveRequest, type AgentEvent } from '../services/agent/loop.js';
import type { LLMMessage } from '../services/llm/index.js';
import type { UserSettings } from '../db/schema.js';

const router = Router();

const chatSchema = z.object({
  conversationId: z.string().min(1),
  projectId: z.string().min(1),
  content: z.string().min(1),
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid input' });
    return;
  }

  const { conversationId, projectId, content } = parsed.data;
  const db = getDb();

  const settings = db.settings[req.userId!];
  if (!settings || !settings.apiToken) {
    res.status(400).json({ error: 'NO_API_CONFIG', message: 'No API configured. Go to Settings to set up your model.' });
    return;
  }

  const project = db.projects.find(p => p.id === projectId && p.userId === req.userId);
  if (!project) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Project not found' });
    return;
  }

  const conversation = db.conversations.find(c => c.id === conversationId);
  if (!conversation) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Conversation not found' });
    return;
  }

  const userMsg = {
    id: uuid(),
    conversationId,
    role: 'user' as const,
    content,
    tokensIn: 0,
    tokensOut: 0,
    createdAt: new Date().toISOString(),
  };
  db.messages.push(userMsg);

  const messageCount = db.messages.filter(m => m.conversationId === conversationId).length;
  let newTitle: string | null = null;
  if (messageCount === 1 && conversation.title === 'New Conversation') {
    newTitle = content.length > 50 ? content.substring(0, 50).trim() + '...' : content;
    conversation.title = newTitle;
    conversation.updatedAt = new Date().toISOString();
  }

  await saveDb(db);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const sendEvent = (event: AgentEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  if (newTitle) {
    sendEvent({ type: 'title_update', title: newTitle, messageId: conversationId } as AgentEvent);
  }

  const abortController = new AbortController();

  req.on('close', () => {
    abortController.abort();
  });

  const historyMessages: LLMMessage[] = db.messages
    .filter(m => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-50)
    .map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

  try {
    await runAgentLoop(
      {
        format: settings.apiFormat,
        baseUrl: settings.apiBaseUrl,
        apiKey: settings.apiToken,
        model: settings.modelName,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        systemPrompt: settings.systemPrompt,
        customHeaders: settings.customHeaders || {},
      },
      historyMessages,
      project.absPath,
      settings,
      conversationId,
      req.userId!,
      sendEvent,
      abortController.signal
    );
  } catch (err) {
    sendEvent({ type: 'error', message: (err as Error).message });
  }

  res.end();
});

router.post('/approve', requireAuth, (req: AuthRequest, res) => {
  const { requestId, decision } = req.body as { requestId: string; decision: string };

  if (!requestId || !decision) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Missing requestId or decision' });
    return;
  }

  const success = approveRequest(requestId, decision);
  if (!success) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Approval request not found or expired' });
    return;
  }

  res.json({ ok: true });
});

router.post('/abort', requireAuth, (_req: AuthRequest, res) => {
  res.json({ ok: true });
});

export { router as chatRoutes };
