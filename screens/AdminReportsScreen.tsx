import React, {useEffect, useState} from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import api from '../src/api/client';
import {useApp} from '../src/context/AppContext';
import {Colors, Spacing, Radius} from '../src/theme';
import {Header, Button, Chip, Badge, Avatar, EmptyState, PopupModal} from '../components/ui';

type TabKey = 'stats' | 'reports' | 'users' | 'verifications' | 'casting';

export default function AdminReportsScreen({navigation}: any) {
  const [tab, setTab] = useState<TabKey>('stats');
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [castingRequests, setCastingRequests] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [tabLoading, setTabLoading] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [searchText, setSearchText] = useState('');
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<any>(null);
  const [verifyConfirm, setVerifyConfirm] = useState<any>(null);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [castingConfirm, setCastingConfirm] = useState<any>(null);
  const [castingEmail, setCastingEmail] = useState('');
  const {isAdmin, user} = useApp();

  useEffect(() => {
    if (!user || !isAdmin) {
      Alert.alert('Access Denied', 'You do not have admin privileges.', [{text: 'Go Back', onPress: () => navigation.goBack()}]);
      setAuthorized(false);
      return;
    }
    setAuthorized(true);
  }, [navigation, isAdmin, user]);

  const loadTabData = async (tabKey: TabKey) => {
    setTabLoading(true);
    try {
      if (tabKey === 'stats') {
        const res = await api.get<any>('/admin/stats');
        setStats(res.stats || res);
      } else if (tabKey === 'reports') {
        const res = await api.get<{reports: any[]}>('/admin/reports');
        setReports(res.reports || []);
      } else if (tabKey === 'users') {
        const res = await api.get<{users: any[]}>('/admin/users');
        setUsers(res.users || []);
      } else if (tabKey === 'verifications') {
        const res = await api.get<{requests: any[]}>('/admin/verification-requests');
        setVerifications(res.requests || []);
      } else if (tabKey === 'casting') {
        const res = await api.get<{requests: any[]}>('/admin/casting-requests');
        setCastingRequests(res.requests || []);
      }
    } catch (e) { console.log(e); }
    finally { setTabLoading(false); }
  };

  useEffect(() => {
    if (!authorized) return;
    setSearchText('');
    loadTabData(tab);
  }, [tab, authorized]);

  const switchTab = (t: TabKey) => {
    setTab(t);
  };

  const refreshAfterAction = () => loadTabData(tab);

  const updateReport = async (id: string, status: string) => {
    try {
      await api.put(`/admin/reports/${id}`, {status});
      refreshAfterAction();
      Alert.alert('✅ Updated');
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const openVerifyConfirm = (id: string, userEmail: string, action: string, label: string) => {
    setVerifyConfirm({id, userEmail, action, actionLabel: label});
    setVerifyEmail('');
  };

  const executeVerifyConfirm = async () => {
    if (!verifyConfirm) return;
    if (verifyEmail.toLowerCase().trim() !== verifyConfirm.userEmail.toLowerCase().trim()) {
      Alert.alert('❌ Email Mismatch');
      return;
    }
    try {
      await api.put(`/admin/verification-requests/${verifyConfirm.id}`, {status: verifyConfirm.action});
      refreshAfterAction();
    } catch (e: any) { Alert.alert('Error', e.message); }
    setVerifyConfirm(null);
  };

  const openCastingConfirm = (id: string, userEmail: string, status: string, label: string) => {
    setCastingConfirm({id, userEmail, status, actionLabel: label});
    setCastingEmail('');
  };

  const executeCastingConfirm = async () => {
    if (!castingConfirm) return;
    if (castingEmail.toLowerCase().trim() !== castingConfirm.userEmail.toLowerCase().trim()) {
      Alert.alert('❌ Email Mismatch');
      return;
    }
    try {
      await api.put(`/admin/casting-requests/${castingConfirm.id}`, {status: castingConfirm.status});
      refreshAfterAction();
    } catch (e: any) { Alert.alert('Error', e.message); }
    setCastingConfirm(null);
  };

  const openConfirm = (userId: string, userEmail: string, action: string, actionLabel: string) => {
    setConfirmTarget({userId, userEmail, action, actionLabel});
    setConfirmEmail('');
    setConfirmVisible(true);
  };

  const executeConfirmed = async () => {
    if (!confirmTarget || confirmEmail.toLowerCase().trim() !== confirmTarget.userEmail.toLowerCase().trim()) {
      Alert.alert('❌ Email Mismatch');
      return;
    }
    try {
      const {userId, action} = confirmTarget;
      if (action === 'ban' || action === 'unban') await api.post(`/admin/users/${userId}/ban`);
      else if (action === 'director') await api.put(`/admin/users/${userId}`, {isApprovedDirector: true, role: 'Director'});
      else if (action === 'admin') await api.put(`/admin/users/${userId}`, {role: 'Admin', isAdmin: true});
      Alert.alert('✅ Done');
      refreshAfterAction();
    } catch (e: any) { Alert.alert('Error', e.message); }
    setConfirmVisible(false);
  };

  const tabs = [
    {key: 'stats' as TabKey, icon: '📊', label: 'Stats'},
    {key: 'reports' as TabKey, icon: '⚠️', label: 'Reports'},
    {key: 'users' as TabKey, icon: '👥', label: 'Users'},
    {key: 'verifications' as TabKey, icon: '✅', label: 'Verify'},
    {key: 'casting' as TabKey, icon: '🎬', label: 'Casting'},
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Admin" navigation={navigation} />
      {authorized === false ? (
        <View style={styles.unauthorized}>
          <Text style={styles.unauthorizedIcon}>🔒</Text>
          <Text style={styles.unauthorizedText}>Access Denied</Text>
          <Text style={styles.unauthorizedSub}>Admin privileges required</Text>
        </View>
      ) : (
        <>
          <View style={styles.tabRow}>
            {tabs.map(t => (
              <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.activeTab]} onPress={() => switchTab(t.key)}>
                <Text style={styles.tabIcon}>{t.icon}</Text>
                <Text style={[styles.tabText, tab === t.key && styles.activeTabText]} numberOfLines={1}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={{flex: 1}} contentContainerStyle={{paddingBottom: Spacing['4xl']}} showsVerticalScrollIndicator={false}>

          <View key={tab}>
            {tabLoading ? <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 40}} /> :
             tab === 'stats' ? (
              <View style={styles.statsWrap}>
                <View style={styles.statsCard}>
                  <Text style={styles.statsHeading}>👥 Users</Text>
                  <View style={styles.statsGrid}>
                    <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('AdminUserList', {filter: 'all'})}><Text style={styles.statVal}>{stats?.users?.total || 0}</Text><Text style={styles.statKey}>Total</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('AdminUserList', {filter: 'admins'})}><Text style={styles.statVal}>{stats?.users?.admins || 0}</Text><Text style={styles.statKey}>Admins</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('AdminUserList', {filter: 'directors'})}><Text style={styles.statVal}>{stats?.users?.directors || 0}</Text><Text style={styles.statKey}>Directors</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('AdminUserList', {filter: 'actors'})}><Text style={styles.statVal}>{stats?.users?.actors || 0}</Text><Text style={styles.statKey}>Actors</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('AdminUserList', {filter: 'banned'})}><Text style={[styles.statVal, {color: Colors.error}]}>{stats?.users?.banned || 0}</Text><Text style={[styles.statKey, {color: Colors.error}]}>Banned</Text></TouchableOpacity>
                  </View>
                </View>
                <View style={styles.statsCard}>
                  <Text style={styles.statsHeading}>🎭 Auditions</Text>
                  <View style={styles.statsGrid}>
                    <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('AdminAuditionList', {filter: 'all'})}><Text style={styles.statVal}>{stats?.auditions?.total || 0}</Text><Text style={styles.statKey}>Total</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('AdminAuditionList', {filter: 'active'})}><Text style={[styles.statVal, {color: Colors.success}]}>{stats?.auditions?.active || 0}</Text><Text style={[styles.statKey, {color: Colors.success}]}>Active</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('AdminAuditionList', {filter: 'closed'})}><Text style={[styles.statVal, {color: Colors.warning}]}>{stats?.auditions?.closed || 0}</Text><Text style={[styles.statKey, {color: Colors.warning}]}>Closed</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('AdminAuditionList', {filter: 'completed'})}><Text style={[styles.statVal, {color: Colors.primary}]}>{stats?.auditions?.completed || 0}</Text><Text style={[styles.statKey, {color: Colors.primary}]}>Completed</Text></TouchableOpacity>
                  </View>
                </View>
                <View style={styles.statsCard}>
                  <Text style={styles.statsHeading}>🏆 Contests</Text>
                  <View style={styles.statsGrid}>
                    <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('AdminContestList', {filter: 'all'})}><Text style={styles.statVal}>{stats?.contests?.total || 0}</Text><Text style={styles.statKey}>Total</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('AdminContestList', {filter: 'active'})}><Text style={[styles.statVal, {color: Colors.success}]}>{stats?.contests?.active || 0}</Text><Text style={[styles.statKey, {color: Colors.success}]}>Active</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('AdminContestList', {filter: 'closed'})}><Text style={[styles.statVal, {color: Colors.warning}]}>{stats?.contests?.closed || 0}</Text><Text style={[styles.statKey, {color: Colors.warning}]}>Closed</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('AdminContestList', {filter: 'cancelled'})}><Text style={[styles.statVal, {color: Colors.error}]}>{stats?.contests?.cancelled || 0}</Text><Text style={[styles.statKey, {color: Colors.error}]}>Cancelled</Text></TouchableOpacity>
                  </View>
                </View>
                <View style={styles.statsCard}>
                  <Text style={styles.statsHeading}>🎬 Films</Text>
                  <View style={styles.statsGrid}>
                    <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('AdminFilmList')}><Text style={styles.statVal}>{stats?.films?.total || 0}</Text><Text style={styles.statKey}>Total</Text></TouchableOpacity>
                  </View>
                </View>
                <View style={styles.statsCard}>
                  <Text style={styles.statsHeading}>🚩 Reports</Text>
                  <View style={styles.statsGrid}>
                    <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('AdminReportList', {filter: 'all'})}><Text style={styles.statVal}>{stats?.reports?.total || 0}</Text><Text style={styles.statKey}>Total</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.statBox} onPress={() => navigation.navigate('AdminReportList', {filter: 'pending'})}><Text style={[styles.statVal, {color: Colors.error}]}>{stats?.reports?.pending || 0}</Text><Text style={[styles.statKey, {color: Colors.error}]}>Pending</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
             )
             : tab === 'reports' ? reports.length === 0 ? <EmptyState icon="⚠️" title="No reports" /> :
             reports.map((r: any) => {
               const ck = r.auditionId ? 'auditionId' : r.filmId ? 'filmId' : r.contestId ? 'contestId' : r.reelId ? 'reelId' : r.reportedUserId ? 'reportedUserId' : null;
               const ct = ck ? ({auditionId:'Audition',filmId:'Short Film',contestId:'Contest',reelId:'Reel'} as any)[ck] || 'Content' : 'Content';
               return <View key={r._id||r.id} style={styles.card}>
                 <View style={styles.cardHeader}><Badge label={ct} variant="info" /><Badge label={r.status||'pending'} variant={r.status==='action_taken'?'success':r.status==='dismissed'?'error':'warning'} /></View>
                 <Text style={styles.reason}><Text style={{fontWeight:'800'}}>Reason:</Text> {r.reason}</Text>
                 {r.message?<Text style={styles.detail}>{r.message}</Text>:null}
                 <View style={{flexDirection:'row',gap:Spacing.sm,marginBottom:r.status==='pending'?Spacing.sm:0}}>
                   <TouchableOpacity style={[styles.reportActionBtn,{backgroundColor:Colors.primaryFaint,borderColor:Colors.primaryMid}]} onPress={()=>{if(r.userId)navigation.navigate('PublicProfile',{userId:r.userId})}}><Text style={[styles.reportActionBtnText,{color:Colors.primary}]}>👤 View Reporter</Text></TouchableOpacity>
                   {(r.auditionId||r.filmId||r.contestId)?<TouchableOpacity style={[styles.reportActionBtn,{backgroundColor:Colors.infoFaint,borderColor:Colors.infoBorder}]} onPress={()=>{if(r.auditionId)navigation.navigate('AuditionDetail',{auditionId:r.auditionId});else if(r.filmId)navigation.navigate('FilmDetail',{film:{id:r.filmId}});else if(r.contestId)navigation.navigate('ContestDetail',{contestId:r.contestId})}}><Text style={[styles.reportActionBtnText,{color:Colors.info}]}>🔗 View {ct}</Text></TouchableOpacity>:null}
                 </View>
                 {r.status==='pending'?<View style={styles.actions}><Button label="⚡ Take Action" variant="primary" size="sm" style={styles.flex1} onPress={()=>updateReport(r._id||r.id,'action_taken')} /><Button label="❌ Dismiss" variant="secondary" size="sm" style={styles.flex1} onPress={()=>updateReport(r._id||r.id,'dismissed')} /></View>:null}
               </View>;
             })
             : tab === 'users' ? users.length === 0 ? <EmptyState icon="👥" title="No users" /> :
             users.map((u: any) => {
               const d = u.role==='Director'||u.isApprovedDirector;
               const a = u.role==='Admin'||u.isAdmin;
               const uid = u._id||u.id; const ue = u.email||'';
               return <TouchableOpacity key={uid} style={styles.userCard} activeOpacity={0.7} onPress={()=>navigation.navigate('PublicProfile',{userId:uid})}>
                 <View style={styles.userTopRow}><Avatar name={u.fullName||ue||'U'} size="md" /><View style={styles.userInfo}><View style={styles.userNameRow}><Text style={styles.userName} numberOfLines={1}>{u.fullName||'User'}</Text><Chip label={u.role||'Actor'} /></View><Text style={styles.userEmail} numberOfLines={1}>{ue}</Text></View></View>
                 <View style={styles.actionRow}>
                   {u.banned?<TouchableOpacity style={[styles.actionBtn,styles.unbanBtn]} onPress={()=>openConfirm(uid,ue,'unban','Unban')}><Text style={[styles.actionBtnText,{color:Colors.success}]}>Unban</Text></TouchableOpacity>:<TouchableOpacity style={[styles.actionBtn,styles.banBtn]} onPress={()=>openConfirm(uid,ue,'ban','Ban')}><Text style={[styles.actionBtnText,{color:Colors.error}]}>Ban</Text></TouchableOpacity>}
                   {!d?<TouchableOpacity style={[styles.actionBtn,styles.directorBtn]} onPress={()=>openConfirm(uid,ue,'director','Make Director')}><Text style={[styles.actionBtnText,{color:Colors.warning}]}>Director</Text></TouchableOpacity>:<View style={[styles.actionBtn,styles.badgeBtn]}><Text style={[styles.actionBtnText,{color:Colors.warning}]}>✓ Director</Text></View>}
                   {!a?<TouchableOpacity style={[styles.actionBtn,styles.adminActionBtn]} onPress={()=>openConfirm(uid,ue,'admin','Make Admin')}><Text style={[styles.actionBtnText,{color:Colors.success}]}>Admin</Text></TouchableOpacity>:<View style={[styles.actionBtn,styles.badgeBtn]}><Text style={[styles.actionBtnText,{color:Colors.success}]}>✓ Admin</Text></View>}
                 </View>
               </TouchableOpacity>;
             })
             : tab === 'verifications' ? verifications.length === 0 ? <EmptyState icon="✅" title="No verification requests" /> :
             verifications.map((v: any) => <View key={v._id||v.id} style={styles.userCard}>
               <View style={styles.userTopRow}><Avatar name={v.fullName||v.email||'U'} size="md" /><View style={styles.userInfo}><View style={styles.userNameRow}><Text style={styles.userName} numberOfLines={1}>{v.fullName||v.userName||'User'}</Text><Badge label={v.status||'pending'} variant={v.status==='approved'?'success':v.status==='rejected'?'error':'warning'} /></View><Text style={styles.userEmail} numberOfLines={1}>{v.email||''}</Text></View></View>
               {v.status==='pending'?<View style={styles.actionRow}><TouchableOpacity style={[styles.actionBtn,{backgroundColor:Colors.successFaint,borderColor:Colors.successBorder}]} onPress={()=>openVerifyConfirm(v._id||v.id,v.email||'','approved','Approve Verification')}><Text style={[styles.actionBtnText,{color:Colors.success}]}>✅ Approve</Text></TouchableOpacity><TouchableOpacity style={[styles.actionBtn,{backgroundColor:Colors.errorFaint,borderColor:Colors.errorBorder}]} onPress={()=>openVerifyConfirm(v._id||v.id,v.email||'','rejected','Reject Verification')}><Text style={[styles.actionBtnText,{color:Colors.error}]}>❌ Reject</Text></TouchableOpacity></View>:null}
             </View>)
             : tab === 'casting' ? castingRequests.length === 0 ? <EmptyState icon="🎬" title="No casting director requests" subtitle="When directors apply, they'll appear here" /> :
             castingRequests.map((cr: any) => <View key={cr._id||cr.id} style={styles.userCard}>
               <View style={styles.userTopRow}><Avatar name={cr.userName||cr.userEmail||'U'} size="md" /><View style={styles.userInfo}><View style={styles.userNameRow}><Text style={styles.userName} numberOfLines={1}>{cr.userName||cr.userEmail}</Text><Badge label={cr.status||'pending'} variant={cr.status==='approved'?'success':cr.status==='rejected'?'error':'warning'} /></View><Text style={styles.userEmail} numberOfLines={1}>{cr.userEmail}</Text>{cr.companyName?<Text style={styles.meta}>🏢 {cr.companyName}</Text>:null}{cr.yearsExperience?<Text style={styles.meta}>📅 {cr.yearsExperience} years experience</Text>:null}{cr.message?<Text style={styles.detail}>{cr.message}</Text>:null}{cr.phone?<Text style={styles.meta}>📱 {cr.phone}</Text>:null}{cr.idProofUrl?<TouchableOpacity onPress={()=>navigation.navigate('ImageViewer',{imageUrl:cr.idProofUrl})} style={styles.linkRow}><Text style={styles.linkText}>🆔 View ID Proof</Text></TouchableOpacity>:null}{cr.portfolio?<Text style={styles.meta}>🔗 {cr.portfolio}</Text>:null}</View></View>
               <Text style={[styles.meta,{marginTop:4}]}>Applied: {cr.createdAt?new Date(cr.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):''}</Text>
               {cr.status==='pending'?<View style={styles.actionRow}><TouchableOpacity style={[styles.actionBtn,{backgroundColor:Colors.successFaint,borderColor:Colors.successBorder}]} onPress={()=>openCastingConfirm(cr._id||cr.id,cr.userEmail,'approved','Approve Casting Director')}><Text style={[styles.actionBtnText,{color:Colors.success}]}>✅ Approve</Text></TouchableOpacity><TouchableOpacity style={[styles.actionBtn,{backgroundColor:Colors.errorFaint,borderColor:Colors.errorBorder}]} onPress={()=>openCastingConfirm(cr._id||cr.id,cr.userEmail,'rejected','Reject Casting Director')}><Text style={[styles.actionBtnText,{color:Colors.error}]}>❌ Reject</Text></TouchableOpacity></View>:null}
             </View>)
              : null}
          </View>
          {tab === 'users' && (
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput style={styles.searchInput} placeholder="Search by name, email, or role..." placeholderTextColor={Colors.textTertiary} value={searchText} onChangeText={setSearchText} />
              {searchText.length > 0 && <TouchableOpacity onPress={() => setSearchText('')}><Text style={styles.searchClear}>✕</Text></TouchableOpacity>}
            </View>
          )}

          </ScrollView>

          <PopupModal visible={confirmVisible} onClose={() => setConfirmVisible(false)}
            variant={confirmTarget?.action === 'ban' ? 'ban' : confirmTarget?.action === 'unban' ? 'success' : 'confirm'}
            title={confirmTarget?.actionLabel || 'Confirm Action'}
            message={`Type "${confirmTarget?.userEmail}" to confirm this action.`}
            confirmLabel="Confirm" cancelLabel="Cancel"
            confirmVariant={confirmTarget?.action === 'ban' ? 'danger' : 'primary'}
            confirmDisabled={confirmEmail.toLowerCase().trim() !== (confirmTarget?.userEmail || '').toLowerCase().trim()}
            onConfirm={executeConfirmed} onCancel={() => setConfirmVisible(false)}>
            <TextInput style={styles.confirmInput} placeholder="Enter email to confirm..." placeholderTextColor={Colors.textTertiary} value={confirmEmail} onChangeText={setConfirmEmail} autoCapitalize="none" autoCorrect={false} />
          </PopupModal>

          <PopupModal visible={!!verifyConfirm} onClose={() => setVerifyConfirm(null)}
            variant={verifyConfirm?.action === 'approved' ? 'success' : 'ban'}
            title={verifyConfirm?.actionLabel || 'Confirm'} message={`Type "${verifyConfirm?.userEmail}" to confirm.`}
            confirmLabel="Confirm" cancelLabel="Cancel"
            confirmVariant={verifyConfirm?.action === 'approved' ? 'success' : 'danger'}
            confirmDisabled={verifyEmail.toLowerCase().trim() !== (verifyConfirm?.userEmail || '').toLowerCase().trim()}
            onConfirm={executeVerifyConfirm} onCancel={() => setVerifyConfirm(null)}>
            <TextInput style={styles.confirmInput} placeholder="Enter email to confirm..." placeholderTextColor={Colors.textTertiary} value={verifyEmail} onChangeText={setVerifyEmail} autoCapitalize="none" autoCorrect={false} />
          </PopupModal>

          <PopupModal visible={!!castingConfirm} onClose={() => setCastingConfirm(null)}
            variant={castingConfirm?.status === 'approved' ? 'success' : 'ban'}
            title={castingConfirm?.actionLabel || 'Confirm'} message={`Type "${castingConfirm?.userEmail}" to confirm.`}
            confirmLabel="Confirm" cancelLabel="Cancel"
            confirmVariant={castingConfirm?.status === 'approved' ? 'success' : 'danger'}
            confirmDisabled={castingEmail.toLowerCase().trim() !== (castingConfirm?.userEmail || '').toLowerCase().trim()}
            onConfirm={executeCastingConfirm} onCancel={() => setCastingConfirm(null)}>
            <TextInput style={styles.confirmInput} placeholder="Enter email to confirm..." placeholderTextColor={Colors.textTertiary} value={castingEmail} onChangeText={setCastingEmail} autoCapitalize="none" autoCorrect={false} />
          </PopupModal>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  tabRow: {flexDirection: 'row', paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.sm},
  tab: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.borderLight, minHeight: 62},
  activeTab: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  tabIcon: {fontSize: 18, marginBottom: 4},
  tabText: {color: Colors.textSecondary, fontSize: 11, fontWeight: '600'},
  activeTabText: {color: '#FFFFFF', fontWeight: '700'},

  statsWrap: {paddingHorizontal: Spacing.md, marginBottom: Spacing.md},
  statsCard: {backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight},
  statsHeading: {color: Colors.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: Spacing.sm},
  statsGrid: {flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap'},
  statBox: {backgroundColor: Colors.cardElevated, borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, alignItems: 'center', minWidth: 65, borderWidth: 1, borderColor: Colors.borderLight},
  statVal: {color: Colors.textPrimary, fontSize: 20, fontWeight: '800'},
  statKey: {color: Colors.textSecondary, fontSize: 10, marginTop: 2, fontWeight: '600'},

  searchContainer: {flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, height: 40, borderWidth: 1, borderColor: Colors.borderLight},
  searchIcon: {fontSize: 14, marginRight: Spacing.xs},
  searchInput: {flex: 1, color: Colors.textPrimary, fontSize: 13, paddingVertical: 0},
  searchClear: {color: Colors.textTertiary, fontSize: 14, paddingHorizontal: Spacing.xs, fontWeight: 'bold'},

  scroll: {padding: Spacing.md, paddingBottom: Spacing['4xl']},

  card: {backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight},
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs},
  reason: {color: Colors.textPrimary, fontWeight: '600', fontSize: 13, marginBottom: Spacing.xs},
  detail: {color: Colors.textSecondary, fontSize: 13, marginBottom: Spacing.sm},
  reportActionBtn: {flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center', borderWidth: 1},
  reportActionBtnText: {fontSize: 12, fontWeight: '600'},

  userCard: {backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight},
  userTopRow: {flexDirection: 'row', alignItems: 'center'},
  userInfo: {flex: 1, marginLeft: Spacing.sm},
  userNameRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm},
  userName: {color: Colors.textPrimary, fontWeight: '600', fontSize: 14, flex: 1},
  userEmail: {color: Colors.textSecondary, fontSize: 11, marginTop: 2},

  actionRow: {flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm},
  actionBtn: {flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center', borderWidth: 1},
  actionBtnText: {fontSize: 12, fontWeight: '600'},
  banBtn: {backgroundColor: Colors.errorFaint, borderColor: Colors.errorBorder},
  unbanBtn: {backgroundColor: Colors.successFaint, borderColor: Colors.successBorder},
  directorBtn: {backgroundColor: Colors.warningFaint, borderColor: Colors.warningBorder},
  adminActionBtn: {backgroundColor: Colors.successFaint, borderColor: Colors.successBorder},
  badgeBtn: {backgroundColor: Colors.background, borderColor: Colors.borderLight},

  actions: {flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm},
  meta: {color: Colors.textSecondary, fontSize: 13, marginBottom: Spacing.xs},
  linkRow: {paddingVertical: Spacing.xs, marginBottom: Spacing.xs},
  linkText: {color: Colors.primary, fontSize: 13, fontWeight: '600'},
  unauthorized: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg},
  unauthorizedIcon: {fontSize: 48, marginBottom: Spacing.md},
  unauthorizedText: {color: Colors.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: Spacing.xs},
  unauthorizedSub: {color: Colors.textSecondary, fontSize: 14},
  flex1: {flex: 1},
  loader: {marginTop: 40},
  confirmInput: {backgroundColor: Colors.background, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: Colors.border, width: '100%'},
});
