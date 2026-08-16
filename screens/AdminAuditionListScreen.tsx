import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator} from 'react-native';
import api from '../src/api/client';
import {Colors, Spacing, Radius} from '../src/theme';
import {Header, Badge, EmptyState} from '../components/ui';
import {useTheme} from '../src/context/ThemeContext';

export default function AdminAuditionListScreen({route, navigation}: any) {
  const {isDark} = useTheme();
  const [auditions, setAuditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const filter = route?.params?.filter || 'all';

  const filterLabel = filter === 'all' ? 'All Auditions' : filter === 'active' ? 'Active Auditions' : filter === 'closed' ? 'Closed Auditions' : filter === 'completed' ? 'Completed Auditions' : 'Auditions';

  useEffect(() => {
    api.get<any>('/auditions').then(res => {
      let list = res.auditions || res.data || [];
      if (Array.isArray(res)) list = res;
      if (filter === 'active') list = list.filter((a: any) => a.status === 'active');
      else if (filter === 'closed') list = list.filter((a: any) => a.status === 'closed');
      else if (filter === 'completed') list = list.filter((a: any) => a.status === 'completed');
      setAuditions(list);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [filter]);

  return (
    <SafeAreaView style={styles.safe}>
      <Header title={filterLabel} navigation={navigation} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 40}} />
        ) : auditions.length === 0 ? (
          <EmptyState icon="🎭" title="No auditions found" />
        ) : auditions.map((a: any) => (
          <TouchableOpacity key={a._id || a.id} style={styles.card} activeOpacity={0.7} onPress={() => navigation.navigate('AuditionDetail', {auditionId: a._id || a.id})}>
            <View style={styles.cardHeader}>
              <Text style={styles.title} numberOfLines={1}>{a.title || 'Untitled'}</Text>
              <Badge label={a.status || 'active'} variant={a.status === 'active' ? 'success' : a.status === 'closed' ? 'warning' : 'info'} />
            </View>
            <Text style={styles.meta}>{a.location || 'Remote'} · {a.role || a.category || 'Acting'}</Text>
            <Text style={styles.meta}>Applications: {a.applicationsCount || 0}</Text>
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
