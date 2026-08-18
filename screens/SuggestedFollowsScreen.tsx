import React, {useState, useEffect, useCallback, useRef} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator} from 'react-native';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Avatar, Button, Chip, EmptyState, Header} from '../components/ui';
import {useApp} from '../src/context/AppContext';
import {useTheme} from '../src/context/ThemeContext';

export default function SuggestedFollowsScreen({navigation}: any) {
  const {isDark} = useTheme();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const processingRef = useRef<Set<string>>(new Set());
  const {user} = useApp();

  const cleanName = (raw: string | null | undefined): string => {
    if (!raw) return 'User';
    return raw.includes('@') ? raw.split('@')[0] : raw;
  };

  const fetchUsers = useCallback(async (pageNum = 1, isAppend = false) => {
    if (pageNum === 1) setLoading(true); else setLoadingMore(true);
    try {
      // Fetch followed users to initialize state
      try {
        const followRes = await api.get<any>('/users/following-ids');
        if (followRes && followRes.followingIds) {
          setFollowing(new Set(followRes.followingIds));
        }
      } catch (err) {
        console.log('Error fetching following-ids:', err);
      }

      const res = await api.get<any>(`/users/search?page=${pageNum}&limit=15`);
      const list = (res.users || []).filter((u: any) => (u._id || u.id) !== user?.uid);
      setUsers(prev => isAppend
        ? [...prev, ...list.filter(u => !prev.some(p => (p._id || p.id) === (u._id || u.id)))]
        : list);
      setPage(pageNum);
      setHasMore(res.hasMore === true);
    } catch (e) { console.log(e); }
    finally { setLoading(false); setLoadingMore(false); }
  }, [user]);

  useEffect(() => { fetchUsers(1, false); }, [fetchUsers]);

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    fetchUsers(page + 1, true);
  };

  const toggleFollow = async (userId: string) => {
    if (processingRef.current.has(userId)) return;
    const isFollowing = following.has(userId);
    processingRef.current.add(userId);
    setFollowing(prev => { const n = new Set(prev); isFollowing ? n.delete(userId) : n.add(userId); return n; });
    try { await api.post('/users/follow', {targetUserId: userId}); }
    catch {
      setFollowing(prev => { const n = new Set(prev); isFollowing ? n.add(userId) : n.delete(userId); return n; });
    }
    finally { processingRef.current.delete(userId); }
  };

  const handleSkip = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace?.('MainTabs');
    }
  };

  return (
    <View style={styles.safe}>
      <Header
        title="Follow Suggestions"
        onBack={navigation.goBack}
        right={
          <TouchableOpacity onPress={handleSkip} style={styles.skipTopBtn}>
            <Text style={styles.skipTopText}>Skip</Text>
          </TouchableOpacity>
        }
      />
      {loading ? <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 60}} /> : users.length === 0 ? <EmptyState icon="👥" title="No suggestions" subtitle="Check back later" /> : (
        <FlatList data={users} keyExtractor={item => item._id || item.id} contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={Colors.primary} style={{padding: 20}} />
            ) : (
              <View style={styles.footer}>
                <Button label="Continue →" variant="primary" size="lg" fullWidth onPress={handleSkip} />
              </View>
            )
          }
          renderItem={({item}) => {
            const uid = item._id || item.id;
            const isFollowed = following.has(uid);
            const displayName = item.fullName || item.displayName || item.name || cleanName(item.email) || 'User';
            return (
              <View style={styles.userRow}>
                <Avatar name={displayName} size="md" uri={item.photoUrl || item.photoURL} />
                <View style={styles.userInfo}><Text style={styles.name}>{displayName}</Text><Text style={styles.role}>{item.role || 'Artist'}</Text></View>
                <Button label={isFollowed ? 'Following' : '+ Follow'} variant={isFollowed ? 'secondary' : 'primary'} size="sm" onPress={() => toggleFollow(uid)} />
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  list: {padding: Spacing.lg},
  userRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.border},
  userInfo: {flex: 1},
  name: {color: Colors.textPrimary, fontWeight: '600', fontSize: 15},
  role: {color: Colors.textSecondary, fontSize: 13},
  footer: {marginTop: Spacing.xl, gap: Spacing.md, alignItems: 'center'},
  footerText: {color: Colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: Spacing.sm},
  skipBtn: {padding: Spacing.md},
  skipText: {color: Colors.textTertiary, fontSize: 14},
  skipTopBtn: {paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs},
  skipTopText: {color: Colors.primary, fontSize: 14, fontWeight: '700'},
});
