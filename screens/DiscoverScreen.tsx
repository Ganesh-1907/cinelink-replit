import React, {useEffect, useState, useCallback, useRef} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator} from 'react-native';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, EmptyState, Input, Avatar} from '../components/ui';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

export default function DiscoverScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async (query?: string) => {
    setLoading(true);
    try {
      const res = await api.get<any>(`/users/search?${query ? `query=${query}` : 'limit=30'}`);
      setUsers(res.users || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers(search);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, fetchUsers]);

  return (
    <View style={styles.safe}>
      <Header />
      <View style={styles.searchWrap}><Input value={search} onChangeText={setSearch} placeholder="🔍 Find creators..." /></View>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 60}} />
      ) : users.length === 0 ? (
        <EmptyState icon="🔍" title="No users found" subtitle="Try a different search term" />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + 40}]}
          renderItem={({item}) => (
            <TouchableOpacity style={styles.userRow} onPress={() => navigation.navigate('PublicProfile', {userId: item._id || item.id})}>
              <Avatar name={item.fullName || item.displayName || 'User'} size="md" uri={item.photoUrl} />
              <View style={styles.userInfo}>
                <Text style={styles.name}>{item.fullName || item.displayName || item.name || 'User'}</Text>
                <Text style={styles.role}>{item.role || 'Artist'}{item.location ? ` • ${item.location}` : ''}</Text>
              </View>
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
  list: {paddingHorizontal: Spacing.lg},
  userRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.border},
  userInfo: {flex: 1},
  name: {color: Colors.textPrimary, fontWeight: '600', fontSize: 15},
  role: {color: Colors.textSecondary, fontSize: 13},
});

