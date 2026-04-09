import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {MainTabParamList, RootStackParamList} from '../types/navigation';
import type {CompositeNavigationProp} from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {LibraryAPI} from '../services/api';
import type {Book} from '../types';
import {BookCard} from '../components/BookCard';
import UploadBookModal from '../components/UploadBookModal';
import { FONT_SIZES, DARK_COLORS } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

const defaultColors = DARK_COLORS;

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Library'>,
  any
>;

export default function LibraryScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const navigation = useNavigation<NavProp>();

  const { colors } = useTheme();

  const fetchLibrary = useCallback(async () => {
    try {
      const {data} = await LibraryAPI.list();
      setBooks(data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load library');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchLibrary();
    }, [fetchLibrary])
  );

  const openBook = (book: Book) => {
    (navigation as any).navigate('BookDetail' as never, {bookId: book.id} as never);
  };

  const renderGrid = ({item}: {item: Book}) => (
    <BookCard book={item} onPress={() => openBook(item)} />
  );

  const renderItem = ({item}: {item: Book}) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => openBook(item)}>
      <View style={[styles.cover, {backgroundColor: getColor(item.id)}]}>
        <Ionicons name="book" size={24} color="#fff" />
      </View>
      <View style={styles.info}>
        <Text style={styles.listTitle} numberOfLines={1}>{item.title}</Text>
        {item.author && <Text style={styles.listAuthor}>{item.author}</Text>}
        {item.progress != null && item.progress > 0 && (
          <View style={styles.progressRow}>
            <View style={styles.miniBar}>
              <View style={[styles.miniFill, {width: `${item.progress}%`}]} />
            </View>
            <Text style={styles.progressVal}>{Math.round(item.progress)}%</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={defaultColors.textMuted} />
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={defaultColors.accent} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>My Library</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            <Ionicons name={viewMode === 'grid' ? 'list-outline' : 'grid-outline'} size={24} color={defaultColors.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowUpload(true)} style={styles.uploadBtn}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {books.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="library-outline" size={64} color={defaultColors.textMuted} />
          <Text style={styles.emptyText}>Your library is empty</Text>
          <Text style={styles.emptySub}>Upload an EPUB or PDF to get started</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => setShowUpload(true)}>
            <Text style={styles.ctaText}>Upload Book</Text>
          </TouchableOpacity>
        </View>
      ) : viewMode === 'grid' ? (
        <FlatList
          data={books}
          keyExtractor={i => i.id}
          renderItem={renderGrid}
          numColumns={2}
          contentContainerStyle={styles.grid}
          refreshing={loading}
          onRefresh={fetchLibrary}
        />
      ) : (
        <FlatList
          data={books}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={fetchLibrary}
        />
      )}

      {/* Upload Modal */}
      <UploadBookModal
        visible={showUpload}
        onClose={() => setShowUpload(false)}
        onUploadSuccess={fetchLibrary}
      />
    </View>
  );
}

const COLOR_POOL = ['#e94560', '#4361ee', '#2ec4b6', '#ff9f1c', '#8338ec', '#3a86ff'];
const getColor = (id: string) => {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return COLOR_POOL[hash % COLOR_POOL.length];
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: defaultColors.background},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  heading: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', color: defaultColors.text },
  headerActions: {flexDirection: 'row', gap: 12, alignItems: 'center'},
  uploadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: defaultColors.accent,
  },
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  emptyText: { fontSize: FONT_SIZES.lg, marginTop: 16, color: defaultColors.text },
  emptySub: { fontSize: FONT_SIZES.md, marginTop: 4, marginBottom: 20, color: defaultColors.textDim },
  ctaBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12, backgroundColor: defaultColors.accent },
  ctaText: {color: defaultColors.white, fontSize: FONT_SIZES.md, fontWeight: '600'},
  grid: {padding: 12},
  list: {padding: 8},
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: defaultColors.border,
    backgroundColor: defaultColors.card,
  },
  cover: {
    width: 40,
    height: 56,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {flex: 1},
  listTitle: { fontSize: FONT_SIZES.md, fontWeight: '500', color: defaultColors.text },
  listAuthor: { fontSize: FONT_SIZES.sm, marginTop: 2, color: defaultColors.textDim },
  progressRow: {flexDirection: 'row', alignItems: 'center', marginTop: 6},
  miniBar: {flex: 1, height: 3, borderRadius: 2, overflow: 'hidden', marginRight: 6, backgroundColor: defaultColors.border},
  miniFill: {height: '100%', backgroundColor: defaultColors.accent },
  progressVal: { fontSize: FONT_SIZES.xs, minWidth: 30, color: defaultColors.textDim },
});
