import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  TextInput,
  Share,
  SafeAreaView,
  Animated,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {
  Colors,
  Typography,
  Spacing,
  Radius,
  Shadows,
  HitSlop,
} from '../src/theme';
import {
  Header,
  Avatar,
  Card,
  Button,
  Input,
  EmptyState,
} from '../components/ui';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) {
    return 'Creator';
  }
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

export default function FilmDetailScreen({route, navigation}: any) {
  const insets = useSafeAreaInsets();
  const {film} = route.params;
  const currentUser = auth().currentUser;
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(film.likes || 0);
  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadComments();
    if (film.likedBy?.includes(currentUser?.uid)) {
      setLiked(true);
    }
  }, []);

  const loadComments = async () => {
    try {
      const snapshot = await firestore()
        .collection('films')
        .doc(film.id)
        .collection('comments')
        .orderBy('createdAt', 'desc')
        .get();
      setComments(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    } catch (e) {
      console.log(e);
    }
  };

  const handleLike = () => {
    if (!currentUser) {
      return;
    }
    const newLiked = !liked;
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.3,
        useNativeDriver: true,
        speed: 30,
        bounciness: 12,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 6,
      }),
    ]).start();
    setLiked(newLiked);
    setLikesCount((prev: number) => (newLiked ? prev + 1 : prev - 1));
    firestore()
      .collection('films')
      .doc(film.id)
      .update({
        likes: firestore.FieldValue.increment(newLiked ? 1 : -1),
        likedBy: newLiked
          ? firestore.FieldValue.arrayUnion(currentUser.uid)
          : firestore.FieldValue.arrayRemove(currentUser.uid),
      })
      .catch(() => {
        setLiked(liked);
        setLikesCount((prev: number) => (liked ? prev + 1 : prev - 1));
      });
  };

  const addComment = async () => {
    if (!commentText.trim()) {
      return;
    }
    const currentUserName =
      currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
    try {
      await firestore()
        .collection('films')
        .doc(film.id)
        .collection('comments')
        .add({
          text: commentText.trim(),
          userId: currentUser?.uid,
          userName: currentUserName,
          userEmail: currentUser?.email,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      setCommentText('');
      loadComments();
    } catch (e) {
      console.log(e);
    }
  };

  const shareFilm = async () => {
    try {
      const link = film.videoUrl || film.videoLink || '';
      await Share.share({
        message: `🎬 Watch "${film.title}" on CineLink!\n\n${link}`,
      });
    } catch (e) {
      console.log(e);
    }
  };

  const watchFilm = () => {
    const link = film.videoUrl || film.videoLink;
    if (link) {
      Linking.openURL(link);
    }
  };

  const directorName = cleanName(film.directorName || film.directorEmail);

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Film Details" navigation={navigation} transparent />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* POSTER */}
        {film.posterUrl ? (
          <Image source={{uri: film.posterUrl}} style={styles.poster} />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterEmoji}>🎬</Text>
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.title}>{film.title}</Text>

          <View style={styles.metaRow}>
            {film.genre ? (
              <Text style={styles.metaText}>🎭 {film.genre}</Text>
            ) : null}
            {film.duration ? (
              <Text style={styles.metaText}>⏱ {film.duration} min</Text>
            ) : null}
            <Text style={styles.metaText}>👁 {film.views || 0} views</Text>
          </View>

          <Card variant="elevated" style={styles.creatorCard}>
            <TouchableOpacity
              style={styles.creatorRow}
              onPress={() =>
                navigation.navigate('PublicProfile', {userId: film.directorId})
              }>
              <Avatar name={directorName} size="md" />
              <View style={styles.creatorInfo}>
                <Text style={styles.creatorTitle}>Director</Text>
                <Text style={styles.creatorName}>{directorName}</Text>
              </View>
              <Text style={styles.visitText}>Visit →</Text>
            </TouchableOpacity>
          </Card>

          {film.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{film.description}</Text>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            <Button
              label="▶ Watch Film"
              onPress={watchFilm}
              size="lg"
              fullWidth
            />
            <Button
              label="🔗 Share"
              onPress={shareFilm}
              variant="secondary"
              size="lg"
            />
          </View>

          <Card variant="elevated" style={styles.engagementCard}>
            <View style={styles.engagementRow}>
              <TouchableOpacity onPress={handleLike} hitSlop={HitSlop.lg}>
                <Animated.Text
                  style={[
                    styles.engagementText,
                    {transform: [{scale: heartScale}]},
                  ]}>
                  {liked ? '❤️' : '🤍'} {likesCount}
                </Animated.Text>
              </TouchableOpacity>
              <Text style={styles.engagementText}>💬 {comments.length}</Text>
              <Text style={styles.engagementText}>👁 {film.views || 0}</Text>
            </View>
          </Card>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comments</Text>
            <View style={styles.commentInputRow}>
              <Input
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Write a comment..."
                containerStyle={styles.commentInput}
              />
              <Button label="Send" onPress={addComment} size="md" />
            </View>

            {comments.length === 0 ? (
              <Text style={styles.emptyText}>No comments yet</Text>
            ) : (
              comments.map((item: any) => (
                <Card
                  key={item.id}
                  variant="flat"
                  padding={Spacing.md}
                  style={styles.commentCard}>
                  <Text style={styles.commentName}>
                    {cleanName(item.userName || item.userEmail)}
                  </Text>
                  <Text style={styles.commentText}>{item.text}</Text>
                </Card>
              ))
            )}
          </View>

          <View style={{height: insets.bottom + Spacing.xl}} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  scroll: {flex: 1},
  poster: {width: '100%', height: 300},
  posterPlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterEmoji: {fontSize: 70},
  content: {padding: Spacing.screenH, gap: Spacing.lg},
  title: {...Typography.h1, marginTop: Spacing.sm},
  metaRow: {flexDirection: 'row', gap: Spacing.lg, flexWrap: 'wrap'},
  metaText: {...Typography.body, color: Colors.textSecondary},
  creatorCard: {padding: Spacing.md},
  creatorRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.md},
  creatorInfo: {flex: 1},
  creatorTitle: {...Typography.caption, color: Colors.textTertiary},
  creatorName: {...Typography.body, fontWeight: '600'},
  visitText: {...Typography.btn, color: Colors.primary},
  section: {gap: Spacing.md},
  sectionTitle: {...Typography.h3},
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  actionRow: {flexDirection: 'row', gap: Spacing.md},
  engagementCard: {padding: Spacing.md},
  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  engagementText: {...Typography.h4},
  commentInputRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-end',
  },
  commentInput: {flex: 1},
  emptyText: {
    ...Typography.body,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  commentCard: {marginBottom: Spacing.md},
  commentName: {
    ...Typography.btnSm,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  commentText: {...Typography.body, color: Colors.textPrimary, lineHeight: 22},
});
