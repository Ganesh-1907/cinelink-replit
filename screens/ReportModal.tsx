import React, {useState} from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, Pressable, ScrollView,
} from 'react-native';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius, Shadows, HitSlop} from '../src/theme';
import {Button, Chip, PopupModal} from '../components/ui';
import {useApp} from '../src/context/AppContext';
import {useTheme} from '../src/context/ThemeContext';

const REPORT_REASONS = [
  {id: 'fake', label: 'Fake / Scam Audition', icon: '🚫'},
  {id: 'inappropriate', label: 'Inappropriate Content', icon: '⚠️'},
  {id: 'spam', label: 'Spam / Duplicate Post', icon: '📢'},
  {id: 'harassment', label: 'Harassment / Abuse', icon: '🛑'},
  {id: 'misleading', label: 'Misleading Information', icon: '❌'},
  {id: 'other', label: 'Other', icon: '📝'},
];

type ReportModalProps = {
  visible: boolean;
  onClose: () => void;
  contentId: string;
  contentType: 'audition' | 'film' | 'contest' | 'user';
  contentTitle: string;
};

export default function ReportModal({
  visible, onClose, contentId, contentType, contentTitle,
}: ReportModalProps) {
  const {isDark} = useTheme();
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState<{title: string; message: string; variant: 'success' | 'ban'} | null>(null);
  const {user: currentUser} = useApp();

  const submitReport = async () => {
    if (!selectedReason) {
      setResultModal({title: 'Select a reason', message: 'Please choose why you are reporting this.', variant: 'ban'});
      return;
    }
    if (!currentUser) {
      setResultModal({title: 'Error', message: 'You must be logged in to report.', variant: 'ban'});
      return;
    }

    setSubmitting(true);
    try {
      const reportData: any = {reason: selectedReason, message: details.trim()};
      if (contentType === 'audition') reportData.auditionId = contentId;
      else if (contentType === 'film') reportData.filmId = contentId;
      else if (contentType === 'contest') reportData.contestId = contentId;
      else reportData.reportedUserId = contentId;

      await api.post('/reports', reportData);
      setResultModal({title: '✅ Report Submitted', message: 'Thank you for reporting. Our team will review this within 24 hours.', variant: 'success'});
    } catch (e) {
      console.log(e);
      setResultModal({title: 'Error', message: 'Failed to submit report. Please try again.', variant: 'ban'});
    } finally {
      setSubmitting(false);
    }
  };

  const handleResultClose = () => {
    setResultModal(null);
    if (resultModal?.variant === 'success') {
      setSelectedReason('');
      setDetails('');
      onClose();
    }
  };

  return (
    <>
      <Modal visible={visible && !resultModal} transparent animationType="slide" onRequestClose={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.outer}>
          <Pressable style={styles.backdrop} onPress={onClose} />
          <View style={[styles.sheet, {backgroundColor: Colors.card}]}>
            <View style={styles.handle} />

            <View style={styles.header}>
              <Text style={[styles.headerTitle, {color: Colors.textPrimary}]}>⚠️ Report Content</Text>
              <TouchableOpacity onPress={onClose} hitSlop={HitSlop.md}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollInner} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.reportingLabel}>
                Reporting: <Text style={styles.reportingTitle}>{contentTitle}</Text>
              </Text>

              <Text style={[styles.sectionTitle, {color: Colors.textPrimary}]}>Why are you reporting this?</Text>

              <View style={styles.reasons}>
                {REPORT_REASONS.map(reason => (
                  <Chip key={reason.id} icon={reason.icon} label={reason.label}
                    selected={selectedReason === reason.id}
                    onPress={() => setSelectedReason(reason.id)}
                    variant={selectedReason === reason.id ? 'error' : ('neutral' as any)}
                    style={styles.reasonChip}
                    textStyle={selectedReason === reason.id ? {color: Colors.error} : undefined}
                  />
                ))}
              </View>

              <TextInput
                style={[styles.detailsInput, {color: Colors.textPrimary, backgroundColor: Colors.inputBg, borderColor: Colors.border}]}
                placeholder="Add more details (optional)..."
                placeholderTextColor={Colors.textTertiary}
                value={details}
                onChangeText={setDetails}
                multiline
                maxLength={300}
                textAlignVertical="top"
              />

              <Button label="⚠️ Submit Report" onPress={submitReport} variant="danger" size="lg" loading={submitting} fullWidth />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {resultModal && (
        <PopupModal
          visible={!!resultModal}
          onClose={handleResultClose}
          variant={resultModal.variant}
          title={resultModal.title}
          message={resultModal.message}
          confirmLabel="OK"
          cancelLabel=""
          onConfirm={handleResultClose}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    borderTopLeftRadius: Radius.bottomSheet,
    borderTopRightRadius: Radius.bottomSheet,
    maxHeight: '90%',
    ...Shadows.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {...Typography.h3},
  closeBtn: {color: Colors.textSecondary, fontSize: 22, padding: 4},
  scrollBody: {flexGrow: 0},
  scrollInner: {paddingHorizontal: Spacing.lg, paddingBottom: Spacing['4xl']},
  reportingLabel: {...Typography.bodySm, color: Colors.textSecondary, marginBottom: Spacing.sm},
  reportingTitle: {color: Colors.textPrimary, fontWeight: '600'},
  sectionTitle: {...Typography.h4, marginBottom: Spacing.sm},
  reasons: {gap: Spacing.sm, marginBottom: Spacing.md},
  reasonChip: {alignSelf: 'flex-start'},
  detailsInput: {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    color: Colors.textPrimary,
    ...Typography.body,
    minHeight: 80,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlignVertical: 'top',
    marginBottom: Spacing.md,
  },
});
