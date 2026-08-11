import React from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable,
} from 'react-native';
import {Colors, Spacing, Radius} from '../../src/theme';
import {useTheme} from '../../src/context/ThemeContext';

type PopupVariant = 'confirm' | 'ban' | 'warning' | 'success' | 'info' | 'input';

interface PopupModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  variant?: PopupVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmDisabled?: boolean;
  confirmVariant?: 'danger' | 'primary' | 'success';
  children?: React.ReactNode;
}

const variantConfig: Record<PopupVariant, {icon: string; color: string; faintBg: string}> = {
  confirm: {icon: '✓', color: Colors.primary, faintBg: Colors.primaryFaint},
  ban: {icon: '🚫', color: Colors.error, faintBg: Colors.errorFaint},
  warning: {icon: '⚠', color: Colors.warning, faintBg: Colors.warningFaint},
  success: {icon: '✅', color: Colors.success, faintBg: Colors.successFaint},
  info: {icon: 'ℹ', color: Colors.info, faintBg: Colors.infoFaint},
  input: {icon: '✏', color: Colors.primary, faintBg: Colors.primaryFaint},
};

export function PopupModal({
  visible, onClose, title, message, variant = 'confirm',
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  onConfirm, onCancel, confirmDisabled = false,
  confirmVariant = 'primary', children,
}: PopupModalProps) {
  const {isDark} = useTheme();
  const cfg = variantConfig[variant];

  const confirmBg = confirmVariant === 'danger' ? Colors.error :
    confirmVariant === 'success' ? Colors.success : Colors.primary;

  const confirmTextColor = isDark ? '#09090B' : '#FFFFFF';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.popup, {backgroundColor: Colors.card, borderColor: 'transparent'}]} onPress={() => {}}>
          {/* Decorative top area with icon */}
          <View style={[styles.decoTop, {backgroundColor: cfg.faintBg}]}>
            <View style={[styles.iconCircle, {backgroundColor: cfg.color}]}>
              <Text style={styles.iconText}>{cfg.icon}</Text>
            </View>
          </View>

          {/* Content area */}
          <View style={styles.contentArea}>
            <Text style={[styles.title, {color: Colors.textPrimary}]}>{title}</Text>

            {message ? (
              <Text style={[styles.message, {color: Colors.textSecondary}]}>{message}</Text>
            ) : null}

            {children ? <View style={styles.childrenWrap}>{children}</View> : null}

            {/* Buttons */}
            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, styles.cancelBtn, {borderColor: Colors.border}]}
                onPress={onCancel || onClose}>
                <Text style={[styles.cancelText, {color: Colors.textSecondary}]}>{cancelLabel}</Text>
              </Pressable>
              {onConfirm && (
                <Pressable
                  style={[styles.btn, styles.confirmBtn, {backgroundColor: confirmBg, opacity: confirmDisabled ? 0.4 : 1}]}
                  onPress={onConfirm}
                  disabled={confirmDisabled}>
                  <Text style={[styles.confirmText, {color: confirmTextColor}]}>{confirmLabel}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  popup: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    overflow: 'hidden',
  },
  decoTop: {
    paddingTop: Spacing.xxl + 4,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  iconText: {
    fontSize: 28,
  },
  contentArea: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.xs,
    alignItems: 'stretch',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.xs,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  childrenWrap: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelBtn: {
    borderWidth: 1.5,
  },
  cancelText: {fontSize: 14, fontWeight: '700'},
  confirmBtn: {borderColor: 'transparent'},
  confirmText: {fontSize: 14, fontWeight: '700'},
});
