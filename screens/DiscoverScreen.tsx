import React, {useEffect, useState, useCallback} from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Card, Chip, EmptyState, Input, Avatar} from '../components/ui';

export default function DiscoverScreen({navigation}: any) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get<any>(`/users/search?${search ? `query=${search}` : 'limit=30'}`);
      setUsers(res.users || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <View style={styles.safe}>
      <Header title="✨ Discover" />
      <View style={styles.searchWrap}><Input value={search} onChangeText={setSearch} placeholder="🔍 Find creators..." /></View>
      <ScrollView contentContainerStyle={styles.grid}>
        {users.map((u: any) => (
          <TouchableOpacity key={u._id || u.id} style={styles.card} onPress={() => navigation.navigate('PublicProfile', {userId: u._id || u.id})}>
            <Avatar name={u.fullName || u.displayName || 'User'} size="lg" source={u.photoUrl ? {uri: u.photoUrl} : undefined} />
            <Text style={styles.name} numberOfLines={1}>{u.fullName || u.displayName || 'User'}</Text>
            <Text style={styles.role}>{u.role || 'Artist'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  searchWrap: {paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm},
  grid: {flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.sm, justifyContent: 'center'},
  card: {width: '30%', alignItems: 'center', padding: Spacing.sm, margin: Spacing.xs, backgroundColor: Colors.card, borderRadius: Radius.lg, paddingVertical: Spacing.lg},
  name: {color: Colors.textPrimary, fontSize: 13, fontWeight: '600', marginTop: Spacing.xs, textAlign: 'center'},
  role: {color: Colors.textSecondary, fontSize: 11, marginTop: 2},
});
