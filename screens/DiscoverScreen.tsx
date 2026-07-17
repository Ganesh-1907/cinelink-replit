import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Share,
  FlatList,
  SafeAreaView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import PremiumBadge from '../src/components/Premium/PremiumBadge';
import {ADMIN_EMAIL} from '../src/api/config';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {Avatar, Button, Chip, SectionTitle} from '../components/ui';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) {
    return 'Creator';
  }
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

// ── DiscoverCommentSheet ─────────────────────────────────────────
function DiscoverCommentSheet({userId, visible, onClose, userName}: any) {
  const currentUser = auth().currentUser;
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const scrollRef = useRef<any>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const unsub = firestore()
      .collection('users')
      .doc(userId)
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .onSnapshot(
        snap => {
          setComments(snap.docs.map(d => ({id: d.id, ...d.data()})));
          setTimeout(
            () => scrollRef.current?.scrollToEnd({animated: true}),
            100,
          );
        },
        () => {},
      );
    return () => unsub();
  }, [userId, visible]);

  const postComment = async () => {
    if (!text.trim() || !currentUser) {
      return;
    }
    setPosting(true);
    try {
      await firestore()
        .collection('users')
        .doc(userId)
        .collection('comments')
        .add({
          text: text.trim(),
          authorId: currentUser.uid,
          authorName:
            currentUser.displayName ||
            currentUser.email?.split('@')[0] ||
            'User',
          authorPhoto: currentUser.photoURL || null,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      setText('');
    } catch (e) {
      console.log(e);
    }
    setPosting(false);
  };

  const deleteComment = async (commentId: string, authorId: string) => {
    if (authorId !== currentUser?.uid && currentUser?.email !== ADMIN_EMAIL) {
      return;
    }
    Alert.alert('Delete Comment', 'Delete this comment?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await firestore()
              .collection('users')
              .doc(userId)
              .collection('comments')
              .doc(commentId)
              .delete();
          } catch (e) {
            console.log(e);
          }
        },
      },
    ]);
  };

  const formatTime = (ts: any) => {
    if (!ts?.toDate) {
      return '';
    }
    const d = ts.toDate();
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) {
      return 'just now';
    }
    if (diff < 3600) {
      return `${Math.floor(diff / 60)}m ago`;
    }
    if (diff < 86400) {
      return `${Math.floor(diff / 3600)}h ago`;
    }
    if (diff < 172800) {
      return 'yesterday';
    }
    return d.toLocaleDateString([], {day: 'numeric', month: 'short'});
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <TouchableOpacity
          style={styles.sheetDismiss}
          activeOpacity={1}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheetContainer}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>💬 {userName}'s comments</Text>
            <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
              <Text style={styles.sheetCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            ref={scrollRef}
            style={styles.sheetScroll}
            contentContainerStyle={{paddingBottom: Spacing.sm}}>
            {comments.length === 0 ? (
              <Text style={styles.noCommentsText}>
                No comments yet. Be the first!
              </Text>
            ) : (
              comments.map(c => {
                const canDelete =
                  c.authorId === currentUser?.uid ||
                  currentUser?.email === ADMIN_EMAIL;
                return (
                  <View key={c.id} style={styles.commentItem}>
                    <Avatar
                      name={c.authorName || 'User'}
                      uri={c.authorPhoto}
                      size={28}
                      ring
                    />
                    <View style={styles.commentContent}>
                      <View style={styles.commentNameRow}>
                        <Text style={styles.commentName}>
                          {c.authorName || 'User'}
                        </Text>
                        <Text style={styles.commentTime}>
                          {formatTime(c.createdAt)}
                        </Text>
                      </View>
                      <Text style={styles.commentText}>{c.text}</Text>
                    </View>
                    {canDelete && (
                      <TouchableOpacity
                        onPress={() => deleteComment(c.id, c.authorId)}
                        style={styles.deleteCommentBtn}>
                        <Text style={styles.deleteCommentText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
          <View style={styles.sheetInputRow}>
            <TextInput
              style={styles.sheetInput}
              placeholder="Write a comment..."
              placeholderTextColor={Colors.textTertiary}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={200}
            />
            <TouchableOpacity
              style={[
                styles.sheetSendBtn,
                (!text.trim() || posting) && {opacity: 0.4},
              ]}
              onPress={postComment}
              disabled={!text.trim() || posting}>
              {posting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.sheetSendText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── DiscoverEngagementBar ────────────────────────────────────────
function DiscoverEngagementBar({
  userId,
  profileLikes = 0,
  profileLikedBy = [],
  profileViews = 0,
  userName,
}: any) {
  const currentUser = auth().currentUser;
  const [likes, setLikes] = useState<number>(profileLikes);
  const [likedBy, setLikedBy] = useState<string[]>(profileLikedBy || []);
  const [commentCount, setCommentCount] = useState(0);
  const [showSheet, setShowSheet] = useState(false);
  const isLiked = currentUser ? likedBy.includes(currentUser.uid) : false;

  useEffect(() => {
    const unsub = firestore()
      .collection('users')
      .doc(userId)
      .collection('comments')
      .onSnapshot(
        snap => setCommentCount(snap.size),
        err => console.log('comment count error:', err),
      );
    return () => unsub();
  }, [userId, showSheet]);

  const handleLike = async () => {
    if (!currentUser) {
      return;
    }
    const toggled = !isLiked;
    setLikes(prev => prev + (toggled ? 1 : -1));
    setLikedBy(prev =>
      toggled
        ? [...prev, currentUser.uid]
        : prev.filter(id => id !== currentUser.uid),
    );
    try {
      await firestore()
        .collection('users')
        .doc(userId)
        .update({
          profileLikes: firestore.FieldValue.increment(toggled ? 1 : -1),
          profileLikedBy: toggled
            ? firestore.FieldValue.arrayUnion(currentUser.uid)
            : firestore.FieldValue.arrayRemove(currentUser.uid),
        });
    } catch {
      setLikes(prev => prev + (toggled ? -1 : 1));
      setLikedBy(prev =>
        toggled
          ? prev.filter(id => id !== currentUser.uid)
          : [...prev, currentUser.uid],
      );
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🎭 Check out ${userName || 'this creator'} on CineLink!`,
        title: userName,
      });
    } catch {}
  };

  return (
    <>
      <View style={styles.engRow}>
        <TouchableOpacity
          style={styles.engBtn}
          onPress={handleLike}
          activeOpacity={0.7}>
          <Text style={[styles.engText, isLiked && styles.engLiked]}>
            {isLiked ? '❤️' : '🤍'} {likes}
          </Text>
        </TouchableOpacity>
        <View style={styles.engDivider} />
        <View style={styles.engBtn}>
          <Text style={styles.engText}>👁 {profileViews || 0}</Text>
        </View>
        <View style={styles.engDivider} />
        <TouchableOpacity
          style={styles.engBtn}
          onPress={() => setShowSheet(true)}
          activeOpacity={0.7}>
          <Text style={styles.engText}>💬 {commentCount}</Text>
        </TouchableOpacity>
        <View style={styles.engDivider} />
        <TouchableOpacity
          style={styles.engBtn}
          onPress={handleShare}
          activeOpacity={0.7}>
          <Text style={styles.engText}>↗ Share</Text>
        </TouchableOpacity>
      </View>
      <DiscoverCommentSheet
        userId={userId}
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        userName={userName}
      />
    </>
  );
}

// ── DiscoverScreen ───────────────────────────────────────────────
export default function DiscoverScreen({navigation}: any) {
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cardHeight, setCardHeight] = useState(0);
  const [cursor, setCursor] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const currentUser = auth().currentUser;
  const viewedIds = useRef<Set<string>>(new Set());
  const viewabilityConfig = useRef({viewAreaCoveragePercentThreshold: 75});

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    firestore()
      .collection('users')
      .doc(currentUser.uid)
      .collection('following')
      .get()
      .then(snap => setFollowingIds(new Set(snap.docs.map(d => d.id))))
      .catch(e => console.log(e));
  }, []);

  useEffect(() => {
    loadUsers();
  }, []);

  // ── Follow / Unfollow ────────────────────────────────────────────
  const toggleFollow = async (targetId: string) => {
    if (!currentUser) {
      return;
    }
    const isF = followingIds.has(targetId);
    const currentUserName =
      currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
    try {
      const followerRef = firestore()
        .collection('users')
        .doc(targetId)
        .collection('followers')
        .doc(currentUser.uid);
      const followingRef = firestore()
        .collection('users')
        .doc(currentUser.uid)
        .collection('following')
        .doc(targetId);
      if (isF) {
        await followerRef.delete();
        await followingRef.delete();
        setFollowingIds(prev => {
          const s = new Set(prev);
          s.delete(targetId);
          return s;
        });
      } else {
        await followerRef.set({
          userId: currentUser.uid,
          userName: currentUserName,
          email: currentUser.email,
          followedAt: firestore.FieldValue.serverTimestamp(),
        });
        await followingRef.set({
          userId: targetId,
          followedAt: firestore.FieldValue.serverTimestamp(),
        });
        setFollowingIds(prev => new Set([...prev, targetId]));
      }
    } catch (e) {
      console.log(e);
    }
  };

  // ── Pagination ───────────────────────────────────────────────────
  const loadUsers = async () => {
    setLoading(true);
    try {
      const snap = await firestore().collection('users').limit(10).get();
      const data = snap.docs
        .filter(
          d => d.id !== currentUser?.uid && d.data().email !== ADMIN_EMAIL,
        )
        .map(d => ({id: d.id, ...d.data()}));
      setUsers(data);
      setCursor(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === 10);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore || !cursor) {
      return;
    }
    setLoadingMore(true);
    try {
      const snap = await firestore()
        .collection('users')
        .limit(10)
        .startAfter(cursor)
        .get();
      const data = snap.docs
        .filter(
          d => d.id !== currentUser?.uid && d.data().email !== ADMIN_EMAIL,
        )
        .map(d => ({id: d.id, ...d.data()}));
      setUsers(prev => [...prev, ...data]);
      setCursor(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === 10);
    } catch (e) {
      console.log(e);
    } finally {
      setLoadingMore(false);
    }
  };

  const onViewableItemsChanged = useCallback(({viewableItems}: any) => {
    viewableItems.forEach((vi: any) => {
      if (vi.isViewable && !viewedIds.current.has(vi.item.id)) {
        viewedIds.current.add(vi.item.id);
        firestore()
          .collection('users')
          .doc(vi.item.id)
          .update({
            profileViews: firestore.FieldValue.increment(1),
          })
          .catch(() => {});
      }
    });
  }, []);

  // ── Card ─────────────────────────────────────────────────────────
  const renderCard = ({item}: any) => {
    const displayName = cleanName(
      item.displayName || item.fullName || item.name || item.email,
    );
    const photoUri =
      item.photoUrl || item.photoURL || item.portfolioPhotos?.[0] || null;
    const isFollowing = followingIds.has(item.id);
    const goToProfile = () =>
      navigation.navigate('PublicProfile', {userId: item.id});

    return (
      <View style={[styles.card, {height: cardHeight}]}>
        {/* ── Header: avatar · name · role + Follow btn ── */}
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.topRowLeft}
            onPress={goToProfile}
            activeOpacity={0.7}>
            <Avatar
              uri={photoUri}
              name={displayName}
              size="sm"
              ring
              verified={item.verificationStatus === 'verified'}
            />
            <View style={styles.topMeta}>
              <View style={styles.topNameRow}>
                <Text style={styles.topName} numberOfLines={1}>
                  {displayName}
                </Text>
                <PremiumBadge
                  tier={item.premiumTier || 'none'}
                  verifiedReal={item.verifiedReal === true}
                  size="small"
                />
              </View>
              <Chip
                label={`🎭 ${item.role || 'Creator'}`}
                static
                variant="default"
              />
            </View>
          </TouchableOpacity>
          <Button
            label={isFollowing ? '✓ Following' : '+ Follow'}
            onPress={() => toggleFollow(item.id)}
            variant={isFollowing ? 'outline' : 'primary'}
            size="sm"
          />
        </View>

        {/* ── Photo block ── */}
        <View style={styles.photoBlock}>
          {photoUri ? (
            <Image
              source={{uri: photoUri}}
              style={styles.photo}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.initials}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* ── Info panel: location · bio · engagement bar ── */}
        <View style={styles.contentPanel}>
          {item.location ? (
            <Text style={styles.location}>📍 {item.location}</Text>
          ) : null}
          {item.bio ? (
            <Text style={styles.bio} numberOfLines={2}>
              {item.bio}
            </Text>
          ) : null}
          <DiscoverEngagementBar
            userId={item.id}
            profileLikes={item.profileLikes}
            profileLikedBy={item.profileLikedBy}
            profileViews={item.profileViews}
            userName={displayName}
          />
        </View>
      </View>
    );
  };

  // ── JSX ──────────────────────────────────────────────────────────
  if (loading || cardHeight === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View
          style={styles.loaderBox}
          onLayout={e => setCardHeight(e.nativeEvent.layout.height)}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loaderText}>Finding creators…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        renderItem={renderCard}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        getItemLayout={(_, index) => ({
          length: cardHeight,
          offset: cardHeight * index,
          index,
        })}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              size="small"
              color={Colors.primary}
              style={{padding: Spacing.xl}}
            />
          ) : !hasMore && users.length > 0 ? (
            <View style={[styles.loaderBox, {height: cardHeight}]}>
              <Text style={{fontSize: 48, marginBottom: Spacing.md}}>🎭</Text>
              <Text style={styles.loaderText}>You've seen everyone!</Text>
              <Button
                label="Start over ↺"
                onPress={loadUsers}
                variant="primary"
                size="sm"
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={[styles.loaderBox, {height: cardHeight}]}>
            <Text style={{fontSize: 48, marginBottom: Spacing.md}}>🎭</Text>
            <Text style={styles.loaderText}>No creators found yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},

  // ── loading / empty ───────────────────────────────────────────────
  loaderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  loaderText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },

  // ── card shell ────────────────────────────────────────────────────
  card: {
    width: '100%',
    flexDirection: 'column',
    backgroundColor: Colors.background,
  },

  // ── top row ───────────────────────────────────────────────────────
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.cardElevated,
  },
  topRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topMeta: {flex: 1, marginLeft: Spacing.sm},
  topNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  topName: {
    ...Typography.label,
    color: Colors.textPrimary,
    flexShrink: 1,
    marginRight: Spacing.xs,
  },

  // ── photo block ───────────────────────────────────────────────────
  photoBlock: {
    width: '100%',
    flex: 1,
    overflow: 'hidden',
    backgroundColor: Colors.card,
  },
  photo: {width: '100%', height: '100%'},
  photoPlaceholder: {
    flex: 1,
    backgroundColor: Colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {color: Colors.primary, fontSize: 72, fontWeight: 'bold'},

  // ── info panel ────────────────────────────────────────────────────
  contentPanel: {
    backgroundColor: Colors.cardElevated,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  location: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  bio: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },

  // ── engagement bar ────────────────────────────────────────────────
  engRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  engBtn: {flex: 1, alignItems: 'center', paddingVertical: Spacing.xs},
  engDivider: {width: 1, height: 18, backgroundColor: Colors.border},
  engText: {...Typography.captionBold, color: Colors.textSecondary},
  engLiked: {color: Colors.primary},

  // ── comment bottom sheet ──────────────────────────────────────────
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  sheetDismiss: {flex: 1},
  sheetContainer: {
    backgroundColor: Colors.cardElevated,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    height: '70%',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetTitle: {...Typography.label, color: Colors.textPrimary, flex: 1},
  sheetCloseBtn: {padding: Spacing.xs, marginLeft: Spacing.sm},
  sheetCloseText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: 'bold',
  },
  sheetScroll: {flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md},
  sheetInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'flex-end',
  },
  sheetInput: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    maxHeight: 80,
  },
  sheetSendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  sheetSendText: {...Typography.captionBold, color: Colors.textPrimary},
  noCommentsText: {
    ...Typography.bodySm,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  commentContent: {
    flex: 1,
    backgroundColor: Colors.cardHigher,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  commentNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  commentName: {...Typography.captionBold, color: Colors.primary},
  commentTime: {...Typography.micro, color: Colors.textTertiary},
  commentText: {...Typography.bodySm, color: Colors.textPrimary},
  deleteCommentBtn: {padding: Spacing.xs, flexShrink: 0},
  deleteCommentText: {
    ...Typography.caption,
    color: Colors.error,
    fontWeight: 'bold',
  },
});
