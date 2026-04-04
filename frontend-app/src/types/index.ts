export interface Book {
  id: string;
  title: string;
  author?: string;
  cover_url?: string;
  file_url: string;
  file_type: 'epub' | 'pdf';
  file_size?: number;
  total_pages?: number;
  total_chapters?: number;
  progress?: number;
  last_read_at?: string;
  completed?: number;
  current_page?: number;
  current_chapter?: number;
  created_at: string;
}

export interface Highlight {
  id: string;
  text: string;
  location?: string;
  page?: number;
  color: string;
  created_at: string;
}

export interface Note {
  id: string;
  content: string;
  highlight_id?: string;
  highlighted_text?: string;
  page?: number;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface ReadingSession {
  id: string;
  book_id?: string;
  pages_read: number;
  duration_seconds: number;
  started_at: string;
  ended_at?: string;
}

export interface Bookmark {
  id: string;
  book_id: string;
  chapter: number;
  page: number;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
}
