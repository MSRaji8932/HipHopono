import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { requireAuth } from '../middleware/auth.js';
import { safePath, readFileSafe } from '../services/fsSafe.js';
import { getDb } from '../db/db.js';
import os from 'os';

const router = Router();

router.get('/browse', requireAuth, async (req, res) => {
  try {
    const targetPath = (req.query.path as string) || os.homedir();
    const safe = await safePath(targetPath);
    const entries = await fs.readdir(safe, { withFileTypes: true });
    const dirs = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => ({
        name: e.name,
        path: path.join(safe, e.name),
      }));

    res.json({ path: safe, directories: dirs });
  } catch (err) {
    res.status(400).json({ error: 'INVALID_PATH', message: (err as Error).message });
  }
});

router.get('/tree', requireAuth, async (req, res) => {
  try {
    const projectId = req.query.projectId as string;
    const targetPath = req.query.path as string;

    const db = getDb();
    const project = db.projects.find(p => p.id === projectId);
    if (!project) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Project not found' });
      return;
    }

    const root = project.absPath;
    const startPath = targetPath || root;

    const ignoredDirs = new Set(['node_modules', '.git', 'dist', 'build', '.next', '__pycache__']);

    async function buildTree(dirPath: string, depth = 0): Promise<unknown[]> {
      if (depth > 8) return [];

      const safe = await safePath(dirPath, root);
      const entries = await fs.readdir(safe, { withFileTypes: true });
      const items: unknown[] = [];

      for (const entry of entries) {
        if (ignoredDirs.has(entry.name)) continue;
        if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;

        const fullPath = path.join(safe, entry.name);

        if (entry.isDirectory()) {
          const children = await buildTree(fullPath, depth + 1);
          items.push({
            name: entry.name,
            path: fullPath,
            type: 'directory',
            children,
          });
        } else {
          items.push({
            name: entry.name,
            path: fullPath,
            type: 'file',
          });
        }
      }

      return items.sort((a, b) => {
        const aItem = a as { type: string; name: string };
        const bItem = b as { type: string; name: string };
        if (aItem.type === 'directory' && bItem.type !== 'directory') return -1;
        if (aItem.type !== 'directory' && bItem.type === 'directory') return 1;
        return aItem.name.localeCompare(bItem.name);
      });
    }

    const tree = await buildTree(startPath);
    res.json({ tree });
  } catch (err) {
    res.status(500).json({ error: 'TREE_ERROR', message: (err as Error).message });
  }
});

router.get('/file', requireAuth, async (req, res) => {
  try {
    const projectId = req.query.projectId as string;
    const filePath = req.query.path as string;

    const db = getDb();
    const project = db.projects.find(p => p.id === projectId);
    if (!project) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Project not found' });
      return;
    }

    const content = await readFileSafe(filePath, project.absPath);
    res.json({ content, path: filePath });
  } catch (err) {
    res.status(400).json({ error: 'READ_ERROR', message: (err as Error).message });
  }
});

export { router as fsRoutes };
