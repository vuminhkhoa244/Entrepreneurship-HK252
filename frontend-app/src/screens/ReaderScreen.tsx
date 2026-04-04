import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import RenderHTML from 'react-native-render-html';
import {ReaderAPI, BookmarkAPI} from '../services/api';
import type {RootStackParamList} from '../App';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {COLORS, FONT_SIZES} from '../constants/theme';

const {width} = Dimensions.get('window');

export default function ReaderScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {bookId, fileType} = route.params as {bookId: string; fileType: 'epub' | 'pdf'};

  const [chapter, setChapter] = useState<any | null>(null);
  const [totalChapters, setTotalChapters] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(FONT_SIZES.md);
  const [showMenu, setShowMenu] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  // fix #6: real notes/highlights integration
  const [notes, setNotes] = useState<{id: string; content: string}[]>([]);
  const [noteInput, setNoteInput] = useState('');

  const scrollRef = useRef<ScrollView>(null);

  const loadChapter = useCallback(async (index: number) => {
    setLoading(true);
    try {
      const {data} = await ReaderAPI.chapter(bookId, index);
      setChapter(data);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to load chapter');
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  // Load contents and bookmarks
  useEffect(() => {
    loadChapter(0);
    ReaderAPI.contents(bookId)
      .then(({data}: any) => {
        if ('totalChapters' in data) setTotalChapters(data.totalChapters);
        if ('chapters' in data) setTotalChapters(data.chapters.length);
      })
      .catch(() => {});

    BookmarkAPI.list(bookId)
      .then(({data}) => {
        setBookmarked(data.length > 0);
      })
      .catch(() => {});
  }, [bookId, loadChapter]);

  const goToChapter = (index: number) => {
    if (index >= 0 && index < totalChapters) {
      loadChapter(index);
      scrollRef.current?.scrollTo({y: 0, animated: true});
    }
  };

  // fix #3: pass totalChapters for EPUB progress tracking (not totalPages)
  const updateProgress = async (chapterIndex: number) => {
    try {
      await ReaderAPI.setProgress(bookId, chapterIndex, chapterIndex, undefined, totalChapters);
    } catch {}
  };

  // fix #5: real bookmark toggle
  const toggleBookmark = async () => {
    try {
      if (bookmarked) {
        const {data} = await BookmarkAPI.list(bookId);
        if (data.length > 0) {
          await BookmarkAPI.delete(bookId, data[0].id);
        }
        setBookmarked(false);
      } else {
        await BookmarkAPI.create(bookId, chapter?.chapterIndex ?? 0, 0);
        setBookmarked(true);
      }
    } catch {
      Alert.alert('Error', 'Failed to manage bookmark');
    }
  };

  // fix #6: add note via API
  const addNote = async () => {
    if (!noteInput.trim()) return;
    try {
      const {data} = await import('../services/api').then(m =>
        m.NoteAPI.create(bookId, {content: noteInput}),
      );
      setNotes(prev => [...prev, data]);
      setNoteInput('');
    } catch {
      Alert.alert('Error', 'Failed to save note');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!chapter) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No content available</Text>
      </View>
    );
  }

  const currentChapterIndex = chapter.chapterIndex || 0;

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>

        <Text style={styles.title} numberOfLines={1}>
          {chapter.title}
        </Text>

        <View style={styles.topActions}>
          <TouchableOpacity onPress={toggleBookmark}>
            <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={22} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowNotes(true)}>
            <Ionicons name="create-outline" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
            <Ionicons name="ellipsis-vertical" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Font size controls */}
      {showMenu && (
        <View style={styles.menu}>
          <Text style={styles.menuLabel}>Font Size</Text>
          <View style={styles.fontControls}>
            <TouchableOpacity onPress={() => setFontSize(Math.max(FONT_SIZES.xs, fontSize - 2))}>
              <Ionicons name="remove" size={24} color={COLORS.accent} />
            </TouchableOpacity>
            <Text style={styles.fontSizeText}>{fontSize}px</Text>
            <TouchableOpacity onPress={() => setFontSize(Math.min(FONT_SIZES.xxl, fontSize + 2))}>
              <Ionicons name="add" size={24} color={COLORS.accent} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.closeMenu} onPress={() => setShowMenu(false)}>
            <Text style={styles.closeMenuText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Book content */}
      <ScrollView
        ref={scrollRef}
        style={styles.content}
        contentContainerStyle={styles.contentInner}>
        <RenderHTML
          contentWidth={width - 32}
          source={{html: chapter.content}}
          tagsStyles={{
            p: {color: COLORS.text, fontSize, lineHeight: fontSize * 1.6, marginBottom: 12},
            h1: {color: COLORS.white, fontSize: fontSize * 1.5, fontWeight: 'bold', marginBottom: 8},
            h2: {color: COLORS.white, fontSize: fontSize * 1.3, fontWeight: 'bold', marginBottom: 8},
            h3: {color: COLORS.white, fontSize: fontSize * 1.2, fontWeight: 'bold', marginBottom: 8},
            body: {color: COLORS.text, fontSize, lineHeight: fontSize * 1.6},
          }}
          baseStyle={{color: COLORS.text}}
        />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={() => goToChapter(currentChapterIndex - 1)}
          disabled={currentChapterIndex === 0}>
          <Ionicons
            name="chevron-back"
            size={28}
            color={currentChapterIndex === 0 ? COLORS.textMuted : COLORS.accent}
          />
        </TouchableOpacity>

        <Text style={styles.chapterInfo}>
          Chapter {currentChapterIndex + 1} / {totalChapters}
        </Text>

        <TouchableOpacity
          onPress={() => {
            goToChapter(currentChapterIndex + 1);
            updateProgress(currentChapterIndex + 1);
          }}
          disabled={currentChapterIndex >= totalChapters - 1}>
          <Ionicons
            name="chevron-forward"
            size={28}
            color={currentChapterIndex >= totalChapters - 1 ? COLORS.textMuted : COLORS.accent}
          />
        </TouchableOpacity>
      </View>

      {/* Notes Modal — real implementation (fix #6) */}
      <Modal visible={showNotes} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notes</Text>
              <TouchableOpacity onPress={() => setShowNotes(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.notesList}>
              {notes.length === 0 ? (
                <Text style={styles.notesEmpty}>No notes yet. Add one below.</Text>
              ) : (
                notes.map(n => (
                  <View key={n.id} style={styles.noteItem}>
                    <Text style={styles.noteText}>{n.content}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.noteInput}>
              <TextInput
                value={noteInput}
                onChangeText={setNoteInput}
                placeholder="Add a note..."
                placeholderTextColor={COLORS.textMuted}
                style={styles.textInput}
                multiline
              />
              <TouchableOpacity style={styles.sendBtn} onPress={addNote}>
                <Ionicons name="send" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background},
  errorText: {color: COLORS.textDim, fontSize: FONT_SIZES.lg},
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.primary, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: {color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: '600', flex: 1, marginHorizontal: 12},
  topActions: {flexDirection: 'row', gap: 12},
  menu: {backgroundColor: COLORS.card, padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border},
  menuLabel: {color: COLORS.textDim, fontSize: FONT_SIZES.sm, marginBottom: 8},
  fontControls: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 8},
  fontSizeText: {color: COLORS.white, fontSize: FONT_SIZES.lg},
  closeMenu: {alignItems: 'center', paddingVertical: 8},
  closeMenuText: {color: COLORS.accent, fontSize: FONT_SIZES.md},
  content: {flex: 1},
  contentInner: {padding: 16},
  bottomBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 16,
    backgroundColor: COLORS.primary, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  chapterInfo: {color: COLORS.text, fontSize: FONT_SIZES.sm},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'},
  modalContent: {backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '60%'},
  modalHeader: {flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border},
  modalTitle: {color: COLORS.white, fontSize: FONT_SIZES.lg, fontWeight: '600'},
  notesList: {flex: 1, padding: 16},
  notesEmpty: {color: COLORS.textDim, fontSize: FONT_SIZES.md, textAlign: 'center', marginTop: 32},
  noteItem: {backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: COLORS.accent},
  noteText: {color: COLORS.text, fontSize: FONT_SIZES.sm},
  noteInput: {flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 8},
  textInput: {flex: 1, color: COLORS.text, fontSize: FONT_SIZES.sm, minHeight: 40, maxHeight: 100, paddingHorizontal: 12, paddingTop: 10},
  sendBtn: {backgroundColor: COLORS.accent, borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center'},
});
