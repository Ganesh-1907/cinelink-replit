import React, {useState, useEffect, useCallback, useRef} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView} from 'react-native';
import api from '../src/api/client';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Card, Chip, EmptyState, Button, Input, LoadingView, Badge} from '../components/ui';
import {useApp} from '../src/context/AppContext';
import {useTheme} from '../src/context/ThemeContext';

export default function BrowseProjectsScreen({navigation}: any) {
  const {isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const {isAdmin, isApprovedDirector} = useApp();

  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [projectTypes, setProjectTypes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search query changes
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(searchText);
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchText]);

  const fetchTypes = useCallback(async () => {
    try {
      const res = await api.get<{types: string[]}>('/projects/types');
      const loadedTypes = res.types && res.types.length > 0
        ? res.types
        : ['Short Film', 'Feature Film', 'Web Series', 'Ad Film', 'Music Video', 'Documentary'];
      setProjectTypes(['All', ...loadedTypes]);
    } catch (e) {
      console.log('Error fetching types:', e);
      setProjectTypes(['All', 'Short Film', 'Feature Film', 'Web Series', 'Ad Film', 'Music Video', 'Documentary']);
    }
  }, []);

  const loadProjects = useCallback(async (pageNumber: number, shouldAppend: boolean = false, isRef: boolean = false) => {
    if (pageNumber === 1) {
      if (isRef) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const queryParts: string[] = [];
      queryParts.push(`page=${pageNumber}`);
      queryParts.push('limit=10');
      if (search.trim()) {
        queryParts.push(`search=${encodeURIComponent(search.trim())}`);
      }
      if (selectedTypes.length > 0) {
        queryParts.push(`types=${encodeURIComponent(selectedTypes.join(','))}`);
      }
      const queryString = queryParts.join('&');

      const res = await api.get<any>(`/projects?${queryString}`);
      const newProjects = res.projects || [];
      const pagination = res.pagination || { hasMore: false, page: pageNumber };

      setProjects(prev => shouldAppend ? [...prev, ...newProjects] : newProjects);
      setPage(pagination.page);
      setHasMore(pagination.hasMore);
    } catch (e) {
      console.log('Error fetching projects:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [search, selectedTypes]);

  // Initial load
  useEffect(() => {
    fetchTypes();
    loadProjects(1, false);
  }, [fetchTypes]);

  // Fetch when filters or search change
  useEffect(() => {
    loadProjects(1, false);
  }, [search, selectedTypes, loadProjects]);

  // Handle focus return
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      fetchTypes();
      loadProjects(1, false);
    });
    return unsub;
  }, [navigation, fetchTypes, loadProjects]);

  const handleTypePress = (type: string) => {
    if (type === 'All') {
      setSelectedTypes([]);
    } else {
      setSelectedTypes(prev => {
        const exists = prev.includes(type);
        if (exists) {
          return prev.filter(t => t !== type);
        } else {
          return [...prev, type];
        }
      });
    }
  };

  const handleEndReached = () => {
    if (hasMore && !loading && !loadingMore) {
      loadProjects(page + 1, true);
    }
  };

  const renderItem = ({item}: any) => (
    <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('ProjectDetail', {projectId: item._id || item.id, project: item})}>
      <Card variant="elevated" padding={Spacing.lg} style={styles.card}>
        <View style={styles.topRow}>
          <Chip label={item.type || 'Project'} static />
          <View style={{flexDirection: 'row', gap: Spacing.sm, alignItems: 'center'}}>
            {item.visibility === 'private' && (
              <Badge label="Private" variant="error" />
            )}
            <Text style={styles.status}>{item.status || 'Open'}</Text>
          </View>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.meta}>👥 {item.members?.length || 1} member{(item.members?.length || 1) > 1 ? 's' : ''}</Text>
        {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
        <Button label="View Project →" variant="outline" size="sm" fullWidth onPress={() => navigation.navigate('ProjectDetail', {projectId: item._id || item.id, project: item})} />
      </Card>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, {backgroundColor: Colors.background}]}>
      <Header
        title="Projects"
        navigation={navigation}
        right={
          (isAdmin || isApprovedDirector) ? (
            <TouchableOpacity onPress={() => navigation.navigate('CreateProject')}>
              <Text style={{color: Colors.primary, fontWeight: 'bold', fontSize: 16}}>+ Create</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />
      <View style={styles.searchWrap}>
        <Input
          placeholder="Search projects..."
          value={searchText}
          onChangeText={setSearchText}
          leftIcon="🔍"
          autoCorrect={false}
        />
      </View>
      
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterList}
        contentContainerStyle={styles.filterRow}
        data={projectTypes}
        renderItem={({item}) => {
          const isSelected = item === 'All' ? selectedTypes.length === 0 : selectedTypes.includes(item);
          return (
            <Chip
              label={item}
              selected={isSelected}
              onPress={() => handleTypePress(item)}
            />
          );
        }}
        keyExtractor={i => i}
      />

      {loading && projects.length === 0 ? (
        <LoadingView fullScreen={false} style={{marginTop: 60}} />
      ) : (
        <FlatList
          data={projects}
          keyExtractor={item => item._id || item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + 80}]}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          refreshing={isRefreshing}
          onRefresh={() => loadProjects(1, false, true)}
          ListEmptyComponent={
            <EmptyState
              icon="📂"
              title="No projects found"
              subtitle="Check back later"
              actionLabel="Create Project"
              onAction={() => navigation.navigate('CreateProject')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  searchWrap: {paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm},
  filterList: {flexGrow: 0, maxHeight: 50},
  filterRow: {paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md},
  list: {padding: Spacing.lg},
  card: {marginBottom: Spacing.md},
  topRow: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm},
  status: {color: Colors.success, ...Typography.captionBold},
  title: {color: Colors.textPrimary, fontSize: 18, fontWeight: 'bold', marginBottom: Spacing.xs},
  meta: {color: Colors.textSecondary, ...Typography.bodySm, marginBottom: Spacing.sm},
  desc: {color: Colors.textSecondary, ...Typography.bodySm, lineHeight: 20, marginBottom: Spacing.md},
  footerLoader: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
