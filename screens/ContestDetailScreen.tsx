import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator} from 'react-native';
import api from '../src/api/client';
import auth from '@react-native-firebase/auth';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Button, Card, Chip, Badge, Avatar, Input, EmptyState, LoadingView} from '../components/ui';

export default function ContestDetailScreen({route, navigation}: any) {
  const {contest: paramContest, contestId: paramContestId} = route.params;
  const contestId = paramContestId || paramContest?._id || paramContest?.id || '';
  const [contest, setContest] = useState<any>(paramContest || {});
  const [entries, setEntries] = useState<any[]>([]);
  const [videoLink, setVideoLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const user = auth().currentUser;

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
        <Card variant="elevated" padding={Spacing.lg} style={styles.mainCard}>
          <Text style={styles.title}>{contest.title}</Text>
          {contest.prize ? <Text style={styles.prize}>💰 {contest.prize}</Text> : null}
          <View style={styles.metaRow}>
            {contest.deadline ? <Chip label={`📅 ${contest.deadline}`} static /> : null}
            {contest.entryFee !== undefined ? <Chip label={contest.entryFee === 0 ? '✅ Free Entry' : `₹${contest.entryFee}`} variant={contest.entryFee === 0 ? 'success' : 'warning'} static /> : null}
          </View>
          {contest.description ? <Text style={styles.desc}>{contest.description}</Text> : null}
          <Text style={styles.entriesCount}>🏆 {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}</Text>
        </Card>

        <Text style={styles.sectionTitle}>Enter This Contest</Text>
        <Card variant="default" padding={Spacing.md}>
          <Input value={videoLink} onChangeText={setVideoLink} placeholder="Paste YouTube/Drive video link..." />
          <Button label="🎬 Submit Entry" onPress={enterContest} variant="primary" size="lg" fullWidth loading={submitting} disabled={submitting} style={{marginTop: Spacing.sm}} />
        </Card>

        <Text style={styles.sectionTitle}>Entries ({entries.length})</Text>
        {entries.length === 0 ? <EmptyState icon="🏆" title="No entries yet" subtitle="Be the first to enter!" /> : entries.map((entry: any) => (
          <Card key={entry._id || entry.id} variant="default" padding={Spacing.md} style={styles.entryCard}>
            <View style={styles.entryHeader}><Text style={styles.entryUser}>{entry.userName || entry.userEmail || 'Participant'}</Text><Badge label={`${entry.votes || 0} votes`} variant="info" /></View>
            {entry.videoLink ? <Text style={styles.entryLink} numberOfLines={1}>{entry.videoLink}</Text> : null}
            <Button label="🗳 Vote" variant="outline" size="sm" onPress={() => vote(entry._id || entry.id)} />
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  scroll: {padding: Spacing.lg, gap: Spacing.lg},
  mainCard: {gap: Spacing.sm},
  title: {fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary},
  prize: {color: Colors.warning, fontWeight: '700', fontSize: 16},
  metaRow: {flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap'},
  desc: {color: Colors.textSecondary, lineHeight: 22},
  entriesCount: {color: Colors.primary, fontWeight: '600'},
  sectionTitle: {color: Colors.textPrimary, fontWeight: 'bold', fontSize: 18, marginTop: Spacing.md},
  entryCard: {marginBottom: Spacing.sm},
  entryHeader: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs},
  entryUser: {color: Colors.textPrimary, fontWeight: '600'},
  entryLink: {color: Colors.primary, fontSize: 13, marginBottom: Spacing.sm},
});
