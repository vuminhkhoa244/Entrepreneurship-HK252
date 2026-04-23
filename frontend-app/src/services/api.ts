import axios from 'axios';
import { getToken } from './auth';
import { BASE_URL } from '../constants/config';
import type { Book, Highlight, Note, ReadingSession, Bookmark } from '../types';

const client = axios.create({ baseURL: BASE_URL });

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

client.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['Content-Type'] = 'application/json';
  return config;
});

export default client;

// ── Library ──────────────────────────────────────────────────────

export const LibraryAPI = {
  list: () => client.get<Book[]>('/library'),
  get: (id: string) => client.get<Book>(`/library/${id}`),
  delete: (id: string) => client.delete(`/library/${id}`),
  stats: () => client.get('/library/stats/overview'),
  recentSessions: () => client.get('/library/stats/recent-sessions'),
};

// ── Reader ───────────────────────────────────────────────────────

export const ReaderAPI = {
  chapter: (bookId: string, index: number) =>
    client.get<{ chapterIndex: number; title: string; content: string }>(
      `/reader/${bookId}/chapter/${index}`,
    ),

  contents: (bookId: string) =>
    client.get<{ chapters: any[]; totalChapters: number } | { totalPages: number }>(
      `/reader/${bookId}/contents`,
    ),

  setProgress: (
    bookId: string,
    currentPage: number,
    currentChapter: number,
    totalPages?: number,
    totalChapters?: number,
  ) =>
    client.post(`/reader/${bookId}/progress`, {
      currentPage,
      currentChapter,
      totalPages: totalPages ?? 0,
      totalChapters: totalChapters ?? 0,
    }),

  startSession: (bookId: string) =>
    client.post<{ sessionId: string }>(`/reader/${bookId}/session/start`, {}),

  endSession: (bookId: string, sessionId: string, pagesRead: number) =>
    client.post(`/reader/${bookId}/session/end`, {
      sessionId,
      pagesRead,
    }),
  };

// ── Bookmarks ───────────────────────────────────────────────────────

export const BookmarkAPI = {
  list: (bookId: string) => client.get<Bookmark[]>(`/bookmarks/${bookId}`),
  create: (bookId: string, chapter: number, page: number) =>
    client.post<Bookmark>(`/bookmarks/${bookId}`, { chapter, page }),
  delete: (bookId: string, bookmarkId: string) =>
    client.delete(`/bookmarks/${bookId}/${bookmarkId}`),
};

// ── Notes ───────────────────────────────────────────────────────────

export const NoteAPI = {
  list: (bookId: string) => client.get<Note[]>(`/notes/${bookId}`),
  create: (bookId: string, data: { content: string; highlighted_text?: string; page?: number }) =>
    client.post<Note>(`/notes/${bookId}`, data),
  delete: (noteId: string) => client.delete(`/notes/${noteId}`),
};

// ── Highlights ─────────────────────────────────────────────────────

export const HighlightAPI = {
  list: (bookId: string) => client.get<Highlight[]>(`/highlights/${bookId}`),
  create: (bookId: string, data: { text: string; location?: string; page?: number; color?: string }) =>
    client.post<Highlight>(`/highlights/${bookId}`, data),
  delete: (highlightId: string) => client.delete(`/highlights/${highlightId}`),
};

// ── AI Features ───────────────────────────────────────────────────

export const AIAPI = {
  summarizeChapter: (bookId: string, chapterIndex: number) =>
    client.post<{ summary: string }>(`/ai/${bookId}/summarize/chapter`, {
      chapterIndex,
    }),

  summarizeText: (bookId: string, text: string) =>
    client.post<{ summary: string }>(`/ai/${bookId}/summarize/text`, { text }),

  extractKeyIdeas: (bookId: string, text: string) =>
    client.post<{ ideas: string[] }>(`/ai/${bookId}/key-ideas`, { text }),

  generateBulletSummary: (bookId: string, text: string) =>
    client.post<{ bullets: string[] }>(`/ai/${bookId}/bullet-summary`, { text }),

  askQuestion: (bookId: string, question: string, context?: string) =>
    client.post<{ answer: string }>(`/ai/${bookId}/ask`, { question, context }),
};


