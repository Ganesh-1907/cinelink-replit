import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  Image,
  Linking,
  SafeAreaView,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {
  Header,
  Button,
  Input,
  Avatar,
  EmptyState,
  LoadingView,
  Chip,
  Badge,
} from '../components/ui';

const STATUS_CONFIG: any = {
  pending: {label: '⏳ Pending', color: Colors.warning},
  reviewed: {label: '👁️ Reviewed', color: Colors.info},
  action_taken: {label: '✅ Action Taken', color: Colors.success},
  dismissed: {label: '❌ Dismissed', color: Colors.textTertiary},
};

export default function AdminReportsScreen({navigation}: any) {
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'approvals'>(
    'approvals',
  );
  const [searchText, setSearchText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const currentUser = auth().currentUser;
  const isAdmin = currentUser?.email === 'anilkumardevarakonda03@gmail.com';

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'Only admins can view this screen.');
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Main');
      }
      return;
    }
    if (activeTab === 'reports') {
      loadReports();
    } else if (activeTab === 'users') {
      loadUsers();
    } else {
      loadApprovals();
    }
  }, [filter, activeTab]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const snapshot = await firestore()
        .collection('reports')
        .where('status', '==', filter)
        .orderBy('createdAt', 'desc')
        .get();
      setReports(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const snapshot = await firestore().collection('users').get();
      setUsers(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const snapshot = await firestore()
        .collection('castingRequests')
        .orderBy('createdAt', 'desc')
        .get();
      setApprovals(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'reports') {
      await loadReports();
    } else if (activeTab === 'users') {
      await loadUsers();
    } else {
      await loadApprovals();
    }
    setRefreshing(false);
  }, [filter, activeTab]);

  const approveRequest = async (request: any) => {
    Alert.alert(
      '✅ Approve Casting Director',
      `Approve "${request.userName}" from "${
        request.companyName || 'N/A'
      }" to post auditions on CineLink?\n\nMake sure you have verified their ID proof and called them on ${
        request.phone || 'N/A'
      }.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Approve ✅',
          onPress: async () => {
            try {
              await firestore()
                .collection('users')
                .doc(request.userId)
                .update({
                  isApprovedDirector: true,
                  castingDirectorVerified: true,
                  approvedAt: firestore.FieldValue.serverTimestamp(),
                  approvedBy: currentUser?.email,
                  companyName: request.companyName || '',
                });
              await firestore()
                .collection('castingRequests')
                .doc(request.id)
                .update({
                  status: 'approved',
                  reviewedAt: firestore.FieldValue.serverTimestamp(),
                });
              await firestore().collection('notifications').add({
                userId: request.userId,
                type: 'casting_approved',
                title: '🎉 You are an Approved Casting Director!',
                message:
                  'Admin approved your request! You can now post auditions on CineLink.',
                read: false,
                createdAt: firestore.FieldValue.serverTimestamp(),
              });
              Alert.alert(
                '✅ Approved!',
                `${request.userName} can now post auditions.`,
              );
              loadApprovals();
            } catch (e) {
              Alert.alert('Error', 'Could not approve. Try again.');
            }
          },
        },
      ],
    );
  };

  const rejectRequest = async (request: any) => {
    Alert.alert(
      '❌ Reject Request',
      `Reject "${request.userName}"'s casting director application?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore()
                .collection('castingRequests')
                .doc(request.id)
                .update({
                  status: 'rejected',
                  reviewedAt: firestore.FieldValue.serverTimestamp(),
                });
              await firestore().collection('notifications').add({
                userId: request.userId,
                type: 'casting_rejected',
                title: '❌ Application Rejected',
                message:
                  'Your casting director application was not approved. Please update your profile and ID proof and try again.',
                read: false,
                createdAt: firestore.FieldValue.serverTimestamp(),
              });
              Alert.alert(
                'Done',
                `${request.userName}'s application rejected.`,
              );
              loadApprovals();
            } catch (e) {
              Alert.alert('Error', 'Could not reject. Try again.');
            }
          },
        },
      ],
    );
  };

  const revokeDirector = async (user: any) => {
    Alert.alert(
      '🚫 Revoke Director Access',
      `Remove casting director access from "${
        user.displayName || user.name
      }"? They will no longer be able to post auditions.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore().collection('users').doc(user.id).update({
                isApprovedDirector: false,
                castingDirectorVerified: false,
              });
              await firestore().collection('notifications').add({
                userId: user.id,
                type: 'casting_rejected',
                title: '⚠️ Director Access Revoked',
                message:
                  'Your casting director access has been revoked by admin.',
                read: false,
                createdAt: firestore.FieldValue.serverTimestamp(),
              });
              Alert.alert('Done', 'Director access revoked.');
              loadUsers();
            } catch (e) {
              console.log(e);
            }
          },
        },
      ],
    );
  };

  const banUser = (user: any) => {
    const userName =
      user.displayName || user.name || user.email?.split('@')[0] || 'User';
    Alert.alert(
      user.isBanned ? '✅ Unban User' : '🚫 Ban User',
      `${user.isBanned ? 'Remove ban for' : 'Ban'} "${userName}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: user.isBanned ? 'Unban' : 'Ban',
          style: 'destructive',
          onPress: async () => {
            try {
              if (user.isBanned) {
                await firestore()
                  .collection('users')
                  .doc(user.id)
                  .update({isBanned: false});
                await firestore()
                  .collection('bannedUsers')
                  .doc(user.id)
                  .delete();
              } else {
                await firestore().collection('users').doc(user.id).update({
                  isBanned: true,
                  bannedAt: firestore.FieldValue.serverTimestamp(),
                });
                await firestore().collection('bannedUsers').doc(user.id).set({
                  userId: user.id,
                  userEmail: user.email,
                  userName,
                  bannedAt: firestore.FieldValue.serverTimestamp(),
                });
              }
              loadUsers();
            } catch (e) {
              console.log(e);
            }
          },
        },
      ],
    );
  };

  const deleteUserData = (user: any) => {
    const userName =
      user.displayName || user.name || user.email?.split('@')[0] || 'User';
    Alert.alert(
      '🗑️ Delete User',
      `Permanently delete all data for "${userName}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              const batch = firestore().batch();
              batch.delete(firestore().collection('users').doc(user.id));
              const auditions = await firestore()
                .collection('auditions')
                .where('directorId', '==', user.id)
                .get();
              auditions.docs.forEach(doc => batch.delete(doc.ref));
              const applications = await firestore()
                .collection('applications')
                .where('applicantId', '==', user.id)
                .get();
              applications.docs.forEach(doc => batch.delete(doc.ref));
              await batch.commit();
              Alert.alert('✅ Deleted');
              loadUsers();
            } catch (e) {
              Alert.alert('Error', 'Could not delete.');
            }
          },
        },
      ],
    );
  };

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      await firestore().collection('reports').doc(reportId).update({
        status: newStatus,
        reviewedAt: firestore.FieldValue.serverTimestamp(),
        reviewedBy: currentUser?.email,
      });
      loadReports();
    } catch (e) {
      console.log(e);
    }
  };

  const deleteContent = async (report: any) => {
    Alert.alert('⚠️ Delete Content', `Delete this ${report.contentType}?`, [
      {text: 'Cancel'},
      {
        text: 'Delete & Resolve',
        style: 'destructive',
        onPress: async () => {
          try {
            const col =
              report.contentType === 'audition'
                ? 'auditions'
                : report.contentType === 'film'
                ? 'films'
                : 'contests';
            await firestore().collection(col).doc(report.contentId).delete();
            await updateReportStatus(report.id, 'action_taken');
          } catch (e) {
            Alert.alert('Error');
          }
        },
      },
    ]);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.seconds) {
      return 'N/A';
    }
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredUsers = users.filter(u => {
    if (u.email === 'anilkumardevarakonda03@gmail.com') {
      return false;
    }
    const text = searchText.toLowerCase();
    if (!text) {
      return true;
    }
    const name = (u.displayName || u.fullName || u.name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    return name.includes(text) || email.includes(text);
  });

  const bannedUsers = filteredUsers.filter(u => u.isBanned);
  const directorUsers = filteredUsers.filter(
    u => !u.isBanned && u.isApprovedDirector,
  );
  const activeUsers = filteredUsers.filter(
    u => !u.isBanned && !u.isApprovedDirector,
  );
  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const reviewedApprovals = approvals.filter(a => a.status !== 'pending');

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="🛡️ Admin Dashboard"
        navigation={navigation}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
            progressBackgroundColor={Colors.surface}
          />
        }>
        <Text style={styles.pageSubtitle}>Manage your CineLink platform</Text>

        {/* MAIN TABS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.mainTabScroll}>
          <View style={styles.mainTabRow}>
            {[
              {
                key: 'approvals',
                label: `📋 Applications${
                  pendingApprovals.length > 0
                    ? ` (${pendingApprovals.length})`
                    : ''
                }`,
              },
              {key: 'reports', label: '🚩 Reports'},
              {key: 'users', label: '👥 Users'},
            ].map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.mainTab,
                  activeTab === tab.key && styles.mainTabActive,
                ]}
                onPress={() => setActiveTab(tab.key as any)}>
                <Text
                  style={[
                    styles.mainTabText,
                    activeTab === tab.key && styles.mainTabTextActive,
                  ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* ══════════ APPROVALS TAB ══════════ */}
        {activeTab === 'approvals' && (
          <View>
            {loading ? (
              <LoadingView message="Loading applications..." />
            ) : approvals.length === 0 ? (
              <EmptyState
                icon="📋"
                title="No casting applications yet"
                subtitle="When directors apply to post auditions, they'll appear here with their ID proof."
              />
            ) : (
              <>
                {pendingApprovals.length > 0 && (
                  <>
                    <Text style={styles.userSectionTitle}>
                      ⏳ Pending Applications ({pendingApprovals.length})
                    </Text>
                    {pendingApprovals.map(req => (
                      <View
                        key={req.id}
                        style={[
                          styles.approvalCard,
                          styles.approvalCardPending,
                        ]}>
                        <TouchableOpacity
                          style={styles.approvalHeader}
                          onPress={() =>
                            setExpandedId(expandedId === req.id ? null : req.id)
                          }>
                          <Avatar name={req.userName || 'U'} size="md" ring />
                          <View style={styles.approvalInfo}>
                            <Text style={styles.approvalName}>
                              {req.userName}
                            </Text>
                            <Text style={styles.approvalEmail}>
                              {req.userEmail}
                            </Text>
                            <Text style={styles.approvalCompany}>
                              🏢 {req.companyName || 'N/A'}
                            </Text>
                            <Text style={styles.approvalRole}>
                              🎭 {req.role} · {req.yearsExperience || '?'} yrs
                              exp
                            </Text>
                            <Text style={styles.approvalPhone}>
                              📱 {req.phone || 'No phone'}
                            </Text>
                            <Text style={styles.approvalDate}>
                              {formatDate(req.createdAt)}
                            </Text>
                          </View>
                          <Text style={styles.expandIcon}>
                            {expandedId === req.id ? '▲' : '▼'}
                          </Text>
                        </TouchableOpacity>

                        {expandedId === req.id && (
                          <View style={styles.expandedSection}>
                            {req.message ? (
                              <View style={styles.approvalMessage}>
                                <Text style={styles.approvalMessageLabel}>
                                  Why they want to post:
                                </Text>
                                <Text style={styles.approvalMessageText}>
                                  {req.message}
                                </Text>
                              </View>
                            ) : null}

                            {req.experience ? (
                              <View style={styles.approvalMessage}>
                                <Text style={styles.approvalMessageLabel}>
                                  Experience:
                                </Text>
                                <Text style={styles.approvalMessageText}>
                                  {req.experience}
                                </Text>
                              </View>
                            ) : null}

                            {req.portfolio ? (
                              <TouchableOpacity
                                onPress={() => Linking.openURL(req.portfolio)}>
                                <Text style={styles.approvalPortfolio}>
                                  🔗 Portfolio: {req.portfolio}
                                </Text>
                              </TouchableOpacity>
                            ) : null}

                            <Text style={styles.approvalMessageLabel}>
                              🪪 ID Proof ({req.idType || 'Unknown'}):
                            </Text>
                            {req.idProofUrl ? (
                              <TouchableOpacity
                                onPress={() => Linking.openURL(req.idProofUrl)}>
                                <Image
                                  source={{uri: req.idProofUrl}}
                                  style={styles.idProofImage}
                                  resizeMode="cover"
                                />
                                <Text style={styles.viewFullImage}>
                                  Tap to view full image →
                                </Text>
                              </TouchableOpacity>
                            ) : (
                              <Text style={styles.noIdText}>
                                ❌ No ID proof uploaded
                              </Text>
                            )}

                            {req.companyDocUrl ? (
                              <>
                                <Text
                                  style={[
                                    styles.approvalMessageLabel,
                                    {marginTop: Spacing.md},
                                  ]}>
                                  🏢 Company Document:
                                </Text>
                                <TouchableOpacity
                                  onPress={() =>
                                    Linking.openURL(req.companyDocUrl)
                                  }>
                                  <Image
                                    source={{uri: req.companyDocUrl}}
                                    style={styles.idProofImage}
                                    resizeMode="cover"
                                  />
                                  <Text style={styles.viewFullImage}>
                                    Tap to view full image →
                                  </Text>
                                </TouchableOpacity>
                              </>
                            ) : null}

                            <View
                              style={[
                                styles.approvalMessage,
                                {
                                  marginTop: Spacing.md,
                                  borderLeftWidth: 3,
                                  borderLeftColor: req.phoneVerified
                                    ? Colors.success
                                    : Colors.warning,
                                },
                              ]}>
                              <Text style={styles.approvalMessageLabel}>
                                Phone Verification:
                              </Text>
                              <Text
                                style={[
                                  styles.approvalMessageText,
                                  {
                                    color: req.phoneVerified
                                      ? Colors.success
                                      : Colors.warning,
                                  },
                                ]}>
                                {req.phoneVerified
                                  ? `✅ ${req.phone} — Call to verify before approving`
                                  : '⚠️ Phone not registered'}
                              </Text>
                            </View>

                            <TouchableOpacity
                              style={styles.viewProfileBtn}
                              onPress={() =>
                                navigation.navigate('PublicProfile', {
                                  userId: req.userId,
                                })
                              }>
                              <Text style={styles.viewProfileBtnText}>
                                👤 View Full Profile
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        <View style={styles.approvalActions}>
                          <TouchableOpacity
                            style={styles.approveBtn}
                            onPress={() => approveRequest(req)}>
                            <Text style={styles.approveBtnText}>
                              ✅ Approve
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.rejectBtn}
                            onPress={() => rejectRequest(req)}>
                            <Text style={styles.rejectBtnText}>❌ Reject</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {reviewedApprovals.length > 0 && (
                  <>
                    <Text style={styles.userSectionTitle}>
                      📁 Reviewed ({reviewedApprovals.length})
                    </Text>
                    {reviewedApprovals.map(req => (
                      <TouchableOpacity
                        key={req.id}
                        style={[
                          styles.approvalCard,
                          req.status === 'approved'
                            ? styles.approvalCardApproved
                            : styles.approvalCardRejected,
                        ]}
                        onPress={() =>
                          navigation.navigate('PublicProfile', {
                            userId: req.userId,
                          })
                        }
                        activeOpacity={0.8}>
                        <View style={styles.approvalHeader}>
                          <Avatar name={req.userName || 'U'} size="md" />
                          <View style={styles.approvalInfo}>
                            <Text style={styles.approvalName}>
                              {req.userName}
                            </Text>
                            <Text style={styles.approvalEmail}>
                              {req.userEmail}
                            </Text>
                            <Text style={styles.approvalCompany}>
                              🏢 {req.companyName || 'N/A'}
                            </Text>
                            <View
                              style={[
                                styles.statusPill,
                                req.status === 'approved'
                                  ? styles.statusApproved
                                  : styles.statusRejected,
                              ]}>
                              <Text style={styles.statusPillText}>
                                {req.status === 'approved'
                                  ? '✅ Approved'
                                  : '❌ Rejected'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* ══════════ REPORTS TAB ══════════ */}
        {activeTab === 'reports' && (
          <View>
            <View style={styles.filterRow}>
              {Object.entries(STATUS_CONFIG).map(([status, config]: any) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterBtn,
                    filter === status && styles.filterBtnActive,
                  ]}
                  onPress={() => setFilter(status)}>
                  <Text
                    style={[
                      styles.filterText,
                      filter === status && styles.filterTextActive,
                    ]}>
                    {config.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {loading ? (
              <LoadingView message="Loading reports..." />
            ) : reports.length === 0 ? (
              <EmptyState icon="✅" title={`No ${filter} reports`} />
            ) : (
              reports.map((report: any) => (
                <View key={report.id} style={styles.reportCard}>
                  <View style={styles.badgeRow}>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>
                        {report.contentType?.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.dateText}>
                      {formatDate(report.createdAt)}
                    </Text>
                  </View>
                  <Text style={styles.reportTitle}>{report.contentTitle}</Text>
                  <Text style={styles.reporterText}>
                    Reported by: {report.reportedByEmail}
                  </Text>
                  {filter === 'pending' && (
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => deleteContent(report)}>
                        <Text style={styles.deleteBtnText}>
                          🗑️ Delete Content
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.dismissBtn}
                        onPress={() =>
                          updateReportStatus(report.id, 'dismissed')
                        }>
                        <Text style={styles.dismissBtnText}>Dismiss</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* ══════════ USERS TAB ══════════ */}
        {activeTab === 'users' && (
          <View>
            <Input
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search by name or email..."
            />
            {loading ? (
              <LoadingView message="Loading users..." />
            ) : (
              <>
                {directorUsers.length > 0 && (
                  <>
                    <Text style={styles.userSectionTitle}>
                      🎬 Verified Casting Directors ({directorUsers.length})
                    </Text>
                    {directorUsers.map(user => (
                      <View
                        key={user.id}
                        style={[styles.userCard, styles.userCardDirector]}>
                        <Avatar
                          name={
                            user.displayName || user.name || user.email || 'U'
                          }
                          size="md"
                          ring
                        />
                        <View style={styles.userInfo}>
                          <Text style={styles.userName}>
                            {user.displayName ||
                              user.fullName ||
                              user.name ||
                              user.email?.split('@')[0]}
                          </Text>
                          <Text style={styles.userEmail}>{user.email}</Text>
                          <Text style={styles.approvedBadge}>
                            ✅ Verified Casting Director
                          </Text>
                          {user.companyName ? (
                            <Text style={styles.userRole}>
                              🏢 {user.companyName}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.userActions}>
                          <TouchableOpacity
                            style={styles.revokeBtn}
                            onPress={() => revokeDirector(user)}>
                            <Text style={styles.revokeBtnText}>Revoke</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {bannedUsers.length > 0 && (
                  <>
                    <Text style={styles.userSectionTitle}>
                      🚫 Banned Users ({bannedUsers.length})
                    </Text>
                    {bannedUsers.map(user => (
                      <View
                        key={user.id}
                        style={[styles.userCard, styles.userCardBanned]}>
                        <Avatar
                          name={
                            user.displayName || user.name || user.email || 'U'
                          }
                          size="md"
                        />
                        <View style={styles.userInfo}>
                          <Text style={styles.userName}>
                            {user.displayName ||
                              user.fullName ||
                              user.name ||
                              user.email?.split('@')[0]}
                          </Text>
                          <Text style={styles.userEmail}>{user.email}</Text>
                        </View>
                        <View style={styles.userActions}>
                          <TouchableOpacity
                            style={styles.unbanBtn}
                            onPress={() => banUser(user)}>
                            <Text style={styles.unbanBtnText}>Unban</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                <Text style={styles.userSectionTitle}>
                  ✅ Active Users ({activeUsers.length})
                </Text>
                {activeUsers.map(user => (
                  <View key={user.id} style={styles.userCard}>
                    <Avatar
                      name={user.displayName || user.name || user.email || 'U'}
                      size="md"
                    />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {user.displayName ||
                          user.fullName ||
                          user.name ||
                          user.email?.split('@')[0]}
                      </Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                      <Text style={styles.userRole}>
                        🎭 {user.role || 'User'}
                      </Text>
                      {user.verificationStatus === 'verified' && (
                        <Text style={styles.verifiedBadge2}>🏅 Verified</Text>
                      )}
                    </View>
                    <View style={styles.userActions}>
                      <TouchableOpacity
                        style={styles.banBtn}
                        onPress={() => banUser(user)}>
                        <Text style={styles.banBtnText}>🚫 Ban</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteUserBtn}
                        onPress={() => deleteUserData(user)}>
                        <Text style={styles.deleteUserBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        <View style={{height: 60}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: Colors.background},
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  pageSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    marginTop: Spacing.xs,
  },

  mainTabScroll: {marginBottom: Spacing.lg},
  mainTabRow: {flexDirection: 'row', gap: Spacing.sm},
  mainTab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  mainTabActive: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  mainTabText: {...Typography.label, color: Colors.textSecondary},
  mainTabTextActive: {color: Colors.textInverse, fontWeight: 'bold'},

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filterBtn: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {...Typography.captionBold, color: Colors.textSecondary},
  filterTextActive: {color: Colors.textInverse},

  userSectionTitle: {
    ...Typography.labelSm,
    color: Colors.primary,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },

  userCard: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  userCardBanned: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorFaint,
  },
  userCardDirector: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaint,
  },
  userInfo: {flex: 1},
  userName: {...Typography.label, color: Colors.textPrimary, marginBottom: 2},
  userEmail: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  userRole: {...Typography.micro, color: Colors.textSecondary},
  approvedBadge: {...Typography.micro, color: Colors.success, marginTop: 2},
  verifiedBadge2: {...Typography.micro, color: Colors.warning, marginTop: 2},
  userActions: {alignItems: 'flex-end', gap: Spacing.xs},
  banBtn: {
    backgroundColor: Colors.errorFaint,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  banBtnText: {...Typography.captionBold, color: Colors.error},
  unbanBtn: {
    backgroundColor: Colors.successFaint,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  unbanBtnText: {...Typography.captionBold, color: Colors.success},
  revokeBtn: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  revokeBtnText: {...Typography.captionBold, color: Colors.primary},
  deleteUserBtn: {
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  deleteUserBtnText: {fontSize: 16},

  approvalCard: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  approvalCardPending: {borderColor: Colors.warning},
  approvalCardApproved: {borderColor: Colors.success},
  approvalCardRejected: {borderColor: Colors.textTertiary},
  approvalHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
  approvalInfo: {flex: 1},
  approvalName: {...Typography.h4, color: Colors.textPrimary, marginBottom: 2},
  approvalEmail: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  approvalCompany: {
    ...Typography.caption,
    color: Colors.primary,
    marginBottom: 2,
  },
  approvalRole: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  approvalPhone: {
    ...Typography.caption,
    color: Colors.success,
    marginBottom: 2,
  },
  approvalDate: {...Typography.micro, color: Colors.textSecondary},
  expandIcon: {color: Colors.primary, fontSize: 16},

  expandedSection: {marginBottom: Spacing.md},
  approvalMessage: {
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  approvalMessageLabel: {
    ...Typography.labelSm,
    color: Colors.primary,
    marginBottom: 4,
  },
  approvalMessageText: {...Typography.bodySm, color: Colors.textSecondary},
  approvalPortfolio: {
    ...Typography.caption,
    color: Colors.info,
    marginBottom: Spacing.sm,
  },

  idProofImage: {
    width: '100%',
    height: 180,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  viewFullImage: {
    ...Typography.micro,
    color: Colors.info,
    textAlign: 'right',
    marginBottom: Spacing.sm,
  },
  noIdText: {
    ...Typography.bodySm,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },

  viewProfileBtn: {
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  viewProfileBtnText: {...Typography.label, color: Colors.primary},
  approvalActions: {flexDirection: 'row', gap: Spacing.sm},
  approveBtn: {
    flex: 1,
    backgroundColor: Colors.successFaint,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.success,
  },
  approveBtnText: {...Typography.btn, color: Colors.success},
  rejectBtn: {
    flex: 1,
    backgroundColor: Colors.errorFaint,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  rejectBtnText: {...Typography.btn, color: Colors.error},
  statusPill: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusApproved: {backgroundColor: Colors.successFaint},
  statusRejected: {backgroundColor: Colors.errorFaint},
  statusPillText: {...Typography.captionBold, color: Colors.textPrimary},

  reportCard: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  typeBadge: {
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  typeBadgeText: {
    ...Typography.micro,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  dateText: {...Typography.micro, color: Colors.textSecondary},
  reportTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  reporterText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  actionsRow: {flexDirection: 'row', gap: Spacing.sm},
  deleteBtn: {
    flex: 1,
    backgroundColor: Colors.errorFaint,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  deleteBtnText: {...Typography.btn, color: Colors.error},
  dismissBtn: {
    flex: 1,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dismissBtnText: {...Typography.btn, color: Colors.textSecondary},
});
