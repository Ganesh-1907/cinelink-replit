import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
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
  Avatar,
  Button,
  Card,
  EmptyState,
  Badge,
} from '../components/ui';

export default function JoinRequestsScreen({route, navigation}: any) {
  const insets = useSafeAreaInsets();
  const {project} = route.params;
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = auth().currentUser;

  useEffect(() => {
    const unsub = firestore()
      .collection('projects')
      .doc(project.id)
      .collection('requests')
      .orderBy('requestedAt', 'desc')
      .onSnapshot(
        snapshot => {
          const data = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
          setRequests(data);
          setLoading(false);
        },
        err => {
          console.log('REQUESTS ERROR:', err);
          setLoading(false);
        },
      );
    return () => unsub();
  }, []);

  const handleAccept = async (request: any) => {
    Alert.alert(
      '✅ Accept Request',
      `Accept ${request.userName} as ${request.role}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await firestore()
                .collection('projects')
                .doc(project.id)
                .collection('requests')
                .doc(request.id)
                .update({status: 'Accepted'});

              await firestore()
                .collection('projects')
                .doc(project.id)
                .collection('members')
                .doc(request.userId)
                .set({
                  userId: request.userId,
                  name: request.userName,
                  email: request.userEmail,
                  role: request.role,
                  joinedAt: firestore.FieldValue.serverTimestamp(),
                });

              const updatedRoles = project.rolesNeeded.map((r: any) =>
                r.role === request.role && !r.filled
                  ? {
                      ...r,
                      filled: true,
                      memberId: request.userId,
                      memberName: request.userName,
                    }
                  : r,
              );
              await firestore()
                .collection('projects')
                .doc(project.id)
                .update({
                  rolesNeeded: updatedRoles,
                  membersCount: firestore.FieldValue.increment(1),
                });

              const chatId = `project_${project.id}`;
              const chatRef = firestore().collection('chats').doc(chatId);
              const chatDoc = await chatRef.get();
              if (chatDoc.exists) {
                await chatRef.update({
                  participants: firestore.FieldValue.arrayUnion(request.userId),
                  participantNames: firestore.FieldValue.arrayUnion(
                    request.userName,
                  ),
                });
              } else {
                await chatRef.set({
                  id: chatId,
                  isGroupChat: true,
                  groupName: project.title,
                  projectId: project.id,
                  participants: [currentUser?.uid, request.userId],
                  participantNames: [project.directorName, request.userName],
                  lastMessage: '',
                  createdAt: firestore.FieldValue.serverTimestamp(),
                });
              }

              await firestore()
                .collection('notifications')
                .add({
                  userId: request.userId,
                  type: 'request_accepted',
                  title: '🎉 Request Accepted!',
                  message: `You have been accepted as ${request.role} in "${project.title}"!`,
                  projectId: project.id,
                  read: false,
                  createdAt: firestore.FieldValue.serverTimestamp(),
                });

              Alert.alert(
                '✅ Accepted!',
                `${request.userName} has been added to the project as ${request.role}.`,
              );
            } catch (e: any) {
              console.log(e);
              Alert.alert('Error', e.message || 'Could not accept request.');
            }
          },
        },
      ],
    );
  };

  const handleReject = async (request: any) => {
    Alert.alert(
      '❌ Reject Request',
      `Reject ${request.userName}'s request for ${request.role}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore()
                .collection('projects')
                .doc(project.id)
                .collection('requests')
                .doc(request.id)
                .update({status: 'Rejected'});

              await firestore()
                .collection('notifications')
                .add({
                  userId: request.userId,
                  type: 'request_rejected',
                  title: '❌ Request Update',
                  message: `Your request for ${request.role} in "${project.title}" was not accepted this time.`,
                  projectId: project.id,
                  read: false,
                  createdAt: firestore.FieldValue.serverTimestamp(),
                });

              Alert.alert('Done', 'Request has been rejected.');
            } catch (e: any) {
              console.log(e);
              Alert.alert('Error', e.message || 'Could not reject request.');
            }
          },
        },
      ],
    );
  };

  const viewProfile = (userId: string) => {
    navigation.navigate('PublicProfile', {userId});
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

  const renderRequest = ({item}: any) => {
    const isPending = item.status === 'Pending';

    return (
      <Card variant="default" padding={Spacing.lg} style={styles.card}>
        <View style={styles.cardHeader}>
          <Avatar name={item.userName} size="md" />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.userName}</Text>
            <Text style={styles.userRole}>
              Applying for:{' '}
              <Text style={styles.roleHighlight}>{item.role}</Text>
            </Text>
          </View>
          <Badge
            label={item.status}
            variant={getStatusVariant(item.status) as any}
          />
        </View>

        {item.note ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>Note from applicant:</Text>
            <Text style={styles.noteText}>{item.note}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            label="👤 View Profile"
            onPress={() => viewProfile(item.userId)}
            variant="secondary"
            size="sm"
            fullWidth
          />

          {isPending && (
            <>
              <Button
                label="✕ Reject"
                onPress={() => handleReject(item)}
                variant="danger"
                size="sm"
                fullWidth
              />
              <Button
                label="✓ Accept"
                onPress={() => handleAccept(item)}
                variant="success"
                size="sm"
                fullWidth
              />
            </>
          )}
        </View>
      </Card>
    );
  };

  const pendingCount = requests.filter(r => r.status === 'Pending').length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <Header
        title="Join Requests"
        navigation={navigation}
        subtitle={project.title}
        right={
          pendingCount > 0 ? (
            <Badge count={pendingCount} variant="primary" />
          ) : null
        }
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={item => item.id}
          renderItem={renderRequest}
          contentContainerStyle={{
            padding: Spacing.screenH,
            paddingBottom: insets.bottom + 80,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="📋"
              title="No requests yet"
              subtitle="When crew members apply to join your project, they'll appear here."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  card: {marginBottom: Spacing.md},
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  userInfo: {flex: 1},
  userName: {...Typography.body, fontWeight: '700'},
  userRole: {...Typography.caption, color: Colors.textSecondary},
  roleHighlight: {color: Colors.primary, fontWeight: '600'},
  noteBox: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  noteLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
  },
  noteText: {...Typography.bodySm, color: Colors.textPrimary, lineHeight: 20},
  actions: {flexDirection: 'row', gap: Spacing.sm},
});
