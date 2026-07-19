import React, {useRef} from 'react';
import {
  Animated,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  AccessibilityRole,
} from 'react-native';
import {Colors, Typography, Radius, Spacing, Shadows} from '../../src/theme';

type Variant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success';
type Size = 'lg' | 'md' | 'sm';

interface ButtonProps {
  onPress: () => void;
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  fullWidth?: boolean;
}

export function Button({
  onPress,
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  accessibilityLabel,
  fullWidth = false,
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 6,
    }).start();

  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 14,
      bounciness: 12,
    }).start();

  const containerStyle = [
    styles.base,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.label,
    styles[`label_${size}` as keyof typeof styles],
    styles[`label_${variant}` as keyof typeof styles],
    variant === 'primary' && {
      color: Colors.background === '#0A0A0A' ? '#0A0A0A' : '#1A1A1A',
    },
    textStyle,
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled || loading}
      activeOpacity={1}
      accessibilityRole={'button' as AccessibilityRole}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{disabled: disabled || loading, busy: loading}}
      hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
      <Animated.View style={[containerStyle, {transform: [{scale}]}]}>
        {loading ? (
          <ActivityIndicator
            color={
              variant === 'primary'
                ? Colors.textInverse
                : variant === 'danger' || variant === 'success'
                ? '#FFFFFF'
                : Colors.primary
            }
            size="small"
          />
        ) : (
          <Text style={labelStyle} numberOfLines={1}>
            {label}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fullWidth: {alignSelf: 'stretch'},
  disabled: {opacity: 0.45},

  // Variants
  primary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    ...Shadows.primary,
  },
  secondary: {
    backgroundColor: Colors.cardElevated,
    borderColor: Colors.borderLight,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  danger: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  success: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },

  // Sizes
  lg: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    minHeight: 52,
  },
  md: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xl,
    minHeight: 44,
  },
  sm: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    minHeight: 34,
  },

  // Labels
  label: {fontWeight: '600'},
  label_lg: {...Typography.btnLg},
  label_md: {...Typography.btn},
  label_sm: {...Typography.btnSm},

  label_primary: {color: Colors.textInverse},
  label_secondary: {color: Colors.textPrimary},
  label_outline: {color: Colors.primary},
  label_ghost: {color: Colors.primary},
  label_danger: {color: '#FFFFFF'},
  label_success: {color: '#FFFFFF'},
});

export default Button;
