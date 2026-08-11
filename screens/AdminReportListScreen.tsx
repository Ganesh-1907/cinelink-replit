import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator} from 'react-native';
import api from '../src/api/client';
import {Colors, Spacing, Radius} from '../src/theme';
import {Header, Badge, Button, EmptyState} from '../components/ui';
import {useApp} from '../src/context/AppContext';

export default function AdminReportListScreen({route, navigation}: any) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const filter = route?.params?.filter || 'all';
  const {user} = useApp();

  const filterLabel = filter === 'pending' ? 'Pending Reports' : 'All Reports';

  const reportContentTypes: Record<string, string> = {
    auditionId: 'Audition', filmId: 'Short Film', contestId: 'Contest', reelId: 'Reel',
  };

  useEffect(() => {
    if (!user) return;
    api.get<{reports: any[]}>('/admin/reports').then(res => {
      let list = res.reports || [];
      if (filter === 'pending') list = list.filter((r: any) => r.status === 'pending');
      setReports(list);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [filter, user]);

  return (
    <SafeAreaView style={styles.safe}>
      <Header title={filterLabel} navigation={navigation} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 40}} />
        ) : reports.length === 0 ? (
          <EmptyState icon="⚠️" title="No reports found" />
        ) : reports.map((r: any) => {
          const contentKey = r.auditionId ? 'auditionId' : r.filmId ? 'filmId' : r.contestId ? 'contestId' : r.reelId ? 'reelId' : r.reportedUserId ? 'reportedUserId' : null;
          const contentType = contentKey ? reportContentTypes[contentKey] || 'Content' : 'Content';
          return (
          <View key={r._id || r.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Badge label={contentType} variant="info" />
              <Badge label={r.status || 'pending'} variant={r.status === 'action_taken' ? 'success' : r.status === 'dismissed' ? 'error' : 'warning'} />
            </View>
            <Text style={styles.reason}><Text style={{fontWeight: '800'}}>Reason:</Text> {r.reason}</Text>
            {r.message ? <Text style={styles.detail}>{r.message}</Text> : null}
            <TouchableOpacity onPress={() => { if (r.userId) navigation.navigate('PublicProfile', {userId: r.userId}); }}>
              <Text style={styles.reporterText}>👤 {r.reporterName || r.reporterEmail || 'Unknown'}</Text>
            </TouchableOpacity>
            {(r.auditionId || r.filmId || r.contestId) ? (
              <TouchableOpacity style={{marginBottom: Spacing.sm}} onPress={() => {
                if (r.auditionId) navigation.navigate('AuditionDetail', {auditionId: r.auditionId});
                else if (r.filmId) navigation.navigate('FilmDetail', {film: {id: r.filmId}});
                else if (r.contestId) navigation.navigate('ContestDetail', {contestId: r.contestId});
              }}>
                <Text style={styles.linkText}>🔗 View {contentType}</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={styles.dateText}>Reported: {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'}) : ''}</Text>
          </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  scroll: {padding: Spacing.md},
  card: {backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight},
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs},
  reason: {color: Colors.textPrimary, fontWeight: '600', fontSize: 13, marginBottom: Spacing.xs},
  detail: {color: Colors.textSecondary, fontSize: 13, marginBottom: Spacing.sm},
  reporterText: {color: Colors.primary, fontSize: 12, marginBottom: Spacing.sm, fontWeight: '600'},
  linkText: {color: Colors.primary, fontSize: 13, fontWeight: '600'},
  dateText: {color: Colors.textTertiary, fontSize: 11},
});
