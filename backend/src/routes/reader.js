import express from 'express';
import { getDb } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { createReadStream, existsSync, statSync, readFile } from 'fs';
import { join, dirname, posix, isAbsolute } from 'path';

const router = express.Router();
router.use(authMiddleware);

// ─── Helpers ────────────────────────────────────────────────────

function lookupBook(db, bookId, userId) {
  // Only return books the user owns (fix #7: security gap)
  return db.prepare('SELECT * FROM books WHERE id = ? AND user_id = ?').get(bookId, userId);
}

// ─── Book Content ───────────────────────────────────────────────

// Serve book file with byte-range support (fix #1)
router.get('/:bookId/file', (req, res) => {
  const db = getDb();
  const book = lookupBook(db, req.params.bookId, req.user.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });

  const filePath = join(process.cwd(), book.file_url);
  if (!existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  const size = statSync(filePath).size;

  if (book.file_type === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', size);

    // Handle Range requests
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : size - 1;

      if (start >= size) {
        return res.status(416).json({ error: 'Range not satisfiable' });
      }

      const chunkSize = (end - start) + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'application/pdf',
        'Cache-Control': 'public, max-age=3600',
      });
      createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      createReadStream(filePath).pipe(res);
    }
  } else {
    res.status(400).json({ error: 'Use chapter endpoints for EPUB files' });
  }
});

