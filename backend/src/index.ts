import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import {rateLimit} from 'express-rate-limit';
import * as Sentry from '@sentry/node';

import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import lectureRoutes from './routes/lectures.js';
import flashcardRoutes from './routes/flashcards.js';
import quizRoutes from './routes/quiz.js';
import analyticsRoutes from './routes/analytics.js';
import notesRoutes from './routes/notes.js';
import studyPlansRoutes from './routes/study-plans.js';
import sharingRoutes from './routes/sharing.js';
import studyGroupsRoutes from './routes/study-groups.js';
import commentsRoutes from './routes/comments.js';

import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth.js';
import { prisma } from './lib/prisma.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 1.0,
  });
  app.use(Sentry.Handlers.requestHandler());
}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(
  cors({
    origin: function(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const allowedOrigins = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
        : [];

      if (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) =>
  req.ip === '127.0.0.1' || req.ip === '::1',
});

app.use('/api/', limiter);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Route registration ---
// Public: auth routes have no middleware (login/register).
// Semi-public: sharing uses optionalAuth so public links work unauthenticated
//   while authenticated users get enriched responses (e.g. "my attempt" on shared quizzes).
// Protected: all other routes require a valid Bearer JWT via authMiddleware.

// Public routes
app.use('/api/auth', authRoutes);

// Sharing: GET by token is public (optional auth enriches the response for authenticated users).
// All mutation routes (POST/PATCH/DELETE) still require a valid token — enforced inside the router.
app.use('/api/sharing', optionalAuthMiddleware, sharingRoutes);

// Protected routes (require authentication)
app.use('/api/courses', authMiddleware, courseRoutes);
app.use('/api/lectures', authMiddleware, lectureRoutes);
app.use('/api/flashcards', authMiddleware, flashcardRoutes);
app.use('/api/quiz', authMiddleware, quizRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/notes', authMiddleware, notesRoutes);
app.use('/api/study-plans', authMiddleware, studyPlansRoutes);
app.use('/api/study-groups', authMiddleware, studyGroupsRoutes);
app.use('/api/comments', authMiddleware, commentsRoutes);

// Sentry error handler
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// Global error handler
app.use(errorHandler);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[SHUTDOWN] SIGINT received, closing gracefully...');
  server.close(async () => {
    console.log('[SHUTDOWN] Server closed');
    await prisma.$disconnect();
    console.log('[SHUTDOWN] Database disconnected');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\n[SHUTDOWN] SIGTERM received, closing gracefully...');
  server.close(async () => {
    console.log('[SHUTDOWN] Server closed');
    await prisma.$disconnect();
    console.log('[SHUTDOWN] Database disconnected');
    process.exit(0);
  });
});

export default app;
