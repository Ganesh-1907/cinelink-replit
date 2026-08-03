import React, {useState, useEffect, useCallback} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, ScrollView, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import api from '../src/api/client';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useApp} from '../src/context/AppContext';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Card, Chip, EmptyState, Button, Input, Avatar} from '../components/ui';

const CRAFTS = ['All', 'Actor', 'Director', 'DOP', 'Editor', 'Writer', 'Sound', 'Makeup', 'Art', 'Crew'];

export default function CrewMarketplaceScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const {user: currentUser} = useApp();
  
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [craftFilter, setCraftFilter] = useState('All');
  const [search, setSearch] = useState('');
  
  // Post Requirement Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formCraft, setFormCraft] = useState('Crew');
  const [formBudget, setFormBudget] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const queryParts: string[] = [];
      if (craftFilter !== 'All') {
        queryParts.push(`craft=${encodeURIComponent(craftFilter)}`);
      }
      if (search.trim()) {
        queryParts.push(`search=${encodeURIComponent(search.trim())}`);
      }
      const queryString = queryParts.join('&');
      
      const res = await api.get<{posts: any[]}>(`/crew-marketplace?${queryString}`);
      setPosts(res.posts || []);
    } catch (e) {
      console.log('Error fetching marketplace posts:', e);
    } finally {
      setLoading(false);
    }
  }, [craftFilter, search]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchPosts);
    return unsub;
  }, [navigation, fetchPosts]);

  const handleMessage = async (creatorId: string, name: string) => {
    if (creatorId === currentUser?._id) {
      Alert.alert('Note', 'This is your own post requirement.');
      return;
    }
    try {
      const res = await api.post<any>('/chat/start', {otherUserId: creatorId});
      if (res.chat) {
        navigation.navigate('ChatScreen', { chat: res.chat });
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not start chat room.');
    }
  };

  const handleCreatePost = async () => {
    if (!formTitle.trim() || !formDesc.trim()) {
      Alert.alert('Required Fields', 'Please fill in the title and description.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/crew-marketplace', {
        title: formTitle.trim(),
        craft: formCraft,
        budget: formBudget.trim(),
        location: formLocation.trim(),
        contact: formContact.trim(),
        description: formDesc.trim()
      });

      Alert.alert('Success 🎉', 'Your requirement has been posted to the marketplace.');
      setModalVisible(false);
      
      // Reset form
      setFormTitle('');
      setFormCraft('Crew');
      setFormBudget('');
      setFormLocation('');
      setFormContact('');
      setFormDesc('');
      
      fetchPosts();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to post requirement.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderPost = ({item}: any) => {
    const creatorName = item.creator?.fullName || item.creator?.displayName || 'CineLink User';
    const isOwner = item.userId === currentUser?._id;

    return (
      <Card variant="elevated" padding={Spacing.md} style={styles.card}>
        <View style={styles.cardHeader}>
          <Avatar name={creatorName} size="sm" uri={item.creator?.photoUrl} />
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.creatorName}>{creatorName}</Text>
            <Text style={styles.timestamp}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
            </Text>
          </View>
          {isOwner && <Text style={styles.myPostTag}>My Post</Text>}
        </View>

        <Text style={styles.title}>{item.title}</Text>
        
        <View style={styles.tagsRow}>
          {item.craft ? <Text style={styles.tag}>🎭 {item.craft}</Text> : null}
          {item.budget ? <Text style={styles.tag}>💰 {item.budget}</Text> : null}
          {item.location ? <Text style={styles.tag}>📍 {item.location}</Text> : null}
        </View>

        {item.description ? (
          <Text style={styles.desc}>{item.description}</Text>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={styles.contact}>📞 {item.contact || 'No contact provided'}</Text>
          {!isOwner && (
            <TouchableOpacity
              style={styles.messageBtn}
              onPress={() => handleMessage(item.userId, creatorName)}>
              <Text style={styles.messageBtnText}>💬 Message</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.safe}>
      <Header title="🎬 Crew Marketplace" navigation={navigation} />
      
      <View style={styles.searchBarWrap}>
        <Input
          placeholder="🔍 Search requirements..."
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      </View>

      <View style={styles.filterListWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterList}
          contentContainerStyle={styles.filterRow}
          data={CRAFTS}
          renderItem={({item}) => (
            <Chip
              label={item}
              selected={craftFilter === item}
              onPress={() => setCraftFilter(item)}
            />
          )}
          keyExtractor={i => i}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      ) : posts.length === 0 ? (
        <EmptyState
          icon="🎬"
          title="No requirements found"
          subtitle="Be the first to post a networking requirement!"
          actionLabel="Post a Requirement"
          onAction={() => setModalVisible(true)}
        />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item._id || item.id}
          contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + 100}]}
          renderItem={renderPost}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Button
        label="+ Post Requirement"
        variant="primary"
        size="lg"
        fullWidth
        style={StyleSheet.flatten([styles.floatBtn, {bottom: insets.bottom > 0 ? insets.bottom + 10 : 20}])}
        onPress={() => setModalVisible(true)}
      />

      {/* Post Requirement slide up modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📢 Post Requirement</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Title *</Text>
              <Input
                placeholder="e.g. Need DOP for Telugu Short Film"
                value={formTitle}
                onChangeText={setFormTitle}
              />

              <Text style={styles.label}>Craft / Role *</Text>
              <View style={styles.craftSelector}>
                {CRAFTS.filter(c => c !== 'All').map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.craftChip, formCraft === c && styles.craftChipSelected]}
                    onPress={() => setFormCraft(c)}>
                    <Text style={[styles.craftChipText, formCraft === c && styles.craftChipTextSelected]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Budget (optional)</Text>
              <Input
                placeholder="e.g. ₹5,000/day or unpaid"
                value={formBudget}
                onChangeText={setFormBudget}
              />

              <Text style={styles.label}>Location</Text>
              <Input
                placeholder="e.g. Hyderabad, India"
                value={formLocation}
                onChangeText={setFormLocation}
              />

              <Text style={styles.label}>Contact Info</Text>
              <Input
                placeholder="e.g. Email or Phone number"
                value={formContact}
                onChangeText={setFormContact}
              />

              <Text style={styles.label}>Description *</Text>
              <Input
                placeholder="Describe project requirements, duration, shooting dates..."
                value={formDesc}
                onChangeText={setFormDesc}
                multiline
                numberOfLines={4}
                style={styles.textArea}
              />

              <View style={styles.formActions}>
                <Button
                  label={submitting ? "Posting..." : "Publish Post"}
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={handleCreatePost}
                  disabled={submitting}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  searchBarWrap: {paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs, marginBottom: Spacing.sm},
  filterListWrap: {maxHeight: 50, marginBottom: Spacing.sm},
  filterList: {flexGrow: 0},
  filterRow: {paddingHorizontal: Spacing.lg, gap: Spacing.sm, alignItems: 'center'},
  list: {paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs},
  card: {marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border},
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md},
  cardHeaderInfo: {flex: 1, marginLeft: Spacing.sm, alignItems: 'flex-start'},
  creatorName: {color: Colors.textPrimary, fontSize: 14, fontWeight: 'bold'},
  timestamp: {color: Colors.textTertiary, fontSize: 11, marginTop: 2},
  myPostTag: {
    color: Colors.primary,
    backgroundColor: Colors.primaryFaint,
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 0.5,
    borderColor: Colors.primary,
  },
  title: {...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.sm, textAlign: 'left'},
  tagsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.md},
  tag: {
    fontSize: 12,
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  desc: {...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.md, textAlign: 'left', lineHeight: 20},
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  contact: {color: Colors.textTertiary, fontSize: 12},
  messageBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  messageBtnText: {color: Colors.textInverse, fontSize: 12, fontWeight: 'bold'},
  floatBtn: {position: 'absolute', left: Spacing.lg, right: Spacing.lg},
  loader: {marginTop: 60},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    maxHeight: '90%',
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  modalTitle: {...Typography.h3, color: Colors.textPrimary},
  closeBtn: {padding: Spacing.xs},
  closeBtnText: {fontSize: 20, color: Colors.textSecondary, fontWeight: 'bold'},
  modalForm: {padding: Spacing.lg, gap: Spacing.md},
  label: {...Typography.label, color: Colors.textSecondary, marginBottom: -Spacing.xs, textAlign: 'left'},
  craftSelector: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginVertical: Spacing.xs},
  craftChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  craftChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryFaint,
  },
  craftChipText: {fontSize: 12, color: Colors.textSecondary},
  craftChipTextSelected: {color: Colors.primary, fontWeight: 'bold'},
  textArea: {height: 100, textAlignVertical: 'top', paddingVertical: Spacing.sm},
  formActions: {marginTop: Spacing.md, marginBottom: Spacing.xl},
});
