import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/index.js';
import { validateEmail, validatePassword, validateDisplayName } from '../middleware/validation.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { logger } from '../middleware/logging.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const SALT_ROUNDS = 10;

/**
 * Register a new user
 * POST /api/auth/register
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    // Validate inputs
    if (!email || !password) {
      logger.warn('Registration attempt with missing fields', { email: email || 'missing' });
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    if (!validateDisplayName(displayName)) {
      return res.status(400).json({ error: 'Invalid display name' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      logger.warn('Registration attempt with existing email', { email });
      // Don't reveal that email exists - prevent email enumeration
      return res.status(400).json({ error: 'Email already in use' });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = uuidv4();
    const cleanDisplayName = (displayName || email.split('@')[0]).substring(0, 100);

    db.prepare(
      'INSERT INTO users (id, email, password_hash, display_name) VALUES (?, ?, ?, ?)'
    ).run(id, email, hash, cleanDisplayName);

    const token = jwt.sign({ id, email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });

    logger.info('User registered successfully', { userId: id });

    res.status(201).json({
      token,
      refreshToken: generateRefreshToken(id),
      user: { id, email, displayName: cleanDisplayName },
    });
  } catch (err) {
    logger.error('Registration error', { error: err.message });
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

/**
 * Login user
 * POST /api/auth/login
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      logger.warn('Login attempt with missing fields', { email: email || 'missing' });
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const db = getDb();
    const user = db
      .prepare('SELECT id, email, password_hash, display_name FROM users WHERE email = ?')
      .get(email);

    if (!user) {
      logger.warn('Login attempt for non-existent user', { email });
      // Generic message to prevent user enumeration
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      logger.warn('Login attempt with invalid password', { userId: user.id });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });

    logger.info('User logged in successfully', { userId: user.id });

    res.json({
      token,
      refreshToken: generateRefreshToken(user.id),
      user: { id: user.id, email: user.email, displayName: user.display_name },
    });
  } catch (err) {
    logger.error('Login error', { error: err.message });
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

/**
 * Refresh token endpoint
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );
    const db = getDb();
    const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const newToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });

    res.json({ token: newToken });
  } catch (err) {
    logger.warn('Refresh token error', { error: err.message });
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

/**
 * Helper function to generate refresh token
 */
function generateRefreshToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
}

/**
 * Get current user
 * GET /api/auth/me
 */
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});
