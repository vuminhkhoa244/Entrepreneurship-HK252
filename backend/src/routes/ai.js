import express from 'express';
import { getDb } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { validateUUID, validateChapterIndex } from '../middleware/validation.js';
import { logger } from '../middleware/logging.js';
import { extractPdfText } from '../utils/book-parser.js';
import epub2 from 'epub2';
import { join, basename } from 'path';
const { Epub } = epub2;

const router = express.Router();
router.use(authMiddleware);
router.use(aiLimiter);

const MAX_TEXT_LENGTH = 15000;
const MAX_QUESTION_LENGTH = 1000;

// ─── AI Utilities ────────────────────────────────────────────────────

/**
 * Get chapter content from EPUB book
 */
async function getChapterContent(bookId, chapterIndex, userId) {
  const db = getDb();
  const book = db.prepare('SELECT * FROM books WHERE id = ? AND user_id = ?').get(bookId, userId);

  if (!book || book.file_type !== 'epub') {
    throw new Error('Book not found or not an EPUB');
  }

  const filename = basename(book.file_url);
  const epub = new Epub(join(process.env.UPLOAD_DIR || '/tmp/uploads', filename));
  await epub.parse();

  const chapters = epub.flow;
  if (!chapters || chapterIndex < 0 || chapterIndex >= chapters.length) {
    throw new Error('Chapter not found');
  }

  const content = await epub.getChapterRaw(chapterIndex);
  return content;
}

/**
 * Get PDF content for AI processing
 */
async function getPdfContent(bookId, userId) {
  const db = getDb();
  const book = db.prepare('SELECT * FROM books WHERE id = ? AND user_id = ?').get(bookId, userId);

  if (!book || book.file_type !== 'pdf') {
    throw new Error('Book not found or not a PDF');
  }

  const filename = basename(book.file_url);
  const filePath = join(process.env.UPLOAD_DIR || '/tmp/uploads', filename);

  try {
    const text = await extractPdfText(filePath, 50); // Limit to first 50 pages for performance
    return text;
  } catch (error) {
    logger.error('PDF content extraction error', { bookId, error: error.message });
    throw new Error('Failed to extract PDF content');
  }
}

/**
 * Call OpenRouter API for AI completions
 * Includes safety checks and error handling
 */
async function callOpenRouter(messages, model = null) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const aiModel = model || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

  if (!apiKey) {
    throw new Error('AI service is not configured');
  }

  // Basic validation of messages
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Invalid messages format');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ebookreader.app',
      'X-Title': 'Ebook Reader AI',
    },
    timeout: 30000, // 30 second timeout
    body: JSON.stringify({
      model: aiModel,
      messages,
      temperature: 0.7,
      max_tokens: 1500,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData.error?.message || 'AI API request failed';

    if (response.status === 429) {
      throw new Error('AI service rate limit exceeded. Please try again later.');
    } else if (response.status === 401) {
      throw new Error('AI service authentication failed');
    }

    throw new Error(errorMsg);
  }

  const data = await response.json();

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid response from AI service');
  }

  return data.choices[0].message.content;
}

// ─── AI Endpoints ────────────────────────────────────────────────────

/**
 * Summarize a chapter
 * POST /api/ai/:bookId/summarize/chapter
 */
