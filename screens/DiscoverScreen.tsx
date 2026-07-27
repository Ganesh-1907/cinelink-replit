import React, {useEffect, useState, useCallback, useRef} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert} from 'react-native';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {Header, EmptyState, Input, Avatar} from '../components/ui';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useApp} from '../src/context/AppContext';

export default function DiscoverScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const {user} = useApp();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchFollowing = useCallback(async () => {
    if (!user) return;
    try {
      const uid = user.uid || user._id;
      const followRes = await api.get<any>(`/users/${uid}/following`);
      const followingList = followRes.following || [];
      const followedSet = new Set<string>(followingList.map((u: any) => u._id || u.id));
      setFollowingIds(followedSet);
    } catch (e) {
      console.log(e);
    }
  }, [user]);

  const fetchUsers = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const res = await api.get<any>(`/users/search?${query ? `query=${query}` : 'limit=30'}`);
      const list = res.users || [];
      const currentUid = user?.uid || user?._id;
      setUsers(list.filter((u: any) => (u._id || u.id) !== currentUid));
    } catch (e) { 
      console.log(e); 
    } finally { 
      setLoading(false); 
    }
  }, [user]);

  useEffect(() => {
    fetchUsers();
    fetchFollowing();
  }, [fetchUsers, fetchFollowing]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers(search);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, fetchUsers]);

  const toggleFollowUser = async (targetId: string) => {
    const isCurrentlyFollowing = followingIds.has(targetId);
    
    setFollowingIds(prev => {
      const next = new Set(prev);
      if (isCurrentlyFollowing) {
        next.delete(targetId);
      } else {
        next.add(targetId);
      }
      return next;
    });

    try {
      await api.post('/users/follow', {targetUserId: targetId});
    } catch (e) {
      setFollowingIds(prev => {
        const next = new Set(prev);
        if (isCurrentlyFollowing) {
          next.add(targetId);
        } else {
          next.delete(targetId);
        }
        return next;
      });
      Alert.alert('Error', 'Could not update follow status.');
    }
  };

  const renderItem = ({item}: any) => {
    const uid = item._id || item.id;
    const isFollowed = followingIds.has(uid);

    return (
      <View style={styles.creatorCard}>
        <TouchableOpacity
          onPress={() => navigation.navigate('PublicProfile', {userId: uid})}
          style={styles.creatorPressable}
          activeOpacity={0.7}
        >
          <Avatar 
            name={item.fullName || item.displayName || 'User'} 
            size="md" 
            uri={item.photoUrl} 
          />
          <View style={styles.creatorInfo}>
            <Text style={styles.creatorName} numberOfLines={1}>
              {item.fullName || item.displayName || item.name || 'User'}
            </Text>
            <Text style={styles.creatorRole} numberOfLines={1}>
              {item.role || 'Artist'}
            </Text>
            <Text style={styles.creatorLocation} numberOfLines={1}>
              {item.location ? `📍 ${item.location}` : 'CineLink Member'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.followBtn,
            isFollowed && styles.followedBtn
          ]}
          onPress={() => toggleFollowUser(uid)}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.followBtnText,
            isFollowed && styles.followedBtnText
          ]}>
            {isFollowed ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.safe}>
      <Header title="Discover Creators" navigation={navigation} onBack={() => navigation.goBack()} />
      <View style={styles.searchWrap}>
        <Input value={search} onChangeText={setSearch} placeholder="🔍 Find creators..." />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 60}} />
      ) : users.length === 0 ? (
        <EmptyState icon="🔍" title="No users found" subtitle="Try a different search term" />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + 80}]}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  searchWrap: {paddingHorizontal: Spacing.lg, marginBottom: Spacing.md},
  list: {paddingHorizontal: Spacing.lg},
  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  creatorPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  creatorName: {
    color: Colors.textPrimary,
    ...Typography.label,
    fontSize: 15,
  },
  creatorRole: {
    color: Colors.primary,
    ...Typography.captionBold,
    fontSize: 12,
    marginTop: 1,
  },
  creatorLocation: {
    color: Colors.textTertiary,
    ...Typography.micro,
    marginTop: 2,
  },
  followBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    minWidth: 85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followBtnText: {
    color: Colors.textInverse,
    ...Typography.captionBold,
    fontSize: 12,
  },
  followedBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  followedBtnText: {
    color: Colors.primary,
  },
});
