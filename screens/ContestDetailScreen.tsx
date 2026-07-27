import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator, Linking, Image} from 'react-native';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {Header, Button, Card, Chip, Badge, Avatar, Input, EmptyState, LoadingView} from '../components/ui';
import {useApp} from '../src/context/AppContext';

export default function ContestDetailScreen({route, navigation}: any) {
  const {contest: paramContest, contestId: paramContestId} = route.params;
  const contestId = paramContestId || paramContest?._id || paramContest?.id || '';
  const [contest, setContest] = useState<any>(paramContest || {});
  const [entries, setEntries] = useState<any[]>([]);
  const [videoLink, setVideoLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const {user} = useApp();

  const fetchData = useCallback(async () => {
    try {
      const [contestRes, entriesRes] = await Promise.all([
        api.get<any>(`/contests/${contestId}`),
        api.get<any>(`/contests/${contestId}/entries`),
      ]);
      if (contestRes?.contest) setContest(contestRes.contest);
      setEntries(entriesRes?.entries || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  }, [contestId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const enterContest = async () => {
    if (!videoLink.trim()) { Alert.alert('Required', 'Paste a video link to enter.'); return; }
    setSubmitting(true);
    try {
      await api.post(`/contests/${contestId}/enter`, {videoLink: videoLink.trim()});
      Alert.alert('✅ Entered!', 'Your entry has been submitted.');
      setVideoLink('');
      fetchData();
    } catch (e: any) { Alert.alert('Error', e.message || 'Could not enter contest.'); }
    finally { setSubmitting(false); }
  };

  const vote = async (entryId: string) => {
    try {
      await api.post(`/contests/${contestId}/entries/${entryId}/vote`);
      Alert.alert('✅ Voted!', 'Your vote has been counted.');
      fetchData();
    } catch (e: any) { Alert.alert('Error', e.message || 'Could not vote.'); }
  };

  if (loading) return <LoadingView />;

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="🏆 Contest" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.mainCard}>
          {contest.posterUrl ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() =>
                navigation.navigate('ImageViewer', {imageUrl: contest.posterUrl})
              }>
              <Image source={{uri: contest.posterUrl}} style={styles.detailPoster} resizeMode="cover" />
            </TouchableOpacity>
          ) : null}
          <View style={styles.bannerRow}>
            <Text style={styles.bannerLabel}>🏆 {contest.type || 'Cinema'} Contest</Text>
            {contest.status === 'Active' || !contest.status ? <Badge label="● Live" variant="success" /> : <Badge label="Ended" variant="error" />}
          </View>
          <Text style={styles.title}>{contest.title}</Text>
          {contest.prize ? (
            <View style={styles.prizeContainer}>
              <Text style={styles.prizeText}>💰 {contest.prize}</Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            {contest.deadline ? <Chip label={`📅 ${contest.deadline}`} static /> : null}
            {contest.entryFee !== undefined ? <Chip label={contest.entryFee === 0 ? '✅ Free Entry' : `₹${contest.entryFee}`} variant={contest.entryFee === 0 ? 'success' : 'warning'} static /> : null}
          </View>
          <View style={styles.divider} />
          {contest.description ? <Text style={styles.desc}>{contest.description}</Text> : null}
          <Text style={styles.entriesCount}>🏆 {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Enter This Contest</Text>
        <View style={styles.enterCard}>
          <Input value={videoLink} onChangeText={setVideoLink} placeholder="Paste YouTube/Drive video link..." />
          <Button label="🎬 Submit Entry" onPress={enterContest} variant="primary" size="lg" fullWidth loading={submitting} disabled={submitting} />
        </View>

        <Text style={styles.sectionTitle}>Entries ({entries.length})</Text>
        {entries.length === 0 ? (
          <EmptyState icon="🏆" title="No entries yet" subtitle="Be the first to enter!" />
        ) : (
          entries.map((entry: any) => (
            <View key={entry._id || entry.id} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <View style={styles.entryUserRow}>
                  <Avatar name={entry.userName || entry.userEmail || 'Participant'} size="md" uri={entry.userPhotoUrl} />
                  <View style={styles.entryUserText}>
                    <Text style={styles.entryUser} numberOfLines={1}>{entry.userName || entry.userEmail || 'Participant'}</Text>
                    <Text style={styles.entryTime}>Submitted entry</Text>
                  </View>
                </View>
                <View style={styles.votesBadge}>
                  <Text style={styles.votesBadgeText}>{entry.votes || 0} votes</Text>
                </View>
              </View>
              {entry.videoLink ? (
                <TouchableOpacity style={styles.entryLinkContainer} onPress={() => Linking.openURL(entry.videoLink).catch(() => Alert.alert('Error', 'Invalid link'))}>
                  <Text style={styles.entryLink} numberOfLines={1}>🔗 {entry.videoLink}</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.voteBtn} onPress={() => vote(entry._id || entry.id)}>
                <Text style={styles.voteBtnText}>🗳️ Vote</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  scroll: {padding: Spacing.lg, gap: Spacing.lg},
  mainCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    ...Shadows.md,
    gap: Spacing.sm,
  },
  detailPoster: {
    height: 180,
    width: '100%',
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  bannerLabel: {
    ...Typography.captionBold,
    color: Colors.primary,
    fontSize: 13,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontWeight: '600',
    fontSize: 22,
    color: Colors.textPrimary,
    lineHeight: 30,
  },
  prizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningFaint,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    alignSelf: 'flex-start',
  },
  prizeText: {
    ...Typography.label,
    color: Colors.warning,
    fontWeight: 'bold',
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    marginVertical: Spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },
  desc: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  entriesCount: {
    ...Typography.label,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 18,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  enterCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    ...Shadows.md,
    gap: Spacing.md,
  },
  entryCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    gap: Spacing.sm,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  entryUserText: {
    flex: 1,
  },
  entryUser: {
    ...Typography.label,
    color: Colors.textPrimary,
  },
  entryTime: {
    ...Typography.caption,
    color: Colors.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  votesBadge: {
    backgroundColor: Colors.infoFaint,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.infoBorder,
  },
  votesBadgeText: {
    color: Colors.info,
    ...Typography.captionBold,
    fontSize: 11,
  },
  entryLinkContainer: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  entryLink: {
    color: Colors.primary,
    ...Typography.bodySm,
    flex: 1,
  },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 2,
    marginTop: Spacing.xs,
  },
  voteBtnText: {
    color: Colors.primary,
    ...Typography.btn,
    fontWeight: '700',
  },
});
