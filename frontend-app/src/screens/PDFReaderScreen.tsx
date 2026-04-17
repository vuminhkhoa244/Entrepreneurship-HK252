import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import Pdf from 'react-native-pdf';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import {
  ReaderAPI,
  LibraryAPI,
  BookmarkAPI,
  HighlightAPI,
  NoteAPI,
} from '../services/api';
import { BASE_URL } from '../constants/config';
import { getToken } from '../services/auth';
import { FONT_SIZES } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import type { Bookmark, Highlight, Note } from '../types';

export default function PDFReaderScreen() {
  const route = useRoute<any>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { bookId } = route.params as { bookId: string };

  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pagesRead, setPagesRead] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const [scale, setScale] = useState(1.0);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  const [showTools, setShowTools] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [pdfReady, setPdfReady] = useState(false);
  const [forcedPage, setForcedPage] = useState<number | null>(null);

  const pageRef = useRef(1);
  const { colors } = useTheme();

  useEffect(() => {
    ReaderAPI.startSession(bookId)
      .then((res) => setSessionId(res.data.sessionId))
      .catch(() => {});
  }, [bookId]);

  useEffect(() => {
    return () => {
      if (sessionId) {
        ReaderAPI.endSession(bookId, sessionId, pagesRead).catch(() => {});
      }
    };
  }, [sessionId, pagesRead, bookId]);

  const loadReaderData = useCallback(async () => {
    try {
      const [token, bookRes, bookmarkRes, noteRes, highlightRes] =
        await Promise.all([
          getToken(),
          LibraryAPI.get(bookId),
          BookmarkAPI.list(bookId),
          NoteAPI.list(bookId),
          HighlightAPI.list(bookId),
        ]);

      const initialPage = Math.max(1, bookRes.data?.current_page || 1);
      pageRef.current = initialPage;
      setCurrentPage(initialPage);
      setForcedPage(initialPage);

      setAuthToken(token ?? '');
      setPdfUri(`${BASE_URL}/reader/${bookId}/file`);

      const book = bookRes.data;
      if (book) {
        setTotalPages(book.total_pages || 0);
      }

      setBookmarks(bookmarkRes.data.filter((b) => (b.page || 0) > 0));
      setNotes(noteRes.data.filter((n) => (n.page || 0) > 0));
      setHighlights(highlightRes.data.filter((h) => (h.page || 0) > 0));
    } catch {
      Alert.alert('Error', 'Failed to load PDF reader data');
    }
  }, [bookId]);

  useEffect(() => {
    loadReaderData();
  }, [loadReaderData]);

  useEffect(() => {
    setPdfReady(false);
    setLoading(true);
  }, [pdfUri, authToken]);

  useEffect(() => {
    pageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      const page = pageRef.current;
      if (totalPages > 0 && page > 0) {
        ReaderAPI.setProgress(
          bookId,
          page,
          page,
          totalPages,
          undefined,
        ).catch(() => {});
      }
    });
    return unsubscribe;
  }, [bookId, navigation, totalPages]);

  useEffect(() => {
    if (!pdfReady || totalPages <= 0 || currentPage <= 0) return;

    const timeout = setTimeout(() => {
      ReaderAPI.setProgress(
        bookId,
        currentPage,
        currentPage,
        totalPages,
        undefined,
      ).catch(() => {});
    }, 350);

    return () => clearTimeout(timeout);
  }, [bookId, currentPage, totalPages, pdfReady]);

  const jumpToPage = (page: number) => {
    if (totalPages <= 0) return;
    const next = Math.min(Math.max(page, 1), totalPages);
    if (next === pageRef.current) return;
    pageRef.current = next;
    setCurrentPage(next);
    setForcedPage(next);
  };

  const addBookmark = async () => {
    try {
      const { data } = await BookmarkAPI.create(bookId, 0, currentPage);
      setBookmarks((prev) => [data, ...prev]);
    } catch {
      Alert.alert('Error', 'Failed to bookmark page');
    }
  };

  const addHighlight = async () => {
    try {
      const { data } = await HighlightAPI.create(bookId, {
        text: `Page ${currentPage} highlight`,
        page: currentPage,
        color: '#FFD700',
      });
      setHighlights((prev) => [data, ...prev]);
    } catch {
      Alert.alert('Error', 'Failed to add highlight');
    }
  };

  const addNote = async () => {
    if (!noteInput.trim()) return;
    try {
      const { data } = await NoteAPI.create(bookId, {
        content: noteInput.trim(),
        page: currentPage,
      });
      setNotes((prev) => [data, ...prev]);
      setNoteInput('');
    } catch {
      Alert.alert('Error', 'Failed to save note');
    }
  };

  const source = useMemo(
    () =>
      pdfUri && authToken
        ? {
            uri: pdfUri,
            headers: { Authorization: `Bearer ${authToken}` },
            cache: true,
          }
        : null,
    [pdfUri, authToken],
  );

  if (!source) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.textDim }]}>Loading PDF...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Reading PDF</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={addBookmark}>
            <Ionicons name="bookmark-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={addHighlight}>
            <Ionicons name="brush-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowNotes(true)}>
            <Ionicons name="create-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowTools((v) => !v)}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {showTools && (
        <View
          style={[
            styles.tools,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.toolLabel, { color: colors.text }]}>Zoom</Text>
          <View style={styles.zoomRow}>
            <TouchableOpacity
              onPress={() =>
                setScale((s) => Math.max(0.8, +(s - 0.1).toFixed(1)))
              }
            >
              <Ionicons name="remove" size={24} color={colors.accent} />
            </TouchableOpacity>
            <Text style={[styles.zoomText, { color: colors.text }]}>
              {Math.round(scale * 100)}%
            </Text>
            <TouchableOpacity
              onPress={() => setScale((s) => Math.min(3, +(s + 0.1).toFixed(1)))}
            >
              <Ionicons name="add" size={24} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Pdf
        source={source}
        page={forcedPage ?? undefined}
        scale={scale}
        minScale={0.8}
        maxScale={3.0}
        onLoadComplete={(pages, page) => {
          setTotalPages(pages);
          setPagesRead(pages);
          pageRef.current = page;
          setCurrentPage(page);
          setPdfReady(true);
          setLoading(false);
          setForcedPage(null);
        }}
        onPageChanged={(page) => {
          pageRef.current = page;
          setCurrentPage(page);
          setForcedPage(null);
        }}
        onError={(error) => {
          setLoading(false);
          setPdfReady(false);
          Alert.alert('PDF Error', String(error));
        }}
        style={styles.pdf}
      />

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textDim }]}>Rendering PDF...</Text>
        </View>
      )}

      <View
        style={[
          styles.bottomBar,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => jumpToPage(currentPage - 1)} disabled={currentPage <= 1}>
          <Ionicons
            name="chevron-back"
            size={28}
            color={currentPage <= 1 ? colors.textMuted : colors.accent}
          />
        </TouchableOpacity>

        <Text style={[styles.pageInfo, { color: colors.text }]}>
          Page {currentPage} / {totalPages || '-'}
        </Text>

        <TouchableOpacity
          onPress={() => jumpToPage(currentPage + 1)}
          disabled={totalPages > 0 ? currentPage >= totalPages : false}
        >
          <Ionicons
            name="chevron-forward"
            size={28}
            color={totalPages > 0 && currentPage >= totalPages ? colors.textMuted : colors.accent}
          />
        </TouchableOpacity>
      </View>

      <Modal visible={showNotes} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Notes & Marks</Text>
              <TouchableOpacity onPress={() => setShowNotes(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={[styles.notesList, { backgroundColor: colors.background }]}>
              {bookmarks.slice(0, 5).map((b) => (
                <Text key={b.id} style={[styles.itemText, { color: colors.text }]}>
                  Bookmark: page {b.page}
                </Text>
              ))}
              {highlights.slice(0, 10).map((h) => (
                <Text key={h.id} style={[styles.itemText, { color: colors.text }]}>
                  Highlight: page {h.page}
                </Text>
              ))}
              {notes.slice(0, 20).map((n) => (
                <Text key={n.id} style={[styles.itemText, { color: colors.text }]}>
                  Note p.{n.page}: {n.content}
                </Text>
              ))}
            </ScrollView>

            <View
              style={[
                styles.noteInputWrap,
                {
                  borderTopColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <TextInput
                value={noteInput}
                onChangeText={setNoteInput}
                placeholder={`Add note on page ${currentPage}`}
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.textInput,
                  { color: colors.text, backgroundColor: colors.card },
                ]}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: colors.accent }]}
                onPress={addNote}
              >
                <Ionicons name="send" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pdf: { flex: 1, width: '100%' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: FONT_SIZES.md, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 10 },
  tools: { padding: 12, borderBottomWidth: 1 },
  toolLabel: { fontSize: FONT_SIZES.sm, marginBottom: 8 },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  zoomText: { fontSize: FONT_SIZES.md },
  loader: { position: 'absolute', top: '50%', left: 0, right: 0, alignItems: 'center' },
  loadingText: { fontSize: FONT_SIZES.md, marginTop: 12 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  pageInfo: { fontSize: FONT_SIZES.sm },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '60%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: '600' },
  notesList: { flex: 1, padding: 14 },
  itemText: { fontSize: FONT_SIZES.sm, marginBottom: 8 },
  noteInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderRadius: 8,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingTop: 10,
    fontSize: FONT_SIZES.sm,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
