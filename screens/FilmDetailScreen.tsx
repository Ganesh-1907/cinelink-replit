import React, {useEffect, useState, useRef} from 'react';
import {View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, Share, SafeAreaView, Animated} from 'react-native';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius, Shadows, HitSlop} from '../src/theme';
import {Header, Avatar, Button, Input} from '../components/ui';
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
    Animated.sequence([
      Animated.spring(heartScale, {toValue: 1.3, useNativeDriver: true, speed: 30, bounciness: 12}),
      Animated.spring(heartScale, {toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6})
    ]).start();
    setLiked(newLiked);
    setLikesCount((prev: number) => newLiked ? prev + 1 : prev - 1);
    try {
      await api.post(`/films/${filmId}/like`);
    } catch {
      setLiked(liked);
      setLikesCount((prev: number) => newLiked ? prev - 1 : prev + 1);
    }
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
    try {
      await Share.share({
        message: `🎬 Watch "${film.title}" on CineLink!\n\n${film.videoUrl || film.videoLink || ''}`
      });
    } catch (e) { console.log(e); }
  };

  const watchFilm = () => {
    const link = film.videoUrl || film.videoLink;
    if (link) Linking.openURL(link);
  };

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
          <View style={styles.titleSection}>
            <Text style={styles.title}>{film.title}</Text>
            <View style={styles.metaBadgeRow}>
              {film.genre ? (
                <View style={styles.metaBadge}>
                  <Text style={styles.metaBadgeText}>🎭 {film.genre}</Text>
                </View>
              ) : null}
              {film.duration ? (
                <View style={styles.metaBadge}>
                  <Text style={styles.metaBadgeText}>⏱ {film.duration} min</Text>
                </View>
              ) : null}
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>👁 {film.views || 0} views</Text>
              </View>
            </View>
          </View>

          {film.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{film.description}</Text>
            </View>
          ) : null}
          
          <View style={styles.actionRow}>
            <View style={{flex: 2}}>
              <Button
                label="▶  Watch Film"
                onPress={watchFilm}
                size="md"
                fullWidth
                style={{paddingHorizontal: 8}}
              />
            </View>
            <View style={{flex: 1}}>
              <Button
                label="🔗  Share"
                onPress={shareFilm}
                variant="secondary"
                size="md"
                fullWidth
                style={{paddingHorizontal: 8}}
              />
            </View>
          </View>

          {/* Creator/Uploader Section */}
          {(creator || film.creatorName) && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                const uid = creator?._id || creator?.id || film.userId;
                if (uid) navigation.navigate('PublicProfile', {userId: uid});
              }}
              style={styles.uploaderRow}>
              <Avatar
                name={creator?.fullName || creator?.displayName || film.creatorName || film.userEmail}
                uri={creator?.photoUrl || creator?.photoURL || film.creatorPhotoUrl}
                size="sm"
                ring
              />
              <View style={styles.uploaderInfo}>
                <Text style={styles.uploaderLabel}>Uploaded By</Text>
                <Text style={styles.uploaderName}>
                  {creator?.fullName || creator?.displayName || film.creatorName || 'Creator'}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.engagementRow}>
            <TouchableOpacity 
              onPress={handleLike} 
              activeOpacity={0.8}
              style={[
                styles.engagementPill, 
                liked && { backgroundColor: Colors.errorFaint, borderColor: Colors.errorBorder }
              ]}>
              <Animated.Text style={[
                styles.engagementText, 
                { transform: [{ scale: heartScale }] },
                liked && { color: Colors.error }
              ]}>
                {liked ? '❤️' : '🤍'} {likesCount}
              </Animated.Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={scrollToComments} 
              activeOpacity={0.8}
              style={styles.engagementPill}>
              <Text style={styles.engagementText}>💬 {comments.length}</Text>
            </TouchableOpacity>

            <View style={styles.engagementPill}>
              <Text style={styles.engagementText}>👁 {film.views || 0}</Text>
            </View>
          </View>

          <View
            style={styles.section}
            onLayout={(event) => {
              const layout = event.nativeEvent.layout;
              setCommentsY(layout.y);
            }}>
            <Text style={styles.sectionTitle}>Comments</Text>
            
            <View style={styles.commentInputRow}>
              <Input 
                value={commentText} 
                onChangeText={setCommentText} 
                placeholder="Write a comment..." 
                containerStyle={styles.commentInput} 
              />
              <Button 
                label="Send" 
                onPress={addComment} 
                size="md" 
                style={styles.commentSendBtn}
              />
            </View>

            {comments.length === 0 ? (
              <Text style={styles.emptyText}>No comments yet</Text>
            ) : (
              comments.map((item: any) => (
                <View key={item._id || item.id} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentHeaderLeft}>
                      <Avatar
                        name={item.userName || item.userEmail || 'User'}
                        uri={item.userAvatar}
                        size="sm"
                      />
                      <View style={styles.commentUserInfo}>
                        <Text style={styles.commentUser}>
                          {item.userName || item.userEmail || 'User'}
                        </Text>
                      </View>
                    </View>
                    {item.createdAt ? (
                      <Text style={styles.commentTime}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.commentText}>{item.text}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  posterContainer: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    aspectRatio: 16 / 9,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.md,
  },
  poster: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  posterPlaceholder: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    aspectRatio: 16 / 9,
    borderRadius: Radius.lg,
    backgroundColor: Colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  posterEmoji: {
    fontSize: 64,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  titleSection: {
    gap: Spacing.xs,
  },
  title: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  metaBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs + 2,
    marginTop: Spacing.xs,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 1,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryFaint,
    borderWidth: 1,
    borderColor: Colors.primaryMid,
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  description: {
    color: Colors.textSecondary,
    lineHeight: 22,
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginVertical: Spacing.xs,
    width: '100%',
  },
  uploaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  uploaderInfo: {
    justifyContent: 'center',
  },
  uploaderLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  uploaderName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 1,
  },
  engagementRow: {
    flexDirection: 'row',
    gap: Spacing.sm + 2,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  engagementPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  engagementText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  commentInput: {
    flex: 1,
  },
  commentSendBtn: {
    height: 48,
    minHeight: 48,
    paddingHorizontal: Spacing.lg,
  },
  commentItem: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  commentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  commentUserInfo: {
    justifyContent: 'center',
  },
  commentUser: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  commentTime: {
    color: Colors.textTertiary,
    fontSize: 11,
  },
  commentText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    paddingLeft: 40,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
