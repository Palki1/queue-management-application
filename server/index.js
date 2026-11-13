import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { config } from './config.js';
import { initDatabase } from './db/database.js';

import authRouter from './routes/auth.js';
import queuesRouter from './routes/queues.js';
import tokensRouter from './routes/tokens.js';
import analyticsRouter from './routes/analytics.js';
import eventsRouter from './routes/events.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite tables
initDatabase();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (config.isDev) {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/queues', queuesRouter);
app.use('/api/queues/:queueId/tokens', tokensRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/events', eventsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve static frontend build if it exists
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/events')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global Error Handler
app.use(errorHandler);

// Start Server if executed directly
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('server/index.js') ||
  process.argv[1].endsWith('server/index') ||
  process.argv[1].endsWith('server')
);

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`===============================================`);
    console.log(`🚀 Rugas Queue Manager Server running on port ${config.port}`);
    console.log(`🔗 API Base: http://localhost:${config.port}/api`);
    console.log(`📡 Real-time SSE Stream: http://localhost:${config.port}/events`);
    console.log(`===============================================`);
  });
}

export default app;
