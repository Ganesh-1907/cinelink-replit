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
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useApp} from '../src/context/AppContext';
import PremiumBadge from '../src/components/Premium/PremiumBadge';

const ADMIN_EMAIL = 'anilkumardevarakonda03@gmail.com';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) {
    return 'Creator';
  }
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

// ── DiscoverCommentSheet ─────────────────────────────────────────
function DiscoverCommentSheet({userId, visible, onClose, userName}: any) {
  const {user, isAdmin} = useApp();
  const currentUserId = user?.uid || user?._id;
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const scrollRef = useRef<any>(null);

  const fetchComments = useCallback(async () => {
    if (!visible) {
      return;
    }
    try {
      const res = await api.get<any>(`/comments/profile/${userId}`);
      const list = res.comments || [];
      // Chronological sort: oldest comments first
      const sorted = [...list].sort(
        (a: any, b: any) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setComments(sorted);
      setTimeout(() => scrollRef.current?.scrollToEnd({animated: true}), 150);
    } catch (e) {
      console.log('Error fetching comments:', e);
    }
  }, [userId, visible]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const postComment = async () => {
    if (!text.trim()) {
      return;
    }
    setPosting(true);
    try {
      const res = await api.post<any>(`/comments/profile/${userId}`, {
        text: text.trim(),
      });
      if (res.comment) {
        setComments(prev => [...prev, res.comment]);
        setText('');
        setTimeout(() => scrollRef.current?.scrollToEnd({animated: true}), 150);
      }
    } catch (e) {
      console.log('Error posting comment:', e);
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert('Delete Comment', 'Delete this comment?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/comments/${commentId}`);
            setComments(prev => prev.filter(c => c._id !== commentId));
          } catch (e) {
            console.log('Error deleting comment:', e);
          }
        },
      },
    ]);
  };

  const formatTime = (createdAtString: string) => {
    if (!createdAtString) {
      return '';
    }
    const d = new Date(createdAtString);
    if (isNaN(d.getTime())) {
      return '';
    }
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
            contentContainerStyle={styles.sheetScrollContent}>
            {comments.length === 0 ? (
              <Text style={styles.noCommentsText}>
                No comments yet. Be the first!
              </Text>
            ) : (
              comments.map(c => {
                const canDelete = c.userId === currentUserId || isAdmin;
                return (
                  <View key={c._id || c.id} style={styles.commentItem}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {c.userName?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={styles.commentContent}>
                      <View style={styles.commentNameRow}>
                        <Text style={styles.commentName}>
                          {c.userName || 'User'}
                        </Text>
                        <Text style={styles.commentTime}>
                          {formatTime(c.createdAt)}
                        </Text>
                      </View>
                      <Text style={styles.commentText}>{c.text}</Text>
                    </View>
                    {canDelete && (
                      <TouchableOpacity
                        onPress={() => handleDeleteComment(c._id || c.id)}
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
              placeholderTextColor="#5C5048"
              value={text}
              onChangeText={setText}
              multiline
              maxLength={200}
            />
            <TouchableOpacity
              style={[
                styles.sheetSendBtn,
                (!text.trim() || posting) && styles.disabledSendBtn,
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
  const {user} = useApp();
  const currentUserId = user?.uid || user?._id;
  const [likes, setLikes] = useState<number>(profileLikes);
  const [likedBy, setLikedBy] = useState<string[]>(profileLikedBy || []);
  const [commentCount, setCommentCount] = useState(0);
  const [showSheet, setShowSheet] = useState(false);
  const isLiked = currentUserId ? likedBy.includes(currentUserId) : false;

  const fetchCommentCount = useCallback(async () => {
    try {
      const res = await api.get<any>(`/comments/profile/${userId}`);
      if (res.comments) {
        setCommentCount(res.comments.length);
      }
    } catch (e) {
      console.log('Error loading comments count:', e);
    }
  }, [userId]);

  useEffect(() => {
    fetchCommentCount();
  }, [fetchCommentCount, showSheet]);

  const handleLike = async () => {
    if (!currentUserId) {
      return;
    }
    const toggled = !isLiked;
    setLikes(prev => prev + (toggled ? 1 : -1));
    setLikedBy(prev =>
      toggled
        ? [...prev, currentUserId]
        : prev.filter(id => id !== currentUserId),
    );
    try {
      const res = await api.post<any>(`/users/${userId}/like`);
      if (res.likes !== undefined) {
        setLikes(res.likes);
      }
    } catch (e) {
      console.log('Error liking profile:', e);
      setLikes(prev => prev + (toggled ? -1 : 1));
      setLikedBy(prev =>
        toggled
          ? prev.filter(id => id !== currentUserId)
          : [...prev, currentUserId],
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
  const insets = useSafeAreaInsets();
  const {user} = useApp();
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const viewedIds = useRef<Set<string>>(new Set());
  const viewabilityConfig = useRef({viewAreaCoveragePercentThreshold: 75});

  const fetchFollowing = useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      const uid = user.uid || user._id;
      const followRes = await api.get<any>(`/users/${uid}/following`);
      const followingList = followRes.following || [];
      setFollowingIds(new Set(followingList.map((u: any) => u._id || u.id)));
    } catch (e) {
      console.log('Error fetching following:', e);
    }
  }, [user]);

  useEffect(() => {
    fetchFollowing();
  }, [fetchFollowing]);

  const loadUsers = useCallback(
    async (pageNum = 1, shouldAppend = false) => {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await api.get<any>(
          `/users/search?page=${pageNum}&limit=10`,
        );
        const list = res.users || [];
        const currentUid = user?.uid || user?._id;
        const filtered = list.filter((u: any) => {
          const uid = u._id || u.id;
          return uid !== currentUid && u.email !== ADMIN_EMAIL;
        });

        if (shouldAppend) {
          setUsers(prev => [...prev, ...filtered]);
        } else {
          setUsers(filtered);
        }
        setPage(pageNum);
        setHasMore(res.hasMore === true);
      } catch (e) {
        console.log('Error loading creators:', e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user],
  );

  useEffect(() => {
    loadUsers(1, false);
  }, [loadUsers]);

  const loadMore = () => {
    if (!hasMore || loadingMore) {
      return;
    }
    loadUsers(page + 1, true);
  };

  const handleRefresh = () => {
    loadUsers(1, false);
  };

  // ── Follow / Unfollow ────────────────────────────────────────────
  const toggleFollow = async (targetId: string) => {
    if (!user) {
      return;
    }
    const isF = followingIds.has(targetId);

    setFollowingIds(prev => {
      const s = new Set(prev);
      if (isF) {
        s.delete(targetId);
      } else {
        s.add(targetId);
      }
      return s;
    });

    try {
      await api.post('/users/follow', {targetUserId: targetId});
    } catch (e) {
      console.log('Error toggling follow:', e);
      setFollowingIds(prev => {
        const s = new Set(prev);
        if (isF) {
          s.add(targetId);
        } else {
          s.delete(targetId);
        }
        return s;
      });
      Alert.alert('Error', 'Could not update follow status.');
    }
  };

  const onViewableItemsChanged = useCallback(({viewableItems}: any) => {
    viewableItems.forEach((vi: any) => {
      const uid = vi.item._id || vi.item.id;
      if (vi.isViewable && uid && !viewedIds.current.has(uid)) {
        viewedIds.current.add(uid);
        api.post(`/users/${uid}/view`).catch(() => {});
      }
    });
  }, []);

  const renderCard = ({item}: any) => {
    const uid = item._id || item.id;
    const displayName = cleanName(
      item.displayName || item.fullName || item.name || item.email,
    );
    const photoUri =
      item.photoUrl || item.photoURL || item.portfolioPhotos?.[0] || null;
    const goToProfile = () =>
      navigation.navigate('PublicProfile', {userId: uid});
    const isF = followingIds.has(uid);

    return (
      <View style={styles.card}>
        {/* ── Header: avatar · name · role (tappable) + Follow btn ── */}
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.topRowLeft}
            onPress={goToProfile}
            activeOpacity={0.7}>
            {photoUri ? (
              <Image source={{uri: photoUri}} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.topMeta}>
              <View style={styles.topNameRow}>
                <Text style={styles.topName} numberOfLines={1}>
                  {displayName}
                </Text>
                {item.verificationStatus === 'verified' && (
                  <Text style={styles.verifiedCheck}>✅</Text>
                )}
                <PremiumBadge
                  tier={item.premiumTier || 'none'}
                  verifiedReal={item.verifiedReal === true}
                  size="small"
                />
              </View>
              <View style={styles.topRolePill}>
                <Text style={styles.topRoleText}>
                  🎭 {item.role || 'Creator'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.followBtn, isF && styles.followingBtn]}
            onPress={() => toggleFollow(uid)}
            activeOpacity={0.7}>
            <Text
              style={[styles.followBtnText, isF && styles.followingBtnText]}>
              {isF ? '✓ Following' : '+ Follow'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Photo block (tappable to view profile) ── */}
        <TouchableOpacity
          style={styles.photoBlock}
          onPress={goToProfile}
          activeOpacity={0.95}>
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
        </TouchableOpacity>

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
            userId={uid}
            profileLikes={item.profileLikes}
            profileLikedBy={item.profileLikedBy}
            profileViews={item.profileViews}
            userName={displayName}
          />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loaderText}>Finding creators…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover Creators</Text>
      </View>
      <FlatList
        data={users}
        keyExtractor={item => item._id || item.id}
        renderItem={renderCard}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              size="small"
              color={Colors.primary}
              style={styles.footerLoading}
            />
          ) : !hasMore && users.length > 0 ? (
            <View style={styles.loaderBox}>
              <Text style={styles.emptyIcon}>🎭</Text>
              <Text style={styles.loaderText}>You've seen everyone!</Text>
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={handleRefresh}>
                <Text style={styles.refreshBtnText}>Start over ↺</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.loaderBox}>
            <Text style={styles.emptyIcon}>🎭</Text>
            <Text style={styles.loaderText}>No creators found yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  sheetScrollContent: {
    paddingBottom: 8,
  },
  disabledSendBtn: {
    opacity: 0.4,
  },
  verifiedCheck: {
    fontSize: 12,
    marginLeft: 4,
  },
  listContent: {
    paddingBottom: 24,
  },
  footerLoading: {
    padding: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },

  // ── loading / empty ───────────────────────────────────────────────
  loaderBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  loaderText: {
    color: Colors.textSecondary,
    fontSize: 15,
    marginTop: 12,
    ...Typography.body,
  },
  refreshBtn: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    borderRadius: Radius.card,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  refreshBtnText: {
    color: Colors.textInverse,
    fontWeight: '700',
    fontSize: 14,
    ...Typography.bodyBold,
  },

  // ── header ────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.card,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    ...Typography.title,
  },

  // ── card shell ────────────────────────────────────────────────────
  card: {
    width: '92%',
    alignSelf: 'center',
    flexDirection: 'column',
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    marginVertical: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.md,
  },

  // ── top row (avatar + name/role tappable area + follow button) ────
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.card,
  },
  topRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.borderLight,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
    ...Typography.label,
  },
  topMeta: {flex: 1},
  topNameRow: {flexDirection: 'row', alignItems: 'center'},
  topName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
    ...Typography.bodyBold,
  },
  topRolePill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.primaryMid,
    marginTop: 3,
  },
  topRoleText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '700',
    ...Typography.captionBold,
  },

  // ── photo block ───────────────────────────────────────────────────
  photoBlock: {
    width: '100%',
    height: 320,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  photo: {width: '100%', height: '100%'},
  photoPlaceholder: {
    height: 320,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: Colors.primary,
    fontSize: 72,
    fontWeight: 'bold',
    ...Typography.title,
  },

  // ── info panel (below photo) ──────────────────────────────────────
  contentPanel: {
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  location: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
    ...Typography.caption,
  },
  bio: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
    ...Typography.body,
  },

  // ── follow button (compact, in top row) ───────────────────────────
  followBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xs,
    paddingVertical: 7,
    paddingHorizontal: 14,
    alignItems: 'center',
    ...Shadows.sm,
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    shadowOpacity: 0,
    elevation: 0,
  },
  followBtnText: {
    color: Colors.textInverse,
    fontWeight: '700',
    fontSize: 13,
    ...Typography.bodyBold,
  },
  followingBtnText: {color: Colors.primary},

  // ── engagement bar ────────────────────────────────────────────────
  engRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    marginTop: 10,
    paddingTop: 10,
  },
  engBtn: {flex: 1, alignItems: 'center', paddingVertical: 4},
  engDivider: {width: 1, height: 18, backgroundColor: Colors.borderLight},
  engText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    ...Typography.bodyBold,
  },
  engLiked: {color: Colors.primary},

  // ── comment bottom sheet ──────────────────────────────────────────
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheetDismiss: {flex: 1},
  sheetContainer: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    height: '70%',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sheetTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    ...Typography.bodyBold,
  },
  sheetCloseBtn: {padding: 4, marginLeft: 8},
  sheetCloseText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  sheetScroll: {flex: 1, paddingHorizontal: Spacing.lg, paddingTop: 12},
  sheetInputRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    alignItems: 'flex-end',
    backgroundColor: Colors.card,
  },
  sheetInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radius.xs,
    padding: 10,
    color: Colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    maxHeight: 80,
    ...Typography.body,
  },
  sheetSendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xs,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sheetSendText: {
    color: Colors.textInverse,
    fontWeight: 'bold',
    fontSize: 13,
    ...Typography.bodyBold,
  },
  noCommentsText: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
    ...Typography.body,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryFaint,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  commentAvatarText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 11,
    ...Typography.captionBold,
  },
  commentContent: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radius.xs,
    padding: 8,
  },
  commentNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  commentName: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    ...Typography.captionBold,
  },
  commentTime: {color: Colors.textSecondary, fontSize: 11, ...Typography.micro},
  commentText: {
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    ...Typography.body,
  },
  deleteCommentBtn: {padding: 4, flexShrink: 0},
  deleteCommentText: {color: '#EF4444', fontSize: 12, fontWeight: 'bold'},
});
