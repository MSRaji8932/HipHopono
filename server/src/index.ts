import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './env.js';
import { initDatabase } from './db/db.js';
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

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/fs', fsRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationsRoutes);

app.use(errorHandler);

async function start() {
  await initDatabase();
  await seedDatabase();

  app.listen(env.PORT, () => {
    console.log(`HipHopono server running on http://localhost:${env.PORT}`);
  });
}

start().catch(console.error);
