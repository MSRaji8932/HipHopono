import { config } from 'dotenv';
import { z } from 'zod';
import os from 'os';
import path from 'path';

config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  SESSION_SECRET: z.string().default('hiphopono-dev-secret-change-in-production'),
  WEbCODE_ALLOWED_ROOTS: z.string().default(os.homedir()),
  DATA_DIR: z.string().default('./database'),
  ALLOW_RESET: z.enum(['true', 'false']).default('true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  ALLOWED_ROOTS: parsed.data.WEbCODE_ALLOWED_ROOTS.split(':').map(p => p.trim()),
  DATA_DIR_ABS: path.resolve(parsed.data.DATA_DIR),
};
