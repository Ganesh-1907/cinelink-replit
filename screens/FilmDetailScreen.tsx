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
  const heartScale = useRef(new Animated.Value(1)).current;
  const {user: currentUser} = useApp();

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
      }
    } catch (e) { console.log(e); }
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
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {film.posterUrl ? <Image source={{uri: film.posterUrl}} style={styles.poster} /> : <View style={styles.posterPlaceholder}><Text style={styles.posterEmoji}>🎬</Text></View>}
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
          <Card variant="elevated" style={styles.engagementCard}>
            <View style={styles.engagementRow}>
              <TouchableOpacity onPress={handleLike} hitSlop={HitSlop.lg}><Animated.Text style={[styles.engagementText, {transform: [{scale: heartScale}]}]}>{liked ? '❤️' : '🤍'} {likesCount}</Animated.Text></TouchableOpacity>
              <Text style={styles.engagementText}>💬 {comments.length}</Text>
              <Text style={styles.engagementText}>👁 {film.views || 0}</Text>
            </View>
          </Card>
          <View style={styles.section}>
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
  poster: {width: '100%', height: 250, resizeMode: 'cover'},
  posterPlaceholder: {width: '100%', height: 250, backgroundColor: Colors.card, justifyContent: 'center', alignItems: 'center'},
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
});
