import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ViewStyle,
} from 'react-native';
import {Colors, Typography, Spacing, Radius} from '../../src/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  rightIcon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  required?: boolean;
}

export function Input({
  label,
  error,
  hint,
  containerStyle,
  rightIcon,
  leftIcon,
  required,
  style,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = (e: any) => {
    setFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
    onBlur?.(e);
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? Colors.error : Colors.border,
      error ? Colors.error : Colors.primary,
    ],
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, {color: Colors.textSecondary}]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      ) : null}

      <Animated.View style={[styles.inputWrapper, {borderColor, backgroundColor: Colors.inputBg}]}>
        {leftIcon ? (
          <View style={styles.leftIcon}>
            {typeof leftIcon === 'string' ? <Text style={{fontSize: 18}}>{leftIcon}</Text> : leftIcon}
          </View>
        ) : null}
        <TextInput
          style={[
            styles.input,
            {color: Colors.textPrimary},
            leftIcon ? styles.inputWithLeft : undefined,
            rightIcon ? styles.inputWithRight : undefined,
            style,
          ]}
          placeholderTextColor={Colors.textTertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessibilityLabel={label}
          {...rest}
        />
        {rightIcon ? (
          <View style={styles.rightIcon}>
            {typeof rightIcon === 'string' ? <Text style={{fontSize: 18}}>{rightIcon}</Text> : rightIcon}
          </View>
        ) : null}
      </Animated.View>

      {error ? (
        <Text style={[styles.error, {color: Colors.error}]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hint, {color: Colors.textTertiary}]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {gap: Spacing.xs},
  label: {...Typography.label, color: Colors.textSecondary},
  required: {color: Colors.error},

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    borderWidth: 1,
    minHeight: 48,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  inputWithLeft: {paddingLeft: 0},
  inputWithRight: {paddingRight: 0},
  leftIcon: {paddingLeft: Spacing.lg, paddingRight: Spacing.sm},
  rightIcon: {paddingRight: Spacing.lg, paddingLeft: Spacing.sm},

  error: {...Typography.caption, color: Colors.error},
  hint: {...Typography.caption, color: Colors.textTertiary},
});

export default Input;
