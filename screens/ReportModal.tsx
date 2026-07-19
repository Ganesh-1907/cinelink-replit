import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import api from '../src/api/client';
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  Shadows,
  HitSlop,
} from '../src/theme';
import {Button, Chip} from '../components/ui';

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
  visible,
  onClose,
  contentId,
  contentType,
  contentTitle,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitReport = async () => {
    if (!selectedReason) {
      Alert.alert(
        'Select a reason',
        'Please choose why you are reporting this.',
      );
      return;
    }

    const currentUser = auth().currentUser;
    if (!currentUser) {
      return;
    }

    setSubmitting(true);

    try {
      const reportData: any = {
        reason: selectedReason,
        message: details.trim(),
      };
      // Map content type to backend field
      if (contentType === 'audition') reportData.auditionId = contentId;
      else if (contentType === 'film') reportData.filmId = contentId;
      else if (contentType === 'contest') reportData.contestId = contentId;
      else reportData.reportedUserId = contentId;

      await api.post('/reports', reportData);

      Alert.alert(
        '✅ Report Submitted',
        'Thank you for reporting. Our team will review this within 24 hours.',
        [{text: 'OK', onPress: onClose}],
      );
      resetForm();
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedReason('');
    setDetails('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.container, {backgroundColor: Colors.cardElevated}]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, {color: Colors.textPrimary}]}>🚩 Report Content</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={HitSlop.md}
              accessibilityLabel="Close">
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.reportingLabel}>
            Reporting: <Text style={styles.reportingTitle}>{contentTitle}</Text>
          </Text>

          <Text style={[styles.sectionTitle, {color: Colors.textPrimary}]}>Why are you reporting this?</Text>

          <View style={styles.reasons}>
            {REPORT_REASONS.map(reason => (
              <Chip
                key={reason.id}
                icon={reason.icon}
                label={reason.label}
                selected={selectedReason === reason.id}
                onPress={() => setSelectedReason(reason.id)}
                variant={
                  selectedReason === reason.id ? 'error' : ('neutral' as any)
                }
                style={styles.reasonChip}
                textStyle={
                  selectedReason === reason.id
                    ? {color: Colors.error}
                    : undefined
                }
              />
            ))}
          </View>

          <TextInput
            style={[
              styles.detailsInput,
              {
                color: Colors.textPrimary,
                backgroundColor: Colors.inputBg,
                borderColor: Colors.border,
              },
            ]}
            placeholder="Add more details (optional)..."
            placeholderTextColor={Colors.textTertiary}
            value={details}
            onChangeText={setDetails}
            multiline
            maxLength={300}
            textAlignVertical="top"
          />

          <Button
            label="🚩 Submit Report"
            onPress={submitReport}
            variant="danger"
            size="lg"
            loading={submitting}
            fullWidth
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.cardElevated,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing['4xl'],
    maxHeight: '85%',
    gap: Spacing.lg,
    ...Shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
  },
  closeBtn: {
    color: Colors.textSecondary,
    fontSize: 22,
    padding: 4,
  },
  reportingLabel: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
  },
  reportingTitle: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  sectionTitle: {
    ...Typography.h4,
  },
  reasons: {
    gap: Spacing.sm,
  },
  reasonChip: {
    alignSelf: 'flex-start',
  },
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
  },
});
