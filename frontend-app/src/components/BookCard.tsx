import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Dimensions} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type {Book} from '../types';

import { FONT_SIZES } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

const COVER_COLORS = ['#e94560', '#4361ee', '#2ec4b6', '#ff9f1c', '#8338ec', '#3a86ff'];

const getCoverColor = (id: string) => {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return COVER_COLORS[hash % COVER_COLORS.length];
};

interface BookCardProps {
  book: Book;
  onPress: () => void;
}

export function BookCard({book, onPress}: BookCardProps) {
  const coverColor = getCoverColor(book.id);
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={[styles.cover, {backgroundColor: coverColor}]}>
        <Ionicons name="book" size={32} color="#fff" />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {book.title}
      </Text>
      {book.author && (
        <Text style={styles.author} numberOfLines={1}>
          {book.author}
        </Text>
      )}
      {book.progress != null && book.progress > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {width: `${book.progress}%`}]} />
          </View>
          <Text style={styles.progressText}>{Math.round(book.progress)}%</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function BookListItem({book, onPress}: {book: Book; onPress: () => void}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={styles.listItem} onPress={onPress}>
      <View style={[styles.cover, styles.coverMini, {backgroundColor: getCoverColor(book.id)}]}>
        <Ionicons name="book" size={24} color="#fff" />
      </View>
      <View style={styles.info}>
        <Text style={styles.listTitle} numberOfLines={1}>{book.title}</Text>
        {book.author && <Text style={styles.listAuthor}>{book.author}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const {width} = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const styles = StyleSheet.create({
  card: {width: CARD_WIDTH, marginBottom: 16, backgroundColor: colors.card, borderRadius: 8, padding: 8},
  cover: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  coverMini: {width: 40, height: 56, borderRadius: 4, marginRight: 12},
  title: { fontSize: FONT_SIZES.sm, fontWeight: '500', color: colors.text },
  author: { fontSize: FONT_SIZES.xs, marginTop: 2, color: colors.textDim },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 6,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  progressText: {
    fontSize: FONT_SIZES.xs,
    minWidth: 30,
    color: colors.textDim,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  info: {flex: 1},
  listTitle: { fontSize: FONT_SIZES.md, fontWeight: '500', color: colors.text },
  listAuthor: { fontSize: FONT_SIZES.sm, marginTop: 2, color: colors.textDim },
});
