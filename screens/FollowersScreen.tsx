import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import api from '../src/api/client';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useApp} from '../src/context/AppContext';
import {Avatar, Header} from '../components/ui';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {useTheme} from '../src/context/ThemeContext';

export default function FollowersScreen({route, navigation}: any) {
  const {isDark} = useTheme();
  const {user: currentUser} = useApp();
  const {userId, initialTab, tab: routeTab} = route.params || {};
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(routeTab || initialTab || 'followers');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [myFollowingIds, setMyFollowingIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    loadUsers();
    fetchMyFollowing();
  }, [tab, page]);

  useEffect(() => {
    if (users.length >= 0) {
      loadSuggestedUsers();
    }
  }, [users]);

  const fetchMyFollowing = async () => {
    try {
      const res = await api.get<{followingIds: string[]}>('/users/following-ids');
      if (res?.followingIds) {
        setMyFollowingIds(new Set(res.followingIds));
      }
    } catch (e) {
      console.log('Error fetching following-ids:', e);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const endpoint =
        tab === 'followers'
          ? `/users/${userId}/followers`
          : `/users/${userId}/following`;
      const res = await api.get<any>(`${endpoint}?page=${page}&limit=20`);
      const list =
        tab === 'followers' ? res.followers || [] : res.following || [];
      setUsers(prev => (page === 1 ? list : [...prev, ...list]));
      setHasMore(res.hasMore || false);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestedUsers = async () => {
    try {
      const res = await api.get<any>('/users/search?limit=30');
      const allUsers = res.users || [];
      // Filter out profile user and users already in the main list
      const filtered = allUsers.filter((u: any) => {
        const uid = u._id || u.id;
        if (uid === userId) return false;
        if (users.some(item => (item._id || item.id) === uid)) return false;
        return true;
      });
      setSuggestedUsers(filtered);
    } catch (e) {
      console.log('Error loading suggestions in FollowersScreen:', e);
    }
  };

  const toggleFollow = async (targetUserId: string) => {
    if (actionLoading[targetUserId]) return;
    setActionLoading(prev => ({...prev, [targetUserId]: true}));
    try {
      const isFollowing = myFollowingIds.has(targetUserId);
      await api.post<any>('/users/follow', {targetUserId});
      setMyFollowingIds(prev => {
        const next = new Set(prev);
        if (isFollowing) {
          next.delete(targetUserId);
        } else {
          next.add(targetUserId);
        }
        return next;
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not toggle follow status.');
    } finally {
      setActionLoading(prev => ({...prev, [targetUserId]: false}));
    }
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

  const renderRightAction = (userItem: any) => {
    const targetId = userItem._id || userItem.id;
    const isFollowing = myFollowingIds.has(targetId);

    // If we follow them, or they are in the main followers/following list (meaning they are connected)
    const isMainListUser = users.some(item => (item._id || item.id) === targetId);

    if (isMainListUser || isFollowing) {
      return (
        <TouchableOpacity style={styles.msgBtn} onPress={() => startChat(userItem)}>
          <Text style={styles.msgBtnText}>💬</Text>
        </TouchableOpacity>
      );
    }

    // For non-followers/non-followed suggestion users, show a follow button
    return (
      <TouchableOpacity
        style={[styles.followPill, isFollowing && styles.followingPill]}
        disabled={actionLoading[targetId]}
        onPress={() => toggleFollow(targetId)}>
        {actionLoading[targetId] ? (
          <ActivityIndicator
            size="small"
            color={isFollowing ? Colors.primary : Colors.textInverse}
            style={{transform: [{scale: 0.8}]}}
          />
        ) : (
          <Text
            style={[
              styles.followPillText,
              isFollowing && styles.followingPillText,
            ]}>
            {isFollowing ? '✓ Following' : '+ Follow'}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (suggestedUsers.length === 0) return null;
    return (
      <View style={{marginTop: Spacing.md}}>
        {/* Separator line */}
        <View
          style={{
            height: 1,
            backgroundColor: Colors.border,
            marginHorizontal: Spacing.lg,
            marginVertical: Spacing.md,
          }}
        />

        {/* Title */}
        <Text
          style={{
            color: Colors.textPrimary,
            fontSize: 16,
            fontWeight: 'bold',
            marginHorizontal: Spacing.lg,
            marginBottom: Spacing.sm,
          }}>
          People You May Also Know
        </Text>

        {/* Suggestion list */}
        {suggestedUsers.map((item, index) => (
          <View
            key={item._id || item.id || String(index)}
            style={styles.userRow}>
            <TouchableOpacity
              style={styles.userInfoRow}
              onPress={() =>
                navigation.navigate('PublicProfile', {userId: item._id || item.id})
              }>
              <Avatar
                name={item.fullName || item.name || 'User'}
                size="md"
                uri={item.photoUrl}
              />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {item.fullName || item.name || item.displayName || 'User'}
                </Text>
                <Text style={styles.userRole}>{item.role || 'Artist'}</Text>
              </View>
            </TouchableOpacity>
            {renderRightAction(item)}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.safe}>
      <Header
        title={tab === 'followers' ? 'Followers' : 'Following'}
        navigation={navigation}
      />
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'followers' && styles.activeTab]}
          onPress={() => {
            setTab('followers');
            setPage(1);
          }}>
          <Text
            style={[
              styles.tabText,
              tab === 'followers' && styles.activeTabText,
            ]}>
            Followers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'following' && styles.activeTab]}
          onPress={() => {
            setTab('following');
            setPage(1);
          }}>
          <Text
            style={[
              styles.tabText,
              tab === 'following' && styles.activeTabText,
            ]}>
            Following
          </Text>
        </TouchableOpacity>
      </View>
      {loading && page === 1 ? (
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={{marginTop: 40}}
        />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item, i) => item._id || item.id || String(i)}
          contentContainerStyle={{paddingBottom: insets.bottom + 40}}
          renderItem={({item}) => (
            <View style={styles.userRow}>
              <TouchableOpacity
                style={styles.userInfoRow}
                onPress={() =>
                  navigation.navigate('PublicProfile', {
                    userId: item._id || item.id,
                  })
                }>
                <Avatar
                  name={item.fullName || item.name || 'User'}
                  size="md"
                  uri={item.photoUrl}
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {item.fullName || item.name || item.displayName || 'User'}
                  </Text>
                  <Text style={styles.userRole}>{item.role || 'Artist'}</Text>
                </View>
              </TouchableOpacity>
              {renderRightAction(item)}
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={{padding: Spacing.xl, alignItems: 'center'}}>
              <Text style={{fontSize: 36, marginBottom: Spacing.sm}}>👥</Text>
              <Text
                style={{
                  color: Colors.textPrimary,
                  fontWeight: 'bold',
                  fontSize: 16,
                  marginBottom: 4,
                }}>
                No users yet
              </Text>
              <Text
                style={{
                  color: Colors.textSecondary,
                  fontSize: 13,
                  textAlign: 'center',
                }}>
                {tab === 'followers'
                  ? "They'll show up here when they follow you"
                  : 'Users you follow will show up here'}
              </Text>
            </View>
          )}
          ListFooterComponent={() => (
            <>
              {loading && page > 1 && (
                <ActivityIndicator
                  color={Colors.primary}
                  style={{marginVertical: 10}}
                />
              )}
              {renderFooter()}
            </>
          )}
          onEndReached={() => {
            if (hasMore && !loading) setPage(p => p + 1);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.sm,
    backgroundColor: Colors.card,
  },
  activeTab: {backgroundColor: Colors.primary},
  tabText: {color: Colors.textSecondary, ...Typography.label},
  activeTabText: {color: Colors.textPrimary, fontWeight: 'bold'},
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  userInfo: {flex: 1},
  userName: {color: Colors.textPrimary, fontWeight: '600', fontSize: 15},
  userRole: {color: Colors.textSecondary, fontSize: 13},
  msgBtn: {
    padding: Spacing.sm,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.full,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  msgBtnText: {fontSize: 18},
  followPill: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    minWidth: 80,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followingPill: {
    backgroundColor: 'transparent',
    borderColor: Colors.primary,
  },
  followPillText: {
    color: Colors.textInverse,
    fontSize: 11,
    fontWeight: 'bold',
  },
  followingPillText: {
    color: Colors.primary,
  },
});
