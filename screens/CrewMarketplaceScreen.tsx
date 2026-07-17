import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {Colors, Typography, Spacing, Radius, Shadows} from '../src/theme';
import {Header, Input, Button, Chip, Card, EmptyState} from '../components/ui';

/* ── clean name helper ── */
const cleanName = (raw: string | null | undefined): string => {
  if (!raw) {
    return 'Creator';
  }
  return raw.includes('@') ? raw.split('@')[0] : raw;
};

const CRAFTS = [
  'Actor',
  'Director',
  'Writer',
  'Editor',
  'Cinematographer',
  'Music Director',
  'VFX Artist',
  'Makeup Artist',
];

export default function CrewMarketplaceScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCraft, setSelectedCraft] = useState('Actor');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const currentUser = auth().currentUser;

  const currentUserName =
    currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const snapshot = await firestore()
        .collection('crewPosts')
        .orderBy('createdAt', 'desc')
        .get();
      const data = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
      setPosts(data);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    if (!title || !location || !budget || !description) {
      Alert.alert('Missing Info', 'Please fill all fields!');
      return;
    }
    setPosting(true);
    try {
      await firestore().collection('crewPosts').add({
        title: title.trim(),
        craft: selectedCraft,
        location: location.trim(),
        budget: budget.trim(),
        description: description.trim(),
        createdByName: currentUserName,
        createdBy: currentUser?.email,
        createdById: currentUser?.uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      setTitle('');
      setLocation('');
      setBudget('');
      setDescription('');
      Alert.alert('Posted! 🎬', 'Your requirement has been posted!');
      loadPosts();
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Something went wrong. Try again!');
    } finally {
      setPosting(false);
    }
  };

  /* ── START CHAT — FIXED: Pass complete chat object ── */
  const startChat = async (post: any) => {
    if (post.createdById === currentUser?.uid) {
      Alert.alert('Error', 'This is your own post!');
      return;
    }
    try {
      const chatId = [currentUser?.uid, post.createdById].sort().join('_');
      const chatRef = firestore().collection('chats').doc(chatId);
      const chatDoc = await chatRef.get();
      const otherName = post.createdByName || cleanName(post.createdBy);

      if (!chatDoc.exists) {
        await chatRef.set({
          id: chatId,
          participants: [currentUser?.uid, post.createdById],
          participantNames: [currentUserName, otherName],
          participantEmails: [currentUser?.email, post.createdBy],
          lastMessage: '',
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      const updatedChatDoc = await chatRef.get();
      navigation.navigate('ChatScreen', {
        chat: {id: chatId, ...updatedChatDoc.data()},
      });
    } catch (e) {
      console.log('Chat error:', e);
      Alert.alert('Error', 'Could not start chat. Try again!');
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <Header title="Crew Marketplace" navigation={navigation} noBorder />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: insets.bottom + Spacing['5xl']}}>
        <Text style={styles.heading}>Crew Marketplace</Text>
        <Text style={styles.subHeading}>Post your project requirements</Text>

        <Input
          label="Project Title *"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Looking for Actor for Short Film"
        />

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Looking for</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {CRAFTS.map(craft => (
                <Chip
                  key={craft}
                  label={craft}
                  selected={selectedCraft === craft}
                  onPress={() => setSelectedCraft(craft)}
                />
              ))}
            </View>
          </ScrollView>
        </View>

        <Input
          label="Location *"
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Hyderabad"
        />

        <Input
          label="Budget *"
          value={budget}
          onChangeText={setBudget}
          placeholder="e.g. ₹5,000 / Negotiable"
        />

        <Input
          label="Description *"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe your project and requirements..."
          multiline
          numberOfLines={4}
        />

        <Button
          label="📋 Post Requirement"
          onPress={createPost}
          size="lg"
          loading={posting}
          fullWidth
        />

        <Text style={styles.sectionTitle}>
          Available Projects ({posts.length})
        </Text>

        {loading ? (
          <ActivityIndicator
            color={Colors.primary}
            style={{marginTop: Spacing.lg}}
          />
        ) : posts.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No projects posted yet"
            subtitle="Be the first to post your crew requirements"
          />
        ) : (
          posts.map((item: any) => (
            <Card
              key={item.id}
              variant="default"
              padding={Spacing.lg}
              style={styles.postCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={styles.craftBadge}>
                  <Text style={styles.craftBadgeText}>{item.craft}</Text>
                </View>
              </View>

              <View style={styles.cardMeta}>
                <Text style={styles.cardMetaText}>📍 {item.location}</Text>
                <Text style={styles.cardMetaText}>💰 {item.budget}</Text>
              </View>

              <Text style={styles.cardDescription} numberOfLines={3}>
                {item.description}
              </Text>

              <Text style={styles.owner}>
                Posted by {item.createdByName || cleanName(item.createdBy)}
              </Text>

              <Button
                label="💬 Message"
                onPress={() => startChat(item)}
                variant="outline"
                size="md"
                fullWidth
              />
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {flex: 1, backgroundColor: Colors.background},
  container: {flex: 1, padding: Spacing.screenH},
  heading: {...Typography.h1, marginTop: Spacing.sm},
  subHeading: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  fieldGroup: {gap: Spacing.xs},
  label: {...Typography.labelSm, color: Colors.primary},
  chipRow: {flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.xs},
  sectionTitle: {
    ...Typography.h3,
    color: Colors.primary,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  postCard: {marginBottom: Spacing.lg},
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  cardTitle: {...Typography.h4, flex: 1},
  craftBadge: {
    backgroundColor: Colors.primaryFaint,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  craftBadgeText: {...Typography.captionBold, color: Colors.primary},
  cardMeta: {flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.sm},
  cardMetaText: {...Typography.bodySm, color: Colors.textSecondary},
  cardDescription: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  owner: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: Spacing.md,
  },
});
