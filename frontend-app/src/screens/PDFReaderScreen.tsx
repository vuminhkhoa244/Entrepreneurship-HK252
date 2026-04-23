import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import Pdf from "react-native-pdf";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../types/navigation";
import { Ionicons } from "@expo/vector-icons";
import { ReaderAPI, LibraryAPI, AIAPI } from "../services/api";
import { BASE_URL } from "../constants/config";
import { getToken } from "../services/auth";
import { FONT_SIZES } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { RouteProp } from "@react-navigation/native";

export default function PDFReaderScreen() {
  type PDFReaderRouteProp = RouteProp<RootStackParamList, "PDFReader">;
  const route = useRoute<PDFReaderRouteProp>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { bookId } = route.params;

  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pagesRead, setPagesRead] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const [scale, setScale] = useState(1.0);
  const [showTools, setShowTools] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const [forcedPage, setForcedPage] = useState<number | null>(null);
  const [showAIOptions, setShowAIOptions] = useState(false);

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
      const [token, bookRes] =
        await Promise.all([
          getToken(),
          LibraryAPI.get(bookId),
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
    } catch {
      Alert.alert("Error", "Failed to load PDF reader data");
    }
  }, [bookId]);

  useEffect(() => {
    loadReaderData();
  }, [loadReaderData]);

  useEffect(() => {
    setPdfReady(false);
    setLoading(true);
    const timeout = setTimeout(() => {
      if (pdfUri && authToken) {
        setLoading(false);
        setPdfReady(true);
      }
    }, 5000);
    return () => clearTimeout(timeout);
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
        <Text style={[styles.loadingText, { color: colors.textDim }]}>
          Loading PDF...
        </Text>
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Reading PDF
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowAIOptions(true)}>
            <Ionicons name="sparkles-outline" size={22} color={colors.accent} />
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
              onPress={() =>
                setScale((s) => Math.min(3, +(s + 0.1).toFixed(1)))
              }
            >
              <Ionicons name="add" size={24} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Pdf
        trustAllCerts={false}
        source={source}
        page={forcedPage ?? undefined}
        scale={scale}
        minScale={0.8}
        maxScale={3.0}
        onLoadComplete={(pages, page) => {
          setTotalPages(pages);
          setPagesRead(pages);
          pageRef.current = Number(page);
          setCurrentPage(Number(page));
          setPdfReady(true);
          setLoading(false);
          setForcedPage(null);
        }}
        onPageChanged={(page, total) => {
          if (!pdfReady) {
            setPdfReady(true);
            setLoading(false);
          }
          if (total > 0) {
            setTotalPages(total);
          }
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
          <Text style={[styles.loadingText, { color: colors.textDim }]}>
            Rendering PDF...
          </Text>
        </View>
      )}

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
              <TouchableOpacity
                style={[
                  styles.optionItem,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => {
                  setShowAIOptions(false);
                  navigation.navigate("AI", {
                    bookId,
                    fileType: "pdf",
                  });
                }}
              >
                <View style={[styles.optionIcon, { backgroundColor: colors.accent + "20" }]}>
                  <Ionicons name="chatbubble-outline" size={24} color={colors.accent} />
                </View>
                <View style={styles.optionContent}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>
                    Ask AI Assistant
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.textDim }]}>
                    Ask questions about this PDF
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View
        style={[
          styles.bottomBar,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => jumpToPage(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color={currentPage <= 1 ? colors.textMuted : colors.accent}
          />
        </TouchableOpacity>

        <Text style={[styles.pageInfo, { color: colors.text }]}>
          Page {currentPage} / {totalPages || "-"}
        </Text>

        <TouchableOpacity
          onPress={() => jumpToPage(currentPage + 1)}
          disabled={totalPages > 0 ? currentPage >= totalPages : false}
        >
          <Ionicons
            name="chevron-forward"
            size={28}
            color={
              totalPages > 0 && currentPage >= totalPages
                ? colors.textMuted
                : colors.accent
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pdf: { flex: 1, width: "100%" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: FONT_SIZES.md, fontWeight: "600" },
  headerActions: { flexDirection: "row" },
  tools: { padding: 12, borderBottomWidth: 1 },
  toolLabel: { fontSize: FONT_SIZES.sm, marginBottom: 8 },
  zoomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  zoomText: { fontSize: FONT_SIZES.md },
  loader: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  loadingText: { fontSize: FONT_SIZES.md, marginTop: 12 },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  pageInfo: { fontSize: FONT_SIZES.sm },
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
});
