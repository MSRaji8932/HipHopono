import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { getDb } from '../db/db.js';
import { scanSkills } from '../services/skills/scanner.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const projectId = req.query.projectId as string;
    const db = getDb();
    const project = db.projects.find(p => p.id === projectId && p.userId === req.userId);

    if (!project) {
      res.json({ skills: [] });
      return;
    }

    const skills = await scanSkills(project.absPath);

    const stored = db.settings[req.userId!];
    const enabledSkills: Record<string, boolean> = {};

    res.json({
      skills: skills.map(s => ({
        name: s.name,
        description: s.description,
        allowedTools: s.allowedTools,
        sourcePath: s.sourcePath,
        scope: s.scope,
        enabled: enabledSkills[s.name] !== false,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: 'SKILLS_ERROR', message: (err as Error).message });
  }
});

export { router as skillsRoutes };
