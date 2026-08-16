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
  Image,
} from 'react-native';
import api from '../src/api/client';
import {useApp} from '../src/context/AppContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {Header, Input, Chip, EmptyState, SkeletonCard, Avatar} from '../components/ui';
import {useTheme} from '../src/context/ThemeContext';

const ROLES = ['All', 'Hero', 'Heroine', 'Villain', 'Supporting', 'Child Artist', 'Comedian', 'Any Role'];

export default function BrowseAuditionsScreen({navigation}: any) {
  const {isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const {isAdmin, user: currentUser} = useApp();
  const [auditions, setAuditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

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

  const fetchFollowing = useCallback(async () => {
    if (!currentUser) return;
    try {
      const followRes = await api.get<any>(`/users/${currentUser.uid}/following`);
      const followingList = followRes.following || [];
      setFollowingIds(new Set(followingList.map((u: any) => u._id || u.id)));
    } catch (e) {
      console.log('Error fetching following:', e);
    }
  }, [currentUser]);

  const toggleFollowUser = async (targetId: string) => {
    const isCurrentlyFollowing = followingIds.has(targetId);

    setFollowingIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyFollowing) {
        next.delete(targetId);
      } else {
        next.add(targetId);
      }
      return next;
    });

    try {
      await api.post('/users/follow', {targetUserId: targetId});
    } catch (e) {
      setFollowingIds(prev => {
        const next = new Set(prev);
        if (isCurrentlyFollowing) {
          next.add(targetId);
        } else {
          next.delete(targetId);
        }
        return next;
      });
      Alert.alert('Error', 'Could not update follow status.');
    }
  };

  useEffect(() => {
    fetchAuditions();
    fetchSavedIds();
    fetchFollowing();
  }, [fetchAuditions, fetchSavedIds, fetchFollowing]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchAuditions(), fetchSavedIds(), fetchFollowing()]);
    setRefreshing(false);
  }, [fetchAuditions, fetchSavedIds, fetchFollowing]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAuditions();
      fetchSavedIds();
      fetchFollowing();
    });
    return unsubscribe;
  }, [navigation, fetchAuditions, fetchSavedIds, fetchFollowing]);

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
    const hasPoster = !!item.posterUrl;

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.88} 
        onPress={() => navigation.navigate('AuditionDetail', {audition: item, auditionId: item._id || item.id})}
      >
        {/* Creator Info Header Row */}
        {(item.directorId || item.postedById) ? (
          <View style={styles.creatorHeader}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                const creatorId = item.directorId || item.postedById;
                if (creatorId) {
                  navigation.navigate('PublicProfile', {userId: creatorId});
                }
              }}
              style={styles.creatorHeaderLeft}
            >
              <Avatar
                name={item.directorName || 'D'}
                uri={item.directorPhotoUrl}
                size="sm"
                ring
              />
              <View style={styles.creatorInfo}>
                <Text style={styles.creatorName} numberOfLines={1}>
                  {item.directorName || 'Casting Director'}
                </Text>
                <Text style={styles.creatorRole}>
                  {item.directorRole || 'Casting Director'}
                </Text>
              </View>
            </TouchableOpacity>

            {(item.directorId || item.postedById) !== currentUser?.uid && (
              <TouchableOpacity
                style={[styles.followBtn, followingIds.has(item.directorId || item.postedById) && styles.followingBtn]}
                onPress={() => toggleFollowUser(item.directorId || item.postedById)}
                activeOpacity={0.7}>
                <Text style={[styles.followBtnText, followingIds.has(item.directorId || item.postedById) && styles.followingBtnText]}>
                  {followingIds.has(item.directorId || item.postedById) ? '✓ Following' : '+ Follow'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        <View style={styles.cardContent}>
          {/* Left Side: Poster Thumbnail */}
          {hasPoster ? (
            <Image source={{uri: item.posterUrl}} style={styles.posterThumbnail} resizeMode="cover" />
          ) : (
            <View style={styles.posterPlaceholder}>
              <Text style={styles.placeholderEmoji}>🎭</Text>
            </View>
          )}

          {/* Right Side: Information column */}
          <View style={styles.infoCol}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              {item.status !== 'Closed' ? (
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredBadgeText}>Featured</Text>
                </View>
              ) : (
                <View style={[styles.featuredBadge, {backgroundColor: Colors.errorFaint, borderColor: Colors.errorBorder}]}>
                  <Text style={[styles.featuredBadgeText, {color: Colors.error}]}>Closed</Text>
                </View>
              )}
            </View>

            <Text style={styles.subtitle} numberOfLines={1}>
              {item.category || 'Cinema'} · {item.role || 'Any Role'}
            </Text>

            <View style={styles.metaRow}>
              {item.location ? <Text style={styles.metaItem}>📍 {item.location}</Text> : null}
              {item.gender ? <Text style={styles.metaItem}>👤 {item.gender}</Text> : null}
            </View>

            <View style={styles.bottomRow}>
              <Text style={styles.budgetVal} numberOfLines={1}>
                {item.budget ? `💰 ${item.budget}` : 'Unspecified Pay'}
              </Text>
              <Text style={styles.applicantsVal}>
                👥 {item.applicationsCount || 0} applied
              </Text>
            </View>
          </View>
        </View>

        {/* Action Row */}
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => toggleSave(item)} style={styles.saveActionBtn} activeOpacity={0.7}>
            <Text style={styles.saveActionText}>{isSaved ? '❤️ Saved' : '🤍 Save'}</Text>
          </TouchableOpacity>
          
          <View style={styles.actionDivider} />

          <TouchableOpacity 
            onPress={() => navigation.navigate('AuditionDetail', {audition: item, auditionId: item._id || item.id})} 
            style={styles.applyActionBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.applyActionText}>Apply Now →</Text>
          </TouchableOpacity>

          {(item.postedById === currentUser?.uid || item.directorId === currentUser?.uid || isAdmin) && (
            <>
              <View style={styles.actionDivider} />
              <TouchableOpacity onPress={() => deleteAudition(item)} style={styles.deleteActionBtn} activeOpacity={0.7}>
                <Text style={styles.deleteActionText}>🗑 Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <Header title="Browse Auditions" navigation={navigation} />
      <View style={styles.searchContainer}>
        <Input value={searchText} onChangeText={setSearchText} placeholder="Search by title, location, director..." />
      </View>
      
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {ROLES.map(role => (
            <TouchableOpacity 
              key={role} 
              onPress={() => setSelectedRole(role)}
              style={[
                styles.tabItem, 
                selectedRole === role && styles.tabItemActive
              ]}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.tabItemText,
                selectedRole === role && styles.tabItemTextActive
              ]}>
                {role}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <FlatList data={[1, 2, 3]} keyExtractor={i => String(i)} renderItem={() => <SkeletonCard />} contentContainerStyle={styles.listPadding} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🎭" title="No auditions found" subtitle={searchText || selectedRole !== 'All' ? 'Try changing your search or filter' : 'No auditions posted yet. Check back soon!'} actionLabel={isAdmin ? '+ Post an Audition' : undefined} onAction={isAdmin ? () => navigation.navigate('PostAudition') : undefined} />
      ) : (
        <FlatList 
          data={filtered} 
          keyExtractor={item => item._id || item.id} 
          renderItem={renderCard} 
          contentContainerStyle={[styles.listPadding, {paddingBottom: insets.bottom + 80}]} 
          showsVerticalScrollIndicator={false} 
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={Colors.primary} 
              colors={[Colors.primary]} 
              progressBackgroundColor={Colors.background} 
            />
          } 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.background},
  searchContainer: {paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm},
  tabsWrapper: {height: 48, marginBottom: Spacing.sm},
  filterRow: {paddingHorizontal: Spacing.lg, gap: Spacing.xs, alignItems: 'center'},
  tabItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tabItemActive: {
    backgroundColor: Colors.primaryFaint,
    borderColor: Colors.primary,
  },
  tabItemText: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
  },
  tabItemTextActive: {
    color: Colors.primary,
  },
  listPadding: {paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm},
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardContent: {
    flexDirection: 'row',
    padding: Spacing.md,
  },
  posterThumbnail: {
    width: 90,
    height: 110,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
  },
  posterPlaceholder: {
    width: 90,
    height: 110,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 28,
  },
  infoCol: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: Colors.textPrimary,
    ...Typography.label,
    fontSize: 16,
    flex: 1,
    marginRight: Spacing.xs,
  },
  featuredBadge: {
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
    alignItems: 'center',
  },
  metaItem: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  budgetVal: {
    ...Typography.captionBold,
    color: Colors.primary,
    flex: 1,
    marginRight: Spacing.xs,
  },
  applicantsVal: {
    ...Typography.micro,
    color: Colors.textTertiary,
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.cardElevated,
    height: 44,
    alignItems: 'center',
  },
  saveActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  saveActionText: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
  },
  actionDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.borderLight,
  },
  applyActionBtn: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  applyActionText: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
  deleteActionBtn: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  deleteActionText: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
  creatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  creatorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  creatorInfo: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  creatorName: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  creatorRole: {
    ...Typography.micro,
    color: Colors.textSecondary,
  },
  followBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xs,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: 'center',
    ...Shadows.sm,
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    shadowOpacity: 0,
    elevation: 0,
  },
  followBtnText: {
    color: Colors.textInverse,
    fontWeight: '700',
    fontSize: 11,
    ...Typography.bodyBold,
  },
  followingBtnText: {
    color: Colors.primary,
  },
});
