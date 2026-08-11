import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {useApp} from '../src/context/AppContext';
import {
  Header,
  EmptyState,
  Avatar,
  Badge,
  Button,
  SkeletonListItem,
} from '../components/ui';

const cleanMessage = (msg: string): string => {
  if (!msg) {
    return '';
  }
  return msg.replace(
    /([a-zA-Z0-9._%+\-]+)@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    (_, u) => u,
  );
};

const getIcon = (type: string) => {
  switch (type) {
    case 'connect_request':
      return '🤝';
    case 'connect_accepted':
      return '✅';
    case 'new_follower':
      return '👥';
    case 'shortlisted':
      return '🎉';
    case 'new_audition':
      return '🎬';
    case 'contest_deadline':
      return '⏰';
    case 'selected':
      return '✅';
    case 'rejected':
      return '😔';
    case 'message':
      return '💬';
    case 'application':
      return '📋';
    case 'comment':
      return '💬';
    case 'like':
      return '❤️';
    case 'reel_like':
      return '🎬';
    case 'project_apply':
      return '📁';
    case 'project_accepted':
      return '✅';
    case 'project_rejected':
      return '❌';
    case 'project_invite':
      return '📩';
    case 'verification':
      return '✓';
    case 'casting_approved':
      return '🎬';
    case 'casting_rejected':
      return '❌';
    default:
      return '🔔';
  }
};

const getBorderColor = (type: string) => {
  switch (type) {
    case 'connect_request':
      return Colors.primary;
    case 'connect_accepted':
      return Colors.success;
    case 'new_follower':
      return Colors.primary;
    case 'shortlisted':
    case 'selected':
    case 'project_accepted':
    case 'casting_approved':
    case 'verification':
      return Colors.success;
    case 'new_audition':
    case 'application':
    case 'comment':
    case 'project_apply':
    case 'project_invite':
      return Colors.primary;
    case 'contest_deadline':
      return Colors.warning;
    case 'rejected':
    case 'project_rejected':
    case 'casting_rejected':
    case 'like':
      return Colors.error;
    case 'reel_like':
      return Colors.primary;
    default:
      return Colors.primary;
  }
};

// Which notification types navigate to a profile on tap
const isProfileNotif = (type: string) =>
  [
    'new_follower',
    'follow',
    'follower',
    'connect_request',
    'connect_accepted',
    'message',
  ].includes(type);

const isAuditionNotif = (type: string) =>
  ['new_audition', 'shortlisted', 'selected', 'rejected'].includes(type);

const isApplicationNotif = (type: string) =>
  ['application', 'new_application'].includes(type);

const isCastingRequestNotif = (type: string) =>
  ['casting_request', 'new_casting_request'].includes(type);

const isCastingApprovedNotif = (type: string) =>
  ['casting_approved', 'casting_rejected'].includes(type);

const isMessageNotif = (type: string) => type === 'message';
const isContestNotif = (type: string) =>
  [
    'contest_entry',
    'contest_created',
    'new_contest',
    'contest_deadline',
    'contest_winner',
  ].includes(type);

const isProjectNotif = (type: string) =>
  ['project_invite', 'project_apply', 'project_accepted', 'project_rejected'].includes(type);

const isCommentOrLikeNotif = (type: string) =>
  ['comment', 'like'].includes(type);

const isReelLikeNotif = (type: string) => type === 'reel_like';

const isVerificationNotif = (type: string) => type === 'verification';

const getId = (item: any) => item._id || item.id || '';

