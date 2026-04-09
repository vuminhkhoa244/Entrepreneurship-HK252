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
import { FONT_SIZES } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

type TabType = 'notes' | 'highlights';

export default function NotesScreen() {
  const route = useRoute<any>();
  const {bookId} = route.params as {bookId: string};

  const [activeTab, setActiveTab] = useState<TabType>('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();

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
        <View style={[styles.highlightBar, {borderLeftColor: item.color || colors.highlight}]}>
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
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notes' && styles.tabActive]}
          onPress={() => setActiveTab('notes')}>
          <Ionicons name="create-outline" size={20} color={activeTab === 'notes' ? colors.accent : colors.textDim} />
          <Text style={[styles.tabText, activeTab === 'notes' && styles.tabTextActive]}>Notes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'highlights' && styles.tabActive]}
          onPress={() => setActiveTab('highlights')}>
          <Ionicons name="brush-outline" size={20} color={activeTab === 'highlights' ? colors.accent : colors.textDim} />
          <Text style={[styles.tabText, activeTab === 'highlights' && styles.tabTextActive]}>Highlights</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'notes' ? (
        notes.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="create-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No notes yet</Text>
          </View>
        ) : (
          <FlatList data={notes} keyExtractor={i => i.id} renderItem={renderNote} contentContainerStyle={styles.list} />
        )
      ) : highlights.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="brush-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No highlights yet</Text>
        </View>
      ) : (
        <FlatList data={highlights} keyExtractor={i => i.id} renderItem={renderHighlight} contentContainerStyle={styles.list} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  center: {flex: 1},
  tabBar: {flexDirection: 'row', borderBottomWidth: 1},
  tab: {flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14},
  tabActive: {borderBottomWidth: 2},
  tabText: { fontSize: FONT_SIZES.md},
  tabTextActive: { fontWeight: '600'},
  list: {padding: 12},
  card: { borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1},
  highlightBar: {borderLeftWidth: 3, paddingLeft: 12, marginBottom: 8},
  highlightText: { fontSize: FONT_SIZES.sm, fontStyle: 'italic'},
  noteContent: { fontSize: FONT_SIZES.md, marginTop: 4},
  noteDate: { fontSize: FONT_SIZES.xs, marginTop: 8},
  emptyText: { fontSize: FONT_SIZES.lg, marginTop: 12},
});
