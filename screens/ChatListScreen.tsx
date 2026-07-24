import React, {useEffect, useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import api from '../src/api/client';
import PremiumBadge from '../src/components/Premium/PremiumBadge';
import {Avatar, Badge, EmptyState, Header} from '../components/ui';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {useApp} from '../src/context/AppContext';

const cleanName = (raw: string | null | undefined): string => {
  if (!raw) return '';
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

const formatTime = (ts: string) => {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString([], {day: 'numeric', month: 'short'});
};

export default function ChatListScreen({navigation}: any) {
  const {user: currentUser} = useApp();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadChats();
  }, [refreshKey]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => setRefreshKey(k => k + 1));
    return unsubscribe;
  }, [navigation]);

  const loadChats = async () => {
    try {
      const res = await api.get<{chats: any[]}>('/chat/list');
      const sorted = (res.chats || []).sort((a, b) => {
        const aT = new Date(a.lastMessageTime || a.updatedAt || 0).getTime();
        const bT = new Date(b.lastMessageTime || b.updatedAt || 0).getTime();
        return bT - aT;
      });
      setChats(sorted);
    } catch (e) {
      console.log('Chat list error:', e);
    } finally {
      setLoading(false);
    }
  };

  const getOtherUserId = (chat: any) =>
    (chat.participants || []).find((id: string) => id !== currentUser?.uid);

  const getOtherName = (chat: any) =>
    cleanName((chat.participantNames || [])[0] || 'User');

  const openChat = (chat: any) => navigation.navigate('ChatScreen', {chat});

  const showOptions = (chat: any) => {
    const otherId = getOtherUserId(chat);
    const otherName = getOtherName(chat);
    Alert.alert('Chat Options', otherName, [
      {text: 'Delete Chat', style: 'destructive', onPress: () => deleteChat(chat._id || chat.id)},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const deleteChat = async (chatId: string) => {
    Alert.alert('Delete Chat', 'Are you sure?', [
      {text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          setChats(prev => prev.filter(c => (c._id || c.id) !== chatId));
        } catch (e) { console.log(e); }
      }},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const unreadForChat = (chat: any) => {
    const uid = currentUser?.uid || '';
    return chat.unreadCount?.[uid] || 0;
  };

  const renderItem = ({item}: any) => {
    const otherId = getOtherUserId(item);
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
            <Text style={styles.chatName} numberOfLines={1}>{otherName}</Text>
            <Text style={styles.chatTime}>{formatTime(item.lastMessageTime || item.updatedAt)}</Text>
          </View>
          <View style={styles.chatFooter}>
            <Text style={styles.lastMsg} numberOfLines={1}>
              {item.lastMessage || 'No messages yet'}
            </Text>
            {unread > 0 && (
              <Badge label={String(unread > 99 ? '99+' : unread)} variant="primary" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.safe}>
        <Header title="Messages" navigation={navigation} />
        <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 60}} />
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <Header title="Messages" navigation={navigation} />
      {chats.length === 0 ? (
        <EmptyState icon="💬" title="No conversations yet" subtitle="Connect with creators to start chatting" />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={item => item._id || item.id}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  chatRow: {flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 0.5, borderBottomColor: Colors.border, gap: Spacing.md},
  chatInfo: {flex: 1},
  chatHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4},
  chatName: {color: Colors.textPrimary, fontWeight: '700', fontSize: 15, flex: 1},
  chatTime: {color: Colors.textTertiary, fontSize: 11, marginLeft: Spacing.sm},
  chatFooter: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  lastMsg: {color: Colors.textSecondary, fontSize: 13, flex: 1},
});
