import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {
  Header,
  Input,
  Card,
  Button,
  EmptyState,
  SkeletonCard,
  Badge,
  Chip,
} from '../components/ui';

export default function BrowseContestsScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = firestore()
      .collection('contests')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snap => {
          setContests(snap.docs.map(doc => ({id: doc.id, ...doc.data()})));
          setLoading(false);
        },
        err => {
          console.log('BrowseContests error:', err);
          setLoading(false);
        },
      );
    return () => unsub();
  }, []);

  const filtered = search.trim()
    ? contests.filter(
        c =>
          c.title?.toLowerCase().includes(search.toLowerCase()) ||
          c.type?.toLowerCase().includes(search.toLowerCase()),
      )
    : contests;

  const getDaysLeft = (deadline: string) => {
    if (!deadline) {
      return null;
    }
    const diff = Math.ceil(
      (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (diff < 0) {
      return {label: 'Ended', color: Colors.error};
    }
    if (diff === 0) {
      return {label: 'Last day!', color: Colors.warning};
    }
    return {label: `${diff} days left`, color: Colors.success};
  };

  const renderItem = ({item}: any) => {
    const days = getDaysLeft(item.deadline);
    return (
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={() => navigation.navigate('ContestDetail', {contest: item})}>
        <Card
          variant="elevated"
          padding={Spacing.lg}
          style={styles.cardSpacing}>
          {/* Banner row */}
          <View style={styles.bannerRow}>
            <Text style={styles.bannerLabel}>🏆 Contest</Text>
            {item.status === 'Active' ? (
              <Badge label="● Live" variant="success" />
            ) : (
              <Badge label="Ended" variant="error" />
            )}
          </View>

          {/* Title */}
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Prize */}
          {item.prize ? (
            <View style={styles.prizeRow}>
              <Text style={styles.prizeText}>💰 {item.prize}</Text>
            </View>
          ) : null}

          {/* Chips */}
          <View style={styles.chipRow}>
            {item.type ? <Chip label={`🎭 ${item.type}`} static /> : null}
            {item.entryFee !== undefined ? (
              <Chip
                label={
                  item.entryFee === 0
                    ? '✅ Free Entry'
                    : `₹${item.entryFee} Entry`
                }
                variant={item.entryFee === 0 ? 'success' : 'default'}
                static
              />
            ) : null}
          </View>

          {/* Description */}
          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          {/* Meta row */}
          <View style={styles.metaRow}>
            {item.deadline ? (
              <Text style={styles.metaText}>⏰ {item.deadline}</Text>
            ) : null}
            {days ? (
              <Text style={[styles.daysLeft, {color: days.color}]}>
                {days.label}
              </Text>
            ) : null}
          </View>

          {/* CTA */}
          <Button
            label="Enter Contest"
            onPress={() =>
              navigation.navigate('ContestDetail', {contest: item})
            }
            variant="primary"
            size="md"
            fullWidth
          />
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.safe}>
      <Header title="🏆 Contests" noBorder />

      {/* Search */}
      <View style={styles.searchWrap}>
        <Input
          placeholder="Search contests..."
          value={search}
          onChangeText={setSearch}
          leftIcon="🔍"
        />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.skeletonWrap}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            {paddingBottom: insets.bottom + 24},
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="🏆"
              title="No contests found"
              subtitle="Check back soon for exciting cinema contests"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  searchWrap: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  list: {padding: Spacing.lg, paddingBottom: Spacing.xxl},
  skeletonWrap: {padding: Spacing.lg},
  cardSpacing: {marginBottom: Spacing.md},
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  bannerLabel: {
    ...Typography.captionBold,
    color: Colors.primary,
  },
  cardTitle: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
  },
  prizeRow: {
    backgroundColor: Colors.warningFaint,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    alignSelf: 'flex-start',
  },
  prizeText: {
    ...Typography.captionBold,
    color: Colors.warning,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  description: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  metaText: {
    ...Typography.caption,
  },
  daysLeft: {
    ...Typography.captionBold,
  },
});
