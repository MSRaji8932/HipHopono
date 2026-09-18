import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { env } from '../env.js';
import { getDb, saveDb } from './db.js';
import type { UserSettings } from './schema.js';

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function generatePassword(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

const defaultSettings: UserSettings = {
  providerLabel: 'OpenAI',
  modelName: 'gpt-4o',
  apiBaseUrl: 'https://api.openai.com/v1',
  apiToken: '',
  apiFormat: 'openai',
  temperature: 0.2,
  maxTokens: 8192,
  systemPrompt: `You are HipHopono, an AI coding assistant. You help users write, debug, and understand code. You can read and write files, run commands, and interact with git.

When using tools, you MUST provide the required parameters:
- read_file: requires "path" (absolute file path)
- write_file: requires "path" and "content"
- create_file: requires "path" and "content"
- delete_file: requires "path"
- rename_file: requires "oldPath" and "newPath"
- list_dir: requires "path" (or omit for project root)
- glob: requires "pattern" and "path"
- grep: requires "pattern" and "path"
- run_command: requires "command"

Always explain what you're doing and ask for approval before making changes.`,
  autoApproveReads: true,
  autoApproveWrites: false,
  autoApproveCommands: false,
  commandTimeoutMs: 30000,
  theme: 'dark',
  customHeaders: {},
};

export async function seedDatabase(): Promise<{ username: string; password: string } | null> {
  const db = getDb();

  if (db.users.length > 0) return null;

  const username = 'admin';
  const password = generatePassword();
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);

  db.users.push({
    id: uuid(),
    username,
    passwordHash,
    passwordSalt: salt,
    role: 'admin',
    mustChangePassword: true,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  });

  const adminUser = db.users[0];
  db.settings[adminUser.id] = { ...defaultSettings };

  await saveDb(db);

  const credsPath = path.join(env.DATA_DIR_ABS, 'INITIAL_CREDENTIALS.txt');
  const content = `HipHopono - Initial Admin Credentials\n\nUsername: ${username}\nPassword: ${password}\n\nIMPORTANT: You will be forced to change this password on first login.\n`;
  await fs.writeFile(credsPath, content, 'utf-8');

  console.log('\n========================================');
  console.log('HipHopono - Initial Admin Credentials');
  console.log('========================================');
  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
  console.log('========================================\n');

  return { username, password };
}
