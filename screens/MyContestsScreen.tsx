import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert} from 'react-native';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Card, Button, EmptyState, LoadingView, Badge} from '../components/ui';
import {useApp} from '../src/context/AppContext';

export default function MyContestsScreen({navigation}: any) {
  const [tab, setTab] = useState<'entered' | 'created'>('entered');
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const {user, isAdmin} = useApp();

  const fetchContests = useCallback(async () => {
    try {
      const id = user?.uid || user?._id;
      if (!id) { setLoading(false); return; }
      
      if (tab === 'created') {
        const res = await api.get<{contests: any[]}>(`/contests?createdBy=${id}`);
        setContests(res.contests || []);
      } else {
        const res = await api.get<{contests: any[]}>('/contests/user/entered');
        setContests(res.contests || []);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }, [tab, user]);

  useEffect(() => {
    fetchContests();
  }, [fetchContests]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => { fetchContests(); });
    return unsub;
  }, [navigation, fetchContests]);

  const deleteContest = (contest: any) => {
    Alert.alert('Delete Contest', `Delete "${contest.title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/contests/${contest._id || contest.id}`);
            fetchContests();
          } catch {
            Alert.alert('Error', 'Could not delete.');
          }
        },
      },
    ]);
  };

  const togglePrivacy = async (contest: any) => {
    try {
      const newPrivacy = !contest.isPrivate;
      await api.put(`/contests/${contest._id || contest.id}`, { isPrivate: newPrivacy });
      fetchContests();
    } catch {
      Alert.alert('Error', 'Could not update visibility.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="My Contests" navigation={navigation} />
      
      {isAdmin && (
        <View style={{paddingHorizontal: Spacing.lg, marginBottom: Spacing.md}}>
          <Button
            label="➕ Create New Contest"
            variant="primary"
            size="md"
            onPress={() => navigation.navigate('PostContest')}
            fullWidth
          />
        </View>
      )}

      {isAdmin && (
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, tab === 'entered' && styles.activeTab]} onPress={() => setTab('entered')}><Text style={[styles.tabText, tab === 'entered' && styles.activeTabText]}>🎬 Entered</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === 'created' && styles.activeTab]} onPress={() => setTab('created')}><Text style={[styles.tabText, tab === 'created' && styles.activeTabText]}>🏆 My Contests</Text></TouchableOpacity>
        </View>
      )}
      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? <LoadingView /> : contests.length === 0 ? (
          <EmptyState icon="🏆" title="No contests yet" subtitle={tab === 'entered' ? "You haven't entered any contests yet" : "You haven't created any contests yet"} actionLabel="Browse Contests" onAction={() => navigation.navigate('Home')} />
        ) : contests.map((contest: any, i: number) => (
          <Card key={contest._id || contest.id || i} variant="elevated" padding={Spacing.lg} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{contest.title}</Text>
              <View style={{flexDirection: 'row', gap: Spacing.xs}}>
                <Badge label={contest.status || 'Active'} variant="success" />
                {tab === 'created' && (
                  contest.isPrivate ? (
                    <Badge label="Private" variant="error" />
                  ) : (
                    <Badge label="Public" variant="success" />
                  )
                )}
              </View>
            </View>
            {contest.prize ? <Text style={styles.prize}>💰 {contest.prize}</Text> : null}
            <Text style={styles.meta}>📅 {contest.deadline || 'No deadline'}</Text>
            
            <View style={styles.btnRow}>
              <Button
                label="View"
                variant="outline"
                size="sm"
                style={{flex: 1}}
                onPress={() => navigation.navigate('ContestDetail', {contestId: contest._id || contest.id, contest})}
              />
              {tab === 'created' && (
                <>
                  <Button
                    label="Edit"
                    variant="outline"
                    size="sm"
                    style={{flex: 1}}
                    onPress={() => navigation.navigate('PostContest', {contest})}
                  />
                  <Button
                    label={contest.isPrivate ? "🔒 Private" : "🔓 Public"}
                    variant={contest.isPrivate ? "secondary" : "outline"}
                    size="sm"
                    style={{flex: 1.2}}
                    onPress={() => togglePrivacy(contest)}
                  />
                  <Button
                    label="🗑"
                    variant="danger"
                    size="sm"
                    style={{flex: 0.4}}
                    onPress={() => deleteContest(contest)}
                  />
                </>
              )}
            </View>
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
  btnRow: {flexDirection: 'row', gap: Spacing.xs},
});
