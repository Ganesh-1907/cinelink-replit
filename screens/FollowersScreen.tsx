import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert} from 'react-native';
import api from '../src/api/client';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Avatar, Header, EmptyState} from '../components/ui';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {useTheme} from '../src/context/ThemeContext';

export default function FollowersScreen({route, navigation}: any) {
  const {isDark} = useTheme();
  const {userId, initialTab = 'followers'} = route.params;
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(initialTab);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [tab, page]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const endpoint = tab === 'followers' ? `/users/${userId}/followers` : `/users/${userId}/following`;
      const res = await api.get<any>(`${endpoint}?page=${page}&limit=20`);
      const list = tab === 'followers' ? (res.followers || []) : (res.following || []);
      setUsers(prev => page === 1 ? list : [...prev, ...list]);
      setHasMore(res.hasMore || false);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  };

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

  return (
    <View style={styles.safe}>
      <Header title="Followers" navigation={navigation} />
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, tab === 'followers' && styles.activeTab]} onPress={() => { setTab('followers'); setPage(1); }}><Text style={[styles.tabText, tab === 'followers' && styles.activeTabText]}>Followers</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'following' && styles.activeTab]} onPress={() => { setTab('following'); setPage(1); }}><Text style={[styles.tabText, tab === 'following' && styles.activeTabText]}>Following</Text></TouchableOpacity>
      </View>
      {loading && page === 1 ? <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 40}} /> : users.length === 0 ? <EmptyState icon="👥" title="No users yet" subtitle="They'll show up here when they follow you" /> : (
        <FlatList data={users} keyExtractor={(item, i) => item._id || item.id || String(i)} contentContainerStyle={{paddingBottom: insets.bottom + 40}}
          renderItem={({item}) => (
            <View style={styles.userRow}>
              <TouchableOpacity style={styles.userInfoRow} onPress={() => navigation.navigate('PublicProfile', {userId: item._id || item.id})}>
                <Avatar name={item.fullName || item.name || 'User'} size="md" uri={item.photoUrl} />
                <View style={styles.userInfo}><Text style={styles.userName}>{item.fullName || item.name || item.displayName || 'User'}</Text><Text style={styles.userRole}>{item.role || 'Artist'}</Text></View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.msgBtn} onPress={() => startChat(item)}>
                <Text style={styles.msgBtnText}>💬</Text>
              </TouchableOpacity>
            </View>
          )}
          ListFooterComponent={loading && page > 1 ? <ActivityIndicator color={Colors.primary} /> : null}
          onEndReached={() => { if (hasMore && !loading) setPage(p => p + 1); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  tabRow: {flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.sm},
  tab: {flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.sm, backgroundColor: Colors.card},
  activeTab: {backgroundColor: Colors.primary},
  tabText: {color: Colors.textSecondary, ...Typography.label},
  activeTabText: {color: Colors.textPrimary, fontWeight: 'bold'},
  userRow: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.border},
  userInfoRow: {flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.md},
  userInfo: {flex: 1},
  userName: {color: Colors.textPrimary, fontWeight: '600', fontSize: 15},
  userRole: {color: Colors.textSecondary, fontSize: 13},
  msgBtn: {padding: Spacing.sm, backgroundColor: Colors.cardElevated, borderRadius: Radius.full, width: 40, height: 40, justifyContent: 'center', alignItems: 'center'},
  msgBtnText: {fontSize: 18},
});
