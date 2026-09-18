import fs from 'fs/promises';
import path from 'path';
import { env } from '../env.js';
import { type Database, createEmptyDatabase } from './schema.js';
import { rotateAuditLogIfNeeded } from '../services/logRotation.js';

const DB_FILE = path.join(env.DATA_DIR_ABS, 'db.json');
const DB_TMP = DB_FILE + '.tmp';

let cache: Database | null = null;
let writeQueue: Promise<void> = Promise.resolve();

export async function initDatabase(): Promise<void> {
  await fs.mkdir(env.DATA_DIR_ABS, { recursive: true });

  try {
    const raw = await fs.readFile(DB_FILE, 'utf-8');
    cache = JSON.parse(raw) as Database;
  } catch {
    cache = createEmptyDatabase();
    await atomicWrite(cache);
  }
}

export function getDb(): Database {
  if (!cache) throw new Error('Database not initialized');
  return cache;
}

export async function saveDb(db: Database): Promise<void> {
  cache = db;
  writeQueue = writeQueue.then(() => atomicWrite(db));
  await writeQueue;
  rotateAuditLogIfNeeded(); // Non-blocking
}

async function atomicWrite(db: Database): Promise<void> {
  const json = JSON.stringify(db, null, 2);
  await fs.writeFile(DB_TMP, json, 'utf-8');
  await fs.rename(DB_TMP, DB_FILE);
}
