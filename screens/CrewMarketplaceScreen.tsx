import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator} from 'react-native';
import api from '../src/api/client';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Card, Chip, EmptyState, Button, Input} from '../components/ui';

const CRAFTS = ['All', 'Actor', 'Director', 'DOP', 'Editor', 'Writer', 'Sound', 'Makeup', 'Art'];

export default function CrewMarketplaceScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [craftFilter, setCraftFilter] = useState('All');

  const fetchPosts = useCallback(async () => {
    try {
      const url = craftFilter === 'All' ? '/crew-marketplace' : `/crew-marketplace?craft=${craftFilter}`;
      const res = await api.get<{posts: any[]}>(url);
      setPosts(res.posts || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  }, [craftFilter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  useEffect(() => { const unsub = navigation.addListener('focus', fetchPosts); return unsub; }, [navigation, fetchPosts]);

  return (
    <View style={styles.safe}>
      <Header title="🎬 Crew Marketplace" navigation={navigation} />
      <FlatList horizontal showsHorizontalScrollIndicator={false} style={styles.filterList} contentContainerStyle={styles.filterRow} data={CRAFTS} renderItem={({item}) => <Chip label={item} selected={craftFilter === item} onPress={() => setCraftFilter(item)} />} keyExtractor={i => i} />
      {loading ? <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 60}} /> : posts.length === 0 ? (
        <EmptyState icon="🎬" title="No posts yet" actionLabel="Post a Requirement" onAction={() => navigation.navigate('PostAudition')} />
      ) : (
        <FlatList data={posts} keyExtractor={item => item._id || item.id} contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + 80}]}
          renderItem={({item}) => (
            <Card variant="elevated" padding={Spacing.lg} style={styles.card}>
              <Text style={styles.title}>{item.title}</Text>
              {item.craft ? <Chip label={`🎭 ${item.craft}`} static /> : null}
              {item.location ? <Text style={styles.meta}>📍 {item.location}</Text> : null}
              {item.description ? <Text style={styles.desc} numberOfLines={2}>{item.description}</Text> : null}
              <Text style={styles.contact}>📞 {item.contact || 'Contact in post'}</Text>
            </Card>
          )}
        />
      )}
      <Button label="+ Post Requirement" variant="primary" size="lg" fullWidth style={styles.floatBtn} onPress={() => navigation.navigate('PostAudition')} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  filterList: {flexGrow: 0, maxHeight: 50},
  filterRow: {paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md},
  list: {padding: Spacing.lg},
  card: {marginBottom: Spacing.md},
  title: {color: Colors.textPrimary, fontSize: 16, fontWeight: 'bold', marginBottom: Spacing.sm},
  meta: {color: Colors.textSecondary, fontSize: 13, marginBottom: Spacing.xs},
  desc: {color: Colors.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: Spacing.sm},
  contact: {color: Colors.primary, fontSize: 13, fontWeight: '600'},
  floatBtn: {position: 'absolute', bottom: 20, left: Spacing.lg, right: Spacing.lg},
});