// Serve EPUB assets (images, CSS) — resolve relative paths (fix #2)
router.get('/:bookId/asset/*', async (req, res) => {
  try {
    const db = getDb();
    const book = lookupBook(db, req.params.bookId, req.user.id);
    if (!book || book.file_type !== 'epub') return res.status(404).json({ error: 'Book not found' });

    const assetPath = decodeURIComponent(req.params[0]);
    const { Epub } = await import('epub2');
    const epub = new Epub(join(process.cwd(), book.file_url));

    // epub2 can serve internal assets
    const asset = await epub.getAsset(assetPath);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const ext = assetPath.split('.').pop().toLowerCase();
    const mimeMap = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
      css: 'text/css', woff: 'font/woff', woff2: 'font/woff2',
      ttf: 'font/ttf', otf: 'font/otf',
    };
    res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(asset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get EPUB table of contents / chapter list (fix #7: user check via lookupBook)
router.get('/:bookId/contents', async (req, res) => {
  try {
    const db = getDb();
    const book = lookupBook(db, req.params.bookId, req.user.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });

    if (book.file_type === 'epub') {
      const { Epub } = await import('epub2');
      const epub = new Epub(join(process.cwd(), book.file_url));
      await epub.parse();
      const chapters = (epub.flow || []).map((ch, i) => ({
        id: ch.id,
        title: ch.title || `Chapter ${i + 1}`,
        href: ch.href,
        index: i,
      }));
      res.json({ chapters, totalChapters: chapters.length });
    } else {
      res.json({ totalPages: book.total_pages, fileType: 'pdf' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get EPUB chapter content with asset URL rewriting (fix #2)
router.get('/:bookId/chapter/:chapterIndex', async (req, res) => {
  try {
    const db = getDb();
    const book = lookupBook(db, req.params.bookId, req.user.id);
    if (!book || book.file_type !== 'epub') return res.status(404).json({ error: 'Chapter not available' });

    const { Epub } = await import('epub2');
    const epub = new Epub(join(process.cwd(), book.file_url));
    const index = parseInt(req.params.chapterIndex);

    const chapters = epub.flow;
    if (!chapters || index < 0 || index >= chapters.length) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    let content = await epub.getChapterRaw(index);

    // Rewrite relative asset paths to our asset endpoint (fix #2)
    const assetPrefix = `/api/reader/${book.id}/asset/`;
    content = content
      .replace(/(src)=["']([^"']+(?:\.png|\.jpg|\.jpeg|\.gif|\.svg|\.webp))["']/gi, `$1="${assetPrefix}$2"`)
      .replace(/(url)\(["']?([^"')\s]+\.(?:woff2|woff|ttf|otf))["']?\)/gi, `url("${assetPrefix}$2")`)
      // Also handle relative paths like ../OEBPS/Images/
      .replace(/(src)=["']\.?\.\//g, `$1="${assetPrefix}`)
      .replace(/(url)\(["']?\.?\.\//g, `url("${assetPrefix}`);

    res.json({
      chapterIndex: index,
      title: chapters[index]?.title || `Chapter ${index + 1}`,
      content,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Progress ───────────────────────────────────────────────────

// Update reading progress — supports both EPUB (chapters) and PDF (pages) (fix #3)
router.post('/:bookId/progress', (req, res) => {
  const db = getDb();
  const { currentPage, currentChapter, totalPages, totalChapters } = req.body;
  const book = lookupBook(db, req.params.bookId, req.user.id);

  let progress;
  if (book?.file_type === 'epub' && totalChapters > 0) {
    // EPUB: use chapter-based progress
    progress = Math.round(((currentChapter + 1) / totalChapters) * 10000) / 100;
  } else if (totalPages > 0) {
    // PDF: use page-based progress
    progress = Math.round((currentPage / totalPages) * 10000) / 100;
  } else {
    progress = 0;
  }
  const completed = progress >= 100 ? 1 : 0;

  const existing = db.prepare(
    'SELECT id FROM user_books WHERE user_id = ? AND book_id = ?',
  ).get(req.user.id, req.params.bookId);

  if (existing) {
    db.prepare(`
      UPDATE user_books
      SET current_page = ?, current_chapter = ?, progress = ?, completed = ?, last_read_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND book_id = ?
    `).run(currentPage, currentChapter, progress, completed, req.user.id, req.params.bookId);
  } else {
    db.prepare(`
      INSERT INTO user_books (id, user_id, book_id, current_page, current_chapter, progress, completed, last_read_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(uuidv4(), req.user.id, req.params.bookId, currentPage, currentChapter, progress, completed);
  }

  res.json({ progress, completed: !!completed });
});

// ─── Reading Sessions ───────────────────────────────────────────

router.post('/:bookId/session/start', (req, res) => {
  const db = getDb();
  const sessionId = uuidv4();
  db.prepare('INSERT INTO reading_sessions (id, user_id, book_id, started_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
    .run(sessionId, req.user.id, req.params.bookId);
  res.json({ sessionId });
});

router.post('/:bookId/session/end', (req, res) => {
  const db = getDb();
  const { sessionId, pagesRead } = req.body;
  db.prepare(`
    UPDATE reading_sessions
    SET ended_at = CURRENT_TIMESTAMP, pages_read = ?, duration_seconds = (julianday('now') - julianday(started_at)) * 86400
    WHERE id = ? AND user_id = ?
  `).run(pagesRead || 0, sessionId, req.user.id);
  res.json({ success: true });
});

// ─── Bookmarks (new for fix #5) ─────────────────────────────────

router.post('/:bookId/bookmarks', (req, res) => {
  const db = getDb();
  const { chapter, page } = req.body;
  const id = uuidv4();

  db.prepare('INSERT INTO bookmarks (id, user_id, book_id, chapter, page) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.user.id, req.params.bookId, chapter || 0, page || 0);
  res.status(201).json({ id, chapter, page });
});

router.get('/:bookId/bookmarks', (req, res) => {
  const db = getDb();
  const bookmarks = db.prepare(
    'SELECT * FROM bookmarks WHERE user_id = ? AND book_id = ? ORDER BY created_at DESC',
  ).all(req.user.id, req.params.bookId);
  res.json(bookmarks);
});

router.delete('/:bookId/bookmarks/:bookmarkId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM bookmarks WHERE id = ? AND user_id = ? AND book_id = ?')
    .run(req.params.bookmarkId, req.user.id, req.params.bookId);
  res.json({ success: true });
});

// ─── Highlights ─────────────────────────────────────────────────

router.post('/:bookId/highlights', (req, res) => {
  const db = getDb();
  const { text, location, page, color } = req.body;
  const id = uuidv4();

  db.prepare('INSERT INTO highlights (id, user_id, book_id, text, location, page, color) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.user.id, req.params.bookId, text, location, page || 0, color || '#FFD700');
  res.status(201).json({ id, text, color });
});

router.get('/:bookId/highlights', (req, res) => {
  const db = getDb();
  const highlights = db.prepare(
    'SELECT * FROM highlights WHERE user_id = ? AND book_id = ? ORDER BY created_at DESC',
  ).all(req.user.id, req.params.bookId);
  res.json(highlights);
});

router.delete('/:bookId/highlights/:highlightId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM highlights WHERE id = ? AND user_id = ? AND book_id = ?')
    .run(req.params.highlightId, req.user.id, req.params.bookId);
  res.json({ success: true });
});

// ─── Notes ──────────────────────────────────────────────────────

router.post('/:bookId/notes', (req, res) => {
  const db = getDb();
  const { content, highlightId, page } = req.body;
  const id = uuidv4();

  db.prepare('INSERT INTO notes (id, user_id, book_id, content, highlight_id, page) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, req.user.id, req.params.bookId, content, highlightId || null, page || 0);
  res.status(201).json({ id, content });
});

router.get('/:bookId/notes', (req, res) => {
  const db = getDb();
  const notes = db.prepare(`
    SELECT n.*, h.text as highlighted_text, h.color
    FROM notes n
    LEFT JOIN highlights h ON n.highlight_id = h.id
    WHERE n.user_id = ? AND n.book_id = ?
    ORDER BY n.created_at DESC
  `).all(req.user.id, req.params.bookId);
  res.json(notes);
});

router.patch('/:bookId/notes/:noteId', (req, res) => {
  const db = getDb();
  const { content } = req.body;
  db.prepare('UPDATE notes SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND book_id = ?')
    .run(content, req.params.noteId, req.user.id, req.params.bookId);
  res.json({ success: true });
});

router.delete('/:bookId/notes/:noteId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ? AND book_id = ?')
    .run(req.params.noteId, req.user.id, req.params.bookId);
  res.json({ success: true });
});

// ─── Reading History ───────────────────────────────────────────

router.get('/:bookId/sessions', (req, res) => {
  const db = getDb();
  const sessions = db.prepare(
    'SELECT * FROM reading_sessions WHERE user_id = ? AND book_id = ? ORDER BY started_at DESC LIMIT 50',
  ).all(req.user.id, req.params.bookId);
  res.json(sessions);
});

export default router;
