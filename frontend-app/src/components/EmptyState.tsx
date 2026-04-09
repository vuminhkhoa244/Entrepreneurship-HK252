import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import { FONT_SIZES } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";


interface EmptyStateProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export default function EmptyState({icon, title, subtitle, actionLabel, onAction, style}: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, style]}>
      <Ionicons name={icon} size={64} color={colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <View style={styles.actionBtn}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.background},
  title: { fontSize: FONT_SIZES.lg, marginTop: 16, textAlign: 'center', color: colors.text },
  subtitle: { fontSize: FONT_SIZES.md, marginTop: 8, textAlign: 'center', color: colors.textDim },
  actionBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  actionText: {color: colors.white, fontSize: FONT_SIZES.md, fontWeight: '600'},
});
