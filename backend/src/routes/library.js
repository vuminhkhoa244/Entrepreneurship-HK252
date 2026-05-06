import express from 'express';
import { getDb } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { upload, validateUploadedFile } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { validateUUID } from '../middleware/validation.js';
import { extractEpubMetadata, extractPdfInfo } from '../utils/book-parser.js';
import { extname, join, basename } from 'path';
import { existsSync, promises as fs } from 'fs';
import crypto from 'crypto';
import { logger } from '../middleware/logging.js';

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

/**
 * Upload a book
 * POST /api/library/upload
 */
router.post(
  '/upload',
  uploadLimiter,
  upload.single('file'),
  validateUploadedFile,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const db = getDb();
      const userId = req.user.id;
      const ext = extname(req.file.originalname).toLowerCase().slice(1);
      const fileUrl = `/uploads/${req.file.filename}`;

      logger.info('Book upload started', { userId, fileName: req.file.originalname });

      // Extract metadata
      const filePath = req.file.path;
      let title, author, totalChapters, totalPages;

      try {
        if (ext === 'epub') {
          const meta = await extractEpubMetadata(filePath);
          title = (meta.title || 'Untitled').substring(0, 255);
          author = (meta.author || 'Unknown').substring(0, 255);
          totalChapters = Math.max(0, meta.totalChapters || 0);
        } else {
          const meta = await extractPdfInfo(filePath);
          title = (meta.title || 'Untitled').substring(0, 255);
          author = (meta.author || 'Unknown').substring(0, 255);
          totalPages = Math.max(0, meta.totalPages || 0);
        }
      } catch (metaErr) {
        logger.warn('Could not extract metadata', { userId, error: metaErr.message });
        // Use defaults if metadata extraction fails
        title = req.file.originalname.substring(0, 255);
        author = 'Unknown';
      }

      const bookId = crypto.randomUUID();

      db.prepare(
        `
      INSERT INTO books (id, user_id, title, author, file_url, file_type, file_size, total_pages, total_chapters)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      ).run(
        bookId,
        userId,
        title,
        author,
        fileUrl,
        ext,
        req.file.size,
        totalPages || 0,
        totalChapters || 0
      );

      // Initialize user-book progress
      db.prepare(
        `
      INSERT INTO user_books (id, user_id, book_id) VALUES (?, ?, ?)
    `
      ).run(crypto.randomUUID(), userId, bookId);

      logger.info('Book uploaded successfully', { userId, bookId, title });

      res.status(201).json({ id: bookId, title, author, fileType: ext });
    } catch (err) {
      logger.error('Book upload error', { userId: req.user.id, error: err.message });
      // Clean up file if exists
      if (req.file) {
        fs.unlink(req.file.path).catch(() => {});
      }
      res.status(500).json({ error: 'Book upload failed. Please try again.' });
    }
  }
);

/**
 * Get user's library
 * GET /api/library
 */
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const books = db
      .prepare(
        `
      SELECT b.id, b.title, b.author, b.file_type, b.file_size, b.total_pages, b.total_chapters, b.created_at,
             ub.progress, ub.last_read_at, ub.completed
      FROM books b
      LEFT JOIN user_books ub ON b.id = ub.book_id AND ub.user_id = ?
      WHERE b.user_id = ?
      ORDER BY ub.last_read_at DESC, b.created_at DESC
      LIMIT 1000
    `
      )
      .all(req.user.id, req.user.id);

    res.json(books);
  } catch (err) {
    logger.error('Get library error', { userId: req.user.id, error: err.message });
    res.status(500).json({ error: 'Failed to retrieve library' });
  }
});

/**
 * Get single book details
 * GET /api/library/:id
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    if (!validateUUID(id)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    const db = getDb();
    const book = db
      .prepare(
        `
      SELECT b.*, ub.current_page, ub.current_chapter, ub.progress, ub.completed, ub.last_read_at
      FROM books b
      LEFT JOIN user_books ub ON b.id = ub.book_id AND ub.user_id = ?
      WHERE b.id = ? AND b.user_id = ?
    `
      )
      .get(req.user.id, id, req.user.id);

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json(book);
  } catch (err) {
    logger.error('Get book error', {
      userId: req.user.id,
      bookId: req.params.id,
      error: err.message,
    });
    res.status(500).json({ error: 'Failed to retrieve book' });
  }
});

/**
 * Delete a book and all related data
 * DELETE /api/library/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!validateUUID(id)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    const db = getDb();
    const book = db
      .prepare('SELECT file_url FROM books WHERE id = ? AND user_id = ?')
      .get(id, req.user.id);

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Delete file if exists
    const filename = basename(book.file_url);
    const fullPath = join(process.env.UPLOAD_DIR || './uploads', filename);
    if (existsSync(fullPath)) {
      try {
        await fs.unlink(fullPath);
      } catch (fileErr) {
        logger.warn('Could not delete book file', {
          userId: req.user.id,
          bookId: id,
          error: fileErr.message,
        });
      }
    }

    // Delete from database (cascade handles related records)
    db.prepare('DELETE FROM books WHERE id = ? AND user_id = ?').run(id, req.user.id);

    logger.info('Book deleted', { userId: req.user.id, bookId: id });

    res.json({ success: true });
  } catch (err) {
    logger.error('Delete book error', {
      userId: req.user.id,
      bookId: req.params.id,
      error: err.message,
    });
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

/**
 * Get reading statistics overview
 * GET /api/library/stats/overview
 */
router.get('/stats/overview', (req, res) => {
  try {
    const db = getDb();
    const stats = db
      .prepare(
        `
      SELECT
        COUNT(DISTINCT b.id) as total_books,
        COUNT(DISTINCT CASE WHEN ub.completed = 1 THEN b.id END) as completed_books,
        COALESCE(SUM(rs.pages_read), 0) as total_pages_read,
        COALESCE(SUM(rs.duration_seconds), 0) as total_reading_seconds
      FROM books b
      LEFT JOIN user_books ub ON b.id = ub.book_id AND ub.user_id = ?
      LEFT JOIN reading_sessions rs ON b.id = rs.book_id AND rs.user_id = ?
      WHERE b.user_id = ?
    `
      )
      .get(req.user.id, req.user.id, req.user.id);

    res.json(stats);
  } catch (err) {
    logger.error('Get stats error', { userId: req.user.id, error: err.message });
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});

/**
 * Get recent reading sessions
 * GET /api/library/stats/recent-sessions
 */
router.get('/stats/recent-sessions', (req, res) => {
  try {
    const db = getDb();
    const sessions = db
      .prepare(
        `
      SELECT rs.id, rs.pages_read, rs.duration_seconds, rs.started_at, rs.ended_at,
             b.id as book_id, b.title as book_title
      FROM reading_sessions rs
      JOIN books b ON rs.book_id = b.id
      WHERE rs.user_id = ?
      ORDER BY rs.started_at DESC
      LIMIT 50
    `
      )
      .all(req.user.id);

    res.json(sessions);
  } catch (err) {
    logger.error('Get sessions error', { userId: req.user.id, error: err.message });
    res.status(500).json({ error: 'Failed to retrieve sessions' });
  }
});

export default router;
