import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';
import { getDb } from './db/index.js';
import authRoutes from './routes/auth.js';
import libraryRoutes from './routes/library.js';
import readerRoutes from './routes/reader.js';
import aiRoutes from './routes/ai.js';
import { securityHeaders, httpsRedirect } from './middleware/security.js';
import { requestLogging, errorLogging, logger } from './middleware/logging.js';
import { apiLimiter } from './middleware/rateLimiter.js';

dotenv.config();

// Validate critical environment variables
const requiredEnvs = ['JWT_SECRET'];
requiredEnvs.forEach((env) => {
  if (!process.env[env]) {
    console.error(`FATAL: Environment variable ${env} is not set`);
    process.exit(1);
  }
  if (env === 'JWT_SECRET' && process.env[env].includes('dev-secret')) {
    console.error('FATAL: JWT_SECRET still has default value. Set a strong secret in .env');
    process.exit(1);
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Security & Middleware ──────────────────────────────────────

// HTTPS redirect (if enabled)
app.use(httpsRedirect);

// Security headers
app.use(securityHeaders);

// Request logging
app.use(requestLogging);

// CORS - restrict to allowed origins in production
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:8081'
).split(',');
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl requests)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('CORS request blocked', { origin });
        callback(new Error('CORS not allowed'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parser with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Serve uploaded files (with cache headers)
const uploadDir = process.env.UPLOAD_DIR || resolve(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadDir, { maxAge: '1h', etag: false }));

// API rate limiting
app.use('/api/', apiLimiter);

// ─── Routes ─────────────────────────────────────────────────────

// Health check (no auth required)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/library', libraryRoutes);
app.use('/api/reader', readerRoutes);
app.use('/api/ai', aiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ─── Error Handling ─────────────────────────────────────────────

// Error logging middleware
app.use(errorLogging);

// Global error handler
app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;
  const isDev = process.env.NODE_ENV !== 'production';

  logger.error('Unhandled error', {
    message: err.message,
    statusCode,
    ...(isDev && { stack: err.stack }),
  });

  // Don't expose stack traces in production
  const response = {
    error: isDev ? err.message : 'An error occurred',
    ...(isDev && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
});

// ─── Server Startup ─────────────────────────────────────────────

async function start() {
  try {
    getDb(); // Initialize database

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        nodeEnv: process.env.NODE_ENV,
        allowedOrigins: allowedOrigins.join(', '),
      });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});
