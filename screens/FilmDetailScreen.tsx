import React, {useEffect, useState, useRef} from 'react';
import {View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, TextInput, Share, SafeAreaView, Animated} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius, Shadows, HitSlop} from '../src/theme';
import {Header, Avatar, Card, Button, Input, EmptyState} from '../components/ui';
import {useApp} from '../src/context/AppContext';

const getId = (obj: any) => obj?._id || obj?.id || '';

export default function FilmDetailScreen({route, navigation}: any) {
  const {film: paramFilm, filmId: paramFilmId} = route.params;
  const filmId = paramFilmId || getId(paramFilm);
  const [film, setFilm] = useState<any>(paramFilm || {});
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(paramFilm?.likes || 0);
  const [creator, setCreator] = useState<any>(null);
  const heartScale = useRef(new Animated.Value(1)).current;
  const {user: currentUser} = useApp();

  const scrollViewRef = useRef<ScrollView>(null);
  const [commentsY, setCommentsY] = useState(0);

  const scrollToComments = () => {
    scrollViewRef.current?.scrollTo({ y: commentsY, animated: true });
  };

  useEffect(() => {
    loadFilm();
    loadComments();
  }, []);

  const loadFilm = async () => {
    try {
      const res = await api.get<any>(`/films/${filmId}`);
      if (res?.film) {
        setFilm(res.film);
        setLikesCount(res.film.likes || 0);
        if (res.film.likedBy?.includes(currentUser?.uid)) setLiked(true);
        if (res.film.userId) {
          fetchCreatorProfile(res.film.userId);
        }
      }
    } catch (e) { console.log(e); }
  };

  const fetchCreatorProfile = async (userId: string) => {
    try {
      const res = await api.get<any>(`/users/${userId}`);
      if (res?.user) {
        setCreator(res.user);
      }
    } catch (e) {
      console.log('Error fetching creator profile:', e);
    }
  };

  const loadComments = async () => {
    try {
      const res = await api.get<any>(`/comments/film/${filmId}`);
      setComments(res?.comments || []);
    } catch (e) { console.log(e); }
  };

  const handleLike = async () => {
    if (!currentUser) return;
    const newLiked = !liked;
    Animated.sequence([Animated.spring(heartScale, {toValue: 1.3, useNativeDriver: true, speed: 30, bounciness: 12}), Animated.spring(heartScale, {toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6})]).start();
    setLiked(newLiked);
    setLikesCount((prev: number) => newLiked ? prev + 1 : prev - 1);
    try { await api.post(`/films/${filmId}/like`); } catch { setLiked(liked); setLikesCount((prev: number) => newLiked ? prev - 1 : prev + 1); }
  };

  const addComment = async () => {
    if (!commentText.trim() || !currentUser) return;
    try {
      await api.post(`/comments/film/${filmId}`, {text: commentText.trim()});
      setCommentText('');
      loadComments();
    } catch (e) { console.log(e); }
  };

  const shareFilm = async () => {
    try { await Share.share({message: `🎬 Watch "${film.title}" on CineLink!\n\n${film.videoUrl || film.videoLink || ''}`}); } catch (e) { console.log(e); }
  };

  const watchFilm = () => { const link = film.videoUrl || film.videoLink; if (link) Linking.openURL(link); };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Film Details" navigation={navigation} transparent />
      <ScrollView ref={scrollViewRef} style={styles.scroll} showsVerticalScrollIndicator={false}>
        {film.posterUrl && film.posterUrl.trim().startsWith('http') ? (
          <View style={styles.posterContainer}>
            <Image
              source={{uri: film.posterUrl.trim()}}
              style={[
                styles.poster,
                {
                  transform: [{ translateY: film.posterOffset || 0 }]
                }
              ]}
            />
          </View>
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterEmoji}>🎬</Text>
          </View>
        )}
        <View style={styles.content}>
          <Text style={styles.title}>{film.title}</Text>
          <View style={styles.metaRow}>
            {film.genre ? <Text style={styles.metaText}>🎭 {film.genre}</Text> : null}
            {film.duration ? <Text style={styles.metaText}>⏱ {film.duration} min</Text> : null}
            <Text style={styles.metaText}>👁 {film.views || 0} views</Text>
          </View>
          {film.description ? <View style={styles.section}><Text style={styles.sectionTitle}>Description</Text><Text style={styles.description}>{film.description}</Text></View> : null}
          
          <View style={styles.actionRow}>
            <Button label="▶ Watch Film" onPress={watchFilm} size="lg" fullWidth />
            <Button label="🔗 Share" onPress={shareFilm} variant="secondary" size="lg" />
          </View>

          {/* Creator Profile Section */}
          {(creator || film.creatorName) && (
            <Card variant="elevated" style={styles.creatorCard} padding={Spacing.md}>
              <Text style={styles.creatorHeaderTitle}>Uploaded By</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  const uid = creator?._id || creator?.id || film.userId;
                  if (uid) navigation.navigate('PublicProfile', {userId: uid});
                }}
                style={styles.creatorRow}>
                <Avatar
                  name={creator?.fullName || creator?.displayName || film.creatorName || film.userEmail}
                  uri={creator?.photoUrl || creator?.photoURL || film.creatorPhotoUrl}
                  size="md"
                  ring
                />
                <View style={styles.creatorInfo}>
                  <Text style={styles.creatorName}>
                    {creator?.fullName || creator?.displayName || film.creatorName || 'Anonymous Creator'}
                  </Text>
                  <Text style={styles.creatorRole}>
                    {creator?.role || film.creatorRole || 'Creator'} · {creator?.location || 'CineLink'}
                  </Text>
                </View>
                <View style={styles.viewProfileChevron}>
                  <Text style={{color: Colors.primary, fontSize: 18}}>→</Text>
                </View>
              </TouchableOpacity>
            </Card>
          )}

          <Card variant="elevated" style={styles.engagementCard}>
            <View style={styles.engagementRow}>
              <TouchableOpacity onPress={handleLike} hitSlop={HitSlop.lg}><Animated.Text style={[styles.engagementText, {transform: [{scale: heartScale}]}]}>{liked ? '❤️' : '🤍'} {likesCount}</Animated.Text></TouchableOpacity>
              <TouchableOpacity onPress={scrollToComments} hitSlop={HitSlop.lg}><Text style={styles.engagementText}>💬 {comments.length}</Text></TouchableOpacity>
              <Text style={styles.engagementText}>👁 {film.views || 0}</Text>
            </View>
          </Card>
          <View
            style={styles.section}
            onLayout={(event) => {
              const layout = event.nativeEvent.layout;
              setCommentsY(layout.y);
            }}>
            <Text style={styles.sectionTitle}>Comments</Text>
            <View style={styles.commentInputRow}>
              <Input value={commentText} onChangeText={setCommentText} placeholder="Write a comment..." containerStyle={styles.commentInput} />
              <Button label="Send" onPress={addComment} size="md" />
            </View>
            {comments.length === 0 ? <Text style={styles.emptyText}>No comments yet</Text> : comments.map((item: any) => (
              <Card key={item._id || item.id} variant="default" padding={Spacing.md} style={styles.commentCard}>
                <View style={styles.commentHeader}><Avatar name={item.userName || item.userEmail} size="sm" /><Text style={styles.commentUser}>{item.userName || item.userEmail || 'User'}</Text></View>
                <Text style={styles.commentText}>{item.text}</Text>
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  scroll: {flex: 1},
  posterContainer: {width: '100%', aspectRatio: 16 / 9, overflow: 'hidden', backgroundColor: Colors.card},
  poster: {width: '100%', height: '100%', resizeMode: 'cover'},
  posterPlaceholder: {width: '100%', aspectRatio: 16 / 9, backgroundColor: Colors.card, justifyContent: 'center', alignItems: 'center'},
  posterEmoji: {fontSize: 64},
  content: {padding: Spacing.lg, gap: Spacing.lg},
  title: {fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary},
  metaRow: {flexDirection: 'row', gap: Spacing.md},
  metaText: {color: Colors.textSecondary, fontSize: 13},
  section: {gap: Spacing.sm},
  sectionTitle: {color: Colors.primary, fontSize: 16, fontWeight: 'bold'},
  description: {color: Colors.textSecondary, lineHeight: 22, fontSize: 14},
  actionRow: {flexDirection: 'row', gap: Spacing.sm},
  engagementCard: {backgroundColor: Colors.cardElevated},
  engagementRow: {flexDirection: 'row', justifyContent: 'space-around'},
  engagementText: {fontSize: 16, color: Colors.textSecondary},
  commentInputRow: {flexDirection: 'row', gap: Spacing.sm, alignItems: 'center'},
  commentInput: {flex: 1},
  emptyText: {color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.lg},
  commentCard: {marginBottom: Spacing.sm},
  commentHeader: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs},
  commentUser: {color: Colors.primary, fontWeight: '600', fontSize: 13},
  commentText: {color: Colors.textPrimary, fontSize: 14},
  creatorCard: {
    backgroundColor: Colors.cardElevated,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  creatorHeaderTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  creatorName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  creatorRole: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  viewProfileChevron: {
    paddingHorizontal: Spacing.sm,
  },
});
