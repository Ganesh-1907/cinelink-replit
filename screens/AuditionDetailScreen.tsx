import React, {useState, useEffect} from 'react';
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
} from 'react-native';
import api from '../src/api/client';
import {LiquidPress} from '../components/LiquidPress';
import {ADMIN_UID} from '../src/api/config';
import {useApp} from '../src/context/AppContext';
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
  const paramAudition = route?.params?.audition;
  const paramAuditionId = route?.params?.auditionId;

  const [audition, setAudition] = useState<any>(paramAudition || null);
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
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* POSTER */}
        {audition.posterUrl ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() =>
              navigation.navigate('ImageViewer', {imageUrl: audition.posterUrl})
            }>
            <Image source={{uri: audition.posterUrl}} style={styles.poster} />
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
            <TouchableOpacity
              style={[styles.saveBtn, saved && styles.saveBtnActive]}
              onPress={toggleSave}>
              <Text style={styles.saveBtnText}>
                {saved ? '💾 Saved' : '🔖 Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>{audition.title}</Text>

          {/* INFO GRID */}
          <View style={styles.infoGrid}>
            {audition.location ? (
              <Card variant="default" padding={12} style={styles.infoCard}>
                <Text style={styles.infoLabel}>📍 Location</Text>
                <Text style={styles.infoValue}>{audition.location}</Text>
              </Card>
            ) : null}
            {audition.gender ? (
              <Card variant="default" padding={12} style={styles.infoCard}>
                <Text style={styles.infoLabel}>👤 Gender</Text>
                <Text style={styles.infoValue}>{audition.gender}</Text>
              </Card>
            ) : null}
            {audition.ageRange ? (
              <Card variant="default" padding={12} style={styles.infoCard}>
                <Text style={styles.infoLabel}>🎂 Age Range</Text>
                <Text style={styles.infoValue}>{audition.ageRange} yrs</Text>
              </Card>
            ) : null}
            {audition.lastDate ? (
              <Card variant="default" padding={12} style={styles.infoCard}>
                <Text style={styles.infoLabel}>📅 Last Date</Text>
                <Text style={styles.infoValue}>{audition.lastDate}</Text>
                <View style={{marginTop: Spacing.xs}}>
                  <Chip
                    label={audition.lastDate}
                    variant={deadlineChipVariant}
                    static
                  />
                </View>
              </Card>
            ) : null}
            {audition.role ? (
              <Card variant="default" padding={12} style={styles.infoCard}>
                <Text style={styles.infoLabel}>🎬 Role</Text>
                <Text style={styles.infoValue}>{audition.role}</Text>
              </Card>
            ) : null}
            {audition.language ? (
              <Card variant="default" padding={12} style={styles.infoCard}>
                <Text style={styles.infoLabel}>🗣 Language</Text>
                <Text style={styles.infoValue}>{audition.language}</Text>
              </Card>
            ) : null}
          </View>

          {/* DESCRIPTION */}
          {audition.description ? (
            <>
              <Text style={styles.sectionTitle}>About this Audition</Text>
              <Text style={styles.description}>
                {phoneNumber
                  ? audition.description
                      .replace(phoneNumber, '')
                      .replace(/\s+/g, ' ')
                      .trim()
                  : audition.description}
              </Text>
            </>
          ) : null}

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
            <Card
              variant="elevated"
              padding={Spacing.lg}
              style={styles.directorCard}>
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
            </Card>
          )}

          {/* NOTE INPUT */}
          {showNoteInput && !applied && (
            <Card variant="default" padding={Spacing.md} style={styles.noteBox}>
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
            </Card>
          )}

          {/* ACTION BUTTONS */}
          <View style={styles.buttonRow}>
            <LiquidPress
              style={[
                styles.applyBtn,
                {flex: phoneNumber ? 0.55 : 1},
                applied && styles.applyBtnDone,
              ]}
              onPress={applyNow}
              disabled={applied || loading}>
              {loading ? (
                <ActivityIndicator color={Colors.textPrimary} />
              ) : (
                <Text style={styles.applyBtnText}>
                  {applied
                    ? '✅ Applied'
                    : showNoteInput
                    ? '🚀 Submit'
                    : 'Apply Now →'}
                </Text>
              )}
            </LiquidPress>
            {phoneNumber && (
              <TouchableOpacity
                style={styles.whatsappBtn}
                onPress={openWhatsApp}>
                <Text style={styles.whatsappBtnText} numberOfLines={1}>
                  📱 WhatsApp
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {showNoteInput && !applied && (
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => {
                setNote('');
                applyNow();
              }}>
              <Text style={styles.skipBtnText}>Skip note & apply directly</Text>
            </TouchableOpacity>
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
                applicants.map((app: any) => (
                  <TouchableOpacity
                    key={app.id}
                    style={styles.applicantCard}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate('PublicProfile', {
                        userId: app.applicantId,
                      })
                    }>
                    <Avatar
                      name={app.applicantName || app.applicantEmail || 'U'}
                      size="sm"
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
                ))
              )}
              <Text style={styles.applicantHint}>
                Tap an applicant to view their profile &amp; portfolio
              </Text>
            </View>
          )}

          {/* COMMENTS SECTION */}
          <View style={styles.commentsSection}>
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
              comments.map((comment: any) => {
                const isOwn = comment.userId === user?.uid;
                const isDirector = audition.directorId === user?.uid;
                const canDelete = isOwn || isDirector;
                return (
                  <View key={comment.id} style={styles.commentCard}>
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
  poster: {width: '100%', height: 250, resizeMode: 'cover'},
  tapHint: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.card,
  },
  tapHintText: {color: Colors.textSecondary, ...Typography.caption},
  posterPlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterPlaceholderText: {fontSize: 50},
  section: {padding: Spacing.xl, paddingBottom: Spacing['4xl']},
  statusRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  saveBtn: {
    backgroundColor: Colors.card,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginLeft: 'auto',
  },
  saveBtnActive: {
    backgroundColor: Colors.cardElevated,
    borderColor: Colors.primary,
  },
  saveBtnText: {color: Colors.textSecondary, ...Typography.captionBold},
  title: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: Spacing.lg,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  infoCard: {width: '47%'},
  infoLabel: {
    color: Colors.textSecondary,
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  infoValue: {color: Colors.textPrimary, ...Typography.body, fontWeight: '500'},
  sectionTitle: {
    color: Colors.primary,
    ...Typography.h4,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  description: {
    color: Colors.textSecondary,
    ...Typography.bodyLg,
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  linkBox: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  linkBoxText: {
    color: Colors.primary,
    ...Typography.label,
    marginBottom: Spacing.xs,
  },
  linkBoxUrl: {color: Colors.textSecondary, ...Typography.caption},
  directorCard: {marginBottom: Spacing.xl},
  directorRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  directorInfo: {flex: 1, justifyContent: 'center'},
  directorName: {color: Colors.textPrimary, ...Typography.h4, marginBottom: 2},
  directorRole: {
    color: Colors.primary,
    ...Typography.label,
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
    ...Typography.label,
    marginBottom: Spacing.sm,
  },
  portfolioLink: {
    color: Colors.primary,
    ...Typography.label,
    marginBottom: Spacing.sm,
  },
  noteBox: {marginBottom: Spacing.lg},
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
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderTopColor: Colors.primaryLight,
    borderBottomColor: Colors.primaryDark,
    borderLeftColor: Colors.primaryMid,
    borderRightColor: Colors.primaryDark,
    ...Shadows.primary,
  },
  applyBtnDone: {
    backgroundColor: Colors.successFaint,
    borderColor: Colors.success,
  },
  applyBtnText: {color: Colors.textPrimary, ...Typography.btn, fontSize: 15},
  whatsappBtn: {
    backgroundColor: '#25D366',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0.45,
  },
  whatsappBtnText: {color: Colors.textPrimary, ...Typography.btn},
  skipBtn: {alignItems: 'center', marginTop: Spacing.md, padding: Spacing.sm},
  skipBtnText: {
    color: Colors.textSecondary,
    ...Typography.bodySm,
    textDecorationLine: 'underline',
  },
  applicantsSection: {marginTop: Spacing.xxl},
  applicantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
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
  commentsSection: {marginTop: Spacing.xxl},
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
    ...Shadows.primary,
  },
  commentSendBtnDisabled: {opacity: 0.4},
  commentSendText: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    ...Typography.btn,
  },
  commentCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
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
    color: Colors.error,
    ...Typography.body,
    fontWeight: 'bold',
  },
  commentText: {
    color: Colors.textSecondary,
    ...Typography.body,
    lineHeight: 20,
  },
});

