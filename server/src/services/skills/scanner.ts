import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { type Skill, parseSkillFile } from './parser.js';

const PROJECT_SKILL_DIRS = [
  '.skill',
  '.skills',
  '.opencode/skill',
  '.opencode/skills',
  '.claude/skills',
  '.claude/commands',
  '.agent/skills',
  '.codex/skill',
  '.codex/skills',
  '.cursor/rules',
  '.zed',
  '.rules',
  '.ai',
  '.prompts',
];

const USER_SKILL_DIRS = [
  '.skill',
  '.opencode/skills',
  '.claude/skills',
  '.claude/commands',
];

const SKILL_EXTENSIONS = ['.md', '.json', '.yaml', '.yml', '.txt'];

export async function scanSkills(projectPath: string): Promise<Skill[]> {
  const skills: Skill[] = [];

  for (const dir of PROJECT_SKILL_DIRS) {
    const fullPath = path.join(projectPath, dir);
    const dirSkills = await scanDirectory(fullPath, 'project');
    skills.push(...dirSkills);
  }

  const homeDir = os.homedir();
  for (const dir of USER_SKILL_DIRS) {
    const fullPath = path.join(homeDir, dir);
    const dirSkills = await scanDirectory(fullPath, 'user');
    skills.push(...dirSkills);
  }

  return skills;
}

async function scanDirectory(dirPath: string, scope: 'project' | 'user'): Promise<Skill[]> {
  const skills: Skill[] = [];

  try {
    await fs.access(dirPath);
  } catch {
    return skills;
  }

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SKILL_EXTENSIONS.includes(ext)) {
          const skill = await parseSkillFile(fullPath, scope);
          if (skill) skills.push(skill);
        }
      } else if (entry.isDirectory()) {
        const skillMdPath = path.join(fullPath, 'SKILL.md');
        const readmePath = path.join(fullPath, 'README.md');

        let found = false;
        for (const mdPath of [skillMdPath, readmePath]) {
          try {
            await fs.access(mdPath);
            const skill = await parseSkillFile(mdPath, scope);
            if (skill) {
              skill.name = entry.name;
              skills.push(skill);
              found = true;
              break;
            }
          } catch {
            continue;
          }
        }

        if (!found) {
          const subSkills = await scanDirectory(fullPath, scope);
          skills.push(...subSkills);
        }
      }
    }
  } catch {
    // Directory not readable, skip
  }

  return skills;
}
