import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import {Colors, Typography, Spacing, HitSlop} from '../../src/theme';

interface SectionTitleProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
  subtitle?: string;
}

export function SectionTitle({
  title,
  actionLabel,
  onAction,
  style,
  subtitle,
}: SectionTitleProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.titleGroup}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          hitSlop={HitSlop.md}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenH,
    paddingVertical: Spacing.sm,
  },
  titleGroup: {gap: 2},
  title: {
    ...Typography.h4,
    letterSpacing: -0.2,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  action: {
    ...Typography.btnSm,
    color: Colors.primary,
  },
});

export default SectionTitle;
