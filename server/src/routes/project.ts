import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { getDb, saveDb } from '../db/db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { safePath } from '../services/fsSafe.js';
import { isGitRepo, getGitBranch } from '../services/git.js';

const router = Router();

const openSchema = z.object({
  path: z.string().min(1),
});

router.post('/open', requireAuth, async (req: AuthRequest, res) => {
  const parsed = openSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid input' });
    return;
  }

  try {
    const targetPath = await safePath(parsed.data.path);

    const stat = await fs.stat(targetPath);
    if (!stat.isDirectory()) {
      res.status(400).json({ error: 'NOT_A_DIRECTORY', message: 'Path is not a directory' });
      return;
    }

    const isGit = await isGitRepo(targetPath);
    if (!isGit) {
      res.status(400).json({
        error: 'NOT_A_GIT_REPO',
        message: 'This folder is not a git repository.',
      });
      return;
    }

    const blockedDirs = ['node_modules', '/proc', '/sys'];
    for (const blocked of blockedDirs) {
      if (targetPath.includes(blocked)) {
        res.status(400).json({
          error: 'BLOCKED_DIRECTORY',
          message: 'Cannot open this type of directory',
        });
        return;
      }
    }

    const branch = await getGitBranch(targetPath);
    const name = path.basename(targetPath);

    const db = getDb();
    const existing = db.projects.find(
      p => p.userId === req.userId && p.absPath === targetPath
    );

    let project;
    if (existing) {
      existing.lastUsedAt = new Date().toISOString();
      existing.gitBranch = branch;
      project = existing;
    } else {
      project = {
        id: uuid(),
        userId: req.userId!,
        name,
        absPath: targetPath,
        gitBranch: branch,
        openedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
      };
      db.projects.push(project);
    }

    await saveDb(db);

    db.auditLog.push({
      id: uuid(),
      userId: req.userId!,
      action: 'project.open',
      detail: { path: targetPath },
      at: new Date().toISOString(),
    });
    await saveDb(db);

    res.json({ project });
  } catch (err) {
    res.status(400).json({ error: 'OPEN_ERROR', message: (err as Error).message });
  }
});

router.get('/recent', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const projects = db.projects
    .filter(p => p.userId === req.userId)
    .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime())
    .slice(0, 20);

  res.json({ projects });
});

router.post('/close', requireAuth, async (req: AuthRequest, res) => {
  const { projectId } = req.body as { projectId: string };
  const db = getDb();
  db.projects = db.projects.filter(p => !(p.id === projectId && p.userId === req.userId));
  await saveDb(db);
  res.json({ ok: true });
});

export { router as projectRoutes };
