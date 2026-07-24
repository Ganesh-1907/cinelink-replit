import React, {useEffect, useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import api from '../src/api/client';
import Video from 'react-native-video';
import {Colors, Typography, Spacing} from '../src/theme';
import {Header, Avatar} from '../components/ui';
import {useApp} from '../src/context/AppContext';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

export default function ReelsScreen({navigation}: any) {
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentViewableIndex, setCurrentViewableIndex] = useState(0);
  const {user} = useApp();

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  const onViewableItemsChanged = useRef(({viewableItems}: any) => {
    if (viewableItems.length > 0) {
      setCurrentViewableIndex(viewableItems[0].index);
    }
  }).current;

  useEffect(() => {
    loadReels();
  }, []);

  const loadReels = async () => {
    try {
      const res = await api.get<{reels: any[]}>('/reels');
      setReels(res.reels || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReels();
  }, []);

  const toggleLike = async (index: number) => {
    const reel = reels[index];
    const reelId = reel._id || reel.id;
    const isLiked = reel.likedByUser;
    Alert.alert('Not connected', 'Like feature on Reels is under development.');
    return;
    try {
      setReels(prev => prev.map((r, i) => {
        if (i === index) {
          const newLiked = !isLiked;
          return {...r, likedByUser: newLiked, likes: (r.likes || 0) + (newLiked ? 1 : -1)};
        }
        return r;
      }));
      await api.post(`/reels/${reelId}/like`);
    } catch (e) {
      loadReels();
    }
  };

  const renderItem = ({item, index}: any) => {
    const isVisible = index === currentViewableIndex;
    return (
      <View style={styles.reelContainer}>
        <Video
          source={{uri: item.videoUrl}}
          style={styles.video}
          resizeMode="cover"
          repeat
          paused={!isVisible}
          muted
        />
        <View style={styles.overlay}>
          <View style={styles.bottomInfo}>
            <View style={styles.creatorRow}>
              <Avatar
                name={item.creatorName || 'Creator'}
                size="sm"
                uri={item.creatorAvatar}
              />
              <Text style={styles.creatorName}>{item.creatorName || 'Creator'}</Text>
            </View>
            {item.caption ? <Text style={styles.caption}>{item.caption}</Text> : null}
          </View>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => toggleLike(index)} style={styles.actionBtn}>
              <Text style={styles.actionIcon}>❤️</Text>
              <Text style={styles.actionCount}>{item.likes || 0}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.safe}>
        <Header title="🎞️ Reels" navigation={navigation} />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <Header title="🎞️ Reels" navigation={navigation} />
      {reels.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={styles.emptyIcon}>🎬</Text>
          <Text style={styles.emptyText}>No reels yet</Text>
          <Text style={styles.emptySub}>Be the first to upload a reel!</Text>
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={item => item._id || item.id}
          renderItem={renderItem}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={SCREEN_HEIGHT}
          decelerationRate="fast"
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          getItemLayout={(_, index) => ({length: SCREEN_HEIGHT, offset: SCREEN_HEIGHT * index, index})}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  centerState: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md},
  emptyIcon: {fontSize: 48},
  emptyText: {color: Colors.textPrimary, fontSize: 18, fontWeight: '600'},
  emptySub: {color: Colors.textSecondary, fontSize: 14},
  reelContainer: {height: SCREEN_HEIGHT, justifyContent: 'flex-end'},
  video: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0},
  overlay: {
    padding: Spacing.lg,
    paddingBottom: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  bottomInfo: {flex: 1, gap: Spacing.sm},
  creatorRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm},
  creatorName: {color: Colors.textPrimary, fontWeight: 'bold'},
  caption: {color: Colors.textPrimary, fontSize: 14},
  actions: {alignItems: 'center', gap: Spacing.xl},
  actionBtn: {alignItems: 'center'},
  actionIcon: {fontSize: 28},
  actionCount: {color: Colors.textPrimary, fontSize: 12, marginTop: 2},
});
