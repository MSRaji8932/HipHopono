import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function getGitBranch(projectPath: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: projectPath,
      timeout: 5000,
    });
    return stdout.trim();
  } catch {
    return 'unknown';
  }
}

export async function getGitStatus(projectPath: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['status', '--porcelain'], {
      cwd: projectPath,
      timeout: 5000,
    });
    return stdout.trim();
  } catch {
    return '';
  }
}

export async function getGitDiff(projectPath: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', ['diff'], {
      cwd: projectPath,
      timeout: 10000,
    });
    return stdout.trim();
  } catch {
    return '';
  }
}

export async function getGitLog(projectPath: string, limit = 20): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', [
      'log', `--max-count=${limit}`, '--oneline',
    ], {
      cwd: projectPath,
      timeout: 5000,
    });
    return stdout.trim();
  } catch {
    return '';
  }
}

export async function isGitRepo(projectPath: string): Promise<boolean> {
  try {
    await execFileAsync('git', ['rev-parse', '--git-dir'], {
      cwd: projectPath,
      timeout: 3000,
    });
    return true;
  } catch {
    return false;
  }
}
