import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Animated,
  ScrollView,
  Alert,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import EngagementBar from '../components/EngagementBar';
import {ADMIN_EMAIL} from '../src/api/config';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {
  Header,
  Input,
  Chip,
  EmptyState,
  SkeletonCard,
  Button,
} from '../components/ui';

const ROLES = [
  'All',
  'Hero',
  'Heroine',
  'Villain',
  'Supporting',
  'Child Artist',
  'Comedian',
  'Any Role',
];

const getCategoryChipVariant = (
  category: string,
): 'default' | 'success' | 'warning' | 'error' | 'info' => {
  switch (category) {
    case 'Movies':
      return 'default';
    case 'Short Films':
      return 'success';
    case 'Theatre':
      return 'info';
    case 'YouTube / Web':
      return 'error';
    case 'TV / OTT':
      return 'warning';
    default:
      return 'default';
  }
};

const getDaysLeft = (dateStr: string) => {
  if (!dateStr) {
    return null;
  }
  const deadline = new Date(dateStr);
  if (isNaN(deadline.getTime())) {
    return null;
  }
  const diff = Math.ceil(
    (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (diff < 0) {
    return {label: 'Deadline passed', variant: 'error' as const};
  }
  if (diff === 0) {
    return {label: 'Last day!', variant: 'warning' as const};
  }
  return {label: `${diff} days left`, variant: 'success' as const};
};

export default function BrowseAuditionsScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const currentUser = auth().currentUser;
  const isAdmin = currentUser?.email === ADMIN_EMAIL;
  const [auditions, setAuditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRole, setSelectedRole] = useState('All');
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    loadSavedIds();
    setLoading(true);
    const unsub = firestore()
      .collection('auditions')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snap => {
          setAuditions(snap.docs.map(doc => ({id: doc.id, ...doc.data()})));
          setLoading(false);
        },
        err => {
          console.log('LOAD AUDITIONS ERROR:', err);
          setLoading(false);
        },
      );
    return () => unsub();
  }, []);

  const loadSavedIds = async () => {
    if (!currentUser) {
      return;
    }
    try {
      const snap = await firestore()
        .collection('savedAuditions')
        .where('userId', '==', currentUser.uid)
        .get();
      setSavedIds(snap.docs.map(d => d.data().auditionId));
    } catch (e) {
      console.log(e);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSavedIds();
    setRefreshing(false);
  }, []);

  const toggleSave = async (audition: any) => {
    if (!currentUser) {
      return;
    }
    const isSaved = savedIds.includes(audition.id);
    try {
      if (isSaved) {
        const snap = await firestore()
          .collection('savedAuditions')
          .where('userId', '==', currentUser.uid)
          .where('auditionId', '==', audition.id)
          .get();
        for (const doc of snap.docs) {
          await doc.ref.delete();
        }
        setSavedIds(prev => prev.filter(id => id !== audition.id));
      } else {
        await firestore().collection('savedAuditions').add({
          userId: currentUser.uid,
          auditionId: audition.id,
          auditionTitle: audition.title,
          savedAt: firestore.FieldValue.serverTimestamp(),
        });
        setSavedIds(prev => [...prev, audition.id]);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const filtered = auditions.filter(a => {
    const q = searchText.toLowerCase();
    const matchSearch =
      !q ||
      a.title?.toLowerCase().includes(q) ||
      a.location?.toLowerCase().includes(q) ||
      a.language?.toLowerCase().includes(q) ||
      a.directorName?.toLowerCase().includes(q);
    const matchRole = selectedRole === 'All' || a.role === selectedRole;
    return matchSearch && matchRole;
  });

  const renderCard = ({item}: any) => {
    const isSaved = savedIds.includes(item.id);
    const isExpired = item.status === 'Closed' || item.isActive === false;
    const daysLeft = getDaysLeft(item.lastDate);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AuditionDetail', {audition: item})}>
        {/* Top row: status + save */}
        <View style={styles.cardTopRow}>
          <Chip
            label={isExpired ? '🔴 Closed' : '🟢 Open'}
            variant={isExpired ? 'error' : 'success'}
            static
          />
          <TouchableOpacity
            onPress={e => {
              e.stopPropagation?.();
              toggleSave(item);
            }}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>
              {isSaved ? '❤️ Saved' : '🤍 Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category chip */}
        {item.category ? (
          <View style={styles.categoryRow}>
            <Chip
              label={item.category}
              variant={getCategoryChipVariant(item.category)}
              static
            />
          </View>
        ) : null}

        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Budget + Positions */}
        {item.budget || item.positions ? (
          <View style={styles.budgetRow}>
            {item.budget ? (
              <View style={styles.budgetPill}>
                <Text style={styles.budgetPillText}>💰 {item.budget}</Text>
              </View>
            ) : null}
            {item.positions ? (
              <View style={styles.positionsPill}>
                <Text style={styles.positionsPillText}>
                  👥 {item.positions}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Meta chips */}
        <View style={styles.metaGrid}>
          {item.role ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>🎭 {item.role}</Text>
            </View>
          ) : null}
          {item.gender ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>
                {item.gender === 'Male'
                  ? '👨'
                  : item.gender === 'Female'
                  ? '👩'
                  : '🧑'}{' '}
                {item.gender}
              </Text>
            </View>
          ) : null}
          {item.language ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>🗣 {item.language}</Text>
            </View>
          ) : null}
          {item.ageRange ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>🎂 {item.ageRange} yrs</Text>
            </View>
          ) : null}
        </View>

        {/* Location */}
        {item.location ? (
          <Text style={styles.infoText}>📍 {item.location}</Text>
        ) : null}

        {/* Director + applicants */}
        <View style={styles.directorRow}>
          <Text style={styles.directorText}>
            🎥{' '}
            {item.directorName ||
              item.directorEmail?.split('@')[0] ||
              'Director'}
          </Text>
          <Text style={styles.applicantsText}>
            {item.applicants?.length || item.applicationCount || 0} applied
          </Text>
        </View>

        {/* Description */}
        {item.description ? (
          <Text style={styles.descText} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {/* Deadline countdown */}
        {item.lastDate ? (
          <View style={styles.deadlineRow}>
            <Text style={styles.deadlineLabel}>
              Apply before {item.lastDate}
            </Text>
            {daysLeft ? (
              <Chip label={daysLeft.label} variant={daysLeft.variant} static />
            ) : null}
          </View>
        ) : null}

        <EngagementBar
          auditionId={item.id}
          likes={item.likes || 0}
          likedBy={item.likedBy || []}
          commentCount={0}
          views={item.views || 0}
          shareTitle={item.title || 'Audition'}
        />

        {/* CTA buttons */}
        {isExpired ? (
          <View style={[styles.applyBtn, styles.applyBtnDisabled]}>
            <Text style={styles.applyBtnText}>Closed</Text>
          </View>
        ) : (
          <View style={styles.auditionBtnRow}>
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={e => {
                e.stopPropagation?.();
                navigation.navigate('AuditionDetail', {audition: item});
              }}>
              <Text style={styles.contactBtnText}>Contact</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyBtnFilled}
              onPress={e => {
                e.stopPropagation?.();
                navigation.navigate('AuditionDetail', {audition: item});
              }}>
              <Text style={styles.applyBtnFilledText}>Apply →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Delete button — only for audition owner */}
        {item.directorId === currentUser?.uid && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => {
              Alert.alert('Delete Audition', `Delete "${item.title}"?`, [
                {text: 'Cancel', style: 'cancel'},
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await firestore()
                        .collection('auditions')
                        .doc(item.id)
                        .delete();
                      Alert.alert(
                        '✅ Deleted!',
                        'Audition removed successfully.',
                      );
                    } catch (e) {
                      Alert.alert('Error', 'Could not delete.');
                    }
                  },
                },
              ]);
            }}>
            <Text style={styles.deleteBtnText}>🗑 Delete Audition</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <Header
        title="🎭 Browse Auditions"
        navigation={navigation}
        onBack={() => navigation.goBack()}
      />

      {/* SEARCH */}
      <View style={styles.searchContainer}>
        <Input
          value={searchText}
          onChangeText={setSearchText}
          placeholder="🔍 Search by title, city, language..."
        />
      </View>

      {/* ROLE FILTER */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}>
        {ROLES.map(role => (
          <Chip
            key={role}
            label={role}
            selected={selectedRole === role}
            onPress={() => setSelectedRole(role)}
          />
        ))}
      </ScrollView>

      {/* LIST */}
      {loading ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={i => String(i)}
          renderItem={() => <SkeletonCard />}
          contentContainerStyle={styles.listPadding}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🎭"
          title="No auditions found"
          subtitle={
            searchText || selectedRole !== 'All'
              ? 'Try changing your search or filter'
              : 'No auditions posted yet. Check back soon!'
          }
          actionLabel={
            isAdmin && !searchText && selectedRole === 'All'
              ? '+ Post an Audition'
              : undefined
          }
          onAction={
            isAdmin && !searchText && selectedRole === 'All'
              ? () => navigation.navigate('PostAudition')
              : undefined
          }
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={[
            styles.listPadding,
            {paddingBottom: insets.bottom + 80},
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
              progressBackgroundColor={Colors.background}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.background},
  searchContainer: {paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm},
  filterScroll: {maxHeight: 50, marginBottom: Spacing.md},
  filterRow: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  listPadding: {padding: Spacing.lg},

  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderTopWidth: 2,
    borderTopColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderBottomWidth: 3,
    borderBottomColor: Colors.primaryFaint,
    borderRightWidth: 2,
    borderRightColor: Colors.cardElevated,
    ...Shadows.md,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.primaryMid,
  },
  saveBtnText: {color: Colors.textPrimary, ...Typography.label},
  categoryRow: {marginBottom: Spacing.sm},
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
    lineHeight: 24,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  metaChip: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  metaChipText: {color: Colors.textSecondary, ...Typography.caption},
  infoText: {color: Colors.textSecondary, ...Typography.bodySm},
  directorText: {
    color: Colors.textSecondary,
    ...Typography.caption,
    marginBottom: Spacing.sm,
  },
  descText: {
    color: Colors.textSecondary,
    ...Typography.bodySm,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderTopColor: Colors.primaryLight,
    borderBottomColor: Colors.primaryDark,
    borderLeftColor: Colors.primaryMid,
    borderRightColor: Colors.primaryDark,
    ...Shadows.primary,
  },
  applyBtnDisabled: {backgroundColor: Colors.borderLight, ...Shadows.sm},
  applyBtnText: {color: Colors.textPrimary, fontWeight: 'bold', fontSize: 15},
  deleteBtn: {
    backgroundColor: Colors.errorFaint,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  deleteBtnText: {color: Colors.error, fontWeight: 'bold', ...Typography.label},
  budgetRow: {flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm},
  budgetPill: {
    backgroundColor: Colors.warningFaint,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
  },
  budgetPillText: {color: Colors.warning, ...Typography.captionBold},
  positionsPill: {
    backgroundColor: Colors.successFaint,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  positionsPillText: {color: Colors.success, ...Typography.captionBold},
  directorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  applicantsText: {color: Colors.textSecondary, ...Typography.micro},
  deadlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  deadlineLabel: {color: Colors.textSecondary, ...Typography.caption},
  auditionBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  contactBtn: {
    flex: 1,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  contactBtnText: {color: Colors.primary, fontWeight: '700', ...Typography.btn},
  applyBtnFilled: {
    flex: 1,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  applyBtnFilledText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    ...Typography.btn,
  },
});
