import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image, ScrollView, Alert
} from 'react-native';
import api from '../src/api/client';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useApp} from '../src/context/AppContext';
import {Header, Input, Chip, Card, Avatar, Button} from '../components/ui';
import {Colors, Typography, Spacing, Radius} from '../src/theme';

const TIPS = ['Actor', 'Director', 'Mumbai', 'Telugu', 'Editor', 'Writer', 'DOP'];

export default function CrewScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const {user: currentUser} = useApp();
  
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [connectionStatus, setConnectionStatus] = useState<{[key: string]: 'connected' | 'pending' | 'none'}>({});
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch follow states and connection states on focus
  const fetchRelations = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [followRes, connRes] = await Promise.all([
        api.get<{followingIds: string[]}>('/users/following-ids'),
        api.get<{connections: any[]}>('/connections/all')
      ]);

      if (followRes?.followingIds) {
        setFollowingIds(new Set(followRes.followingIds));
      }

      if (connRes?.connections) {
        const statusMap: {[key: string]: 'connected' | 'pending' | 'none'} = {};
        connRes.connections.forEach((c: any) => {
          const otherId = c.requesterId === currentUser._id ? c.targetId : c.requesterId;
          if (c.status === 'accepted') {
            statusMap[otherId] = 'connected';
          } else if (c.status === 'pending') {
            statusMap[otherId] = 'pending';
          }
        });
        setConnectionStatus(statusMap);
      }
    } catch (e) {
      console.log('Error fetching relations:', e);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchRelations();
    const unsub = navigation.addListener('focus', fetchRelations);
    return unsub;
  }, [navigation, fetchRelations]);

  const doSearch = useCallback(async (queryStr: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    if (!queryStr.trim()) {
      setUsers([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const queryString = `query=${encodeURIComponent(queryStr.trim())}`;
      const res = await api.get<any>(`/users/search?${queryString}`);
      
      // Filter out admin and self
      const filtered = (res.users || []).filter((u: any) => {
        return u._id !== currentUser?._id && u.role !== 'Admin';
      });
      setUsers(filtered);
    } catch (e) {
      console.log('Search error:', e);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text), 400);
  };

  const handleTipPress = (tip: string) => {
    setSearchText(tip);
    doSearch(tip);
  };

  const toggleFollow = async (targetUserId: string) => {
    try {
      const isFollowing = followingIds.has(targetUserId);
      const res = await api.post<any>('/users/follow', {targetUserId});
      
      setFollowingIds(prev => {
        const next = new Set(prev);
        if (isFollowing) {
          next.delete(targetUserId);
        } else {
          next.add(targetUserId);
        }
        return next;
      });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not perform follow action.');
    }
  };

  const sendConnectRequest = async (targetUser: any) => {
    try {
      await api.post('/connections/request', {targetUserId: targetUser._id});
      setConnectionStatus(prev => ({...prev, [targetUser._id]: 'pending'}));
      Alert.alert('Request Sent! 🤝', `Connection request sent to ${targetUser.fullName || targetUser.displayName || 'User'}`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not send request.');
    }
  };

  const renderUser = ({item}: any) => {
    const displayName = item.fullName || item.displayName || item.name || 'User';
    const status = connectionStatus[item._id] || 'none';
    const isFollowing = followingIds.has(item._id);

    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => navigation.navigate('PublicProfile', {userId: item._id})}>
        
        <Avatar name={displayName} size="md" uri={item.photoUrl || item.photoURL} />

        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
            {item.verificationStatus === 'verified' && <Text style={styles.verifiedTag}>✅</Text>}
          </View>
          <Text style={styles.userRole}>🎭 {item.role || 'Creator'}</Text>
          {item.bio ? <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text> : null}
          {item.location ? <Text style={styles.userLocation}>📍 {item.location}</Text> : null}
        </View>

        <View style={styles.actionCol}>
          <TouchableOpacity
            style={[styles.followPill, isFollowing && styles.followingPill]}
            onPress={e => { e.stopPropagation(); toggleFollow(item._id); }}>
            <Text style={styles.followPillText}>
              {isFollowing ? '✓ Following' : '+ Follow'}
            </Text>
          </TouchableOpacity>

          {status === 'connected' ? (
            <View style={[styles.connectBtn, styles.connectedBtn]}>
              <Text style={styles.connectEmoji}>✅</Text>
            </View>
          ) : status === 'pending' ? (
            <View style={[styles.connectBtn, styles.pendingBtn]}>
              <Text style={styles.connectEmoji}>⏳</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.connectBtn}
              onPress={e => { e.stopPropagation(); sendConnectRequest(item); }}>
              <Text style={styles.connectEmoji}>🤝</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: Colors.background}]}>
      <Header title="🎥 Find Creators" subtitle="Search to discover cinema professionals" noBorder />

      <View style={styles.searchOuter}>
        <Input
          placeholder="Search by name, role, bio..."
          value={searchText}
          onChangeText={handleSearchChange}
          autoCorrect={false}
          leftIcon="🔍"
          rightIcon={
            searchText.length > 0 ? (
              <TouchableOpacity onPress={() => { setSearchText(''); setUsers([]); setSearched(false); }}>
                <Text style={styles.clearText}>✕</Text>
              </TouchableOpacity>
            ) : undefined
          }
        />
      </View>

      <TouchableOpacity
        style={styles.roomsBanner}
        onPress={() => navigation.navigate('BrowseProjects')}>
        <View style={styles.roomsTextCol}>
          <Text style={styles.roomsTitle}>🎬 CineLink Rooms</Text>
          <Text style={styles.roomsSub}>Find projects · Join film teams · Collaborate</Text>
        </View>
        <Text style={styles.roomsArrow}>→</Text>
      </TouchableOpacity>

      {!searched ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>Search for Creators</Text>
          <Text style={styles.emptySubtitle}>
            Type a name, role or location to find actors, directors and crew members
          </Text>
          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>Try searching for:</Text>
            <View style={styles.tipsChipsRow}>
              {TIPS.map(tip => (
                <TouchableOpacity key={tip} onPress={() => handleTipPress(tip)}>
                  <Text style={styles.tipChip}>🔎 {tip}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      ) : loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : users.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>😔</Text>
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>Try a different name or role</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item._id || item.id}
          renderItem={renderUser}
          contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + 100}]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultsCount}>
              {users.length} result{users.length > 1 ? 's' : ''} for "{searchText}"
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  list: {paddingHorizontal: Spacing.lg},
  searchOuter: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  clearText: {color: Colors.textTertiary, fontSize: 18, fontWeight: 'bold', padding: Spacing.xs},
  roomsBanner: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  roomsTextCol: {flex: 1, alignItems: 'flex-start'},
  roomsTitle: {...Typography.label, color: Colors.textPrimary},
  roomsSub: {...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.xs},
  roomsArrow: {color: Colors.primary, fontSize: 22, fontWeight: 'bold'},
  emptyState: {alignItems: 'center', paddingTop: Spacing.xl, paddingHorizontal: Spacing.xl},
  emptyEmoji: {fontSize: 60, marginBottom: Spacing.md},
  emptyTitle: {...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.sm},
  emptySubtitle: {...Typography.body, color: Colors.textSecondary, textAlign: 'center'},
  tipsBox: {marginTop: Spacing.xl, alignItems: 'center', width: '100%'},
  tipsTitle: {...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.md},
  tipsChipsRow: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm},
  tipChip: {
    color: Colors.primary,
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 13,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  resultsCount: {color: Colors.textSecondary, ...Typography.caption, marginBottom: Spacing.md},
  userCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {flex: 1, marginLeft: Spacing.md, alignItems: 'flex-start'},
  nameRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs},
  userName: {color: Colors.textPrimary, fontSize: 15, fontWeight: 'bold'},
  verifiedTag: {fontSize: 14},
  userRole: {color: Colors.primary, fontSize: 12, marginBottom: Spacing.xs},
  userBio: {color: Colors.textSecondary, fontSize: 12},
  userLocation: {color: Colors.textTertiary, fontSize: 11, marginTop: Spacing.xs},
  actionCol: {alignItems: 'center', gap: Spacing.sm, marginLeft: Spacing.sm},
  followPill: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primaryLight
  },
  followingPill: {
    backgroundColor: Colors.border,
    borderColor: Colors.border
  },
  followPillText: {color: Colors.textInverse, fontSize: 11, fontWeight: 'bold'},
  connectBtn: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44
  },
  connectedBtn: {
    borderColor: Colors.success,
    backgroundColor: Colors.successFaint
  },
  pendingBtn: {
    borderColor: Colors.warning,
    backgroundColor: Colors.warningFaint
  },
  connectEmoji: {fontSize: 18},
  loader: {marginTop: 60}
});
