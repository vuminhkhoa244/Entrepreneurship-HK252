import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp, NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../App';
import { Ionicons } from '@expo/vector-icons';
import {LibraryAPI} from '../services/api';
import type {Book} from '../types';
import {COLORS, FONT_SIZES} from '../constants/theme';

export default function BookDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {bookId} = route.params as {bookId: string};

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBook = useCallback(async () => {
    try {
      const {data} = await LibraryAPI.get(bookId);
      setBook(data);
    } catch {
      Alert.alert('Error', 'Failed to load book');
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => { fetchBook(); }, [fetchBook]);

  const openReader = () => {
    if (!book) return;
    (navigation as any).navigate('Reader', { bookId: book.id, fileType: book.file_type } as never);
  };

  const openNotes = () => {
    (navigation as any).navigate('Notes', { bookId } as never);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.accent} /></View>;
  }

  if (!book) return null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.coverContainer}>
        <View style={styles.cover}>
          <Ionicons name="book" size={80} color={COLORS.accent} />
        </View>
        <Text style={styles.title}>{book.title}</Text>
        {book.author && <Text style={styles.author}>by {book.author}</Text>}

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, {width: `${book.progress || 0}%`}]} />
          </View>
          <Text style={styles.progressText}>
            {book.progress ? `${book.progress.toFixed(1)}% complete` : 'Not started'}
          </Text>
        </View>

        {/* Details */}
        <View style={styles.details}>
          <View style={styles.detailItem}>
            <Ionicons name="document-outline" size={20} color={COLORS.textDim} />
            <Text style={styles.detailLabel}>{book.file_type.toUpperCase()}</Text>
          </View>
          {book.total_pages > 0 && (
            <View style={styles.detailItem}>
              <Ionicons name="layers-outline" size={20} color={COLORS.textDim} />
              <Text style={styles.detailLabel}>{book.total_pages} pages</Text>
            </View>
          )}
          {book.total_chapters > 0 && (
            <View style={styles.detailItem}>
              <Ionicons name="list-outline" size={20} color={COLORS.textDim} />
              <Text style={styles.detailLabel}>{book.total_chapters} chapters</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={openReader}>
            <Ionicons name="book-outline" size={24} color="#fff" />
            <Text style={styles.primaryBtnText}>
              {book.progress && book.progress > 0 ? 'Continue Reading' : 'Start Reading'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={openNotes}>
            <Ionicons name="create-outline" size={24} color={COLORS.accent} />
            <Text style={styles.secondaryBtnText}>Notes & Highlights</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={() => {
              Alert.alert('Delete Book', 'This cannot be undone.', [
                {text: 'Cancel', style: 'cancel'},
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await LibraryAPI.delete(bookId);
                      navigation.goBack();
                    } catch {
                      Alert.alert('Error', 'Failed to delete book');
                    }
                  },
                },
              ]);
            }}>
            <Ionicons name="trash-outline" size={24} color={COLORS.error} />
            <Text style={styles.dangerText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background},
  coverContainer: {padding: 24, alignItems: 'center'},
  cover: {
    width: 160, height: 220, borderRadius: 12, backgroundColor: COLORS.card,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    borderWidth: 2, borderColor: COLORS.border,
  },
  title: {color: COLORS.white, fontSize: FONT_SIZES.xl, fontWeight: 'bold', textAlign: 'center'},
  author: {color: COLORS.textDim, fontSize: FONT_SIZES.md, marginTop: 8},
  progressContainer: {width: '100%', marginVertical: 20},
  progressBg: {height: 8, backgroundColor: COLORS.surface, borderRadius: 4, overflow: 'hidden'},
  progressFill: {height: '100%', backgroundColor: COLORS.accent, borderRadius: 4},
  progressText: {color: COLORS.textDim, fontSize: FONT_SIZES.sm, marginTop: 8, textAlign: 'center'},
  details: {width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 24, marginVertical: 16},
  detailItem: {flexDirection: 'row', alignItems: 'center', gap: 6},
  detailLabel: {color: COLORS.textDim, fontSize: FONT_SIZES.sm},
  actions: {width: '100%', marginTop: 16, gap: 12},
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 16,
  },
  primaryBtnText: {color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600'},
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.card, borderRadius: 12, paddingVertical: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  secondaryBtnText: {color: COLORS.accent, fontSize: FONT_SIZES.md, fontWeight: '600'},
  dangerBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12},
  dangerText: {color: COLORS.error, fontSize: FONT_SIZES.md},
});
