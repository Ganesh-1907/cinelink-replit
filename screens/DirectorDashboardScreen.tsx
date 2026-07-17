import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {
  Header,
  Button,
  Card,
  Avatar,
  EmptyState,
  LoadingView,
} from '../components/ui';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) {
    return 'User';
  }
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

export default function DirectorDashboardScreen({navigation}: any) {
  const [applications, setApplications] = useState<any[]>([]);
  const [auditions, setAuditions] = useState<any[]>([]);
  const [myAuditions, setMyAuditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedAuditionId, setExpandedAuditionId] = useState<string | null>(
    null,
  );
  const [processingAppId, setProcessingAppId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'auditions' | 'applications'>(
    'auditions',
  );

  const user = auth().currentUser;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadMyAuditions(), loadApplications()]);
    } finally {
      setLoading(false);
    }
  };

  const loadMyAuditions = async () => {
    try {
      const snapshot = await firestore()
        .collection('auditions')
        .where('directorId', '==', user?.uid)
        .get();
      const items = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
      items.sort(
        (a: any, b: any) =>
          (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
      );
      setMyAuditions(items);
    } catch (e) {
      console.log('LOAD MY AUDITIONS ERROR:', e);
    }
  };

  const loadApplications = async () => {
    try {
      const snapshot = await firestore()
        .collection('applications')
        .where('directorId', '==', user?.uid)
        .get();
      const apps = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
      apps.sort(
        (a: any, b: any) =>
          (b.appliedAt?.seconds || 0) - (a.appliedAt?.seconds || 0),
      );
      setApplications(apps);
      const auditionIds = [...new Set(apps.map((app: any) => app.auditionId))];
      const auditionDocs = await Promise.all(
        auditionIds.map(id =>
          firestore()
            .collection('auditions')
            .doc(id as string)
            .get(),
        ),
      );
      setAuditions(
        auditionDocs
          .filter(doc => doc.exists)
          .map(doc => ({id: doc.id, ...doc.data()})),
      );
    } catch (e) {
      console.log('LOAD APPLICATIONS ERROR:', e);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const deleteAudition = (audition: any) => {
    Alert.alert(
      '🗑 Delete Audition',
      `Are you sure you want to delete "${audition.title}"? This cannot be undone.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore()
                .collection('auditions')
                .doc(audition.id)
                .delete();
              setMyAuditions(prev => prev.filter(a => a.id !== audition.id));
              Alert.alert('✅ Deleted', 'Audition deleted successfully!');
            } catch (e) {
              console.log('DELETE ERROR:', e);
              Alert.alert('Error', 'Could not delete audition.');
            }
          },
        },
      ],
    );
  };

  const toggleAuditionStatus = async (audition: any) => {
    const newStatus = audition.isActive === false ? true : false;
    try {
      await firestore()
        .collection('auditions')
        .doc(audition.id)
        .update({
          isActive: newStatus,
          status: newStatus ? 'Open' : 'Closed',
        });
      setMyAuditions(prev =>
        prev.map(a =>
          a.id === audition.id
            ? {...a, isActive: newStatus, status: newStatus ? 'Open' : 'Closed'}
            : a,
        ),
      );
      Alert.alert(
        '✅ Updated',
        `Audition ${newStatus ? 'reopened' : 'closed'} successfully!`,
      );
    } catch (e) {
      Alert.alert('Error', 'Could not update audition status.');
    }
  };

  const acceptApplication = async (appId: string, app: any) => {
    setProcessingAppId(appId);
    try {
      await firestore().collection('applications').doc(appId).update({
        status: 'Accepted',
        decidedAt: firestore.FieldValue.serverTimestamp(),
      });
      await firestore()
        .collection('notifications')
        .add({
          userId: app.applicantId,
          type: 'application_accepted',
          title: '🎉 Application Accepted!',
          message: `Congratulations! You've been selected for "${app.auditionTitle}"`,
          senderId: user?.uid,
          read: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      await loadApplications();
      Alert.alert('✅ Accepted', `${app.applicantName} has been notified!`);
    } catch (e) {
      Alert.alert('Error', 'Could not accept application');
    } finally {
      setProcessingAppId(null);
    }
  };

  const rejectApplication = async (appId: string, app: any) => {
    Alert.alert(
      'Reject Application',
      'Are you sure you want to reject this application?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessingAppId(appId);
            try {
              await firestore().collection('applications').doc(appId).update({
                status: 'Rejected',
                decidedAt: firestore.FieldValue.serverTimestamp(),
              });
              await firestore()
                .collection('notifications')
                .add({
                  userId: app.applicantId,
                  type: 'application_rejected',
                  title: '❌ Application Not Selected',
                  message: `Thank you for applying for "${app.auditionTitle}". We appreciate your interest!`,
                  senderId: user?.uid,
                  read: false,
                  createdAt: firestore.FieldValue.serverTimestamp(),
                });
              await loadApplications();
              Alert.alert('Done', `${app.applicantName} has been notified`);
            } catch (e) {
              Alert.alert('Error', 'Could not reject application');
            } finally {
              setProcessingAppId(null);
            }
          },
        },
      ],
    );
  };

  const startChat = async (app: any) => {
    try {
      const chatId = [user?.uid, app.applicantId].sort().join('_');

      const myDoc = await firestore().collection('users').doc(user?.uid).get();
      const myData = myDoc.data();
      const directorName =
        myData?.fullName ||
        myData?.displayName ||
        myData?.name ||
        user?.displayName ||
        cleanName(user?.email) ||
        'Director';

      const applicantName =
        app.applicantName || cleanName(app.applicantEmail) || 'Applicant';

      await firestore()
        .collection('chats')
        .doc(chatId)
        .set(
          {
            participants: [user?.uid, app.applicantId],
            participantNames: [directorName, applicantName],
            participantEmails: [user?.email, app.applicantEmail],
            lastMessage: '',
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
          {merge: true},
        );

      navigation.navigate('ChatScreen', {
        chat: {id: chatId, participantNames: [directorName, applicantName]},
      });
    } catch (e) {
      console.log('CHAT ERROR:', e);
      Alert.alert('Error', 'Could not start chat');
    }
  };

  const renderApplicationCard = (app: any) => {
    const isProcessing = processingAppId === app.id;
    const statusColor =
      app.status === 'Accepted'
        ? Colors.success
        : app.status === 'Rejected'
        ? Colors.error
        : Colors.warning;
    const statusBg =
      app.status === 'Accepted'
        ? Colors.successFaint
        : app.status === 'Rejected'
        ? Colors.errorFaint
        : Colors.warningFaint;

    return (
      <View key={app.id} style={styles.appCard}>
        <View style={styles.appHeader}>
          <Avatar name={app.applicantName || 'A'} size="md" />
          <View style={{flex: 1, marginLeft: Spacing.md}}>
            <Text style={styles.appName}>
              {app.applicantName || 'Applicant'}
            </Text>
            <Text style={styles.appEmail}>{cleanName(app.applicantEmail)}</Text>
          </View>
          <View style={[styles.statusBadge, {backgroundColor: statusBg}]}>
            <Text style={[styles.statusText, {color: statusColor}]}>
              {app.status === 'Accepted'
                ? '✅ Selected'
                : app.status === 'Rejected'
                ? '❌ Rejected'
                : '⏳ Pending'}
            </Text>
          </View>
        </View>

        <Text style={styles.appliedDate}>
          📅 {app.appliedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
        </Text>

        {app.note ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>💭 Applicant Note:</Text>
            <Text style={styles.noteText}>{app.note}</Text>
          </View>
        ) : null}

        {app.status === 'Pending' ? (
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.acceptBtn, isProcessing && styles.btnDisabled]}
              onPress={() => acceptApplication(app.id, app)}
              disabled={isProcessing}>
              {isProcessing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.acceptBtnText}>✅ Accept</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectBtn, isProcessing && styles.btnDisabled]}
              onPress={() => rejectApplication(app.id, app)}
              disabled={isProcessing}>
              {isProcessing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.rejectBtnText}>❌ Reject</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chatBtn}
              onPress={() => startChat(app)}
              disabled={isProcessing}>
              <Text style={styles.chatBtnText}>💬</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.chatBtn, {marginTop: Spacing.sm}]}
            onPress={() => startChat(app)}>
            <Text style={styles.chatBtnText}>💬 Message</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderAuditionGroup = (auditionId: string) => {
    const audition = auditions.find(a => a.id === auditionId);
    const auditionApps = applications.filter(a => a.auditionId === auditionId);
    const isExpanded = expandedAuditionId === auditionId;
    const stats = {
      total: auditionApps.length,
      pending: auditionApps.filter((a: any) => a.status === 'Pending').length,
      accepted: auditionApps.filter((a: any) => a.status === 'Accepted').length,
      rejected: auditionApps.filter((a: any) => a.status === 'Rejected').length,
    };

    return (
      <View key={auditionId} style={styles.auditionSection}>
        <TouchableOpacity
          style={styles.auditionHeader}
          onPress={() => setExpandedAuditionId(isExpanded ? null : auditionId)}>
          <View style={{flex: 1}}>
            <Text style={styles.auditionTitle}>
              🎭 {audition?.title || 'Audition'}
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total</Text>
                <Text style={styles.statValue}>{stats.total}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, {color: Colors.warning}]}>
                  Pending
                </Text>
                <Text style={[styles.statValue, {color: Colors.warning}]}>
                  {stats.pending}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, {color: Colors.success}]}>
                  Accepted
                </Text>
                <Text style={[styles.statValue, {color: Colors.success}]}>
                  {stats.accepted}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, {color: Colors.error}]}>
                  Rejected
                </Text>
                <Text style={[styles.statValue, {color: Colors.error}]}>
                  {stats.rejected}
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.applicationsContainer}>
            {auditionApps.length === 0 ? (
              <Text style={styles.noAppsText}>No applications yet</Text>
            ) : (
              auditionApps.map(app => renderApplicationCard(app))
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={Colors.background}
        />
        <LoadingView message="Loading dashboard..." fullScreen />
      </SafeAreaView>
    );
  }

  const uniqueAuditionIds = [
    ...new Set(applications.map(app => app.auditionId)),
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
            progressBackgroundColor={Colors.background}
          />
        }>
        <Header
          title="📊 Director Dashboard"
          navigation={navigation}
          noBorder
        />

        <Text style={styles.headerSubtitle}>
          Manage your auditions & applications
        </Text>

        {/* STATS */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>{myAuditions.length}</Text>
            <Text style={styles.statCardLabel}>My Auditions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statCardValue, {color: Colors.warning}]}>
              {applications.filter((a: any) => a.status === 'Pending').length}
            </Text>
            <Text style={styles.statCardLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statCardValue, {color: Colors.success}]}>
              {applications.filter((a: any) => a.status === 'Accepted').length}
            </Text>
            <Text style={styles.statCardLabel}>Accepted</Text>
          </View>
        </View>

        {/* TABS */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'auditions' && styles.tabActive]}
            onPress={() => setActiveTab('auditions')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'auditions' && styles.tabTextActive,
              ]}>
              🎭 My Auditions ({myAuditions.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'applications' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('applications')}>
            <Text
              style={[
                styles.tabText,
                activeTab === 'applications' && styles.tabTextActive,
              ]}>
              📋 Applications ({applications.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* MY AUDITIONS TAB */}
        {activeTab === 'auditions' && (
          <View style={styles.section}>
            <Button
              label="+ Post New Audition"
              onPress={() => navigation.navigate('PostAudition')}
              variant="primary"
              fullWidth
            />

            {myAuditions.length === 0 ? (
              <EmptyState
                icon="🎭"
                title="No auditions posted yet"
                subtitle="Post your first audition to get started!"
              />
            ) : (
              myAuditions.map(audition => (
                <View key={audition.id} style={styles.myAuditionCard}>
                  <View style={styles.myAuditionTop}>
                    <View
                      style={[
                        styles.auditionStatusBadge,
                        {
                          backgroundColor:
                            audition.isActive === false
                              ? Colors.errorFaint
                              : Colors.successFaint,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.auditionStatusText,
                          {
                            color:
                              audition.isActive === false
                                ? Colors.error
                                : Colors.success,
                          },
                        ]}>
                        {audition.isActive === false ? '🔴 Closed' : '🟢 Open'}
                      </Text>
                    </View>
                    <Text style={styles.myAuditionAppsCount}>
                      {
                        applications.filter(a => a.auditionId === audition.id)
                          .length
                      }{' '}
                      applications
                    </Text>
                  </View>

                  <Text style={styles.myAuditionTitle}>{audition.title}</Text>

                  <View style={styles.myAuditionMeta}>
                    {audition.location ? (
                      <Text style={styles.myAuditionMetaText}>
                        📍 {audition.location}
                      </Text>
                    ) : null}
                    {audition.role ? (
                      <Text style={styles.myAuditionMetaText}>
                        🎭 {audition.role}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.myAuditionActions}>
                    <TouchableOpacity
                      style={styles.toggleBtn}
                      onPress={() => toggleAuditionStatus(audition)}>
                      <Text style={styles.toggleBtnText}>
                        {audition.isActive === false ? '🔓 Reopen' : '🔒 Close'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteAuditionBtn}
                      onPress={() => deleteAudition(audition)}>
                      <Text style={styles.deleteAuditionBtnText}>🗑 Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* APPLICATIONS TAB */}
        {activeTab === 'applications' && (
          <View style={styles.section}>
            {applications.length === 0 ? (
              <EmptyState
                icon="📋"
                title="No applications yet"
                subtitle="Applications will appear here when actors apply"
              />
            ) : (
              uniqueAuditionIds.map(audId =>
                renderAuditionGroup(audId as string),
              )
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  headerSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },

  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  statCardValue: {...Typography.h2, color: Colors.primary, marginBottom: 4},
  statCardLabel: {
    ...Typography.micro,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: 4,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  tabActive: {backgroundColor: Colors.primary},
  tabText: {...Typography.captionBold, color: Colors.textSecondary},
  tabTextActive: {color: Colors.textInverse, fontWeight: 'bold'},

  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },

  myAuditionCard: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  myAuditionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  auditionStatusBadge: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  auditionStatusText: {...Typography.captionBold},
  myAuditionAppsCount: {...Typography.caption, color: Colors.textSecondary},
  myAuditionTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  myAuditionMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  myAuditionMetaText: {...Typography.caption, color: Colors.textSecondary},
  myAuditionActions: {flexDirection: 'row', gap: Spacing.sm},
  toggleBtn: {
    flex: 1,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  toggleBtnText: {...Typography.label, color: Colors.primary},
  deleteAuditionBtn: {
    flex: 1,
    backgroundColor: Colors.errorFaint,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  deleteAuditionBtnText: {...Typography.label, color: Colors.error},

  auditionSection: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  auditionHeader: {
    flexDirection: 'row',
    padding: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  auditionTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  statsRow: {flexDirection: 'row', gap: Spacing.md},
  statItem: {alignItems: 'center'},
  statLabel: {
    ...Typography.micro,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {...Typography.h4, color: Colors.primary},
  expandIcon: {color: Colors.primary, fontSize: 16, fontWeight: 'bold'},
  applicationsContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  noAppsText: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },

  appCard: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  appName: {...Typography.label, color: Colors.textPrimary, marginBottom: 2},
  appEmail: {...Typography.caption, color: Colors.textSecondary},
  statusBadge: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  statusText: {...Typography.micro, fontWeight: '600'},
  appliedDate: {
    ...Typography.micro,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  noteBox: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  noteLabel: {
    ...Typography.captionBold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  noteText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: Colors.success,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  acceptBtnText: {...Typography.captionBold, color: Colors.textInverse},
  rejectBtn: {
    flex: 1,
    backgroundColor: Colors.error,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  rejectBtnText: {...Typography.captionBold, color: '#FFFFFF'},
  chatBtn: {
    flex: 1,
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  chatBtnText: {...Typography.captionBold, color: Colors.primary},
  btnDisabled: {opacity: 0.5},
});
