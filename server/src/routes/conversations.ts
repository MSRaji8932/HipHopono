import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { getDb, saveDb } from '../db/db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, (req: AuthRequest, res) => {
  const projectId = req.query.projectId as string;
  const db = getDb();

  let conversations = db.conversations.filter(c => c.userId === req.userId);

  if (projectId) {
    conversations = conversations.filter(c => c.projectId === projectId);
  }

  conversations.sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  res.json({ conversations });
});

const createSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().optional(),
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid input' });
    return;
  }

  const { projectId, title } = parsed.data;
  const db = getDb();

  const conversation = {
    id: uuid(),
    projectId,
    userId: req.userId!,
    title: title || 'New Conversation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.conversations.push(conversation);
  await saveDb(db);

  res.json({ conversation });
});

router.get('/:id/messages', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const conversation = db.conversations.find(
    c => c.id === req.params.id && c.userId === req.userId
  );

  if (!conversation) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Conversation not found' });
    return;
  }

  const messages = db.messages
    .filter(m => m.conversationId === conversation.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  res.json({ messages });
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const db = getDb();
  const conversation = db.conversations.find(
    c => c.id === req.params.id && c.userId === req.userId
  );

  if (!conversation) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Conversation not found' });
    return;
  }

  db.messages = db.messages.filter(m => m.conversationId !== conversation.id);
  db.conversations = db.conversations.filter(c => c.id !== conversation.id);
  await saveDb(db);

  res.json({ ok: true });
});

router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { title } = req.body as { title: string };
  const db = getDb();
  const conversation = db.conversations.find(
    c => c.id === req.params.id && c.userId === req.userId
  );

  if (!conversation) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Conversation not found' });
    return;
  }

  if (title) {
    conversation.title = title;
    conversation.updatedAt = new Date().toISOString();
    await saveDb(db);
  }

  res.json({ ok: true });
});

export { router as conversationsRoutes };
