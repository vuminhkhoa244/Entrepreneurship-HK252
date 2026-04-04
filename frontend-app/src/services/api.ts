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
  Object.assign(config.headers, await authHeaders());
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

// ── Highlights ───────────────────────────────────────────────────

export const HighlightAPI = {
  list: (bookId: string) =>
    client.get<Highlight[]>(`/reader/${bookId}/highlights`),

  create: (bookId: string, data: { text: string; page?: number; color?: string }) =>
    client.post<Highlight>(`/reader/${bookId}/highlights`, data),

  delete: (bookId: string, highlightId: string) =>
    client.delete(`/reader/${bookId}/highlights/${highlightId}`),
};

// ── Notes ────────────────────────────────────────────────────────

export const NoteAPI = {
  list: (bookId: string) => client.get<Note[]>(`/reader/${bookId}/notes`),

  create: (
    bookId: string,
    data: { content: string; highlightId?: string; page?: number },
  ) => client.post<Note>(`/reader/${bookId}/notes`, data),

  update: (bookId: string, noteId: string, content: string) =>
    client.patch(`/reader/${bookId}/notes/${noteId}`, { content }),

  delete: (bookId: string, noteId: string) =>
    client.delete(`/reader/${bookId}/notes/${noteId}`),
};

// ── Bookmarks ────────────────────────────────────────────────────

export const BookmarkAPI = {
  list: (bookId: string) => client.get<Bookmark[]>(`/reader/${bookId}/bookmarks`),

  create: (bookId: string, chapter?: number, page?: number) =>
    client.post<Bookmark>(`/reader/${bookId}/bookmarks`, { chapter, page }),

  delete: (bookId: string, bookmarkId: string) =>
    client.delete(`/reader/${bookId}/bookmarks/${bookmarkId}`),
};
