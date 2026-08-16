import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator} from 'react-native';
import api from '../src/api/client';
import {Colors, Spacing, Radius} from '../src/theme';
import {Header, Badge, EmptyState} from '../components/ui';
import {useTheme} from '../src/context/ThemeContext';

export default function AdminContestListScreen({route, navigation}: any) {
  const {isDark} = useTheme();
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const filter = route?.params?.filter || 'all';

  const filterLabel = filter === 'all' ? 'All Contests' : filter === 'active' ? 'Active Contests' : filter === 'closed' ? 'Closed Contests' : filter === 'cancelled' ? 'Cancelled Contests' : 'Contests';

  useEffect(() => {
    api.get<any>('/contests').then(res => {
      let list = res.contests || res.data || [];
      if (Array.isArray(res)) list = res;
      if (filter === 'active') list = list.filter((c: any) => c.status === 'active');
      else if (filter === 'closed') list = list.filter((c: any) => c.status === 'closed');
      else if (filter === 'cancelled') list = list.filter((c: any) => c.status === 'cancelled');
      setContests(list);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [filter]);

  return (
    <SafeAreaView style={styles.safe}>
      <Header title={filterLabel} navigation={navigation} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 40}} />
        ) : contests.length === 0 ? (
          <EmptyState icon="🏆" title="No contests found" />
        ) : contests.map((c: any) => (
          <TouchableOpacity key={c._id || c.id} style={styles.card} activeOpacity={0.7} onPress={() => navigation.navigate('ContestDetail', {contestId: c._id || c.id})}>
            <View style={styles.cardHeader}>
              <Text style={styles.title} numberOfLines={1}>{c.title || 'Untitled'}</Text>
              <Badge label={c.status || 'active'} variant={c.status === 'active' ? 'success' : c.status === 'closed' ? 'warning' : 'error'} />
            </View>
            <Text style={styles.meta}>Prize: ₹{c.prize || c.prizePool || 'TBD'} · Entries: {c.entriesCount || 0}</Text>
            {c.deadline && <Text style={styles.meta}>Deadline: {new Date(c.deadline).toLocaleDateString('en-IN')}</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  scroll: {padding: Spacing.md},
  card: {backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight},
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs},
  title: {color: Colors.textPrimary, fontWeight: '600', fontSize: 14, flex: 1, marginRight: Spacing.sm},
  meta: {color: Colors.textSecondary, fontSize: 12, marginTop: 2},
});
