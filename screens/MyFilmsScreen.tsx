import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {Colors, Typography, Spacing, Radius} from '../src/theme';
import {Header, Button, Card, EmptyState, Chip} from '../components/ui';

export default function MyFilmsScreen({navigation}: any) {
  const insets = useSafeAreaInsets();
  const [films, setFilms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth().currentUser;

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('films')
      .where('directorId', '==', user?.uid)
      .onSnapshot(snapshot => {
        const data = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
        setFilms(data);
        setLoading(false);
      });
    return () => unsubscribe();
  }, []);

  const deleteFilm = async (filmId: string) => {
    Alert.alert('Delete Film', 'Are you sure you want to delete this film?', [
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await firestore().collection('films').doc(filmId).delete();
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="My Films"
        navigation={navigation}
        right={
          <Button
            label="🎬 Upload"
            onPress={() => navigation.navigate('UploadFilm')}
            size="sm"
          />
        }
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.section,
            {paddingBottom: insets.bottom + Spacing['3xl']},
          ]}>
          {loading ? (
            <ActivityIndicator
              size="large"
              color={Colors.primary}
              style={{marginTop: Spacing['3xl']}}
            />
          ) : films.length === 0 ? (
            <EmptyState
              icon="🎬"
              title="No films yet!"
              subtitle="Upload your first short film and showcase your work to the community"
              actionLabel="+ Upload Now"
              onAction={() => navigation.navigate('UploadFilm')}
            />
          ) : (
            films.map((item: any) => (
              <Card
                key={item.id}
                variant="default"
                padding={false}
                style={styles.card}>
                {item.posterUrl ? (
                  <Image source={{uri: item.posterUrl}} style={styles.poster} />
                ) : (
                  <View style={styles.posterPlaceholder}>
                    <Text style={styles.posterPlaceholderText}>🎬</Text>
                  </View>
                )}

                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{item.title}</Text>

                  <View style={styles.badgeRow}>
                    {item.genre ? (
                      <Chip
                        label={item.genre}
                        static
                        variant="neutral"
                        style={styles.badge}
                      />
                    ) : null}
                    {item.duration ? (
                      <Chip
                        label={`⏱ ${item.duration} min`}
                        static
                        variant="neutral"
                        style={styles.badge}
                      />
                    ) : null}
                    <Chip
                      label={
                        item.status === 'published'
                          ? '✅ Published'
                          : '📝 Draft'
                      }
                      static
                      variant={
                        item.status === 'published'
                          ? 'success'
                          : ('neutral' as any)
                      }
                      style={styles.badge}
                    />
                  </View>

                  {item.description ? (
                    <Text style={styles.description} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}

                  {item.videoUrl ? (
                    <Text style={styles.videoLink} numberOfLines={1}>
                      🎥 Video uploaded
                    </Text>
                  ) : item.videoLink ? (
                    <Text style={styles.videoLink} numberOfLines={1}>
                      🔗 {item.videoLink}
                    </Text>
                  ) : null}

                  <Button
                    label="🗑 Delete Film"
                    onPress={() => deleteFilm(item.id)}
                    variant="danger"
                    size="sm"
                    fullWidth
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
  card: {overflow: 'hidden', marginBottom: Spacing.lg},
  poster: {width: '100%', height: 180},
  posterPlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.cardElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterPlaceholderText: {fontSize: 40},
  cardContent: {padding: Spacing.lg, gap: Spacing.sm},
  cardTitle: {...Typography.h3},
  badgeRow: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs},
  badge: {marginRight: 0},
  description: {
    ...Typography.bodySm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  videoLink: {...Typography.caption, color: Colors.primary},
});
