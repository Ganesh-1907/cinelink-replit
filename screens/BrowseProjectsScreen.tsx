import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, SafeAreaView, StatusBar} from 'react-native';
import api from '../src/api/client';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {Header, Card, Chip, EmptyState, Button} from '../components/ui';

const PROJECT_TYPES = ['All', 'Short Film', 'Feature Film', 'Web Series', 'Ad Film', 'Music Video', 'Documentary'];

export default function BrowseProjectsScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get<{projects: any[]}>('/projects');
      setProjects(res.projects || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { const unsub = navigation.addListener('focus', fetchProjects); return unsub; }, [navigation, fetchProjects]);

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase());
    const matchType = filter === 'All' || p.type === filter;
    return matchSearch && matchType;
  });

  const renderItem = ({item}: any) => (
    <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('ProjectDetail', {projectId: item._id || item.id, project: item})}>
      <Card variant="elevated" padding={Spacing.lg} style={styles.card}>
        <View style={styles.topRow}>
          <Chip label={item.type || 'Project'} static />
          <Text style={styles.status}>{item.status || 'Open'}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>👥 {item.members?.length || 1} member{(item.members?.length || 1) > 1 ? 's' : ''}</Text>
        {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
        <Button label="View Project →" variant="outline" size="sm" fullWidth onPress={() => navigation.navigate('ProjectDetail', {projectId: item._id || item.id, project: item})} />
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: Colors.background}]}>
      <Header title="📂 Projects" navigation={navigation} />
      <View style={styles.searchWrap}>
        <TextInput
          style={[
            styles.search,
            {
              color: Colors.textPrimary,
              backgroundColor: Colors.card,
              borderColor: Colors.border,
            },
          ]}
          placeholder="Search projects..."
          placeholderTextColor={Colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <FlatList horizontal showsHorizontalScrollIndicator={false} style={styles.filterList} contentContainerStyle={styles.filterRow} data={PROJECT_TYPES} renderItem={({item}) => <Chip label={item} selected={filter === item} onPress={() => setFilter(item)} />} keyExtractor={i => i} />
      {loading ? <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 60}} /> : (
        <FlatList data={filtered} keyExtractor={item => item._id || item.id} renderItem={renderItem} contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + 80}]} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState icon="📂" title="No projects found" subtitle="Check back later" actionLabel="Create Project" onAction={() => navigation.navigate('CreateProject')} />} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  searchWrap: {paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm},
  search: {backgroundColor: Colors.card, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: Colors.border},
  filterList: {flexGrow: 0, maxHeight: 50},
  filterRow: {paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md},
  list: {padding: Spacing.lg},
  card: {marginBottom: Spacing.md},
  topRow: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm},
  status: {color: Colors.success, ...Typography.captionBold},
  title: {color: Colors.textPrimary, fontSize: 18, fontWeight: 'bold', marginBottom: Spacing.xs},
  meta: {color: Colors.textSecondary, ...Typography.bodySm, marginBottom: Spacing.sm},
  desc: {color: Colors.textSecondary, ...Typography.bodySm, lineHeight: 20, marginBottom: Spacing.md},
});
