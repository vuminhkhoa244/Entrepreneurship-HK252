import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types/navigation";
import { Ionicons } from "@expo/vector-icons";
import { LibraryAPI } from "../services/api";
import type { Book } from "../types";


import { FONT_SIZES } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

export default function BookDetailScreen() {
  const route = useRoute<any>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { bookId } = route.params as { bookId: string };

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);

  // 3. Gọi hook để lấy bộ màu động
  const { colors } = useTheme();

  const fetchBook = useCallback(async () => {
    try {
      const { data } = await LibraryAPI.get(bookId);
      setBook(data);
    } catch {
      Alert.alert("Error", "Failed to load book");
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    fetchBook();
  }, [fetchBook]);

  const openReader = () => {
    if (!book) return;
    if (book.file_type === "pdf") {
      (navigation as any).navigate("PDFReader", { bookId: book.id });
    } else {
      (navigation as any).navigate("Reader", {
        bookId: book.id,
        fileType: book.file_type,
      });
    }
  };
  
  const openNotes = () => {
    (navigation as any).navigate("Notes", { bookId } as never);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!book) return null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.coverContainer}>
        <View style={[styles.cover, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="book" size={80} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{book.title}</Text>
        {book.author && <Text style={[styles.author, { color: colors.textDim }]}>by {book.author}</Text>}

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBg, { backgroundColor: colors.surface }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${book.progress || 0}%`, backgroundColor: colors.accent },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textDim }]}>
            {book.progress
              ? `${book.progress.toFixed(1)}% complete`
              : "Not started"}
          </Text>
        </View>

        {/* Details */}
        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Ionicons
              name="document-outline"
              size={20}
              color={colors.textDim}
            />
            <Text style={[styles.detailLabel, { color: colors.textDim }]}>
              {book.file_type.toUpperCase()}
            </Text>
          </View>
          
          {book.total_pages !== undefined && book.total_pages > 0 && (
            <View style={styles.detailItem}>
              <Ionicons
                name="layers-outline"
                size={20}
                color={colors.textDim}
              />
              <Text style={[styles.detailLabel, { color: colors.textDim }]}>{book.total_pages} pages</Text>
            </View>
          )}

          {book.total_chapters !== undefined && book.total_chapters > 0 && (
            <View style={styles.detailItem}>
              <Ionicons name="list-outline" size={20} color={colors.textDim} />
              <Text style={[styles.detailLabel, { color: colors.textDim }]}>
                {book.total_chapters} chapters
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.accent }]} onPress={openReader}>
            <Ionicons name="book-outline" size={24} color={colors.white} />
            <Text style={[styles.primaryBtnText, { color: colors.white }]}>
              {book.progress && book.progress > 0
                ? "Continue Reading"
                : "Start Reading"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={openNotes}>
            <Ionicons name="create-outline" size={24} color={colors.accent} />
            <Text style={[styles.secondaryBtnText, { color: colors.accent }]}>Notes & Highlights</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={() => {
              Alert.alert("Delete Book", "This cannot be undone.", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await LibraryAPI.delete(bookId);
                      navigation.goBack();
                    } catch {
                      Alert.alert("Error", "Failed to delete book");
                    }
                  },
                },
              ]);
            }}
          >
            <Ionicons name="trash-outline" size={24} color={colors.error} />
            <Text style={[styles.dangerText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  coverContainer: { padding: 24, alignItems: "center" },
  cover: {
    width: 160,
    height: 220,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "bold",
    textAlign: "center",
  },
  author: { fontSize: FONT_SIZES.md, marginTop: 8 },
  progressContainer: { width: "100%", marginVertical: 20 },
  progressBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: FONT_SIZES.sm,
    marginTop: 8,
    textAlign: "center",
  },
  details: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginVertical: 16,
  },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailLabel: { fontSize: FONT_SIZES.sm },
  actions: { width: "100%", marginTop: 16, gap: 12 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 16,
  },
  primaryBtnText: { fontSize: FONT_SIZES.md, fontWeight: "600" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  dangerText: { fontSize: FONT_SIZES.md },
});