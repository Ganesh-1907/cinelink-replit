import React, {useEffect, useState, useCallback, useRef} from 'react';

import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Animated,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTheme} from '../src/context/ThemeContext';
import api from '../src/api/client';
import {launchImageLibrary} from 'react-native-image-picker';

import ReportModal from './ReportModal';
import {LiquidPress} from '../components/LiquidPress';
import EngagementBar from '../components/EngagementBar';
import {RippleIcon} from '../components/RippleIcon';
import {CrownIcon} from '../components/CrownIcon';
import {CATEGORY_COLORS} from '../src/api/config';
import {uploadImage} from '../src/services/uploadService';
import {useApp} from '../src/context/AppContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {
  Avatar,
  EmptyState,
  Chip,
  SkeletonCard,
  SectionTitle,
  Badge,
} from '../components/ui';

function PhoneText({text, textStyle}: {text: string; textStyle: any}) {
  const parts = text.split(/(\+?[\d][\d\s\-]{8,13}[\d])/g);
  return (
    <Text style={textStyle}>
      {parts.map((part, i) => {
        const cleaned = part.replace(/[\s\-]/g, '');
        const isPhone = /^\+?\d{10,13}$/.test(cleaned);
        if (isPhone) {
          return (
            <Text
              key={i}
              style={[textStyle, {color: '#25D366', fontWeight: 'bold'}]}
              onPress={() => {
                const url = `whatsapp://send?phone=${cleaned}`;
                Linking.openURL(url).catch(() =>
                  Alert.alert(
                    'WhatsApp not found',
                    'Please install WhatsApp to contact.',
                  ),
                );
              }}>
              {'📱 '}
              {part}
            </Text>
          );
        }
        return (
          <Text key={i} style={textStyle}>
            {part}
          </Text>
        );
      })}
    </Text>
  );
}

function ProfileCard({item, navigation}: any) {
  const {user: currentUser} = useApp();
  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    if (!currentUser) {
      return;
    }
    try {
      const currentUserName =
        currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
      await api.post('/connections/request', {targetUserId: item.id});
      setConnected(true);
    } catch (e) {
      console.log('CONNECT ERROR:', e);
    }
  };

  return (
    <View style={styles.profileCard}>
      <View style={styles.profileCardInner}>
        <Avatar
          uri={item.photoUrl}
          name={item.displayName || item.name}
          size="md"
          ring
          verified={item.verified}
        />
        <View style={styles.profileInfo}>
          <View style={styles.profileNameRow}>
            <Text style={styles.profileName} numberOfLines={1}>
              {item.displayName || item.name || 'Unknown'}
            </Text>
            {item.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
              </View>
            )}
          </View>
          <Text style={styles.profileMeta} numberOfLines={1}>
            {[item.role, item.city].filter(Boolean).join(' · ') ||
              'CineLink Member'}
          </Text>
        </View>
        <View style={styles.profileActions}>
          {connected ? (
            <View style={styles.connectedChip}>
              <Text style={styles.connectedChipText}>✓ Connected</Text>
            </View>
          ) : (
            <LiquidPress style={styles.connectBtn} onPress={handleConnect}>
              <Text style={[styles.connectBtnText, {color: Colors.background !== '#FFFFFF' ? Colors.background : '#1A1C1E'}]}>Connect</Text>
            </LiquidPress>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.viewProfileBtn}
        onPress={() => navigation.navigate('PublicProfile', {userId: item.id})}>
        <Text style={styles.viewProfileText}>View Profile →</Text>
      </TouchableOpacity>
    </View>
  );
}

