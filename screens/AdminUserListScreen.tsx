import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput} from 'react-native';
import api from '../src/api/client';
import {Colors, Spacing, Radius} from '../src/theme';
import {Header, Avatar, Chip, EmptyState, PopupModal} from '../components/ui';
import {useApp} from '../src/context/AppContext';
import {useTheme} from '../src/context/ThemeContext';

export default function AdminUserListScreen({route, navigation}: any) {
  const {isDark} = useTheme();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const filter = route?.params?.filter || 'all';
  const {user} = useApp();

  const filterLabel = filter === 'all' ? 'All Users' : filter === 'admins' ? 'Admins' : filter === 'directors' ? 'Directors' : filter === 'actors' ? 'Actors' : filter === 'banned' ? 'Banned Users' : 'Users';

  useEffect(() => {
    if (!user) return;
    api.get<{users: any[]}>('/admin/users').then(res => {
      let list = res.users || [];
      if (filter === 'admins') list = list.filter((u: any) => u.role === 'Admin' || u.isAdmin);
      else if (filter === 'directors') list = list.filter((u: any) => u.role === 'Director' || u.isApprovedDirector);
      else if (filter === 'actors') list = list.filter((u: any) => u.role !== 'Admin' && u.role !== 'Director' && !u.isAdmin && !u.isApprovedDirector);
      else if (filter === 'banned') list = list.filter((u: any) => u.banned);
      setUsers(list);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [filter, user]);

  const filtered = searchText.trim()
    ? users.filter((u: any) => {
        const q = searchText.toLowerCase();
        return (u.fullName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.role || '').toLowerCase().includes(q);
      })
    : users;

  return (
    <SafeAreaView style={styles.safe}>
      <Header title={filterLabel} navigation={navigation} />

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput style={styles.searchInput} placeholder="Search by name, email, or role..." placeholderTextColor={Colors.textTertiary} value={searchText} onChangeText={setSearchText} />
        {searchText.length > 0 && <TouchableOpacity onPress={() => setSearchText('')}><Text style={styles.searchClear}>✕</Text></TouchableOpacity>}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 40}} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="👥" title={searchText ? 'No matching users' : 'No users found'} />
        ) : filtered.map((u: any) => {
          const uid = u._id || u.id;
          const uEmail = u.email || '';
          return (
          <TouchableOpacity key={uid} style={styles.userCard} activeOpacity={0.7} onPress={() => navigation.navigate('PublicProfile', {userId: uid})}>
            <Avatar name={u.fullName || uEmail || 'U'} size="md" />
            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName} numberOfLines={1}>{u.fullName || 'User'}</Text>
                <Chip label={u.role || 'Actor'} />
              </View>
              <Text style={styles.userEmail} numberOfLines={1}>{uEmail}</Text>
              {(u.isApprovedDirector || u.isAdmin) && (
                <View style={styles.badgeRow}>
                  {u.isApprovedDirector && <Chip label="🎬 Director" />}
                  {u.isAdmin && <Chip label="🛡️ Admin" />}
                </View>
              )}
              {u.banned && <Chip label="🚫 Banned" />}
            </View>
          </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  searchContainer: {flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, height: 40, borderWidth: 1, borderColor: Colors.borderLight, marginTop: Spacing.sm},
  searchIcon: {fontSize: 14, marginRight: Spacing.xs},
  searchInput: {flex: 1, color: Colors.textPrimary, fontSize: 13, paddingVertical: 0},
  searchClear: {color: Colors.textTertiary, fontSize: 14, paddingHorizontal: Spacing.xs, fontWeight: 'bold'},
  scroll: {padding: Spacing.md},
  userCard: {flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight},
  userInfo: {flex: 1, marginLeft: Spacing.sm},
  nameRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm},
  userName: {color: Colors.textPrimary, fontWeight: '600', fontSize: 14, flex: 1},
  userEmail: {color: Colors.textSecondary, fontSize: 11, marginTop: 2},
  badgeRow: {flexDirection: 'row', gap: Spacing.xs, marginTop: 4},
});
