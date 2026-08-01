import React, {useEffect, useState, useCallback} from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Card, Avatar, EmptyState} from '../components/ui';

export default function JoinRequestsScreen({route, navigation}: any) {
  const {projectId, projectTitle} = route.params;
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get<any>(`/projects/${projectId}`);
      setRequests(res?.project?.joinRequests || []);
    } catch (e) {
      console.log('Error fetching join requests:', e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleUpdateStatus = async (requestId: string, status: 'Accepted' | 'Rejected') => {
    try {
      setLoading(true);
      await api.put(`/projects/${projectId}/requests/${requestId}`, {status});
      Alert.alert(
        status === 'Accepted' ? 'Accepted! 🎉' : 'Declined ❌',
        `Applicant has been ${status.toLowerCase()}.`
      );
      fetchRequests();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update request status.');
      setLoading(false);
    }
  };

  const renderRequest = ({item}: any) => {
    const displayName = item.userName || 'User';
    const isPending = item.status === 'Pending';
    const isAccepted = item.status === 'Accepted';

    return (
      <Card variant="elevated" padding={Spacing.md} style={styles.card}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.userInfoRow}
            onPress={() => navigation.navigate('PublicProfile', {userId: item.userId})}>
            <Avatar name={displayName} size="sm" />
            <View style={styles.infoCol}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.roleSub}>Applied as <Text style={styles.roleHighlight}>{item.role}</Text></Text>
            </View>
          </TouchableOpacity>
          
          {!isPending && (
            <Text style={[styles.statusTag, isAccepted ? styles.statusAccepted : styles.statusRejected]}>
              {item.status}
            </Text>
          )}
        </View>

        {item.note ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>"{item.note}"</Text>
          </View>
        ) : null}

        {isPending && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnDecline]}
              onPress={() => handleUpdateStatus(item._id, 'Rejected')}>
              <Text style={styles.btnDeclineText}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.btn, styles.btnAccept]}
              onPress={() => handleUpdateStatus(item._id, 'Accepted')}>
              <Text style={styles.btnAcceptText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title={projectTitle ? `📋 Requests: ${projectTitle}` : "Join Requests"} navigation={navigation} />
      
      {loading && requests.length === 0 ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : requests.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No applications yet"
          subtitle="When creators apply to join your project, they will appear here."
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={item => item._id || item.id}
          contentContainerStyle={styles.list}
          renderItem={renderRequest}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  list: {padding: Spacing.lg},
  card: {marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border},
  headerRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm},
  userInfoRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1},
  infoCol: {alignItems: 'flex-start', flex: 1},
  name: {color: Colors.textPrimary, fontWeight: 'bold', fontSize: 14},
  roleSub: {color: Colors.textSecondary, fontSize: 12, marginTop: 2},
  roleHighlight: {color: Colors.primary, fontWeight: 'bold'},
  
  statusTag: {
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  statusAccepted: {
    color: Colors.success,
    backgroundColor: Colors.successFaint,
  },
  statusRejected: {
    color: Colors.textTertiary,
    backgroundColor: Colors.border,
  },

  noteBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginVertical: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  noteText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'left',
    lineHeight: 18,
  },

  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  btn: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  btnDecline: {
    backgroundColor: Colors.border,
  },
  btnDeclineText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  btnAccept: {
    backgroundColor: Colors.success,
  },
  btnAcceptText: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: 'bold',
  },
  loader: {marginTop: 60},
});
