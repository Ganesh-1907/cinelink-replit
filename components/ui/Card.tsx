import React from 'react';
import {View, StyleSheet, ViewStyle, StyleProp} from 'react-native';
import {Colors, Radius, Spacing, Shadows} from '../../src/theme';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'flat';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
  padding?: number | false;
}

export function Card({
  children,
  variant = 'default',
  style,
  padding,
}: CardProps) {
  const resolvedPadding = padding === false ? 0 : padding ?? Spacing.lg;
  return (
    <View
      style={[styles.base, styles[variant], {padding: resolvedPadding}, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  default: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  elevated: {
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.md,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  flat: {
    backgroundColor: Colors.surface,
    borderWidth: 0,
  },
});

export default Card;
