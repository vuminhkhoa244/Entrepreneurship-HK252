import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { AIAPI, ReaderAPI } from "../services/api";
import type { RootStackParamList } from "../types/navigation";
import { FONT_SIZES } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type MessageRole = "user" | "assistant";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export default function AIScreen() {
  const route = useRoute<any>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { bookId, fileType, chapterIndex, page } = route.params as {
    bookId: string;
    fileType: "epub" | "pdf";
    chapterIndex?: number;
    page?: number;
  };

  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<string>("");
  const [loadingContext, setLoadingContext] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  // Load chapter context if chapterIndex provided
  useEffect(() => {
    const loadContext = async () => {
      if (chapterIndex !== undefined) {
        try {
          const { data } = await ReaderAPI.chapter(bookId, chapterIndex);
          setContext(data.content);
        } catch (e: any) {
          console.error("Failed to load chapter context:", e);
        } finally {
          setLoadingContext(false);
        }
      } else {
        setLoadingContext(false);
      }
    };
    loadContext();
  }, [bookId, chapterIndex]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const sendMessage = async (customMessage?: string) => {
    const textToSend = customMessage || inputText.trim();
    if (!textToSend || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setLoading(true);

    try {
      const { data } = await AIAPI.askQuestion(bookId, textToSend, context);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e: any) {
      Alert.alert(
        "Error",
        e.response?.data?.error || "Failed to get AI response",
      );
    } finally {
      setLoading(false);
    }
  };

  const summarizeChapter = async () => {
    if (chapterIndex === undefined) {
      Alert.alert("Info", "No chapter selected for summarization");
      return;
    }
    setInputText("");
    await sendMessage(
      `Please provide a comprehensive summary of chapter ${chapterIndex + 1}.`,
    );
  };

  const extractKeyIdeas = async () => {
    if (!context) {
      Alert.alert("Info", "No text context available");
      return;
    }
    setInputText("");
    setLoading(true);
    try {
      const { data } = await AIAPI.extractKeyIdeas(bookId, context);
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "**Key Ideas:**\n\n" + data.ideas.map((idea: string) => `• ${idea}`).join("\n"),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e: any) {
      Alert.alert("Error", "Failed to extract key ideas");
    } finally {
      setLoading(false);
    }
  };

  const generateBulletSummary = async () => {
    if (!context) {
      Alert.alert("Info", "No text context available");
      return;
    }
    setInputText("");
    setLoading(true);
    try {
      const { data } = await AIAPI.generateBulletSummary(bookId, context);
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: "**Bullet Summary:**\n\n" + data.bullets.map((bullet: string) => `• ${bullet}`).join("\n"),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e: any) {
      Alert.alert("Error", "Failed to generate bullet summary");
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { icon: "book-outline", label: "Summarize Chapter", onPress: summarizeChapter },
    { icon: "bulb-outline", label: "Key Ideas", onPress: extractKeyIdeas },
    { icon: "list-outline", label: "Bullet Points", onPress: generateBulletSummary },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>AI Assistant</Text>
        <View style={{ width: 24 }} />
       </View>

      {/* Quick Actions */}
      {chapterIndex !== undefined && (
        <View style={[styles.quickActions, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={action.onPress}
            >
              <Ionicons name={action.icon as any} size={20} color={colors.accent} />
              <Text style={[styles.quickActionText, { color: colors.text }]} numberOfLines={1}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Chat Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              AI Reading Assistant
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textDim }]}>
              Ask questions about the book, request summaries, or get explanations for difficult concepts.
            </Text>
          </View>
        )}

        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.role === "user"
                ? [styles.userBubble, { backgroundColor: colors.accent }]
                : [styles.assistantBubble, { backgroundColor: colors.surface, borderColor: colors.border }],
            ]}
          >
            <Text
              style={[
                styles.messageText,
                msg.role === "user" ? { color: colors.white } : { color: colors.text },
              ]}
            >
              {msg.content}
            </Text>
            <Text
              style={[
                styles.timestamp,
                msg.role === "user" ? { color: "rgba(255,255,255,0.7)" } : { color: colors.textMuted },
              ]}
            >
              {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        ))}

        {loading && (
          <View style={[styles.loadingBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textDim }]}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={[styles.inputArea, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask about this book..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: colors.accent }]}
          onPress={() => sendMessage()}
          disabled={!inputText.trim() || loading}
        >
          <Ionicons name="send" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* AI Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={[styles.disclaimerText, { color: colors.textDim }]}>
          AI can make mistakes. Consider verifying important information.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: FONT_SIZES.lg, fontWeight: "600" },
  quickActions: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickActionText: { fontSize: FONT_SIZES.xs, fontWeight: "500" },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 24 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: FONT_SIZES.xl, fontWeight: "600", marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: FONT_SIZES.md, textAlign: "center", lineHeight: 22 },
  messageBubble: {
    maxWidth: "85%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: FONT_SIZES.md, lineHeight: 22 },
  timestamp: { fontSize: FONT_SIZES.xs, marginTop: 4, textAlign: "right" },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    gap: 8,
  },
  loadingText: { fontSize: FONT_SIZES.sm },
   inputArea: {
     flexDirection: "row",
     alignItems: "flex-end",
     padding: 12,
     borderTopWidth: 1,
     gap: 8,
     paddingBottom: 8,
   },
   input: {
     flex: 1,
     fontSize: FONT_SIZES.md,
     borderRadius: 20,
     paddingHorizontal: 16,
     paddingVertical: 12,
     maxHeight: 160,
     borderWidth: 1,
   },
   sendBtn: {
     width: 44,
     height: 44,
     borderRadius: 22,
     justifyContent: "center",
     alignItems: "center",
   },
   disclaimer: {
     paddingHorizontal: 16,
     paddingVertical: 8,
     alignItems: "center",
   },
   disclaimerText: {
     fontSize: FONT_SIZES.xs,
     textAlign: "center",
   },
 });
