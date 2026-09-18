import fs from 'fs/promises';
import path from 'path';
import { env } from '../env.js';

const MAX_AUDIT_LOG_ENTRIES = 10000;
const ROTATE_CHECK_INTERVAL = 100; // Check every N saves

let saveCount = 0;

export async function rotateAuditLogIfNeeded(): Promise<void> {
  saveCount++;
  if (saveCount % ROTATE_CHECK_INTERVAL !== 0) return;

  try {
    const dbPath = path.join(env.DATA_DIR_ABS, 'db.json');
    const raw = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(raw);

    if (db.auditLog && db.auditLog.length > MAX_AUDIT_LOG_ENTRIES) {
      // Archive old entries
      const archiveDir = path.join(env.DATA_DIR_ABS, 'logs');
      await fs.mkdir(archiveDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archivePath = path.join(archiveDir, `audit_${timestamp}.json`);

      const trimmed = db.auditLog.splice(0, db.auditLog.length - MAX_AUDIT_LOG_ENTRIES);
      await fs.writeFile(archivePath, JSON.stringify(trimmed, null, 2), 'utf-8');

      // Save trimmed db
      const tmpPath = dbPath + '.tmp';
      await fs.writeFile(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
      await fs.rename(tmpPath, dbPath);

      console.log(`[log-rotation] Archived ${trimmed.length} audit entries to ${archivePath}`);
    }
  } catch {
    // Non-critical — ignore errors
  }
}
