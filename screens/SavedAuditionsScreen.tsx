import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Card, Button, EmptyState, Badge} from '../components/ui';

export default function SavedAuditionsScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [savedAuditions, setSavedAuditions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const user = auth().currentUser;

  useEffect(() => {
    loadSavedAuditions();
  }, []);

  const loadSavedAuditions = async () => {
    try {
      const userDoc = await firestore()
        .collection('users')
        .doc(user?.uid)
        .get();

      const savedIds: string[] = userDoc.data()?.savedAuditions || [];

      if (savedIds.length === 0) {
        setSavedAuditions([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const auditions: any[] = [];
      for (const auditionId of savedIds) {
        try {
          const doc = await firestore()
            .collection('auditions')
            .doc(auditionId)
            .get();
          if (doc.exists) {
            auditions.push({id: doc.id, ...doc.data()});
          }
        } catch (e) {
          console.log('Error fetching audition:', e);
        }
      }

      setSavedAuditions(auditions);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSavedAuditions();
  };

  const unsaveAudition = async (auditionId: string) => {
    Alert.alert('Remove', 'Remove from saved auditions?', [
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await firestore()
              .collection('users')
              .doc(user?.uid)
              .update({
                savedAuditions: firestore.FieldValue.arrayRemove(auditionId),
              });
            setSavedAuditions(prev => prev.filter(a => a.id !== auditionId));
          } catch (e) {
            console.log(e);
          }
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Saved Auditions" navigation={navigation} />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
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
          {savedAuditions.length > 0 && (
            <Text style={styles.countText}>
              {savedAuditions.length} saved audition
              {savedAuditions.length !== 1 ? 's' : ''}
            </Text>
          )}

          {loading ? (
            <ActivityIndicator
              size="large"
              color={Colors.primary}
              style={{marginTop: Spacing['3xl']}}
            />
          ) : savedAuditions.length === 0 ? (
            <EmptyState
              icon="💾"
              title="No saved auditions!"
              subtitle="Tap 🔖 Save on any audition to save it here."
              actionLabel="Browse Auditions"
              onAction={() => navigation.navigate('Home')}
            />
          ) : (
            savedAuditions.map((item: any) => (
              <Card
                key={item.id}
                variant="default"
                padding={Spacing.lg}
                style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Badge label={item.status || 'Open'} variant="success" />
                </View>

                <View style={styles.infoGrid}>
                  {item.location ? (
                    <Text style={styles.cardSub}>📍 {item.location}</Text>
                  ) : null}
                  {item.gender ? (
                    <Text style={styles.cardSub}>👤 {item.gender}</Text>
                  ) : null}
                  {item.role ? (
                    <Text style={styles.cardSub}>🎭 {item.role}</Text>
                  ) : null}
                  {item.lastDate ? (
                    <Text style={styles.cardSub}>
                      📅 Last Date: {item.lastDate}
                    </Text>
                  ) : null}
                  {item.directorName || item.directorEmail ? (
                    <Text style={styles.cardSub}>
                      🎬{' '}
                      {item.directorName || item.directorEmail?.split('@')[0]}
                    </Text>
                  ) : null}
                </View>

                {item.description ? (
                  <Text style={styles.description} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                <View style={styles.btnRow}>
                  <Button
                    label="View & Apply →"
                    onPress={() =>
                      navigation.navigate('AuditionDetail', {audition: item})
                    }
                    size="md"
                    fullWidth
                  />
                  <Button
                    label="🗑"
                    onPress={() => unsaveAudition(item.id)}
                    variant="danger"
                    size="md"
                    style={styles.removeBtn}
                  />
                </View>
              </Card>
            ))
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
  countText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: Spacing.lg,
  },
  card: {marginBottom: Spacing.lg},
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  infoGrid: {gap: Spacing.xs, marginBottom: Spacing.sm},
  cardSub: {color: Colors.textSecondary, fontSize: 13},
  description: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  btnRow: {flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm},
  removeBtn: {paddingHorizontal: Spacing.md, minWidth: 44},
});