function AuditionCard({item, navigation}: any) {
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

  const getDaysLeft = (dateStr: string) => {
    if (!dateStr) {
      return null;
    }
    const deadline = new Date(dateStr);
    if (isNaN(deadline.getTime())) {
      return null;
    }
    const diff = Math.ceil(
      (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (diff < 0) {
      return {label: 'Deadline passed', color: '#FCA5A5'};
    }
    if (diff === 0) {
      return {label: 'Last day!', color: Colors.warning};
    }
    return {label: `${diff} days left`, color: Colors.success};
  };

  const isAuditionDoc = item.source === 'audition';
  const daysLeft = isAuditionDoc ? getDaysLeft(item.lastDate) : null;
  const catColor =
    isAuditionDoc && item.category && CATEGORY_COLORS[item.category]
      ? CATEGORY_COLORS[item.category]
      : CATEGORY_COLORS.Movies;

  return (
    <TouchableOpacity
      style={styles.auditionCard}
      onPress={() => {
        if (isAuditionDoc) {
          navigation.navigate('AuditionDetail', {audition: item});
        } else {
          navigation.navigate('BrowseAuditions');
        }
      }}      activeOpacity={0.85}>
      {/* Header */}
      <View style={styles.auditionCardHeader}>
        <View style={styles.auditionBadge}>
          <Text style={styles.auditionBadgeText}>
            {isAuditionDoc ? '🎭 Audition' : '🛡️ CineLink Admin'}
          </Text>
        </View>
        <Text style={styles.bubbleTime}>{formatTime(item.createdAt)}</Text>
      </View>

      {/* Category chip */}
      {isAuditionDoc && item.category ? (
        <View style={styles.categoryPillWrapper}>
          <View
            style={[
              styles.categoryPill,
              {backgroundColor: catColor.bg, borderColor: catColor.border},
            ]}>
            <Text style={[styles.categoryPillText, {color: catColor.text}]}>
              {item.category}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Poster */}
      {item.posterUrl || item.imageUrl ? (
        <Image
          source={{uri: item.posterUrl || item.imageUrl}}
          style={styles.auditionPoster}
          resizeMode="cover"
        />
      ) : null}

      {/* Title */}
      <Text style={styles.auditionTitle} numberOfLines={2}>
        {item.title || item.text || 'Audition'}
      </Text>

      {/* Budget + Positions */}
      {isAuditionDoc && (item.budget || item.positions) ? (
        <View style={styles.budgetRow}>
          {item.budget ? (
            <View style={styles.budgetPill}>
              <Text style={styles.budgetPillText}>💰 {item.budget}</Text>
            </View>
          ) : null}
          {item.positions ? (
            <View style={styles.positionsPill}>
              <Text style={styles.positionsPillText}>👥 {item.positions}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Meta badges */}
      <View style={styles.auditionMeta}>
        {item.role ? (
          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeText}>🎭 {item.role}</Text>
          </View>
        ) : null}
        {item.location ? (
          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeText}>📍 {item.location}</Text>
          </View>
        ) : null}
        {item.gender ? (
          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeText}>👤 {item.gender}</Text>
          </View>
        ) : null}
        {item.language ? (
          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeText}>🗣 {item.language}</Text>
          </View>
        ) : null}
      </View>

      {/* Director + applicants */}
      <View style={styles.auditionFooterRow}>
        {item.directorName ? (
          <Text style={styles.auditionDirector}>👥 {item.directorName}</Text>
        ) : null}
        {isAuditionDoc ? (
          <Text style={styles.applicantsText}>
            {item.applicants?.length || item.applicationCount || 0} applied
          </Text>
        ) : null}
      </View>

      {/* Deadline countdown */}
      {isAuditionDoc && item.lastDate ? (
        <View style={styles.deadlineRow}>
          <Text style={styles.deadlineLabel}>Apply before {item.lastDate}</Text>
          {daysLeft ? (
            <Text style={[styles.daysLeftText, {color: daysLeft.color}]}>
              {daysLeft.label}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Engagement */}
      {isAuditionDoc && (
        <EngagementBar
          auditionId={item.id}
          likes={item.likes || 0}
          likedBy={item.likedBy || []}
          commentCount={0}
          views={item.views || 0}
          shareTitle={item.title || 'Audition'}
        />
      )}

      {/* CTA */}
      {isAuditionDoc ? (
        <View style={styles.auditionBtnRow}>
          <TouchableOpacity
            style={styles.contactBtn}
            onPress={e => {
              e.stopPropagation?.();
              navigation.navigate('AuditionDetail', {audition: item});
            }}>
            <Text style={styles.contactBtnText}>Contact</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.applyBtnFilled}
            onPress={e => {
              e.stopPropagation?.();
              navigation.navigate('AuditionDetail', {audition: item});
            }}>
            <Text style={styles.applyBtnFilledText}>Apply →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.auditionCTA}>
          <Text style={styles.auditionCTAText}>View & Apply →</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function PostBubble({item, isAdmin, onDelete, navigation}: any) {
  const {user: currentUser} = useApp();
  const currentUserName =
    currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  const [postComments, setPostComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    loadComments();
  }, [item.id]);

  const loadComments = async () => {
    try {
      const res = await api.get<any>(`/comments/feedPost/${item.id}`);
      setPostComments(res.comments || []);
    } catch (e) { console.log(e); }
  };

  const postComment = async () => {
    if (!commentText.trim()) return;
    setPostingComment(true);
    try {
      await api.post(`/comments/feedPost/${item.id}`, {text: commentText.trim()});
      setCommentText('');
      setShowComments(false);
      loadComments();
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Could not post comment.');
    }
    setPostingComment(false);
  };

  const deleteComment = async (commentId: string, commentUserId: string) => {
    if (commentUserId !== currentUser?.uid && !isAdmin) return;
    Alert.alert('Delete Comment', 'Delete this comment?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/comments/${commentId}`);
          loadComments();
        } catch (e) { console.log(e); }
      }},
    ]);
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
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
    if (diff < 604800) {
      return `${Math.floor(diff / 86400)}d ago`;
    }
    return d.toLocaleDateString([], {day: 'numeric', month: 'short'});
  };

  const confirmDelete = () => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id)},
    ]);
  };

  return (
    <View style={styles.bubble}>
      <View style={styles.bubbleHeader}>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>🛡️ CineLink Admin</Text>
        </View>
        <Text style={styles.bubbleTime}>{formatTime(item.createdAt)}</Text>
      </View>

      {item.posterUrl || item.imageUrl ? (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() =>
            navigation.navigate('ImageViewer', {
              imageUrl: item.posterUrl || item.imageUrl,
            })
          }>
          <Image
            source={{uri: item.posterUrl || item.imageUrl}}
            style={styles.bubbleImage}
            resizeMode="cover"
          />
          <View style={styles.tapHint}>
            <Text style={styles.tapHintText}>🔍 Tap to view fullscreen</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {item.title || item.text ? (
        <PhoneText
          text={item.title || item.text}
          textStyle={styles.bubbleText}
        />
      ) : null}

      <View style={styles.bubbleActions}>
        <TouchableOpacity
          style={styles.commentToggleBtn}
          onPress={() => setShowComments(!showComments)}>
          <Text style={styles.commentToggleText}>
            💬{' '}
            {postComments.length > 0
              ? `${postComments.length} Comment${
                  postComments.length > 1 ? 's' : ''
                }`
              : 'Comment'}
          </Text>
        </TouchableOpacity>
        {isAdmin && (
          <TouchableOpacity onPress={confirmDelete}>
            <Text style={styles.bubbleDeleteText}>🗑 Delete</Text>
          </TouchableOpacity>
        )}
      </View>

      {showComments && (
        <View style={styles.commentsBox}>
          <View style={styles.commentInputRow}>
            <TextInput
              style={[
                styles.commentInput,
                {
                  color: Colors.textPrimary,
                  backgroundColor: Colors.cardElevated,
                  borderColor: Colors.borderLight,
                },
              ]}
              placeholder="Write a comment..."
              placeholderTextColor={Colors.textTertiary}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={200}
            />
            <LiquidPress
              style={[
                styles.commentSendBtn,
                (!commentText.trim() || postingComment) && {opacity: 0.4},
              ]}
              onPress={postComment}
              disabled={!commentText.trim() || postingComment}>
              {postingComment ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.commentSendText}>Post</Text>
              )}
            </LiquidPress>
          </View>
          {postComments.length === 0 ? (
            <Text style={styles.noCommentsText}>
              No comments yet. Be the first!
            </Text>
          ) : (
            postComments.map(comment => {
              const canDelete = comment.userId === currentUser?.uid || isAdmin;
              return (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>
                      {comment.userName?.charAt(0)?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.commentContent}>
                    <View style={styles.commentNameRow}>
                      <Text style={styles.commentName}>{comment.userName}</Text>
                      <Text style={styles.commentTime}>
                        {formatTime(comment.createdAt)}
                      </Text>
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                  </View>
                  {canDelete && (
                    <TouchableOpacity
                      onPress={() => deleteComment(comment.id, comment.userId)}
                      style={styles.deleteCommentBtn}>
                      <Text style={styles.deleteCommentText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

export default function HomeScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [selectedTab, setSelectedTab] = useState('Auditions');
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [auditionPosts, setAuditionPosts] = useState<any[]>([]);
  const [generalPosts, setGeneralPosts] = useState<any[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [postText, setPostText] = useState('');
  const [postImage, setPostImage] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [films, setFilms] = useState<any[]>([]);
  const [contests, setContests] = useState<any[]>([]);
  const [comments, setComments] = useState<any>({});
  const [filmsLoading, setFilmsLoading] = useState(true);
  const [contestsLoading, setContestsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const {isAdmin, isApprovedDirector, user: currentUser, signOut} = useApp();
  const {isDark, toggleTheme} = useTheme();
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [suggestedLoading, setSuggestedLoading] = useState(true);

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning,';
    if (hours < 18) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  const profileName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Creator';

  const toggleSaveAudition = async (item: any) => {
    if (!currentUser) return;
    try {
      await api.post('/saved-auditions', {auditionId: item._id || item.id});
      const res = await api.get<{savedAuditions?: any[]}>('/saved-auditions');
      setSavedIds((res.savedAuditions || []).map((s: any) => s.auditionId));
    } catch (e) {
      console.log(e);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'CL';
    const cleanName = name.trim();
    const parts = cleanName.split(/\s+/);
    if (parts.length >= 2) {
      const firstInitial = parts[0][0];
      const lastInitial = parts[parts.length - 1][0];
      return (firstInitial + lastInitial).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length > 0) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return 'CL';
  };

  // Drawer & Welcome logic
  const [isFirstOpen, setIsFirstOpen] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-280)).current;

  useEffect(() => {
    if (currentUser?.id || currentUser?._id || currentUser?.uid) {
      const userId = currentUser.id || currentUser._id || currentUser.uid;
      AsyncStorage.getItem(`has_opened_before_${userId}`).then(val => {
        if (val === 'true') {
          setIsFirstOpen(false);
        } else {
          AsyncStorage.setItem(`has_opened_before_${userId}`, 'true');
          setIsFirstOpen(true);
        }
      });
    }
  }, [currentUser]);

  const openDrawer = () => {
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    Animated.timing(slideAnim, {
      toValue: -280,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setDrawerVisible(false);
    });
  };

  useEffect(() => {
    if (drawerVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [drawerVisible]);

  const loadNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await api.get<{notifications: any[]; unreadCount: number}>('/notifications');
      setUnreadCount(res.unreadCount || 0);
    } catch (e) {}
  };

  const loadChatUnread = async () => {
    if (!currentUser) return;
    try {
      const res = await api.get<{chats: any[]}>('/chat/list');
      let total = 0;
      (res.chats || []).forEach((c: any) => {
        total += c.unreadCount?.[currentUser.uid] || 0;
      });
      setChatUnreadCount(total);
    } catch (e) {}
  };

  const loadProfilePhoto = async () => {
    try {
      const res = await api.get<{user: any}>('/users/profile');
      const data = res.user;
      if (data?.photoUrl) setProfilePhoto(data.photoUrl);
      else if (data?.photoURL) setProfilePhoto(data.photoURL);
    } catch (e) {}
  };

  useEffect(() => {
    loadNotifications();
    loadChatUnread();
    loadProfilePhoto();
    const interval = setInterval(() => { loadNotifications(); loadChatUnread(); }, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchSuggestions = useCallback(async () => {
    if (!currentUser) return;
    try {
      const uid = currentUser.uid || currentUser._id;
      const followRes = await api.get<any>(`/users/${uid}/following`);
      const followingList = followRes.following || [];
      const followedSet = new Set<string>(followingList.map((u: any) => u._id || u.id));
      setFollowingIds(followedSet);

      const searchRes = await api.get<any>('/users/search?limit=30');
      const allUsers = searchRes.users || [];
      
      const filtered = allUsers.filter((u: any) => {
        const targetId = u._id || u.id;
        return targetId !== uid && !followedSet.has(targetId);
      });
      
      setSuggestedUsers(filtered);
    } catch (e) {
      console.log('Error fetching suggestions:', e);
    } finally {
      setSuggestedLoading(false);
    }
  }, [currentUser]);

  const toggleFollowUser = async (targetId: string) => {
    const isCurrentlyFollowing = followingIds.has(targetId);
    
    setFollowingIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyFollowing) {
        next.delete(targetId);
      } else {
        next.add(targetId);
      }
      return next;
    });

    try {
      await api.post('/users/follow', {targetUserId: targetId});
    } catch (e) {
      setFollowingIds(prev => {
        const next = new Set(prev);
        if (isCurrentlyFollowing) {
          next.add(targetId);
        } else {
          next.delete(targetId);
        }
        return next;
      });
      Alert.alert('Error', 'Could not update follow status.');
    }
  };

  // ── Load feed posts + auditions ──
  useEffect(() => {
    setFeedLoading(true);
    Promise.all([
      api.get<{auditions: any[]}>('/auditions'),
    ]).then(([audRes]) => {
      const audItems = (audRes.auditions || []).filter((a: any) => a.isActive !== false).map((a: any) => ({...a, id: a._id || a.id, source: 'audition'}));
      setAuditionPosts(audItems.sort((a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      ));
      setFeedLoading(false);
    }).catch(() => setFeedLoading(false));

    api.get<{posts: any[]}>('/feed-posts').then(res => {
      setGeneralPosts((res.posts || []).filter((p: any) => p.postType === 'general' || p.postType === 'announcement').map((p: any) => ({...p, id: p._id || p.id})));
    }).catch(() => {});

    if (currentUser) {
      api.get<{savedAuditions?: any[]}>('/saved-auditions').then(res => {
        setSavedIds((res.savedAuditions || []).map((s: any) => s.auditionId));
      }).catch(() => {});
      fetchSuggestions();
    }
  }, [refreshKey, currentUser, fetchSuggestions]);

  useEffect(() => {
    setFilmsLoading(true);
    api.get<{films: any[]}>('/films').then(res => {
      setFilms((res.films || []).map((f: any) => ({...f, id: f._id || f.id})));
      setFilmsLoading(false);
    }).catch(() => setFilmsLoading(false));
  }, [refreshKey]);

  useEffect(() => {
    setContestsLoading(true);
    api.get<{contests: any[]}>('/contests').then(res => {
      setContests((res.contests || []).map((c: any) => ({...c, id: c._id || c.id})));
      setContestsLoading(false);
    }).catch(() => setContestsLoading(false));
  }, [refreshKey]);

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    if (text.trim().length > 1) {
      const q = text.toLowerCase();
      const auditionMatches = auditionPosts
        .filter(p => (p.text || p.title)?.toLowerCase().includes(q))
        .slice(0, 3)
        .map(p => ({
          id: p.id,
          label: (p.title || p.text)?.substring(0, 60),
          type: '🎭',
        }));
      const filmMatches = films
        .filter(
          f =>
            f.title?.toLowerCase().includes(q) ||
            f.genre?.toLowerCase().includes(q),
        )
        .slice(0, 2)
        .map(f => ({id: f.id, label: f.title, type: '🎬'}));
      const contestMatches = contests
        .filter(c => c.title?.toLowerCase().includes(q))
        .slice(0, 2)
        .map(c => ({id: c.id, label: c.title, type: '🏆'}));
      setSuggestions(
        [...auditionMatches, ...filmMatches, ...contestMatches].slice(0, 5),
      );
    } else {
      setSuggestions([]);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey(prev => prev + 1);
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const loadComments = async (filmId: string) => {
    try {
      const res = await api.get<any>(`/comments/film/${filmId}`);
      setComments((prev: any) => ({...prev, [filmId]: res.comments || []}));
    } catch (e) { console.log(e); }
  };

  const sendPost = async (tab: 'auditions' | 'general') => {
    if (!postText.trim() && !postImage) {
      Alert.alert('Empty Post', 'Please write something or attach an image.');
      return;
    }
    if (!isAdmin) {
      Alert.alert('Permission Denied', 'Only admin can post.');
      return;
    }
    setPosting(true);
    try {
      let imageUrl = '';
      if (postImage) {
        const result = await uploadImage(postImage);
        imageUrl = result.secureUrl;
      }
      await api.post('/feed-posts', {
        text: postText.trim(),
        imageUrl: imageUrl,
        postType: tab,
      });

      setPostText('');
      setPostImage(null);
      Alert.alert('✅ Posted!', 'Your post is now live.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not post. Try again.');
    } finally {
      setPosting(false);
    }
  };

  const pickImage = async () => {
    const result = await launchImageLibrary({mediaType: 'photo', quality: 0.8});
    if (result.assets && result.assets[0]?.uri) {
      setPostImage(result.assets[0].uri);
    }
  };

  const deletePost = async (postId: string) => {
    try {
      await api.delete(`/feed-posts/${postId}`);
    } catch (error: any) {
      Alert.alert('Delete Error', error?.message || 'Could not delete post.');
    }
  };

  const handleLike = async (filmId: string, likedBy: string[] = []) => {
    if (!currentUser) return;
    try {
      await api.post(`/films/${filmId}/like`);
      setRefreshKey(k => k + 1);
    } catch (e) { console.log(e); }
  };

  const deleteFilm = (filmId: string) => {
    Alert.alert('Delete Film', 'Are you sure?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/films/${filmId}`);
            setRefreshKey(k => k + 1);
          } catch (e) {
            console.log(e);
          }
        },
      },
    ]);
  };

  const openReport = (id: string, type: string, title: string) => {
    setReportTarget({id, type, title});
    setReportModalVisible(true);
  };

  const filteredFilms = films.filter(item => {
    const text = searchText.toLowerCase();
    return (
      item.title?.toLowerCase().includes(text) ||
      item.genre?.toLowerCase().includes(text)
    );
  });

  const filteredContests = contests.filter(item => {
    const text = searchText.toLowerCase();
    return (
      item.title?.toLowerCase().includes(text) ||
      item.category?.toLowerCase().includes(text)
    );
  });

  const renderComposer = (tab: 'auditions' | 'general') => {
    if (!isAdmin) {
      return null;
    }
    return (
      <View style={styles.composer}>
        {postImage && (
          <View style={styles.imagePreviewRow}>
            <Image source={{uri: postImage}} style={styles.imagePreview} />
            <TouchableOpacity
              onPress={() => setPostImage(null)}
              style={styles.removeImageBtn}>
              <Text style={styles.removeImageText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.composerRow}>
          <TouchableOpacity onPress={pickImage} style={styles.attachBtn}>
            <Text style={styles.attachIcon}>📎</Text>
          </TouchableOpacity>
          <TextInput
            style={[
              styles.composerInput,
              {
                color: Colors.textPrimary,
                backgroundColor: Colors.cardElevated,
              },
            ]}
            placeholder={
              tab === 'auditions'
                ? 'Post an audition update...'
                : 'Post an update...'
            }
            placeholderTextColor={Colors.textTertiary}
            value={postText}
            onChangeText={setPostText}
            multiline
          />
          <LiquidPress
            style={[
              styles.sendBtn,
              !postText.trim() && !postImage && styles.sendBtnDisabled,
            ]}
            onPress={() => sendPost(tab)}
            disabled={posting || (!postText.trim() && !postImage)}>
            {posting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendBtnText}>Send</Text>
            )}
          </LiquidPress>
        </View>
      </View>
    );
  };

  const renderFeed = (tab: 'auditions' | 'general') => {
    const allPosts = tab === 'auditions' ? auditionPosts : generalPosts;

    const posts = searchText.trim()
      ? allPosts.filter(
          p =>
            (p.text || p.title)
              ?.toLowerCase()
              .includes(searchText.toLowerCase()) ||
            p.location?.toLowerCase().includes(searchText.toLowerCase()),
        )
      : allPosts;

    return (
      <View>
        {tab === 'auditions' && (
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigation.navigate('BrowseAuditions')}>
            <Text style={styles.browseBtnText}>🎭 Browse All Auditions →</Text>
          </TouchableOpacity>
        )}

        {feedLoading ? (
          <ActivityIndicator
            color={Colors.primary}
            style={{marginTop: Spacing['4xl']}}
          />
        ) : posts.length === 0 ? (
          <EmptyState
            icon={tab === 'auditions' ? '🎭' : '📢'}
            title={
              tab === 'auditions' ? 'No auditions found' : 'No posts found'
            }
            subtitle={
              searchText
                ? 'Try a different search term'
                : tab === 'auditions'
                ? 'Directors will post auditions here'
                : 'Admin will post updates here'
            }
            onAction={
              tab === 'auditions' && !searchText
                ? () => navigation.navigate('BrowseAuditions')
                : undefined
            }
            actionLabel={
              tab === 'auditions' && !searchText
                ? 'Browse All Auditions'
                : undefined
            }
          />
        ) : (
          posts.map(post =>
            // Show AuditionCard for director-posted auditions, PostBubble for admin feed posts
            post.source === 'audition' ? (
              <AuditionCard key={post.id} item={post} navigation={navigation} />
            ) : (
              <PostBubble
                key={post.id}
                item={post}
                isAdmin={isAdmin}
                onDelete={deletePost}
                navigation={navigation}
              />
            ),
          )
        )}
      </View>
    );
  };

  const renderFilms = () => {
    if (filmsLoading) {
      return [1, 2, 3].map(i => <SkeletonCard key={i} />);
    }
    if (filteredFilms.length === 0) {
      return (
        <EmptyState
          icon="🎬"
          title="No short films yet"
          subtitle="Be the first to upload a short film on CineLink"
        />
      );
    }
    return filteredFilms.map(item => {
      const isLiked = item.likedBy?.includes(currentUser?.uid);
      const isOwner = item.directorId === currentUser?.uid;
      return (
        <View key={item.id} style={styles.card}>
          <View style={styles.filmCardHeader}>
            <Avatar
              name={item.directorName || item.directorEmail}
              size="sm"
              ring
              verified={item.verified}
            />
            <View style={{flex: 1, marginLeft: Spacing.sm}}>
              <Text style={styles.filmDirectorName} numberOfLines={1}>
                {item.directorName ||
                  item.directorEmail?.split('@')[0] ||
                  'Director'}
              </Text>
              <Text style={styles.filmDirectorMeta}>
                Director · {item.genre || 'Film'}
              </Text>
            </View>
            <View style={styles.viewsChip}>
              <Text style={styles.viewsChipText}>👁 {item.views || 0}</Text>
            </View>
          </View>

          {item.posterUrl ? (
            <Image source={{uri: item.posterUrl}} style={styles.poster} />
          ) : (
            <View style={styles.posterPlaceholder}>
              <Text style={styles.posterPlaceholderText}>🎬</Text>
            </View>
          )}

          <Text style={styles.cardTitle}>{item.title}</Text>

          <View style={styles.badgeRow}>
            {item.genre ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.genre}</Text>
              </View>
            ) : null}
            {item.duration ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>⏱ {item.duration} min</Text>
              </View>
            ) : null}
            <View style={[styles.badge, styles.badgeSuccess]}>
              <Text style={[styles.badgeText, {color: Colors.success}]}>
                {item.status || 'Screening'}
              </Text>
            </View>
          </View>

          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          <View style={styles.socialRow}>
            <TouchableOpacity
              onPress={() => handleLike(item.id, item.likedBy)}
              style={styles.socialBtn}>
              <Text style={styles.likeText}>
                {isLiked ? '❤️' : '🤍'} {item.likes || 0}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn}>
              <Text style={styles.commentIcon}>
                💬 {comments[item.id]?.length || 0}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ctaRow}>
            <LiquidPress
              style={styles.watchBtn}
              onPress={() => navigation.navigate('FilmDetail', {film: item})}>
              <Text style={[styles.watchBtnText, {color: Colors.background !== '#FFFFFF' ? Colors.background : '#1A1C1E'}]}>🎬 Watch Film</Text>
            </LiquidPress>
            {isOwner && (
              <TouchableOpacity
                style={styles.deleteFilmBtn}
                onPress={() => deleteFilm(item.id)}>
                <Text style={styles.deleteFilmText}>🗑</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.reportBtn}
            onPress={() => openReport(item.id, 'film', item.title)}>
            <Text style={styles.reportBtnText}>🚩 Report</Text>
          </TouchableOpacity>
        </View>
      );
    });
  };

  const renderContests = () => {
    if (contestsLoading) {
      return [1, 2].map(i => <SkeletonCard key={i} />);
    }
    if (filteredContests.length === 0) {
      return (
        <EmptyState
          icon="🏆"
          title="No contests yet"
          subtitle="Check back soon for exciting cinema contests"
        />
      );
    }
    return filteredContests.map(item => (
      <View key={item.id} style={styles.card}>
        <View style={styles.contestBanner}>
          <Text style={styles.contestBannerText}>🏆 Contest</Text>
          {item.prize ? (
            <View style={styles.prizeBadge}>
              <Text style={styles.prizeText}>💰 {item.prize}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={styles.badgeRow}>
          {item.category ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🎭 {item.category}</Text>
            </View>
          ) : null}
          {item.entryFee !== undefined ? (
            <View
              style={[
                styles.badge,
                item.entryFee === 0 && styles.badgeSuccess,
              ]}>
              <Text
                style={[
                  styles.badgeText,
                  item.entryFee === 0 && {color: Colors.success},
                ]}>
                {item.entryFee === 0
                  ? '✅ Free Entry'
                  : `₹${item.entryFee} Entry`}
              </Text>
            </View>
          ) : null}
        </View>
        {item.description ? (
          <Text style={styles.description} numberOfLines={3}>
            {item.description}
          </Text>
        ) : null}
        {item.deadline ? (
          <Text style={styles.metaText}>⏰ Deadline: {item.deadline}</Text>
        ) : null}
        <LiquidPress
          style={styles.watchBtn}
          onPress={() => navigation.navigate('ContestDetail', {contest: item})}>
          <Text style={[styles.watchBtnText, {color: Colors.background !== '#FFFFFF' ? Colors.background : '#1A1C1E'}]}>Enter Contest →</Text>
        </LiquidPress>
      </View>
    ));
  };

  const renderSectionHeader = (title: string, onViewAll: () => void) => {
    return (
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
        <TouchableOpacity onPress={onViewAll} style={styles.viewAllTouch}>
          <Text style={styles.sectionHeaderViewAll}>View all</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      <View style={[styles.container, {paddingTop: insets.top, backgroundColor: Colors.background}]}>
        {/* ── GREETING HEADER ── */}
        <View style={styles.greetingHeaderRow}>
          <View>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            <Text style={styles.profileNameText}>{profileName} 👋</Text>
          </View>
          <View style={{flexDirection: 'row', gap: 10, alignItems: 'center'}}>
            <TouchableOpacity
              style={styles.headerNotificationBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Text style={styles.headerNotificationIcon}>🔔</Text>
              {unreadCount > 0 && (
                <View style={styles.headerNotifBadge}>
                  <Text style={styles.headerNotifBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerNotificationBtn}
              onPress={openDrawer}
            >
              <Text style={[styles.headerNotificationIcon, {fontSize: 22, color: Colors.textPrimary}]}>☰</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── PROFILE SIDE DRAWER MODAL ── */}
        <Modal
          transparent
          visible={drawerVisible}
          onRequestClose={closeDrawer}
          animationType="fade"
        >
          <View style={styles.drawerOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeDrawer}
            />

            <Animated.View
              style={[
                styles.drawerContent,
                {
                  transform: [{ translateX: slideAnim }],
                  backgroundColor: Colors.background,
                  borderRightColor: Colors.border,
                },
              ]}
            >
              <SafeAreaView style={{flex: 1}}>
                <View style={styles.drawerHeader}>
                  <View style={styles.drawerUserInfo}>
                    <View style={styles.drawerAvatarContainer}>
                      {profilePhoto ? (
                        <Image source={{uri: profilePhoto}} style={styles.drawerAvatar} />
                      ) : (
                        <View style={styles.drawerAvatarFallback}>
                          <Text style={styles.drawerAvatarLetter}>
                            {currentUser?.displayName?.charAt(0)?.toUpperCase() ||
                              currentUser?.email?.charAt(0)?.toUpperCase() ||
                              'C'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.drawerNameContainer}>
                      <Text style={styles.drawerName} numberOfLines={1}>
                        {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Creator'}
                      </Text>
                      <Text style={styles.drawerEmail} numberOfLines={1}>
                        {currentUser?.email || 'No email linked'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={closeDrawer} style={styles.drawerCloseBtn}>
                    <Text style={styles.drawerCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={false}>
                  {[
                    {
                      icon: '👤',
                      label: 'My Profile',
                      onPress: () => navigation.navigate('Profile'),
                    },
                    {
                      icon: '✏️',
                      label: 'Edit Profile',
                      onPress: () => navigation.navigate('MyProfile'),
                    },
                    ...(!isAdmin
                      ? [
                          {
                            icon: '💾',
                            label: 'Saved Auditions',
                            onPress: () => navigation.navigate('SavedAuditions'),
                          },
                        ]
                      : []),
                    ...(isApprovedDirector || isAdmin
                      ? [
                          {
                            icon: '🎥',
                            label: isAdmin ? 'Films' : 'My Films',
                            onPress: () => navigation.navigate('MyFilms'),
                          },
                          {
                            icon: '🏆',
                            label: isAdmin ? 'Contests' : 'My Contests',
                            onPress: () => navigation.navigate('MyContests'),
                          },
                          {
                            icon: '🎭',
                            label: isAdmin ? 'Auditions' : 'My Auditions',
                            onPress: () => navigation.navigate('MyAuditions'),
                          },
                        ]
                      : []),
                    ...(isAdmin
                      ? [
                          {
                            icon: '📢',
                            label: 'Announcements',
                            onPress: () => navigation.navigate('Announcements'),
                          },
                          {
                            icon: '🛡️',
                            label: 'Admin Reports',
                            onPress: () => navigation.navigate('AdminReports'),
                          },
                        ]
                      : []),
                    {
                      icon: '⚙️',
                      label: 'Settings',
                      onPress: () => navigation.navigate('Settings'),
                    },
                    {
                      icon: '🚪',
                      label: 'Logout',
                      onPress: () => {
                        Alert.alert('Logout', 'Are you sure you want to logout?', [
                          {text: 'Cancel', style: 'cancel'},
                          {
                            text: 'Logout',
                            style: 'destructive',
                            onPress: async () => await signOut(),
                          },
                        ]);
                      },
                    },
                  ].map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.drawerItem}
                      onPress={() => {
                        closeDrawer();
                        item.onPress();
                      }}
                    >
                      <Text style={styles.drawerItemIcon}>{item.icon}</Text>
                      <Text style={styles.drawerItemText}>{item.label}</Text>
                      <Text style={styles.drawerItemArrow}>›</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={[styles.drawerFooter, {borderTopColor: Colors.border}]}>
                  <TouchableOpacity style={styles.drawerThemeToggle} onPress={toggleTheme}>
                    <Text style={styles.drawerThemeIcon}>{isDark ? '🌙' : '☀️'}</Text>
                    <Text style={styles.drawerThemeText}>
                      {isDark ? 'Dark Mode' : 'Light Mode'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </Animated.View>
          </View>
        </Modal>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
              progressBackgroundColor={Colors.card}
            />
          }>





          {/* ── SECTIONS ── */}
          <View style={{paddingBottom: insets.bottom + 80}}>

            {/* 1. Trending Auditions */}
            {renderSectionHeader('Trending Auditions', () => navigation.navigate('BrowseAuditions'))}
            {feedLoading ? (
              <ActivityIndicator color={Colors.primary} style={{marginVertical: Spacing.lg}} />
            ) : auditionPosts.length === 0 ? (
              <EmptyState icon="🎭" title="No auditions found" subtitle="Trending auditions will show up here" />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollPadding}>
                {auditionPosts.slice(0, 5).map(item => {
                  const isSaved = savedIds.includes(item.id);
                  const auditionPosters = [
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300',
                    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=300',
                    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300',
                    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=300',
                    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=300'
                  ];
                  const placeholderImage = auditionPosters[item.id ? (item.id.charCodeAt(0) % auditionPosters.length) : 0];
                  const imageSource = item.imageUrl || item.posterUrl || placeholderImage;

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.auditionHorizontalCard}
                      onPress={() => navigation.navigate('AuditionDetail', {audition: item})}
                      activeOpacity={0.9}
                    >
                      <Image source={{uri: imageSource}} style={styles.auditionCardImg} resizeMode="cover" />
                      <View style={styles.auditionCardContent}>
                        <Text style={styles.auditionCardTitle} numberOfLines={1}>{item.title || 'Audition Call'}</Text>
                        <Text style={styles.auditionCardCategory} numberOfLines={1}>{item.category || 'Feature Film'}</Text>
                        <View style={styles.auditionCardBottom}>
                          <Text style={styles.auditionCardLoc} numberOfLines={1}>📍 {item.location || 'Hyderabad'}</Text>
                          <TouchableOpacity onPress={() => toggleSaveAudition(item)} style={styles.favoriteHeartBtn}>
                            <Text style={styles.favoriteHeartIcon}>{isSaved ? '❤️' : '🤍'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* 2. Featured Contests */}
            {renderSectionHeader('Featured Contests', () => navigation.navigate('Contests'))}
            {contestsLoading ? (
              <ActivityIndicator color={Colors.primary} style={{marginVertical: Spacing.lg}} />
            ) : contests.length === 0 ? (
              <EmptyState icon="🏆" title="No contests found" subtitle="Featured contests will show up here" />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollPadding}>
                {contests.slice(0, 5).map(item => {
                  const contestPosters = [
                    'https://images.unsplash.com/photo-1578269174936-2709b5a5c0e5?q=80&w=200',
                    'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?q=80&w=200',
                    'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=200',
                  ];
                  const placeholderImage = contestPosters[item.id ? (item.id.charCodeAt(0) % contestPosters.length) : 0];
                  const imageSource = item.imageUrl || placeholderImage;

                  const getDaysLeftText = (deadline: string) => {
                    if (!deadline) return 'Ending soon';
                    const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
                    if (diff < 0) return 'Ended';
                    if (diff === 0) return 'Last day!';
                    return `${diff}d left`;
                  };

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.contestHorizontalCard}
                      onPress={() => navigation.navigate('ContestDetail', {contest: item})}
                      activeOpacity={0.9}
                    >
                      <Image source={{uri: imageSource}} style={styles.contestCardImg} resizeMode="cover" />
                      <View style={styles.contestCardContent}>
                        <Text style={styles.contestCardTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.contestPrizeValue}>₹{item.prizePool || '50,000'}</Text>
                        <Text style={styles.contestDaysLeftText}>{getDaysLeftText(item.deadline)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* 3. Trending Short Films */}
            {renderSectionHeader('Trending Short Films', () => navigation.navigate('BrowseFilms'))}
            {filmsLoading ? (
              <ActivityIndicator color={Colors.primary} style={{marginVertical: Spacing.lg}} />
            ) : films.length === 0 ? (
              <EmptyState icon="🎬" title="No short films found" subtitle="Trending films will show up here" />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollPadding}>
                {films.slice(0, 5).map(item => {
                  const filmPosters = [
                    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=300',
                    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=300',
                    'https://images.unsplash.com/photo-1478720143023-ac0cdc9f6363?q=80&w=300',
                  ];
                  const placeholderImage = filmPosters[item.id ? (item.id.charCodeAt(0) % filmPosters.length) : 0];
                  const imageSource = item.posterUrl || placeholderImage;

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.filmHorizontalCard}
                      onPress={() => navigation.navigate('MovieDetails', {movie: item})}
                      activeOpacity={0.9}
                    >
                      <Image source={{uri: imageSource}} style={styles.filmCardImg} resizeMode="cover" />
                      <View style={styles.filmCardContent}>
                        <Text style={styles.filmCardTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.filmCardMeta} numberOfLines={1}>{item.genre || 'Drama'} · {item.duration || '15'} min</Text>
                        <Text style={styles.filmCardViews}>👁 {item.views || 0} views</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* 3.5 People You May Know */}
            {renderSectionHeader('People You May Know', () => navigation.navigate('Discover'))}
            {suggestedLoading ? (
              <ActivityIndicator color={Colors.primary} style={{marginVertical: Spacing.lg}} />
            ) : suggestedUsers.length === 0 ? (
              <EmptyState icon="👥" title="No suggestions" subtitle="You are connected with everyone!" />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestionsScroll}
              >
                {suggestedUsers.slice(0, 10).map(item => {
                  const uid = item._id || item.id;
                  const isFollowed = followingIds.has(uid);
                  return (
                    <View key={uid} style={styles.suggestionCard}>
                      <TouchableOpacity
                        onPress={() => navigation.navigate('PublicProfile', {userId: uid})}
                        style={styles.suggestionCardTouchable}
                      >
                        <Avatar name={item.fullName || item.displayName || 'User'} size="lg" uri={item.photoUrl} />
                        <Text style={styles.suggestionName} numberOfLines={1}>
                          {item.fullName || item.displayName || item.name || 'User'}
                        </Text>
                        <Text style={styles.suggestionRole} numberOfLines={1}>
                          {item.role || 'Artist'}
                        </Text>
                        {item.location ? (
                          <Text style={styles.suggestionLocation} numberOfLines={1}>
                            📍 {item.location}
                          </Text>
                        ) : (
                          <Text style={styles.suggestionLocation} numberOfLines={1}>
                            CineLink Member
                          </Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.suggestionFollowBtn,
                          isFollowed ? styles.followedBtn : styles.followBtn
                        ]}
                        onPress={() => toggleFollowUser(uid)}
                      >
                        <Text style={isFollowed ? styles.followedBtnText : styles.followBtnText}>
                          {isFollowed ? 'Following' : 'Follow'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {/* 4. Director Posts / Updates */}
            {renderSectionHeader('Director Updates', () => navigation.navigate('BrowseUpdates'))}
            {feedLoading ? (
              <ActivityIndicator color={Colors.primary} style={{marginVertical: Spacing.lg}} />
            ) : generalPosts.length === 0 ? (
              <EmptyState icon="📢" title="No posts found" subtitle="Director updates will show up here" />
            ) : (
              <View style={styles.updatesFeedContainer}>
                {generalPosts.slice(0, 5).map(item => {
                  const formatPostTime = (ts: any) => {
                    if (!ts) return '';
                    const d = ts?.toDate ? ts.toDate() : new Date(ts);
                    const now = new Date();
                    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
                    if (diff < 60) return 'just now';
                    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
                    return d.toLocaleDateString([], {day: 'numeric', month: 'short'});
                  };

                  const authorName = item.authorName || item.directorName || 'CineLink Director';
                  const firstLetter = authorName.charAt(0).toUpperCase();

                  return (
                    <View key={item.id} style={styles.updateCard}>
                      <View style={styles.updateCardHeader}>
                        <View style={styles.updateAuthorAvatar}>
                          {item.authorPhotoUrl ? (
                            <Image source={{uri: item.authorPhotoUrl}} style={styles.updateAvatarImg} />
                          ) : (
                            <View style={styles.updateAvatarFallback}>
                              <Text style={styles.updateAvatarFallbackText}>{firstLetter}</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.updateAuthorInfo}>
                          <Text style={styles.updateAuthorName} numberOfLines={1}>{authorName}</Text>
                          <Text style={styles.updateTimeText}>{formatPostTime(item.createdAt)}</Text>
                        </View>
                        <View style={[styles.updateTypeBadge, item.postType === 'announcement' && styles.updateAnnouncementBadge]}>
                          <Text style={[styles.updateTypeBadgeText, item.postType === 'announcement' && styles.updateAnnouncementBadgeText]}>
                            {item.postType === 'announcement' ? 'Announcement' : 'Update'}
                          </Text>
                        </View>
                      </View>
                      
                      <Text style={styles.updateBodyText}>{item.text}</Text>
                      
                      {item.imageUrl ? (
                        <Image source={{uri: item.imageUrl}} style={styles.updateImage} resizeMode="cover" />
                      ) : null}

                      {item.location ? (
                        <Text style={styles.updateLocationText}>📍 {item.location}</Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}

          </View>
        </ScrollView>
      </View>

      <ReportModal
        visible={reportModalVisible}
        onClose={() => {
          setReportModalVisible(false);
          setReportTarget(null);
        }}
        contentId={reportTarget?.id || ''}
        contentType={reportTarget?.type || 'audition'}
        contentTitle={reportTarget?.title || ''}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg + 2,
    paddingTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  logo: {
    color: Colors.primary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  welcome: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  userHandle: {color: Colors.textSecondary, fontSize: 13, marginTop: 2},
  premiumBtn: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0,96,58,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  premiumIcon: {fontSize: 24, color: '#00603A'},
  notificationBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notifDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifDotText: {color: '#FFFFFF', fontSize: 9, fontWeight: 'bold'},
  notificationIcon: {fontSize: 17},
  profileButton: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: Colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: Colors.primary,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  profileImage: {width: 52, height: 52, borderRadius: Radius.pill},
  profileLetter: {color: Colors.primary, fontSize: 20, fontWeight: 'bold'},
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    marginHorizontal: Spacing.screenH,
    marginBottom: Spacing.xs,
    borderRadius: Radius.search,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 0,
    height: 48,
    elevation: 0,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: Spacing.sm,
    color: Colors.textTertiary,
  },
  searchInput: {flex: 1, color: Colors.textPrimary, fontSize: 14, height: 48},

  suggestionsBox: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.screenH,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  suggestionItem: {paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md},
  suggestionBorder: {borderBottomWidth: 1, borderBottomColor: Colors.border},
  suggestionText: {color: Colors.textPrimary, fontSize: 13},

  tabsScroll: {marginBottom: Spacing.md},
  tabsContent: {paddingHorizontal: Spacing.screenH, gap: Spacing.sm},
  tabBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeTab: {
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    shadowColor: Colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  tabText: {color: Colors.textSecondary, fontWeight: '600', fontSize: 13},
  activeText: {color: '#FFFFFF', fontWeight: '700'},

  pillsScroll: {marginBottom: Spacing.md},
  pillsContent: {paddingHorizontal: Spacing.screenH, gap: Spacing.sm},

  browseBtn: {
    backgroundColor: Colors.primaryFaint,
    marginHorizontal: Spacing.screenH,
    marginBottom: Spacing.md,
    borderRadius: Radius.button,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  browseBtnText: {color: Colors.primary, fontWeight: '700', fontSize: 14},

  aiButtonsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm + 2,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg + 2,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickPostBtn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaint,
  },
  actionBtnIcon: {fontSize: 18, marginBottom: Spacing.xs},
  actionBtnText: {color: Colors.textPrimary, fontSize: 11, fontWeight: '600'},

  composer: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.screenH,
    marginBottom: Spacing.lg,
    borderRadius: Radius.card,
    overflow: 'hidden',
    padding: Spacing.md,
    borderTopWidth: 2,
    borderTopColor: Colors.primaryMid,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderBottomWidth: 3,
    borderBottomColor: Colors.primaryGlow,
    borderRightWidth: 2,
    borderRightColor: Colors.cardElevated,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 8,
  },
  imagePreviewRow: {
    marginBottom: Spacing.sm,
    alignSelf: 'flex-start',
    position: 'relative',
  },
  imagePreview: {width: 120, height: 120, borderRadius: Radius.sm + 2},
  removeImageBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.error,
    borderRadius: Radius.sm + 2,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {color: '#fff', fontSize: 12, fontWeight: 'bold'},
  composerRow: {flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm},
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachIcon: {fontSize: 20},
  composerInput: {
    flex: 1,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    color: Colors.textPrimary,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    borderTopColor: Colors.primaryLight,
    borderBottomColor: Colors.primaryDark,
    borderLeftColor: Colors.primaryGlow,
    borderRightColor: Colors.primaryFaint,
    shadowColor: Colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  sendBtnDisabled: {opacity: 0.4},
  sendBtnText: {color: '#fff', fontWeight: 'bold', fontSize: 14},

  // ── Audition Card (for director-posted auditions) ──
  auditionCard: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.screenH,
    marginBottom: Spacing.md,
    borderRadius: Radius.card,
    overflow: 'hidden',
    borderTopWidth: 2,
    borderTopColor: Colors.primaryMid,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderBottomWidth: 3,
    borderBottomColor: Colors.primaryGlow,
    borderRightWidth: 2,
    borderRightColor: Colors.cardElevated,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 8,
  },
  auditionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  auditionBadge: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  auditionBadgeText: {color: Colors.primary, fontSize: 11, fontWeight: '700'},
  auditionPoster: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: Colors.cardElevated,
  },
  auditionTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    padding: Spacing.md,
    paddingBottom: Spacing.sm - 2,
  },
  auditionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm - 2,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  metaBadge: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metaBadgeText: {color: Colors.textSecondary, fontSize: 11},
  auditionDirector: {
    color: Colors.textSecondary,
    fontSize: 12,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm + 2,
  },
  auditionCTA: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    alignItems: 'center',
  },
  auditionCTAText: {color: '#FFFFFF', fontWeight: '700', fontSize: 14},
  categoryPillWrapper: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderRadius: Radius.sm + 2,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
  },
  categoryPillText: {fontSize: 11, fontWeight: '700'},
  budgetRow: {
    flexDirection: 'row',
    gap: Spacing.sm - 2,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  budgetPill: {
    backgroundColor: Colors.warningFaint,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
  },
  budgetPillText: {color: Colors.warning, fontSize: 12, fontWeight: '600'},
  positionsPill: {
    backgroundColor: Colors.successFaint,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  positionsPillText: {color: Colors.success, fontSize: 12, fontWeight: '600'},
  auditionFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  applicantsText: {color: Colors.textTertiary, fontSize: 11},
  deadlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm + 2,
  },
  deadlineLabel: {color: Colors.textTertiary, fontSize: 12},
  daysLeftText: {fontSize: 12, fontWeight: '700'},
  auditionBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  contactBtn: {
    flex: 1,
    borderRadius: Radius.sm + 2,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  contactBtnText: {color: Colors.primary, fontWeight: '700', fontSize: 14},
  applyBtnFilled: {
    flex: 1,
    borderRadius: Radius.sm + 2,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  applyBtnFilledText: {color: '#FFFFFF', fontWeight: '700', fontSize: 14},

  bubble: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.screenH,
    marginBottom: Spacing.md,
    borderRadius: Radius.card,
    overflow: 'hidden',
    padding: Spacing.md,
    borderTopWidth: 2,
    borderTopColor: Colors.primaryMid,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderBottomWidth: 3,
    borderBottomColor: Colors.primaryGlow,
    borderRightWidth: 2,
    borderRightColor: Colors.cardElevated,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 8,
  },
  bubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm + 2,
  },
  adminBadge: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  adminBadgeText: {color: Colors.primary, fontSize: 11, fontWeight: '700'},
  bubbleTime: {color: Colors.textTertiary, fontSize: 11},
  bubbleImage: {
    width: '100%',
    height: 220,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
  },
  tapHint: {
    paddingVertical: Spacing.xs,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  tapHintText: {color: Colors.textTertiary, fontSize: 11},
  bubbleText: {color: Colors.textPrimary, fontSize: 15, lineHeight: 22},
  bubbleActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm + 2,
    paddingTop: Spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  commentToggleBtn: {flexDirection: 'row', alignItems: 'center'},
  commentToggleText: {
    color: Colors.primaryLight,
    fontSize: 13,
    fontWeight: '600',
  },
  bubbleDeleteText: {color: Colors.primary, fontSize: 12, fontWeight: '600'},

  commentsBox: {
    marginTop: Spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm + 2,
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    color: Colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    maxHeight: 80,
  },
  commentSendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm + 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderWidth: 1,
    borderTopColor: Colors.primaryLight,
    borderBottomColor: Colors.primaryDark,
    borderLeftColor: Colors.primaryGlow,
    borderRightColor: Colors.primaryFaint,
    shadowColor: Colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  commentSendText: {color: '#FFFFFF', fontWeight: 'bold', fontSize: 13},
  noCommentsText: {
    color: Colors.textTertiary,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm + 2,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryFaint,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  commentAvatarText: {color: Colors.primary, fontWeight: 'bold', fontSize: 11},
  commentContent: {
    flex: 1,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.sm + 2,
    padding: Spacing.sm,
  },
  commentNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  commentName: {color: Colors.primary, fontSize: 12, fontWeight: 'bold'},
  commentTime: {color: Colors.textTertiary, fontSize: 11},
  commentText: {color: Colors.textPrimary, fontSize: 13, lineHeight: 18},
  deleteCommentBtn: {padding: Spacing.xs, flexShrink: 0},
  deleteCommentText: {color: Colors.primary, fontSize: 12, fontWeight: 'bold'},

  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    marginHorizontal: Spacing.screenH,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderTopWidth: 2,
    borderTopColor: Colors.primaryMid,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderBottomWidth: 3,
    borderBottomColor: Colors.primaryGlow,
    borderRightWidth: 2,
    borderRightColor: Colors.cardElevated,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 8,
  },
  profileCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  profileInfo: {flex: 1},
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm - 2,
    marginBottom: 3,
  },
  profileName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  profileMeta: {color: Colors.textSecondary, fontSize: 12},
  profileActions: {},
  verifiedBadge: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.xs + 2,
    paddingHorizontal: Spacing.sm - 2,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  verifiedBadgeText: {
    color: Colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  connectBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm + 2,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderTopColor: Colors.primaryLight,
    borderBottomColor: Colors.primaryDark,
    borderLeftColor: Colors.primaryGlow,
    borderRightColor: Colors.primaryFaint,
    shadowColor: Colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  connectBtnText: {color: '#fff', fontSize: 13, fontWeight: '700'},
  connectedChip: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.sm + 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.primaryMid,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  connectedChipText: {color: Colors.primary, fontSize: 12, fontWeight: '600'},
  viewProfileBtn: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 11,
    alignItems: 'center',
  },
  viewProfileText: {color: Colors.primary, fontSize: 13, fontWeight: '600'},

  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    marginHorizontal: Spacing.screenH,
    overflow: 'hidden',
    borderTopWidth: 2,
    borderTopColor: Colors.primaryMid,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderBottomWidth: 3,
    borderBottomColor: Colors.primaryGlow,
    borderRightWidth: 2,
    borderRightColor: Colors.cardElevated,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 8,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  filmCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  filmDirectorName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  filmDirectorMeta: {color: Colors.textSecondary, fontSize: 12, marginTop: 2},
  viewsChip: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  viewsChipText: {color: Colors.textSecondary, fontSize: 11},
  poster: {
    width: '100%',
    height: 195,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  posterPlaceholder: {
    width: '100%',
    height: 140,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterPlaceholderText: {fontSize: 48},
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: Spacing.sm + 2,
    letterSpacing: 0.2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm - 2,
    marginBottom: Spacing.sm + 2,
  },
  badge: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeSuccess: {
    backgroundColor: Colors.successFaint,
    borderColor: Colors.successBorder,
  },
  badgeText: {color: Colors.textSecondary, fontSize: 12},
  description: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: Spacing.md,
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    marginBottom: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  socialBtn: {flexDirection: 'row', alignItems: 'center'},
  likeText: {color: '#FB7185', fontWeight: '700', fontSize: 14},
  commentIcon: {color: Colors.primaryLight, fontWeight: '700', fontSize: 14},
  ctaRow: {flexDirection: 'row', gap: Spacing.sm + 2, alignItems: 'center'},
  watchBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderTopColor: Colors.primaryLight,
    borderBottomColor: Colors.primaryDark,
    borderLeftColor: Colors.primaryGlow,
    borderRightColor: Colors.primaryFaint,
    shadowColor: Colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  watchBtnText: {color: '#fff', fontWeight: '700', fontSize: 14},
  deleteFilmBtn: {
    width: 48,
    height: 48,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteFilmText: {color: Colors.primary, fontSize: 18},
  reportBtn: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm + 2,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reportBtnText: {color: Colors.textTertiary, fontSize: 12, fontWeight: '500'},

  contestBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  contestBannerText: {color: Colors.warning, fontWeight: '700', fontSize: 13},
  prizeBadge: {
    backgroundColor: Colors.warningFaint,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
  },
  prizeText: {color: Colors.warning, fontSize: 11, fontWeight: 'bold'},

  chipApproved: {
    backgroundColor: Colors.successFaint,
    borderRadius: Radius.sm + 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    alignItems: 'center',
  },
  chipRejected: {
    backgroundColor: Colors.errorFaint,
    borderRadius: Radius.sm + 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    alignItems: 'center',
  },
  chipPending: {
    backgroundColor: Colors.warningFaint,
    borderRadius: Radius.sm + 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    alignItems: 'center',
  },
  chipTextApproved: {color: Colors.success, fontWeight: '700', fontSize: 13},
  chipTextRejected: {color: Colors.error, fontWeight: '700', fontSize: 13},
  chipTextPending: {color: Colors.warning, fontWeight: '700', fontSize: 13},

  ctaBannerRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.screenH,
    marginBottom: Spacing.lg,
    gap: Spacing.sm + 2,
  },
  ctaBannerPrimary: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.button,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  ctaBannerPrimaryText: {color: '#fff', fontWeight: '700', fontSize: 14},
  ctaBannerSecondary: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: Radius.button,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  ctaBannerSecondaryText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  hamburgerBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: Colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hamburgerIcon: {
    fontSize: 22,
    color: Colors.textPrimary,
  },
  welcomeContainer: {
    justifyContent: 'center',
    flex: 1,
  },
  welcomeSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  welcomeTitle: {
    fontSize: 17,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginTop: 1,
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    flexDirection: 'row',
  },
  drawerContent: {
    width: 280,
    height: '100%',
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  drawerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm + 2,
  },
  drawerAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  drawerAvatar: {
    width: '100%',
    height: '100%',
  },
  drawerAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerAvatarLetter: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  drawerNameContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  drawerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  drawerEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  drawerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  drawerCloseText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  drawerScroll: {
    flex: 1,
    paddingTop: Spacing.md,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
  },
  drawerItemIcon: {
    fontSize: 18,
    marginRight: Spacing.md,
    width: 24,
    textAlign: 'center',
  },
  drawerItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  drawerItemArrow: {
    fontSize: 18,
    color: Colors.textTertiary,
    fontWeight: 'bold',
  },
  drawerFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    paddingBottom: Spacing.lg,
  },
  drawerThemeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  drawerThemeIcon: {
    fontSize: 18,
    marginRight: Spacing.md,
    width: 24,
    textAlign: 'center',
  },
  drawerThemeText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  headerLogo: {
    color: Colors.primary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  premiumBtnSmall: {
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  welcomeCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginHorizontal: Spacing.screenH,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  welcomeCardAvatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.primary,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cardElevated,
    marginRight: Spacing.md,
  },
  welcomeCardAvatar: {
    width: '100%',
    height: '100%',
  },
  welcomeCardAvatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cardElevated,
  },
  welcomeCardAvatarText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  welcomeCardText: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  // Greeting Header
  greetingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  greetingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  profileNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#D4AF37', // Premium gold color
    marginTop: 2,
  },
  headerNotificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerNotificationIcon: {
    fontSize: 20,
  },
  headerNotifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  headerNotifBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
  },

  // Search Bar
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchBarInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIconSymbol: {
    fontSize: 16,
    marginRight: Spacing.sm,
    color: Colors.textTertiary,
  },
  searchInputField: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearSearchText: {
    fontSize: 14,
    paddingHorizontal: Spacing.xs,
    color: Colors.textTertiary,
  },
  filterTunerBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTunerIcon: {
    fontSize: 18,
  },

  // Quick Actions Row
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickActionChip: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderColor: 'rgba(212, 175, 55, 0.3)',
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  quickActionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D4AF37',
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  sectionHeaderViewAll: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D4AF37',
  },
  viewAllTouch: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  horizontalScrollPadding: {
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.md,
    gap: Spacing.md,
  },

  // Audition Horizontal Card (Landscape Image Style)
  auditionHorizontalCard: {
    width: 160,
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  auditionCardImg: {
    width: '100%',
    height: 100,
    backgroundColor: Colors.cardElevated,
  },
  auditionCardContent: {
    padding: Spacing.sm,
  },
  auditionCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  auditionCardCategory: {
    fontSize: 11,
    color: '#D4AF37',
    marginTop: 2,
    fontWeight: '500',
  },
  auditionCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  auditionCardLoc: {
    fontSize: 10,
    color: Colors.textSecondary,
    flex: 1,
    marginRight: 4,
  },
  favoriteHeartBtn: {
    padding: 2,
  },
  favoriteHeartIcon: {
    fontSize: 14,
  },

  // Contest Horizontal Card (Side image, right text)
  contestHorizontalCard: {
    width: 230,
    height: 86,
    backgroundColor: Colors.card,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contestCardImg: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: Colors.cardElevated,
  },
  contestCardContent: {
    flex: 1,
    paddingLeft: 8,
    justifyContent: 'center',
  },
  contestCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  contestPrizeValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D4AF37',
    marginTop: 2,
  },
  contestDaysLeftText: {
    fontSize: 9,
    color: '#FF3B30',
    fontWeight: '700',
    marginTop: 2,
  },

  // Short Film Card (Standard Film Thumbnail Style)
  filmHorizontalCard: {
    width: 200,
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filmCardImg: {
    width: '100%',
    height: 110,
    backgroundColor: Colors.cardElevated,
  },
  filmCardContent: {
    padding: Spacing.sm,
  },
  filmCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  filmCardMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  filmCardViews: {
    fontSize: 10,
    color: '#D4AF37',
    marginTop: 4,
    fontWeight: '600',
  },

  // Suggested Connections Styles
  suggestionsScroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  suggestionCard: {
    width: 140,
    padding: Spacing.md,
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  suggestionCardTouchable: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
    width: '100%',
  },
  suggestionName: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 13,
    marginTop: Spacing.sm,
    textAlign: 'center',
    width: '100%',
  },
  suggestionRole: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
  suggestionLocation: {
    color: Colors.textTertiary,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
  suggestionFollowBtn: {
    width: '100%',
    paddingVertical: 6,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtn: {
    backgroundColor: Colors.primary,
  },
  followBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  followedBtn: {
    backgroundColor: Colors.primaryFaint,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  followedBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  // Director Updates Feed Styles
  updatesFeedContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  updateCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  updateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  updateAuthorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    backgroundColor: Colors.cardElevated,
  },
  updateAvatarImg: {
    width: '100%',
    height: '100%',
  },
  updateAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateAvatarFallbackText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  updateAuthorInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  updateAuthorName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  updateTimeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  updateTypeBadge: {
    backgroundColor: 'rgba(212,175,55,0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  updateTypeBadgeText: {
    fontSize: 10,
    color: '#D4AF37',
    fontWeight: '700',
  },
  updateAnnouncementBadge: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  updateAnnouncementBadgeText: {
    color: '#EF4444',
  },
  updateBodyText: {
    fontSize: 13.5,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  updateImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginTop: Spacing.sm,
    backgroundColor: Colors.cardElevated,
  },
  updateLocationText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
});
