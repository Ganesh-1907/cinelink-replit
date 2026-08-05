import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Image, ActivityIndicator, Alert} from 'react-native';
import api from '../src/api/client';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Button, Card, EmptyState, Badge} from '../components/ui';
import {useApp} from '../src/context/AppContext';

export default function MyQuickPostsScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const {user, isAdmin, isApprovedDirector} = useApp();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await api.get<{posts: any[]} | any>('/feed-posts');
      const postsArray = Array.isArray(res) ? res : res.posts || [];
      // Filter posts that are general posts and created by this user (or all if admin)
      const filtered = postsArray
        .filter((p: any) => p.postType === 'general' && (p.userId === user?.uid || p.userId === user?._id))
        .map((p: any) => ({...p, id: p._id || p.id}));
      setPosts(filtered);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isAdmin && !isApprovedDirector) {
      Alert.alert('Access Denied', 'Casting Director or Admin access required.', [
        {text: 'Go Back', onPress: () => navigation.goBack()}
      ]);
    }
  }, [isAdmin, isApprovedDirector, navigation]);

  useEffect(() => {
    if (isAdmin || isApprovedDirector) {
      fetchPosts();
    }
  }, [fetchPosts, isAdmin, isApprovedDirector]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchPosts);
    return unsub;
  }, [navigation, fetchPosts]);

  const deletePost = (post: any) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/feed-posts/${post.id}`);
            fetchPosts();
          } catch {
            Alert.alert('Error', 'Could not delete post.');
          }
        },
      },
    ]);
  };

  const canPost = isAdmin || isApprovedDirector;

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="My Quick Posts" navigation={navigation} />
      <ScrollView contentContainerStyle={[styles.scroll, {paddingBottom: insets.bottom + 40}]}>
        {canPost && (
          <Button
            label="➕ Create Quick Post"
            variant="primary"
            size="md"
            onPress={() => navigation.navigate('PostQuickPost')}
            style={styles.addButton}
          />
        )}

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 60}} />
        ) : posts.length === 0 ? (
          <EmptyState
            icon="⚡"
            title="No quick posts yet"
            subtitle="Publish quick text/media updates to the community feed"
            actionLabel={canPost ? "Create Quick Post" : undefined}
            onAction={canPost ? () => navigation.navigate('PostQuickPost') : undefined}
          />
        ) : (
          posts.map((item: any) => {
            return (
              <Card key={item.id} variant="elevated" style={styles.card}>
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.timeText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                  </View>
                  
                  {item.imageUrl ? (
                    <Image source={{uri: item.imageUrl}} style={styles.postImage} resizeMode="cover" />
                  ) : null}
                  
                  <Text style={[styles.bodyText, {color: Colors.textPrimary}]}>{item.text}</Text>
                  
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.editBtn]}
                      onPress={() => navigation.navigate('PostQuickPost', {post: item})}>
                      <Text style={styles.editBtnText}>✏️ Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.deleteBtn]}
                      onPress={() => deletePost(item)}>
                      <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  scroll: {padding: Spacing.lg},
  addButton: {marginBottom: Spacing.lg},
  card: {
    marginBottom: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.card,
  },
  cardContent: {padding: Spacing.md},
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  timeText: {
    color: Colors.textSecondary,
    ...Typography.caption,
  },
  postImage: {
    width: '100%',
    height: 180,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  bodyText: {
    ...Typography.body,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
  },
  actionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  editBtn: {
    backgroundColor: Colors.primaryFaint,
    borderColor: Colors.primary,
  },
  editBtnText: {
    color: Colors.primary,
    ...Typography.captionBold,
  },
  deleteBtn: {
    backgroundColor: Colors.errorFaint,
    borderColor: Colors.errorBorder,
  },
  deleteBtnText: {
    color: Colors.error,
    ...Typography.captionBold,
  },
});
