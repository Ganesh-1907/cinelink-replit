import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import api from '../src/api/client';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Card, Button, EmptyState, Badge, Chip} from '../components/ui';

export default function MyApplicationsScreen({route, navigation}: any) {
  const insets = useSafeAreaInsets();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const user = auth().currentUser;

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const res = await api.get<{applications: any[]}>('/applications/my');
      setApplications(res.applications || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadApplications();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Selected':
        return {
          variant: 'success',
          message: '🎉 Congratulations! You are selected!',
        };
      case 'Rejected':
        return {
          variant: 'error',
          message: '😔 Not selected this time. Keep trying!',
        };
      default:
        return {
          variant: 'warning',
          message: '⏳ Application under review by director...',
        };
    }
  };

  const totalApps = applications.length;
  const selectedCount = applications.filter(
    a => a.status === 'Selected',
  ).length;
  const pendingCount = applications.filter(a => a.status === 'Pending').length;
  const rejectedCount = applications.filter(
    a => a.status === 'Rejected',
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={Colors.background === '#0A0A0A' ? 'light-content' : 'dark-content'}
        backgroundColor={Colors.background}
      />
      <Header title="My Applications" navigation={navigation} />

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        contentContainerStyle={{paddingBottom: insets.bottom + Spacing.xl}}>
        <View style={styles.section}>
          <Text style={styles.subHeading}>{totalApps} total applications</Text>

          {totalApps > 0 && (
            <View style={styles.statsRow}>
              <Card
                variant="elevated"
                padding={Spacing.md}
                style={styles.statCard}>
                <Text style={styles.statNumber}>{totalApps}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </Card>
              <Card
                variant="elevated"
                padding={Spacing.md}
                style={styles.statCard}>
                <Text style={[styles.statNumber, {color: Colors.warning}]}>
                  {pendingCount}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </Card>
              <Card
                variant="elevated"
                padding={Spacing.md}
                style={styles.statCard}>
                <Text style={[styles.statNumber, {color: Colors.success}]}>
                  {selectedCount}
                </Text>
                <Text style={styles.statLabel}>Selected</Text>
              </Card>
              <Card
                variant="elevated"
                padding={Spacing.md}
                style={styles.statCard}>
                <Text style={[styles.statNumber, {color: Colors.error}]}>
                  {rejectedCount}
                </Text>
                <Text style={styles.statLabel}>Rejected</Text>
              </Card>
            </View>
          )}

          {loading ? (
            <ActivityIndicator
              size="large"
              color={Colors.primary}
              style={{marginTop: Spacing['3xl']}}
            />
          ) : applications.length === 0 ? (
            <EmptyState
              icon="🎬"
              title="No applications yet!"
              subtitle="Browse auditions and apply to see them here."
              actionLabel="Browse Auditions"
              onAction={() => navigation.goBack()}
            />
          ) : (
            applications.map((item: any) => {
              const config = getStatusConfig(item.status);
              return (
                <Card
                  key={item.id}
                  variant="default"
                  padding={Spacing.lg}
                  style={[
                    styles.card,
                    {
                      borderColor:
                        config.variant === 'success'
                          ? Colors.success
                          : config.variant === 'error'
                          ? Colors.error
                          : Colors.border,
                    } as import('react-native').ViewStyle,
                  ]}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.auditionTitle || 'Audition Application'}
                    </Text>
                    <Badge
                      label={item.status}
                      variant={config.variant as any}
                    />
                  </View>

                  <Text
                    style={[
                      styles.statusMessage,
                      {
                        color:
                          config.variant === 'success'
                            ? Colors.success
                            : config.variant === 'error'
                            ? Colors.error
                            : Colors.warning,
                      },
                    ]}>
                    {config.message}
                  </Text>

                  {item.note ? (
                    <View style={styles.noteBox}>
                      <Text style={styles.noteLabel}>Your note:</Text>
                      <Text style={styles.noteText}>{item.note}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.cardSub}>
                    📅 Applied:{' '}
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString()
                      : 'Recently'}
                  </Text>

                  <Button
                    label="View Audition →"
                    onPress={() =>
                      navigation.navigate('AuditionDetail', {
                        audition: {
                          id: item.auditionId,
                          title: item.auditionTitle,
                        },
                      })
                    }
                    variant="outline"
                    size="sm"
                    fullWidth
                  />
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  scroll: {flex: 1},
  section: {padding: Spacing.screenH},
  subHeading: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  statsRow: {flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg},
  statCard: {flex: 1, alignItems: 'center'},
  statNumber: {...Typography.h3},
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  card: {
    marginBottom: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  cardTitle: {...Typography.body, fontWeight: '700', flex: 1},
  statusMessage: {...Typography.bodySm, fontWeight: '600'},
  noteBox: {
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  noteLabel: {
    ...Typography.caption,
    color: Colors.primary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  noteText: {...Typography.bodySm, color: Colors.textSecondary},
  cardSub: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
});
