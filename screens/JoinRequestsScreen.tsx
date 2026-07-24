import React, {useEffect, useState, useCallback} from 'react';
import {View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert} from 'react-native';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Button, Card, Chip, Avatar, EmptyState, LoadingView} from '../components/ui';

export default function JoinRequestsScreen({route, navigation}: any) {
  const {projectId} = route.params;
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get<any>(`/projects/${projectId}`);
      setRequests(res?.project?.joinRequests || []);
    } catch (e) { console.log(e); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="Join Requests" navigation={navigation} />
      {loading ? <LoadingView /> : requests.length === 0 ? (
        <EmptyState icon="📋" title="No requests yet" subtitle="Join requests will appear here" />
      ) : (
        <FlatList data={requests} keyExtractor={(item, i) => String(i)} contentContainerStyle={styles.list}
          renderItem={({item}) => (
            <Card variant="default" padding={Spacing.md} style={styles.card}>
              <View style={styles.row}><Avatar name={item.userName || 'User'} size="sm" /><Text style={styles.name}>{item.userName || 'User'}</Text></View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  list: {padding: Spacing.lg},
  card: {marginBottom: Spacing.sm},
  row: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm},
  name: {color: Colors.textPrimary, fontWeight: '600'},
});
