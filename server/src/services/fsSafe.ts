import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { env } from '../env.js';

export class PathSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathSecurityError';
  }
}

export async function safePath(inputPath: string, projectRoot?: string): Promise<string> {
  // Resolve relative paths against projectRoot if provided
  const resolved = path.isAbsolute(inputPath)
    ? path.resolve(inputPath)
    : path.resolve(projectRoot || process.cwd(), inputPath);

  const normalized = path.normalize(resolved);
  if (normalized.includes('\0')) {
    throw new PathSecurityError('Path contains null bytes');
  }

  if (normalized.includes('..')) {
    throw new PathSecurityError('Path traversal detected');
  }

  let allowed = false;

  // Always allow paths within the project root
  if (projectRoot) {
    const projResolved = path.resolve(projectRoot);
    if (normalized.startsWith(projResolved)) {
      allowed = true;
    }
  }

  // Also check configured allowed roots
  if (!allowed) {
    for (const root of env.ALLOWED_ROOTS) {
      const rootResolved = path.resolve(root);
      if (normalized.startsWith(rootResolved)) {
        allowed = true;
        break;
      }
    }
  }

  if (!allowed) {
    throw new PathSecurityError(`Path is outside allowed roots: ${normalized}`);
  }

  if (projectRoot) {
    const projResolved = path.resolve(projectRoot);
    if (!normalized.startsWith(projResolved)) {
      throw new PathSecurityError('Path is outside project root');
    }
  }

  try {
    const stat = await fs.lstat(normalized);
    if (stat.isSymbolicLink()) {
      const real = await fs.realpath(normalized);
      const realNormalized = path.normalize(real);

      // Always allow symlinks pointing within project root
      if (projectRoot) {
        const projResolved = path.resolve(projectRoot);
        if (realNormalized.startsWith(projResolved)) {
          return realNormalized;
        }
      }

      for (const root of env.ALLOWED_ROOTS) {
        const rootResolved = path.resolve(root);
        if (realNormalized.startsWith(rootResolved)) {
          return realNormalized;
        }
      }
      throw new PathSecurityError('Symlink points outside allowed roots');
    }
  } catch (err) {
    if (err instanceof PathSecurityError) throw err;
  }

  return normalized;
}

export async function listDirectory(dirPath: string, projectRoot?: string): Promise<string[]> {
  const safe = await safePath(dirPath, projectRoot);
  const entries = await fs.readdir(safe, { withFileTypes: true });
  return entries
    .filter(e => !e.name.startsWith('.'))
    .map(e => e.name);
}

export async function readFileSafe(filePath: string, projectRoot?: string): Promise<string> {
  const safe = await safePath(filePath, projectRoot);
  const content = await fs.readFile(safe, 'utf-8');
  return content;
}

export async function writeFileSafe(filePath: string, content: string, projectRoot?: string): Promise<void> {
  const safe = await safePath(filePath, projectRoot);
  await fs.mkdir(path.dirname(safe), { recursive: true });
  await fs.writeFile(safe, content, 'utf-8');
}

export async function deletePathSafe(targetPath: string, projectRoot?: string): Promise<void> {
  const safe = await safePath(targetPath, projectRoot);
  await fs.rm(safe, { recursive: true, force: true });
}

export async function renamePathSafe(oldPath: string, newPath: string, projectRoot?: string): Promise<void> {
  const safeOld = await safePath(oldPath, projectRoot);
  const safeNew = await safePath(newPath, projectRoot);
  await fs.rename(safeOld, safeNew);
}

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}
