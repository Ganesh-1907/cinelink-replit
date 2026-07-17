import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {Header, Card, Chip, EmptyState, Button} from '../components/ui';

const PROJECT_TYPES = [
  'All',
  'Short Film',
  'Feature Film',
  'Web Series',
  'Ad Film',
  'Music Video',
  'Documentary',
];

export default function BrowseProjectsScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const currentUser = auth().currentUser;

  useEffect(() => {
    const unsub = firestore()
      .collection('projects')
      .where('status', '==', 'Recruiting')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snapshot => {
          const data = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
          setProjects(data);
          setLoading(false);
        },
        err => {
          console.log('PROJECTS ERROR:', err);
          setLoading(false);
        },
      );
    return () => unsub();
  }, []);

  const filteredProjects = projects.filter((item: any) => {
    const text = searchText.toLowerCase();
    const typeMatch = selectedType === 'All' || item.type === selectedType;
    const searchMatch =
      !text ||
      item.title?.toLowerCase().includes(text) ||
      item.directorName?.toLowerCase().includes(text) ||
      item.location?.toLowerCase().includes(text) ||
      item.language?.toLowerCase().includes(text);
    return typeMatch && searchMatch;
  });

  const getOpenRoles = (rolesNeeded: any[]) => {
    if (!rolesNeeded) {
      return 0;
    }
    return rolesNeeded.filter(r => !r.filled).length;
  };

  const renderProject = ({item}: any) => {
    const openRoles = getOpenRoles(item.rolesNeeded);
    const isOwner = item.directorId === currentUser?.uid;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.card}
        onPress={() => navigation.navigate('ProjectDetail', {project: item})}>
        <View style={styles.cardHeader}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{item.type}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              openRoles === 0 && styles.statusBadgeFull,
            ]}>
            <Text style={styles.statusBadgeText}>
              {openRoles === 0 ? '🔒 Full' : `🟢 ${openRoles} Open`}
            </Text>
          </View>
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>🎬 {item.directorName}</Text>
          <Text style={styles.metaText}>📍 {item.location}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>🗣️ {item.language}</Text>
          <Text style={styles.metaText}>
            👥 {item.membersCount || 1} members
          </Text>
        </View>

        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.rolesSection}>
          <Text style={styles.rolesTitle}>Roles Needed</Text>
          <View style={styles.rolesWrap}>
            {item.rolesNeeded?.slice(0, 5).map((role: any, index: number) => (
              <View
                key={index}
                style={[styles.rolePill, role.filled && styles.rolePillFilled]}>
                <Text
                  style={[
                    styles.rolePillText,
                    role.filled && styles.rolePillTextFilled,
                  ]}>
                  {role.filled ? '✓ ' : ''}
                  {role.role}
                </Text>
              </View>
            ))}
            {item.rolesNeeded?.length > 5 && (
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>
                  +{item.rolesNeeded.length - 5} more
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardFooter}>
          {isOwner ? (
            <View style={styles.ownerBadge}>
              <Text style={styles.ownerBadgeText}>👑 Your Project</Text>
            </View>
          ) : (
            <Button
              label="View & Apply →"
              onPress={() =>
                navigation.navigate('ProjectDetail', {project: item})
              }
              size="md"
              fullWidth
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <Header
        title="🎬 CineLink Rooms"
        navigation={navigation}
        right={
          <Button
            label="+ Create"
            onPress={() => navigation.navigate('CreateProject')}
            variant="primary"
            size="sm"
          />
        }
      />

      <Text style={styles.headerSub}>Find your next film project</Text>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search projects..."
          placeholderTextColor={Colors.textTertiary}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <FlatList
        data={PROJECT_TYPES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item}
        contentContainerStyle={styles.filterList}
        renderItem={({item}) => (
          <Chip
            label={item}
            selected={selectedType === item}
            onPress={() => setSelectedType(item)}
          />
        )}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={item => item.id}
          renderItem={renderProject}
          contentContainerStyle={{
            padding: Spacing.screenH,
            paddingBottom: insets.bottom + 80,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="🎬"
              title="No projects yet!"
              subtitle="Be the first to create a project and build a crew"
              actionLabel="+ Create Project"
              onAction={() => navigation.navigate('CreateProject')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  headerSub: {
    ...Typography.body,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.screenH,
    marginBottom: Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.screenH,
    marginBottom: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    height: 48,
    gap: Spacing.sm,
  },
  searchIcon: {fontSize: 16},
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  filterList: {
    paddingHorizontal: Spacing.screenH,
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  typeBadgeText: {...Typography.captionBold, color: Colors.textSecondary},
  statusBadge: {
    backgroundColor: Colors.successFaint,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  statusBadgeFull: {
    backgroundColor: Colors.errorFaint,
    borderColor: Colors.errorBorder,
  },
  statusBadgeText: {...Typography.captionBold, color: Colors.success},
  cardTitle: {...Typography.h3},
  metaRow: {flexDirection: 'row', gap: Spacing.lg, flexWrap: 'wrap'},
  metaText: {...Typography.bodySm, color: Colors.textSecondary},
  description: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  rolesSection: {marginTop: Spacing.md},
  rolesTitle: {
    ...Typography.labelSm,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  rolesWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs},
  rolePill: {
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  rolePillFilled: {backgroundColor: Colors.successFaint},
  rolePillText: {...Typography.caption, color: Colors.textSecondary},
  rolePillTextFilled: {color: Colors.success, fontWeight: '600'},
  cardFooter: {marginTop: Spacing.md},
  ownerBadge: {
    backgroundColor: Colors.warningFaint,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.warningBorder,
  },
  ownerBadgeText: {...Typography.btn, color: Colors.warning},
});
