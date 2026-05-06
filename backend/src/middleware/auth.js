import jwt from 'jsonwebtoken';
import { getDb } from '../db/index.js';
import { logger } from './logging.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;

    if (!token) {
      logger.warn('Missing authorization token', { path: req.path, ip: req.ip });
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Validate decoded token structure
    if (!decoded.id) {
      logger.warn('Invalid token structure', { path: req.path, ip: req.ip });
      return res.status(401).json({ error: 'Invalid token' });
    }

    const db = getDb();
    const user = db.prepare('SELECT id, email, display_name FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      logger.warn('Token user not found', { userId: decoded.id, path: req.path });
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      logger.info('Token expired', { error: err.message });
      return res.status(401).json({ error: 'Token expired. Please refresh.' });
    }
    
    logger.warn('Token verification failed', { error: err.message, path: req.path });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional authentication - doesn't require token but attaches user if present
 */
export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.id) {
      const db = getDb();
      const user = db.prepare('SELECT id, email, display_name FROM users WHERE id = ?').get(decoded.id);
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (err) {
    // Silently continue if token verification fails for optional auth
    next();
  }
}

