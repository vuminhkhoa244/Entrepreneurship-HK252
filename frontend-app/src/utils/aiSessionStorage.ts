import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AISession } from '../types';

const AI_SESSIONS_KEY = '@ai_chat_sessions';
const CURRENT_SESSION_KEY = '@current_ai_session_id';

export const AISessionStorage = {
  /**
   * Create a new AI chat session
   */
  createSession: async (
    bookId: string,
    title: string,
    chapterIndex?: number,
    context?: string
  ): Promise<AISession> => {
    const session: AISession = {
      id: Date.now().toString(),
      bookId,
      chapterIndex,
      title,
      messages: [],
      context,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Get existing sessions
    const sessions = await AISessionStorage.getAllSessions();
    sessions.push(session);

    // Save all sessions
    await AsyncStorage.setItem(AI_SESSIONS_KEY, JSON.stringify(sessions));

    // Set as current session
    await AsyncStorage.setItem(CURRENT_SESSION_KEY, session.id);

    return session;
  },

  /**
   * Get all AI chat sessions for a specific book
   */
  getSessionsByBook: async (bookId: string): Promise<AISession[]> => {
    try {
      const data = await AsyncStorage.getItem(AI_SESSIONS_KEY);
      if (!data) {
        return [];
      }

      const sessions: AISession[] = JSON.parse(data);
      return sessions
        .filter((s) => s.bookId === bookId)
        .sort((a, b) => {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
    } catch (error) {
      console.error('Error getting sessions by book:', error);
      return [];
    }
  },

  /**
   * Get all AI chat sessions
   */
  getAllSessions: async (): Promise<AISession[]> => {
    try {
      const data = await AsyncStorage.getItem(AI_SESSIONS_KEY);
      if (!data) {
        return [];
      }

      const sessions: AISession[] = JSON.parse(data);
      return sessions.sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    } catch (error) {
      console.error('Error getting all sessions:', error);
      return [];
    }
  },

  /**
   * Get a specific session by ID
   */
  getSession: async (sessionId: string): Promise<AISession | null> => {
    try {
      const data = await AsyncStorage.getItem(AI_SESSIONS_KEY);
      if (!data) {
        return null;
      }

      const sessions: AISession[] = JSON.parse(data);
      return sessions.find((s) => s.id === sessionId) || null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  },

  /**
   * Update a session (messages, title, etc.)
   */
  updateSession: async (sessionId: string, updates: Partial<AISession>): Promise<void> => {
    try {
      const sessions = await AISessionStorage.getAllSessions();
      const sessionIndex = sessions.findIndex((s) => s.id === sessionId);

      if (sessionIndex === -1) {
        throw new Error('Session not found');
      }

      sessions[sessionIndex] = {
        ...sessions[sessionIndex],
        ...updates,
        id: sessions[sessionIndex].id, // Preserve ID
        bookId: sessions[sessionIndex].bookId, // Preserve bookId
        createdAt: sessions[sessionIndex].createdAt, // Preserve createdAt
        updatedAt: new Date().toISOString(), // Update timestamp
      };

      await AsyncStorage.setItem(AI_SESSIONS_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  },

  /**
   * Delete a session
   */
  deleteSession: async (sessionId: string): Promise<void> => {
    try {
      const sessions = await AISessionStorage.getAllSessions();
      const filteredSessions = sessions.filter((s) => s.id !== sessionId);

      await AsyncStorage.setItem(AI_SESSIONS_KEY, JSON.stringify(filteredSessions));

      // If deleted session was current, clear it
      const currentSessionId = await AsyncStorage.getItem(CURRENT_SESSION_KEY);
      if (currentSessionId === sessionId) {
        await AsyncStorage.removeItem(CURRENT_SESSION_KEY);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  },

  /**
   * Get the current session ID
   */
  getCurrentSessionId: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(CURRENT_SESSION_KEY);
    } catch (error) {
      console.error('Error getting current session ID:', error);
      return null;
    }
  },

  /**
   * Set the current session ID
   */
  setCurrentSessionId: async (sessionId: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(CURRENT_SESSION_KEY, sessionId);
    } catch (error) {
      console.error('Error setting current session ID:', error);
      throw error;
    }
  },

  /**
   * Clear current session
   */
  clearCurrentSession: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(CURRENT_SESSION_KEY);
    } catch (error) {
      console.error('Error clearing current session:', error);
      throw error;
    }
  },

  /**
   * Delete all sessions
   */
  deleteAllSessions: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(AI_SESSIONS_KEY);
      await AsyncStorage.removeItem(CURRENT_SESSION_KEY);
    } catch (error) {
      console.error('Error deleting all sessions:', error);
      throw error;
    }
  },
};
