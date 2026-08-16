import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity, Image} from 'react-native';
import api from '../src/api/client';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {Header, Input, EmptyState, SkeletonCard} from '../components/ui';
import {useTheme} from '../src/context/ThemeContext';

export default function BrowseContestsScreen({navigation}: any) {
  const {isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchContests = useCallback(async () => {
    try {
      const res = await api.get<{contests: any[]}>('/contests');
      setContests(res.contests || []);
    } catch (e) { console.log('BrowseContests error:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchContests(); }, [fetchContests]);
  useEffect(() => { const unsub = navigation.addListener('focus', () => { fetchContests(); }); return unsub; }, [navigation, fetchContests]);

  const filtered = search.trim() ? contests.filter(c => c.title?.toLowerCase().includes(search.toLowerCase()) || c.type?.toLowerCase().includes(search.toLowerCase())) : contests;

  const getDaysLeft = (deadline: string) => {
    if (!deadline) return null;
    const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
    if (diff < 0) return {label: 'Ended', color: Colors.error};
    if (diff === 0) return {label: 'Last day!', color: Colors.warning};
    return {label: `${diff} days left`, color: Colors.success};
  };

  const renderItem = ({item}: any) => {
    const days = getDaysLeft(item.deadline);
    const hasPoster = !!item.posterUrl;

    return (
      <TouchableOpacity 
        activeOpacity={0.88} 
        style={styles.card}
        onPress={() => navigation.navigate('ContestDetail', {contestId: item._id || item.id, contest: item})}
      >
        <View style={styles.cardContent}>
          {/* Left Side: Thumbnail */}
          {hasPoster ? (
            <Image source={{uri: item.posterUrl}} style={styles.posterThumbnail} resizeMode="cover" />
          ) : (
            <View style={styles.posterPlaceholder}>
              <Text style={styles.placeholderEmoji}>🏆</Text>
            </View>
          )}

          {/* Right Side: Information column */}
          <View style={styles.infoCol}>
            <View style={styles.bannerRow}>
              <Text style={styles.bannerLabel}>{item.type ? `🎭 ${item.type}` : '🏆 Contest'}</Text>
              {item.status === 'Active' || !item.status ? (
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>Live</Text>
                </View>
              ) : (
                <View style={[styles.liveBadge, {backgroundColor: Colors.errorFaint, borderColor: Colors.errorBorder}]}>
                  <Text style={[styles.liveBadgeText, {color: Colors.error}]}>Ended</Text>
                </View>
              )}
            </View>

            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

            {item.prize ? (
              <Text style={styles.prizeText} numberOfLines={1}>💰 Prize: {item.prize}</Text>
            ) : null}

            <View style={styles.metaRow}>
              {item.entryFee !== undefined ? (
                <Text style={styles.entryFeeVal}>
                  {item.entryFee === 0 ? 'Free Entry' : `₹${item.entryFee} Entry`}
                </Text>
              ) : null}
              {days ? <Text style={[styles.daysLeft, {color: days.color}]}>{days.label}</Text> : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.safe}>
      <Header title="Browse Contests" navigation={navigation} onBack={() => navigation.goBack()} />
      <View style={styles.searchWrap}>
        <Input placeholder="Search contests..." value={search} onChangeText={setSearch} leftIcon="🔍" />
      </View>
      {loading ? (
        <View style={styles.skeletonWrap}><SkeletonCard /><SkeletonCard /></View>
      ) : (
        <FlatList 
          data={filtered} 
          keyExtractor={item => item._id || item.id} 
          renderItem={renderItem} 
          contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + 80}]} 
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState icon="🏆" title="No contests found" subtitle="Check back soon for exciting cinema contests" />} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  searchWrap: {paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm},
  list: {paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm},
  skeletonWrap: {padding: Spacing.lg},
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.card,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardContent: {
    flexDirection: 'row',
    padding: Spacing.md,
  },
  posterThumbnail: {
    width: 90,
    height: 110,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
  },
  posterPlaceholder: {
    width: 90,
    height: 110,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 28,
  },
  infoCol: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'space-between',
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  bannerLabel: {
    ...Typography.captionBold,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  liveBadge: {
    backgroundColor: Colors.successFaint,
    borderWidth: 1,
    borderColor: Colors.success,
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: Colors.success,
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: Colors.textPrimary,
    ...Typography.label,
    fontSize: 16,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  prizeText: {
    ...Typography.captionBold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  entryFeeVal: {
    ...Typography.micro,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  daysLeft: {
    ...Typography.captionBold,
    fontSize: 11,
  },
});