export default function NotificationsScreen({navigation}: any) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [senderNames, setSenderNames] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const {user} = useApp();

  const loadSenderNames = useCallback((notifList: any[]) => {
    const names: Record<string, string> = {};
    for (const notif of notifList) {
      const senderId = notif.senderId || notif.viewerId || notif.fromUserId;
      const name = notif.senderName || notif.fromName || notif.userName;
      if (senderId && name) names[senderId] = name;
    }
    setSenderNames(names);
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.get<{notifications: any[]; unreadCount?: number}>('/notifications');
      const data: any[] = Array.isArray(res.notifications) ? res.notifications : [];
      console.log('[NotificationsScreen] Loaded', data.length, 'notifications, unread:', res.unreadCount);
      setNotifications(data);
      loadSenderNames(data);
    } catch (e) {
      console.log('[NotificationsScreen] ERROR:', e);
    } finally {
      setLoading(false);
    }
  }, [loadSenderNames]);

  useEffect(() => {
    if (user) loadNotifications();
  }, [user, loadNotifications]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadNotifications();
    });
    return unsubscribe;
  }, [navigation, loadNotifications]);

  const resolveMessage = (item: any): string => {
    const raw = item.message || '';
    const senderId = item.senderId || item.viewerId || item.fromUserId;
    const realName = senderNames[senderId];
    if (realName) {
      return raw.replace(
        /([a-zA-Z0-9._%+\-]+)@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
        realName,
      );
    }
    return cleanMessage(raw);
  };

  const markAsRead = async (id: string) => {
    try { await api.put(`/notifications/${id}/read`); } catch {}
  };

  const markAllRead = async () => {
    try { await api.put('/notifications/read'); } catch {}
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter((n: any) => (n._id || n.id) !== id));
    try { await api.delete(`/notifications/${id}`); } catch {}
  };

  // ── TAP NOTIFICATION → Navigate to relevant screen ─────────
  const handleNotifTap = async (item: any) => {
    await markAsRead(getId(item));

    const senderId =
      item.senderId || item.viewerId || item.fromUserId || item.followerId;

    if (isCastingRequestNotif(item.type)) {
      navigation.navigate('AdminReports');
    } else if (isCastingApprovedNotif(item.type)) {
      navigation.navigate('MyAuditions');
    } else if (isMessageNotif(item.type)) {
      if (item.chatId) {
        navigation.navigate('ChatScreen', {
          chat: {
            id: item.chatId,
            participants: [user?._id || user?.uid, item.senderId].filter(Boolean),
            participantNames: [],
            lastMessage: '',
          },
        });
      } else if (senderId) {
        try {
          const res = await api.post<any>('/chat/start', { otherUserId: senderId });
          if (res.chat) {
            navigation.navigate('ChatScreen', {
              chat: {
                id: res.chat._id || res.chat.id,
                participants: res.chat.participants,
                participantNames: res.chat.participantNames || [],
                lastMessage: res.chat.lastMessage || '',
              }
            });
          } else {
            navigation.navigate('Chats');
          }
        } catch (err) {
          navigation.navigate('Chats');
        }
      } else {
        navigation.navigate('Chats');
      }
    } else if (isContestNotif(item.type)) {
      if (item.contestId) {
        navigation.navigate('ContestDetail', {
          contestId: item.contestId,
        });
      } else {
        navigation.navigate('Main', {
          screen: 'Contests',
        });
      }
    } else if (
      item.type === 'request_accepted' ||
      item.type === 'request_rejected'
    ) {
      navigation.navigate('MyApplications');
    } else if (isApplicationNotif(item.type)) {
      if (item.auditionId) {
        navigation.navigate('AuditionDetail', {auditionId: item.auditionId});
      } else {
        navigation.navigate('MyAuditions');
      }
    } else if (isAuditionNotif(item.type)) {
      if (item.auditionId) {
        navigation.navigate('AuditionDetail', {auditionId: item.auditionId});
      } else {
        navigation.navigate('BrowseAuditions');
      }
    } else if (isProfileNotif(item.type) && senderId) {
      navigation.navigate('PublicProfile', {
        userId: senderId,
      });
    } else if (isProjectNotif(item.type) && item.projectId) {
      navigation.navigate('ProjectDetail', {projectId: item.projectId});
    } else if (isCommentOrLikeNotif(item.type) && item.auditionId) {
      navigation.navigate('AuditionDetail', {auditionId: item.auditionId});
    } else if (isReelLikeNotif(item.type)) {
      navigation.navigate('ReelsScreen');
    } else if (isVerificationNotif(item.type)) {
      // Info only — no navigation needed
    }
  };

  // ── ACCEPT CONNECT REQUEST ───────────────────────────────────
  const handleAccept = async (notif: any) => {
    try {
      const senderId = notif.senderId;

      // Accept connection via API
      await api.put('/connections/respond', {
        requesterId: notif.senderId,
        status: 'accepted',
      });

      // Delete this notification
      await deleteNotification(notif._id || notif.id);

      // ✅ Navigate to their profile after accepting
      Alert.alert(
        'Connected! 🎉',
        `You are now connected with ${
          notif.senderName || 'this creator'
        }. You can now message each other.`,
        [
          {
            text: 'View Profile',
            onPress: () =>
              navigation.navigate('PublicProfile', {userId: senderId}),
          },
          {text: 'OK', style: 'cancel'},
        ],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
    }
  };

  // ── DECLINE CONNECT REQUEST ──────────────────────────────────
  const handleDecline = async (notif: any) => {
    try {
      await api.put('/connections/respond', {
        requesterId: notif.senderId,
        status: 'rejected',
      });
      await deleteNotification(notif._id || notif.id);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
    }
  };

  // ── ACCEPT PROJECT INVITE ────────────────────────────────────
  const handleAcceptInvite = async (notif: any) => {
    try {
      await api.post(`/projects/${notif.projectId}/respond-invite`, {
        status: 'Accepted',
        role: notif.role,
        notificationId: notif._id || notif.id
      });
      setNotifications(prev => prev.filter((n: any) => (n._id || n.id) !== (notif._id || notif.id)));
      Alert.alert('Joined Project! 🎉', 'You have successfully joined the project crew.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
    }
  };

  const handleDeclineInvite = async (notif: any) => {
    try {
      await api.post(`/projects/${notif.projectId}/respond-invite`, {
        status: 'Rejected',
        role: notif.role,
        notificationId: notif._id || notif.id
      });
      setNotifications(prev => prev.filter((n: any) => (n._id || n.id) !== (notif._id || notif.id)));
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
    }
  };

  const clearAll = () => {
    Alert.alert('Clear All', 'Mark all as read?', [
      {
        text: 'Mark Read',
        onPress: async () => {
          await markAllRead();
          setNotifications([]);
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle={Colors.background !== '#FFFFFF' ? 'light-content' : 'dark-content'}
        backgroundColor={Colors.background}
      />
      <Header
        title="Notifications"
        navigation={navigation}
        right={
          notifications.length > 0 ? (
            <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
              <Text style={styles.clearBtnText}>Clear All</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          {/* UNREAD BADGE */}
          {unreadCount > 0 && (
            <View style={styles.unreadBanner}>
              <Text style={styles.unreadBannerText}>
                🔔 {unreadCount} new notification{unreadCount > 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {loading ? (
            <>
              <SkeletonListItem />
              <SkeletonListItem />
              <SkeletonListItem />
              <SkeletonListItem />
            </>
          ) : notifications.length === 0 ? (
            <EmptyState
              icon="🔔"
              title="No notifications yet"
              subtitle="Connect with creators to get updates"
              actionLabel="Explore Auditions"
              onAction={() => navigation.navigate('Main', {screen: 'Home'})}
            />
          ) : (
            notifications.map(item => {
              const isConnectRequest = item.type === 'connect_request';
              const isProjectInvite = item.type === 'project_invite';
              const isTappable =
                isProfileNotif(item.type) ||
                isAuditionNotif(item.type) ||
                isApplicationNotif(item.type) ||
                isCastingRequestNotif(item.type) ||
                isCastingApprovedNotif(item.type) ||
                isMessageNotif(item.type) ||
                isContestNotif(item.type) ||
                isProjectNotif(item.type) ||
                isCommentOrLikeNotif(item.type) ||
                isReelLikeNotif(item.type) ||
                item.type === 'request_accepted' ||
                item.type === 'request_rejected' ||
                item.type === 'new_audition';

              const borderColor = getBorderColor(item.type);

              return (
                <TouchableOpacity
                  key={getId(item)}
                  activeOpacity={isTappable ? 0.7 : 1}
                  style={[
                    styles.card,
                    {borderLeftColor: borderColor},
                    !item.read && styles.cardUnread,
                    (isConnectRequest || isProjectInvite) && styles.connectRequestCard,
                  ]}
                  onPress={() =>
                    isTappable && !isConnectRequest && !isProjectInvite && handleNotifTap(item)
                  }>
                  <View style={styles.cardRow}>
                    {/* SENDER AVATAR or ICON */}
                    {item.senderName || item.fromName ? (
                      <Avatar
                        name={item.senderName || item.fromName}
                        size="sm"
                      />
                    ) : (
                      <View
                        style={[
                          styles.iconBox,
                          {backgroundColor: Colors.primaryFaint},
                        ]}>
                        <Text style={styles.icon}>{getIcon(item.type)}</Text>
                      </View>
                    )}

                    {/* CONTENT */}
                    <View style={styles.cardContent}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                        {!item.read && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.cardMessage} numberOfLines={2}>
                        {resolveMessage(item)}
                      </Text>
                      <Text style={styles.cardTime}>
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString([], {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Recently'}
                      </Text>

                      {/* CONNECT REQUEST — Accept / Decline */}
                      {isConnectRequest && (
                        <View style={styles.actionBtns}>
                          <TouchableOpacity
                            style={styles.acceptBtn}
                            onPress={() => handleAccept(item)}>
                            <Text style={styles.acceptBtnText}>✅ Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.declineBtn}
                            onPress={() => handleDecline(item)}>
                            <Text style={styles.declineBtnText}>✕ Decline</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* PROJECT INVITATION — Accept / Decline */}
                      {isProjectInvite && (
                        <View style={styles.actionBtns}>
                          <TouchableOpacity
                            style={styles.acceptBtn}
                            onPress={() => handleAcceptInvite(item)}>
                            <Text style={styles.acceptBtnText}>✅ Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.declineBtn}
                            onPress={() => handleDeclineInvite(item)}>
                            <Text style={styles.declineBtnText}>✕ Decline</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    {/* DELETE */}
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                      onPress={e => {
                        e.stopPropagation?.();
                        deleteNotification(getId(item));
                      }}>
                      <Text style={styles.deleteBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  container: {flex: 1, backgroundColor: Colors.background},
  section: {padding: Spacing.lg, paddingBottom: Spacing['4xl']},

  clearBtn: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 0.5,
    borderColor: Colors.primaryMid,
  },
  clearBtnText: {...Typography.captionBold, color: Colors.primary},

  unreadBanner: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primaryMid,
  },
  unreadBannerText: {
    ...Typography.bodySm,
    color: Colors.primary,
    fontWeight: '600',
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  cardUnread: {
    backgroundColor: Colors.cardElevated,
    borderColor: Colors.borderFocus,
  },
  connectRequestCard: {
    backgroundColor: Colors.primaryFaint,
    borderLeftColor: Colors.primary,
  },
  cardRow: {flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start'},
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  icon: {fontSize: 16},

  cardContent: {flex: 1},
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 1,
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  unreadDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.primary,
    marginLeft: Spacing.sm,
  },
  cardMessage: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: Colors.textSecondary,
    marginBottom: 2,
    lineHeight: 15,
  },
  cardTime: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: Colors.textTertiary,
  },

  actionBtns: {flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs},
  acceptBtn: {
    flex: 1,
    backgroundColor: Colors.successFaint,
    borderRadius: Radius.sm,
    paddingVertical: 4,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  acceptBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    color: Colors.success,
    fontSize: 10,
  },
  declineBtn: {
    flex: 1,
    backgroundColor: Colors.errorFaint,
    borderRadius: Radius.sm,
    paddingVertical: 4,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  declineBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    color: Colors.error,
    fontSize: 10,
  },

  deleteBtn: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  deleteBtnText: {fontSize: 12, color: Colors.textTertiary, fontWeight: 'bold'},
});
