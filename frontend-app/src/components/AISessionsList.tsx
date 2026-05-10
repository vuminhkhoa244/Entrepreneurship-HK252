import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AISession } from '../types';
import { AISessionStorage } from '../utils/aiSessionStorage';
import { FONT_SIZES } from '../constants/theme';

interface AISessionsListProps {
  visible: boolean;
  bookId: string;
  onClose: () => void;
  onSessionSelect: (session: AISession) => void;
  colors: Record<string, string>;
}

export function AISessionsList({
  visible,
  bookId,
  onClose,
  onSessionSelect,
  colors,
}: AISessionsListProps) {
  const [sessions, setSessions] = useState<AISession[]>([]);
  const [loading, setLoading] = useState(false);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const bookSessions = await AISessionStorage.getSessionsByBook(bookId);
      setSessions(bookSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
      Alert.alert('Error', 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  React.useEffect(() => {
    if (visible) {
      loadSessions();
    }
  }, [visible, loadSessions]);

  const handleDeleteSession = async (sessionId: string) => {
    Alert.alert('Delete Session', 'Are you sure you want to delete this session?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await AISessionStorage.deleteSession(sessionId);
            setSessions(sessions.filter((s) => s.id !== sessionId));
          } catch {
            Alert.alert('Error', 'Failed to delete session');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const handleRenameSession = async (sessionId: string) => {
    if (!newTitle.trim()) {
      Alert.alert('Error', 'Session title cannot be empty');
      return;
    }

    try {
      await AISessionStorage.updateSession(sessionId, { title: newTitle.trim() });
      setSessions(sessions.map((s) => (s.id === sessionId ? { ...s, title: newTitle.trim() } : s)));
      setRenamingSessionId(null);
      setNewTitle('');
    } catch {
      Alert.alert('Error', 'Failed to rename session');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderSessionItem = ({ item }: { item: AISession }) => {
    const isRenaming = renamingSessionId === item.id;

    return (
      <View
        style={[styles.sessionItem, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <TouchableOpacity
          style={styles.sessionContent}
          onPress={() => {
            onSessionSelect(item);
            onClose();
          }}
        >
          <View style={styles.sessionInfo}>
            {isRenaming ? (
              <TextInput
                style={[styles.renameInput, { color: colors.text, borderColor: colors.border }]}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Session title..."
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
            ) : (
              <>
                <Text style={[styles.sessionTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.sessionDate, { color: colors.textMuted }]}>
                  {formatDate(item.updatedAt)} • {item.messages.length} messages
                </Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.sessionActions}>
          {isRenaming ? (
            <>
              <TouchableOpacity
                onPress={() => handleRenameSession(item.id)}
                style={[styles.actionBtn, { backgroundColor: colors.accent }]}
              >
                <Ionicons name="checkmark" size={18} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setRenamingSessionId(null);
                  setNewTitle('');
                }}
                style={[styles.actionBtn, { backgroundColor: colors.textMuted }]}
              >
                <Ionicons name="close" size={18} color={colors.white} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => {
                  setRenamingSessionId(item.id);
                  setNewTitle(item.title);
                }}
                style={[styles.actionBtn, { backgroundColor: colors.accent }]}
              >
                <Ionicons name="pencil" size={18} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteSession(item.id)}
                style={[styles.actionBtn, { backgroundColor: '#FF6B6B' }]}
              >
                <Ionicons name="trash" size={18} color={colors.white} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: colors.primary, borderBottomColor: colors.border },
          ]}
        >
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Chat Sessions</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Sessions List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No chat sessions yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textDim }]}>
              Start a new chat to create your first session
            </Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            renderItem={renderSessionItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  sessionContent: {
    flex: 1,
  },
  sessionInfo: {
    gap: 4,
  },
  sessionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  sessionDate: {
    fontSize: FONT_SIZES.xs,
  },
  renameInput: {
    fontSize: FONT_SIZES.md,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    marginTop: 8,
    textAlign: 'center',
  },
});
