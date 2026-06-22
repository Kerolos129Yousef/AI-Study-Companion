import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import express, { Express, Request, Response, NextFunction } from 'express';
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

const app: Express = express();
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

// Test Claude API
app.get('/api/test-claude', async (req: Request, res: Response) => {
  console.log('[TEST] Testing Claude API...');
  try {
    const { generateSummary } = await import('./services/claude.service.js');
    const testText = 'This is a test lecture about machine learning. Machine learning is a subset of artificial intelligence that focuses on enabling computers to learn from data without being explicitly programmed. Key concepts include supervised learning, unsupervised learning, and reinforcement learning.';

    console.log('[TEST] Calling generateSummary with test text...');
    const result = await generateSummary(testText);
    console.log('[TEST] Result:', JSON.stringify(result).substring(0, 200));

    res.json({ success: true, result });
  } catch (error: any) {
    console.error('[TEST] Error:', error.message);
    console.error('[TEST] Full error:', JSON.stringify(error));
    res.status(500).json({ error: error.message, details: JSON.stringify(error) });
  }
});

// Test Email Transporter
app.get('/api/test-email', async (req: Request, res: Response) => {
  console.log('[TEST] Testing Email Transporter...');
  try {
    const { emailService } = await import('./services/email.js');

    console.log('[TEST] Attempting to send test email...');
    const result = await emailService.sendGroupInvitation({
      recipientEmail: 'muhammedreda6@gmail.com',
      recipientName: 'Test User',
      groupName: 'Test Study Group',
      inviterName: 'Admin',
      acceptLink: 'http://localhost:5173/accept-invitation/test-token-12345',
    });

    console.log('[TEST] Result:', result);

    res.json({
      success: true,
      emailSent: result,
      credentials: {
        user: process.env.EMAIL_USER,
        service: process.env.EMAIL_SERVICE,
        from: process.env.EMAIL_FROM,
      }
    });
  } catch (error: any) {
    console.error('[TEST] Error:', error.message);
    res.status(500).json({ error: error.message, details: JSON.stringify(error) });
  }
});

// Debug Transporter
app.get('/api/debug-email', async (req: Request, res: Response) => {
  console.log('\n===== [DEBUG EMAIL] =====');
  console.log('[DEBUG] process.env.EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
  console.log('[DEBUG] process.env.EMAIL_USER:', process.env.EMAIL_USER);
  console.log('[DEBUG] process.env.EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***' : 'UNDEFINED');
  console.log('[DEBUG] process.env.EMAIL_FROM:', process.env.EMAIL_FROM);

  try {
    const nodemailer = await import('nodemailer');

    // Create a fresh transporter to test
    const testTransporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    console.log('[DEBUG] Created test transporter');

    // Verify connection
    const verified = await testTransporter.verify();
    console.log('[DEBUG] Transporter verified:', verified);

    res.json({
      success: true,
      verified,
      config: {
        service: process.env.EMAIL_SERVICE,
        user: process.env.EMAIL_USER,
        from: process.env.EMAIL_FROM,
        hasPassword: !!process.env.EMAIL_PASSWORD,
      }
    });
  } catch (error: any) {
    console.error('[DEBUG] Error:', error.message);
    console.error('[DEBUG] Full error:', JSON.stringify(error, null, 2));
    res.status(500).json({
      error: error.message,
      details: error.toString()
    });
  } finally {
    console.log('===== [END DEBUG EMAIL] =====\n');
  }
});

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
