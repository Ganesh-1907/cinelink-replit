import React, {useRef} from 'react';
import {View, Text, TouchableOpacity, Animated, StyleSheet} from 'react-native';
import api from '../src/api/client';
import {Colors, Spacing, Typography} from '../src/theme';

interface EngagementBarProps {
  postId?: string;
  auditionId?: string;
  filmId?: string;
  reelId?: string;
  likes?: number;
  commentCount?: number;
  likedBy?: string[];
  views?: number;
  shareTitle?: string;
  onCommentPress?: () => void;
  onSharePress?: () => void;
}

function AnimatedHeart({liked, onPress}: {liked: boolean; onPress: () => void}) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, {toValue: 1.4, useNativeDriver: true, speed: 30, bounciness: 12}),
      Animated.spring(scale, {toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6}),
    ]).start();
    onPress();
  };
  return (
    <TouchableOpacity onPress={handlePress} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
      <Animated.Text style={[styles.actionIcon, liked && {color: Colors.error}, {transform: [{scale}]}]}>
        {liked ? '♥' : '♡'}
      </Animated.Text>
    </TouchableOpacity>
  );
}

export default function EngagementBar({
  postId, auditionId, filmId, reelId,
  likes: likesProp = 0, commentCount = 0,
  likedBy = [], views, shareTitle,
  onCommentPress, onSharePress,
}: EngagementBarProps) {
  const [liked, setLiked] = React.useState(false);
  const [likes, setLikes] = React.useState(likesProp);

  // Determine content type and ID
  const contentId = postId || auditionId || filmId || reelId || '';
  let contentType = 'feed-posts';
  if (auditionId) contentType = 'auditions';
  else if (filmId) contentType = 'films';
  else if (reelId) contentType = 'reels';

  const handleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikes(prev => prev + (newLiked ? 1 : -1));
    try {
      await api.post(`/${contentType}/${contentId}/like`);
    } catch (e) {
      setLiked(liked);
      setLikes(prev => prev + (newLiked ? -1 : 1));
    }
  };

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <View style={styles.container}>
      <View style={styles.action}>
        <AnimatedHeart liked={liked} onPress={handleLike} />
        {likes > 0 && <Text style={styles.count}>{fmt(likes)}</Text>}
      </View>
      {onCommentPress && (
        <TouchableOpacity style={styles.action} onPress={onCommentPress} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text style={styles.actionIcon}>💬</Text>
          {commentCount > 0 && <Text style={styles.count}>{fmt(commentCount)}</Text>}
        </TouchableOpacity>
      )}
      {views !== undefined && (
        <View style={styles.action}>
          <Text style={styles.actionIcon}>👁</Text>
          <Text style={styles.count}>{fmt(views)}</Text>
        </View>
      )}
      {onSharePress && (
        <TouchableOpacity style={styles.action} onPress={onSharePress} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text style={styles.actionIcon}>↗</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flexDirection: 'row', alignItems: 'center', gap: Spacing.xl, paddingTop: Spacing.sm},
  action: {flexDirection: 'row', alignItems: 'center', gap: Spacing.xs},
  actionIcon: {fontSize: 20, color: Colors.textSecondary},
  count: {...Typography.caption, color: Colors.textSecondary, fontWeight: '600'},
});
