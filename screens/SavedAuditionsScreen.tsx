import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {Header, EmptyState, Avatar} from '../components/ui';
import {useApp} from '../src/context/AppContext';
import {useTheme} from '../src/context/ThemeContext';

export default function SavedAuditionsScreen({navigation}: any) {
  const {isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const [savedAuditions, setSavedAuditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const {user} = useApp();

  useEffect(() => {
    loadSavedAuditions();
    fetchFollowing();
  }, [user]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadSavedAuditions();
      fetchFollowing();
    });
    return unsubscribe;
  }, [navigation, user]);

  const loadSavedAuditions = async () => {
    try {
      const res = await api.get<{savedAuditions: any[]}>('/saved-auditions');
      const items = res.savedAuditions || [];
      // Fetch full audition details
      const auditions: any[] = [];
      for (const item of items) {
        try {
          const auditionRes = await api.get<any>(`/auditions/${item.auditionId}`);
          if (auditionRes?.audition) {
            auditions.push({
              ...auditionRes.audition,
              id: auditionRes.audition._id || auditionRes.audition.id,
            });
          }
        } catch (e) { /* audition may be deleted */ }
      }
      setSavedAuditions(auditions);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFollowing = async () => {
    if (!user) return;
    try {
      const followRes = await api.get<any>(`/users/${user.uid}/following`);
      const followingList = followRes.following || [];
      setFollowingIds(new Set(followingList.map((u: any) => u._id || u.id)));
    } catch (e) {
      console.log('Error fetching following:', e);
    }
  };

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

  const onRefresh = () => {
    setRefreshing(true);
    loadSavedAuditions();
    fetchFollowing();
  };

  const unsaveAudition = async (auditionId: string) => {
    Alert.alert('Remove', 'Remove from saved auditions?', [
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post('/saved-auditions', {auditionId});
            setSavedAuditions(prev => prev.filter((a: any) => (a._id || a.id) !== auditionId));
          } catch (e) {
            console.log(e);
          }
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Saved Auditions" navigation={navigation} />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        contentContainerStyle={{paddingBottom: insets.bottom + Spacing.xl}}>
        <View style={styles.section}>
          {savedAuditions.length > 0 && (
            <Text style={styles.countText}>
              {savedAuditions.length} saved audition
              {savedAuditions.length !== 1 ? 's' : ''}
            </Text>
          )}

          {loading ? (
            <ActivityIndicator
              size="large"
              color={Colors.primary}
              style={{marginTop: Spacing['3xl']}}
            />
          ) : savedAuditions.length === 0 ? (
            <EmptyState
              icon="🔖"
              title="No saved auditions!"
              subtitle="Tap 🔖 Save on any audition to save it here."
              actionLabel="Browse Auditions"
              onAction={() => navigation.navigate('Home')}
            />
          ) : (
            savedAuditions.map((item: any) => {
              const isSaved = true;
              const hasPoster = !!item.posterUrl;

              return (
                <View key={item._id || item.id} style={styles.card}>
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

                      {(item.directorId || item.postedById) !== user?.uid && (
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

                  <TouchableOpacity 
                    activeOpacity={0.88} 
                    onPress={() => navigation.navigate('AuditionDetail', {audition: item, auditionId: item._id || item.id})}
                    style={styles.cardContent}
                  >
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
                  </TouchableOpacity>

                  {/* Action Row */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => unsaveAudition(item._id || item.id)} style={styles.saveActionBtn} activeOpacity={0.7}>
                      <Text style={styles.saveActionText}>{isSaved ? '🔖 Saved' : '🔖 Save'}</Text>
                    </TouchableOpacity>
                    
                    <View style={styles.actionDivider} />

                    <TouchableOpacity 
                      onPress={() => navigation.navigate('AuditionDetail', {audition: item, auditionId: item._id || item.id})} 
                      style={styles.applyActionBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.applyActionText}>Apply Now →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  scroll: {flex: 1},
  section: {padding: Spacing.screenH},
  countText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: Spacing.lg,
  },
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
