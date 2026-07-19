import React, {useEffect, useState, useRef} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Dimensions} from 'react-native';
import api from '../src/api/client';
import auth from '@react-native-firebase/auth';
import Video from 'react-native-video';
import {Colors, Typography, Spacing} from '../src/theme';
import {Header, Avatar} from '../components/ui';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

export default function ReelsScreen({navigation}: any) {
  const [reels, setReels] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const user = auth().currentUser;

  useEffect(() => {
    loadReels();
  }, []);

  const loadReels = async () => {
    try {
      const res = await api.get<{reels: any[]}>('/reels');
      setReels(res.reels || []);
    } catch (e) { console.log(e); }
  };

  const toggleLike = async (reel: any) => {
    try {
      await api.post(`/reels/${reel._id || reel.id}/like`);
      loadReels();
    } catch (e) { console.log(e); }
  };

  const renderItem = ({item}: any) => (
    <View style={styles.reelContainer}>
      <Video source={{uri: item.videoUrl}} style={styles.video} resizeMode="cover" repeat paused={false} muted />
      <View style={styles.overlay}>
        <View style={styles.bottomInfo}>
          <View style={styles.creatorRow}>
            <Avatar name={item.creatorName || 'Creator'} size="sm" source={item.creatorAvatar ? {uri: item.creatorAvatar} : undefined} />
            <Text style={styles.creatorName}>{item.creatorName || 'Creator'}</Text>
          </View>
          {item.caption ? <Text style={styles.caption}>{item.caption}</Text> : null}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => toggleLike(item)} style={styles.actionBtn}>
            <Text style={styles.actionIcon}>❤️</Text>
            <Text style={styles.actionCount}>{item.likes || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.safe}>
      <Header title="🎞️ Reels" navigation={navigation} />
      <FlatList data={reels} keyExtractor={item => item._id || item.id} renderItem={renderItem} pagingEnabled showsVerticalScrollIndicator={false} snapToInterval={SCREEN_HEIGHT} decelerationRate="fast"
        onMomentumScrollEnd={e => { setCurrentIndex(Math.round(e.nativeEvent.contentOffset.y / SCREEN_HEIGHT)); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  reelContainer: {height: SCREEN_HEIGHT, justifyContent: 'flex-end'},
  video: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0},
  overlay: {padding: Spacing.lg, paddingBottom: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end'},
  bottomInfo: {flex: 1, gap: Spacing.sm},
  creatorRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm},
  creatorName: {color: Colors.textPrimary, fontWeight: 'bold'},
  caption: {color: Colors.textPrimary, fontSize: 14},
  actions: {alignItems: 'center', gap: Spacing.xl},
  actionBtn: {alignItems: 'center'},
  actionIcon: {fontSize: 28},
  actionCount: {color: Colors.textPrimary, fontSize: 12, marginTop: 2},
});
