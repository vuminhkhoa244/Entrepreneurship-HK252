/**
 * Request Logging & Monitoring Middleware
 */

import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = process.env.LOG_FILE ? dirname(process.env.LOG_FILE) : `${__dirname}/../../logs`;
const LOG_FILE = process.env.LOG_FILE || `${LOG_DIR}/app.log`;

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];

/**
 * Log message with timestamp and level
 */
function log(level, message, meta = {}) {
  if (LOG_LEVELS[level] < currentLogLevel) {
    return;
  }

  const timestamp = new Date().toISOString();
  const logMessage = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...meta,
  };

  const logString = JSON.stringify(logMessage);

  // Log to file if enabled
  if (process.env.ENABLE_REQUEST_LOGGING === 'true') {
    fs.appendFileSync(LOG_FILE, logString + '\n', { encoding: 'utf8' });
  }

  // Also log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[${timestamp}] [${level.toUpperCase()}] ${message}`, meta);
  }
}

export const logger = {
  debug: (msg, meta) => log('debug', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
};

/**
 * Request logging middleware
 */
export function requestLogging(req, res, next) {
  const start = Date.now();

  // Log request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.user?.id || 'anonymous',
  });

  // Override res.json to log responses
  const originalJson = res.json.bind(res);
  res.json = function (data) {
    const duration = Date.now() - start;

    logger.info('Response sent', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id || 'anonymous',
    });

    return originalJson(data);
  };

  next();
}

/**
 * Error logging middleware
 */
export function errorLogging(err, req, res, next) {
  logger.error('Request error', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '[hidden in production]' : err.stack,
    method: req.method,
    path: req.path,
    userId: req.user?.id || 'anonymous',
    statusCode: err.statusCode || 500,
  });

  next(err);
}
