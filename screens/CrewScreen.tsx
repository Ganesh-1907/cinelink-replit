import React, {useState, useEffect, useCallback, useRef} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator} from 'react-native';
import api from '../src/api/client';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Avatar, Header, Chip, EmptyState, Input} from '../components/ui';
import {Colors, Typography, Spacing, Radius} from '../src/theme';

export default function CrewScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter !== 'All') params.set('role', roleFilter);
      if (debouncedSearch.trim()) params.set('query', debouncedSearch.trim());
      const res = await api.get<any>(`/users/search?${params}`);
      setUsers(res.users || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  }, [roleFilter, debouncedSearch]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <View style={styles.safe}>
      <Header title="🎥 Crew" />
      <View style={styles.searchWrap}><Input value={search} onChangeText={setSearch} placeholder="🔍 Search by name, location..." /></View>
      <FlatList horizontal showsHorizontalScrollIndicator={false} style={styles.filterList} contentContainerStyle={styles.filterRow} data={['All', 'Actor', 'Director', 'Writer', 'DOP', 'Editor', 'Producer']} renderItem={({item}) => <Chip label={item} selected={roleFilter === item} onPress={() => setRoleFilter(item)} />} keyExtractor={i => i} />
      {loading ? <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 60}} /> : users.length === 0 ? <EmptyState icon="🎥" title="No crew found" subtitle="Try changing filters" /> : (
        <FlatList data={users} keyExtractor={item => item._id || item.id} contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + 40}]}
          renderItem={({item}) => (
            <TouchableOpacity style={styles.userRow} onPress={() => navigation.navigate('PublicProfile', {userId: item._id || item.id})}>
              <Avatar name={item.fullName || item.displayName || 'User'} size="md" source={item.photoUrl ? {uri: item.photoUrl} : undefined} />
              <View style={styles.userInfo}><Text style={styles.name}>{item.fullName || item.displayName || item.name || 'User'}</Text><Text style={styles.role}>{item.role || 'Artist'}{item.location ? ` • ${item.location}` : ''}</Text></View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  searchWrap: {paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm},
  filterList: {flexGrow: 0, maxHeight: 50},
  filterRow: {paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md},
  list: {paddingHorizontal: Spacing.lg},
  userRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.border},
  userInfo: {flex: 1},
  name: {color: Colors.textPrimary, fontWeight: '600', fontSize: 15},
  role: {color: Colors.textSecondary, fontSize: 13},
});
