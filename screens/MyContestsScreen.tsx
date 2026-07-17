import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {ADMIN_EMAIL} from '../src/api/config';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {
  Header,
  Card,
  Button,
  EmptyState,
  LoadingView,
  Badge,
  Chip,
} from '../components/ui';

export default function MyContestsScreen({navigation}: any) {
  const [contests, setContests] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('My Entries');
  const user = auth().currentUser;
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    const unsubEntries = loadMyEntries();
    const unsubContests = loadMyContests();
    return () => {
      unsubEntries();
      unsubContests();
    };
  }, []);

  const loadMyEntries = () => {
    return firestore()
      .collection('contestEntries')
      .where('userId', '==', user?.uid)
      .onSnapshot(
        snapshot => {
          if (!snapshot) {
            return;
          }
          const data = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
          data.sort((a: any, b: any) => (b.votes || 0) - (a.votes || 0));
          setEntries(data);
          setLoading(false);
        },
        error => {
          console.log('loadMyEntries error:', error);
          setLoading(false);
        },
      );
  };

  const loadMyContests = () => {
    return firestore()
      .collection('contests')
      .where('creatorId', '==', user?.uid)
      .onSnapshot(
        snapshot => {
          if (!snapshot) {
            return;
          }
          const data = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
          setContests(data);
        },
        error => {
          console.log('loadMyContests error:', error);
        },
      );
  };

  const deleteEntry = async (entryId: string) => {
    const {Alert} = require('react-native');
    Alert.alert('Remove Entry', 'Remove your entry from this contest?', [
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await firestore().collection('contestEntries').doc(entryId).delete();
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const getDaysLeft = (deadline: string) => {
    if (!deadline) {
      return 'Open';
    }
    const diff = Math.ceil(
      (new Date(deadline).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (diff < 0) {
      return '🔴 Ended';
    }
    if (diff === 0) {
      return '🟡 Last day!';
    }
    return `🟢 ${diff} days left`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="My Contests" noBorder />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* TABS */}
        <View style={styles.tabRow}>
          {['My Entries', 'My Contests'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}>
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          {loading ? (
            <LoadingView message="Loading..." />
          ) : activeTab === 'My Entries' ? (
            /* ── MY ENTRIES ── */
            entries.length === 0 ? (
              <EmptyState
                icon="🏆"
                title="No contest entries yet!"
                subtitle="Enter a contest to see it here."
                actionLabel="Browse Contests"
                onAction={() => navigation.navigate('Contests')}
              />
            ) : (
              entries.map((item: any, index: number) => (
                <Card
                  key={item.id}
                  variant="elevated"
                  padding={Spacing.lg}
                  style={styles.cardSpacing}>
                  {/* RANK */}
                  <View style={styles.cardTopRow}>
                    <Badge label={`#${index + 1}`} variant="primary" />
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.contestTitle}
                    </Text>
                  </View>

                  {/* STATS */}
                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statValue}>{item.votes || 0}</Text>
                      <Text style={styles.statLabel}>Votes</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statValue}>
                        {item.juryScore || '—'}
                      </Text>
                      <Text style={styles.statLabel}>Jury Score</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text
                        style={[
                          styles.statValue,
                          {color: item.paid ? Colors.success : Colors.error},
                        ]}>
                        {item.paid ? '✅' : '❌'}
                      </Text>
                      <Text style={styles.statLabel}>Paid</Text>
                    </View>
                  </View>

                  {/* VIDEO LINK */}
                  {item.videoLink ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(item.videoLink)}>
                      <Text style={styles.videoLink}>🎬 Watch my entry</Text>
                    </TouchableOpacity>
                  ) : null}

                  {/* VIEW CONTEST */}
                  <Button
                    label="View Contest →"
                    onPress={() =>
                      navigation.navigate('ContestDetail', {
                        contest: {id: item.contestId, title: item.contestTitle},
                      })
                    }
                    variant="outline"
                    size="sm"
                    fullWidth
                    style={styles.btnSpacing}
                  />

                  {/* DELETE */}
                  <Button
                    label="🗑 Remove Entry"
                    onPress={() => deleteEntry(item.id)}
                    variant="danger"
                    size="sm"
                    fullWidth
                  />
                </Card>
              ))
            )
          ) : (
            /* ── MY CONTESTS ── */
            <>
              {isAdmin && (
                <Button
                  label="+ Create New Contest"
                  onPress={() => navigation.navigate('PostContest')}
                  variant="primary"
                  size="md"
                  fullWidth
                  style={styles.cardSpacing}
                />
              )}

              {contests.length === 0 ? (
                <EmptyState
                  icon="🏆"
                  title="No contests created!"
                  subtitle="Create a contest to see it here."
                />
              ) : (
                contests.map((item: any) => (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.82}
                    onPress={() =>
                      navigation.navigate('ContestDetail', {contest: item})
                    }>
                    <Card
                      variant="elevated"
                      padding={Spacing.lg}
                      style={styles.cardSpacing}>
                      <View style={styles.cardTopRow}>
                        <Chip
                          label={item.status || 'Active'}
                          variant={
                            item.status === 'Active' ? 'success' : 'error'
                          }
                          static
                        />
                      </View>

                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text style={styles.prize}>🏆 {item.prize}</Text>

                      <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                          <Text style={styles.statValue}>
                            {item.entriesCount || 0}
                          </Text>
                          <Text style={styles.statLabel}>Entries</Text>
                        </View>
                        <View style={styles.statBox}>
                          <Text style={styles.statValue}>
                            {item.entryFee > 0 ? `₹${item.entryFee}` : 'FREE'}
                          </Text>
                          <Text style={styles.statLabel}>Entry Fee</Text>
                        </View>
                        <View style={styles.statBox}>
                          <Text style={styles.statValue}>
                            {getDaysLeft(item.deadline)}
                          </Text>
                          <Text style={styles.statLabel}>Deadline</Text>
                        </View>
                      </View>

                      <View style={styles.manageRow}>
                        <Text style={styles.manageText}>Manage Contest →</Text>
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  container: {flex: 1, backgroundColor: Colors.background},
  tabRow: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    ...Typography.label,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    ...Typography.label,
    color: Colors.textInverse,
  },
  section: {padding: Spacing.lg, paddingBottom: Spacing['4xl']},
  cardSpacing: {marginBottom: Spacing.md},
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    ...Typography.h4,
    flex: 1,
    marginBottom: Spacing.sm,
  },
  prize: {
    ...Typography.label,
    color: Colors.warning,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.cardHigher,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h4,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.micro,
    color: Colors.textSecondary,
  },
  videoLink: {
    ...Typography.label,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  btnSpacing: {marginBottom: Spacing.sm},
  manageRow: {
    backgroundColor: Colors.cardHigher,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  manageText: {
    ...Typography.label,
    color: Colors.primary,
  },
});
