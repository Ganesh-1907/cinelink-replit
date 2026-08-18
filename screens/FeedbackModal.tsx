import React, {useState, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {Button, Chip} from '../components/ui';
import {useApp} from '../src/context/AppContext';
import {useTheme} from '../src/context/ThemeContext';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  screenName?: string;
}

const STARS = [1, 2, 3, 4, 5];
const SCREEN_WIDTH = Dimensions.get('window').width;

type FeedbackType = 'feedback' | 'bug' | 'feature';

export default function FeedbackModal({
  visible,
  onClose,
  screenName,
}: FeedbackModalProps) {
  const {isDark} = useTheme();
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('feedback');
  const {user} = useApp();

  useEffect(() => {
    if (!visible) {
      setRating(0);
      setMessage('');
      setSubmitted(false);
      setFeedbackType('feedback');
    }
  }, [visible]);

  const getDeviceInfo = () => ({
    platform: Platform.OS,
    osVersion: Platform.Version,
    screenWidth: SCREEN_WIDTH,
    timestamp: new Date().toISOString(),
  });

  const handleSubmit = async () => {
    if (feedbackType === 'feedback' && rating === 0) {
      Alert.alert('Please rate', 'Tap a star to give a rating first!');
      return;
    }
    if (!message.trim() && feedbackType !== 'feedback') {
      Alert.alert('Required', 'Please describe the issue or feature request.');
      return;
    }
    setSubmitting(true);
    try {
      const typeMap: Record<string, string> = {
        feedback: 'general',
        bug: 'bug',
        feature: 'feature',
      };

      await api.post('/feedback', {
        type: typeMap[feedbackType] || 'general',
        email: user?.email || '',
        message: message.trim(),
        rating: feedbackType === 'feedback' ? rating : undefined,
      });

      if (feedbackType === 'bug') {
        console.log(`Bug report from ${user?.email}: ${message}`);
      }

      setSubmitted(true);
    } catch (e) {
      Alert.alert('Error', 'Could not submit. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setMessage('');
    setSubmitted(false);
    setFeedbackType('feedback');
    onClose();
  };

  const typeLabels: Record<
    FeedbackType,
    {label: string; icon: string; color: string}
  > = {
    feedback: {label: 'Feedback', icon: '💬', color: Colors.primary},
    bug: {label: 'Bug Report', icon: '🐛', color: Colors.primary},
    feature: {label: 'Feature Request', icon: '💡', color: Colors.primary},
  };

  const thanksEmoji =
    feedbackType === 'bug' ? '🛠️' : feedbackType === 'feature' ? '🚀' : '❤️';
  const thanksTitle =
    feedbackType === 'bug'
      ? 'Bug Reported!'
      : feedbackType === 'feature'
      ? 'Great Idea!'
      : 'Thank You!';
  const thanksText =
    feedbackType === 'bug'
      ? "We'll investigate and fix this issue. Your app stability helps everyone!"
      : feedbackType === 'feature'
      ? 'We review every suggestion and prioritize based on community demand.'
      : 'Your feedback helps us make CineLink better for everyone!';

  if (submitted) {
    return (
      <Modal visible={visible} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={[styles.card, {backgroundColor: Colors.card}]}>
            <Text style={styles.thanksEmoji}>{thanksEmoji}</Text>
            <Text style={[styles.thanksTitle, {color: Colors.textPrimary}]}>{thanksTitle}</Text>
            <Text style={[styles.thanksText, {color: Colors.textSecondary}]}>{thanksText}</Text>
            <Button
              label="Close"
              onPress={handleClose}
              variant="primary"
              size="lg"
              fullWidth
            />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.card, {backgroundColor: Colors.card}]}>
          <Text style={[styles.title, {color: Colors.textPrimary}]}>Help us improve CineLink</Text>

          <View style={styles.typeRow}>
            {(Object.keys(typeLabels) as FeedbackType[]).map(key => {
              const val = typeLabels[key];
              const active = feedbackType === key;
              return (
                <Chip
                  key={key}
                  icon={val.icon}
                  label={val.label}
                  selected={active}
                  onPress={() => setFeedbackType(key)}
                  variant={active ? 'default' : 'neutral'}
                />
              );
            })}
          </View>

          <ScrollView
            style={styles.scrollArea}
            showsVerticalScrollIndicator={false}>
            {feedbackType === 'feedback' && (
              <View style={{gap: Spacing.sm}}>
                <Text style={[styles.sectionTitle, {color: Colors.textPrimary}]}>Rate your experience</Text>
                <View style={styles.starsRow}>
                  {STARS.map(s => (
                    <TouchableOpacity key={s} onPress={() => setRating(s)}>
                      <Text
                        style={[styles.star, s <= rating && styles.starActive]}>
                        ★
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {rating > 0 && (
                  <Text style={styles.ratingText}>
                    {rating <= 2
                      ? "We're sorry! Tell us how to improve."
                      : rating === 3
                      ? 'Thanks! Any suggestions?'
                      : 'Great! What do you love?'}
                  </Text>
                )}
              </View>
            )}

            {feedbackType === 'bug' && (
              <View style={{gap: Spacing.xs}}>
                <Text style={[styles.sectionTitle, {color: Colors.textPrimary}]}>What went wrong?</Text>
                <Text style={styles.hint}>
                  Describe the steps to reproduce this issue:
                </Text>
              </View>
            )}

            {feedbackType === 'feature' && (
              <View style={{gap: Spacing.xs}}>
                <Text style={[styles.sectionTitle, {color: Colors.textPrimary}]}>
                  What would you like to see?
                </Text>
                <Text style={styles.hint}>
                  Describe your idea and how it would help:
                </Text>
              </View>
            )}

            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder={
                feedbackType === 'bug'
                  ? 'Steps to reproduce, what you expected, etc...'
                  : feedbackType === 'feature'
                  ? 'Describe your feature idea...'
                  : 'Any additional comments? (optional)'
              }
              placeholderTextColor={Colors.textTertiary}
              multiline
              style={[
                styles.input,
                {
                  color: Colors.textPrimary,
                  backgroundColor: Colors.inputBg,
                  borderColor: Colors.border,
                },
              ]}
              textAlignVertical="top"
            />

            {screenName && (
              <Text style={styles.screenTag}>From: {screenName}</Text>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <View style={{flex: 1}}>
              <Button
                label="Cancel"
                onPress={handleClose}
                variant="secondary"
                size="lg"
                style={{paddingHorizontal: Spacing.sm}}
                textStyle={{fontSize: 14}}
                fullWidth
              />
            </View>
            <View style={{flex: 1.5}}>
              <Button
                label={
                  feedbackType === 'bug'
                    ? '🐛 Report Bug'
                    : feedbackType === 'feature'
                    ? '💡 Suggest'
                    : 'Send Feedback'
                }
                onPress={handleSubmit}
                variant="primary"
                size="lg"
                style={{paddingHorizontal: Spacing.sm}}
                textStyle={{fontSize: 14}}
                loading={submitting}
                fullWidth
              />
            </View>
          </View>
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
  card: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing['4xl'],
    maxHeight: '80%',
    gap: Spacing.lg,
    ...Shadows.lg,
  },
  title: {
    ...Typography.h3,
    textAlign: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  scrollArea: {
    maxHeight: 250,
  },
  sectionTitle: {
    ...Typography.h4,
  },
  hint: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  star: {
    fontSize: 36,
    color: Colors.borderLight,
  },
  starActive: {
    color: Colors.warning,
  },
  ratingText: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.inputBg,
    color: Colors.textPrimary,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Typography.body,
    lineHeight: 22,
    marginTop: Spacing.sm,
  },
  screenTag: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  thanksEmoji: {
    fontSize: 48,
    textAlign: 'center',
  },
  thanksTitle: {
    ...Typography.h2,
    textAlign: 'center',
  },
  thanksText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});
