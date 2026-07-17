import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ViewStyle,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, HitSlop} from '../../src/theme';

interface HeaderProps {
  title?: string;
  /** NavigationProp — if provided, renders a back chevron */
  navigation?: any;
  /** Custom back handler override */
  onBack?: () => void;
  /** Right-side action(s) */
  right?: React.ReactNode;
  /** Left-side content override (replaces back button) */
  left?: React.ReactNode;
  /** Hide bottom border */
  noBorder?: boolean;
  style?: ViewStyle;
  transparent?: boolean;
  /** Optional subtitle shown under the title */
  subtitle?: string;
}

export function Header({
  title,
  navigation,
  onBack,
  right,
  left,
  noBorder = false,
  style,
  transparent = false,
  subtitle,
}: HeaderProps) {
  const insets = useSafeAreaInsets();

  const handleBack = onBack ?? (() => navigation?.goBack?.());
  const showBack = !!(onBack || navigation);

  return (
    <View
      style={[
        styles.container,
        {paddingTop: insets.top + Spacing.sm},
        !noBorder && styles.border,
        transparent && styles.transparent,
        style,
      ]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Left */}
      <View style={styles.side}>
        {left ??
          (showBack ? (
            <TouchableOpacity
              onPress={handleBack}
              hitSlop={HitSlop.lg}
              accessibilityLabel="Go back"
              accessibilityRole="button"
              style={styles.backBtn}>
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
          ) : null)}
      </View>

      {/* Title */}
      {title ? (
        <View style={styles.titleCol}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={{flex: 1}} />
      )}

      {/* Right */}
      <View style={[styles.side, styles.sideRight]}>{right ?? null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.screenH,
    minHeight: 56,
  },
  border: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  side: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  titleCol: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    ...Typography.h4,
  },
  subtitle: {
    textAlign: 'center',
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  backBtn: {
    padding: 4,
  },
  backIcon: {
    fontSize: 32,
    color: Colors.textPrimary,
    lineHeight: 34,
    fontWeight: '300',
  },
});

export default Header;
