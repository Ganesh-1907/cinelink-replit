import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, RefreshControl} from 'react-native';
import api from '../src/api/client';
import {useApp} from '../src/context/AppContext';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Button, Card, Chip, Badge, EmptyState, LoadingView, Avatar} from '../components/ui';

export default function DirectorDashboardScreen({navigation}: any) {
  const {isAdmin, isApprovedDirector, user} = useApp();
  const [auditions, setAuditions] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedAudition, setSelectedAudition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

  useEffect(() => {
    if (!isAdmin && !isApprovedDirector) {
      Alert.alert('Access Denied', 'Only approved directors can access the dashboard.', [
        {text: 'Go Back', onPress: () => navigation.goBack()},
      ]);
    } else {
      setAccessChecked(true);
    }
  }, [isAdmin, isApprovedDirector, navigation]);

  const fetchData = useCallback(async () => {
    if (!accessChecked) return;
    try {
      const res = await api.get<{auditions: any[]}>('/auditions');
      setAuditions((res.auditions || []).filter((a: any) => (a.postedById || a.directorId) === user?.uid));
      if (selectedAudition) {
        const appRes = await api.get<any>(`/applications/${selectedAudition._id || selectedAudition.id}`);
        setApplications(appRes.applications || []);
      }
    } catch (e) { console.log(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [selectedAudition, user, accessChecked]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (appId: string, status: string) => {
    try {
      await api.put(`/applications/${appId}/status`, {status});
      fetchData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="🎬 Director Dashboard" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}>
        {loading ? <LoadingView /> : auditions.length === 0 ? (
          <EmptyState icon="🎭" title="No auditions posted" subtitle="Post an audition to see applications here" actionLabel="Post Audition" onAction={() => navigation.navigate('PostAudition')} />
        ) : (
          <>
            <Text style={styles.heading}>Your Auditions ({auditions.length})</Text>
            {auditions.map(a => (
              <TouchableOpacity key={a._id || a.id} onPress={() => setSelectedAudition(a)}>
                <Card variant={selectedAudition?._id === a._id || selectedAudition?.id === a.id ? 'elevated' : 'default'} padding={Spacing.md} style={styles.audCard}>
                  <View style={styles.audRow}><Text style={styles.audTitle}>{a.title}</Text><Badge label={`${a.applicationsCount || 0} apps`} variant="info" /></View>
                  <Text style={styles.audMeta}>{a.location || ''} {a.role ? `• ${a.role}` : ''}</Text>
                </Card>
              </TouchableOpacity>
            ))}
            {selectedAudition && (
              <>
                <Text style={styles.heading}>Applications ({applications.length})</Text>
                {applications.length === 0 ? <Text style={styles.emptyText}>No applications yet</Text> : applications.map((app: any) => (
                  <Card key={app._id || app.id} variant="default" padding={Spacing.md} style={styles.appCard}>
                    <View style={styles.appHeader}>
                      <Avatar name={app.userName || 'User'} size="sm" uri={app.userPhoto} />
                      <View style={styles.appInfo}><Text style={styles.appName}>{app.userName || 'Applicant'}</Text><Text style={styles.appEmail}>{app.userEmail || ''}</Text></View>
                      <Badge label={app.status} variant={app.status === 'selected' ? 'success' : app.status === 'rejected' ? 'error' : 'warning'} />
                    </View>
                    {app.note ? <Text style={styles.appNote}>"{app.note}"</Text> : null}
                    {app.status === 'pending' && (
                      <View style={styles.appActions}>
                        <Button label="✅ Select" variant="success" size="sm" style={{flex: 1}} onPress={() => updateStatus(app._id || app.id, 'selected')} />
                        <Button label="📋 Shortlist" variant="info" size="sm" style={{flex: 1}} onPress={() => updateStatus(app._id || app.id, 'shortlisted')} />
                        <Button label="❌ Reject" variant="danger" size="sm" style={{flex: 0.6}} onPress={() => updateStatus(app._id || app.id, 'rejected')} />
                      </View>
                    )}
                  </Card>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  scroll: {padding: Spacing.lg, gap: Spacing.md},
  heading: {color: Colors.textPrimary, fontWeight: 'bold', fontSize: 18, marginTop: Spacing.md},
  audCard: {marginBottom: Spacing.sm},
  audRow: {flexDirection: 'row', justifyContent: 'space-between'},
  audTitle: {color: Colors.textPrimary, fontWeight: '600', fontSize: 15, flex: 1},
  audMeta: {color: Colors.textSecondary, fontSize: 13, marginTop: 2},
  appCard: {marginBottom: Spacing.sm},
  appHeader: {flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', marginBottom: Spacing.sm},
  appInfo: {flex: 1},
  appName: {color: Colors.textPrimary, fontWeight: '600'},
  appEmail: {color: Colors.textSecondary, fontSize: 12},
  appNote: {color: Colors.textSecondary, fontStyle: 'italic', marginBottom: Spacing.sm, fontSize: 13},
  appActions: {flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm},
  emptyText: {color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.lg},
});
