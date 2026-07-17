import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  Linking,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {getDaysLeft} from '../utils/contestUtils';
import {ADMIN_EMAIL} from '../src/api/config';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {
  Header,
  Card,
  Button,
  Input,
  EmptyState,
  Badge,
  Chip,
} from '../components/ui';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) {
    return 'Creator';
  }
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

export default function ContestDetailScreen({route, navigation}: any) {
  const initialContest = route.params?.contest;
  const contestId = route.params?.contestId || initialContest?.id;

  const [contest, setContest] = useState<any>(
    initialContest?.title ? initialContest : null,
  );
  const [entries, setEntries] = useState<any[]>([]);
  const [videoLink, setVideoLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [entered, setEntered] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [votedEntries, setVotedEntries] = useState<Set<string>>(new Set());

  const user = auth().currentUser;
  const isAdmin = user?.email === ADMIN_EMAIL;
  const currentUserName =
    user?.displayName || user?.email?.split('@')[0] || 'Creator';

  useEffect(() => {
    if (!contestId) {
      Alert.alert('Error', 'Contest not found.');
      navigation.goBack();
      return;
    }
    const unsub = firestore()
      .collection('contests')
      .doc(contestId)
      .onSnapshot(
        doc => {
          if (doc.exists) {
            setContest({id: doc.id, ...doc.data()});
          } else {
            Alert.alert('Contest Removed', 'This contest no longer exists.');
            navigation.goBack();
          }
        },
        err => console.log('CONTEST LOAD ERROR:', err),
      );
    return () => unsub();
  }, [contestId]);

  useEffect(() => {
    const unsubEntries = loadEntries();
    checkIfEntered();
    loadVotedEntries();

    const unsubFocus = navigation.addListener('focus', () => {
      checkIfEntered();
    });
    return () => {
      unsubEntries && unsubEntries();
      unsubFocus();
    };
  }, []);

  const loadEntries = () =>
    firestore()
      .collection('contestEntries')
      .where('contestId', '==', contestId)
      .onSnapshot(
        snapshot => {
          if (!snapshot) {
            return;
          }
          const data = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
          data.sort(
            (a: any, b: any) =>
              (b.finalScore || b.votes || 0) - (a.finalScore || a.votes || 0),
          );
          setEntries(data);
        },
        err => console.log('ENTRIES ERROR:', err),
      );

  const checkIfEntered = async () => {
    if (!contestId || !user) {
      return;
    }
    try {
      const snapshot = await firestore()
        .collection('contestEntries')
        .where('contestId', '==', contestId)
        .where('userId', '==', user.uid)
        .get();
      if (!snapshot.empty) {
        setEntered(true);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const loadVotedEntries = async () => {
    try {
      const userDoc = await firestore()
        .collection('users')
        .doc(user?.uid)
        .get();
      const voted = userDoc.data()?.votedEntries || [];
      setVotedEntries(new Set(voted));
    } catch (e) {
      console.log(e);
    }
  };

  const submitEntry = async () => {
    if (!videoLink.trim()) {
      Alert.alert('Missing Link', 'Please paste your video link!');
      return;
    }

    if (contest.entryFee > 0) {
      navigation.navigate('Payment', {
        amount: contest.entryFee,
        purpose: 'contest_entry',
        itemId: contestId,
        itemTitle: contest.title,
        videoLink: videoLink.trim(),
      });
      return;
    }

    const existing = await firestore()
      .collection('contestEntries')
      .where('contestId', '==', contestId)
      .where('userId', '==', user?.uid)
      .get();

    if (!existing.empty) {
      Alert.alert('Already Entered', 'You have already submitted an entry!');
      setEntered(true);
      return;
    }

    setLoading(true);
    try {
      await firestore().collection('contestEntries').add({
        contestId: contestId,
        contestTitle: contest.title,
        userId: user?.uid,
        userEmail: user?.email,
        userName: currentUserName,
        videoLink: videoLink.trim(),
        votes: 0,
        juryScore: 0,
        finalScore: 0,
        paid: true,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      await firestore()
        .collection('contests')
        .doc(contestId)
        .update({
          entriesCount: firestore.FieldValue.increment(1),
        });

      if (contest.creatorId && contest.creatorId !== user?.uid) {
        await firestore()
          .collection('notifications')
          .add({
            userId: contest.creatorId,
            type: 'contest_entry',
            title: '🎬 New Contest Entry!',
            message: `${currentUserName} submitted an entry for "${contest.title}"`,
            senderId: user?.uid,
            contestId: contestId,
            read: false,
            createdAt: firestore.FieldValue.serverTimestamp(),
          });
      }

      setEntered(true);
      setShowSubmit(false);
      setVideoLink('');
      Alert.alert(
        '🎬 Submitted!',
        'Your entry has been submitted successfully!',
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong. Try again.');
    }
    setLoading(false);
  };

  const voteForEntry = async (entryId: string, entryUserId: string) => {
    if (entryUserId === user?.uid) {
      Alert.alert('Error', 'You cannot vote for your own entry!');
      return;
    }
    if (votedEntries.has(entryId)) {
      Alert.alert('Already Voted', 'You have already voted for this entry!');
      return;
    }
    if (!user?.uid) {
      return;
    }

    try {
      const entryRef = firestore().collection('contestEntries').doc(entryId);
      const userRef = firestore().collection('users').doc(user.uid);

      await firestore().runTransaction(async tx => {
        const entrySnap = await tx.get(entryRef);
        if (!entrySnap.exists) {
          throw new Error('Entry not found.');
        }
        const currentVotes = entrySnap.data()?.votes || 0;
        const currentJury = entrySnap.data()?.juryScore || 0;
        const newVotes = currentVotes + 1;
        const newFinalScore = currentJury * 0.6 + newVotes * 0.4;
        tx.update(entryRef, {votes: newVotes, finalScore: newFinalScore});
        tx.update(userRef, {
          votedEntries: firestore.FieldValue.arrayUnion(entryId),
        });
      });

      const updated = new Set(votedEntries);
      updated.add(entryId);
      setVotedEntries(updated);
      setEntries(prev =>
        prev.map(e => {
          if (e.id !== entryId) {
            return e;
          }
          const newVotes = (e.votes || 0) + 1;
          const newFinalScore = (e.juryScore || 0) * 0.6 + newVotes * 0.4;
          return {...e, votes: newVotes, finalScore: newFinalScore};
        }),
      );
      Alert.alert('👍 Voted!', 'Your vote has been counted!');
    } catch (e: any) {
      if (e?.message === 'already_voted') {
        Alert.alert('Already Voted', 'You have already voted for this entry!');
        const updated = new Set(votedEntries);
        updated.add(entryId);
        setVotedEntries(updated);
      } else {
        Alert.alert('Error', 'Could not register vote. Try again.');
      }
    }
  };

  const updateJuryScore = async (
    entryId: string,
    scoreText: string,
    currentVotes: number,
  ) => {
    const score = Math.min(100, Math.max(0, Number(scoreText) || 0));
    const finalScore = score * 0.6 + (currentVotes || 0) * 0.4;
    try {
      await firestore()
        .collection('contestEntries')
        .doc(entryId)
        .update({juryScore: score, finalScore});
      setEntries(prev =>
        prev.map(e =>
          e.id === entryId ? {...e, juryScore: score, finalScore} : e,
        ),
      );
    } catch (e) {
      console.log('JURY SCORE ERROR:', e);
    }
  };

  const deleteContest = () => {
    Alert.alert(
      '🗑 Remove Contest',
      `Are you sure you want to permanently delete "${contest.title}"?\n\nThis will also delete all ${entries.length} entries. This cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              const entriesSnapshot = await firestore()
                .collection('contestEntries')
                .where('contestId', '==', contestId)
                .get();
              if (!entriesSnapshot.empty) {
                const batch = firestore().batch();
                entriesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
              }
              await firestore().collection('contests').doc(contestId).delete();
              Alert.alert(
                '✅ Deleted',
                'Contest and all entries removed successfully.',
              );
              navigation.goBack();
            } catch (e: any) {
              Alert.alert(
                'Error',
                e.message || 'Could not delete contest. Try again.',
              );
            }
          },
        },
      ],
    );
  };

  if (!contest) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={Colors.background}
        />
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={{marginTop: 60}}
        />
      </View>
    );
  }

  const daysLeft = getDaysLeft(contest.deadline);
  const isEnded = daysLeft === 'Contest Ended';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <Header title={contest.title || 'Contest'} navigation={navigation} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          {/* HEADER CARD */}
          <Card
            variant="elevated"
            padding={Spacing.xl}
            style={styles.cardSpacing}>
            <Chip
              label={contest.type || 'Contest'}
              static
              style={styles.typeChip}
            />
            <Text style={styles.title}>{contest.title}</Text>
            <Text style={styles.prize}>🏆 {contest.prize}</Text>
            {contest.description ? (
              <Text style={styles.description}>{contest.description}</Text>
            ) : null}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text
                  style={[styles.statValue, isEnded && {color: Colors.error}]}>
                  {daysLeft}
                </Text>
                <Text style={styles.statLabel}>Deadline</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {contest.entriesCount || 0}
                </Text>
                <Text style={styles.statLabel}>Entries</Text>
              </View>
              <View style={styles.statBox}>
                <Text
                  style={[
                    styles.statValue,
                    contest.entryFee === 0 && {color: Colors.success},
                  ]}>
                  {contest.entryFee > 0 ? `₹${contest.entryFee}` : 'FREE'}
                </Text>
                <Text style={styles.statLabel}>Entry Fee</Text>
              </View>
            </View>
          </Card>

          {/* VOTING METHOD CARD */}
          <Card
            variant="outlined"
            padding={Spacing.lg}
            style={styles.cardSpacing}>
            <Text style={styles.votingTitle}>🏆 Winner Selection</Text>
            <View style={styles.votingRow}>
              <View style={styles.votingItem}>
                <Text style={styles.votingPercent}>60%</Text>
                <Text style={styles.votingLabel}>Jury Score</Text>
              </View>
              <Text style={styles.votingPlus}>+</Text>
              <View style={styles.votingItem}>
                <Text style={styles.votingPercent}>40%</Text>
                <Text style={styles.votingLabel}>Public Votes</Text>
              </View>
            </View>
          </Card>

          {/* ADMIN DELETE BUTTON */}
          {isAdmin && (
            <Button
              label="🗑 Remove Contest"
              onPress={deleteContest}
              variant="danger"
              size="md"
              fullWidth
              style={styles.cardSpacing}
            />
          )}

          {/* RULES */}
          {contest.rules ? (
            <Card
              variant="elevated"
              padding={Spacing.lg}
              style={styles.cardSpacing}>
              <Text style={styles.sectionTitle}>📜 Rules & Guidelines</Text>
              <Text style={styles.rulesText}>{contest.rules}</Text>
            </Card>
          ) : null}

          {/* SUBMIT / ENTERED */}
          {!isEnded ? (
            !entered ? (
              <Button
                label={showSubmit ? '✕ Cancel' : '🎬 Submit Your Entry'}
                onPress={() => setShowSubmit(!showSubmit)}
                variant="primary"
                size="lg"
                fullWidth
                style={styles.cardSpacing}
              />
            ) : (
              <View style={styles.enteredBadge}>
                <Text style={styles.enteredText}>
                  ✅ You already submitted your entry
                </Text>
              </View>
            )
          ) : (
            <View style={styles.endedBadge}>
              <Text style={styles.endedText}>🔒 Contest has ended</Text>
            </View>
          )}

          {/* SUBMIT BOX */}
          {showSubmit && !entered && (
            <Card
              variant="elevated"
              padding={Spacing.lg}
              style={styles.cardSpacing}>
              <Text style={styles.submitLabel}>📎 Paste your video link</Text>
              <Input
                placeholder="YouTube / Google Drive / Vimeo link"
                value={videoLink}
                onChangeText={setVideoLink}
              />
              {contest.entryFee > 0 && (
                <View style={styles.feeWarning}>
                  <Text style={styles.feeWarningText}>
                    💰 Entry fee: ₹{contest.entryFee} — you will be redirected
                    to payment
                  </Text>
                </View>
              )}
              <Button
                label={
                  contest.entryFee > 0
                    ? `💳 Pay ₹${contest.entryFee} & Submit`
                    : '🚀 Submit Entry'
                }
                onPress={submitEntry}
                loading={loading}
                disabled={loading}
                variant="primary"
                size="md"
                fullWidth
              />
            </Card>
          )}

          {/* LEADERBOARD */}
          <Text style={styles.sectionTitle}>
            🎬 Submissions ({entries.length})
          </Text>

          {entries.length === 0 ? (
            <EmptyState
              icon="🎬"
              title="No submissions yet!"
              subtitle="Be the first to submit!"
            />
          ) : (
            entries.map((item: any, index: number) => {
              const hasVoted = votedEntries.has(item.id);
              const isOwn = item.userId === user?.uid;
              const entrantName =
                cleanName(item.userName) ||
                cleanName(item.userEmail) ||
                'Creator';
              const finalScore = (
                (item.juryScore || 0) * 0.6 +
                (item.votes || 0) * 0.4
              ).toFixed(1);

              return (
                <Card
                  key={item.id}
                  variant="elevated"
                  padding={Spacing.lg}
                  style={styles.cardSpacing}>
                  <View style={styles.entryHeader}>
                    <View
                      style={[
                        styles.rankBadge,
                        index === 0 && styles.rankBadgeGold,
                        index === 1 && styles.rankBadgeSilver,
                        index === 2 && styles.rankBadgeBronze,
                      ]}>
                      <Text style={styles.rankText}>
                        {index === 0
                          ? '🥇'
                          : index === 1
                          ? '🥈'
                          : index === 2
                          ? '🥉'
                          : `#${index + 1}`}
                      </Text>
                    </View>
                    <Text style={styles.entryName}>{entrantName}</Text>
                    {isOwn && <Badge label="You" variant="primary" />}
                    <Text style={styles.entryVotes}>👍 {item.votes || 0}</Text>
                  </View>

                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreLabel}>
                      Jury:{' '}
                      <Text style={styles.scoreValue}>
                        {item.juryScore || 0}
                      </Text>
                    </Text>
                    <Text style={styles.scoreLabel}>
                      Votes:{' '}
                      <Text style={styles.scoreValue}>{item.votes || 0}</Text>
                    </Text>
                    <Text style={styles.finalScoreText}>
                      Final:{' '}
                      <Text style={styles.finalScoreValue}>{finalScore}</Text>
                    </Text>
                  </View>

                  <Button
                    label="▶️ Watch Video"
                    onPress={() => {
                      if (!item.videoLink) {
                        Alert.alert('No video', 'No video link available.');
                        return;
                      }
                      Linking.openURL(item.videoLink).catch(() =>
                        Alert.alert('Error', 'Could not open video link.'),
                      );
                    }}
                    variant="outline"
                    size="sm"
                    fullWidth
                    style={styles.watchBtnSpacing}
                  />

                  {!isOwn && (
                    <Button
                      label={hasVoted ? '✓ Voted' : '👍 Vote'}
                      onPress={() => voteForEntry(item.id, item.userId)}
                      variant={hasVoted ? 'secondary' : 'ghost'}
                      size="sm"
                      fullWidth
                      disabled={hasVoted}
                    />
                  )}

                  {isOwn && (
                    <View style={styles.ownEntryNote}>
                      <Text style={styles.ownEntryNoteText}>
                        👤 This is your entry — you cannot vote for yourself
                      </Text>
                    </View>
                  )}

                  {isAdmin && (
                    <View style={styles.juryRow}>
                      <Text style={styles.juryLabel}>
                        ⭐ Jury Score (0–100):
                      </Text>
                      <TextInput
                        style={styles.juryInput}
                        placeholder="0"
                        placeholderTextColor={Colors.textSecondary}
                        keyboardType="numeric"
                        defaultValue={String(item.juryScore || 0)}
                        onEndEditing={e =>
                          updateJuryScore(
                            item.id,
                            e.nativeEvent.text,
                            item.votes,
                          )
                        }
                      />
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  scrollContent: {paddingBottom: Spacing['4xl']},
  section: {padding: Spacing.lg},
  cardSpacing: {marginBottom: Spacing.md},
  typeChip: {marginBottom: Spacing.sm, alignSelf: 'flex-start'},
  title: {
    ...Typography.h2,
    marginBottom: Spacing.sm,
  },
  prize: {
    ...Typography.h4,
    color: Colors.warning,
    marginBottom: Spacing.sm,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.cardHigher,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  statValue: {
    ...Typography.captionBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  statLabel: {
    ...Typography.micro,
    color: Colors.textSecondary,
  },
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
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  votingPlus: {
    ...Typography.h2,
    color: Colors.primary,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.primary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  rulesText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  enteredBadge: {
    backgroundColor: Colors.successFaint,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  enteredText: {
    ...Typography.label,
    color: Colors.success,
  },
  endedBadge: {
    backgroundColor: Colors.errorFaint,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  endedText: {
    ...Typography.label,
    color: Colors.error,
  },
  submitLabel: {
    ...Typography.labelSm,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  feeWarning: {
    backgroundColor: Colors.warningFaint,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
  },
  feeWarningText: {
    ...Typography.bodySm,
    color: Colors.warning,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  rankBadge: {
    backgroundColor: Colors.cardHigher,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  rankBadgeGold: {backgroundColor: Colors.warningFaint},
  rankBadgeSilver: {backgroundColor: '#334155'},
  rankBadgeBronze: {backgroundColor: '#431407'},
  rankText: {
    ...Typography.captionBold,
    color: Colors.textPrimary,
  },
  entryName: {
    ...Typography.label,
    flex: 1,
  },
  entryVotes: {
    ...Typography.captionBold,
    color: Colors.warning,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardHigher,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  scoreLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  scoreValue: {
    ...Typography.captionBold,
    color: Colors.textPrimary,
  },
  finalScoreText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  finalScoreValue: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
  watchBtnSpacing: {marginBottom: Spacing.sm},
  ownEntryNote: {
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ownEntryNoteText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  juryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warningFaint,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
  },
  juryLabel: {
    ...Typography.captionBold,
    color: Colors.primary,
    flex: 1,
  },
  juryInput: {
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    color: Colors.textPrimary,
    width: 60,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
