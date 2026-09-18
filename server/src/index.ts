import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './env.js';
import { initDatabase, getDb } from './db/db.js';
import { seedDatabase } from './db/seed.js';
import { authRoutes } from './routes/auth.js';
import { settingsRoutes } from './routes/settings.js';
import { fsRoutes } from './routes/fs.js';
import { projectRoutes } from './routes/project.js';
import { skillsRoutes } from './routes/skills.js';
import { chatRoutes } from './routes/chat.js';
import { conversationsRoutes } from './routes/conversations.js';
import { errorHandler } from './middleware/errors.js';

const app = express();
let server: ReturnType<typeof app.listen>;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Enhanced health check for Docker / monitoring
app.get('/api/health', (_req, res) => {
  try {
    const db = getDb();
    const uptime = process.uptime();
    const mem = process.memoryUsage();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      memory: {
        rss: Math.floor(mem.rss / 1024 / 1024),
        heapUsed: Math.floor(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.floor(mem.heapTotal / 1024 / 1024),
      },
      database: {
        users: db.users.length,
        conversations: db.conversations.length,
        messages: db.messages.length,
      },
      env: {
        node: process.version,
        resetEnabled: env.ALLOW_RESET === 'true',
      },
    });
  } catch {
    res.status(503).json({ status: 'error', message: 'Database not initialized' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/fs', fsRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationsRoutes);

app.use(errorHandler);

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
    // Force close after 5 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 5000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

async function start() {
  await initDatabase();
  const seeded = await seedDatabase();

  server = app.listen(env.PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║       HipHopono - AI Web CLI             ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  Server:  http://localhost:${env.PORT}          ║`);
    console.log(`║  Client:  http://localhost:5173           ║`);
    console.log('╠══════════════════════════════════════════╣');
    if (seeded) {
      console.log('║  FIRST RUN - Login Credentials:          ║');
      console.log(`║  Username: ${seeded.username.padEnd(29)}║`);
      console.log(`║  Password: ${seeded.password.padEnd(29)}║`);
      console.log('║  (You will be forced to change password) ║');
    } else {
      console.log('║  Ready! Open http://localhost:5173        ║');
    }
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
  });
}

start().catch(console.error);
