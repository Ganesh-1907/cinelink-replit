import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import api from '../src/api/client';
import {Avatar, Badge, EmptyState, Header} from '../components/ui';
import {Colors, Spacing, Radius} from '../src/theme';
import {useApp} from '../src/context/AppContext';
import {useTheme} from '../src/context/ThemeContext';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) {
    return '';
  }
  if (typeof raw !== 'string') {
    return '';
  }
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

const formatTime = (ts: string) => {
  if (!ts) {
    return '';
  }
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) {
    return 'now';
  }
  if (diff < 3600) {
    return `${Math.floor(diff / 60)}m`;
  }
  if (diff < 86400) {
    return `${Math.floor(diff / 3600)}h`;
  }
  return d.toLocaleDateString([], {day: 'numeric', month: 'short'});
};

export default function ChatListScreen({navigation}: any) {
  const {isDark} = useTheme();
  const {user: currentUser} = useApp();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [discoverUsers, setDiscoverUsers] = useState<any[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () =>
      setRefreshKey(k => k + 1),
    );
    return unsubscribe;
  }, [navigation]);

  const loadChatsData = useCallback(async (): Promise<any[]> => {
    try {
      const res = await api.get<{chats: any[]}>('/chat/list');
      const sorted = (res.chats || []).sort((a, b) => {
        const aT = new Date(a.lastMessageTime || a.updatedAt || 0).getTime();
        const bT = new Date(b.lastMessageTime || b.updatedAt || 0).getTime();
        return bT - aT;
      });
      setChats(sorted);
      return sorted;
    } catch (e) {
      console.log('Chat list error:', e);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDiscoverUsers = useCallback(
    async (existingChats: any[]) => {
      setDiscoverLoading(true);
      try {
        const uid = currentUser?.uid || '';
        const chatParticipantIds = new Set<string>();
        existingChats.forEach(c =>
          (c.participants || []).forEach((p: string) =>
            chatParticipantIds.add(p),
          ),
        );

        // Load who I follow
        const followingRes = await api.get<any>(
          `/users/${uid}/following?limit=50`,
        );
        const followingUsers = followingRes?.following || [];

        // Load all users from search
        const searchRes = await api.get<any>('/users/search?limit=50');
        const allUsers = searchRes?.users || [];

        // Deduplicate: merge following first, then others, exclude self and existing chats
        const seen = new Set<string>();
        seen.add(uid);

        const merged: any[] = [];

        for (const u of followingUsers) {
          const id = String(u._id || u.id);
          if (seen.has(id)) {
            continue;
          }
          seen.add(id);
          merged.push({...u, isFollowing: true});
        }

        for (const u of allUsers) {
          const id = String(u._id || u.id);
          if (seen.has(id)) {
            continue;
          }
          seen.add(id);
          merged.push({...u, isFollowing: false});
        }

        // Filter out users already in chats
        const filtered = merged.filter(
          u => !chatParticipantIds.has(String(u._id || u.id)),
        );

        setDiscoverUsers(filtered);
      } catch (e) {
        console.log('Discover error:', e);
      } finally {
        setDiscoverLoading(false);
      }
    },
    [currentUser?.uid],
  );

  const init = useCallback(async () => {
    const fetchedChats = await loadChatsData();
    await loadDiscoverUsers(fetchedChats);
  }, [loadChatsData, loadDiscoverUsers]);

  useEffect(() => {
    init();
  }, [refreshKey, init]);

  const getOtherName = (chat: any) =>
    cleanName((chat.participantNames || [])[0] || 'User');

  const startChat = async (otherUser: any) => {
    try {
      const otherId = String(otherUser._id || otherUser.id);
      const res = await api.post<any>('/chat/start', {otherUserId: otherId});
      if (res.chat) {
        navigation.navigate('ChatScreen', {chat: res.chat});
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not start chat.');
    }
  };

  const openChat = (chat: any) => navigation.navigate('ChatScreen', {chat});

  const showOptions = (chat: any) => {
    const otherName = getOtherName(chat);
    Alert.alert('Chat Options', otherName, [
      {
        text: 'Delete Chat',
        style: 'destructive',
        onPress: () => deleteChat(chat._id || chat.id),
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
            await api.delete(`/chat/${chatId}`);
            setChats(prev => prev.filter(c => (c._id || c.id) !== chatId));
          } catch (e) {
            console.log(e);
          }
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const unreadForChat = (chat: any) => {
    const uid = currentUser?.uid || '';
    return chat.unreadCount?.[uid] || 0;
  };

  const renderChatItem = ({item}: any) => {
    const otherName = getOtherName(item);
    const unread = unreadForChat(item);

    return (
      <TouchableOpacity
        style={styles.chatRow}
        onPress={() => openChat(item)}
        onLongPress={() => showOptions(item)}
        activeOpacity={0.7}>
        <Avatar name={otherName} size="md" />
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>
              {item.isGroupChat ? item.groupName || 'Group' : otherName}
            </Text>
            <Text style={styles.chatTime}>
              {formatTime(item.lastMessageTime || item.updatedAt)}
            </Text>
          </View>
          <View style={styles.chatFooter}>
            <Text style={styles.lastMsg} numberOfLines={1}>
              {item.lastMessage || 'No messages yet'}
            </Text>
            {unread > 0 && (
              <Badge
                label={String(unread > 99 ? '99+' : unread)}
                variant="primary"
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDiscoverUser = ({item}: any) => {
    const name = item.fullName || item.displayName || item.name || 'User';
    return (
      <TouchableOpacity
        style={styles.discoverRow}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('PublicProfile', {userId: item._id || item.id})
        }>
        <Avatar name={name} size="md" uri={item.photoUrl} />
        <View style={styles.chatInfo}>
          <Text style={styles.chatName} numberOfLines={1}>
            {name}
            {item.isFollowing ? (
              <Text style={styles.followingTag}> (Following)</Text>
            ) : null}
          </Text>
          <Text style={styles.userRole} numberOfLines={1}>
            {item.role || item.bio || ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.msgBtn} onPress={() => startChat(item)}>
          <Text style={styles.msgBtnText}>💬</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const sections = [
    ...(chats.length > 0
      ? [{title: 'Your Chats', data: chats, renderItem: renderChatItem}]
      : []),
    ...(discoverUsers.length > 0
      ? [
          {
            title: 'People You Can Chat',
            data: discoverUsers,
            renderItem: renderDiscoverUser,
          },
        ]
      : []),
  ];

  const renderSectionHeader = ({section}: any) => {
    if (section.title === 'Your Chats' && chats.length === 0) {
      return null;
    }
    return (
      <View style={styles.sectionHeader}>
        {section.title === 'People You Can Chat' && (
          <View style={styles.sectionDivider} />
        )}
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.safe}>
        <Header title="Messages" navigation={navigation} />
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={styles.loader}
        />
      </View>
    );
  }

  if (chats.length === 0 && discoverUsers.length === 0 && !discoverLoading) {
    return (
      <View style={styles.safe}>
        <Header title="Messages" navigation={navigation} />
        <EmptyState
          icon="💬"
          title="No conversations yet"
          subtitle="Connect with creators to start chatting"
        />
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <Header title="Messages" navigation={navigation} />
      <SectionList
        sections={sections}
        keyExtractor={(item, i) => item._id || item.id || String(i)}
        renderItem={({section, item}) => section.renderItem({item})}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        ListFooterComponent={
          discoverLoading ? (
            <ActivityIndicator
              color={Colors.primary}
              style={styles.listFooterLoader}
            />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  sectionHeader: {marginTop: Spacing.xs},
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: 2,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  chatInfo: {flex: 1},
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatName: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
    flex: 1,
  },
  chatTime: {color: Colors.textSecondary, fontSize: 11, marginLeft: Spacing.sm},
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMsg: {color: Colors.textSecondary, fontSize: 13, flex: 1},
  discoverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  followingTag: {color: Colors.primary, fontSize: 11, fontWeight: '600'},
  userRole: {color: Colors.textSecondary, fontSize: 12, marginTop: 1},
  msgBtn: {
    padding: Spacing.sm,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.full,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  msgBtnText: {fontSize: 16},
  loader: {marginTop: 60},
  listFooterLoader: {padding: 20},
});
