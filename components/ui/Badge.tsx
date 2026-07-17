import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {Colors, Radius, Spacing} from '../../src/theme';

type BadgeVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral';

interface BadgeProps {
  count?: number;
  label?: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  /** Max value before showing + suffix (default 99) */
  max?: number;
  dot?: boolean;
}

const VARIANT_COLORS: Record<BadgeVariant, {bg: string; text: string}> = {
  primary: {bg: Colors.primary, text: Colors.textInverse},
  success: {bg: Colors.success, text: Colors.textInverse},
  warning: {bg: Colors.warning, text: Colors.textInverse},
  error: {bg: Colors.error, text: '#FFFFFF'},
  info: {bg: Colors.info, text: '#FFFFFF'},
  neutral: {bg: Colors.cardElevated, text: Colors.textSecondary},
};

export function Badge({
  count,
  label,
  variant = 'error',
  style,
  max = 99,
  dot = false,
}: BadgeProps) {
  if (dot) {
    return (
      <View
        style={[
          styles.dot,
          {backgroundColor: VARIANT_COLORS[variant].bg},
          style,
        ]}
      />
    );
  }

  const displayText =
    label ??
    (count !== undefined ? (count > max ? `${max}+` : String(count)) : '');

  if (!displayText) {
    return null;
  }

  return (
    <View
      style={[
        styles.badge,
        {backgroundColor: VARIANT_COLORS[variant].bg},
        style,
      ]}>
      <Text style={[styles.text, {color: VARIANT_COLORS[variant].text}]}>
        {displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default Badge;
