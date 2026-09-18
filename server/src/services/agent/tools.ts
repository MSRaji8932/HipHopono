import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFileSafe, writeFileSafe, deletePathSafe, renamePathSafe, listDirectory, safePath } from '../fsSafe.js';
import { getGitStatus, getGitDiff, getGitLog, getGitBranch } from '../git.js';
import type { LLMTool } from '../llm/index.js';

const execFileAsync = promisify(execFile) as (
  file: string,
  args?: readonly string[] | null,
  options?: { cwd?: string; timeout?: number; maxBuffer?: number; shell?: boolean }
) => Promise<{ stdout: string; stderr: string }>;

const DANGEROUS_COMMANDS = [
  'rm -rf /',
  'rm -rf /*',
  'sudo',
  'curl | sh',
  'wget | sh',
  ':(){:|:&};:',
  'dd if=/dev/zero',
  'mkfs',
  '> /dev/sda',
];

export const AGENT_TOOLS: LLMTool[] = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file. Returns the file content with optional line range.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to the file' },
          offset: { type: 'number', description: 'Start line (0-indexed)' },
          limit: { type: 'number', description: 'Max lines to read' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write content to a file. Creates the file if it does not exist.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to the file' },
          content: { type: 'string', description: 'Content to write' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_file',
      description: 'Create a new file with content.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path for the new file' },
          content: { type: 'string', description: 'File content' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_file',
      description: 'Delete a file or directory.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Absolute path to delete' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rename_file',
      description: 'Rename or move a file.',
      parameters: {
        type: 'object',
        properties: {
          oldPath: { type: 'string', description: 'Current path' },
          newPath: { type: 'string', description: 'New path' },
        },
        required: ['oldPath', 'newPath'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_dir',
      description: 'List files and directories in a path.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'glob',
      description: 'Find files matching a pattern.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Glob pattern' },
          path: { type: 'string', description: 'Directory to search in' },
        },
        required: ['pattern', 'path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'grep',
      description: 'Search for text across project files.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regex pattern' },
          path: { type: 'string', description: 'Directory to search' },
        },
        required: ['pattern', 'path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Execute a shell command.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Shell command to run' },
          cwd: { type: 'string', description: 'Working directory' },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'git_status',
      description: 'Get the git status of the project.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'git_diff',
      description: 'Get the git diff of the project.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'git_log',
      description: 'Get the git log of the project.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Number of commits to show' },
        },
      },
    },
  },
];

export interface ToolResult {
  ok: boolean;
  output: string;
  needsApproval?: boolean;
  approvalDetail?: string;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  projectRoot: string
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'read_file': {
        const filePath = args.path as string;
        if (!filePath) {
          return { ok: false, output: 'Error: path parameter is required' };
        }
        const content = await readFileSafe(filePath, projectRoot);
        const lines = content.split('\n');
        const offset = (args.offset as number) || 0;
        const limit = (args.limit as number) || 2000;
        const sliced = lines.slice(offset, offset + limit);
        return { ok: true, output: sliced.join('\n') };
      }

      case 'write_file':
      case 'create_file': {
        const filePath = args.path as string;
        const content = args.content as string;
        await writeFileSafe(filePath, content, projectRoot);
        return { ok: true, output: `File written: ${filePath}` };
      }

      case 'delete_file': {
        const filePath = args.path as string;
        await deletePathSafe(filePath, projectRoot);
        return { ok: true, output: `Deleted: ${filePath}` };
      }

      case 'rename_file': {
        await renamePathSafe(args.oldPath as string, args.newPath as string, projectRoot);
        return { ok: true, output: `Renamed: ${args.oldPath} → ${args.newPath}` };
      }

      case 'list_dir': {
        const dirPath = (args.path as string) || projectRoot;
        const entries = await fs.readdir(await safePath(dirPath, projectRoot), { withFileTypes: true });
        const listing = entries.map(e => `${e.isDirectory() ? '📁' : '📄'} ${e.name}`).join('\n');
        return { ok: true, output: listing };
      }

      case 'glob': {
        const { glob } = await import('glob');
        const files = await glob(args.pattern as string, {
          cwd: projectRoot,
          absolute: true,
          ignore: ['**/node_modules/**', '**/.git/**'],
        });
        return { ok: true, output: files.join('\n') || 'No matches found' };
      }

      case 'grep': {
        const grepPath = (args.path as string) || '.';
        const { stdout } = await execFileAsync('rg', [
          '-n', '--no-heading', args.pattern as string, grepPath,
        ], { cwd: projectRoot, timeout: 10000, maxBuffer: 1024 * 1024 });
        return { ok: true, output: stdout.toString().slice(0, 1000000) || 'No matches found' };
      }

      case 'run_command': {
        const command = args.command as string;
        const cwd = (args.cwd as string) || projectRoot;

        const isDangerous = DANGEROUS_COMMANDS.some(d => command.includes(d));
        if (isDangerous) {
          return {
            ok: false,
            output: '',
            needsApproval: true,
            approvalDetail: `Dangerous command: ${command}`,
          };
        }

        const { stdout, stderr } = await execFileAsync(command, [], {
          shell: true,
          cwd,
          timeout: 30000,
          maxBuffer: 1024 * 1024,
        });

        const output = [stdout, stderr].filter(Boolean).join('\n');
        return { ok: true, output: output.slice(0, 1000000) };
      }

      case 'git_status': {
        const status = await getGitStatus(projectRoot);
        return { ok: true, output: status || 'No changes' };
      }

      case 'git_diff': {
        const diff = await getGitDiff(projectRoot);
        return { ok: true, output: diff || 'No diff' };
      }

      case 'git_log': {
        const limit = (args.limit as number) || 20;
        const log = await getGitLog(projectRoot, limit);
        return { ok: true, output: log || 'No commits' };
      }

      default:
        return { ok: false, output: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { ok: false, output: `Error: ${(err as Error).message}` };
  }
}

export function needsApproval(name: string, args: Record<string, unknown>, settings: {
  autoApproveReads: boolean;
  autoApproveWrites: boolean;
  autoApproveCommands: boolean;
}): boolean {
  if (name === 'read_file' || name === 'list_dir' || name === 'glob' || name === 'grep') {
    return !settings.autoApproveReads;
  }

  if (name === 'write_file' || name === 'create_file' || name === 'delete_file' || name === 'rename_file') {
    return !settings.autoApproveWrites;
  }

  if (name === 'run_command') {
    return !settings.autoApproveCommands;
  }

  if (name.startsWith('git_')) {
    return false;
  }

  return true;
}
