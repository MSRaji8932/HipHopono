import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { config } from 'dotenv';
import { z } from 'zod';
import os from 'os';

config();

const envSchema = z.object({
  DATA_DIR: z.string().default('./database'),
});

const parsed = envSchema.safeParse(process.env);
const DATA_DIR = path.resolve(parsed.success ? parsed.data.DATA_DIR : './database');

const DB_FILE = path.join(DATA_DIR, 'db.json');

function generatePassword(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

async function reset() {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║       HipHopono - Factory Reset          ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  // Confirm
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>(resolve => {
    rl.question('⚠️  This will DELETE ALL DATA. Type "yes" to confirm: ', resolve);
  });
  rl.close();

  if (answer.toLowerCase() !== 'yes') {
    console.log('Cancelled.');
    process.exit(0);
  }

  // Delete database
  try {
    await fs.unlink(DB_FILE);
    console.log('✓ Deleted database');
  } catch {
    console.log('✓ No existing database found');
  }

  // Create fresh database
  const username = 'admin';
  const password = generatePassword();
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');

  const db = {
    meta: { version: 1, createdAt: new Date().toISOString() },
    users: [{
      id: crypto.randomUUID(),
      username,
      passwordHash,
      passwordSalt: salt,
      role: 'admin' as const,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    }],
    sessions: [],
    settings: {},
    projects: [],
    conversations: [],
    messages: [],
    auditLog: [],
  };

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  console.log('✓ Created fresh database');

  // Export credentials
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const credsContent = [
    '╔══════════════════════════════════════════╗',
    '║       HipHopono - Reset Credentials      ║',
    '╠══════════════════════════════════════════╣',
    `║  Date: ${new Date().toLocaleString().padEnd(31)}║`,
    '╠══════════════════════════════════════════╣',
    `║  Username: admin                         ║`,
    `║  Password: ${password.padEnd(29)}║`,
    '╠══════════════════════════════════════════╣',
    '║  (Forced to change password on login)    ║',
    '╚══════════════════════════════════════════╝',
  ].join('\n');

  const credsPath = path.join(DATA_DIR, `RESET_CREDENTIALS_${timestamp}.txt`);
  await fs.writeFile(credsPath, credsContent, 'utf-8');
  console.log(`✓ Credentials saved to: ${credsPath}`);

  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║       RESET COMPLETE                     ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Username: ${username.padEnd(29)}║`);
  console.log(`║  Password: ${password.padEnd(29)}║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
}

reset().catch(err => {
  console.error('Reset failed:', err);
  process.exit(1);
});
