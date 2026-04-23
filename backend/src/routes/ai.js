import express from 'express';
import { getDb } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import epub2 from 'epub2';
const { Epub } = epub2;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
router.use(authMiddleware);

// ─── AI Utilities ────────────────────────────────────────────────────

/**
 * Get chapter content from EPUB book
 */
async function getChapterContent(bookId, chapterIndex) {
  const db = getDb();
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
  
  if (!book || book.file_type !== 'epub') {
    throw new Error('Book not found or not an EPUB');
  }

  const epub = new Epub(join(process.cwd(), book.file_url));
  await epub.parse();
  
  const chapters = epub.flow;
  if (!chapters || chapterIndex < 0 || chapterIndex >= chapters.length) {
    throw new Error('Chapter not found');
  }

  const content = await epub.getChapterRaw(chapterIndex);
  return content;
}

/**
 * Call OpenRouter API for AI completions
 */
async function callOpenRouter(messages, model = null) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const aiModel = model || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
  
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured. Set OPENROUTER_API_KEY in .env');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:4000',
      'X-Title': 'Ebook Reader AI'
    },
    body: JSON.stringify({
      model: aiModel,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'AI API request failed');
  }

  const data = await response.json();
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
    
    // Verify book ownership
    const db = getDb();
    const book = db.prepare('SELECT * FROM books WHERE id = ? AND user_id = ?')
      .get(bookId, req.user.id);
    
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const content = await getChapterContent(bookId, chapterIndex);
    
    // Truncate if too long
    const text = content.substring(0, 15000);
    
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful reading assistant that provides concise chapter summaries. Focus on key points, main arguments, and important details. Keep summaries clear and structured.'
      },
      {
        role: 'user',
        content: `Please summarize this chapter:\n\n${text}`
      }
    ];

    const summary = await callOpenRouter(messages);
    res.json({ summary });
  } catch (err) {
    console.error('Summarize chapter error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Summarize selected text
 * POST /api/ai/:bookId/summarize/text
 */
router.post('/:bookId/summarize/text', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const messages = [
      {
        role: 'system',
        content: 'You are a helpful reading assistant. Provide concise summaries of text passages.'
      },
      {
        role: 'user',
        content: `Summarize this text:\n\n${text.substring(0, 5000)}`
      }
    ];

    const summary = await callOpenRouter(messages);
    res.json({ summary });
  } catch (err) {
    console.error('Summarize text error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Extract key ideas from text
 * POST /api/ai/:bookId/key-ideas
 */
router.post('/:bookId/key-ideas', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const messages = [
      {
        role: 'system',
        content: 'You are a helpful reading assistant. Extract the key ideas and main concepts from the text. Return a list of 3-7 bullet points.'
      },
      {
        role: 'user',
        content: `Extract the key ideas from this text:\n\n${text.substring(0, 10000)}`
      }
    ];

    const result = await callOpenRouter(messages);
    
    // Parse bullet points from response
    const ideas = result
      .split('\n')
      .map(line => line.replace(/^[\s\-\*\•\u2022]+/, '').trim())
      .filter(line => line.length > 0)
      .slice(0, 10);

    res.json({ ideas });
  } catch (err) {
    console.error('Extract key ideas error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Generate bullet-point summary
 * POST /api/ai/:bookId/bullet-summary
 */
router.post('/:bookId/bullet-summary', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const messages = [
      {
        role: 'system',
        content: 'You are a helpful reading assistant. Convert text into a structured bullet-point summary. Each bullet should capture a key point clearly.'
      },
      {
        role: 'user',
        content: `Create a bullet-point summary of this text:\n\n${text.substring(0, 10000)}`
      }
    ];

    const result = await callOpenRouter(messages);
    
    // Extract bullets
    const bullets = result
      .split('\n')
      .map(line => line.replace(/^[\s\-\*\•\u2022]+/, '').trim())
      .filter(line => line.length > 0 && line.length < 200)
      .slice(0, 15);

    res.json({ bullets });
  } catch (err) {
    console.error('Generate bullet summary error:', err);
    res.status(500).json({ error: err.message });
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
    
    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Verify book ownership
    const db = getDb();
    const book = db.prepare('SELECT * FROM books WHERE id = ? AND user_id = ?')
      .get(bookId, req.user.id);
    
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Build context: either provided, or fetch chapter content, or book metadata
    let contextText = '';
    
    if (context) {
      // Context explicitly provided (e.g. current chapter)
      contextText = context.substring(0, 15000);
    } else if (book.file_type === 'epub') {
      // For EPUB, include book metadata and maybe beginning
      try {
        const firstChapter = await getChapterContent(bookId, 0);
        contextText = `Book: ${book.title}\nAuthor: ${book.author || 'Unknown'}\n\nBeginning of book:\n${firstChapter.substring(0, 8000)}`;
      } catch {
        contextText = `Book: ${book.title}\nAuthor: ${book.author || 'Unknown'}`;
      }
    } else {
      // PDF or other - limited context
      contextText = `Book: ${book.title}\nAuthor: ${book.author || 'Unknown'}\nFile type: ${book.file_type}`;
    }

    const messages = [
      {
        role: 'system',
        content: 'You are an AI reading assistant helping a user understand a book. Answer questions based on the provided book context. Be accurate, insightful, and helpful. If the answer cannot be found in the context, say so honestly.'
      },
      {
        role: 'user',
        content: `Context from the book:\n\n${contextText}\n\n---\n\nUser question: ${question}`
      }
    ];

    const answer = await callOpenRouter(messages);
    res.json({ answer });
  } catch (err) {
    console.error('Ask question error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
