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
import {Header, EmptyState} from '../components/ui';

export default function BrowseUpdatesScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const {isAdmin, user: currentUser} = useApp();
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUpdates = useCallback(async () => {
    try {
      const res = await api.get<{posts: any[]} | any>('/feed-posts');
      const postsArray = Array.isArray(res) ? res : res.posts || [];
      setUpdates(postsArray.map((p: any) => ({...p, id: p._id || p.id})));
    } catch (e) {
      console.log('BrowseUpdates error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      fetchUpdates();
    });
    return unsub;
  }, [navigation, fetchUpdates]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUpdates();
    setRefreshing(false);
  }, [fetchUpdates]);

  const deletePost = async (postId: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/feed-posts/${postId}`);
          fetchUpdates();
        } catch (e) {
          Alert.alert('Error', 'Could not delete.');
        }
      }},
    ]);
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 172800) return 'yesterday';
    return d.toLocaleDateString([], {day: 'numeric', month: 'short'});
  };

  const renderCard = ({item}: {item: any}) => {
    const showDelete = isAdmin || item.authorId === currentUser?.uid;
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.adminBadge, item.postType === 'announcement' && styles.announcementBadge]}>
            <Text style={[styles.adminBadgeText, item.postType === 'announcement' && styles.announcementBadgeText]}>
              {item.postType === 'announcement' ? '📢 Announcement' : '🛡️ CineLink Official'}
            </Text>
          </View>
          <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
        </View>

        {item.imageUrl || item.posterUrl ? (
          <Image source={{uri: item.imageUrl || item.posterUrl}} style={styles.postImage} resizeMode="cover" />
        ) : null}

        <Text style={styles.bodyText}>{item.text}</Text>

        {item.location ? (
          <Text style={styles.locationText}>📍 {item.location}</Text>
        ) : null}

        {showDelete && (
          <TouchableOpacity style={styles.deleteBtn} onPress={() => deletePost(item.id)}>
            <Text style={styles.deleteText}>🗑️ Delete Update</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <Header title="📢 Announcements & Updates" navigation={navigation} onBack={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator color={Colors.primary} size="large" style={{marginTop: 60}} />
      ) : updates.length === 0 ? (
        <EmptyState
          icon="📢"
          title="No updates found"
          subtitle="Official announcements will show up here"
        />
      ) : (
        <FlatList
          data={updates}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  adminBadge: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  adminBadgeText: {
    color: Colors.primary,
    ...Typography.captionBold,
  },
  announcementBadge: {
    backgroundColor: Colors.errorFaint,
  },
  announcementBadgeText: {
    color: Colors.error,
  },
  timeText: {
    color: Colors.textSecondary,
    ...Typography.caption,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  bodyText: {
    color: Colors.textPrimary,
    ...Typography.body,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  locationText: {
    color: Colors.textSecondary,
    ...Typography.bodySm,
    marginBottom: Spacing.sm,
  },
  deleteBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.errorFaint,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    marginTop: Spacing.sm,
  },
  deleteText: {
    color: Colors.error,
    ...Typography.captionBold,
  },
});
