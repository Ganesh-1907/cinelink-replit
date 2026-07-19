import React, {useEffect, useState, useCallback} from 'react';
import {View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, ActivityIndicator} from 'react-native';
import api from '../src/api/client';
import auth from '@react-native-firebase/auth';
import {ADMIN_EMAIL} from '../src/api/config';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Button, Card, Chip, Badge, Avatar, EmptyState} from '../components/ui';

export default function AdminReportsScreen({navigation}: any) {
  const [tab, setTab] = useState<'reports' | 'users' | 'verifications'>('reports');
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      if (tab === 'reports') {
        const res = await api.get<{reports: any[]}>('/admin/reports');
        setReports(res.reports || []);
      } else if (tab === 'users') {
        const res = await api.get<{users: any[]}>('/admin/users');
        setUsers(res.users || []);
      } else {
        const res = await api.get<{requests: any[]}>('/admin/verification-requests');
        setVerifications(res.requests || []);
      }
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateReport = async (id: string, status: string) => {
    try { await api.put(`/admin/reports/${id}`, {status}); fetchData(); Alert.alert('✅ Updated'); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const toggleBan = async (userId: string) => {
    try { await api.post(`/admin/users/${userId}/ban`); fetchData(); Alert.alert('✅ Done'); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const approveVerification = async (id: string) => {
    try { await api.put(`/admin/verification-requests/${id}`, {status: 'approved'}); fetchData(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const rejectVerification = async (id: string) => {
    try { await api.put(`/admin/verification-requests/${id}`, {status: 'rejected'}); fetchData(); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="🛡️ Admin" navigation={navigation} />
      <View style={styles.tabRow}>
        {['reports','users','verifications'].map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.activeTab]} onPress={() => setTab(t as any)}>
            <Text style={[styles.tabText, tab === t && styles.activeTabText]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 40}} /> :
          tab === 'reports' && (reports.length === 0 ? <EmptyState icon="🚩" title="No reports" /> : reports.map((r: any) => (
            <Card key={r._id || r.id} variant="default" padding={Spacing.md} style={styles.card}>
              <View style={styles.cardHeader}><Badge label={r.status || 'pending'} variant={r.status === 'action_taken' ? 'success' : r.status === 'dismissed' ? 'error' : 'warning'} /><Text style={styles.reason}>{r.reason}</Text></View>
              {r.message ? <Text style={styles.detail}>{r.message}</Text> : null}
              {r.status === 'pending' && <View style={styles.actions}><Button label="⚡ Take Action" variant="primary" size="sm" style={{flex: 1}} onPress={() => updateReport(r._id || r.id, 'action_taken')} /><Button label="❌ Dismiss" variant="secondary" size="sm" style={{flex: 1}} onPress={() => updateReport(r._id || r.id, 'dismissed')} /></View>}
            </Card>
          )))}
        {tab === 'users' && users.map((u: any) => (
          <Card key={u._id || u.id} variant="default" padding={Spacing.md} style={styles.card}>
            <View style={styles.userRow}><Avatar name={u.fullName || u.email || 'User'} size="sm" /><View style={{flex: 1}}><Text style={styles.userName}>{u.fullName || 'User'}</Text><Text style={styles.userEmail}>{u.email || ''}</Text></View></View>
            <Text style={styles.rolesChip}>{u.role} {u.isAdmin ? '🛡️' : ''}</Text>
            <Button label="🚫 Toggle Ban" variant="danger" size="sm" onPress={() => toggleBan(u._id || u.id)} />
          </Card>
        ))}
        {tab === 'verifications' && verifications.map((v: any) => (
          <Card key={v._id || v.id} variant="default" padding={Spacing.md} style={styles.card}>
            <Text style={styles.userName}>{v.fullName || 'User'}</Text>
            <Text style={styles.meta}>Status: {v.status}</Text>
            {v.status === 'pending' && <View style={styles.actions}><Button label="✅ Approve" variant="success" size="sm" style={{flex: 1}} onPress={() => approveVerification(v._id || v.id)} /><Button label="❌ Reject" variant="danger" size="sm" style={{flex: 1}} onPress={() => rejectVerification(v._id || v.id)} /></View>}
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  tabRow: {flexDirection: 'row', marginHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md},
  tab: {flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.sm, backgroundColor: Colors.card},
  activeTab: {backgroundColor: Colors.primary},
  tabText: {color: Colors.textSecondary, ...Typography.label},
  activeTabText: {color: Colors.textPrimary, fontWeight: 'bold'},
  scroll: {padding: Spacing.lg, gap: Spacing.md},
  card: {marginBottom: Spacing.sm},
  cardHeader: {flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs},
  reason: {color: Colors.textPrimary, fontWeight: '600', flex: 1},
  detail: {color: Colors.textSecondary, fontSize: 13, marginBottom: Spacing.sm},
  actions: {flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm},
  userRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm},
  userName: {color: Colors.textPrimary, fontWeight: '600'},
  userEmail: {color: Colors.textSecondary, fontSize: 12},
  rolesChip: {color: Colors.primary, fontSize: 13, marginBottom: Spacing.sm},
  meta: {color: Colors.textSecondary, fontSize: 13, marginBottom: Spacing.sm},
});
