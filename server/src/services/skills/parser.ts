import fs from 'fs/promises';
import path from 'path';

export interface Skill {
  name: string;
  description: string;
  allowedTools: string[];
  content: string;
  sourcePath: string;
  scope: 'project' | 'user';
  enabled: boolean;
}

export async function parseSkillFile(filePath: string, scope: 'project' | 'user'): Promise<Skill | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const name = path.basename(filePath, path.extname(filePath));

    if (filePath.endsWith('.md')) {
      return parseMarkdownSkill(content, name, filePath, scope);
    }

    if (filePath.endsWith('.json')) {
      return parseJsonSkill(content, name, filePath, scope);
    }

    if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      return parseYamlSkill(content, name, filePath, scope);
    }

    if (filePath.endsWith('.txt')) {
      return {
        name,
        description: `Skill from ${name}`,
        allowedTools: [],
        content,
        sourcePath: filePath,
        scope,
        enabled: true,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function parseMarkdownSkill(content: string, name: string, sourcePath: string, scope: 'project' | 'user'): Skill {
  let description = `Skill: ${name}`;
  let allowedTools: string[] = [];
  let body = content;

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    body = frontmatterMatch[2];

    for (const line of frontmatter.split('\n')) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      if (key.trim() === 'name' && value) {
        name = value.replace(/['"]/g, '');
      }
      if (key.trim() === 'description' && value) {
        description = value.replace(/['"]/g, '');
      }
      if (key.trim() === 'allowed-tools' && value) {
        allowedTools = value.split(',').map(t => t.trim()).filter(Boolean);
      }
    }
  }

  return { name, description, allowedTools, content: body.trim(), sourcePath, scope, enabled: true };
}

function parseJsonSkill(content: string, name: string, sourcePath: string, scope: 'project' | 'user'): Skill {
  try {
    const data = JSON.parse(content);
    return {
      name: data.name || name,
      description: data.description || `Skill: ${name}`,
      allowedTools: data.allowedTools || data.allowed_tools || [],
      content: data.content || data.prompt || data.body || content,
      sourcePath,
      scope,
      enabled: data.enabled !== false,
    };
  } catch {
    return {
      name,
      description: `Skill: ${name}`,
      allowedTools: [],
      content,
      sourcePath,
      scope,
      enabled: true,
    };
  }
}

function parseYamlSkill(content: string, name: string, sourcePath: string, scope: 'project' | 'user'): Skill {
  let description = `Skill: ${name}`;
  let allowedTools: string[] = [];
  let body = content;

  const lines = content.split('\n');
  const frontmatterLines: string[] = [];
  let bodyStart = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      bodyStart = i + 1;
      break;
    }
    frontmatterLines.push(lines[i]);
  }

  for (const line of frontmatterLines) {
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();

    if (key.trim() === 'name' && value) name = value.replace(/['"]/g, '');
    if (key.trim() === 'description' && value) description = value.replace(/['"]/g, '');
    if (key.trim() === 'allowed-tools' && value) {
      allowedTools = value.split(',').map(t => t.trim()).filter(Boolean);
    }
  }

  body = lines.slice(bodyStart).join('\n').trim();

  return { name, description, allowedTools, content: body, sourcePath, scope, enabled: true };
}
