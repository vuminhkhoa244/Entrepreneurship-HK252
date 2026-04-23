import React, { useState, useEffect, useRef, useCallback } from "react";
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
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import RenderHTML from "react-native-render-html";
import { ReaderAPI, BookmarkAPI, AIAPI } from "../services/api";
import type { RootStackParamList } from "../types/navigation";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { FONT_SIZES } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

const { width } = Dimensions.get("window");

export default function ReaderScreen() {
  const route = useRoute<any>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { bookId, fileType } = route.params as {
    bookId: string;
    fileType: "epub" | "pdf";
  };

  const [chapter, setChapter] = useState<any | null>(null);
  const [totalChapters, setTotalChapters] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(FONT_SIZES.md);
  const [showMenu, setShowMenu] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const [notes, setNotes] = useState<{ id: string; content: string }[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [showAIOptions, setShowAIOptions] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const { colors } = useTheme();

  const loadChapter = useCallback(
    async (index: number) => {
      setLoading(true);
      try {
        const { data } = await ReaderAPI.chapter(bookId, index);
        setChapter(data);
      } catch (e: any) {
        Alert.alert(
          "Error",
          e.response?.data?.error || "Failed to load chapter",
        );
      } finally {
        setLoading(false);
      }
    },
    [bookId],
  );

  useEffect(() => {
    async function loadInitialData() {
      loadChapter(0);
      try {
        const { data } = await ReaderAPI.contents(bookId);
        if ("totalChapters" in data) setTotalChapters(data.totalChapters);
        if ("chapters" in data) setTotalChapters(data.chapters.length);
      } catch {
        /* */
      }
      try {
        const { data } = await BookmarkAPI.list(bookId);
        setBookmarked(data.length > 0);
      } catch {
        /* */
      }
    }
    loadInitialData();
  }, [bookId, loadChapter]);

  const updateProgress = useCallback(
    async (chapterIndex: number) => {
      try {
        await ReaderAPI.setProgress(
          bookId,
          chapterIndex,
          chapterIndex,
          undefined,
          totalChapters,
        );
      } catch {}
    },
    [bookId, totalChapters],
  );

  useEffect(() => {
    if (totalChapters > 0 && chapter?.chapterIndex != null) {
      updateProgress(chapter.chapterIndex);
    }
  }, [chapter?.chapterIndex, totalChapters, updateProgress]);

  const goToChapter = (index: number) => {
    if (index >= 0 && index < totalChapters) {
      loadChapter(index);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const toggleBookmark = async () => {
    try {
      if (bookmarked) {
        const { data } = await BookmarkAPI.list(bookId);
        if (data.length > 0) {
          await BookmarkAPI.delete(bookId, data[0].id);
        }
        setBookmarked(false);
      } else {
        await BookmarkAPI.create(bookId, chapter?.chapterIndex ?? 0, 0);
        setBookmarked(true);
      }
    } catch {
      Alert.alert("Error", "Failed to manage bookmark");
    }
  };

  const addNote = async () => {
    if (!noteInput.trim()) return;
    try {
      const { data } = await import("../services/api").then((m) =>
        m.NoteAPI.create(bookId, { content: noteInput }),
      );
      setNotes((prev) => [...prev, data]);
      setNoteInput("");
    } catch {
      Alert.alert("Error", "Failed to save note");
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!chapter) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          No content available
        </Text>
      </View>
    );
  }

  const currentChapterIndex = chapter.chapterIndex || 0;

  const tagsStyles = {
    p: {
      color: colors.text,
      fontSize,
      lineHeight: fontSize * 1.6,
      marginBottom: 12,
    },
    h1: {
      color: colors.text,
      fontSize: fontSize * 1.5,
      fontWeight: "bold" as const,
      marginBottom: 8,
    },
    h2: {
      color: colors.text,
      fontSize: fontSize * 1.3,
      fontWeight: "bold" as const,
      marginBottom: 8,
    },
    h3: {
      color: colors.text,
      fontSize: fontSize * 1.2,
      fontWeight: "bold" as const,
      marginBottom: 8,
    },
    body: { color: colors.text, fontSize, lineHeight: fontSize * 1.6 },
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar */}
      <View
        style={[
          styles.topBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {chapter.title}
        </Text>

        <View style={styles.topActions}>
          <TouchableOpacity onPress={toggleBookmark}>
            <Ionicons
              name={bookmarked ? "bookmark" : "bookmark-outline"}
              size={22}
              color={colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowNotes(true)}>
            <Ionicons name="create-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAIOptions(true)}>
            <Ionicons name="sparkles-outline" size={22} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Font size controls */}
      {showMenu && (
        <View
          style={[
            styles.menu,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.menuLabel, { color: colors.text }]}>
            Font Size
          </Text>
          <View style={styles.fontControls}>
            <TouchableOpacity
              onPress={() => setFontSize(Math.max(FONT_SIZES.xs, fontSize - 2))}
            >
              <Ionicons name="remove" size={24} color={colors.accent} />
            </TouchableOpacity>
            <Text style={[styles.fontSizeText, { color: colors.text }]}>
              {fontSize}px
            </Text>
            <TouchableOpacity
              onPress={() =>
                setFontSize(Math.min(FONT_SIZES.xxl, fontSize + 2))
              }
            >
              <Ionicons name="add" size={24} color={colors.accent} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.closeMenu}
            onPress={() => setShowMenu(false)}
          >
            <Text style={[styles.closeMenuText, { color: colors.accent }]}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Book content */}
      <ScrollView
        ref={scrollRef}
        style={[styles.content, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentInner}
      >
        <RenderHTML
          contentWidth={width - 32}
          source={{ html: chapter.content }}
          tagsStyles={tagsStyles}
          baseStyle={{ color: colors.text }}
        />
      </ScrollView>

      {/* Bottom Navigation */}
      <View
        style={[
          styles.bottomBar,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => goToChapter(currentChapterIndex - 1)}
          disabled={currentChapterIndex === 0}
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color={currentChapterIndex === 0 ? colors.textMuted : colors.accent}
          />
        </TouchableOpacity>

        <Text style={[styles.chapterInfo, { color: colors.text }]}>
          Chapter {currentChapterIndex + 1} / {totalChapters}
        </Text>

        <TouchableOpacity
          onPress={() => {
            goToChapter(currentChapterIndex + 1);
          }}
          disabled={currentChapterIndex >= totalChapters - 1}
        >
          <Ionicons
            name="chevron-forward"
            size={28}
            color={
              currentChapterIndex >= totalChapters - 1
                ? colors.textMuted
                : colors.accent
            }
          />
        </TouchableOpacity>
      </View>

      {/* Notes Modal */}
      <Modal visible={showNotes} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Notes
              </Text>
              <TouchableOpacity onPress={() => setShowNotes(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={[styles.notesList, { backgroundColor: colors.background }]}
            >
              {notes.length === 0 ? (
                <Text style={[styles.notesEmpty, { color: colors.textDim }]}>
                  No notes yet. Add one below.
                </Text>
              ) : (
                notes.map((n) => (
                  <View
                    key={n.id}
                    style={[
                      styles.noteItem,
                      {
                        borderLeftColor: colors.accent,
                        backgroundColor: colors.card,
                      },
                    ]}
                  >
                    <Text style={[styles.noteText, { color: colors.text }]}>
                      {n.content}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View
              style={[
                styles.noteInput,
                {
                  borderTopColor: colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <TextInput
                value={noteInput}
                onChangeText={setNoteInput}
                placeholder="Add a note..."
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

      {/* AI Options Modal */}
      <Modal visible={showAIOptions} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="sparkles" size={24} color={colors.accent} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  AI Assistant
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAIOptions(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={[styles.optionsList, { backgroundColor: colors.background }]}>
              <Text style={[styles.optionsHeader, { color: colors.textDim }]}>
                Chapter {currentChapterIndex + 1} Actions
              </Text>

              <TouchableOpacity
                style={[styles.optionItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  setShowAIOptions(false);
                  navigation.navigate("AI", {
                    bookId,
                    fileType,
                    chapterIndex: currentChapterIndex,
                  });
                }}
              >
                <View style={[styles.optionIcon, { backgroundColor: colors.accent + "20" }]}>
                  <Ionicons name="document-text-outline" size={24} color={colors.accent} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>
                    Summarize Chapter
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.textDim }]}>
                    Get AI-generated chapter summary
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  setShowAIOptions(false);
                  navigation.navigate("AI", {
                    bookId,
                    fileType,
                    chapterIndex: currentChapterIndex,
                  });
                }}
              >
                <View style={[styles.optionIcon, { backgroundColor: colors.success + "20" }]}>
                  <Ionicons name="bulb-outline" size={24} color={colors.success} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>
                    Key Ideas
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.textDim }]}>
                    Extract main concepts and ideas
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  setShowAIOptions(false);
                  navigation.navigate("AI", {
                    bookId,
                    fileType,
                    chapterIndex: currentChapterIndex,
                  });
                }}
              >
                <View style={[styles.optionIcon, { backgroundColor: colors.warning + "20" }]}>
                  <Ionicons name="list-outline" size={24} color={colors.warning} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>
                    Bullet Summary
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.textDim }]}>
                    Quick overview in bullet points
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionItem,
                  { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 },
                ]}
                onPress={() => {
                  setShowAIOptions(false);
                  navigation.navigate("AI", { bookId, fileType });
                }}
              >
                <View style={[styles.optionIcon, { backgroundColor: colors.info + "20" }]}>
                  <Ionicons name="chatbubble-outline" size={24} color="#3b82f6" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>
                    Ask AI Assistant
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.textDim }]}>
                    Open chat with full context
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: FONT_SIZES.lg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    flex: 1,
    marginHorizontal: 12,
  },
  topActions: { flexDirection: "row", gap: 12 },
  menu: { padding: 16, borderBottomWidth: 1 },
  menuLabel: { fontSize: FONT_SIZES.sm, marginBottom: 8 },
  fontControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginBottom: 8,
  },
  fontSizeText: { fontSize: FONT_SIZES.lg },
  closeMenu: { alignItems: "center", paddingVertical: 8 },
  closeMenuText: { fontSize: FONT_SIZES.md },
  content: { flex: 1 },
  contentInner: { padding: 16 },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  chapterInfo: { fontSize: FONT_SIZES.sm },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: "600" },
  optionsList: { flex: 1, padding: 16 },
  optionsHeader: { fontSize: FONT_SIZES.sm, marginBottom: 12, textAlign: "center", textTransform: "uppercase", letterSpacing: 1 },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  optionContent: { flex: 1 },
  optionTitle: { fontSize: FONT_SIZES.md, fontWeight: "600", marginBottom: 4 },
  optionDesc: { fontSize: FONT_SIZES.sm },
  notesList: { flex: 1, padding: 16 },
  notesEmpty: { fontSize: FONT_SIZES.md, textAlign: "center", marginTop: 32 },
  noteItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  noteText: { fontSize: FONT_SIZES.sm },
  noteInput: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderRadius: 8,
  },
  sendBtn: {
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
