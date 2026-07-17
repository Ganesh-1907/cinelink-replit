import React, {useEffect, useState, useCallback} from 'react';

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
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {launchImageLibrary} from 'react-native-image-picker';

import ReportModal from './ReportModal';
import {LiquidPress} from '../components/LiquidPress';
import EngagementBar from '../components/EngagementBar';
import {RippleIcon} from '../components/RippleIcon';
import {CrownIcon} from '../components/CrownIcon';
import {ADMIN_EMAIL, FILTER_TAGS, CATEGORY_COLORS} from '../src/api/config';
import {uploadImage} from '../src/services/uploadService';
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
  const currentUser = auth().currentUser;
  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    if (!currentUser) {
      return;
    }
    try {
      const currentUserName =
        currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
      await firestore()
        .collection('connectionRequests')
        .add({
          fromUserId: currentUser.uid,
          fromUserName: currentUserName,
          toUserId: item.id,
          toUserName: item.displayName || item.name || 'User',
          status: 'pending',
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      await firestore()
        .collection('notifications')
        .add({
          userId: item.id,
          type: 'connect_request',
          title: '🤝 Connection Request',
          message: `${currentUserName} wants to connect with you`,
          senderId: currentUser.uid,
          senderName: currentUserName,
          read: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
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
              <Text style={styles.connectBtnText}>Connect</Text>
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
      onPress={() =>
        isAuditionDoc
          ? navigation.navigate('AuditionDetail', {audition: item})
          : navigation.navigate('BrowseAuditions')
      }
      activeOpacity={0.85}>
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
  const currentUser = auth().currentUser;
  const currentUserName =
    currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  const [postComments, setPostComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    const unsub = firestore()
      .collection('feedPosts')
      .doc(item.id)
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .limit(10)
      .onSnapshot(
        snap => setPostComments(snap.docs.map(d => ({id: d.id, ...d.data()}))),
        err => console.log('FEED COMMENTS ERROR:', err),
      );
    return () => unsub();
  }, [item.id]);

  const postComment = async () => {
    if (!commentText.trim()) {
      return;
    }
    setPostingComment(true);
    try {
      await firestore()
        .collection('feedPosts')
        .doc(item.id)
        .collection('comments')
        .add({
          text: commentText.trim(),
          userId: currentUser?.uid,
          userName: currentUserName,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      setCommentText('');
      setShowComments(false);
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Could not post comment.');
    }
    setPostingComment(false);
  };

  const deleteComment = async (commentId: string, commentUserId: string) => {
    if (commentUserId !== currentUser?.uid && !isAdmin) {
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
              .collection('feedPosts')
              .doc(item.id)
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
              style={styles.commentInput}
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
  const [activeFilter, setActiveFilter] = useState('All');
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
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(
    auth().currentUser?.photoURL || null,
  );

  const currentUser = auth().currentUser;
  const isAdmin = currentUser?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    const unsub = firestore()
      .collection('notifications')
      .where('userId', '==', currentUser.uid)
      .where('read', '==', false)
      .onSnapshot(snap => setUnreadCount(snap.size));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    const unsub = firestore()
      .collection('chats')
      .where('participants', 'array-contains', currentUser.uid)
      .onSnapshot(
        snap => {
          let total = 0;
          snap.docs.forEach(doc => {
            const d = doc.data();
            total += d.unreadCount?.[currentUser.uid] || 0;
          });
          setChatUnreadCount(total);
        },
        () => {},
      );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    const unsub = firestore()
      .collection('users')
      .doc(currentUser.uid)
      .onSnapshot(doc => {
        const data = doc.data();
        if (data?.photoUrl) {
          setProfilePhoto(data.photoUrl);
        } else if (data?.photoURL) {
          setProfilePhoto(data.photoURL);
        }
      });
    return () => unsub();
  }, []);

  // ── Load auditions: merge feedPosts + auditions collections ──
  useEffect(() => {
    setFeedLoading(true);

    const unsubFeed = firestore()
      .collection('feedPosts')
      .where('tab', '==', 'auditions')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        feedSnap => {
          const feedItems = feedSnap.docs.map(d => ({
            id: d.id,
            source: 'feed',
            ...d.data(),
          }));

          // Fetch auditions separately (no composite index needed)
          firestore()
            .collection('auditions')
            .orderBy('createdAt', 'desc')
            .get()
            .then(audSnap => {
              const audItems = audSnap.docs
                .map(d => ({id: d.id, source: 'audition', ...d.data()}))
                .filter((a: any) => a.isActive !== false); // filter inactive in JS

              // Merge both lists and sort by time
              const merged = [...feedItems, ...audItems].sort(
                (a: any, b: any) => {
                  const aTime = (a.createdAt as any)?.seconds || 0;
                  const bTime = (b.createdAt as any)?.seconds || 0;
                  return bTime - aTime;
                },
              );

              setAuditionPosts(merged);
              setFeedLoading(false);
            })
            .catch(err => {
              console.log('AUDITIONS FETCH ERROR:', err);
              // Still show feed posts even if auditions fetch fails
              setAuditionPosts(feedItems);
              setFeedLoading(false);
            });
        },
        err => {
          console.log('FEED ERROR:', err);
          setFeedLoading(false);
        },
      );

    const unsubGeneral = firestore()
      .collection('feedPosts')
      .where('tab', '==', 'general')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snap => setGeneralPosts(snap.docs.map(d => ({id: d.id, ...d.data()}))),
        err => console.log('GENERAL ERROR:', err),
      );

    return () => {
      unsubFeed();
      unsubGeneral();
    };
  }, []);

  useEffect(() => {
    setFilmsLoading(true);
    const unsub = firestore()
      .collection('films')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snap => {
          setFilms(snap.docs.map(doc => ({id: doc.id, ...doc.data()})));
          setFilmsLoading(false);
        },
        err => {
          console.log('FILMS ERROR:', err);
          setFilmsLoading(false);
        },
      );
    return () => unsub();
  }, []);

  useEffect(() => {
    setContestsLoading(true);
    const unsub = firestore()
      .collection('contests')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snap => {
          setContests(snap.docs.map(doc => ({id: doc.id, ...doc.data()})));
          setContestsLoading(false);
        },
        err => {
          console.log('CONTESTS ERROR:', err);
          setContestsLoading(false);
        },
      );
    return () => unsub();
  }, []);

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
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const loadComments = async (filmId: string) => {
    try {
      const snap = await firestore()
        .collection('films')
        .doc(filmId)
        .collection('comments')
        .orderBy('createdAt', 'desc')
        .get();
      setComments((prev: any) => ({
        ...prev,
        [filmId]: snap.docs.map(doc => ({id: doc.id, ...doc.data()})),
      }));
    } catch (e) {
      console.log('LOAD COMMENTS ERROR:', e);
    }
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
      await firestore().collection('feedPosts').add({
        tab,
        text: postText.trim(),
        posterUrl: imageUrl,
        createdAt: firestore.FieldValue.serverTimestamp(),
        postedBy: currentUser?.email,
        postedById: currentUser?.uid,
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
      await firestore().collection('feedPosts').doc(postId).delete();
    } catch (error: any) {
      Alert.alert('Delete Error', error?.message || 'Could not delete post.');
    }
  };

  const handleLike = async (filmId: string, likedBy: string[] = []) => {
    if (!currentUser) {
      return;
    }
    const alreadyLiked = likedBy.includes(currentUser.uid);
    try {
      await firestore()
        .collection('films')
        .doc(filmId)
        .update({
          likes: firestore.FieldValue.increment(alreadyLiked ? -1 : 1),
          likedBy: alreadyLiked
            ? firestore.FieldValue.arrayRemove(currentUser.uid)
            : firestore.FieldValue.arrayUnion(currentUser.uid),
        });
    } catch (e) {
      console.log('LIKE ERROR:', e);
    }
  };

  const deleteFilm = (filmId: string) => {
    Alert.alert('Delete Film', 'Are you sure?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await firestore().collection('films').doc(filmId).delete();
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
            style={styles.composerInput}
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
      : activeFilter !== 'All'
      ? allPosts.filter(
          p =>
            (p.text || p.title)
              ?.toLowerCase()
              .includes(activeFilter.toLowerCase()) ||
            p.role?.toLowerCase().includes(activeFilter.toLowerCase()),
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

        {/* Filter pills using Chip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillsScroll}
          contentContainerStyle={styles.pillsContent}>
          {FILTER_TAGS.map(tag => (
            <Chip
              key={tag}
              label={tag}
              selected={activeFilter === tag}
              onPress={() => setActiveFilter(tag)}
            />
          ))}
        </ScrollView>

        {renderComposer(tab)}
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
              <Text style={styles.watchBtnText}>🎬 Watch Film</Text>
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
          <Text style={styles.watchBtnText}>Enter Contest →</Text>
        </LiquidPress>
      </View>
    ));
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <View style={{flex: 1}}>
            <Text style={styles.logo} numberOfLines={1}>
              CineLink
            </Text>
            <Text style={styles.welcome}>Welcome back 👋</Text>
            <Text style={styles.userHandle}>
              {auth().currentUser?.displayName ||
                auth().currentUser?.email?.split('@')[0] ||
                'Creator'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {!isAdmin && (
              <RippleIcon
                size={52}
                color="#D4AF37"
                onPress={() => navigation.navigate('PremiumCineLink')}>
                <View style={styles.premiumBtn}>
                  <CrownIcon />
                </View>
              </RippleIcon>
            )}

            <RippleIcon
              size={42}
              color={Colors.primary}
              onPress={() => navigation.navigate('Chats')}>
              <View style={styles.notificationBtn}>
                <Text style={styles.notificationIcon}>💬</Text>
                {chatUnreadCount > 0 && (
                  <View style={styles.notifDot}>
                    <Text style={styles.notifDotText}>
                      {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </RippleIcon>

            <RippleIcon
              size={42}
              color={Colors.primary}
              onPress={() => navigation.navigate('Notifications')}>
              <View style={styles.notificationBtn}>
                <Text style={styles.notificationIcon}>🔔</Text>
                {unreadCount > 0 && (
                  <View style={styles.notifDot}>
                    <Text style={styles.notifDotText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </RippleIcon>

            <RippleIcon
              size={52}
              color={Colors.primary}
              onPress={() => navigation.navigate('Profile')}>
              <View style={styles.profileButton}>
                {profilePhoto ? (
                  <Image
                    source={{uri: profilePhoto}}
                    style={styles.profileImage}
                  />
                ) : (
                  <Text style={styles.profileLetter}>
                    {auth()
                      .currentUser?.displayName?.charAt(0)
                      ?.toUpperCase() ||
                      auth().currentUser?.email?.charAt(0)?.toUpperCase() ||
                      'C'}
                  </Text>
                )}
              </View>
            </RippleIcon>
          </View>
        </View>

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
          {/* ── SEARCH BAR ── */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              placeholder="Search auditions, films, contests..."
              placeholderTextColor={Colors.textTertiary}
              value={searchText}
              onChangeText={handleSearchChange}
              style={styles.searchInput}
            />
            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchText('');
                  setSuggestions([]);
                }}>
                <Text
                  style={{
                    color: Colors.textTertiary,
                    fontSize: 18,
                    fontWeight: 'bold',
                    paddingHorizontal: Spacing.sm,
                  }}>
                  ✕
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── LIVE SUGGESTIONS ── */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsBox}>
              {suggestions.map((s, i) => (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.suggestionItem,
                    i < suggestions.length - 1 && styles.suggestionBorder,
                  ]}
                  onPress={() => {
                    setSearchText(s.label || '');
                    setSuggestions([]);
                  }}>
                  <Text style={styles.suggestionText} numberOfLines={1}>
                    {s.type} {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── TABS ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScroll}
            contentContainerStyle={styles.tabsContent}>
            {['Auditions', 'General', 'Short Films', 'Contests'].map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, selectedTab === tab && styles.activeTab]}
                onPress={() => setSelectedTab(tab)}>
                <Text
                  style={[
                    styles.tabText,
                    selectedTab === tab && styles.activeText,
                  ]}>
                  {tab === 'Auditions'
                    ? '🎭 '
                    : tab === 'General'
                    ? '📢 '
                    : tab === 'Short Films'
                    ? '🎬 '
                    : '🏆 '}
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── ADMIN QUICK ACTIONS ── */}
          {selectedTab === 'Short Films' && (
            <View style={styles.aiButtonsContainer}>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate('AIAssistant')}>
                  <Text style={styles.actionBtnIcon}>🤖</Text>
                  <Text style={styles.actionBtnText}>AI Assistant</Text>
                </TouchableOpacity>
              )}
              {isAdmin && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.quickPostBtn]}
                  onPress={() => navigation.navigate('QuickPost')}>
                  <Text style={styles.actionBtnIcon}>⚡</Text>
                  <Text style={styles.actionBtnText}>Quick Post</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, styles.quickPostBtn]}
                onPress={() => navigation.navigate('UploadFilm')}>
                <Text style={styles.actionBtnIcon}>🎬</Text>
                <Text style={styles.actionBtnText}>Upload Film</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{paddingBottom: insets.bottom + 80}}>
            {selectedTab === 'Auditions' && renderFeed('auditions')}
            {selectedTab === 'General' && renderFeed('general')}
            {selectedTab === 'Short Films' && renderFilms()}
            {selectedTab === 'Contests' && renderContests()}
          </View>
        </ScrollView>
      </SafeAreaView>

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
    backgroundColor: '#060606',
    marginHorizontal: Spacing.lg + 2,
    marginBottom: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardElevated,
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
    marginHorizontal: Spacing.lg + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  suggestionItem: {paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md},
  suggestionBorder: {borderBottomWidth: 1, borderBottomColor: Colors.border},
  suggestionText: {color: Colors.textPrimary, fontSize: 13},

  tabsScroll: {marginBottom: Spacing.md},
  tabsContent: {paddingHorizontal: Spacing.lg + 2, gap: Spacing.sm},
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
  pillsContent: {paddingHorizontal: Spacing.lg + 2, gap: Spacing.sm},

  browseBtn: {
    backgroundColor: Colors.primaryFaint,
    marginHorizontal: Spacing.lg + 2,
    marginBottom: Spacing.md,
    borderRadius: Radius.md,
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
    marginHorizontal: Spacing.lg + 2,
    marginBottom: Spacing.lg,
    borderRadius: Radius.lg,
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
    marginHorizontal: Spacing.lg + 2,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
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
    marginHorizontal: Spacing.lg + 2,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
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
  bubbleDeleteText: {color: Colors.error, fontSize: 12, fontWeight: '600'},

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
  deleteCommentText: {color: Colors.error, fontSize: 12, fontWeight: 'bold'},

  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg + 2,
    marginHorizontal: Spacing.lg + 2,
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
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    marginHorizontal: Spacing.lg + 2,
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
    backgroundColor: Colors.errorFaint,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteFilmText: {color: Colors.error, fontSize: 18},
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
    marginHorizontal: Spacing.lg + 2,
    marginBottom: Spacing.lg,
    gap: Spacing.sm + 2,
  },
  ctaBannerPrimary: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  ctaBannerPrimaryText: {color: '#fff', fontWeight: '700', fontSize: 14},
  ctaBannerSecondary: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: Radius.md,
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
});
