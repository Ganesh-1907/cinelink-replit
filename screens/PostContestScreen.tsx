import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {parseDeadline} from '../utils/contestUtils';
import {ADMIN_EMAIL} from '../src/api/config';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Input, Button, Card, Chip} from '../components/ui';

const CONTEST_TYPES = [
  'Short Film',
  'Acting',
  'Dialogue',
  'Cinematography',
  'Script',
  'Documentary',
];

export default function PostContestScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prize, setPrize] = useState('');
  const [deadline, setDeadline] = useState('');
  const [rules, setRules] = useState('');
  const [type, setType] = useState('Short Film');
  const [entryFee, setEntryFee] = useState('0');
  const [loading, setLoading] = useState(false);

  const user = auth().currentUser;

  const creatorName =
    user?.displayName || user?.email?.split('@')[0] || 'Creator';

  const isAdmin = user?.email === ADMIN_EMAIL;

  const postContest = async () => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'Only admins can create contests.');
      return;
    }
    if (!title.trim() || !prize.trim() || !deadline.trim()) {
      Alert.alert('Missing Info', 'Please fill Title, Prize and Deadline!');
      return;
    }
    if (!parseDeadline(deadline.trim())) {
      Alert.alert(
        'Invalid Deadline',
        'Use format YYYY-MM-DD (e.g. 2026-07-30)',
      );
      return;
    }

    setLoading(true);
    try {
      const contestRef = await firestore()
        .collection('contests')
        .add({
          title: title.trim(),
          description: description.trim(),
          prize: prize.trim(),
          deadline: deadline.trim(),
          rules: rules.trim(),
          type,
          entryFee: parseInt(entryFee) || 0,
          creatorId: user?.uid,
          creatorEmail: user?.email,
          creatorName,
          entriesCount: 0,
          status: 'Active',
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      await firestore()
        .collection('notifications')
        .add({
          userId: user?.uid,
          type: 'contest_created',
          title: '🏆 Contest Created!',
          message: `Your contest "${title.trim()}" is now live!`,
          contestId: contestRef.id,
          read: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      const usersSnapshot = await firestore().collection('users').get();
      const otherUsers = usersSnapshot.docs.filter(doc => doc.id !== user?.uid);

      for (let i = 0; i < otherUsers.length; i += 450) {
        const batch = firestore().batch();
        otherUsers.slice(i, i + 450).forEach(doc => {
          const notifRef = firestore().collection('notifications').doc();
          batch.set(notifRef, {
            userId: doc.id,
            type: 'new_contest',
            title: '🏆 New Contest Alert!',
            message: `"${title.trim()}" is live — Prize: ${prize.trim()}. Enter now on CineLink!`,
            senderId: user?.uid,
            contestId: contestRef.id,
            read: false,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });
        });
        await batch.commit();
      }

      Alert.alert('Success! 🏆', 'Your contest is now live!', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Something went wrong. Try again!');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Create Contest" navigation={navigation} />
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={[styles.section, {paddingBottom: insets.bottom + 40}]}>
          {/* TITLE */}
          <Input
            label="Contest Title *"
            placeholder="e.g. Best Drama Short 2026"
            value={title}
            onChangeText={setTitle}
            required
          />

          {/* TYPE */}
          <Text style={styles.label}>Contest Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}>
            {CONTEST_TYPES.map(t => (
              <Chip
                key={t}
                label={t}
                selected={type === t}
                onPress={() => setType(t)}
                style={styles.chipItem}
              />
            ))}
          </ScrollView>

          {/* DESCRIPTION */}
          <Input
            label="Description"
            placeholder="What is this contest about? Who can participate?"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          {/* PRIZE */}
          <Input
            label="Prize *"
            placeholder="e.g. ₹10,000 + Certificate + Trophy"
            value={prize}
            onChangeText={setPrize}
            required
          />

          {/* DEADLINE */}
          <Input
            label="Deadline *"
            placeholder="e.g. 2026-07-30"
            value={deadline}
            onChangeText={setDeadline}
            required
            hint={
              deadline.length > 0 && deadline.length < 10
                ? '⚠️ Use format YYYY-MM-DD e.g. 2026-07-30'
                : deadline.length === 10
                ? `✅ Deadline: ${deadline}`
                : undefined
            }
          />

          {/* ENTRY FEE */}
          <Input
            label="Entry Fee (₹) — 0 for Free"
            placeholder="0"
            value={entryFee}
            onChangeText={setEntryFee}
          />

          <View
            style={[
              styles.feeInfo,
              parseInt(entryFee) > 0 && styles.feeInfoPaid,
            ]}>
            <Text
              style={[
                styles.feeInfoText,
                parseInt(entryFee) > 0 && {color: Colors.warning},
              ]}>
              {parseInt(entryFee) === 0
                ? '✅ This is a FREE contest — maximum participation'
                : `💰 Entry fee: ₹${entryFee} per submission`}
            </Text>
          </View>

          {/* RULES */}
          <Input
            label="Rules & Guidelines"
            placeholder="Contest rules, submission format, eligibility criteria..."
            value={rules}
            onChangeText={setRules}
            multiline
          />

          {/* VOTING INFO */}
          <Card
            variant="outlined"
            padding={Spacing.lg}
            style={styles.votingCard}>
            <Text style={styles.votingTitle}>🏆 Winner Selection Method</Text>
            <View style={styles.votingRow}>
              <View style={styles.votingItem}>
                <Text style={styles.votingPercent}>60%</Text>
                <Text style={styles.votingLabel}>Jury Score</Text>
                <Text style={styles.votingDesc}>You rate submissions</Text>
              </View>
              <Text style={styles.votingPlus}>+</Text>
              <View style={styles.votingItem}>
                <Text style={styles.votingPercent}>40%</Text>
                <Text style={styles.votingLabel}>Public Votes</Text>
                <Text style={styles.votingDesc}>Audience votes</Text>
              </View>
            </View>
          </Card>

          {/* SUBMIT */}
          <Button
            label="🏆 Create Contest"
            onPress={postContest}
            loading={loading}
            disabled={loading}
            variant="primary"
            size="lg"
            fullWidth
            style={styles.postBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  container: {flex: 1, backgroundColor: Colors.background},
  section: {padding: Spacing.xl, paddingBottom: Spacing['5xl']},
  label: {
    ...Typography.labelSm,
    color: Colors.primary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  chipScroll: {flexDirection: 'row', marginBottom: Spacing.xs},
  chipItem: {marginRight: Spacing.sm},
  feeInfo: {
    backgroundColor: Colors.successFaint,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  feeInfoPaid: {
    backgroundColor: Colors.warningFaint,
    borderColor: Colors.warningBorder,
  },
  feeInfoText: {
    ...Typography.bodySm,
    color: Colors.success,
  },
  votingCard: {marginTop: Spacing.xl},
  votingTitle: {
    ...Typography.label,
    color: Colors.primary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  votingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  votingItem: {alignItems: 'center'},
  votingPercent: {
    ...Typography.h1,
    color: Colors.textPrimary,
  },
  votingLabel: {
    ...Typography.label,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  votingDesc: {
    ...Typography.micro,
    marginTop: Spacing.xs,
  },
  votingPlus: {
    ...Typography.h2,
    color: Colors.primary,
  },
  postBtn: {marginTop: Spacing.xxl},
});