router.post('/:bookId/summarize/chapter', async (req, res) => {
  try {
    const { chapterIndex } = req.body;
    const bookId = req.params.bookId;

    // Validate inputs
    if (!validateUUID(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    if (chapterIndex === undefined || !validateChapterIndex(chapterIndex)) {
      return res.status(400).json({ error: 'Invalid chapter index' });
    }

    const db = getDb();
    const book = db
      .prepare('SELECT file_type FROM books WHERE id = ? AND user_id = ?')
      .get(bookId, req.user.id);

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    if (book.file_type !== 'epub') {
      return res.status(400).json({ error: 'Summarization is only available for EPUB files' });
    }

    const content = await getChapterContent(bookId, chapterIndex, req.user.id);
    const text = content.substring(0, MAX_TEXT_LENGTH);

    const messages = [
      {
        role: 'system',
        content:
          'You are a helpful reading assistant. Provide a clear, concise chapter summary focusing on key points and main ideas. Format clearly with main points.',
      },
      {
        role: 'user',
        content: `Summarize this chapter:\n\n${text}`,
      },
    ];

    const summary = await callOpenRouter(messages);

    logger.info('Chapter summarized', { userId: req.user.id, bookId, chapterIndex });
    res.json({ summary });
  } catch (err) {
    logger.error('Summarize chapter error', {
      userId: req.user.id,
      bookId: req.params.bookId,
      error: err.message,
    });
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

/**
 * Summarize PDF file
 * POST /api/ai/:bookId/summarize/pdf
 */
router.post('/:bookId/summarize/pdf', async (req, res) => {
  try {
    const bookId = req.params.bookId;

    if (!validateUUID(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    const db = getDb();
    const book = db
      .prepare('SELECT file_type FROM books WHERE id = ? AND user_id = ?')
      .get(bookId, req.user.id);

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    if (book.file_type !== 'pdf') {
      return res.status(400).json({ error: 'This endpoint is only available for PDF files' });
    }

    const content = await getPdfContent(bookId, req.user.id);
    const text = content.substring(0, MAX_TEXT_LENGTH * 2);

    const messages = [
      {
        role: 'system',
        content:
          'You are a helpful reading assistant. Provide a clear, concise summary of the PDF document focusing on key points and main ideas. Format clearly with main points.',
      },
      {
        role: 'user',
        content: `Summarize this document:\n\n${text}`,
      },
    ];

    const summary = await callOpenRouter(messages);

    logger.info('PDF summarized', { userId: req.user.id, bookId });
    res.json({ summary });
  } catch (err) {
    logger.error('Summarize PDF error', {
      userId: req.user.id,
      bookId: req.params.bookId,
      error: err.message,
    });
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

/**
 * Summarize selected text
 * POST /api/ai/:bookId/summarize/text
 */
router.post('/:bookId/summarize/text', async (req, res) => {
  try {
    const { text } = req.body;
    const bookId = req.params.bookId;

    if (!validateUUID(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Verify book ownership
    const db = getDb();
    const book = db
      .prepare('SELECT id FROM books WHERE id = ? AND user_id = ?')
      .get(bookId, req.user.id);

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const truncatedText = text.substring(0, MAX_TEXT_LENGTH);

    const messages = [
      {
        role: 'system',
        content:
          'You are a helpful reading assistant. Provide a concise summary of the given text.',
      },
      {
        role: 'user',
        content: `Summarize this text:\n\n${truncatedText}`,
      },
    ];

    const summary = await callOpenRouter(messages);

    logger.info('Text summarized', { userId: req.user.id, bookId, textLength: text.length });
    res.json({ summary });
  } catch (err) {
    logger.error('Summarize text error', { userId: req.user.id, error: err.message });
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

/**
 * Extract key ideas from text
 * POST /api/ai/:bookId/key-ideas
 */
router.post('/:bookId/key-ideas', async (req, res) => {
  try {
    const { text } = req.body;
    const bookId = req.params.bookId;

    if (!validateUUID(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const db = getDb();
    const book = db
      .prepare('SELECT id FROM books WHERE id = ? AND user_id = ?')
      .get(bookId, req.user.id);

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const truncatedText = text.substring(0, MAX_TEXT_LENGTH * 2);

    const messages = [
      {
        role: 'system',
        content:
          'You are a helpful reading assistant. Extract 3-7 key ideas and main concepts from the text. Return only the ideas as a clean list.',
      },
      {
        role: 'user',
        content: `Extract the key ideas:\n\n${truncatedText}`,
      },
    ];

    const result = await callOpenRouter(messages);

    const ideas = result
      .split('\n')
      .map((line) => line.replace(/^[\s\-*•\u2022\d.]+/, '').trim())
      .filter((line) => line.length > 5 && line.length < 300)
      .slice(0, 10);

    logger.info('Key ideas extracted', { userId: req.user.id, bookId });
    res.json({ ideas });
  } catch (err) {
    logger.error('Extract key ideas error', { userId: req.user.id, error: err.message });
    res.status(500).json({ error: 'Failed to extract key ideas' });
  }
});

/**
 * Generate bullet-point summary
 * POST /api/ai/:bookId/bullet-summary
 */
router.post('/:bookId/bullet-summary', async (req, res) => {
  try {
    const { text } = req.body;
    const bookId = req.params.bookId;

    if (!validateUUID(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const db = getDb();
    const book = db
      .prepare('SELECT id FROM books WHERE id = ? AND user_id = ?')
      .get(bookId, req.user.id);

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const truncatedText = text.substring(0, MAX_TEXT_LENGTH * 2);

    const messages = [
      {
        role: 'system',
        content:
          'Create a bullet-point summary. Each bullet should be clear and concise. Format as a clean list.',
      },
      {
        role: 'user',
        content: `Create a bullet-point summary:\n\n${truncatedText}`,
      },
    ];

    const result = await callOpenRouter(messages);

    const bullets = result
      .split('\n')
      .map((line) => line.replace(/^[\s\-*•\u2022\d.]+/, '').trim())
      .filter((line) => line.length > 5 && line.length < 250)
      .slice(0, 20);

    logger.info('Bullet summary generated', { userId: req.user.id, bookId });
    res.json({ bullets });
  } catch (err) {
    logger.error('Generate bullet summary error', { userId: req.user.id, error: err.message });
    res.status(500).json({ error: 'Failed to generate bullet summary' });
  }
});

/**
 * Ask AI a question about the book
 * POST /api/ai/:bookId/ask
 */
router.post('/:bookId/ask', async (req, res) => {
  try {
    const { question, context } = req.body;
    const bookId = req.params.bookId;

    if (!validateUUID(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (question.length > MAX_QUESTION_LENGTH) {
      return res
        .status(400)
        .json({ error: `Question too long (max ${MAX_QUESTION_LENGTH} characters)` });
    }

    const db = getDb();
    const book = db
      .prepare('SELECT title, author, file_type FROM books WHERE id = ? AND user_id = ?')
      .get(bookId, req.user.id);

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    let contextText = '';

    if (context && typeof context === 'string' && context.length > 0) {
      contextText = context.substring(0, MAX_TEXT_LENGTH);
    } else if (book.file_type === 'epub') {
      try {
        const firstChapter = await getChapterContent(bookId, 0, req.user.id);
        contextText = `Book: ${book.title}\nAuthor: ${book.author || 'Unknown'}\n\nContext:\n${firstChapter.substring(0, 8000)}`;
      } catch {
        contextText = `Book: ${book.title}\nAuthor: ${book.author || 'Unknown'}`;
      }
    } else if (book.file_type === 'pdf') {
      try {
        const pdfContent = await getPdfContent(bookId, req.user.id);
        contextText = `Book: ${book.title}\nAuthor: ${book.author || 'Unknown'}\n\nContent:\n${pdfContent.substring(0, MAX_TEXT_LENGTH)}`;
      } catch {
        contextText = `Book: ${book.title}\nAuthor: ${book.author || 'Unknown'}`;
      }
    } else {
      contextText = `Book: ${book.title}\nAuthor: ${book.author || 'Unknown'}`;
    }

    const messages = [
      {
        role: 'system',
        content:
          'You are an AI reading assistant helping users understand books. Answer questions based on the provided context. Be accurate and helpful.',
      },
      {
        role: 'user',
        content: `Context:\n${contextText}\n\nQuestion: ${question}`,
      },
    ];

    const answer = await callOpenRouter(messages);

    logger.info('Question answered', {
      userId: req.user.id,
      bookId,
      questionLength: question.length,
    });
    res.json({ answer });
  } catch (err) {
    logger.error('Ask question error', {
      userId: req.user.id,
      bookId: req.params.bookId,
      error: err.message,
    });
    res.status(500).json({ error: 'Failed to answer question' });
  }
});

export default router;
