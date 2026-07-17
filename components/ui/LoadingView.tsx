import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import {Colors, Typography, Spacing} from '../../src/theme';

interface LoadingViewProps {
  message?: string;
  style?: ViewStyle;
  /** If true, fills the full screen */
  fullScreen?: boolean;
  color?: string;
}

export function LoadingView({
  message,
  style,
  fullScreen = true,
  color = Colors.primary,
}: LoadingViewProps) {
  return (
    <View style={[fullScreen ? styles.full : styles.inline, style]}>
      <ActivityIndicator color={color} size="large" />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  full: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  inline: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    gap: Spacing.md,
  },
  message: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
  },
});

export default LoadingView;
