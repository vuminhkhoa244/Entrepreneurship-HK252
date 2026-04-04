import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {useRoute} from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {HighlightAPI, NoteAPI} from '../services/api';
import type {Highlight, Note} from '../types';
import {COLORS, FONT_SIZES} from '../constants/theme';

type TabType = 'notes' | 'highlights';

export default function NotesScreen() {
  const route = useRoute<any>();
  const {bookId} = route.params as {bookId: string};

  const [activeTab, setActiveTab] = useState<TabType>('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [notesRes, highlightsRes] = await Promise.all([
        NoteAPI.list(bookId),
        HighlightAPI.list(bookId),
      ]);
      setNotes(notesRes.data);
      setHighlights(highlightsRes.data);
    } catch {
      Alert.alert('Error', 'Failed to load notes and highlights');
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderNote = ({item}: {item: Note}) => (
    <View style={styles.card}>
      {item.highlighted_text && (
        <View style={[styles.highlightBar, {borderLeftColor: item.color || COLORS.highlight}]}>
          <Text style={styles.highlightText}>"{item.highlighted_text}"</Text>
        </View>
      )}
      <Text style={styles.noteContent}>{item.content}</Text>
      <Text style={styles.noteDate}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </View>
  );

  const renderHighlight = ({item}: {item: Highlight}) => (
    <View style={styles.card}>
      <View style={[styles.highlightBar, {borderLeftColor: item.color}]}>
        <Text style={styles.highlightText}>"{item.text}"</Text>
        <Text style={styles.noteDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.accent} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notes' && styles.tabActive]}
          onPress={() => setActiveTab('notes')}>
          <Ionicons name="create-outline" size={20} color={activeTab === 'notes' ? COLORS.white : COLORS.textDim} />
          <Text style={[styles.tabText, activeTab === 'notes' && styles.tabTextActive]}>Notes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'highlights' && styles.tabActive]}
          onPress={() => setActiveTab('highlights')}>
          <Ionicons name="highlight-outline" size={20} color={activeTab === 'highlights' ? COLORS.white : COLORS.textDim} />
          <Text style={[styles.tabText, activeTab === 'highlights' && styles.tabTextActive]}>Highlights</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'notes' ? (
        notes.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="create-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No notes yet</Text>
          </View>
        ) : (
          <FlatList data={notes} keyExtractor={i => i.id} renderItem={renderNote} contentContainerStyle={styles.list} />
        )
      ) : highlights.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="highlight-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No highlights yet</Text>
        </View>
      ) : (
        <FlatList data={highlights} keyExtractor={i => i.id} renderItem={renderHighlight} contentContainerStyle={styles.list} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  tabBar: {flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border},
  tab: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14},
  tabActive: {borderBottomWidth: 2, borderBottomColor: COLORS.accent},
  tabText: {color: COLORS.textDim, fontSize: FONT_SIZES.md},
  tabTextActive: {color: COLORS.white, fontWeight: '600'},
  list: {padding: 12},
  card: {backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border},
  highlightBar: {borderLeftWidth: 3, paddingLeft: 12, marginBottom: 8},
  highlightText: {color: COLORS.text, fontSize: FONT_SIZES.sm, fontStyle: 'italic'},
  noteContent: {color: COLORS.text, fontSize: FONT_SIZES.md, marginTop: 4},
  noteDate: {color: COLORS.textMuted, fontSize: FONT_SIZES.xs, marginTop: 8},
  emptyText: {color: COLORS.textDim, fontSize: FONT_SIZES.lg, marginTop: 12},
});
