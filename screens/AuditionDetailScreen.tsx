import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Linking,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import api from '../src/api/client';
import {LiquidPress} from '../components/LiquidPress';
import {ADMIN_UID} from '../src/api/config';
import {useApp} from '../src/context/AppContext';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {
  Header,
  Button,
  Card,
  Avatar,
  Chip,
  EmptyState,
  Badge,
} from '../components/ui';
import ReportModal from './ReportModal';
import {useTheme} from '../src/context/ThemeContext';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) {
    return 'User';
  }
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

const extractPhoneNumber = (text: string): string | null => {
  if (!text) {
    return null;
  }
  const phoneRegex = /(\+?[\d][\d\s\-]{8,13}[\d])/;
  const match = text.match(phoneRegex);
  if (match) {
    return match[1].replace(/[\s\-]/g, '');
  }
  return null;
};

export default function AuditionDetailScreen({route, navigation}: any) {
  const {isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const paramAudition = route?.params?.audition;
  const paramAuditionId = route?.params?.auditionId;
  const [reportModalVisible, setReportModalVisible] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const [commentsY, setCommentsY] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  const [audition, setAudition] = useState<any>(
    paramAudition ? { ...paramAudition, id: paramAudition._id || paramAudition.id } : null
  );
  const [fetching, setFetching] = useState(!paramAudition && !!paramAuditionId);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const [directorProfile, setDirectorProfile] = useState<any>(null);
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [saved, setSaved] = useState(false);

  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const [applicants, setApplicants] = useState<any[]>([]);
  const [myRole, setMyRole] = useState<string>('');

  const {isAdmin, user} = useApp();
  const currentUserName =
    user?.displayName || user?.email?.split('@')[0] || 'User';
  const phoneNumber = extractPhoneNumber(audition?.description || '');

  const isOwner = !!audition?.directorId && audition.directorId === user?.uid;
  const canSeeApplicants = isOwner || isAdmin;

  useEffect(() => {
    if (!paramAudition && paramAuditionId) {
      api.get<{audition: any}>(`/auditions/${paramAuditionId}`)
        .then(res => { if (res.audition) setAudition({...res.audition, id: res.audition._id || res.audition.id}); })
        .catch(() => {})
        .finally(() => setFetching(false));
    }
  }, []);

  useEffect(() => {
    if (!audition) return;
    setLikesCount(audition.likes || 0);
    if (user?.uid && audition.likedBy) {
      setLiked(audition.likedBy.includes(user.uid));
    }
  }, [audition, user?.uid]);

  const handleLike = async () => {
    if (!user || !audition?.id) return;
    try {
      const res = await api.post<any>(`/auditions/${audition.id}/like`);
      setLiked(res.liked);
      setLikesCount(res.likes);
    } catch (e) {
      console.log(e);
    }
  };

  const scrollToComments = () => {
    scrollViewRef.current?.scrollTo({ y: commentsY, animated: true });
  };

  useEffect(() => {
    if (!audition?.id) return;
    checkIfApplied();
    loadDirectorProfile();
    checkIfSaved();
    loadComments();
  }, [audition?.id]);

  useEffect(() => {
    if (!user?.uid) return;
    api.get<{user: any}>('/users/profile').then(res => {
      setMyRole(res.user?.role || '');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!audition?.id || !user?.uid || !canSeeApplicants) return;
    loadApplicants();
  }, [audition?.id, canSeeApplicants]);

  const loadApplicants = async () => {
    try {
      const res = await api.get<any>(`/applications/${audition.id}`);
      setApplicants(res.applications || []);
    } catch (e) { console.log(e); }
  };

  const updateStatus = async (appId: string, status: string) => {
    try {
      await api.put(`/applications/${appId}/status`, {status});
      loadApplicants();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update status.');
    }
  };

  const checkIfApplied = async () => {
    try {
      const res = await api.get<any>('/applications/my');
      const mine = (res.applications || []).some((a: any) => a.auditionId === audition.id);
      if (mine) setApplied(true);
    } catch (e) { console.log(e); }
  };

  const checkIfSaved = async () => {
    try {
      const res = await api.get<any>('/saved-auditions');
      const savedIds = (res.savedAuditions || []).map((s: any) => s.auditionId);
      setSaved(savedIds.includes(audition.id));
    } catch (e) { console.log(e); }
  };

  const loadDirectorProfile = async () => {
    if (!audition?.directorId) return;
    try {
      const res = await api.get<any>(`/users/${audition.directorId}`);
      if (res?.user) setDirectorProfile(res.user);
    } catch (e) { console.log(e); }
  };

  const loadComments = async () => {
    try {
      const res = await api.get<any>(`/comments/audition/${audition.id}`);
      setComments(res.comments || []);
    } catch (e) { console.log(e); }
  };

  const postComment = async () => {
    if (!commentText.trim()) return;
    setPostingComment(true);
    try {
      await api.post(`/comments/audition/${audition.id}`, {text: commentText.trim()});
      setCommentText('');
      loadComments();
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Could not post comment.');
    }
    setPostingComment(false);
  };

  const deleteComment = async (commentId: string, commentUserId: string) => {
    if (commentUserId !== user?.uid && audition.directorId !== user?.uid && !isAdmin) return;
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
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const toggleSave = async () => {
    try {
      await api.post('/saved-auditions', {auditionId: audition.id});
      setSaved(!saved);
    } catch (e) { console.log(e); }
  };

  const startChat = async () => {
    if (audition.directorId === user?.uid) {
      Alert.alert('Error', 'You cannot chat with yourself!');
      return;
    }

    try {
      const res = await api.post<{chatId: string; chat: any}>('/chat/start', {otherUserId: audition.directorId});
      const directorName = directorProfile?.displayName || directorProfile?.fullName || directorProfile?.name || cleanName(directorProfile?.email) || 'Director';
      navigation.navigate('ChatScreen', {
        chat: {
          id: res.chatId || audition.id,
          _id: res.chatId,
          participants: [user?.uid, audition.directorId],
          participantNames: [currentUserName, directorName],
        },
      });
    } catch (e) { console.log(e); }
  };

  const openWhatsApp = async () => {
    if (!phoneNumber) {
      Alert.alert(
        'No Phone Number',
        'Could not find contact number in audition description.',
      );
      return;
    }
    try {
      const url = `whatsapp://send?phone=${phoneNumber}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'WhatsApp Not Installed',
          'Please install WhatsApp to contact the director.',
        );
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open WhatsApp');
    }
  };

  const applyNow = async () => {
    if (applied) {
      Alert.alert(
        'Already Applied!',
        'You have already applied to this audition.',
      );
      return;
    }
    if (!showNoteInput) {
      setShowNoteInput(true);
      return;
    }
    setLoading(true);
    try {
      if (audition.contactLink) {
        const supported = await Linking.canOpenURL(audition.contactLink);
        if (supported) {
          await Linking.openURL(audition.contactLink);
        }
      }
      await api.post('/applications', {
        auditionId: audition.id,
        note: note.trim(),
      });
      setApplied(true);
      setShowNoteInput(false);
      setNote('');
      Alert.alert(
        '🎉 Applied!',
        'Your application has been submitted successfully!',
      );
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Try again.');
    }
    setLoading(false);
  };

  if (fetching) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!audition) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.notFoundText}>Audition not found</Text>
      </View>
    );
  }

  const deadlineChipVariant = (() => {
    if (!audition.lastDate) {
      return 'default';
    }
    const deadline = new Date(audition.lastDate);
    if (isNaN(deadline.getTime())) {
      return 'default';
    }
    const diff = Math.ceil(
      (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (diff < 0) {
      return 'error';
    }
    if (diff <= 3) {
      return 'warning';
    }
    return 'success';
  })();

  return (
    <View style={styles.root}>
      <Header
        title="Audition Details"
        navigation={navigation}
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity onPress={() => setReportModalVisible(true)} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={{fontSize: 18}}>⚠️</Text>
          </TouchableOpacity>
        }
      />
      <ScrollView ref={scrollViewRef} style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* POSTER */}
        {audition.posterUrl ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() =>
              navigation.navigate('ImageViewer', {imageUrl: audition.posterUrl})
            }
            style={styles.posterContainer}
          >
            <Image
              source={{uri: audition.posterUrl}}
              style={[
                styles.poster,
                {
                  transform: [{ translateY: audition.posterOffset || 0 }]
                }
              ]}
            />
            <View style={styles.tapHint}>
              <Text style={styles.tapHintText}>🔍 Tap for fullscreen</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterPlaceholderText}>🎭</Text>
          </View>
        )}

        <View style={styles.section}>
          {/* STATUS + SAVE ROW */}
          <View style={styles.statusRow}>
            <Chip
              label={audition.status || 'Open'}
              variant={audition.status === 'Closed' ? 'error' : 'success'}
              static
            />
            {applied && <Chip label="✅ Applied" variant="info" static />}

            <View style={styles.rightActionsRow}>
              <TouchableOpacity
                style={[styles.saveBtn, saved && styles.saveBtnActive]}
                onPress={toggleSave}>
                <Text style={styles.saveBtnText}>
                  {saved ? '🔖 Saved' : '🔖 Save'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.applyBtn,
                  applied && styles.applyBtnDone,
                  loading && { opacity: 0.7 }
                ]}
                onPress={applyNow}
                disabled={applied || loading}
              >
                <Text style={[styles.applyBtnText, applied && styles.applyBtnTextDone]}>
                  {loading ? '...' : applied ? '✓ Applied' : 'Apply Now'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.title}>{audition.title}</Text>

          {/* WHATSAPP CONTACT ACTION */}
          {phoneNumber && (
            <TouchableOpacity
              style={styles.whatsappBtnMain}
              onPress={openWhatsApp}>
              <Text style={styles.whatsappBtnTextMain}>
                📱 WhatsApp Chat
              </Text>
            </TouchableOpacity>
          )}

          {/* MOCKUP SPECS ROW */}
          <View style={styles.specsRow}>
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Age Range</Text>
              <Text style={styles.specValue} numberOfLines={1}>{audition.ageRange ? `${audition.ageRange} yrs` : 'Any'}</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Gender</Text>
              <Text style={styles.specValue} numberOfLines={1}>{audition.gender || 'Any'}</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Pay</Text>
              <Text style={styles.specValue} numberOfLines={1}>{audition.budget || 'Paid'}</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Positions</Text>
              <Text style={styles.specValue} numberOfLines={1}>{audition.positions || '1'}</Text>
            </View>
          </View>

          {/* ENGAGEMENT CARD */}
          <Card variant="elevated" style={styles.engagementCard}>
            <View style={styles.engagementRow}>
              <TouchableOpacity onPress={handleLike} style={styles.engagementBtn}>
                <Text style={styles.engagementText}>
                  {liked ? '❤️' : '🤍'} {likesCount}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={scrollToComments} style={styles.engagementBtn}>
                <Text style={styles.engagementText}>
                  💬 {comments.length}
                </Text>
              </TouchableOpacity>
              <View style={styles.engagementBtn}>
                <Text style={styles.engagementText}>
                  👁 {audition.views || 0}
                </Text>
              </View>
            </View>
          </Card>

          {/* MORE DETAILED META INFO */}
          <View style={styles.detailsList}>
            {audition.location ? (
              <View style={styles.detailItem}>
                <Text style={styles.detailItemLabel}>📍 Location</Text>
                <Text style={styles.detailItemValue}>{audition.location}</Text>
              </View>
            ) : null}
            {audition.role ? (
              <View style={styles.detailItem}>
                <Text style={styles.detailItemLabel}>🎬 Role Category</Text>
                <Text style={styles.detailItemValue}>{audition.role}</Text>
              </View>
            ) : null}
            {audition.language ? (
              <View style={styles.detailItem}>
                <Text style={styles.detailItemLabel}>🗣 Language</Text>
                <Text style={styles.detailItemValue}>{audition.language}</Text>
              </View>
            ) : null}
            {audition.lastDate ? (
              <View style={styles.detailItem}>
                <Text style={styles.detailItemLabel}>📅 Deadline</Text>
                <View style={styles.deadlineValRow}>
                  <Text style={[styles.detailItemValue, {marginRight: Spacing.sm}]}>{audition.lastDate}</Text>
                  <Chip
                    label={audition.lastDate}
                    variant={deadlineChipVariant}
                    static
                  />
                </View>
              </View>
            ) : null}
          </View>

          {/* ABOUT THE ROLE */}
          {audition.description ? (
            <View style={styles.descSection}>
              <Text style={styles.sectionTitle}>About the Role</Text>
              <Text style={styles.description}>
                {phoneNumber
                  ? audition.description
                      .replace(phoneNumber, '')
                      .replace(/\s+/g, ' ')
                      .trim()
                  : audition.description}
              </Text>
            </View>
          ) : null}

          {/* REQUIREMENTS SECTION */}
          <View style={styles.requirementsSection}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            <View style={styles.requirementItem}>
              <Text style={styles.requirementCheck}>✓</Text>
              <Text style={styles.requirementText}>Must be professional and committed to rehearsals</Text>
            </View>
            <View style={styles.requirementItem}>
              <Text style={styles.requirementCheck}>✓</Text>
              <Text style={styles.requirementText}>Portfolio and reels should be updated on profile</Text>
            </View>
            {audition.gender && audition.gender !== 'Any' ? (
              <View style={styles.requirementItem}>
                <Text style={styles.requirementCheck}>✓</Text>
                <Text style={styles.requirementText}>Gender preference: {audition.gender}</Text>
              </View>
            ) : null}
          </View>

          {/* CONTACT LINK */}
          {audition.contactLink ? (
            <TouchableOpacity
              style={styles.linkBox}
              onPress={() => {
                const link = audition.contactLink?.trim();
                if (!link) {
                  return;
                }
                const cleaned = link.replace(/[\s\-\+]/g, '');
                if (/^\d{10,13}$/.test(cleaned)) {
                  Linking.openURL(`whatsapp://send?phone=91${cleaned}`).catch(
                    () =>
                      Linking.openURL(`tel:${cleaned}`).catch(() =>
                        Alert.alert('Error', 'Could not open.'),
                      ),
                  );
                  return;
                }
                const url = link.startsWith('http') ? link : `https://${link}`;
                Linking.openURL(url).catch(() =>
                  Alert.alert('Error', 'Could not open this link.'),
                );
              }}>
              <Text style={styles.linkBoxText}>
                🔗 Apply via Director's Link
              </Text>
              <Text style={styles.linkBoxUrl} numberOfLines={1}>
                {audition.contactLink}
              </Text>
            </TouchableOpacity>
          ) : null}

          {/* DIRECTOR CARD */}
          {directorProfile && (
            <View style={styles.directorCard}>
              <Text style={styles.sectionTitle}>Director</Text>
              <TouchableOpacity
                style={styles.directorRow}
                onPress={() =>
                  navigation.navigate('PublicProfile', {
                    userId: audition.directorId,
                  })
                }>
                <Avatar
                  uri={directorProfile.photoUrl || directorProfile.photoURL}
                  name={directorProfile.fullName || directorProfile.name || 'D'}
                  size="lg"
                  ring
                />
                <View style={styles.directorInfo}>
                  <Text style={styles.directorName}>
                    {directorProfile.fullName ||
                      directorProfile.displayName ||
                      directorProfile.name ||
                      'Director'}
                  </Text>
                  <Text style={styles.directorRole}>
                    {directorProfile.role || 'Director'}
                  </Text>
                  {directorProfile.bio ? (
                    <Text style={styles.directorBio} numberOfLines={2}>
                      {directorProfile.bio}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>

              {directorProfile.portfolioPhotos?.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.portfolioRow}>
                  {directorProfile.portfolioPhotos.map(
                    (url: string, index: number) => (
                      <Image
                        key={index}
                        source={{uri: url}}
                        style={styles.portfolioPhoto}
                      />
                    ),
                  )}
                </ScrollView>
              ) : null}

              {directorProfile.portfolio1 ||
              directorProfile.portfolio2 ||
              directorProfile.portfolio3 ? (
                <View style={styles.portfolioSection}>
                  <Text style={styles.portfolioTitle}>Previous Works</Text>
                  {[
                    directorProfile.portfolio1,
                    directorProfile.portfolio2,
                    directorProfile.portfolio3,
                  ]
                    .filter(Boolean)
                    .map((link, i) => (
                      <TouchableOpacity
                        key={i}
                        onPress={() => Linking.openURL(link)}>
                        <Text style={styles.portfolioLink} numberOfLines={1}>
                          🔗 Work {i + 1}: {link}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              ) : null}

              <Button
                label="💬 Message Director"
                onPress={startChat}
                variant="outline"
                fullWidth
              />
            </View>
          )}

          {/* NOTE INPUT */}
          {showNoteInput && !applied && (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>
                Add a note to the director (optional)
              </Text>
              <TextInput
                style={[
                  styles.noteInput,
                  {
                    color: Colors.textPrimary,
                    backgroundColor: Colors.background,
                    borderColor: Colors.borderLight,
                  },
                ]}
                placeholder="Tell the director why you're perfect for this role..."
                placeholderTextColor={Colors.textTertiary}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={4}
                maxLength={300}
              />
              <Text style={styles.noteCount}>{note.length}/300</Text>
            </View>
          )}

          {/* APPLICATIONS SECTION — director/admin only */}
          {canSeeApplicants && (
            <View style={styles.applicantsSection}>
              <Text style={styles.sectionTitle}>
                📋 Applications ({applicants.length})
              </Text>
              {applicants.length === 0 ? (
                <EmptyState
                  icon="📋"
                  title="No applications yet"
                  subtitle="Applications will appear here."
                />
              ) : (
                applicants.map((app: any, idx: number) => (
                  <View key={app._id || app.id || app.applicantId || `applicant-${idx}`} style={styles.applicantCard}>
                    <TouchableOpacity
                      style={styles.applicantMainRow}
                      activeOpacity={0.7}
                      onPress={() =>
                        navigation.navigate('PublicProfile', {
                          userId: app.applicantId,
                        })
                      }>
                      <Avatar
                        name={app.applicantName || app.applicantEmail || 'U'}
                        size="sm"
                        uri={app.userPhoto || app.applicantPhoto || app.photoUrl}
                      />
                      <View style={styles.applicantInfo}>
                        <Text style={styles.applicantName}>
                          {app.applicantName || cleanName(app.applicantEmail)}
                        </Text>
                        <Text style={styles.applicantMeta}>
                          {formatTime(app.appliedAt)} · {app.status || 'Pending'}
                        </Text>
                        {app.note ? (
                          <Text style={styles.applicantNote} numberOfLines={2}>
                            "{app.note}"
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.applicantArrow}>›</Text>
                    </TouchableOpacity>

                    {/* STATUS ACTION BUTTONS FOR DIRECTOR/ADMIN */}
                    {app.status === 'pending' && (
                      <View style={styles.applicantActions}>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.selectBtn]}
                          onPress={() => updateStatus(app._id || app.id, 'selected')}>
                          <Text style={styles.selectBtnText}>✅ Select</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.shortlistBtn]}
                          onPress={() => updateStatus(app._id || app.id, 'shortlisted')}>
                          <Text style={styles.shortlistBtnText}>📋 Shortlist</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, styles.rejectBtn]}
                          onPress={() => updateStatus(app._id || app.id, 'rejected')}>
                          <Text style={styles.rejectBtnText}>✕ Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
              <Text style={styles.applicantHint}>
                Tap an applicant to view their profile &amp; portfolio
              </Text>
            </View>
          )}

          {/* COMMENTS SECTION */}
          <View
            style={styles.commentsSection}
            onLayout={(event) => {
              const layout = event.nativeEvent.layout;
              setCommentsY(layout.y);
            }}>
            <Text style={styles.sectionTitle}>
              💬 Comments ({comments.length})
            </Text>

            <View style={styles.commentInputRow}>
              <TextInput
                style={[
                  styles.commentInput,
                  {
                    color: Colors.textPrimary,
                    backgroundColor: Colors.inputBg,
                    borderColor: Colors.border,
                  },
                ]}
                placeholder="Ask something or leave a comment..."
                placeholderTextColor={Colors.textTertiary}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={200}
              />
              <LiquidPress
                style={[
                  styles.commentSendBtn,
                  (!commentText.trim() || postingComment) &&
                    styles.commentSendBtnDisabled,
                ]}
                onPress={postComment}
                disabled={!commentText.trim() || postingComment}>
                {postingComment ? (
                  <ActivityIndicator color={Colors.textPrimary} size="small" />
                ) : (
                  <Text style={styles.commentSendText}>Post</Text>
                )}
              </LiquidPress>
            </View>

            {comments.length === 0 ? (
              <EmptyState
                icon="💬"
                title="No comments yet"
                subtitle="Be the first to comment!"
              />
            ) : (
              comments.map((comment: any, idx: number) => {
                const isOwn = comment.userId === user?.uid;
                const isDirector = audition.directorId === user?.uid;
                const canDelete = isOwn || isDirector;
                return (
                  <View key={comment._id || comment.id || `comment-${idx}`} style={styles.commentCard}>
                    <View style={styles.commentHeader}>
                      <Avatar name={comment.userName || 'U'} size={32} />
                      <View style={styles.commentMeta}>
                        <Text style={styles.commentName}>
                          {comment.userName}
                          {comment.userId === audition.directorId && (
                            <Text style={styles.directorTag}> 🎬 Director</Text>
                          )}
                        </Text>
                        <Text style={styles.commentTime}>
                          {formatTime(comment.createdAt)}
                        </Text>
                      </View>
                      {canDelete && (
                        <TouchableOpacity
                          onPress={() =>
                            deleteComment(comment.id, comment.userId)
                          }
                          style={styles.deleteCommentBtn}>
                          <Text style={styles.deleteCommentText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {/* Admin-only: Delete/Hide Audition */}
      {isAdmin && audition._id && (
        <View style={styles.adminBar}>
          <TouchableOpacity style={[styles.adminBtn, {backgroundColor: Colors.errorFaint, borderColor: Colors.errorBorder}]}
            onPress={() => {
              Alert.alert('🚫 Ban Audition', `Ban "${audition.title}"? It will be hidden from all users.`, [
                {text: 'Cancel', style: 'cancel'},
                {text: 'Ban', style: 'destructive', onPress: async () => {
                  try {
                    await api.put(`/auditions/${audition._id || audition.id}`, {status: 'closed', banned: true});
                    Alert.alert('✅ Banned', 'Audition has been banned.', [{text: 'OK', onPress: () => navigation.goBack()}]);
                  } catch(e: any) { Alert.alert('Error', e.message); }
                }}
              ]);
            }}>
            <Text style={[styles.adminBtnText, {color: Colors.error}]}>🚫 Ban</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.adminBtn, {backgroundColor: Colors.warningFaint, borderColor: Colors.warningBorder}]}
            onPress={async () => {
              try {
                await api.put(`/auditions/${audition._id || audition.id}`, {status: 'closed'});
                Alert.alert('✅ Closed', 'Audition has been closed.');
                setAudition({...audition, status: 'closed'});
              } catch(e: any) { Alert.alert('Error', e.message); }
            }}>
            <Text style={[styles.adminBtnText, {color: Colors.warning}]}>🔒 Close</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* APPLICATION NOTE MODAL */}
      <Modal
        visible={showNoteInput && !applied}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowNoteInput(false);
          setNote('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Apply for Audition</Text>
            <Text style={styles.modalSubtitle}>Include a message for the director (optional):</Text>
            <TextInput
              style={[
                styles.noteTextInput,
                {
                  color: Colors.textPrimary,
                  backgroundColor: Colors.inputBg,
                  borderColor: Colors.border,
                }
              ]}
              placeholder="Introduce yourself or leave a message..."
              placeholderTextColor={Colors.textTertiary}
              value={note}
              onChangeText={setNote}
              multiline
            />
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.cancelNoteBtn}
                onPress={() => {
                  setShowNoteInput(false);
                  setNote('');
                }}>
                <Text style={styles.cancelNoteText}>✕ Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.skipNoteBtn}
                onPress={() => {
                  setNote('');
                  applyNow();
                }}>
                <Text style={styles.skipNoteText}>Skip & Apply</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitNoteBtn, {backgroundColor: Colors.primary}]}
                onPress={applyNow}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.textInverse} size="small" />
                ) : (
                  <Text style={styles.submitNoteText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ReportModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        contentId={audition._id || audition.id || ''}
        contentType="audition"
        contentTitle={audition.title || 'Audition'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.background},
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  notFoundText: {color: Colors.textPrimary, ...Typography.body},
  container: {flex: 1, backgroundColor: Colors.background},
  scrollContent: {paddingBottom: 40},
  posterContainer: {width: '100%', aspectRatio: 16 / 9, overflow: 'hidden'},
  poster: {width: '100%', height: '100%', resizeMode: 'cover'},
  tapHint: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.overlay,
    borderRadius: Radius.pill,
  },
  tapHintText: {color: '#FFFFFF', ...Typography.micro},
  posterPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterPlaceholderText: {fontSize: 50},
  section: {padding: Spacing.lg},
  statusRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  saveBtn: {
    backgroundColor: Colors.card,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  saveBtnActive: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
  },
  saveBtnText: {color: Colors.textPrimary, ...Typography.captionBold},
  title: {
    color: Colors.textPrimary,
    ...Typography.h3,
    fontWeight: 'bold',
    marginBottom: Spacing.lg,
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  specBox: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  specLabel: {
    ...Typography.micro,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  specValue: {
    ...Typography.captionBold,
    color: Colors.textPrimary,
    fontSize: 13,
  },
  detailsList: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  detailItemLabel: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
  },
  detailItemValue: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  deadlineValRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  descSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    color: Colors.primary,
    ...Typography.label,
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  description: {
    color: Colors.textSecondary,
    ...Typography.bodySm,
    lineHeight: 22,
  },
  requirementsSection: {
    marginBottom: Spacing.xl,
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  requirementCheck: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  requirementText: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    flex: 1,
  },
  linkBox: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primaryMid,
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  linkBoxText: {
    color: Colors.primary,
    ...Typography.label,
    marginBottom: Spacing.xs,
  },
  linkBoxUrl: {color: Colors.textSecondary, ...Typography.caption},
  directorCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  directorRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  directorInfo: {flex: 1, justifyContent: 'center'},
  directorName: {color: Colors.textPrimary, ...Typography.h4, marginBottom: 2},
  directorRole: {
    color: Colors.primary,
    ...Typography.labelSm,
    marginBottom: Spacing.xs,
  },
  directorBio: {
    color: Colors.textSecondary,
    ...Typography.bodySm,
    lineHeight: 18,
  },
  portfolioRow: {flexDirection: 'row', marginBottom: Spacing.md},
  portfolioPhoto: {
    width: 80,
    height: 80,
    borderRadius: Radius.sm,
    marginRight: Spacing.sm,
  },
  portfolioSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  portfolioTitle: {
    color: Colors.textSecondary,
    ...Typography.labelSm,
    marginBottom: Spacing.sm,
  },
  portfolioLink: {
    color: Colors.primary,
    ...Typography.label,
    marginBottom: Spacing.sm,
  },
  noteBox: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  noteLabel: {
    color: Colors.primary,
    ...Typography.labelSm,
    marginBottom: Spacing.sm,
  },
  noteInput: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    color: Colors.textPrimary,
    ...Typography.body,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  noteCount: {
    color: Colors.textSecondary,
    ...Typography.caption,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  floatingFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    ...Shadows.lg,
  },
  footerButtonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },

  whatsappBtn: {
    backgroundColor: '#25D366',
    borderRadius: Radius.button,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0.8,
  },
  whatsappBtnText: {color: '#FFFFFF', ...Typography.btnLg, fontWeight: 'bold'},
  skipBtn: {alignItems: 'center', marginTop: Spacing.sm, paddingVertical: Spacing.xs},
  skipBtnText: {
    color: Colors.textSecondary,
    ...Typography.bodySm,
    textDecorationLine: 'underline',
  },
  applicantsSection: {marginTop: Spacing.xl, marginBottom: Spacing.lg},
  applicantCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  applicantMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  applicantActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  selectBtn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  selectBtnText: {
    color: Colors.textInverse,
    fontWeight: 'bold',
    ...Typography.captionBold,
  },
  shortlistBtn: {
    backgroundColor: 'transparent',
    borderColor: Colors.primary,
  },
  shortlistBtnText: {
    color: Colors.primary,
    fontWeight: 'bold',
    ...Typography.captionBold,
  },
  rejectBtn: {
    backgroundColor: 'transparent',
    borderColor: Colors.border,
  },
  rejectBtnText: {
    color: Colors.textSecondary,
    ...Typography.captionBold,
  },
  applicantInfo: {flex: 1},
  applicantName: {color: Colors.textPrimary, ...Typography.label},
  applicantMeta: {
    color: Colors.textSecondary,
    ...Typography.caption,
    marginTop: 2,
  },
  applicantNote: {
    color: Colors.primary,
    ...Typography.captionBold,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  applicantArrow: {color: Colors.primary, fontSize: 24, fontWeight: 'bold'},
  applicantHint: {
    color: Colors.textSecondary,
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  commentsSection: {marginTop: Spacing.lg},
  commentInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.textPrimary,
    ...Typography.body,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 100,
  },
  commentSendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSendBtnDisabled: {opacity: 0.4},
  commentSendText: {
    color: Colors.textInverse,
    fontWeight: 'bold',
    ...Typography.btn,
  },
  commentCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  commentMeta: {flex: 1},
  commentName: {color: Colors.textPrimary, ...Typography.label},
  directorTag: {color: Colors.primary, ...Typography.caption},
  commentTime: {
    color: Colors.textSecondary,
    ...Typography.caption,
    marginTop: 2,
  },
  deleteCommentBtn: {padding: Spacing.xs},
  deleteCommentText: {
    color: Colors.primary, // Red changed to primary yellow/gold color
    ...Typography.body,
    fontWeight: 'bold',
  },
  commentText: {
    color: Colors.textSecondary,
    ...Typography.bodySm,
    lineHeight: 20,
  },
  mainApplyContainer: {
    marginVertical: Spacing.md,
  },
  noteInputContainer: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  noteTextInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    fontFamily: Typography.body.fontFamily,
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  noteActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelNoteBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  cancelNoteText: {
    color: Colors.textSecondary,
    ...Typography.captionBold,
  },
  skipNoteBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  skipNoteText: {
    color: Colors.primary,
    ...Typography.captionBold,
    textDecorationLine: 'underline',
  },
  whatsappBtnMain: {
    backgroundColor: '#25D366',
    borderRadius: Radius.button,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  whatsappBtnTextMain: {
    color: '#FFFFFF',
    ...Typography.label,
    fontWeight: 'bold',
  },
  engagementCard: {
    backgroundColor: Colors.cardElevated,
    marginVertical: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  engagementBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  engagementText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  rightActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginLeft: 'auto',
    alignItems: 'center',
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnDone: {
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  applyBtnText: {
    ...Typography.captionBold,
    color: '#FFFFFF',
    fontSize: 13,
  },
  applyBtnTextDone: {
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.md,
  },
  modalTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  submitNoteBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  submitNoteText: {
    color: Colors.textInverse,
    ...Typography.captionBold,
  },
  adminBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.background,
  },
  adminBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  adminBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

