import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import PremiumBadge from '../src/components/Premium/PremiumBadge';
import {
  Avatar,
  Badge,
  EmptyState,
  Header,
  SkeletonListItem,
} from '../components/ui';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) {
    return '';
  }
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

export default function ChatListScreen({navigation}: any) {
  const currentUser = auth().currentUser;
  const [chats, setChats] = useState<any[]>([]);
  const [userNames, setUserNames] = useState<any>({});
  const [userPhotos, setUserPhotos] = useState<any>({});
  const [userBadgeData, setUserBadgeData] = useState<
    Record<string, {tier: string; verifiedReal: boolean}>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (chats.length > 0) {
      loadUserData(chats);
    }
  }, [chats]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    const subscriber = firestore()
      .collection('chats')
      .where('participants', 'array-contains', currentUser.uid)
      .onSnapshot(
        snapshot => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as any),
          }));
          const sorted = data.sort((a: any, b: any) => {
            const aTime =
              a.lastMessageTime?.seconds || a.createdAt?.seconds || 0;
            const bTime =
              b.lastMessageTime?.seconds || b.createdAt?.seconds || 0;
            return bTime - aTime;
          });
          setChats([...sorted]);
          setLoading(false);
        },
        err => {
          console.log('❌ CHAT LIST ERROR:', err.message);
          setLoading(false);
        },
      );
    return () => subscriber();
  }, []);

  const loadUserData = async (chatList: any[]) => {
    const newIds = [
      ...new Set(
        chatList
          .map(chat =>
            (chat.participants as string[])?.find(
              id => id !== currentUser?.uid,
            ),
          )
          .filter((id): id is string => !!id),
      ),
    ];

    if (newIds.length === 0) {
      return;
    }

    try {
      const docs = await Promise.all(
        newIds.map(id => firestore().collection('users').doc(id).get()),
      );
      const names: any = {};
      const photos: any = {};
      const badges: Record<string, {tier: string; verifiedReal: boolean}> = {};
      docs.forEach((doc, i) => {
        if (doc.exists) {
          const data = doc.data() as any;
          const resolved = cleanName(
            data?.fullName || data?.displayName || data?.name || data?.email,
          );
          if (resolved) {
            names[newIds[i]] = resolved;
          }
          const photo = data?.photoUrl || data?.photoURL || null;
          if (photo) {
            photos[newIds[i]] = photo;
          }
          badges[newIds[i]] = {
            tier: data?.premiumTier || 'none',
            verifiedReal: data?.verifiedReal === true,
          };
        }
      });
      setUserNames((prev: any) => ({...prev, ...names}));
      setUserPhotos((prev: any) => ({...prev, ...photos}));
      setUserBadgeData(prev => ({...prev, ...badges}));
    } catch (e) {
      console.log('❌ USER DATA LOAD ERROR:', e);
    }
  };

  const openChat = (chat: any) => navigation.navigate('ChatScreen', {chat});

  const showOptions = (chat: any, otherName: string, otherId: string) => {
    Alert.alert('Chat Options', `Options for ${otherName}`, [
      {
        text: 'Delete Chat',
        style: 'destructive',
        onPress: () => deleteChat(chat.id),
      },
      {
        text: 'Block User',
        style: 'destructive',
        onPress: () => blockUser(otherId, otherName),
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const deleteChat = async (chatId: string) => {
    Alert.alert('Delete Chat', 'Are you sure?', [
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const messages = await firestore()
              .collection('chats')
              .doc(chatId)
              .collection('messages')
              .get();
            const batch = firestore().batch();
            messages.docs.forEach(doc => batch.delete(doc.ref));
            batch.delete(firestore().collection('chats').doc(chatId));
            await batch.commit();
          } catch (e) {
            console.log(e);
          }
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const blockUser = async (otherId: string, otherName: string) => {
    Alert.alert('Block User', `Block ${otherName}?`, [
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            const chatId = [currentUser?.uid, otherId].sort().join('_');
            await firestore()
              .collection('users')
              .doc(currentUser?.uid)
              .update({blockedUsers: firestore.FieldValue.arrayUnion(otherId)});
            const messages = await firestore()
              .collection('chats')
              .doc(chatId)
              .collection('messages')
              .get();
            const batch = firestore().batch();
            messages.docs.forEach(doc => batch.delete(doc.ref));
            batch.delete(firestore().collection('chats').doc(chatId));
            await batch.commit();
            Alert.alert('Blocked!', `${otherName} has been blocked.`);
          } catch (e) {
            console.log(e);
          }
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) {
      return '';
    }
    let date: Date;
    if (typeof timestamp?.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp?.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      return 'Now';
    }
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    const daysDiff = (today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff < 7) {
      return date.toLocaleDateString([], {weekday: 'long'});
    }
    return date.toLocaleDateString([], {day: '2-digit', month: 'short'});
  };

  const renderItem = ({item}: any) => {
    const chat = item as any;

    const otherId = (chat.participants as string[])?.find(
      (id: string) => id !== currentUser?.uid,
    );

    const resolvedName =
      (otherId ? userNames[otherId] : null) ||
      cleanName(
        (chat.participantNames as string[])?.find(
          (n: string) => n && n !== currentUser?.email,
        ),
      ) ||
      'Unknown';

    const profilePhoto = otherId ? userPhotos[otherId] : null;
    const lastTime = chat.lastMessageTime || chat.createdAt;
    const lastMsg = chat.lastMessage?.trim()
      ? chat.lastMessage
      : '💬 Say hello!';
    const unreadCount = chat.unreadCount?.[currentUser?.uid || ''] || 0;

    return (
      <TouchableOpacity
        style={styles.chatCard}
        activeOpacity={0.85}
        onPress={() => openChat(chat)}>
        {/* AVATAR with unread badge overlay */}
        <View style={styles.avatarWrapper}>
          <Avatar uri={profilePhoto} name={resolvedName} size={46} ring />
          {unreadCount > 0 && (
            <View style={styles.badgeOverlay}>
              <Badge count={unreadCount} variant="primary" max={9} />
            </View>
          )}
        </View>

        {/* INFO */}
        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {resolvedName}
            </Text>
            {otherId && userBadgeData[otherId] && (
              <PremiumBadge
                tier={userBadgeData[otherId].tier}
                verifiedReal={userBadgeData[otherId].verifiedReal}
                size="small"
              />
            )}
          </View>
          <Text
            style={[
              styles.lastMessage,
              unreadCount > 0 && styles.lastMessageUnread,
            ]}
            numberOfLines={1}>
            {lastMsg}
          </Text>
        </View>

        {/* TIME + OPTIONS */}
        <View style={styles.rightCol}>
          {lastTime ? (
            <Text style={styles.timeText}>{formatTime(lastTime)}</Text>
          ) : null}
          <TouchableOpacity
            style={styles.optionsBtn}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            onPress={() => showOptions(chat, resolvedName, otherId || '')}>
            <Text style={styles.optionsBtnText}>⋯</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="💬 Chats" noBorder />
      <FlatList
        data={chats}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletonContainer}>
              {[0, 1, 2, 3, 4].map(i => (
                <SkeletonListItem key={i} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="💬"
              title="No chats yet"
              subtitle="Start networking with creators on CineLink."
              actionLabel="Find People to Connect"
              onAction={() => navigation.navigate('Home')}
            />
          )
        }
        extraData={[userNames, userBadgeData]}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  listContent: {flexGrow: 1, padding: Spacing.md},
  skeletonContainer: {paddingTop: Spacing.md},

  chatCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderTopWidth: 2,
    borderTopColor: Colors.primaryMid,
    ...Shadows.md,
  },

  avatarWrapper: {position: 'relative', marginRight: Spacing.md},
  badgeOverlay: {
    position: 'absolute',
    top: -2,
    right: -2,
  },

  infoCol: {flex: 1},
  nameRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.xs},
  name: {...Typography.label, color: Colors.textPrimary, flex: 1},
  lastMessage: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  lastMessageUnread: {color: Colors.textPrimary, fontWeight: '600'},

  rightCol: {alignItems: 'flex-end', gap: Spacing.xs, marginLeft: Spacing.sm},
  timeText: {...Typography.caption, color: Colors.textSecondary},
  optionsBtn: {padding: Spacing.xs},
  optionsBtnText: {color: Colors.primary, fontSize: 20, fontWeight: '700'},
});
