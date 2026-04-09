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
    <View style={[styles.container, {backgroundColor: colors.background}, style]}>
      <Ionicons name={icon} size={64} color={colors.textMuted} />
      <Text style={[styles.title, {color: colors.text}]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, {color: colors.textDim}]}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <View style={[styles.actionBtn, {backgroundColor: colors.accent}]}>
          <Text style={[styles.actionText, {color: colors.white}]}>{actionLabel}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
  title: { fontSize: FONT_SIZES.lg, marginTop: 16, textAlign: 'center' },
  subtitle: { fontSize: FONT_SIZES.md, marginTop: 8, textAlign: 'center' },
  actionBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  actionText: { fontSize: FONT_SIZES.md, fontWeight: '600'},
});
