import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Linking} from 'react-native';
import api from '../src/api/client';
import auth from '@react-native-firebase/auth';
import {ADMIN_EMAIL} from '../src/api/config';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Card, Button, EmptyState, LoadingView, Badge, Chip} from '../components/ui';

export default function MyContestsScreen({navigation}: any) {
  const [tab, setTab] = useState<'entered' | 'created'>('entered');
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth().currentUser;

  const fetchContests = useCallback(async () => {
    try {
      if (tab === 'created') {
        // Creator's contests - get all contests, filter client-side
        const res = await api.get<{contests: any[]}>('/contests');
        setContests((res.contests || []).filter((c: any) => c.createdBy === user?.uid));
      } else {
        // Entered contests
        const res = await api.get<{entries?: any[]}>('/contests');
        setContests(res.entries || []);
      }
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  }, [tab, user]);

  useEffect(() => { fetchContests(); }, [fetchContests]);
  useEffect(() => { const unsub = navigation.addListener('focus', () => { fetchContests(); }); return unsub; }, [navigation, fetchContests]);

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="My Contests" navigation={navigation} />
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, tab === 'entered' && styles.activeTab]} onPress={() => setTab('entered')}><Text style={[styles.tabText, tab === 'entered' && styles.activeTabText]}>🎬 Entered</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'created' && styles.activeTab]} onPress={() => setTab('created')}><Text style={[styles.tabText, tab === 'created' && styles.activeTabText]}>🏆 My Contests</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? <LoadingView /> : contests.length === 0 ? (
          <EmptyState icon="🏆" title="No contests yet" subtitle={tab === 'entered' ? "You haven't entered any contests yet" : "You haven't created any contests yet"} actionLabel="Browse Contests" onAction={() => navigation.navigate('Home')} />
        ) : contests.map((contest: any, i: number) => (
          <Card key={contest._id || contest.id || i} variant="elevated" padding={Spacing.lg} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{contest.title}</Text>
              <Badge label={contest.status || 'Active'} variant="success" />
            </View>
            {contest.prize ? <Text style={styles.prize}>💰 {contest.prize}</Text> : null}
            <Text style={styles.meta}>📅 {contest.deadline || 'No deadline'}</Text>
            <Button label="View Contest →" variant="outline" size="sm" fullWidth onPress={() => navigation.navigate('ContestDetail', {contestId: contest._id || contest.id, contest})} />
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  tabRow: {flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.sm},
  tab: {flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.sm, backgroundColor: Colors.card},
  activeTab: {backgroundColor: Colors.primary},
  tabText: {color: Colors.textSecondary, ...Typography.label},
  activeTabText: {color: Colors.textPrimary, fontWeight: 'bold'},
  scroll: {padding: Spacing.lg},
  card: {marginBottom: Spacing.md},
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm},
  cardTitle: {...Typography.body, fontWeight: 'bold', flex: 1},
  prize: {...Typography.bodySm, color: Colors.warning, marginBottom: Spacing.xs},
  meta: {...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.md},
});
