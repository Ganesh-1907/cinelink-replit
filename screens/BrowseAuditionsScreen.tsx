import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import api from '../src/api/client';
import EngagementBar from '../components/EngagementBar';
import {useApp} from '../src/context/AppContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {Header, Input, Chip, EmptyState, SkeletonCard} from '../components/ui';

const ROLES = ['All', 'Hero', 'Heroine', 'Villain', 'Supporting', 'Child Artist', 'Comedian', 'Any Role'];

export default function BrowseAuditionsScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const {isAdmin, user: currentUser} = useApp();
  const [auditions, setAuditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [savedIds, setSavedIds] = useState<string[]>([]);

  const fetchAuditions = useCallback(async () => {
    try {
      const res = await api.get<{auditions: any[]}>('/auditions');
      setAuditions(res.auditions || []);
    } catch (e) {
      console.log('LOAD AUDITIONS ERROR:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSavedIds = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await api.get<{savedAuditions?: any[]}>('/saved-auditions');
      setSavedIds((res.savedAuditions || []).map((s: any) => s.auditionId));
    } catch (e) { /* ignore */ }
  }, [currentUser]);

  useEffect(() => {
    fetchAuditions();
    fetchSavedIds();
  }, [fetchAuditions, fetchSavedIds]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchAuditions(), fetchSavedIds()]);
    setRefreshing(false);
  }, [fetchAuditions, fetchSavedIds]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAuditions();
      fetchSavedIds();
    });
    return unsubscribe;
  }, [navigation, fetchAuditions, fetchSavedIds]);

  const toggleSave = async (audition: any) => {
    if (!currentUser) return;
    try {
      await api.post('/saved-auditions', {auditionId: audition._id || audition.id});
      fetchSavedIds();
    } catch (e) { console.log(e); }
  };

  const deleteAudition = async (audition: any) => {
    Alert.alert('Delete Audition', `Delete "${audition.title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/auditions/${audition._id || audition.id}`);
          fetchAuditions();
        } catch (e) { Alert.alert('Error', 'Could not delete.'); }
      }},
    ]);
  };

  const filtered = auditions.filter(a => {
    const q = searchText.toLowerCase();
    const matchSearch = !q || a.title?.toLowerCase().includes(q) || a.location?.toLowerCase().includes(q) || a.language?.toLowerCase().includes(q) || a.directorName?.toLowerCase().includes(q);
    const matchRole = selectedRole === 'All' || a.role === selectedRole;
    return matchSearch && matchRole;
  });

  const renderCard = ({item}: any) => {
    const isSaved = savedIds.includes(item._id || item.id);
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => navigation.navigate('AuditionDetail', {audition: item})}>
        <View style={styles.cardTopRow}>
          <Chip label="🟢 Open" variant="success" static />
          <TouchableOpacity onPress={() => toggleSave(item)} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>{isSaved ? '❤️ Saved' : '🤍 Save'}</Text>
          </TouchableOpacity>
        </View>
        {item.category ? <View style={styles.categoryRow}><Chip label={item.category} static /></View> : null}
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        {item.budget || item.positions ? (
          <View style={styles.budgetRow}>
            {item.budget ? <View style={styles.budgetPill}><Text style={styles.budgetPillText}>💰 {item.budget}</Text></View> : null}
            {item.positions ? <View style={styles.positionsPill}><Text style={styles.positionsPillText}>👥 {item.positions}</Text></View> : null}
          </View>
        ) : null}
        <View style={styles.metaGrid}>
          {item.role ? <View style={styles.metaChip}><Text style={styles.metaChipText}>🎭 {item.role}</Text></View> : null}
          {item.gender ? <View style={styles.metaChip}><Text style={styles.metaChipText}>{item.gender}</Text></View> : null}
          {item.language ? <View style={styles.metaChip}><Text style={styles.metaChipText}>🗣 {item.language}</Text></View> : null}
        </View>
        {item.location ? <Text style={styles.infoText}>📍 {item.location}</Text> : null}
        <View style={styles.directorRow}>
          <Text style={styles.directorText}>🎥 {item.directorName || 'Director'}</Text>
          <Text style={styles.applicantsText}>{item.applicationsCount || 0} applied</Text>
        </View>
        {item.description ? <Text style={styles.descText} numberOfLines={2}>{item.description}</Text> : null}
        {item.lastDate ? <Text style={styles.deadlineLabel}>Apply before {item.lastDate}</Text> : null}
        <EngagementBar auditionId={item._id || item.id} likes={item.likes || 0} likedBy={item.likedBy || []} commentCount={0} views={item.views || 0} shareTitle={item.title || 'Audition'} />
        <View style={styles.auditionBtnRow}>
          <TouchableOpacity style={styles.contactBtn} onPress={() => navigation.navigate('AuditionDetail', {audition: item})}><Text style={styles.contactBtnText}>Contact</Text></TouchableOpacity>
          <TouchableOpacity style={styles.applyBtnFilled} onPress={() => navigation.navigate('AuditionDetail', {audition: item})}><Text style={styles.applyBtnFilledText}>Apply →</Text></TouchableOpacity>
        </View>
        {(item.postedById === currentUser?.uid || item.directorId === currentUser?.uid) && (
          <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteAudition(item)}><Text style={styles.deleteBtnText}>🗑 Delete Audition</Text></TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <Header title="🎭 Browse Auditions" navigation={navigation} onBack={() => navigation.goBack()} />
      <View style={styles.searchContainer}><Input value={searchText} onChangeText={setSearchText} placeholder="🔍 Search by title, city, language..." /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow} style={styles.filterScroll}>
        {ROLES.map(role => <Chip key={role} label={role} selected={selectedRole === role} onPress={() => setSelectedRole(role)} />)}
      </ScrollView>
      {loading ? (
        <FlatList data={[1, 2, 3]} keyExtractor={i => String(i)} renderItem={() => <SkeletonCard />} contentContainerStyle={styles.listPadding} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🎭" title="No auditions found" subtitle={searchText || selectedRole !== 'All' ? 'Try changing your search or filter' : 'No auditions posted yet. Check back soon!'} actionLabel={isAdmin ? '+ Post an Audition' : undefined} onAction={isAdmin ? () => navigation.navigate('PostAudition') : undefined} />
      ) : (
        <FlatList data={filtered} keyExtractor={item => item._id || item.id} renderItem={renderCard} contentContainerStyle={[styles.listPadding, {paddingBottom: insets.bottom + 80}]} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} progressBackgroundColor={Colors.background} />} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.background},
  searchContainer: {paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm},
  filterScroll: {maxHeight: 50, marginBottom: Spacing.md},
  filterRow: {paddingHorizontal: Spacing.lg, gap: Spacing.sm, alignItems: 'center'},
  listPadding: {padding: Spacing.lg},
  card: {backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.borderLight, ...Shadows.md},
  cardTopRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm},
  saveBtn: {flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryFaint, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm},
  saveBtnText: {color: Colors.textPrimary, ...Typography.label},
  categoryRow: {marginBottom: Spacing.sm},
  cardTitle: {color: Colors.textPrimary, fontSize: 18, fontWeight: 'bold', marginBottom: Spacing.sm},
  metaGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm},
  metaChip: {backgroundColor: Colors.cardElevated, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderWidth: 0.5, borderColor: Colors.border},
  metaChipText: {color: Colors.textSecondary, ...Typography.caption},
  infoText: {color: Colors.textSecondary, ...Typography.bodySm, marginBottom: Spacing.xs},
  directorRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm},
  directorText: {color: Colors.textSecondary, ...Typography.caption, marginBottom: 0},
  applicantsText: {color: Colors.textSecondary, ...Typography.micro},
  descText: {color: Colors.textSecondary, ...Typography.bodySm, lineHeight: 20, marginBottom: Spacing.sm},
  deleteBtn: {backgroundColor: Colors.errorFaint, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.errorBorder},
  deleteBtnText: {color: Colors.error, fontWeight: 'bold', ...Typography.label},
  budgetRow: {flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm},
  budgetPill: {backgroundColor: Colors.warningFaint, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: Colors.warningBorder},
  budgetPillText: {color: Colors.warning, ...Typography.captionBold},
  positionsPill: {backgroundColor: Colors.successFaint, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: Colors.successBorder},
  positionsPillText: {color: Colors.success, ...Typography.captionBold},
  deadlineLabel: {color: Colors.textSecondary, ...Typography.caption, marginBottom: Spacing.sm},
  auditionBtnRow: {flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md},
  contactBtn: {flex: 1, borderRadius: Radius.sm, paddingVertical: Spacing.md, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: 'transparent'},
  contactBtnText: {color: Colors.primary, fontWeight: '700', ...Typography.btn},
  applyBtnFilled: {flex: 1, borderRadius: Radius.sm, paddingVertical: Spacing.md, alignItems: 'center', backgroundColor: Colors.primary},
  applyBtnFilledText: {color: Colors.textPrimary, fontWeight: '700', ...Typography.btn},
});
