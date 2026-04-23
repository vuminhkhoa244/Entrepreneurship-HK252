import express from 'express';
import { getDb } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { extractEpubMetadata, extractPdfInfo } from '../utils/book-parser.js';
import { extname, join } from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// Upload a book
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const db = getDb();
    const userId = req.user.id;
    const ext = extname(req.file.originalname).toLowerCase().slice(1);
    const fileUrl = `/uploads/${req.file.filename}`;

    // Extract metadata
    const filePath = req.file.path;
    let title, author, totalChapters, totalPages;

    if (ext === 'epub') {
      const meta = await extractEpubMetadata(filePath);
      title = meta.title;
      author = meta.author;
      totalChapters = meta.totalChapters;
    } else {
      const meta = await extractPdfInfo(filePath);
      title = meta.title;
      author = meta.author;
      totalPages = meta.totalPages;
    }

    const bookId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO books (id, user_id, title, author, file_url, file_type, file_size, total_pages, total_chapters)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(bookId, userId, title, author, fileUrl, ext, req.file.size, totalPages || 0, totalChapters || 0);

    // Initialize user-book progress
    db.prepare(`
      INSERT INTO user_books (id, user_id, book_id) VALUES (?, ?, ?)
    `).run(crypto.randomUUID(), userId, bookId);

    res.status(201).json({ id: bookId, title, author, fileType: ext });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's library
router.get('/', (req, res) => {
  const db = getDb();
  const books = db.prepare(`
    SELECT b.*, ub.progress, ub.last_read_at, ub.completed
    FROM books b
    LEFT JOIN user_books ub ON b.id = ub.book_id AND ub.user_id = ?
    WHERE b.user_id = ?
    ORDER BY ub.last_read_at DESC, b.created_at DESC
  `).all(req.user.id, req.user.id);

  res.json(books);
});

// Get single book
router.get('/:id', (req, res) => {
  const db = getDb();
  const book = db.prepare(`
    SELECT b.*, ub.current_page, ub.current_chapter, ub.progress, ub.completed, ub.last_read_at
    FROM books b
    LEFT JOIN user_books ub ON b.id = ub.book_id AND ub.user_id = ?
    WHERE b.id = ? AND (b.user_id = ? OR b.user_id = '')
  `).get(req.user.id, req.params.id, req.user.id);

  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
});

// Delete a book
router.delete('/:id', (req, res) => {
  const db = getDb();
  const book = db.prepare('SELECT file_url FROM books WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });

  // Delete file if exists
  const fullPath = join(process.cwd(), book.file_url);
  if (existsSync(fullPath)) {
    import('fs').then(fs => fs.promises.unlink(fullPath)).catch(() => {});
  }

  db.prepare('DELETE FROM books WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  // Cascade will handle related records
  res.json({ success: true });
});

// Get reading stats
router.get('/stats/overview', (req, res) => {
  const db = getDb();
  const stats = db.prepare(`
    SELECT
      COUNT(DISTINCT b.id) as total_books,
      COUNT(DISTINCT CASE WHEN ub.completed = 1 THEN b.id END) as completed_books,
      COALESCE(SUM(rs.pages_read), 0) as total_pages_read,
      COALESCE(SUM(rs.duration_seconds), 0) as total_reading_seconds
    FROM books b
    LEFT JOIN user_books ub ON b.id = ub.book_id AND ub.user_id = ?
    LEFT JOIN reading_sessions rs ON b.id = rs.book_id AND rs.user_id = ?
    WHERE b.user_id = ?
  `).get(req.user.id, req.user.id, req.user.id);

  res.json(stats);
});

// Fix #10: recent sessions across all books
router.get('/stats/recent-sessions', (req, res) => {
  const db = getDb();
  const sessions = db.prepare(`
    SELECT rs.*, b.title as book_title, b.id as book_id
    FROM reading_sessions rs
    JOIN books b ON rs.book_id = b.id
    WHERE rs.user_id = ?
    ORDER BY rs.started_at DESC
    LIMIT 20
  `).all(req.user.id);
  res.json(sessions);
});

export default router;
