import React, {useRef} from 'react';
import {View, Text, TouchableOpacity, Animated, StyleSheet} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {Colors, Spacing, Typography} from '../src/theme';

interface EngagementBarProps {
  postId?: string;
  auditionId?: string;
  initialLikes?: number;
  likes?: number;
  initialComments?: number;
  commentCount?: number;
  likedByCurrentUser?: boolean;
  likedBy?: string[];
  views?: number;
  shareTitle?: string;
  onCommentPress?: () => void;
  onSharePress?: () => void;
}

function AnimatedHeart({
  liked,
  onPress,
}: {
  liked: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.4,
        useNativeDriver: true,
        speed: 30,
        bounciness: 12,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
      <Animated.Text
        style={[
          styles.actionIcon,
          liked && {color: Colors.error},
          {transform: [{scale}]},
        ]}>
        {liked ? '♥' : '♡'}
      </Animated.Text>
    </TouchableOpacity>
  );
}

export default function EngagementBar({
  postId,
  auditionId,
  initialLikes = 0,
  likes: likesProp,
  initialComments = 0,
  commentCount: commentCountProp,
  likedByCurrentUser = false,
  likedBy,
  views,
  shareTitle,
  onCommentPress,
  onSharePress,
}: EngagementBarProps) {
  const effectivePostId = postId || auditionId || '';
  const currentUser = auth().currentUser;
  const computedLikedByCurrentUser = React.useMemo(() => {
    if (likedByCurrentUser) {
      return true;
    }
    if (!currentUser || !likedBy) {
      return false;
    }
    return likedBy.includes(currentUser.uid);
  }, [likedByCurrentUser, likedBy, currentUser]);
  const [liked, setLiked] = React.useState(computedLikedByCurrentUser);
  const [likes, setLikes] = React.useState(likesProp ?? initialLikes);
  const [comments] = React.useState(commentCountProp ?? initialComments);

  const handleLike = async () => {
    if (!currentUser) {
      return;
    }
    const uid = currentUser.uid;
    const newLiked = !liked;
    setLiked(newLiked);
    setLikes(prev => prev + (newLiked ? 1 : -1));
    try {
      await firestore()
        .collection('feedPosts')
        .doc(effectivePostId)
        .update({
          likes: firestore.FieldValue.increment(newLiked ? 1 : -1),
          likedBy: newLiked
            ? firestore.FieldValue.arrayUnion(uid)
            : firestore.FieldValue.arrayRemove(uid),
        });
    } catch (e) {
      // Revert on error
      setLiked(liked);
      setLikes(prev => prev + (newLiked ? -1 : 1));
    }
  };

  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <View style={styles.container}>
      {/* Like */}
      <View style={styles.action}>
        <AnimatedHeart liked={liked} onPress={handleLike} />
        {likes > 0 && <Text style={styles.count}>{fmt(likes)}</Text>}
      </View>

      {/* Comment */}
      {onCommentPress && (
        <TouchableOpacity
          style={styles.action}
          onPress={onCommentPress}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text style={styles.actionIcon}>💬</Text>
          {initialComments > 0 && (
            <Text style={styles.count}>{fmt(initialComments)}</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Share */}
      {onSharePress && (
        <TouchableOpacity
          style={styles.action}
          onPress={onSharePress}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text style={styles.actionIcon}>↗</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionIcon: {
    fontSize: 20,
    color: Colors.textSecondary,
  },
  count: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
