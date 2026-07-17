import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {
  Header,
  Card,
  Button,
  Avatar,
  Input,
  Chip,
  EmptyState,
} from '../components/ui';

export default function ProjectDetailScreen({route, navigation}: any) {
  const insets = useSafeAreaInsets();
  const {project} = route.params;
  const [requests, setRequests] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [myRequest, setMyRequest] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);

  const currentUser = auth().currentUser;
  const isDirector = project.directorId === currentUser?.uid;
  const currentUserName =
    currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
  const openRoles = project.rolesNeeded?.filter((r: any) => !r.filled) || [];

  useEffect(() => {
    loadMembers();
    loadMyRequest();
  }, []);

  const loadMembers = async () => {
    try {
      const snapshot = await firestore()
        .collection('projects')
        .doc(project.id)
        .collection('members')
        .get();
      setMembers(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
    } catch (e) {
      console.log(e);
    }
  };

  const loadMyRequest = async () => {
    if (!currentUser) {
      return;
    }
    try {
      const snapshot = await firestore()
        .collection('projects')
        .doc(project.id)
        .collection('requests')
        .where('userId', '==', currentUser.uid)
        .get();
      if (!snapshot.empty) {
        setMyRequest({id: snapshot.docs[0].id, ...snapshot.docs[0].data()});
      }
    } catch (e) {
      console.log(e);
    }
  };

  const submitRequest = async () => {
    if (!selectedRole) {
      Alert.alert(
        'Select Role',
        'Please select which role you are applying for.',
      );
      return;
    }
    setLoading(true);
    try {
      await firestore()
        .collection('projects')
        .doc(project.id)
        .collection('requests')
        .add({
          userId: currentUser?.uid,
          userName: currentUserName,
          userEmail: currentUser?.email,
          role: selectedRole,
          note: note.trim(),
          status: 'Pending',
          requestedAt: firestore.FieldValue.serverTimestamp(),
        });

      await firestore()
        .collection('notifications')
        .add({
          userId: project.directorId,
          type: 'join_request',
          title: '🎬 New Join Request!',
          message: `${currentUserName} wants to join "${project.title}" as ${selectedRole}`,
          projectId: project.id,
          senderId: currentUser?.uid,
          read: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      Alert.alert(
        '✅ Request Sent!',
        'Your request has been sent to the director. You will be notified when they respond.',
      );
      setShowApplyForm(false);
      setSelectedRole('');
      setNote('');
      loadMyRequest();
    } catch (e: any) {
      console.log(e);
      Alert.alert('Error', e.message || 'Could not send request. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const openGroupChat = async () => {
    try {
      const chatId = `project_${project.id}`;
      const chatRef = firestore().collection('chats').doc(chatId);
      const chatDoc = await chatRef.get();

      if (!chatDoc.exists) {
        await chatRef.set({
          id: chatId,
          isGroupChat: true,
          groupName: project.title,
          projectId: project.id,
          participants: [project.directorId, currentUser?.uid],
          participantNames: [project.directorName, currentUserName],
          lastMessage: '',
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      const updatedDoc = await chatRef.get();
      navigation.navigate('ChatScreen', {
        chat: {id: chatId, ...updatedDoc.data()},
      });
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Could not open group chat.');
    }
  };

  const getStatusVariant = (status: string) => {
    if (status === 'Accepted') {
      return 'success';
    }
    if (status === 'Rejected') {
      return 'error';
    }
    return 'warning';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <Header title={project.title} navigation={navigation} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: insets.bottom + Spacing['4xl']}}>
        <View style={styles.section}>
          {/* PROJECT INFO CARD */}
          <Card variant="elevated" padding={Spacing.lg} style={styles.infoCard}>
            <View style={styles.badgeRow}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{project.type}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>🟢 {project.status}</Text>
              </View>
            </View>

            <Text style={styles.projectTitle}>{project.title}</Text>

            <View style={styles.metaGrid}>
              <Text style={styles.metaItem}>🎬 {project.directorName}</Text>
              <Text style={styles.metaItem}>📍 {project.location}</Text>
              <Text style={styles.metaItem}>🗣️ {project.language}</Text>
              <Text style={styles.metaItem}>
                👥 {project.membersCount || 1} members
              </Text>
            </View>

            {project.description ? (
              <Text style={styles.description}>{project.description}</Text>
            ) : null}
          </Card>

          {/* ROLES NEEDED */}
          <Card variant="default" padding={Spacing.lg}>
            <Text style={styles.sectionTitle}>🎭 Roles Needed</Text>
            {project.rolesNeeded?.map((role: any, index: number) => (
              <View key={index} style={styles.roleRow}>
                <View
                  style={[
                    styles.roleStatus,
                    role.filled && styles.roleStatusFilled,
                  ]}
                />
                <Text style={styles.roleName}>{role.role}</Text>
                <View
                  style={[
                    styles.roleBadge,
                    role.filled && styles.roleBadgeFilled,
                  ]}>
                  <Text
                    style={[
                      styles.roleBadgeText,
                      role.filled && styles.roleBadgeTextFilled,
                    ]}>
                    {role.filled ? `✓ ${role.memberName || 'Filled'}` : 'OPEN'}
                  </Text>
                </View>
              </View>
            ))}
          </Card>

          {/* TEAM MEMBERS */}
          {members.length > 0 && (
            <Card variant="default" padding={Spacing.lg}>
              <Text style={styles.sectionTitle}>👥 Team Members</Text>
              <View style={styles.memberRow}>
                <Avatar name={project.directorName} size="sm" />
                <View>
                  <Text style={styles.memberName}>{project.directorName}</Text>
                  <Text style={styles.memberRole}>👑 Director</Text>
                </View>
              </View>
              {members.map((member: any) => (
                <View key={member.id} style={styles.memberRow}>
                  <Avatar name={member.name} size="sm" />
                  <View>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberRole}>🎭 {member.role}</Text>
                  </View>
                </View>
              ))}
            </Card>
          )}

          {/* MY REQUEST STATUS */}
          {myRequest && !isDirector && (
            <Card
              variant="default"
              padding={Spacing.lg}
              style={[
                styles.myRequestCard,
                {
                  borderColor:
                    getStatusVariant(myRequest.status) === 'success'
                      ? Colors.success
                      : getStatusVariant(myRequest.status) === 'error'
                      ? Colors.error
                      : Colors.warning,
                } as import('react-native').ViewStyle,
              ]}>
              <Text style={styles.myRequestTitle}>Your Application</Text>
              <Text style={styles.myRequestRole}>Role: {myRequest.role}</Text>
              <View
                style={[
                  styles.myRequestStatus,
                  {
                    backgroundColor:
                      getStatusVariant(myRequest.status) === 'success'
                        ? Colors.successFaint
                        : getStatusVariant(myRequest.status) === 'error'
                        ? Colors.errorFaint
                        : Colors.warningFaint,
                  },
                ]}>
                <Text
                  style={[
                    styles.myRequestStatusText,
                    {
                      color:
                        getStatusVariant(myRequest.status) === 'success'
                          ? Colors.success
                          : getStatusVariant(myRequest.status) === 'error'
                          ? Colors.error
                          : Colors.warning,
                    },
                  ]}>
                  {myRequest.status === 'Pending'
                    ? '⏳ Pending Review'
                    : myRequest.status === 'Accepted'
                    ? '✅ Accepted!'
                    : '❌ Rejected'}
                </Text>
              </View>
            </Card>
          )}

          {/* ACTION BUTTONS */}
          {isDirector ? (
            <View style={styles.actionSection}>
              <Button
                label="📋 View Join Requests"
                onPress={() => navigation.navigate('JoinRequests', {project})}
                size="lg"
                fullWidth
              />
              <Button
                label="💬 Project Group Chat"
                onPress={openGroupChat}
                variant="outline"
                size="lg"
                fullWidth
              />
            </View>
          ) : myRequest ? (
            myRequest.status === 'Accepted' ? (
              <Button
                label="💬 Join Group Chat"
                onPress={openGroupChat}
                size="lg"
                fullWidth
              />
            ) : null
          ) : openRoles.length > 0 ? (
            <View style={styles.actionSection}>
              {!showApplyForm ? (
                <Button
                  label="🙋 Request to Join"
                  onPress={() => setShowApplyForm(true)}
                  size="lg"
                  fullWidth
                />
              ) : (
                <Card variant="elevated" padding={Spacing.lg}>
                  <Text style={styles.applyFormTitle}>
                    Which role are you applying for?
                  </Text>

                  {openRoles.map((role: any, index: number) => (
                    <Chip
                      key={index}
                      label={role.role}
                      selected={selectedRole === role.role}
                      onPress={() => setSelectedRole(role.role)}
                      variant={
                        selectedRole === role.role
                          ? 'success'
                          : ('neutral' as any)
                      }
                      icon={selectedRole === role.role ? '✓' : undefined}
                      style={styles.roleOption}
                    />
                  ))}

                  <Input
                    value={note}
                    onChangeText={setNote}
                    placeholder="Add a note to the director (optional)..."
                    multiline
                    numberOfLines={3}
                  />

                  <View style={styles.applyFormBtns}>
                    <Button
                      label="Cancel"
                      onPress={() => {
                        setShowApplyForm(false);
                        setSelectedRole('');
                        setNote('');
                      }}
                      variant="secondary"
                      size="md"
                      fullWidth
                    />
                    <Button
                      label="Send Request"
                      onPress={submitRequest}
                      size="md"
                      loading={loading}
                      fullWidth
                    />
                  </View>
                </Card>
              )}
            </View>
          ) : (
            <View style={styles.fullBadge}>
              <Text style={styles.fullBadgeText}>🔒 All roles are filled</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  section: {padding: Spacing.screenH, gap: Spacing.lg},
  infoCard: {gap: Spacing.sm},
  badgeRow: {flexDirection: 'row', gap: Spacing.sm},
  typeBadge: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  typeBadgeText: {...Typography.captionBold, color: Colors.textSecondary},
  statusBadge: {
    backgroundColor: Colors.successFaint,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  statusBadgeText: {...Typography.captionBold, color: Colors.success},
  projectTitle: {...Typography.h2},
  metaGrid: {gap: Spacing.xs, marginTop: Spacing.xs},
  metaItem: {...Typography.body, color: Colors.textSecondary},
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  roleStatus: {
    width: 10,
    height: 10,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  roleStatusFilled: {backgroundColor: Colors.success},
  roleName: {...Typography.body, flex: 1},
  roleBadge: {
    backgroundColor: Colors.warningFaint,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
  },
  roleBadgeFilled: {
    backgroundColor: Colors.successFaint,
    borderColor: Colors.successBorder,
  },
  roleBadgeText: {...Typography.captionBold, color: Colors.warning},
  roleBadgeTextFilled: {color: Colors.success},
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  memberName: {...Typography.body, fontWeight: '600'},
  memberRole: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  myRequestCard: {borderWidth: 1, borderColor: Colors.border},
  myRequestTitle: {...Typography.h4},
  myRequestRole: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  myRequestStatus: {
    borderRadius: Radius.sm,
    padding: Spacing.md,
    alignItems: 'center',
  },
  myRequestStatusText: {...Typography.btn, fontWeight: '700'},
  actionSection: {gap: Spacing.md},
  applyFormTitle: {
    ...Typography.label,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  roleOption: {alignSelf: 'stretch', marginBottom: Spacing.xs},
  applyFormBtns: {flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md},
  fullBadge: {
    backgroundColor: Colors.errorFaint,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  fullBadgeText: {...Typography.btn, color: Colors.error},
});
