import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {Colors, Typography, Spacing, Radius, HitSlop} from '../../src/theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  /** Non-interactive chip (just a tag) */
  static?: boolean;
  variant?:
    | 'default'
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'neutral'
    | 'outline';
}

const VARIANT_COLORS = {
  default: {
    bg: Colors.primaryFaint,
    border: Colors.primaryMid,
    text: Colors.primary,
  },
  success: {
    bg: Colors.successFaint,
    border: Colors.successBorder,
    text: Colors.success,
  },
  warning: {
    bg: Colors.warningFaint,
    border: Colors.warningBorder,
    text: Colors.warning,
  },
  error: {
    bg: Colors.errorFaint,
    border: Colors.errorBorder,
    text: Colors.error,
  },
  info: {bg: Colors.infoFaint, border: Colors.infoBorder, text: Colors.info},
  neutral: {
    bg: Colors.cardElevated,
    border: Colors.border,
    text: Colors.textSecondary,
  },
  outline: {bg: 'transparent', border: Colors.primary, text: Colors.primary},
};

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  style,
  textStyle,
  disabled,
  static: isStatic,
  variant = 'default',
}: ChipProps) {
  const vc = VARIANT_COLORS[variant];

  const chipStyle = [
    styles.chip,
    selected
      ? {backgroundColor: vc.bg, borderColor: vc.border}
      : {backgroundColor: Colors.card, borderColor: Colors.border},
    disabled && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.label,
    selected ? {color: vc.text} : {color: Colors.textSecondary},
    textStyle,
  ];

  if (isStatic || !onPress) {
    return (
      <View style={chipStyle}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text style={labelStyle} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      hitSlop={HitSlop.sm}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityState={{selected, disabled}}
      accessibilityLabel={label}>
      <View style={chipStyle}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text style={labelStyle} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  icon: {fontSize: 13},
  label: {...Typography.btnSm},
  disabled: {opacity: 0.45},
});

export default Chip;
