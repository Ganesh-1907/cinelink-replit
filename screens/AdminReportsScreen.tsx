import React, {useEffect, useState, useCallback} from 'react';
import {View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, ActivityIndicator} from 'react-native';
import api from '../src/api/client';
import {useApp} from '../src/context/AppContext';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Button, Card, Chip, Badge, Avatar, EmptyState} from '../components/ui';

export default function AdminReportsScreen({navigation}: any) {
  const [tab, setTab] = useState<'reports' | 'users' | 'verifications' | 'casting'>('reports');
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [castingRequests, setCastingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const {isAdmin, user} = useApp();

  useEffect(() => {
    if (!user || !isAdmin) {
      Alert.alert('Access Denied', 'You do not have admin privileges.', [
        {text: 'Go Back', onPress: () => navigation.goBack()},
      ]);
      setAuthorized(false);
      return;
    }
    setAuthorized(true);
  }, [navigation, isAdmin]);

  const fetchData = useCallback(async () => {
    if (!authorized) return;
    setLoading(true);
    try {
      if (tab === 'reports') {
        const res = await api.get<{reports: any[]}>('/admin/reports');
        setReports(res.reports || []);
      } else if (tab === 'users') {
        const res = await api.get<{users: any[]}>('/admin/users');
        setUsers(res.users || []);
      } else if (tab === 'verifications') {
        const res = await api.get<{requests: any[]}>('/admin/verification-requests');
        setVerifications(res.requests || []);
      } else if (tab === 'casting') {
        const res = await api.get<{requests: any[]}>('/admin/casting-requests');
        setCastingRequests(res.requests || []);
      }
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  }, [tab, authorized]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateReport = async (id: string, status: string) => {
    try { await api.put(`/admin/reports/${id}`, {status}); fetchData(); Alert.alert('✅ Updated'); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const toggleBan = async (userId: string) => {
    try { await api.post(`/admin/users/${userId}/ban`); Alert.alert('✅ Done'); }
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

  const updateCastingRequest = async (id: string, newStatus: string, userEmail: string) => {
    try {
      await api.put(`/admin/casting-requests/${id}`, {status: newStatus});
      Alert.alert(
        newStatus === 'approved' ? '✅ Approved' : '❌ Rejected',
        `${userEmail} has been ${newStatus === 'approved' ? 'approved as a Casting Director' : 'rejected'}.`,
      );
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const formatDate = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'});
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="🛡️ Admin" navigation={navigation} />
      {authorized === false ? (
        <View style={styles.unauthorized}>
          <Text style={styles.unauthorizedIcon}>🔒</Text>
          <Text style={styles.unauthorizedText}>Access Denied</Text>
          <Text style={styles.unauthorizedSub}>Admin privileges required</Text>
        </View>
      ) : (
      <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScrollOuter} contentContainerStyle={styles.tabRow}>
        {(['reports', 'users', 'verifications', 'casting'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.activeTab]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.activeTabText]}>
              {t === 'reports' ? '🚩 Reports' : t === 'users' ? '👥 Users' : t === 'verifications' ? '✅ Verifications' : '🎬 Casting'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
            <View style={styles.userMetaRow}>
              <Chip label={u.role || 'Actor'} />
              {u.isApprovedDirector ? <Chip label="🎬 Director" /> : null}
              {u.isAdmin ? <Chip label="🛡️ Admin" /> : null}
              {u.banned ? <Chip label="🚫 Banned" /> : null}
            </View>
            <View style={styles.actions}>
              {u.banned ? (
                <Button label="✅ Unban" variant="success" size="sm" style={{flex: 1}} onPress={() => toggleBan(u._id || u.id).then(fetchData)} />
              ) : (
                <Button label="🚫 Ban" variant="danger" size="sm" style={{flex: 1}} onPress={() => toggleBan(u._id || u.id).then(fetchData)} />
              )}
              {!u.isApprovedDirector && (
                <Button label="🎬 Make Director" variant="primary" size="sm" style={{flex: 1}} onPress={async () => {
                  try { await api.put(`/admin/users/${u._id || u.id}`, {isApprovedDirector: true, role: 'Director'}); fetchData(); Alert.alert('✅ Approved', `${u.email} is now a Casting Director.`); }
                  catch (e: any) { Alert.alert('Error', e.message); }
                }} />
              )}
            </View>
          </Card>
        ))}
        {tab === 'verifications' && verifications.map((v: any) => (
          <Card key={v._id || v.id} variant="default" padding={Spacing.md} style={styles.card}>
            <Text style={styles.userName}>{v.fullName || 'User'}</Text>
            <Text style={styles.meta}>Status: {v.status}</Text>
            {v.status === 'pending' && <View style={styles.actions}><Button label="✅ Approve" variant="success" size="sm" style={{flex: 1}} onPress={() => approveVerification(v._id || v.id)} /><Button label="❌ Reject" variant="danger" size="sm" style={{flex: 1}} onPress={() => rejectVerification(v._id || v.id)} /></View>}
          </Card>
        ))}
        {tab === 'casting' && (castingRequests.length === 0 ? <EmptyState icon="🎬" title="No casting director requests" subtitle="When directors apply, they'll appear here" /> : castingRequests.map((cr: any) => (
          <Card key={cr.id} variant="default" padding={Spacing.md} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.userName}>{cr.userName || cr.userEmail}</Text>
              <Badge label={cr.status || 'pending'} variant={cr.status === 'approved' ? 'success' : cr.status === 'rejected' ? 'error' : 'warning'} />
            </View>
            <Text style={styles.userEmail}>{cr.userEmail}</Text>
            {cr.companyName ? <Text style={styles.meta}>🏢 {cr.companyName}</Text> : null}
            {cr.yearsExperience ? <Text style={styles.meta}>📅 {cr.yearsExperience} years experience</Text> : null}
            {cr.message ? <Text style={styles.detail}>{cr.message}</Text> : null}
            {cr.phone ? <Text style={styles.meta}>📱 {cr.phone}</Text> : null}
            {cr.idProofUrl ? (
              <TouchableOpacity onPress={() => navigation.navigate('ImageViewer', {imageUrl: cr.idProofUrl})} style={styles.linkRow}>
                <Text style={styles.linkText}>🆔 View ID Proof</Text>
              </TouchableOpacity>
            ) : null}
            {cr.portfolio ? <Text style={styles.meta}>🔗 {cr.portfolio}</Text> : null}
            <Text style={styles.meta}>Applied: {formatDate(cr.createdAt)}</Text>
            {cr.status === 'pending' && (
              <View style={styles.actions}>
                <Button label="✅ Approve" variant="success" size="sm" style={{flex: 1}} onPress={() => updateCastingRequest(cr._id || cr.id, 'approved', cr.userEmail)} />
                <Button label="❌ Reject" variant="danger" size="sm" style={{flex: 1}} onPress={() => updateCastingRequest(cr._id || cr.id, 'rejected', cr.userEmail)} />
              </View>
            )}
          </Card>
        )))}
      </ScrollView>
      </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  tabScrollOuter: {marginBottom: Spacing.md, maxHeight: 50},
  tabRow: {flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm},
  tab: {paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.sm, backgroundColor: Colors.card},
  activeTab: {backgroundColor: Colors.primary},
  tabText: {color: Colors.textSecondary, ...Typography.label, fontSize: 12},
  activeTabText: {color: Colors.textPrimary, fontWeight: 'bold'},
  scroll: {padding: Spacing.lg, gap: Spacing.md},
  card: {marginBottom: Spacing.sm},
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs},
  reason: {color: Colors.textPrimary, fontWeight: '600', flex: 1},
  detail: {color: Colors.textSecondary, fontSize: 13, marginBottom: Spacing.sm},
  actions: {flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm},
  userRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm},
  userMetaRow: {flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm, flexWrap: 'wrap'},
  userName: {color: Colors.textPrimary, fontWeight: '600'},
  userEmail: {color: Colors.textSecondary, fontSize: 12},
  rolesChip: {color: Colors.primary, fontSize: 13, marginBottom: Spacing.sm},
  meta: {color: Colors.textSecondary, fontSize: 13, marginBottom: Spacing.xs},
  linkRow: {paddingVertical: Spacing.xs, marginBottom: Spacing.xs},
  linkText: {color: Colors.primary, fontSize: 13, fontWeight: '600'},
  unauthorized: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg},
  unauthorizedIcon: {fontSize: 48, marginBottom: Spacing.md},
  unauthorizedText: {color: Colors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: Spacing.xs},
  unauthorizedSub: {color: Colors.textSecondary, fontSize: 14},
});
