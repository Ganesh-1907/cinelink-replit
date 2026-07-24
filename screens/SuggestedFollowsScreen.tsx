import React, {useState, useEffect, useCallback, useRef} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity} from 'react-native';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Avatar, Button, Chip, EmptyState, Header} from '../components/ui';
import {useApp} from '../src/context/AppContext';

export default function SuggestedFollowsScreen({navigation}: any) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const processingRef = useRef<Set<string>>(new Set());
  const {user} = useApp();

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get<any>('/users/search?limit=20');
      setUsers((res.users || []).filter((u: any) => (u._id || u.id) !== user?.uid));
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

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
    navigation.replace?.();
  };

  return (
    <View style={styles.safe}>
      <Header title="👥 Follow Suggestions" onBack={navigation.goBack} />
      {loading ? null : users.length === 0 ? <EmptyState icon="👥" title="No suggestions" subtitle="Check back later" /> : (
        <FlatList data={users} keyExtractor={item => item._id || item.id} contentContainerStyle={styles.list}
          ListFooterComponent={
            <View style={styles.footer}>
              <Text style={styles.footerText}>Follow creators you want to see on your feed</Text>
              <Button label="Continue →" variant="primary" size="lg" fullWidth onPress={handleSkip} />
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                <Text style={styles.skipText}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({item}) => {
            const uid = item._id || item.id;
            const isFollowed = following.has(uid);
            return (
              <View style={styles.userRow}>
                <Avatar name={item.fullName || item.displayName || 'User'} size="md" uri={item.photoUrl} />
                <View style={styles.userInfo}><Text style={styles.name}>{item.fullName || item.displayName || 'User'}</Text><Text style={styles.role}>{item.role || 'Artist'}</Text></View>
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
});
