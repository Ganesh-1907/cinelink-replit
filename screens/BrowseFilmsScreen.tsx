import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import api from '../src/api/client';
import {useApp} from '../src/context/AppContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {Header, Input, EmptyState, SkeletonCard, Avatar} from '../components/ui';
import {useTheme} from '../src/context/ThemeContext';

export default function BrowseFilmsScreen({navigation}: any) {
  const {isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const {user: currentUser} = useApp();
  const [films, setFilms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const fetchFilms = useCallback(async () => {
    try {
      const res = await api.get<{films: any[]}>('/films');
      setFilms((res.films || []).map((f: any) => ({...f, id: f._id || f.id})));
    } catch (e) {
      console.log('BrowseFilms error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

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
    fetchFilms();
    fetchFollowing();
  }, [fetchFilms, fetchFollowing]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      fetchFilms();
      fetchFollowing();
    });
    return unsub;
  }, [navigation, fetchFilms, fetchFollowing]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchFilms(), fetchFollowing()]);
    setRefreshing(false);
  }, [fetchFilms, fetchFollowing]);

  const toggleLike = async (film: any) => {
    if (!currentUser) return;
    const filmId = film.id || film._id;
    const wasLiked = film.likedBy?.includes(currentUser?.uid);
    setFilms(prev => prev.map(f => {
      const id = f.id || f._id;
      if (id !== filmId) return f;
      const likes = Math.max(0, (f.likes || 0) + (wasLiked ? -1 : 1));
      const likedBy = wasLiked
        ? (f.likedBy || []).filter((u: string) => u !== currentUser?.uid)
        : [...(f.likedBy || []), currentUser?.uid];
      return {...f, likes, likedBy};
    }));
    try {
      const res = await api.post<any>(`/films/${filmId}/like`);
      setFilms(prev => prev.map(f => {
        const id = f.id || f._id;
        if (id !== filmId) return f;
        return {...f, likes: res.likes, likedBy: res.likedBy || f.likedBy};
      }));
    } catch (e) {
      fetchFilms();
    }
  };

  const deleteFilm = async (film: any) => {
    Alert.alert('Delete Film', `Are you sure you want to delete "${film.title}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/films/${film.id}`);
          fetchFilms();
        } catch (e) {
          Alert.alert('Error', 'Could not delete.');
        }
      }},
    ]);
  };

  const filtered = searchText.trim()
    ? films.filter(
        f =>
          f.title?.toLowerCase().includes(searchText.toLowerCase()) ||
          f.genre?.toLowerCase().includes(searchText.toLowerCase()) ||
          f.directorName?.toLowerCase().includes(searchText.toLowerCase())
      )
    : films;

  const renderCard = ({item}: {item: any}) => {
    const isLiked = item.likedBy?.includes(currentUser?.uid);
    const isOwner = item.userId === currentUser?.uid || item.directorId === currentUser?.uid;
    const creatorId = item.userId || item.directorId;

    return (
      <View style={styles.card}>
        <View style={styles.filmCardHeader}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => creatorId && navigation.navigate('PublicProfile', {userId: creatorId})}
            style={styles.creatorHeaderLeft}>
            <Avatar
              name={item.creatorName || item.directorName || item.userEmail || item.directorEmail}
              uri={item.creatorPhotoUrl || item.directorPhotoUrl}
              size="sm"
              ring
              verified={item.verified}
            />
            <View style={{flex: 1, marginLeft: Spacing.sm}}>
              <Text style={styles.filmDirectorName} numberOfLines={1}>
                {item.creatorName || item.directorName || item.userEmail?.split('@')[0] || 'Director'}
              </Text>
              <Text style={styles.filmDirectorMeta}>
                {item.creatorRole || 'Director'} · {item.genre || 'Film'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={{flexDirection: 'row', alignItems: 'center', gap: Spacing.xs}}>
            {creatorId && creatorId !== currentUser?.uid && (
              <TouchableOpacity
                style={[styles.followBtn, followingIds.has(creatorId) && styles.followingBtn]}
                onPress={() => toggleFollowUser(creatorId)}
                activeOpacity={0.7}>
                <Text style={[styles.followBtnText, followingIds.has(creatorId) && styles.followingBtnText]}>
                  {followingIds.has(creatorId) ? '✓ Following' : '+ Follow'}
                </Text>
              </TouchableOpacity>
            )}
            <View style={styles.viewsChip}>
              <Text style={styles.viewsChipText}>👁 {item.views || 0}</Text>
            </View>
          </View>
        </View>

        {item.posterUrl && item.posterUrl.trim().startsWith('http') ? (
          <Image source={{uri: item.posterUrl.trim()}} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterPlaceholderText}>🎬</Text>
          </View>
        )}

        <Text style={styles.cardTitle}>{item.title}</Text>

        <View style={styles.badgeRow}>
          {item.genre ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.genre}</Text>
            </View>
          ) : null}
          {item.duration ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>⏱ {item.duration} min</Text>
            </View>
          ) : null}
          <View style={[styles.badge, styles.badgeSuccess]}>
            <Text style={[styles.badgeText, {color: Colors.success}]}>
              {item.status || 'Screening'}
            </Text>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.engagementRow}>
          <TouchableOpacity style={styles.engagementBtn} onPress={() => toggleLike(item)}>
            <Text style={styles.engagementText}>{isLiked ? '❤️' : '🤍'} {item.likes || 0}</Text>
          </TouchableOpacity>
          <View style={styles.engagementBtn}>
            <Text style={styles.engagementText}>💬 {item.commentsCount || 0}</Text>
          </View>
        </View>

        <View style={styles.filmBtnRow}>
          <TouchableOpacity
            style={styles.watchBtn}
            onPress={() => navigation.navigate('FilmDetail', {film: item})}>
            <Text style={styles.watchBtnText}>Watch Now →</Text>
          </TouchableOpacity>

          {isOwner && (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteFilm(item)}>
              <Text style={styles.deleteBtnText}>🗑 Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <Header title="Browse Short Films" navigation={navigation} onBack={() => navigation.goBack()} />
      <View style={styles.searchContainer}>
        <Input
          value={searchText}
          onChangeText={setSearchText}
          placeholder="🔍 Search by title, genre, director..."
        />
      </View>
      {loading ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={i => String(i)}
          renderItem={() => <SkeletonCard />}
          contentContainerStyle={styles.listPadding}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🎬"
          title="No short films found"
          subtitle={searchText ? 'Try changing your search term' : 'Be the first to upload a short film on CineLink'}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={[styles.listPadding, {paddingBottom: insets.bottom + 40}]}
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
  listPadding: {padding: Spacing.lg},
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.md,
  },
  filmCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  filmDirectorName: {
    color: Colors.textPrimary,
    ...Typography.bodyBold,
  },
  filmDirectorMeta: {
    color: Colors.textSecondary,
    ...Typography.caption,
  },
  viewsChip: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  viewsChipText: {
    color: Colors.textSecondary,
    ...Typography.caption,
  },
  poster: {
    width: '100%',
    height: 180,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  posterPlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  posterPlaceholderText: {
    fontSize: 48,
  },
  cardTitle: {
    color: Colors.textPrimary,
    ...Typography.h4,
    marginBottom: Spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  badge: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  badgeText: {
    color: Colors.textSecondary,
    ...Typography.caption,
  },
  badgeSuccess: {
    backgroundColor: Colors.successFaint,
  },
  description: {
    color: Colors.textSecondary,
    ...Typography.bodySm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  engagementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardElevated,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
  },
  engagementText: {
    color: Colors.textPrimary,
    ...Typography.captionBold,
  },
  filmBtnRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  watchBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  watchBtnText: {
    color: Colors.textPrimary,
    ...Typography.btn,
    fontWeight: '700',
  },
  deleteBtn: {
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.errorFaint,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  deleteBtnText: {
    color: Colors.error,
    fontWeight: 'bold',
    ...Typography.label,
  },
  creatorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
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
