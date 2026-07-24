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

export default function BrowseFilmsScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const {user: currentUser} = useApp();
  const [films, setFilms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

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

  useEffect(() => {
    fetchFilms();
  }, [fetchFilms]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      fetchFilms();
    });
    return unsub;
  }, [navigation, fetchFilms]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFilms();
    setRefreshing(false);
  }, [fetchFilms]);

  const toggleLike = async (film: any) => {
    if (!currentUser) return;
    try {
      await api.post(`/films/${film.id}/like`);
      fetchFilms();
    } catch (e) {
      console.log(e);
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
    const isOwner = item.directorId === currentUser?.uid;

    return (
      <View style={styles.card}>
        <View style={styles.filmCardHeader}>
          <Avatar
            name={item.directorName || item.directorEmail}
            size="sm"
            ring
            verified={item.verified}
          />
          <View style={{flex: 1, marginLeft: Spacing.sm}}>
            <Text style={styles.filmDirectorName} numberOfLines={1}>
              {item.directorName || item.directorEmail?.split('@')[0] || 'Director'}
            </Text>
            <Text style={styles.filmDirectorMeta}>
              Director · {item.genre || 'Film'}
            </Text>
          </View>
          <View style={styles.viewsChip}>
            <Text style={styles.viewsChipText}>👁 {item.views || 0}</Text>
          </View>
        </View>

        {item.posterUrl ? (
          <Image source={{uri: item.posterUrl}} style={styles.poster} resizeMode="cover" />
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
        </View>

        <View style={styles.filmBtnRow}>
          <TouchableOpacity
            style={styles.watchBtn}
            onPress={() => navigation.navigate('MovieDetails', {movie: item})}>
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
      <Header title="🎬 Browse Short Films" navigation={navigation} onBack={() => navigation.goBack()} />
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
});
